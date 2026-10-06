// 生成个人主页用的动画 SVG(明暗两套):在仓库根目录运行 node tools/gen.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const SANS = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif`;
const MONO = `ui-monospace, 'SF Mono', 'Cascadia Code', 'JetBrains Mono', Menlo, Consolas, 'Liberation Mono', monospace`;
const C = { v: '#6a44f2', b: '#2f8bff', c: '#18e3e8', ok: '#2ee59d', bad: '#ff4d6d' };

const T = {
  dark: {
    bg0: '#04060c', bg1: '#0a0f1e', text: '#f3f5fb', muted: '#a3acbe', faint: '#69728a',
    line: 'rgba(255,255,255,0.09)', glass: 'rgba(255,255,255,0.035)', glassLine: 'rgba(255,255,255,0.13)',
    gridOp: 0.5, star: '#ffffff', starOp: 1, aur: 0.55, tubeIn: '#060914', dim: 'rgba(140,160,255,0.22)',
    shimmer: ['#f3f5fb', '#9db8ff', '#5ff3f6'], okText: '#4cf0ae', badText: '#ff6b85',
  },
  light: {
    bg0: '#ffffff', bg1: '#edf1fb', text: '#0a0f1f', muted: '#4c566c', faint: '#8790a4',
    line: 'rgba(15,23,42,0.10)', glass: 'rgba(255,255,255,0.75)', glassLine: 'rgba(15,23,42,0.12)',
    gridOp: 0.32, star: '#5468ff', starOp: 0.45, aur: 0.26, tubeIn: '#ffffff', dim: 'rgba(70,90,200,0.22)',
    shimmer: ['#0a0f1f', '#4b39d6', '#0aa5c8'], okText: '#0f9d63', badText: '#e0244a',
  },
};

// 品牌标(与 brand/logo.svg 同一组路径,原始坐标系 368×300,中心约 (209,169))
const MARK = { a: 'M86 248V84l146 124v52', b: 'M332 78l-88 96', tri: 'M118 192l52 30-52 30z' };
const VERTS = [[86, 248], [86, 84], [232, 208], [232, 260], [332, 78], [244, 174]];

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const textW = (s, size, mono) => [...s].reduce((w, ch) => w + (/[⺀-鿿＀-￯]/.test(ch) ? 1.0 : mono ? 0.61 : 0.56) * size, 0);
function prng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const grad = (id, x1, y1, x2, y2) =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${C.v}"/><stop offset=".55" stop-color="${C.b}"/><stop offset="1" stop-color="${C.c}"/></linearGradient>`;
const radial = (id, color, op) =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${op}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
const baseStyle = `.sans{font-family:${SANS}}.mono{font-family:${MONO}}@media (prefers-reduced-motion: reduce){*{animation:none!important}}`;
const filters = `
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="soft" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3.2"/></filter>`;
const bgDefs = (t, W, H) => `
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.bg1}"/><stop offset="1" stop-color="${t.bg0}"/></linearGradient>
<pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1.1" cy="1.1" r="1.1" fill="${t.line}"/></pattern>
<clipPath id="frame"><rect width="${W}" height="${H}" rx="24"/></clipPath>`;
const frameEdge = (t, W, H) => `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="23.5" fill="none" stroke="${t.line}"/>`;

// 一条在路径上跑的光点(SMIL,在 <img> 里也会动)
const packet = (path, { r = 4.5, color = C.c, dur = 5, begin = 0, travel = 0.3, reverse = false }) => {
  const kp = reverse ? '1;0;0' : '0;1;1';
  return `<g><circle r="${r * 2.4}" fill="${color}" opacity=".35" filter="url(#soft)"/><circle r="${r}" fill="${color}"/><circle r="${r * 0.45}" fill="#fff"/>
<animateMotion dur="${dur}s" begin="${begin}s" repeatCount="indefinite" keyPoints="${kp}" keyTimes="0;${travel};1" calcMode="linear" path="${path}"/>
<animate attributeName="opacity" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" values="0;1;1;0;0" keyTimes="0;0.02;${travel - 0.02};${travel};1"/></g>`;
};

function chips(items, x, y, t, { size = 15, h = 36, gap = 10, pad = 16 } = {}) {
  let out = '', cx = x;
  for (const it of items) {
    const w = Math.ceil(textW(it, size, true) + pad * 2);
    out += `<rect x="${cx}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${t.glass}" stroke="${t.glassLine}"/>`;
    out += `<text x="${cx + w / 2}" y="${y + h / 2 + size * 0.35}" text-anchor="middle" class="mono" font-size="${size}" fill="${t.muted}">${esc(it)}</text>`;
    cx += w + gap;
  }
  return { svg: out, end: cx - gap };
}

