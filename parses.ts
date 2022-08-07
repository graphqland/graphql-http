import { has, isNull, isPlainObject, isString } from "./deps.ts";
import { GraphQLParameters } from "./types.ts";

/** Parse value as {@link GraphQLParameters}. */
export function parseGraphQLParameters(
  value: unknown,
): [data: GraphQLParameters] | [data: undefined, error: TypeError] {
  if (!isPlainObject(value)) {
    return [
      ,
      TypeError(
        `Invalid field. "payload" must be plain object.`,
      ),
    ];
  }

  if (!has(value, "query")) {
    return [
      ,
      TypeError(
        `Missing field. "query"`,
      ),
    ];
  }

  if (!isString(value.query)) {
    return [
      ,
      TypeError(
        `Invalid field. "query" must be string.`,
      ),
    ];
  }

  if (
    has(value, "variables") &&
    (!isNull(value.variables) && !isPlainObject(value.variables))
  ) {
    return [
      ,
      TypeError(
        `Invalid field. "variables" must be plain object or null`,
      ),
    ];
  }
  if (
    has(value, "operationName") &&
    (!isNull(value.operationName) && !isString(value.operationName))
  ) {
    return [
      ,
      TypeError(
        `Invalid field. "operationName" must be string or null.`,
      ),
    ];
  }
  if (
    has(value, "extensions") &&
    (!isNull(value.extensions) && !isPlainObject(value.extensions))
  ) {
    return [
      ,
      TypeError(
        `Invalid field. "extensions" must be plain object or null`,
      ),
    ];
  }

  const { query, variables = null, operationName = null, extensions = null } =
    value as GraphQLParameters;

  return [{
    operationName,
    variables,
    extensions,
    query,
  }];
}
