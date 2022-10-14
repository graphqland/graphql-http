import { assertEquals, buildSchema, describe, it } from "./dev_deps.ts";
import { createHandler } from "./handler.ts";

const schema = buildSchema(`type Query { hello: String }`);

describe("createHandler", () => {
  it("should return 200 when valid graphql request with GET", async () => {
    const handler = createHandler(schema);

    const response = await handler(
      new Request("http://localhost?query=query{hello}"),
    );

    assertEquals(response.status, 200);
    assertEquals(
      response.headers.get("content-type"),
      "application/graphql-response+json;charset=UTF-8",
    );
    assertEquals(await response.json(), { data: { hello: null } });
  });

  it("should return 200 when valid graphql request with POST", async () => {
    const handler = createHandler(schema);

    const response = await handler(
      new Request("http://localhost", {
        body: JSON.stringify({ query: `query { hello }` }),
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    assertEquals(response.status, 200);
    assertEquals(
      response.headers.get("content-type"),
      "application/graphql-response+json;charset=UTF-8",
    );
    assertEquals(await response.json(), { data: { hello: null } });
  });

  it("should return 200 when valid graphql request", async () => {
    const handler = createHandler(schema, {
      rootValue: {
        hello: "world",
      },
    });

    const response = await handler(
      new Request("http://localhost", {
        body: JSON.stringify({ query: `query { hello }` }),
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
      }),
    );

    assertEquals(response.status, 200);
    assertEquals(
      response.headers.get("content-type"),
      "application/json;charset=UTF-8",
    );
    assertEquals(await response.json(), { data: { hello: "world" } });
  });

  it("should return 400 when valid graphql request", async () => {
    const handler = createHandler(schema);

    const response = await handler(
      new Request("http://localhost"),
    );

    assertEquals(response.status, 400);
  });
});
