import {
  createRequest,
  resolveGetRequest,
  resolvePostRequest,
  resolveRequest,
} from "./requests.ts";
import {
  BaseRequest,
  contentType,
  describe,
  expect,
  HttpError,
  it,
  queryString,
} from "./dev_deps.ts";

const describeCreateRequestTests = describe("createRequest");

it(
  describeCreateRequestTests,
  "should return Response object with method is POST, headers contain content-type, body has JSON data",
  async () => {
    const request = createRequest({
      url: new URL("http://localhost/"),
      query: `query { hello }`,
      method: "POST",
    });

    expect(request[1]).toBeUndefined();
    expect(
      request[0]?.method,
    ).toBe("POST");
    expect(
      request[0]?.url,
    ).toBe("http://localhost/");
    await expect(
      request[0]!.json(),
    ).resolves.toEqual({ query: `query { hello }` });
    expect(
      request[0]!.headers,
    ).toEqualIterable(
      new Headers({
        accept: "application/graphql+json, application/json",
        "content-type": "application/json; charset=UTF-8",
      }),
    );
  },
);

it(
  describeCreateRequestTests,
  "should return Response object when pass the variables and operationName",
  async () => {
    const request = createRequest({
      url: new URL("http://localhost/"),
      query: `query Greet(id: $id) { hello(id: $id) }`,
      method: "POST",
    }, {
      variables: {
        "id": "test",
      },
      operationName: "Greet",
    });

    expect(request[1]).toBeUndefined();
    await expect(
      request[0]!.json(),
    ).resolves.toEqual({
      query: `query Greet(id: $id) { hello(id: $id) }`,
      variables: { id: "test" },
      operationName: "Greet",
    });
  },
);

it(
  describeCreateRequestTests,
  "should return Response object what url is with query string without variable and operationName",
  () => {
    const request = createRequest({
      url: new URL("http://localhost/"),
      query: `query { hello }`,
      method: "GET",
    });

    expect(request[0]!.url).toBe(
      "http://localhost/?query=query+%7B+hello+%7D",
    );
  },
);

it(
  describeCreateRequestTests,
  "should return Response object what url is with query string when pass GET method",
  async () => {
    const request = createRequest({
      url: new URL("http://localhost/"),
      query: `query { hello }`,
      method: "GET",
    }, {
      variables: {
        "id": "test",
      },
      operationName: "Greet",
    });

    expect(request[1]).toBeUndefined();
    expect(request[0]?.method).toBe("GET");
    expect(request[0]!.headers).toEqualIterable(
      new Headers({ accept: "application/graphql+json, application/json" }),
    );
    expect(request[0]!.url).toBe(
      "http://localhost/?query=query+%7B+hello+%7D&variables=%7B%22id%22%3A%22test%22%7D&operationName=Greet",
    );
    await expect(
      request[0]!.text(),
    ).resolves.toEqual("");
  },
);

// it(
//   describeCreateRequestTests,
//   "should return Response what include custom header when pass request init",
//   () => {
//     const request = createRequest(
//       {
//         url: new URL("http://localhost/"),
//         query: `query { hello }`,
//         method: "GET",
//       },
//       undefined,
//       {
//         headers: {
//           "x-test": "test",
//         },
//       },
//     );

//     expect(request[1]).toBeUndefined();
//     expect(request[0]!.headers).toEqualIterable(
//       new Headers({
//         accept: "application/graphql+json, application/json",
//         "x-test": "test",
//       }),
//     );
//   },
// );

// it(
//   describeCreateRequestTests,
//   "should return Response what include custom merged header that when pass request init",
//   () => {
//     const request = createRequest(
//       {
//         url: new URL("http://localhost/"),
//         query: `query { hello }`,
//         method: "GET",
//       },
//       undefined,
//       {
//         headers: {
//           "accept": "text/html",
//           "x-test": "test",
//         },
//       },
//     );

//     expect(request[1]).toBeUndefined();
//     expect(request[0]!.headers).toEqualIterable(
//       new Headers({
//         accept: "text/html, application/graphql+json, application/json",
//         "x-test": "test",
//       }),
//     );
//   },
// );

it(
  describeCreateRequestTests,
  "should return error when url is invalid",
  () => {
    const request = createRequest({
      url: "",
      query: `query { hello }`,
      method: "GET",
    });

    expect(request[0]).toBeUndefined();
    expect(request[1]).toError(TypeError, "Invalid URL");
  },
);

const describeGetTests = describe("resolveGetRequest");
const BASE_URL = "https://test.test";

