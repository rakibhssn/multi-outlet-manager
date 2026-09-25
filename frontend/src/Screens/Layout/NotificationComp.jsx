import { useEffect, useRef } from "react";
import { useAtom } from "jotai";
import { toast } from "sonner";
import { emptyNotifyData, notificationModal } from "@/lib/Variables";

const TOAST_TYPES = ["success", "error", "warning", "info"];

const resolveType = ({ type, title }) => {
  if (TOAST_TYPES.includes(type)) return type;
  const key = String(title ?? "").toLowerCase();
  return TOAST_TYPES.find((t) => key.includes(t)) ?? "message";
};

export default function NotificationComp() {
  const [notification, setNotification] = useAtom(notificationModal);
  const shown = useRef(null);

  useEffect(() => {
    if (!notification?.open || shown.current === notification) return;
    shown.current = notification;

    toast[resolveType(notification)](notification.title, {
      description: notification.description,
      duration: 3000,
    });

    setNotification(emptyNotifyData);
  }, [notification, setNotification]);

  return null;
}
