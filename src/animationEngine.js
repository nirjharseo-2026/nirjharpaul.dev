/* ==========================================================================
   ULTRA-SMOOTH CANVAS FRAME ANIMATION ENGINE (240 FPS SEQUENCE)
   ========================================================================== */

export class CanvasAnimationEngine {
  constructor(canvasElement, totalFrames = 240, framePathPattern = '/frames/frame_{index}.jpg') {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.totalFrames = totalFrames;
    this.framePathPattern = framePathPattern;

    this.images = [];
    this.loadedCount = 0;
    this.isLoaded = false;

    // Animation state
    this.currentFrame = 1;
    this.targetFrame = 1;
    this.lerpFactor = 0.12; // Smooth inertia factor
    this.idleTime = 0;
    this.isScrolling = false;
    this.scrollTimeout = null;

    // Parallax mouse offsets
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetMouseX = 0;
    this.targetMouseY = 0;

    // Canvas sizing
    this.width = 0;
    this.height = 0;
    this.dpr = window.devicePixelRatio || 1;

    // Callbacks
    this.onProgress = null;
    this.onLoaded = null;

    this.init();
  }

  init() {
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
    
    // Track mouse movement over window for subtle parallax
    window.addEventListener('mousemove', (e) => {
      this.targetMouseX = (e.clientX / window.innerWidth - 0.5) * 15;
      this.targetMouseY = (e.clientY / window.innerHeight - 0.5) * 15;
    });

    // Touch movement tracking for mobile devices
    window.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        this.targetMouseX = (e.touches[0].clientX / window.innerWidth - 0.5) * 10;
        this.targetMouseY = (e.touches[0].clientY / window.innerHeight - 0.5) * 10;
      }
    }, { passive: true });

    // Start RAF render loop
    this.renderLoop();
  }

  handleResize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for performance
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;

    // Redraw current frame
    if (this.images[Math.round(this.currentFrame) - 1]?.complete) {
      this.drawFrame(Math.round(this.currentFrame));
    }
  }

  loadFrames(onProgress, onLoaded) {
    this.onProgress = onProgress;
    this.onLoaded = onLoaded;

    const firstBatchCount = 20;

    // Load first batch with high priority
    for (let i = 1; i <= this.totalFrames; i++) {
      const img = new Image();
      const frameIndexString = String(i).padStart(5, '0');
      img.src = this.framePathPattern.replace('{index}', frameIndexString);

      img.onload = () => {
        this.loadedCount++;
        const progress = Math.min(Math.round((this.loadedCount / this.totalFrames) * 100), 100);

        if (this.onProgress) {
          this.onProgress(progress, this.loadedCount, this.totalFrames);
        }

        if (this.loadedCount === 1) {
          // Draw first frame instantly
          this.drawFrame(1);
        }

        if (this.loadedCount === this.totalFrames) {
          this.isLoaded = true;
          if (this.onLoaded) this.onLoaded();
        }
      };

      this.images.push(img);
    }
  }

  setTargetProgress(progressRatio) {
    // Clamp progress between 0 and 1
    const clampedRatio = Math.max(0, Math.min(1, progressRatio));
    // Calculate target frame (1 to totalFrames)
    this.targetFrame = Math.max(1, Math.min(this.totalFrames, 1 + clampedRatio * (this.totalFrames - 1)));

    this.isScrolling = true;
    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false;
    }, 200);
  }

  renderLoop() {
    // Lerp currentFrame towards targetFrame for butter-smooth animation
    const delta = this.targetFrame - this.currentFrame;
    this.currentFrame += delta * this.lerpFactor;

    // Smooth mouse parallax lerp
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

    // Idle micro animation when user is stationary
    if (!this.isScrolling && Math.abs(delta) < 0.1) {
      this.idleTime += 0.02;
      // Oscillate frame subtly (+/- 0.8 frames) to simulate lifelike breathing
      this.currentFrame += Math.sin(this.idleTime) * 0.05;
    }

    // Clamp currentFrame
    this.currentFrame = Math.max(1, Math.min(this.totalFrames, this.currentFrame));

    // Draw frame
    const frameToDraw = Math.round(this.currentFrame);
    this.drawFrame(frameToDraw);

    requestAnimationFrame(() => this.renderLoop());
  }

  drawFrame(frameIndex) {
    const img = this.images[frameIndex - 1];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    ctx.clearRect(0, 0, cw, ch);

    // Cover math: fit 1920x1080 image to canvas container smoothly
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    const imgRatio = imgW / imgH;
    const canvasRatio = cw / ch;

    let drawW, drawH, offsetX, offsetY;

    if (canvasRatio > imgRatio) {
      drawW = cw;
      drawH = cw / imgRatio;
      offsetX = 0;
      offsetY = (ch - drawH) / 2;
    } else {
      drawH = ch;
      drawW = ch * imgRatio;
      offsetX = (cw - drawW) / 2;
      offsetY = 0;
    }

    // Apply mouse parallax displacement offset
    const parallaxX = this.mouseX * this.dpr;
    const parallaxY = this.mouseY * this.dpr;

    ctx.drawImage(img, offsetX + parallaxX, offsetY + parallaxY, drawW, drawH);
  }
}
