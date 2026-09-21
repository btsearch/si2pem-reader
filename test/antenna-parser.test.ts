import assert from "node:assert/strict";
import test from "node:test";

import { flattenSI2PEMAntennaRows, parseSI2PEMAntennaRows } from "../src/reports/antennaParser.ts";
import type { ExtractedPdfTextItem } from "../src/reports/pdfText.ts";

function item(text: string, y: number, x = 0, pageNumber = 1): ExtractedPdfTextItem {
  return { text, pageNumber, x, y, width: 10 };
}

function headerItems(pageNumber = 1): ExtractedPdfTextItem[] {
  return ["Lp.", "Azymut", "H", "EIRP", "Pasmo", "Tilt"].map((label) => item(label, 60, 0, pageNumber));
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
    item("170", 90),
    item("25,50", 90),
    item("24000*", 90),
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
        mountedHeight: 25.5,
        azimuth: 170,
      },
      totalEirp: 24000,
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
    item("ST00001", 90),
    item("RRV4-65B-R6H4VB-V2", 112),
    item("Andrew", 108),
    item("10", 110),
    item("40,00", 110),
    item("6000", 118),
    item("5000", 114),
    item("4000", 110),
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
    mountedHeight: 40,
    azimuth: 10,
  });
  assert.equal(rows[0]?.totalEirp, 15000);
  assert.deepEqual(
    rows[0]?.bands.map((entry) => [entry.value, entry.eirp]),
    [[10, 15000]],
  );
});

void test("parses per-band EIRP row pairs sharing a merged height cell", () => {
  const items = [
    item("Tabela 1: Opis anten badanych stacji bazowych", 200),
    item("1b", 110),
    item("AMB4520R9V06", 108),
    item("Huawei", 100),
    item("250", 110),
    item("55,00", 95.5),
    item("3500", 116),
    item("4500", 104),
    item("1800", 116),
    item("2600", 104),
    item("2,0 - 12,0", 116),
    item("2,0 - 12,0", 104),
    item("7,0", 116),
    item("7,0", 104),
    item("2b", 81),
    item("310", 81),
    item("3500", 87),
    item("4500", 75),
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
        mountedHeight: 55,
        azimuth: 250,
      },
      totalEirp: 8000,
      bands: [band(1800, 3500), band(2600, 4500)],
    },
    {
      rowNumber: 2,
      pageNumber: 1,
      antenna: {
        model: "AMB4520R9V06",
        manufacturer: "Huawei",
        mountedHeight: 55,
        azimuth: 310,
      },
      totalEirp: 8000,
      bands: [band(1800, 3500), band(2600, 4500)],
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
    item("45,00", 110),
    item("9000", 126),
    item("5000", 118),
    item("6000", 110),
    item("2000", 102),
    item("7000", 94),
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
  assert.equal(rows[0]?.totalEirp, 29000);
  assert.deepEqual(
    rows[0]?.bands.map((entry) => [entry.value, entry.eirp]),
    [
      [1800, 9000],
      [2100, 5000],
      [2600, 6000],
      [700, 2000],
      [900, 7000],
    ],
  );
  assert.deepEqual(
    flattenSI2PEMAntennaRows(rows).map((entry) => entry.eirp),
    [9000, 5000, 6000, 2000, 7000],
  );
  assert.ok(flattenSI2PEMAntennaRows(rows).every((entry) => entry.totalEirp === 29000));
});

void test("merges repeated bands sharing one EIRP cell", () => {
  const labels = Array.from({ length: 5 }, () => ["LTE 1800", "LTE 2100", "UMTS 900", "LTE 1800", "LTE 2100"]).flat();
  const lineYs = labels.map((_, index) => 400 - index * 12);
  const items = [
    item("Tabela 1: Opis anten badanych stacji bazowych", 500),
    item("1", 256),
    item("ATR4518R6v06", 262),
    item("Huawei", 250),
    item("100", 256),
    item("32,00", 256),
    item("18000*", 256),
    ...labels.map((label, index) => item(label, lineYs[index]!)),
    ...labels.map((_, index) => item("0,0 - 10,0", lineYs[index]!)),
    ...labels.map((_, index) => item("5,0", lineYs[index]!)),
    ...headerItems(),
  ];

  const rows = parseSI2PEMAntennaRows(items);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.totalEirp, 18000);
  assert.deepEqual(
    rows[0]?.bands.map((entry) => [entry.label, entry.rat, entry.value, entry.eirp]),
    [
      ["LTE1800", "LTE", 1800, null],
      ["LTE2100", "LTE", 2100, null],
      ["UMTS900", "UMTS", 900, null],
    ],
  );
});

