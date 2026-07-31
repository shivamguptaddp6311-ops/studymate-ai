import {
  validateFileUpload,
  detectFileSignature,
  countPdfPages,
  extractImageDimensions,
  validatePdfIntegrity
} from "../utils/fileValidator";

function runTests() {
  console.log("=== Running Secure File Upload Validation Tests ===");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Valid PNG Image Test
  const validPngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG Signature
    0x00, 0x00, 0x00, 0x0d, // Chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x01, 0x00, // Width: 256
    0x00, 0x00, 0x01, 0x00, // Height: 256
    0x08, 0x02, 0x00, 0x00, 0x00
  ]);
  const pngDataUrl = `data:image/png;base64,${validPngHeader.toString("base64")}`;
  const pngRes = validateFileUpload(pngDataUrl);
  assert(pngRes.valid === true, "Valid PNG image passes validation");
  assert(pngRes.mimeType === "image/png", "Detects PNG MIME type correctly");
  assert(pngRes.width === 256 && pngRes.height === 256, "Extracts PNG image dimensions accurately (256x256)");

  // 2. MIME Spoofing Detection Test
  const spoofedPng = `data:image/png;base64,${Buffer.from("FFD8FF00", "hex").toString("base64")}`;
  const spoofRes = validateFileUpload(spoofedPng);
  assert(spoofRes.valid === false, "Rejects MIME type spoofing (data claims PNG, signature is JPEG)");
  assert(spoofRes.error?.includes("MIME type spoofing detected") === true, "MIME spoof error message returned");

  // 3. Executable / Malicious PE File Header Rejection
  const peHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]); // MZ header
  const peDataUrl = `data:image/png;base64,${peHeader.toString("base64")}`;
  const peRes = validateFileUpload(peDataUrl);
  assert(peRes.valid === false, "Rejects PE Executable header disguised as PNG");
  assert(peRes.error?.includes("Security Violation") === true, "Security violation error returned");

  // 4. HTML / Script Injection in Binary Header Rejection
  const scriptInjection = Buffer.from("<script>alert('xss')</script>dummy binary content");
  const scriptDataUrl = `data:image/jpeg;base64,${scriptInjection.toString("base64")}`;
  const scriptRes = validateFileUpload(scriptDataUrl);
  assert(scriptRes.valid === false, "Rejects embedded script code in payload header");

  // 5. PDF Page Count Limit Test
  let mockPdfStr = "%PDF-1.4\n";
  for (let i = 0; i < 60; i++) {
    mockPdfStr += `/Type /Page\n`;
  }
  mockPdfStr += "%%EOF\n";
  const pdf60Buffer = Buffer.from(mockPdfStr, "ascii");
  const pdf60Res = validateFileUpload(`data:application/pdf;base64,${pdf60Buffer.toString("base64")}`, { maxPdfPages: 50 });
  assert(pdf60Res.valid === false, "Rejects PDF exceeding max page count limit (60 pages > 50 max)");
  assert(pdf60Res.error?.includes("exceeds maximum allowed limit of 50 pages") === true, "Page count error message returned");

  // 6. Valid PDF Test (under 50 pages)
  let mockValidPdfStr = "%PDF-1.4\n";
  for (let i = 0; i < 5; i++) {
    mockValidPdfStr += `/Type /Page\n`;
  }
  mockValidPdfStr += "%%EOF\n";
  const validPdfBuffer = Buffer.from(mockValidPdfStr, "ascii");
  const validPdfRes = validateFileUpload(`data:application/pdf;base64,${validPdfBuffer.toString("base64")}`, { maxPdfPages: 50 });
  assert(validPdfRes.valid === true, "Valid 5-page PDF passes validation");
  assert(validPdfRes.pageCount === 5, "Accurately counts PDF pages (5 pages)");

  // 7. Corrupted PDF Test (Missing %EOF)
  const corruptPdfStr = "%PDF-1.4\n/Type /Page\nsome truncated data";
  const corruptPdfBuffer = Buffer.from(corruptPdfStr, "ascii");
  const corruptPdfRes = validateFileUpload(`data:application/pdf;base64,${corruptPdfBuffer.toString("base64")}`);
  assert(corruptPdfRes.valid === false, "Rejects corrupted PDF missing %EOF marker");

  // 8. Image Dimension Bounds Test (Oversized image)
  const hugePngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x3a, 0x98, // Width: 15,000 px (> 10,000 max)
    0x00, 0x00, 0x3a, 0x98, // Height: 15,000 px
    0x08, 0x02, 0x00, 0x00, 0x00
  ]);
  const hugePngRes = validateFileUpload(`data:image/png;base64,${hugePngHeader.toString("base64")}`, { maxImageWidth: 10000 });
  assert(hugePngRes.valid === false, "Rejects image with dimensions exceeding 10,000px limit");
  assert(hugePngRes.error?.includes("exceeds maximum allowed limit of 10000px") === true, "Dimension limit error returned");

  console.log(`\nTest Summary: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
