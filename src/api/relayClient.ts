/**
 * Relay REST client.
 *
 * Talks to the standalone diagrammer-relay binary's HTTP API:
 *   POST   /api/auth/register   { username, password, displayName? }
 *   POST   /api/auth/login      { username, password }
 *   GET    /api/auth/me         Bearer
 *   GET    /api/docs            Bearer
 *   GET    /api/docs/:id        Bearer
 *   PUT    /api/docs/:id        Bearer + body
 *   DELETE /api/docs/:id        Bearer
 *   POST   /api/blobs/:hash     (no auth required by current relay)
 *   GET    /api/blobs/:hash     (no auth required)
 *   HEAD   /api/blobs/:hash     (no auth required)
 *
 * Phase 20.3 Slice E.1. The renderer migration from WS-multiplexed
 * doc CRUD to this client happens in E.2; the WS path stays in place
 * until then so existing Tauri integration keeps working.
 */

import type { DiagramDocument, DocumentMetadata } from '../types/Document';

// ============ Types ============

export interface RelayUserInfo {
  id: string;
  username: string;
  displayName: string;
  /** "admin" | "user" */
  role: string;
  createdAt: number;
  lastLoginAt?: number;
}

export interface RelayLoginResult {
  token: string;
  /** Token expiration time in Unix-ms. */
  expiresAt: number;
  user: RelayUserInfo;
}

export interface RelayRegisterArgs {
  username: string;
  password: string;
  displayName?: string;
}

export interface RelayLoginArgs {
  username: string;
  password: string;
}

/**
 * Thrown for any non-2xx response. Carries the HTTP status and the
 * server-provided error string when available.
 */
export class RelayError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    public override readonly message: string,
  ) {
    super(message);
    this.name = 'RelayError';
  }

  /** True for 4xx auth failures — caller may want to re-login. */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

// ============ Client ============

export interface RelayClientOptions {
  /** Origin of the relay, e.g. `http://localhost:9876`. No trailing slash. */
  baseUrl: string;
  /** JWT token returned by `login()`. Optional — calls that need it will fail with 401 if missing. */
  token?: string;
  /**
   * Override `fetch` for testing or for environments where the global
   * `fetch` isn't appropriate. Defaults to `globalThis.fetch`.
   */
  fetchImpl?: typeof fetch;
}

export class RelayClient {
  private baseUrl: string;
  private token: string | undefined;
  private fetchImpl: typeof fetch;

  constructor(opts: RelayClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    if (opts.token !== undefined) {
      this.token = opts.token;
    }
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  /** Update the bearer token after a fresh login. Pass undefined to log out. */
  setToken(token: string | undefined): void {
    this.token = token;
  }

  /** Current bearer token (or undefined if unauthenticated). */
  getToken(): string | undefined {
    return this.token;
  }

  // ============ Auth ============

  async register(args: RelayRegisterArgs): Promise<{ user: RelayUserInfo }> {
    return this.requestJson('POST', '/api/auth/register', { body: args, auth: false });
  }

  async login(args: RelayLoginArgs): Promise<RelayLoginResult> {
    const result = await this.requestJson<RelayLoginResult>('POST', '/api/auth/login', {
      body: args,
      auth: false,
    });
    this.token = result.token;
    return result;
  }

  async me(): Promise<{ user: RelayUserInfo }> {
    return this.requestJson('GET', '/api/auth/me', { auth: true });
  }

  // ============ Documents ============

  async listDocuments(): Promise<{ documents: DocumentMetadata[] }> {
    return this.requestJson('GET', '/api/docs', { auth: true });
  }

  async getDocument(docId: string): Promise<DiagramDocument> {
    return this.requestJson('GET', `/api/docs/${encodeURIComponent(docId)}`, { auth: true });
  }

  async saveDocument(docId: string, document: DiagramDocument): Promise<{ success: boolean }> {
    return this.requestJson('PUT', `/api/docs/${encodeURIComponent(docId)}`, {
      auth: true,
      body: document,
    });
  }

  async deleteDocument(docId: string): Promise<{ success: boolean }> {
    return this.requestJson('DELETE', `/api/docs/${encodeURIComponent(docId)}`, { auth: true });
  }

  // ============ Blobs ============

  async uploadBlob(hash: string, data: Uint8Array): Promise<void> {
    // Copy into a fresh ArrayBuffer so the body is unambiguously BodyInit
    // (strict TS lib defs don't accept `Uint8Array<ArrayBufferLike>` for
    // either BlobPart or BodyInit directly).
    const buffer = new ArrayBuffer(data.byteLength);
    new Uint8Array(buffer).set(data);
    await this.requestRaw('POST', `/api/blobs/${encodeURIComponent(hash)}`, {
      body: buffer,
      contentType: 'application/octet-stream',
    });
  }

  async downloadBlob(hash: string): Promise<Uint8Array> {
    const res = await this.requestRaw('GET', `/api/blobs/${encodeURIComponent(hash)}`);
    return new Uint8Array(await res.arrayBuffer());
  }

  async blobExists(hash: string): Promise<boolean> {
    try {
      await this.requestRaw('HEAD', `/api/blobs/${encodeURIComponent(hash)}`);
      return true;
    } catch (err) {
      if (err instanceof RelayError && err.status === 404) return false;
      throw err;
    }
  }

  // ============ Internals ============

  private async requestJson<T>(
    method: string,
    path: string,
    opts: { body?: unknown; auth?: boolean } = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (opts.auth !== false && this.token !== undefined) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = { method, headers };
    if (opts.body !== undefined) {
      init.body = JSON.stringify(opts.body);
    }
    const res = await this.fetchImpl(url, init);
    if (!res.ok) {
      throw await buildRelayError(res, url);
    }
    // 204 No Content -> return empty object cast to T.
    if (res.status === 204) {
      return {} as T;
    }
    return (await res.json()) as T;
  }

  private async requestRaw(
    method: string,
    path: string,
    opts: { body?: BodyInit; contentType?: string } = {},
  ): Promise<Response> {
    const headers: Record<string, string> = {};
    if (opts.contentType !== undefined) {
      headers['Content-Type'] = opts.contentType;
    }
    if (this.token !== undefined) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = { method, headers };
    if (opts.body !== undefined) {
      init.body = opts.body;
    }
    const res = await this.fetchImpl(url, init);
    if (!res.ok) {
      throw await buildRelayError(res, url);
    }
    return res;
  }
}

/**
 * Extract a `RelayError` from a non-2xx response. Tries to read a
 * JSON `{ error: string }` body first; falls back to status text.
 */
async function buildRelayError(res: Response, url: string): Promise<RelayError> {
  let message = res.statusText;
  try {
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const body = (await res.json()) as { error?: string };
      if (typeof body.error === 'string' && body.error.length > 0) {
        message = body.error;
      }
    } else {
      const text = await res.text();
      if (text.length > 0) message = text;
    }
  } catch {
    // Ignore parse errors; fall back to statusText.
  }
  return new RelayError(res.status, url, message);
}
