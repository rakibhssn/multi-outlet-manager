import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ActionComp, CustomTable, StatusComp } from "@/components/custom";
import { PageHeader } from "@/Screens/Layout/DashboardBlocks";
import {
  ContactCell,
  LocationCell,
  StackCell,
} from "@/Screens/Layout/TableCells";
import useConfirm from "@/hooks/useConfirm";
import useNotify from "@/hooks/useNotify";
import useTableList from "@/hooks/useTableList";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { humanize } from "@/lib/Functions/Common";
import { CompanyColumn } from "@/lib/TableData/Columns";
import CompanyEntry from "./CompanyEntry";

const DEFAULT_PARAMS = {
  page: 1,
  per_page: 10,
  sort_by: "createdAt",
  order_by: "desc",
};

export default function CompanyList() {
  const navigate = useNavigate();
  const notify = useNotify();
  const confirm = useConfirm();
  const { rows, offset, reload, ...table } = useTableList({
    url: API_LINK.Company,
    defaults: DEFAULT_PARAMS,
    errorText: "Failed to load companies",
  });
  const [openModal, setOpenModal] = useState(false);
  const [company, setCompany] = useState(null);

  const openEntry = (item) => {
    setCompany(item);
    setOpenModal(true);
  };

  const companies = useMemo(() => {
    const toggleStatus = (item) =>
      notify.submit(ApiService.patch(API_LINK.CompanyStatus(item.id)), {
        errorText: "Failed to change status",
        onSuccess: reload,
      });

    const removeCompany = (item) =>
      confirm.remove({
        title: "Remove Company",
        body: `Are you sure to remove "${item.name}"?`,
        onConfirm: () =>
          notify.submit(ApiService.delete(API_LINK.CompanyDetails(item.id)), {
            errorText: "Failed to delete company",
            onSuccess: () => {
              reload();
              confirm.close();
            },
          }),
      });

    return rows
      .filter((item) => item.accountType !== "DEVELOPER")
      .map((item, index) => ({
        key: item.id,
        id: 1 + index + offset,
        name: <span className="cell-title">{item.name}</span>,
        contact: <ContactCell branch={item} />,
        account: (
          <StackCell
            title={item.users?.[0]?.email ?? "—"}
            subtitle={humanize(item.users?.[0]?.role) || "No account"}
          />
        ),
        outlets: item._count?.children ?? 0,
        location: <LocationCell branch={item} />,
        status: (
          <StatusComp type={item.status} onClick={() => toggleStatus(item)} />
        ),
        action: (
          <ActionComp
            className="justify-end"
            view={true}
            viewTitle="View"
            viewAction={() => navigate(`/hq/company/${item.id}`)}
            edit={true}
            editTitle="Edit"
            editAction={() => openEntry(item)}
            remove={true}
            deleteTitle="Delete"
            deleteAction={() => removeCompany(item)}
          />
        ),
      }));
  }, [rows, offset, reload, navigate, notify, confirm]);

  return (
    <div className="page">
      <PageHeader
        title="Companies"
        subtitle="Companies and their login accounts"
      />

      <CustomTable
        columns={CompanyColumn}
        dataSource={companies}
        rowKey="key"
        loading={table.loading}
        total={table.total}
        pageSize={table.params.per_page}
        onChange={table.onChange}
        onSearch={table.onSearch}
        addLabel="Add Company"
        onAdd={() => openEntry(null)}
        reloadAction={reload}
        showReload={true}
        searchPlaceholder="Search name, contact or location..."
        emptyText="No company has been created yet"
      />

      <CompanyEntry
        open={openModal}
        company={company}
        onClose={() => setOpenModal(false)}
        onSaved={() => {
          setOpenModal(false);
          reload();
        }}
      />
    </div>
  );
}
