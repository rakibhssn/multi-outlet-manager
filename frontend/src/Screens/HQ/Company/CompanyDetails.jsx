import React, { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { format } from "date-fns";
import { LuArrowLeft, LuPencil } from "react-icons/lu";
import { AnimateButton, StatusComp } from "@/components/custom";
import { Skeleton } from "@/components/ui/skeleton";
import { DetailCard, PageHeader } from "@/Screens/Layout/DashboardBlocks";
import OutletList from "@/Screens/HQ/Outlet/OutletList";
import useRecord from "@/hooks/useRecord";
import { API_LINK } from "@/lib/API_LINK";
import CompanyEntry from "./CompanyEntry";
import { roleLabel } from "@/lib/Functions/Common";

export default function CompanyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    record: company,
    loading,
    reload: fetchCompany,
  } = useRecord(API_LINK.CompanyDetails(id), {
    breadcrumb: `/hq/company/${id}`,
    errorText: "Failed to load company",
  });
  const [editOpen, setEditOpen] = useState(false);

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
        <PageHeader
          title="Company not found"
          subtitle="It may have been deleted."
          actions={back}
        />
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
            <AnimateButton
              preIcon={LuPencil}
              label="Edit Company"
              onClick={() => setEditOpen(true)}
            />
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
              value: company.createdAt
                ? format(new Date(company.createdAt), "dd MMM yyyy")
                : null,
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
              value: [company.state, company.zipCode]
                .filter(Boolean)
                .join(" · "),
            },
            { label: "Country", value: company.country },
          ]}
        />
        <DetailCard
          title="Login Account"
          items={[
            { label: "Email", value: account?.email ?? "No account yet" },
            { label: "Role", value: roleLabel(account) },
            {
              label: "Status",
              value: account ? <StatusComp type={account.status} /> : null,
            },
          ]}
        />
      </div>

      <OutletList
        key={id}
        companyId={id}
        companyName={company.name}
        onChange={fetchCompany}
      />

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
