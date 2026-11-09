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
    thud: () => tone(110, 0, 0.12, "sine", 0.08, 60),
    whee: () => tone(500, 0, 0.35, "triangle", 0.05, 1200),
    dizzy: () => [1200, 900, 1200, 900].forEach((f, i) => tone(f, i * 0.09, 0.08, "sine", 0.03)),
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
  const G = { x: 60, y: 0, vy: 0, vx: 0, tx: 60, rot: 0, rotTo: 0, held: false, flying: false, down: false, hardest: 0, face: "smile", squash: 0, next: 0, look: null, blinkAt: 0, busy: 0,
              scrub: 0, cleanShown: 100, lastFrame: 0 };
  const W = () => $("room").clientWidth - 60, GW = 46;  // the right end of the floor holds his plate and sponge

  function build() {
    const el = $("buddy");
    el.innerHTML = `<div class="room" id="room">
        <div class="bars" id="bbars"></div>
        <div class="say" id="say"></div>
        <div class="guy" id="guy"><div class="shadow"></div><span class="gmilk" id="gmilk">🥛</span>
          <div class="gbody" id="gbody">${svg}<span class="gpet" id="gpet"></span><div class="pdirt" id="pdirt"></div><span class="gwatch" id="gwatch">⌚</span></div>
          <span class="fly f1"></span><span class="fly f2"></span></div>
        <div class="poops" id="poops"></div>
        <div class="tools"><span class="tool food" id="tFood" title="Drag to his mouth"><span class="ico">🍖</span><b id="meals"></b></span>
          <span class="tool sponge" id="tSponge" title="Scrub him"><span class="ico">🧽</span><i class="sb s1"></i><i class="sb s2"></i></span></div>
        <div class="floor"></div></div>`;
    $("guy").onpointerdown = hold;
    $("tFood").onpointerdown = (e) => grab(e, "food");
    $("tSponge").onpointerdown = (e) => grab(e, "sponge");
    $("room").onmouseenter = () => window.showInfoHTML(info());
    $("room").onmouseleave = () => window.showInfoHTML(null);
    document.addEventListener("pointermove", (e) => {
      if (e.buttons === 0 && (grip || drag)) cancelHold();  // the button was let go somewhere we did not hear it
      const r = $("room").getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) G.look = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    built = true;
    gear();
    requestAnimationFrame(frame);
  }

  // your equipped pet is the lil guy (the blob stands in without one), wearing your watch, milk beside him
  function gear() {
    if (!built || !window.Loot) return;
    const eq = Loot.equipped(), D = (id) => Loot.drop(id);
    G.pet = !!eq.pet;
    $("gpet").textContent = eq.pet ? D(eq.pet).icon : "";
    const wear = (el, id) => {
      el.style.display = id ? "" : "none";
      if (!id) return;
      const d = D(id); el.title = d.name; el.style.setProperty("--rc", Loot.rarityColor(d.rarity));
      el.classList.remove("fx-common", "fx-rare", "fx-ultra", "fx-extraordinary"); el.classList.add("fx-" + d.rarity);
    };
    wear($("gwatch"), eq.watch); wear($("gmilk"), eq.milk);
    if (!eq.milk) { const m = $("gmilk"); m.style.display = ""; m.className = "gmilk empty"; m.title = "No milk yet: find one in a chest"; }
    else $("gmilk").classList.remove("empty");
    if (B) paintStats();
  }

  const mood = () => (B.food + B.clean + B.strength) / 3;
  const weak = () => B.strength < 35, strong = () => B.strength >= 85 && mood() >= 70;

  function paintStats() {
    const bar = (icon, v, low) => `<div class="bbar ${v < low ? "low" : ""}"><span>${icon}</span><b><i style="width:${Math.max(2, v)}%"></i></b></div>`;
    $("bbars").innerHTML = bar("🍖", B.food, 25) + bar("🫧", B.clean, 30) + bar("💪", B.strength, 35);
    $("meals").textContent = "×" + B.meals_left;
    $("tFood").classList.toggle("dis", !(B.meals_left > 0));
    $("guy").className = "guy" + (G.pet ? " pet" : "") + (G.right ? " right" : "") + (weak() ? " weak" : "") + (strong() ? " strong" : "") + (B.clean < 30 ? " filthy" : "") + (mood() >= 70 ? " happy" : "");
    if (!drag) G.cleanShown = B.clean;
    paintDirt();
    paintPoops();
  }
  // poops he left: click one to clean it up for a coin
  const scooped = new Set();
  function paintPoops() {
    const el = $("poops");
    el.innerHTML = (B.poops || []).filter((p) => !scooped.has(p.id))
      .map((p) => `<span class="poop" data-id="${p.id}" style="left:${p.x}%" title="Clean up: +1 coin">💩<i class="stinkl">〰</i></span>`).join("");
    el.querySelectorAll(".poop").forEach((p) => (p.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); scoop(p); }));
  }
  function scoop(el) {
    const id = el.dataset.id;
    if (scooped.has(id)) return;
    scooped.add(id);
    post({ action: "scoop", poop: id });
    SFX.sparkle(); tone(1568, 0.15, 0.08, "square", 0.03); tone(2093, 0.2, 0.1, "square", 0.025);
    const coin = document.createElement("span");
    coin.className = "bfx up"; coin.textContent = "+1 🪙"; coin.style.left = el.style.left; coin.style.bottom = "14px";
    $("room").appendChild(coin); setTimeout(() => coin.remove(), 1700);
    el.classList.add("gone"); setTimeout(() => el.remove(), 300);
  }
  function paintDirt() {
    const n = Math.round((100 - G.cleanShown) / 14);
    $("pdirt").innerHTML = G.pet ? SPOTS.slice(0, n).map(([x, y], i) =>
      `<i style="left:${(x / 60) * 100}%;top:${(y / 60) * 100}%;width:${4 + (i % 3)}px;height:${4 + (i % 3)}px"></i>`).join("") : "";
    $("guy").querySelector(".dirt").innerHTML = SPOTS.slice(0, n).map(([x, y], i) =>
      `<circle cx="${x}" cy="${y}" r="${2.2 + (i % 3) * 0.7}" fill="#5a3b16" opacity=".8"/>`).join("");
  }

  function mouth(m) {  // a pet shows it with its body instead (lean in, chomp, droop), styled by data-m
    if (G.face === m) return;
    G.face = m; $("guy").dataset.m = m;
    $("guy").querySelector(".mouth").innerHTML = MOUTH[m];
  }
  function restingMouth() { return B.food < 25 ? "frown" : weak() ? "flat" : mood() >= 75 ? "grin" : "smile"; }

  // ---------- life: hops, landing squash, blinking, eyes that follow you ----------
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.body.classList.contains("compact") || !B) return;
    const dt = Math.min(0.05, (now - (G.lastFrame || now)) / 1000); G.lastFrame = now;
    const room = W() - GW;
    if (room <= 0) return;  // the room is not laid out yet (page still loading)
    if (!G.placed) { G.placed = true; G.x = G.tx = room / 2; }  // he starts in the middle of his room
    if (now > G.next && !G.busy && !drag && !G.held && !G.flying && !G.down) decide(now, room);
    if (G.held) { /* follows your pointer (see carry) */ }
    else if (G.flying) fly(dt, room);
    else if (!G.down) walk(dt, now);
    if (!(G.x >= 0 && G.x <= room)) G.x = Number.isFinite(G.x) ? Math.max(0, Math.min(room, G.x)) : room / 2;  // never outside his room
    if (!(G.y >= 0)) G.y = 0;
    G.squash = Math.max(0, G.squash - dt * 6);
    G.rot += (G.rotTo - G.rot) * Math.min(1, dt * 12);
    const sx = 1 + G.squash * 0.18, sy = 1 - G.squash * 0.2, scale = weak() ? 0.82 : strong() ? 1.08 : 1;
    // only on change; .gbody and .guy are their own layers (will-change), so moving them never redraws the emoji
    set($("guy"), `translate(${G.x.toFixed(1)}px, ${(-G.y).toFixed(1)}px)`);
    set($("gbody"), `rotate(${G.rot.toFixed(1)}deg) scale(${(sx * scale).toFixed(2)}, ${(sy * scale).toFixed(2)})`);
    set($("guy").querySelector(".shadow"), `scale(${(1 - Math.min(0.5, G.y / 80)).toFixed(2)})`);
    $("guy").classList.toggle("idle", Math.abs(G.tx - G.x) <= 1 && G.y === 0 && !G.held && !G.flying && !G.down);
    eyes(now);
    if (!nextChat) nextChat = now + rnd(4000, 8000);
    chatter(now); placeBubble(now);
    if (!G.busy && !drag && !G.held) mouth(restingMouth());
  }


  function set(el, t) { if (el._t !== t) { el._t = t; el.style.transform = t; } }
  // walk toward the target with a waddle; gravity pulls him down
  function walk(dt, now) {
    const speed = weak() ? 12 : 26, moving = Math.abs(G.tx - G.x) > 1;
    if (moving) G.x += Math.sign(G.tx - G.x) * Math.min(Math.abs(G.tx - G.x), speed * dt);
    G.rotTo = moving ? Math.sin(now / 170) * 3 : 0;  // a waddle while walking, still when standing
    if (G.y > 0 || G.vy > 0) {
      G.vy -= 520 * dt; G.y += G.vy * dt;
      if (G.y <= 0) { G.y = 0; G.vy = 0; G.squash = 1; }
    }
  }
  // thrown: flies, bounces off walls, ceiling and floor; a hard landing knocks him over
  const ceiling = () => $("room").clientHeight - 9 - GW;
  function fly(dt, room) {
    G.vy -= 700 * dt; G.x += G.vx * dt; G.y += G.vy * dt;
    G.rotTo = Math.max(-40, Math.min(40, G.vx * 0.06));
    if (G.x < 0 || G.x > room) { G.x = Math.max(0, Math.min(room, G.x)); G.hardest = Math.max(G.hardest, Math.abs(G.vx)); G.vx = -G.vx * 0.55; bonk(); }
    if (G.y > ceiling()) { G.y = ceiling(); G.vy = -Math.abs(G.vy) * 0.4; bonk(); }
    if (G.y <= 0) {
      G.y = 0; G.hardest = Math.max(G.hardest, -G.vy); G.squash = 1;
      if (-G.vy > 140) { G.vy = -G.vy * 0.35; G.vx *= 0.6; SFX.thud(); }
      else { G.vy = 0; G.vx = 0; G.flying = false; land(); }
    }
  }
  function bonk() { SFX.thud(); G.squash = 0.8; }
  // ---------- what he says: his needs every now and then, reactions at once, chatter when happy ----------
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const LINES = {
    hungry: ["Feed me? 🍖", "My tummy is rumbling", "So hungry…", "Is it snack time? 🍖"],
    hungryNoMeals: ["Go work, then feed me!", "Earn me a snack? 🍖", "Hungry… go ship something"],
    dirty: ["I stink 🤢", "Scrub me pls 🧽", "Bath time?", "Something smells. It's me."],
    weak: ["So tired… go work 💤", "I need you to work 💤", "Feeling weak…"],
    poop: ["Oops 💩", "Clean that up? 💩", "Not my best moment 💩"],
    happy: ["Let's ship! 🚀", "Feeling strong 💪", "You're crushing it", "Best day ever", "One more PR?", "I believe in you"],
    poke: ["Hey!", "Hehe", "That tickles!", "Boop!", "Hi!"],
    lift: ["Put me down!", "Whoa, high up!", "Wheee?"],
    throw: ["Wheee!", "Aaaa!", "Yeet!"],
    ouch: ["Ouch!", "My head…", "Again! Again!", "Seeing stars ⭐"],
    eat: ["Yum!", "Delicious 😋", "More please!", "Nom nom"],
    clean: ["So fresh ✨", "Squeaky clean!", "Ahh, better"],
    noMeals: ["No snacks yet. Go work!", "Earn me a meal first"],
    full: ["I'm full!", "No more, I'm stuffed"],
  };
  let sayUntil = 0, nextChat = 0;
  function say(kind, ms = 3200) {
    const el = $("say");
    el.textContent = pick(LINES[kind]);
    el.className = "say show" + (["hungry", "hungryNoMeals", "dirty", "weak", "poop"].includes(kind) ? " need" : "");
    sayUntil = performance.now() + ms;
  }
  function chatter(now) {  // needs come up every 15-25 s until fixed; happy talk every 40-70 s
    if (now < nextChat || now < sayUntil || G.held || G.flying || G.down) return;
    const poopy = (B.poops || []).some((p) => !scooped.has(p.id));
    const need = B.food < 25 ? (B.meals_left > 0 ? "hungry" : "hungryNoMeals") : B.clean < 30 ? "dirty" : weak() ? "weak" : poopy ? "poop" : null;
    if (need) { say(need); nextChat = now + rnd(15000, 25000); return; }
    if (mood() >= 75) say("happy");
    nextChat = now + rnd(40000, 70000);
  }
  function placeBubble(now) {  // the bubble rides above his head and stays inside the room
    const el = $("say");
    if (now > sayUntil) { el.classList.remove("show"); return; }
    const w = el.offsetWidth, roomW = $("room").clientWidth;
    el.style.left = Math.max(2, Math.min(roomW - w - 2, G.x + GW / 2 - w / 2)) + "px";
    el.style.bottom = 9 + GW + 2 + G.y + "px";
    el.style.setProperty("--tail", Math.max(8, Math.min(w - 8, G.x + GW / 2 - parseFloat(el.style.left))) + "px");
  }

  function land() {
    G.tx = G.x;
    if (G.hardest < 300) { G.rotTo = 0; G.hardest = 0; return; }
    say("ouch");
    G.down = true; G.hardest = 0; G.busy = 1;  // falls over, sees stars, gets back up
    G.rotTo = G.rot >= 0 ? 90 : -90; mouth("flat"); fx(["💫", "⭐", "💫"], 3, "up"); SFX.dizzy();
    setTimeout(() => { G.rotTo = 0; G.down = false; mouth("smile"); setTimeout(() => { jump(120); G.busy = 0; }, 250); }, 1400);
  }

  function decide(now, room) {
    const r = Math.random(), m = mood();
    G.next = now + rnd(4000, 9000);  // mostly he just stands there and breathes
    if (weak()) { if (r < 0.3) G.tx = Math.max(0, Math.min(room, G.x + rnd(-15, 15))); return; }
    if (m >= 75 && r < 0.1) { jump(strong() ? 150 : 120); return; }
    if (strong() && r < 0.18) { flex(); return; }
    if (r < 0.6) {  // a stroll to anywhere in the room, at least a few steps away
      let t = rnd(0, room);
      if (Math.abs(t - G.x) < 25) t = G.x < room / 2 ? Math.min(room, G.x + rnd(25, 60)) : Math.max(0, G.x - rnd(25, 60));
      G.tx = t;
    }
  }
  function jump(v) { if (G.y === 0) { G.vy = v; } }
  function flex() {
    const g = $("guy"); g.classList.add("flexing"); fx(["💪"], 1, "up");
    setTimeout(() => g.classList.remove("flexing"), 900);
  }

  function eyes(now) {
    const p = $("guy").querySelector(".pupils"), lids = $("guy").querySelector(".lids");
    let dx = Math.sign(G.tx - G.x) * 1.5, dy = 0;
    if (G.pet) {  // a pet turns to face you (pet emoji look left, so mirror to look right)
      const r = $("guy").getBoundingClientRect(), at = drag || (G.look && now - G.look.t < 4000 ? G.look : null);
      let want = G.right;
      if (Math.abs(G.tx - G.x) > 1 && !drag) want = G.tx > G.x;
      else if (at) { const off = at.x - (r.left + r.width / 2); if (off > 24) want = true; else if (off < -24) want = false; }
      if (want !== G.right && now - (G.turnedAt || 0) > 1000) { G.right = want; G.turnedAt = now; $("guy").classList.toggle("right", want); }
      return;
    }
    if (drag) { const r = $("guy").getBoundingClientRect(); dx = clamp((drag.x - (r.left + r.width / 2)) / 12); dy = clamp((drag.y - (r.top + r.height / 3)) / 12); }
    else if (G.look && now - G.look.t < 4000) { const r = $("guy").getBoundingClientRect(); dx = clamp((G.look.x - (r.left + r.width / 2)) / 25); dy = clamp((G.look.y - (r.top + r.height / 3)) / 25); }
    p.setAttribute("transform", `translate(${dx} ${dy})`);
    if (now > G.blinkAt) { G.blinkAt = now + rnd(2200, 5000); lids.classList.add("blink"); setTimeout(() => lids.classList.remove("blink"), 140); }
    lids.classList.toggle("sleepy", weak());
  }
  const clamp = (v) => Math.max(-2.2, Math.min(2.2, v));

  // ---------- touching him: a tap pokes, a drag carries him, letting go throws him ----------
  let grip = null;
  function hold(e) {
    e.preventDefault();
    if (drag || G.down) return;
    grip = { x0: e.clientX, y0: e.clientY, moved: false, vx: 0, vy: 0, lx: e.clientX, ly: e.clientY, lt: performance.now() };
    grip.timer = setTimeout(() => grip && !grip.moved && lift(grip.x0, grip.y0), 250);  // hold still: up he goes
    document.addEventListener("pointermove", carry);
    document.addEventListener("pointerup", release, { once: true });
  }
  function carry(e) {
    if (!grip) return;
    track(e.clientX, e.clientY);
    if (!grip.moved && Math.hypot(e.clientX - grip.x0, e.clientY - grip.y0) < 4) return;
    if (!grip.moved) lift(e.clientX, e.clientY);
    place(e.clientX, e.clientY);
  }
  function lift(x, y) {
    grip.moved = true; G.held = true; G.flying = false; G.vy = 0; mouth("open"); SFX.boing();
    $("guy").classList.add("dangling");
    place(x, y - 18);
    say("lift", 2000);
  }
  function place(cx, cy) {
    const r = $("room").getBoundingClientRect(), room = W() - GW, e = { clientX: cx, clientY: cy };
    G.x = Math.max(0, Math.min(room, e.clientX - r.left - GW / 2));
    G.y = Math.max(0, Math.min(ceiling(), r.bottom - 9 - (e.clientY + GW / 2)));
    G.rotTo = Math.max(-35, Math.min(35, -grip.vx * 0.05));  // he dangles behind your hand
  }
  // your hand's speed, from the real pointer (not his clamped position), smoothed over every move
  function track(x, y) {
    const now = performance.now(), dt = Math.max(0.008, (now - grip.lt) / 1000);
    grip.vx = grip.vx * 0.5 + ((x - grip.lx) / dt) * 0.5;
    grip.vy = grip.vy * 0.5 + (-(y - grip.ly) / dt) * 0.5;
    grip.lx = x; grip.ly = y; grip.lt = now;
  }
  function release() {
    document.removeEventListener("pointermove", carry);
    const g = grip; grip = null;
    if (!g) return;
    clearTimeout(g.timer); $("guy").classList.remove("dangling");
    if (!g.moved) { poke(); return; }
    G.held = false;
    // still moving when you let go: full throw; a clear pause first (over 60 ms) fades it to a drop
    const idle = performance.now() - g.lt, keep = idle < 60 ? 1 : Math.max(0, 1 - (idle - 60) / 120);
    G.vx = Math.max(-900, Math.min(900, g.vx * keep));
    G.vy = Math.max(-900, Math.min(900, g.vy * keep));
    G.flying = true; G.hardest = 0;
    if (Math.hypot(G.vx, G.vy) > 250) { SFX.whee(); mouth("grin"); say("throw", 1500); }
  }
  function cancelHold() {
    if (grip) { document.removeEventListener("pointermove", carry); clearTimeout(grip.timer); grip = null; G.held = false; G.flying = true; $("guy").classList.remove("dangling"); }
    if (drag) { document.removeEventListener("pointermove", move); drag.ghost.remove(); drag = null; }
    G.busy = 0;
  }
  function poke() {
    if (drag) return;
    G.busy = 1; jump(weak() ? 90 : 160); SFX.boing(); setTimeout(SFX.giggle, 150);
    mouth("grin"); fx(["❤️"], 1, "up"); say("poke", 1800);
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
    say("noMeals", 2600);
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
      else if (near(d.x, d.y, 22)) { nope(); say("full", 2200); window.showInfoHTML(`<div class="name">He's full</div><div class="about">Try again when his 🍖 bar drops.</div>`); }
    }
    G.scrub = d.done ? 0 : G.scrub;
  }
  function eat() {
    post({ action: "feed" });
    B.food = Math.min(100, B.food + B.meal); B.meals_left--;
    G.busy = 1; SFX.chomp(); SFX.yum();
    let i = 0; const t = setInterval(() => { mouth(i++ % 2 ? "chew" : "open"); if (i > 6) { clearInterval(t); mouth("grin"); jump(150); G.busy = 0; } }, 130);
    fx(["❤️", "😋", "❤️"], 3, "up"); say("eat", 2200);
    paintStats();
  }
  function washed() {
    if (B.clean <= 95) post({ action: "clean" });
    B.clean = 100; G.cleanShown = 100; G.scrub = 0;
    SFX.sparkle(); fx(["✨", "✨", "🫧", "✨"], 4, "up"); say("clean", 2200);
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
    gear,
    peek: () => ({ ...G }),  // read-only look at his physics, for testing
    render(stats) {
      B = stats.buddy ? { ...stats.buddy } : null;
      $("buddy").style.display = B ? "block" : "none";
      if (!B) return;
      if (!built) build();
      paintStats();
    },
  };
})();
