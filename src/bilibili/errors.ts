export class BilibiliApiError extends Error {
  readonly code: number;
  readonly data: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = "BilibiliApiError";
    this.code = code;
    this.data = data;
  }
}

export class NetworkError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "NetworkError";
    this.status = status;
  }
}

export class MissingCredentialError extends Error {
  constructor(field: string) {
    super(`该接口需要 ${field}，请先设置凭证`);
    this.name = "MissingCredentialError";
  }
}

export class WbiRetryExceededError extends Error {
  constructor(times: number) {
    super(`wbi 签名重试 ${times} 次后仍然失败`);
    this.name = "WbiRetryExceededError";
  }
}