void test("gives the total EIRP to a lone band left after merging", () => {
  const items = [
    item("Tabela 1: Opis anten badanych stacji bazowych", 200),
    item("1", 110),
    item("ABC-100", 112),
    item("Kathrein", 108),
    item("150", 110),
    item("30,5", 110),
    item("2000", 110),
    item("LTE 2600", 116),
    item("LTE 2600", 104),
    item("0-6", 116),
    item("0-6", 104),
    item("4", 116),
    item("4", 104),
    ...headerItems(),
  ];

  const rows = parseSI2PEMAntennaRows(items);
  assert.equal(rows[0]?.totalEirp, 2000);
  assert.deepEqual(
    rows[0]?.bands.map((entry) => [entry.value, entry.eirp]),
    [[2600, 2000]],
  );
});

void test("sums the EIRP of repeated bands listed with their own EIRP cells", () => {
  const items = [
    item("Tabela 1: Opis anten badanych stacji bazowych", 200),
    item("1", 110),
    item("ABC-100", 112),
    item("Kathrein", 108),
    item("150", 110),
    item("30,5", 110),
    item("3000", 122),
    item("2000", 110),
    item("1500", 98),
    item("LTE 2600", 122),
    item("LTE 2600", 110),
    item("LTE 800", 98),
    item("0-6", 122),
    item("0-6", 110),
    item("0-6", 98),
    item("4", 122),
    item("4", 110),
    item("4", 98),
    ...headerItems(),
  ];

  const rows = parseSI2PEMAntennaRows(items);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.totalEirp, 6500);
  assert.deepEqual(
    rows[0]?.bands.map((entry) => [entry.value, entry.eirp]),
    [
      [2600, 5000],
      [800, 1500],
    ],
  );
});

void test("keeps repeated bands with different tilts separate", () => {
  const items = [
    item("Tabela 1: Opis anten badanych stacji bazowych", 200),
    item("1", 110),
    item("ABC-100", 112),
    item("Kathrein", 108),
    item("150", 110),
    item("30,5", 110),
    item("2000", 110),
    item("LTE 1800", 116),
    item("LTE 1800", 104),
    item("0-6", 116),
    item("0-6", 104),
    item("4", 116),
    item("6", 104),
    ...headerItems(),
  ];

  const rows = parseSI2PEMAntennaRows(items);
  assert.equal(rows[0]?.totalEirp, 2000);
  assert.deepEqual(
    rows[0]?.bands.map((entry) => [entry.value, entry.eirp, entry.measuredTilt]),
    [
      [1800, null, 4],
      [1800, null, 6],
    ],
  );
});

void test("parses a table continued on following pages", () => {
  const pageItems = (pageNumber: number, title: string, rowNumber: string, azimuth: string) => [
    item(title, 120, 0, pageNumber),
    item(rowNumber, 110, 42, pageNumber),
    item("ABC-100", 100, 300, pageNumber),
    item("Kathrein", 100, 300, pageNumber),
    item(azimuth, 90, 300, pageNumber),
    item("30,5", 90, 300, pageNumber),
    item("2000", 90, 300, pageNumber),
    item("LTE1800", 80, 300, pageNumber),
    item("0-6", 78, 300, pageNumber),
    item("4", 76, 300, pageNumber),
    ...headerItems(pageNumber),
    item("Ciąg dalszy na następnej stronie", 20, 0, pageNumber),
  ];
  const items = [
    ...pageItems(1, "Tabela 1: Opis anten badanych stacji bazowych", "1", "120"),
    ...pageItems(2, "Tabela 1: Opis anten badanych stacji bazowych (c.d.)", "2", "240"),
    ...pageItems(3, "Tabela 1: Opis anten badanych stacji bazowych (c.d.)", "3", "0"),
  ];

  const rows = parseSI2PEMAntennaRows(items);
  assert.deepEqual(
    rows.map((row) => [row.rowNumber, row.pageNumber, row.antenna.azimuth, row.totalEirp]),
    [
      [1, 1, 120, 2000],
      [2, 2, 240, 2000],
      [3, 3, 0, 2000],
    ],
  );
});

void test("parses rows whose azimuth matches the next row number", () => {
  const items = [
    item("Tabela 1: Opis anten badanych stacji bazowych", 220),
    item("1", 210),
    item("AMB4520R9", 200, 160),
    item("Huawei", 200, 175),
    item("2", 190, 260),
    item("35,50", 190, 300),
    item("21000*", 190, 346),
    item("1800", 180, 411),
    item("0-6", 178, 460),
    item("4", 176, 528),
    item("2", 110),
    item("AMB4520R9", 100, 160),
    item("Huawei", 100, 175),
    item("2", 90, 260),
    item("35,50", 90, 300),
    item("21000*", 90, 346),
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
      mountedHeight: 35.5,
      azimuth: 2,
    });
    assert.equal(row.totalEirp, 21000);
    assert.deepEqual(
      row.bands.map((entry) => [entry.value, entry.eirp]),
      [[1800, 21000]],
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
