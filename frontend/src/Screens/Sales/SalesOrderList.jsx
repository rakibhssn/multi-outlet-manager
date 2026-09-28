import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { LuPlus } from "react-icons/lu";
import { ActionComp, AnimateButton, CustomTable } from "@/components/custom";
import { PageHeader } from "@/Screens/Layout/DashboardBlocks";
import useCan from "@/hooks/useCan";
import useNotify from "@/hooks/useNotify";
import useRemoteOptions from "@/hooks/useRemoteOptions";
import useScope from "@/hooks/useScope";
import useTableList from "@/hooks/useTableList";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { ORDER_STATUS_OPTIONS } from "@/lib/Constant";
import { outletOption } from "@/lib/Functions/Common";
import { SalesOrderColumn } from "@/lib/TableData/Columns";
import { orderCells } from "./OrderParts";
import OrderSlip from "./OrderSlip";
import SalesOrderDetails from "./SalesOrderDetails";

const DEFAULT_PARAMS = {
  page: 1,
  per_page: 10,
  sort_by: "confirmedAt",
  order_by: "desc",
};

export default function SalesOrderList() {
  const navigate = useNavigate();
  const scope = useScope();
  const notify = useNotify();
  const can = useCan();
  const canSlip = can("orders.slip");
  const outletLocked = !!scope.outletId;
  const { rows, offset, reload, params, ...table } = useTableList({
    url: API_LINK.SalesOrder,
    defaults: DEFAULT_PARAMS,
    initialParams: {
      branchId: scope.outletId || undefined,
      companyId: scope.companyId || undefined,
    },
    filterParam: outletLocked ? "status" : "branchId",
    errorText: "Failed to load sales orders",
  });
  const [detailId, setDetailId] = useState(null);
  const [slipOrder, setSlipOrder] = useState(null);

  const outletFilter = useRemoteOptions({
    url: API_LINK.Outlet,
    params: { companyId: scope.companyId || undefined },
    mapOption: outletOption,
    enabled: !outletLocked,
    errorText: "Failed to load outlets",
  });

  const columns = useMemo(
    () =>
      SalesOrderColumn.filter(
        (column) => column.key !== "outlet" || !outletLocked,
      ),
    [outletLocked],
  );

  const orders = useMemo(() => {
    const openSlip = (item) =>
      notify.load(ApiService.get(API_LINK.SalesOrderDetails(item.id)), {
        errorText: "Failed to load order",
        onSuccess: (res) => setSlipOrder(res.data),
      });

    return rows.map((item, index) => ({
      key: item.id,
      id: 1 + index + offset,
      ...orderCells(item),
      action: (
        <ActionComp
          className="justify-end"
          view={true}
          viewTitle="View order"
          viewAction={() => setDetailId(item.id)}
          download={canSlip && item.status !== "CANCELLED"}
          downloadTitle="Order slip"
          downloadAction={() => openSlip(item)}
        />
      ),
    }));
  }, [rows, offset, canSlip, notify]);

  return (
    <div className="page">
      <PageHeader
        title="Sales Orders"
        subtitle={
          outletLocked
            ? `Food & beverage orders taken at ${scope.outletName ?? "this outlet"}`
            : "Food & beverage orders taken at every outlet"
        }
        actions={
          outletLocked &&
          can("orders.create") && (
            <AnimateButton
              preIcon={LuPlus}
              label="New Order"
              onClick={() => navigate("/outlet/pos")}
            />
          )
        }
      />

      <CustomTable
        columns={columns}
        dataSource={orders}
        rowKey="key"
        loading={table.loading}
        total={table.total}
        pageSize={params.per_page}
        onChange={table.onChange}
        onSearch={table.onSearch}
        filterOptions={
          outletLocked ? ORDER_STATUS_OPTIONS : outletFilter.options
        }
        filterPlaceholder={outletLocked ? "All statuses" : "All outlets"}
        onFilterSearch={outletLocked ? undefined : outletFilter.onSearch}
        filterLoading={outletFilter.loading}
        reloadAction={reload}
        showReload={true}
        searchPlaceholder="Search order no, customer or table..."
        emptyText="No sales order has been placed yet"
      />

      <SalesOrderDetails
        open={!!detailId}
        orderId={detailId}
        onClose={() => setDetailId(null)}
        onChange={reload}
      />

      <OrderSlip
        open={!!slipOrder}
        order={slipOrder}
        onClose={() => setSlipOrder(null)}
        onPrinted={(order) => {
          setSlipOrder(order);
          reload();
        }}
      />
    </div>
  );
}
