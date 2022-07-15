export * from "https://deno.land/std@0.148.0/testing/asserts.ts";
export * from "https://deno.land/std@0.148.0/testing/bdd.ts";
export * from "https://deno.land/std@0.148.0/media_types/mod.ts";
export * from "https://deno.land/std@0.148.0/http/mod.ts";
import { defineExpect } from "https://deno.land/x/unitest@v1.0.0-beta.82/expect/mod.ts";
import { jestMatcherMap } from "https://deno.land/x/unitest@v1.0.0-beta.82/matcher/mod.ts";
import { jestModifierMap } from "https://deno.land/x/unitest@v1.0.0-beta.82/modifier/mod.ts";
import { isString } from "https://deno.land/x/isx@v1.0.0-beta.17/mod.ts";
export * from "https://esm.sh/graphql@16.5.0";

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
  modifierMap: jestModifierMap,
});

export function queryString(
  baseURL: string | URL,
  urlParams: { [param: string]: string },
): string {
  const url = isString(baseURL) ? new URL(baseURL) : baseURL;

  Object.entries(urlParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}
