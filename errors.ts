export class GraphQLHTTPError extends Error {
  public statusHint: number;
  constructor(
    { message, statusHint }: { message: string; statusHint: number },
    options?: ErrorOptions | undefined,
  ) {
    super(message, options);
    this.statusHint = statusHint;
  }
  name = "GraphQLHTTPError";
}

export class MissingParameterError extends GraphQLHTTPError {}
export class MissingBodyError extends GraphQLHTTPError {}
export class MissingHeaderError extends GraphQLHTTPError {}
export class InvalidParameterError extends GraphQLHTTPError {}
export class InvalidHTTPMethodError extends GraphQLHTTPError {}
export class InvalidHeaderError extends GraphQLHTTPError {}
export class InvalidBodyError extends GraphQLHTTPError {}
