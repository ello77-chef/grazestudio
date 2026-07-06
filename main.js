// ============================================================
// COOKIE CONSENT — DSGVO-Banner (Opt-in, auf jeder Seite)
// ============================================================
// Auswahl wird in localStorage gespeichert. Andere Skripte (z.B. Meta-Pixel,
// Google Analytics für deine Insta-Ads) NUR laden, wenn window.grazeConsent
// === 'all' ist — im Listener unten an der markierten Stelle einhängen.
(function cookieConsent() {
  const KEY = 'grazestudio_consent';
  window.grazeConsent = localStorage.getItem(KEY); // 'all' | 'necessary' | null

  function loadOptionalScripts() {
    // ↓↓↓ HIER später Analytics/Meta-Pixel laden (nur bei 'all'-Einwilligung) ↓↓↓
    // if (window.grazeConsent === 'all') { /* z.B. Meta Pixel init */ }
  }

  function persist(value) {
    try { localStorage.setItem(KEY, value); } catch (e) {}
    window.grazeConsent = value;
    document.dispatchEvent(new CustomEvent('graze:consent', { detail: value }));
    if (value === 'all') loadOptionalScripts();
  }

  function buildBanner() {
    if (document.querySelector('.cookie-banner')) return;
    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie-Hinweis');
    banner.innerHTML = `
      <div class="cookie-inner">
        <div class="cookie-text">
          <strong>Cookies &amp; Datenschutz</strong>
          <p>Diese Website nutzt nur technisch notwendige Cookies. Optionale Cookies (z.&nbsp;B. für Statistik) setzen wir ausschließlich mit deiner Einwilligung. Mehr dazu in der <a href="datenschutz.html">Datenschutzerklärung</a>.</p>
        </div>
        <div class="cookie-actions">
          <button type="button" class="cookie-btn cookie-necessary">Nur notwendige</button>
          <button type="button" class="cookie-btn cookie-accept">Alle akzeptieren</button>
        </div>
      </div>`;
    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add('show'));

    const close = () => {
      banner.classList.remove('show');
      setTimeout(() => banner.remove(), 500);
    };
    banner.querySelector('.cookie-necessary').addEventListener('click', () => { persist('necessary'); close(); });
    banner.querySelector('.cookie-accept').addEventListener('click', () => { persist('all'); close(); });
  }

  // Reopen from a footer "Cookie-Einstellungen" link
  window.grazeOpenCookieSettings = function () {
    try { localStorage.removeItem(KEY); } catch (e) {}
    window.grazeConsent = null;
    buildBanner();
  };
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-cookie-settings]');
    if (t) { e.preventDefault(); window.grazeOpenCookieSettings(); }
  });

  if (window.grazeConsent === 'all') loadOptionalScripts();
  if (!window.grazeConsent) {
    if (document.body) buildBanner();
    else document.addEventListener('DOMContentLoaded', buildBanner);
  }
})();

// ============================================================
// ★ LANDING-CONFIG — HIER ANPASSEN (kein Code durchsuchen nötig)
// ============================================================
const SITE_CONFIG = {
  // --- HERO-HEADLINE A/B-TEST ---------------------------------
  // Aktive Variante umstellen: 'A', 'B' oder 'C'. Fertig.
  activeHeadline: 'A',
  headlines: {
    // A) Konkretes Ergebnis + Zeitrahmen (Standard, stark für kalten Ad-Traffic)
    A: {
      line1: 'Mehr Kundenanfragen',
      line2: 'für Ihr Unternehmen —',
      highlight: 'online in 14 Tagen.',
      sub: 'Professionelle Websites für KMU &amp; lokale Betriebe. Von einem Ansprechpartner, der liefert was er verspricht.',
    },
    // B) Zielgruppen-spezifisch (Handwerker & lokale Betriebe)
    B: {
      line1: 'Websites für Handwerker',
      line2: '&amp; lokale Betriebe, die',
      highlight: 'neue Kunden bringen.',
      sub: 'Persönlich umgesetzt in Graz — schnell, ehrlich, ohne Agentur-Overhead.',
    },
    // C) Kurz & ergebnisorientiert (gefunden + gebucht)
    C: {
      line1: 'Ihr Betrieb — online',
      line2: 'gefunden und endlich',
      highlight: 'gebucht.',
      sub: 'Konversionsstarke Websites für KMU &amp; lokale Dienstleister. Ein Ansprechpartner, der liefert.',
    },
  },

  // --- KAPAZITÄTS-/VERKNAPPUNGSHINWEIS ------------------------
  // Monatlich aktualisieren. Erscheint im Hero UND über dem Kontaktformular.
  capacityNote: 'Nur noch 2 von 3 Projekt-Plätzen diesen Monat frei',

  // --- KONTAKTFORMULAR -> ZIEL-E-MAIL ------------------------
  // Formular-Anfragen werden an diese Adresse geschickt (via FormSubmit.co).
  contactEmail: 'grazestudio.at@gmail.com',
};

