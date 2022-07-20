import { isValidContentType, resolveResponse } from "./responses.ts";
import { describe, expect, it } from "./dev_deps.ts";

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
