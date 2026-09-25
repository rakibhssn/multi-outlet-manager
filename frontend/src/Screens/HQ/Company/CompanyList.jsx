import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useSetAtom } from "jotai";
import { ActionComp, CustomTable, StatusComp } from "@/components/custom";
import { PageHeader } from "@/Screens/Layout/DashboardBlocks";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import {
  confirmModal,
  emptyNotifyData,
  notificationModal,
} from "@/lib/Variables";
import CompanyEntry from "./CompanyEntry";

const humanize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function CompanyList() {
  const setNotification = useSetAtom(notificationModal);
  const setConfirmation = useSetAtom(confirmModal);
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    total: 0,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState({ open: false, company: null });

  const { page, perPage } = pagination;

  const fetchCompanies = useCallback(() => {
    setLoading(true);

    ApiService.get(API_LINK.Company, {
      params: { page, perPage, search: debouncedSearch || undefined },
    })
      .then((res) => {
        if (res.status === "success") {
          const items = res?.data?.items ?? [];
          const total = res?.data?.pagination?.total ?? 0;
          setCompanies(
            items.filter((item) => item.accountType !== "DEVELOPER"),
          );
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
          description:
            error?.response?.data?.message ?? "Failed to load companies",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, perPage, debouncedSearch, setNotification]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    const next = search.trim();
    if (next === debouncedSearch) return undefined;
    const timer = setTimeout(() => {
      setDebouncedSearch(next);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);

  function toggleStatus(company) {
    ApiService.patch(API_LINK.CompanyStatus(company.id))
      .then((res) => {
        if (res.status === "success") {
          setNotification({
            open: true,
            title: "Success",
            description: res?.message,
          });
          fetchCompanies();
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
          description:
            error?.response?.data?.message ?? "Failed to change status",
        });
      });
  }

  function confirmDelete(company) {
    setConfirmation({
      open: true,
      title: "Delete Company",
      description: `"${company.name}" will be removed permanently.`,
      footer: true,
      remove: true,
      submitLabel: "Delete",
      submitClick: () =>
        ApiService.delete(API_LINK.CompanyDetails(company.id))
          .then((res) => {
            if (res.status === "success") {
              setNotification({
                open: true,
                title: "Success",
                description: res?.message,
              });
              fetchCompanies();
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
              description:
                error?.response?.data?.message ?? "Failed to delete company",
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
      title: "Company",
      dataIndex: "name",
      render: (name) => <span className="cell-title">{name}</span>,
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
      render: (email, record) => (
        <div className="cell-stack">
          <span className="cell-title">{email ?? "—"}</span>
          <span className="cell-sub">
            {humanize(record.users?.[0]?.role) || "No account"}
          </span>
        </div>
      ),
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
      key: "outlets",
      title: "Outlets",
      dataIndex: "_count.children",
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
          viewTitle="View company"
          viewAction={() => navigate(`/hq/company/${record.id}`)}
          edit
          editTitle="Edit company"
          editAction={() => setEntry({ open: true, company: record })}
          remove
          deleteTitle="Delete company"
          deleteAction={() => confirmDelete(record)}
        />
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Companies"
        subtitle="Companies and their login accounts"
      />

      <CustomTable
        columns={columns}
        dataSource={companies}
        loading={loading}
        searchPlaceholder="Search name, contact or location..."
        searchValue={search}
        onSearchChange={setSearch}
        total={pagination.total}
        page={page}
        pageSize={perPage}
        onPageChange={(next) =>
          setPagination((prev) => ({ ...prev, page: next }))
        }
        onPageSizeChange={(size) =>
          setPagination((prev) => ({ ...prev, perPage: size, page: 1 }))
        }
        emptyMessage="No companies yet"
        onReload={fetchCompanies}
        onAdd={() => setEntry({ open: true, company: null })}
        addLabel="Add Company"
      />

      <CompanyEntry
        open={entry.open}
        company={entry.company}
        onClose={() => setEntry({ open: false, company: null })}
        onSaved={() => {
          setEntry({ open: false, company: null });
          fetchCompanies();
        }}
      />
    </div>
  );
}
