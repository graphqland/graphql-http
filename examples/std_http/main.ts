import { graphqlHttp } from "https://deno.land/x/graphql_http@$VERSION/mod.ts";
import {
  Handler,
  serve,
  Status,
} from "https://deno.land/std@$VERSION/http/mod.ts";
import { buildSchema } from "https://esm.sh/graphql@$VERSION";

const graphqlResponse = graphqlHttp({
  schema: buildSchema(`type Query {
    hello: String!
  }`),
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

serve(handler, { port: 8080 });
