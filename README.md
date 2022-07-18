# graphql-http

[![deno land](http://img.shields.io/badge/available%20on-deno.land/x-lightgrey.svg?logo=deno&labelColor=black&color=black)](https://deno.land/x/graphql_http)
[![deno doc](https://img.shields.io/badge/deno-doc-black)](https://doc.deno.land/https/deno.land/x/graphql_http/mod.ts)

GraphQL on HTTP middleware with built-in validations and GraphQL playground

## What

It provides GraphQL on HTTP middleware that can be embedded in any server.

Essentially, it takes a `Request` object and returns a `Response` object.

In the meantime, it performs HTTP request validation, processes GraphQL, and
response object with the appropriate status code and message.

There is also a built-in GraphQL Playground.

## Example

A simple example of creating a GraphQL server.

[std/http](https://deno.land/std/http) +
[grpahql.js](https://github.com/graphql/graphql-js)

```ts
import { graphqlHttp } from "https://deno.land/x/graphql_http@$VERSION/mod.ts";
import {
  Handler,
  serve,
  Status,
} from "https://deno.land/std@$VERSION/http/mod.ts";
import { buildSchema } from "https://esm.sh/graphql@$VERSION";

const graphqlResponse = graphqlHttp({
  schema: `type Query {
    hello: String!
  }`,
  rootValue: {
    hello: () => "world",
  },
  playground: true,
});

const handler: Handler = (req) => {
  const { pathname } = new URL(req.url);
  if (pathname === "/graphql") {
    return graphqlResponse(req);
  }

  return new Response("Not Found", {
    status: Status.NotFound,
  });
};

serve(handler);
```

## Spec

This project is implemented in accordance with
[GraphQL over HTTP Spec](https://graphql.github.io/graphql-over-http/).

### Request Parameters

A GraphQL-over-HTTP request is formed of the following parameters:

| Name          |      Required      | Description                                                                                                                |
| ------------- | :----------------: | -------------------------------------------------------------------------------------------------------------------------- |
| query         | :white_check_mark: | A Document containing GraphQL Operations and Fragments to execute. Must be a string.                                       |
| operationName |         -          | The name of the Operation in the Document to execute. <br>GET: If present, must be a string.                               |
| variables     |         -          | Values for any Variables defined by the Operation. <br> GET: If present, must be represented as a URL-encoded JSON string. |

### Response Status

The following responses may be returned.

| Status | Condition                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------- |
| 200    | If GraphQL is actually executed, even if it contains `Field errors`.                              |
| 400    | A required parameter does not exist. Illegal format of parameter.                                 |
| 405    | When a mutation operation is requested on GET request.                                            |
| 406    | The client `Accept` HTTP header does not contain at least one of the supported media types.       |
| 415    | The client `Content-type` HTTP header does not contain at least one of the supported media types. |
| 500    | If the server encounters an unexpected error.                                                     |

Below are the specific conditions under which each may occur. Errors are
classified into four major categories.

- HTTP Request errors
- (GraphQL) Request errors
- (GraphQL) Field errors
- Unknown errors

#### HTTP Request errors

HTTP Request errors are errors in the http protocol. This refers to errors that
can occur between HTTP and GraphQL, such as missing/incorrect values for
required parameters, missing/incorrect values for required headers, etc.

Since these are client-side errors, the appropriate `4XX` status is returned.

#### Request errors

Request errors are defined at
[[GraphQL Spec] 7.Response - Request errors](https://spec.graphql.org/draft/#sec-Errors.Request-errors).

Note here that the status code may be different depending on the Content-Type.

##### application/json

If Content-Type is `application/json`, all results of GraphQL Requests including
GraphQL validation will be treated as `200` status.

See the
[[GraphQL over HTTP 6.4.1] application/json#Note](https://graphql.github.io/graphql-over-http/draft/#note-a7d14)
for the reason for this.

##### application/graphql+json

If Content-Type is `application/graphql+json`, it is possible to respond with a
status code other than `200` depending on the result of the GraphQL Request.

If the GraphQL request is invalid (e.g. it is malformed, or does not pass
validation) then the response with 400 status code.

#### Field errors

Field errors are defined at
[[GraphQL Spec 7.Response] - Field errors](https://spec.graphql.org/draft/#sec-Errors.Field-errors).

Even if a Field error occurs, it will always be a `200` status code.

#### Unknown errors

If an error other than the above occurs on the server side, a `500` status code
will be responded.

#### Upgrade to application/graphql+json

As you may have noticed, `application/graphql+json` represents a more accurate
semantics response.

If you want `application/graphql+json` content, you must put
`application/graphql+json` as a higher priority than `application/json` in the
`Accept` header.

Example: `Accept: application/graphql+json,application/json`.

## Overwrite response

`grpahqlHttp` creates a response according to the GraphQL over HTTP
specification. You can customize this response.

Example of adding a header:

```ts
import { graphqlHttp } from "https://deno.land/x/graphql_http@$VERSION/mod.ts";
import { buildSchema } from "https://esm.sh/graphql@$VERSION";

const responser = graphqlHttp({
  response: (res, ctx) => {
    if (ctx.request.method === "GET") {
      res.headers.set("Cache-Control", "max-age=604800");
    }
    return res;
  },
  schema: buildSchema(`type Query {
    hello: String
  }`),
});
```

## License

Copyright © 2022-present [TomokiMiyauci](https://github.com/TomokiMiyauci).

Released under the [MIT](./LICENSE) license
