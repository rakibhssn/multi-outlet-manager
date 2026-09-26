import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAtom } from "jotai";
import { ActionComp, CustomTable, StatusComp } from "@/components/custom";
import { PageHeader } from "@/Screens/Layout/DashboardBlocks";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { CompanyColumn } from "@/lib/TableData/Columns";
import { confirmModal, emptyNotifyData, notificationModal } from "@/lib/Variables";
import CompanyEntry from "./CompanyEntry";

const DEFAULT_PARAMS = {
  page: 1,
  per_page: 10,
  sort_by: "createdAt",
  order_by: "desc",
};

const SEARCH_DEBOUNCE = 400;

const humanize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function CompanyList() {
  const navigate = useNavigate();
  const [, setConfirmation] = useAtom(confirmModal);
  const [, setNotification] = useAtom(notificationModal);
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [data, setData] = useState({ data: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [company, setCompany] = useState(null);

  const fetchCompanies = useCallback(() => {
    setLoading(true);

    ApiService.get(API_LINK.Company, { params })
      .then((res) => {
        if (res.status === "success") {
          setData({
            data: (res?.data ?? []).filter((item) => item.accountType !== "DEVELOPER"),
            total: res?.total ?? 0,
          });
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
          description: error?.response?.data?.message ?? "Failed to load companies",
          type: "error",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [params, setNotification]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleStatusChange = useCallback(
    (item) => {
      ApiService.patch(API_LINK.CompanyStatus(item.id))
        .then((res) => {
          setNotification({
            open: true,
            title: res.status === "success" ? "Success" : "Error",
            description: res?.message,
            type: res.status === "success" ? "success" : "error",
          });
          if (res.status === "success") fetchCompanies();
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
    [fetchCompanies, setNotification],
  );

  const removeCompany = useCallback(
    (item) => {
      ApiService.delete(API_LINK.CompanyDetails(item.id))
        .then((res) => {
          setNotification({
            open: true,
            title: res.status === "success" ? "Success" : "Error",
            description: res?.message,
            type: res.status === "success" ? "success" : "error",
          });
          if (res.status === "success") {
            fetchCompanies();
            setConfirmation(emptyNotifyData);
          }
        })
        .catch((error) => {
          setNotification({
            open: true,
            title: "Error",
            description: error?.response?.data?.message ?? "Failed to delete company",
            type: "error",
          });
        });
    },
    [fetchCompanies, setConfirmation, setNotification],
  );

  const handleDelete = useCallback(
    (item) => {
      const confirmationPayload = {
        open: true,
        title: "Remove Company",
        description: "",
        body: `Are you sure to remove "${item.name}"?`,
        type: "success",
        footer: true,
        cancelButton: true,
        remove: true,
        submitLabel: "Delete",
        submitClick: () => removeCompany(item),
      };

      setConfirmation(confirmationPayload);
    },
    [removeCompany, setConfirmation],
  );

  const companies = useMemo(() => {
    if (!data.data || data.data.length === 0) return [];

    const offset = (params.page - 1) * params.per_page;

    return data.data.map((item, index) => ({
      key: item.id,
      id: 1 + index + offset,
      name: <span className="cell-title">{item.name}</span>,
      contact: (
        <div className="cell-stack">
          <span className="cell-title">{item.contactPersonName}</span>
          <span className="cell-sub">{item.contactPersonEmail}</span>
          <span className="cell-sub">{item.contactPersonPhone}</span>
        </div>
      ),
      account: (
        <div className="cell-stack">
          <span className="cell-title">{item.users?.[0]?.email ?? "—"}</span>
          <span className="cell-sub">{humanize(item.users?.[0]?.role) || "No account"}</span>
        </div>
      ),
      outlets: item._count?.children ?? 0,
      location: (
        <div className="cell-stack">
          <span className="cell-title">{item.city}</span>
          <span className="cell-sub">{[item.state, item.country].filter(Boolean).join(", ")}</span>
        </div>
      ),
      status: <StatusComp type={item.status} onClick={() => handleStatusChange(item)} />,
      action: (
        <ActionComp
          className="justify-end"
          view={true}
          viewTitle="View"
          viewAction={() => navigate(`/hq/company/${item.id}`)}
          edit={true}
          editTitle="Edit"
          editAction={() => {
            setCompany(item);
            setOpenModal(true);
          }}
          remove={true}
          deleteTitle="Delete"
          deleteAction={() => handleDelete(item)}
        />
      ),
    }));
  }, [data, params.page, params.per_page, navigate, handleStatusChange, handleDelete]);

  const handleChanges = useCallback(({ page, pageSize, sortField, sort }) => {
    setParams((prev) => ({
      ...prev,
      page,
      per_page: pageSize,
      sort_by: sortField ?? DEFAULT_PARAMS.sort_by,
      order_by: sort?.direction ?? DEFAULT_PARAMS.order_by,
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

  function handleAddCompany() {
    setCompany(null);
    setOpenModal(true);
  }

  return (
    <div className="page">
      <PageHeader title="Companies" subtitle="Companies and their login accounts" />

      <CustomTable
        columns={CompanyColumn}
        dataSource={companies}
        rowKey="key"
        loading={loading}
        total={data.total}
        pageSize={params.per_page}
        onChange={handleChanges}
        onSearch={debouncedSearch}
        addLabel="Add Company"
        onAdd={handleAddCompany}
        reloadAction={fetchCompanies}
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
          fetchCompanies();
        }}
      />
    </div>
  );
}
