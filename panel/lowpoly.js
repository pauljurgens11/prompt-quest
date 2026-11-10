// A tiny flat-shaded low-poly renderer: meshes from primitives, a joint hierarchy, painter's sort and
// banded lighting, drawn at low resolution and scaled up with hard pixels for the old-MMO look.
// A colour ending in "!" glows: it ignores the light (eyes, embers, gems). "#rrggbb@0.4" is see-through (glass).
(function () {
  const cache = {};
  const rgb = (h) => cache[h] || (cache[h] = ((n) => [n >> 16, (n >> 8) & 255, n & 255])(parseInt(h.slice(1, 7), 16)));

  // ---- meshes: { v: [[x,y,z]], f: [[indices, colour]] }
  function sphere(rx, ry, rz, color, seg = 7, rings = 5) {
    const v = [[0, ry, 0]], f = [];
    for (let i = 1; i < rings; i++) {
      const a = (Math.PI * i) / rings;
      for (let j = 0; j < seg; j++) { const b = (2 * Math.PI * j) / seg; v.push([rx * Math.sin(a) * Math.cos(b), ry * Math.cos(a), rz * Math.sin(a) * Math.sin(b)]); }
    }
    v.push([0, -ry, 0]);
    const bottom = v.length - 1, ring = (i, j) => 1 + (i - 1) * seg + (j % seg);
    for (let j = 0; j < seg; j++) f.push([[0, ring(1, j + 1), ring(1, j)], color]);
    for (let i = 1; i < rings - 1; i++) for (let j = 0; j < seg; j++) f.push([[ring(i, j), ring(i, j + 1), ring(i + 1, j + 1), ring(i + 1, j)], color]);
    for (let j = 0; j < seg; j++) f.push([[bottom, ring(rings - 1, j), ring(rings - 1, j + 1)], color]);
    return { v, f };
  }
  function cyl(r1, r2, h, color, seg = 6, capColor) {  // along +y from 0 to h; r2 = 0 is a cone
    const v = [], f = [];
    for (let j = 0; j < seg; j++) { const b = (2 * Math.PI * j) / seg; v.push([r1 * Math.cos(b), 0, r1 * Math.sin(b)]); }
    if (r2 > 0) for (let j = 0; j < seg; j++) { const b = (2 * Math.PI * j) / seg; v.push([r2 * Math.cos(b), h, r2 * Math.sin(b)]); }
    else v.push([0, h, 0]);
    for (let j = 0; j < seg; j++) { const b = (j + 1) % seg; f.push([r2 > 0 ? [j, b, seg + b, seg + j] : [j, b, seg], color]); }
    f.push([[...Array(seg).keys()].reverse(), capColor || color]);
    if (r2 > 0) f.push([[...Array(seg).keys()].map((k) => seg + k), capColor || color]);
    return { v, f };
  }
  function box(w, h, d, color) {
    const x = w / 2, y = h / 2, z = d / 2;
    const v = [[-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z], [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]];
    return { v, f: [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [3, 2, 6, 7], [0, 3, 7, 4], [1, 5, 6, 2]].map((q) => [q, color]) };
  }
  const poly = (pts, color) => ({ v: pts, f: [[pts.map((_, i) => i), color]] });  // a flat sheet: wings, fins, flames
  // an outline in the x/z plane pulled up from y0 to top(x, z): soles, shoe uppers, boot shafts
  function extrude(pts, y0, top, color, topColor) {
    const n = pts.length, v = [], f = [], T = typeof top === "function" ? top : () => top;
    for (const [x, z] of pts) v.push([x, y0, z]);
    for (const [x, z] of pts) v.push([x, T(x, z), z]);
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; f.push([[i, j, n + j, n + i], color]); }
    f.push([[...Array(n).keys()].reverse(), color]); f.push([[...Array(n).keys()].map((k) => n + k), topColor || color]);
    return { v, f };
  }
  // a hollow ring: glass walls, crown bands, hat bands (open top and bottom)
  function tube(r1, r2, h, color, seg = 10, inner = 0.85, rimColor) {
    const v = [], f = [], ri1 = r1 * inner, ri2 = r2 * inner;
    for (let j = 0; j < seg; j++) { const b = (2 * Math.PI * j) / seg, c = Math.cos(b), s = Math.sin(b); v.push([r1 * c, 0, r1 * s], [r2 * c, h, r2 * s], [ri1 * c, 0, ri1 * s], [ri2 * c, h, ri2 * s]); }
    for (let j = 0; j < seg; j++) {
      const a = j * 4, b = ((j + 1) % seg) * 4;
      f.push([[a, b, b + 1, a + 1], color], [[a + 2, a + 3, b + 3, b + 2], color], [[a + 1, b + 1, b + 3, a + 3], rimColor || color], [[a, a + 2, b + 2, b], color]);
    }
    return { v, f };
  }
  // a flat ring whose height follows lift(angle, t): hat brims that curl (t = 0 inner edge, 1 outer edge)
  function brim(rIn, rOut, lift, color, seg = 16, a0 = 0, a1 = 2 * Math.PI) {
    const v = [], f = [], full = Math.abs(a1 - a0 - 2 * Math.PI) < 1e-6, steps = full ? seg : seg + 1;
    for (let j = 0; j < steps; j++) {
      const b = a0 + ((a1 - a0) * j) / seg, c = Math.cos(b), s = Math.sin(b);
      v.push([rIn * c, lift(b, 0), rIn * s], [rOut * c, lift(b, 1), rOut * s]);
    }
    for (let j = 0; j < seg; j++) { const a = j * 2, b = ((j + 1) % steps) * 2; f.push([[a, b, b + 1, a + 1], color]); }
    return { v, f };
  }

  // ---- nodes: { mesh, p, r (x,y,z radians, applied Ry*Rx*Rz), s, kids }
  const node = (mesh, p = [0, 0, 0], r = [0, 0, 0], kids = [], s = [1, 1, 1]) => ({ mesh, p, r, s, kids });
  function mul(a, b) {
    const m = new Array(12);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    for (let i = 0; i < 3; i++) m[9 + i] = a[i * 3] * b[9] + a[i * 3 + 1] * b[10] + a[i * 3 + 2] * b[11] + a[9 + i];
    return m;
  }
  function local(n) {
    const [rx, ry, rz] = n.r, [sx, sy, sz] = n.s;
    const cx = Math.cos(rx), sxr = Math.sin(rx), cy = Math.cos(ry), syr = Math.sin(ry), cz = Math.cos(rz), szr = Math.sin(rz);
    const R = mul([cy, 0, syr, 0, 1, 0, -syr, 0, cy, 0, 0, 0], mul([1, 0, 0, 0, cx, -sxr, 0, sxr, cx, 0, 0, 0], mul([cz, -szr, 0, szr, cz, 0, 0, 0, 1, 0, 0, 0], [sx, 0, 0, 0, sy, 0, 0, 0, sz, 0, 0, 0])));
    R[9] = n.p[0]; R[10] = n.p[1]; R[11] = n.p[2];
    return R;
  }
  const apply = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2] + m[9], m[3] * v[0] + m[4] * v[1] + m[5] * v[2] + m[10], m[6] * v[0] + m[7] * v[1] + m[8] * v[2] + m[11]];

  const LIGHT = (() => { const l = [-0.45, 0.75, 0.55], n = Math.hypot(...l); return l.map((x) => x / n); })();
  // Draw a model. yaw turns it (0 = side view facing left); the ground is the bottom of the canvas.
  // Returns the drawn bounds, so callers can size a canvas to fit.
  function render(ctx, root, W, H, { yaw = 0, tilt = 0.3, scale = 1, cx = W / 2, cy = H - 1, bands = 7, clear = true, measureOnly = false } = {}) {
    if (clear && !measureOnly) ctx.clearRect(0, 0, W, H);
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), ct = Math.cos(tilt), st = Math.sin(tilt);
    const view = mul([1, 0, 0, 0, ct, -st, 0, st, ct, 0, 0, 0], [cyw, 0, syw, 0, 1, 0, -syw, 0, cyw, 0, 0, 0]);
    const tris = [], bb = [Infinity, Infinity, -Infinity, -Infinity];
    (function walk(n, parent) {
      const m = mul(parent, local(n));
      if (n.mesh && n.s[0] && n.s[1] && n.s[2]) {
        const vs = n.mesh.v.map((v) => apply(m, v)), vps = vs.map((p) => apply(view, p));
        for (const [idx, color] of n.mesh.f) {
          if (idx.length < 3) continue;
          const vp = idx.map((i) => vps[i]);
          for (const p of vp) { const x = cx + p[0], y = cy - p[1]; if (x < bb[0]) bb[0] = x; if (y < bb[1]) bb[1] = y; if (x > bb[2]) bb[2] = x; if (y > bb[3]) bb[3] = y; }
          if (measureOnly) continue;
          let k = 1.12;
          if (color[color.length - 1] !== "!") {
            const a = vs[idx[0]], b = vs[idx[1]], c = vs[idx[2]];
            let nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
            let ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
            let nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
            const L = Math.hypot(nx, ny, nz) || 1;
            const vn = apply([...view.slice(0, 9), 0, 0, 0], [nx / L, ny / L, nz / L]);
            if (vn[2] < 0) { vn[0] = -vn[0]; vn[1] = -vn[1]; vn[2] = -vn[2]; }  // light the side we see
            const lit = Math.max(0, vn[0] * LIGHT[0] + vn[1] * LIGHT[1] + vn[2] * LIGHT[2]);
            k = Math.round((0.5 + 0.64 * lit) * bands) / bands;  // banded, like old vertex lighting
          }
          tris.push({ vp, color, k, z: vp.reduce((s, p) => s + p[2], 0) / vp.length });
        }
      }
      for (const c of n.kids) walk(c, m);
    })(root, [scale, 0, 0, 0, scale, 0, 0, 0, scale, 0, 0, 0]);
    if (measureOnly) return bb;
    tris.sort((a, b) => a.z - b.z);
    for (const t of tris) {
      const [r, g, b] = rgb(t.color);
      const at = t.color.indexOf("@"), a = at > 0 ? parseFloat(t.color.slice(at + 1)) : 1;
      ctx.fillStyle = ctx.strokeStyle = `rgba(${Math.min(255, r * t.k) | 0},${Math.min(255, g * t.k) | 0},${Math.min(255, b * t.k) | 0},${a})`;
      ctx.lineWidth = a < 1 ? 0 : 0.5;
      ctx.beginPath();
      t.vp.forEach((p, i) => (i ? ctx.lineTo(cx + p[0], cy - p[1]) : ctx.moveTo(cx + p[0], cy - p[1])));
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    return bb;
  }
  window.LowPoly = { sphere, cyl, box, poly, extrude, tube, brim, node, render };
})();
