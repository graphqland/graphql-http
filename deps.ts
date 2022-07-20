export {
  buildSchema,
  execute,
  executeSync,
  type ExecutionResult,
  getOperationAST,
  graphql,
  type GraphQLArgs,
  GraphQLError,
  GraphQLSchema,
  parse,
  specifiedRules,
  validate,
  validateSchema,
} from "https://esm.sh/graphql@16.5.0";
export {
  contentType,
  parseMediaType,
} from "https://deno.land/std@0.148.0/media_types/mod.ts";
export { accepts } from "https://deno.land/std@0.148.0/http/negotiation.ts";
export {
  isNil,
  isNull,
  isObject,
  isString,
  isUndefined,
} from "https://deno.land/x/isx@v1.0.0-beta.17/mod.ts";
export {
  JSON,
  type json,
  stringify,
} from "https://deno.land/x/pure_json@1.0.0-beta.1/mod.ts";
import { type json } from "https://deno.land/x/pure_json@1.0.0-beta.1/mod.ts";
export {
  type RenderPageOptions,
  renderPlaygroundPage,
} from "https://esm.sh/graphql-playground-html@1.6.30";
export { Status } from "https://deno.land/std@0.148.0/http/mod.ts";

export type PartialBy<T, K = keyof T> =
  Omit<T, K & keyof T> & Partial<Pick<T, K & keyof T>> extends infer U
    ? { [K in keyof U]: U[K] }
    : never;

export type PickBy<T, K> = {
  [k in keyof T as (K extends T[k] ? k : never)]: T[k];
};

export type PickRequired<T> = {
  [k in keyof T as T[k] extends Required<T>[k] ? k : never]: T[k];
};

export type PickPartial<T> = {
  [K in keyof T as Record<never, never> extends Pick<T, K> ? K : never]: T[K];
};

export type jsonObject = {
  [k: string]: json;
};

export function tryCatchSync<T>(
  fn: () => T,
): [data: T, err: undefined] | [data: undefined, err: unknown] {
  try {
    return [fn(), undefined];
  } catch (er) {
    return [, er];
  }
}

export async function tryCatch<T>(
  fn: () => Promise<T> | T,
): Promise<[data: T, err: undefined] | [data: undefined, err: unknown]> {
  try {
    return [await fn(), undefined];
  } catch (er) {
    return [, er];
  }
}
