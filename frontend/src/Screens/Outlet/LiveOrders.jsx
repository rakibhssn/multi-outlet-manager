import React, { useState } from "react";
import { LuCircleCheck, LuEye } from "react-icons/lu";
import { AnimateButton } from "@/components/custom";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewBox } from "@/Screens/Layout/DashboardBlocks";
import useCan from "@/hooks/useCan";
import useNotify from "@/hooks/useNotify";
import usePolling from "@/hooks/usePolling";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import {
  formatMinutes,
  fullName,
  minutesBetween,
} from "@/lib/Functions/Common";
import { orderTypeText } from "@/lib/Functions/Order";
import { cn } from "@/lib/utils";

const REFRESH_INTERVAL = 15000;
const WARN_MINUTES = 15;
const LATE_MINUTES = 30;

const ageTone = (minutes) => {
  if (minutes >= LATE_MINUTES) return "live-age-late";
  if (minutes >= WARN_MINUTES) return "live-age-warn";
  return null;
};

export default function LiveOrders({ refreshKey, onView, onChange }) {
  const notify = useNotify();
  const can = useCan();
  const canComplete = can("orders.complete");
  const [orders, setOrders] = useState(null);
  const [completing, setCompleting] = useState(null);

  usePolling(
    () => {
      const params = {
        status: "CONFIRMED",
        sort_by: "confirmedAt",
        order_by: "asc",
        per_page: 20,
        withItems: 1,
      };
      notify.load(ApiService.get(API_LINK.SalesOrder, { params }), {
        errorText: "Failed to load live orders",
        onSuccess: (res) => setOrders(res.data ?? []),
      });
    },
    REFRESH_INTERVAL,
    refreshKey,
  );

  const complete = (order) => {
    setCompleting(order.id);
    notify
      .submit(ApiService.patch(API_LINK.SalesOrderComplete(order.id)), {
        errorText: "Failed to complete the order",
        onSuccess: onChange,
      })
      .finally(() => setCompleting(null));
  };

  return (
    <ViewBox
      title={`Live Orders${orders?.length ? ` · ${orders.length}` : ""}`}
    >
      {orders === null && <Skeleton className="h-64 rounded-md" />}
      {orders?.length === 0 && (
        <p className="dashboard-empty">No orders waiting. All caught up!</p>
      )}
      {orders?.length > 0 && (
        <div className="live-list">
          {orders.map((order) => {
            const minutes = minutesBetween(order.confirmedAt);
            return (
              <article key={order.id} className="live-card">
                <div className="live-card-info">
                  <span className="cell-title">{order.orderNumber}</span>
                  <span className="cell-sub">
                    {orderTypeText(order.orderType, order.tableNumber)} ·{" "}
                    {fullName(order.server) || "—"}
                  </span>
                  <p className="live-items">
                    {(order.items ?? []).map((item, index) => (
                      <span key={item.id}>
                        {index > 0 && ", "}
                        <span className="live-qty">{item.quantity}×</span>{" "}
                        {item.itemName}
                      </span>
                    ))}
                  </p>
                </div>
                <div className="live-card-side">
                  <span className={cn("live-age", ageTone(minutes))}>
                    {formatMinutes(minutes)}
                  </span>
                  <div className="live-actions">
                    <AnimateButton
                      size="sm"
                      variant="outline"
                      preIcon={LuEye}
                      label="View"
                      onClick={() => onView(order.id)}
                      className="live-btn"
                    />
                    {canComplete && (
                      <AnimateButton
                        size="sm"
                        preIcon={LuCircleCheck}
                        label="Complete"
                        loading={completing === order.id}
                        disabled={!!completing}
                        onClick={() => complete(order)}
                        className="live-btn"
                      />
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </ViewBox>
  );
}
