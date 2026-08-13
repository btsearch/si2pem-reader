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
