import { createRequest, Options, Params } from "./requests.ts";
import { jsonObject } from "./deps.ts";
import { mergeHeaders } from "./utils.ts";
import { Result } from "./types.ts";
import { resolveResponse } from "./responses.ts";

/** GraphQL client with HTTP.
 * @param params parameters
 * @param options Options
 * @param requestInit Request init for customize HTTP request.
 * @throw Error
 * @throws TypeError
 * @throw SyntaxError
 * @throws DOMException
 * @throws AggregateError
 * ```ts
 * import { gqlFetch } from "https://deno.land/x/graphql_http@$VERSION/mod.ts";
 *
 * const { data, errors, extensions } = await gqlFetch({
 *   url: `<graphql-endpoint>`,
 *   query: `query Greet(name: $name) {
 *     hello(name: $name)
 *   }
 *   `,
 * }, {
 *   variables: {
 *     name: "Bob",
 *   },
 *   operationName: "Greet",
 *   method: "GET",
 * });
 * ```
 */
export default async function gqlFetch<T extends jsonObject>(
  { url, query }: Readonly<Params>,
  { method: _method = "POST", variables, operationName }: Readonly<
    Partial<Options>
  > = {},
  requestInit?: RequestInit,
): Promise<Result<T>> {
  const method = requestInit?.method ?? _method;
  const [data, err] = createRequest(
    {
      url,
      query,
      method,
    },
    { variables, operationName },
  );

  if (!data) {
    throw err;
  }

  const [headers, error] = mergeHeaders(data.headers, requestInit?.headers);
  if (!headers) {
    throw error;
  }

  const req = new Request(data, { ...requestInit, headers });
  const res = await fetch(req);
  return resolveResponse(res);
}
