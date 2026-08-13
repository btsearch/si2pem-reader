export const SI2PEM_ERROR_CODES = {
  httpError: "HTTP_ERROR",
  timeout: "TIMEOUT",
  responseTooLarge: "RESPONSE_TOO_LARGE",
  invalidResponse: "INVALID_RESPONSE",
  reportStationMismatch: "REPORT_STATION_MISMATCH",
  reportParseFailed: "REPORT_PARSE_FAILED",
} as const;

export type SI2PEMErrorCode = (typeof SI2PEM_ERROR_CODES)[keyof typeof SI2PEM_ERROR_CODES];

export class SI2PEMError extends Error {
  readonly code: SI2PEMErrorCode;
  readonly statusCode: number | null;

  constructor(code: SI2PEMErrorCode, message: string, options: { cause?: unknown; statusCode?: number } = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "SI2PEMError";
    this.code = code;
    this.statusCode = options.statusCode ?? null;
  }
}

export function isSI2PEMError(error: unknown): error is SI2PEMError {
  return error instanceof SI2PEMError;
}
