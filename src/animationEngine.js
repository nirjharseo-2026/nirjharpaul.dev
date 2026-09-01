/* ==========================================================================
   HIGH-PERFORMANCE ADAPTIVE CANVAS ANIMATION ENGINE (MOBILE & DESKTOP)
   ========================================================================== */

export class CanvasAnimationEngine {
  constructor(canvasElement, totalFrames = 240, framePathPattern = '/frames/frame_{index}.jpg') {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.totalFrames = totalFrames;
    this.framePathPattern = framePathPattern;

    // Device detection & adaptive loading parameters
    this.isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0);
    // On mobile, load every 3rd frame (80 frames total = ~2.4MB payload vs 67MB)
    // On desktop, load keyframes (every 2nd frame) first, then backfill remaining
    this.frameStep = this.isMobile ? 3 : 2;

    this.images = new Array(this.totalFrames);
    this.loadedFramesMap = new Map(); // Index -> HTMLImageElement
    this.loadedCount = 0;
    this.isLoaded = false;

    // Animation state
    this.currentFrame = 1;
    this.targetFrame = 1;
    this.lerpFactor = this.isMobile ? 0.18 : 0.12; // Snappier on touch devices
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
    this.dpr = 1;

    // Callbacks
    this.onProgress = null;
    this.onLoaded = null;

