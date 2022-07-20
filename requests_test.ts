import {
  createRequest,
  isValidContentType,
  resolveResponse,
} from "./requests.ts";
import { describe, expect, it } from "./dev_deps.ts";

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
        "content-type": "application/json;charset=UTF-8",
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
  () => {
    const res = new Response();

    expect(resolveResponse(res)).rejects.toError(
      Error,
      `"Content-Type" header is required`,
    );
  },
);

it(
  describeResolveRequestTests,
  `should throw error when header of "Content-Type" is not valid`,
  () => {
    const res = new Response("");
    expect(resolveResponse(res)).rejects.toError(
      Error,
      `Valid "Content-Type" is application/graphql+json or application/json`,
    );
  },
);

it(
  describeResolveRequestTests,
  `should throw error when body is not JSON format`,
  () => {
    const res = new Response("", {
      headers: {
        "Content-Type": "application/json",
      },
    });
    expect(resolveResponse(res)).rejects.toError(
      SyntaxError,
    );
  },
);

it(
  describeResolveRequestTests,
  `should throw error when ok is not true and body is not graphql response`,
  () => {
    const res = new Response(JSON.stringify({ errors: [] }), {
      headers: {
        "Content-Type": "application/json",
      },
    });

    Object.defineProperty(res, "ok", {
      value: false,
    });

    expect(resolveResponse(res)).rejects.toError(
      AggregateError,
      "GraphQL request error has occurred",
    );
  },
);

it(
  describeResolveRequestTests,
  `should throw error when ok is not true and body is not graphql response`,
  () => {
    const res = new Response("{}", {
      headers: {
        "Content-Type": "application/json",
      },
    });

    Object.defineProperty(res, "ok", {
      value: false,
    });

    expect(resolveResponse(res)).rejects.toError(
      Error,
      "Unknown error has occurred",
    );
  },
);

it(
  describeResolveRequestTests,
  `should return graphql response`,
  () => {
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

    expect(resolveResponse(res)).resolves.toEqual({
      data: {},
    });
  },
);
