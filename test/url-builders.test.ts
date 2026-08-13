import assert from "node:assert/strict";
import test from "node:test";

import { buildWfsGetFeatureUrl } from "../src/wfs.ts";
import { buildWmsFeatureInfoUrl } from "../src/wms.ts";

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

void test("builds WMS GetFeatureInfo URLs with defaults", () => {
  const url = buildWmsFeatureInfoUrl("https://si2pem.gov.pl/geoserver/public/wms", {
    layer: "public:measures",
    bbox: [19.8, 50.0, 20.2, 50.2],
    cqlFilter: "year=2024",
  });
  assert.equal(url.searchParams.get("SERVICE"), "WMS");
  assert.equal(url.searchParams.get("VERSION"), "1.1.1");
  assert.equal(url.searchParams.get("REQUEST"), "GetFeatureInfo");
  assert.equal(url.searchParams.get("LAYERS"), "public:measures");
  assert.equal(url.searchParams.get("QUERY_LAYERS"), "public:measures");
  assert.equal(url.searchParams.get("INFO_FORMAT"), "application/json");
  assert.equal(url.searchParams.get("BBOX"), "19.8,50,20.2,50.2");
  assert.equal(url.searchParams.get("FEATURE_COUNT"), "200");
  assert.equal(url.searchParams.get("WIDTH"), "100");
  assert.equal(url.searchParams.get("HEIGHT"), "100");
  assert.equal(url.searchParams.get("X"), "50");
  assert.equal(url.searchParams.get("Y"), "50");
  assert.equal(url.searchParams.get("CQL_FILTER"), "year=2024");
});
