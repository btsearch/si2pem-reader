# si2pem-reader

A small TypeScript client for public [SI2PEM](https://si2pem.gov.pl/) data, including WFS, WMS, installations, planned measurements, and laboratory reports.

## Install

```sh
npm install si2pem-reader
```

ESM only.

## Usage

```ts
import { SI2PEMClient, SI2PEM_WFS_FEATURE_TYPES, SI2PEM_WMS_LAYERS } from "si2pem-reader";

const si2pem = new SI2PEMClient();

const measurements = await si2pem.getFeatures({
  typeName: SI2PEM_WFS_FEATURE_TYPES.allMeasures,
  bbox: [19.8, 50.0, 20.2, 50.2],
});

const map = await si2pem.getWmsMap({
  layers: SI2PEM_WMS_LAYERS.measurementResults,
  bbox: [19.8, 50.0, 20.2, 50.2],
  width: 1024,
  height: 768,
  transparent: true,
});
```

## Reports

Report discovery uses WMS `GetFeatureInfo`, so `bbox` is required in `[west, south, east, north]` order.

```ts
const report = await si2pem.getLatestLaboratoryReport({
  stationIdentity: "1862",
  bbox: [19.003611, 50.225, 19.043611, 50.265],
});

const antennas = await report?.readAntennas();
```
