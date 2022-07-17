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
import { MIME_TYPE } from "./constants.ts";

export type Params =
  & PartialBy<Omit<GraphQLArgs, "schema">, "source">
  & {
    /** A GraphQL schema from graphql-js. */
    schema: GraphQLSchema;

    response?: (res: Response) => Response;

    playground?: boolean;

    playgroundOptions?: RenderPageOptions;
  };

/** Make a GraphQL `Response` Object that validate to `Request` Object.
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
  return async (req: Request): Promise<Response> => {
    const mediaType = getMediaType(req);
    const preferContentType = withCharset(mediaType);

    const [data, err] = await validateRequest(req);

    if (err) {
      if (playground && validatePlaygroundRequest(req)) {
        const playground = renderPlaygroundPage(playgroundOptions);

        return response(
          new Response(playground, {
            status: Status.OK,
            headers: {
              "content-type": contentType("text/html"),
            },
          }),
        );
      }

      const graphqlError = resolveError(err);
      const result: ExecutionResult = { errors: [graphqlError] };
      const res = createResponse(result, {
        status: err.statusHint,
        contentType: preferContentType,
      });

      return response(res);
    }

    const { query: source, variableValues, operationName } = data;

    const parseResult = tryCatchSync(() => parse(source));
    if (!parseResult[0]) {
      const graphqlError = resolveError(parseResult[1]);
      const result: ExecutionResult = {
        errors: [graphqlError],
      };
      const res = createResponse(result, {
        status: Status.BadRequest,
        contentType: preferContentType,
      });

      return response(res);
    }

    const documentAST = parseResult[0];
    const operationAST = getOperationAST(documentAST, operationName);

    if (
      req.method === "GET" && operationAST && operationAST.operation !== "query"
    ) {
      const graphqlError = resolveError(
        `Invalid GraphQL operation. Can only perform a ${operationAST.operation} operation from a POST request.`,
      );
      const result: ExecutionResult = {
        errors: [
          graphqlError,
        ],
      };
      const res = createResponse(result, {
        status: Status.MethodNotAllowed,
        contentType: preferContentType,
      });

      return response(res);
    }

    const validateSchemaResult = validateSchema(schema);

    if (validateSchemaResult.length) {
      const result: ExecutionResult = { errors: validateSchemaResult };
      const res = createResponse(result, {
        status: Status.InternalServerError,
        contentType: preferContentType,
      });

      return response(res);
    }

    const validationErrors = validate(schema, documentAST, specifiedRules);

    if (validationErrors.length > 0) {
      const result: ExecutionResult = { errors: validationErrors };
      const res = createResponse(result, {
        // When "Content-Type" is `application/json`, all Request error should be `200` status code. @see https://graphql.github.io/graphql-over-http/draft/#sec-application-json
        // Validation error is Request error. @see https://spec.graphql.org/draft/#sec-Errors.Request-errors
        status: mediaType === "application/json"
          ? Status.OK
          : Status.BadRequest,
        contentType: preferContentType,
      });

      return response(res);
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

          return response(res);
        }

        case "application/graphql+json": {
          const status = "data" in executionResult
            ? Status.OK
            : Status.BadRequest;
          const res = createResponse(executionResult, {
            status,
            contentType: preferContentType,
          });

          return response(res);
        }
      }
    }

    const error = resolveError(executionErrors);
    const result: ExecutionResult = { errors: [error] };

    const res = createResponse(result, {
      status: Status.InternalServerError,
      contentType: preferContentType,
    });

    return response(res);
  };
}

function createResponse(
  result: ExecutionResult,
  { contentType, status }: Readonly<
    { contentType: ResponseContentType; status: number }
  >,
): Response {
  const [resultStr, err] = JSON.stringify(result);

  if (err) {
    const grqphqlError = resolveError(err);
    const result: ExecutionResult = { errors: [grqphqlError] };
    const [body] = JSON.stringify(result);
    return new Response(body, {
      headers: {
        "content-type": MIME_TYPE,
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
