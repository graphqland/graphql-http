# graphql-http

[![deno land](http://img.shields.io/badge/available%20on-deno.land/x-lightgrey.svg?logo=deno&labelColor=black&color=black)](https://deno.land/x/graphql_http)
[![deno doc](https://img.shields.io/badge/deno-doc-black)](https://doc.deno.land/https/deno.land/x/graphql_http/mod.ts)
[![codecov](https://codecov.io/gh/TomokiMiyauci/graphql-http/branch/main/graph/badge.svg?token=0Dq5iqtnjw)](https://codecov.io/gh/TomokiMiyauci/graphql-http)

GraphQL request handler compliant with GraphQL-over-HTTP specification

## Features

- [GraphQL-over-HTTP](https://graphql.github.io/graphql-over-http/)
  specification compliant
- `application/graphql-response+json` support
- Universal

## Example

A simple example of creating a GraphQL server and GraphQL client.

[std/http](https://deno.land/std/http) +
[graphql.js](https://github.com/graphql/graphql-js)

server:

```ts
import {
  createHandler,
} from "https://deno.land/x/graphql_http@$VERSION/mod.ts";
import { serve } from "https://deno.land/std@$VERSION/http/mod.ts";
import { buildSchema } from "https://esm.sh/graphql@$VERSION";

const schema = buildSchema(`type Query {
    greet: String!
  }`);
const handler = createHandler(schema, {
  rootValue: {
    greet: "hello world!",
  },
});

serve(handler);
```

It is recommended to use
[graphql-request](https://github.com/graphqland/graphql-request/) as the GraphQL
client.

client:

```ts
import { gql, gqlFetch } from "https://deno.land/x/gql_request@$VERSION/mod.ts";

const document = gql`query { greet }`;
const { data, errors, extensions } = await gqlFetch("<ENDPOINT>", document);
```

## Spec

This project is implemented in accordance with
[GraphQL-over-HTTP](https://graphql.github.io/graphql-over-http/) specification.

We are actively implementing
[IETF RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119) `SHOULD` and
`RECOMMENDED`.

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
| 405    | When a `mutation` or `subscription` operation is requested on GET request.                        |
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

If Content-Type is `application/graphql-response+json`, it is possible to
respond with a status code other than `200` depending on the result of the
GraphQL Request.

If the GraphQL request is invalid (e.g. it is malformed, or does not pass
validation) then the response with 400 status code.

#### Field errors

Field errors are defined at
[[GraphQL Spec 7.Response] - Field errors](https://spec.graphql.org/draft/#sec-Errors.Field-errors).

Even if a Field error occurs, it will always be a `200` status code.

#### Unknown errors

If an error other than the above occurs on the server side, a `500` status code
will be responded.

#### Upgrade to application/graphql-response+json

As you may have noticed, `application/graphql-response+json` represents a more
accurate semantics response.

If you want `application/graphql-response+json` content, you must put
`application/graphql-response+json` as a higher priority than `application/json`
in the `Accept` header.

Example: `Accept: application/graphql-response+json,application/json`.

## application/graphql-response+json vs application/json

Response status

|                                | application/graphql+json | application/json |
| ------------------------------ | ------------------------ | ---------------- |
| HTTP Request error             | 4XX(eg.406, 415)         | 4XX              |
| GraphQL request error          | 400                      | 200              |
| GraphQL field error            | 200                      | 200              |
| Unknown(Internal server) error | 5XX                      | 5XX              |

## Where the subscription?

Unfortunately, there is currently no specification for `subscription` and it is
not implemented.

You can refer to other projects' implementations using
[SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
or [Websocket](https://developer.mozilla.org/en-US/docs/Web/API/Websockets_API).

- [graphql-ws](https://github.com/enisdenjo/graphql-ws)
- [subscriptions-transport-ws](https://github.com/apollographql/subscriptions-transport-ws)

## Recipes

- [std/http](./examples/std_http/README.md)
- [fresh](./examples/fresh/README.md)

## License

Copyright © 2022-present [graphqland](https://github.com/graphqland).

Released under the [MIT](./LICENSE) license
