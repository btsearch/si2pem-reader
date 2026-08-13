import type { SI2PEMAntenna } from "./reports/antennaParser.ts";

export type SI2PEMClientOptions = {
  fetch?: typeof globalThis.fetch;
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
  bts_nonexistent?: string | null;
  is_old?: boolean | null;
  measure_type?: string | null;
};

export type SI2PEMSelectiveMeasureProperties = {
  name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  wm_e?: number | null;
  wm_h?: number | null;
  below_sensitivity?: boolean | null;
  date?: string | null;
  year?: number | null;
  url?: string | null;
  laboratory_id?: number | null;
  source?: string | null;
  identity_names?: string | null;
  source_for_filter?: string | null;
  bts_nonexistent?: string | null;
  is_old?: boolean | null;
};

export type SI2PEMMonitoringProperties = {
  name?: string | null;
  location?: string | null;
  city: string;
  address: string;
  gauge: string;
  probe: string;
  start_date?: string | null;
  end_date?: string | null;
  latest_measured_at?: string | null;
  created_at?: string | null;
  owner: string;
  year?: number | null;
};

export type SI2PEMBroadcastingStationProperties = {
  name?: string | null;
  company_name: string;
  decision_no: string;
  city: string;
  street: string;
  house_no: string;
};

export type SI2PEMSimpleBaseStationProperties = {
  name?: string | null;
  identity_name: string;
  city: string;
  address?: string | null;
  teryt?: number | null;
  is_calculable: boolean;
  is_active: boolean;
  is_included_in_recent_simulation: boolean;
  operator_name: string;
  is_old?: boolean | null;
  owner_id: number;
  is_shared: boolean;
};

export type SI2PEMExtendedBaseStationProperties = SI2PEMSimpleBaseStationProperties & {
  no_permit?: string | null;
  permit?: string | null;
  disabling_date?: string | null;
};

export type SI2PEMSimulationBaseStationProperties = {
  is_active: boolean;
  is_included_in_recent_simulation: boolean;
  operator_name: string;
  is_old?: boolean | null;
  owner_id: number;
  is_shared: boolean;
};

export type SI2PEMPlannedMeasureProperties = {
  bs_identity_name: string;
  bs_name: string;
  city: string;
  location_in_city: string;
  date_from?: string | null;
  date_to?: string | null;
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

export type SI2PEMLaboratoryReportData = {
  url: string;
  publishedAt: string | null;
  laboratoryName: string | null;
  number: string | null;
  identityNames: string;
  year: number | null;
};

export type SI2PEMLaboratoryReport = SI2PEMLaboratoryReportData & {
  readAntennas(): Promise<SI2PEMAntenna[]>;
};

export type SI2PEMFeaturePropertiesMap = {
  "public:broadcasting_stations": SI2PEMBroadcastingStationProperties;
  "public:extend_base_stations": SI2PEMExtendedBaseStationProperties;
  "public:measures_7": SI2PEMMeasureProperties;
  "public:measures_7_14": SI2PEMMeasureProperties;
  "public:measures_14_21": SI2PEMMeasureProperties;
  "public:measures_21_28": SI2PEMMeasureProperties;
  "public:measures_28": SI2PEMMeasureProperties;
  "public:measures_all": SI2PEMMeasureProperties;
  "public:measures_old": SI2PEMMeasureProperties;
  "public:monitoring": SI2PEMMonitoringProperties;
  "public:planned_measures": SI2PEMPlannedMeasureProperties;
  "public:selective_measures": SI2PEMSelectiveMeasureProperties;
  "public:selective_measures_old": SI2PEMSelectiveMeasureProperties;
  "public:sim_active_included_base_stations": SI2PEMSimulationBaseStationProperties;
  "public:sim_active_not_included_base_stations": SI2PEMSimulationBaseStationProperties;
  "public:sim_inactive_included_base_stations": SI2PEMSimulationBaseStationProperties;
  "public:simple_base_stations": SI2PEMSimpleBaseStationProperties;
};
