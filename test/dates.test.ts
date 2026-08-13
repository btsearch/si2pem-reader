import assert from "node:assert/strict";
import test from "node:test";

import { parseSI2PEMDate, si2pemDateToISO } from "../src/dates.ts";

void test("parses SI2PEM date formats", () => {
  assert.equal(si2pemDateToISO("01.02.2023 10:30:00", { utcOffsetMinutes: 60 }), "2023-02-01T09:30:00.000Z");
  assert.equal(si2pemDateToISO("01.02.2023"), "2023-02-01T00:00:00.000Z");
  assert.equal(si2pemDateToISO("2023-02-01"), "2023-02-01T00:00:00.000Z");
});

void test("returns null for missing or invalid dates", () => {
  assert.equal(parseSI2PEMDate(null), null);
  assert.equal(parseSI2PEMDate(""), null);
  assert.equal(parseSI2PEMDate("not a date"), null);
  assert.equal(si2pemDateToISO(undefined), null);
});
