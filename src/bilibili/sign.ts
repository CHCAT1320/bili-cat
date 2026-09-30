import { md5Hex, urlencode } from "./wbi";

const APP_KEY = "4409e2ce8ffd12b8";
const APP_SEC = "59b43e04ad6965f34319062b478f83dd";

export function encAppSign(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const signed: Record<string, unknown> = { ...payload, appkey: APP_KEY };
  const ordered: Record<string, string> = {};
  for (const key of Object.keys(signed).sort()) {
    ordered[key] = String(signed[key]);
  }
  signed.sign = md5Hex(urlencode(ordered) + APP_SEC);
  return signed;
}

const DM_RAND = "ABCDEFGHIJK";

export function encDm(
  params: Record<string, unknown>,
): Record<string, unknown> {
  const sample = (): string =>
    [...DM_RAND]
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
      .join("");

  return {
    ...params,
    dm_img_list: "[]",
    dm_img_str: sample(),
    dm_cover_img_str: sample(),
    dm_img_inter: '{"ds":[],"wh":[0,0,0],"of":[0,0,0]}',
  };
}
