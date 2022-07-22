import {
  createResponse,
  isValidContentType,
  resolveResponse,
} from "./responses.ts";
import {
  buildSchema,
  contentType,
  describe,
  expect,
  it,
  Status,
} from "./dev_deps.ts";

const schema = buildSchema(`type Query {
  hello: String!
}
`);

function assertHeaderAppJson(headers: Headers): void {
  expect(headers).toEqualIterable(
    new Headers({
      "content-type": "application/json; charset=UTF-8",
    }),
  );
}

function assertHeaderAppGraphqlJson(headers: Headers): void {
  expect(headers).toEqualIterable(
    new Headers({
      "content-type": "application/graphql+json; charset=UTF-8",
    }),
  );
}

function assertStatusOK(status: number): asserts status is 200 {
  expect(status).toBe(Status.OK);
}

function assertStatusBadRequest(status: number): asserts status is 200 {
  expect(status).toBe(Status.BadRequest);
}

describe("createResponse", () => {
  describe("application/json", () => {
    const mimeType = "application/json";
    it("should return status 200 when parse error has occurred", async () => {
      const res = createResponse({
        source: ``,
        method: "POST",
        schema,
      }, {
        mimeType,
      });

      assertStatusOK(res.status);
      assertHeaderAppJson(res.headers);
      await expect(res.json()).resolves.toEqual({
        errors: [{
          message: "Syntax Error: Unexpected <EOF>.",
          locations: [{ "line": 1, "column": 1 }],
        }],
      });
    });
    it("should return status 200 when validate error has occurred", async () => {
      const res = createResponse({
        source: `query { fail }`,
        method: "POST",
        schema,
      }, {
        mimeType,
      });

      assertStatusOK(res.status);
      assertHeaderAppJson(res.headers);
      await expect(res.json()).resolves.toEqual({
        errors: [
          {
            message: 'Cannot query field "fail" on type "Query".',
            locations: [{ "line": 1, "column": 9 }],
          },
        ],
      });
    });
    it("should return status 200 when execution error has occurred", async () => {
      const res = createResponse({
        source: `query { hello }`,
        method: "POST",
        schema,
      }, {
        mimeType,
      });

      assertStatusOK(res.status);
      assertHeaderAppJson(res.headers);
      await expect(res.json()).resolves.toEqual({
        errors: [
          {
            message: "Cannot return null for non-nullable field Query.hello.",
            locations: [{ "line": 1, "column": 9 }],
            path: ["hello"],
          },
        ],
        data: null,
      });
    });
    it("should return status 200 when execution is complete", async () => {
      const res = createResponse({
        source: `query { hello }`,
        method: "POST",
        schema,
      }, {
        rootValue: {
          hello: "world",
        },
        mimeType,
      });

      assertStatusOK(res.status);
      assertHeaderAppJson(res.headers);
      await expect(res.json()).resolves.toEqual({
        data: { hello: "world" },
      });
    });

    it("should return status 405 when method is GET and operation type is mutation", async () => {
      const res = createResponse({
        source: `mutation { hello }`,
        method: "GET",
        schema,
      }, {
        mimeType,
      });

      expect(res.status).toBe(Status.MethodNotAllowed);
      expect(res.headers).toEqualIterable(
        new Headers({
          "content-type": contentType(".json"),
          allow: "POST",
        }),
      );
      await expect(res.json()).resolves.toEqual({
        errors: [
          {
            message:
              "Invalid GraphQL operation. Can only perform a mutation operation from a POST request.",
          },
        ],
      });
    });
    it("should return status 405 when method is GET and operation type is subscription", async () => {
      const res = createResponse({
        source: `subscription { hello }`,
        method: "GET",
        schema,
      }, {
        mimeType,
      });

      expect(res.status).toBe(Status.MethodNotAllowed);
      expect(res.headers).toEqualIterable(
        new Headers({
          "content-type": contentType(".json"),
          allow: "POST",
        }),
      );
      await expect(res.json()).resolves.toEqual({
        errors: [
          {
            message:
              "Invalid GraphQL operation. Can only perform a subscription operation from a POST request.",
          },
        ],
      });
    });
  });

  describe("application/graphql+json", () => {
    it("should return status 400 when parse error has occurred", async () => {
      const res = createResponse({
        source: ``,
        method: "POST",
        schema,
      });

      assertStatusBadRequest(res.status);
      assertHeaderAppGraphqlJson(res.headers);
      await expect(res.json()).resolves.toEqual({
        errors: [{
          message: "Syntax Error: Unexpected <EOF>.",
          locations: [{ "line": 1, "column": 1 }],
        }],
      });
    });
    it("should return status 400 when validate error has occurred", async () => {
      const res = createResponse({
        source: `query { fail }`,
        method: "POST",
        schema,
      });

      assertStatusBadRequest(res.status);
      assertHeaderAppGraphqlJson(res.headers);
      await expect(res.json()).resolves.toEqual({
        errors: [
          {
            message: 'Cannot query field "fail" on type "Query".',
            locations: [{ "line": 1, "column": 9 }],
          },
        ],
      });
    });
    it("should return status 200 when execution error has occurred", async () => {
      const res = createResponse({
        source: `query { hello }`,
        method: "POST",
        schema,
      });

      assertStatusOK(res.status);
      assertHeaderAppGraphqlJson(res.headers);
      await expect(res.json()).resolves.toEqual({
        errors: [
          {
            message: "Cannot return null for non-nullable field Query.hello.",
            locations: [{ "line": 1, "column": 9 }],
            path: ["hello"],
          },
        ],
        data: null,
      });
    });
    it("should return status 200 when execution is complete", async () => {
      const res = createResponse({
        source: `query { hello }`,
        method: "POST",
        schema,
      }, {
        rootValue: {
          hello: "world",
        },
      });

      assertStatusOK(res.status);
      assertHeaderAppGraphqlJson(res.headers);
      await expect(res.json()).resolves.toEqual({
        data: { hello: "world" },
      });
    });
  });
});

