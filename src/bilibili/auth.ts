import { API } from "./endpoints";
import { DEFAULT_HEADERS, defaultFetcher } from "./client";
import { Credential } from "./credential";

const POLL_SOURCE = "main-fe-header";

export interface QrcodeSession {
  /** 二维码内容，交给二维码库渲染 */
  url: string;
  key: string;
}

export type QrcodeStatus =
  | "pending"
  | "scanned"
  | "expired"
  | "success"
  | "failed";

export interface QrcodePoll {
  status: QrcodeStatus;
  message: string;
  credential?: Credential;
}

function readSetCookies(response: Response): string[] {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  if (typeof headers.getSetCookie === "function") {
    const list = headers.getSetCookie();
    if (list.length > 0) return list;
  }
  const raw = response.headers.get("set-cookie");
  return raw ? [raw] : [];
}

export async function generateQrcode(): Promise<QrcodeSession> {
  const response = await defaultFetcher(API.login.qrcode.web.get_qrcode_and_token.url, {
    method: "GET",
    headers: { ...DEFAULT_HEADERS },
  });
  const body = (await response.json()) as {
    code: number;
    message?: string;
    data?: { url?: string; qrcode_key?: string };
  };
  if (body.code !== 0 || !body.data?.url || !body.data.qrcode_key) {
    throw new Error(body.message ?? "获取二维码失败");
  }
  return { url: body.data.url, key: body.data.qrcode_key };
}

export async function pollQrcode(key: string): Promise<QrcodePoll> {
  const url = new URL(API.login.qrcode.web.get_events.url);
  url.search = new URLSearchParams({
    qrcode_key: key,
    source: POLL_SOURCE,
  }).toString();

  const response = await defaultFetcher(url.toString(), {
    method: "GET",
    headers: { ...DEFAULT_HEADERS },
  });
  const body = (await response.json()) as {
    code: number;
    message?: string;
    data?: { code?: number; message?: string };
  };

  const inner = body.data?.code;
  const message = body.data?.message ?? body.message ?? "";

  if (inner === 0) {
    return {
      status: "success",
      message,
      credential: Credential.fromSetCookie(readSetCookies(response)),
    };
  }
  if (inner === 86090) return { status: "scanned", message };
  if (inner === 86038) return { status: "expired", message };
  if (inner === 86101) return { status: "pending", message };
  return { status: "failed", message: message || `未知状态 ${inner}` };
}

export interface NavUser {
  isLogin: boolean;
  mid?: number;
  uname?: string;
  face?: string;
  level?: number;
}

export async function fetchNavUser(credential: Credential): Promise<NavUser> {
  const url = "https://api.bilibili.com/x/web-interface/nav";
  const response = await defaultFetcher(url, {
    method: "GET",
    headers: {
      ...DEFAULT_HEADERS,
      ...(credential.hasSessdata
        ? {
            Cookie: Object.entries(credential.getCookies())
              .filter(([, value]) => value !== "")
              .map(([name, value]) => `${name}=${value}`)
              .join("; "),
          }
        : {}),
    },
  });
  const body = (await response.json()) as {
    code: number;
    data?: {
      isLogin?: boolean;
      mid?: number;
      uname?: string;
      face?: string;
      level_info?: { current_level?: number };
    };
  };
  const data = body.data;
  return {
    isLogin: Boolean(data?.isLogin),
    mid: data?.mid,
    uname: data?.uname,
    face: data?.face,
    level: data?.level_info?.current_level,
  };
}