// Apply config to the DOM (headline, subheadline, capacity notes)
(function applySiteConfig() {
  const h = SITE_CONFIG.headlines[SITE_CONFIG.activeHeadline];
  const headlineEl = document.getElementById('heroHeadline');
  const subEl = document.getElementById('heroSub');
  if (h && headlineEl && headlineEl.dataset.variant !== SITE_CONFIG.activeHeadline) {
    headlineEl.innerHTML = `${h.line1}<br />${h.line2}<br /><em>${h.highlight}</em>`;
    headlineEl.dataset.variant = SITE_CONFIG.activeHeadline;
  }
  if (h && subEl) subEl.innerHTML = h.sub;

  document.querySelectorAll('#capacityText, #capacityTextForm').forEach((el) => {
    el.textContent = SITE_CONFIG.capacityNote;
  });
})();

// Navbar scroll (guarded — legal pages use a different nav)
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

// ============================================================
// HERO PARTICLE FIELD — interactive anti-gravity canvas
// Ported from a React/canvas reference implementation into
// vanilla JS, retuned to the GrazeStudio emerald palette.
// ============================================================
(function heroParticles() {
  const canvas = document.getElementById('heroParticles');
  const container = document.getElementById('hero');
  if (!canvas || !container) return;

  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PARTICLE_DENSITY = 0.00012;   // main interactive particles per px²
  const BG_PARTICLE_DENSITY = 0.00004; // ambient drifting dust per px²
  const MOUSE_RADIUS = 170;
  const RETURN_SPEED = 0.08;
  const DAMPING = 0.90;
  const REPULSION_STRENGTH = 1.2;

  const EM_ACCENT = '52, 211, 153';   // --em-400
  const EM_GLOW   = '16, 185, 129';   // --em-500

  const randomRange = (min, max) => Math.random() * (max - min) + min;

  let particles = [];
  let bgParticles = [];
  let width = 0, height = 0;
  let frameId = null;
  let lastTime = 0;

  const mouse = { x: -1000, y: -1000, active: false };

  function initParticles() {
    const count = Math.max(1, Math.floor(width * height * PARTICLE_DENSITY));
    particles = [];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      particles.push({
        x, y, originX: x, originY: y,
        vx: 0, vy: 0,
        size: randomRange(1, 2.4),
        accent: Math.random() > 0.88,
      });
    }

    const bgCount = Math.max(1, Math.floor(width * height * BG_PARTICLE_DENSITY));
    bgParticles = [];
    for (let i = 0; i < bgCount; i++) {
      bgParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size: randomRange(0.5, 1.5),
        alpha: randomRange(0.1, 0.4),
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function resize() {
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    width = rect.width;
    height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    initParticles();
  }

  function drawStaticFrame() {
    // Reduced-motion fallback: one calm frame, no animation loop.
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2, cy = height * 0.4;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.7);
    gradient.addColorStop(0, `rgba(${EM_GLOW}, 0.10)`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ffffff';
    for (const p of particles) {
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function animate(time) {
    const delta = time - lastTime;
    lastTime = time;

    ctx.clearRect(0, 0, width, height);

    // Pulsating ambient glow (emerald, matches brand accent)
    const cx = width / 2, cy = height * 0.4;
    const pulseOpacity = Math.sin(time * 0.0008) * 0.03 + 0.08;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.7);
    gradient.addColorStop(0, `rgba(${EM_GLOW}, ${pulseOpacity})`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Ambient drifting/twinkling dust
    ctx.fillStyle = '#ffffff';
    for (const p of bgParticles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      const twinkle = Math.sin(time * 0.002 + p.phase) * 0.5 + 0.5;
      ctx.globalAlpha = p.alpha * (0.3 + 0.7 * twinkle);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Phase 1: forces (mouse repulsion + spring return to origin)
    for (const p of particles) {
      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (mouse.active && distance < MOUSE_RADIUS && distance > 0.01) {
        const forceX = dx / distance;
        const forceY = dy / distance;
        const force = (MOUSE_RADIUS - distance) / MOUSE_RADIUS;
        const repulsion = force * REPULSION_STRENGTH;
        p.vx -= forceX * repulsion * 5;
        p.vy -= forceY * repulsion * 5;
      }

      p.vx += (p.originX - p.x) * RETURN_SPEED;
      p.vy += (p.originY - p.y) * RETURN_SPEED;
    }

    // Phase 2: pairwise collision resolution
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distSq = dx * dx + dy * dy;
        const minDist = p1.size + p2.size;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          if (dist > 0.01) {
            const nx = dx / dist, ny = dy / dist;
            const overlap = minDist - dist;
            p1.x -= nx * overlap * 0.5;
            p1.y -= ny * overlap * 0.5;
            p2.x += nx * overlap * 0.5;
            p2.y += ny * overlap * 0.5;

            const dvx = p1.vx - p2.vx;
            const dvy = p1.vy - p2.vy;
            const velocityAlongNormal = dvx * nx + dvy * ny;

            if (velocityAlongNormal > 0) {
              const m1 = p1.size, m2 = p2.size;
              const restitution = 0.85;
              const impulse = (-(1 + restitution) * velocityAlongNormal) / (1 / m1 + 1 / m2);
              p1.vx += (impulse * nx) / m1;
              p1.vy += (impulse * ny) / m1;
              p2.vx -= (impulse * nx) / m2;
              p2.vy -= (impulse * ny) / m2;
            }
          }
        }
      }
    }

    // Phase 3: integrate + draw
    for (const p of particles) {
      p.vx *= DAMPING;
      p.vy *= DAMPING;
      p.x += p.vx;
      p.y += p.vy;

      const velocity = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const opacity = Math.min(0.3 + velocity * 0.1, 1);

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.accent
        ? `rgba(${EM_ACCENT}, ${Math.min(0.6 + velocity * 0.1, 1)})`
        : `rgba(255, 255, 255, ${opacity})`;
      ctx.fill();
    }

    frameId = requestAnimationFrame(animate);
  }

  function handleMouseMove(e) {
    const rect = container.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  }

  function handleMouseLeave() {
    mouse.active = false;
  }

  window.addEventListener('resize', resize, { passive: true });
  container.addEventListener('mousemove', handleMouseMove);
  container.addEventListener('mouseleave', handleMouseLeave);

  resize();

  if (reduceMotion) {
    drawStaticFrame();
  } else {
    frameId = requestAnimationFrame(animate);
  }
})();

// Burger (guarded — legal pages have no navbar)
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');
if (burger && mobileMenu) {
  burger.addEventListener('click', () => mobileMenu.classList.toggle('open'));
  document.querySelectorAll('.mob-link').forEach(l => l.addEventListener('click', () => mobileMenu.classList.remove('open')));
}

// Counter animation
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const duration = 1600;
  const start = performance.now();
  const update = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// Stats ring fill — animates in sync with its counter (same duration/easing)
function animateRing(el) {
  const target = parseInt(el.dataset.target, 10) / 100;
  const circumference = 2 * Math.PI * el.r.baseVal.value;
  el.style.strokeDasharray = `${circumference}`;
  const duration = 1600;
  const start = performance.now();
  const update = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.style.strokeDashoffset = `${circumference * (1 - eased * target)}`;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// Reveal + counter on scroll
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    setTimeout(() => {
      el.classList.add('visible');
      el.querySelectorAll('.counter').forEach(c => animateCounter(c));
      el.querySelectorAll('.counter-ring').forEach(r => animateRing(r));
    }, i * 60);
    io.unobserve(el);
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// Also trigger counters that are direct .counter elements (not inside .reveal)
const counterIo = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    animateCounter(entry.target);
    counterIo.unobserve(entry.target);
  });
}, { threshold: 0.3 });

