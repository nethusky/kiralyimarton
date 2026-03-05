/* ═══════════════════════════════════════
   Királyi Márton — Interactivity & Particle System
   ═══════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Header scroll state ────────────── */
  const header = document.getElementById('header');
  let lastScroll = 0;

  function onScroll() {
    const y = window.scrollY;
    if (y > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    lastScroll = y;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Mobile navigation ──────────────── */
  const navToggle = document.querySelector('.nav-toggle');
  const mobileNav = document.getElementById('mobileNav');

  if (navToggle && mobileNav) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('active');
      mobileNav.classList.toggle('open');
      document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
    });

    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── Smooth scroll for anchor links ─── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = header.offsetHeight;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  /* ── Scroll reveal (IntersectionObserver) ── */
  const animEls = document.querySelectorAll('[data-anim]');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = parseInt(entry.target.dataset.delay) || 0;
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, delay);
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  });

  animEls.forEach(el => revealObserver.observe(el));

  /* ══════════════════════════════════════
     ORGANIC PARTICLE / FROST PATTERN ANIMATION
     ──────────────────────────────────────
     Inspired by the thermal expansion patterns
     seen on car windshield edges — a branching,
     crystalline network of connected nodes that
     reacts organically to mouse movement.
     ══════════════════════════════════════ */

  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H;
  let mouse = { x: -9999, y: -9999, active: false };
  let particles = [];
  let animFrameId;

  const CONFIG = {
    particleCount: 160,
    connectDistance: 140,
    mouseRadius: 220,
    mouseRepelStrength: 0.06,
    returnStrength: 0.012,
    friction: 0.94,
    baseSpeed: 0.15,
    lineOpacityMax: 0.216,
    particleOpacityMax: 0.6,
    rightBias: 0.65,
    branchProbability: 0.4,
  };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      const rightBias = Math.random() < CONFIG.rightBias;
      if (rightBias) {
        this.homeX = W * (0.45 + Math.random() * 0.55);
      } else {
        this.homeX = Math.random() * W;
      }
      this.homeY = Math.random() * H;

      this.x = this.homeX + (Math.random() - 0.5) * 40;
      this.y = this.homeY + (Math.random() - 0.5) * 40;
      this.vx = (Math.random() - 0.5) * CONFIG.baseSpeed;
      this.vy = (Math.random() - 0.5) * CONFIG.baseSpeed;

      this.size = 1 + Math.random() * 2;
      this.opacity = 0.15 + Math.random() * 0.35;
      this.pulseSpeed = 0.003 + Math.random() * 0.006;
      this.pulseOffset = Math.random() * Math.PI * 2;
      this.driftAngle = Math.random() * Math.PI * 2;
      this.driftSpeed = 0.0003 + Math.random() * 0.001;
      this.seed = Math.random() * 1000;
    }
  }

  function initParticles() {
    particles = [];
    const count = Math.min(CONFIG.particleCount, Math.floor((W * H) / 6000));
    for (let i = 0; i < count; i++) {
      particles.push(new Particle());
    }
  }

  function updateParticles(time) {
    for (const p of particles) {
      p.driftAngle += p.driftSpeed;
      const driftX = Math.cos(p.driftAngle) * 0.08;
      const driftY = Math.sin(p.driftAngle * 1.3) * 0.06;

      const dx = p.homeX - p.x;
      const dy = p.homeY - p.y;
      p.vx += dx * CONFIG.returnStrength + driftX;
      p.vy += dy * CONFIG.returnStrength + driftY;

      if (mouse.active) {
        const mx = p.x - mouse.x;
        const my = p.y - mouse.y;
        const dist = Math.sqrt(mx * mx + my * my);
        if (dist < CONFIG.mouseRadius && dist > 1) {
          const force = (1 - dist / CONFIG.mouseRadius) * CONFIG.mouseRepelStrength;
          p.vx += (mx / dist) * force * 60;
          p.vy += (my / dist) * force * 60;
        }
      }

      p.vx *= CONFIG.friction;
      p.vy *= CONFIG.friction;
      p.x += p.vx;
      p.y += p.vy;

      p.currentOpacity = p.opacity * (0.6 + 0.4 * Math.sin(time * p.pulseSpeed + p.pulseOffset));
    }
  }

  function drawConnections() {
    const maxDist = CONFIG.connectDistance;
    const maxDist2 = maxDist * maxDist;

    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      let connections = 0;

      for (let j = i + 1; j < particles.length; j++) {
        if (connections > 4) break;

        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;

        if (d2 < maxDist2) {
          const d = Math.sqrt(d2);
          const alpha = (1 - d / maxDist);

          let branchAlpha = alpha * CONFIG.lineOpacityMax;

          if (mouse.active) {
            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2;
            const mx = midX - mouse.x;
            const my = midY - mouse.y;
            const mouseDist = Math.sqrt(mx * mx + my * my);
            if (mouseDist < CONFIG.mouseRadius * 1.2) {
              const glow = 1 + (1 - mouseDist / (CONFIG.mouseRadius * 1.2)) * 2.5;
              branchAlpha = Math.min(branchAlpha * glow, 0.45);
            }
          }

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);

          const seedVal = a.seed + b.seed;
          const useCurve = (seedVal % 1) < CONFIG.branchProbability && d > maxDist * 0.3;
          if (useCurve) {
            const curveOffX = Math.sin(seedVal * 7.3) * 14;
            const curveOffY = Math.cos(seedVal * 5.1) * 14;
            const midX = (a.x + b.x) / 2 + curveOffX;
            const midY = (a.y + b.y) / 2 + curveOffY;
            ctx.quadraticCurveTo(midX, midY, b.x, b.y);
          } else {
            ctx.lineTo(b.x, b.y);
          }

          ctx.strokeStyle = `rgba(255, 255, 255, ${branchAlpha})`;
          ctx.lineWidth = alpha * 1.2;
          ctx.stroke();

          connections++;
        }
      }
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${p.currentOpacity * CONFIG.particleOpacityMax})`;
      ctx.fill();

      if (p.size > 1.5) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.currentOpacity * 0.04})`;
        ctx.fill();
      }
    }
  }

  function animate(time) {
    ctx.clearRect(0, 0, W, H);
    updateParticles(time);
    drawConnections();
    drawParticles();
    animFrameId = requestAnimationFrame(animate);
  }

  function init() {
    resize();
    initParticles();
    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame(animate);
  }

  /* Only run the particle system when hero is visible */
  const heroSection = document.getElementById('hero');
  let particlesRunning = false;

  const heroObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !particlesRunning) {
        init();
        particlesRunning = true;
      } else if (!entry.isIntersecting && particlesRunning) {
        if (animFrameId) cancelAnimationFrame(animFrameId);
        particlesRunning = false;
      }
    });
  }, { threshold: 0.05 });

  if (heroSection) heroObserver.observe(heroSection);

  /* Mouse tracking on the hero */
  heroSection.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  });

  heroSection.addEventListener('mouseleave', () => {
    mouse.active = false;
  });

  /* Touch support */
  heroSection.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.touches[0].clientX - rect.left;
      mouse.y = e.touches[0].clientY - rect.top;
      mouse.active = true;
    }
  }, { passive: true });

  heroSection.addEventListener('touchend', () => {
    mouse.active = false;
  });

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (particlesRunning) {
        resize();
        initParticles();
      }
    }, 200);
  });

})();

/* Hero card scroll functions */
function scrollToCard(cardId) {
  const header = document.getElementById('header');
  const target = document.getElementById(cardId);
  if (target && header) {
    const offset = header.offsetHeight;
    const top = target.getBoundingClientRect().top + window.scrollY - offset - 20;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}

function scrollToAlkalmi() {
  scrollToCard('alkalmi-ora');
}

function scrollToHetes() {
  scrollToCard('hetes-csomag');
}

function scrollToIntenziv() {
  scrollToCard('intenziv-felkeszules');
}

/* ── Hero video playback safeguard ──── */
const heroVideo = document.getElementById('heroVideo');
if (heroVideo) {
  heroVideo.play().catch(() => {});
}
