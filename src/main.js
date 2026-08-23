/* ==========================================================================
   MAIN APPLICATION LOGIC & INTERACTION CONTROLLER
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

  // Preload frames with progress handler
  animationEngine.loadFrames(
    (progress, loadedCount, totalFrames) => {
      // Update progress bar
      if (loaderBar) loaderBar.style.width = `${progress}%`;
      if (loaderText) loaderText.textContent = `Loading Frames ${progress}%`;

      // Hide loader once initial batch (e.g. 15% or 36 frames) is ready for immediate playback
      if (loadedCount >= 36 && loaderScreen && !loaderScreen.classList.contains('fade-out')) {
        setTimeout(() => {
          loaderScreen.classList.add('fade-out');
        }, 300);
      }
    },
    () => {
      // All 240 frames fully loaded into memory!
      console.log('All 240 frames loaded into memory cleanly.');
      if (loaderScreen && !loaderScreen.classList.contains('fade-out')) {
        loaderScreen.classList.add('fade-out');
      }
    }
  );

  // 2. Full-Page Cinematic Frame Scrubbing Engine
  function updateScrollProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const maxScrollable = document.documentElement.scrollHeight - window.innerHeight;
    
    // Scrub 240-frame 3D fluid movement animation smoothly from 0% to 100% across the full page height
    const progressRatio = maxScrollable > 0 ? Math.max(0, Math.min(1, scrollTop / maxScrollable)) : 0;

    // Drive canvas animation engine target frame
    animationEngine.setTargetProgress(progressRatio);

    // Navbar scrolled state toggle
    if (scrollTop > 50) {
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
  }

  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  updateScrollProgress(); // Initial check

  // 3. Scroll Reveal Observer for Cinematic Section Entrance
  const revealElements = document.querySelectorAll('.project-card, .capabilities-wrapper, .cta-banner, .stat-item');
  revealElements.forEach(el => el.classList.add('reveal-on-scroll'));

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealElements.forEach(el => revealObserver.observe(el));

  // 4. Custom Cursor Follower Engine with Event Delegation
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
  });

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

  // Hover scaling using event delegation
  document.body.addEventListener('mouseover', (e) => {
    if (e.target.closest('a, button, .project-card, .pill-card, input, textarea')) {
      document.body.classList.add('hovering-interactive');
    }
  });

  document.body.addEventListener('mouseout', (e) => {
    if (e.target.closest('a, button, .project-card, .pill-card, input, textarea')) {
      document.body.classList.remove('hovering-interactive');
    }
  });

  // 5. Contact Modal Logic & Keyboard Accessibility
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
