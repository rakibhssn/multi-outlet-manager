import React, { useMemo, useState } from "react";
import {
  ActionComp,
  CustomDialog,
  CustomTable,
  StatusComp,
} from "@/components/custom";
import {
  OutletPriceCell,
  StackCell,
  StockCell,
} from "@/Screens/Layout/TableCells";
import useCan from "@/hooks/useCan";
import useConfirm from "@/hooks/useConfirm";
import useNotify from "@/hooks/useNotify";
import useScope from "@/hooks/useScope";
import useTableList from "@/hooks/useTableList";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { formatMoney } from "@/lib/Functions/Common";
import { MenuItemOutletColumn } from "@/lib/TableData/Columns";
import MenuItemAssignOutlet from "./MenuItemAssignOutlet";
import OutletPriceDialog from "./OutletPriceDialog";

const DEFAULT_PARAMS = {
  page: 1,
  per_page: 10,
  sort_by: "createdAt",
  order_by: "desc",
};

export default function MenuItemOutlets({ open, item, onClose, onChange }) {
  const scope = useScope();
  const notify = useNotify();
  const confirm = useConfirm();
  const can = useCan();
  const canStock = can("outlets.stock");
  const { rows, offset, reload, params, ...table } = useTableList({
    url: item?.id ? API_LINK.MenuItemOutlets(item.id) : null,
    defaults: DEFAULT_PARAMS,
    initialParams: { companyId: scope.companyId || undefined },
    enabled: open,
    errorText: "Failed to load outlets",
  });
  const [openAssign, setOpenAssign] = useState(false);
  const [priceRow, setPriceRow] = useState(null);

  const outlets = useMemo(() => {
    const removeOutlet = (row) =>
      confirm.remove({
        title: "Remove Outlet",
        body: `"${row.outlet?.name}" will stop selling "${item?.name}". Continue?`,
        label: "Remove",
        onConfirm: () =>
          notify.submit(
            ApiService.delete(API_LINK.MenuItemOutlet(item.id, row.branchId)),
            {
              errorText: "Failed to remove outlet",
              onSuccess: () => {
                reload();
                onChange?.();
                confirm.close();
              },
            },
          ),
      });

    return rows.map((row, index) => ({
      key: row.id,
      id: 1 + index + offset,
      name: (
        <StackCell
          title={row.outlet?.name}
          subtitle={row.outlet?.parent?.name}
        />
      ),
      defaultPrice: (
        <span className="price-inherit">{formatMoney(row.defaultPrice)}</span>
      ),
      outletPrice: <OutletPriceCell price={row.price} />,
      stock: <StockCell stock={row.stock} />,
      status: <StatusComp type={row.outlet?.status} />,
      action: (
        <ActionComp
          className="justify-end"
          edit={canStock}
          editTitle="Price & stock"
          editAction={() =>
            setPriceRow({
              menuItemId: item.id,
              outletId: row.branchId,
              itemName: item.name,
              outletName: row.outlet?.name,
              price: row.price,
              stock: row.stock,
              defaultPrice: row.defaultPrice,
            })
          }
          remove={canStock}
          deleteTitle="Remove"
          deleteAction={() => removeOutlet(row)}
        />
      ),
    }));
  }, [rows, offset, reload, onChange, item, canStock, notify, confirm]);

  return (
    <CustomDialog
      open={open}
      openChange={(next) => !next && onClose?.()}
      title={item?.name ? `${item.name} · Outlets` : "Outlets"}
      description={`Outlets selling this item. Default price ${formatMoney(item?.defaultPrice)}.`}
      footer={false}
      className="item-outlets-dialog"
    >
      <CustomTable
        columns={
          canStock
            ? MenuItemOutletColumn
            : MenuItemOutletColumn.filter((column) => column.key !== "action")
        }
        dataSource={outlets}
        rowKey="key"
        loading={table.loading}
        total={table.total}
        pageSize={params.per_page}
        onChange={table.onChange}
        onSearch={table.onSearch}
        addLabel="Assign Outlets"
        onAdd={canStock ? () => setOpenAssign(true) : undefined}
        reloadAction={reload}
        showReload={true}
        searchPlaceholder="Search outlets..."
        emptyText="This item is not sold at any outlet yet"
        className="table-card-plain"
      />

      <MenuItemAssignOutlet
        open={openAssign}
        item={item}
        onClose={() => setOpenAssign(false)}
        onSaved={() => {
          setOpenAssign(false);
          reload();
          onChange?.();
        }}
      />

      <OutletPriceDialog
        open={!!priceRow}
        assignment={priceRow}
        onClose={() => setPriceRow(null)}
        onSaved={() => {
          setPriceRow(null);
          reload();
        }}
      />
    </CustomDialog>
  );
}
