export async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new Error("Operation cancelled prior to delay"));
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error("Operation cancelled during delay"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export interface FetchJsonOptions extends RequestInit {
  timeoutMs?: number;
}

export async function fetchJson<T = any>(
  url: string,
  options: FetchJsonOptions = {}
): Promise<T> {
  const { timeoutMs = 60000, signal, headers, ...restOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const onExternalAbort = () => {
    controller.abort();
  };

  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeoutId);
      throw new Error("Request cancelled prior to fetch");
    }
    signal.addEventListener("abort", onExternalAbort, { once: true });
  }

  try {
    const res = await fetch(url, {
      ...restOptions,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener("abort", onExternalAbort);
    }

    const textData = await res.text();
    let jsonData: any;
    try {
      jsonData = JSON.parse(textData);
    } catch {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${textData.slice(0, 200)}`);
      }
      throw new Error(`Invalid JSON response received from ${url}`);
    }

    if (!res.ok) {
      const errorMsg =
        jsonData?.message ||
        jsonData?.error?.message ||
        jsonData?.ErrMsg ||
        jsonData?.error ||
        `HTTP ${res.status} ${res.statusText}`;
      const err: any = new Error(errorMsg);
      err.status = res.status;
      err.responseBody = jsonData;
      throw err;
    }

    return jsonData as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener("abort", onExternalAbort);
    }
    if (controller.signal.aborted && !signal?.aborted) {
      throw new Error(`Request timeout of ${timeoutMs}ms exceeded while calling ${url}`);
    }
    throw err;
  }
}

export interface PollUntilOptions {
  intervalMs?: number;
  maxTimeoutMs?: number;
  signal?: AbortSignal;
}

export async function pollUntil<T>(
  pollFn: () => Promise<T>,
  checkDone: (res: T) => boolean,
  options: PollUntilOptions = {}
): Promise<T> {
  const { intervalMs = 4000, maxTimeoutMs = 180000, signal } = options;
  const startTime = Date.now();

  while (true) {
    if (signal?.aborted) {
      throw new Error("Polling cancelled by client abort signal");
    }

    if (Date.now() - startTime > maxTimeoutMs) {
      throw new Error(`Polling timed out after ${Math.round(maxTimeoutMs / 1000)} seconds`);
    }

    const result = await pollFn();
    if (checkDone(result)) {
      return result;
    }

    await sleep(intervalMs, signal);
  }
}
