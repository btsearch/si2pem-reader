import assert from "node:assert/strict";
import test from "node:test";

import { SI2PEMClient } from "../src/client.ts";
import { SI2PEM_WFS_FEATURE_TYPES } from "../src/constants.ts";
import type { GeoJsonFeatureCollection, GeoJsonPoint, SI2PEMMonitoringProperties } from "../src/types.ts";

const PDF = new TextEncoder().encode("%PDF-test");

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function pdfWithText(items: Array<{ text: string; x: number; y: number }>): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const content = items.map(({ text, x, y }) => `BT /F1 12 Tf 1 0 0 1 ${x} ${y} Tm (${text.replace(/[\\()]/g, "\\$&")}) Tj ET`).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${encoder.encode(content).byteLength} >>\nstream\n${content}\nendstream`,
  ];
  const offsets: number[] = [];
  let pdf = "%PDF-1.4\n";
  for (const [index, object] of objects.entries()) {
    offsets.push(encoder.encode(pdf).byteLength);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = encoder.encode(pdf).byteLength;
  const xref = offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${xref}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return encoder.encode(pdf);
}

function antennaReportPdf(stationIdentity: string): Uint8Array<ArrayBuffer> {
  return pdfWithText([
    { text: stationIdentity, x: 10, y: 130 },
    { text: "Tabela 1: Opis anten badanych stacji bazowych", x: 10, y: 120 },
    { text: "1", x: 10, y: 110 },
    { text: "ABC-100", x: 10, y: 100 },
    { text: "Kathrein", x: 150, y: 100 },
    { text: "150", x: 10, y: 90 },
    { text: "30.5", x: 80, y: 90 },
    { text: "2000", x: 150, y: 90 },
    { text: "LTE1800", x: 10, y: 80 },
    { text: "0-6", x: 10, y: 78 },
    { text: "4", x: 10, y: 76 },
    { text: "Lp.", x: 10, y: 60 },
    { text: "Azymut", x: 60, y: 60 },
    { text: "H", x: 130, y: 60 },
    { text: "EIRP", x: 160, y: 60 },
    { text: "Pasmo", x: 210, y: 60 },
    { text: "Tilt", x: 270, y: 60 },
  ]);
}

void test("rejects redirects outside the trusted SI2PEM host", async () => {
  let requests = 0;
  const client = new SI2PEMClient({
    fetch: async () => {
      requests += 1;
      return new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/report.pdf" },
      });
    },
  });

  await assert.rejects(client.downloadReport("https://si2pem.gov.pl/report.pdf"));
  assert.equal(requests, 1);
});

void test("follows trusted redirects and downloads PDFs", async () => {
  const requestedUrls: string[] = [];
  const client = new SI2PEMClient({
    fetch: async (input) => {
      assert.equal(typeof input, "string");
      const url = String(input);
      requestedUrls.push(url);
      if (new URL(url).pathname === "/report.pdf") return new Response(null, { status: 302, headers: { location: "/media/report.pdf" } });
      return new Response(PDF, { status: 200, headers: { "content-type": "application/pdf" } });
    },
  });

  assert.deepEqual(await client.downloadReport("http://si2pem.gov.pl/report.pdf"), PDF);
  assert.deepEqual(requestedUrls, ["https://si2pem.gov.pl/report.pdf", "https://si2pem.gov.pl/media/report.pdf"]);
});

function properties(overrides: Record<string, unknown>) {
  return {
    identity_names: "PIE9503",
    source: "Lab A",
    number: null,
    year: 2023,
    measure_type: "lab",
    ...overrides,
  };
}

void test("deduplicates, sorts, and filters laboratory reports", async () => {
  let requests = 0;
  const client = new SI2PEMClient({
    fetch: async () => {
      requests += 1;
      return jsonResponse({
        type: "FeatureCollection",
        features: [
          { properties: properties({ url: "/media/old.pdf", date: "01.02.2023" }) },
          { properties: properties({ url: "/media/new.pdf", date: "05.03.2024", year: 2024 }) },
          { properties: properties({ url: "/media/old.pdf", date: "01.02.2023" }) },
          { properties: properties({ url: null, date: "10.05.2023" }) },
          { properties: properties({ url: "/media/other.pdf", date: "10.05.2023", source: "Lab B" }) },
        ],
      });
    },
  });

  const reports = await client.findLaboratoryReports({
    stationIdentity: "PIE9503",
    laboratoryName: "Lab A",
  });
  assert.deepEqual(
    reports.map((report) => report.url),
    ["/media/new.pdf", "/media/old.pdf"],
  );
  assert.equal(typeof reports[0]?.readAntennas, "function");
  assert.deepEqual(JSON.parse(JSON.stringify(reports[0])), {
    url: "/media/new.pdf",
    publishedAt: "2024-03-05T00:00:00.000Z",
    laboratoryName: "Lab A",
    number: null,
    identityNames: "PIE9503",
    year: 2024,
  });
  assert.equal(requests, 1);
});

void test("reads antennas directly from a laboratory report", async () => {
  const pdf = antennaReportPdf("PIE9503");
  let requests = 0;
  const client = new SI2PEMClient({
    fetch: async () => {
      requests += 1;
      if (requests === 1)
        return jsonResponse({
          type: "FeatureCollection",
          features: [{ properties: properties({ url: "/media/report.pdf", date: "05.03.2024" }) }],
        });
      return new Response(pdf, { headers: { "content-type": "application/pdf" } });
    },
  });

  const report = await client.getLatestLaboratoryReport({ stationIdentity: "PIE9503" });
  assert.equal(requests, 1);
  const antennas = await report?.readAntennas();
  assert.equal(requests, 2);
  assert.equal(antennas?.length, 1);
  assert.equal(antennas?.[0]?.frequencyMHz, 1800);
  assert.equal(antennas?.[0]?.antenna.mountedHeight, 30.5);
});

void test("validates antennas against the requested station identity", async () => {
  let requests = 0;
  const client = new SI2PEMClient({
    fetch: async () => {
      requests += 1;
      if (requests === 1)
        return jsonResponse({
          type: "FeatureCollection",
          features: [{ properties: properties({ url: "/media/report.pdf", date: "05.03.2024" }) }],
        });
      return new Response(antennaReportPdf("PIE95030"), { headers: { "content-type": "application/pdf" } });
    },
  });

  const report = await client.getLatestLaboratoryReport({ stationIdentity: "PIE9503" });
  assert.ok(report);
  await assert.rejects(report.readAntennas(), /does not contain the expected station identity/);
});

void test("merges custom headers with the default Origin header", async () => {
  const sentHeaders: Headers[] = [];
  const client = new SI2PEMClient({
    headers: { "X-Custom": "1" },
    fetch: async (_input, init) => {
      sentHeaders.push(new Headers(init?.headers));
      return jsonResponse({ count: 0, next: null, previous: null, results: [] });
    },
  });

  await client.listPlannedMeasurements();
  assert.equal(sentHeaders[0]?.get("x-custom"), "1");
  assert.equal(sentHeaders[0]?.get("origin"), "https://si2pem.gov.pl");
});

void test("downloads bounded WMS maps with the requested format", async () => {
  const png = new Uint8Array([137, 80, 78, 71]);
  let requestedUrl: URL | undefined;
  let accept: string | null = null;
  const client = new SI2PEMClient({
    fetch: async (input, init) => {
      assert.equal(typeof input, "string");
      requestedUrl = new URL(String(input));
      accept = new Headers(init?.headers).get("accept");
      return new Response(png, { headers: { "content-type": "image/png" } });
    },
  });

  const response = await client.getWmsMap({
    layers: "measures",
    bbox: [19.8, 50, 20.2, 50.2],
    width: 512,
    height: 512,
  });
  assert.deepEqual(response.bytes, png);
  assert.equal(response.contentType, "image/png");
  assert.equal(requestedUrl?.searchParams.get("REQUEST"), "GetMap");
  assert.equal(accept, "image/png");
});

void test("infers properties for known WFS feature types", async () => {
  const client = new SI2PEMClient({
    fetch: async () => jsonResponse({ type: "FeatureCollection", features: [] }),
  });

  const monitoring: GeoJsonFeatureCollection<SI2PEMMonitoringProperties, GeoJsonPoint | null> = await client.getFeatures({
    typeName: SI2PEM_WFS_FEATURE_TYPES.monitoring,
  });
  assert.deepEqual(monitoring.features, []);
});
