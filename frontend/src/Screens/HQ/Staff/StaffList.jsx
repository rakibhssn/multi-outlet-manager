import React, { useCallback, useMemo, useState } from "react";
import { ActionComp, CustomTable, StatusComp } from "@/components/custom";
import { PageHeader } from "@/Screens/Layout/DashboardBlocks";
import { StackCell } from "@/Screens/Layout/TableCells";
import useCan from "@/hooks/useCan";
import useConfirm from "@/hooks/useConfirm";
import useNotify from "@/hooks/useNotify";
import useRemoteOptions from "@/hooks/useRemoteOptions";
import useScope from "@/hooks/useScope";
import useTableList from "@/hooks/useTableList";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { DESIGNATION_OPTIONS, EMPLOYMENT_TYPE_OPTIONS } from "@/lib/Constant";
import {
  fullName,
  labelOf,
  outletOption,
  roleLabel,
} from "@/lib/Functions/Common";
import { StaffColumn } from "@/lib/TableData/Columns";
import StaffEntry from "./StaffEntry";
import StaffHistory from "./StaffHistory";
import StaffTransfer from "./StaffTransfer";

const DEFAULT_PARAMS = {
  page: 1,
  per_page: 10,
  sort_by: "createdAt",
  order_by: "desc",
};

const OUTLET_ACCOUNTS = ["OUTLET", "OUTLET_STAFF"];

