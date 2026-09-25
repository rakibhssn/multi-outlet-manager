import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useSetAtom } from "jotai";
import { ActionComp, CustomTable, StatusComp } from "@/components/custom";
import { PageHeader } from "@/Screens/Layout/DashboardBlocks";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { confirmModal, emptyNotifyData, notificationModal } from "@/lib/Variables";
import MenuEntry from "./MenuEntry";

export default function MenuList() {
  const setNotification = useSetAtom(notificationModal);
  const setConfirmation = useSetAtom(confirmModal);
  const navigate = useNavigate();
  const [menus, setMenus] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, perPage: 10, total: 0 });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState({ open: false, menu: null });

  const { page, perPage } = pagination;

  const fetchMenus = useCallback(() => {
    setLoading(true);

    ApiService.get(API_LINK.Menu, {
      params: { page, perPage, search: debouncedSearch || undefined },
    })
      .then((res) => {
        if (res.status === "success") {
          const items = res?.data?.items ?? [];
          const total = res?.data?.pagination?.total ?? 0;
          setMenus(items);
          setPagination((prev) =>
            !items.length && prev.page > 1
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
          description: error?.response?.data?.message ?? "Failed to load menus",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, perPage, debouncedSearch, setNotification]);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  useEffect(() => {
    const next = search.trim();
    if (next === debouncedSearch) return undefined;
    const timer = setTimeout(() => {
      setDebouncedSearch(next);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);

  function toggleStatus(menu) {
    ApiService.patch(API_LINK.MenuStatus(menu.id))
      .then((res) => {
        if (res.status === "success") {
          setNotification({
            open: true,
            title: "Success",
            description: res?.message,
          });
          fetchMenus();
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
          description: error?.response?.data?.message ?? "Failed to change status",
        });
      });
  }

  function confirmDelete(menu) {
    setConfirmation({
      open: true,
      title: "Delete Menu",
      description: `"${menu.name}" will be removed permanently.`,
      footer: true,
      remove: true,
      submitLabel: "Delete",
      submitClick: () =>
        ApiService.delete(API_LINK.MenuDetails(menu.id))
          .then((res) => {
            if (res.status === "success") {
              setNotification({
                open: true,
                title: "Success",
                description: res?.message,
              });
              fetchMenus();
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
              description: error?.response?.data?.message ?? "Failed to delete menu",
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
      title: "Menu",
      dataIndex: "name",
      render: (name, record) => (
        <div className="menu-cell">
          {record.menuImage ? (
            <img src={record.menuImage} alt={name} className="menu-thumb" />
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
      key: "items",
      title: "Items",
      dataIndex: "_count.menuItems",
      align: "center",
    },
    {
      key: "status",
      title: "Status",
      dataIndex: "status",
      render: (status, record) => (
        <StatusComp type={status} onClick={() => toggleStatus(record)} />
      ),
    },
    {
      key: "actions",
      title: "Actions",
      align: "right",
      render: (_, record) => (
        <ActionComp
          className="justify-end"
          view
          viewTitle="View items"
          viewAction={() => navigate(`/hq/menu-item?menuId=${record.id}`)}
          edit
          editTitle="Edit menu"
          editAction={() => setEntry({ open: true, menu: record })}
          remove
          deleteTitle="Delete menu"
          deleteAction={() => confirmDelete(record)}
        />
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader title="Menus" subtitle="Group your items into menus like Breakfast or Drinks" />

      <CustomTable
        columns={columns}
        dataSource={menus}
        loading={loading}
        searchPlaceholder="Search menus..."
        searchValue={search}
        onSearchChange={setSearch}
        total={pagination.total}
        page={page}
        pageSize={perPage}
        onPageChange={(next) => setPagination((prev) => ({ ...prev, page: next }))}
        onPageSizeChange={(size) =>
          setPagination((prev) => ({ ...prev, perPage: size, page: 1 }))
        }
        emptyMessage="No menus yet"
        onReload={fetchMenus}
        onAdd={() => setEntry({ open: true, menu: null })}
        addLabel="Add Menu"
      />

      <MenuEntry
        open={entry.open}
        menu={entry.menu}
        onClose={() => setEntry({ open: false, menu: null })}
        onSaved={() => {
          setEntry({ open: false, menu: null });
          fetchMenus();
        }}
      />
    </div>
  );
}
