import {
  executeSync,
  ExecutionResult,
  getOperationAST,
  GraphQLArgs,
  GraphQLError,
  isString,
  isUndefined,
  parse,
  specifiedRules,
  Status,
  stringify,
  tryCatchSync,
  validate,
} from "./deps.ts";
import { ApplicationGraphQLJson, ApplicationJson } from "./types.ts";
import { APPLICATION_GRAPHQL_JSON, APPLICATION_JSON } from "./constants.ts";
import { mergeResponse } from "./utils.ts";

export type Params = {
  contentType: ApplicationGraphQLJson | ApplicationJson;
} & ExecutionResult;

export function createResponse(
  { contentType, errors, extensions, data }: Params,
): [data: Response] | [data: undefined, err: TypeError] {
  const [resultStr, err] = stringify({ errors, extensions, data });

  if (err) {
    return [, err];
  }
  switch (contentType) {
    case APPLICATION_JSON: {
      return [
        new Response(resultStr, {
          status: Status.OK,
          headers: {
            "content-type": withCharset(contentType),
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
            "content-type": withCharset(contentType),
          },
        }),
      ];
    }
  }
}

export function withCharset<T extends string>(value: T): `${T}; charset=UTF-8` {
  return `${value}; charset=UTF-8`;
}

export function createResponseFrom(
  { source, contentType, operationName, method, schema, variableValues }:
    & GraphQLArgs
    & {
      contentType: ApplicationGraphQLJson | ApplicationJson;
      method: string;
    },
): Response {
  const ContentType = withCharset(contentType);
  const errorStatus = getErrorStatus(contentType);

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
      variableValues,
      operationName,
      schema,
      document: documentAST,
    })
  );
  if (executionResult) {
    const [data, err] = createResponse({
      contentType,
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
    const init = mergeResponse(responseInit, {
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
