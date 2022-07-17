import {
  BaseRequest,
  contentType,
  describe,
  expect,
  it,
  queryString,
} from "./dev_deps.ts";
import {
  validateGetRequest,
  validatePostRequest,
  validateRequest,
} from "./validates.ts";
import {
  InvalidBodyError,
  InvalidHeaderError,
  InvalidHTTPMethodError,
  InvalidParameterError,
  MissingBodyError,
  MissingHeaderError,
  MissingParameterError,
} from "./errors.ts";

const describeGetTests = describe("validateGetRequest");
const BASE_URL = "https://test.test";

it(
  describe("validateRequest"),
  "return InvalidHTTPMethodError when The HTTP method is not GET or not POST",
  async () => {
    await Promise.all(
      ["OPTION", "HEAD", "PUT", "DELETE", "PATCH"].map(
        async (method) => {
          const [, err] = await validateRequest(
            new BaseRequest(BASE_URL, {
              method,
            }),
          );
          expect(err).toError(
            InvalidHTTPMethodError,
            `Invalid HTTP method. GraphQL only supports GET and POST requests.`,
          );
        },
      ),
    );
  },
);

it(
  describeGetTests,
  `should return error when header of "Accept" does not contain "application/graphql+json" or "application/json"`,
  () => {
    const result = validateGetRequest(
      new Request(BASE_URL, {
        headers: {
          accept: contentType("txt"),
        },
      }),
    );
    expect(result[0]).toBeUndefined();
    expect(result[1]).toError(
      InvalidHeaderError,
      `The header is invalid. "Accept" must include "application/graphql+json" or "application/json"`,
    );
  },
);

it(
  describeGetTests,
  `should return data when header of "Accept" contain "application/json"`,
  () => {
    const result = validateGetRequest(
      new Request(queryString(BASE_URL, { query: `query` }), {
        headers: {
          Accept: `application/json`,
        },
      }),
    );
    expect(result[1]).toBeUndefined();
    expect(result[0]).toEqual({
      query: "query",
      variableValues: null,
      operationName: null,
    });
  },
);

it(
  describeGetTests,
  `should return data when header of "Accept" contain "application/graphql+json"`,
  () => {
    const result = validateGetRequest(
      new Request(queryString(BASE_URL, { query: `query` }), {
        headers: {
          Accept: `application/graphql+json`,
        },
      }),
    );
    expect(result[1]).toBeUndefined();
    expect(result[0]).toEqual({
      query: "query",
      variableValues: null,
      operationName: null,
    });
  },
);