// ---------------- 主视觉 ----------------
function hero(mode) {
  const t = T[mode], W = 1200, H = 540, HZ = 424, VPY = HZ - 70;
  const cx = 935, cy = 212, s = 1.1, ox = cx - 209 * s, oy = cy - 169 * s;
  const rnd = prng(20261007);
  let stars = '';
  for (let i = 0; i < 54; i++) {
    const x = (rnd() * W) | 0, y = (rnd() * (HZ - 30)) | 0, r = (rnd() * 1.2 + 0.4).toFixed(2);
    const o = ((0.2 + rnd() * 0.6) * t.starOp).toFixed(2), d = (2.5 + rnd() * 4).toFixed(1), b = (-rnd() * 6).toFixed(1);
    stars += `<circle cx="${x}" cy="${y}" r="${r}" fill="${t.star}" opacity="${o}"><animate attributeName="opacity" values="${o};0.04;${o}" dur="${d}s" begin="${b}s" repeatCount="indefinite"/></circle>`;
  }
  // 透视网格:竖线汇向消失点,横线从地平线往下加速滑落
  let grid = '';
  for (let i = -14; i <= 14; i++) {
    const xb = 600 + i * 120, k = (HZ - VPY) / (H - VPY), xh = 600 + (xb - 600) * k;
    grid += `<line x1="${xh.toFixed(1)}" y1="${HZ}" x2="${xb}" y2="${H}"/>`;
  }
  for (let i = 0; i < 9; i++) {
    grid += `<line x1="0" x2="${W}" y1="${HZ}" y2="${HZ}"><animate attributeName="y1" values="${HZ};${H}" dur="5.4s" begin="${(-i * 0.6).toFixed(1)}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.6 0 1 1"/><animate attributeName="y2" values="${HZ};${H}" dur="5.4s" begin="${(-i * 0.6).toFixed(1)}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.6 0 1 1"/></line>`;
  }
  const tube = (cls, extra = '') => `<path class="${cls}" pathLength="100" d="${MARK.a}"${extra}/><path class="${cls} b" pathLength="100" d="${MARK.b}"${extra}/>`;
  const verts = VERTS.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="9" fill="${t.tubeIn}" stroke="url(#gm)" stroke-width="3.5"/><circle cx="${x}" cy="${y}" r="3.2" fill="${C.c}"><animate attributeName="opacity" values="1;.25;1" dur="2.4s" begin="${(-i * 0.4).toFixed(1)}s" repeatCount="indefinite"/></circle>`).join('');
  const orbitA = `M ${cx - 255} ${cy} a 255 64 0 1 0 510 0 a 255 64 0 1 0 -510 0`;
  const orbitB = `M ${cx - 300} ${cy} a 300 92 0 1 1 600 0 a 300 92 0 1 1 -600 0`;
  const term = '$ apply  ·  dry-run ✓  ·  live ✓  ·  nodes 3/3 in sync';
  const TYPEW = Math.ceil(textW(term, 16, true) + 10);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Maoyangui — self-hosted network infrastructure that fails closed, rolls back, never leaks">
<defs>${bgDefs(t, W, H)}${filters}
${grad('g', 0, 0, W, H)}${grad('gm', 70, 70, 310, 270)}${grad('gt', 72, 0, 700, 0)}
${radial('rv', C.v, 1)}${radial('rb', C.b, 1)}${radial('rc', C.c, 1)}
<linearGradient id="shimmer" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="520" y2="0"><stop offset="0" stop-color="${t.shimmer[0]}"/><stop offset=".42" stop-color="${t.shimmer[0]}"/><stop offset=".5" stop-color="${t.shimmer[1]}"/><stop offset=".56" stop-color="${t.shimmer[2]}"/><stop offset=".64" stop-color="${t.shimmer[0]}"/><stop offset="1" stop-color="${t.shimmer[0]}"/>
<animateTransform attributeName="gradientTransform" type="translate" values="-560 0;620 0;620 0" keyTimes="0;0.55;1" dur="7s" repeatCount="indefinite"/></linearGradient>
<linearGradient id="hzl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.v}" stop-opacity="0"/><stop offset=".5" stop-color="${C.c}"/><stop offset="1" stop-color="${C.v}" stop-opacity="0"/></linearGradient>
<linearGradient id="gfade" x1="0" y1="${HZ}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".35" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff"/></linearGradient>
<mask id="gm2"><rect y="${HZ}" width="${W}" height="${H - HZ}" fill="url(#gfade)"/></mask>
<clipPath id="type"><rect x="86" y="356" height="40" width="0"><animate attributeName="width" values="0;${TYPEW};${TYPEW};0" keyTimes="0;0.45;0.92;1" dur="9s" repeatCount="indefinite"/></rect></clipPath>
<style>${baseStyle}
.p{stroke-dasharray:14 186;animation:run 5.2s linear infinite}
.p.b{animation-duration:3.6s;animation-delay:-1.2s}
.p.c{animation-delay:-2.6s}
@keyframes run{0%{stroke-dashoffset:14}62%{stroke-dashoffset:-100}100%{stroke-dashoffset:-100}}
.cur{animation:blink 1s steps(1) infinite}@keyframes blink{50%{opacity:0}}
</style>
</defs>
<g clip-path="url(#frame)">
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<g opacity="${t.aur}">
<ellipse cx="900" cy="110" rx="380" ry="210" fill="url(#rv)"><animateTransform attributeName="transform" type="translate" values="0 0;-90 40;0 0" dur="16s" repeatCount="indefinite"/></ellipse>
<ellipse cx="1110" cy="360" rx="330" ry="190" fill="url(#rc)" opacity=".8"><animateTransform attributeName="transform" type="translate" values="0 0;-60 -50;0 0" dur="12s" repeatCount="indefinite"/></ellipse>
<ellipse cx="260" cy="20" rx="420" ry="150" fill="url(#rb)" opacity=".55"><animateTransform attributeName="transform" type="translate" values="0 0;80 20;0 0" dur="18s" repeatCount="indefinite"/></ellipse>
</g>
${stars}
<g mask="url(#gm2)" stroke="url(#g)" stroke-width="1.1" opacity="${t.gridOp}">${grid}</g>
<rect x="0" y="${HZ - 1}" width="${W}" height="2" fill="url(#hzl)" opacity=".9"/>
<rect x="200" y="${HZ - 10}" width="${W - 400}" height="20" fill="url(#hzl)" opacity=".25" filter="url(#glow)"/>
<g fill="none" stroke-width="1.2">
<path d="${orbitB}" stroke="url(#g)" stroke-opacity=".28" stroke-dasharray="2 7" transform="rotate(10 ${cx} ${cy})"/>
<g transform="rotate(-15 ${cx} ${cy})"><path d="${orbitA}" stroke="url(#g)" stroke-opacity=".45"/>
${packet(orbitA, { r: 4, color: C.c, dur: 9, travel: 0.999 }).replace(/<animate attributeName="opacity"[^>]*\/>/, '')}</g>
<g transform="rotate(10 ${cx} ${cy})">${packet(orbitB, { r: 3.2, color: C.v, dur: 15, travel: 0.999 }).replace(/<animate attributeName="opacity"[^>]*\/>/, '')}</g>
</g>
<g transform="translate(${ox.toFixed(1)} ${oy.toFixed(1)}) scale(${s})">
<g fill="none" stroke-linecap="round" stroke-linejoin="round">
<g stroke="url(#gm)" stroke-width="52" opacity=".5" filter="url(#glow)"><path d="${MARK.a}"/><path d="${MARK.b}"/></g>
<g stroke="url(#gm)" stroke-width="48"><path d="${MARK.a}"/><path d="${MARK.b}"/></g>
<g stroke="${t.tubeIn}" stroke-width="40"><path d="${MARK.a}"/><path d="${MARK.b}"/></g>
<g stroke="url(#gm)" stroke-width="40" opacity=".09"><path d="${MARK.a}"/><path d="${MARK.b}"/></g>
<g stroke="url(#gm)" stroke-width="26" filter="url(#soft)">${tube('p')}${tube('p c')}</g>
<g stroke="#ffffff" stroke-width="5" opacity=".95">${tube('p')}${tube('p c')}</g>
</g>
<path d="${MARK.tri}" fill="url(#gm)" filter="url(#glow)" opacity=".7"><animate attributeName="opacity" values=".35;.85;.35" dur="3s" repeatCount="indefinite"/></path>
<path d="${MARK.tri}" fill="url(#gm)"/>
${verts}
</g>
<circle cx="80" cy="91" r="4.5" fill="${C.ok}"><animate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite"/></circle>
<circle cx="80" cy="91" r="4.5" fill="none" stroke="${C.ok}"><animate attributeName="r" values="4.5;12" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values=".8;0" dur="2s" repeatCount="indefinite"/></circle>
<text x="96" y="97" class="mono" font-size="15" letter-spacing="3" fill="${t.faint}">冒央会社 · MAOYANG INC. · SINCE 2020</text>
<text x="66" y="200" class="sans" font-size="98" font-weight="800" letter-spacing="-3.2" fill="url(#shimmer)">Maoyangui</text>
<text x="72" y="262" class="sans" font-size="28" font-weight="650" letter-spacing="-0.4" fill="${t.text}">Self-hosted network infrastructure</text>
<text x="72" y="300" class="sans" font-size="27" font-weight="650" letter-spacing="-0.4" fill="url(#gt)">that fails closed, rolls back, never leaks.</text>
<text x="72" y="334" class="sans" font-size="17" fill="${t.muted}">自托管网络基础设施 · 失败即回滚 · 隧道之外不放行</text>
<rect x="72" y="352" width="600" height="48" rx="12" fill="${t.glass}" stroke="${t.glassLine}"/>
<g clip-path="url(#type)"><text x="92" y="382" class="mono" font-size="16" fill="${t.muted}" xml:space="preserve"><tspan fill="${C.c}">$</tspan> apply  ·  <tspan fill="${t.okText}">dry-run ✓</tspan>  ·  <tspan fill="${t.okText}">live ✓</tspan>  ·  nodes <tspan fill="${t.text}">3/3</tspan> in sync</text></g>
<rect x="88" y="368" width="9" height="18" rx="1.5" fill="url(#g)" class="cur"><animate attributeName="x" values="88;${88 + TYPEW};${88 + TYPEW};88" keyTimes="0;0.45;0.92;1" dur="9s" repeatCount="indefinite"/></rect>
</g>
${frameEdge(t, W, H)}
</svg>
`;
}

