export function mergeHeaders(
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

export function mergeInit<
  T extends { headers?: HeadersInit },
>(
  a: T,
  b: T,
): [data: T] | [data: undefined, err: TypeError] {
  const [headers, err] = mergeHeaders(a.headers, b.headers);

  if (err) {
    return [, err];
  }
  return [{
    ...a,
    ...b,
    headers,
  }];
}

/** Compress GraphQL query.
 * @param query Graphql query.
 * ```ts
 * import { gql } from "https://deno.land/x/graphql_http@$VERSION/mod.ts";
 * import { assertEquals } from "https://deno.land/std@$VERSION/mod.ts";
 *
 * const query = gql`query Test {
 *   hello
 * }`;
 * assertEquals(query).toBe("query Test{hello}");
 * ```
 */
export function gql(query: TemplateStringsArray): string {
  return query.reduce((acc, cur) => `${acc}${cleanQuery(cur)}`, "");
}

function cleanQuery(query: string): string {
  return query
    // remove multiple whitespace
    .replace(/\s+/g, " ")
    // remove all whitespace between everything except for word and word boundaries
    .replace(/(\B)\s(\B)|(\b)\s(\B)|(\B)\s(\b)/gm, "")
    .trim();
}

const query = gql`query Test {
  hello
}`;

console.log(query);
