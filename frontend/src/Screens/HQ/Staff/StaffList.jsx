import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAtom } from "jotai";
import { ActionComp, CustomTable, StatusComp } from "@/components/custom";
import { PageHeader } from "@/Screens/Layout/DashboardBlocks";
import useScope from "@/hooks/useScope";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { DESIGNATION_OPTIONS, EMPLOYMENT_TYPE_OPTIONS } from "@/lib/Constant";
import { StaffColumn } from "@/lib/TableData/Columns";
import { confirmModal, emptyNotifyData, notificationModal } from "@/lib/Variables";
import StaffEntry from "./StaffEntry";
import StaffHistory from "./StaffHistory";
import StaffTransfer from "./StaffTransfer";

const DEFAULT_PARAMS = {
  page: 1,
  per_page: 10,
  sort_by: "createdAt",
  order_by: "desc",
};

const SEARCH_DEBOUNCE = 400;

const labelOf = (options, value) =>
  options.find((option) => option.value === value)?.label ?? value;

export default function StaffList({ branchId: fixedBranchId, compact = false, onChange }) {
  const scope = useScope();
  const lockedBranchId = fixedBranchId ?? scope.outletId ?? "";
  const outletLocked = !!lockedBranchId;
  const canTransfer = !scope.outletId;
  const embedded = !!fixedBranchId;
  const [, setConfirmation] = useAtom(confirmModal);
  const [, setNotification] = useAtom(notificationModal);
  const [params, setParams] = useState({
    ...DEFAULT_PARAMS,
    branchId: lockedBranchId || undefined,
    companyId: scope.companyId || undefined,
  });
  const [data, setData] = useState({ data: [], total: 0 });
  const [outletOptions, setOutletOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [staff, setStaff] = useState(null);
  const [transferStaff, setTransferStaff] = useState(null);
  const [historyStaff, setHistoryStaff] = useState(null);

  const fetchStaffs = useCallback(() => {
    setLoading(true);

    ApiService.get(API_LINK.Staff, { params })
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
          description: error?.response?.data?.message ?? "Failed to load staff",
          type: "error",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [params, setNotification]);

  useEffect(() => {
    fetchStaffs();
  }, [fetchStaffs]);

  useEffect(() => {
    ApiService.get(API_LINK.Outlet, {
      params: {
        per_page: 100,
        sort_by: "name",
        order_by: "asc",
        companyId: scope.companyId || undefined,
      },
    })
      .then((res) => {
        if (res.status === "success") {
          setOutletOptions(
            (res?.data ?? []).map((item) => ({
              label: item.parent?.name ? `${item.name} (${item.parent.name})` : item.name,
              value: item.id,
            })),
          );
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
      });
  }, [scope.companyId, setNotification]);

  const handleStatusChange = useCallback(
    (item) => {
      ApiService.patch(API_LINK.StaffStatus(item.id))
        .then((res) => {
          setNotification({
            open: true,
            title: res.status === "success" ? "Success" : "Error",
            description: res?.message,
            type: res.status === "success" ? "success" : "error",
          });
          if (res.status === "success") {
            fetchStaffs();
            onChange?.();
          }
        })
        .catch((error) => {
          setNotification({
            open: true,
            title: "Error",
            description: error?.response?.data?.message ?? "Failed to change status",
            type: "error",
          });
        });
    },
    [fetchStaffs, onChange, setNotification],
  );

  const removeStaff = useCallback(
    (item) => {
      ApiService.delete(API_LINK.StaffDetails(item.id))
        .then((res) => {
          setNotification({
            open: true,
            title: res.status === "success" ? "Success" : "Error",
            description: res?.message,
            type: res.status === "success" ? "success" : "error",
          });
          if (res.status === "success") {
            fetchStaffs();
            onChange?.();
            setConfirmation(emptyNotifyData);
          }
        })
        .catch((error) => {
          setNotification({
            open: true,
            title: "Error",
            description: error?.response?.data?.message ?? "Failed to delete staff",
            type: "error",
          });
        });
    },
    [fetchStaffs, onChange, setConfirmation, setNotification],
  );

  const handleDelete = useCallback(
    (item) => {
      const confirmationPayload = {
        open: true,
        title: "Remove Staff",
        description: "",
        body: `Are you sure to remove "${item.firstName} ${item.lastName}" and their login account?`,
        type: "success",
        footer: true,
        cancelButton: true,
        remove: true,
        submitLabel: "Delete",
        submitClick: () => removeStaff(item),
      };

      setConfirmation(confirmationPayload);
    },
    [removeStaff, setConfirmation],
  );

  const columns = useMemo(
    () =>
      StaffColumn.filter((column) => {
        if (column.key === "outlet") return !outletLocked;
        if (["id", "worked", "contact", "account"].includes(column.key)) return !compact;
        return true;
      }),
    [outletLocked, compact],
  );

  const staffs = useMemo(() => {
    if (!data.data || data.data.length === 0) return [];

    const offset = (params.page - 1) * params.per_page;

    return data.data.map((item, index) => ({
      key: item.id,
      id: 1 + index + offset,
      name: (
        <div className="cell-stack">
          <span className="cell-title">{`${item.firstName} ${item.lastName}`}</span>
          <span className="cell-sub">Badge {item.badgeNumber}</span>
        </div>
      ),
      outlet: (
        <div className="cell-stack">
          <span className="cell-title">{item.outlet?.name}</span>
          <span className="cell-sub">{item.outlet?.parent?.name}</span>
        </div>
      ),
      job: (
        <div className="cell-stack">
          <span className="cell-title">{labelOf(DESIGNATION_OPTIONS, item.designation)}</span>
          <span className="cell-sub">{labelOf(EMPLOYMENT_TYPE_OPTIONS, item.employmentType)}</span>
        </div>
      ),
      worked: (
        <button
          type="button"
          className="worked-count"
          aria-label={`View work history of ${item.firstName} ${item.lastName}`}
          onClick={() => setHistoryStaff(item)}
        >
          {item.outletsWorked ?? 0}
        </button>
      ),
      contact: (
        <div className="cell-stack">
          <span className="cell-title">{item.phone}</span>
          <span className="cell-sub">{item.email}</span>
        </div>
      ),
      account: <span className="cell-title">{item.users?.[0]?.email ?? "No account"}</span>,
      status: <StatusComp type={item.status} onClick={() => handleStatusChange(item)} />,
      action: (
        <ActionComp
          className="justify-end"
          history={true}
          historyTitle="Work history"
          historyAction={() => setHistoryStaff(item)}
          transfer={canTransfer}
          transferTitle="Transfer to another outlet"
          transferAction={() => setTransferStaff(item)}
          edit={true}
          editTitle="Edit"
          editAction={() => {
            setStaff(item);
            setOpenModal(true);
          }}
          remove={true}
          deleteTitle="Delete"
          deleteAction={() => handleDelete(item)}
        />
      ),
    }));
  }, [data, params.page, params.per_page, canTransfer, handleStatusChange, handleDelete]);

  const handleChanges = useCallback(
    ({ page, pageSize, sortField, sort, filter }) => {
      setParams((prev) => ({
        ...prev,
        page,
        per_page: pageSize,
        sort_by: sortField ?? DEFAULT_PARAMS.sort_by,
        order_by: sort?.direction ?? DEFAULT_PARAMS.order_by,
        branchId: lockedBranchId || filter || undefined,
      }));
    },
    [lockedBranchId],
  );

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

  function handleAddStaff() {
    setStaff(null);
    setOpenModal(true);
  }

  return (
    <div className={embedded ? "page-section" : "page"}>
      {!embedded && (
        <PageHeader title="Staffs" subtitle="Staff working in each outlet and their login accounts" />
      )}

      <CustomTable
        title={embedded ? "Staffs" : undefined}
        description={embedded ? "Staff working in this outlet" : undefined}
        columns={columns}
        dataSource={staffs}
        rowKey="key"
        loading={loading}
        total={data.total}
        pageSize={params.per_page}
        onChange={handleChanges}
        onSearch={debouncedSearch}
        filterOptions={outletLocked ? undefined : outletOptions}
        filterPlaceholder="All outlets"
        addLabel="Add Staff"
        onAdd={handleAddStaff}
        reloadAction={fetchStaffs}
        showReload={true}
        searchPlaceholder="Search name, badge, phone or job..."
        emptyText="No staff has been added yet"
      />

      <StaffEntry
        open={openModal}
        staff={staff}
        branchId={params.branchId}
        outletOptions={outletOptions}
        lockOutlet={outletLocked}
        onClose={() => setOpenModal(false)}
        onSaved={() => {
          setOpenModal(false);
          fetchStaffs();
          onChange?.();
        }}
      />

      <StaffTransfer
        open={!!transferStaff}
        staff={transferStaff}
        outletOptions={outletOptions}
        onClose={() => setTransferStaff(null)}
        onSaved={() => {
          setTransferStaff(null);
          fetchStaffs();
          onChange?.();
        }}
      />

      <StaffHistory
        open={!!historyStaff}
        staff={historyStaff}
        onClose={() => setHistoryStaff(null)}
      />
    </div>
  );
}