describe("isValidContentType", () => {
  it("should pass application/json and application/graphql+json", () => {
    expect(isValidContentType("application/graphql+json")).toBeTruthy();
    expect(isValidContentType("application/json")).toBeTruthy();
    expect(isValidContentType("application/json; charset=UTF-8")).toBeTruthy();
    expect(isValidContentType("application/json;charset=UTF-8")).toBeTruthy();
    expect(isValidContentType("application/graphql+json; charset=UTF-8"));
    expect(isValidContentType("application/graphql+json;charset=UTF-8"))
      .toBeTruthy();
  });

  it("should not pass", () => {
    expect(isValidContentType("text/html")).toBeFalsy();
    expect(isValidContentType("text/html; charset=UTF-8")).toBeFalsy();
    expect(isValidContentType("*/*")).toBeFalsy();
  });
});

const describeResolveRequestTests = describe("resolveRequest");

it(
  describeResolveRequestTests,
  `should throw error when header of "Content-Type" is not exists`,
  async () => {
    const res = new Response();

    await expect(resolveResponse(res)).rejects.toError(
      Error,
      `"Content-Type" header is required`,
    );
  },
);

it(
  describeResolveRequestTests,
  `should throw error when header of "Content-Type" is not valid`,
  async () => {
    const res = new Response("");
    await expect(resolveResponse(res)).rejects.toError(
      Error,
      `Valid "Content-Type" is application/graphql+json or application/json`,
    );
  },
);

it(
  describeResolveRequestTests,
  `should throw error when body is not JSON format`,
  async () => {
    const res = new Response("", {
      headers: {
        "Content-Type": "application/json",
      },
    });
    await expect(resolveResponse(res)).rejects.toError(
      SyntaxError,
    );
  },
);

it(
  describeResolveRequestTests,
  `should throw error when ok is not true and body is not graphql response`,
  async () => {
    const res = new Response(JSON.stringify({ errors: [] }), {
      headers: {
        "Content-Type": "application/json",
      },
    });

    Object.defineProperty(res, "ok", {
      value: false,
    });

    await expect(resolveResponse(res)).rejects.toError(
      AggregateError,
      "GraphQL request error has occurred",
    );
  },
);

it(
  describeResolveRequestTests,
  `should throw error when ok is not true and body is not graphql response`,
  async () => {
    const res = new Response("{}", {
      headers: {
        "Content-Type": "application/json",
      },
    });

    Object.defineProperty(res, "ok", {
      value: false,
    });

    await expect(resolveResponse(res)).rejects.toError(
      Error,
      "Unknown error has occurred",
    );
  },
);

it(
  describeResolveRequestTests,
  `should return graphql response`,
  async () => {
    const res = new Response(
      JSON.stringify({
        data: {},
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    await expect(resolveResponse(res)).resolves.toEqual({
      data: {},
    });
  },
);
