import { APPLICATION_GRAPHQL_JSON, APPLICATION_JSON } from "./constants.ts";
import { GraphQLError, json, PickBy } from "./deps.ts";
export type ApplicationJson = typeof APPLICATION_JSON;
export type ApplicationGraphQLJson = typeof APPLICATION_GRAPHQL_JSON;

export type SerializedGraphQLError = PickBy<GraphQLError, json | undefined>;

export type Result<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  data?: T | null;
  errors?: SerializedGraphQLError[];
  extensions?: unknown;
};

/** GraphQL over HTTP Request parameters.
 * @see https://graphql.github.io/graphql-over-http/draft/#sec-Request-Parameters
 */
export type GraphQLParameters = {
  /** A Document containing GraphQL Operations and Fragments to execute. */
  query: string;

  /** Values for any Variables defined by the Operation. */
  variableValues?: Record<string, unknown> | null;

  /** The name of the Operation in the Document to execute. */
  operationName?: string | null;

  /** Reserved for implementors to extend the protocol however they see fit. */
  extensions?: Record<string, unknown> | null;
};
