import { parseMediaType } from "./deps.ts";

export function validatePlaygroundRequest(req: Request): boolean {
  if (req.method !== "GET") {
    return false;
  }

  const accept = req.headers.get("accept");
  if (!accept) return false;

  const accepts = accept.split(",");
  const acceptHTML = accepts.some((accept) => {
    const [mediaType] = parseMediaType(accept);
    return mediaType === "text/html";
  });

  return acceptHTML;
}
