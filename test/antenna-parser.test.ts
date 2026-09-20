import assert from "node:assert/strict";
import test from "node:test";

import { flattenSI2PEMAntennaRows, parseSI2PEMAntennaRows } from "../src/reports/antennaParser.ts";
import type { ExtractedPdfTextItem } from "../src/reports/pdfText.ts";

function item(text: string, y: number, x = 0): ExtractedPdfTextItem {
  return { text, pageNumber: 1, x, y, width: 10 };
}

function proseItem(text: string, pageNumber: number): ExtractedPdfTextItem {
  return { text, pageNumber, x: 0, y: 0, width: 10 };
}

function band(value: number, eirp: number) {
  return {
    label: String(value),
    rat: null,
    value,
    eirp,
    tiltRange: { minimum: 2, maximum: 12 },
    measuredTilt: 7,
  };
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
      totalEirp: 2000,
      bands: [
        {
          label: "LTE1800",
          rat: "LTE",
          value: 1800,
          eirp: 2000,
          tiltRange: { minimum: 0, maximum: 6 },
          measuredTilt: 4,
        },
      ],
    },
  ]);

  const antennas = flattenSI2PEMAntennaRows(rows);
  assert.equal(antennas.length, 1);
  assert.equal(antennas[0]?.bandIndex, 0);
  assert.equal(antennas[0]?.value, 1800);
  assert.equal(antennas[0]?.antenna.model, "ABC-100");
  assert.equal(antennas[0]?.antenna.manufacturer, "Kathrein");
  assert.equal(antennas[0]?.antenna.mountedHeight, 30.5);
  assert.equal(antennas[0]?.antenna.azimuth, 150);
  assert.equal(antennas[0]?.eirp, 2000);
  assert.equal(antennas[0]?.totalEirp, 2000);
  assert.deepEqual(antennas[0]?.tiltRange, { minimum: 0, maximum: 6 });
  assert.equal(antennas[0]?.measuredTilt, 4);
});

void test("parses a multi-band row whose tilt range cell wraps across text items", () => {
  const items = [
    item("Tabela 1: Opis anten badanych stacji bazowych", 120),
    item("1", 110),
    item("ABC-100", 100),
    item("Kathrein", 100),
    item("150", 90),
    item("30,5", 90),
    item("2000", 90),
    item("LTE1800", 80),
    item("GSM900", 78),
    item("0 -", 76),
    item("6", 74),
    item("0-8", 72),
    item("4", 70),
    item("5", 68),
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
      totalEirp: 2000,
      bands: [
        {
          label: "LTE1800",
          rat: "LTE",
          value: 1800,
          eirp: null,
          tiltRange: { minimum: 0, maximum: 6 },
          measuredTilt: 4,
        },
        {
          label: "GSM900",
          rat: "GSM",
          value: 900,
          eirp: null,
          tiltRange: { minimum: 0, maximum: 8 },
          measuredTilt: 5,
        },
      ],
    },
  ]);

  const antennas = flattenSI2PEMAntennaRows(rows);
  assert.equal(antennas.length, 2);
  assert.equal(antennas[0]?.value, 1800);
  assert.deepEqual(antennas[0]?.tiltRange, { minimum: 0, maximum: 6 });
  assert.equal(antennas[1]?.value, 900);
  assert.equal(antennas[1]?.bandIndex, 1);
  assert.deepEqual(
    antennas.map((entry) => [entry.eirp, entry.totalEirp]),
    [
      [null, 2000],
      [null, 2000],
    ],
  );
});

void test("parses letter-suffixed row pairs sharing merged antenna cells", () => {
  const items = [
    item("Tabela 1: Opis anten badanych stacji bazowych", 120),
    item("1b", 110),
    item("ABC-100", 100),
    item("Kathrein", 100),
    item("150", 110),
    item("30,5", 100),
    item("2000", 110),
    item("LTE1800", 110),
    item("0-6", 110),
    item("4", 110),
    item("2b", 90),
    item("250", 90),
    item("2000", 90),
    item("LTE1800", 90),
    item("0-6", 90),
    item("4", 90),
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
      totalEirp: 2000,
      bands: [
        {
          label: "LTE1800",
          rat: "LTE",
          value: 1800,
          eirp: 2000,
          tiltRange: { minimum: 0, maximum: 6 },
          measuredTilt: 4,
        },
      ],
    },
    {
      rowNumber: 2,
      pageNumber: 1,
      antenna: {
        model: "ABC-100",
        manufacturer: "Kathrein",
        mountedHeight: 30.5,
        azimuth: 250,
      },
      totalEirp: 2000,
      bands: [
        {
          label: "LTE1800",
          rat: "LTE",
          value: 1800,
          eirp: 2000,
          tiltRange: { minimum: 0, maximum: 6 },
          measuredTilt: 4,
        },
      ],
    },
  ]);
});

