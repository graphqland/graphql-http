import usePlayground from "./playground.ts";
import createHandler from "../handler.ts";
import { describe, expect, it } from "../dev_deps.ts";
import { buildSchema, contentType, Status } from "../deps.ts";

describe("usePlayground", () => {
  it("should render graphql playground when method is GET and accept includes text/html", async () => {
    const handler = usePlayground(() => new Response());
    const req = new Request("http://localhost/test.com", {
      method: "GET",
      headers: {
        accept: "text/html",
      },
    });
    const res = await handler(req);
    const text = await res.text();
    expect(text.startsWith("\n  <!DOCTYPE html>")).toBeTruthy();
    expect(res.status).toBe(Status.OK);
    expect(res.headers).toEqualIterable(
      new Headers({
        "content-type": contentType("text/html"),
      }),
    );
  });

  it("should return next response when request is not to playground", async () => {
    const nextRes = new Response();
    const handler = usePlayground(() => nextRes);
    const req = new Request("http://localhost/test.com", {
      method: "POST",
      headers: {
        accept: "text/html",
      },
    });
    await expect(handler(req)).resolves.toEqual(nextRes);
  });

  it("should return graphql request result when the request is to graphql", async () => {
    let handler = createHandler(buildSchema(`type Query { hello: String }`));

    handler = usePlayground(handler);
    const req = new Request("http://localhost/test.com?query=query{hello}", {
      method: "GET",
    });

    const res = await handler(req);

    expect(res.status).toBe(Status.OK);
    expect(res.headers).toEqualIterable(
      new Headers({
        "content-type": "application/graphql+json; charset=UTF-8",
      }),
    );
  });

  it("should return graphql playground result when the request is to graphql playground", async () => {
    let handler = createHandler(buildSchema(`type Query { hello: String }`));

    handler = usePlayground(handler);
    const req = new Request("http://localhost/test.com", {
      method: "GET",
      headers: {
        accept: "text/html",
      },
    });

    const res = await handler(req);

    expect(res.status).toBe(Status.OK);
    expect(res.headers).toEqualIterable(
      new Headers({ "content-type": contentType("text/html") }),
    );
  });
});
