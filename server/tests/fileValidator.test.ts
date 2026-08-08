import { describe, it, expect } from "vitest";
import {
  validateFileUpload
} from "../utils/fileValidator";

describe("Secure File Upload Validation Tests", () => {
  it("should validate valid PNG image", () => {
    const validPngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x01, 0x00,
      0x00, 0x00, 0x01, 0x00,
      0x08, 0x02, 0x00, 0x00, 0x00
    ]);
    const pngDataUrl = `data:image/png;base64,${validPngHeader.toString("base64")}`;
    const pngRes = validateFileUpload(pngDataUrl);
    expect(pngRes.valid).toBe(true);
    expect(pngRes.mimeType).toBe("image/png");
    expect(pngRes.width).toBe(256);
    expect(pngRes.height).toBe(256);
  });

  it("should detect MIME spoofing", () => {
    const spoofedPng = `data:image/png;base64,${Buffer.from("FFD8FF00", "hex").toString("base64")}`;
    const spoofRes = validateFileUpload(spoofedPng);
    expect(spoofRes.valid).toBe(false);
    expect(spoofRes.error).toContain("MIME type spoofing detected");
  });

  it("should reject executable/malicious PE file header", () => {
    const peHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
    const peDataUrl = `data:image/png;base64,${peHeader.toString("base64")}`;
    const peRes = validateFileUpload(peDataUrl);
    expect(peRes.valid).toBe(false);
    expect(peRes.error).toContain("Security Violation");
  });

  it("should reject HTML/script injection in binary header", () => {
    const scriptInjection = Buffer.from("<script>alert('xss')</script>dummy binary content");
    const scriptDataUrl = `data:image/jpeg;base64,${scriptInjection.toString("base64")}`;
    const scriptRes = validateFileUpload(scriptDataUrl);
    expect(scriptRes.valid).toBe(false);
  });

  it("should enforce PDF page count limits", () => {
    let mockPdfStr = "%PDF-1.4\n";
    for (let i = 0; i < 60; i++) {
      mockPdfStr += `/Type /Page\n`;
    }
    mockPdfStr += "%%EOF\n";
    const pdf60Buffer = Buffer.from(mockPdfStr, "ascii");
    const pdf60Res = validateFileUpload(`data:application/pdf;base64,${pdf60Buffer.toString("base64")}`, { maxPdfPages: 50 });
    expect(pdf60Res.valid).toBe(false);
    expect(pdf60Res.error).toContain("exceeds maximum allowed limit of 50 pages");
  });

  it("should pass valid PDF under page limits", () => {
    let mockValidPdfStr = "%PDF-1.4\n";
    for (let i = 0; i < 5; i++) {
      mockValidPdfStr += `/Type /Page\n`;
    }
    mockValidPdfStr += "%%EOF\n";
    const validPdfBuffer = Buffer.from(mockValidPdfStr, "ascii");
    const validPdfRes = validateFileUpload(`data:application/pdf;base64,${validPdfBuffer.toString("base64")}`, { maxPdfPages: 50 });
    expect(validPdfRes.valid).toBe(true);
    expect(validPdfRes.pageCount).toBe(5);
  });

  it("should reject corrupted PDF missing %EOF", () => {
    const corruptPdfStr = "%PDF-1.4\n/Type /Page\nsome truncated data";
    const corruptPdfBuffer = Buffer.from(corruptPdfStr, "ascii");
    const corruptPdfRes = validateFileUpload(`data:application/pdf;base64,${corruptPdfBuffer.toString("base64")}`);
    expect(corruptPdfRes.valid).toBe(false);
  });

  it("should enforce image dimension bounds", () => {
    const hugePngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x3a, 0x98,
      0x00, 0x00, 0x3a, 0x98,
      0x08, 0x02, 0x00, 0x00, 0x00
    ]);
    const hugePngRes = validateFileUpload(`data:image/png;base64,${hugePngHeader.toString("base64")}`, { maxImageWidth: 10000 });
    expect(hugePngRes.valid).toBe(false);
    expect(hugePngRes.error).toContain("exceeds maximum allowed limit of 10000px");
  });
});
