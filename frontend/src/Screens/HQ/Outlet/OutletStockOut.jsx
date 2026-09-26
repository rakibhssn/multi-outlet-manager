import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAtom } from "jotai";
import { ActionComp, CustomDialog, CustomTable } from "@/components/custom";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { formatMoney } from "@/lib/Functions/Common";
import { StockOutColumn } from "@/lib/TableData/Columns";
import { notificationModal } from "@/lib/Variables";
import OutletPriceDialog from "@/Screens/HQ/MenuItem/OutletPriceDialog";

const DEFAULT_PARAMS = {
  page: 1,
  per_page: 10,
  sort_by: "name",
  order_by: "asc",
};

const SEARCH_DEBOUNCE = 400;

export default function OutletStockOut({ open, outlet, onClose, onChange }) {
  const [, setNotification] = useAtom(notificationModal);
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [data, setData] = useState({ data: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [stockRow, setStockRow] = useState(null);

  const fetchItems = useCallback(() => {
    if (!open || !outlet?.id) return;
    setLoading(true);

    ApiService.get(API_LINK.MenuItem, {
      params: { ...params, outletId: outlet.id, stockStatus: "out" },
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
          description: error?.response?.data?.message ?? "Failed to load stocked out items",
          type: "error",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, outlet?.id, params, setNotification]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const items = useMemo(() => {
    if (!data.data || data.data.length === 0) return [];

    const offset = (params.page - 1) * params.per_page;

    return data.data.map((row, index) => ({
      key: row.id,
      id: 1 + index + offset,
      name: (
        <div className="cell-stack">
          <span className="cell-title">{row.name}</span>
          <span className="cell-sub">{row.menu?.name}</span>
        </div>
      ),
      price: formatMoney(row.effectivePrice),
      stock: <span className="stock-out">Out</span>,
      action: (
        <ActionComp
          className="justify-end"
          edit={true}
          editTitle="Update stock"
          editAction={() =>
            setStockRow({
              menuItemId: row.id,
              outletId: outlet.id,
              itemName: row.name,
              outletName: outlet.name,
              price: row.outletPrice,
              stock: row.stock,
              defaultPrice: row.defaultPrice,
            })
          }
        />
      ),
    }));
  }, [data, params.page, params.per_page, outlet]);

  const handleChanges = useCallback(({ page, pageSize }) => {
    setParams((prev) => ({ ...prev, page, per_page: pageSize }));
  }, []);

  const handleSearch = useCallback((value) => {
    const search = value.trim();
    setParams((prev) => ({ ...prev, page: 1, search_by: search || undefined }));
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
      title="Stocked Out Items"
      description={`Items with no stock left at "${outlet?.name ?? ""}".`}
      footer={false}
      className="item-outlets-dialog"
    >
      <CustomTable
        columns={StockOutColumn}
        dataSource={items}
        rowKey="key"
        loading={loading}
        total={data.total}
        pageSize={params.per_page}
        onChange={handleChanges}
        onSearch={debouncedSearch}
        reloadAction={fetchItems}
        showReload={true}
        searchPlaceholder="Search items..."
        emptyText="Nothing is stocked out here"
        className="table-card-plain"
      />

      <OutletPriceDialog
        open={!!stockRow}
        assignment={stockRow}
        onClose={() => setStockRow(null)}
        onSaved={() => {
          setStockRow(null);
          fetchItems();
          onChange?.();
        }}
      />
    </CustomDialog>
  );
}
