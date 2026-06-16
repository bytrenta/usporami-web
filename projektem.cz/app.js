/* ===========================================================
   ÚSPORAMI.CZ — APP JS
   Reveal on scroll · animated counters · calc · FAQ · nav
   =========================================================== */

(function () {
  'use strict';

  /* ---------- NAV scroll state ---------- */
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => {
      if (window.scrollY > 24) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  /* ---------- Animated counters ---------- */
  function animateCounter(el) {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const duration = parseInt(el.dataset.duration || '1500', 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    if (isNaN(target)) return;
    const start = performance.now();
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const value = target * easeOut(t);
      const formatted = decimals > 0
        ? value.toFixed(decimals).replace('.', ',')
        : Math.round(value).toLocaleString('cs-CZ');
      el.textContent = prefix + formatted + suffix;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  const countEls = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window) {
    const ioCount = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          ioCount.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    countEls.forEach((el) => ioCount.observe(el));
  } else {
    countEls.forEach(animateCounter);
  }

  /* ---------- Calculator (hero side) ---------- */
  const calc = document.querySelector('[data-calc]');
  if (calc) {
    const state = {
      type: calc.dataset.defaultType || 'rd',
      area: parseInt(calc.dataset.defaultArea || '120', 10),
      scope: calc.dataset.defaultScope || 'comprehensive',
    };

    // Subsidy estimates (CZK, rough averages)
    const TYPE_BASE = {
      rd: 1.0,         // rodinný dům
      bd: 1.45,        // bytový dům
      podnik: 1.8,     // podnikatel/firma
      obec: 2.2,       // obec/instituce
    };
    const SCOPE_FACTOR = {
      partial: 1500,        // dílčí (1 opatření)
      comprehensive: 3500,  // komplexní renovace
      newbuild: 6000,       // novostavba pasiv
    };

    function compute() {
      const base = (TYPE_BASE[state.type] || 1) * (SCOPE_FACTOR[state.scope] || 0) * (state.area || 1);
      // tweak by area (diminishing for very large)
      const final = base * (state.area > 500 ? 0.85 : 1);
      const numEl = calc.querySelector('[data-calc-num]');
      if (numEl) {
        const start = parseFloat(numEl.dataset.current || '0');
        const target = Math.round(final / 1000) * 1000;
        const dur = 600;
        const t0 = performance.now();
        const easeOut = (t) => 1 - Math.pow(1 - t, 3);
        function step(now) {
          const t = Math.min(1, (now - t0) / dur);
          const v = start + (target - start) * easeOut(t);
          numEl.textContent = Math.round(v).toLocaleString('cs-CZ');
          if (t < 1) requestAnimationFrame(step);
          else numEl.dataset.current = target;
        }
        requestAnimationFrame(step);
      }
    }

    // Bind type buttons
    calc.querySelectorAll('[data-calc-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        calc.querySelectorAll('[data-calc-type]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.type = btn.dataset.calcType;
        compute();
      });
    });
    calc.querySelectorAll('[data-calc-scope]').forEach((btn) => {
      btn.addEventListener('click', () => {
        calc.querySelectorAll('[data-calc-scope]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.scope = btn.dataset.calcScope;
        compute();
      });
    });
    calc.querySelectorAll('[data-calc-area]').forEach((btn) => {
      btn.addEventListener('click', () => {
        calc.querySelectorAll('[data-calc-area]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.area = parseInt(btn.dataset.calcArea, 10);
        compute();
      });
    });

    // Initial computation
    setTimeout(compute, 400);
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-item').forEach((item) => {
    const q = item.querySelector('.faq-q');
    if (!q) return;
    q.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // close siblings (single-open mode)
      item.parentElement.querySelectorAll('.faq-item.open').forEach((sib) => {
        if (sib !== item) sib.classList.remove('open');
      });
      item.classList.toggle('open', !isOpen);
    });
  });

  /* ---------- Smooth-scroll for nav anchors ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ---------- Subtle parallax for hero pattern ---------- */
  const heroPattern = document.querySelector('.hero-bg-pattern');
  if (heroPattern) {
    window.addEventListener('scroll', () => {
      const y = Math.min(window.scrollY * 0.18, 80);
      heroPattern.style.transform = `translate3d(0, ${y}px, 0)`;
    }, { passive: true });
  }
})();