document.querySelectorAll('.counter').forEach(el => {
  if (!el.closest('.reveal')) counterIo.observe(el);
});

// FAQ
function toggleFaq(btn) {
  const isOpen = btn.classList.contains('open');
  document.querySelectorAll('.faq-q.open').forEach(q => {
    q.classList.remove('open');
    q.nextElementSibling.classList.remove('open');
  });
  if (!isOpen) {
    btn.classList.add('open');
    btn.nextElementSibling.classList.add('open');
  }
}

// Portfolio — "show more" toggle (mobile only shows 3 of 6 by default)
const portfolioMore = document.getElementById('portfolioMore');
const canvasPortfolio = document.querySelector('.canvas-portfolio');
if (portfolioMore && canvasPortfolio) {
  portfolioMore.addEventListener('click', () => {
    const expanded = canvasPortfolio.classList.toggle('expanded');
    portfolioMore.textContent = expanded ? 'Weniger anzeigen' : 'Weitere Projekte anzeigen';
  });
}

// Capabilities — service tab switcher
const capTabs = document.querySelectorAll('.cap-tab');
const capPanels = document.querySelectorAll('.cap-panel');
capTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const cap = tab.dataset.cap;
    capTabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    capPanels.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    document.querySelector(`.cap-panel[data-panel="${cap}"]`).classList.add('active');
  });
});

