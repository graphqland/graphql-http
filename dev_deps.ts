export * from "https://deno.land/std@0.148.0/testing/asserts.ts";
export * from "https://deno.land/std@0.148.0/testing/bdd.ts";
import { defineExpect } from "https://deno.land/x/unitest@v1.0.0-beta.82/expect/mod.ts";
import { jestMatcherMap } from "https://deno.land/x/unitest@v1.0.0-beta.82/matcher/mod.ts";

export const expect = defineExpect({
  matcherMap: {
    ...jestMatcherMap,
    toError: (
      actual: unknown,
      // deno-lint-ignore ban-types
      error: Function,
      message?: string,
    ) => {
      if (!(actual instanceof Error)) {
        return {
          pass: false,
          expected: "Error Object",
        };
      }

      if (!(actual instanceof error)) {
        return {
          pass: false,
          expected: `${error.name} Object`,
        };
      }

      if (message) {
        return {
          pass: actual.message === message,
          expected: message,
          resultActual: actual.message,
        };
      }

      return {
        pass: true,
        expected: error,
      };
    },
  },
});
