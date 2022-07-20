import {
  APPLICATION_GRAPHQL_JSON,
  APPLICATION_JSON,
  MIME_TYPE_APPLICATION_JSON,
} from "./constants.ts";
import {
  GraphQLError,
  isString,
  json,
  PickBy,
  stringify,
  tryCatchSync,
} from "./deps.ts";

export type SerializedGraphQLError = PickBy<GraphQLError, json | undefined>;

export type jsonObject = {
  [k: string]: json;
};

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

export type Result<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  data?: T;
  errors?: SerializedGraphQLError[];
  extensions?: unknown;
};

export interface GraphQLResponse<T extends jsonObject = jsonObject> {
  data?: T | null;
  errors?: GraphQLError[];
  extensions?: unknown;
}

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

/**
 * Resolve GraphQL over HTTP response safety.
 * @param res `Request` object
 * @throws Error
 * @throws AggregateError
 * @throws SyntaxError
 * @throws TypeError
 * ```ts
 * import {
 *   resolveResponse,
 * } from "https://deno.land/x/graphql_http@$VERSION/mod.ts";
 *
 * const res = new Response(); // any Response
 * const result = await resolveResponse(res);
 * ```
 */
export async function resolveResponse<T extends jsonObject>(
  res: Response,
): Promise<Result<T>> {
  const contentType = res.headers.get("content-type");

  if (!contentType) {
    throw Error(`"Content-Type" header is required`);
  }

  if (!isValidContentType(contentType)) {
    throw Error(
      `Valid "Content-Type" is application/graphql+json or application/json`,
    );
  }

  const json = await res.json() as Result<T>;

  if (res.ok) {
    return json;
  } else {
    if (json.errors) {
      throw new AggregateError(
        json.errors,
        "GraphQL request error has occurred",
      );
    }

    throw Error("Unknown error has occurred");
  }
}

export function isValidContentType(value: string): boolean {
  return ["application/json", "application/graphql+json"].some((mimeType) =>
    value.includes(mimeType)
  );
}
