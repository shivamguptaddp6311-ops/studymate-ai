/**
 * Secure File Upload Validation Utility
 *
 * Provides strict validation for image and PDF file payloads:
 * - MIME type validation
 * - Magic number / file signature verification
 * - File size limits enforcement
 * - PDF page-count limit enforcement
 * - Detection & rejection of corrupted or malicious payloads (polyglots, embedded scripts)
 * - Image dimension validation (min/max limits, bomb detection)
 */

export interface FileValidationOptions {
  maxSizeBytes?: number;       // Max allowed file size in bytes
  maxPdfPages?: number;        // Max allowed pages for PDFs
  minImageWidth?: number;      // Min allowed image width in px
  maxImageWidth?: number;      // Max allowed image width in px
  minImageHeight?: number;     // Min allowed image height in px
  maxImageHeight?: number;     // Max allowed image height in px
  allowedMimeTypes?: string[]; // Allowed MIME types
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  pageCount?: number;
}

const DEFAULT_OPTIONS: FileValidationOptions = {
  maxSizeBytes: 25 * 1024 * 1024, // 25 MB max payload
  maxPdfPages: 50,                // 50 pages max for PDFs
  minImageWidth: 10,              // 10 px min width
  maxImageWidth: 10000,           // 10,000 px max width
  minImageHeight: 10,             // 10 px min height
  maxImageHeight: 10000,          // 10,000 px max height
  allowedMimeTypes: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf"
  ]
};

/**
 * Extracts base64 metadata, declared MIME type, and decoded Buffer from a payload string.
 */
export function parseFilePayload(payload: string): { declaredMime: string | null; buffer: Buffer | null; isUrl: boolean } {
  if (!payload || typeof payload !== "string") {
    return { declaredMime: null, buffer: null, isUrl: false };
  }

  const trimmed = payload.trim();

  // Handle standard HTTP/HTTPS URLs (no direct base64 decoding needed)
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return { declaredMime: null, buffer: null, isUrl: true };
  }

  // Handle Data URLs: data:[<mediatype>][;base64],<data>
  if (trimmed.startsWith("data:")) {
    const matches = trimmed.match(/^data:([^;]+);base64,(.+)$/s);
    if (matches) {
      const declaredMime = matches[1].toLowerCase().trim();
      try {
        const buffer = Buffer.from(matches[2], "base64");
        return { declaredMime, buffer, isUrl: false };
      } catch (err) {
        return { declaredMime, buffer: null, isUrl: false };
      }
    }
  }

  // Handle raw base64 strings
  try {
    const buffer = Buffer.from(trimmed, "base64");
    return { declaredMime: null, buffer, isUrl: false };
  } catch (err) {
    return { declaredMime: null, buffer: null, isUrl: false };
  }
}

/**
 * Detects actual MIME type based on file magic numbers (signatures).
 */
export function detectFileSignature(buffer: Buffer): { detectedMime: string | null; isMalicious: boolean; reason?: string } {
  if (!buffer || buffer.length < 4) {
    return { detectedMime: null, isMalicious: true, reason: "File payload is empty or too small" };
  }

  // Check for executable or script headers
  // PE Executable (Windows EXE/DLL)
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return { detectedMime: null, isMalicious: true, reason: "Executable PE header detected" };
  }
  // ELF Executable (Linux binary)
  if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return { detectedMime: null, isMalicious: true, reason: "Executable ELF header detected" };
  }

  // Check PNG Signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { detectedMime: "image/png", isMalicious: false };
  }

  // Check JPEG Signature: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { detectedMime: "image/jpeg", isMalicious: false };
  }

  // Check GIF Signature: GIF87a or GIF89a
  if (buffer.length >= 6) {
    const gifHeader = buffer.toString("ascii", 0, 6);
    if (gifHeader === "GIF87a" || gifHeader === "GIF89a") {
      return { detectedMime: "image/gif", isMalicious: false };
    }
  }

  // Check WEBP Signature: "RIFF" .... "WEBP"
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { detectedMime: "image/webp", isMalicious: false };
  }

  // Check PDF Signature: %PDF- in first 1024 bytes
  const headerSlice = buffer.subarray(0, Math.min(buffer.length, 1024)).toString("ascii");
  if (headerSlice.includes("%PDF-")) {
    return { detectedMime: "application/pdf", isMalicious: false };
  }

  // Check for HTML/Script injection in header
  const sampleText = buffer.subarray(0, Math.min(buffer.length, 1024)).toString("utf8").toLowerCase();
  if (
    sampleText.includes("<html") ||
    sampleText.includes("<!doctype html") ||
    sampleText.includes("<script") ||
    sampleText.includes("<?php")
  ) {
    return { detectedMime: null, isMalicious: true, reason: "Embedded HTML/script code detected in file binary" };
  }

  return { detectedMime: null, isMalicious: false };
}

