export const SI2PEM_ENDPOINTS = {
  origin: "https://si2pem.gov.pl",
  wfs: "https://si2pem.gov.pl/geoserver/public/wfs",
  wms: "https://si2pem.gov.pl/geoserver/public/wms",
  installations: "https://si2pem.gov.pl/api/all_installation_info/",
  plannedMeasurements: "https://si2pem.gov.pl/api/planned_measurements/",
} as const;

export const SI2PEM_WFS_FEATURE_TYPES = {
  broadcastingStations: "public:broadcasting_stations",
  extendedBaseStations: "public:extend_base_stations",
  measures0To7: "public:measures_7",
  measures7To14: "public:measures_7_14",
  measures14To21: "public:measures_14_21",
  measures21To28: "public:measures_21_28",
  measuresAtLeast28: "public:measures_28",
  allMeasures: "public:measures_all",
  oldMeasures: "public:measures_old",
  monitoring: "public:monitoring",
  plannedMeasures: "public:planned_measures",
  selectiveMeasures: "public:selective_measures",
  oldSelectiveMeasures: "public:selective_measures_old",
  simulationActiveIncludedBaseStations: "public:sim_active_included_base_stations",
  simulationActiveNotIncludedBaseStations: "public:sim_active_not_included_base_stations",
  simulationInactiveIncludedBaseStations: "public:sim_inactive_included_base_stations",
  simpleBaseStations: "public:simple_base_stations",
} as const;

export const SI2PEM_WMS_LAYERS = {
  measurementResults: "measures",
  measures0To7: "measures_7",
  measures7To14: "measures_7_14",
  measures14To21: "measures_14_21",
  measures21To28: "measures_21_28",
  measuresAtLeast28: "measures_28",
  allMeasures: "measures_all",
  oldMeasures: "measures_old",
  selectiveMeasurements: "selective_measures_group",
  selectiveMeasures: "selective_measures",
  oldSelectiveMeasures: "selective_measures_old",
  monitoring: "monitoring",
  plannedMeasures: "planned_measures",
  installations: "base_stations",
  simpleBaseStations: "simple_base_stations",
  extendedBaseStations: "extend_base_stations",
  broadcastingStations: "broadcasting_stations",
  simulationInstallations: "simulations_base_stations",
  simulationActiveIncludedBaseStations: "sim_active_included_base_stations",
  simulationActiveNotIncludedBaseStations: "sim_active_not_included_base_stations",
  simulationInactiveIncludedBaseStations: "sim_inactive_included_base_stations",
} as const;

export type SI2PEMWfsFeatureType = (typeof SI2PEM_WFS_FEATURE_TYPES)[keyof typeof SI2PEM_WFS_FEATURE_TYPES];
export type SI2PEMWmsLayer = (typeof SI2PEM_WMS_LAYERS)[keyof typeof SI2PEM_WMS_LAYERS];

export const DEFAULT_MAX_PDF_BYTES = 20 * 1024 * 1024;
