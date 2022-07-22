import { validatePlaygroundRequest } from "./validates.ts";
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
  createResponse,
  createResult,
  withCharset,
} from "./responses.ts";
import { resolveRequest } from "./requests.ts";
import { GraphQLOptionalArgs, GraphQLRequiredArgs } from "./types.ts";

export type Params =
  & PartialBy<GraphQLArgs, "source">
  & {
    /** Overwrite actual response.
     * ```ts
     * import { createHandler } from "https://deno.land/x/graphql_http@$VERSION/mod.ts";
     * import { buildSchema } from "https://esm.sh/graphql@$VERSION";
     *
     * const schema = buildSchema(`type Query {
     *     hello: String
     *   }`);
     * const handler = createHandler(schema, {
     *   response: (res, ctx) => {
     *     if (ctx.request.method === "GET") {
     *       res.headers.set("Cache-Control", "max-age=604800");
     *     }
     *     return res;
     *   },
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

export type Options =
  & GraphQLOptionalArgs
  & Pick<GraphQLRequiredArgs, "source">
  & {
    /** Overwrite actual response.
     * ```ts
     * import { createHandler } from "https://deno.land/x/graphql_http@$VERSION/mod.ts";
     * import { buildSchema } from "https://esm.sh/graphql@$VERSION";
     *
     * const schema = buildSchema(`type Query {
     *     hello: String
     *   }`);
     * const handler = createHandler(schema, {
     *   response: (res, ctx) => {
     *     if (res.ok && ctx.request.method === "GET" && !ctx.playground) {
     *       res.headers.set("Cache-Control", "max-age=604800");
     *     }
     *     return res;
     *   },
     * });
     * ```
     */
    response: (
      res: Response,
      ctx: RequestContext,
    ) => Promise<Response> | Response;

    /** Whether enabled [graphql-playground](https://github.com/graphql/graphql-playground) or not. */
    playground: boolean;

    /** [graphql-playground](https://github.com/graphql/graphql-playground) options.
     * @default `{ endpoint: "/graphql" }`
     */
    playgroundOptions: RenderPageOptions;
  };

/** Create HTTP handler what handle GraphQL over HTTP request.
 * @throws {@link AggregateError}
 * When graphql schema validation is fail.
 * ```ts
 * import { createHandler } from "https://deno.land/x/graphql_http@$VERSION/mod.ts";
 * import { buildSchema } from "https://esm.sh/graphql@$VERSION";
 *
 * const schema = buildSchema(`type Query {
 *     hello: String!
 *   }`);
 *
 * const handler = createHandler(schema, {
 *   rootValue: {
 *     hello: "world",
 *   },
 *   playground: true,
 * });
 * const req = new Request("<ENDPOINT>");
 * const res = await handler(req);
 * ```
 */
export default function createHandler(
  schema: GraphQLRequiredArgs["schema"],
  {
    response = (res) => res,
    playground,
    playgroundOptions = { endpoint: "/graphql" },
    ...rest
  }: Readonly<Partial<Options>> = {},
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
    const mimeType = getMediaType(req);
    const preferContentType = withCharset(mimeType);

    const [data, err] = await resolveRequest(req);
    if (!data) {
      if (playground && validatePlaygroundRequest(req)) {
        const playground = renderPlaygroundPage(playgroundOptions);
        const res = new Response(playground, {
          status: Status.OK,
          headers: { "content-type": contentType("text/html") },
        });
        return [res, { ...requestCtx, playground: true }];
      }

      const result = createResult(err);
      const baseHeaders: HeadersInit = { "content-type": preferContentType };
      const responseInit: ResponseInit = err.status === Status.MethodNotAllowed
        ? {
          status: err.status,
          headers: {
            ...baseHeaders,
            allow: ["GET", "POST"].join(","),
          },
        }
        : {
          status: err.status,
          headers: baseHeaders,
        };
      const res = createJSONResponse(result, responseInit);

      return [res, requestCtx];
    }
    const { query: source, variableValues, operationName } = data;

    const res = createResponse({
      schema,
      source,
      method: req.method as "GET" | "POST",
    }, {
      mimeType: mimeType,
      variableValues,
      operationName,
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
