import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
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
import useScope from "@/hooks/useScope";
import OutletEntry from "./OutletEntry";

export default function OutletList({ companyId: fixedCompanyId, onChange }) {
  const setNotification = useSetAtom(notificationModal);
  const setConfirmation = useSetAtom(confirmModal);
  const navigate = useNavigate();
  const [outlets, setOutlets] = useState([]);
  const [companyOptions, setCompanyOptions] = useState([]);
  const scope = useScope();
  const lockedCompanyId = fixedCompanyId ?? scope.companyId ?? "";
  const companyLocked = !!lockedCompanyId;
  const [companyId, setCompanyId] = useState(lockedCompanyId);
  const embedded = !!fixedCompanyId;
  const [pagination, setPagination] = useState({ page: 1, perPage: 10, total: 0 });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState({ open: false, outlet: null });

  const { page, perPage } = pagination;

  const fetchOutlets = useCallback(() => {
    setLoading(true);

    ApiService.get(API_LINK.Outlet, {
      params: {
        page,
        perPage,
        search: debouncedSearch || undefined,
        companyId: companyId || undefined,
      },
    })
      .then((res) => {
        if (res.status === "success") {
          const items = res?.data?.items ?? [];
          const total = res?.data?.pagination?.total ?? 0;
          setOutlets(items);
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
          description: error?.response?.data?.message ?? "Failed to load outlets",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, perPage, debouncedSearch, companyId, setNotification]);

  useEffect(() => {
    fetchOutlets();
  }, [fetchOutlets]);

  useEffect(() => {
    if (scope.companyId) {
      setCompanyOptions([{ label: scope.companyName, value: scope.companyId }]);
      return;
    }

    ApiService.get(API_LINK.Company, { params: { perPage: 100 } })
      .then((res) => {
        if (res.status === "success") {
          setCompanyOptions(
            (res?.data?.items ?? []).map((item) => ({
              label: item.name,
              value: item.id,
            })),
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
          description: error?.response?.data?.message ?? "Failed to load companies",
        });
      });
  }, [scope.companyId, scope.companyName, setNotification]);

  useEffect(() => {
    const next = search.trim();
    if (next === debouncedSearch) return undefined;
    const timer = setTimeout(() => {
      setDebouncedSearch(next);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);

  function toggleStatus(outlet) {
    ApiService.patch(API_LINK.OutletStatus(outlet.id))
      .then((res) => {
        if (res.status === "success") {
          setNotification({
            open: true,
            title: "Success",
            description: res?.message,
          });
          fetchOutlets();
          onChange?.();
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

  function confirmDelete(outlet) {
    setConfirmation({
      open: true,
      title: "Delete Outlet",
      description: `"${outlet.name}" and its login account will be removed permanently.`,
      footer: true,
      remove: true,
      submitLabel: "Delete",
      submitClick: () =>
        ApiService.delete(API_LINK.OutletDetails(outlet.id))
          .then((res) => {
            if (res.status === "success") {
              setNotification({
                open: true,
                title: "Success",
                description: res?.message,
              });
              fetchOutlets();
              onChange?.();
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
              description: error?.response?.data?.message ?? "Failed to delete outlet",
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
      title: "Outlet",
      dataIndex: "name",
      render: (name, record) => (
        <div className="cell-stack">
          <span className="cell-title">{name}</span>
          {!companyLocked && <span className="cell-sub">{record.parent?.name}</span>}
        </div>
      ),
    },
    {
      key: "contact",
      title: "Contact Person",
      dataIndex: "contactPersonName",
      render: (name, record) => (
        <div className="cell-stack">
          <span className="cell-title">{name}</span>
          <span className="cell-sub">{record.contactPersonEmail}</span>
          <span className="cell-sub">{record.contactPersonPhone}</span>
        </div>
      ),
    },
    {
      key: "account",
      title: "Login Account",
      dataIndex: "users.0.email",
      render: (email) => <span className="cell-title">{email ?? "No account"}</span>,
    },
    {
      key: "city",
      title: "Location",
      dataIndex: "city",
      render: (city, record) => (
        <div className="cell-stack">
          <span className="cell-title">{city}</span>
          <span className="cell-sub">
            {[record.state, record.country].filter(Boolean).join(", ")}
          </span>
        </div>
      ),
    },
    {
      key: "staffs",
      title: "Staff",
      dataIndex: "_count.staffs",
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
          viewTitle="View outlet"
          viewAction={() => navigate(`/hq/outlet/${record.id}`)}
          edit
          editTitle="Edit outlet"
          editAction={() => setEntry({ open: true, outlet: record })}
          remove
          deleteTitle="Delete outlet"
          deleteAction={() => confirmDelete(record)}
        />
      ),
    },
  ];

  return (
    <div className={embedded ? "page-section" : "page"}>
      {!embedded && (
        <PageHeader
          title="Outlets"
          subtitle="Outlets under each company and their login accounts"
        />
      )}

      <CustomTable
        columns={columns}
        dataSource={outlets}
        loading={loading}
        searchPlaceholder="Search name, contact or location..."
        searchValue={search}
        onSearchChange={setSearch}
        title={embedded ? "Outlets" : undefined}
        description={embedded ? "Outlets under this company" : undefined}
        actions={
          !companyLocked && (
          <CustomSelectField
            name="companyFilter"
            placeholder="All companies"
            options={[{ label: "All companies", value: "all" }, ...companyOptions]}
            value={companyId || "all"}
            onValueChange={(value) => {
              setCompanyId(value === "all" ? "" : value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="table-filter"
          />
          )
        }
        total={pagination.total}
        page={page}
        pageSize={perPage}
        onPageChange={(next) => setPagination((prev) => ({ ...prev, page: next }))}
        onPageSizeChange={(size) =>
          setPagination((prev) => ({ ...prev, perPage: size, page: 1 }))
        }
        emptyMessage="No outlets yet"
        onReload={fetchOutlets}
        onAdd={() => setEntry({ open: true, outlet: null })}
        addLabel="Add Outlet"
      />

      <OutletEntry
        open={entry.open}
        outlet={entry.outlet}
        companyId={companyId}
        companyOptions={companyOptions}
        lockCompany={companyLocked}
        onClose={() => setEntry({ open: false, outlet: null })}
        onSaved={() => {
          setEntry({ open: false, outlet: null });
          fetchOutlets();
          onChange?.();
        }}
      />
    </div>
  );
}
