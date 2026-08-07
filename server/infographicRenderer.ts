import puppeteer, { Browser } from "puppeteer";
import fs from "fs";
import path from "path";
import { InfographicTemplate, RegionCallout } from "./infographicTemplates/types";

function getBaseIllustrationDataUri(illustrationPath: string): string {
  try {
    const cleanPath = illustrationPath.startsWith("/") ? illustrationPath.slice(1) : illustrationPath;
    const fullPath = path.join(process.cwd(), cleanPath);

    if (fs.existsSync(fullPath)) {
      const fileBuffer = fs.readFileSync(fullPath);
      const ext = path.extname(fullPath).toLowerCase();
      let mime = "image/png";
      if (ext === ".svg") mime = "image/svg+xml";
      else if (ext === ".jpg" || ext === ".jpeg") mime = "image/jpeg";
      return `data:${mime};base64,${fileBuffer.toString("base64")}`;
    }
  } catch (err: any) {
    console.warn(`[InfographicRenderer] Error loading base illustration at ${illustrationPath}:`, err?.message);
  }

  console.warn(`[InfographicRenderer] Base illustration file not found at ${illustrationPath}. Using SVG placeholder graphic.`);
  const fallbackSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 500' width='600' height='500'>
    <rect width='600' height='500' fill='#111827' rx='16' />
    <circle cx='300' cy='250' r='180' fill='none' stroke='#3b82f6' stroke-width='2' stroke-dasharray='6,6' opacity='0.5'/>
    <text x='300' y='240' fill='#f8fafc' font-family='system-ui, sans-serif' font-size='22' font-weight='bold' text-anchor='middle'>ANATOMICAL DIAGRAM</text>
    <text x='300' y='275' fill='#94a3b8' font-family='system-ui, sans-serif' font-size='14' text-anchor='middle'>BASE ILLUSTRATION PLACEHOLDER</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(fallbackSvg).toString("base64")}`;
}

function buildInfographicHTML(template: InfographicTemplate): string {
  const illustrationUri = getBaseIllustrationDataUri(template.baseIllustration);

  const leftRegions = template.regions.filter(r => r.side === "left");
  const rightRegions = template.regions.filter(r => r.side === "right");

  // Fallback partitioning if side is not specified
  if (leftRegions.length === 0 && rightRegions.length === 0) {
    const mid = Math.ceil(template.regions.length / 2);
    leftRegions.push(...template.regions.slice(0, mid));
    rightRegions.push(...template.regions.slice(mid));
  }

  // Calculate coordinates for leader lines inside 1480px x 710px main section
  const mainWidth = 1480;
  const mainHeight = 710;
  const colWidth = 350;

  // Center illustration bounds inside center column (from x=370 to x=1110)
  const imgWidth = 500;
  const imgHeight = 460;
  const imgLeft = 370 + (740 - imgWidth) / 2; // 490px
  const imgTop = (mainHeight - imgHeight) / 2; // 125px

  let svgLinesHtml = "";

  // Draw Left Leader Lines
  leftRegions.forEach((region, idx) => {
    const boxY = (mainHeight / (leftRegions.length + 1)) * (idx + 1);
    const boxX = colWidth; // 350px

    const targetX = imgLeft + (region.calloutPosition.x / 100) * imgWidth;
    const targetY = imgTop + (region.calloutPosition.y / 100) * imgHeight;

    const midX = boxX + (targetX - boxX) * 0.45;

    svgLinesHtml += `
      <!-- Left Leader Line ${idx + 1} -->
      <path d="M ${boxX} ${boxY} L ${midX} ${boxY} L ${midX} ${targetY} L ${targetX} ${targetY}" 
            fill="none" stroke="${region.color}" stroke-width="2.5" opacity="0.9" stroke-linejoin="round"/>
      <path d="M ${boxX} ${boxY} L ${midX} ${boxY} L ${midX} ${targetY} L ${targetX} ${targetY}" 
            fill="none" stroke="#ffffff" stroke-width="1" opacity="0.7" stroke-linejoin="round"/>
      <circle cx="${boxX}" cy="${boxY}" r="4" fill="${region.color}" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="${targetX}" cy="${targetY}" r="7" fill="${region.color}" stroke="#ffffff" stroke-width="2"/>
      <circle cx="${targetX}" cy="${targetY}" r="2.5" fill="#ffffff"/>
    `;
  });

  // Draw Right Leader Lines
  rightRegions.forEach((region, idx) => {
    const boxY = (mainHeight / (rightRegions.length + 1)) * (idx + 1);
    const boxX = mainWidth - colWidth; // 1130px

    const targetX = imgLeft + (region.calloutPosition.x / 100) * imgWidth;
    const targetY = imgTop + (region.calloutPosition.y / 100) * imgHeight;

    const midX = boxX - (boxX - targetX) * 0.45;

    svgLinesHtml += `
      <!-- Right Leader Line ${idx + 1} -->
      <path d="M ${boxX} ${boxY} L ${midX} ${boxY} L ${midX} ${targetY} L ${targetX} ${targetY}" 
            fill="none" stroke="${region.color}" stroke-width="2.5" opacity="0.9" stroke-linejoin="round"/>
      <path d="M ${boxX} ${boxY} L ${midX} ${boxY} L ${midX} ${targetY} L ${targetX} ${targetY}" 
            fill="none" stroke="#ffffff" stroke-width="1" opacity="0.7" stroke-linejoin="round"/>
      <circle cx="${boxX}" cy="${boxY}" r="4" fill="${region.color}" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="${targetX}" cy="${targetY}" r="7" fill="${region.color}" stroke="#ffffff" stroke-width="2"/>
      <circle cx="${targetX}" cy="${targetY}" r="2.5" fill="#ffffff"/>
    `;
  });

  const renderRegionBox = (region: RegionCallout) => `
    <div class="region-card" style="border-color: ${region.color};">
      <div class="card-header" style="background-color: ${region.color}22; border-bottom: 2px solid ${region.color};">
        <span class="header-dot" style="background-color: ${region.color};"></span>
        <span class="header-title" style="color: ${region.color};">${region.name}</span>
      </div>
      <ul class="bullet-list">
        ${region.bullets.map(b => `
          <li>
            <span class="bullet-dot" style="background-color: ${region.color};"></span>
            <span>${b}</span>
          </li>
        `).join("")}
      </ul>
    </div>
  `;

  const footerCardsHtml = (template.footerCards || []).map(card => `
    <div class="footer-card">
      <div class="footer-card-header">
        <span class="footer-icon">${card.icon}</span>
        <span class="footer-title">${card.title}</span>
      </div>
      <div class="footer-desc">${card.description}</div>
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 1536px;
      height: 1024px;
      background-color: #0a0e27;
      color: #ffffff;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 18px 28px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* HEADER */
    .top-header {
      height: 62px;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    .top-title {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #ffffff;
      text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);
    }
    .top-subtitle {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 1.5px;
      color: #94a3b8;
      margin-top: 3px;
      text-transform: uppercase;
    }

    /* MAIN SECTION */
    .main-section {
      width: 1480px;
      height: 710px;
      position: relative;
      display: grid;
      grid-template-columns: 350px 1fr 350px;
      gap: 20px;
      margin-top: 8px;
    }

    /* COLUMNS */
    .side-column {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      z-index: 20;
    }

    /* REGION CARDS */
    .region-card {
      background-color: #111827;
      border-width: 1.5px;
      border-style: solid;
      border-radius: 10px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
      height: 220px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .card-header {
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }
    .header-title {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }

    .bullet-list {
      list-style: none;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-around;
      flex: 1;
    }
    .bullet-list li {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 11.5px;
      line-height: 1.4;
      color: #e2e8f0;
    }
    .bullet-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      margin-top: 5px;
      flex-shrink: 0;
    }

    /* CENTER ILLUSTRATION AREA */
    .center-column {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at center, rgba(30, 41, 59, 0.5) 0%, rgba(10, 14, 39, 0) 75%);
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .base-img {
      max-width: ${imgWidth}px;
      max-height: ${imgHeight}px;
      object-fit: contain;
      filter: drop-shadow(0 0 25px rgba(0, 0, 0, 0.7));
    }

    /* SVG LEADER LINES OVERLAY */
    .svg-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 1480px;
      height: 710px;
      pointer-events: none;
      z-index: 10;
    }

    /* FOOTER */
    .bottom-footer {
      height: 190px;
      margin-top: 10px;
      display: flex;
      flex-direction: column;
    }
    .footer-heading {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: #64748b;
      text-transform: uppercase;
      text-align: center;
      margin-bottom: 8px;
    }
    .footer-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 10px;
      flex: 1;
    }
    .footer-card {
      background-color: #111827;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
    .footer-card-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }
    .footer-icon {
      font-size: 15px;
    }
    .footer-title {
      font-size: 11.5px;
      font-weight: 700;
      color: #f8fafc;
    }
    .footer-desc {
      font-size: 10.5px;
      line-height: 1.35;
      color: #94a3b8;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="top-header">
    <div class="top-title">${template.title}</div>
    ${template.subtitle ? `<div class="top-subtitle">${template.subtitle}</div>` : ""}
  </div>

  <!-- MAIN SECTION -->
  <div class="main-section">
    <!-- SVG Pointer Leader Lines -->
    <svg class="svg-overlay" xmlns="http://www.w3.org/2000/svg">
      ${svgLinesHtml}
    </svg>

    <!-- LEFT COLUMN -->
    <div class="side-column">
      ${leftRegions.map(renderRegionBox).join("")}
    </div>

    <!-- CENTER ILLUSTRATION -->
    <div class="center-column">
      <img class="base-img" src="${illustrationUri}" alt="${template.title}" />
    </div>

    <!-- RIGHT COLUMN -->
    <div class="side-column">
      ${rightRegions.map(renderRegionBox).join("")}
    </div>
  </div>

  <!-- FOOTER -->
  <div class="bottom-footer">
    <div class="footer-heading">Major Functions at a Glance</div>
    <div class="footer-grid">
      ${footerCardsHtml}
    </div>
  </div>

</body>
</html>`;
}

/**
 * Server-side HTML-to-PNG renderer for pixel-perfect infographic diagram generation.
 * Launches Puppeteer in headless mode, renders the structured template HTML, screenshots PNG buffer.
 * Gracefully handles Puppeteer environment errors without crashing the server.
 */
export async function renderInfographic(template: InfographicTemplate, customContent?: any): Promise<Buffer> {
  const htmlContent = buildInfographicHTML(template);
  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu"
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1536, height: 1024, deviceScaleFactor: 2 });
    await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });

    const screenshotBuffer = await page.screenshot({ type: "png", fullPage: false });
    return Buffer.from(screenshotBuffer);
  } catch (err: any) {
    console.error("[InfographicRenderer] Puppeteer launch or render failed:", err?.message || err);
    throw new Error(`Infographic rendering failed: ${err?.message || "Chromium missing or failed to launch"}`);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr: any) {
        console.warn("[InfographicRenderer] Error closing browser process:", closeErr?.message || closeErr);
      }
    }
  }
}
