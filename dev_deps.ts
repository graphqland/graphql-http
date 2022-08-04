export * from "https://deno.land/std@0.150.0/testing/asserts.ts";
export * from "https://deno.land/std@0.150.0/testing/bdd.ts";
export * from "https://deno.land/std@0.150.0/media_types/mod.ts";
export * from "https://deno.land/std@0.150.0/http/mod.ts";
import {
  defineExpect,
  equal,
  jestMatcherMap,
  jestModifierMap,
  MatchResult,
} from "https://deno.land/x/unitest@v1.0.0-beta.82/mod.ts";
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
    toEqualIterable,
  },
  modifierMap: jestModifierMap,
});

function toEqualIterable(
  actual: Iterable<readonly [PropertyKey, string]>,
  expected: Iterable<readonly [PropertyKey, string]>,
): MatchResult {
  const act = Object.fromEntries(actual);
  const exp = Object.fromEntries(expected);

  return {
    pass: equal(act, exp),
    expected: exp,
    resultActual: act,
  };
}

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

export class BaseRequest extends Request {
  constructor(input: RequestInfo, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    headers.append("accept", "application/graphql+json");

    super(input, { ...init, headers });
  }
}
