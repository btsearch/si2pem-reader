import assert from "node:assert/strict";
import test from "node:test";

import { SI2PEM_WFS_FEATURE_TYPES, SI2PEM_WMS_LAYERS } from "../src/constants.ts";
import { buildWfsGetFeatureUrl } from "../src/wfs.ts";
import { buildWmsFeatureInfoUrl, buildWmsMapUrl } from "../src/wms.ts";

void test("exposes SI2PEM measurement, installation, and simulation layers", () => {
  assert.equal(SI2PEM_WFS_FEATURE_TYPES.measures0To7, "public:measures_7");
  assert.equal(SI2PEM_WFS_FEATURE_TYPES.selectiveMeasures, "public:selective_measures");
  assert.equal(SI2PEM_WFS_FEATURE_TYPES.monitoring, "public:monitoring");
  assert.equal(SI2PEM_WFS_FEATURE_TYPES.broadcastingStations, "public:broadcasting_stations");
  assert.equal(SI2PEM_WFS_FEATURE_TYPES.simulationActiveNotIncludedBaseStations, "public:sim_active_not_included_base_stations");
  assert.equal(SI2PEM_WMS_LAYERS.measurementResults, "measures");
  assert.equal(SI2PEM_WMS_LAYERS.installations, "base_stations");
  assert.equal(SI2PEM_WMS_LAYERS.simulationInstallations, "simulations_base_stations");
});

void test("builds WFS GetFeature URLs", () => {
  const url = buildWfsGetFeatureUrl("https://si2pem.gov.pl/geoserver/public/wfs", {
    typeName: "public:measures_all",
    bbox: [19.8, 50.0, 20.2, 50.2],
    cqlFilter: "measure_type='lab'",
    count: 10,
    startIndex: 5,
    sortBy: "date D",
    propertyNames: ["url", "date"],
  });
  assert.equal(url.searchParams.get("service"), "WFS");
  assert.equal(url.searchParams.get("version"), "2.0.0");
  assert.equal(url.searchParams.get("request"), "GetFeature");
  assert.equal(url.searchParams.get("typeNames"), "public:measures_all");
  assert.equal(url.searchParams.get("outputFormat"), "application/json");
  assert.equal(url.searchParams.get("bbox"), "19.8,50,20.2,50.2,EPSG:4326");
  assert.equal(url.searchParams.get("CQL_FILTER"), "measure_type='lab'");
  assert.equal(url.searchParams.get("count"), "10");
  assert.equal(url.searchParams.get("startIndex"), "5");
  assert.equal(url.searchParams.get("sortBy"), "date D");
  assert.equal(url.searchParams.get("propertyName"), "url,date");
});

void test("builds WMS GetMap URLs for multiple SI2PEM layers", () => {
  const url = buildWmsMapUrl("https://si2pem.gov.pl/geoserver/public/wms", {
    layers: [SI2PEM_WMS_LAYERS.measures0To7, SI2PEM_WMS_LAYERS.monitoring],
    bbox: [19.8, 50.0, 20.2, 50.2],
    width: 800,
    height: 600,
    transparent: true,
    cqlFilter: "year=2026;INCLUDE",
  });
  assert.equal(url.searchParams.get("REQUEST"), "GetMap");
  assert.equal(url.searchParams.get("LAYERS"), "measures_7,monitoring");
  assert.equal(url.searchParams.get("STYLES"), "");
  assert.equal(url.searchParams.get("FORMAT"), "image/png");
  assert.equal(url.searchParams.get("TRANSPARENT"), "TRUE");
  assert.equal(url.searchParams.get("WIDTH"), "800");
  assert.equal(url.searchParams.get("HEIGHT"), "600");
  assert.equal(url.searchParams.get("CQL_FILTER"), "year=2026;INCLUDE");
});

void test("builds WMS GetFeatureInfo URLs with defaults", () => {
  const url = buildWmsFeatureInfoUrl("https://si2pem.gov.pl/geoserver/public/wms", {
    layer: SI2PEM_WMS_LAYERS.measurementResults,
    bbox: [19.8, 50.0, 20.2, 50.2],
    cqlFilter: "year=2024",
  });
  assert.equal(url.searchParams.get("SERVICE"), "WMS");
  assert.equal(url.searchParams.get("VERSION"), "1.1.1");
  assert.equal(url.searchParams.get("REQUEST"), "GetFeatureInfo");
  assert.equal(url.searchParams.get("LAYERS"), "measures");
  assert.equal(url.searchParams.get("QUERY_LAYERS"), "measures");
  assert.equal(url.searchParams.get("STYLES"), "");
  assert.equal(url.searchParams.get("INFO_FORMAT"), "application/json");
  assert.equal(url.searchParams.get("BBOX"), "19.8,50,20.2,50.2");
  assert.equal(url.searchParams.get("FEATURE_COUNT"), "200");
  assert.equal(url.searchParams.get("WIDTH"), "100");
  assert.equal(url.searchParams.get("HEIGHT"), "100");
  assert.equal(url.searchParams.get("X"), "50");
  assert.equal(url.searchParams.get("Y"), "50");
  assert.equal(url.searchParams.get("CQL_FILTER"), "year=2024");
});

void test("builds WMS GetFeatureInfo URLs for separate map and query layers", () => {
  const url = buildWmsFeatureInfoUrl("https://si2pem.gov.pl/geoserver/public/wms", {
    layer: [SI2PEM_WMS_LAYERS.measurementResults, SI2PEM_WMS_LAYERS.monitoring],
    queryLayers: SI2PEM_WMS_LAYERS.monitoring,
    bbox: [19.8, 50.0, 20.2, 50.2],
    styles: ["", "public:monitoring"],
    transparent: true,
    buffer: 10,
    propertyNames: ["city", "address"],
  });
  assert.equal(url.searchParams.get("LAYERS"), "measures,monitoring");
  assert.equal(url.searchParams.get("QUERY_LAYERS"), "monitoring");
  assert.equal(url.searchParams.get("STYLES"), ",public:monitoring");
  assert.equal(url.searchParams.get("TRANSPARENT"), "TRUE");
  assert.equal(url.searchParams.get("buffer"), "10");
  assert.equal(url.searchParams.get("propertyName"), "city,address");
});
