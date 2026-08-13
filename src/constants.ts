export const SI2PEM_ENDPOINTS = {
  origin: "https://si2pem.gov.pl",
  wfs: "https://si2pem.gov.pl/geoserver/public/wfs",
  wms: "https://si2pem.gov.pl/geoserver/public/wms",
  installations: "https://si2pem.gov.pl/api/all_installation_info/",
  plannedMeasurements: "https://si2pem.gov.pl/api/planned_measurements/",
} as const;

export const SI2PEM_FEATURE_TYPES = {
  measures: "public:measures",
  allMeasures: "public:measures_all",
  plannedMeasures: "public:planned_measures",
  simpleBaseStations: "public:simple_base_stations",
  extendedBaseStations: "public:extend_base_stations",
} as const;

export const DEFAULT_MAX_PDF_BYTES = 20 * 1024 * 1024;
