// The pets and their gear as low-poly 3D models (rendered by lowpoly.js).
// Every pet faces -x, stands on y = 0 and has sockets: head (hats), feet (a shoe on every foot), wrist (watch).
// Gear models hang off those sockets, so they follow every animation and turn with the pet.
(function () {
  const { sphere, cyl, box, poly, extrude, tube, brim, node, render } = window.LowPoly;
  const PI = Math.PI, sock = (p = [0, 0, 0], r = [0, 0, 0]) => node(null, p, r);
  // a leg hanging down from a hip; its foot socket is turned upright again so shoes stand on the ground
  function leg(hip, len, r1, r2, col, foot) {
    const s = sock([0, len, 0], [PI, 0, 0]), w = sock([0, len * 0.5, 0]);
    const n = node(null, hip, [PI, 0, 0]), m = node(cyl(r1, r2, len, col, 5));
    s.level = n;  // the shoe stays flat on the floor however the leg swings (see draw)
    s.leg = m; s.len = len;  // a shod leg is cut short at the shoe's collar (see dress)
    const kids = [m, s, w];
    if (foot) kids.push((s.foot = node(foot, [0, len, 0])));  // his own foot hides inside a shoe
    n.kids = kids;
    return { n, s, w };
  }
  const chain = (specs, firstP) => {  // a bendy chain (tails, tentacles): each segment sits on the end of the last
    let tip = null; const segs = [];
    for (let i = specs.length - 1; i >= 0; i--) {
      const [mesh, len] = specs[i];
      const seg = node(mesh, i === 0 ? firstP || [0, 0, 0] : [0, specs[i - 1][1], 0], [0, 0, 0], tip ? [tip] : []);
      segs.unshift(seg); tip = seg;
    }
    return segs;
  };

  // ---------------------------------------------------------------- pets
  const PETS = {
    pebble() {
      const C = "#8a8478", D = "#6a645a", head = sock([0, 5, 0]);
      const body = node(sphere(7, 5, 6, C, 7, 5), [0, 5, 0], [0, 0, 0], [
        node(sphere(1.3, 0.8, 1.3, D, 4, 3), [2, 3, 3.6]), node(sphere(1, 0.7, 1, D, 4, 3), [3, 1, -4.6]), node(sphere(1.1, 0.6, 1.1, D, 4, 3), [-2, 4, -3]),
        node(sphere(3.6, 1.3, 3.2, "#5a8a3a", 6, 3), [1.5, 4.4, 0.6]),
        node(sphere(1.1, 1.4, 1, "#16120e", 5, 4), [-6, 1, 2.3]), node(sphere(1.1, 1.4, 1, "#16120e", 5, 4), [-6, 1, -2.3]),
        node(box(0.5, 0.5, 0.5, "#ffffff!"), [-6.9, 1.7, 2.6]), node(box(0.5, 0.5, 0.5, "#ffffff!"), [-6.9, 1.7, -2]),
        head,
      ]);
      const footL = sock([-1.5, 0, 3]), footR = sock([-1.5, 0, -3]), wrist = sock([1, 3.6, 5.4], [PI / 2, 0, 0]);
      const neck = sock([0, 7.2, 0], [0, 0, 0.15]), root = node(null, [0, 0, 0], [0, 0, 0], [body, footL, footR, wrist, neck]);
      return { root, sockets: { head, feet: [footL, footR], wrist, neck }, ns: [6.5, 5.6], hs: 0.6, fs: 0.62, ws: 0.6, gait: "hop",
        anim(t, st) { body.p[1] = 5 + (st.shod ? 2 : 0); body.r[2] = Math.sin(t * 1.7) * 0.06; body.s[1] = 1 + Math.sin(t * 2.2) * 0.03; } };
    },

    owl() {
      const B = "#4b4688", L = "#8d86cc", W = "#3a3670", O = "#ff9f3a";
      const px = [[-0.65, 0.4, -0.7, 0.6, 1.8], [-0.65, 1.1, 0.6, 0.6, 0.6], [-0.65, -0.4, 0.6, 0.6, 0.6]];
      const eye = (z) => node(box(1.2, 4.4, 3.8, "#06131a"), [-5.6, 0.6, z], [0, 0, 0], px.map(([x, y, zz, w, h]) => node(box(0.4, h, w, "#3ff0ff!"), [x, y, zz])));
      const eyes = [eye(2.6), eye(-2.6)], hs = sock([0, 5.4, 0]);
      const head = node(sphere(6.5, 5.6, 6.5, B, 8, 5), [0, 20.5, 0], [0, 0, 0], [
        node(cyl(1.7, 0, 4.5, W, 4), [1, 4.2, 3.2], [0.3, 0, -0.35]), node(cyl(1.7, 0, 4.5, W, 4), [1, 4.2, -3.2], [-0.3, 0, -0.35]),
        ...eyes, node(cyl(1.4, 0, 3, O, 4), [-6, -2, 0], [0, 0, PI / 2 + 0.6]), hs,
      ]);
      const neck = sock([0, 15.6, 0]), wingL = node(sphere(2.6, 6, 4.6, W, 6, 4), [1, 11, 6.2], [0.15, 0, 0]), wingR = node(sphere(2.6, 6, 4.6, W, 6, 4), [1, 11, -6.2], [-0.15, 0, 0]);
      const wrist = sock([0, -3.5, 1.2]); wingL.kids.push(wrist);
      const lL = leg([-1, 3.4, 2.6], 3.4, 1, 0.9, O, box(3, 0.8, 2.2, O)), lR = leg([-1, 3.4, -2.6], 3.4, 1, 0.9, O, box(3, 0.8, 2.2, O));
      const root = node(null, [0, 0, 0], [0, 0, 0], [lL.n, lR.n, node(sphere(7, 8, 6.5, B, 8, 5), [0, 11, 0]), node(sphere(4.4, 6, 3.6, L, 6, 4), [-3.8, 10, 0]), wingL, wingR, head, neck]);
      return { root, sockets: { head: hs, feet: [lL.s, lR.s], wrist, neck }, ns: [5.8, 5.4], hs: 0.85, fs: 0.72, ws: 0.9,
        anim(t, st) {
          head.r[1] = 0.85 * Math.max(-1, Math.min(1, Math.sin(t * 0.55) * 2.2));  // the head swivels, owl style
          const blink = t % 4 < 0.12; eyes.forEach((e) => (e.s[1] = blink ? 0.1 : 1));
          const sw = st.walk ? Math.sin(t * 10) * 0.45 : 0; lL.n.r[2] = sw; lR.n.r[2] = -sw;
          const fl = st.held || st.fly ? Math.sin(t * 14) * 0.7 : Math.sin(t * 1.5) * 0.05; wingL.r[0] = 0.15 + fl; wingR.r[0] = -0.15 - fl;
        } };
    },

    toad() {
      const G = "#5a8a34", D = "#3a6020", Y = "#d8cc72", E = "#e8d23a";
      const sac = node(sphere(5.5, 4.2, 5.5, "#efe6a0", 6, 4), [-12, 6, 0]);
      const eye = (z) => node(sphere(4.4, 4.4, 4.4, G, 6, 4), [-7, 17, z], [0, 0, 0], [node(sphere(3.4, 3.2, 3.2, E, 6, 4), [-2.4, 1, 0], [0, 0, 0], [node(box(1.2, 1.4, 3.6, "#140c00"), [-3, 0.3, 0])])]);
      const eyes = [eye(5.5), eye(-5.5)];
      const back = (z) => node(sphere(7, 4.5, 4.5, D, 6, 4), [8, 5, z], [0, z * 0.05, 0.3]);
      const fL = leg([-11, 7, 11], 7, 2, 1.6, G, box(4.4, 1.4, 4, D)), fR = leg([-11, 7, -11], 7, 2, 1.6, G, box(4.4, 1.4, 4, D));  // splayed, so shoes show past the belly
      const neck = sock([-8.5, -1.2, 0], [0, 0, -1.25]);  // toads have no neck: the band goes round his chest
      const body = node(sphere(15, 8.5, 12.5, G, 8, 5), [0, 10, 0], [0, 0, 0], [neck]), head = sock([-6, 21, 0]);
      const root = node(null, [0, 0, 0], [0, 0, 0], [
        back(-11), fR.n, body, node(sphere(12, 5, 9.5, Y, 8, 4), [-2, 6, 0]),
        ...[[-2, 17, 5], [5, 16, -6], [8, 13, 4], [-5, 16, -4]].map(([x, y, z]) => node(sphere(1.4, 1, 1.4, D, 4, 3), [x, y, z])),
        ...eyes, sac, back(11), fL.n, head,
      ]);
      const bL = sock([11, 0, 13.5]), bR = sock([11, 0, -13.5]); root.kids.push(bL, bR);
      return { root, sockets: { head, feet: [fL.s, fR.s, bL, bR], wrist: fL.w, neck }, ns: [7.6, 10.6], hs: 0.8, fs: 1, ws: 1, gait: "hop",
        anim(t, st) {
          const k = (t % 3.2) / 3.2, puff = !st.walk && k > 0.6 && k < 0.85 ? Math.sin(((k - 0.6) / 0.25) * PI) : 0;
          sac.s = [0.5 + puff * 0.8, 0.5 + puff * 0.8, 0.5 + puff * 0.8];
          body.s[1] = 1 + Math.sin(t * 2.5) * 0.04;
          const blink = t % 5 < 0.12; eyes.forEach((e) => (e.kids[0].s[1] = blink ? 0.15 : 1));
          const sp = st.air ? 0.6 : 0; fL.n.r[2] = -sp; fR.n.r[2] = -sp;
        } };
    },

    fox() {
      const O = "#e8782a", C = "#f4ece0", K = "#2a1a12";
      const legs = [[-6, 2.4], [-6, -2.4], [7, 2.4], [7, -2.4]].map(([x, z]) => leg([x, 8.5, z], 8.5, 1.5, 1.2, K, box(2.6, 1, 2, K)));
      const hs = sock([0.6, 4.4, 0]), neck = sock([0, 2.4, 0]);
      const ear = (z) => node(cyl(2, 0, 4.6, O, 4), [0.6, 3.4, z], [z > 0 ? 0.3 : -0.3, 0, -0.15], [node(cyl(1, 0, 1.8, K, 4), [0, 3.2, 0])]);
      const head = node(sphere(5.2, 4.6, 4.8, O, 7, 5), [-11, 18.5, 0], [0, 0, 0], [
        node(cyl(2.8, 1, 6, O, 5), [-3.6, -1.2, 0], [0, 0, PI / 2 + 0.12]), node(sphere(3.2, 2.1, 3.8, C, 6, 4), [-2.4, -2.6, 0]),
        node(sphere(1, 0.9, 1, "#141010", 4, 3), [-9.6, -1.9, 0]),
        node(sphere(1, 1.1, 0.8, "#ffb020!", 5, 4), [-4, 1, 2.6]), node(sphere(1, 1.1, 0.8, "#ffb020!", 5, 4), [-4, 1, -2.6]),
        node(box(0.6, 1.4, 1, "#140800"), [-4.8, 1, 2.9]), node(box(0.6, 1.4, 1, "#140800"), [-4.8, 1, -2.9]),
        ear(2.4), ear(-2.4), hs,
      ]);
      const tail = chain([[cyl(2.6, 3.7, 6, O, 6), 6], [cyl(3.7, 3.3, 6, O, 6), 6], [cyl(3.3, 2.1, 5, O, 6), 5], [cyl(2.1, 0, 4.5, C, 6), 4.5]]);
      const tailRoot = node(null, [11, 13.5, 0], [0, 0, -0.95], [tail[0]]);
      const root = node(null, [0, 0, 0], [0, 0, 0], [
        legs[1].n, legs[3].n, tailRoot, node(sphere(11, 5.8, 5.2, O, 8, 5), [1, 12.5, 0]), node(sphere(8, 3, 4, C, 7, 4), [0, 10, 0]),
        node(sphere(4.6, 5, 4.2, C, 6, 4), [-7, 13, 0]), node(cyl(3.6, 3, 6, O, 6), [-8, 14, 0], [0, 0, 0.8], [neck]), head, legs[0].n, legs[2].n,
      ]);
      return { root, sockets: { head: hs, feet: legs.map((l) => l.s), wrist: legs[0].w, neck }, ns: [3.8, 3.8], hs: 0.72, fs: 0.78, ws: 0.75,
        anim(t, st) {
          tail.forEach((s, i) => { s.r[2] = (i ? 0.28 : 0) + Math.sin(t * 2.4 - i * 0.7) * 0.12; s.r[0] = Math.sin(t * 2.4 - i * 0.5) * 0.25; });
          const sw = st.walk ? Math.sin(t * 11) * 0.5 : 0;
          legs[0].n.r[2] = sw; legs[3].n.r[2] = sw; legs[1].n.r[2] = -sw; legs[2].n.r[2] = -sw;
          head.r[2] = Math.sin(t * 1.1) * 0.05 + (st.walk ? Math.sin(t * 11) * 0.03 : 0);
        } };
    },

    cat() {
      const K = "#2c2834", D = "#18151e", G = "#e8b830", P = "#e88aa0";
      const tail = chain([0, 1, 2, 3, 4, 5].map((i) => [cyl(1.9 - i * 0.15, 1.75 - i * 0.15, 5.5, K, 5), 5.5]));
      const legs = [[6, -4], [-7, -4], [6, 4], [-7, 4]].map(([x, z]) => leg([x, 10, z], 10, 2.2, 1.9, K, sphere(2.4, 1.4, 2.4, D, 5, 3)));
      const ear = (z) => node(cyl(2.8, 0, 6, K, 4), [1, 5, z], [z * 0.08, 0, -0.15], [node(cyl(1.6, 0, 4, P, 4), [-0.8, 0.5, 0])]);
      const hs = sock([0.5, 6.4, 0]);
      const eyes = [3, -3].map((z) => node(sphere(2.2, 2.2, 1.6, "#ffcc22!", 5, 4), [-6, 1, z], [0, 0, 0], [node(box(0.8, 2.6, 1, "#120800"), [-1.6, 0, z > 0 ? 0.2 : -0.2])]));
      const head = node(sphere(7.5, 6.6, 7, K, 7, 5), [-13, 26, 0], [0, 0, 0], [
        ear(4), ear(-4), ...eyes, node(sphere(3.4, 2.6, 3.4, K, 6, 4), [-6, -3, 0]), node(sphere(0.9, 0.7, 1, P, 4, 3), [-9, -2, 0]), hs,
      ]);
      const pawEnd = node(sphere(2.4, 2, 2.4, K, 5, 3), [0, 9, 0], [0, 0, 0], [node(sphere(1.3, 0.8, 1.3, P, 4, 3), [-1.8, 0.2, 0])]);
      const wrist = sock([0, 6, 0]), neck = sock([0, 2.1, 0]);
      const paw = node(cyl(2.2, 1.9, 9, K, 5), [-10, 16, -4.5], [0, 0, 0.4], [pawEnd, wrist]);
      const root = node(null, [0, 0, 0], [0, 0, 0], [
        legs[0].n, legs[1].n, node(sphere(12, 8, 7.5, K, 8, 5), [2, 16, 0]), node(sphere(7, 7.5, 7, K, 7, 5), [-7, 19, 0]),
        node(cyl(6.5, 6.5, 2, "#c41a30", 8), [-9, 20.5, 0], [0, 0, 0.55], [neck]), node(cyl(2.6, 2.6, 0.9, G, 7), [-15, 17, 0], [0, 0, PI / 2]),
        node(null, [13, 17, 0], [0, 0, -0.5], [tail[0]]), head, legs[2].n, legs[3].n, paw,
      ]);
      return { root, sockets: { head: hs, feet: legs.map((l) => l.s), wrist, neck }, ns: [6.2, 6.2], hs: 0.85, fs: 0.85, ws: 0.95,
        anim(t, st) {
          tail.forEach((s, i) => { s.r[2] = (i ? -0.32 : 0) + Math.sin(t * 1.6 - i * 0.6) * 0.15; s.r[0] = Math.sin(t * 1.1 - i * 0.5) * 0.1; });
          paw.r[2] = st.walk ? 0.3 : 2.2 + Math.sin(t * 7) * 0.5;  // the lucky wave, paw down while walking
          head.r[2] = Math.sin(t * 0.9) * 0.08;
          const blink = t % 4.5 < 0.12; eyes.forEach((e) => (e.s[1] = blink ? 0.12 : 1));
          const sw = st.walk ? Math.sin(t * 10) * 0.45 : 0; legs[0].n.r[2] = sw; legs[3].n.r[2] = sw; legs[1].n.r[2] = -sw; legs[2].n.r[2] = -sw;
        } };
    },

    glitch() {
      const L = "#c9b8ff", M = "#a898e8", X = "#14001f";
      const hs = sock([0, 17.2, 0]);
      const ghosts = [["#ff2fd0!", 1.6], ["#2ff6ff!", -1.6]].map(([c, dx]) => node(box(12, 10, 10, c), [dx, 10, 0], [0, 0, 0], [], [0, 0, 0]));
      const tip = node(box(1.8, 1.8, 1.8, "#3ff0ff!"), [0, 22, 0]);
      const parts = node(null, [0, 0, 0], [0, 0, 0], [
        node(box(12, 10, 10, L), [0, 10, 0]), node(box(10, 2, 8, L), [0, 16, 0]), node(box(1, 4, 1, M), [0, 19, 0]), tip,
        node(box(0.6, 4.4, 6, X), [-6.1, 11.4, 0]), node(box(0.6, 1.8, 2.6, "#3ff0ff!"), [-6.45, 11.4, 0]),
        ...[-3, 0, 3].map((z) => node(box(0.6, 1.3, 1.3, X), [-6.1, 6.6, z])), ...[-1.5, 1.5].map((z) => node(box(0.6, 1.3, 1.3, X), [-6.1, 7.6, z])),
        node(box(3, 2, 2, M), [-4, 9, 6]), node(box(3, 2, 2, M), [-4, 9, -6]),
      ]);
      const legs = [[-3, 3], [3, -3], [-3, -3], [3, 3]].map(([x, z]) => node(box(2.4, 5, 2.4, M), [x, 2.5, z]));
      const feet = [[-3.5, 4.5], [3.5, -4.5], [-3.5, -4.5], [3.5, 4.5]].map(([x, z]) => sock([x, 0, z])), wrist = sock([-4, 9, 6.2], [PI / 2, 0, 0]);
      const neck = sock([0, 15, 0]), root = node(null, [0, 0, 0], [0, 0, 0], [...legs, parts, ...ghosts, hs, ...feet, wrist, neck]);
      return { root, sockets: { head: hs, feet, wrist, neck }, ns: [7.4, 6.3], hs: 0.85, fs: 0.95, ws: 0.9, gait: "stutter",
        anim(t, st) {
          const k = t % 2.3, g = k > 1.9 && k < 2.05;  // a dropped frame every couple of seconds
          ghosts.forEach((n) => (n.s = g ? [1, 1, 1] : [0, 0, 0]));
          parts.p[0] = g ? (Math.random() - 0.5) * 3 : 0; parts.p[2] = g ? (Math.random() - 0.5) * 2 : 0;
          tip.s = t % 0.8 < 0.4 ? [1, 1, 1] : [0.6, 0.6, 0.6];
          legs.forEach((l, i) => (l.p[1] = 2.5 + (st.walk && (Math.floor(t * 8) + i) % 2 ? 1.2 : 0)));
        } };
    },

    kraken() {
      const P = "#6a3cb0", L = "#9a6ae0", S = "#3ff0ff!";
      const tents = [];
      const tentacle = (a) => {
        const segs = chain([0, 1, 2, 3, 4, 5].map((i) => [cyl(2.8 - i * 0.4, 2.4 - i * 0.4, 5, i % 2 ? P : L, 5), 5]));
        const end = sock([0, 5, 0], [PI, 0, 0]); segs[5].kids.push(end);
        const mid = sock([0, 2.5, 0]); segs[2].kids.push(mid);
        tents.push(segs);
        return { n: node(null, [Math.cos(a) * 8, 22, Math.sin(a) * 8], [0, -a, 0], [node(null, [0, 0, 0], [0, 0, PI + 0.85], [segs[0]])]), end, mid };
      };
      const ring = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => tentacle((i / 8) * 2 * PI + 0.2));
      const hs = sock([0, 13.6, 0]), neck = sock([0, -10.5, 0]);
      const head = node(sphere(13, 14, 13, P, 9, 6), [0, 33, 0], [0, 0, 0.15], [
        node(sphere(4, 4.4, 3, "#f4f0ff", 6, 4), [-11, 1, 4.5]), node(sphere(4, 4.4, 3, "#f4f0ff", 6, 4), [-11, 1, -4.5]),
        node(sphere(2.2, 2.6, 1.6, "#1a0838", 5, 4), [-13.5, 0.6, 4.8]), node(sphere(2.2, 2.6, 1.6, "#1a0838", 5, 4), [-13.5, 0.6, -4.8]),
        ...[[2, 12, 5], [6, 9, -7], [-4, 11, -2], [9, 5, 6]].map(([x, y, z]) => node(sphere(1.2, 1.2, 1.2, S, 4, 3), [x, y, z])), hs, neck,
      ]);
      const body = node(null, [0, 6, 0], [0, 0, 0], [...ring.map((r) => r.n), head]);
      const root = node(null, [0, 0, 0], [0, 0, 0], [body]);
      return { root, sockets: { head: hs, feet: [1, 3, 5, 7].map((i) => ring[i].end), wrist: ring[4].mid, neck }, ns: [9.6, 9.6], hs: 1.2, fs: 0.75, ws: 1,
        anim(t) {
          body.p[1] = 8 + Math.sin(t * 1.6) * 2.5;
          tents.forEach((segs, k) => segs.forEach((s, i) => (s.r[2] = (i ? 0.3 : 0) + Math.sin(t * 2.4 - i * 0.7 + k) * 0.22)));
        } };
    },

    phoenix() {
      const R = "#e8501a", O = "#ff9a2a", Y = "#ffd84a";
      const hs = sock([-0.4, 4.2, 0]), neck = sock([-1.6, 27.6, 0], [0, 0, 0.35]);
      const crest = [[0.4, 3.4, -0.5, "#ffcf3a!"], [1.6, 3, -0.95, "#ff7a1a!"], [2.6, 2.2, -1.35, "#ffcf3a!"]].map(([x, y, a, c]) => node(cyl(1.2, 0, 5.5, c, 4), [x, y, 0], [0, 0, a]));
      const head = node(sphere(4.4, 4.2, 4.2, R, 7, 5), [-3, 31, 0], [0, 0, 0], [
        node(cyl(1.5, 0, 3.6, Y, 4), [-4, -0.8, 0], [0, 0, PI / 2 + 0.35]),
        node(sphere(0.8, 1, 0.6, "#200800", 4, 3), [-3.3, 0.9, 2.2]), node(sphere(0.8, 1, 0.6, "#200800", 4, 3), [-3.3, 0.9, -2.2]),
        node(box(0.4, 0.4, 0.4, "#ffffff!"), [-3.9, 1.3, 2.4]), node(box(0.4, 0.4, 0.4, "#ffffff!"), [-3.9, 1.3, -2]), ...crest, hs,
      ]);
      const wing = (side) => node(poly([[0, 0, 0], [5, 10, 0], [14, 17, 0], [23, 13, 0], [18, 9, 0], [24, 5, 0], [12, 0, 0]], "#ff6a1a"), [1, 25, 5 * side], [side * 1.15, 0.35 * side, 0.1], [
        node(poly([[2, 1, 0.3 * side], [6, 8, 0.3 * side], [14, 12, 0.3 * side], [16, 7, 0.3 * side], [11, 2, 0.3 * side]], "#ffd84a!")),
      ]);
      const wL = wing(1), wR = wing(-1);
      const flames = [-0.45, 0, 0.45].map((a, i) => node(null, [5, 18, 0], [0, a, 0], [
        node(poly([[0, 0, 0], [7, -4, 0], [15, -14, 0], [6, -7, 0]], i === 1 ? "#ff7a1a!" : "#ff5a1a!")), node(poly([[1, -0.5, 0.2], [6, -3, 0.2], [11, -10, 0.2], [5, -5, 0.2]], "#ffd84a!")),
      ]));
      const lL = leg([-0.6, 16, 2], 6, 0.6, 0.5, Y, box(2.4, 0.6, 1.6, Y)), lR = leg([-0.6, 16, -2], 6, 0.6, 0.5, Y, box(2.4, 0.6, 1.6, Y));
      const embers = [0, 1, 2, 3, 4].map(() => node(box(0.8, 0.8, 0.8, "#ffd27a!"), [0, 0, 0]));
      const body = node(null, [0, 0, 0], [0, 0, 0], [wR, ...flames, lL.n, lR.n, node(sphere(6, 7.5, 5.5, R, 7, 5), [0, 22, 0]), node(sphere(4, 5.5, 4, O, 6, 4), [-2.8, 21, 0]), head, neck, wL]);
      const root = node(null, [0, 0, 0], [0, 0, 0], [body, ...embers]);
      return { root, sockets: { head: hs, feet: [lL.s, lR.s], wrist: lL.w, neck }, ns: [3.9, 3.6], hs: 0.6, fs: 0.85, ws: 0.6,
        anim(t, st) {
          body.p[1] = 2 + Math.sin(t * 2) * 1.6;
          const f = Math.sin(t * (st.fly || st.held ? 16 : 7)) * 0.55; wL.r[0] = 1.15 + f; wR.r[0] = -1.15 - f;
          flames.forEach((n, i) => (n.s = [1 + Math.sin(t * 9 + i) * 0.12, 1 + Math.sin(t * 11 + i * 2) * 0.15, 1]));
          crest.forEach((n, i) => (n.s[1] = 1 + Math.sin(t * 10 + i) * 0.2));
          embers.forEach((e, i) => { const k = (t * 0.6 + i / 5) % 1; e.p = [6 + Math.sin(i * 7) * 5 - k * 4, 14 + k * 26, Math.cos(i * 5) * 4]; e.s = [1 - k, 1 - k, 1 - k]; });
        } };
    },

    dragon() {
      const R = "#c4422c", D = "#7a2418", B = "#e8b45a", H = "#ece2c4", M = "#9a2a2a";
      const tail = chain([[cyl(4, 3.3, 7, R), 7], [cyl(3.3, 2.6, 7, R), 7], [cyl(2.6, 1.9, 7, R), 7], [cyl(1.9, 1.2, 7, R), 7], [cyl(1.4, 0, 6, D), 6]]);
      tail[4].kids.push(node(poly([[0, 0, 0], [-3, 4, 0], [0, 8, 0], [3, 4, 0]], D), [0, 5, 0]));
      const wing = (side) => node(poly([[0, 0, 0], [6, 18, 0], [14, 22, 0], [24, 14, 0], [20, 8, 0], [22, 2, 0], [10, -1, 0]], M), [4, 26, 6 * side], [side * 0.5, 0, 0]);
      const wL = wing(1), wR = wing(-1);
      const legs = [[-7, 6], [7, 6], [-7, -6], [7, -6]].map(([x, z]) => leg([x, 13, z], 13, 3.2, 2.4, R, box(6, 2.4, 5, D)));
      const hs = sock([2, 6.2, 0]), neck = sock([0, 8, 0]);
      const eyes = [4.6, -4.6].map((z) => node(sphere(1.6, 1.8, 1.4, "#ffd23a!", 5, 4), [-3.5, 2, z], [0, 0, 0], [node(sphere(0.8, 1.2, 0.8, "#1a0600", 4, 3), [-1.1, 0, z > 0 ? 0.8 : -0.8])]));
      const head = node(sphere(8, 6.5, 6.8, R, 7, 5), [-22, 33, 0], [0, 0, 0.1], [
        node(cyl(4.6, 2.6, 10, R, 6), [-3, -1.5, 0], [0, 0, PI / 2 + 0.15]), node(box(8, 1.6, 6, D), [-8, -4.5, 0]), ...eyes,
        node(cyl(1.8, 0, 9, H, 5), [3, 4, 3.2], [0.2, 0, -1.0]), node(cyl(1.8, 0, 9, H, 5), [3, 4, -3.2], [-0.2, 0, -1.0]), hs,
      ]);
      const puff = node(sphere(3, 2.2, 2.2, "#ff9a3a!", 5, 4), [-36, 30, 0], [0, 0, 0], [node(sphere(1.8, 1.4, 1.4, "#ffe066!", 4, 3), [-1, 0, 0])], [0, 0, 0]);
      const chest = node(sphere(15, 11, 11, R, 8, 5), [0, 20, 0]);
      const root = node(null, [0, 0, 0], [0, 0, 0], [
        wR, legs[2].n, legs[3].n, chest, node(sphere(12, 7, 9, B, 8, 5), [-2, 16, 0]), node(null, [13, 19, 0], [0, 0, -1.25], [tail[0]]),
        node(cyl(5.5, 4.4, 15, R), [-9, 21, 0], [0, 0, 0.85], [neck]), head,
        ...[-4, 2, 8].map((x, i) => node(cyl(1.8, 0, 4.5 - i * 0.6, H, 4), [x, 29 - i * 1.5, 0], [0, 0, -0.2])), legs[0].n, legs[1].n, wL, puff,
      ]);
      return { root, sockets: { head: hs, feet: legs.map((l) => l.s), wrist: legs[0].w, neck }, ns: [5.4, 5.4], hs: 0.95, fs: 1.25, ws: 1.35,
        anim(t, st) {
          const f = Math.sin(t * (st.fly || st.held ? 12 : 5)) * 0.6; wL.r[0] = 0.55 + f; wR.r[0] = -0.55 - f;
          tail.forEach((s, i) => (s.r[2] = (i ? 0.25 : 0) + Math.sin(t * 2 - i) * 0.12));
          head.r[2] = 0.1 + Math.sin(t * 1.3) * 0.06; chest.s[1] = 1 + Math.sin(t * 2.4) * 0.03;
          const sw = st.walk ? Math.sin(t * 9) * 0.4 : 0; legs[0].n.r[2] = sw; legs[3].n.r[2] = sw; legs[1].n.r[2] = -sw; legs[2].n.r[2] = -sw;
          const k = t % 6, b = k > 5 ? Math.sin((k - 5) * PI) : 0; puff.s = [b, b, b]; puff.p[0] = -32 - b * 5;  // a puff of fire now and then
          const blink = t % 5 < 0.12; eyes.forEach((e) => (e.s[1] = blink ? 0.1 : 1));
        } };
    },
  };

  // ---------------------------------------------------------------- gear
  // high-detail gear: shaped soles and laces, curled brims, a jewelled crown, see-through milk glasses
  const dome = (r, h, color, seg = 10, rings = 4) => {  // the top half of a sphere: cap crowns
    const m = sphere(r, h, r, color, seg, rings * 2);
    const keep = new Set(m.v.map((p, i) => (p[1] >= -0.01 ? i : -1)).filter((i) => i >= 0));
    m.f = m.f.filter(([idx]) => idx.every((i) => keep.has(i)));
    return m;
  };
  // a shoe outline seen from above: round toe at -x, narrower heel at +x
  const outline = (L, W, n = 14) => Array.from({ length: n }, (_, i) => {
    const a = (2 * PI * i) / n, c = Math.cos(a), s = Math.sin(a);
    const w = W * (c < 0 ? 1 : 0.86);  // heel a little narrower than the forefoot
    return [(L / 2) * Math.sign(c) * Math.pow(Math.abs(c), 0.7), (w / 2) * Math.sign(s) * Math.pow(Math.abs(s), 0.8)];
  });
  const shrink = (pts, k) => pts.map(([x, z]) => [x * k, z * k]);

  function sneaker({ upper, mid = "#f4f2ec", out = "#c8c4bc", accent, lace = "#f8f8f4", tab }) {
    const sole = outline(11, 4.6);
    const top = (x) => 3.1 + Math.max(0, x) * 0.32 - Math.max(0, -x - 2.8) * 0.45;  // low toe, rising to the heel collar
    const stripe = (z) => node(poly([[-2.6, 1.9, z], [-0.6, 2.9, z], [2.8, 3.6, z], [3.9, 2.8, z], [1.2, 2.5, z], [-1.2, 2.0, z]], accent));
    return Object.assign(node(null, [0, 0, 0], [0, 0, 0], [
      node(extrude(sole, 0, 0.55, out)),
      node(extrude(shrink(sole, 0.98), 0.55, 1.5, mid)),
      node(extrude(shrink(sole, 0.92), 1.5, top, upper)),
      node(sphere(1.7, 0.5, 1.5, "#1a1616", 6, 3), [3.0, top(3) - 0.1, 0]),  // the opening you put your foot in
      node(box(1.1, 1.6, 2, upper), [-0.4, 3.9, 0], [0, 0, 0.55]),  // tongue
      ...[-2.4, -1.5, -0.6, 0.3].map((x, i) => node(box(0.35, 0.3, 2.6, lace), [x, top(x) + 0.12, 0], [0, i % 2 ? 0.35 : -0.35, 0])),
      stripe(2.08), stripe(-2.08),
      node(box(0.6, 1.2, 1.2, tab || accent), [4.9, 3.4, 0]),  // heel tab
    ]), { ankle: [3, 3.9] });
  }
  function boot({ upper = "#c8963c", dark = "#8a5a22", sole = "#4a2e14", lace = "#d8b070" }) {
    const out = outline(11.4, 4.9);
    const top = (x) => (x > -1 ? 8.2 : 3.4 - Math.max(0, -x - 3) * 0.3);
    return Object.assign(node(null, [0, 0, 0], [0, 0, 0], [
      node(extrude(out, 0, 1.3, sole)),
      ...[-4, -2, 0, 2, 4].map((x) => node(box(1, 0.5, 5.1, "#2e1c0c"), [x, 0.25, 0])),  // lugs
      node(extrude(shrink(out, 0.9), 1.3, top, upper, dark)),
      node(tube(2.5, 2.4, 1.2, dark, 10, 0.78), [1.8, 7.6, 0]),  // padded collar
      node(box(0.4, 0.4, 4.7, "#3a2410"), [-1, 1.8, 0]),  // stitched welt
      ...[2.2, 3.6, 5.0, 6.4].map((y) => node(box(0.4, 0.3, 3.2, lace), [-0.9 - (y - 2) * 0.05, y, 0], [0, 0, 0.1])),
      ...[2.2, 3.6, 5.0, 6.4].flatMap((y) => [1.55, -1.55].map((z) => node(box(0.5, 0.5, 0.5, "#e8c060"), [-0.85, y, z]))),  // eyelets
      node(poly([[-0.8, 7.8, 0], [-2.6, 9.6, 0.4], [-2.2, 10, -0.2]], lace)),  // a loose lace end
    ]), { ankle: [1.8, 8.6] });
  }
  function glass(milk, extra = []) {
    return node(null, [0, 0, 0], [0, 0, 0], [
      // frosted glass, solid: overlapping see-through faces left seam lines down the glass
      node(cyl(2.95, 3.05, 0.9, "#c4dae4", 12)),  // thick base
      node(cyl(3.05, 3.3, 6.4, milk, 12), [0, 0.9, 0]),  // the milk fills the glass to the brim line
      node(cyl(3.3, 3.3, 0.12, milk.replace("!", "") + "!", 12), [0, 7.3, 0]),  // the milk's surface catches the light
      node(tube(3.32, 3.45, 2.3, "#dcecf4", 12, 0.93, "#ffffff"), [0, 7.3, 0]),  // the empty top of the glass and its rim
      ...extra,
    ]);
  }
  const straw = (c1, c2) => node(null, [1, 3, 0.6], [0, 0, -0.25], [node(cyl(0.45, 0.45, 9, c1, 6)), node(cyl(0.47, 0.47, 1.4, c2, 6), [0, 3, 0]), node(cyl(0.47, 0.47, 1.4, c2, 6), [0, 6, 0]),
    node(cyl(0.45, 0.45, 3, c1, 6), [0, 9, 0], [0, 0, 1.2])]);

  const watch = (band, face, extra = []) => () => node(null, [0, 0, 0], [0, 0, 0], [
    node(tube(2.6, 2.6, 1.6, band, 12, 0.8)), node(box(0.8, 2.8, 2.8, face), [-2.9, 0.8, 0]), ...extra,
  ]);
  const GEAR = {
    hat_snapback: () => node(null, [0, -0.6, 0], [0, 0, 0], [
      node(dome(5.2, 4.4, "#2f6fe0", 12, 4)),
      ...[0, 1, 2, 3, 4, 5].map((i) => node(poly([[0, 4.4, 0], [5.2 * Math.cos((i * PI) / 3), 0.05, 5.2 * Math.sin((i * PI) / 3)], [5.3 * Math.cos((i * PI) / 3), 0.15, 5.3 * Math.sin((i * PI) / 3)]], "#1f4fb0"))),  // panel seams
      node(brim(4.9, 9.6, (a, t) => 0.2 - t * t * 0.9 - Math.abs(Math.sin(a)) * t * 0.6, "#1f4fb0", 10, -0.95, 0.95)),  // brim, worn backwards (+x)
      node(sphere(0.75, 0.5, 0.75, "#1f4fb0", 6, 3), [0, 4.45, 0]),
      node(box(0.3, 1.4, 2.8, "#14141a"), [-4.95, 1.2, 0]),  // the snap opening, now at the front
      node(poly([[-5.05, 2.4, -0.9], [-5.05, 3.4, 0], [-5.05, 2.4, 0.9]], "#ffffff")),
    ]),
    hat_fitted: () => node(null, [0, -0.6, 0], [0, 0, 0.12], [
      node(dome(5.2, 4.6, "#1c1c24", 12, 4)),
      node(brim(4.9, 10, (a, t) => 0.3 - t * t * 0.5 - Math.abs(Math.sin(a)) * t * 0.9, "#15151c", 10, PI - 0.95, PI + 0.95), [0, 0, 0], [0, 0.45, 0], [
        node(cyl(1.2, 1.2, 0.12, "#e8c040!", 10), [-7.4, 0.2, 0.9]), node(cyl(0.7, 0.7, 0.14, "#c8ccd4", 10), [-7.4, 0.25, 0.9]),  // the sticker
      ]),
      node(sphere(0.75, 0.5, 0.75, "#15151c", 6, 3), [0, 4.65, 0]),
      node(poly([[-5, 2, -1.2], [-4.8, 3.6, 0], [-5, 2, 1.2], [-5.2, 2.8, 0]], "#ffd84a")),  // gold front logo
    ]),
    hat_pimp: () => node(null, [0, -0.5, 0], [0, 0, 0.16], [
      node(brim(4.5, 8.4, (a, t) => t * t * 2.4 * Math.pow(Math.sin(a), 2), "#16161e", 18)),  // sides curl up
      node(cyl(4.5, 4.8, 9, "#22222c", 16, "#2c2c38"), [0, 0.2, 0]),
      node(cyl(4.85, 4.75, 1.8, "#e8b830", 16), [0, 0.6, 0]),  // gold band
      node(box(1.2, 1.6, 1.8, "#c8981c"), [0.4, 1.5, 4.8]),  // bow knot
      node(poly([[0.4, 1.5, 5], [2.8, 2.6, 5.4], [2.6, 0.4, 5.3]], "#d8a828")), node(poly([[0.4, 1.5, 5], [-2, 2.6, 5.4], [-1.8, 0.4, 5.3]], "#d8a828")),
      node(null, [1.2, 2, 4.9], [0, 0, -0.5], [  // a long purple feather
        ...[0, 1, 2, 3, 4, 5].map((i) => node(poly([[0, i * 2, 0], [1.5 - i * 0.2, i * 2 + 1, 0.2], [0, i * 2 + 2, 0], [-1.5 + i * 0.2, i * 2 + 1, 0.2]], i % 2 ? "#c47aff" : "#9a4ae0"))),
        node(cyl(0.18, 0.1, 12, "#f0e6ff", 4)),
      ]),
    ]),
    hat_crown: () => {
      const spark = node(box(0.8, 0.8, 0.8, "#ffffff!"), [0, 9.2, 0]);
      const n = node(null, [0, -0.6, 0], [0, 0, 0.1], [
        node(dome(4.6, 4, "#8a1020", 10, 3), [0, 1.2, 0]),  // velvet cap
        node(tube(5.2, 5.3, 2.6, "#e8b830", 16, 0.9, "#fff0a0")),
        ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = (i * PI) / 4, c = Math.cos(a), s = Math.sin(a), tall = i % 2 === 0;
          return node(null, [5.25 * c, 2.5, 5.25 * s], [0, -a, 0], [node(poly([[0, 0, -1.6], [0, tall ? 4.4 : 2.4, 0], [0, 0, 1.6]], tall ? "#ffd84a" : "#e8b830")),
            node(sphere(0.65, 0.65, 0.65, "#fffbe8", 5, 3), [0, tall ? 4.8 : 2.8, 0])]); }),  // points, each topped with a pearl
        ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = (i * PI) / 4 + PI / 8;
          return node(sphere(0.75, 0.9, 0.5, ["#ff2a4a!", "#2a7aff!", "#3ad65a!", "#c05aff!"][i % 4], 4, 3), [5.45 * Math.cos(a), 1.3, 5.45 * Math.sin(a)], [0, -a, 0]); }),
        node(sphere(1, 1, 1, "#e8b830", 6, 4), [0, 5.4, 0]), node(box(0.5, 2.6, 0.5, "#ffd84a"), [0, 7, 0]), node(box(1.8, 0.5, 0.5, "#ffd84a"), [0, 7.4, 0]), spark,  // orb and cross
      ]);
      n.anim = (t) => (spark.s = t % 1.3 < 0.5 ? [1, 1, 1] : [0, 0, 0]);
      return n;
    },
    kicks_af1: () => sneaker({ upper: "#2a2a32", mid: "#1e1e24", out: "#141418", accent: "#3e3e4a", lace: "#26262c", tab: "#1a1a20" }),
    kicks_timbs: () => { const b = boot({}); b.s = [0.8, 0.8, 0.8]; return Object.assign(node(null, [0, 0, 0], [0, 0, 0], [b]), { ankle: b.ankle.map((v) => v * 0.8) }); },  // boots run tall: a bit smaller so legs still show
    kicks_grinch: () => sneaker({ upper: "#7ee02a", mid: "#f0f0e8", out: "#d8d4c8", accent: "#e8243a", lace: "#f8f8f0", tab: "#e8243a" }),
    kicks_dior: () => sneaker({ upper: "#cfd3da", mid: "#f6f6f2", out: "#9aa2ac", accent: "#7c8ea4", lace: "#ffffff", tab: "#2a3a5a" }),
    milk_farm: () => glass("#f6f6f2"),
    milk_goat: () => glass("#efe2bc", [node(poly([[-1, 7.2, 0], [0.4, 9.4, 0.3], [1.2, 7.4, 0]], "#6aa040")), node(poly([[0.2, 7.2, 0.4], [1.8, 9, 0.8], [1.6, 7.2, 0.2]], "#5a9034"))]),  // a sprig of grass
    milk_unicorn: () => glass("#f2b8f0", [straw("#ffffff", "#ff7ad8"),
      ...[0, 1, 2].map((i) => node(cyl(2.96, 2.96, 0.5, ["#9ad8ff", "#c8a8ff", "#ff9ad8"][i], 12), [0, 2.4 + i * 1.6, 0]))]),  // rainbow swirl
    milk_dragon: () => { const fl = [0, 1, 2].map((i) => node(cyl(0.7, 0, 2.6, i % 2 ? "#ff7a1a!" : "#ffd84a!", 4), [(i - 1) * 1.4, 7.2, (i % 2) * 0.8]));
      const n = glass("#ffb83a!", fl); n.anim = (t) => fl.forEach((f, i) => (f.s[1] = 0.7 + Math.abs(Math.sin(t * 7 + i * 2)) * 0.6)); return n; },
    watch_casio: watch("#1a1a1a", "#7a8a7a", [node(box(0.3, 1.4, 1.8, "#c8d8a8!"), [-3.4, 0.8, 0])]),
    watch_prx: watch("#c8ccd4", "#2a5aa8"),
    watch_sub: watch("#c8ccd4", "#101418", [node(box(0.4, 3.2, 3.2, "#1a5a3a"), [-2.6, 0.8, 0])]),
    watch_rm: watch("#c41a2a", "#f0eef0", [node(box(0.3, 1.8, 0.5, "#e8243a"), [-3.4, 0.8, 0])]),
  };

  // ---------------------------------------------------------------- API
  const DS = 2.4;  // one model unit is 2.4 screen pixels
  const RES = 3, BANDS = 12;  // drawn at 3x that resolution so gear detail (laces, pearls, glass) reads sharp
  function make(id) {
    const inst = PETS[id]();
    inst.id = id; inst.st = {}; inst.gear = [];
    measure(inst);
    return inst;
  }
  // size the canvas to fit the model through its whole idle cycle, both facings and a hat on top
  // ext.l / ext.r: how far the pet reaches left and right of its centre when facing left / right (for the milk glass)
  function measure(inst) {
    let x0 = Infinity, x1 = -Infinity, top = 0;
    inst.ext = { l: [Infinity, -Infinity], r: [Infinity, -Infinity] };
    for (const yaw of [0.5, PI - 0.5, PI / 2, 0]) for (const t of [0, 0.3, 0.7, 1.1, 1.6]) {
      inst.anim(t, {});
      const bb = render(null, inst.root, 0, 0, { yaw, cx: 0, cy: 0, measureOnly: true });
      x0 = Math.min(x0, bb[0]); x1 = Math.max(x1, bb[2]); top = Math.min(top, bb[1]);
      const e = yaw === 0.5 ? inst.ext.l : yaw === PI - 0.5 ? inst.ext.r : null;
      if (e) {  // the glass stands behind his feet, under a tail or wings: measure only what is near the ground
        let g = render(null, inst.root, 0, 0, { yaw, cx: 0, cy: 0, measureOnly: true, maxY: 7 });
        if (!(g[2] > g[0])) g = bb;  // nothing low (a floating pet): use all of him
        e[0] = Math.min(e[0], g[0] - 2 * inst.fs); e[1] = Math.max(e[1], g[2] + 2 * inst.fs);  // shoes are measured too (dress re-measures)
      }
    }
    const span = Math.max(-x0, x1);
    inst.W = Math.ceil(span * 2 + 6); inst.H = Math.ceil(-top + 11 * inst.hs + 3); inst.cx = inst.W / 2;
  }
  function attach(socket, id, scale) {
    socket.kids = [];
    if (!id || !GEAR[id]) return null;
    const g = GEAR[id](); g.s = [scale, scale, scale]; socket.kids.push(g); return g;
  }
  // a shoe slides forward so its opening sits under the leg; the leg stops at the collar (never through the shoe) and his own foot hides
  function shoe(f, id, k) {
    const g = attach(f, id, k), a = g && g.ankle;
    if (a) g.p = [-a[0] * k, 0, 0];
    if (f.foot) f.foot.s = g ? [0, 0, 0] : [1, 1, 1];
    if (f.leg) f.leg.s[1] = a ? Math.max(0.15, (f.len - a[1] * k) / f.len) : 1;
    return g;
  }
  // the same watch, its band opened up round the neck (rx, rz) and the face in front
  function neckWatch(socket, id, [rx, rz], k) {
    socket.kids = [];
    if (!id || !GEAR[id]) return null;
    const [band, ...rest] = GEAR[id]().kids;
    band.s = [rx / 2.6, k, rz / 2.6];
    const g = node(null, [0, 0, 0], [0, 0, 0], [band, node(null, [2.6 * k - rx, 0, 0], [0, 0, 0], rest, [k, k, k])]);
    socket.kids.push(g); return g;
  }
  function dress(inst, eq) {
    const { head, feet, wrist, neck } = inst.sockets;
    inst.gear = [attach(head, eq.hat, inst.hs), ...feet.map((f) => shoe(f, eq.shoes, inst.fs)), attach(wrist, eq.watch, inst.ws),
      neck && neckWatch(neck, eq.watch, inst.ns, inst.ws)].filter(Boolean);
    inst.st.shod = !!eq.shoes;
    measure(inst);  // shoes stick out past his toes: size the canvas round what he wears
  }
  // a leg swings by turning about z; its foot socket undoes that turn, so the sole stays level
  const level = (inst) => inst.sockets.feet.forEach((f) => { if (f.level) f.r[2] = f.level.r[2]; });
  // st: { yaw, walk, held, fly, air } from the room's physics
  function draw(inst, ctx, t, st) {
    Object.assign(inst.st, st);
    inst.anim(t, inst.st);
    level(inst);
    inst.gear.forEach((g) => g.anim && g.anim(t));
    render(ctx, inst.root, inst.W * RES, inst.H * RES, { yaw: st.yaw, cx: inst.cx * RES, cy: inst.H * RES - 1, scale: RES, bands: BANDS });
  }
  const snaps = {};
  function canvasURL(W, H, paint) {
    const c = document.createElement("canvas"); c.width = W; c.height = H; paint(c.getContext("2d")); return c.toDataURL();
  }
  // a still picture of a pet (optionally dressed), for the heading and the bag
  function snapshot(id, eq) {
    const key = id + "|" + (eq ? [eq.hat, eq.shoes, eq.watch].join(",") : "");
    if (!snaps[key]) {
      const inst = make(id); if (eq) dress(inst, eq);
      inst.anim(0.3, inst.st);
      snaps[key] = { url: canvasURL(inst.W * RES, inst.H * RES, (ctx) => render(ctx, inst.root, inst.W * RES, inst.H * RES, { yaw: 0.55, cx: inst.cx * RES, cy: inst.H * RES - 1, scale: RES, bands: BANDS })), w: inst.W, h: inst.H };
    }
    return snaps[key];
  }
  function gearShot(id) {
    if (!snaps[id]) {
      const yaw = id.startsWith("watch") ? 1.25 : 0.6;  // show a watch by its face
      const g = GEAR[id](), bb = render(null, g, 0, 0, { yaw, tilt: 0.4, cx: 0, cy: 0, measureOnly: true });
      const W = Math.ceil(bb[2] - bb[0] + 2), H = Math.ceil(bb[3] - bb[1] + 2);
      snaps[id] = { url: canvasURL(W * RES, H * RES, (ctx) => render(ctx, g, W * RES, H * RES, { yaw, tilt: 0.4, cx: (-bb[0] + 1) * RES, cy: (-bb[1] + 1) * RES, scale: RES, bands: BANDS })), w: W, h: H };
    }
    return snaps[id];
  }
  const img = (s, h) => `<img class="p3img" src="${s.url}" style="height:${h}px;width:${Math.round((s.w * h) / s.h)}px" alt="">`;
  window.Pets3D = {
    DS, RES, has: (id) => !!PETS[id], hasGear: (id) => !!GEAR[id], make, dress, draw, gearTable: GEAR,
    icon: (id, h, eq) => img(snapshot(id, eq), h), gearIcon: (id, h) => img(gearShot(id), h),
  };
})();