// Swipe gesture support (touch drag left/right) for carousels
function enableSwipe(el, onSwipeLeft, onSwipeRight) {
  if (!el) return;
  let startX = 0, startY = 0, tracking = false;

  el.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    tracking = true;
  }, { passive: true });

  el.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const SWIPE_THRESHOLD = 40;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) onSwipeLeft(); else onSwipeRight();
    }
  }, { passive: true });
}

// Highlights Gallery — Apple-style auto-advancing card slider
const hlTrack = document.getElementById('hlTrack');
const hlDots = document.querySelectorAll('.hl-dot');
const hlSlides = document.querySelectorAll('.hl-slide');
const HL_DURATION = 5500;
let hlCurrent = 0;
let hlTimer = null;

function hlGoto(idx) {
  hlCurrent = idx;
  hlTrack.style.transform = `translateX(-${idx * 100}%)`;
  hlDots.forEach((d, i) => d.classList.toggle('active', i === idx));
  hlSlides.forEach((s, i) => s.classList.toggle('playing', i === idx));
  hlDots.forEach((d) => {
    const prog = d.querySelector('.hl-dot-progress');
    prog.style.animation = 'none';
  });
  void hlTrack.offsetWidth;
  const activeProg = hlDots[idx].querySelector('.hl-dot-progress');
  activeProg.style.animation = `hlProgress ${HL_DURATION}ms linear forwards`;
  clearInterval(hlTimer);
  hlTimer = setInterval(() => hlGoto((hlCurrent + 1) % hlDots.length), HL_DURATION);
}

if (hlTrack && hlDots.length) {
  hlDots.forEach(d => d.addEventListener('click', () => hlGoto(parseInt(d.dataset.idx, 10))));
  hlGoto(0);
  enableSwipe(
    document.querySelector('.hl-track-outer'),
    () => hlGoto((hlCurrent + 1) % hlDots.length),
    () => hlGoto((hlCurrent - 1 + hlDots.length) % hlDots.length)
  );
}

// Testimonials — arrow + dot carousel
const tcTrack = document.getElementById('tcTrack');
const tcDots = document.querySelectorAll('.tc-dot');
const tcPrev = document.getElementById('tcPrev');
const tcNext = document.getElementById('tcNext');
let tcCurrent = 0;

function tcGoto(idx) {
  tcCurrent = (idx + tcDots.length) % tcDots.length;
  tcTrack.style.transform = `translateX(-${tcCurrent * 100}%)`;
  tcDots.forEach((d, i) => d.classList.toggle('active', i === tcCurrent));
}

if (tcTrack && tcDots.length) {
  tcDots.forEach(d => d.addEventListener('click', () => tcGoto(parseInt(d.dataset.idx, 10))));
  tcPrev.addEventListener('click', () => tcGoto(tcCurrent - 1));
  tcNext.addEventListener('click', () => tcGoto(tcCurrent + 1));
  tcGoto(0);
  enableSwipe(
    document.querySelector('.tc-viewport'),
    () => tcGoto(tcCurrent + 1),
    () => tcGoto(tcCurrent - 1)
  );
}

