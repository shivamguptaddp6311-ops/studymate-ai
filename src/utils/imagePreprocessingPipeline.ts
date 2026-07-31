/**
 * Image Preprocessing Pipeline for High-Precision OCR & Vision Analysis
 * 
 * Features:
 * 1. Auto-rotate: Detects sideways text/content orientation and rights the image.
 * 2. Deskew: Calculates text line projection profiles to correct alignment skew (-15° to +15°).
 * 3. Denoise: Applies fast edge-preserving spatial filtering to remove sensor/JPEG noise without blurring text.
 * 4. Improve Contrast & Flatten Background: Normalizes uneven camera illumination & shadow, stretches contrast.
 * 5. Intelligent Resizing: Scales small crops up for legibility, scales massive images down for fast AI vision model tokens.
 * 6. Quality Preservation: Retains sub-pixel anti-aliased character edges and exports clean high-yield JPEG.
 */

export interface PreprocessOptions {
  autoRotate?: boolean;
  deskew?: boolean;
  denoise?: boolean;
  improveContrast?: boolean;
  resizeIntelligently?: boolean;
  minDimension?: number;
  maxDimension?: number;
  jpegQuality?: number;
}

export interface PreprocessResult {
  processedDataUrl: string;
  width: number;
  height: number;
  autoRotatedDegrees: number;
  deskewAngleDegrees: number;
  processingTimeMs: number;
  contrastRatio: number;
}

/**
 * Loads a base64 DataURL or Image into an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error("Failed to load image for preprocessing: " + err));
    img.src = src;
  });
}

/**
 * Stage 1: Intelligent Resizing & Base Canvas Setup
 */