it(
  describe("resolveRequest"),
  "return HttpError when The HTTP method is not GET or not POST",
  async () => {
    await Promise.all(
      ["OPTION", "HEAD", "PUT", "DELETE", "PATCH"].map(
        async (method) => {
          const [, err] = await resolveRequest(
            new BaseRequest(BASE_URL, {
              method,
            }),
          );
          expect(err).toError(
            HttpError,
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
    const result = resolveGetRequest(
      new Request(BASE_URL, {
        headers: {
          accept: contentType("txt"),
        },
      }),
    );
    expect(result[0]).toBeUndefined();
    expect(result[1]).toError(
      HttpError,
      `The header is invalid. "Accept" must include "application/graphql+json" or "application/json"`,
    );
  },
);

it(
  describeGetTests,
  `should return data when header of "Accept" contain "application/json"`,
  () => {
    const result = resolveGetRequest(
      new Request(queryString(BASE_URL, { query: `query` }), {
        headers: {
          Accept: `application/json`,
        },
      }),
    );
    expect(result[1]).toBeUndefined();
    expect(result[0]).toEqual({
      query: "query",
      variables: null,
      operationName: null,
      extensions: null,
    });
  },
);

it(
  describeGetTests,
  `should return data when header of "Accept" contain "application/graphql+json"`,
  () => {
    const result = resolveGetRequest(
      new Request(queryString(BASE_URL, { query: `query` }), {
        headers: {
          Accept: `application/graphql+json`,
        },
      }),
    );
    expect(result[1]).toBeUndefined();
    expect(result[0]).toEqual({
      query: "query",
      variables: null,
      operationName: null,
      extensions: null,
    });
  },
);

it(
  describeGetTests,
  `should return error when query string of "query" is not exists`,
  () => {
    const result = resolveGetRequest(new BaseRequest(BASE_URL));
    expect(result[0]).toBeUndefined();
    expect(result[1]).toError(
      HttpError,
      `The parameter is required. "query"`,
    );
  },
);

it(
  describeGetTests,
  `should return error when query string of "variables" is invalid JSON`,
  () => {
    const url = new URL("?query=query&variables=test", BASE_URL);
    const result = resolveGetRequest(new BaseRequest(url.toString()));
    expect(result[0]).toBeUndefined();
    expect(result[1]).toError(
      HttpError,
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
    const result = resolveGetRequest(new BaseRequest(url.toString()));
    expect(result[0]).toEqual({
      query: `query`,
      variables: {
        test: "test",
      },
      operationName: "query",
      extensions: null,
    });
    expect(result[1]).toBeUndefined();
  },
);

const describePostTests = describe("resolvePostRequest");

it(
  describePostTests,
  `should return error when "Content-Type" header is missing`,
  async () => {
    const result = await resolvePostRequest(
      new BaseRequest(BASE_URL, {
        method: "POST",
      }),
    );

    expect(result[0]).toBeUndefined();
    expect(result[1]).toError(
      HttpError,
      `The header is required. "Content-Type"`,
    );
  },
);

it(
  describePostTests,
  `should return error when "Content-Type" header is unknown`,
  async () => {
    const result = await resolvePostRequest(
      new BaseRequest(BASE_URL, {
        method: "POST",
        headers: {
          "content-type": "plain/txt",
        },
      }),
    );

    expect(result[0]).toBeUndefined();
    expect(result[1]).toError(
      HttpError,
      'The header is invalid. "Content-Type" must be "application/json" or "application/graphql+json"',
    );
  },
);

it(describePostTests, `application/json`, async (t) => {
  await t.step(
    `should return error when header of "Accept" does not contain "application/graphql" or "application/json"`,
    async () => {
      const result = await resolvePostRequest(
        new Request(BASE_URL, {
          method: "POST",
          headers: {
            accept: contentType("txt"),
          },
        }),
      );
      expect(result[0]).toBeUndefined();
      expect(result[1]).toError(
        HttpError,
        `The header is invalid. "Accept" must include "application/graphql+json" or "application/json"`,
      );
    },
  );

  await t.step(
    `should return error when header of "Content-Type" is not exists`,
    async () => {
      const result = await resolvePostRequest(
        new BaseRequest(BASE_URL, {
          method: "POST",
        }),
      );
      expect(result[0]).toBeUndefined();
      expect(result[1]).toError(
        HttpError,
        `The header is required. "Content-Type"`,
      );
    },
  );

  await t.step(
    `should return error when header of "Content-Type" does not contain "application/graphql+json" or "application/json"`,
    async () => {
      const result = await resolvePostRequest(
        new BaseRequest(BASE_URL, {
          method: "POST",
          headers: {
            "content-type": contentType("txt"),
          },
        }),
      );
      expect(result[0]).toBeUndefined();
      expect(result[1]).toError(
        HttpError,
        `The header is invalid. "Content-Type" must be "application/json" or "application/graphql+json"`,
      );
    },
  );

  await t.step(
    `should return error when header of "Content-Type" charset is not "UTF-8"`,
    async () => {
      const result = await resolvePostRequest(
        new BaseRequest(BASE_URL, {
          method: "POST",
          headers: {
            "content-type": "application/graphql+json; charset=utf-16",
          },
        }),
      );
      expect(result[0]).toBeUndefined();
      expect(result[1]).toError(
        HttpError,
        `The header is invalid. Supported media type charset is "UTF-8".`,
      );
    },
  );

  await t.step(
    "should return error when message body is invalid JSON format",
    async () => {
      const result = await resolvePostRequest(
        new BaseRequest(BASE_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
        }),
      );
      expect(result[0]).toBeUndefined();
      expect(result[1]).toError(
        HttpError,
        `The message body is invalid. Invalid JSON format.`,
      );
    },
  );
  await t.step(
    "should return error when message body is not JSON object format",
    async () => {
      const result = await resolvePostRequest(
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
        HttpError,
        `The message body is invalid. Must be JSON object format.`,
      );
    },
  );
  await t.step(
    "should return error when query parameter from message body or query string is not exists",
    async () => {
      const result = await resolvePostRequest(
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
        HttpError,
        `The parameter is required. "query"`,
      );
    },
  );
  await t.step(
    "should return error when query parameter from message body is not string format",
    async () => {
      const result = await resolvePostRequest(
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
        HttpError,
        `The parameter is invalid. "query" must be string.`,
      );
    },
  );
  await t.step(
    "should return data when parameter of query string is exists",
    async () => {
      const url = new URL(`?query=test`, BASE_URL);
      const result = await resolvePostRequest(
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
        variables: null,
        extensions: null,
      });
      expect(result[1]).toBeUndefined();
    },
  );
  await t.step(
    `should return data what "query" is from body when message body of "query" and query string of "query" are exist`,
    async () => {
      const url = new URL(`?query=from-query-string`, BASE_URL);
      const result = await resolvePostRequest(
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
        variables: null,
        extensions: null,
      });
      expect(result[1]).toBeUndefined();
    },
  );
  await t.step(
    `should return data when "Content-Type" is application/json; charset=utf-8`,
    async () => {
      const result = await resolvePostRequest(
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
        variables: null,
        extensions: null,
      });
      expect(result[1]).toBeUndefined();
    },
  );
  await t.step(
    `should return error when "variables" is not JSON object format`,
    async () => {
      const result = await resolvePostRequest(
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
        HttpError,
        'The parameter is invalid. "variables" must be JSON object format',
      );
    },
  );
  await t.step(
    `should return data when "variables" is null`,
    async () => {
      const result = await resolvePostRequest(
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
        variables: null,
        extensions: null,
      });
      expect(result[1]).toBeUndefined();
    },
  );
  await t.step(
    `should return data when "variables" is JSON object format`,
    async () => {
      const result = await resolvePostRequest(
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
        variables: { abc: [] },
        extensions: null,
      });
      expect(result[1]).toBeUndefined();
    },
  );
  await t.step(
    `should return error when "operationName" is not string or not null`,
    async () => {
      const result = await resolvePostRequest(
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
        HttpError,
        'The parameter is invalid. "operationName" must be string or null.',
      );
    },
  );
  await t.step(
    `should return data when "operationName" is string`,
    async () => {
      const result = await resolvePostRequest(
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
        variables: null,
        extensions: null,
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
      "should return error when the message body is empty",
      async () => {
        const result = await resolvePostRequest(
          new BaseRequest(BASE_URL, {
            method: "POST",
            headers: {
              "content-type": "application/graphql+json",
            },
          }),
        );
        expect(result[0]).toBeUndefined();
        expect(result[1]).toError(
          HttpError,
          `The message body is required. "GraphQL query"`,
        );
      },
    );
    await t.step(
      `should return data when the message body is exists`,
      async () => {
        const result = await resolvePostRequest(
          new BaseRequest(BASE_URL, {
            body: "test",
            method: "POST",
            headers: {
              "content-type": "application/graphql+json",
            },
          }),
        );
        expect(result[0]).toEqual({
          query: "test",
          operationName: null,
          variables: null,
          extensions: null,
        });
        expect(result[1]).toBeUndefined();
      },
    );
    await t.step(
      `should return data when the message body is exists and content-type with charset`,
      async () => {
        const result = await resolvePostRequest(
          new BaseRequest(BASE_URL, {
            body: "test",
            method: "POST",
            headers: {
              "content-type": "application/graphql+json;charset=utf-8",
            },
          }),
        );
        expect(result[0]).toEqual({
          query: "test",
          operationName: null,
          variables: null,
          extensions: null,
        });
        expect(result[1]).toBeUndefined();
      },
    );

    await t.step(
      `should return data when the query string of "query" is exists`,
      async () => {
        const url = new URL("?query=test", BASE_URL);
        const result = await resolvePostRequest(
          new BaseRequest(url.toString(), {
            method: "POST",
            headers: {
              "content-type": "application/graphql+json",
            },
          }),
        );
        expect(result[0]).toEqual({
          query: "test",
          operationName: null,
          variables: null,
          extensions: null,
        });
        expect(result[1]).toBeUndefined();
      },
    );
    await t.step(
      `should return message body data when message body and query string of "query" is exists`,
      async () => {
        const url = new URL("?query=from-query", BASE_URL);
        const result = await resolvePostRequest(
          new BaseRequest(url.toString(), {
            body: "from body",
            method: "POST",
            headers: {
              "content-type": "application/graphql+json",
            },
          }),
        );
        expect(result[0]).toEqual({
          query: "from body",
          operationName: null,
          variables: null,
          extensions: null,
        });
        expect(result[1]).toBeUndefined();
      },
    );
  },
);
