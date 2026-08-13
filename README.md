# si2pem-reader

Client for public [SI2PEM](https://si2pem.gov.pl/) data: WFS/WMS queries, installations, planned measurements, laboratory-report discovery, and antenna-table extraction from report PDFs.

The package has two entry points:

- `si2pem-reader` — the client for WFS, WMS, and REST data plus bounded PDF download. Loads no PDF engine.
- `si2pem-reader/reports` — PDF text extraction and antenna-table parsing

## Install

```sh
pnpm add si2pem-reader
# or: npm install si2pem-reader
```

Requires Node.js 22 or newer. ESM only.

## Quick start

```ts
import { SI2PEMClient, SI2PEM_FEATURE_TYPES } from "si2pem-reader";

const si2pem = new SI2PEMClient();

const planned = await si2pem.getFeatures({
  typeName: SI2PEM_FEATURE_TYPES.plannedMeasures,
  bbox: [19.8, 50.0, 20.2, 50.2],
});
```

## Laboratory reports

```ts
const report = await si2pem.getLatestLaboratoryReport({
  stationIdentity: "PIE9503",
});

if (report) {
  const pdf = await si2pem.downloadReport(report.url);
}
```

## Antenna-table parsing

```ts
import { readAntennaReport } from "si2pem-reader/reports";

const antennas = await readAntennaReport(si2pem, report, {
  expectedStationIdentity: "PIE9503",
});
console.log(antennas.antennas);
```

The result includes the downloaded `pdf` bytes, so saving the file needs no second download. If you already have the PDF, parse it directly without a client:

```ts
import { parseAntennaReport } from "si2pem-reader/reports";

const antennas = await parseAntennaReport(pdfBytes, { report });
```

## License

MIT
