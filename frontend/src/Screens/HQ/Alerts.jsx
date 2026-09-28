import React, { useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import {
  LuBellRing,
  LuCircleAlert,
  LuCircleCheck,
  LuClock,
  LuCoffee,
  LuMessageSquare,
  LuPackageX,
  LuReceipt,
  LuStore,
  LuTimer,
  LuTriangleAlert,
} from "react-icons/lu";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewBox } from "@/Screens/Layout/DashboardBlocks";
import useNotify from "@/hooks/useNotify";
import usePolling from "@/hooks/usePolling";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { cn } from "@/lib/utils";

const REFRESH_INTERVAL = 60000;

const ICONS = {
  STOCK_CRITICAL: LuPackageX,
  STOCK_LOW: LuPackageX,
  ORDER_LATE: LuTimer,
  ORDER_CANCELLED: LuReceipt,
  SHIFT_LONG: LuClock,
  BREAK_LONG: LuCoffee,
  REMINDER_OVERDUE: LuBellRing,
  REMINDER_ACCEPTED: LuCircleCheck,
  REMINDER_REPLY: LuMessageSquare,
  NO_SALES: LuStore,
};

const TONES = { critical: "danger", warning: "warning", info: "info" };

function alertsTitle(summary) {
  if (!summary) return "Alerts";
  const urgent = summary.critical + summary.warning;
  return urgent ? `Alerts · ${urgent} need attention` : "Alerts";
}

export default function Alerts({ onOpen }) {
  const notify = useNotify();
  const [data, setData] = useState(null);

  usePolling(() => {
    notify.load(ApiService.get(API_LINK.CompanyAlerts), {
      errorText: "Failed to load alerts",
      onSuccess: (res) =>
        setData({ rows: res.data ?? [], summary: res.summary }),
    });
  }, REFRESH_INTERVAL);

  return (
    <ViewBox title={alertsTitle(data?.summary)}>
      {data === null && <Skeleton className="h-64 rounded-md" />}
      {data?.rows.length === 0 && (
        <p className="dashboard-empty">All clear. Nothing needs attention.</p>
      )}
      {data?.rows.length > 0 && (
        <ul className="activity-list">
          {data.rows.map((alert, index) => {
            const Icon =
              ICONS[alert.type] ??
              (alert.severity === "critical" ? LuTriangleAlert : LuCircleAlert);
            return (
              <li key={`${alert.type}-${alert.outlet?.id}-${index}`}>
                <button
                  type="button"
                  className="activity-item"
                  onClick={() => onOpen(alert)}
                >
                  <span
                    className={cn(
                      "activity-icon",
                      `status-${TONES[alert.severity]}`,
                    )}
                  >
                    <Icon />
                  </span>
                  <span className="activity-body">
                    <span className="activity-title">{alert.title}</span>
                    <span className="cell-sub">
                      {[alert.outlet?.name, alert.detail]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {alert.at && (
                    <time className="activity-time" dateTime={alert.at}>
                      {formatDistanceToNowStrict(new Date(alert.at), {
                        addSuffix: true,
                      })}
                    </time>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </ViewBox>
  );
}
