import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { format } from "date-fns";
import { LuArrowLeft, LuPencil } from "react-icons/lu";
import { AnimateButton, StatusComp } from "@/components/custom";
import { Skeleton } from "@/components/ui/skeleton";
import { DetailCard, PageHeader } from "@/Screens/Layout/DashboardBlocks";
import StaffList from "@/Screens/HQ/Staff/StaffList";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { breadcrumbLabels, notificationModal, userData } from "@/lib/Variables";
import { isDeveloper } from "@/lib/Menus";
import useScope from "@/hooks/useScope";
import OutletEntry from "./OutletEntry";

const humanize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function OutletDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setNotification = useSetAtom(notificationModal);
  const setLabels = useSetAtom(breadcrumbLabels);
  const { user } = useAtomValue(userData);
  const scope = useScope();
  const [outlet, setOutlet] = useState(null);
  const [companyOptions, setCompanyOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const fetchOutlet = useCallback(() => {
    setLoading(true);

    ApiService.get(API_LINK.OutletDetails(id))
      .then((res) => {
        if (res.status === "success") {
          setOutlet(res?.data);
          setLabels((prev) => ({ ...prev, [`/hq/outlet/${id}`]: res?.data?.name }));
        } else {
          setNotification({
            open: true,
            title: "Error",
            description: res.message,
          });
        }
      })
      .catch((error) => {
        setOutlet(null);
        setNotification({
          open: true,
          title: "Error",
          description: error?.response?.data?.message ?? "Failed to load outlet",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, setLabels, setNotification]);

  useEffect(() => {
    fetchOutlet();
  }, [fetchOutlet]);

  useEffect(() => {
    ApiService.get(API_LINK.Company, { params: { perPage: 100 } })
      .then((res) => {
        if (res.status === "success") {
          setCompanyOptions(
            (res?.data?.items ?? []).map((item) => ({ label: item.name, value: item.id })),
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
  }, [setNotification]);

  const back = (
    <AnimateButton
      variant="outline"
      preIcon={LuArrowLeft}
      label="Back"
      onClick={() => navigate(-1)}
    />
  );

  if (loading && !outlet) {
    return (
      <div className="page">
        <Skeleton className="h-9 w-64 rounded-md" />
        <div className="detail-grid">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!outlet || (scope.companyId && outlet.parentId !== scope.companyId)) {
    return (
      <div className="page">
        <PageHeader title="Outlet not found" subtitle="It may have been deleted." actions={back} />
      </div>
    );
  }

  const account = outlet.users?.[0];

  return (
    <div className="page">
      <PageHeader
        title={outlet.name}
        subtitle="Outlet details and its staff"
        actions={
          <>
            {back}
            <AnimateButton preIcon={LuPencil} label="Edit Outlet" onClick={() => setEditOpen(true)} />
          </>
        }
      />

      <div className="detail-grid">
        <DetailCard
          title="Outlet"
          items={[
            { label: "Name", value: outlet.name },
            {
              label: "Company",
              value:
                outlet.parent && isDeveloper(user) ? (
                  <Link to={`/hq/company/${outlet.parent.id}`} className="detail-link">
                    {outlet.parent.name}
                  </Link>
                ) : (
                  outlet.parent?.name
                ),
            },
            { label: "Status", value: <StatusComp type={outlet.status} /> },
            { label: "Staff", value: String(outlet._count?.staffs ?? 0) },
            {
              label: "Created",
              value: outlet.createdAt ? format(new Date(outlet.createdAt), "dd MMM yyyy") : null,
            },
          ]}
        />
        <DetailCard
          title="Contact Person"
          items={[
            { label: "Name", value: outlet.contactPersonName },
            { label: "Email", value: outlet.contactPersonEmail },
            { label: "Phone", value: outlet.contactPersonPhone },
          ]}
        />
        <DetailCard
          title="Location"
          items={[
            { label: "Address", value: outlet.address },
            { label: "City", value: outlet.city },
            {
              label: "State / Zip",
              value: [outlet.state, outlet.zipCode].filter(Boolean).join(" · "),
            },
            { label: "Country", value: outlet.country },
          ]}
        />
        <DetailCard
          title="Login Account"
          items={[
            { label: "Email", value: account?.email ?? "No account yet" },
            { label: "Role", value: account ? humanize(account.role) : null },
            { label: "Status", value: account ? <StatusComp type={account.status} /> : null },
          ]}
        />
      </div>

      <StaffList key={id} branchId={id} onChange={fetchOutlet} />

      <OutletEntry
        open={editOpen}
        outlet={outlet}
        companyOptions={companyOptions}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          fetchOutlet();
        }}
      />
    </div>
  );
}