// ---------------- 项目面板公用 ----------------
function panelText(t, x, p) {
  const facts = p.facts.map((f, i) => {
    const y = 262 + i * 34;
    return `<circle cx="${x + 10}" cy="${y - 6}" r="10" fill="none" stroke="url(#g)" stroke-width="1.6" opacity=".7"/><path d="M${x + 5.5} ${y - 6}l3.2 3.2 6-6.4" fill="none" stroke="url(#g)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
<text x="${x + 32}" y="${y}" class="sans" font-size="20" fill="${t.text}">${esc(f)}</text>`;
  }).join('\n');
  return `<text x="${x}" y="78" class="mono" font-size="15" letter-spacing="3" fill="url(#g)">${esc(p.eyebrow)}</text>
<text x="${x - 3}" y="146" class="sans" font-size="64" font-weight="800" letter-spacing="-2" fill="${t.text}">${esc(p.title)}<tspan dx="14" font-size="24" font-weight="500" letter-spacing="0" fill="${t.muted}">${esc(p.sub)}</tspan></text>
<text x="${x}" y="190" class="sans" font-size="21" fill="${t.muted}">${esc(p.desc[0])}</text>
<text x="${x}" y="218" class="sans" font-size="21" fill="${t.muted}">${esc(p.desc[1])}</text>
${facts}
<text x="${x}" y="408" class="mono" font-size="14" fill="${t.faint}">${esc(p.stack)}</text>
<text x="${x + 500}" y="408" text-anchor="end" class="sans" font-size="17" font-weight="700" fill="url(#g)">Repository →</text>`;
}

