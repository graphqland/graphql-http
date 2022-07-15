import {
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

  const [mediaType] = parseMediaType(contentType);
  // const charset = params["charset"] ? params["charset"].toLowerCase() : "utf-8";

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
            message: `The message body is invalid. Must be Nested JSON format.`,
            statusHint: Status.BadRequest,
          }),
        ];
      }

      const { query: _query, operationName = null, variables = null } = json;

      const query = _query
        ? _query
        : new URL(req.url).searchParams.get("query");

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
              `The parameter is invalid. "variables" must be JSON format`,
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

    case "application/graphql": {
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

    // TODO:(miayuci) add 'application/x-www-form-urlencoded'

    default: {
      return [
        ,
        new InvalidHeaderError({
          message:
            `The header is invalid. "Content-Type" must be "application/json" or "application/graphql"`,
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
