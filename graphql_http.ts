import { validatePlaygroundRequest, validateRequest } from "./validates.ts";
import {
  contentType,
  ExecutionResult,
  graphql,
  GraphQLArgs,
  GraphQLError,
  JSON,
  PartialBy,
  RenderPageOptions,
  renderPlaygroundPage,
  Status,
} from "./deps.ts";

export type Params =
  & PartialBy<GraphQLArgs, "source">
  & {
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
    ...rest
  }: Readonly<Params>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const [data, err] = await validateRequest(req);
    if (err) {
      if (playground && validatePlaygroundRequest(req)) {
        const playground = renderPlaygroundPage(playgroundOptions);

        return response(
          new Response(playground, {
            headers: {
              "content-type": contentType("text/html"),
            },
          }),
        );
      }

      const graphqlError = resolveError(err);
      const result: ExecutionResult = { errors: [graphqlError] };

      return response(res(result, { status: err.statusHint }));
    }

    const { query: source, variableValues, operationName } = data;

    try {
      const result = await graphql({
        source,
        variableValues,
        operationName,
        ...rest,
      });

      return response(res(result, { status: Status.OK }));
    } catch (er) {
      const error = resolveError(er);
      const result: ExecutionResult = { errors: [error] };

      return response(res(result, { status: Status.InternalServerError }));
    }
  };
}

function res(
  result: ExecutionResult,
  responseInit: Readonly<ResponseInit>,
): Response {
  const [resultStr, err] = JSON.stringify(result);

  if (err) {
    const grqphqlError = resolveError(err);
    const result: ExecutionResult = { errors: [grqphqlError] };
    const [body] = JSON.stringify(result);
    return new Response(body, {
      headers: {
        "content-type": contentType(".json"),
      },
      status: Status.InternalServerError,
    });
  }

  const response = new Response(resultStr, responseInit);
  response.headers.append("content-type", contentType(".json"));

  return response;
}

function resolveError(er: unknown): GraphQLError {
  if (er instanceof GraphQLError) return er;

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
