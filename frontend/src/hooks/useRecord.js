import { useCallback, useEffect, useState } from "react";
import { useSetAtom } from "jotai";
import ApiService from "@/lib/ApiService";
import { breadcrumbLabels } from "@/lib/Variables";
import useNotify from "./useNotify";

export default function useRecord(url, { breadcrumb, errorText }) {
  const notify = useNotify();
  const setLabels = useSetAtom(breadcrumbLabels);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    notify
      .load(ApiService.get(url), {
        errorText,
        onSuccess: (res) => {
          setRecord(res?.data);
          if (breadcrumb)
            setLabels((prev) => ({ ...prev, [breadcrumb]: res?.data?.name }));
        },
      })
      .then((ok) => !ok && setRecord(null))
      .finally(() => setLoading(false));
  }, [url, breadcrumb, errorText, notify, setLabels]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { record, loading, reload };
}
