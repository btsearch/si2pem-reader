import assert from "node:assert/strict";
import test from "node:test";

import { flattenSI2PEMAntennaRows, parseSI2PEMAntennaRows } from "../src/reports/antennaParser.ts";
import type { ExtractedPdfTextItem } from "../src/reports/pdfText.ts";

function item(text: string, y: number): ExtractedPdfTextItem {
  return { text, pageNumber: 1, x: 0, y, width: 10 };
}

void test("parses the antenna table and flattens bands", () => {
  const items = [
    item("Tabela 1: Opis anten badanych stacji bazowych", 120),
    item("1", 110),
    item("ABC-100", 100),
    item("Kathrein", 100),
    item("150", 90),
    item("30,5", 90),
    item("2000", 90),
    item("LTE1800", 80),
    item("0-6", 78),
    item("4", 76),
    item("Lp.", 60),
    item("Azymut", 60),
    item("H", 60),
    item("EIRP", 60),
    item("Pasmo", 60),
    item("Tilt", 60),
  ];

  const rows = parseSI2PEMAntennaRows(items);
  assert.deepEqual(rows, [
    {
      rowNumber: 1,
      pageNumber: 1,
      antenna: {
        model: "ABC-100",
        manufacturer: "Kathrein",
        mountedHeight: 30.5,
        azimuth: 150,
      },
      eirp: 2000,
      bands: [
        {
          label: "LTE1800",
          technology: "LTE",
          frequencyMHz: 1800,
          tiltRange: { minimum: 0, maximum: 6 },
          measuredTilt: 4,
        },
      ],
    },
  ]);

  const antennas = flattenSI2PEMAntennaRows(rows);
  assert.equal(antennas.length, 1);
  assert.equal(antennas[0]?.bandIndex, 0);
  assert.equal(antennas[0]?.frequencyMHz, 1800);
  assert.equal(antennas[0]?.antenna.model, "ABC-100");
  assert.equal(antennas[0]?.antenna.manufacturer, "Kathrein");
  assert.equal(antennas[0]?.antenna.mountedHeight, 30.5);
  assert.equal(antennas[0]?.antenna.azimuth, 150);
  assert.equal(antennas[0]?.eirp, 2000);
  assert.deepEqual(antennas[0]?.tiltRange, { minimum: 0, maximum: 6 });
  assert.equal(antennas[0]?.measuredTilt, 4);
});

void test("parses a multi-band row whose tilt range cell wraps across text items", () => {
  const items = [
    item("Tabela 1: Opis anten badanych stacji bazowych", 724),
    item("1", 647),
    item("50396", 556),
    item("ATR4518R13", 653),
    item("Huawei", 641),
    item("110", 647),
    item("31,70", 647),
    item("4998*", 647),
    item("800", 653),
    item("2600", 641),
    item("10,0 -", 660),
    item("10,0", 647),
    item("4,0 - 4,0", 635),
    item("10,0", 653),
    item("4,0", 641),
    item("Lp.", 691),
    item("Azymut", 699),
    item("H", 699),
    item("EIRP", 699),
    item("Pasmo", 699),
    item("Tilt", 699),
  ];

  const rows = parseSI2PEMAntennaRows(items);
  assert.deepEqual(rows, [
    {
      rowNumber: 1,
      pageNumber: 1,
      antenna: {
        model: "ATR4518R13",
        manufacturer: "Huawei",
        mountedHeight: 31.7,
        azimuth: 110,
      },
      eirp: 4998,
      bands: [
        {
          label: "800",
          technology: null,
          frequencyMHz: 800,
          tiltRange: { minimum: 10, maximum: 10 },
          measuredTilt: 10,
        },
        {
          label: "2600",
          technology: null,
          frequencyMHz: 2600,
          tiltRange: { minimum: 4, maximum: 4 },
          measuredTilt: 4,
        },
      ],
    },
  ]);

  const antennas = flattenSI2PEMAntennaRows(rows);
  assert.equal(antennas.length, 2);
  assert.equal(antennas[0]?.frequencyMHz, 800);
  assert.deepEqual(antennas[0]?.tiltRange, { minimum: 10, maximum: 10 });
  assert.equal(antennas[1]?.frequencyMHz, 2600);
  assert.equal(antennas[1]?.bandIndex, 1);
});
