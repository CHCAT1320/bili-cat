import { md5 } from "@noble/hashes/legacy.js";
import { bytesToHex } from "@noble/hashes/utils.js";

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61,
  26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36,
  20, 34, 44, 52,
];

export function md5Hex(input: string): string {
  return bytesToHex(md5(new TextEncoder().encode(input)));
}

function quotePlus(value: string): string {
  return encodeURIComponent(value)
    .replace(/%20/g, "+")
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function urlencode(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([key, value]) => `${quotePlus(key)}=${quotePlus(value)}`)
    .join("&");
}

function fileNameFromUrl(url: string): string {
  return (url.split("/").pop() ?? "").split(".")[0];
}

export function mixinKeyFromUrls(imgUrl: string, subUrl: string): string {
  const raw = fileNameFromUrl(imgUrl) + fileNameFromUrl(subUrl);
  return MIXIN_KEY_ENC_TAB.map((index) => raw[index] ?? "").join("").slice(0, 32);
}

export function encWbi(
  params: Record<string, unknown>,
  mixinKey: string,
): Record<string, unknown> {
  const signed: Record<string, unknown> = { ...params };
  delete signed.w_rid;
  signed.wts = Math.floor(Date.now() / 1000);
  if (!signed.web_location) signed.web_location = 1550101;

  const ordered: Record<string, string> = {};
  for (const key of Object.keys(signed).sort()) {
    ordered[key] = String(signed[key]);
  }
  signed.w_rid = md5Hex(urlencode(ordered) + mixinKey);
  return signed;
}
