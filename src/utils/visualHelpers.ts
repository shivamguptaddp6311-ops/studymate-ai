/**
 * Visual Helpers Utility
 */

export function isCapacitorNative(): boolean {
  return typeof (window as any)?.Capacitor !== "undefined";
}

/**
 * Handles CORS and HTTP requests safely on web and Capacitor Android
 */
export async function safeFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // If running in Capacitor Android environment, check for native HTTP if available
  if (isCapacitorNative() && (window as any)?.Capacitor?.Plugins?.CapacitorHttp) {
    try {
      const capHttp = (window as any).Capacitor.Plugins.CapacitorHttp;
      const resp = await capHttp.request({
        url,
        method: options.method || "GET",
        headers: options.headers as Record<string, string>,
        data: options.body
      });
      return new Response(typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data), {
        status: resp.status,
        headers: resp.headers
      });
    } catch (e) {
      console.warn("[VisualHelpers] CapacitorHttp request failed, falling back to window.fetch:", e);
    }
  }

  return fetch(url, options);
}

export function formatLicenseName(license?: string): string {
  if (!license) return "Public Domain / Educational";
  if (license.includes("CC-BY-SA")) return "Creative Commons BY-SA";
  if (license.includes("CC-BY")) return "Creative Commons BY";
  if (license.includes("CC0")) return "Creative Commons Zero (Public Domain)";
  if (license.includes("Unsplash")) return "Unsplash Free License";
  return license;
}

export function truncateText(text: string, maxLength: number = 120): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}
