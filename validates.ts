import {
  accepts,
  isNil,
  isNull,
  isObject,
  isString,
  JSON,
  parseMediaType,
  Status,
} from "./deps.ts";
import {
  GraphQLHTTPError,
  InvalidBodyError,
  InvalidHeaderError,
  InvalidHTTPMethodError,
  InvalidParameterError,
  MissingBodyError,
  MissingHeaderError,
  MissingParameterError,
} from "./errors.ts";

export type Result = [data: {
  query: string;
  variableValues?: Record<string, unknown> | null;
  operationName?: string | null;
}, err: undefined] | [data: undefined, err: GraphQLHTTPError];

export function validateRequest(req: Request): Promise<Result> | Result {
  const method = req.method;

  switch (method) {
    case "GET": {
      return validateGetRequest(req);
    }
    case "POST": {
      return validatePostRequest(req);
    }
    default: {
      return [
        ,
        new InvalidHTTPMethodError(
          {
            statusHint: Status.MethodNotAllowed,
            message:
              `Invalid HTTP method. GraphQL only supports GET and POST requests.`,
          },
        ),
      ];
    }
  }
}

export function validateGetRequest(req: Request): Result {
  const acceptResult = validateAcceptHeader(req);

  if (acceptResult[1]) {
    return acceptResult;
  }

  const url = new URL(req.url);

  const source = url.searchParams.get("query");
  if (!source) {
    return [
      ,
      new MissingParameterError({
        message: `The parameter is required. "query"`,
        statusHint: Status.BadRequest,
      }),
    ];
  }
  let variableValues: Record<string, unknown> | null = null;
  const variables = url.searchParams.get("variables");
  if (isString(variables)) {
    const [data, err] = JSON.parse(variables);
    if (err) {
      return [
        ,
        new InvalidParameterError({
          message: `The parameter is invalid. "variables" are invalid JSON.`,
          statusHint: Status.BadRequest,
        }),
      ];
    }
    if (isPlainObject(data)) {
      variableValues = data;
    }
  }

  const operationName = url.searchParams.get("operationName");

  return [{
    query: source,
    variableValues,
    operationName,
  }, undefined];
}

export async function validatePostRequest(req: Request): Promise<Result> {
  const acceptHeader = validateAcceptHeader(req);

  if (acceptHeader[1]) {
    return acceptHeader;
  }
  const contentType = req.headers.get("content-type");
  if (!contentType) {
    return [
      ,
      new MissingHeaderError({
        message: `The header is required. "Content-Type"`,
        statusHint: Status.BadRequest,
      }),
    ];
  }

  const [mediaType, record = { charset: "UTF-8" }] = parseMediaType(
    contentType,
  );

  const charset = record.charset ? record.charset : "UTF-8";
  if (charset.toUpperCase() !== "UTF-8") {
    return [
      ,
      new InvalidHeaderError({
        message:
          `The header is invalid. Supported media type charset is "UTF-8".`,
        statusHint: Status.UnsupportedMediaType,
      }),
    ];
  }

  // // TODO:(miyauci) check the body already read.
  // const body = await req.text();

  switch (mediaType) {
    case "application/json": {
      const data = await req.text();
      const [json, err] = JSON.parse(data);

      if (err) {
        return [
          ,
          new InvalidBodyError({
            message: `The message body is invalid. Invalid JSON format.`,
            statusHint: Status.BadRequest,
          }),
        ];
      }

      if (!isPlainObject(json)) {
        return [
          ,
          new InvalidBodyError({
            message: `The message body is invalid. Must be JSON object format.`,
            statusHint: Status.BadRequest,
          }),
        ];
      }

      const { query: _query, operationName = null, variables = null } = json;

      const query = isNil(_query)
        ? new URL(req.url).searchParams.get("query")
        : _query;

      if (isNil(query)) {
        return [
          ,
          new InvalidBodyError({
            message: `The parameter is required. "query"`,
            statusHint: Status.BadRequest,
          }),
        ];
      }

      if (!isString(query)) {
        return [
          ,
          new InvalidBodyError({
            message: `The parameter is invalid. "query" must be string.`,
            statusHint: Status.BadRequest,
          }),
        ];
      }

      if (!isNull(variables) && !isPlainObject(variables)) {
        return [
          ,
          new InvalidBodyError({
            message:
              `The parameter is invalid. "variables" must be JSON object format`,
            statusHint: Status.BadRequest,
          }),
        ];
      }
      if (!isStringOrNull(operationName)) {
        return [
          ,
          new InvalidBodyError({
            message:
              `The parameter is invalid. "operationName" must be string or null.`,
            statusHint: Status.BadRequest,
          }),
        ];
      }

      return [{
        query,
        operationName,
        variableValues: variables,
      }, undefined];
    }

    case "application/graphql+json": {
      const body = await req.text();
      const fromQueryString = new URL(req.url).searchParams.get("query");
      const query = !body ? fromQueryString : body;

      if (!query) {
        return [
          ,
          new MissingBodyError({
            message: `The message body is required. "GraphQL query"`,
            statusHint: Status.BadRequest,
          }),
        ];
      }
      return [{ query }, undefined];
    }

    default: {
      return [
        ,
        new InvalidHeaderError({
          message:
            `The header is invalid. "Content-Type" must be "application/json" or "application/graphql+json"`,
          statusHint: Status.UnsupportedMediaType,
        }),
      ];
    }
  }
}

export function validatePlaygroundRequest(req: Request): boolean {
  if (req.method !== "GET") {
    return false;
  }

  const accept = req.headers.get("accept");
  if (!accept) return false;

  const accepts = accept.split(",");
  const acceptHTML = accepts.some((accept) => {
    const [mediaType] = parseMediaType(accept);
    return mediaType === "text/html";
  });

  return acceptHTML;
}

function isPlainObject(value: unknown): value is Record<PropertyKey, unknown> {
  return isObject(value) && value.constructor === Object;
}

function isStringOrNull(value: unknown): value is string | null {
  return isString(value) || isNull(value);
}

function validateAcceptHeader(
  req: Request,
): [data: string, err: undefined] | [
  data: undefined,
  err: GraphQLHTTPError,
] {
  // Accept header is not provided, treat the request has `Accept: application/json`
  // From 1st January 2025 (2025-01-01T00:00:00Z), treat the request has `Accept: application/graphql+json`
  // @see https://graphql.github.io/graphql-over-http/draft/#sec-Legacy-watershed
  if (!req.headers.has("accept")) {
    return [
      "application/json",
      undefined,
    ];
  }

  const acceptResult = accepts(
    req,
    "application/graphql+json",
    "application/json",
  );

  if (!acceptResult) {
    return [
      ,
      new InvalidHeaderError({
        message:
          `The header is invalid. "Accept" must include "application/graphql+json" or "application/json"`,
        statusHint: Status.NotAcceptable,
      }),
    ];
  }

  return [acceptResult, undefined];
}
