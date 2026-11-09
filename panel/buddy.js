// Your buddy: feed it with meals your work earns today, clean it, keep it strong by working.
(function () {
  const $ = (id) => document.getElementById(id);
  const post = (data) => window.webkit?.messageHandlers?.panel?.postMessage({ type: "action", data });
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  let B = null;

  function look(b) {
    if (b.food < 25) return { face: "😫", say: "Hungry!", cls: "hungry" };
    if (b.clean < 30) return { face: "🤢", say: "Needs a bath", cls: "dirty" };
    if (b.strength < 35) return { face: "😴", say: "Weak. Go work!", cls: "weak" };
    if (b.strength >= 85 && b.mood >= 75) return { face: "💪", say: "Strong!", cls: "strong" };
    if (b.mood >= 70) return { face: "😊", say: "Happy", cls: "" };
    return { face: "😐", say: "Okay", cls: "" };
  }
  const bar = (icon, v, low) => `<div class="bbar ${v < low ? "low" : ""}"><span>${icon}</span><b><i style="width:${Math.max(2, v)}%"></i></b></div>`;

  function paint() {
    const b = B, el = $("buddy");
    if (!b) { el.style.display = "none"; return; }
    const eq = window.Loot ? Loot.equipped() : {}, pet = eq.pet ? Loot.drop(eq.pet).icon : "🐣", l = look(b);
    const canFeed = b.meals_left > 0 && b.food < 95;
    el.style.display = "flex";
    el.className = l.cls;
    el.innerHTML = `<span class="bud" id="bud"><span class="bpet">${pet}</span><span class="bface">${l.face}</span>
        ${b.clean < 30 ? '<span class="stink">〰</span><span class="speck s1"></span><span class="speck s2"></span><span class="speck s3"></span>' : ""}</span>
      <span class="bstats">${bar("🍖", b.food, 25)}${bar("🫧", b.clean, 30)}${bar("💪", b.strength, 35)}</span>
      <span class="bbtns"><span class="gb sm ${canFeed ? "" : "dis"}" id="feedBtn">🍖 ${b.meals_left}</span>
        <span class="gb sm alt ${b.clean > 95 ? "dis" : ""}" id="cleanBtn">🫧</span></span>`;
    $("feedBtn").onclick = () => canFeed && feed();
    $("cleanBtn").onclick = () => b.clean <= 95 && clean();
    el.onmouseenter = () => window.showInfoHTML(info(b, l));
    el.onmouseleave = () => window.showInfoHTML(null);
  }

  function info(b, l) {
    const meals = b.meals_left ? `${b.meals_left} meal${b.meals_left > 1 ? "s" : ""} ready` :
      b.next_meal_xp != null ? `next meal in ${fmt(b.next_meal_xp)} XP` : `all ${b.max_meals} eaten today`;
    return `<div class="name">Your buddy · ${l.say}</div>
      <div class="row"><span>🍖 Food:</span><span>${Math.round(b.food)}% · ${meals}</span></div>
      <div class="row"><span>🫧 Clean:</span><span>${Math.round(b.clean)}%</span></div>
      <div class="row"><span>💪 Strength:</span><span>${Math.round(b.strength)}%</span></div>
      <div class="about">Work earns meals (1 per ${fmt(1200)} XP today, up to ${b.max_meals}). Strength follows your last few days of work: a day off costs 30%. Cleaning is free.</div>`;
  }

  function burst(glyphs, n, cls) {
    const bud = $("bud");
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span");
      p.className = "bfx " + cls;
      p.textContent = glyphs[i % glyphs.length];
      p.style.left = 20 + Math.random() * 60 + "%";
      p.style.setProperty("--dx", (Math.random() - 0.5) * 30 + "px");
      p.style.animationDelay = i * 0.12 + "s";
      bud.appendChild(p);
      setTimeout(() => p.remove(), 1800 + i * 120);
    }
  }

  function feed() {
    post({ action: "feed" });
    B.food = Math.min(100, B.food + B.meal); B.meals_left--; B.mood = (B.food + B.clean + B.strength) / 3;
    paint();
    $("bud").classList.add("chomp");
    burst(["🍖", "❤️", "❤️"], 3, "up");
  }
  function clean() {
    post({ action: "clean" });
    B.clean = 100; B.mood = (B.food + B.clean + B.strength) / 3;
    paint();
    $("bud").classList.add("wash");
    burst(["🫧", "🫧", "✨", "🫧", "🫧"], 6, "up");
  }

  window.Buddy = { render(stats) { B = stats.buddy || null; paint(); } };
})();
