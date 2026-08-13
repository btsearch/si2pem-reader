import { DEFAULT_MAX_PDF_BYTES, SI2PEM_ENDPOINTS, SI2PEM_WFS_FEATURE_TYPES } from "./constants.ts";
import { si2pemDateToISO } from "./dates.ts";
import { SI2PEMError, SI2PEM_ERROR_CODES } from "./errors.ts";
import { createHttpClient } from "./http.ts";
import type { BinaryResponse } from "./http.ts";
import type {
  GeoJsonFeatureCollection,
  GeoJsonGeometry,
  GeoJsonPoint,
  SI2PEMClientOptions,
  SI2PEMEndpoints,
  SI2PEMFeaturePropertiesMap,
  SI2PEMInstallation,
  SI2PEMLaboratoryReport,
  SI2PEMLaboratoryReportData,
  SI2PEMPaginatedResponse,
  SI2PEMPlannedMeasurement,
} from "./types.ts";
import { escapeCqlLiteral, normalizeSI2PEMReportUrl } from "./url.ts";
import { type WfsGetFeatureRequest, buildWfsGetFeatureUrl } from "./wfs.ts";
import { type WmsFeatureInfoRequest, type WmsMapRequest, buildWmsFeatureInfoUrl, buildWmsMapUrl } from "./wms.ts";

const DEFAULT_MAX_JSON_BYTES = 8 * 1024 * 1024;

export type ListInstallationsRequest = {
  baseStation: string;
  entity?: string;
  venueCity?: string;
  street?: string;
  voivodeship?: string;
  county?: string;
  page?: number;
  pageSize?: number;
};

export type ListPlannedMeasurementsRequest = {
  page?: number;
  pageSize?: number;
  operator?: string;
  status?: string;
  baseStation?: string;
  voivodeship?: string;
};

export type GetFeaturesOptions = {
  maxJsonBytes?: number;
};

export type GetWmsMapOptions = {
  maxBytes?: number;
};

export type FindLaboratoryReportsRequest = {
  stationIdentity: string;
  laboratoryName?: string;
  count?: number;
};

function buildRestUrl(endpoint: string, params: Record<string, string | number | undefined>): URL {
  const url = new URL(endpoint);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url;
}

function isPdf(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && new TextDecoder("ascii").decode(bytes.subarray(0, 5)) === "%PDF-";
}

type ReportDownloader = {
  downloadReport(url: string): Promise<Uint8Array>;
};

class LaboratoryReport implements SI2PEMLaboratoryReport {
  readonly url: string;
  readonly publishedAt: string | null;
  readonly laboratoryName: string | null;
  readonly number: string | null;
  readonly identityNames: string;
  readonly year: number | null;
  readonly #downloader: ReportDownloader;
  readonly #expectedStationIdentity: string;

  constructor(data: SI2PEMLaboratoryReportData, expectedStationIdentity: string, downloader: ReportDownloader) {
    this.url = data.url;
    this.publishedAt = data.publishedAt;
    this.laboratoryName = data.laboratoryName;
    this.number = data.number;
    this.identityNames = data.identityNames;
    this.year = data.year;
    this.#expectedStationIdentity = expectedStationIdentity;
    this.#downloader = downloader;
  }

  async readAntennas(): Promise<import("./reports/antennaParser.ts").SI2PEMAntenna[]> {
    const pdf = await this.#downloader.downloadReport(this.url);
    const { parseAntennaReport } = await import("./reports/antennaReport.ts");
    const parsed = await parseAntennaReport(pdf, {
      report: this,
      expectedStationIdentity: this.#expectedStationIdentity,
    });
    return parsed.antennas;
  }
}

export class SI2PEMClient {
  readonly endpoints: SI2PEMEndpoints;
  private readonly http: ReturnType<typeof createHttpClient>;
  private readonly maxJsonBytes: number;
  private readonly maxPdfBytes: number;

  constructor(options: SI2PEMClientOptions = {}) {
    this.endpoints = { ...SI2PEM_ENDPOINTS, ...options.endpoints };
    this.maxJsonBytes = options.maxJsonBytes ?? DEFAULT_MAX_JSON_BYTES;
    this.maxPdfBytes = options.maxPdfBytes ?? DEFAULT_MAX_PDF_BYTES;
    const headers = new Headers(options.headers);
    if (!headers.has("origin")) headers.set("origin", this.endpoints.origin);
    this.http = createHttpClient({
      fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
      headers,
      timeoutMs: options.timeoutMs,
    });
  }

