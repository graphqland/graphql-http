import {
  contentType,
  RenderPageOptions,
  renderPlaygroundPage,
  Status,
} from "../deps.ts";
import { validatePlaygroundRequest } from "../validates.ts";

/** Use GraphQL Playground as handler.
 * @param handler The handler for individual HTTP requests.
 * @param options The [graphql-playground](https://github.com/graphql/graphql-playground) options.
 * ```ts
 * import {
 *   createHandler,
 *   useGraphQLPlayground,
 * } from "https://deno.land/x/graphql_http@$VERSION/mod.ts";
 * import { buildSchema } from "https://esm.sh/graphql@$VERSION";
 *
 * const schema = buildSchema(`type Query {
 *     hello: String!
 *   }`);
 *
 * let handler = createHandler(schema, {
 *   rootValue: {
 *     hello: "world",
 *   },
 * });
 * handler = useGraphQLPlayground(handler);
 * const req = new Request("<ENDPOINT>");
 * const res = await handler(req);
 * ```
 */
export default function useGraphQLPlayground(
  handler: (req: Request) => Promise<Response> | Response,
  /**
   * @default `{ endpoint: "/graphql"}`
   */
  options: RenderPageOptions = { endpoint: "/graphql" },
): (req: Request) => Promise<Response> | Response {
  return (req) => {
    const result = validatePlaygroundRequest(req);
    if (result) {
      const playground = renderPlaygroundPage(options);
      const res = new Response(playground, {
        status: Status.OK,
        headers: { "content-type": contentType("text/html") },
      });

      return res;
    }

    return handler(req);
  };
}
