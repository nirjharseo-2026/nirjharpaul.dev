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

  // 2. Scroll-Linked Frame Scrubbing Engine
  const heroCard = document.querySelector('.hero-card');

  function updateScrollProgress() {
    if (!heroCard) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const heroHeight = heroCard.offsetHeight;
    const windowHeight = window.innerHeight;

    // Calculate how far down the hero card has been scrolled through
    // Start scrubbing from top of hero (0) to when hero bottom leaves viewport
    const totalDistance = heroHeight + windowHeight;
    const progressRatio = Math.max(0, Math.min(1, scrollTop / (heroHeight * 1.2)));

    // Drive canvas animation engine target frame
    animationEngine.setTargetProgress(progressRatio);

    // Navbar scrolled state toggle
    if (scrollTop > 50) {
      navbar?.classList.add('scrolled');
    } else {
      navbar?.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  updateScrollProgress(); // Initial check

  // 3. Custom Cursor Follower Engine
  let mouseX = 0, mouseY = 0;
  let followerX = 0, followerY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

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

  // Add cursor hover scaling for interactive elements
  const interactables = document.querySelectorAll('a, button, .project-card, .pill-card, input, textarea');
  interactables.forEach(item => {
    item.addEventListener('mouseenter', () => document.body.classList.add('hovering-interactive'));
    item.addEventListener('mouseleave', () => document.body.classList.remove('hovering-interactive'));
  });

  // 4. Contact Modal Logic
  openModalBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
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

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('userName');
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
