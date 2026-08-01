import { serverLogger } from "../logger";

export interface VideoProviderStatus {
  veo: boolean;
  pixverse: boolean;
  luma: boolean;
  kling: boolean;
}

/**
 * Validates availability of environment keys required for video generation providers.
 * Logs configured vs missing providers on startup.
 * 
 * @param strict If true, throws an Error if any provider key is missing. Default: false.
 */
export function validateVideoProviderKeys(strict = false): VideoProviderStatus {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const pixverseKey = process.env.PIXVERSE_API_KEY?.trim();
  const lumaKey = process.env.LUMA_API_KEY?.trim();
  const falKey = (process.env.FAL_KEY || process.env.FAL_API_KEY)?.trim();

  const status: VideoProviderStatus = {
    veo: Boolean(geminiKey),
    pixverse: Boolean(pixverseKey),
    luma: Boolean(lumaKey),
    kling: Boolean(falKey),
  };

  const veoLabel = status.veo ? "✓ Veo (Gemini) configured" : "✗ Veo (Gemini) not configured (GEMINI_API_KEY)";
  const pixverseLabel = status.pixverse ? "✓ PixVerse not configured" : "✗ PixVerse not configured (PIXVERSE_API_KEY)";
  const lumaLabel = status.luma ? "✓ Luma configured" : "✗ Luma not configured (LUMA_API_KEY)";
  const klingLabel = status.kling ? "✓ Kling (fal.ai) configured" : "✗ Kling (fal.ai) not configured (FAL_KEY)";

  const formattedOutput = [
    "[Video AI Providers Startup Check]",
    status.veo ? "  ✓ Veo (Gemini) configured" : "  ✗ Veo (Gemini) not configured (GEMINI_API_KEY)",
    status.pixverse ? "  ✓ PixVerse configured" : "  ✗ PixVerse not configured (PIXVERSE_API_KEY)",
    status.luma ? "  ✓ Luma configured" : "  ✗ Luma not configured (LUMA_API_KEY)",
    status.kling ? "  ✓ Kling (fal.ai) configured" : "  ✗ Kling (fal.ai) not configured (FAL_KEY)"
  ].join("\n");

  console.log(`\n${formattedOutput}\n`);

  if (typeof serverLogger !== "undefined" && serverLogger.info) {
    serverLogger.info("VideoProviders", `Status: Veo=${status.veo}, PixVerse=${status.pixverse}, Luma=${status.luma}, Kling=${status.kling}`);
  }

  const missingProviders: string[] = [];
  if (!status.veo) missingProviders.push("GEMINI_API_KEY (Veo)");
  if (!status.pixverse) missingProviders.push("PIXVERSE_API_KEY (PixVerse)");
  if (!status.luma) missingProviders.push("LUMA_API_KEY (Luma)");
  if (!status.kling) missingProviders.push("FAL_KEY (Kling)");

  if (strict && missingProviders.length > 0) {
    throw new Error(
      `[Video AI Config Error] Missing video provider API keys: ${missingProviders.join(", ")}`
    );
  }

  return status;
}
