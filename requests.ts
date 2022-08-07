import {
  APPLICATION_GRAPHQL_JSON,
  APPLICATION_JSON,
  MIME_TYPE_APPLICATION_JSON,
} from "./constants.ts";
import {
  accepts,
  createHttpError,
  HttpError,
  isNil,
  isNull,
  isObject,
  isString,
  JSON,
  jsonObject,
  parseMediaType,
  Status,
  stringify,
  tryCatchSync,
} from "./deps.ts";
import { GraphQLParameters } from "./types.ts";

const ACCEPT = `${APPLICATION_GRAPHQL_JSON}, ${APPLICATION_JSON}` as const;

export type Params = {
  /** GraphQL query. */
  query: string;

  /** GraphQL URL endpoint. */
  url: URL | string;
};

export type Options = {
  /** GraphQL variables. */
  variables: jsonObject;

  /** HTTP Request method.
   * According to the GraphQL over HTTP Spec, all GraphQL servers accept `POST` requests.
   * @default `POST`
   */
  // deno-lint-ignore ban-types
  method: "GET" | "POST" | ({} & string);

  /** GraphQL operation name.  */
  operationName: string;
};

/** Create GraphQL `Request` object.
 * @param params parameters.
 * @param options options.
 * ```ts
 * import { createRequest } from "https://deno.land/x/graphql_http@$VERSION/mod.ts";
 *
 * const [request, err] = createRequest({
 *   url: "<graphql-endpoint>",
 *   query: `query Greet(name: $name) {
 *     hello(name: $name)
 *   }`,
 *   method: "GET",
 * });
 *
 * if (!err) {
 *   const res = await fetch(request);
 * }
 * ```
 */
export function createRequest(
  params: Readonly<Params & Pick<Options, "method">>,
  options: Partial<Omit<Options, "method">> = {},
): [data: Request, error: undefined] | [data: undefined, error: TypeError] {
  const [data, err] = createRequestInitSet(params, options);
  if (err) {
    return [, err];
  }

  const requestResult = tryCatchSync(() =>
    new Request(data.url.toString(), data.requestInit)
  );

  return requestResult as [Request, undefined] | [undefined, TypeError];
}

export function createRequestInitSet(
  { url: _url, query, method }: Readonly<Params & Pick<Options, "method">>,
  { variables, operationName }: Partial<Options>,
):
  | [data: { url: URL; requestInit: RequestInit }, error: undefined]
  | [data: undefined, error: TypeError] {
  const [url, err] = isString(_url)
    ? tryCatchSync(() => new URL(_url))
    : [_url, undefined] as const;

  if (!url) {
    return [, err as TypeError];
  }

  switch (method) {
    case "GET": {
      const result = addQueryString(url, {
        query,
        operationName,
        variables,
      });

      if (result[1]) {
        return [undefined, result[1]];
      }

      const requestInit: RequestInit = {
        method,
        headers: {
          Accept: ACCEPT,
        },
      };

      return [{ url: result[0], requestInit }, undefined];
    }
    case "POST": {
      const [body, err] = stringify({ query, variables, operationName });
      if (err) {
        return [, err];
      }
      const requestInit: RequestInit = {
        method,
        body,
        headers: {
          accept: ACCEPT,
          "content-type": MIME_TYPE_APPLICATION_JSON,
        },
      };
      return [{ url, requestInit }, undefined];
    }
    default: {
      return [{ url, requestInit: {} }, undefined];
    }
  }
}

function addQueryString(
  url: URL,
  { query, variables, operationName }:
    & Pick<Params, "query">
    & Partial<Pick<Options, "operationName" | "variables">>,
): [data: URL, error: undefined] | [data: undefined, error: TypeError] {
  url.searchParams.set("query", query);
  if (variables) {
    const [data, err] = stringify(variables);
    if (err) {
      return [, err];
    }
    url.searchParams.set("variables", data);
  }
  if (operationName) {
    url.searchParams.set("operationName", operationName);
  }

  return [url, undefined];
}

export type RequestResult = [data: GraphQLParameters] | [
  data: undefined,
  error: HttpError,
];

/** Resolve GraphQL over HTTP request, take out GraphQL parameters safety.
 * @params req `Request` object
 * @remark No error is thrown and `reject` is never called.
 * ```ts
 * import {
 *   resolveRequest,
 * } from "https://deno.land/x/graphql_http@$VERSION/mod.ts";
 *
 * const req = new Request("<graphql-endpoint>"); // any Request
 * const [data, err] = await resolveRequest(req);
 * if (data) {
 *   const { query, variables, operationName, extensions } = data;
 * }
 * ```
 */
export function resolveRequest(
  req: Request,
): RequestResult | Promise<RequestResult> {
  const method = req.method;

  switch (method) {
    case "GET": {
      return resolveGetRequest(req);
    }
    case "POST": {
      return resolvePostRequest(req);
    }
    default: {
      return [
        ,
        createHttpError(
          Status.MethodNotAllowed,
          `Invalid HTTP method. GraphQL only supports GET and POST requests.`,
        ),
      ];
    }
  }
}

