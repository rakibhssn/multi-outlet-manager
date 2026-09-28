import React, { useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import {
  LuCircleCheck,
  LuCircleX,
  LuLogIn,
  LuLogOut,
  LuReceipt,
} from "react-icons/lu";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewBox } from "@/Screens/Layout/DashboardBlocks";
import useNotify from "@/hooks/useNotify";
import usePolling from "@/hooks/usePolling";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { formatMoney } from "@/lib/Functions/Common";
import { cn } from "@/lib/utils";

const REFRESH_INTERVAL = 30000;

const EVENTS = {
  ORDER_PLACED: {
    icon: LuReceipt,
    tone: "info",
    text: (e) => `Order ${e.reference} placed`,
  },
  ORDER_COMPLETED: {
    icon: LuCircleCheck,
    tone: "success",
    text: (e) => `Order ${e.reference} completed`,
  },
  ORDER_CANCELLED: {
    icon: LuCircleX,
    tone: "danger",
    text: (e) => `Order ${e.reference} cancelled`,
  },
  SHIFT_STARTED: {
    icon: LuLogIn,
    tone: "muted",
    text: (e) => `${e.reference} started a shift`,
  },
  SHIFT_ENDED: {
    icon: LuLogOut,
    tone: "muted",
    text: (e) => `${e.reference} ended a shift`,
  },
};

export default function RecentActivity({ onOpenOrder }) {
  const notify = useNotify();
  const [events, setEvents] = useState(null);

  usePolling(() => {
    notify.load(ApiService.get(API_LINK.CompanyActivity), {
      errorText: "Failed to load recent activity",
      onSuccess: (res) => setEvents(res.data ?? []),
    });
  }, REFRESH_INTERVAL);

  return (
    <ViewBox title="Recent Activity">
      {events === null && <Skeleton className="h-64 rounded-md" />}
      {events?.length === 0 && (
        <p className="dashboard-empty">No activity in the last 48 hours.</p>
      )}
      {events?.length > 0 && (
        <ul className="activity-list">
          {events.map((event) => {
            const config = EVENTS[event.type] ?? EVENTS.ORDER_PLACED;
            const Icon = config.icon;
            const content = (
              <>
                <span className={cn("activity-icon", `status-${config.tone}`)}>
                  <Icon />
                </span>
                <span className="activity-body">
                  <span className="activity-title">{config.text(event)}</span>
                  <span className="cell-sub">
                    {[
                      event.outlet,
                      event.detail,
                      event.amount !== undefined && formatMoney(event.amount),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <time className="activity-time" dateTime={event.at}>
                  {formatDistanceToNowStrict(new Date(event.at), {
                    addSuffix: true,
                  })}
                </time>
              </>
            );
            return (
              <li key={`${event.type}-${event.reference}-${event.at}`}>
                {event.orderId ? (
                  <button
                    type="button"
                    className="activity-item"
                    onClick={() => onOpenOrder(event.orderId)}
                  >
                    {content}
                  </button>
                ) : (
                  <div className="activity-item">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </ViewBox>
  );
}
