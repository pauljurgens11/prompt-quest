// Your lil guy: lives in a little room under the chest tray. Poke him, pick him up, throw him.
(function () {
  const $ = (id) => document.getElementById(id);
  const post = (data) => window.webkit?.messageHandlers?.panel?.postMessage({ type: "action", data });
  const rnd = (a, b) => a + Math.random() * (b - a);
  let built = false;

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
    thud: () => tone(110, 0, 0.12, "sine", 0.08, 60),
    whee: () => tone(500, 0, 0.35, "triangle", 0.05, 1200),
    dizzy: () => [1200, 900, 1200, 900].forEach((f, i) => tone(f, i * 0.09, 0.08, "sine", 0.03)),
  };

  // ---------- the lil guy (an SVG blob, coloured by your skin) ----------
  const MOUTH = {
    smile: '<path d="M24 37 Q30 43 36 37" fill="none" stroke="#2a1608" stroke-width="2" stroke-linecap="round"/>',
    grin: '<path d="M23 35 Q30 47 37 35 Z" fill="#2a1608"/><path d="M27 41 Q30 44 33 41 Z" fill="#ff7a8a"/>',
    open: '<ellipse cx="30" cy="39" rx="4.5" ry="5.5" fill="#2a1608"/><ellipse cx="30" cy="42" rx="3" ry="2" fill="#ff7a8a"/>',
    flat: '<path d="M25 39 L35 39" stroke="#2a1608" stroke-width="2" stroke-linecap="round"/>',
  };
  const svg = `<svg viewBox="0 0 60 60" class="gsvg">
    <ellipse class="foot" cx="21" cy="55" rx="6" ry="3.2"/><ellipse class="foot" cx="39" cy="55" rx="6" ry="3.2"/>
    <ellipse class="arm al" cx="7" cy="38" rx="4" ry="6"/><ellipse class="arm ar" cx="53" cy="38" rx="4" ry="6"/>
    <path class="body" d="M30 8 C46 8 54 22 54 36 C54 50 44 56 30 56 C16 56 6 50 6 36 C6 22 14 8 30 8 Z"/>
    <ellipse cx="30" cy="44" rx="15" ry="9" fill="rgba(255,255,255,.22)"/>
    <ellipse cx="22" cy="17" rx="6" ry="3" fill="rgba(255,255,255,.35)" transform="rotate(-25 22 17)"/>
    <ellipse class="cheek" cx="15" cy="36" rx="3.5" ry="2" fill="#ff8aa0"/><ellipse class="cheek" cx="45" cy="36" rx="3.5" ry="2" fill="#ff8aa0"/>
    <g class="eyes"><ellipse cx="22" cy="28" rx="5.5" ry="6.5" fill="#fff" stroke="#2a1608" stroke-width="1"/>
      <ellipse cx="38" cy="28" rx="5.5" ry="6.5" fill="#fff" stroke="#2a1608" stroke-width="1"/>
      <g class="pupils"><circle cx="22" cy="29" r="3" fill="#1a0c04"/><circle cx="38" cy="29" r="3" fill="#1a0c04"/>
        <circle cx="23" cy="27.6" r="1" fill="#fff"/><circle cx="39" cy="27.6" r="1" fill="#fff"/></g>
      <g class="lids"><rect x="16" y="20" width="12" height="7" rx="3"/><rect x="32" y="20" width="12" height="7" rx="3"/></g></g>
    <g class="mouth">${MOUTH.smile}</g></svg>`;

  // ---------- state of the scene ----------
  const G = { x: 60, y: 0, vy: 0, vx: 0, tx: 60, rot: 0, rotTo: 0, held: false, flying: false, down: false, hardest: 0, face: "smile", squash: 0, next: 0, look: null, blinkAt: 0, busy: 0, lastFrame: 0, knock: 0 };
  const W = () => $("room").clientWidth;
  const S = 1.5;  // pets are drawn small and shown big: the pet is the centrepiece of the room
  let GW = 46, GH = 46;  // his size: the blob's, or the equipped pet's

  function build() {
    const el = $("buddy");
    el.innerHTML = `<div class="room" id="room">
        <div class="say" id="say"></div>
        <div class="guy" id="guy"><div class="shadow"></div><span class="gmilk" id="gmilk">🥛</span>
          <div class="gbody" id="gbody">${svg}<div class="gface" id="gface"><span class="gpet" id="gpet"></span><span class="gwatch" id="gwatch">⌚</span><span class="ghat" id="ghat"><i class="tint"></i></span></div></div>
          <span class="gfeet" id="gfeet"><span class="gshoe l"><i class="tint"></i></span><span class="gshoe r"><i class="tint"></i></span></span></div>
        <div class="floor"></div></div>`;
    $("guy").onpointerdown = hold;
    document.addEventListener("pointermove", (e) => {
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
    body(eq.pet);
    const wear = (el, id) => {
      el.style.display = id ? "" : "none";
      if (!id) return;
      const d = D(id); el.title = d.name; el.style.setProperty("--rc", Loot.rarityColor(d.rarity));
      el.classList.remove("fx-common", "fx-rare", "fx-ultra", "fx-extraordinary"); el.classList.add("fx-" + d.rarity);
    };
    wear($("gwatch"), eq.watch); wear($("gmilk"), eq.milk); wear($("gfeet"), eq.shoes);
    wear($("ghat"), eq.hat);
    if (eq.hat) {  // the hat's brim follows his face; flip wears it backwards; tilt cocks it
      const h = D(eq.hat), i = $("ghat").querySelector("i");
      i.textContent = h.icon; i.style.setProperty("--tint", h.tint || "none");
      i.style.rotate = (h.tilt || 0) + "deg"; i.style.scale = h.flip ? "-1 1" : "";
    }
    G.shod = !!eq.shoes;
    if (eq.shoes) $("gfeet").querySelectorAll(".tint").forEach((t) => {
      const s = D(eq.shoes); t.textContent = s.icon; t.style.setProperty("--tint", s.tint || "none"); t.style.setProperty("--tilt", (s.tilt || 0) + "deg");
    });
    if (!eq.milk) { const m = $("gmilk"); m.style.display = ""; m.className = "gmilk empty"; m.title = "No milk yet: find one in a chest"; }
    else $("gmilk").classList.remove("empty");
    paintClass();
  }

  // the pet's drawing at room scale, and its hat, watch and shoes on its own head, wrist and feet
  function body(id) {
    const m = id && window.Pets && Pets.has(id) ? Pets.meta(id) : null, guy = $("guy");
    G.meta = m;
    GW = m ? Math.round(m.w * S) : 46; GH = m ? Math.round(m.h * S) : 46;
    guy.style.width = $("gbody").style.width = GW + "px";
    guy.style.height = $("gbody").style.height = GH + "px";
    $("gpet").innerHTML = m ? Pets.svg(id, GH) : id ? Loot.drop(id).icon : "";
    const lift = m ? Math.round(Math.max(9, Math.min(16, GW * 0.22)) * 0.55) : 7, fs = m ? Math.max(9, Math.min(16, GW * 0.22)) : 14;
    guy.style.setProperty("--lift", lift + "px");
    guy.style.bottom = 9 + (m ? m.float : 0) + "px";
    guy.querySelector(".shadow").style.bottom = -3 - (m ? m.float : 0) + "px";
    const hat = $("ghat"), watch = $("gwatch"), feet = $("gfeet");
    [hat, watch, feet].forEach((el) => el.removeAttribute("style"));
    feet.querySelectorAll(".gshoe").forEach((s) => s.removeAttribute("style"));
    if (!m) return;
    const [hx, hy, hs] = m.hat, size = hs * S * 1.25;  // the emoji draws the hat in the middle of its box: sink the box onto the head
    Object.assign(hat.style, { left: hx * S - size / 2 + "px", right: "auto", width: size + "px", top: hy * S - size * 0.42 + "px", fontSize: size + "px" });
    Object.assign(watch.style, { left: m.wrist[0] * S - 7 + "px", top: m.wrist[1] * S - 8 + "px", right: "auto", bottom: "auto" });
    // the shoe layer is mirrored whenever the pet is not (the shoe emoji points the other way), so place from the far edge
    const [fx1, fx2, fy] = m.feet;
    Object.assign(feet.style, { bottom: Math.round((m.h - fy) * S + lift - fs * 0.75) + "px", height: fs + "px" });
    feet.querySelectorAll(".gshoe").forEach((s, i) => Object.assign(s.style, { left: GW - [fx1, fx2][i] * S - fs / 2 + "px", fontSize: fs + "px" }));
  }

  function paintClass() {
    $("guy").className = "guy" + (G.pet ? " pet" : "") + (G.shod ? " shod" : "") + (G.right ? " right" : "") + (G.meta && G.meta.float ? " float" : "");
  }

  function mouth(m) {  // a pet shows it with its body instead (lean in, chomp, droop), styled by data-m
    if (G.face === m) return;
    G.face = m; $("guy").dataset.m = m;
    $("guy").querySelector(".mouth").innerHTML = MOUTH[m];
  }
  const restingMouth = () => "smile";

  // ---------- life: hops, landing squash, blinking, eyes that follow you ----------
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.body.classList.contains("compact")) return;
    const dt = Math.min(0.05, (now - (G.lastFrame || now)) / 1000); G.lastFrame = now;
    const room = W() - GW;
    if (room <= 0) return;  // the room is not laid out yet (page still loading)
    if (!G.placed) { G.placed = true; G.x = G.tx = room / 2; }  // he starts in the middle of his room
    if (now > G.next && !G.busy && !G.held && !G.flying && !G.down) decide(now, room);
    if (G.held) { /* follows your pointer (see carry) */ }
    else if (G.flying) fly(dt, room);
    else if (!G.down) walk(dt, now);
    if (!(G.x >= 0 && G.x <= room)) G.x = Number.isFinite(G.x) ? Math.max(0, Math.min(room, G.x)) : room / 2;  // never outside his room
    if (!(G.y >= 0)) G.y = 0;
    G.squash = Math.max(0, G.squash - dt * 6);
    G.rot += (G.rotTo - G.rot) * Math.min(1, dt * 12);
    const sx = 1 + G.squash * 0.18, sy = 1 - G.squash * 0.2, scale = 1;
    // only on change; .gbody and .guy are their own layers (will-change), so moving them never redraws the emoji
    const x = G.meta && G.meta.gait === "stutter" ? Math.round(G.x / 6) * 6 : G.x;  // Glitch moves in jumps, like a dropped frame
    set($("guy"), `translate(${x.toFixed(1)}px, ${(-G.y).toFixed(1)}px)`);
    set($("gbody"), `rotate(${G.rot.toFixed(1)}deg) scale(${(sx * scale).toFixed(2)}, ${(sy * scale).toFixed(2)})`);
    set($("guy").querySelector(".shadow"), `scale(${(1 - Math.min(0.5, G.y / 80)).toFixed(2)})`);
    $("guy").classList.toggle("idle", Math.abs(G.tx - G.x) <= 1 && G.y === 0 && !G.held && !G.flying && !G.down);
    $("guy").classList.toggle("walking", Math.abs(G.tx - G.x) > 1 && G.y === 0 && !G.held && !G.flying && !G.down);
    eyes(now);
    if (!nextChat) nextChat = now + rnd(4000, 8000);
    chatter(now); placeBubble(now);
    if (!G.busy && !G.held) mouth(restingMouth());
  }


  function set(el, t) { if (el._t !== t) { el._t = t; el.style.transform = t; } }
  // walk toward the target with a waddle; gravity pulls him down
  function walk(dt, now) {
    const hop = G.meta && G.meta.gait === "hop", speed = hop ? 55 : 26, moving = Math.abs(G.tx - G.x) > 1;
    if (moving && hop && G.y === 0 && G.vy === 0) G.vy = 150;  // the toad only gets anywhere in big hops
    if (moving && (!hop || G.y > 0)) G.x += Math.sign(G.tx - G.x) * Math.min(Math.abs(G.tx - G.x), speed * dt);
    G.rotTo = moving ? Math.sin(now / 170) * 3 : 0;  // a waddle while walking, still when standing
    if (G.y > 0 || G.vy > 0) {
      G.vy -= 520 * dt; G.y += G.vy * dt;
      if (G.y <= 0) { G.y = 0; G.vy = 0; G.squash = 1; }
    }
  }
  // thrown: flies, bounces off walls, ceiling and floor; a hard landing knocks him over
  const ceiling = () => $("room").clientHeight - 9 - GH - (G.meta ? G.meta.float : 0);
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
  // ---------- what he says: reactions at once, happy chatter now and then ----------
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const LINES = {
    happy: ["Let's ship! 🚀", "Feeling strong 💪", "You're crushing it", "Best day ever", "One more PR?", "I believe in you"],
    poke: ["Hey!", "Hehe", "That tickles!", "Boop!", "Hi!"],
    lift: ["Put me down!", "Whoa, high up!", "Wheee?"],
    throw: ["Wheee!", "Aaaa!", "Yeet!"],
    ouch: ["Ouch!", "My head…", "Again! Again!", "Seeing stars ⭐"],
  };
  let sayUntil = 0, nextChat = 0;
  function say(kind, ms = 3200) {
    const el = $("say");
    el.textContent = pick(LINES[kind]);
    el.className = "say show";
    sayUntil = performance.now() + ms;
  }
  function chatter(now) {  // happy talk every 40-70 s
    if (now < nextChat || now < sayUntil || G.held || G.flying || G.down) return;
    say("happy");
    nextChat = now + rnd(40000, 70000);
  }
  function placeBubble(now) {  // the bubble rides above his head and stays inside the room
    const el = $("say");
    if (now > sayUntil) { el.classList.remove("show"); return; }
    const w = el.offsetWidth, roomW = $("room").clientWidth;
    el.style.left = Math.max(2, Math.min(roomW - w - 2, G.x + GW / 2 - w / 2)) + "px";
    el.style.bottom = 9 + GH + (G.meta ? G.meta.float : 0) + 2 + G.y + "px";
    el.style.setProperty("--tail", Math.max(8, Math.min(w - 8, G.x + GW / 2 - parseFloat(el.style.left))) + "px");
  }

  function land() {
    G.tx = G.x;
    if (G.hardest < 300) { G.rotTo = 0; G.hardest = 0; return; }
    say("ouch");
    const k = ++G.knock;  // picking him up cuts this short (see hold)
    G.down = true; G.hardest = 0; G.busy = 1;  // falls over, sees stars, gets back up
    G.rotTo = G.rot >= 0 ? 90 : -90; mouth("flat"); fx(["💫", "⭐", "💫"], 3, "up"); SFX.dizzy();
    setTimeout(() => {
      if (k !== G.knock) return;
      G.rotTo = 0; G.down = false; mouth("smile"); setTimeout(() => { if (k === G.knock) { jump(120); G.busy = 0; } }, 250);
    }, 1400);
  }

  function decide(now, room) {
    const r = Math.random();
    G.next = now + rnd(4000, 9000);  // mostly he just stands there and breathes
    if (r < 0.1) { jump(130); return; }
    if (r < 0.18) { flex(); return; }
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
      const r = $("guy").getBoundingClientRect(), at = G.look && now - G.look.t < 4000 ? G.look : null;
      let want = G.right;
      if (Math.abs(G.tx - G.x) > 1) want = G.tx > G.x;
      else if (at) { const off = at.x - (r.left + r.width / 2); if (off > 24) want = true; else if (off < -24) want = false; }
      if (want !== G.right && now - (G.turnedAt || 0) > 1000) { G.right = want; G.turnedAt = now; $("guy").classList.toggle("right", want); }
      return;
    }
    if (G.look && now - G.look.t < 4000) { const r = $("guy").getBoundingClientRect(); dx = clamp((G.look.x - (r.left + r.width / 2)) / 25); dy = clamp((G.look.y - (r.top + r.height / 3)) / 25); }
    p.setAttribute("transform", `translate(${dx} ${dy})`);
    if (now > G.blinkAt) { G.blinkAt = now + rnd(2200, 5000); lids.classList.add("blink"); setTimeout(() => lids.classList.remove("blink"), 140); }
  }
  const clamp = (v) => Math.max(-2.2, Math.min(2.2, v));

  // ---------- touching him: a tap pokes, a drag carries him, letting go throws him ----------
  // The guy captures the pointer, so a flick that ends past the panel edge still reaches release.
  // Throw speed is your hand's speed over its last 80 ms: a pause before letting go is a gentle drop.
  let grip = null;
  const WINDOW = 80;
  function hold(e) {
    e.preventDefault();
    if (grip) return;
    if (G.down) { G.knock++; G.down = false; G.busy = 0; G.rotTo = 0; }  // grab him even while he sees stars
    const g = $("guy");
    try { g.setPointerCapture(e.pointerId); } catch (err) { /* no capture: the window still sends most moves */ }
    grip = { x0: e.clientX, y0: e.clientY, moved: false, pts: [[performance.now(), e.clientX, e.clientY]] };
    grip.timer = setTimeout(() => grip && !grip.moved && lift(grip.x0, grip.y0), 250);  // hold still: up he goes
    g.onpointermove = carry;
    g.onpointerup = g.onpointercancel = g.onlostpointercapture = release;
  }
  function carry(e) {
    if (!grip) return;
    track(e.clientX, e.clientY);
    if (!grip.moved && Math.hypot(e.clientX - grip.x0, e.clientY - grip.y0) < 4) return;
    if (!grip.moved) lift(e.clientX, e.clientY);
    place(e.clientX, e.clientY);
  }
  function lift(x, y) {
    grip.moved = true; G.held = true; G.flying = false; G.vx = G.vy = 0; mouth("open"); SFX.boing();
    $("guy").classList.add("dangling");
    place(x, y - 18);
    say("lift", 2000);
  }
  function place(cx, cy) {
    const r = $("room").getBoundingClientRect(), room = W() - GW;
    G.x = Math.max(0, Math.min(room, cx - r.left - GW / 2));
    G.y = Math.max(0, Math.min(ceiling(), r.bottom - 9 - (G.meta ? G.meta.float : 0) - (cy + GH / 2)));
    G.rotTo = Math.max(-35, Math.min(35, -velocity()[0] * 0.05));  // he dangles behind your hand
  }
  function track(x, y) {
    const now = performance.now();
    grip.pts.push([now, x, y]);
    while (grip.pts.length > 2 && now - grip.pts[1][0] > WINDOW) grip.pts.shift();  // keep one sample older than the window
  }
  function velocity() {  // px/s, up is positive; from the oldest sample in the window to the newest
    const p = grip.pts, a = p[0], b = p[p.length - 1], now = performance.now();
    if (p.length < 2 || now - b[0] > WINDOW) return [0, 0];  // no movement lately: a drop, not a throw
    const dt = Math.max(0.016, (b[0] - a[0]) / 1000);
    return [(b[1] - a[1]) / dt, -(b[2] - a[2]) / dt];
  }
  function release(e) {
    const g = grip; grip = null;
    if (!g) return;
    const el = $("guy");
    el.onpointermove = el.onpointerup = el.onpointercancel = el.onlostpointercapture = null;
    clearTimeout(g.timer); el.classList.remove("dangling");
    if (!g.moved) { if (e.type === "pointerup") poke(); return; }
    grip = g; if (e.clientX || e.clientY) track(e.clientX, e.clientY);
    const [vx, vy] = velocity(); grip = null;
    G.held = false; G.flying = true; G.hardest = 0;
    G.vx = Math.max(-900, Math.min(900, vx));
    G.vy = Math.max(-900, Math.min(900, vy));
    if (Math.hypot(G.vx, G.vy) > 250) { SFX.whee(); mouth("grin"); say("throw", 1500); }
  }
  function poke() {
    G.busy = 1; jump(160); SFX.boing(); setTimeout(SFX.giggle, 150);
    mouth("grin"); fx(["❤️"], 1, "up"); say("poke", 1800);
    setTimeout(() => (G.busy = 0), 700);
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

  window.Buddy = {
    gear,
    peek: () => ({ ...G }),  // read-only look at his physics, for testing
    render(stats) {
      $("buddy").style.display = stats.buddy ? "block" : "none";
      if (stats.buddy && !built) build();
    },
  };
})();
