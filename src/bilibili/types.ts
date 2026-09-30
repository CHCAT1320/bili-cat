export type ParamType = "string" | "number" | "boolean" | "array" | "unknown";

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS";

export interface Endpoint {
  readonly url: string;
  readonly method: HttpMethod;
  readonly verify?: true;
  readonly wbi?: true;
  readonly dm?: true;
  readonly sign?: true;
  readonly no_csrf?: true;
  readonly json_body?: true;
  readonly ignore_code?: true;
  readonly dataRaw?: true;
  readonly params?: Readonly<Record<string, ParamType>>;
  readonly data?: Readonly<Record<string, ParamType>>;
  readonly query?: Readonly<Record<string, ParamType>>;
  readonly files?: Readonly<Record<string, ParamType>>;
}

export interface EndpointTree {
  readonly [name: string]: Endpoint | EndpointTree;
}