function panelShell(mode, W, H, aria, glowX, body) {
  const t = T[mode];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(aria)}">
<defs>${bgDefs(t, W, H)}${filters}
${grad('g', 0, 0, W, H)}${grad('gm', 70, 70, 310, 270)}
${radial('rv', C.v, 1)}${radial('rc', C.c, 1)}
<linearGradient id="top" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.v}" stop-opacity="0"/><stop offset=".5" stop-color="${C.c}"/><stop offset="1" stop-color="${C.c}" stop-opacity="0"/></linearGradient>
<style>${baseStyle}
.sweep{animation:sweep 6s ease-in-out infinite}@keyframes sweep{0%,100%{transform:translateX(-380px)}50%{transform:translateX(380px)}}
.flow{stroke-dasharray:6 10;animation:flow 1.2s linear infinite}@keyframes flow{to{stroke-dashoffset:-16}}
</style>
</defs>
<g clip-path="url(#frame)">
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect width="${W}" height="${H}" fill="url(#dots)" opacity=".8"/>
<g opacity="${t.aur}"><ellipse cx="${W * glowX}" cy="${H / 2}" rx="420" ry="260" fill="url(#rv)"/><ellipse cx="${W * glowX + 120}" cy="${H * 0.75}" rx="300" ry="180" fill="url(#rc)" opacity=".7"/></g>
<rect class="sweep" x="${W / 2 - 220}" y="0" width="440" height="1.6" fill="url(#top)"/>
${body}
</g>
${frameEdge(t, W, H)}
</svg>
`;
}

// ---------------- m-ui:主机每 5 秒把配置推给副机 ----------------
function panelMui(mode) {
  const t = T[mode], W = 1200, H = 440;
  const mx = 772, my = 222, R = 62;
  const hex = Array.from({ length: 6 }, (_, k) => { const a = (Math.PI / 180) * (-90 + 60 * k); return `${(mx + R * Math.cos(a)).toFixed(1)},${(my + R * Math.sin(a)).toFixed(1)}`; }).join(' ');
  const nodes = [102, 222, 342];
  const NX = 1012, NW = 136, NH = 60;
  let body = '';
  // 连线 + 往返光点
  nodes.forEach((ny, i) => {
    const d = `M ${mx + 64} ${my} C ${mx + 150} ${my}, ${NX - 90} ${ny}, ${NX} ${ny}`;
    body += `<path d="${d}" fill="none" stroke="${t.dim}" stroke-width="2"/>`;
    body += `<path d="${d}" fill="none" stroke="url(#g)" stroke-width="2" opacity=".55" class="flow"/>`;
    body += packet(d, { r: 5, color: C.c, dur: 5, begin: i * 0.12, travel: 0.26 });
    body += packet(d, { r: 3.6, color: C.v, dur: 5, begin: 2.5 + i * 0.2, travel: 0.3, reverse: true });
  });
  // 副机机架
  nodes.forEach((ny, i) => {
    const y = ny - NH / 2;
    body += `<rect x="${NX}" y="${y}" width="${NW}" height="${NH}" rx="14" fill="${t.glass}" stroke="${t.glassLine}"/>`;
    body += `<rect x="${NX}" y="${y}" width="${NW}" height="${NH}" rx="14" fill="none" stroke="url(#g)" stroke-width="1.4" opacity="0"><animate attributeName="opacity" values="0;0;.9;0;0" keyTimes="0;0.25;0.3;0.45;1" dur="5s" begin="${i * 0.12}s" repeatCount="indefinite"/></rect>`;
    body += `<text x="${NX + 18}" y="${ny - 4}" class="mono" font-size="14" fill="${t.text}">node-0${i + 1}</text>`;
    body += `<g stroke="${t.faint}" stroke-width="2" stroke-linecap="round" opacity=".7"><line x1="${NX + 18}" x2="${NX + 66}" y1="${ny + 13}" y2="${ny + 13}"/><line x1="${NX + 72}" x2="${NX + 92}" y1="${ny + 13}" y2="${ny + 13}"/></g>`;
    body += `<circle cx="${NX + NW - 20}" cy="${ny}" r="9" fill="${C.ok}" opacity=".25" filter="url(#soft)"/><circle cx="${NX + NW - 20}" cy="${ny}" r="4.5" fill="${C.ok}"><animate attributeName="r" values="4.5;4.5;7;4.5;4.5" keyTimes="0;0.25;0.29;0.36;1" dur="5s" begin="${i * 0.12}s" repeatCount="indefinite"/></circle>`;
  });
  // 主机:六边形 + 5 秒同步环
  body += `<circle cx="${mx}" cy="${my}" r="110" fill="url(#rv)" opacity=".55"><animate attributeName="opacity" values=".3;.6;.3" dur="5s" repeatCount="indefinite"/></circle>
