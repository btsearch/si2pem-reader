export type WmsLayerNames = string | readonly string[];

export type WmsMapRequest = {
  layers: WmsLayerNames;
  bbox: [number, number, number, number];
  width: number;
  height: number;
  srs?: string;
  styles?: WmsLayerNames;
  format?: string;
  transparent?: boolean;
  cqlFilter?: string;
};

export type WmsFeatureInfoRequest = {
  layer: WmsLayerNames;
  bbox: [number, number, number, number];
  queryLayers?: WmsLayerNames;
  srs?: string;
  styles?: WmsLayerNames;
  format?: string;
  transparent?: boolean;
  cqlFilter?: string;
  featureCount?: number;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  sortBy?: string;
  buffer?: number;
  propertyNames?: string[];
};

function joinNames(names: WmsLayerNames): string {
  return typeof names === "string" ? names : names.join(",");
}

function setOptionalMapParameters(params: URLSearchParams, request: Pick<WmsMapRequest, "cqlFilter" | "transparent">): void {
  if (request.transparent !== undefined) params.set("TRANSPARENT", String(request.transparent).toUpperCase());
  if (request.cqlFilter) params.set("CQL_FILTER", request.cqlFilter);
}

export function buildWmsMapUrl(endpoint: string, request: WmsMapRequest): URL {
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetMap",
    SRS: request.srs ?? "EPSG:4326",
    LAYERS: joinNames(request.layers),
    STYLES: request.styles ? joinNames(request.styles) : "",
    FORMAT: request.format ?? "image/png",
    WIDTH: String(request.width),
    HEIGHT: String(request.height),
    BBOX: request.bbox.join(","),
  });
  setOptionalMapParameters(params, request);
  const url = new URL(endpoint);
  url.search = params.toString();
  return url;
}

export function buildWmsFeatureInfoUrl(endpoint: string, request: WmsFeatureInfoRequest): URL {
  const layers = joinNames(request.layer);
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetFeatureInfo",
    SRS: request.srs ?? "EPSG:4326",
    LAYERS: layers,
    QUERY_LAYERS: request.queryLayers ? joinNames(request.queryLayers) : layers,
    STYLES: request.styles ? joinNames(request.styles) : "",
    INFO_FORMAT: "application/json",
    FEATURE_COUNT: String(request.featureCount ?? 200),
    WIDTH: String(request.width ?? 100),
    HEIGHT: String(request.height ?? 100),
    X: String(request.x ?? 50),
    Y: String(request.y ?? 50),
    FORMAT: request.format ?? "image/png",
    BBOX: request.bbox.join(","),
  });
  setOptionalMapParameters(params, request);
  if (request.sortBy) params.set("SORTBY", request.sortBy);
  if (request.buffer !== undefined) params.set("buffer", String(request.buffer));
  if (request.propertyNames?.length) params.set("propertyName", request.propertyNames.join(","));
  const url = new URL(endpoint);
  url.search = params.toString();
  return url;
}
