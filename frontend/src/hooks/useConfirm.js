import { useMemo } from "react";
import { useSetAtom } from "jotai";
import { confirmModal, emptyNotifyData } from "@/lib/Variables";

export default function useConfirm() {
  const setConfirmation = useSetAtom(confirmModal);

  return useMemo(() => {
    const ask = ({
      title,
      body,
      label = "Confirm",
      onConfirm,
      danger = false,
    }) =>
      setConfirmation({
        open: true,
        title,
        description: "",
        body,
        type: "success",
        footer: true,
        cancelButton: true,
        remove: danger,
        submitLabel: label,
        submitClick: onConfirm,
      });

    return {
      ask,
      remove: ({ label = "Delete", ...options }) =>
        ask({ ...options, label, danger: true }),
      close: () => setConfirmation(emptyNotifyData),
    };
  }, [setConfirmation]);
}
