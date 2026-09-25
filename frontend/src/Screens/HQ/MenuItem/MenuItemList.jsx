import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useSetAtom } from "jotai";
import {
  ActionComp,
  CustomSelectField,
  CustomTable,
  StatusComp,
} from "@/components/custom";
import { PageHeader } from "@/Screens/Layout/DashboardBlocks";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { confirmModal, emptyNotifyData, notificationModal } from "@/lib/Variables";
import MenuItemEntry from "./MenuItemEntry";

const money = (value) => Number(value ?? 0).toFixed(2);

export default function MenuItemList() {
  const setNotification = useSetAtom(notificationModal);
  const setConfirmation = useSetAtom(confirmModal);
  const [searchParams, setSearchParams] = useSearchParams();
  const menuId = searchParams.get("menuId") ?? "";
  const [items, setItems] = useState([]);
  const [menuOptions, setMenuOptions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, perPage: 10, total: 0 });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState({ open: false, item: null });

  const { page, perPage } = pagination;

  const fetchItems = useCallback(() => {
    setLoading(true);

    ApiService.get(API_LINK.MenuItem, {
      params: {
        page,
        perPage,
        search: debouncedSearch || undefined,
        menuId: menuId || undefined,
      },
    })
      .then((res) => {
        if (res.status === "success") {
          const rows = res?.data?.items ?? [];
          const total = res?.data?.pagination?.total ?? 0;
          setItems(rows);
          setPagination((prev) =>
            !rows.length && prev.page > 1
              ? { ...prev, total, page: prev.page - 1 }
              : { ...prev, total },
          );
        } else {
          setNotification({
            open: true,
            title: "Error",
            description: res.message,
          });
        }
      })
      .catch((error) => {
        setNotification({
          open: true,
          title: "Error",
          description: error?.response?.data?.message ?? "Failed to load menu items",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, perPage, debouncedSearch, menuId, setNotification]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    ApiService.get(API_LINK.Menu, { params: { perPage: 100 } })
      .then((res) => {
        if (res.status === "success") {
          setMenuOptions(
            (res?.data?.items ?? []).map((menu) => ({ label: menu.name, value: menu.id })),
          );
        } else {
          setNotification({
            open: true,
            title: "Error",
            description: res.message,
          });
        }
      })
      .catch((error) => {
        setNotification({
          open: true,
          title: "Error",
          description: error?.response?.data?.message ?? "Failed to load menus",
        });
      });
  }, [setNotification]);

  useEffect(() => {
    const next = search.trim();
    if (next === debouncedSearch) return undefined;
    const timer = setTimeout(() => {
      setDebouncedSearch(next);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);

  function confirmDelete(item) {
    setConfirmation({
      open: true,
      title: "Delete Menu Item",
      description: `"${item.name}" and its price history will be removed permanently.`,
      footer: true,
      remove: true,
      submitLabel: "Delete",
      submitClick: () =>
        ApiService.delete(API_LINK.MenuItemDetails(item.id))
          .then((res) => {
            if (res.status === "success") {
              setNotification({
                open: true,
                title: "Success",
                description: res?.message,
              });
              fetchItems();
            } else {
              setNotification({
                open: true,
                title: "Error",
                description: res.message,
              });
            }
          })
          .catch((error) => {
            setNotification({
              open: true,
              title: "Error",
              description: error?.response?.data?.message ?? "Failed to delete menu item",
            });
          })
          .finally(() => {
            setConfirmation(emptyNotifyData);
          }),
    });
  }

  const columns = [
    {
      key: "name",
      title: "Item",
      dataIndex: "name",
      render: (name, record) => (
        <div className="menu-cell">
          {record.menuItemImage ? (
            <img src={record.menuItemImage} alt={name} className="menu-thumb" />
          ) : (
            <span className="menu-thumb menu-thumb-empty">{name?.charAt(0)}</span>
          )}
          <div className="cell-stack">
            <span className="cell-title">{name}</span>
            {record.description && <span className="cell-sub">{record.description}</span>}
          </div>
        </div>
      ),
    },
    {
      key: "menu",
      title: "Menu",
      dataIndex: "menu.name",
    },
    {
      key: "price",
      title: "Price",
      dataIndex: "menuItemPrices.0.price",
      align: "right",
      render: (price, record) => {
        const latest = record.menuItemPrices?.[0];
        if (!latest) return "—";
        const discounted = Number(latest.price) < Number(latest.basePrice);
        return (
          <div className="price-cell">
            <span className="cell-title">{money(latest.price)}</span>
            {discounted && <span className="price-base">{money(latest.basePrice)}</span>}
          </div>
        );
      },
    },
    {
      key: "status",
      title: "Status",
      dataIndex: "status",
      render: (status) => <StatusComp type={status} />,
    },
    {
      key: "actions",
      title: "Actions",
      align: "right",
      render: (_, record) => (
        <ActionComp
          className="justify-end"
          edit
          editTitle="Edit item"
          editAction={() => setEntry({ open: true, item: record })}
          remove
          deleteTitle="Delete item"
          deleteAction={() => confirmDelete(record)}
        />
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader title="Menu Items" subtitle="Items on each menu with their current price" />

      <CustomTable
        columns={columns}
        dataSource={items}
        loading={loading}
        searchPlaceholder="Search items..."
        searchValue={search}
        onSearchChange={setSearch}
        actions={
          <CustomSelectField
            name="menuFilter"
            placeholder="All menus"
            options={[{ label: "All menus", value: "all" }, ...menuOptions]}
            value={menuId || "all"}
            onValueChange={(value) => {
              setSearchParams(value === "all" ? {} : { menuId: value });
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="table-filter"
          />
        }
        total={pagination.total}
        page={page}
        pageSize={perPage}
        onPageChange={(next) => setPagination((prev) => ({ ...prev, page: next }))}
        onPageSizeChange={(size) =>
          setPagination((prev) => ({ ...prev, perPage: size, page: 1 }))
        }
        emptyMessage="No menu items yet"
        onReload={fetchItems}
        onAdd={() => setEntry({ open: true, item: null })}
        addLabel="Add Item"
      />

      <MenuItemEntry
        open={entry.open}
        item={entry.item}
        menuId={menuId}
        menuOptions={menuOptions}
        onClose={() => setEntry({ open: false, item: null })}
        onSaved={() => {
          setEntry({ open: false, item: null });
          fetchItems();
        }}
      />
    </div>
  );
}
