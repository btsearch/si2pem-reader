import type { ExtractedPdfTextItem } from "./pdfText.ts";

export type SI2PEMTiltRange = {
  minimum: number;
  maximum: number;
};

export type SI2PEMAntennaBand = {
  label: string | null;
  technology: string | null;
  frequencyMHz: number;
  eirp: number | null;
  tiltRange: SI2PEMTiltRange | null;
  measuredTilt: number | null;
};

export type SI2PEMAntennaRow = {
  rowNumber: number | null;
  pageNumber: number;
  antenna: {
    model: string | null;
    manufacturer: string | null;
    mountedHeight: number;
    azimuth: number | null;
  };
  eirp: number | null;
  bands: SI2PEMAntennaBand[];
};

export type SI2PEMAntenna = SI2PEMAntennaBand & Omit<SI2PEMAntennaRow, "bands"> & { bandIndex: number };

type Frequency = {
  label: string;
  technology: string | null;
  frequencyMHz: number;
};

type Composite = {
  index: number;
  endIndex: number;
  pageNumber: number;
  mountedHeight: number;
  azimuth: number;
  eirp: number | null;
  inlineFrequency: Frequency | null;
};

const SAME_LINE_Y_TOLERANCE = 2;
const MERGED_CELL_Y_TOLERANCE = 16;
const MAX_TILT_DEG = 30;
const MAX_TILT_RANGE_ITEMS = 3;
const MAX_BANDS = 20;
const MAX_HEIGHT_M = 300;
const MAX_EIRP_W = 100_000_000;
const MIN_FREQUENCY_MHZ = 30;
const MAX_FREQUENCY_MHZ = 100_000;

function numberValue(value: string): number {
  return Number(value.replace(",", "."));
}

