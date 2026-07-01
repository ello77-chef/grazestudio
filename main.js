// Navbar scroll
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

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