<circle cx="${mx}" cy="${my}" r="86" fill="none" stroke="${t.dim}" stroke-width="3"/>
<circle cx="${mx}" cy="${my}" r="86" fill="none" stroke="url(#g)" stroke-width="3.5" stroke-linecap="round" pathLength="100" stroke-dasharray="100 100" transform="rotate(-90 ${mx} ${my})"><animate attributeName="stroke-dashoffset" values="100;0" dur="5s" repeatCount="indefinite"/></circle>
<circle r="5" fill="#fff"><animateMotion dur="5s" repeatCount="indefinite" path="M ${mx} ${my - 86} a 86 86 0 1 1 0 172 a 86 86 0 1 1 0 -172"/></circle>
<polygon points="${hex}" fill="${t.tubeIn}" stroke="url(#g)" stroke-width="3"/>
<polygon points="${hex}" fill="url(#g)" opacity=".08"/>
<g transform="translate(${mx - 209 * 0.2} ${my - 169 * 0.2 - 6}) scale(0.2)" fill="none" stroke="url(#gm)" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"><path d="${MARK.a}"/><path d="${MARK.b}"/><path d="${MARK.tri}" fill="url(#gm)" stroke="none"/></g>
<text x="${mx}" y="${my + 40}" text-anchor="middle" class="mono" font-size="11" letter-spacing="2.5" fill="${t.muted}">MASTER</text>
<text x="${mx}" y="${my + 122}" text-anchor="middle" class="mono" font-size="14" fill="${t.faint}">sync · every 5 s</text>
<g opacity="0"><animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.62;0.68;0.97;1" dur="5s" repeatCount="indefinite"/>
<rect x="${mx - 70}" y="${my - 136}" width="140" height="34" rx="17" fill="${t.glass}" stroke="${C.ok}" stroke-opacity=".6"/>
<text x="${mx}" y="${my - 113}" text-anchor="middle" class="mono" font-size="15" fill="${t.okText}">dry-run ✓</text></g>`;
  body += panelText(t, 64, {
    eyebrow: '01 — CONTROL PLANE', title: 'm-ui', sub: '自托管面板',
    desc: ['Embedded sing-box control plane for', 'self-hosted, multi-server deployments.'],
    facts: ['Dry-run every apply, roll back on failure', 'One master keeps every node in sync', 'One Go binary, one SQLite file'],
    stack: 'Go · sing-box · SQLite · GPL-3.0',
  });
  return panelShell(mode, W, H, 'm-ui — embedded sing-box control plane for self-hosted, multi-server deployments', 0.68, body);
}

// ---------------- 佛跳墙:四端进隧道,隧道外一律拦下 ----------------
function panelGv(mode) {
  const t = T[mode], W = 1200, H = 440;
  const sx = 372, sy = 222; // 盾牌中心 / 隧道入口
  const devs = [
    { y: 92, label: 'WINDOWS', icon: (x, y) => `<rect x="${x - 17}" y="${y - 14}" width="34" height="23" rx="3"/><path d="M${x - 7} ${y + 15}h14M${x} ${y + 9}v6"/>` },
    { y: 168, label: 'MACOS', icon: (x, y) => `<rect x="${x - 14}" y="${y - 13}" width="28" height="19" rx="3"/><path d="M${x - 19} ${y + 10}h38l-3 4h-32z"/>` },
    { y: 244, label: 'LINUX', icon: (x, y) => `<rect x="${x - 17}" y="${y - 14}" width="34" height="27" rx="4"/><path d="M${x - 10} ${y - 4}l5 4-5 4M${x - 1} ${y + 6}h9"/>` },
    { y: 320, label: 'ANDROID', icon: (x, y) => `<rect x="${x - 10}" y="${y - 17}" width="20" height="34" rx="5"/><path d="M${x - 3} ${y + 12}h6"/>` },
  ];
  const DX = 96;
  let body = '';
  // 四端 → 盾牌
  devs.forEach((d, i) => {
    const path = `M ${DX + 122} ${d.y} C ${DX + 200} ${d.y}, ${sx - 110} ${sy}, ${sx - 40} ${sy}`;
    body += `<path d="${path}" fill="none" stroke="${t.dim}" stroke-width="2"/><path d="${path}" fill="none" stroke="url(#g)" stroke-width="2" opacity=".5" class="flow"/>`;
    body += packet(path, { r: 4.2, color: i % 2 ? C.v : C.b, dur: 3.2, begin: i * 0.55, travel: 0.42 });
    body += `<rect x="${DX - 32}" y="${d.y - 28}" width="64" height="56" rx="16" fill="${t.glass}" stroke="${t.glassLine}"/>`;
    body += `<g fill="none" stroke="url(#g)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d.icon(DX, d.y)}</g>`;
    body += `<text x="${DX + 44}" y="${d.y + 5}" class="mono" font-size="12" letter-spacing="1.5" fill="${t.faint}">${d.label}</text>`;
  });
  // 想绕开隧道的流量:撞上闸,打叉
  const leak = (x1, y1, x2, y2, label, begin) => `
<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${C.bad}" stroke-width="2" stroke-dasharray="4 5" fill="none" opacity="0"><animate attributeName="opacity" values="0;.9;.9;0;0" keyTimes="0;0.1;0.32;0.4;1" dur="4s" begin="${begin}s" repeatCount="indefinite"/></path>
<circle r="3.5" fill="${C.bad}" opacity="0"><animateMotion dur="4s" begin="${begin}s" repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;0.3;1" path="M${x1} ${y1} L${x2} ${y2}"/><animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.05;0.3;0.32;1" dur="4s" begin="${begin}s" repeatCount="indefinite"/></circle>
<g opacity="0"><animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.29;0.31;0.62;0.72;1" dur="4s" begin="${begin}s" repeatCount="indefinite"/>
<circle cx="${x2}" cy="${y2}" r="13" fill="${C.bad}" opacity=".18"/><path d="M${x2 - 6} ${y2 - 6}l12 12M${x2 + 6} ${y2 - 6}l-12 12" stroke="${C.bad}" stroke-width="2.6" stroke-linecap="round"/>
<text x="${x2 + 20}" y="${y2 + 5}" class="mono" font-size="13" fill="${t.badText}">${label}</text></g>`;
  body += leak(DX + 60, 70, 262, 34, 'DNS leak · blocked', 0.4);
  body += leak(DX + 60, 344, 262, 404, 'IPv6 · blocked', 2.4);
  // 隧道:收窄的管子 + 往右推进的环
  const TX0 = sx + 30, TX1 = 600;
  body += `<path d="M${TX0} ${sy - 46} L${TX1} ${sy - 26} M${TX0} ${sy + 46} L${TX1} ${sy + 26}" stroke="url(#g)" stroke-width="1.6" opacity=".6"/>`;
  for (let i = 0; i < 6; i++) {
    const dur = 3, b = (-i * dur / 6).toFixed(2);
    body += `<ellipse cx="${TX0}" cy="${sy}" rx="12" ry="46" fill="none" stroke="url(#g)" stroke-width="2">
<animate attributeName="cx" values="${TX0};${TX1}" dur="${dur}s" begin="${b}s" repeatCount="indefinite"/>
<animate attributeName="ry" values="46;26" dur="${dur}s" begin="${b}s" repeatCount="indefinite"/>
<animate attributeName="rx" values="12;6" dur="${dur}s" begin="${b}s" repeatCount="indefinite"/>
<animate attributeName="opacity" values="0;.9;.15" dur="${dur}s" begin="${b}s" repeatCount="indefinite"/></ellipse>`;
  }
  body += packet(`M ${TX0} ${sy} L ${TX1 + 40} ${sy}`, { r: 5, color: C.c, dur: 1.6, travel: 0.9 });
  body += packet(`M ${TX0} ${sy} L ${TX1 + 40} ${sy}`, { r: 4, color: C.v, dur: 1.6, begin: 0.8, travel: 0.9 });
  body += `<text x="${TX1 - 12}" y="${sy - 40}" text-anchor="end" class="mono" font-size="12" letter-spacing="1.5" fill="${t.faint}">TUNNEL → NODE</text>`;
  // 盾牌
  const shield = `M${sx} ${sy - 52} L${sx + 42} ${sy - 36} V${sy + 2} C${sx + 42} ${sy + 30} ${sx + 22} ${sy + 46} ${sx} ${sy + 56} C${sx - 22} ${sy + 46} ${sx - 42} ${sy + 30} ${sx - 42} ${sy + 2} V${sy - 36} Z`;
  body += `<circle cx="${sx}" cy="${sy}" r="60" fill="none" stroke="url(#g)" stroke-width="2"><animate attributeName="r" values="56;96" dur="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values=".7;0" dur="2.6s" repeatCount="indefinite"/></circle>
<path d="${shield}" fill="url(#g)" opacity=".45" filter="url(#glow)"/>
<path d="${shield}" fill="${t.tubeIn}" stroke="url(#g)" stroke-width="3.5" stroke-linejoin="round"/>
<path d="${shield}" fill="url(#g)" opacity=".1"/>
<rect x="${sx - 13}" y="${sy - 2}" width="26" height="22" rx="5" fill="url(#g)"/>
<path d="M${sx - 8} ${sy - 2} v-8 a8 8 0 0 1 16 0 v8" fill="none" stroke="url(#g)" stroke-width="3.2"/>
<circle cx="${sx}" cy="${sy + 9}" r="2.6" fill="${t.tubeIn}"/>
<text x="${sx}" y="${sy + 86}" text-anchor="middle" class="mono" font-size="12" letter-spacing="1.5" fill="${t.okText}">KILL-SWITCH ARMED</text>`;
  body += panelText(t, 664, {
    eyebrow: '02 — CLIENT', title: '佛跳墙', sub: 'godusevpn',
    desc: ['The m-ui client — one daemon, one UI,', 'on Windows, macOS, Linux and Android.'],
    facts: ['Strict global: no leaks, even after a crash', 'Persistent kill-switch: WFP · pf · nftables', 'TUN · DoH + fake-ip · IPv6 off by default'],
    stack: 'Go · Wails · gomobile · GPL-3.0',
  });
  return panelShell(mode, W, H, '佛跳墙 godusevpn — the m-ui client for Windows, macOS, Linux and Android', 0.28, body);
}

