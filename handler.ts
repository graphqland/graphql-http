// Copyright 2022-latest the graphqland authors. All rights reserved. MIT license.
// This module is browser compatible.

import {
  assertValidSchema,
  createResponse,
  GraphQLSchema,
  HttpHandler,
} from "./deps.ts";
import { HandlerOptions } from "./types.ts";

/** Create HTTP handler what handle GraphQL-over-HTTP request.
 * @throws {Error} When schema is invalid.
 *
 * @example
 * ```ts
 * import { createHandler } from "https://deno.land/x/graphql_http@$VERSION/mod.ts";
 * import { buildSchema } from "https://esm.sh/graphql@$VERSION";
 *
 * const schema = buildSchema(`type Query { hello: String! }`);
 * const handler = createHandler(schema, {
 *   rootValue: {
 *     hello: "world",
 *   },
 * });
 * const req = new Request("<ENDPOINT>");
 * const res = await handler(req);
 * ```
 */
export function createHandler(
  schema: GraphQLSchema,
  options?: HandlerOptions,
): HttpHandler {
  assertValidSchema(schema);

  return (request) => createResponse(request, { ...options, schema });
}
