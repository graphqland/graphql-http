/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />
/// <reference lib="deno.unstable" />

import manifest from "./fresh.gen.ts";
import graphqlHandler from "./graphql.ts";
import { Manifest, start } from "$fresh/server.ts";

(manifest as Manifest).routes["./routes/graphql"] = {
  handler: graphqlHandler,
};

await start(manifest);
