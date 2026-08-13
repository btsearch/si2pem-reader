import type { SI2PEMClient } from "../client.ts";
import { SI2PEMError, SI2PEM_ERROR_CODES } from "../errors.ts";
import type { SI2PEMLaboratoryReport } from "../types.ts";
import { containsSI2PEMStationIdentity } from "../url.ts";
import { type SI2PEMAntenna, type SI2PEMAntennaRow, flattenSI2PEMAntennaRows, parseSI2PEMAntennaRows } from "./antennaParser.ts";
import { extractPdfTextItems } from "./pdfText.ts";

export type ParseAntennaReportOptions = {
  report?: SI2PEMLaboratoryReport | null;
  expectedStationIdentity?: string;
};

export type ReadAntennaReportOptions = {
  expectedStationIdentity?: string;
};

export type SI2PEMAntennaReport = {
  url: string | null;
  report: SI2PEMLaboratoryReport | null;
  pdf: Uint8Array;
  rows: SI2PEMAntennaRow[];
  antennas: SI2PEMAntenna[];
};

export async function parseAntennaReport(pdf: Uint8Array, options: ParseAntennaReportOptions = {}): Promise<SI2PEMAntennaReport> {
  const report = options.report ?? null;
  const items = await extractPdfTextItems(pdf);
  if (options.expectedStationIdentity) {
    const text = items.map((item) => item.text).join("\n");
    if (!containsSI2PEMStationIdentity(text, options.expectedStationIdentity))
      throw new SI2PEMError(SI2PEM_ERROR_CODES.reportStationMismatch, "SI2PEM report does not contain the expected station identity");
  }
  const rows = parseSI2PEMAntennaRows(items);
  if (!rows.length) throw new SI2PEMError(SI2PEM_ERROR_CODES.reportParseFailed, "SI2PEM antenna table could not be parsed");
  return {
    url: report?.url ?? null,
    report,
    pdf,
    rows,
    antennas: flattenSI2PEMAntennaRows(rows),
  };
}

export async function readAntennaReport(
  source: Pick<SI2PEMClient, "downloadReport">,
  report: SI2PEMLaboratoryReport | string,
  options: ReadAntennaReportOptions = {},
): Promise<SI2PEMAntennaReport> {
  const url = typeof report === "string" ? report : report.url;
  const pdf = await source.downloadReport(url);
  const parsed = await parseAntennaReport(pdf, {
    report: typeof report === "string" ? null : report,
    expectedStationIdentity: options.expectedStationIdentity,
  });
  return { ...parsed, url };
}
