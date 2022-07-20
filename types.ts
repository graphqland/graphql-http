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
