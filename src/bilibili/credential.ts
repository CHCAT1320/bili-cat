import { MissingCredentialError } from "./errors";

export interface CredentialInit {
  sessdata?: string;
  bili_jct?: string;
  buvid3?: string;
  buvid4?: string;
  dedeuserid?: string;
  ac_time_value?: string;
}

const STORAGE_KEY = "bili-cat-credential";

function normalizeSessdata(sessdata?: string): string | undefined {
  if (!sessdata) return undefined;
  return sessdata.includes("%") ? sessdata : encodeURIComponent(sessdata);
}

function parseCookiePairs(raw: string): Record<string, string> {
  const jar: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    jar[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
  return jar;
}

export class Credential {
  sessdata?: string;
  bili_jct?: string;
  buvid3?: string;
  buvid4?: string;
  dedeuserid?: string;
  ac_time_value?: string;

  constructor(init: CredentialInit = {}) {
    this.sessdata = normalizeSessdata(init.sessdata);
    this.bili_jct = init.bili_jct;
    this.buvid3 = init.buvid3;
    this.buvid4 = init.buvid4;
    this.dedeuserid = init.dedeuserid;
    this.ac_time_value = init.ac_time_value;
  }

  static fromCookies(cookies: string | Record<string, string>): Credential {
    const jar =
      typeof cookies === "string" ? parseCookiePairs(cookies) : cookies;

    const pick = (name: string): string | undefined =>
      jar[name] ?? jar[name.toLowerCase()] ?? jar[name.toUpperCase()];

    return new Credential({
      sessdata: pick("SESSDATA"),
      bili_jct: pick("bili_jct"),
      buvid3: pick("buvid3") ?? pick("BUVID3"),
      buvid4: pick("buvid4") ?? pick("BUVID4"),
      dedeuserid: pick("DedeUserID"),
      ac_time_value: pick("ac_time_value"),
    });
  }

  /**
   * 从 Set-Cookie 数组里取凭证。
   * 每条形如 `SESSDATA=xxx; Path=/; Domain=.bilibili.com; ...`，
   * 只取第一段键值对，否则 Path/Domain 会被当成 cookie 名。
   */
  static fromSetCookie(list: string[]): Credential {
    const jar: Record<string, string> = {};
    for (const entry of list) {
      const first = entry.split(";")[0] ?? "";
      Object.assign(jar, parseCookiePairs(first));
    }
    return Credential.fromCookies(jar);
  }

  get hasSessdata(): boolean {
    return Boolean(this.sessdata);
  }

  get hasBiliJct(): boolean {
    return Boolean(this.bili_jct);
  }

  requireSessdata(): void {
    if (!this.hasSessdata) throw new MissingCredentialError("SESSDATA");
  }

  requireBiliJct(): void {
    if (!this.hasBiliJct) throw new MissingCredentialError("bili_jct");
  }

  getCookies(): Record<string, string> {
    const cookies: Record<string, string> = {
      SESSDATA: this.sessdata ?? "",
      buvid3: this.buvid3 ?? "",
      buvid4: this.buvid4 ?? "",
      bili_jct: this.bili_jct ?? "",
      ac_time_value: this.ac_time_value ?? "",
    };
    if (this.dedeuserid) cookies.DedeUserID = this.dedeuserid;
    cookies["opus-goback"] = "1";
    return cookies;
  }

  toInit(): CredentialInit {
    return {
      sessdata: this.sessdata,
      bili_jct: this.bili_jct,
      buvid3: this.buvid3,
      buvid4: this.buvid4,
      dedeuserid: this.dedeuserid,
      ac_time_value: this.ac_time_value,
    };
  }

  setBuvid(buvid3?: string, buvid4?: string): void {
    if (!this.buvid3 && buvid3) this.buvid3 = buvid3;
    if (!this.buvid4 && buvid4) this.buvid4 = buvid4;
  }
}

/** 读取本地保存的登录态；非浏览器环境或解析失败时返回 null */
export function loadStoredCredential(): Credential | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const init = JSON.parse(raw) as CredentialInit;
    const credential = new Credential(init);
    return credential.hasSessdata ? credential : null;
  } catch {
    return null;
  }
}

export function storeCredential(credential: Credential): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(credential.toInit()));
  } catch {
    // 忽略写入失败（隐私模式等）
  }
}

export function clearStoredCredential(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 忽略
  }
}
