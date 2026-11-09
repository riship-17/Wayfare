/* Wayfare exhibition video: deterministic motion graphics. render(t) is a pure function of time. */
(() => {
  const W = 1920, H = 1080, FPS = 30, T = 0.6; // transition length (seconds)
  const CUT = new URLSearchParams(location.search).get('cut') || 'full';
  const stage = document.getElementById('stage');
  const chromeEl = document.getElementById('chrome');
  const defs = document.getElementById('filters');
  const SHOT = (n) => `../shots/${n}.png`;

  // ---------------------------------------------------------------- maths and easing
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, p) => a + (b - a) * p;
  const P = (t, a, b) => clamp((t - a) / (b - a));
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t, sy = (t) => ((ay * t + by) * t + cy) * t, dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => { let t = x; for (let i = 0; i < 8; i++) { const e = sx(t) - x; if (Math.abs(e) < 1e-5) break; t -= e / (dx(t) || 1e-6); } return sy(clamp(t)); };
  }
  const E = {
    way: bezier(0.22, 1, 0.36, 1), // brand curve
    out: (t) => 1 - Math.pow(1 - t, 4),
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    ramp: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2), // speed ramp: slow, very fast, slow
    back: (t) => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    inOut: bezier(0.65, 0, 0.35, 1),
  };
  const k = (t, a, d, ease = E.way) => ease(P(t, a, a + d));

  // ---------------------------------------------------------------- DOM helpers
  const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
  const css = (e, s) => Object.assign(e.style, s);
  const icon = (name, size, color = 'currentColor', parent) => { const e = el('div', 'icon', parent, window.ICONS[name] || ''); css(e, { width: size + 'px', height: size + 'px', color }); return e; };
  let filterId = 0;
  const motionBlur = () => {
    const id = 'mb' + filterId++;
    const f = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    f.setAttribute('id', id); f.setAttribute('x', '-20%'); f.setAttribute('y', '-5%'); f.setAttribute('width', '140%'); f.setAttribute('height', '110%');
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur'); g.setAttribute('stdDeviation', '0 0');
    f.appendChild(g); defs.appendChild(f);
    return { id, set: (x, y = 0) => g.setAttribute('stdDeviation', `${x.toFixed(2)} ${y.toFixed(2)}`) };
  };
  const gridBg = (parent, color = '#e9ecf5') => {
    const g = el('div', 'grid', parent);
    g.innerHTML = `<svg width="2000" height="1160"><defs><pattern id="gp${filterId}" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M80 0H0V80" fill="none" stroke="${color}" stroke-width="1.5"/></pattern></defs><rect width="2000" height="1160" fill="url(#gp${filterId++})"/></svg>`;
    return g;
  };

  /** Kinetic type: words rise, fade and sharpen one by one. `*word*` marks the accent colour. */
  function words(parent, text, cls, style = {}) {
    const box = el('div', cls, parent); css(box, style);
    const spans = [];
    text.split(/(\s+|\n)/).forEach((tok) => {
      if (tok === '\n') return el('br', null, box);
      if (/^\s+$/.test(tok)) return box.appendChild(document.createTextNode(' '));
      const accent = /^\*.*\*[.,]?$/.test(tok);
      const s = el('span', 'w' + (accent ? ' accent' : ''), box, tok.replace(/\*/g, ''));
      spans.push(s);
    });
    const update = (t, t0, stagger = 0.06, d = 0.7, rise = 46) => spans.forEach((s, i) => {
      const p = k(t, t0 + i * stagger, d);
      s.style.opacity = p; s.style.transform = `translateY(${(1 - p) * rise}px)`; s.style.filter = p < 1 ? `blur(${(1 - p) * 12}px)` : 'none';
    });
    return { box, spans, update };
  }

  function fadeUp(e, t, t0, d = 0.7, rise = 36) {
    const p = k(t, t0, d); e.style.opacity = p; e.style.transform = `translateY(${(1 - p) * rise}px)`;
    e.style.filter = p < 1 ? `blur(${(1 - p) * 8}px)` : 'none'; return p;
  }

  /** Brand pill emphasis: the blue pill wipes in from the left, then the text sits on it. */
  function pill(parent, text, cls) {
    const wrap = el('span', 'pillwrap ' + (cls || ''), parent);
    const bg = el('span', 'pillbg', wrap); const tx = el('span', 'pilltx', wrap, text);
    return { wrap, update: (t, t0) => { const p = k(t, t0, 0.7, E.outExpo); bg.style.transform = `scaleX(${p})`; tx.style.opacity = k(t, t0 + 0.15, 0.5); } };
  }

  function counter(e, t, t0, d, to, fmt) { const p = k(t, t0, d, E.outExpo); e.textContent = fmt(to * p); }
  const fmtGB = (n) => Math.round(n).toLocaleString('en-GB');

  // ---------------------------------------------------------------- phone with tracked callouts
  const SCALE = 400 / 390; // screenshot CSS px to screen px
  function phone(parent, shot, x, y) {
    const wrap = el('div', 'abs', parent); css(wrap, { left: x + 'px', top: y + 'px', width: '420px', height: '886px', transformOrigin: '210px 443px' });
    const body = el('div', 'phone', wrap);
    const screen = el('div', 'screen', body);
    el('div', 'notch', screen);
    const imgs = {};
    const add = (name) => { const i = el('img', null, screen); i.src = SHOT(name); i.style.opacity = 0; imgs[name] = i; return i; };
    add(shot).style.opacity = 1;
    const layer = el('div', 'abs', wrap); css(layer, { left: '10px', top: '10px', width: '400px', height: '866px' });
    const api = {
      wrap, body, screen, layer, imgs, add,
      /** Crossfade to another screenshot between t0 and t0+d, with a slight push for a native feel. */
      swap(t, from, to, t0, d = 0.45) { const p = k(t, t0, d); if (!imgs[to]) add(to); imgs[to].style.opacity = p; imgs[to].style.transform = `translateX(${(1 - p) * 24}px)`; if (imgs[from] && t >= t0) imgs[from].style.opacity = 1 - p; },
      /** Ring tracked to a recorded DOM box, with a label that slides out to one side. */
      callout(box, label, side = 'left', pad = 10, dy = 0) {
        const r = { x: box.x * SCALE - pad, y: box.y * SCALE - pad, w: box.width * SCALE + pad * 2, h: box.height * SCALE + pad * 2 };
        const ring = el('div', 'callout', layer); css(ring, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
        const line = el('div', 'cline', layer); const lab = el('div', 'clabel', layer, label);
        const cy = r.y + r.h / 2;
        const ly = cy + dy;
        const LINE = 56;
        if (side === 'left') { css(line, { left: (-LINE) + 'px', top: cy + 'px', width: (r.x + LINE) + 'px' }); css(lab, { right: (400 + LINE) + 'px', top: (ly - 28) + 'px' }); }
        else { css(line, { left: (r.x + r.w) + 'px', top: cy + 'px', width: (400 - r.x - r.w + LINE) + 'px' }); css(lab, { left: (400 + LINE) + 'px', top: (ly - 28) + 'px' }); }
        if (side === 'right') line.style.transformOrigin = 'left center'; else line.style.transformOrigin = 'right center';
        return (t, t0) => {
          const p = k(t, t0, 0.5, E.back); ring.style.opacity = clamp(p * 1.5); ring.style.transform = `scale(${lerp(1.25, 1, clamp(p))})`;
          const pulse = t > t0 + 0.6 ? 0.5 + 0.5 * Math.sin((t - t0) * 4) : 0; ring.style.boxShadow = `0 0 0 ${6 + pulse * 6}px rgba(84,140,255,${0.18 - pulse * 0.08}), 0 0 ${40 + pulse * 20}px rgba(84,140,255,.45)`;
          const lp = k(t, t0 + 0.2, 0.6, E.outExpo); line.style.transform = `scaleX(${lp})`;
          const tp = k(t, t0 + 0.45, 0.6); lab.style.opacity = tp; lab.style.transform = `translateX(${(1 - tp) * (side === 'left' ? -30 : 30)}px)`;
        };
      },
      /** Punch-in: dynamic zoom on a recorded box. Speed ramped in, held, eased back out. */
      punch(t, box, t0, t1, scale = 1.35) {
        const cx = 10 + (box.x + box.width / 2) * SCALE, cy = 10 + (box.y + box.height / 2) * SCALE;
        const pin = k(t, t0, 0.9, E.inOut), pout = k(t, t1, 0.9, E.inOut);
        const s = lerp(1, scale, pin * (1 - pout));
        wrap.style.transformOrigin = `${cx}px ${cy}px`;
        return s;
      },
    };
    return api;
  }

  function laptop(parent, shot, x, y, w) {
    const h = Math.round(w * 900 / 1440);
    const L = el('div', 'laptop', parent); css(L, { left: x + 'px', top: y + 'px', width: (w + 36) + 'px' });
    const sc = el('div', 'lscreen', L); const view = el('div', 'view', sc); css(view, { width: w + 'px', height: h + 'px' });
    el('div', 'lbase', L);
    const imgs = {};
    const add = (n) => { const i = el('img', null, view); i.src = SHOT(n); i.style.opacity = 0; imgs[n] = i; return i; };
    add(shot).style.opacity = 1;
    return { L, view, imgs, add, swap(t, to, t0, d = 0.5) { if (!imgs[to]) add(to); const p = k(t, t0, d); imgs[to].style.opacity = p; } };
  }

  const STAGE_COLOR = { prepare: 'var(--sun)', arrive: 'var(--lilac)', settle: 'var(--blush)', verified: 'var(--sage)', uni: 'var(--ink)', blue: 'var(--blue)' };
  const STAGE_NUM = { prepare: '1 Prepare', arrive: '2 Arrive', settle: '3 Settle' };

  /** Floating blob behind the phone: flat stage colour circle, slow drift, depth of field blur. */
  function blob(parent, color, x, y, r) { const b = el('div', 'abs', parent); css(b, { left: x - r + 'px', top: y - r + 'px', width: r * 2 + 'px', height: r * 2 + 'px', borderRadius: '50%', background: color, filter: 'blur(2px)' }); return b; }

  // ---------------------------------------------------------------- scene library
  const LIB = {};

  LIB.open = (root) => {
    root.classList.add('ink');
    const a = words(root, 'Every year, thousands of international students land in Dubai.', 'h2', { position: 'absolute', left: '180px', top: '400px', width: '1500px', color: '#fff' });
    const b = words(root, 'Admission is connected.', 'h1', { position: 'absolute', left: '180px', top: '360px', color: '#fff', fontSize: '110px' });
    const c = el('div', 'abs h1', root); css(c, { left: '180px', top: '500px', fontSize: '110px', color: 'var(--ink)' });
    const pl = pill(c, 'Arrival isn’t.');
    const plane = icon('AirplaneLanding', 120, 'var(--blue)', root); css(plane, { position: 'absolute', left: '180px', top: '230px' });
    return (t) => {
      a.update(t, 0.2, 0.05);
      const outA = k(t, 3.2, 0.5); a.box.style.opacity = 1 - outA; a.box.style.transform = `translateY(${-outA * 40}px)`;
      const pp = k(t, 0.1, 1.2, E.outExpo); plane.style.opacity = pp * (1 - outA); plane.style.transform = `translate(${(1 - pp) * -300}px, ${(1 - pp) * -120}px) rotate(${(1 - pp) * -12}deg)`;
      b.update(t, 3.6, 0.08); b.box.style.opacity = t < 3.5 ? 0 : 1;
      pl.update(t, 4.6); c.style.opacity = t < 4.5 ? 0 : 1;
    };
  };

  LIB.problem = (root) => {
    gridBg(root);
    const over = el('div', 'abs over', root, 'The student challenge'); css(over, { left: '180px', top: '170px', color: 'var(--muted)' });
    const h = words(root, 'Five problems hit in the *first* *month.*', 'h2', { position: 'absolute', left: '180px', top: '220px', width: '1500px' });
    const items = [['Buildings', 'Housing uncertainty', 'Finding verified accommodation from abroad'], ['FileText', 'Documentation', 'Visa, Emirates ID and formalities'], ['CurrencyCircleDollar', 'Financial pressure', 'Budgeting with unfamiliar local costs'], ['Info', 'Fragmented information', 'Many platforms, no single guide'], ['UsersThree', 'Adjustment', 'Academics, culture and community']];
    const cards = items.map(([ic, title, body], i) => {
      const c = el('div', 'card abs', root); css(c, { left: 180 + i * 318 + 'px', top: '440px', width: '290px', height: '360px', padding: '30px' });
      icon(ic, 64, 'var(--ink)', c);
      el('div', null, c, `<div style="font-weight:700;font-size:30px;line-height:1.15;margin-top:28px">${title}</div><div style="font-size:22px;line-height:1.4;color:var(--muted);margin-top:14px">${body}</div>`);
      return c;
    });
    return (t) => {
      fadeUp(over, t, 0.1); h.update(t, 0.2);
      cards.forEach((c, i) => { const p = k(t, 1.0 + i * 0.12, 0.8, E.back); c.style.opacity = clamp(p * 2); c.style.transform = `translateY(${(1 - p) * 140}px) rotate(${(1 - clamp(p)) * (i % 2 ? 4 : -4)}deg)`; });
    };
  };

  LIB.gap = (root) => {
    root.classList.add('ink');
    const over = el('div', 'abs over', root, 'The Emirates ID gap'); css(over, { left: '180px', top: '170px', color: 'var(--blue)' });
    const h = words(root, 'The card comes 1 to 3 weeks after you land.', 'h2', { position: 'absolute', left: '180px', top: '220px', width: '1400px', color: '#fff' });
    const bar = el('div', 'abs', root); css(bar, { left: '180px', top: '560px', width: '1560px', height: '8px', background: '#2b2b31', borderRadius: '8px' });
    const fill = el('div', 'abs', root); css(fill, { left: '180px', top: '560px', width: '1560px', height: '8px', background: 'var(--blue)', borderRadius: '8px', transformOrigin: 'left' });
    const start = el('div', 'abs chip', root, 'Land in Dubai'); css(start, { left: '150px', top: '600px', background: '#fff', color: 'var(--ink)' });
    const end = el('div', 'abs chip', root, 'Emirates ID'); css(end, { left: '1560px', top: '600px', background: 'var(--sage)', color: 'var(--ink)' });
    const locks = ['Resident SIM plan', 'Bank account', 'Ejari tenancy', 'Student nol card'].map((txt, i) => {
      const d = el('div', 'abs', root); css(d, { left: 420 + i * 300 + 'px', top: '420px', display: 'flex', alignItems: 'center', gap: '12px', color: '#fff', fontWeight: 600, fontSize: '26px' });
      icon('LockBold', 34, 'var(--blue)', d); el('span', null, d, txt); return d;
    });
    const foot = el('div', 'abs body', root, 'Meanwhile, students turn to unverified brokers. Families overpay.'); css(foot, { left: '180px', top: '760px', color: '#fff', fontSize: '34px' });
    return (t) => {
      fadeUp(over, t, 0.1); h.update(t, 0.2, 0.05);
      fill.style.transform = `scaleX(${k(t, 1.2, 2.2, E.inOut)})`;
      fadeUp(start, t, 1.0); fadeUp(end, t, 3.0);
      locks.forEach((l, i) => { const p = k(t, 1.6 + i * 0.35, 0.5, E.back); l.style.opacity = clamp(p * 2); l.style.transform = `translateY(${(1 - p) * 30}px) scale(${lerp(0.8, 1, clamp(p))})`; });
      fadeUp(foot, t, 4.0);
    };
  };

  LIB.stats = (root) => {
    gridBg(root);
    const over = el('div', 'abs over', root, 'The opportunity'); css(over, { left: '180px', top: '170px', color: 'var(--muted)' });
    const h = words(root, 'Dubai is becoming a *global* *education* *hub.*', 'h2', { position: 'absolute', left: '180px', top: '220px', width: '1500px' });
    const defs = [[42026, (n) => fmtGB(n), 'students at 41 private higher education institutions, 2024–25', 'var(--lilac)'], [35, (n) => Math.round(n) + '%', 'are international students', 'var(--blush)'], [20, (n) => Math.round(n) + '%', 'enrolment growth in one year', 'var(--sun)'], [50, (n) => Math.round(n) + '%', 'target share of international students by 2033', 'var(--sage)']];
    const cells = defs.map(([n, f, label, bg], i) => {
      const c = el('div', 'abs', root); css(c, { left: 180 + i * 398 + 'px', top: '430px', width: '370px', height: '380px', background: bg, borderRadius: '32px', padding: '36px' });
      const num = el('div', null, c); css(num, { fontWeight: 700, fontSize: '84px', lineHeight: '1', fontVariantNumeric: 'tabular-nums' });
      el('div', null, c, label).style.cssText = 'font-size:26px;line-height:1.35;margin-top:28px';
      return { c, num, n, f };
    });
    const src = el('div', 'abs', root, 'Sources: KHDA, Dubai’s private higher education sector 2024–25 · Dubai Media Office, May 2025'); css(src, { left: '180px', top: '860px', fontSize: '20px', color: 'var(--muted)' });
    return (t) => {
      fadeUp(over, t, 0.1); h.update(t, 0.2);
      cells.forEach((x, i) => { const p = k(t, 0.9 + i * 0.15, 0.8, E.back); x.c.style.opacity = clamp(p * 2); x.c.style.transform = `translateY(${(1 - p) * 120}px)`; counter(x.num, t, 1.0 + i * 0.15, 1.8, x.n, x.f); });
      fadeUp(src, t, 2.4);
    };
  };

  LIB.insight = (root) => {
    root.style.background = 'var(--sage)'; root.dataset.bg = 'sage';
    const ic = icon('Lightbulb', 90, 'var(--ink)', root); css(ic, { position: 'absolute', left: '180px', top: '230px' });
    const over = el('div', 'abs over', root, 'The research insight'); css(over, { left: '300px', top: '262px' });
    const q = words(root, 'The problem is not the absence of services. It is the absence of *coordination.*', 'h1', { position: 'absolute', left: '180px', top: '380px', width: '1500px', fontSize: '88px' });
    return (t) => { fadeUp(ic, t, 0.1); fadeUp(over, t, 0.2); q.update(t, 0.4, 0.09, 0.8); };
  };

  LIB.brand = (root) => {
    gridBg(root);
    const pin = el('div', 'abs', root, `<svg viewBox="0 0 24 32" width="120" height="160"><path fill="#050505" fill-rule="evenodd" d="M12 0C5.373 0 0 5.373 0 12c0 7.2 8.4 15.6 11.2 19.6a1 1 0 0 0 1.6 0C15.6 27.6 24 19.2 24 12 24 5.373 18.627 0 12 0Zm0 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"/></svg>`);
    css(pin, { left: '420px', top: '250px' });
    const shadow = el('div', 'abs', root); css(shadow, { left: '430px', top: '418px', width: '100px', height: '16px', borderRadius: '50%', background: 'rgba(5,5,5,.12)' });
    const word = el('div', 'abs', root, 'Wayfare'); css(word, { left: '580px', top: '250px', fontWeight: 700, fontSize: '170px', lineHeight: '1', letterSpacing: '-4px' });
    const tag = el('div', 'abs over', root, 'Student journeys. Brighter ahead.'); css(tag, { left: '588px', top: '440px', color: 'var(--muted)', fontSize: '24px' });
    const line = el('div', 'abs h1', root); css(line, { left: '420px', top: '560px', fontSize: '96px' });
    const a = words(line, 'Feel at home', null, { display: 'inline' }); line.appendChild(document.createTextNode(' '));
    const pl = pill(line, 'before you land.');
    const ev = el('img', 'abs', root); ev.src = '../../client/public/illustrations/ev-charging.png'; css(ev, { left: '1460px', top: '260px', width: '360px' });
    const sky = el('img', 'abs', root); sky.src = '../../client/public/illustrations/dubai-skyline-line.png'; css(sky, { left: '0', top: '900px', width: '1920px' });
    return (t) => {
      const dp = k(t, 0.15, 0.9, E.back); pin.style.transform = `translateY(${(1 - dp) * -420}px)`; pin.style.opacity = clamp(dp * 3);
      shadow.style.opacity = dp; shadow.style.transform = `scaleX(${lerp(0.3, 1, clamp(dp))})`;
      const wp = k(t, 0.55, 0.8, E.outExpo); word.style.clipPath = `inset(0 ${(1 - wp) * 100}% 0 0)`; word.style.transform = `translateX(${(1 - wp) * -30}px)`;
      fadeUp(tag, t, 1.0);
      a.update(t, 1.3, 0.08); pl.update(t, 1.9);
      const ep = k(t, 1.6, 1.0, E.outExpo); ev.style.opacity = ep; ev.style.transform = `translateX(${(1 - ep) * 300}px)`;
      sky.style.clipPath = `inset(0 ${(1 - k(t, 0.4, 2.2, E.inOut)) * 100}% 0 0)`;
    };
  };

  LIB.stages = (root) => {
    gridBg(root);
    const over = el('div', 'abs over', root, 'Day Zero, fully charged'); css(over, { left: '180px', top: '150px', color: 'var(--muted)' });
    const h = words(root, 'One platform. Three stages. *One* *journey.*', 'h2', { position: 'absolute', left: '180px', top: '200px', width: '1600px' });
    const data = [['prepare', 'Before departure', ['Verified housing', 'Smart checklists', 'Budget in your currency', 'Offline map']], ['arrive', 'Day Zero to Day 6', ['Airport to campus', 'SIM and nol card', 'Medical and biometrics']], ['settle', 'Week 1 onwards', ['Emirates ID unlocks', 'Banking and Ejari', 'Community']]];
    const cards = data.map(([s, when, list], i) => {
      const c = el('div', 'abs', root); css(c, { left: 180 + i * 530 + 'px', top: '380px', width: '500px', height: '520px', background: STAGE_COLOR[s], borderRadius: '36px', padding: '40px' });
      el('div', 'chip', c, STAGE_NUM[s]).style.background = '#fff';
      el('div', null, c, when).style.cssText = 'font-weight:700;font-size:40px;margin:28px 0 22px';
      list.forEach((x) => { const r = el('div', null, c); r.style.cssText = 'display:flex;align-items:center;gap:14px;font-size:28px;font-weight:600;margin:12px 0'; icon('CheckCircleBold', 32, 'var(--ink)', r); el('span', null, r, x); });
      return c;
    });
    return (t) => {
      fadeUp(over, t, 0.1); h.update(t, 0.2);
      cards.forEach((c, i) => { const p = k(t, 0.8 + i * 0.25, 0.9, E.ramp); c.style.transform = `translateX(${(1 - p) * 1400}px)`; });
    };
  };

  /** Generic feature scene: text column, phone, callouts and a punch-in. */
  function feature(o) {
    return (root) => {
      gridBg(root);
      // Text column on one side, phone in the centre third, callout labels in the free space on the other side.
      const left = o.side !== 'right';
      const tx = left ? 140 : 1100, px = left ? 900 : 600;
      if (o.blob) blob(root, o.blob, px + 210, 540, 340);
      const chip = el('div', 'abs chip', root, o.chip); css(chip, { left: tx + 'px', top: '230px', background: STAGE_COLOR[o.stage] || 'var(--wash)', color: o.stage === 'uni' ? '#fff' : 'var(--ink)' });
      const h = words(root, o.title, 'h2', { position: 'absolute', left: tx + 'px', top: '300px', width: '680px' });
      const body = el('div', 'abs body', root, o.body); css(body, { left: tx + 'px', top: o.bodyTop || '520px', width: '660px' });
      const bullets = (o.bullets || []).map((b, i) => { const r = el('div', 'abs', root); css(r, { left: tx + 'px', top: (o.bulletsTop || 690) + i * 62 + 'px', display: 'flex', alignItems: 'center', gap: '16px', fontSize: '28px', fontWeight: 600 }); icon('CheckCircleBold', 34, 'var(--ink)', r); el('span', null, r, b); return r; });
      const ph = phone(root, o.shot, px, 97);
      const outs = (o.callouts || []).map((c) => ({ t: c.t, f: ph.callout(window.BOXES[c.shot || o.shot][c.box], c.label, c.side || (left ? 'right' : 'left')) }));
      const tag = o.tag ? el('div', 'tag', root, o.tag) : null; if (tag) css(tag, { left: px + 'px', top: '1000px' });
      const extra = o.extra ? o.extra(root, ph) : null;
      return (t, dur) => {
        fadeUp(chip, t, 0.1); h.update(t, 0.2); fadeUp(body, t, 0.9); bullets.forEach((b, i) => fadeUp(b, t, 1.3 + i * 0.15, 0.6, 24));
        const enter = k(t, 0, 1.0, E.outExpo);
        const floatY = Math.sin(t * 1.3) * 8;
        let s = 1;
        if (o.punch) s = ph.punch(t, window.BOXES[o.punch.shot || o.shot][o.punch.box], o.punch.t, Math.min(o.punch.out ?? dur - 1.3, dur - 1.0), o.punch.scale || 1.35);
        ph.wrap.style.transform = `translateY(${(1 - enter) * 160 + floatY}px) rotate(${(1 - enter) * (left ? 6 : -6)}deg) scale(${s})`;
        ph.body.style.boxShadow = `0 40px 120px rgba(5,5,5,.18), 0 0 ${60 + 30 * Math.sin(t * 2)}px rgba(84,140,255,${0.28 * enter})`;
        outs.forEach((c) => c.f(t, c.t));
        (o.swaps || []).forEach((w) => ph.swap(t, w.from, w.to, w.t));
        if (tag) fadeUp(tag, t, 1.0);
        if (extra) extra(t, dur);
      };
    };
  }

  LIB.home = feature({
    stage: 'prepare', chip: STAGE_NUM.prepare, shot: 'home', blob: 'var(--sun)',
    title: 'Day Zero starts *before* *you* *fly.*', body: 'A countdown, a journey battery and one clear next step. Never a crowded screen.',
    bullets: ['12 days to go', 'Battery charges as you go', 'One next step at a time'],
    callouts: [{ t: 1.6, box: 'countdown', label: '12 days to go' }, { t: 2.2, box: 'battery', label: 'Journey battery' }, { t: 2.9, box: 'next', label: 'One next step' }],
    punch: { t: 3.6, box: 'next', scale: 1.28 },
  });

  LIB.checklist = feature({
    side: 'right', stage: 'settle', chip: 'Smart checklists', shot: 'journey-settle', blob: 'var(--blush)',
    title: 'It understands the *Emirates* *ID* *gap.*', body: 'Locked tasks say exactly what they wait for, and what to do meanwhile.',
    bullets: ['Unlocks with your Emirates ID', 'A bridge for every lock', 'Prepare, Arrive, Settle'],
    callouts: [{ t: 1.6, box: 'tabs', label: 'Three stages' }, { t: 2.3, box: 'locked', label: 'Waits for your Emirates ID' }, { t: 3.0, box: 'bridge', label: 'What to do meanwhile' }],
    punch: { t: 3.7, box: 'bridge', scale: 1.4 },
  });

  LIB.verify = (root) => {
    gridBg(root);
    const chip = el('div', 'abs chip', root, 'University integration'); css(chip, { left: '180px', top: '110px', background: 'var(--ink)', color: '#fff' });
    const h = words(root, 'The university verifies. *Students* *see* *it* *live.*', 'h2', { position: 'absolute', left: '180px', top: '170px', width: '1560px' });
    const lap = laptop(root, 'admin-verify-form', 80, 380, 860);
    const lapTag = el('div', 'abs chip', root, 'University portal'); css(lapTag, { left: '140px', top: '1000px', background: 'var(--ink)', color: '#fff', fontSize: '20px' });
    const ph = phone(root, 'housing-pending', 1080, 230);
    const arrow = icon('ArrowRightBold', 90, 'var(--blue)', root); css(arrow, { position: 'absolute', left: '990px', top: '640px' });
    const badge = ph.callout(window.BOXES['housing-verified'].badge, 'Verified badge', 'right', 8);
    const price = ph.callout(window.BOXES['housing-verified'].price, 'AED and rupees', 'right', 8, -22);
    const walk = ph.callout(window.BOXES['housing-verified'].walk, 'About 8 min to the metro', 'right', 8, 26);
    const sample = el('div', 'tag', root, 'Sample values for demonstration'); css(sample, { left: '1110px', top: '1030px' });
    return (t, dur) => {
      fadeUp(chip, t, 0.1); h.update(t, 0.2, 0.05);
      const lp = k(t, 0.3, 1.0, E.outExpo); lap.L.style.transform = `translateX(${(1 - lp) * -500}px) perspective(1600px) rotateY(${lerp(14, 6, lp)}deg)`; lap.L.style.transformOrigin = 'left center';
      fadeUp(lapTag, t, 0.8);
      lap.swap(t, 'admin-verified', 2.4);
      // the "Verify listing" click: a cornflower ripple on the laptop
      const enter = k(t, 0.2, 1.0, E.outExpo); ph.wrap.style.transform = `translateY(${(1 - enter) * 200 + Math.sin(t * 1.3) * 8}px) scale(0.84)`; ph.wrap.style.transformOrigin = 'center top';
      const ap = k(t, 2.6, 0.6, E.back); arrow.style.opacity = clamp(ap); arrow.style.transform = `translateX(${(1 - clamp(ap)) * -40}px)`;
      ph.swap(t, 'housing-pending', 'housing-verified', 3.1, 0.35);
      if (t > 3.1 && t < 3.6) ph.body.style.boxShadow = `0 0 0 ${k(t, 3.1, 0.5) * 30}px rgba(166,214,176,${0.6 * (1 - k(t, 3.1, 0.5))}), 0 40px 120px rgba(5,5,5,.18)`;
      badge(t, 3.6); price(t, 4.3); walk(t, 5.0);
      fadeUp(sample, t, 3.6);
    };
  };

  LIB.listing = feature({
    stage: 'arrive', chip: 'Verified accommodation', shot: 'listing-detail', blob: 'var(--lilac)',
    title: 'Real costs in your *home* *currency.*', body: 'Every verified price shows in AED and rupees, with the rate date. Unverified places say Ask for price.',
    bullets: ['See the contract before you pay', 'Check the agent’s licence', 'Report a broker in one tap'],
    tag: 'Sample values for demonstration',
  });

  LIB.transit = (root) => {
    gridBg(root);
    blob(root, 'var(--wash)', 1110, 540, 420);
    const chip = el('div', 'abs chip', root, 'Offline RTA transit maps'); css(chip, { left: '140px', top: '230px', background: 'var(--lilac)' });
    const h = words(root, 'Land with *no* *data.* Still get to campus.', 'h2', { position: 'absolute', left: '140px', top: '300px', width: '700px' });
    const body = el('div', 'abs body', root, 'The Dubai Metro and Tram map and the route planner are saved on the phone. Terminal 1 to campus, about 46 minutes.'); css(body, { left: '140px', top: '520px', width: '680px' });
    // airplane mode toggle
    const tog = el('div', 'abs', root); css(tog, { left: '140px', top: '720px', display: 'flex', alignItems: 'center', gap: '22px', fontSize: '30px', fontWeight: 600 });
    icon('AirplaneTiltBold', 48, 'var(--ink)', tog); el('span', null, tog, 'Airplane mode');
    const track = el('div', null, tog); css(track, { position: 'relative', width: '110px', height: '60px', borderRadius: '999px', border: '4px solid var(--ink)', background: '#fff' });
    const knob = el('div', null, track); css(knob, { position: 'absolute', left: '6px', top: '6px', width: '40px', height: '40px', borderRadius: '50%', background: 'var(--ink)' });
    const off = el('div', 'abs chip', root); css(off, { left: '140px', top: '830px', background: 'var(--ink)', color: '#fff' }); icon('WifiSlashBold', 30, '#fff', off); el('span', null, off, 'Offline. The map still works.');
    const ph = phone(root, 'transit-route', 900, 97);
    const c1 = ph.callout(window.BOXES['transit-offline'].banner, 'No connection', 'right', 6);
    const c2 = ph.callout(window.BOXES['transit-offline'].minutes, 'Routed on the phone', 'right', 8);
    return (t, dur) => {
      fadeUp(chip, t, 0.1); h.update(t, 0.2); fadeUp(body, t, 0.9); fadeUp(tog, t, 1.2);
      const on = k(t, 1.9, 0.4, E.back); knob.style.transform = `translateX(${on * 50}px)`; track.style.background = on > 0.5 ? 'var(--blue)' : '#fff';
      fadeUp(off, t, 2.3);
      const enter = k(t, 0, 1.0, E.outExpo); ph.wrap.style.transform = `translateY(${(1 - enter) * 160 + Math.sin(t * 1.3) * 8}px)`;
      ph.swap(t, 'transit-route', 'transit-offline', 2.2, 0.4);
      c1(t, 2.7); c2(t, 3.4);
    };
  };

  LIB.budget = feature({
    stage: 'prepare', chip: 'Budget in your currency', shot: 'budget', blob: 'var(--sun)', side: 'right',
    title: 'We never guess *your* *rent.*', body: 'Rent and deposit come from the place you chose. Fees carry their source. Totals count in rupees with the rate date.',
    bullets: ['Before you fly, first month, every month', 'Rates by Exchange Rate API', 'Share with family in one tap'],
    callouts: [{ t: 1.8, box: 'total', label: 'Totals in INR' }, { t: 2.6, box: 'share', label: 'Share with family' }],
    punch: { t: 3.4, box: 'total', scale: 1.3 },
    tag: 'Sample values for demonstration',
  });

  LIB.family = (root) => {
    gridBg(root);
    const chip = el('div', 'abs chip', root, 'Family view'); css(chip, { left: '180px', top: '230px', background: 'var(--blush)' });
    const h = words(root, 'One link for the people *back* *home.*', 'h2', { position: 'absolute', left: '180px', top: '300px', width: '760px' });
    const body = el('div', 'abs body', root, 'A read only budget, the chosen place and the Day Zero plan. No login, no contact details, and it can be turned off any time.'); css(body, { left: '180px', top: '520px', width: '720px' });
    const p1 = phone(root, 'budget-share', 1060, 97), p2 = phone(root, 'family', 1380, 140);
    const link = icon('ShareNetwork', 70, 'var(--blue)', root); css(link, { position: 'absolute', left: '1460px', top: '40px' });
    return (t) => {
      fadeUp(chip, t, 0.1); h.update(t, 0.2); fadeUp(body, t, 0.9);
      const a = k(t, 0, 1.0, E.outExpo), b = k(t, 1.4, 1.0, E.ramp);
      p1.wrap.style.transform = `translateY(${(1 - a) * 160}px) rotate(-4deg) scale(0.88)`;
      p2.wrap.style.transform = `translateX(${(1 - b) * 900}px) rotate(${lerp(14, 4, b)}deg) scale(0.88)`;
      const lp = k(t, 1.2, 0.6, E.back); link.style.opacity = clamp(lp); link.style.transform = `scale(${clamp(lp)})`;
    };
  };

  LIB.essentials = feature({
    stage: 'verified', chip: 'Essential services guide', shot: 'essentials', blob: 'var(--sage)',
    title: 'Most of Day Zero works with your *passport.*', body: 'Mobile SIM, transport card and emergency numbers work today. Banking and Ejari wait for the Emirates ID, each with a bridge.',
    bullets: ['Day Zero ready', 'After your Emirates ID', 'Official links, source and date on every fact'],
    callouts: [{ t: 1.8, box: 'ready', label: 'Works with your passport' }],
  });

  LIB.unlock = (root) => {
    gridBg(root);
    blob(root, 'var(--lilac)', 1110, 540, 420);
    const chip = el('div', 'abs chip', root, STAGE_NUM.arrive); css(chip, { left: '140px', top: '230px', background: 'var(--lilac)' });
    const h = words(root, 'The moment the card *arrives.*', 'h2', { position: 'absolute', left: '140px', top: '300px', width: '700px' });
    const body = el('div', 'abs body', root, 'Mark the Emirates ID as received. Locked tasks shake off their lock and move to Do now.'); css(body, { left: '140px', top: '520px', width: '680px' });
    const lock = el('div', 'abs', root); css(lock, { left: '140px', top: '700px', width: '160px', height: '160px' });
    const closed = icon('Lock', 160, 'var(--ink)', lock); const open = icon('LockOpen', 160, 'var(--blue)', lock); css(open, { position: 'absolute', left: 0, top: 0 });
    const ph = phone(root, 'journey-locked', 900, 97);
    const toast = el('div', 'toast', ph.screen, 'Emirates ID received. 3 tasks are ready.'); toast.style.top = '-140px';
    const side = el('div', 'abs', root); css(side, { left: '1400px', top: '420px', width: '440px' });
    const steps = ['Toast: one calm message', 'Battery charges', 'Tasks move to Do now'].map((x) => { const r = el('div', 'clabel', side, x); css(r, { position: 'relative', display: 'inline-block', marginBottom: '22px' }); el('br', null, side); return r; });
    return (t) => {
      fadeUp(chip, t, 0.1); h.update(t, 0.2); fadeUp(body, t, 0.9);
      const enter = k(t, 0, 1.0, E.outExpo); ph.wrap.style.transform = `translateY(${(1 - enter) * 160 + Math.sin(t * 1.3) * 8}px)`;
      // lock shakes, then opens
      const shake = t > 1.6 && t < 2.4 ? Math.sin((t - 1.6) * 40) * 12 * (1 - (t - 1.6) / 0.8) : 0;
      lock.style.transform = `rotate(${shake}deg)`; lock.style.opacity = k(t, 1.2, 0.4);
      const o = k(t, 2.4, 0.4); closed.style.opacity = 1 - o; open.style.opacity = o; open.style.transform = `translateY(${-o * 10}px)`;
      const tp = k(t, 2.5, 0.6, E.back); toast.style.transform = `translateY(${tp * 200}px)`;
      ph.swap(t, 'journey-locked', 'journey-unlocked', 2.9, 0.5);
      const tout = k(t, 5.2, 0.5); toast.style.opacity = 1 - tout;
      steps.forEach((r, i) => { const p = k(t, 2.8 + i * 0.35, 0.5); r.style.opacity = p; r.style.transform = `translateX(${(1 - p) * 40}px)`; });
    };
  };

  LIB.charged = (root) => {
    gridBg(root);
    const chip = el('div', 'abs chip', root, 'Charged by Wayfare'); css(chip, { left: '180px', top: '170px', background: 'var(--blue)' });
    icon('LightningBold', 28, 'var(--ink)', chip);
    const h = words(root, '*Fully* *charged.* You’re settled in.', 'h1', { position: 'absolute', left: '180px', top: '240px', width: '1100px' });
    const bat = el('div', 'abs', root); css(bat, { left: '180px', top: '520px', width: '900px', height: '220px', border: '8px solid var(--ink)', borderRadius: '44px', padding: '16px', display: 'flex', gap: '14px', background: '#fff' });
    const tip = el('div', 'abs', root); css(tip, { left: '1090px', top: '585px', width: '26px', height: '90px', background: 'var(--ink)', borderRadius: '0 14px 14px 0' });
    const colors = ['var(--sun)', 'var(--lilac)', 'var(--blush)', 'var(--blush)'];
    const cells = colors.map((c) => { const w = el('div', null, bat); css(w, { flex: 1, borderRadius: '24px', overflow: 'hidden', background: '#fff', position: 'relative' }); const f = el('div', null, w); css(f, { position: 'absolute', inset: 0, background: c, transformOrigin: 'left' }); return f; });
    const pct = el('div', 'abs', root); css(pct, { left: '1150px', top: '560px', fontWeight: 700, fontSize: '120px', fontVariantNumeric: 'tabular-nums' });
    const bolt = icon('LightningBold', 110, 'var(--ink)', root); css(bolt, { position: 'absolute', left: '1150px', top: '420px' });
    const ev = el('img', 'abs', root); ev.src = '../../client/public/illustrations/ev-charging.png'; css(ev, { left: '180px', top: '790px', width: '360px' });
    const pulse = el('div', 'abs', root); css(pulse, { left: '196px', top: '536px', width: '300px', height: '188px', background: 'rgba(255,255,255,.7)', borderRadius: '24px' });
    return (t) => {
      fadeUp(chip, t, 0.1); h.update(t, 0.3, 0.08);
      cells.forEach((f, i) => { f.style.transform = `scaleX(${k(t, 0.9 + i * 0.45, 0.45, E.inOut)})`; if (t > 3.0) f.style.background = 'var(--sage)'; });
      const total = k(t, 0.9, 1.8, E.inOut); pct.textContent = Math.round(total * 100) + '%';
      const bp = k(t, 2.9, 0.5, E.back); bolt.style.transform = `scale(${lerp(0.9, 1, clamp(bp))})`; bolt.style.opacity = clamp(bp);
      const pp = P(t, 3.0, 3.8); pulse.style.opacity = pp > 0 && pp < 1 ? Math.sin(pp * Math.PI) : 0; pulse.style.transform = `translateX(${pp * 600}px)`;
      const ep = k(t, 3.2, 1.0, E.ramp); ev.style.transform = `translateX(${(1 - ep) * -700}px)`; ev.style.opacity = clamp(ep * 2);
    };
  };

  LIB.community = feature({
    side: 'right', stage: 'settle', chip: 'Student community', shot: 'community', blob: 'var(--blush)',
    title: 'Meet your people, *safely.*', body: 'Verified groups for your university and your home country. Events from your university. Every post can be reported.',
    bullets: ['Join with your university email', 'No private messages between strangers', 'Moderated by the university'],
  });

  LIB.desktop = (root) => {
    gridBg(root);
    const chip = el('div', 'abs chip', root, 'Phone and laptop'); css(chip, { left: '180px', top: '110px', background: 'var(--wash)' });
    const h = words(root, 'Installable on the phone. *A* *full* *website* on the laptop.', 'h2', { position: 'absolute', left: '180px', top: '170px', width: '1560px' });
    const a = laptop(root, 'desktop-home', 160, 380, 1000);
    const ph = phone(root, 'home-charged', 1340, 240);
    return (t) => {
      fadeUp(chip, t, 0.1); h.update(t, 0.2, 0.05);
      const lp = k(t, 0.3, 1.0, E.outExpo); a.L.style.transform = `translateY(${(1 - lp) * 200}px)`; a.L.style.opacity = lp;
      a.swap(t, 'desktop-transit', 3.0);
      const pp = k(t, 0.6, 1.0, E.outExpo); ph.wrap.style.transform = `translateY(${(1 - pp) * 300}px) scale(0.86)`; ph.wrap.style.transformOrigin = 'center top';
    };
  };

  LIB.impact = (root) => {
    gridBg(root);
    const over = el('div', 'abs over', root, 'The impact'); css(over, { left: '180px', top: '120px', color: 'var(--muted)' });
    const h = words(root, 'Smarter, greener *journeys.*', 'h2', { position: 'absolute', left: '180px', top: '170px', width: '1500px' });
    const items = [['ShieldCheck', 'Safer choices', 'Verified information'], ['Lightning', 'Smarter mobility', 'Transit first journeys'], ['UsersThree', 'Stronger community', 'Moderated groups'], ['ChartLineUp', 'A global education hub', 'For Dubai']];
    const cards = items.map(([ic, t1, t2], i) => { const c = el('div', 'card abs', root); css(c, { left: 180 + i * 398 + 'px', top: '320px', width: '370px', height: '250px', padding: '30px' }); icon(ic, 56, 'var(--ink)', c); el('div', null, c, `<div style="font-weight:700;font-size:30px;margin-top:20px">${t1}</div><div style="font-size:22px;color:var(--muted);margin-top:6px">${t2}</div>`); return c; });
    const panel = el('div', 'abs ink', root); css(panel, { left: '180px', top: '610px', width: '1560px', height: '330px', borderRadius: '36px', padding: '44px 52px' });
    el('div', null, panel, 'Driving smart and sustainable student mobility').style.cssText = 'font-weight:700;font-size:44px;margin-bottom:24px';
    const rows = ['Live now: offline RTA metro and tram maps from Day Zero', 'Partly live: every verified place shows its nearest station', 'Coming next: EV, charging and shared mobility partners'].map((x) => { const r = el('div', null, panel); r.style.cssText = 'display:flex;align-items:center;gap:16px;font-size:28px;margin:10px 0'; icon('CheckCircleBold', 32, 'var(--blue)', r); el('span', null, r, x); return r; });
    const seek = el('div', null, panel, 'Seeking partners: mobility operators · charging providers · policymakers · investors'); seek.style.cssText = 'font-size:24px;color:var(--blue);font-weight:600;margin-top:16px';
    const ev = el('img', 'abs', root); ev.src = '../../client/public/illustrations/ev-charging.png'; css(ev, { left: '1380px', top: '650px', width: '300px', background: '#fff', borderRadius: '24px', padding: '14px' });
    return (t) => {
      fadeUp(over, t, 0.1); h.update(t, 0.2);
      cards.forEach((c, i) => { const p = k(t, 0.6 + i * 0.12, 0.8, E.back); c.style.opacity = clamp(p * 2); c.style.transform = `translateY(${(1 - p) * 100}px)`; });
      const pp = k(t, 1.4, 0.9, E.ramp); panel.style.transform = `translateY(${(1 - pp) * 500}px)`;
      rows.forEach((r, i) => fadeUp(r, t, 2.2 + i * 0.3, 0.6, 20)); fadeUp(seek, t, 3.3);
      const ep = k(t, 2.6, 0.8, E.outExpo); ev.style.opacity = ep; ev.style.transform = `translateX(${(1 - ep) * 200}px)`;
    };
  };

  LIB.tagline = (root) => {
    const lines = ['Make every arrival', 'a better beginning.'];
    const box = el('div', 'abs h1', root); css(box, { left: '0', right: '0', top: '360px', textAlign: 'center', fontSize: '120px', lineHeight: '1.1' });
    const spans = [];
    lines.forEach((l) => { const row = el('div', null, box); l.split(' ').forEach((w, i, a) => { spans.push(el('span', 'w', row, w)); if (i < a.length - 1) row.appendChild(document.createTextNode(' ')); }); });
    return (t) => spans.forEach((s, i) => { const p = k(t, 0.4 + i * 0.32, 0.6); s.style.opacity = lerp(0.3, 1, p); s.style.color = i >= 3 && p > 0.5 ? 'var(--ink)' : 'var(--ink)'; s.style.transform = `translateY(${(1 - p) * 12}px)`; });
  };

  LIB.outro = (root) => {
    gridBg(root);
    const logo = el('div', 'abs', root, `<svg viewBox="0 0 24 32" width="66" height="88"><path fill="#050505" fill-rule="evenodd" d="M12 0C5.373 0 0 5.373 0 12c0 7.2 8.4 15.6 11.2 19.6a1 1 0 0 0 1.6 0C15.6 27.6 24 19.2 24 12 24 5.373 18.627 0 12 0Zm0 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"/></svg><span style="font-weight:700;font-size:96px;letter-spacing:-2px;margin-left:22px">Wayfare</span>`);
    css(logo, { left: '0', right: '0', top: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' });
    const l1 = el('div', 'abs', root, 'Wayfare. Study. Live. Belong.'); css(l1, { left: 0, right: 0, top: '300px', textAlign: 'center', fontSize: '40px', fontWeight: 600 });
    const evw = el('div', 'abs', root); css(evw, { left: 0, right: 0, top: '380px', display: 'flex', justifyContent: 'center' });
    const evc = el('div', 'chip', evw); css(evc, { background: 'var(--blue)', fontSize: '26px' }); icon('LightningBold', 28, 'var(--ink)', evc); el('span', null, evc, 'EV World 2026 · Smart and Sustainable Mobility');
    const team = el('div', 'abs', root, 'In collaboration with Heriot-Watt University Dubai · Design Management Project<br>Supervisor Professor: Houma<br>Vruti Lakhani · Jhanvi Bhatt · Ahmed Amr Elsaey · Sina Zendaki · Keerthana Janakiraman');
    css(team, { left: 0, right: 0, top: '480px', textAlign: 'center', fontSize: '28px', lineHeight: '1.6' });
    const credits = el('div', 'abs', root, 'Music: “Inspired” by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0 · Map data © OpenStreetMap contributors (ODbL) · Rates by Exchange Rate API · Sources: KHDA, Dubai Media Office');
    css(credits, { left: '160px', right: '160px', top: '700px', textAlign: 'center', fontSize: '19px', color: 'var(--muted)', lineHeight: '1.5' });
    const sky = el('img', 'abs', root); sky.src = '../../client/public/illustrations/dubai-skyline-line.png'; css(sky, { left: '0', top: '900px', width: '1920px' });
    return (t) => {
      const lp = k(t, 0.2, 0.9, E.back); logo.style.opacity = clamp(lp * 2); logo.style.transform = `scale(${lerp(0.8, 1, clamp(lp))})`;
      fadeUp(l1, t, 0.8); fadeUp(evw, t, 1.2); fadeUp(team, t, 1.6); fadeUp(credits, t, 2.2);
      sky.style.clipPath = `inset(0 ${(1 - k(t, 0.5, 2.5, E.inOut)) * 100}% 0 0)`;
    };
  };

  // ---------------------------------------------------------------- cuts (durations in seconds, 2 second bars at 120 BPM)
  const CUTS = {
    full: [['open', 8, 'cut'], ['problem', 8, 'whip'], ['gap', 8, 'wipe'], ['stats', 8, 'whip'], ['insight', 6, 'wipe'], ['brand', 6, 'zoom'], ['stages', 6, 'whip'], ['home', 8, 'whip'], ['checklist', 8, 'whip'], ['verify', 10, 'wipe'], ['listing', 6, 'whip'], ['transit', 8, 'whip'], ['budget', 8, 'whip'], ['family', 6, 'whip'], ['essentials', 6, 'whip'], ['unlock', 8, 'wipe'], ['charged', 6, 'zoom'], ['community', 6, 'whip'], ['desktop', 6, 'whip'], ['impact', 8, 'wipe'], ['tagline', 6, 'zoom'], ['outro', 8, 'wipe']],
    loop: [['brand', 6, 'zoom'], ['home', 6, 'whip'], ['checklist', 6, 'whip'], ['verify', 8, 'wipe'], ['transit', 6, 'whip'], ['budget', 6, 'whip'], ['family', 4, 'whip'], ['unlock', 6, 'wipe'], ['charged', 6, 'zoom'], ['tagline', 6, 'zoom']],
  };
  const CHAPTER = { home: 'Prepare', checklist: 'Smart checklists', verify: 'University integration', listing: 'Verified accommodation', transit: 'Offline transit', budget: 'Budget', family: 'Family view', essentials: 'Essentials', unlock: 'Arrive', charged: 'Settle', community: 'Community', desktop: 'Everywhere' };

  const scenes = [];
  let acc = 0;
  for (const [name, dur, tin] of CUTS[CUT]) {
    const root = el('div', 'scene', stage); root.style.background = 'var(--paper)';
    const blur = motionBlur(); root.style.filter = `url(#${blur.id})`;
    const update = LIB[name](root);
    if (root.classList.contains('ink')) root.style.background = 'var(--ink)';
    if (root.dataset.bg === 'sage') root.style.background = 'var(--sage)';
    scenes.push({ name, dur, tin, start: acc, root, update, blur, lastX: 0 });
    acc += dur;
  }
  const TOTAL = acc;
  scenes.forEach((s, i) => { s.next = scenes[(i + 1) % scenes.length]; });

  // chrome: small logo and chapter label on feature scenes
  const bug = el('div', 'abs', chromeEl, `<svg viewBox="0 0 24 32" width="22" height="30"><path fill="#050505" fill-rule="evenodd" d="M12 0C5.373 0 0 5.373 0 12c0 7.2 8.4 15.6 11.2 19.6a1 1 0 0 0 1.6 0C15.6 27.6 24 19.2 24 12 24 5.373 18.627 0 12 0Zm0 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"/></svg><span style="font-weight:700;font-size:30px;margin-left:10px">Wayfare</span>`);
  css(bug, { left: '64px', top: '48px', display: 'flex', alignItems: 'center' });
  const chap = el('div', 'abs', chromeEl); css(chap, { right: '64px', top: '54px', fontSize: '20px', fontWeight: 600, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--muted)' });
  const prog = el('div', 'abs', chromeEl); css(prog, { left: '0', bottom: '0', height: '6px', width: '1920px', background: 'var(--blue)', transformOrigin: 'left' });

  // film grain, seeded per frame so renders are repeatable
  const grain = document.getElementById('grain').getContext('2d');
  const img = grain.createImageData(480, 270);
  function drawGrain(frame) {
    let s = (frame * 9301 + 49297) % 233280;
    for (let i = 0; i < img.data.length; i += 4) { s = (s * 9301 + 49297) % 233280; const v = 128 + ((s / 233280) - 0.5) * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    grain.putImageData(img, 0, 0);
  }

  /** Transition offset for a scene at local time lt. Returns transform and blur amount. */
  function transitionFor(s, lt) {
    const half = T / 2;
    let x = 0, scale = 1, op = 1, clip = null, z = 1;
    if (lt < half && s.tin !== 'cut') { // entering
      const p = clamp((lt + half) / T);
      if (s.tin === 'whip') x = (1 - E.ramp(p)) * W;
      if (s.tin === 'zoom') { scale = lerp(1.5, 1, E.ramp(p)); op = E.out(p); }
      if (s.tin === 'wipe') clip = `circle(${E.inOut(p) * 120}% at 50% 50%)`;
      z = 2;
    }
    if (lt > s.dur - half) { // leaving: depends on how the next scene enters
      const p = clamp((lt - (s.dur - half)) / T);
      if (s.next.tin === 'whip') x = -E.ramp(p) * W;
      if (s.next.tin === 'zoom') { scale = lerp(1, 0.8, E.ramp(p)); op = 1 - E.out(p); }
      z = 1;
    }
    return { x, scale, op, clip, z };
  }

  let lastFrame = -1;
  window.DURATION = TOTAL;
  window.FPS = FPS;
  window.render = (t) => {
    const frame = Math.round(t * FPS);
    let current = null;
    for (const s of scenes) {
      let lt = t - s.start;
      if (CUT === 'loop') { if (lt > TOTAL - T) lt -= TOTAL; if (lt < -T && lt + TOTAL < s.dur + T) lt += TOTAL; }
      const visible = lt >= -T / 2 && lt <= s.dur + T / 2;
      s.root.style.display = visible ? 'block' : 'none';
      if (!visible) continue;
      if (lt >= 0 && lt < s.dur) current = s;
      const tr = transitionFor(s, lt);
      s.root.style.transform = `translateX(${tr.x}px) scale(${tr.scale})`;
      s.root.style.opacity = tr.op; s.root.style.zIndex = tr.z; s.root.style.clipPath = tr.clip || 'none';
      // directional motion blur from horizontal velocity, zoom blur from scale change
      const vx = Math.abs(tr.x - s.lastX); s.lastX = tr.x;
      const vs = Math.abs(tr.scale - 1);
      s.blur.set(Math.min(60, vx * 0.35) + vs * 30, vs * 30);
      s.update(Math.max(lt, 0), s.dur);
    }
    // chrome
    const showChrome = current && CHAPTER[current.name];
    bug.style.opacity = showChrome ? 1 : 0; chap.style.opacity = showChrome ? 1 : 0;
    if (showChrome) chap.textContent = CHAPTER[current.name];
    prog.style.transform = `scaleX(${t / TOTAL})`;
    prog.style.opacity = CUT === 'loop' ? 0 : 1;
    if (frame !== lastFrame) drawGrain(frame);
    lastFrame = frame;
  };
  window.SCENES = scenes.map((s) => ({ name: s.name, start: s.start, dur: s.dur, tin: s.tin }));
  window.render(0);
})();
