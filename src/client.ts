import { DEFAULT_MAX_PDF_BYTES, SI2PEM_ENDPOINTS, SI2PEM_FEATURE_TYPES } from "./constants.ts";
import { si2pemDateToISO } from "./dates.ts";
import { SI2PEMError, SI2PEM_ERROR_CODES } from "./errors.ts";
import { createBoundedHttp } from "./http.ts";
import type {
  GeoJsonFeatureCollection,
  GeoJsonGeometry,
  SI2PEMClientOptions,
  SI2PEMEndpoints,
  SI2PEMInstallation,
  SI2PEMLaboratoryReport,
  SI2PEMMeasureProperties,
  SI2PEMPaginatedResponse,
  SI2PEMPlannedMeasurement,
} from "./types.ts";
import { escapeCqlLiteral, normalizeSI2PEMReportUrl } from "./url.ts";
import { type WfsGetFeatureRequest, buildWfsGetFeatureUrl } from "./wfs.ts";
import { type WmsFeatureInfoRequest, buildWmsFeatureInfoUrl } from "./wms.ts";

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

export class SI2PEMClient {
  readonly endpoints: SI2PEMEndpoints;
  private readonly http: ReturnType<typeof createBoundedHttp>;
  private readonly maxJsonBytes: number;
  private readonly maxPdfBytes: number;

  constructor(options: SI2PEMClientOptions = {}) {
    this.endpoints = { ...SI2PEM_ENDPOINTS, ...options.endpoints };
    this.maxJsonBytes = options.maxJsonBytes ?? DEFAULT_MAX_JSON_BYTES;
    this.maxPdfBytes = options.maxPdfBytes ?? DEFAULT_MAX_PDF_BYTES;
    const headers = new Headers(options.headers);
    if (!headers.has("origin")) headers.set("origin", this.endpoints.origin);
    this.http = createBoundedHttp({
      fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
      headers,
      timeoutMs: options.timeoutMs,
    });
  }

  async getFeatures<Properties, Geometry extends GeoJsonGeometry | null = GeoJsonGeometry | null>(
    request: WfsGetFeatureRequest,
    options: GetFeaturesOptions = {},
  ): Promise<GeoJsonFeatureCollection<Properties, Geometry>> {
    return this.http.getJson<GeoJsonFeatureCollection<Properties, Geometry>>(
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
    const features = await this.getFeatures<SI2PEMMeasureProperties>({
      typeName: SI2PEM_FEATURE_TYPES.allMeasures,
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
      return [
        {
          url,
          publishedAt: si2pemDateToISO(properties.date),
          laboratoryName: properties.source ?? null,
          number: properties.number ?? null,
          identityNames,
          year: properties.year ?? null,
        },
      ];
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
