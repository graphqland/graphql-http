import { BuildOptions } from "https://deno.land/x/dnt@0.28.0/mod.ts";

export const makeOptions = (version: string): BuildOptions => ({
  test: false,
  shims: {
    deno: true,
  },
  compilerOptions: {
    lib: ["dom", "es2022"],
  },
  typeCheck: false,
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  package: {
    name: "gql-http",
    version,
    description:
      "GraphQL on HTTP middleware with built-in validations and GraphQL playground",
    keywords: [
      "graphql",
      "http",
      "middleware",
      "graphql-playground",
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
