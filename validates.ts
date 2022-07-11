import {
  isNull,
  isObject,
  isString,
  JSON,
  json,
  parseMediaType,
} from "./deps.ts";

export type Result = [data: {
  query: string;
  variableValues?: Record<string, unknown> | null;
  operationName?: string | null;
}, err: undefined] | [data: undefined, err: MissingError | InvalidError];

export const MISSING_PARAMETER = "MISSING_PARAMETER";
export const MISSING_BODY = "MISSING_BODY";
export const MISSING_HEADER = "MISSING_HEADER";
export const INVALID_HTTP_METHOD = "INVALID_HTTP_METHOD";
export const INVALID_HEADER_CONTENT_TYPE = "INVALID_HEADER_CONTENT_TYPE";
export const INVALID_PARAMETER = "INVALID_PARAMETER";
export const INVALID_BODY = "INVALID_BODY";

type MissingErrorCode =
  | typeof MISSING_PARAMETER
  | typeof MISSING_BODY
  | typeof MISSING_HEADER;

type InvalidErrorCode =
  | typeof INVALID_HTTP_METHOD
  | typeof INVALID_HEADER_CONTENT_TYPE
  | typeof INVALID_PARAMETER
  | typeof INVALID_BODY;

export type ErrorCode = MissingErrorCode | InvalidErrorCode;

type BaseError = {
  hint: string;
  code: string;
  expected?: string[];
};

export type MissingError = BaseError & {
  code: MissingErrorCode;
};
export type InvalidError = BaseError & {
  code: InvalidErrorCode;
  actual: unknown;
  expected?: unknown[];
};

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
      return [, {
        hint:
          `The http method is invalid. ${method}, valid: "GET", "HEAD", "POST"`,
        code: INVALID_HTTP_METHOD,
        actual: method,
        expected: ["GET", "HEAD", "POST"],
      }];
    }
  }
}

export function validateGetRequest(req: Request): Result {
  const url = new URL(req.url);

  const source = url.searchParams.get("query");
  if (!source) {
    return [, {
      hint: `The parameter is required. "query"`,
      code: MISSING_PARAMETER,
    }];
  }
  const variables = url.searchParams.get("variables");
  const variableValues = variables
    ? (() => {
      const [data, err] = JSON.parse(variables);
      if (err || !isPlainObject(data)) {
        return null;
      }

      return data;
    })()
    : null;
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
    return [, {
      hint: `The header is required. "Content-Type"`,
      code: MISSING_HEADER,
    }];
  }

  const [mediaType] = parseMediaType(contentType);

  switch (mediaType) {
    case "application/json": {
      const data = await req.json() as Partial<json>;
      if (isPlainObject(data)) {
        const { query, operationName = null, variables = null } = data;

        if (!isString(query)) {
          return [, {
            code: MISSING_PARAMETER,
            hint: `The parameter is required. "query"`,
          }];
        }

        if (!isNull(variables) && !isPlainObject(variables)) {
          return [, {
            code: INVALID_PARAMETER,
            hint: `The parameter is invalid. "variables": JSON format`,
            actual: variables,
          }];
        }
        if (!isStringOrNull(operationName)) {
          return [, {
            code: INVALID_PARAMETER,
            hint: `The parameter is invalid. "operationName": string, null`,
            actual: operationName,
          }];
        }

        return [{
          query,
          operationName,
          variableValues: variables,
        }, undefined];
      }
      return [, {
        code: INVALID_BODY,
        hint: `The message body is invalid. Must be JSON format`,
        actual: data,
      }];
    }

    case "application/graphql": {
      const query = await req.text();
      if (!query) {
        return [, {
          code: MISSING_BODY,
          hint: `The message body is required. "GraphQL query"`,
        }];
      }
      return [{ query }, undefined];
    }

    default: {
      return [, {
        code: INVALID_HEADER_CONTENT_TYPE,
        hint:
          `The header is invalid. Valid "Content-Type": "application/json", "application/graphql"`,
        actual: mediaType,
        expected: ["application/json", "application/graphql"],
      }];
    }
  }
}

export function validatePlaygroundRequest(req: Request): boolean {
  if (req.method !== "GET") {
    return false;
  }

  const url = new URL(req.url);
  const accept = req.headers.get("accept");

  if (!accept) return false;
  const accepts = accept.split(",");
  const acceptHTML = accepts.some((accept) => {
    const [mediaType] = parseMediaType(accept);
    return mediaType === "text/html";
  });
  const hasRaw = url.searchParams.has("raw");

  return acceptHTML && !hasRaw;
}

function isPlainObject(value: unknown): value is Record<PropertyKey, unknown> {
  return isObject(value) && value.constructor === Object;
}

function isStringOrNull(value: unknown): value is string | null {
  return isString(value) || isNull(value);
}
