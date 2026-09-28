import React, { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ActionComp, CustomTable, StatusComp } from "@/components/custom";
import { PageHeader } from "@/Screens/Layout/DashboardBlocks";
import {
  ContactCell,
  LocationCell,
  StackCell,
} from "@/Screens/Layout/TableCells";
import useCan from "@/hooks/useCan";
import useConfirm from "@/hooks/useConfirm";
import useNotify from "@/hooks/useNotify";
import useRemoteOptions from "@/hooks/useRemoteOptions";
import useScope from "@/hooks/useScope";
import useTableList from "@/hooks/useTableList";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { nameOption } from "@/lib/Functions/Common";
import { OutletColumn } from "@/lib/TableData/Columns";
import OutletEntry from "./OutletEntry";

const DEFAULT_PARAMS = {
  page: 1,
  per_page: 10,
  sort_by: "createdAt",
  order_by: "desc",
};

export default function OutletList({
  companyId: fixedCompanyId,
  companyName,
  onChange,
}) {
  const navigate = useNavigate();
  const scope = useScope();
  const notify = useNotify();
  const confirm = useConfirm();
  const can = useCan();
  const canCreate = can("outlets.create");
  const canEdit = can("outlets.edit");
  const canDelete = can("outlets.delete");
  const lockedCompanyId = fixedCompanyId ?? scope.companyId ?? "";
  const companyLocked = !!lockedCompanyId;
  const embedded = !!fixedCompanyId;
  const { rows, offset, reload, params, ...table } = useTableList({
    url: API_LINK.Outlet,
    defaults: DEFAULT_PARAMS,
    initialParams: { companyId: lockedCompanyId || undefined },
    filterParam: (filter) => ({ companyId: lockedCompanyId || filter }),
    errorText: "Failed to load outlets",
  });
  const [openModal, setOpenModal] = useState(false);
  const [outlet, setOutlet] = useState(null);

  const companyFilter = useRemoteOptions({
    url: API_LINK.Company,
    mapOption: nameOption,
    enabled: !companyLocked,
    errorText: "Failed to load companies",
  });

  const lockedCompany = useMemo(
    () =>
      lockedCompanyId
        ? {
            value: lockedCompanyId,
            label: companyName ?? scope.companyName ?? "This company",
          }
        : null,
    [lockedCompanyId, companyName, scope.companyName],
  );

  const refresh = useCallback(() => {
    reload();
    onChange?.();
  }, [reload, onChange]);

  const openEntry = (item) => {
    setOutlet(item);
    setOpenModal(true);
  };

  const outlets = useMemo(() => {
    const toggleStatus = (item) =>
      notify.submit(ApiService.patch(API_LINK.OutletStatus(item.id)), {
        errorText: "Failed to change status",
        onSuccess: refresh,
      });

    const removeOutlet = (item) =>
      confirm.remove({
        title: "Remove Outlet",
        body: `Are you sure to remove "${item.name}" and its login account?`,
        onConfirm: () =>
          notify.submit(ApiService.delete(API_LINK.OutletDetails(item.id)), {
            errorText: "Failed to delete outlet",
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
          title={item.name}
          subtitle={!companyLocked && item.parent?.name}
        />
      ),
      contact: <ContactCell branch={item} />,
      account: (
        <span className="cell-title">
          {item.users?.[0]?.email ?? "No account"}
        </span>
      ),
      location: <LocationCell branch={item} />,
      staffs: item._count?.staffs ?? 0,
      status: (
        <StatusComp
          type={item.status}
          onClick={canEdit ? () => toggleStatus(item) : undefined}
        />
      ),
      action: (
        <ActionComp
          className="justify-end"
          view={true}
          viewTitle="View"
          viewAction={() => navigate(`/hq/outlet/${item.id}`)}
          edit={canEdit}
          editTitle="Edit"
          editAction={() => openEntry(item)}
          remove={canDelete}
          deleteTitle="Delete"
          deleteAction={() => removeOutlet(item)}
        />
      ),
    }));
  }, [
    rows,
    offset,
    refresh,
    companyLocked,
    canEdit,
    canDelete,
    navigate,
    notify,
    confirm,
  ]);

  return (
    <div className={embedded ? "page-section" : "page"}>
      {!embedded && (
        <PageHeader
          title="Outlets"
          subtitle="Outlets under each company and their login accounts"
        />
      )}

      <CustomTable
        title={embedded ? "Outlets" : undefined}
        description={embedded ? "Outlets under this company" : undefined}
        columns={OutletColumn}
        dataSource={outlets}
        rowKey="key"
        loading={table.loading}
        total={table.total}
        pageSize={params.per_page}
        onChange={table.onChange}
        onSearch={table.onSearch}
        filterOptions={companyLocked ? undefined : companyFilter.options}
        filterPlaceholder="All companies"
        onFilterSearch={companyFilter.onSearch}
        filterLoading={companyFilter.loading}
        addLabel="Add Outlet"
        onAdd={canCreate ? () => openEntry(null) : undefined}
        reloadAction={reload}
        showReload={true}
        searchPlaceholder="Search name, contact or location..."
        emptyText="No outlet has been created yet"
      />

      <OutletEntry
        open={openModal}
        outlet={outlet}
        companyId={params.companyId}
        lockedCompany={
          lockedCompany ??
          companyFilter.options.find(
            (option) => option.value === params.companyId,
          )
        }
        lockCompany={companyLocked}
        onClose={() => setOpenModal(false)}
        onSaved={() => {
          setOpenModal(false);
          refresh();
        }}
      />
    </div>
  );
}
