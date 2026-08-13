import { SI2PEMError, SI2PEM_ERROR_CODES } from "./errors.ts";
import type { SI2PEMFetch } from "./types.ts";

export type BoundedHttpOptions = {
  fetch?: SI2PEMFetch;
  headers?: HeadersInit;
  timeoutMs?: number;
};

export type BoundedRequestInit = RequestInit & {
  maxRedirects?: number;
  timeoutMs?: number;
  validateUrl?: (url: URL) => URL;
};

const DEFAULT_HTTP_TIMEOUT_MS = 12_000;

export type BinaryResponse = {
  bytes: Uint8Array;
  contentType: string | null;
  url: string;
};

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function mergeHeaders(defaults: HeadersInit, overrides: HeadersInit | undefined): Headers {
  const headers = new Headers(defaults);
  new Headers(overrides).forEach((value, key) => headers.set(key, value));
  return headers;
}

async function readBoundedBody(response: Response, maxBytes: number): Promise<Uint8Array> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes)
    throw new SI2PEMError(SI2PEM_ERROR_CODES.responseTooLarge, "SI2PEM response exceeds the configured size limit");
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    // oxlint-disable-next-line no-await-in-loop
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      // oxlint-disable-next-line no-await-in-loop
      await reader.cancel();
      throw new SI2PEMError(SI2PEM_ERROR_CODES.responseTooLarge, "SI2PEM response exceeds the configured size limit");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export function createBoundedHttp(options: BoundedHttpOptions = {}) {
  const fetchImplementation = options.fetch ?? globalThis.fetch.bind(globalThis);
  const defaultHeaders = options.headers ?? {};
  const defaultTimeoutMs = options.timeoutMs ?? DEFAULT_HTTP_TIMEOUT_MS;

  async function getBytes(url: string | URL, maxBytes: number, init: BoundedRequestInit = {}): Promise<BinaryResponse> {
    const { maxRedirects = 5, timeoutMs, validateUrl, ...requestInit } = init;
    const controller = new AbortController();
    const abortFromCaller = () => controller.abort(init.signal?.reason);
    if (init.signal?.aborted) abortFromCaller();
    else init.signal?.addEventListener("abort", abortFromCaller, { once: true });
    const timeout = setTimeout(() => controller.abort(), timeoutMs ?? defaultTimeoutMs);

    try {
      let requestUrl = validateUrl ? validateUrl(new URL(url)) : url;
      let response: Response;
      let redirects = 0;
      while (true) {
        // oxlint-disable-next-line no-await-in-loop
        response = await fetchImplementation(requestUrl, {
          ...requestInit,
          headers: mergeHeaders(defaultHeaders, init.headers),
          redirect: validateUrl ? "manual" : requestInit.redirect,
          signal: controller.signal,
        });
        if (!validateUrl || !REDIRECT_STATUSES.has(response.status)) break;
        if (redirects >= maxRedirects) throw new SI2PEMError(SI2PEM_ERROR_CODES.invalidResponse, "SI2PEM returned too many redirects");
        const location = response.headers.get("location");
        if (!location) throw new SI2PEMError(SI2PEM_ERROR_CODES.invalidResponse, "SI2PEM redirect is missing a location");
        requestUrl = validateUrl(new URL(location, requestUrl));
        redirects += 1;
        // oxlint-disable-next-line no-await-in-loop
        await response.body?.cancel();
      }
      if (validateUrl && response.url) validateUrl(new URL(response.url));
      if (!response.ok)
        throw new SI2PEMError(SI2PEM_ERROR_CODES.httpError, `SI2PEM returned HTTP ${response.status}`, { statusCode: response.status });
      return {
        bytes: await readBoundedBody(response, maxBytes),
        contentType: response.headers.get("content-type"),
        url: response.url || String(requestUrl),
      };
    } catch (error) {
      if (error instanceof SI2PEMError) throw error;
      if (controller.signal.aborted && !init.signal?.aborted)
        throw new SI2PEMError(SI2PEM_ERROR_CODES.timeout, "SI2PEM request timed out", {
          cause: error,
        });
      throw new SI2PEMError(SI2PEM_ERROR_CODES.httpError, "SI2PEM request failed", {
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
      init.signal?.removeEventListener("abort", abortFromCaller);
    }
  }

  async function getText(url: string | URL, maxBytes: number, init: BoundedRequestInit = {}): Promise<string> {
    return new TextDecoder().decode((await getBytes(url, maxBytes, init)).bytes);
  }

  async function getJson<Result>(url: string | URL, maxBytes: number, init: BoundedRequestInit = {}): Promise<Result> {
    const text = await getText(url, maxBytes, init);
    try {
      return JSON.parse(text) as Result;
    } catch (error) {
      throw new SI2PEMError(SI2PEM_ERROR_CODES.invalidResponse, "SI2PEM returned invalid JSON", {
        cause: error,
      });
    }
  }

  return { getBytes, getText, getJson };
}

export type BoundedHttp = ReturnType<typeof createBoundedHttp>;
