import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useSetAtom } from "jotai";
import { format } from "date-fns";
import { LuArrowLeft, LuPencil } from "react-icons/lu";
import { AnimateButton, StatusComp } from "@/components/custom";
import { Skeleton } from "@/components/ui/skeleton";
import { DetailCard, PageHeader } from "@/Screens/Layout/DashboardBlocks";
import OutletList from "@/Screens/HQ/Outlet/OutletList";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { breadcrumbLabels, notificationModal } from "@/lib/Variables";
import CompanyEntry from "./CompanyEntry";

const humanize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function CompanyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setNotification = useSetAtom(notificationModal);
  const setLabels = useSetAtom(breadcrumbLabels);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const fetchCompany = useCallback(() => {
    setLoading(true);

    ApiService.get(API_LINK.CompanyDetails(id))
      .then((res) => {
        if (res.status === "success") {
          setCompany(res?.data);
          setLabels((prev) => ({ ...prev, [`/hq/company/${id}`]: res?.data?.name }));
        } else {
          setNotification({
            open: true,
            title: "Error",
            description: res.message,
          });
        }
      })
      .catch((error) => {
        setCompany(null);
        setNotification({
          open: true,
          title: "Error",
          description: error?.response?.data?.message ?? "Failed to load company",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, setLabels, setNotification]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  const back = (
    <AnimateButton
      variant="outline"
      preIcon={LuArrowLeft}
      label="Back"
      onClick={() => navigate("/hq/company")}
    />
  );

  if (loading && !company) {
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

  if (!company) {
    return (
      <div className="page">
        <PageHeader title="Company not found" subtitle="It may have been deleted." actions={back} />
      </div>
    );
  }

  const account = company.users?.[0];

  return (
    <div className="page">
      <PageHeader
        title={company.name}
        subtitle="Company details and its outlets"
        actions={
          <>
            {back}
            <AnimateButton preIcon={LuPencil} label="Edit Company" onClick={() => setEditOpen(true)} />
          </>
        }
      />

      <div className="detail-grid">
        <DetailCard
          title="Company"
          items={[
            { label: "Name", value: company.name },
            { label: "Status", value: <StatusComp type={company.status} /> },
            { label: "Outlets", value: String(company._count?.children ?? 0) },
            {
              label: "Created",
              value: company.createdAt ? format(new Date(company.createdAt), "dd MMM yyyy") : null,
            },
          ]}
        />
        <DetailCard
          title="Contact Person"
          items={[
            { label: "Name", value: company.contactPersonName },
            { label: "Email", value: company.contactPersonEmail },
            { label: "Phone", value: company.contactPersonPhone },
          ]}
        />
        <DetailCard
          title="Location"
          items={[
            { label: "Address", value: company.address },
            { label: "City", value: company.city },
            {
              label: "State / Zip",
              value: [company.state, company.zipCode].filter(Boolean).join(" · "),
            },
            { label: "Country", value: company.country },
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

      <OutletList key={id} companyId={id} onChange={fetchCompany} />

      <CompanyEntry
        open={editOpen}
        company={company}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          fetchCompany();
        }}
      />
    </div>
  );
}