// ---------------- 工程原则 2×2 ----------------
function principles(mode) {
  const t = T[mode], W = 1200, H = 392;
  const tiles = [
    { title: 'Dry-run, then apply', lines: ['Every change is dry-run by sing-box first.', 'Failures never go live; breakage rolls back.'], icon: 'roll' },
    { title: 'Fail closed', lines: ['Strict global lets nothing out but the', 'tunnel — not DNS, not after a crash.'], icon: 'shield' },
    { title: 'One binary, one file', lines: ['One Go binary with sing-box embedded,', 'one SQLite file to back up and move.'], icon: 'cube' },
    { title: 'Proven on real machines', lines: ['Every change is re-audited and run on real', 'servers and devices before it ships.'], icon: 'check' },
  ];
  const TW = 570, TH = 150, G = 20, X0 = 20, Y0 = 52;
  let clips = '';
  let body = `<text x="${X0 + 4}" y="30" class="mono" font-size="15" letter-spacing="3" fill="url(#g)">03 — HOW I BUILD</text>`;
  tiles.forEach((tl, i) => {
    const x = X0 + (i % 2) * (TW + G), y = Y0 + Math.floor(i / 2) * (TH + G), ix = x + 60, iy = y + TH / 2;
    body += `<rect x="${x}" y="${y}" width="${TW}" height="${TH}" rx="20" fill="${t.glass}" stroke="${t.glassLine}"/>`;
    body += `<text x="${x + TW - 26}" y="${y + TH - 22}" text-anchor="end" class="sans" font-size="104" font-weight="800" fill="none" stroke="url(#g)" stroke-width="1.4" opacity=".22">0${i + 1}</text>`;
    body += `<g clip-path="url(#tc${i})"><rect class="sw" style="animation-delay:${-i * 1.3}s" x="${x + TW / 2 - 160}" y="${y}" width="320" height="1.6" fill="url(#top)"/></g>`;
    clips += `<clipPath id="tc${i}"><rect x="${x}" y="${y}" width="${TW}" height="${TH}" rx="20"/></clipPath>`;
    body += `<circle cx="${ix}" cy="${iy}" r="46" fill="url(#rv)" opacity=".5"/><rect x="${ix - 32}" y="${iy - 32}" width="64" height="64" rx="18" fill="${t.tubeIn}" stroke="url(#g)" stroke-width="1.8"/>`;
    const ic = {
      roll: `<g transform="translate(${ix} ${iy})"><g><path d="M-14 -6 A15 15 0 1 1 -11 10" fill="none" stroke="url(#g)" stroke-width="3" stroke-linecap="round"/><path d="M-19 -13 L-14 -5 L-6 -9" fill="none" stroke="url(#g)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><animateTransform attributeName="transform" type="rotate" values="0;-360" dur="6s" repeatCount="indefinite"/></g></g>`,
      shield: `<path d="M${ix} ${iy - 18} L${ix + 15} ${iy - 12} V${iy} C${ix + 15} ${iy + 10} ${ix + 8} ${iy + 16} ${ix} ${iy + 20} C${ix - 8} ${iy + 16} ${ix - 15} ${iy + 10} ${ix - 15} ${iy} V${iy - 12} Z" fill="none" stroke="url(#g)" stroke-width="3" stroke-linejoin="round"/><path d="M${ix - 6} ${iy + 1} l4.5 4.5 8-9" fill="none" stroke="url(#g)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${ix}" cy="${iy}" r="22" fill="none" stroke="url(#g)" stroke-width="1.5"><animate attributeName="r" values="20;34" dur="2.4s" repeatCount="indefinite"/><animate attributeName="opacity" values=".8;0" dur="2.4s" repeatCount="indefinite"/></circle>`,
      cube: `<g><path d="M${ix} ${iy - 18} L${ix + 16} ${iy - 9} L${ix} ${iy} L${ix - 16} ${iy - 9} Z" fill="url(#g)" opacity=".85"/><path d="M${ix} ${iy - 18} L${ix + 16} ${iy - 9} V${iy + 10} L${ix} ${iy + 19} L${ix - 16} ${iy + 10} V${iy - 9} Z M${ix} ${iy} V${iy + 19}" fill="none" stroke="url(#g)" stroke-width="2.6" stroke-linejoin="round"/><animateTransform attributeName="transform" type="translate" values="0 2;0 -3;0 2" dur="3.2s" repeatCount="indefinite"/></g>`,
      check: `<circle cx="${ix}" cy="${iy}" r="17" fill="none" stroke="url(#g)" stroke-width="3" pathLength="100" stroke-dasharray="100 100" transform="rotate(-90 ${ix} ${iy})"><animate attributeName="stroke-dashoffset" values="100;0;0;100" keyTimes="0;0.35;0.85;1" dur="4s" repeatCount="indefinite"/></circle><path d="M${ix - 7} ${iy} l5 5 9-10" fill="none" stroke="url(#g)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" pathLength="100" stroke-dasharray="100 100"><animate attributeName="stroke-dashoffset" values="100;100;0;0;100" keyTimes="0;0.3;0.5;0.85;1" dur="4s" repeatCount="indefinite"/></path>`,
    }[tl.icon];
    body += ic;
    body += `<text x="${x + 124}" y="${y + 58}" class="sans" font-size="25" font-weight="750" letter-spacing="-0.4" fill="${t.text}">${esc(tl.title)}</text>`;
    body += `<text x="${x + 124}" y="${y + 92}" class="sans" font-size="17.5" fill="${t.muted}">${esc(tl.lines[0])}</text>`;
    body += `<text x="${x + 124}" y="${y + 118}" class="sans" font-size="17.5" fill="${t.muted}">${esc(tl.lines[1])}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="How I build: dry-run then apply; fail closed; one binary, one file; proven on real machines">
<defs>${grad('g', 0, 0, W, H)}${radial('rv', C.v, 1)}${clips}
<linearGradient id="top" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.v}" stop-opacity="0"/><stop offset=".5" stop-color="${C.c}"/><stop offset="1" stop-color="${C.c}" stop-opacity="0"/></linearGradient>
<style>${baseStyle}.sw{animation:sw 5.2s ease-in-out infinite}@keyframes sw{0%,100%{transform:translateX(-200px)}50%{transform:translateX(200px)}}</style></defs>
${body}
</svg>
`;
}

// ---------------- 工具链跑马灯 ----------------
function stack(mode) {
  const t = T[mode], W = 1200, H = 104;
  const items = ['Go', 'sing-box', 'SQLite', 'Wails', 'WebView2', 'WebKit', 'gomobile', 'VpnService', 'TUN', 'DoH · fake-ip', 'WFP', 'pf', 'nftables', 'GitHub Actions', 'Ed25519'];
  const c = chips(items, 0, 44, t, { size: 16, h: 40, gap: 12, pad: 18 });
  const span = c.end + 12;
  const dur = (span / 45).toFixed(1);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Toolchain: ${items.join(', ')}">
<defs>${grad('g', 0, 0, W, H)}
<linearGradient id="edge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".07" stop-color="#fff"/><stop offset=".93" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="m"><rect width="${W}" height="${H}" fill="url(#edge)"/></mask>
<style>${baseStyle}.mq{animation:mq ${dur}s linear infinite}@keyframes mq{to{transform:translateX(-${span}px)}}</style></defs>
<text x="24" y="26" class="mono" font-size="15" letter-spacing="3" fill="url(#g)">04 — TOOLCHAIN</text>
<g mask="url(#m)"><g class="mq">${c.svg}<g transform="translate(${span} 0)">${c.svg}</g><g transform="translate(${span * 2} 0)">${c.svg}</g></g></g>
</svg>
`;
}

mkdirSync('assets', { recursive: true });
for (const mode of ['dark', 'light']) {
  writeFileSync(`assets/hero-${mode}.svg`, hero(mode));
  writeFileSync(`assets/m-ui-${mode}.svg`, panelMui(mode));
  writeFileSync(`assets/godusevpn-${mode}.svg`, panelGv(mode));
  writeFileSync(`assets/principles-${mode}.svg`, principles(mode));
  writeFileSync(`assets/stack-${mode}.svg`, stack(mode));
}
console.log('ok');
