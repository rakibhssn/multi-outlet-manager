import React, { useState } from "react";
import { Link } from "react-router";
import { endOfDay, format, startOfDay } from "date-fns";
import { StatusComp } from "@/components/custom";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewBox } from "@/Screens/Layout/DashboardBlocks";
import useNotify from "@/hooks/useNotify";
import usePolling from "@/hooks/usePolling";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { formatMoney, fullName } from "@/lib/Functions/Common";
import { orderTypeText } from "@/lib/Functions/Order";

const REFRESH_INTERVAL = 15000;
const LIMIT = 8;

export default function TodaySales({ refreshKey, onView }) {
  const notify = useNotify();
  const [orders, setOrders] = useState(null);
  const [total, setTotal] = useState(0);

  usePolling(
    () => {
      const now = new Date();
      const params = {
        from: startOfDay(now).toISOString(),
        to: endOfDay(now).toISOString(),
        sort_by: "confirmedAt",
        order_by: "desc",
        per_page: LIMIT,
      };
      notify.load(ApiService.get(API_LINK.SalesOrder, { params }), {
        errorText: "Failed to load today's sales",
        onSuccess: (res) => {
          setOrders(res.data ?? []);
          setTotal(res.total ?? 0);
        },
      });
    },
    REFRESH_INTERVAL,
    refreshKey,
  );

  return (
    <ViewBox
      title={`Sales Today${total ? ` · ${total}` : ""}`}
      className="dashboard-span-2"
      actions={
        <Link to="/outlet/order" className="view-box-link">
          View all
        </Link>
      }
    >
      {orders === null && <Skeleton className="h-64 rounded-md" />}
      {orders?.length === 0 && (
        <p className="dashboard-empty">No orders yet today.</p>
      )}
      {orders?.length > 0 && (
        <div className="today-list">
          {orders.map((order) => (
            <button
              key={order.id}
              type="button"
              className="today-row"
              onClick={() => onView(order.id)}
            >
              <span className="today-time">
                {format(new Date(order.confirmedAt), "hh:mm a")}
              </span>
              <span className="cell-stack">
                <span className="cell-title">{order.orderNumber}</span>
                <span className="cell-sub">
                  {orderTypeText(order.orderType, order.tableNumber)}
                </span>
              </span>
              <span className="cell-sub today-server">
                {fullName(order.server) || "—"}
              </span>
              <span className="today-amount">
                {formatMoney(order.totalAmount)}
              </span>
              <StatusComp type={order.status} />
            </button>
          ))}
        </div>
      )}
    </ViewBox>
  );
}
