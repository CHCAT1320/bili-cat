export const SEARCH_ORDERS = [
  "totalrank",
  "click",
  "pubdate",
  "danmaku",
  "stow",
] as const;

export type SearchOrder = (typeof SEARCH_ORDERS)[number];

export const SEARCH_DURATIONS = [0, 1, 2, 3, 4] as const;

export type SearchDuration = (typeof SEARCH_DURATIONS)[number];

export const DEFAULT_ORDER: SearchOrder = "totalrank";
export const DEFAULT_DURATION: SearchDuration = 0;

export function parseOrder(value: string | null): SearchOrder {
  return SEARCH_ORDERS.includes(value as SearchOrder)
    ? (value as SearchOrder)
    : DEFAULT_ORDER;
}

export function parseDuration(value: string | null): SearchDuration {
  const parsed = Number(value);
  return SEARCH_DURATIONS.includes(parsed as SearchDuration)
    ? (parsed as SearchDuration)
    : DEFAULT_DURATION;
}
