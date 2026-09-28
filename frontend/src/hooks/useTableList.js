import { useCallback, useEffect, useRef, useState } from "react";
import ApiService from "@/lib/ApiService";
import useNotify from "./useNotify";

const SEARCH_DEBOUNCE = 400;

const filterParams = (filterParam, value) => {
  if (typeof filterParam === "function") return filterParam(value);
  return filterParam ? { [filterParam]: value } : {};
};

export default function useTableList({
  url,
  defaults,
  initialParams,
  filterParam,
  onFilter,
  enabled = true,
  errorText = "Failed to load data",
}) {
  const notify = useNotify();
  const [params, setParams] = useState(() => ({
    ...defaults,
    ...initialParams,
  }));
  const [data, setData] = useState({ data: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const searchTimer = useRef(null);
  const config = useRef({ defaults, initialParams, filterParam, onFilter });

  useEffect(() => {
    config.current = { defaults, initialParams, filterParam, onFilter };
  });

  const reload = useCallback(() => {
    if (!enabled || !url) return;
    setLoading(true);
    notify
      .load(ApiService.get(url, { params }), {
        errorText,
        onSuccess: (res) =>
          setData({ data: res?.data ?? [], total: res?.total ?? 0 }),
      })
      .finally(() => setLoading(false));
  }, [url, params, enabled, errorText, notify]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => () => clearTimeout(searchTimer.current), []);

  const onChange = useCallback(
    ({ page, pageSize, sortField, sort, filter }) => {
      const {
        defaults: base,
        filterParam: key,
        onFilter: afterFilter,
      } = config.current;
      const value = filter || undefined;
      setParams((prev) => ({
        ...prev,
        page,
        per_page: pageSize,
        sort_by: sortField ?? base.sort_by,
        order_by: sort?.direction ?? base.order_by,
        ...filterParams(key, value),
      }));
      afterFilter?.(value);
    },
    [],
  );

  const onSearch = useCallback((value) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const search = value.trim();
      setParams((prev) => ({
        ...prev,
        page: 1,
        search_by: search || undefined,
      }));
    }, SEARCH_DEBOUNCE);
  }, []);

  const reset = useCallback(() => {
    const { defaults: base, initialParams: initial } = config.current;
    setParams({ ...base, ...initial });
  }, []);

  return {
    params,
    rows: data.data,
    total: data.total,
    loading,
    offset: (params.page - 1) * params.per_page,
    reload,
    reset,
    onChange,
    onSearch,
  };
}