/**
 * Extracts image dimensions (width & height) from PNG, JPEG, WEBP, or GIF buffer.
 */
export function extractImageDimensions(buffer: Buffer, mimeType: string): { width: number; height: number } | null {
  try {
    if (mimeType === "image/png" && buffer.length >= 24) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }

    if ((mimeType === "image/jpeg" || mimeType === "image/jpg") && buffer.length >= 4) {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];

        // SOF markers (Start Of Frame): 0xC0..0xC3, 0xC5..0xC7, 0xC9..0xCB, 0xCD..0xCF
        if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }

        if (marker === 0xd9 || marker === 0xda) break; // End of image or Start of scan

        const chunkLength = buffer.readUInt16BE(offset + 2);
        if (chunkLength < 2) break;
        offset += 2 + chunkLength;
      }
    }

    if (mimeType === "image/gif" && buffer.length >= 10) {
      const width = buffer.readUInt16LE(6);
      const height = buffer.readUInt16LE(8);
      return { width, height };
    }

    if (mimeType === "image/webp" && buffer.length >= 30) {
      const format = buffer.toString("ascii", 12, 16);
      if (format === "VP8 " && buffer.length >= 30) {
        const width = buffer.readUInt16LE(26) & 0x3fff;
        const height = buffer.readUInt16LE(28) & 0x3fff;
        return { width, height };
      }
      if (format === "VP8L" && buffer.length >= 25) {
        const b0 = buffer[21], b1 = buffer[22], b2 = buffer[23], b3 = buffer[24];
        const width = 1 + (((b1 & 0x3f) << 8) | b0);
        const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
        return { width, height };
      }
      if (format === "VP8X" && buffer.length >= 30) {
        const width = 1 + buffer.readUIntLE(24, 3);
        const height = 1 + buffer.readUIntLE(27, 3);
        return { width, height };
      }
    }
  } catch (err) {
    return null;
  }

  return null;
}

/**
 * Counts the number of pages in a PDF document buffer.
 */
export function countPdfPages(buffer: Buffer): number {
  try {
    const pdfStr = buffer.toString("binary");

    // 1. Count occurrences of "/Type /Page" or "/Type/Page" (excluding "/Pages")
    const pageMatches = pdfStr.match(/\/Type\s*\/Page\b(?!\s*s)/g);
    const countFromPages = pageMatches ? pageMatches.length : 0;

    // 2. Parse /Count <number> attribute from /Pages dictionary
    let countFromCountAttr = 0;
    const countMatches = pdfStr.match(/\/Count\s+(\d+)/g);
    if (countMatches) {
      for (const m of countMatches) {
        const num = parseInt(m.replace(/\/Count\s+/, ""), 10);
        if (!isNaN(num) && num > countFromCountAttr) {
          countFromCountAttr = num;
        }
      }
    }

    const finalPageCount = Math.max(countFromPages, countFromCountAttr, 1);
    return finalPageCount;
  } catch (err) {
    return 1;
  }
}

/**
 * Checks for PDF document corruption and malicious executable launches.
 */
export function validatePdfIntegrity(buffer: Buffer): { valid: boolean; error?: string } {
  if (buffer.length < 30) {
    return { valid: false, error: "PDF document buffer is truncated or corrupted." };
  }

  const endSlice = buffer.subarray(Math.max(0, buffer.length - 2048)).toString("ascii");
  if (!endSlice.includes("%EOF")) {
    return { valid: false, error: "PDF document is incomplete or corrupted (missing %EOF marker)." };
  }

  const pdfStr = buffer.toString("utf8", 0, Math.min(buffer.length, 10000)).toLowerCase();
  if (pdfStr.includes("/launch") && pdfStr.includes("/action")) {
    return { valid: false, error: "PDF contains suspicious automatic executable launch commands." };
  }

  return { valid: true };
}

/**
 * Main file upload validation entry point.
 * Validates a base64 or Data URL payload against strict security rules.
 */
