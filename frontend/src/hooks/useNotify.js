import { useMemo } from "react";
import { useSetAtom } from "jotai";
import { notificationModal } from "@/lib/Variables";

export default function useNotify() {
  const setNotification = useSetAtom(notificationModal);

  return useMemo(() => {
    const show = (ok, description) =>
      setNotification({
        open: true,
        title: ok ? "Success" : "Error",
        description,
        type: ok ? "success" : "error",
      });

    const failure = (error, fallback) =>
      show(false, error?.response?.data?.message ?? fallback);

    const handle = (request, { errorText, onSuccess, quiet = false }) =>
      request
        .then(async (res) => {
          const ok = res?.status === "success";
          if (!ok || !quiet) show(ok, res?.message);
          if (ok) await onSuccess?.(res);
          return ok;
        })
        .catch((error) => {
          failure(error, errorText);
          return false;
        });

    return {
      success: (message) => show(true, message),
      error: (message) => show(false, message),
      failure,
      load: (request, options) => handle(request, { ...options, quiet: true }),
      submit: (request, options) => handle(request, options),
    };
  }, [setNotification]);
}
