import { useEffect, useRef, useState } from "react";
import { API, client } from "../bilibili";
import { stripTags } from "../bilibili/feed";

const DEBOUNCE_MS = 250;
const MAX_HOT = 8;

interface SuggestTag {
  value: string;
  name?: string;
}

interface HotWord {
  keyword?: string;
  show_name?: string;
}

interface HotResponse {
  list?: HotWord[];
}

/**
 * 输入时给联想词；输入为空时给热搜词。
 * enabled 为 false（失焦/已关闭下拉）时不发请求。
 */
export function useSearchSuggest(keyword: string, enabled: boolean): string[] {
  const [items, setItems] = useState<string[]>([]);
  const runId = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      return;
    }

    const term = keyword.trim();
    const id = runId.current + 1;
    runId.current = id;

    const timer = setTimeout(
      () => {
        const pending = term
          ? client
              .request<{ tag?: SuggestTag[] }>(API.search.search.suggest, {
                params: { term },
              })
              .then((data) =>
                (data.tag ?? []).map((tag) =>
                  stripTags(tag.name ?? tag.value ?? ""),
                ),
              )
          : client
              .request<HotResponse>(API.search.search.hot_search_keywords, {
                raw: true,
              })
              .then((data) =>
                (data.list ?? [])
                  .slice(0, MAX_HOT)
                  .map((word) => word.show_name ?? word.keyword ?? ""),
              );

        void pending
          .then((list) => {
            if (id === runId.current) setItems(list.filter(Boolean));
          })
          .catch(() => {
            if (id === runId.current) setItems([]);
          });
      },
      term ? DEBOUNCE_MS : 0,
    );

    return () => clearTimeout(timer);
  }, [keyword, enabled]);

  return items;
}
