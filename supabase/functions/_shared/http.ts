// JSON / error responses. Error bodies carry a stable `error` code (AiErrorCode); the web app maps
// it to a translated message, `message` is for logs and developers only.
import type { AiErrorCode } from './ai-contract.ts';
import { CORS_HEADERS } from './cors.ts';

export const ERROR_STATUS: Record<AiErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  bad_request: 400,
  quota_exceeded: 429,
  audio_too_large: 413,
  ai_unavailable: 503,
  internal: 500,
};

export const ERROR_MESSAGE: Record<AiErrorCode, string> = {
  unauthorized: 'Sign-in required.',
  forbidden: 'You do not have access to this item.',
  not_found: 'Item not found or not visible to you.',
  bad_request: 'Invalid request.',
  quota_exceeded: 'Daily AI limit reached.',
  audio_too_large: 'The recording is too large to process.',
  ai_unavailable: 'The AI service is temporarily unavailable. Please try again later.',
  internal: 'Unexpected server error.',
};

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/** `{ error, message, ...extra }` with the HTTP status that belongs to the code. */
export function fail(code: AiErrorCode, extra: Record<string, unknown> = {}): Response {
  return json(ERROR_STATUS[code], { error: code, message: ERROR_MESSAGE[code], ...extra });
}

/** Reads a request body as text, refusing anything over `maxBytes` (also when Content-Length lies). */
export async function readLimited(req: Request, maxBytes: number): Promise<string | null> {
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > maxBytes) return null;
  if (!req.body) return '';
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(all);
}
