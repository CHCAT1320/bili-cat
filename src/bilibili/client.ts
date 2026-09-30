import { Credential, loadStoredCredential } from "./credential";
import { API } from "./endpoints";
import {
  BilibiliApiError,
  NetworkError,
  WbiRetryExceededError,
} from "./errors";
import { encAppSign, encDm } from "./sign";
import type { Endpoint } from "./types";
import { encWbi, mixinKeyFromUrls } from "./wbi";

const NAV_URL = "https://api.bilibili.com/x/web-interface/nav";

export const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  Referer: "https://www.bilibili.com",
  Origin: "https://www.bilibili.com",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
};

const CSRF_METHODS = new Set(["POST", "DELETE", "PATCH"]);
/** 风控限流后的退避基数，重试间隔按 600ms / 1.2s 递增 */
const RETRY_BASE_DELAY = 600;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** B 站用 HTTP 412/429 + `request was banned` 表示限流，这类可以退避重试 */
function isRateLimited(error: unknown): boolean {
  return (
    error instanceof NetworkError &&
    (error.status === 412 || error.status === 429)
  );
}

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

export async function defaultFetcher(url: string, init: RequestInit): Promise<Response> {
  if (isTauri()) {
    const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
    return (await tauriFetch(url, init)) as unknown as Response;
  }
  return fetch(url, init);
}

export interface RequestInfo {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: BodyInit | null | undefined;
}

export interface ClientOptions {
  credential?: Credential;
  fetcher?: Fetcher;
  headers?: Record<string, string>;
  retryTimes?: number;
  autoBuvid?: boolean;
  onRequest?: (info: RequestInfo) => void;
}

const SPI_URL = "https://api.bilibili.com/x/frontend/finger/spi";

export interface RequestOptions {
  credential?: Credential;
  params?: Record<string, unknown>;
  data?: Record<string, unknown>;
  files?: Record<string, Blob | string>;
  headers?: Record<string, string>;
  raw?: boolean;
}

type Json = Record<string, unknown>;

function normalize(input: Record<string, unknown> | undefined): Json {
  const output: Json = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    if (value === null || value === undefined) continue;
    output[key] = typeof value === "boolean" ? Number(value) : value;
  }
  return output;
}

function fillPlaceholders(url: string, params: Json): string {
  return url.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (!(name in params)) return match;
    const value = String(params[name]);
    delete params[name];
    return encodeURIComponent(value);
  });
}

function buildQuery(params: Json): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, String(item));
    } else {
      search.append(key, String(value));
    }
  }
  return search.toString();
}

function cookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

export class BilibiliClient {
  credential: Credential;
  readonly fetcher: Fetcher;
  readonly headers: Record<string, string>;
  readonly retryTimes: number;
  readonly autoBuvid: boolean;
  readonly onRequest?: (info: RequestInfo) => void;
  private mixinKey: string | null = null;
  private buvidPromise: Promise<void> | null = null;

  constructor(options: ClientOptions = {}) {
    this.credential =
      options.credential ?? loadStoredCredential() ?? new Credential();
    this.fetcher = options.fetcher ?? defaultFetcher;
    this.headers = { ...DEFAULT_HEADERS, ...options.headers };
    this.retryTimes = options.retryTimes ?? 3;
    this.autoBuvid = options.autoBuvid ?? true;
    this.onRequest = options.onRequest;
  }

  private async ensureBuvid(credential: Credential): Promise<void> {
    if (!this.autoBuvid) return;
    if (credential.buvid3 && credential.buvid4) return;
    if (!this.buvidPromise) {
      this.buvidPromise = (async () => {
        const response = await this.fetcher(SPI_URL, {
          method: "GET",
          headers: { ...this.headers },
        });
        if (!response.ok) return;
        const body = (await response.json()) as {
          data?: { b_3?: string; b_4?: string };
        };
        credential.setBuvid(body.data?.b_3, body.data?.b_4);
      })().catch(() => {
        this.buvidPromise = null;
      });
    }
    await this.buvidPromise;
  }

  async getMixinKey(force = false): Promise<string> {
    if (this.mixinKey && !force) return this.mixinKey;
    await this.ensureBuvid(this.credential);
    const cookie = cookieHeader(this.credential.getCookies());
    const response = await this.fetcher(NAV_URL, {
      method: "GET",
      headers: {
        ...this.headers,
        ...(cookie ? { Cookie: cookie } : {}),
      },
    });
    if (!response.ok) {
      throw new NetworkError(response.status, await response.text());
    }
    const body = (await response.json()) as { data?: { wbi_img?: Json } };
    const wbiImg = body.data?.wbi_img as
      | { img_url?: string; sub_url?: string }
      | undefined;
    if (!wbiImg?.img_url || !wbiImg.sub_url) {
      throw new BilibiliApiError(-1, "无法获取 wbi 签名密钥");
    }
    this.mixinKey = mixinKeyFromUrls(wbiImg.img_url, wbiImg.sub_url);
    return this.mixinKey;
  }

