export function resolveErrorMsg(e: unknown): string {
  const run = (e: unknown): string[] => {
    if (e instanceof AggregateError) {
      return [
        `${e.name}: ${e.message}`,
        ...e.errors.map((error) => resolveErrorMsg(error)),
      ];
    }
    if (e instanceof Error) {
      return [`${e.name}: ${e.message}`];
    }
    return ["Error: Unknown error has occurred."];
  };

  return run(e).join("\n");
}
