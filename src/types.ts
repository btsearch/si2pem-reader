export type SI2PEMFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type SI2PEMClientOptions = {
  fetch?: SI2PEMFetch;
  endpoints?: Partial<SI2PEMEndpoints>;
  headers?: HeadersInit;
  timeoutMs?: number;
  maxJsonBytes?: number;
  maxPdfBytes?: number;
};

export type SI2PEMEndpoints = {
  origin: string;
  wfs: string;
  wms: string;
  installations: string;
  plannedMeasurements: string;
};

export type GeoJsonPoint = {
  type: "Point";
  coordinates: [number, number];
};

export type GeoJsonGeometry = {
  type: string;
  coordinates: unknown;
};

export type GeoJsonFeature<Properties, Geometry extends GeoJsonGeometry | null = GeoJsonGeometry | null> = {
  type: "Feature";
  id?: string;
  geometry: Geometry;
  properties: Properties;
};

export type GeoJsonFeatureCollection<Properties, Geometry extends GeoJsonGeometry | null = GeoJsonGeometry | null> = {
  type: "FeatureCollection";
  features: GeoJsonFeature<Properties, Geometry>[];
  totalFeatures?: number | string;
  numberMatched?: number;
  numberReturned?: number;
};

export type SI2PEMMeasureProperties = {
  intensity?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  source?: string | null;
  county_id?: number | null;
  number?: string | null;
  below_sensitivity?: boolean | null;
  date?: string | null;
  year?: number | null;
  url?: string | null;
  wm_e?: number | null;
  identity_names?: string | null;
  source_for_filter?: string | null;
  e_intensity_max?: number | null;
  bts_nonexistent?: boolean | null;
  is_old?: boolean | null;
  measure_type?: string | null;
};

export type SI2PEMSimpleBaseStationProperties = {
  identity_name?: string | null;
  city?: string | null;
  address?: string | null;
  teryt?: number | null;
  is_calculable?: boolean | null;
  is_active?: boolean | null;
  is_included_in_recent_simulation?: boolean | null;
  operator_name?: string | null;
  is_old?: boolean | null;
  owner_id?: number | null;
  is_shared?: boolean | null;
};

export type SI2PEMExtendedBaseStationProperties = SI2PEMSimpleBaseStationProperties & {
  no_permit?: boolean | null;
  permit?: string | null;
  disabling_date?: string | null;
};

export type SI2PEMPlannedMeasureProperties = {
  bs_identity_name: string;
  bs_name: string;
  city: string;
  location_in_city: string;
  date_from: string;
  date_to: string;
  installation_operator_name: string;
  laboratory_name: string;
  laboratory_pca: string;
};

export type SI2PEMPaginatedResponse<Result> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Result[];
};

export type SI2PEMInstallation = {
  base_station: { id: number; identity_name: string } | null;
  published_at: string;
  entity: string;
  installation_file: string | null;
  report_file: string | null;
  registration_date: string | null;
  reference_no: string | null;
  remarks: string | null;
};

export type SI2PEMLaboratory = {
  PCA: string;
  name: string;
};

export type SI2PEMRestBaseStation = {
  id: number;
  identity_name: string | null;
  name: string;
  city: string;
  address: string;
  county: string;
  voivodeship: string;
  operator: string;
  longitude: string;
  latitude: string;
  teryt: number;
};

export type SI2PEMPlannedMeasurementStatus = "PLANNED" | "COMPLETED" | "CANCELED";

export type SI2PEMPlannedMeasurement = {
  id: number;
  base_station: SI2PEMRestBaseStation;
  date_from: string;
  date_to: string;
  lab: SI2PEMLaboratory;
  created_at: string;
  modified_at: string;
  status: SI2PEMPlannedMeasurementStatus;
  report: string | null;
};

export type SI2PEMLaboratoryReport = {
  url: string;
  publishedAt: string | null;
  laboratoryName: string | null;
  number: string | null;
  identityNames: string;
  year: number | null;
};
