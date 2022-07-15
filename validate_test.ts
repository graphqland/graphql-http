import { describe, expect, it } from "./dev_deps.ts";
import { validateGetRequest, validatePostRequest } from "./validates.ts";
import {
  InvalidHeaderError,
  InvalidParameterError,
  MissingBodyError,
  MissingHeaderError,
  MissingParameterError,
} from "./errors.ts";

const describeGetTests = describe("validateGetRequest");
const BASE_URL = "https://test.test";

it(
  describeGetTests,
  `should return error when query string of "query" is not exists`,
  () => {
    const result = validateGetRequest(new Request(BASE_URL));
    expect(result[0]).toBeUndefined();
    expect(result[1]).toError(
      MissingParameterError,
      `The parameter is required. "query"`,
    );
  },
);

it(
  describeGetTests,
  `should return InvalidParameterError when query string of "variables" is invalid JSON`,
  () => {
    const url = new URL("?query=query&variables=test", BASE_URL);
    const result = validateGetRequest(new Request(url.toString()));
    expect(result[0]).toBeUndefined();
    expect(result[1]).toError(
      InvalidParameterError,
      `The parameter is invalid. "variables" are invalid JSON.`,
    );
  },
);

it(
  describeGetTests,
  `should return data when query string of valid`,
  () => {
    const url = new URL(
      `?query=query&variables={"test":"test"}&operationName=query`,
      BASE_URL,
    );
    const result = validateGetRequest(new Request(url.toString()));
    expect(result[0]).toEqual({
      query: `query`,
      variableValues: {
        test: "test",
      },
      operationName: "query",
    });
    expect(result[1]).toBeUndefined();
  },
);

const describePostTests = describe("validatePostRequest");

it(
  describePostTests,
  `should return MissingHeaderError when "Content-Type" header is missing`,
  async () => {
    const result = await validatePostRequest(
      new Request(BASE_URL, {
        method: "POST",
      }),
    );

    expect(result[0]).toBeUndefined();
    expect(result[1]).toError(
      MissingHeaderError,
      `The header is required. "Content-Type"`,
    );
  },
);

it(
  describePostTests,
  `should return InvalidHeaderError when "Content-Type" header is unknown`,
  async () => {
    const result = await validatePostRequest(
      new Request(BASE_URL, {
        method: "POST",
        headers: {
          "content-type": "plain/txt",
        },
      }),
    );

    expect(result[0]).toBeUndefined();
    expect(result[1]).toError(
      InvalidHeaderError,
      'The header is invalid. "Content-Type" must be "application/json" or "application/graphql"',
    );
  },
);

it(
  describePostTests,
  `application/graphql`,
  async (t) => {
    await t.step(
      "should return MissingBodyError when the message body is empty",
      async () => {
        const result = await validatePostRequest(
          new Request(BASE_URL, {
            method: "POST",
            headers: {
              "content-type": "application/graphql",
            },
          }),
        );
        expect(result[0]).toBeUndefined();
        expect(result[1]).toError(
          MissingBodyError,
          `The message body is required. "GraphQL query"`,
        );
      },
    );
    await t.step(
      `should return data when the message body is exists`,
      async () => {
        const result = await validatePostRequest(
          new Request(BASE_URL, {
            body: "test",
            method: "POST",
            headers: {
              "content-type": "application/graphql",
            },
          }),
        );
        expect(result[0]).toEqual({ query: "test" });
        expect(result[1]).toBeUndefined();
      },
    );
    await t.step(
      `should return data when the query string of "query" is exists`,
      async () => {
        const url = new URL("?query=test", BASE_URL);
        const result = await validatePostRequest(
          new Request(url.toString(), {
            method: "POST",
            headers: {
              "content-type": "application/graphql",
            },
          }),
        );
        expect(result[0]).toEqual({ query: "test" });
        expect(result[1]).toBeUndefined();
      },
    );
    await t.step(
      `should return message body data when message body and query string of "query" is exists`,
      async () => {
        const url = new URL("?query=from-query", BASE_URL);
        const result = await validatePostRequest(
          new Request(url.toString(), {
            body: "from body",
            method: "POST",
            headers: {
              "content-type": "application/graphql",
            },
          }),
        );
        expect(result[0]).toEqual({ query: "from body" });
        expect(result[1]).toBeUndefined();
      },
    );
  },
);
