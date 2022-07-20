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

export function mergeResponse(
  a: ResponseInit,
  b: ResponseInit,
): [data: ResponseInit] | [data: undefined, err: TypeError] {
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
