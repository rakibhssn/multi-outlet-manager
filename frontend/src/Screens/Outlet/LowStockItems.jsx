import React, { useMemo } from "react";
import { CustomDialog, CustomTable, StatusComp } from "@/components/custom";
import { StockCell, ThumbCell } from "@/Screens/Layout/TableCells";
import useTableList from "@/hooks/useTableList";
import { API_LINK } from "@/lib/API_LINK";
import { formatMoney } from "@/lib/Functions/Common";
import { LowStockColumn } from "@/lib/TableData/Columns";

const DEFAULT_PARAMS = { page: 1, per_page: 10 };

export default function LowStockItems({
  open,
  outletId,
  lowLimit,
  criticalLimit,
  onClose,
}) {
  const { rows, offset, reload, reset, params, ...table } = useTableList({
    url: API_LINK.OutletLowStock,
    defaults: DEFAULT_PARAMS,
    initialParams: { branchId: outletId || undefined },
    enabled: open,
    errorText: "Failed to load low stock items",
  });

  const items = useMemo(
    () =>
      rows.map((row, index) => ({
        key: row.id,
        id: 1 + index + offset,
        name: (
          <ThumbCell
            image={row.image}
            title={row.name}
            subtitle={row.menu?.name}
          />
        ),
        price: formatMoney(row.price),
        stock: <StockCell stock={row.stock} />,
        level: <StatusComp type={row.level} />,
      })),
    [rows, offset],
  );

  return (
    <CustomDialog
      open={open}
      openChange={(next) => {
        if (!next) {
          reset();
          onClose?.();
        }
      }}
      title="Low Stock Items"
      description={`Items with ${lowLimit} or fewer left, lowest first. Critical means ${criticalLimit} or fewer.`}
      footer={false}
      className="item-outlets-dialog"
    >
      <CustomTable
        columns={LowStockColumn}
        dataSource={items}
        rowKey="key"
        loading={table.loading}
        total={table.total}
        pageSize={params.per_page}
        onChange={table.onChange}
        onSearch={table.onSearch}
        reloadAction={reload}
        showReload={true}
        searchPlaceholder="Search items..."
        emptyText="Every item has enough stock"
        className="table-card-plain"
      />
    </CustomDialog>
  );
}
