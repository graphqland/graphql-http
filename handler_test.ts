import {
  BaseRequest,
  buildSchema,
  contentType,
  describe,
  expect,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  it,
  queryString,
  Status,
} from "./dev_deps.ts";
import createHandler from "./handler.ts";
import { MIME_TYPE_APPLICATION_GRAPHQL_JSON } from "./constants.ts";

function assertHeaderAppGraphqlJson(headers: Headers): void {
  expect(headers).toEqualIterable(
    new Headers({
      "content-type": "application/graphql+json; charset=UTF-8",
    }),
  );
}

function assertHeaderAppJson(headers: Headers): void {
  expect(headers).toEqualIterable(
    new Headers({
      "content-type": "application/json; charset=UTF-8",
    }),
  );
}

const QueryRootType = new GraphQLObjectType({
  name: "QueryRoot",
  fields: {
    test: {
      type: GraphQLString,
      args: {
        who: { type: GraphQLString },
      },
      resolve: (_root, args: { who?: string }) =>
        "Hello " + (args.who ?? "World"),
    },
    thrower: {
      type: GraphQLString,
      resolve() {
        throw new Error("Throws!");
      },
    },
  },
});

/**
 * schema {
 *   query: QueryRoot
 *   mutation: MutationRoot
 * }
 *
 * type QueryRoot {
 *   test(who: String): String
 *   thrower: String
 * }
 *
 * type MutationRoot {
 *   writeTest: QueryRoot
 * }
 */
const schema = new GraphQLSchema({
  query: QueryRootType,
  mutation: new GraphQLObjectType({
    name: "MutationRoot",
    fields: {
      writeTest: {
        type: QueryRootType,
        resolve: () => ({}),
      },
    },
  }),
});

const handler = createHandler(schema);

const BASE_URL = "https://test.test";

const describeTests = describe("createHandler");

it("should throw error when validation of schema is fail", () => {
  expect(() => createHandler(buildSchema(`type Test { hello: String }`)))
    .toThrow(
      "Schema validation error",
    );
});

it("should error when HTTP request method is unsupported", async () => {
  const res = await handler(
    new Request(queryString(BASE_URL, {}), {
      headers: {
        "accept": "plain/text",
      },
      method: "OPTIONS",
    }),
  );

  expect(res.status).toBe(Status.MethodNotAllowed);
  expect(res.headers).toEqualIterable(
    new Headers({
      allow: "GET,POST",
      "content-type": contentType(".json"),
    }),
  );
  await expect(res.json()).resolves.toEqual({
    errors: [
      {
        message:
          "Invalid HTTP method. GraphQL only supports GET and POST requests.",
      },
    ],
  });
});

describe("HTTP method is GET", () => {
  it(
    describeTests,
    `should return 406 when "Accept" header does not include application/graphql+json or application/json`,
    async () => {
      const res = await handler(
        new Request(queryString(BASE_URL, {}), {
          headers: {
            "accept": "plain/text",
          },
        }),
      );

      expect(res.status).toBe(Status.NotAcceptable);
      assertHeaderAppJson(res.headers);
      await expect(res.json()).resolves.toEqual({
        errors: [{
          message:
            `The header is invalid. "Accept" must include "application/graphql+json" or "application/json"`,
        }],
      });
    },
  );

  it(
    describeTests,
    "should return 400 when query string is not exists",
    async () => {
      const res = await handler(
        new BaseRequest(new URL(BASE_URL).toString()),
      );

      expect(res.status).toBe(Status.BadRequest);
      assertHeaderAppGraphqlJson(res.headers);
      await expect(res.json()).resolves.toEqual({
        errors: [{ message: `The parameter is required. "query"` }],
      });
    },
  );

  it(
    describeTests,
    `should return 405 when query is not "query"`,
    async () => {
      const res = await handler(
        new BaseRequest(queryString(BASE_URL, {
          query: "mutation { hello }",
        })),
      );

      expect(res.status).toBe(Status.MethodNotAllowed);
      expect(res.headers).toEqualIterable(
        new Headers({
          "content-type": MIME_TYPE_APPLICATION_GRAPHQL_JSON,
          allow: "POST",
        }),
      );
      await expect(res.json()).resolves.toEqual({
        errors: [{
          message:
            `Invalid GraphQL operation. Can only perform a mutation operation from a POST request.`,
        }],
      });
    },
  );

  it(
    describeTests,
    `should return 405 when operation is not "query"`,
    async () => {
      const res = await handler(
        new BaseRequest(queryString(BASE_URL, {
          query: `
          query { hello }
          mutation TestMutation { hello }
          `,
          operationName: "TestMutation",
        })),
      );

      expect(res.status).toBe(Status.MethodNotAllowed);
      expect(res.headers).toEqualIterable(
        new Headers({
          "content-type": MIME_TYPE_APPLICATION_GRAPHQL_JSON,
          allow: "POST",
        }),
      );
      await expect(res.json()).resolves.toEqual({
        errors: [{
          message:
            `Invalid GraphQL operation. Can only perform a mutation operation from a POST request.`,
        }],
      });
    },
  );

  it("allows GET with query param", async () => {
    const url = new URL(
      `?query={test}`,
      BASE_URL,
    );
    const req = new BaseRequest(url.toString());
    const res = await handler(req);

    expect(res.status).toBe(Status.OK);
    assertHeaderAppGraphqlJson(res.headers);
    await expect(res.json()).resolves.toEqual({
      data: { test: "Hello World" },
    });
  });

  it("allows GET with variable values", async () => {
    const url = queryString(BASE_URL, {
      query: `query helloWho($who: String){ test(who: $who) }`,
      variables: `{"who":"Dolly"}`,
    });
    const req = new BaseRequest(url);
    const res = await handler(req);

    expect(res.status).toBe(Status.OK);
    assertHeaderAppGraphqlJson(res.headers);
    await expect(res.json()).resolves.toEqual({
      data: { test: "Hello Dolly" },
    });
  });

  it("allows GET with operation name", async () => {
    const url = queryString(BASE_URL, {
      query: `
        query helloYou { test(who: "You"), ...shared }
        query helloWorld { test(who: "World"), ...shared }
        query helloDolly { test(who: "Dolly"), ...shared }
        fragment shared on QueryRoot {
          shared: test(who: "Everyone")
        }
      `,
      operationName: "helloWorld",
    });

    const res = await handler(new BaseRequest(url));
    expect(res.status).toBe(Status.OK);
    await expect(res.json()).resolves.toEqual({
      data: {
        test: "Hello World",
        shared: "Hello Everyone",
      },
    });
  });

  it("Allows a mutation to exist within a GET", async () => {
    const url = queryString(BASE_URL, {
      operationName: "TestQuery",
      query: `
      mutation TestMutation { writeTest { test } }
      query TestQuery { test }
    `,
    });

    const res = await handler(new BaseRequest(url));

    expect(res.status).toEqual(Status.OK);
    await expect(res.json()).resolves.toEqual({
      data: {
        test: "Hello World",
      },
    });
  });
});

