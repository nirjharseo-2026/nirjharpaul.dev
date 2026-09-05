/* ==========================================================================
   MAIN APPLICATION LOGIC & INTERACTION CONTROLLER (FAST LOADING OPTIMIZED)
   ========================================================================== */

import { CanvasAnimationEngine } from './animationEngine.js';

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const canvasElement = document.getElementById('heroCanvas');
  const loaderScreen = document.getElementById('loaderScreen');
  const loaderBar = document.getElementById('loaderBar');
  const loaderText = document.getElementById('loaderText');

  const cursorDot = document.getElementById('cursor');
  const cursorFollower = document.getElementById('cursorFollower');
  const navbar = document.getElementById('navbar');

  const contactModal = document.getElementById('contactModal');
  const modalCloseBtn = document.getElementById('modalClose');
  const openModalBtns = document.querySelectorAll('.open-modal-btn');
  const contactForm = document.getElementById('contactForm');

  const navToggleBtn = document.getElementById('navToggleBtn');
  const mobileNav = document.getElementById('mobileNav');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;

  // Hide custom cursor elements on touch devices to save mobile CPU
  if (isTouchDevice) {
    if (cursorDot) cursorDot.style.display = 'none';
    if (cursorFollower) cursorFollower.style.display = 'none';
  }

  // Mobile Navigation Drawer Toggle
  if (navToggleBtn && mobileNav) {
    navToggleBtn.addEventListener('click', () => {
      navToggleBtn.classList.toggle('active');
      mobileNav.classList.toggle('active');
      document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
    });

    mobileNavLinks.forEach(link => {
      link.addEventListener('click', () => {
        navToggleBtn.classList.remove('active');
        mobileNav.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  // 1. Initialize Canvas Animation Engine
  const animationEngine = new CanvasAnimationEngine(canvasElement, 240, '/frames/frame_{index}.jpg');

  let loaderHidden = false;
  const hideLoader = () => {
    if (loaderHidden) return;
    loaderHidden = true;
    if (loaderScreen) {
      loaderScreen.classList.add('fade-out');
      setTimeout(() => {
        loaderScreen.style.display = 'none';
      }, 500);
    }
  };

  // Preload frames with progress handler
  animationEngine.loadFrames(
    (progress, loadedCount, totalFrames) => {
      if (loaderBar) loaderBar.style.width = `${progress}%`;
      if (loaderText) loaderText.textContent = `Loading ${progress}%`;

      // Hide loader instantly when initial frame batch (e.g. 10% progress) is ready
      if (progress >= 10 || loadedCount >= 5) {
        hideLoader();
      }
    },
    () => {
      hideLoader();
    }
  );

  // Fallback: Ensure loader screen hides after maximum 800ms regardless of connection
  setTimeout(hideLoader, 800);

  // 2. Full-Page Cinematic Frame Scrubbing Engine (RAF Throttled)
  let ticking = false;
  function updateScrollProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const maxScrollable = document.documentElement.scrollHeight - window.innerHeight;
    
    const progressRatio = maxScrollable > 0 ? Math.max(0, Math.min(1, scrollTop / maxScrollable)) : 0;
    animationEngine.setTargetProgress(progressRatio);

    // Navbar scrolled state toggle
    if (scrollTop > 40) {
      navbar?.classList.add('scrolled');
    } else {
      navbar?.classList.remove('scrolled');
    }

    // Scroll Spy for Navigation Links
    const sections = document.querySelectorAll('section[id]');
    let currentSectionId = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      const sectionHeight = section.offsetHeight;
      if (scrollTop >= sectionTop && scrollTop < sectionTop + sectionHeight) {
        currentSectionId = section.getAttribute('id');
      }
    });

    if (currentSectionId) {
      const desktopNavLinks = document.querySelectorAll('.nav-links a');
      desktopNavLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${currentSectionId}`);
      });
      mobileNavLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${currentSectionId}`);
      });
    }

    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateScrollProgress);
      ticking = true;
    }
  }, { passive: true });

  updateScrollProgress();

  // 3. Scroll Reveal Observer for Cinematic Section Entrance
  const revealElements = document.querySelectorAll('.project-card, .capabilities-wrapper, .cta-banner, .stat-item, .portfolio-card');
  revealElements.forEach(el => el.classList.add('reveal-on-scroll'));

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  revealElements.forEach(el => revealObserver.observe(el));

  // 3b. Interactive Portfolio Filter Logic
  const filterBtns = document.querySelectorAll('.filter-btn');
  const portfolioCards = document.querySelectorAll('.portfolio-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterVal = btn.getAttribute('data-filter');

      portfolioCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filterVal === 'all' || category === filterVal) {
          card.classList.remove('filtered-out');
        } else {
          card.classList.add('filtered-out');
        }
      });
    });
  });

  // 4. Custom Cursor Follower (Desktop Only)
  if (!isTouchDevice) {
    let mouseX = 0, mouseY = 0;
    let followerX = 0, followerY = 0;
    let hasMovedMouse = false;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!hasMovedMouse) {
        hasMovedMouse = true;
        if (cursorDot) cursorDot.style.opacity = '1';
        if (cursorFollower) cursorFollower.style.opacity = '1';
      }

      if (cursorDot) {
        cursorDot.style.left = `${mouseX}px`;
        cursorDot.style.top = `${mouseY}px`;
      }
    }, { passive: true });

    function animateCursor() {
      followerX += (mouseX - followerX) * 0.15;
      followerY += (mouseY - followerY) * 0.15;

      if (cursorFollower) {
        cursorFollower.style.left = `${followerX}px`;
        cursorFollower.style.top = `${followerY}px`;
      }

      requestAnimationFrame(animateCursor);
    }
    animateCursor();

    document.body.addEventListener('mouseover', (e) => {
      if (e.target.closest('a, button, .project-card, .pill-card, input, textarea')) {
        document.body.classList.add('hovering-interactive');
      }
    }, { passive: true });

    document.body.addEventListener('mouseout', (e) => {
      if (e.target.closest('a, button, .project-card, .pill-card, input, textarea')) {
        document.body.classList.remove('hovering-interactive');
      }
    }, { passive: true });
  }

  // 5. Contact Modal Logic & Accessibility
  openModalBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      navToggleBtn?.classList.remove('active');
      mobileNav?.classList.remove('active');
      document.body.style.overflow = '';
      contactModal?.classList.add('active');
    });
  });

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      contactModal?.classList.remove('active');
    });
  }

  if (contactModal) {
    contactModal.addEventListener('click', (e) => {
      if (e.target === contactModal) {
        contactModal.classList.remove('active');
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && contactModal?.classList.contains('active')) {
      contactModal.classList.remove('active');
    }
  });

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = contactForm.querySelector('button[type="submit"]');

      if (submitBtn) {
        submitBtn.textContent = '✓ Message Sent!';
        submitBtn.style.background = '#10B981';
      }

      setTimeout(() => {
        contactModal?.classList.remove('active');
        if (contactForm) contactForm.reset();
        if (submitBtn) {
          submitBtn.textContent = 'Send Message ↗';
          submitBtn.style.background = '';
        }
      }, 1500);
    });
  }
});
