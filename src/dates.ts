export type ParseSI2PEMDateOptions = {
  utcOffsetMinutes?: number;
};

export function parseSI2PEMDate(value: string | null | undefined, options: ParseSI2PEMDateOptions = {}): Date | null {
  if (!value) return null;
  const polishDate = /^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/.exec(value);
  if (polishDate) {
    const [, day, month, year, hour = "0", minute = "0", second = "0"] = polishDate;
    const utc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
    return new Date(utc - (options.utcOffsetMinutes ?? 0) * 60_000);
  }

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)) - (options.utcOffsetMinutes ?? 0) * 60_000);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function si2pemDateToISO(value: string | null | undefined, options: ParseSI2PEMDateOptions = {}): string | null {
  return parseSI2PEMDate(value, options)?.toISOString() ?? null;
}
