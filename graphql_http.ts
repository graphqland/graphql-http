import { validatePlaygroundRequest, validateRequest } from "./validates.ts";
import {
  accepts,
  contentType,
  ExecutionResult,
  getOperationAST,
  graphql,
  GraphQLArgs,
  GraphQLError,
  GraphQLSchema,
  isString,
  JSON,
  parse,
  PartialBy,
  RenderPageOptions,
  renderPlaygroundPage,
  specifiedRules,
  Status,
  tryCatch,
  tryCatchSync,
  validate,
  validateSchema,
} from "./deps.ts";

export type Params =
  & PartialBy<Omit<GraphQLArgs, "schema">, "source">
  & {
    /** A GraphQL schema from graphql-js. */
    schema: GraphQLSchema;

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
    response?: (res: Response, ctx: ResponseContext) => Response;

    /** Whether enabled graphql playground or not. */
    playground?: boolean;

    /** graphql playground options. */
    playgroundOptions?: RenderPageOptions;
  };

/** Response context */
export type ResponseContext = {
  /** Actual `Request` Object */
  request: Request;
};

/** Make a GraphQL `Response` Object that validate to `Request` Object.
 * @throws AggregateError - When graphql schema validation is fail.
 * ```ts
 * import { graphqlHttp } from "https://deno.land/x/graphql_http@$VERSION/mod.ts";
 * import {
 *   Handler,
 *   serve,
 *   Status,
 * } from "https://deno.land/std@$VERSION/http/mod.ts";
 * import { buildSchema } from "https://esm.sh/graphql@$VERSION";
 *
 * const schema = `type Query {
 *   hello: String!
 * }
 * `;
 * const graphqlResponse = graphqlHttp({
 *   schema: buildSchema(schema),
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
 *
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

  async function process(req: Request): Promise<[Response, ResponseContext]> {
    const responseCtx: ResponseContext = { request: req };
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
        return [res, responseCtx];
      }

      const result = createResult(err);
      const res = createResponse(result, {
        status: err.statusHint,
        contentType: preferContentType,
      });

      return [res, responseCtx];
    }
    const { query: source, variableValues, operationName } = data;

    const errorStatus = getErrorStatus(mediaType);
    const parseResult = tryCatchSync(() => parse(source));
    if (!parseResult[0]) {
      const result = createResult(parseResult[1]);
      const res = createResponse(result, {
        status: errorStatus,
        contentType: preferContentType,
      });

      return [res, responseCtx];
    }
    const documentAST = parseResult[0];
    const operationAST = getOperationAST(documentAST, operationName);
    if (
      req.method === "GET" && operationAST && operationAST.operation !== "query"
    ) {
      const result = createResult(
        `Invalid GraphQL operation. Can only perform a ${operationAST.operation} operation from a POST request.`,
      );
      const res = createResponse(result, {
        status: Status.MethodNotAllowed,
        contentType: preferContentType,
      });

      return [res, responseCtx];
    }
    const validationErrors = validate(schema, documentAST, specifiedRules);
    if (validationErrors.length > 0) {
      const result: ExecutionResult = { errors: validationErrors };
      const res = createResponse(result, {
        status: errorStatus,
        contentType: preferContentType,
      });

      return [res, responseCtx];
    }
    const [executionResult, executionErrors] = await tryCatch(() =>
      graphql({
        source,
        variableValues,
        operationName,
        schema,
        ...rest,
      })
    );
    if (executionResult) {
      switch (mediaType) {
        case "application/json": {
          const res = createResponse(executionResult, {
            status: Status.OK,
            contentType: preferContentType,
          });

          return [res, responseCtx];
        }

        case "application/graphql+json": {
          const status = "data" in executionResult
            ? Status.OK
            : Status.BadRequest;
          const res = createResponse(executionResult, {
            status,
            contentType: preferContentType,
          });

          return [res, responseCtx];
        }
      }
    }

    const result = createResult(executionErrors);
    const res = createResponse(result, {
      status: Status.InternalServerError,
      contentType: preferContentType,
    });
    return [res, responseCtx];
  }
}

function createResult(error: unknown): ExecutionResult {
  const graphqlError = resolveError(error);
  const result: ExecutionResult = { errors: [graphqlError] };
  return result;
}

function createResponse(
  result: ExecutionResult,
  { contentType, status }: Readonly<
    { contentType: ResponseContentType; status: number }
  >,
): Response {
  const [resultStr, err] = JSON.stringify(result);

  if (err) {
    const graphqlError = resolveError(err);
    const result: ExecutionResult = { errors: [graphqlError] };
    const [body] = JSON.stringify(result);
    return new Response(body, {
      headers: {
        "content-type": contentType,
      },
      status: Status.InternalServerError,
    });
  }

  const response = new Response(resultStr, {
    status,
    headers: {
      "content-type": contentType,
    },
  });

  return response;
}

function resolveError(er: unknown): GraphQLError {
  if (er instanceof GraphQLError) return er;
  if (isString(er)) return new GraphQLError(er);

  return er instanceof Error
    ? new GraphQLError(
      er.message,
      undefined,
      undefined,
      undefined,
      undefined,
      er,
    )
    : new GraphQLError("Unknown error has occurred.");
}

function withCharset<T extends string>(value: T): `${T}; charset=UTF-8` {
  return `${value}; charset=UTF-8`;
}

function getMediaType(
  req: Request,
): "application/graphql+json" | "application/json" {
  return (accepts(req, "application/graphql+json", "application/json") ??
    "application/json") as "application/graphql+json" | "application/json";
}

type ResponseContentType =
  | "application/graphql+json; charset=UTF-8"
  | "application/json; charset=UTF-8";

// When "Content-Type" is `application/json`, all Request error should be `200` status code. @see https://graphql.github.io/graphql-over-http/draft/#sec-application-json
// Validation error is Request error. @see https://spec.graphql.org/draft/#sec-Errors.Request-errors
function getErrorStatus(
  mediaType: "application/graphql+json" | "application/json",
): number {
  return mediaType === "application/json" ? Status.OK : Status.BadRequest;
}
