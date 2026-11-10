// The pets and their gear as low-poly 3D models (rendered by lowpoly.js).
// Every pet faces -x, stands on y = 0 and has sockets: head (hats), feet (a shoe on every foot), wrist (watch).
// Gear models hang off those sockets, so they follow every animation and turn with the pet.
(function () {
  const { sphere, cyl, box, poly, node, render } = window.LowPoly;
  const PI = Math.PI, sock = (p = [0, 0, 0], r = [0, 0, 0]) => node(null, p, r);
  // a leg hanging down from a hip; its foot socket is turned upright again so shoes stand on the ground
  function leg(hip, len, r1, r2, col, foot) {
    const s = sock([0, len, 0], [PI, 0, 0]), w = sock([0, len * 0.5, 0]);
    const kids = [s, w];
    if (foot) kids.push(node(foot, [0, len, 0]));
    return { n: node(cyl(r1, r2, len, col, 5), hip, [PI, 0, 0], kids), s, w };
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
      const root = node(null, [0, 0, 0], [0, 0, 0], [body, footL, footR, wrist]);
      return { root, sockets: { head, feet: [footL, footR], wrist }, hs: 0.6, fs: 0.62, ws: 0.6, gait: "hop",
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
      const wingL = node(sphere(2.6, 6, 4.6, W, 6, 4), [1, 11, 6.2], [0.15, 0, 0]), wingR = node(sphere(2.6, 6, 4.6, W, 6, 4), [1, 11, -6.2], [-0.15, 0, 0]);
      const wrist = sock([0, -3.5, 1.2]); wingL.kids.push(wrist);
      const lL = leg([-1, 3.4, 2.6], 3.4, 1, 0.9, O, box(3, 0.8, 2.2, O)), lR = leg([-1, 3.4, -2.6], 3.4, 1, 0.9, O, box(3, 0.8, 2.2, O));
      const root = node(null, [0, 0, 0], [0, 0, 0], [lL.n, lR.n, node(sphere(7, 8, 6.5, B, 8, 5), [0, 11, 0]), node(sphere(4.4, 6, 3.6, L, 6, 4), [-3.8, 10, 0]), wingL, wingR, head]);
      return { root, sockets: { head: hs, feet: [lL.s, lR.s], wrist }, hs: 0.85, fs: 0.72, ws: 0.9,
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
      const body = node(sphere(15, 8.5, 12.5, G, 8, 5), [0, 10, 0]), head = sock([-6, 21, 0]);
      const root = node(null, [0, 0, 0], [0, 0, 0], [
        back(-11), fR.n, body, node(sphere(12, 5, 9.5, Y, 8, 4), [-2, 6, 0]),
        ...[[-2, 17, 5], [5, 16, -6], [8, 13, 4], [-5, 16, -4]].map(([x, y, z]) => node(sphere(1.4, 1, 1.4, D, 4, 3), [x, y, z])),
        ...eyes, sac, back(11), fL.n, head,
      ]);
      const bL = sock([11, 0, 13.5]), bR = sock([11, 0, -13.5]); root.kids.push(bL, bR);
      return { root, sockets: { head, feet: [fL.s, fR.s, bL, bR], wrist: fL.w }, hs: 0.8, fs: 1, ws: 1, gait: "hop",
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
      const hs = sock([0.6, 4.4, 0]);
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
        node(sphere(4.6, 5, 4.2, C, 6, 4), [-7, 13, 0]), node(cyl(3.6, 3, 6, O, 6), [-8, 14, 0], [0, 0, 0.8]), head, legs[0].n, legs[2].n,
      ]);
      return { root, sockets: { head: hs, feet: legs.map((l) => l.s), wrist: legs[0].w }, hs: 0.72, fs: 0.78, ws: 0.75,
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
      const wrist = sock([0, 6, 0]);
      const paw = node(cyl(2.2, 1.9, 9, K, 5), [-10, 16, -4.5], [0, 0, 0.4], [pawEnd, wrist]);
      const root = node(null, [0, 0, 0], [0, 0, 0], [
        legs[0].n, legs[1].n, node(sphere(12, 8, 7.5, K, 8, 5), [2, 16, 0]), node(sphere(7, 7.5, 7, K, 7, 5), [-7, 19, 0]),
        node(cyl(6.5, 6.5, 2, "#c41a30", 8), [-9, 20.5, 0], [0, 0, 0.55]), node(cyl(2.6, 2.6, 0.9, G, 7), [-15, 17, 0], [0, 0, PI / 2]),
        node(null, [13, 17, 0], [0, 0, -0.5], [tail[0]]), head, legs[2].n, legs[3].n, paw,
      ]);
      return { root, sockets: { head: hs, feet: legs.map((l) => l.s), wrist }, hs: 0.85, fs: 0.85, ws: 0.95,
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
      const root = node(null, [0, 0, 0], [0, 0, 0], [...legs, parts, ...ghosts, hs, ...feet, wrist]);
      return { root, sockets: { head: hs, feet, wrist }, hs: 0.85, fs: 0.95, ws: 0.9, gait: "stutter",
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
      const hs = sock([0, 13.6, 0]);
      const head = node(sphere(13, 14, 13, P, 9, 6), [0, 33, 0], [0, 0, 0.15], [
        node(sphere(4, 4.4, 3, "#f4f0ff", 6, 4), [-11, 1, 4.5]), node(sphere(4, 4.4, 3, "#f4f0ff", 6, 4), [-11, 1, -4.5]),
        node(sphere(2.2, 2.6, 1.6, "#1a0838", 5, 4), [-13.5, 0.6, 4.8]), node(sphere(2.2, 2.6, 1.6, "#1a0838", 5, 4), [-13.5, 0.6, -4.8]),
        ...[[2, 12, 5], [6, 9, -7], [-4, 11, -2], [9, 5, 6]].map(([x, y, z]) => node(sphere(1.2, 1.2, 1.2, S, 4, 3), [x, y, z])), hs,
      ]);
      const body = node(null, [0, 6, 0], [0, 0, 0], [...ring.map((r) => r.n), head]);
      const root = node(null, [0, 0, 0], [0, 0, 0], [body]);
      return { root, sockets: { head: hs, feet: [1, 3, 5, 7].map((i) => ring[i].end), wrist: ring[4].mid }, hs: 1.2, fs: 0.75, ws: 1,
        anim(t) {
          body.p[1] = 8 + Math.sin(t * 1.6) * 2.5;
          tents.forEach((segs, k) => segs.forEach((s, i) => (s.r[2] = (i ? 0.3 : 0) + Math.sin(t * 2.4 - i * 0.7 + k) * 0.22)));
        } };
    },

    phoenix() {
      const R = "#e8501a", O = "#ff9a2a", Y = "#ffd84a";
      const hs = sock([-0.4, 4.2, 0]);
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
      const body = node(null, [0, 0, 0], [0, 0, 0], [wR, ...flames, lL.n, lR.n, node(sphere(6, 7.5, 5.5, R, 7, 5), [0, 22, 0]), node(sphere(4, 5.5, 4, O, 6, 4), [-2.8, 21, 0]), head, wL]);
      const root = node(null, [0, 0, 0], [0, 0, 0], [body, ...embers]);
      return { root, sockets: { head: hs, feet: [lL.s, lR.s], wrist: lL.w }, hs: 0.6, fs: 0.85, ws: 0.6,
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
      const legs = [[-7, 6], [7, 6], [-7, -6], [7, -6]].map(([x, z]) => leg([x, 14, z], 10, 3.2, 2.6, R, box(6, 2.4, 5, D)));
      const hs = sock([2, 6.2, 0]);
      const eyes = [4.6, -4.6].map((z) => node(sphere(1.6, 1.8, 1.4, "#ffd23a!", 5, 4), [-3.5, 2, z], [0, 0, 0], [node(sphere(0.8, 1.2, 0.8, "#1a0600", 4, 3), [-1.1, 0, z > 0 ? 0.8 : -0.8])]));
      const head = node(sphere(8, 6.5, 6.8, R, 7, 5), [-22, 33, 0], [0, 0, 0.1], [
        node(cyl(4.6, 2.6, 10, R, 6), [-3, -1.5, 0], [0, 0, PI / 2 + 0.15]), node(box(8, 1.6, 6, D), [-8, -4.5, 0]), ...eyes,
        node(cyl(1.8, 0, 9, H, 5), [3, 4, 3.2], [0.2, 0, -1.0]), node(cyl(1.8, 0, 9, H, 5), [3, 4, -3.2], [-0.2, 0, -1.0]), hs,
      ]);
      const puff = node(sphere(3, 2.2, 2.2, "#ff9a3a!", 5, 4), [-36, 30, 0], [0, 0, 0], [node(sphere(1.8, 1.4, 1.4, "#ffe066!", 4, 3), [-1, 0, 0])], [0, 0, 0]);
      const chest = node(sphere(15, 11, 11, R, 8, 5), [0, 20, 0]);
      const root = node(null, [0, 0, 0], [0, 0, 0], [
        wR, legs[2].n, legs[3].n, chest, node(sphere(12, 7, 9, B, 8, 5), [-2, 16, 0]), node(null, [13, 19, 0], [0, 0, -1.25], [tail[0]]),
        node(cyl(5.5, 4.4, 15, R), [-9, 21, 0], [0, 0, 0.85]), head,
        ...[-4, 2, 8].map((x, i) => node(cyl(1.8, 0, 4.5 - i * 0.6, H, 4), [x, 29 - i * 1.5, 0], [0, 0, -0.2])), legs[0].n, legs[1].n, wL, puff,
      ]);
      return { root, sockets: { head: hs, feet: legs.map((l) => l.s), wrist: legs[0].w }, hs: 0.95, fs: 1.25, ws: 1.35,
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
  const shoe = (up, sole, accent, boot) => () => node(null, [0, 0, 0], [0, 0, 0], [
    node(box(10, 1.4, 4.8, sole), [0, 0.7, 0]), node(sphere(5, 3, 2.4, up, 6, 4), [0.8, 2.4, 0]), node(sphere(2.8, 1.9, 2.3, up, 6, 4), [-3.4, 1.8, 0]),
    node(poly([[-2, 2, 2.45], [3, 3.4, 2.45], [3.8, 2.4, 2.45]], accent)), node(poly([[-2, 2, -2.45], [3, 3.4, -2.45], [3.8, 2.4, -2.45]], accent)),
    ...(boot ? [node(box(5.2, 5, 4.6, up), [1.4, 4.6, 0]), node(box(5.6, 1.3, 5, accent), [1.4, 7.4, 0])] : []),
  ]);
  const watch = (band, face, extra = []) => () => node(null, [0, 0, 0], [0, 0, 0], [
    node(cyl(2.6, 2.6, 1.6, band, 8)), node(box(0.8, 2.8, 2.8, face), [-2.9, 0.8, 0]), ...extra,
  ]);
  const milk = (c) => () => node(null, [0, 0, 0], [0, 0, 0], [node(cyl(2.9, 3.2, 7, c, 8)), node(cyl(3.2, 3.3, 2.4, "#dcecf4", 8), [0, 7, 0])]);
  const GEAR = {
    hat_snapback: () => node(null, [0, -1, 0], [0, 0, 0], [node(sphere(5, 4, 5, "#2f6fe0", 7, 4), [0, 1.4, 0]), node(box(5.6, 0.7, 6, "#1f4fb0"), [5, 1.1, 0]), node(sphere(0.8, 0.6, 0.8, "#1f4fb0", 4, 3), [0, 5.3, 0])]),
    hat_fitted: () => node(null, [0, -1, 0], [0, 0, 0.12], [node(sphere(5, 4.3, 5, "#1c1c24", 7, 4), [0, 1.4, 0]),
      node(box(6.2, 0.7, 6.4, "#15151c"), [-5.2, 1.1, 0], [0, 0.5, 0], [node(box(1.8, 0.25, 1.8, "#ffd84a!"), [-1, 0.45, 1])])]),
    hat_pimp: () => node(null, [0, -0.6, 0], [0, 0, 0.18], [node(cyl(7.5, 7.5, 0.8, "#1a1a22", 8)), node(cyl(4.6, 5, 9, "#22222c", 8), [0, 0.8, 0]),
      node(cyl(5.1, 5.1, 1.6, "#e8b830", 8), [0, 1.2, 0]), node(poly([[3.6, 2.4, 3.4], [6, 10, 4.2], [8, 12.5, 3.8], [5, 4, 3.4]], "#b05cff"))]),
    hat_crown: () => {
      const spark = node(box(0.9, 0.9, 0.9, "#ffffff!"), [1.5, 7, 1]);
      const n = node(null, [0, -0.6, 0], [0, 0, 0.1], [node(cyl(5, 5.3, 2.8, "#e8b830", 8)),
        ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => node(cyl(1.3, 0, 3.6, "#ffd84a", 4), [4.8 * Math.cos((i * PI) / 4), 2.6, 4.8 * Math.sin((i * PI) / 4)])),
        ...[0, 1, 2, 3, 4, 5].map((i) => node(sphere(0.9, 0.9, 0.9, ["#ff2a4a!", "#2a7aff!", "#3ad65a!"][i % 3], 4, 3), [5.3 * Math.cos((i * PI) / 3 + 0.3), 1.4, 5.3 * Math.sin((i * PI) / 3 + 0.3)])), spark]);
      n.anim = (t) => (spark.s = t % 1.3 < 0.5 ? [1, 1, 1] : [0, 0, 0]);
      return n;
    },
    kicks_af1: shoe("#2e2e38", "#43434e", "#14141a"),
    kicks_timbs: shoe("#c8963c", "#5a3a1c", "#3a2410", true),
    kicks_grinch: shoe("#7ee02a", "#f0f0e8", "#e8243a"),
    kicks_dior: shoe("#c4c8d0", "#f4f4f0", "#6a7a8c"),
    watch_casio: watch("#1a1a1a", "#7a8a7a", [node(box(0.3, 1.4, 1.8, "#c8d8a8!"), [-3.4, 0.8, 0])]),
    watch_prx: watch("#c8ccd4", "#2a5aa8"),
    watch_sub: watch("#c8ccd4", "#101418", [node(box(0.4, 3.2, 3.2, "#1a5a3a"), [-2.6, 0.8, 0])]),
    watch_rm: watch("#c41a2a", "#f0eef0", [node(box(0.3, 1.8, 0.5, "#e8243a"), [-3.4, 0.8, 0])]),
    milk_farm: milk("#f6f6f2"), milk_goat: milk("#efe2bc"), milk_unicorn: milk("#f0b8f0"), milk_dragon: milk("#ffb83a!"),
  };

  // ---------------------------------------------------------------- API
  const DS = 2.4;  // one model pixel is 2.4 screen pixels: the chunky retro look
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
      if (e) { e[0] = Math.min(e[0], bb[0]); e[1] = Math.max(e[1], bb[2]); }
    }
    const span = Math.max(-x0, x1);
    inst.W = Math.ceil(span * 2 + 6); inst.H = Math.ceil(-top + 11 * inst.hs + 3); inst.cx = inst.W / 2;
  }
  function attach(socket, id, scale) {
    socket.kids = [];
    if (!id || !GEAR[id]) return null;
    const g = GEAR[id](); g.s = [scale, scale, scale]; socket.kids.push(g); return g;
  }
  function dress(inst, eq) {
    const { head, feet, wrist } = inst.sockets;
    inst.gear = [attach(head, eq.hat, inst.hs), ...feet.map((f) => attach(f, eq.shoes, inst.fs)), attach(wrist, eq.watch, inst.ws)].filter(Boolean);
    inst.st.shod = !!eq.shoes;
  }
  // st: { yaw, walk, held, fly, air } from the room's physics
  function draw(inst, ctx, t, st) {
    Object.assign(inst.st, st);
    inst.anim(t, inst.st);
    inst.gear.forEach((g) => g.anim && g.anim(t));
    render(ctx, inst.root, inst.W, inst.H, { yaw: st.yaw, cx: inst.cx, cy: inst.H - 1 });
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
      snaps[key] = { url: canvasURL(inst.W, inst.H, (ctx) => render(ctx, inst.root, inst.W, inst.H, { yaw: 0.55, cx: inst.cx, cy: inst.H - 1 })), w: inst.W, h: inst.H };
    }
    return snaps[key];
  }
  function gearShot(id) {
    if (!snaps[id]) {
      const yaw = id.startsWith("watch") ? 1.25 : 0.6;  // show a watch by its face
      const g = GEAR[id](), bb = render(null, g, 0, 0, { yaw, tilt: 0.4, cx: 0, cy: 0, measureOnly: true });
      const W = Math.ceil(bb[2] - bb[0] + 2), H = Math.ceil(bb[3] - bb[1] + 2);
      snaps[id] = { url: canvasURL(W, H, (ctx) => render(ctx, g, W, H, { yaw, tilt: 0.4, cx: -bb[0] + 1, cy: -bb[1] + 1 })), w: W, h: H };
    }
    return snaps[id];
  }
  const img = (s, h) => `<img class="p3img" src="${s.url}" style="height:${h}px;width:${Math.round((s.w * h) / s.h)}px" alt="">`;
  window.Pets3D = {
    DS, has: (id) => !!PETS[id], hasGear: (id) => !!GEAR[id], make, dress, draw,
    icon: (id, h, eq) => img(snapshot(id, eq), h), gearIcon: (id, h) => img(gearShot(id), h),
  };
})();
