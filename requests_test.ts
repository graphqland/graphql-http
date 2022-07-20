import { createRequest } from "./requests.ts";
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
