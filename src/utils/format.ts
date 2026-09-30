export function formatCount(value?: number): string {
  if (!value) return "0";
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}亿`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)}万`;
  return String(value);
}

export function formatDuration(seconds?: number): string {
  if (!seconds) return "";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
