export const APPLICATION_GRAPHQL_JSON = "application/graphql+json";
export const APPLICATION_JSON = "application/json";

/** Available charset. */
export const CHARSET = "charset=UTF-8";

export const MIME_TYPE_APPLICATION_GRAPHQL_JSON =
  `${APPLICATION_GRAPHQL_JSON};${CHARSET}` as const;

export const MIME_TYPE_APPLICATION_JSON =
  `${APPLICATION_JSON};${CHARSET}` as const;

export const MIME_TYPE = "application/graphql+json; charset=UTF-8";