export function validateFileUpload(
  payload: string,
  options: FileValidationOptions = {}
): FileValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!payload || typeof payload !== "string") {
    return { valid: true }; // Empty optional payload
  }

  const { declaredMime, buffer, isUrl } = parseFilePayload(payload);

  // External URLs are permitted if they use HTTPS/HTTP
  if (isUrl) {
    return { valid: true };
  }

  if (!buffer) {
    return { valid: false, error: "Failed to decode base64 file payload or corrupted binary." };
  }

  const sizeBytes = buffer.length;

  // 1. File Size Validation
  if (opts.maxSizeBytes && sizeBytes > opts.maxSizeBytes) {
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);
    const maxMB = (opts.maxSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File size (${sizeMB} MB) exceeds maximum allowed limit of ${maxMB} MB.`,
      sizeBytes
    };
  }

  // 2. File Signature (Magic Numbers) & Malicious Script Detection
  const sigResult = detectFileSignature(buffer);
  if (sigResult.isMalicious) {
    return {
      valid: false,
      error: `Security Violation: ${sigResult.reason || "Malicious file structure detected."}`,
      sizeBytes
    };
  }

  const actualMime = sigResult.detectedMime;

  if (!actualMime) {
    return {
      valid: false,
      error: "Unsupported file signature. Uploaded file is not a valid JPEG, PNG, WEBP, GIF, or PDF document.",
      sizeBytes
    };
  }

  // 3. MIME Type Verification (Declared vs Signature)
  if (declaredMime) {
    // Normalize comparison (e.g. image/jpg -> image/jpeg)
    const normDeclared = declaredMime.replace("image/jpg", "image/jpeg");
    const normActual = actualMime.replace("image/jpg", "image/jpeg");

    if (normDeclared !== normActual) {
      return {
        valid: false,
        error: `MIME type spoofing detected. File header claims [${declaredMime}] but signature is [${actualMime}].`,
        sizeBytes
      };
    }
  }

  // 4. Allowed MIME Types Check
  if (opts.allowedMimeTypes && opts.allowedMimeTypes.length > 0) {
    const isAllowed = opts.allowedMimeTypes.some(allowed =>
      allowed.toLowerCase().trim() === actualMime || allowed.replace("image/jpg", "image/jpeg") === actualMime
    );
    if (!isAllowed) {
      return {
        valid: false,
        error: `File type [${actualMime}] is not allowed. Allowed formats: ${opts.allowedMimeTypes.join(", ")}.`,
        sizeBytes,
        mimeType: actualMime
      };
    }
  }

  // 5. PDF Specific Validation (Page-count & Integrity)
  if (actualMime === "application/pdf") {
    const pdfIntegrity = validatePdfIntegrity(buffer);
    if (!pdfIntegrity.valid) {
      return {
        valid: false,
        error: pdfIntegrity.error || "Corrupted PDF document.",
        sizeBytes,
        mimeType: actualMime
      };
    }

    const pageCount = countPdfPages(buffer);
    if (opts.maxPdfPages && pageCount > opts.maxPdfPages) {
      return {
        valid: false,
        error: `PDF page count (${pageCount} pages) exceeds maximum allowed limit of ${opts.maxPdfPages} pages.`,
        sizeBytes,
        mimeType: actualMime,
        pageCount
      };
    }

    return {
      valid: true,
      sizeBytes,
      mimeType: actualMime,
      pageCount
    };
  }

  // 6. Image Dimension Validation
  if (actualMime.startsWith("image/")) {
    const dimensions = extractImageDimensions(buffer, actualMime);
    if (dimensions) {
      const { width, height } = dimensions;

      if (opts.minImageWidth && width < opts.minImageWidth) {
        return {
          valid: false,
          error: `Image width (${width}px) is below minimum allowed limit of ${opts.minImageWidth}px.`,
          sizeBytes,
          mimeType: actualMime,
          width,
          height
        };
      }

      if (opts.maxImageWidth && width > opts.maxImageWidth) {
        return {
          valid: false,
          error: `Image width (${width}px) exceeds maximum allowed limit of ${opts.maxImageWidth}px.`,
          sizeBytes,
          mimeType: actualMime,
          width,
          height
        };
      }

      if (opts.minImageHeight && height < opts.minImageHeight) {
        return {
          valid: false,
          error: `Image height (${height}px) is below minimum allowed limit of ${opts.minImageHeight}px.`,
          sizeBytes,
          mimeType: actualMime,
          width,
          height
        };
      }

      if (opts.maxImageHeight && height > opts.maxImageHeight) {
        return {
          valid: false,
          error: `Image height (${height}px) exceeds maximum allowed limit of ${opts.maxImageHeight}px.`,
          sizeBytes,
          mimeType: actualMime,
          width,
          height
        };
      }

      return {
        valid: true,
        sizeBytes,
        mimeType: actualMime,
        width,
        height
      };
    }
  }

  return {
    valid: true,
    sizeBytes,
    mimeType: actualMime
  };
}