void test("parses tilt ranges with bounds above 20 degrees", () => {
  const items = [
    item("Tabela 1: Opis anten badanych stacji bazowych", 120),
    item("1", 110),
    item("ASI4518R39v07", 100),
    item("Huawei", 100),
    item("160", 90),
    item("26,80", 90),
    item("29635*", 90),
    item("800", 80),
    item("900", 78),
    item("-8,0 -", 76),
    item("22,0", 74),
    item("-8,0 -", 72),
    item("22,0", 70),
    item("7,0", 68),
    item("7,0", 66),
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
        model: "ASI4518R39v07",
        manufacturer: "Huawei",
        mountedHeight: 26.8,
        azimuth: 160,
      },
      totalEirp: 29635,
      bands: [
        {
          label: "800",
          rat: null,
          value: 800,
          eirp: null,
          tiltRange: { minimum: -8, maximum: 22 },
          measuredTilt: 7,
        },
        {
          label: "900",
          rat: null,
          value: 900,
          eirp: null,
          tiltRange: { minimum: -8, maximum: 22 },
          measuredTilt: 7,
        },
      ],
    },
  ]);
});

void test("parses per-band EIRP rows whose band column repeats a low azimuth value", () => {
  const items = [
    item("Tabela 1: Opis anten badanych stacji bazowych", 200),
    item("1", 110),
    item("BT21216", 90),
    item("RRV4-65B-R6H4VB-V2", 112),
    item("Andrew", 108),
    item("10", 110),
    item("41,40", 110),
    item("6673", 118),
    item("5709", 114),
    item("6344", 110),
    item("10", 118),
    item("10", 114),
    item("10", 110),
    item("2,0 - 12,0", 118),
    item("2,0 - 12,0", 114),
    item("2,0 - 12,0", 110),
    item("7,0", 118),
    item("7,0", 114),
    item("7,0", 110),
    item("Lp.", 60),
    item("Azymut", 60),
    item("H", 60),
    item("EIRP", 60),
    item("Pasmo", 60),
    item("Tilt", 60),
  ];

  const rows = parseSI2PEMAntennaRows(items);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0]?.antenna, {
    model: "RRV4-65B-R6H4VB-V2",
    manufacturer: "Andrew",
    mountedHeight: 41.4,
    azimuth: 10,
  });
  assert.equal(rows[0]?.totalEirp, 18726);
  assert.deepEqual(
    rows[0]?.bands.map((entry) => [entry.value, entry.eirp]),
    [
      [10, 6673],
      [10, 5709],
      [10, 6344],
    ],
  );
});

void test("parses per-band EIRP row pairs sharing a merged height cell", () => {
  const items = [
    item("Tabela 1: Opis anten badanych stacji bazowych", 200),
    item("1b", 110),
    item("AMB4520R9V06", 108),
    item("Huawei", 100),
    item("255", 110),
    item("58,00", 95.5),
    item("3701", 116),
    item("4602", 104),
    item("1800", 116),
    item("2600", 104),
    item("2,0 - 12,0", 116),
    item("2,0 - 12,0", 104),
    item("7,0", 116),
    item("7,0", 104),
    item("2b", 81),
    item("315", 81),
    item("3701", 87),
    item("4602", 75),
    item("1800", 87),
    item("2600", 75),
    item("2,0 - 12,0", 87),
    item("2,0 - 12,0", 75),
    item("7,0", 87),
    item("7,0", 75),
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
        model: "AMB4520R9V06",
        manufacturer: "Huawei",
        mountedHeight: 58,
        azimuth: 255,
      },
      totalEirp: 8303,
      bands: [band(1800, 3701), band(2600, 4602)],
    },
    {
      rowNumber: 2,
      pageNumber: 1,
      antenna: {
        model: "AMB4520R9V06",
        manufacturer: "Huawei",
        mountedHeight: 58,
        azimuth: 315,
      },
      totalEirp: 8303,
      bands: [band(1800, 3701), band(2600, 4602)],
    },
  ]);
});

void test("parses a multi-band row with per-band EIRP cells", () => {
  const items = [
    item("Tabela 1: Opis anten badanych stacji bazowych", 120),
    item("1", 110),
    item("ABC-100", 100),
    item("Kathrein", 100),
    item("150", 90),
    item("30,5", 90),
    item("2000", 96),
    item("3000", 84),
    item("LTE1800", 96),
    item("GSM900", 84),
    item("0-6", 96),
    item("0-8", 84),
    item("4", 96),
    item("5", 84),
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
      totalEirp: 5000,
      bands: [
        {
          label: "LTE1800",
          rat: "LTE",
          value: 1800,
          eirp: 2000,
          tiltRange: { minimum: 0, maximum: 6 },
          measuredTilt: 4,
        },
        {
          label: "GSM900",
          rat: "GSM",
          value: 900,
          eirp: 3000,
          tiltRange: { minimum: 0, maximum: 8 },
          measuredTilt: 5,
        },
      ],
    },
  ]);

  const antennas = flattenSI2PEMAntennaRows(rows);
  assert.equal(antennas.length, 2);
  assert.equal(antennas[0]?.eirp, 2000);
  assert.equal(antennas[1]?.eirp, 3000);
  assert.equal(antennas[0]?.totalEirp, 5000);
  assert.equal(antennas[1]?.totalEirp, 5000);
});

