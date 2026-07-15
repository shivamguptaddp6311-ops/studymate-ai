/**
 * Client-Side Image Optimizer and Quality Assessment Utility
 * Designed for high-performance mobile-first edge applications.
 */

interface CheckResult {
  isBlurry: boolean;
  isDark: boolean;
  contrastRatio: number;
  warning?: string;
}

/**
 * Assesses the quality of an image (brightness and contrast-based focus estimation).
 */
export function checkImageQuality(canvas: HTMLCanvasElement): CheckResult {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { isBlurry: false, isDark: false, contrastRatio: 1 };
  }

  const width = canvas.width;
  const height = canvas.height;
  
  // Downsample to 100x100 for fast telemetry performance without blocking main UI thread
  const sampleSize = 100;
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = sampleSize;
  tempCanvas.height = sampleSize;
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) {
    return { isBlurry: false, isDark: false, contrastRatio: 1 };
  }

  tempCtx.drawImage(canvas, 0, 0, sampleSize, sampleSize);
  const imgData = tempCtx.getImageData(0, 0, sampleSize, sampleSize);
  const data = imgData.data;

  let totalLuminance = 0;
  let minLuminance = 255;
  let maxLuminance = 0;
  const luminances: number[] = new Array(sampleSize * sampleSize);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // ITU-R BT.601 relative luminance formula
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    luminances[i / 4] = lum;
    totalLuminance += lum;
    
    if (lum < minLuminance) minLuminance = lum;
    if (lum > maxLuminance) maxLuminance = lum;
  }

  const avgLuminance = totalLuminance / (sampleSize * sampleSize);

  // Focus/blur estimator using local pixel gradient difference variance
  let diffSum = 0;
  let diffCount = 0;
  for (let y = 1; y < sampleSize - 1; y += 2) {
    for (let x = 1; x < sampleSize - 1; x += 2) {
      const idx = y * sampleSize + x;
      const current = luminances[idx];
      const right = luminances[idx + 1];
      const down = luminances[idx + sampleSize];
      
      const gradX = right - current;
      const gradY = down - current;
      diffSum += Math.sqrt(gradX * gradX + gradY * gradY);
      diffCount++;
    }
  }

  const avgGradient = diffCount > 0 ? diffSum / diffCount : 0;
  
  // Calculate variance of gradients to measure edge crispness
  let varianceSum = 0;
  for (let y = 1; y < sampleSize - 1; y += 2) {
    for (let x = 1; x < sampleSize - 1; x += 2) {
      const idx = y * sampleSize + x;
      const current = luminances[idx];
      const right = luminances[idx + 1];
      const down = luminances[idx + sampleSize];
      const grad = Math.sqrt((right - current) ** 2 + (down - current) ** 2);
      varianceSum += (grad - avgGradient) ** 2;
    }
  }
  const variance = diffCount > 0 ? varianceSum / diffCount : 0;

  const isDark = avgLuminance < 40; // Low light threshold
  // Blur threshold: Low variance of gradients indicates lack of sharp edges/text contrast
  const isBlurry = variance < 12.0; 
  const contrastRatio = maxLuminance / (minLuminance + 1);

  let warning: string | undefined;
  if (isDark) {
    warning = "The image looks too dark. Ensure good lighting for better AI solving.";
  } else if (isBlurry) {
    warning = "The image seems blurry. For accurate results, hold the camera steady and focus the text.";
  } else if (contrastRatio < 2.5) {
    warning = "Low image contrast detected. Place the paper on a flat surface in good light.";
  }

  return {
    isBlurry,
    isDark,
    contrastRatio,
    warning
  };
}

/**
 * Compresses an image Base64/DataURL to optimize upload speed and reduce AI token cost.
 * Resizes the image so that maximum dimension is maxWidthOrHeight, and lowers JPEG quality.
 */
export function compressImage(
  base64Src: string,
  maxWidthOrHeight = 1200,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        // Apply scale down while preserving aspect ratio
        if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
          if (width > height) {
            height = Math.round((height * maxWidthOrHeight) / width);
            width = maxWidthOrHeight;
          } else {
            width = Math.round((width * maxWidthOrHeight) / height);
            height = maxWidthOrHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(base64Src);
          return;
        }

        // Enable high quality scaling algorithms
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(img, 0, 0, width, height);

        // Export as compressed JPEG
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      } catch (e) {
        console.error("[ImageCompressor] Error during compression, falling back to raw source:", e);
        resolve(base64Src);
      }
    };
    img.onerror = (e) => {
      reject(new Error("Failed to load image for compression."));
    };
    img.src = base64Src;
  });
}

/**
 * Programmatically enhances image contrast/brightness using canvas for high-quality camera captures.
 */
export function enhanceImageForOCR(base64Src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(base64Src);
          return;
        }

        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Apply automatic local contrast stretching and thresholding to improve handwritten OCR
        let min = 255;
        let max = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lum < min) min = lum;
          if (lum > max) max = lum;
        }

        const range = max - min;
        if (range > 20) {
          for (let i = 0; i < data.length; i += 4) {
            // Contrast stretching
            data[i]     = Math.min(255, Math.max(0, ((data[i] - min) / range) * 255));     // r
            data[i + 1] = Math.min(255, Math.max(0, ((data[i + 1] - min) / range) * 255)); // g
            data[i + 2] = Math.min(255, Math.max(0, ((data[i + 2] - min) / range) * 255)); // b
          }
          ctx.putImageData(imgData, 0, 0);
        }

        resolve(canvas.toDataURL("image/jpeg", 0.85));
      } catch (err) {
        console.error("[ImageEnhancer] OCR pre-enhancement error:", err);
        resolve(base64Src);
      }
    };
    img.onerror = () => {
      resolve(base64Src);
    };
    img.src = base64Src;
  });
}
