import assert from "node:assert/strict";
import test from "node:test";

import { SI2PEMClient } from "../src/client.ts";

const PDF = new TextEncoder().encode("%PDF-test");

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
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
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
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
  const client = new SI2PEMClient({
    fetch: async () =>
      jsonResponse({
        type: "FeatureCollection",
        features: [
          { properties: properties({ url: "/media/old.pdf", date: "01.02.2023" }) },
          { properties: properties({ url: "/media/new.pdf", date: "05.03.2024", year: 2024 }) },
          { properties: properties({ url: "/media/old.pdf", date: "01.02.2023" }) },
          { properties: properties({ url: null, date: "10.05.2023" }) },
          { properties: properties({ url: "/media/other.pdf", date: "10.05.2023", source: "Lab B" }) },
        ],
      }),
  });

  const reports = await client.findLaboratoryReports({
    stationIdentity: "PIE9503",
    laboratoryName: "Lab A",
  });
  assert.deepEqual(
    reports.map((report) => report.url),
    ["/media/new.pdf", "/media/old.pdf"],
  );
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
