import {
  APPLICATION_GRAPHQL_JSON,
  APPLICATION_JSON,
  MIME_TYPE_APPLICATION_JSON,
} from "./constants.ts";
import {
  GraphQLError,
  isString,
  json,
  stringify,
  tryCatchSync,
} from "./deps.ts";

type GqlError = Omit<InstanceType<typeof GraphQLError>, "toString" | "toJSON">;

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
  errors?: GqlError[];
  extensions?: unknown;
};

export interface GraphQLResponse<T extends jsonObject = jsonObject> {
  data?: T | null;
  errors?: GraphQLError[];
  extensions?: unknown;
}

export function createRequest(
  params: Readonly<Params & Pick<Options, "method">>,
  options: Partial<Options>,
  requestInit: RequestInit = {},
): [data: Request, error: undefined] | [data: undefined, error: TypeError] {
  const [data, err] = createRequestInitSet(params, options);
  if (err) {
    return [, err];
  }

  const mergeResult = mergeRequest(data.requestInit, requestInit);
  if (mergeResult[1]) {
    return [, mergeResult[1]];
  }

  try {
    const req = new Request(data.url.toString(), mergeResult[0]);
    return [req, undefined];
  } catch (e) {
    return [, e as TypeError];
  }
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
          Accept: ACCEPT,
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

export async function resolveResponse<T extends jsonObject>(
  res: Response,
): Promise<Result<T>> {
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

function mergeRequest(
  a: RequestInit,
  b: RequestInit,
): [data: RequestInit, err: undefined] | [data: undefined, err: TypeError] {
  const [data, err] = mergeHeaders(a.headers, b.headers);
  if (err) {
    return [, err];
  }

  const headers = new Headers(data);
  return [{
    ...a,
    ...b,
    headers,
  }, undefined];
}

function mergeHeaders(
  a?: HeadersInit,
  b?: HeadersInit,
): [data: HeadersInit, err: undefined] | [data: undefined, err: TypeError] {
  const aHeader = new Headers(a);
  const bHeader = new Headers(b);

  try {
    aHeader.forEach((value, key) => {
      bHeader.append(key, value);
    });

    const headersInit = Object.fromEntries(bHeader.entries());
    return [headersInit ?? {}, undefined];
  } catch (e) {
    return [, e as TypeError];
  }
}
