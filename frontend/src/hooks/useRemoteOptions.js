import { useCallback, useEffect, useMemo, useState } from "react";
import ApiService from "@/lib/ApiService";
import useNotify from "./useNotify";

const OPTION_LIMIT = 20;
const SEARCH_DEBOUNCE = 400;

const defaultMap = (row) => ({ label: row.name, value: row.id });

export default function useRemoteOptions({
  url,
  params,
  mapOption = defaultMap,
  selected,
  enabled = true,
  errorText = "Failed to load options",
}) {
  const notify = useNotify();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const paramsKey = JSON.stringify(params ?? {});

  useEffect(() => {
    if (!enabled || !url) {
      setRows([]);
      return undefined;
    }

    let active = true;
    const timer = setTimeout(
      () => {
        setLoading(true);
        const request = ApiService.get(url, {
          params: {
            sort_by: "name",
            order_by: "asc",
            ...JSON.parse(paramsKey),
            per_page: OPTION_LIMIT,
            page: 1,
            search_by: search || undefined,
          },
        });
        notify
          .load(request, {
            errorText,
            onSuccess: (res) => active && setRows(res?.data ?? []),
          })
          .then((ok) => !ok && active && setRows([]))
          .finally(() => active && setLoading(false));
      },
      search ? SEARCH_DEBOUNCE : 0,
    );

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [url, paramsKey, search, enabled, errorText, notify]);

  const options = useMemo(() => {
    const list = rows.map(mapOption).filter(Boolean);
    if (search) return list;
    const extra = [selected]
      .flat()
      .filter(
        (option) =>
          option?.value && !list.some((item) => item.value === option.value),
      );
    return [...extra, ...list];
  }, [rows, search, selected, mapOption]);

  const onSearch = useCallback(
    (value) => setSearch(String(value ?? "").trim()),
    [],
  );

  return { options, loading, search, onSearch };
}
