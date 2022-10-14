import { BuildOptions } from "https://deno.land/x/dnt@0.31.0/mod.ts";

export const makeOptions = (version: string): BuildOptions => ({
  test: false,
  shims: {},
  typeCheck: true,
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  package: {
    name: "gql-http",
    version,
    description:
      "GraphQL request handler compliant with GraphQL-over-HTTP specification",
    keywords: [
      "graphql",
      "http",
    ],
    license: "MIT",
    homepage: "https://github.com/TomokiMiyauci/graphql-http",
    repository: {
      type: "git",
      url: "git+https://github.com/TomokiMiyauci/graphql-http.git",
    },
    bugs: {
      url: "https://github.com/TomokiMiyauci/graphql-http/issues",
    },
    sideEffects: false,
    type: "module",
  },
  packageManager: "pnpm",
});
