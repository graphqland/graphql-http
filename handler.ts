import { accepts, Status, validateSchema } from "./deps.ts";
import {
  createJSONResponse,
  createResponse,
  createResult,
  withCharset,
} from "./responses.ts";
import { resolveRequest } from "./requests.ts";
import { GraphQLOptionalArgs, GraphQLRequiredArgs } from "./types.ts";

export type Options =
  & GraphQLOptionalArgs
  & Pick<GraphQLRequiredArgs, "source">;

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
 * });
 * const req = new Request("<ENDPOINT>");
 * const res = await handler(req);
 * ```
 */
export default function createHandler(
  schema: GraphQLRequiredArgs["schema"],
  options: Readonly<Partial<Options>> = {},
): (req: Request) => Promise<Response> | Response {
  const validateSchemaResult = validateSchema(schema);
  if (validateSchemaResult.length) {
    throw new AggregateError(validateSchemaResult, "Schema validation error");
  }

  return async (req) => {
    const result = await process(req);

    return result;
  };

  async function process(req: Request): Promise<Response> {
    const mimeType = getMediaType(req);
    const preferContentType = withCharset(mimeType);

    const [data, err] = await resolveRequest(req);
    if (!data) {
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

      return res;
    }
    const { query: source, variables: variableValues, operationName } = data;

    const res = createResponse({
      schema,
      source,
      method: req.method as "GET" | "POST",
    }, {
      mimeType: mimeType,
      variableValues,
      operationName,
      ...options,
    });

    return res;
  }
}

function getMediaType(
  req: Request,
): "application/graphql+json" | "application/json" {
  return (accepts(req, "application/graphql+json", "application/json") ??
    "application/json") as "application/graphql+json" | "application/json";
}
