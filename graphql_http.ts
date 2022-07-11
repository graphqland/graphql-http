import {
  InvalidError,
  MissingError,
  validatePlaygroundRequest,
  validateRequest,
} from "./validates.ts";
import {
  contentType,
  graphql,
  GraphQLArgs,
  PartialBy,
  RenderPageOptions,
  renderPlaygroundPage,
} from "./deps.ts";
import { resolveErrorMsg } from "./utils.ts";

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
    const isPlaygroundRequest = validatePlaygroundRequest(req);

    if (isPlaygroundRequest && playground) {
      const playground = renderPlaygroundPage(playgroundOptions);

      const res = new Response(playground, {
        headers: {
          "content-type": contentType("text/html"),
        },
      });

      return res;
    }

    const [data, err] = await validateRequest(req);

    if (err) {
      const res = makeResponseFromError(err);
      return response(res);
    }

    const { query: source, variableValues, operationName } = data;

    try {
      const result = await graphql({
        source,
        variableValues,
        operationName,
        ...rest,
      });
      const res = new Response(JSON.stringify(result), {
        headers: {
          "content-type": contentType(".json"),
        },
      });

      return response(res);
    } catch (e) {
      const msg = resolveErrorMsg(e);
      const res = new Response(msg, {
        status: 500,
        headers: {
          "content-type": contentType("txt"),
        },
      });
      return response(res);
    }
  };
}

function makeResponseFromError(err: MissingError | InvalidError): Response {
  if (err.code === "INVALID_HTTP_METHOD") {
    const res = new Response(err.hint, {
      status: 405,
      headers: {
        "content-type": contentType("txt"),
      },
    });
    return res;
  }
  if (err.code === "INVALID_HEADER_CONTENT_TYPE") {
    const res = new Response(err.hint, {
      status: 415,
      headers: {
        "content-type": contentType("txt"),
      },
    });

    return res;
  }

  const res = new Response(err.hint, {
    status: 400,
    headers: {
      "content-type": contentType("txt"),
    },
  });

  return res;
}
