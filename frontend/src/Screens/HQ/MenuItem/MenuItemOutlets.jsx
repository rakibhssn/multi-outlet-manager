import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAtom } from "jotai";
import { ActionComp, CustomDialog, CustomTable, StatusComp } from "@/components/custom";
import useScope from "@/hooks/useScope";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { formatMoney } from "@/lib/Functions/Common";
import { MenuItemOutletColumn } from "@/lib/TableData/Columns";
import { confirmModal, emptyNotifyData, notificationModal } from "@/lib/Variables";
import MenuItemAssignOutlet from "./MenuItemAssignOutlet";
import OutletPriceDialog from "./OutletPriceDialog";

const DEFAULT_PARAMS = {
  page: 1,
  per_page: 10,
  sort_by: "createdAt",
  order_by: "desc",
};

const SEARCH_DEBOUNCE = 400;

export default function MenuItemOutlets({ open, item, onClose, onChange }) {
  const scope = useScope();
  const [, setConfirmation] = useAtom(confirmModal);
  const [, setNotification] = useAtom(notificationModal);
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [data, setData] = useState({ data: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [priceRow, setPriceRow] = useState(null);

  const fetchOutlets = useCallback(() => {
    if (!open || !item?.id) return;
    setLoading(true);

    ApiService.get(API_LINK.MenuItemOutlets(item.id), {
      params: { ...params, companyId: scope.companyId || undefined },
    })
      .then((res) => {
        if (res.status === "success") {
          setData({ data: res?.data ?? [], total: res?.total ?? 0 });
        } else {
          setNotification({
            open: true,
            title: "Error",
            description: res.message,
            type: "error",
          });
        }
      })
      .catch((error) => {
        setNotification({
          open: true,
          title: "Error",
          description: error?.response?.data?.message ?? "Failed to load outlets",
          type: "error",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, item?.id, params, scope.companyId, setNotification]);

  useEffect(() => {
    fetchOutlets();
  }, [fetchOutlets]);

  const removeOutlet = useCallback(
    (row) => {
      ApiService.delete(API_LINK.MenuItemOutlet(item.id, row.branchId))
        .then((res) => {
          setNotification({
            open: true,
            title: res.status === "success" ? "Success" : "Error",
            description: res?.message,
            type: res.status === "success" ? "success" : "error",
          });
          if (res.status === "success") {
            fetchOutlets();
            onChange?.();
            setConfirmation(emptyNotifyData);
          }
        })
        .catch((error) => {
          setNotification({
            open: true,
            title: "Error",
            description: error?.response?.data?.message ?? "Failed to remove outlet",
            type: "error",
          });
        });
    },
    [item?.id, fetchOutlets, onChange, setConfirmation, setNotification],
  );

  const handleRemove = useCallback(
    (row) => {
      const confirmationPayload = {
        open: true,
        title: "Remove Outlet",
        description: "",
        body: `"${row.outlet?.name}" will stop selling "${item?.name}". Continue?`,
        type: "success",
        footer: true,
        cancelButton: true,
        remove: true,
        submitLabel: "Remove",
        submitClick: () => removeOutlet(row),
      };

      setConfirmation(confirmationPayload);
    },
    [item?.name, removeOutlet, setConfirmation],
  );

  const outlets = useMemo(() => {
    if (!data.data || data.data.length === 0) return [];

    const offset = (params.page - 1) * params.per_page;

    return data.data.map((row, index) => ({
      key: row.id,
      id: 1 + index + offset,
      name: (
        <div className="cell-stack">
          <span className="cell-title">{row.outlet?.name}</span>
          <span className="cell-sub">{row.outlet?.parent?.name}</span>
        </div>
      ),
      defaultPrice: <span className="price-inherit">{formatMoney(row.defaultPrice)}</span>,
      outletPrice:
        row.price !== null ? (
          <span className="price-override">{formatMoney(row.price)}</span>
        ) : (
          <span className="price-inherit">Default</span>
        ),
      stock:
        row.stock > 0 ? (
          <span className="stock-count">{row.stock}</span>
        ) : (
          <span className="stock-out">Out</span>
        ),
      status: <StatusComp type={row.outlet?.status} />,
      action: (
        <ActionComp
          className="justify-end"
          edit={true}
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
          remove={true}
          deleteTitle="Remove"
          deleteAction={() => handleRemove(row)}
        />
      ),
    }));
  }, [data, params.page, params.per_page, item, handleRemove]);

  const handleChanges = useCallback(({ page, pageSize, sortField, sort }) => {
    setParams((prev) => ({
      ...prev,
      page,
      per_page: pageSize,
      sort_by: sortField ?? DEFAULT_PARAMS.sort_by,
      order_by: sort?.direction ?? DEFAULT_PARAMS.order_by,
    }));
  }, []);

  const handleSearch = useCallback((value) => {
    const search = value.trim();
    setParams((prev) => ({
      ...prev,
      page: 1,
      search_by: search || undefined,
    }));
  }, []);

  const searchTimer = useRef(null);

  const debouncedSearch = useCallback(
    (value) => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => handleSearch(value), SEARCH_DEBOUNCE);
    },
    [handleSearch],
  );

  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    [],
  );

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
        columns={MenuItemOutletColumn}
        dataSource={outlets}
        rowKey="key"
        loading={loading}
        total={data.total}
        pageSize={params.per_page}
        onChange={handleChanges}
        onSearch={debouncedSearch}
        addLabel="Assign Outlets"
        onAdd={() => setOpenAssign(true)}
        reloadAction={fetchOutlets}
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
          fetchOutlets();
          onChange?.();
        }}
      />

      <OutletPriceDialog
        open={!!priceRow}
        assignment={priceRow}
        onClose={() => setPriceRow(null)}
        onSaved={() => {
          setPriceRow(null);
          fetchOutlets();
        }}
      />
    </CustomDialog>
  );
}
