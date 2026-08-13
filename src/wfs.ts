export type WfsGetFeatureRequest<TypeName extends string = string> = {
  typeName: TypeName;
  bbox?: [number, number, number, number];
  bboxCrs?: string;
  cqlFilter?: string;
  count?: number;
  startIndex?: number;
  sortBy?: string;
  propertyNames?: string[];
  outputFormat?: string;
};

export function buildWfsGetFeatureUrl(endpoint: string, request: WfsGetFeatureRequest): URL {
  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeNames: request.typeName,
    outputFormat: request.outputFormat ?? "application/json",
  });
  if (request.bbox) params.set("bbox", `${request.bbox.join(",")},${request.bboxCrs ?? "EPSG:4326"}`);
  if (request.cqlFilter) params.set("CQL_FILTER", request.cqlFilter);
  if (request.count !== undefined) params.set("count", String(request.count));
  if (request.startIndex !== undefined) params.set("startIndex", String(request.startIndex));
  if (request.sortBy) params.set("sortBy", request.sortBy);
  if (request.propertyNames?.length) params.set("propertyName", request.propertyNames.join(","));
  const url = new URL(endpoint);
  url.search = params.toString();
  return url;
}
