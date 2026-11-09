// Your lil guy: lives in a little room under the chest tray. Poke him, hand him food (dragged to his
// mouth), scrub him with the sponge. Food comes from today's work; strength from your last few days.
(function () {
  const $ = (id) => document.getElementById(id);
  const post = (data) => window.webkit?.messageHandlers?.panel?.postMessage({ type: "action", data });
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const rnd = (a, b) => a + Math.random() * (b - a);
  let B = null, built = false;

  // ---------- sounds ----------
  let ac;
  function tone(f, t0, dur, type = "sine", vol = 0.05, to) {
    try {
      ac = ac || new AudioContext();
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + t0;
      o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* no audio, no problem */ }
  }
  const SFX = {
    boing: () => tone(320, 0, 0.25, "sine", 0.06, 720),
    giggle: () => [880, 990, 880, 1100].forEach((f, i) => tone(f, i * 0.07, 0.07, "triangle", 0.035)),
    chomp: () => [0, 0.16, 0.32].forEach((t) => tone(180, t, 0.08, "square", 0.04, 120)),
    yum: () => [523, 659, 784].forEach((f, i) => tone(f, 0.5 + i * 0.08, 0.14, "triangle", 0.045)),
    scrub: () => tone(rnd(1400, 2200), 0, 0.04, "sine", 0.012),
    sparkle: () => [1319, 1568, 2093].forEach((f, i) => tone(f, i * 0.06, 0.2, "triangle", 0.04)),
  };

  // ---------- the lil guy (an SVG blob, coloured by your skin) ----------
  const MOUTH = {
    smile: '<path d="M24 37 Q30 43 36 37" fill="none" stroke="#2a1608" stroke-width="2" stroke-linecap="round"/>',
    grin: '<path d="M23 35 Q30 47 37 35 Z" fill="#2a1608"/><path d="M27 41 Q30 44 33 41 Z" fill="#ff7a8a"/>',
    open: '<ellipse cx="30" cy="39" rx="4.5" ry="5.5" fill="#2a1608"/><ellipse cx="30" cy="42" rx="3" ry="2" fill="#ff7a8a"/>',
    frown: '<path d="M24 41 Q30 35 36 41" fill="none" stroke="#2a1608" stroke-width="2" stroke-linecap="round"/>',
    flat: '<path d="M25 39 L35 39" stroke="#2a1608" stroke-width="2" stroke-linecap="round"/>',
    chew: '<path d="M25 38 Q30 41 35 38" fill="none" stroke="#2a1608" stroke-width="2.4" stroke-linecap="round"/>',
  };
  const svg = `<svg viewBox="0 0 60 60" class="gsvg">
    <ellipse class="foot" cx="21" cy="55" rx="6" ry="3.2"/><ellipse class="foot" cx="39" cy="55" rx="6" ry="3.2"/>
    <ellipse class="arm al" cx="7" cy="38" rx="4" ry="6"/><ellipse class="arm ar" cx="53" cy="38" rx="4" ry="6"/>
    <path class="body" d="M30 8 C46 8 54 22 54 36 C54 50 44 56 30 56 C16 56 6 50 6 36 C6 22 14 8 30 8 Z"/>
    <ellipse cx="30" cy="44" rx="15" ry="9" fill="rgba(255,255,255,.22)"/>
    <ellipse cx="22" cy="17" rx="6" ry="3" fill="rgba(255,255,255,.35)" transform="rotate(-25 22 17)"/>
    <g class="dirt"></g>
    <ellipse class="cheek" cx="15" cy="36" rx="3.5" ry="2" fill="#ff8aa0"/><ellipse class="cheek" cx="45" cy="36" rx="3.5" ry="2" fill="#ff8aa0"/>
    <g class="eyes"><ellipse cx="22" cy="28" rx="5.5" ry="6.5" fill="#fff" stroke="#2a1608" stroke-width="1"/>
      <ellipse cx="38" cy="28" rx="5.5" ry="6.5" fill="#fff" stroke="#2a1608" stroke-width="1"/>
      <g class="pupils"><circle cx="22" cy="29" r="3" fill="#1a0c04"/><circle cx="38" cy="29" r="3" fill="#1a0c04"/>
        <circle cx="23" cy="27.6" r="1" fill="#fff"/><circle cx="39" cy="27.6" r="1" fill="#fff"/></g>
      <g class="lids"><rect x="16" y="20" width="12" height="7" rx="3"/><rect x="32" y="20" width="12" height="7" rx="3"/></g></g>
    <g class="mouth">${MOUTH.smile}</g></svg>`;
  const SPOTS = [[18, 44], [40, 46], [30, 18], [12, 30], [47, 26], [26, 50], [36, 14]];

  // ---------- state of the scene ----------
  const G = { x: 60, y: 0, vy: 0, tx: 60, face: "smile", squash: 0, next: 0, look: null, blinkAt: 0, busy: 0,
              scrub: 0, cleanShown: 100, lastFrame: 0 };
  const W = () => $("room").clientWidth - 34, GW = 46;  // the right edge holds the food and sponge

  function build() {
    const el = $("buddy");
    el.innerHTML = `<div class="room" id="room">
        <div class="bars" id="bbars"></div>
        <div class="think" id="think"></div>
        <div class="guy" id="guy"><div class="shadow"></div><div class="gbody" id="gbody">${svg}</div>
          <span class="fly f1"></span><span class="fly f2"></span></div>
        <div class="tools"><span class="tool" id="tFood">🍖<b id="meals"></b></span><span class="tool" id="tSponge">🧽</span></div>
        <div class="floor"></div></div>`;
    $("guy").onpointerdown = poke;
    $("tFood").onpointerdown = (e) => grab(e, "food");
    $("tSponge").onpointerdown = (e) => grab(e, "sponge");
    $("room").onmouseenter = () => window.showInfoHTML(info());
    $("room").onmouseleave = () => window.showInfoHTML(null);
    document.addEventListener("pointermove", (e) => (G.look = { x: e.clientX, y: e.clientY, t: performance.now() }));
    built = true;
    requestAnimationFrame(frame);
  }

  const mood = () => (B.food + B.clean + B.strength) / 3;
  const weak = () => B.strength < 35, strong = () => B.strength >= 85 && mood() >= 70;

  function paintStats() {
    const bar = (icon, v, low) => `<div class="bbar ${v < low ? "low" : ""}"><span>${icon}</span><b><i style="width:${Math.max(2, v)}%"></i></b></div>`;
    $("bbars").innerHTML = bar("🍖", B.food, 25) + bar("🫧", B.clean, 30) + bar("💪", B.strength, 35);
    $("meals").textContent = B.meals_left;
    $("tFood").classList.toggle("dis", !(B.meals_left > 0));
    $("think").innerHTML = B.food < 25 ? "🍖" : weak() ? "💤" : "";
    $("guy").className = "guy" + (weak() ? " weak" : "") + (strong() ? " strong" : "") + (B.clean < 30 ? " filthy" : "") + (mood() >= 70 ? " happy" : "");
    if (!drag) G.cleanShown = B.clean;
    paintDirt();
  }
  function paintDirt() {
    const n = Math.round((100 - G.cleanShown) / 14);
    $("guy").querySelector(".dirt").innerHTML = SPOTS.slice(0, n).map(([x, y], i) =>
      `<circle cx="${x}" cy="${y}" r="${2.2 + (i % 3) * 0.7}" fill="#5a3b16" opacity=".8"/>`).join("");
  }

  function mouth(m) { if (G.face !== m) { G.face = m; $("guy").querySelector(".mouth").innerHTML = MOUTH[m]; } }
  function restingMouth() { return B.food < 25 ? "frown" : weak() ? "flat" : mood() >= 75 ? "grin" : "smile"; }

  // ---------- life: hops, landing squash, blinking, eyes that follow you ----------
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.body.classList.contains("compact") || !B) return;
    const dt = Math.min(0.05, (now - (G.lastFrame || now)) / 1000); G.lastFrame = now;
    const room = W() - GW;
    if (now > G.next && !G.busy && !drag) decide(now, room);
    // walk in little bounces toward the target, gravity pulls him down
    const speed = weak() ? 18 : 45;
    if (Math.abs(G.tx - G.x) > 1) {
      G.x += Math.sign(G.tx - G.x) * Math.min(Math.abs(G.tx - G.x), speed * dt);
      if (G.y === 0 && G.vy === 0) G.vy = weak() ? 60 : 110;
    }
    if (G.y > 0 || G.vy > 0) {
      G.vy -= 520 * dt; G.y += G.vy * dt;
      if (G.y <= 0) { G.y = 0; G.vy = 0; G.squash = 1; }
    }
    G.squash = Math.max(0, G.squash - dt * 6);
    const sx = 1 + G.squash * 0.18, sy = 1 - G.squash * 0.2, scale = weak() ? 0.82 : strong() ? 1.08 : 1;
    $("guy").style.transform = `translate(${G.x}px, ${-G.y}px)`;
    $("gbody").style.transform = `scale(${sx * scale}, ${sy * scale})`;
    $("guy").querySelector(".shadow").style.transform = `scale(${1 - Math.min(0.5, G.y / 80)})`;
    eyes(now);
    if (!G.busy && !drag) mouth(restingMouth());
  }

  function decide(now, room) {
    const r = Math.random(), m = mood();
    if (weak()) { G.tx = Math.max(0, Math.min(room, G.x + rnd(-15, 15))); G.next = now + rnd(3000, 6000); return; }
    if (m >= 75 && r < 0.2) { jump(strong() ? 170 : 140); setTimeout(() => jump(strong() ? 170 : 140), 450); G.next = now + rnd(2500, 4000); return; }
    if (strong() && r < 0.35) { flex(); G.next = now + 2500; return; }
    if (r < 0.75) G.tx = rnd(0, room);
    G.next = now + rnd(1800, 4200);
  }
  function jump(v) { if (G.y === 0) { G.vy = v; } }
  function flex() {
    const g = $("guy"); g.classList.add("flexing"); fx(["💪"], 1, "up");
    setTimeout(() => g.classList.remove("flexing"), 900);
  }

  function eyes(now) {
    const p = $("guy").querySelector(".pupils"), lids = $("guy").querySelector(".lids");
    let dx = Math.sign(G.tx - G.x) * 1.5, dy = 0;
    if (drag) { const r = $("guy").getBoundingClientRect(); dx = clamp((drag.x - (r.left + r.width / 2)) / 12); dy = clamp((drag.y - (r.top + r.height / 3)) / 12); }
    else if (G.look && now - G.look.t < 4000) { const r = $("guy").getBoundingClientRect(); dx = clamp((G.look.x - (r.left + r.width / 2)) / 25); dy = clamp((G.look.y - (r.top + r.height / 3)) / 25); }
    p.setAttribute("transform", `translate(${dx} ${dy})`);
    if (now > G.blinkAt) { G.blinkAt = now + rnd(2200, 5000); lids.classList.add("blink"); setTimeout(() => lids.classList.remove("blink"), 140); }
    lids.classList.toggle("sleepy", weak());
  }
  const clamp = (v) => Math.max(-2.2, Math.min(2.2, v));

  // ---------- touching him ----------
  function poke(e) {
    e.preventDefault();
    if (drag) return;
    G.busy = 1; jump(weak() ? 90 : 160); SFX.boing(); setTimeout(SFX.giggle, 150);
    mouth("grin"); fx(["❤️"], 1, "up");
    setTimeout(() => (G.busy = 0), 700);
  }

  let drag = null;
  function grab(e, kind) {
    e.preventDefault();
    if (kind === "food" && !(B.meals_left > 0)) { nope(); return; }
    const ghost = document.createElement("span");
    ghost.className = "ghost"; ghost.textContent = kind === "food" ? "🍖" : "🧽";
    document.body.appendChild(ghost);
    drag = { kind, ghost, x: e.clientX, y: e.clientY, lastScrubAt: 0 };
    move(e);
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", drop, { once: true });
  }
  function nope() {
    G.busy = 1; mouth("frown");
    const g = $("guy"); g.classList.add("shake"); setTimeout(() => { g.classList.remove("shake"); G.busy = 0; }, 500);
    window.showInfoHTML(`<div class="name">No meals ready</div><div class="about">${B.next_meal_xp != null ? `Work ${fmt(B.next_meal_xp)} more XP for the next meal.` : `He ate all ${B.max_meals} today.`}</div>`);
  }
  function near(px, py, pad = 0) {
    const r = $("gbody").getBoundingClientRect();
    return px > r.left - pad && px < r.right + pad && py > r.top - pad && py < r.bottom + pad;
  }
  function move(e) {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    drag.ghost.style.transform = `translate(${drag.x - 9}px, ${drag.y - 10}px)`;
    if (drag.kind === "food") { mouth(near(drag.x, drag.y, 22) ? "open" : restingMouth()); return; }
    if (near(drag.x, drag.y)) {  // scrubbing: foam where the sponge is, the dirt fades as you go
      G.scrub += Math.abs(dx) + Math.abs(dy);
      mouth("grin");
      const now = performance.now();
      if (now - drag.lastScrubAt > 70) { drag.lastScrubAt = now; foam(drag.x, drag.y); SFX.scrub(); }
      G.cleanShown = Math.min(100, B.clean + G.scrub / 4);
      paintDirt();
      if (G.scrub > 260 && !drag.done) { drag.done = true; washed(); }
    }
  }
  function drop() {
    document.removeEventListener("pointermove", move);
    const d = drag; drag = null; d.ghost.remove();
    if (d.kind === "food") {
      if (near(d.x, d.y, 22) && B.meals_left > 0 && B.food < 97) eat();
      else if (near(d.x, d.y, 22)) { nope(); window.showInfoHTML(`<div class="name">He's full</div><div class="about">Try again when his 🍖 bar drops.</div>`); }
    }
    G.scrub = d.done ? 0 : G.scrub;
  }
  function eat() {
    post({ action: "feed" });
    B.food = Math.min(100, B.food + B.meal); B.meals_left--;
    G.busy = 1; SFX.chomp(); SFX.yum();
    let i = 0; const t = setInterval(() => { mouth(i++ % 2 ? "chew" : "open"); if (i > 6) { clearInterval(t); mouth("grin"); jump(150); G.busy = 0; } }, 130);
    fx(["❤️", "😋", "❤️"], 3, "up");
    paintStats();
  }
  function washed() {
    if (B.clean <= 95) post({ action: "clean" });
    B.clean = 100; G.cleanShown = 100; G.scrub = 0;
    SFX.sparkle(); fx(["✨", "✨", "🫧", "✨"], 4, "up");
    paintStats();
  }
  function foam(x, y) {
    const f = document.createElement("span");
    f.className = "foam"; f.style.left = x - 5 + rnd(-6, 6) + "px"; f.style.top = y - 5 + rnd(-6, 6) + "px";
    f.style.setProperty("--s", rnd(6, 12) + "px");
    document.body.appendChild(f); setTimeout(() => f.remove(), 900);
  }
  function fx(glyphs, n, cls) {
    const g = $("guy");
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span");
      p.className = "bfx " + cls; p.textContent = glyphs[i % glyphs.length];
      p.style.left = 10 + rnd(0, 26) + "px"; p.style.setProperty("--dx", rnd(-18, 18) + "px");
      p.style.animationDelay = i * 0.12 + "s";
      g.appendChild(p); setTimeout(() => p.remove(), 1800 + i * 120);
    }
  }

  function info() {
    const meals = B.meals_left ? `${B.meals_left} meal${B.meals_left > 1 ? "s" : ""} ready` :
      B.next_meal_xp != null ? `next meal in ${fmt(B.next_meal_xp)} XP` : `all ${B.max_meals} eaten today`;
    return `<div class="name">Your lil guy</div>
      <div class="row"><span>🍖 Food:</span><span>${Math.round(B.food)}% · ${meals}</span></div>
      <div class="row"><span>🫧 Clean:</span><span>${Math.round(B.clean)}%</span></div>
      <div class="row"><span>💪 Strength:</span><span>${Math.round(B.strength)}%</span></div>
      <div class="about">Drag 🍖 to his mouth, scrub him with 🧽, poke him. Work earns meals; strength follows your last few days of work.</div>`;
  }

  window.Buddy = {
    render(stats) {
      B = stats.buddy ? { ...stats.buddy } : null;
      $("buddy").style.display = B ? "block" : "none";
      if (!B) return;
      if (!built) build();
      paintStats();
    },
  };
})();
