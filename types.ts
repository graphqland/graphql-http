// deno-lint-ignore-file no-explicit-any
import { APPLICATION_GRAPHQL_JSON, APPLICATION_JSON } from "./constants.ts";
import {
  GraphQLError,
  GraphQLFieldResolver,
  GraphQLSchema,
  GraphQLTypeResolver,
  json,
  PickBy,
  Source,
} from "./deps.ts";
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
  variables: Record<string, unknown> | null;

  /** The name of the Operation in the Document to execute. */
  operationName: string | null;

  /** Reserved for implementors to extend the protocol however they see fit. */
  extensions: Record<string, unknown> | null;
};

export type GraphQLRequiredArgs = {
  /** The GraphQL type system to use when validating and executing a query. */
  schema: GraphQLSchema;

  /** A GraphQL language formatted string representing the requested operation. */
  source: string | Source;
};

export type GraphQLOptionalArgs = {
  /** The value provided as the first argument to resolver functions on the top level type (e.g. the query object type). */
  rootValue: unknown;

  /** The context value is provided as an argument to resolver functions after field arguments. It is used to pass shared information useful at any point during executing this query, for example the currently logged in user and connections to databases or other services. */
  contextValue: unknown;

  /** A mapping of variable name to runtime value to use for all variables defined in the requestString. */
  variableValues: {
    readonly [variable: string]: unknown;
  } | null;

  /** The name of the operation to use if requestString contains multiple possible operations. Can be omitted if requestString contains only one operation. */
  operationName: string | null;

  /** A resolver function to use when one is not provided by the schema. If not provided, the default field resolver is used (which looks for a value or method on the source value with the field's name). */
  fieldResolver: GraphQLFieldResolver<any, any> | null;

  /** A type resolver function to use when none is provided by the schema. If not provided, the default type resolver is used (which looks for a `__typename` field or alternatively calls the `isTypeOf` method). */
  typeResolver: GraphQLTypeResolver<any, any> | null;
};
