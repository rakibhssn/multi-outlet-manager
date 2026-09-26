import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAtom } from "jotai";
import { ActionComp, CustomTable, StatusComp } from "@/components/custom";
import { PageHeader } from "@/Screens/Layout/DashboardBlocks";
import useScope from "@/hooks/useScope";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { OutletColumn } from "@/lib/TableData/Columns";
import { confirmModal, emptyNotifyData, notificationModal } from "@/lib/Variables";
import OutletEntry from "./OutletEntry";

const DEFAULT_PARAMS = {
  page: 1,
  per_page: 10,
  sort_by: "createdAt",
  order_by: "desc",
};

const SEARCH_DEBOUNCE = 400;

export default function OutletList({ companyId: fixedCompanyId, onChange }) {
  const navigate = useNavigate();
  const scope = useScope();
  const lockedCompanyId = fixedCompanyId ?? scope.companyId ?? "";
  const companyLocked = !!lockedCompanyId;
  const embedded = !!fixedCompanyId;
  const [, setConfirmation] = useAtom(confirmModal);
  const [, setNotification] = useAtom(notificationModal);
  const [params, setParams] = useState({
    ...DEFAULT_PARAMS,
    companyId: lockedCompanyId || undefined,
  });
  const [data, setData] = useState({ data: [], total: 0 });
  const [companyOptions, setCompanyOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [outlet, setOutlet] = useState(null);

  const fetchOutlets = useCallback(() => {
    setLoading(true);

    ApiService.get(API_LINK.Outlet, { params })
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
          description: error?.response?.data?.message ?? "Failed to load outlets",
          type: "error",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [params, setNotification]);

  useEffect(() => {
    fetchOutlets();
  }, [fetchOutlets]);

  useEffect(() => {
    if (scope.companyId) {
      setCompanyOptions([{ label: scope.companyName, value: scope.companyId }]);
      return;
    }

    ApiService.get(API_LINK.Company, { params: { per_page: 100, sort_by: "name", order_by: "asc" } })
      .then((res) => {
        if (res.status === "success") {
          setCompanyOptions((res?.data ?? []).map((item) => ({ label: item.name, value: item.id })));
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
      });
  }, [scope.companyId, scope.companyName, setNotification]);

  const handleStatusChange = useCallback(
    (item) => {
      ApiService.patch(API_LINK.OutletStatus(item.id))
        .then((res) => {
          setNotification({
            open: true,
            title: res.status === "success" ? "Success" : "Error",
            description: res?.message,
            type: res.status === "success" ? "success" : "error",
          });
          if (res.status === "success") {
            fetchOutlets();
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
    [fetchOutlets, onChange, setNotification],
  );

  const removeOutlet = useCallback(
    (item) => {
      ApiService.delete(API_LINK.OutletDetails(item.id))
        .then((res) => {
          setNotification({
            open: true,
            title: res.status === "success" ? "Success" : "Error",
            description: res?.message,
            type: res.status === "success" ? "success" : "error",
          });
          if (res.status === "success") {
            fetchOutlets();
            onChange?.();
            setConfirmation(emptyNotifyData);
          }
        })
        .catch((error) => {
          setNotification({
            open: true,
            title: "Error",
            description: error?.response?.data?.message ?? "Failed to delete outlet",
            type: "error",
          });
        });
    },
    [fetchOutlets, onChange, setConfirmation, setNotification],
  );

  const handleDelete = useCallback(
    (item) => {
      const confirmationPayload = {
        open: true,
        title: "Remove Outlet",
        description: "",
        body: `Are you sure to remove "${item.name}" and its login account?`,
        type: "success",
        footer: true,
        cancelButton: true,
        remove: true,
        submitLabel: "Delete",
        submitClick: () => removeOutlet(item),
      };

      setConfirmation(confirmationPayload);
    },
    [removeOutlet, setConfirmation],
  );

  const outlets = useMemo(() => {
    if (!data.data || data.data.length === 0) return [];

    const offset = (params.page - 1) * params.per_page;

    return data.data.map((item, index) => ({
      key: item.id,
      id: 1 + index + offset,
      name: (
        <div className="cell-stack">
          <span className="cell-title">{item.name}</span>
          {!companyLocked && <span className="cell-sub">{item.parent?.name}</span>}
        </div>
      ),
      contact: (
        <div className="cell-stack">
          <span className="cell-title">{item.contactPersonName}</span>
          <span className="cell-sub">{item.contactPersonEmail}</span>
          <span className="cell-sub">{item.contactPersonPhone}</span>
        </div>
      ),
      account: <span className="cell-title">{item.users?.[0]?.email ?? "No account"}</span>,
      location: (
        <div className="cell-stack">
          <span className="cell-title">{item.city}</span>
          <span className="cell-sub">{[item.state, item.country].filter(Boolean).join(", ")}</span>
        </div>
      ),
      staffs: item._count?.staffs ?? 0,
      status: <StatusComp type={item.status} onClick={() => handleStatusChange(item)} />,
      action: (
        <ActionComp
          className="justify-end"
          view={true}
          viewTitle="View"
          viewAction={() => navigate(`/hq/outlet/${item.id}`)}
          edit={true}
          editTitle="Edit"
          editAction={() => {
            setOutlet(item);
            setOpenModal(true);
          }}
          remove={true}
          deleteTitle="Delete"
          deleteAction={() => handleDelete(item)}
        />
      ),
    }));
  }, [data, params.page, params.per_page, companyLocked, navigate, handleStatusChange, handleDelete]);

  const handleChanges = useCallback(
    ({ page, pageSize, sortField, sort, filter }) => {
      setParams((prev) => ({
        ...prev,
        page,
        per_page: pageSize,
        sort_by: sortField ?? DEFAULT_PARAMS.sort_by,
        order_by: sort?.direction ?? DEFAULT_PARAMS.order_by,
        companyId: lockedCompanyId || filter || undefined,
      }));
    },
    [lockedCompanyId],
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

  function handleAddOutlet() {
    setOutlet(null);
    setOpenModal(true);
  }

  return (
    <div className={embedded ? "page-section" : "page"}>
      {!embedded && (
        <PageHeader title="Outlets" subtitle="Outlets under each company and their login accounts" />
      )}

      <CustomTable
        title={embedded ? "Outlets" : undefined}
        description={embedded ? "Outlets under this company" : undefined}
        columns={OutletColumn}
        dataSource={outlets}
        rowKey="key"
        loading={loading}
        total={data.total}
        pageSize={params.per_page}
        onChange={handleChanges}
        onSearch={debouncedSearch}
        filterOptions={companyLocked ? undefined : companyOptions}
        filterPlaceholder="All companies"
        addLabel="Add Outlet"
        onAdd={handleAddOutlet}
        reloadAction={fetchOutlets}
        showReload={true}
        searchPlaceholder="Search name, contact or location..."
        emptyText="No outlet has been created yet"
      />

      <OutletEntry
        open={openModal}
        outlet={outlet}
        companyId={params.companyId}
        companyOptions={companyOptions}
        lockCompany={companyLocked}
        onClose={() => setOpenModal(false)}
        onSaved={() => {
          setOpenModal(false);
          fetchOutlets();
          onChange?.();
        }}
      />
    </div>
  );
}
