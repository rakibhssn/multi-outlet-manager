import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAtom } from "jotai";
import { ActionComp, CustomTable, StatusComp } from "@/components/custom";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { formatMoney } from "@/lib/Functions/Common";
import { OutletItemColumn } from "@/lib/TableData/Columns";
import { confirmModal, emptyNotifyData, notificationModal } from "@/lib/Variables";
import OutletPriceDialog from "@/Screens/HQ/MenuItem/OutletPriceDialog";
import OutletAssignItem from "./OutletAssignItem";

const DEFAULT_PARAMS = {
  page: 1,
  per_page: 10,
  sort_by: "createdAt",
  order_by: "desc",
};

const SEARCH_DEBOUNCE = 400;

export default function OutletItemList({ outlet, onChange }) {
  const [, setConfirmation] = useAtom(confirmModal);
  const [, setNotification] = useAtom(notificationModal);
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [data, setData] = useState({ data: [], total: 0 });
  const [menuOptions, setMenuOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [priceRow, setPriceRow] = useState(null);

  const fetchItems = useCallback(() => {
    if (!outlet?.id) return;
    setLoading(true);

    ApiService.get(API_LINK.MenuItem, { params: { ...params, outletId: outlet.id } })
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
          description: error?.response?.data?.message ?? "Failed to load items",
          type: "error",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [outlet?.id, params, setNotification]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    ApiService.get(API_LINK.Menu, { params: { per_page: 100, sort_by: "name", order_by: "asc" } })
      .then((res) => {
        if (res.status === "success") {
          setMenuOptions((res?.data ?? []).map((menu) => ({ label: menu.name, value: menu.id })));
        }
      })
      .catch(() => setMenuOptions([]));
  }, []);

  const removeItem = useCallback(
    (row) => {
      ApiService.delete(API_LINK.MenuItemOutlet(row.id, outlet.id))
        .then((res) => {
          setNotification({
            open: true,
            title: res.status === "success" ? "Success" : "Error",
            description: res?.message,
            type: res.status === "success" ? "success" : "error",
          });
          if (res.status === "success") {
            fetchItems();
            onChange?.();
            setConfirmation(emptyNotifyData);
          }
        })
        .catch((error) => {
          setNotification({
            open: true,
            title: "Error",
            description: error?.response?.data?.message ?? "Failed to remove item",
            type: "error",
          });
        });
    },
    [outlet?.id, fetchItems, onChange, setConfirmation, setNotification],
  );

  const handleRemove = useCallback(
    (row) => {
      const confirmationPayload = {
        open: true,
        title: "Remove Item",
        description: "",
        body: `"${outlet?.name}" will stop selling "${row.name}". Continue?`,
        type: "success",
        footer: true,
        cancelButton: true,
        remove: true,
        submitLabel: "Remove",
        submitClick: () => removeItem(row),
      };

      setConfirmation(confirmationPayload);
    },
    [outlet?.name, removeItem, setConfirmation],
  );

  const columns = useMemo(() => OutletItemColumn.filter((column) => !["id", "status"].includes(column.key)), []);

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
      defaultPrice: <span className="price-inherit">{formatMoney(row.defaultPrice)}</span>,
      outletPrice:
        row.outletPrice !== null && row.outletPrice !== undefined ? (
          <span className="price-override">{formatMoney(row.outletPrice)}</span>
        ) : (
          <span className="price-inherit">Default</span>
        ),
      stock:
        row.stock > 0 ? (
          <span className="stock-count">{row.stock}</span>
        ) : (
          <span className="stock-out">Out</span>
        ),
      status: <StatusComp type={row.status} />,
      action: (
        <ActionComp
          className="justify-end"
          edit={true}
          editTitle="Price & stock"
          editAction={() =>
            setPriceRow({
              menuItemId: row.id,
              outletId: outlet.id,
              itemName: row.name,
              outletName: outlet.name,
              price: row.outletPrice,
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
  }, [data, params.page, params.per_page, outlet, handleRemove]);

  const handleChanges = useCallback(({ page, pageSize, sortField, sort, filter }) => {
    setParams((prev) => ({
      ...prev,
      page,
      per_page: pageSize,
      sort_by: sortField ?? DEFAULT_PARAMS.sort_by,
      order_by: sort?.direction ?? DEFAULT_PARAMS.order_by,
      menuId: filter ?? undefined,
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
    <div className="page-section">
      <CustomTable
        title="Assigned Items"
        description="Menu items sold at this outlet, their price and stock here"
        columns={columns}
        dataSource={items}
        rowKey="key"
        loading={loading}
        total={data.total}
        pageSize={params.per_page}
        onChange={handleChanges}
        onSearch={debouncedSearch}
        filterOptions={menuOptions}
        filterPlaceholder="All menus"
        addLabel="Assign Items"
        onAdd={() => setOpenAssign(true)}
        reloadAction={fetchItems}
        showReload={true}
        searchPlaceholder="Search items..."
        emptyText="No item assigned yet"
      />

      <OutletAssignItem
        open={openAssign}
        outlet={outlet}
        menuOptions={menuOptions}
        onClose={() => setOpenAssign(false)}
        onSaved={() => {
          setOpenAssign(false);
          fetchItems();
          onChange?.();
        }}
      />

      <OutletPriceDialog
        open={!!priceRow}
        assignment={priceRow}
        onClose={() => setPriceRow(null)}
        onSaved={() => {
          setPriceRow(null);
          fetchItems();
          onChange?.();
        }}
      />
    </div>
  );
}