// ============================================================
// SITE WAVE BACKGROUND — animated 3D particle wave, fixed behind
// every section below the hero. The canvas itself is pinned via
// position:fixed, so it never scrolls with the page — only the
// wave motion inside it animates in place.
// ============================================================
(function siteWaveBackground() {
  const canvas = document.getElementById('siteWaveBg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const COLS = 46;
  const ROWS = 26;
  const SPEED = 0.012; // radians per frame — slow, gentle swell

  let width = 0, height = 0, dpr = 1;
  let phase = 2.1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    // Base backdrop
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#020904');
    bg.addColorStop(0.55, '#04140b');
    bg.addColorStop(1, '#020603');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Soft ambient glows for atmospheric depth (brand emerald)
    const glow1 = ctx.createRadialGradient(width * 0.22, height * 0.15, 0, width * 0.22, height * 0.15, Math.max(width, height) * 0.5);
    glow1.addColorStop(0, 'rgba(6,78,59,0.35)');
    glow1.addColorStop(1, 'rgba(6,78,59,0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, width, height);

    const glow2 = ctx.createRadialGradient(width * 0.8, height * 0.6, 0, width * 0.8, height * 0.6, Math.max(width, height) * 0.55);
    glow2.addColorStop(0, 'rgba(4,120,87,0.22)');
    glow2.addColorStop(1, 'rgba(4,120,87,0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, width, height);

    // Static 3D wave particle grid (single frozen frame — no time variable).
    // Sized to fill the whole viewport so the wave shape reads clearly no
    // matter which section is scrolled behind the fixed background.
    const horizonY = height * 0.06;
    const floorY = height * 0.98;
    const gridWidth = width * 1.35;

    const rowPoints = [];

    for (let iy = 0; iy < ROWS; iy++) {
      const t = iy / (ROWS - 1); // 0 = far/back, 1 = near/front
      const depth = 0.28 + t * 0.72; // perspective scale
      const rowY = horizonY + t * t * (floorY - horizonY);
      const points = [];

      for (let ix = 0; ix < COLS; ix++) {
        const u = ix / (COLS - 1);
        const wave = Math.sin(ix * 0.35 + phase) * 0.5 + Math.sin(iy * 0.5 + phase * 0.6) * 0.5;

        const x = width / 2 + (u - 0.5) * gridWidth * depth;
        const y = rowY - wave * 40 * depth;
        const brightness = (wave + 1) / 2; // 0..1
        points.push({ x, y, brightness, depth });
      }
      rowPoints.push(points);
    }

    // Faint connecting lines through each row first, to read as a wave mesh
    rowPoints.forEach((points) => {
      ctx.beginPath();
      points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      const avgDepth = points[Math.floor(points.length / 2)].depth;
      ctx.strokeStyle = `rgba(52, 211, 153, ${(0.05 + avgDepth * 0.09).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Particles on top of the mesh — brand green, brighter/bigger at crests
    rowPoints.forEach((points) => {
      points.forEach(({ x, y, brightness, depth }) => {
        if (x < -20 || x > width + 20 || y < -20 || y > height + 20) return;
        const size = (0.9 + brightness * 2.1) * depth;

        // Interpolate brand green: dark emerald (troughs) -> bright mint (crests)
        const r = Math.round(6 + brightness * 46);
        const g = Math.round(40 + brightness * 180);
        const b = Math.round(24 + brightness * 118);
        const alpha = (0.28 + brightness * 0.62) * depth;

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
        ctx.fill();
      });
    });
  }

  function tick() {
    phase += SPEED;
    render();
    requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });

  if (reduceMotion) {
    render();
  } else {
    requestAnimationFrame(tick);
  }
})();

// Form submit — sends the enquiry to SITE_CONFIG.contactEmail via FormSubmit.co
// (statischer Host kann selbst keine Mails senden; FormSubmit leitet weiter).
async function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('submitBtn');
  const errEl = document.getElementById('formError');
  const get = (n) => (form.querySelector(`[name="${n}"]`)?.value || '').trim();

  // Honeypot: von echten Nutzern nie ausgefüllt -> stiller Abbruch bei Bots
  if (get('_honey')) return;

  if (errEl) errEl.style.display = 'none';
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Wird gesendet…';

  try {
    const res = await fetch('https://formsubmit.co/ajax/' + SITE_CONFIG.contactEmail, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        Name: get('name'),
        'Telefon/E-Mail': get('contact'),
        Nachricht: get('message') || '(keine Nachricht angegeben)',
        _subject: 'Neue Anfrage über grazestudio.at',
        _template: 'table',
        _captcha: 'false',
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && (json.success === true || json.success === 'true')) {
      btn.style.display = 'none';
      document.getElementById('formSuccess').style.display = 'block';
      form.reset();
    } else {
      throw new Error(json.message || 'Senden fehlgeschlagen');
    }
  } catch (err) {
    btn.disabled = false;
    btn.textContent = originalText;
    if (errEl) errEl.style.display = 'block';
  }
}