it(
  describeGetTests,
  `should return error when query string of "query" is not exists`,
  () => {
    const result = validateGetRequest(new BaseRequest(BASE_URL));
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
    const result = validateGetRequest(new BaseRequest(url.toString()));
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
    const result = validateGetRequest(new BaseRequest(url.toString()));
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
      new BaseRequest(BASE_URL, {
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
      new BaseRequest(BASE_URL, {
        method: "POST",
        headers: {
          "content-type": "plain/txt",
        },
      }),
    );

    expect(result[0]).toBeUndefined();
    expect(result[1]).toError(
      InvalidHeaderError,
      'The header is invalid. "Content-Type" must be "application/json" or "application/graphql+json"',
    );
  },
);

it(describePostTests, `application/json`, async (t) => {
  await t.step(
    `should return error when header of "Accept" does not contain "application/graphql" or "application/json"`,
    async () => {
      const result = await validatePostRequest(
        new Request(BASE_URL, {
          method: "POST",
          headers: {
            accept: contentType("txt"),
          },
        }),
      );
      expect(result[0]).toBeUndefined();
      expect(result[1]).toError(
        InvalidHeaderError,
        `The header is invalid. "Accept" must include "application/graphql+json" or "application/json"`,
      );
    },
  );

  await t.step(
    `should return error when header of "Content-Type" is not exists`,
    async () => {
      const result = await validatePostRequest(
        new BaseRequest(BASE_URL, {
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

  await t.step(
    `should return error when header of "Content-Type" does not contain "application/graphql+json" or "application/json"`,
    async () => {
      const result = await validatePostRequest(
        new BaseRequest(BASE_URL, {
          method: "POST",
          headers: {
            "content-type": contentType("txt"),
          },
        }),
      );
      expect(result[0]).toBeUndefined();
      expect(result[1]).toError(
        InvalidHeaderError,
        `The header is invalid. "Content-Type" must be "application/json" or "application/graphql+json"`,
      );
    },
  );

  await t.step(
    `should return error when header of "Content-Type" charset is not "UTF-8"`,
    async () => {
      const result = await validatePostRequest(
        new BaseRequest(BASE_URL, {
          method: "POST",
          headers: {
            "content-type": "application/graphql+json; charset=utf-16",
          },
        }),
      );
      expect(result[0]).toBeUndefined();
      expect(result[1]).toError(
        InvalidHeaderError,
        `The header is invalid. Supported media type charset is "UTF-8".`,
      );
    },
  );

  await t.step(
    "should return InvalidBodyError when message body is invalid JSON format",
    async () => {
      const result = await validatePostRequest(
        new BaseRequest(BASE_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
        }),
      );
      expect(result[0]).toBeUndefined();
      expect(result[1]).toError(
        InvalidBodyError,
        `The message body is invalid. Invalid JSON format.`,
      );
    },
  );
  await t.step(
    "should return InvalidBodyError when message body is not JSON object format",
    async () => {
      const result = await validatePostRequest(
        new BaseRequest(BASE_URL, {
          body: "true",
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
        }),
      );
      expect(result[0]).toBeUndefined();
      expect(result[1]).toError(
        InvalidBodyError,
        `The message body is invalid. Must be JSON object format.`,
      );
    },
  );
  await t.step(
    "should return InvalidBodyError when query parameter from message body or query string is not exists",
    async () => {
      const result = await validatePostRequest(
        new BaseRequest(BASE_URL, {
          body: `{"query":null}`,
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
        }),
      );
      expect(result[0]).toBeUndefined();
      expect(result[1]).toError(
        InvalidBodyError,
        `The parameter is required. "query"`,
      );
    },
  );
  await t.step(
    "should return InvalidBodyError when query parameter from message body is not string format",
    async () => {
      const result = await validatePostRequest(
        new BaseRequest(BASE_URL, {
          body: `{"query":0}`,
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
        }),
      );
      expect(result[0]).toBeUndefined();
      expect(result[1]).toError(
        InvalidBodyError,
        `The parameter is invalid. "query" must be string.`,
      );
    },
  );
  await t.step(
    "should return data when parameter of query string is exists",
    async () => {
      const url = new URL(`?query=test`, BASE_URL);
      const result = await validatePostRequest(
        new BaseRequest(url.toString(), {
          body: `{"query":null}`,
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
        }),
      );
      expect(result[0]).toEqual({
        query: "test",
        operationName: null,
        variableValues: null,
      });
      expect(result[1]).toBeUndefined();
    },
  );
  await t.step(
    `should return data what "query" is from body when message body of "query" and query string of "query" are exist`,
    async () => {
      const url = new URL(`?query=from-query-string`, BASE_URL);
      const result = await validatePostRequest(
        new BaseRequest(url.toString(), {
          body: `{"query":"from body"}`,
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
        }),
      );
      expect(result[0]).toEqual({
        query: "from body",
        operationName: null,
        variableValues: null,
      });
      expect(result[1]).toBeUndefined();
    },
  );
  await t.step(
    `should return data when "Content-Type" is application/json; charset=utf-8`,
    async () => {
      const result = await validatePostRequest(
        new BaseRequest(BASE_URL, {
          body: `{"query":"from body"}`,
          method: "POST",
          headers: {
            "content-type": "application/json; charset=utf-8",
          },
        }),
      );
      expect(result[0]).toEqual({
        query: "from body",
        operationName: null,
        variableValues: null,
      });
      expect(result[1]).toBeUndefined();
    },
  );
  await t.step(
    `should return InvalidBodyError when "variables" is not JSON object format`,
    async () => {
      const result = await validatePostRequest(
        new BaseRequest(BASE_URL, {
          body: `{"query":"query","variables":false}`,
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
        }),
      );
      expect(result[0]).toBeUndefined();
      expect(result[1]).toError(
        InvalidBodyError,
        'The parameter is invalid. "variables" must be JSON object format',
      );
    },
  );
  await t.step(
    `should return data when "variables" is null`,
    async () => {
      const result = await validatePostRequest(
        new BaseRequest(BASE_URL, {
          body: `{"query":"query","variables":null}`,
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
        }),
      );
      expect(result[0]).toEqual({
        query: "query",
        operationName: null,
        variableValues: null,
      });
      expect(result[1]).toBeUndefined();
    },
  );
  await t.step(
    `should return data when "variables" is JSON object format`,
    async () => {
      const result = await validatePostRequest(
        new BaseRequest(BASE_URL, {
          body: `{"query":"query","variables":{"abc":[]}}`,
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
        }),
      );
      expect(result[0]).toEqual({
        query: "query",
        operationName: null,
        variableValues: { abc: [] },
      });
      expect(result[1]).toBeUndefined();
    },
  );
  await t.step(
    `should return InvalidBodyError when "operationName" is not string or not null`,
    async () => {
      const result = await validatePostRequest(
        new BaseRequest(BASE_URL, {
          body: `{"query":"query","operationName":0}`,
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
        }),
      );
      expect(result[0]).toBeUndefined();
      expect(result[1]).toError(
        InvalidBodyError,
        'The parameter is invalid. "operationName" must be string or null.',
      );
    },
  );
  await t.step(
    `should return data when "operationName" is string`,
    async () => {
      const result = await validatePostRequest(
        new BaseRequest(BASE_URL, {
          body: `{"query":"query","operationName":"subscription"}`,
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
        }),
      );
      expect(result[0]).toEqual({
        query: "query",
        operationName: "subscription",
        variableValues: null,
      });
      expect(result[1]).toBeUndefined();
    },
  );
});

it(
  describePostTests,
  `application/graphql+json`,
  async (t) => {
    await t.step(
      "should return MissingBodyError when the message body is empty",
      async () => {
        const result = await validatePostRequest(
          new BaseRequest(BASE_URL, {
            method: "POST",
            headers: {
              "content-type": "application/graphql+json",
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
          new BaseRequest(BASE_URL, {
            body: "test",
            method: "POST",
            headers: {
              "content-type": "application/graphql+json",
            },
          }),
        );
        expect(result[0]).toEqual({ query: "test" });
        expect(result[1]).toBeUndefined();
      },
    );
    await t.step(
      `should return data when the message body is exists and content-type with charset`,
      async () => {
        const result = await validatePostRequest(
          new BaseRequest(BASE_URL, {
            body: "test",
            method: "POST",
            headers: {
              "content-type": "application/graphql+json;charset=utf-8",
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
          new BaseRequest(url.toString(), {
            method: "POST",
            headers: {
              "content-type": "application/graphql+json",
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
          new BaseRequest(url.toString(), {
            body: "from body",
            method: "POST",
            headers: {
              "content-type": "application/graphql+json",
            },
          }),
        );
        expect(result[0]).toEqual({ query: "from body" });
        expect(result[1]).toBeUndefined();
      },
    );
  },
);