  async request<T = unknown>(
    endpoint: Endpoint,
    options: RequestOptions = {},
  ): Promise<T> {
    if (endpoint.files && !options.files) {
      throw new BilibiliApiError(-1, "该接口需要上传文件，暂未支持");
    }
    const credential = options.credential ?? this.credential;
    let attempt = this.retryTimes;
    let delay = RETRY_BASE_DELAY;

    while (attempt > 0) {
      attempt -= 1;
      try {
        return await this.send<T>(endpoint, options, credential);
      } catch (error) {
        // wbi 签名过期：换新密钥重试
        if (error instanceof BilibiliApiError && error.code === -403 && endpoint.wbi) {
          await this.getMixinKey(true);
          continue;
        }
        // 风控限流：退避后重试
        if (isRateLimited(error) && attempt > 0) {
          await sleep(delay);
          delay *= 2;
          continue;
        }
        throw error;
      }
    }
    throw new WbiRetryExceededError(this.retryTimes);
  }

  private async send<T>(
    endpoint: Endpoint,
    options: RequestOptions,
    credential: Credential,
  ): Promise<T> {
    const method = endpoint.method;
    const params = normalize(options.params);
    const data = normalize(options.data);

    if (endpoint.verify) credential.requireSessdata();
    if (method !== "GET" && !endpoint.no_csrf) credential.requireBiliJct();

    if (params.jsonp === "jsonp") params.callback = "callback";
    if (endpoint.dm) Object.assign(params, encDm(params));

    let signedParams = params;
    if (endpoint.wbi) {
      signedParams = encWbi(params, await this.getMixinKey());
    }

    let body: Json = data;
    if (!endpoint.no_csrf && endpoint.verify && CSRF_METHODS.has(method)) {
      body.csrf = credential.bili_jct;
      body.csrf_token = credential.bili_jct;
    }
    if (endpoint.sign) {
      const signed = encAppSign(CSRF_METHODS.has(method) ? body : signedParams);
      if (CSRF_METHODS.has(method)) body = signed;
      else signedParams = signed;
    }

    const url = new URL(fillPlaceholders(endpoint.url, signedParams));
    await this.ensureBuvid(credential);
    const cookie = cookieHeader(credential.getCookies());
    const headers: Record<string, string> = {
      ...this.headers,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(endpoint.json_body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    };

    let init: RequestInit;
    if (method === "GET" || method === "HEAD") {
      Object.assign(signedParams, body);
      url.search = buildQuery(signedParams);
      init = { method, headers };
    } else if (options.files) {
      const form = new FormData();
      for (const [key, value] of Object.entries(body)) {
        form.append(key, String(value));
      }
      for (const [key, value] of Object.entries(options.files)) {
        form.append(key, value);
      }
      init = { method, headers, body: form };
    } else {
      init = {
        method,
        headers,
        body: endpoint.json_body ? JSON.stringify(body) : buildQuery(body),
      };
    }

    const target = url.toString();
    this.onRequest?.({
      method,
      url: target,
      headers,
      body: init.body,
    });
    const response = await this.fetcher(target, init);
    if (!response.ok) {
      throw new NetworkError(response.status, await response.text());
    }
    const text = await response.text();
    if (text.length === 0) return null as T;

    let parsed: Json;
    if ("callback" in signedParams) {
      const match = text.match(/^.*?({.*}).*$/s);
      parsed = JSON.parse(match ? match[1] : text) as Json;
    } else {
      parsed = JSON.parse(text) as Json;
    }

    if (options.raw) return parsed as T;

    const ok = parsed.OK;
    if (ok === undefined) {
      const code = parsed.code;
      if (typeof code !== "number") {
        throw new BilibiliApiError(-1, "接口返回数据不含 code 字段", parsed);
      }
      if (code !== 0 && !endpoint.ignore_code) {
        const message =
          (parsed.msg as string) ??
          (parsed.message as string) ??
          "接口未返回错误信息";
        throw new BilibiliApiError(code, message, parsed.data);
      }
    } else if (ok !== 1 && !endpoint.ignore_code) {
      throw new BilibiliApiError(-1, "接口返回数据 OK 不为 1", parsed);
    }

    const real = ok === undefined ? parsed.data ?? parsed.result : parsed;
    return (real ?? null) as T;
  }
}

export const client = new BilibiliClient();

export function request<T = unknown>(
  endpoint: Endpoint,
  options: RequestOptions = {},
): Promise<T> {
  return client.request<T>(endpoint, options);
}

export { API };
