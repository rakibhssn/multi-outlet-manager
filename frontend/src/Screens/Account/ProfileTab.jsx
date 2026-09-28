import React from "react";
import { LuShieldCheck } from "react-icons/lu";
import { DetailCard } from "@/Screens/Layout/DashboardBlocks";
import {
  formatDate,
  formatDateTime,
  fullName,
  humanize,
  labelOf,
} from "@/lib/Functions/Common";
import { DESIGNATION_OPTIONS } from "@/lib/Constant";

function branchItems(account) {
  const branch = account.company;
  if (!branch) return [];
  if (branch.parent) {
    return [
      { label: "Outlet", value: branch.name },
      { label: "Company", value: branch.parent.name },
    ];
  }
  return [{ label: "Company", value: branch.name }];
}

export default function ProfileTab({ account }) {
  const staff = account.staff;

  return (
    <div className="account-tab">
      <p className="account-role">
        <LuShieldCheck />
        <span>
          Signed in as <strong>{account.role?.name}</strong>
          {account.role?.description ? ` — ${account.role.description}` : ""}
        </span>
      </p>

      <div className="account-grid">
        <DetailCard
          title="Account information"
          items={[
            { label: "Login email", value: account.email },
            { label: "Account type", value: humanize(account.accountType) },
            { label: "Role", value: account.role?.name },
            ...branchItems(account),
          ]}
        />
        <DetailCard
          title="Sign-in activity"
          items={[
            {
              label: "Last signed in",
              value: formatDateTime(account.lastLoginAt),
            },
            {
              label: "Password last changed",
              value:
                formatDateTime(account.passwordChangedAt) ?? "Never changed",
            },
            { label: "Account created", value: formatDate(account.createdAt) },
          ]}
        />
        {staff && (
          <DetailCard
            title="Staff profile"
            items={[
              { label: "Name", value: fullName(staff) },
              { label: "Badge", value: staff.badgeNumber },
              {
                label: "Designation",
                value: labelOf(DESIGNATION_OPTIONS, staff.designation),
              },
              { label: "Job title", value: staff.jobTitle },
              { label: "Phone", value: staff.phone },
              { label: "Hired", value: formatDate(staff.hireDate) },
            ]}
          />
        )}
      </div>

      <p className="account-note">
        Your login email, role and outlet are managed by your headquarter. Ask
        them if anything here needs to change.
      </p>
    </div>
  );
}