function boundedNumber(value: string, minimum: number, maximum: number, allowAsterisk = false): number | null {
  const compact = value.replace(/\s+/g, "");
  const pattern = allowAsterisk ? /^-?\d+(?:[.,]\d+)?\*?$/ : /^-?\d+(?:[.,]\d+)?$/;
  if (!pattern.test(compact)) return null;
  const parsed = numberValue(compact.replace(/\*$/, ""));
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function parseFrequency(value: string): Frequency | null {
  const label = value.replace(/\s+/g, "").toUpperCase();
  const match = /^(?:(5GNR|WCDMA|UMTS|LTE|GSM|DCS|NR))?(\d{2,5}(?:[.,]\d+)?)$/.exec(label);
  if (!match) return null;
  const frequencyMHz = boundedNumber(match[2]!, MIN_FREQUENCY_MHZ, MAX_FREQUENCY_MHZ);
  if (frequencyMHz === null) return null;
  return {
    label,
    technology: match[1] === "5GNR" ? "NR" : (match[1] ?? null),
    frequencyMHz,
  };
}

function closestMatch(pattern: RegExp, text: string, center: number): number | null {
  let closest: { distance: number; value: number } | null = null;
  for (const match of text.matchAll(pattern)) {
    const value = numberValue(match[1]!);
    if (!Number.isFinite(value)) continue;
    const distance = Math.abs((match.index ?? 0) - center);
    if (!closest || distance < closest.distance) closest = { distance, value };
  }
  return closest?.value ?? null;
}

function normalizeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function onSameLine(a: ExtractedPdfTextItem, b: ExtractedPdfTextItem, tolerance = SAME_LINE_Y_TOLERANCE): boolean {
  return a.pageNumber === b.pageNumber && Math.abs(a.y - b.y) <= tolerance;
}

function parseTiltRange(items: ExtractedPdfTextItem[]): SI2PEMTiltRange | null {
  const joined = items.map((item) => item.text.replace(/\s+/g, "")).join("");
  const match = /^(-?\d{1,2}(?:[.,]\d+)?)-(-?\d{1,2}(?:[.,]\d+)?)$/.exec(joined);
  if (!match) return null;
  const minimum = boundedNumber(match[1]!, -MAX_TILT_DEG, MAX_TILT_DEG);
  const maximum = boundedNumber(match[2]!, -MAX_TILT_DEG, MAX_TILT_DEG);
  if (minimum === null || maximum === null || minimum > maximum) return null;
  return { minimum, maximum };
}

function consumeTiltRanges(items: ExtractedPdfTextItem[], count: number): { ranges: SI2PEMTiltRange[]; rest: ExtractedPdfTextItem[] } | null {
  const ranges: SI2PEMTiltRange[] = [];
  let cursor = 0;
  while (ranges.length < count && cursor < items.length) {
    let consumed = 0;
    for (let span = 1; span <= MAX_TILT_RANGE_ITEMS && cursor + span <= items.length; span++) {
      const range = parseTiltRange(items.slice(cursor, cursor + span));
      if (range === null) continue;
      ranges.push(range);
      consumed = span;
      break;
    }
    if (!consumed) return null;
    cursor += consumed;
  }
  if (ranges.length < count) return null;
  return { ranges, rest: items.slice(cursor) };
}

function findCompositeItems(items: ExtractedPdfTextItem[], inheritedHeight: number | null, deferredEirp = false): Composite[] {
  const hasHeightCell = inheritedHeight === null;
  const hasEirpCell = !deferredEirp;
  const width = 1 + (hasHeightCell ? 1 : 0) + (hasEirpCell ? 1 : 0);
  const matches: Composite[] = [];
  for (let index = 0; index + width <= items.length; index++) {
    const first = items[index]!;
    const last = items[index + width - 1]!;
    if (!onSameLine(first, last, hasEirpCell ? SAME_LINE_Y_TOLERANCE : MERGED_CELL_Y_TOLERANCE)) continue;
    const azimuth = boundedNumber(first.text, 0, 360);
    if (azimuth === null) continue;
    const eirp = hasEirpCell ? boundedNumber(last.text, 0.1, MAX_EIRP_W, true) : null;
    if (hasEirpCell && eirp === null) continue;
    let mountedHeight = inheritedHeight;
    if (hasHeightCell) {
      const heightItem = items[index + 1]!;
      mountedHeight = onSameLine(first, heightItem, MERGED_CELL_Y_TOLERANCE) ? boundedNumber(heightItem.text, 0.1, MAX_HEIGHT_M) : null;
    }
    if (mountedHeight === null) continue;
    const next = items[index + width];
    const inlineFrequency = hasEirpCell && next && onSameLine(last, next) ? parseFrequency(next.text) : null;
    matches.push({
      index,
      endIndex: index + width + (inlineFrequency ? 1 : 0),
      pageNumber: first.pageNumber,
      mountedHeight,
      azimuth,
      eirp,
      inlineFrequency,
    });
  }
  return matches;
}

function parseFrequencies(items: ExtractedPdfTextItem[]): Frequency[] {
  const frequencies: Frequency[] = [];
  for (const item of items) {
    const frequency = parseFrequency(item.text);
    if (frequency === null) break;
    frequencies.push(frequency);
  }
  return frequencies;
}

function buildBands(frequencies: Frequency[], eirps: (number | null)[], items: ExtractedPdfTextItem[]): SI2PEMAntennaBand[] | null {
  const consumed = consumeTiltRanges(items, frequencies.length);
  if (consumed === null || consumed.rest.length !== frequencies.length) return null;
  const measuredTilts = consumed.rest.map((item) => boundedNumber(item.text, -MAX_TILT_DEG, MAX_TILT_DEG));
  if (measuredTilts.some((tilt) => tilt === null)) return null;
  return frequencies.map((frequency, index) => ({
    ...frequency,
    eirp: eirps[index] ?? null,
    tiltRange: consumed.ranges[index]!,
    measuredTilt: measuredTilts[index]!,
  }));
}

function parsePerBandEirpBands(suffix: ExtractedPdfTextItem[]): { eirp: number | null; bands: SI2PEMAntennaBand[] } | null {
  const eirps: number[] = [];
  for (const item of suffix) {
    const eirp = boundedNumber(item.text, 0.1, MAX_EIRP_W, true);
    if (eirp === null) break;
    eirps.push(eirp);
  }
  const candidates: SI2PEMAntennaBand[][] = [];
  for (let count = 1; count <= Math.min(eirps.length, MAX_BANDS) && count * 2 <= suffix.length; count++) {
    const frequencies = parseFrequencies(suffix.slice(count, count * 2));
    if (frequencies.length !== count) continue;
    const bands = buildBands(frequencies, eirps.slice(0, count), suffix.slice(count * 2));
    if (bands !== null) candidates.push(bands);
  }
  if (candidates.length !== 1) return null;
  const bands = candidates[0]!;
  const uniformEirp = new Set(bands.map((band) => band.eirp)).size === 1;
  return { eirp: uniformEirp ? bands[0]!.eirp : null, bands };
}

function buildRow(
  rowNumber: number,
  items: ExtractedPdfTextItem[],
  composite: Composite,
  previous: SI2PEMAntennaRow | null,
): SI2PEMAntennaRow | null {
  const prefix = items
    .slice(0, composite.index)
    .map((item) => item.text.trim())
    .filter(Boolean);
  const inherited = prefix.length === 0 ? previous : null;
  const suffix = items.slice(composite.endIndex);
  let bands: SI2PEMAntennaBand[];
  let eirp = composite.eirp;

  if (composite.eirp === null) {
    const perBand = parsePerBandEirpBands(suffix);
    if (perBand === null) return null;
    eirp = perBand.eirp;
    bands = perBand.bands;
  } else if (composite.inlineFrequency) {
    if (suffix.length < 2 || suffix.length > 3) return null;
    const tiltRangeDeg = parseTiltRange(suffix.slice(0, -1));
    const measuredTiltDeg = boundedNumber(suffix.at(-1)!.text, -MAX_TILT_DEG, MAX_TILT_DEG);
    if (tiltRangeDeg === null || measuredTiltDeg === null) return null;
    bands = [{ ...composite.inlineFrequency, eirp: composite.eirp, tiltRange: tiltRangeDeg, measuredTilt: measuredTiltDeg }];
  } else {
    const frequencies = parseFrequencies(suffix);
    if (!frequencies.length || frequencies.length > MAX_BANDS) return null;
    const bandEirps = frequencies.length === 1 ? [composite.eirp] : frequencies.map(() => null);
    const built = buildBands(frequencies, bandEirps, suffix.slice(frequencies.length));
    if (built === null) return null;
    bands = built;
  }

  return {
    rowNumber,
    pageNumber: composite.pageNumber,
    antenna: {
      model: prefix.at(-2) ?? inherited?.antenna.model ?? null,
      manufacturer: prefix.at(-1) ?? inherited?.antenna.manufacturer ?? null,
      mountedHeight: composite.mountedHeight,
      azimuth: composite.azimuth,
    },
    eirp,
    bands,
  };
}

function parseTableRow(rowNumber: number, items: ExtractedPdfTextItem[], previous: SI2PEMAntennaRow | null): SI2PEMAntennaRow | null {
  const stages = [
    findCompositeItems(items, null),
    findCompositeItems(items, null, true),
    previous ? findCompositeItems(items, previous.antenna.mountedHeight) : [],
    previous ? findCompositeItems(items, previous.antenna.mountedHeight, true) : [],
  ];
  for (const composites of stages) {
    const rows = composites.map((composite) => buildRow(rowNumber, items, composite, previous)).filter((row) => row !== null);
    if (rows.length === 1) return rows[0]!;
    if (rows.length > 1) return null;
  }
  return null;
}

function isRowNumber(text: string, value: number): boolean {
  return new RegExp(`^${value}[a-z]?$`, "i").test(text.trim());
}

function parseTableRows(items: ExtractedPdfTextItem[]): SI2PEMAntennaRow[] {
  const markerIndex = items.findIndex((item) => normalizeLabel(item.text).includes("tabela1:opisantenbadanychstacjibazowych"));
  if (markerIndex < 0) return [];

  const headerIndex = items.findIndex((item, index) => {
    if (index <= markerIndex || normalizeLabel(item.text) !== "lp.") return false;
    const headerLabels = new Set(items.slice(index, index + 20).map((entry) => normalizeLabel(entry.text)));
    return ["azymut", "h", "eirp", "pasmo", "tilt"].every((label) => headerLabels.has(label));
  });
  if (headerIndex < 0) return [];

  const rows: SI2PEMAntennaRow[] = [];
  let rowStart = markerIndex + 1;
  let expectedRowNumber = 1;
  while (rowStart < headerIndex) {
    const currentRowIndex = items.findIndex((item, index) => index >= rowStart && index < headerIndex && isRowNumber(item.text, expectedRowNumber));
    if (currentRowIndex < 0) return [];
    const nextRowIndex = items.findIndex(
      (item, index) => index > currentRowIndex && index < headerIndex && isRowNumber(item.text, expectedRowNumber + 1),
    );
    const rowEnd = nextRowIndex < 0 ? headerIndex : nextRowIndex;
    const row = parseTableRow(expectedRowNumber, items.slice(currentRowIndex + 1, rowEnd), rows.at(-1) ?? null);
    if (!row) return [];
    rows.push(row);
    if (nextRowIndex < 0) break;
    rowStart = nextRowIndex;
    expectedRowNumber++;
  }

  return rows;
}

function parseProseRows(items: ExtractedPdfTextItem[]): SI2PEMAntennaRow[] {
  const normalized = items.map((item) => item.text.normalize("NFC").replace(/[ \t]+/g, " "));
  const itemStarts: number[] = [];
  let joinedLength = 0;
  for (const value of normalized) {
    itemStarts.push(joinedLength);
    joinedLength += value.length + 1;
  }
  const text = normalized.join("\n");
  const pageNumberAt = (offset: number): number => {
    let index = 0;
    while (index + 1 < itemStarts.length && itemStarts[index + 1]! <= offset) index++;
    return items[index]?.pageNumber ?? 0;
  };
  const heightPattern = /wysoko(?:ść|sc)(?:\s+zawieszenia)?\s+anten(?:y|na)[^\d]{0,100}(\d{1,3}(?:[.,]\d+)?)\s*m/giu;
  const azimuthPattern = /azymut[^\d]{0,80}(\d{1,3}(?:[.,]\d+)?)/giu;
  const frequencyPattern = /(?:częstotliwo(?:ść|sc)|pasmo|frequency)[^\d]{0,100}(\d{2,5}(?:[.,]\d+)?)\s*(?:MHz)?/giu;
  const tiltPattern = /(?:pochylenie|tilt)[^\d-]{0,60}(-?\d{1,2}(?:[.,]\d+)?)/giu;
  const rows: SI2PEMAntennaRow[] = [];
  const seen = new Set<string>();

  for (const heightMatch of text.matchAll(heightPattern)) {
    const heightAglM = numberValue(heightMatch[1]!);
    if (!Number.isFinite(heightAglM) || heightAglM <= 0 || heightAglM > MAX_HEIGHT_M) continue;
    const center = heightMatch.index ?? 0;
    const windowStart = Math.max(0, center - 500);
    const windowText = text.slice(windowStart, center + 500);
    const localCenter = center - windowStart;
    const azimuthDeg = closestMatch(azimuthPattern, windowText, localCenter);
    const frequencyMHz = closestMatch(frequencyPattern, windowText, localCenter);
    const measuredTiltDeg = closestMatch(tiltPattern, windowText, localCenter);
    if (frequencyMHz === null || frequencyMHz < MIN_FREQUENCY_MHZ || frequencyMHz > MAX_FREQUENCY_MHZ) continue;
    const fingerprint = [heightAglM, azimuthDeg, measuredTiltDeg, frequencyMHz].join(":");
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    rows.push({
      rowNumber: null,
      pageNumber: pageNumberAt(center),
      antenna: {
        model: null,
        manufacturer: null,
        mountedHeight: heightAglM,
        azimuth: azimuthDeg !== null && azimuthDeg <= 360 ? azimuthDeg : null,
      },
      eirp: null,
      bands: [
        {
          label: String(frequencyMHz),
          technology: null,
          frequencyMHz,
          eirp: null,
          tiltRange: null,
          measuredTilt: measuredTiltDeg,
        },
      ],
    });
  }

  return rows;
}

export function parseSI2PEMAntennaRows(items: ExtractedPdfTextItem[]): SI2PEMAntennaRow[] {
  const tableRows = parseTableRows(items);
  return tableRows.length > 0 ? tableRows : parseProseRows(items);
}

export function flattenSI2PEMAntennaRows(rows: SI2PEMAntennaRow[]): SI2PEMAntenna[] {
  return rows.flatMap((row) =>
    row.bands.map((band, bandIndex) => ({
      ...band,
      rowNumber: row.rowNumber,
      pageNumber: row.pageNumber,
      antenna: { ...row.antenna },
      eirp: band.eirp ?? row.eirp,
      bandIndex,
    })),
  );
}