    this.init();
  }

  init() {
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize(), { passive: true });

    // Track mouse movement only if desktop pointer
    if (!this.isMobile) {
      window.addEventListener('mousemove', (e) => {
        this.targetMouseX = (e.clientX / window.innerWidth - 0.5) * 15;
        this.targetMouseY = (e.clientY / window.innerHeight - 0.5) * 15;
      }, { passive: true });
    }

    // Start RAF render loop
    this.renderLoop();
  }

  handleResize() {
    const parent = this.canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    this.width = rect.width || window.innerWidth;
    this.height = rect.height || window.innerHeight;

    // Cap DPR at 1.5 on mobile for GPU fill-rate efficiency, 2 on desktop
    this.dpr = Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.5 : 2);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);

    // Redraw current frame
    this.drawFrame(Math.round(this.currentFrame));
  }

  loadFrames(onProgress, onLoaded) {
    this.onProgress = onProgress;
    this.onLoaded = onLoaded;

    // 1. Instantly load Frame 1 first for zero delay
    const firstImg = new Image();
    firstImg.fetchPriority = 'high';
    const firstFrameStr = String(1).padStart(5, '0');
    firstImg.src = this.framePathPattern.replace('{index}', firstFrameStr);
    firstImg.onload = () => {
      this.images[0] = firstImg;
      this.loadedFramesMap.set(1, firstImg);
      this.loadedCount++;
      this.drawFrame(1);
      if (this.onProgress) this.onProgress(10, 1, this.totalFrames);
      
      // Start batch loading remaining frames
      this.startBatchLoading();
    };
    firstImg.onerror = () => {
      this.startBatchLoading();
    };
  }

  startBatchLoading() {
    // Collect frame indices to load based on frameStep
    const primaryIndices = [];
    const secondaryIndices = [];

    for (let i = 1; i <= this.totalFrames; i++) {
      if (i === 1) continue; // Already loaded
      if ((i - 1) % this.frameStep === 0 || i === this.totalFrames) {
        primaryIndices.push(i);
      } else {
        secondaryIndices.push(i);
      }
    }

    const totalToLoad = primaryIndices.length + (this.isMobile ? 0 : secondaryIndices.length);

    const loadSingleFrame = (index, callback) => {
      const img = new Image();
      img.decoding = 'async';
      const frameStr = String(index).padStart(5, '0');
      img.src = this.framePathPattern.replace('{index}', frameStr);

      img.onload = () => {
        this.images[index - 1] = img;
        this.loadedFramesMap.set(index, img);
        this.loadedCount++;

        const progress = Math.min(Math.round((this.loadedCount / totalToLoad) * 100), 100);
        if (this.onProgress) {
          this.onProgress(progress, this.loadedCount, totalToLoad);
        }

        if (this.loadedCount >= totalToLoad) {
          this.isLoaded = true;
          if (this.onLoaded) this.onLoaded();
        }
        if (callback) callback();
      };

      img.onerror = () => {
        this.loadedCount++;
        if (callback) callback();
      };
    };

    // Staggered batch loading (5 images per batch) to prevent network thread lock
    let batchIndex = 0;
    const processBatch = (indicesList, onComplete) => {
      if (batchIndex >= indicesList.length) {
        if (onComplete) onComplete();
        return;
      }

      const batch = indicesList.slice(batchIndex, batchIndex + 6);
      batchIndex += 6;
      let completedInBatch = 0;

      batch.forEach(idx => {
        loadSingleFrame(idx, () => {
          completedInBatch++;
          if (completedInBatch === batch.length) {
            // Process next batch after small macro-task delay
            if (window.requestIdleCallback) {
              window.requestIdleCallback(() => processBatch(indicesList, onComplete));
            } else {
              setTimeout(() => processBatch(indicesList, onComplete), 10);
            }
          }
        });
      });
    };

    // Process primary keyframes first
    processBatch(primaryIndices, () => {
      // If desktop and secondary frames exist, load them in background idle time
      if (!this.isMobile && secondaryIndices.length > 0) {
        batchIndex = 0;
        processBatch(secondaryIndices, null);
      }
    });
  }

  setTargetProgress(progressRatio) {
    const clampedRatio = Math.max(0, Math.min(1, progressRatio));
    this.targetFrame = Math.max(1, Math.min(this.totalFrames, 1 + clampedRatio * (this.totalFrames - 1)));

    this.isScrolling = true;
    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false;
    }, 150);
  }

  renderLoop() {
    const delta = this.targetFrame - this.currentFrame;
    this.currentFrame += delta * this.lerpFactor;

    if (!this.isMobile) {
      this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
      this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;
    }

    if (!this.isScrolling && Math.abs(delta) < 0.1 && !this.isMobile) {
      this.idleTime += 0.02;
      this.currentFrame += Math.sin(this.idleTime) * 0.04;
    }

    this.currentFrame = Math.max(1, Math.min(this.totalFrames, this.currentFrame));
    const frameToDraw = Math.round(this.currentFrame);
    this.drawFrame(frameToDraw);

    requestAnimationFrame(() => this.renderLoop());
  }

  getNearestLoadedImage(frameIndex) {
    if (this.images[frameIndex - 1]?.complete && this.images[frameIndex - 1]?.naturalWidth > 0) {
      return this.images[frameIndex - 1];
    }

    // Search outwards from frameIndex to find nearest available frame
    for (let offset = 1; offset < this.totalFrames; offset++) {
      const prevIdx = frameIndex - offset;
      const nextIdx = frameIndex + offset;

      if (prevIdx >= 1 && this.images[prevIdx - 1]?.complete && this.images[prevIdx - 1]?.naturalWidth > 0) {
        return this.images[prevIdx - 1];
      }
      if (nextIdx <= this.totalFrames && this.images[nextIdx - 1]?.complete && this.images[nextIdx - 1]?.naturalWidth > 0) {
        return this.images[nextIdx - 1];
      }
    }

    return null;
  }

  drawFrame(frameIndex) {
    const img = this.getNearestLoadedImage(frameIndex);
    if (!img) return;

    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    // Cover math: fit 1280x720/1920x1080 image to canvas container smoothly
    const imgW = img.naturalWidth || 1280;
    const imgH = img.naturalHeight || 720;
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

    const parallaxX = this.isMobile ? 0 : this.mouseX * this.dpr;
    const parallaxY = this.isMobile ? 0 : this.mouseY * this.dpr;

    ctx.drawImage(img, offsetX + parallaxX, offsetY + parallaxY, drawW, drawH);
  }
}
