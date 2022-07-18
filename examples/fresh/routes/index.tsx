/** @jsx h */
import { h } from "preact";
import { Handler, PageProps } from "$fresh/server.ts";
import graphqlHandler from "../graphql.ts";

const query = /* GraphQL */ `query {
  joke
}
`;

export const handler: Handler<{ joke: string }> = async (req, ctx) => {
  const url = new URL("/graphql", req.url);
  const gqlRequest = new Request(url, {
    method: "POST",
    body: JSON.stringify({ query }),
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      Accept: "application/graphql+json,application/json",
    },
  });

  const res = await graphqlHandler(gqlRequest);
  const result = await res.json();

  return ctx.render(result.data);
};

export default function Home(pageProps: PageProps<{ joke: string }>) {
  return <div>{pageProps.data.joke}</div>;
}