describe("HTTP method is POST", () => {
  it(
    describeTests,
    `should return 406 when "Accept" header does not include application/graphql+json or application/json`,
    async () => {
      const res = await handler(
        new Request(queryString(BASE_URL, {}), {
          headers: {
            "accept": "plain/text",
          },
          method: "POST",
        }),
      );

      expect(res.status).toBe(Status.NotAcceptable);
      expect(res.headers).toEqualIterable(
        new Headers({
          "content-type": contentType(".json"),
        }),
      );
      await expect(res.json()).resolves.toEqual({
        errors: [{
          message:
            `The header is invalid. "Accept" must include "application/graphql+json" or "application/json"`,
        }],
      });
    },
  );

  it("Allows POST with JSON encoding", async () => {
    const req = new BaseRequest(BASE_URL, {
      body: JSON.stringify({ query: "{test}" }),
      method: "POST",
      headers: {
        "content-type": contentType(".json"),
      },
    });
    const res = await handler(req);

    expect(res.status).toBe(Status.OK);
    assertHeaderAppGraphqlJson(res.headers);
    expect(res.json()).resolves.toEqual({ data: { test: "Hello World" } });
  });

  it("Allows sending a mutation via POST", async () => {
    const req = new BaseRequest(BASE_URL, {
      body: JSON.stringify({
        query: "mutation TestMutation { writeTest { test } }",
      }),
      method: "POST",
      headers: {
        "content-type": contentType(".json"),
      },
    });
    const res = await handler(req);

    expect(res.status).toBe(Status.OK);
    assertHeaderAppGraphqlJson(res.headers);
    expect(res.json()).resolves.toEqual({
      data: { writeTest: { test: "Hello World" } },
    });
  });

  it(`return with errors when "Content-Type" is not exists`, async () => {
    const req = new BaseRequest(BASE_URL, {
      method: "POST",
    });
    const res = await handler(req);

    expect(res.status).toBe(Status.BadRequest);
    assertHeaderAppGraphqlJson(res.headers);
    expect(res.json()).resolves.toEqual({
      errors: [{ message: 'The header is required. "Content-Type"' }],
    });
  });

  it("return with errros when message body is invalid JSON format", async () => {
    const req = new BaseRequest(BASE_URL, {
      method: "POST",
      headers: {
        "content-type": contentType(".json"),
      },
    });
    const res = await handler(req);

    expect(res.status).toBe(Status.BadRequest);
    assertHeaderAppGraphqlJson(res.headers);
    expect(res.json()).resolves.toEqual({
      errors: [{
        message: "The message body is invalid. Invalid JSON format.",
      }],
    });
  });

  it("Allows POST with url encoding", async () => {
    const url = queryString(BASE_URL, {
      query: `{test}`,
    });
    const req = new BaseRequest(url, {
      body: JSON.stringify({}),
      method: "POST",
      headers: {
        "content-type": contentType(".json"),
      },
    });
    const res = await handler(req);

    expect(res.status).toBe(Status.OK);
    assertHeaderAppGraphqlJson(res.headers);
    expect(res.json()).resolves.toEqual({ data: { test: "Hello World" } });
  });

  it("should return 200 when body includes variables", async () => {
    const req = new BaseRequest(BASE_URL, {
      body: JSON.stringify({
        query: "query helloWho($who: String){ test(who: $who) }",
        variables: { who: "Dolly" },
      }),
      method: "POST",
      headers: {
        "content-type": contentType(".json"),
      },
    });

    const res = await handler(req);

    expect(res.status).toBe(Status.OK);
    assertHeaderAppGraphqlJson(res.headers);
    expect(res.json()).resolves.toEqual({ data: { test: "Hello Dolly" } });
  });
});
