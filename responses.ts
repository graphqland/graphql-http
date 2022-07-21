import {
  executeSync,
  ExecutionResult,
  getOperationAST,
  GraphQLArgs,
  GraphQLError,
  isString,
  isUndefined,
  jsonObject,
  parse,
  specifiedRules,
  Status,
  stringify,
  tryCatchSync,
  validate,
} from "./deps.ts";
import { ApplicationGraphQLJson, ApplicationJson, Result } from "./types.ts";
import { APPLICATION_GRAPHQL_JSON, APPLICATION_JSON } from "./constants.ts";
import { mergeInit } from "./utils.ts";

export type Params = {
  mimeType: ApplicationGraphQLJson | ApplicationJson;
} & ExecutionResult;

export function createResponseFromResult(
  { mimeType, errors, extensions, data }: Params,
): [data: Response] | [data: undefined, err: TypeError] {
  const [resultStr, err] = stringify({ errors, extensions, data });

  if (err) {
    return [, err];
  }
  switch (mimeType) {
    case APPLICATION_JSON: {
      return [
        new Response(resultStr, {
          status: Status.OK,
          headers: {
            "content-type": withCharset(mimeType),
          },
        }),
      ];
    }

    case APPLICATION_GRAPHQL_JSON: {
      const status = isUndefined(data) ? Status.BadRequest : Status.OK;
      return [
        new Response(resultStr, {
          status,
          headers: {
            "content-type": withCharset(mimeType),
          },
        }),
      ];
    }
  }
}

export function withCharset<T extends string>(value: T): `${T}; charset=UTF-8` {
  return `${value}; charset=UTF-8`;
}

import { PickPartial, PickRequired } from "./deps.ts";

type ResponseParams = PickRequired<GraphQLArgs> & {
  method: "GET" | "POST";
};

type ResponseOptions = PickPartial<GraphQLArgs> & {
  mimeType: ApplicationGraphQLJson | ApplicationJson;
};

/**
 * Create a GraphQL over HTTP compliant `Response` object.
 * ```ts
 * import {
 *   createResponse,
 * } from "https://deno.land/x/graphql_http@$VERSION/mod.ts";
 * import { buildSchema } from "https://esm.sh/graphql@$VERSION";
 *
 * const schema = buildSchema(`query {
 *   hello: String!
 * }`);
 *
 * const res = createResponse({
 *   schema,
 *   source: `query { hello }`,
 *   mimeType: "application/graphql+json",
 *   method: "POST",
 * }, {
 *   rootValue: {
 *     hello: "world",
 *   },
 * });
 * ```
 */
export function createResponse(
  { source, method, schema }: Readonly<ResponseParams>,
  {
    operationName,
    variableValues,
    rootValue,
    contextValue,
    fieldResolver,
    typeResolver,
    mimeType = "application/graphql+json",
  }: Readonly<Partial<ResponseOptions>> = {},
): Response {
  const ContentType = withCharset(mimeType);
  const errorStatus = getErrorStatus(mimeType);

  const parseResult = tryCatchSync(() => parse(source));
  if (!parseResult[0]) {
    const result = createResult(parseResult[1]);

    const res = createJSONResponse(result, {
      status: errorStatus,
      headers: {
        "content-type": ContentType,
      },
    });
    return res;
  }
  const documentAST = parseResult[0];
  const operationAST = getOperationAST(documentAST, operationName);

  if (
    method === "GET" && operationAST && operationAST.operation !== "query"
  ) {
    const result = createResult(
      `Invalid GraphQL operation. Can only perform a ${operationAST.operation} operation from a POST request.`,
    );

    const res = createJSONResponse(result, {
      status: Status.MethodNotAllowed,
      headers: {
        "content-type": ContentType,
      },
    });

    return res;
  }

  const validationErrors = validate(schema, documentAST, specifiedRules);
  if (validationErrors.length > 0) {
    const result: ExecutionResult = { errors: validationErrors };

    const res = createJSONResponse(result, {
      status: errorStatus,
      headers: {
        "content-type": ContentType,
      },
    });

    return res;
  }

  const [executionResult, executionErrors] = tryCatchSync(() =>
    executeSync({
      schema,
      document: documentAST,
      operationName,
      variableValues,
      rootValue,
      contextValue,
      fieldResolver,
      typeResolver,
    })
  );
  if (executionResult) {
    const [data, err] = createResponseFromResult({
      mimeType,
      ...executionResult,
    });

    if (!data) {
      const result = createResult(err);

      const res = createJSONResponse(result, {
        status: Status.InternalServerError,
        headers: {
          "content-type": ContentType,
        },
      });
      return res;
    }

    return data;
  }

  const result = createResult(executionErrors);
  const res = createJSONResponse(result, {
    status: Status.InternalServerError,
    headers: {
      "content-type": ContentType,
    },
  });
  return res;
}

export function createResult(error: unknown): ExecutionResult {
  const graphqlError = resolveError(error);
  const result: ExecutionResult = { errors: [graphqlError] };
  return result;
}

export function createJSONResponse(
  result: ExecutionResult,
  responseInit: ResponseInit,
): Response {
  const [data, err] = stringify(result);

  if (err) {
    const result = createResult(err);
    const [body] = JSON.stringify(result);
    const init = mergeInit(responseInit, {
      status: Status.InternalServerError,
    });
    return new Response(body, init[0]);
  }

  const response = new Response(data, responseInit);

  return response;
}

// When "Content-Type" is `application/json`, all Request error should be `200` status code. @see https://graphql.github.io/graphql-over-http/draft/#sec-application-json
// Validation error is Request error. @see https://spec.graphql.org/draft/#sec-Errors.Request-errors
function getErrorStatus(
  mediaType: "application/graphql+json" | "application/json",
): number {
  return mediaType === "application/json" ? Status.OK : Status.BadRequest;
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

/**
 * Resolve GraphQL over HTTP response safety.
 * @param res `Response` object
 * @throws Error
 * @throws AggregateError
 * @throws SyntaxError
 * @throws TypeError
 * ```ts
 * import {
 *   resolveResponse,
 * } from "https://deno.land/x/graphql_http@$VERSION/mod.ts";
 *
 * const res = new Response(); // any Response
 * const result = await resolveResponse(res);
 * ```
 */
export async function resolveResponse<T extends jsonObject>(
  res: Response,
): Promise<Result<T>> {
  const contentType = res.headers.get("content-type");

  if (!contentType) {
    throw Error(`"Content-Type" header is required`);
  }

  if (!isValidContentType(contentType)) {
    throw Error(
      `Valid "Content-Type" is application/graphql+json or application/json`,
    );
  }

  const json = await res.json() as Result<T>;

  if (res.ok) {
    return json;
  } else {
    if (json.errors) {
      throw new AggregateError(
        json.errors,
        "GraphQL request error has occurred",
      );
    }

    throw Error("Unknown error has occurred");
  }
}

export function isValidContentType(value: string): boolean {
  return ["application/json", "application/graphql+json"].some((mimeType) =>
    value.includes(mimeType)
  );
}
