export function mergeHeaders(
  a?: HeadersInit,
  b?: HeadersInit,
): [data: HeadersInit, err: undefined] | [data: undefined, err: TypeError] {
  const aHeader = new Headers(a);
  const bHeader = new Headers(b);

  try {
    aHeader.forEach((value, key) => {
      bHeader.append(key, value);
    });

    const headersInit = Object.fromEntries(bHeader.entries());
    return [headersInit ?? {}, undefined];
  } catch (e) {
    return [, e as TypeError];
  }
}

export function mergeInit<
  T extends { headers?: HeadersInit },
>(
  a: T,
  b: T,
): [data: T] | [data: undefined, err: TypeError] {
  const [headers, err] = mergeHeaders(a.headers, b.headers);

  if (err) {
    return [, err];
  }
  return [{
    ...a,
    ...b,
    headers,
  }];
}
