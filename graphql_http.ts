import { validatePlaygroundRequest, validateRequest } from "./validates.ts";
import {
  accepts,
  contentType,
  GraphQLArgs,
  PartialBy,
  RenderPageOptions,
  renderPlaygroundPage,
  Status,
  validateSchema,
} from "./deps.ts";
import {
  createJSONResponse,
  createResponseFrom,
  createResult,
  withCharset,
} from "./responses.ts";

export type Params =
  & PartialBy<GraphQLArgs, "source">
  & {
    /** Overwrite actual response.
     * ```ts
     * import { graphqlHttp } from "https://deno.land/x/graphql_http@$VERSION/mod.ts";
     * import { buildSchema } from "https://esm.sh/graphql@$VERSION";
     *
     * const responser = graphqlHttp({
     *   response: (res, ctx) => {
     *     if (ctx.request.method === "GET") {
     *       res.headers.set("Cache-Control", "max-age=604800");
     *     }
     *     return res;
     *   },
     *   schema: buildSchema(`type Query {
     *     hello: String
     *   }`),
     * });
     * ```
     */
    response?: (
      res: Response,
      ctx: RequestContext,
    ) => Promise<Response> | Response;

    /** Whether enabled [graphql-playground](https://github.com/graphql/graphql-playground) or not. */
    playground?: boolean;

    /** [graphql-playground](https://github.com/graphql/graphql-playground) options.
     * @default `{ endpoint: "/graphql" }`
     */
    playgroundOptions?: RenderPageOptions;
  };

/** Request context */
export type RequestContext = {
  /** Actual `Request` Object */
  request: Request;

  /** Whether the request is to playground or not. */
  playground: boolean;
};

/** Make a GraphQL `Response` Object that validate to `Request` Object.
 * @throws {@link AggregateError}
 * When graphql schema validation is fail.
 *
 * ```ts
 * import { graphqlHttp } from "https://deno.land/x/graphql_http@$VERSION/mod.ts";
 * import {
 *   Handler,
 *   serve,
 *   Status,
 * } from "https://deno.land/std@$VERSION/http/mod.ts";
 * import { buildSchema } from "https://esm.sh/graphql@$VERSION";
 *
 * const graphqlResponse = graphqlHttp({
 *   schema: buildSchema(`type Query {
 *     hello: String!
 *   }`),
 *   rootValue: {
 *     hello: () => "world",
 *   },
 *   playground: true,
 * });
 *
 * const handler: Handler = (req) => {
 *   const { pathname } = new URL(req.url);
 *   if (pathname === "/graphql") {
 *     return graphqlResponse(req);
 *   }
 *   return new Response("Not Found", {
 *     status: Status.NotFound,
 *   });
 * };
 *
 * serve(handler);
 * ```
 */
export default function graphqlHttp(
  {
    response = (res) => res,
    playground,
    playgroundOptions = { endpoint: "/graphql" },
    schema,
    ...rest
  }: Readonly<Params>,
): (req: Request) => Promise<Response> {
  const validateSchemaResult = validateSchema(schema);
  if (validateSchemaResult.length) {
    throw new AggregateError(validateSchemaResult, "Schema validation error");
  }

  return async (req) => {
    const result = await process(req);

    return response(...result);
  };

  async function process(req: Request): Promise<[Response, RequestContext]> {
    const requestCtx: RequestContext = { request: req, playground: false };
    const mediaType = getMediaType(req);
    const preferContentType = withCharset(mediaType);

    const [data, err] = await validateRequest(req);
    if (err) {
      if (playground && validatePlaygroundRequest(req)) {
        const playground = renderPlaygroundPage(playgroundOptions);
        const res = new Response(playground, {
          status: Status.OK,
          headers: { "content-type": contentType("text/html") },
        });
        return [res, { ...requestCtx, playground: true }];
      }

      const result = createResult(err);
      const res = createJSONResponse(result, {
        status: err.statusHint,
        headers: {
          "content-type": preferContentType,
        },
      });

      return [res, requestCtx];
    }
    const { query: source, variableValues, operationName } = data;

    const res = createResponseFrom({
      schema,
      source,
      variableValues,
      operationName,
      contentType: mediaType,
      method: req.method,
      ...rest,
    });

    return [res, requestCtx];
  }
}

function getMediaType(
  req: Request,
): "application/graphql+json" | "application/json" {
  return (accepts(req, "application/graphql+json", "application/json") ??
    "application/json") as "application/graphql+json" | "application/json";
}
