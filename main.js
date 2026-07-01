// Navbar scroll
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

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

// Burger
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');
burger.addEventListener('click', () => mobileMenu.classList.toggle('open'));
document.querySelectorAll('.mob-link').forEach(l => l.addEventListener('click', () => mobileMenu.classList.remove('open')));

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

// Reveal + counter on scroll
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    setTimeout(() => {
      el.classList.add('visible');
      el.querySelectorAll('.counter').forEach(c => animateCounter(c));
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

// Masonry card background fix — apply gradient via CSS var
document.querySelectorAll('.masonry-card').forEach(card => {
  const bg = card.style.getPropertyValue('--card-bg');
  if (bg) card.style.background = bg;
});

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
}

// Browser Showcase — project switcher
const scTabs = document.querySelectorAll('.sc-tab');
const bScenes = document.querySelectorAll('.browser-scene');
const browserUrlText = document.getElementById('browserUrlText');

scTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const proj = tab.dataset.project;
    scTabs.forEach(t => t.classList.remove('active'));
    bScenes.forEach(s => s.classList.remove('active'));
    tab.classList.add('active');
    document.querySelector(`.browser-scene[data-project="${proj}"]`).classList.add('active');
    if (browserUrlText) browserUrlText.textContent = tab.dataset.url;
  });
});

// Form submit
function handleSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Wird gesendet…';
  setTimeout(() => {
    btn.style.display = 'none';
    document.getElementById('formSuccess').style.display = 'block';
    e.target.reset();
  }, 1200);
}
