export type WmsFeatureInfoRequest = {
  layer: string;
  bbox: [number, number, number, number];
  cqlFilter?: string;
  featureCount?: number;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  sortBy?: string;
};

export function buildWmsFeatureInfoUrl(endpoint: string, request: WmsFeatureInfoRequest): URL {
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetFeatureInfo",
    SRS: "EPSG:4326",
    LAYERS: request.layer,
    QUERY_LAYERS: request.layer,
    INFO_FORMAT: "application/json",
    FEATURE_COUNT: String(request.featureCount ?? 200),
    WIDTH: String(request.width ?? 100),
    HEIGHT: String(request.height ?? 100),
    X: String(request.x ?? 50),
    Y: String(request.y ?? 50),
    FORMAT: "image/png",
    BBOX: request.bbox.join(","),
  });
  if (request.cqlFilter) params.set("CQL_FILTER", request.cqlFilter);
  if (request.sortBy) params.set("SORTBY", request.sortBy);
  const url = new URL(endpoint);
  url.search = params.toString();
  return url;
}
