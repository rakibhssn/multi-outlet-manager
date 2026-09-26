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
import OutletItemList from "./OutletItemList";
import OutletStockOut from "./OutletStockOut";
import OutletSalesChart from "./OutletSalesChart";
import OutletSummaryCard from "./OutletSummaryCard";

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
  const [stockOutOpen, setStockOutOpen] = useState(false);

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
    ApiService.get(API_LINK.Company, { params: { per_page: 100, sort_by: "name", order_by: "asc" } })
      .then((res) => {
        if (res.status === "success") {
          setCompanyOptions(
            (res?.data ?? []).map((item) => ({ label: item.name, value: item.id })),
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


  return (
    <div className="page">
      <PageHeader
        title={outlet.name}
        subtitle={
          <span className="page-meta">
            {outlet.parent &&
              (isDeveloper(user) ? (
                <Link to={`/hq/company/${outlet.parent.id}`} className="detail-link">
                  {outlet.parent.name}
                </Link>
              ) : (
                <span>{outlet.parent.name}</span>
              ))}
            <StatusComp type={outlet.status} />
            {outlet.createdAt && (
              <span>Since {format(new Date(outlet.createdAt), "dd MMM yyyy")}</span>
            )}
          </span>
        }
        actions={
          <>
            {back}
            <AnimateButton preIcon={LuPencil} label="Edit Outlet" onClick={() => setEditOpen(true)} />
          </>
        }
      />

      <div className="detail-grid">
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
        <OutletSalesChart
          data={outlet.summary?.dailySales ?? []}
          sample={!!outlet.summary?.dailySalesSample}
        />
        <OutletSummaryCard
          summary={outlet.summary}
          onStockOutClick={() => setStockOutOpen(true)}
        />
      </div>

      <div className="outlet-lists">
        <StaffList key={id} branchId={id} compact onChange={fetchOutlet} />
        <OutletItemList key={`items-${id}`} outlet={outlet} onChange={fetchOutlet} />
      </div>

      <OutletStockOut
        open={stockOutOpen}
        outlet={outlet}
        onClose={() => setStockOutOpen(false)}
        onChange={fetchOutlet}
      />

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