export function resolveGetRequest(req: Request): RequestResult {
  const acceptResult = resolveAcceptHeader(req);

  if (acceptResult[1]) {
    return acceptResult;
  }

  const url = new URL(req.url);

  const source = url.searchParams.get("query");
  if (!source) {
    return [
      ,
      createHttpError(Status.BadRequest, `The parameter is required. "query"`),
    ];
  }
  let variables: GraphQLParameters["variables"] | null = null;
  const variablesStr = url.searchParams.get("variables");
  if (isString(variablesStr)) {
    const [data, err] = JSON.parse(variablesStr);
    if (err) {
      return [
        ,
        createHttpError(
          Status.BadRequest,
          `The parameter is invalid. "variables" are invalid JSON.`,
        ),
      ];
    }
    if (isPlainObject(data)) {
      variables = data;
    }
  }

  const operationName = url.searchParams.get("operationName");

  return [{
    query: source,
    variables,
    operationName,
    extensions: null,
  }];
}

export async function resolvePostRequest(
  req: Request,
): Promise<RequestResult> {
  const acceptHeader = resolveAcceptHeader(req);

  if (acceptHeader[1]) {
    return acceptHeader;
  }
  const contentType = req.headers.get("content-type");
  if (!contentType) {
    return [
      ,
      createHttpError(
        Status.BadRequest,
        `The header is required. "Content-Type"`,
      ),
    ];
  }

  const [mediaType, record = { charset: "UTF-8" }] = parseMediaType(
    contentType,
  );

  const charset = record.charset ? record.charset : "UTF-8";
  if (charset.toUpperCase() !== "UTF-8") {
    return [
      ,
      createHttpError(
        Status.UnsupportedMediaType,
        `The header is invalid. Supported media type charset is "UTF-8".`,
      ),
    ];
  }

  // // TODO:(miyauci) check the body already read.
  // const body = await req.text();

  switch (mediaType) {
    case "application/json": {
      const data = await req.text();
      const [json, err] = JSON.parse(data);

      if (err) {
        return [
          ,
          createHttpError(
            Status.BadRequest,
            `The message body is invalid. Invalid JSON format.`,
          ),
        ];
      }

      if (!isPlainObject(json)) {
        return [
          ,
          createHttpError(
            Status.BadRequest,
            `The message body is invalid. Must be JSON object format.`,
          ),
        ];
      }

      const { query: _query, operationName = null, variables = null } = json;

      const query = isNil(_query)
        ? new URL(req.url).searchParams.get("query")
        : _query;

      if (isNil(query)) {
        return [
          ,
          createHttpError(
            Status.BadRequest,
            `The parameter is required. "query"`,
          ),
        ];
      }

      if (!isString(query)) {
        return [
          ,
          createHttpError(
            Status.BadRequest,
            `The parameter is invalid. "query" must be string.`,
          ),
        ];
      }

      if (!isNull(variables) && !isPlainObject(variables)) {
        return [
          ,
          createHttpError(
            Status.BadRequest,
            `The parameter is invalid. "variables" must be JSON object format`,
          ),
        ];
      }
      if (!isStringOrNull(operationName)) {
        return [
          ,
          createHttpError(
            Status.BadRequest,
            `The parameter is invalid. "operationName" must be string or null.`,
          ),
        ];
      }

      return [{
        query,
        operationName,
        variables,
        extensions: null,
      }];
    }

    case "application/graphql+json": {
      const body = await req.text();
      const fromQueryString = new URL(req.url).searchParams.get("query");
      const query = !body ? fromQueryString : body;

      if (!query) {
        return [
          ,
          createHttpError(
            Status.BadRequest,
            `The message body is required. "GraphQL query"`,
          ),
        ];
      }
      return [{
        query,
        operationName: null,
        variables: null,
        extensions: null,
      }];
    }

    default: {
      return [
        ,
        createHttpError(
          Status.UnsupportedMediaType,
          `The header is invalid. "Content-Type" must be "application/json" or "application/graphql+json"`,
        ),
      ];
    }
  }
}

function resolveAcceptHeader(
  req: Request,
): [data: string, error: undefined] | [
  data: undefined,
  error: HttpError,
] {
  // Accept header is not provided, treat the request has `Accept: application/json`
  // From 1st January 2025 (2025-01-01T00:00:00Z), treat the request has `Accept: application/graphql+json`
  // @see https://graphql.github.io/graphql-over-http/draft/#sec-Legacy-watershed
  if (!req.headers.has("accept")) {
    return [
      "application/json",
      undefined,
    ];
  }

  const acceptResult = accepts(
    req,
    "application/graphql+json",
    "application/json",
  );

  if (!acceptResult) {
    return [
      ,
      createHttpError(
        Status.NotAcceptable,
        `The header is invalid. "Accept" must include "application/graphql+json" or "application/json"`,
      ),
    ];
  }

  return [acceptResult, undefined];
}

function isPlainObject(value: unknown): value is Record<PropertyKey, unknown> {
  return isObject(value) && value.constructor === Object;
}

function isStringOrNull(value: unknown): value is string | null {
  return isString(value) || isNull(value);
}
