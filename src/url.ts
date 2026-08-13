import { SI2PEMError, SI2PEM_ERROR_CODES } from "./errors.ts";

export function escapeCqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function normalizeHostname(value: string): string {
  return value.toLowerCase().replace(/\.$/, "");
}

export function normalizeSI2PEMReportUrl(value: string | URL, trustedOrigin: string | URL): URL {
  const origin = new URL(trustedOrigin);
  const url = new URL(value, origin);
  const trustedHostname = normalizeHostname(origin.hostname);
  const hostname = normalizeHostname(url.hostname);
  const isTrustedHostname = hostname === trustedHostname || hostname.endsWith(`.${trustedHostname}`);
  if ((url.protocol !== "http:" && url.protocol !== "https:") || !isTrustedHostname || url.username || url.password)
    throw new SI2PEMError(SI2PEM_ERROR_CODES.invalidResponse, "SI2PEM report URL is not trusted");
  url.protocol = "https:";
  url.port = "";
  return url;
}

export function containsSI2PEMStationIdentity(text: string, expectedIdentity: string): boolean {
  const identity = expectedIdentity.trim();
  if (!identity) return false;
  const escapedIdentity = identity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}_-])${escapedIdentity}(?![\\p{L}\\p{N}_-])`, "iu").test(text);
}
