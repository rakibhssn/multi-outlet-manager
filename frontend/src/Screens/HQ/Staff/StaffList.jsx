import React, { useCallback, useEffect, useState } from "react";
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
import { DESIGNATION_OPTIONS, EMPLOYMENT_TYPE_OPTIONS } from "@/lib/Constant";
import { confirmModal, emptyNotifyData, notificationModal } from "@/lib/Variables";
import useScope from "@/hooks/useScope";
import StaffEntry from "./StaffEntry";

const labelOf = (options, value) =>
  options.find((option) => option.value === value)?.label ?? value;

export default function StaffList({ branchId: fixedBranchId, onChange }) {
  const setNotification = useSetAtom(notificationModal);
  const setConfirmation = useSetAtom(confirmModal);
  const [staffs, setStaffs] = useState([]);
  const [outletOptions, setOutletOptions] = useState([]);
  const scope = useScope();
  const lockedBranchId = fixedBranchId ?? scope.outletId ?? "";
  const outletLocked = !!lockedBranchId;
  const [branchId, setBranchId] = useState(lockedBranchId);
  const embedded = !!fixedBranchId;
  const [pagination, setPagination] = useState({ page: 1, perPage: 10, total: 0 });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState({ open: false, staff: null });

  const { page, perPage } = pagination;

  const fetchStaffs = useCallback(() => {
    setLoading(true);

    ApiService.get(API_LINK.Staff, {
      params: {
        page,
        perPage,
        search: debouncedSearch || undefined,
        branchId: branchId || undefined,
        companyId: scope.companyId || undefined,
      },
    })
      .then((res) => {
        if (res.status === "success") {
          const items = res?.data?.items ?? [];
          const total = res?.data?.pagination?.total ?? 0;
          setStaffs(items);
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
          description: error?.response?.data?.message ?? "Failed to load staff",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, perPage, debouncedSearch, branchId, scope.companyId, setNotification]);

  useEffect(() => {
    fetchStaffs();
  }, [fetchStaffs]);

  useEffect(() => {
    ApiService.get(API_LINK.Outlet, {
      params: { perPage: 100, companyId: scope.companyId || undefined },
    })
      .then((res) => {
        if (res.status === "success") {
          setOutletOptions(
            (res?.data?.items ?? []).map((item) => ({
              label: item.parent?.name ? `${item.name} (${item.parent.name})` : item.name,
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
          description: error?.response?.data?.message ?? "Failed to load outlets",
        });
      });
  }, [scope.companyId, setNotification]);

  useEffect(() => {
    const next = search.trim();
    if (next === debouncedSearch) return undefined;
    const timer = setTimeout(() => {
      setDebouncedSearch(next);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);

  function toggleStatus(staff) {
    ApiService.patch(API_LINK.StaffStatus(staff.id))
      .then((res) => {
        if (res.status === "success") {
          setNotification({
            open: true,
            title: "Success",
            description: res?.message,
          });
          fetchStaffs();
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

  function confirmDelete(staff) {
    setConfirmation({
      open: true,
      title: "Delete Staff",
      description: `"${staff.firstName} ${staff.lastName}" and their login account will be removed permanently.`,
      footer: true,
      remove: true,
      submitLabel: "Delete",
      submitClick: () =>
        ApiService.delete(API_LINK.StaffDetails(staff.id))
          .then((res) => {
            if (res.status === "success") {
              setNotification({
                open: true,
                title: "Success",
                description: res?.message,
              });
              fetchStaffs();
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
              description: error?.response?.data?.message ?? "Failed to delete staff",
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
      title: "Staff",
      dataIndex: "firstName",
      render: (firstName, record) => (
        <div className="cell-stack">
          <span className="cell-title">{`${firstName} ${record.lastName}`}</span>
          <span className="cell-sub">Badge {record.badgeNumber}</span>
        </div>
      ),
    },
    ...(outletLocked
      ? []
      : [
          {
            key: "outlet",
            title: "Outlet",
            dataIndex: "outlet.name",
            render: (name, record) => (
              <div className="cell-stack">
                <span className="cell-title">{name}</span>
                <span className="cell-sub">{record.outlet?.parent?.name}</span>
              </div>
            ),
          },
        ]),
    {
      key: "job",
      title: "Job",
      dataIndex: "designation",
      render: (designation, record) => (
        <div className="cell-stack">
          <span className="cell-title">{labelOf(DESIGNATION_OPTIONS, designation)}</span>
          <span className="cell-sub">
            {labelOf(EMPLOYMENT_TYPE_OPTIONS, record.employmentType)}
          </span>
        </div>
      ),
    },
    {
      key: "contact",
      title: "Contact",
      dataIndex: "phone",
      render: (phone, record) => (
        <div className="cell-stack">
          <span className="cell-title">{phone}</span>
          <span className="cell-sub">{record.email}</span>
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
          edit
          editTitle="Edit staff"
          editAction={() => setEntry({ open: true, staff: record })}
          remove
          deleteTitle="Delete staff"
          deleteAction={() => confirmDelete(record)}
        />
      ),
    },
  ];

  return (
    <div className={embedded ? "page-section" : "page"}>
      {!embedded && (
        <PageHeader title="Staffs" subtitle="Staff working in each outlet and their login accounts" />
      )}

      <CustomTable
        columns={columns}
        dataSource={staffs}
        loading={loading}
        title={embedded ? "Staffs" : undefined}
        description={embedded ? "Staff working in this outlet" : undefined}
        searchPlaceholder="Search name, badge, phone or job..."
        searchValue={search}
        onSearchChange={setSearch}
        actions={
          !outletLocked && (
            <CustomSelectField
              name="outletFilter"
              placeholder="All outlets"
              options={[{ label: "All outlets", value: "all" }, ...outletOptions]}
              value={branchId || "all"}
              onValueChange={(value) => {
                setBranchId(value === "all" ? "" : value);
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
        emptyMessage="No staff yet"
        onReload={fetchStaffs}
        onAdd={() => setEntry({ open: true, staff: null })}
        addLabel="Add Staff"
      />

      <StaffEntry
        open={entry.open}
        staff={entry.staff}
        branchId={branchId}
        outletOptions={outletOptions}
        lockOutlet={outletLocked}
        onClose={() => setEntry({ open: false, staff: null })}
        onSaved={() => {
          setEntry({ open: false, staff: null });
          fetchStaffs();
          onChange?.();
        }}
      />
    </div>
  );
}