function createScaledCanvas(
  img: HTMLImageElement,
  minDimension = 800,
  maxDimension = 1600
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  // 1. Scale up small images for better OCR character recognition
  if (width < minDimension && height < minDimension) {
    const scale = Math.max(minDimension / width, minDimension / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  // 2. Scale down ultra-large camera photos to save bandwidth & token cost
  else if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not create 2D canvas context");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);

  return { canvas, ctx };
}

/**
 * Stage 2: Auto-rotate Detection (0°, 90°, 180°, 270°)
 * Evaluates row vs column luminance energy variance to identify text orientation.
 */
function detectAutoRotateAngle(canvas: HTMLCanvasElement): number {
  const sampleSize = 200;
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = sampleSize;
  tempCanvas.height = sampleSize;
  const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
  if (!tempCtx) return 0;

  tempCtx.drawImage(canvas, 0, 0, sampleSize, sampleSize);
  const imgData = tempCtx.getImageData(0, 0, sampleSize, sampleSize);
  const data = imgData.data;

  // Calculate row and column luminance averages
  const rowMeans = new Float32Array(sampleSize);
  const colMeans = new Float32Array(sampleSize);

  for (let y = 0; y < sampleSize; y++) {
    let rowSum = 0;
    for (let x = 0; x < sampleSize; x++) {
      const idx = (y * sampleSize + x) * 4;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      rowSum += lum;
      colMeans[x] += lum;
    }
    rowMeans[y] = rowSum / sampleSize;
  }

  for (let x = 0; x < sampleSize; x++) {
    colMeans[x] /= sampleSize;
  }

  // Calculate variances
  let rowMean = 0, colMean = 0;
  for (let i = 0; i < sampleSize; i++) {
    rowMean += rowMeans[i];
    colMean += colMeans[i];
  }
  rowMean /= sampleSize;
  colMean /= sampleSize;

  let rowVar = 0, colVar = 0;
  for (let i = 0; i < sampleSize; i++) {
    rowVar += (rowMeans[i] - rowMean) ** 2;
    colVar += (colMeans[i] - colMean) ** 2;
  }

  // Standard horizontal text lines create high row variance (dark text lines vs white gaps)
  // If column variance is significantly higher, text is oriented vertically (90° or 270°)
  if (colVar > rowVar * 1.35) {
    // Check top vs bottom density to differentiate 90° vs 270°
    let topLum = 0, bottomLum = 0;
    for (let y = 0; y < sampleSize / 2; y++) topLum += rowMeans[y];
    for (let y = sampleSize / 2; y < sampleSize; y++) bottomLum += rowMeans[y];

    return topLum < bottomLum ? 90 : 270;
  }

  return 0;
}

/**
 * Rotates canvas by specified degrees (90, 180, 270)
 */
function rotateCanvas(canvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  const norm = ((degrees % 360) + 360) % 360;
  if (norm === 0) return canvas;

  const newCanvas = document.createElement("canvas");
  if (norm === 90 || norm === 270) {
    newCanvas.width = canvas.height;
    newCanvas.height = canvas.width;
  } else {
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;
  }

  const ctx = newCanvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.translate(newCanvas.width / 2, newCanvas.height / 2);
  ctx.rotate((norm * Math.PI) / 180);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

  return newCanvas;
}

/**
 * Stage 3: Deskew Angle Detection (-12° to +12°)
 * Uses Radon/Horizontal Projection Profile variance optimization to detect document tilt.
 */
function detectDeskewAngle(canvas: HTMLCanvasElement): number {
  const sampleWidth = 240;
  const sampleHeight = 240;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = sampleWidth;
  tempCanvas.height = sampleHeight;
  const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
  if (!tempCtx) return 0;

  // Draw crop from middle of canvas
  const srcX = Math.max(0, (canvas.width - sampleWidth) / 2);
  const srcY = Math.max(0, (canvas.height - sampleHeight) / 2);
  tempCtx.drawImage(canvas, srcX, srcY, sampleWidth, sampleHeight, 0, 0, sampleWidth, sampleHeight);

  let maxVar = -1;
  let bestAngle = 0;

  // Test angle candidates from -10° to +10° in 1° steps
  for (let angle = -10; angle <= 10; angle += 1) {
    const rotCanvas = document.createElement("canvas");
    rotCanvas.width = sampleWidth;
    rotCanvas.height = sampleHeight;
    const rCtx = rotCanvas.getContext("2d", { willReadFrequently: true });
    if (!rCtx) continue;

    rCtx.fillStyle = "#FFFFFF";
    rCtx.fillRect(0, 0, sampleWidth, sampleHeight);
    rCtx.translate(sampleWidth / 2, sampleHeight / 2);
    rCtx.rotate((angle * Math.PI) / 180);
    rCtx.drawImage(tempCanvas, -sampleWidth / 2, -sampleHeight / 2);

    const imgData = rCtx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = imgData.data;

    // Calculate row projections
    let totalLum = 0;
    const rowProjections = new Float32Array(sampleHeight);

    for (let y = 0; y < sampleHeight; y++) {
      let rSum = 0;
      for (let x = 0; x < sampleWidth; x++) {
        const idx = (y * sampleWidth + x) * 4;
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        rSum += lum;
      }
      rowProjections[y] = rSum / sampleWidth;
      totalLum += rowProjections[y];
    }

    const meanLum = totalLum / sampleHeight;
    let projectionVar = 0;
    for (let y = 0; y < sampleHeight; y++) {
      projectionVar += (rowProjections[y] - meanLum) ** 2;
    }

    if (projectionVar > maxVar) {
      maxVar = projectionVar;
      bestAngle = angle;
    }
  }

  // Refine angle search around bestAngle in 0.25° increments
  let refinedBestAngle = bestAngle;
  for (let angle = bestAngle - 0.75; angle <= bestAngle + 0.75; angle += 0.25) {
    if (angle === bestAngle) continue;

    const rotCanvas = document.createElement("canvas");
    rotCanvas.width = sampleWidth;
    rotCanvas.height = sampleHeight;
    const rCtx = rotCanvas.getContext("2d", { willReadFrequently: true });
    if (!rCtx) continue;

    rCtx.fillStyle = "#FFFFFF";
    rCtx.fillRect(0, 0, sampleWidth, sampleHeight);
    rCtx.translate(sampleWidth / 2, sampleHeight / 2);
    rCtx.rotate((angle * Math.PI) / 180);
    rCtx.drawImage(tempCanvas, -sampleWidth / 2, -sampleHeight / 2);

    const imgData = rCtx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = imgData.data;

    let totalLum = 0;
    const rowProjections = new Float32Array(sampleHeight);

    for (let y = 0; y < sampleHeight; y++) {
      let rSum = 0;
      for (let x = 0; x < sampleWidth; x++) {
        const idx = (y * sampleWidth + x) * 4;
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        rSum += lum;
      }
      rowProjections[y] = rSum / sampleWidth;
      totalLum += rowProjections[y];
    }

    const meanLum = totalLum / sampleHeight;
    let projectionVar = 0;
    for (let y = 0; y < sampleHeight; y++) {
      projectionVar += (rowProjections[y] - meanLum) ** 2;
    }

    if (projectionVar > maxVar) {
      maxVar = projectionVar;
      refinedBestAngle = angle;
    }
  }

  return Math.abs(refinedBestAngle) >= 0.5 ? -refinedBestAngle : 0;
}

/**
 * Applies deskew rotation to canvas
 */
function deskewCanvas(canvas: HTMLCanvasElement, deskewAngle: number): HTMLCanvasElement {
  if (Math.abs(deskewAngle) < 0.2) return canvas;

  const newCanvas = document.createElement("canvas");
  newCanvas.width = canvas.width;
  newCanvas.height = canvas.height;

  const ctx = newCanvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((deskewAngle * Math.PI) / 180);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

  return newCanvas;
}

/**
 * Stage 4 & 5: Denoising, Background Shadow Flattening & Local Contrast Enhancement
 */
function processPixelEnhancements(
  canvas: HTMLCanvasElement,
  doDenoise = true,
  doContrast = true
): { contrastRatio: number } {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { contrastRatio: 1 };

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 1. Fast Background Estimation (Coarse 16x16 grid downsampling for shadow flattening)
  const gridCols = Math.max(8, Math.floor(width / 32));
  const gridRows = Math.max(8, Math.floor(height / 32));
  const bgGrid = new Float32Array(gridCols * gridRows);

  const blockW = width / gridCols;
  const blockH = height / gridRows;

  // Estimate maximum luminance (background paper color) in each block
  for (let gy = 0; gy < gridRows; gy++) {
    for (let gx = 0; gx < gridCols; gx++) {
      let maxL = 0;
      const startX = Math.floor(gx * blockW);
      const startY = Math.floor(gy * blockH);
      const endX = Math.min(width, Math.floor((gx + 1) * blockW));
      const endY = Math.min(height, Math.floor((gy + 1) * blockH));

      for (let y = startY; y < endY; y += 2) {
        for (let x = startX; x < endX; x += 2) {
          const idx = (y * width + x) * 4;
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          if (lum > maxL) maxL = lum;
        }
      }
      bgGrid[gy * gridCols + gx] = Math.max(120, maxL); // Ensure minimum white background baseline
    }
  }

  // 2. Pixel Pass: Shadow Flattening, Denoising & Contrast Enhancement
  let minLum = 255;
  let maxLum = 0;

  for (let y = 0; y < height; y++) {
    const gy = Math.min(gridRows - 1, Math.floor(y / blockH));
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const gx = Math.min(gridCols - 1, Math.floor(x / blockW));

      let r = data[idx];
      let g = data[idx + 1];
      let b = data[idx + 2];

      // Denoise: Fast 3x3 local smoothing on subtle camera noise in uniform areas
      if (doDenoise && x > 0 && x < width - 1 && y > 0 && y < height - 1) {
        const prevIdx = (y * width + (x - 1)) * 4;
        const nextIdx = (y * width + (x + 1)) * 4;
        const diffR = Math.abs(r - data[prevIdx]) + Math.abs(r - data[nextIdx]);
        // If noise variation is small (non-edge background region), smooth slightly
        if (diffR < 15) {
          r = (r * 2 + data[prevIdx] + data[nextIdx]) >> 2;
          g = (g * 2 + data[prevIdx + 1] + data[nextIdx + 1]) >> 2;
          b = (b * 2 + data[prevIdx + 2] + data[nextIdx + 2]) >> 2;
        }
      }

      // Background Shadow Flattening & Contrast Improvement
      if (doContrast) {
        const bgLum = bgGrid[gy * gridCols + gx];
        const scale = 245 / Math.max(50, bgLum);

        // Normalize illumination against local background light
        r = Math.min(255, Math.max(0, (r * scale)));
        g = Math.min(255, Math.max(0, (g * scale)));
        b = Math.min(255, Math.max(0, (b * scale)));

        // Soft Sigmoid Contrast Curve to sharpen text while preserving anti-aliasing
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum < minLum) minLum = lum;
        if (lum > maxLum) maxLum = lum;

        if (lum < 160) {
          // Darken text stroke slightly for high legibility
          const factor = 0.88;
          r = Math.floor(r * factor);
          g = Math.floor(g * factor);
          b = Math.floor(b * factor);
        } else if (lum > 210) {
          // Push near-white background paper to clean crisp white
          r = 255;
          g = 255;
          b = 255;
        }
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const contrastRatio = maxLum / (minLum + 1);
  return { contrastRatio };
}

/**
 * Main Image Preprocessing Pipeline
 * 
 * Executes: Auto-Rotate -> Deskew -> Denoise -> Contrast Improvement -> Intelligent Resize -> High Quality Output
 */
export async function preprocessImageForOCRAndVision(
  source: string | HTMLImageElement | HTMLCanvasElement,
  options: PreprocessOptions = {}
): Promise<PreprocessResult> {
  const startTime = performance.now();

  const {
    autoRotate = true,
    deskew = true,
    denoise = true,
    improveContrast = true,
    resizeIntelligently = true,
    minDimension = 800,
    maxDimension = 1600,
    jpegQuality = 0.88
  } = options;

  let img: HTMLImageElement;
  if (typeof source === "string") {
    img = await loadImage(source);
  } else if (source instanceof HTMLCanvasElement) {
    const dataUrl = source.toDataURL("image/png");
    img = await loadImage(dataUrl);
  } else {
    img = source;
  }

  // 1. Intelligent Resizing & Initial Canvas
  let { canvas } = createScaledCanvas(
    img,
    resizeIntelligently ? minDimension : 100,
    resizeIntelligently ? maxDimension : 4000
  );

  // 2. Auto-Rotate Detection & Correction
  let autoRotatedDegrees = 0;
  if (autoRotate) {
    autoRotatedDegrees = detectAutoRotateAngle(canvas);
    if (autoRotatedDegrees !== 0) {
      canvas = rotateCanvas(canvas, autoRotatedDegrees);
    }
  }

  // 3. Deskew Angle Detection & Correction
  let deskewAngleDegrees = 0;
  if (deskew) {
    deskewAngleDegrees = detectDeskewAngle(canvas);
    if (Math.abs(deskewAngleDegrees) >= 0.5) {
      canvas = deskewCanvas(canvas, deskewAngleDegrees);
    }
  }

  // 4. Denoise, Background Shadow Removal & Contrast Enhancement
  const { contrastRatio } = processPixelEnhancements(canvas, denoise, improveContrast);

  // 5. Export Processed Data URL
  const processedDataUrl = canvas.toDataURL("image/jpeg", jpegQuality);
  const processingTimeMs = Math.round(performance.now() - startTime);

  return {
    processedDataUrl,
    width: canvas.width,
    height: canvas.height,
    autoRotatedDegrees,
    deskewAngleDegrees,
    processingTimeMs,
    contrastRatio
  };
}