export default function StaffList({
  branchId: fixedBranchId,
  branchName,
  compact = false,
  onChange,
}) {
  const scope = useScope();
  const notify = useNotify();
  const confirm = useConfirm();
  const can = useCan();
  const lockedBranchId = fixedBranchId ?? scope.outletId ?? "";
  const outletLocked = !!lockedBranchId;
  const embedded = !!fixedBranchId;
  const outletAccount = OUTLET_ACCOUNTS.includes(scope.accountType);
  const canCreate = can("staff.create");
  const canEdit = can("staff.edit");
  const canDelete = can("staff.delete");
  const canTransfer = !scope.outletId && can("staff.transfer");
  const canViewHistory = !outletAccount && can("staff.history");
  const hasActions = canEdit || canDelete || canTransfer || canViewHistory;

  const { rows, offset, reload, params, ...table } = useTableList({
    url: API_LINK.Staff,
    defaults: DEFAULT_PARAMS,
    initialParams: {
      branchId: lockedBranchId || undefined,
      companyId: scope.companyId || undefined,
      id: outletAccount ? scope.userId : undefined,
    },
    filterParam: (filter) => ({ branchId: lockedBranchId || filter }),
    errorText: "Failed to load staff",
  });
  const [openModal, setOpenModal] = useState(false);
  const [staff, setStaff] = useState(null);
  const [transferStaff, setTransferStaff] = useState(null);
  const [historyStaff, setHistoryStaff] = useState(null);

  const outletFilter = useRemoteOptions({
    url: API_LINK.Outlet,
    params: { companyId: scope.companyId || undefined },
    mapOption: outletOption,
    enabled: !outletLocked,
    errorText: "Failed to load outlets",
  });

  const lockedOutlet = useMemo(
    () =>
      lockedBranchId
        ? {
            value: lockedBranchId,
            label: branchName ?? scope.outletName ?? "This outlet",
          }
        : null,
    [lockedBranchId, branchName, scope.outletName],
  );

  const refresh = useCallback(() => {
    reload();
    onChange?.();
  }, [reload, onChange]);

  const openEntry = (item) => {
    setStaff(item);
    setOpenModal(true);
  };

  const columns = useMemo(
    () =>
      StaffColumn.filter((column) => {
        if (column.key === "outlet") return !outletLocked;
        if (column.key === "worked") return !compact && canViewHistory;
        if (column.key === "action") return hasActions;
        if (["id", "contact", "account"].includes(column.key)) return !compact;
        return true;
      }),
    [outletLocked, compact, canViewHistory, hasActions],
  );

  const staffs = useMemo(() => {
    const toggleStatus = (item) =>
      notify.submit(ApiService.patch(API_LINK.StaffStatus(item.id)), {
        errorText: "Failed to change status",
        onSuccess: refresh,
      });

    const removeStaff = (item) =>
      confirm.remove({
        title: "Remove Staff",
        body: `Are you sure to remove "${fullName(item)}" and their login account?`,
        onConfirm: () =>
          notify.submit(ApiService.delete(API_LINK.StaffDetails(item.id)), {
            errorText: "Failed to delete staff",
            onSuccess: () => {
              refresh();
              confirm.close();
            },
          }),
      });

    return rows.map((item, index) => ({
      key: item.id,
      id: 1 + index + offset,
      name: (
        <StackCell
          title={fullName(item)}
          subtitle={`Badge ${item.badgeNumber}${item.shifts?.length ? " · On shift" : ""}`}
        />
      ),
      outlet: (
        <StackCell
          title={item.outlet?.name}
          subtitle={item.outlet?.parent?.name}
        />
      ),
      job: (
        <StackCell
          title={labelOf(DESIGNATION_OPTIONS, item.designation)}
          subtitle={labelOf(EMPLOYMENT_TYPE_OPTIONS, item.employmentType)}
        />
      ),
      worked: (
        <button
          type="button"
          className="worked-count"
          aria-label={`View work history of ${fullName(item)}`}
          onClick={() => setHistoryStaff(item)}
        >
          {item.outletsWorked ?? 0}
        </button>
      ),
      contact: <StackCell title={item.phone} subtitle={item.email} />,
      account: (
        <StackCell
          title={item.users?.[0]?.email ?? "No account"}
          subtitle={roleLabel(item.users?.[0])}
        />
      ),
      status: (
        <StatusComp
          type={item.status}
          onClick={canEdit ? () => toggleStatus(item) : undefined}
        />
      ),
      action: (
        <ActionComp
          className="justify-end"
          history={canViewHistory}
          historyTitle="Work history"
          historyAction={() => setHistoryStaff(item)}
          transfer={canTransfer}
          transferTitle="Transfer to another outlet"
          transferAction={() => setTransferStaff(item)}
          edit={canEdit}
          editTitle="Edit"
          editAction={() => openEntry(item)}
          remove={canDelete}
          deleteTitle="Delete"
          deleteAction={() => removeStaff(item)}
        />
      ),
    }));
  }, [
    rows,
    offset,
    refresh,
    canEdit,
    canDelete,
    canTransfer,
    canViewHistory,
    notify,
    confirm,
  ]);

  return (
    <div className={embedded ? "page-section" : "page"}>
      {!embedded && (
        <PageHeader
          title="Staffs"
          subtitle="Staff working in each outlet and their login accounts"
        />
      )}

      <CustomTable
        title={embedded ? "Staffs" : undefined}
        description={embedded ? "Staff working in this outlet" : undefined}
        columns={columns}
        dataSource={staffs}
        rowKey="key"
        loading={table.loading}
        total={table.total}
        pageSize={params.per_page}
        onChange={table.onChange}
        onSearch={table.onSearch}
        filterOptions={outletLocked ? undefined : outletFilter.options}
        filterPlaceholder="All outlets"
        onFilterSearch={outletFilter.onSearch}
        filterLoading={outletFilter.loading}
        addLabel="Add Staff"
        onAdd={canCreate ? () => openEntry(null) : undefined}
        reloadAction={reload}
        showReload={true}
        searchPlaceholder="Search name, badge, phone or job..."
        emptyText="No staff has been added yet"
      />

      <StaffEntry
        open={openModal}
        staff={staff}
        branchId={params.branchId}
        lockedOutlet={
          lockedOutlet ??
          outletFilter.options.find(
            (option) => option.value === params.branchId,
          )
        }
        lockOutlet={outletLocked}
        onClose={() => setOpenModal(false)}
        onSaved={() => {
          setOpenModal(false);
          refresh();
        }}
      />

      <StaffTransfer
        open={!!transferStaff}
        staff={transferStaff}
        onClose={() => setTransferStaff(null)}
        onSaved={() => {
          setTransferStaff(null);
          refresh();
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
