const loggedWarnings = new Set<string>();

export class EnvGuard {
  static getKey(keyName: string): string | null {
    const value = import.meta.env[keyName];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    return null;
  }

  static hasKey(keyName: string, providerName: string): boolean {
    const key = this.getKey(keyName);
    if (!key) {
      if (!loggedWarnings.has(providerName)) {
        console.info(`[EnvGuard] Provider ${providerName} disabled - missing env key (${keyName})`);
        loggedWarnings.add(providerName);
      }
      return false;
    }
    return true;
  }

  static getSecuritySummary(): { keyName: string; isExposedToClient: boolean; recommendation: string }[] {
    return [
      {
        keyName: "VITE_YOUTUBE_KEY",
        isExposedToClient: true,
        recommendation: "Exposed via VITE_ prefix. Recommend routing YouTube requests via Firebase Cloud Functions or backend proxy in production to prevent key quota abuse."
      },
      {
        keyName: "VITE_UNSPLASH_ACCESS_KEY",
        isExposedToClient: true,
        recommendation: "Exposed via VITE_ prefix. Recommend moving Unsplash API calls to backend proxy to hide client ID."
      },
      {
        keyName: "VITE_NASA_KEY",
        isExposedToClient: true,
        recommendation: "Exposed via VITE_ prefix. Recommend proxying or restricting API key domain in NASA developer portal."
      }
    ];
  }
}
