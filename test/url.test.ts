import assert from "node:assert/strict";
import test from "node:test";

import { containsSI2PEMStationIdentity, normalizeSI2PEMReportUrl } from "../src/url.ts";

const ORIGIN = "https://si2pem.gov.pl";

void test("normalizes trusted report URLs to HTTPS", () => {
  assert.equal(normalizeSI2PEMReportUrl("http://reports.si2pem.gov.pl/report.pdf", ORIGIN).href, "https://reports.si2pem.gov.pl/report.pdf");
  assert.equal(normalizeSI2PEMReportUrl("/media/report.pdf", ORIGIN).href, "https://si2pem.gov.pl/media/report.pdf");
});

void test("rejects untrusted report URLs", () => {
  assert.throws(() => normalizeSI2PEMReportUrl("https://si2pem.gov.pl.example.com/report.pdf", ORIGIN));
  assert.throws(() => normalizeSI2PEMReportUrl("https://127.0.0.1/report.pdf", ORIGIN));
  assert.throws(() => normalizeSI2PEMReportUrl("ftp://si2pem.gov.pl/report.pdf", ORIGIN));
});

void test("matches complete station identities", () => {
  assert.equal(containsSI2PEMStationIdentity("Stacja PIE9503, pomiar", "PIE9503"), true);
  assert.equal(containsSI2PEMStationIdentity("Stacja PIE95030, pomiar", "PIE9503"), false);
  assert.equal(containsSI2PEMStationIdentity("Stacja PIE9503-A, pomiar", "PIE9503"), false);
});
