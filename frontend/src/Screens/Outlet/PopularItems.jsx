import React, { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewBox } from "@/Screens/Layout/DashboardBlocks";
import { ThumbCell } from "@/Screens/Layout/TableCells";
import useNotify from "@/hooks/useNotify";
import usePolling from "@/hooks/usePolling";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { formatMoney, plural } from "@/lib/Functions/Common";

const REFRESH_INTERVAL = 60000;

export default function PopularItems({ outletId, refreshKey }) {
  const notify = useNotify();
  const [data, setData] = useState(null);

  usePolling(
    () => {
      notify.load(
        ApiService.get(API_LINK.OutletPopularItems, {
          params: { branchId: outletId || undefined },
        }),
        {
          errorText: "Failed to load popular items",
          onSuccess: (res) =>
            setData({ rows: res.data ?? [], soldToday: res.soldToday ?? 0 }),
        },
      );
    },
    REFRESH_INTERVAL,
    `${outletId}-${refreshKey}`,
  );

  const top = data?.rows[0]?.quantity || 1;

  return (
    <ViewBox
      title={
        data?.soldToday
          ? `Popular Items · ${plural(data.soldToday, "item")} sold today`
          : "Popular Items"
      }
    >
      {data === null && <Skeleton className="h-48 rounded-md" />}
      {data?.rows.length === 0 && (
        <p className="dashboard-empty">Nothing sold yet today.</p>
      )}
      {data?.rows.length > 0 && (
        <ol className="popular-list">
          {data.rows.map((item, index) => (
            <li key={item.id} className="popular-row">
              <span className="popular-rank">{index + 1}</span>
              <div className="popular-info">
                <ThumbCell
                  image={item.image}
                  title={item.name}
                  subtitle={`${item.menu?.name ?? "—"} · ${plural(item.orders, "order")}`}
                />
                <span className="popular-bar">
                  <span
                    className="popular-bar-fill"
                    style={{ width: `${(item.quantity / top) * 100}%` }}
                  />
                </span>
              </div>
              <span className="popular-figures">
                <span className="popular-qty">{item.quantity} sold</span>
                <span className="cell-sub">{formatMoney(item.revenue)}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </ViewBox>
  );
}