  async getFeatures<TypeName extends keyof SI2PEMFeaturePropertiesMap>(
    request: WfsGetFeatureRequest<TypeName>,
    options: GetFeaturesOptions = {},
  ): Promise<GeoJsonFeatureCollection<SI2PEMFeaturePropertiesMap[TypeName], GeoJsonPoint | null>> {
    return this.http.getJson<GeoJsonFeatureCollection<SI2PEMFeaturePropertiesMap[TypeName], GeoJsonPoint | null>>(
      buildWfsGetFeatureUrl(this.endpoints.wfs, request),
      options.maxJsonBytes ?? this.maxJsonBytes,
      { headers: { Accept: "application/json" } },
    );
  }

  async getWmsFeatureInfo<Properties, Geometry extends GeoJsonGeometry | null = GeoJsonGeometry | null>(
    request: WmsFeatureInfoRequest,
  ): Promise<GeoJsonFeatureCollection<Properties, Geometry>> {
    return this.http.getJson<GeoJsonFeatureCollection<Properties, Geometry>>(buildWmsFeatureInfoUrl(this.endpoints.wms, request), this.maxJsonBytes, {
      headers: { Accept: "application/json" },
    });
  }

  async getWmsMap(request: WmsMapRequest, options: GetWmsMapOptions = {}): Promise<BinaryResponse> {
    return this.http.getBytes(buildWmsMapUrl(this.endpoints.wms, request), options.maxBytes ?? this.maxJsonBytes, {
      headers: { Accept: request.format ?? "image/png" },
    });
  }

  async listInstallations(request: ListInstallationsRequest): Promise<SI2PEMPaginatedResponse<SI2PEMInstallation>> {
    const url = buildRestUrl(this.endpoints.installations, {
      base_station: request.baseStation,
      entity: request.entity,
      venue_city: request.venueCity ?? "",
      street: request.street ?? "",
      voivodeship: request.voivodeship ?? "",
      county: request.county ?? "",
      page: request.page ?? 1,
      page_size: request.pageSize ?? 25,
    });
    return this.http.getJson(url, this.maxJsonBytes, { headers: { Accept: "application/json" } });
  }

  async listPlannedMeasurements(request: ListPlannedMeasurementsRequest = {}): Promise<SI2PEMPaginatedResponse<SI2PEMPlannedMeasurement>> {
    const url = buildRestUrl(this.endpoints.plannedMeasurements, {
      page: request.page ?? 1,
      page_size: request.pageSize ?? 25,
      operator: request.operator,
      status: request.status,
      base_station: request.baseStation,
      voivodeship: request.voivodeship,
    });
    return this.http.getJson(url, this.maxJsonBytes, { headers: { Accept: "application/json" } });
  }

  async findLaboratoryReports(request: FindLaboratoryReportsRequest): Promise<SI2PEMLaboratoryReport[]> {
    const stationIdentity = escapeCqlLiteral(request.stationIdentity);
    const features = await this.getFeatures({
      typeName: SI2PEM_WFS_FEATURE_TYPES.allMeasures,
      count: request.count ?? 100,
      sortBy: "date D",
      cqlFilter: `identity_names = '${stationIdentity}' AND url IS NOT NULL AND measure_type='lab'`,
    });
    const reports = features.features.flatMap((feature) => {
      const properties = feature.properties;
      const url = properties.url ?? null;
      const identityNames = properties.identity_names ?? "";
      if (!url) return [];
      if (request.laboratoryName && properties.source !== request.laboratoryName) return [];
      const report: SI2PEMLaboratoryReportData = {
        url,
        publishedAt: si2pemDateToISO(properties.date),
        laboratoryName: properties.source ?? null,
        number: properties.number ?? null,
        identityNames,
        year: properties.year ?? null,
      };
      return [new LaboratoryReport(report, request.stationIdentity, this)];
    });
    const seen = new Set<string>();
    return reports
      .toSorted((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
      .filter((report) => !seen.has(report.url) && Boolean(seen.add(report.url)));
  }

  async getLatestLaboratoryReport(request: FindLaboratoryReportsRequest): Promise<SI2PEMLaboratoryReport | null> {
    return (await this.findLaboratoryReports({ ...request, count: request.count ?? 10 }))[0] ?? null;
  }

  async downloadReport(url: string): Promise<Uint8Array> {
    const validateUrl = (value: URL) => normalizeSI2PEMReportUrl(value, this.endpoints.origin);
    const response = await this.http.getBytes(validateUrl(new URL(url, this.endpoints.origin)), this.maxPdfBytes, {
      headers: { Accept: "application/pdf" },
      validateUrl,
    });
    if (!isPdf(response.bytes)) throw new SI2PEMError(SI2PEM_ERROR_CODES.invalidResponse, "SI2PEM report is not a PDF document");
    return response.bytes;
  }
}