void test("sums per-band EIRP cells into the row EIRP", () => {
  const items = [
    item("Tabela 1: Opis anten badanych stacji bazowych", 200),
    item("1", 110),
    item("KRE2014022-21", 112),
    item("Ericsson", 108),
    item("0", 110),
    item("47,10", 110),
    item("9982", 126),
    item("5845", 118),
    item("6834", 110),
    item("2846", 102),
    item("7076", 94),
    item("1800", 126),
    item("2100", 118),
    item("2600", 110),
    item("700", 102),
    item("900", 94),
    item("2,0 - 12,0", 126),
    item("2,0 - 12,0", 118),
    item("2,0 - 12,0", 110),
    item("2,0 - 12,0", 102),
    item("2,0 - 12,0", 94),
    item("7,0", 126),
    item("7,0", 118),
    item("7,0", 110),
    item("7,0", 102),
    item("7,0", 94),
    item("Lp.", 60),
    item("Azymut", 60),
    item("H", 60),
    item("EIRP", 60),
    item("Pasmo", 60),
    item("Tilt", 60),
  ];

  const rows = parseSI2PEMAntennaRows(items);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.totalEirp, 32583);
  assert.deepEqual(
    rows[0]?.bands.map((entry) => [entry.value, entry.eirp]),
    [
      [1800, 9982],
      [2100, 5845],
      [2600, 6834],
      [700, 2846],
      [900, 7076],
    ],
  );
  assert.deepEqual(
    flattenSI2PEMAntennaRows(rows).map((entry) => entry.eirp),
    [9982, 5845, 6834, 2846, 7076],
  );
  assert.ok(flattenSI2PEMAntennaRows(rows).every((entry) => entry.totalEirp === 32583));
});

void test("parses rows whose azimuth matches the next row number", () => {
  const items = [
    item("Tabela 1: Opis anten badanych stacji bazowych", 220),
    item("1", 210),
    item("AMB4520R9", 200, 160),
    item("Huawei", 200, 175),
    item("2", 190, 260),
    item("36,70", 190, 300),
    item("22665*", 190, 346),
    item("1800", 180, 411),
    item("0-6", 178, 460),
    item("4", 176, 528),
    item("2", 110),
    item("AMB4520R9", 100, 160),
    item("Huawei", 100, 175),
    item("2", 90, 260),
    item("36,70", 90, 300),
    item("22665*", 90, 346),
    item("1800", 80, 411),
    item("0-6", 78, 460),
    item("4", 76, 528),
    item("Lp.", 60),
    item("Azymut", 60),
    item("H", 60),
    item("EIRP", 60),
    item("Pasmo", 60),
    item("Tilt", 60),
  ];

  const rows = parseSI2PEMAntennaRows(items);
  assert.equal(rows.length, 2);
  for (const row of rows) {
    assert.deepEqual(row.antenna, {
      model: "AMB4520R9",
      manufacturer: "Huawei",
      mountedHeight: 36.7,
      azimuth: 2,
    });
    assert.equal(row.totalEirp, 22665);
    assert.deepEqual(
      row.bands.map((entry) => [entry.value, entry.eirp]),
      [[1800, 22665]],
    );
  }
});

void test("maps prose rows to their source pages after skipped duplicates", () => {
  const first = "Azymut 120. Częstotliwość 1800 MHz. Tilt 4. Wysokość zawieszenia anteny 30 m";
  const second = "Azymut 240. Częstotliwość 3500 MHz. Tilt 6. Wysokość zawieszenia anteny 45 m";
  const gap = "x".repeat(501);
  const rows = parseSI2PEMAntennaRows([proseItem(first, 1), proseItem(gap, 1), proseItem(first, 2), proseItem(gap, 2), proseItem(second, 3)]);

  assert.deepEqual(
    rows.map((row) => ({
      pageNumber: row.pageNumber,
      mountedHeight: row.antenna.mountedHeight,
      azimuth: row.antenna.azimuth,
      value: row.bands[0]?.value,
      measuredTilt: row.bands[0]?.measuredTilt,
    })),
    [
      { pageNumber: 1, mountedHeight: 30, azimuth: 120, value: 1800, measuredTilt: 4 },
      { pageNumber: 3, mountedHeight: 45, azimuth: 240, value: 3500, measuredTilt: 6 },
    ],
  );
});
