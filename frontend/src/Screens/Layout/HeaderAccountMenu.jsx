import React, { useState } from "react";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router";
import {
  LuChevronDown,
  LuKeyRound,
  LuLogOut,
  LuUserRound,
} from "react-icons/lu";
import { CustomDropDown } from "@/components/custom";
import ApiService, { clearSession } from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { fullName } from "@/lib/Functions/Common";
import { isHQAccount } from "@/lib/Menus";
import { userData } from "@/lib/Variables";

function accountLabels(user) {
  if (isHQAccount(user)) {
    return {
      title: user?.role?.name ?? "",
      subtitle: user?.company?.name ?? "",
    };
  }
  const name =
    (user?.staff && fullName(user.staff)) ||
    user?.company?.contactPersonName ||
    user?.email ||
    "";
  return { title: name, subtitle: user?.role?.name ?? "" };
}

export default function HeaderAccountMenu({ user }) {
  const navigate = useNavigate();
  const { refreshToken } = useAtomValue(userData);
  const [signingOut, setSigningOut] = useState(false);
  const accountLink = `${isHQAccount(user) ? "/hq" : "/outlet"}/account`;
  const labels = accountLabels(user);

  const signOut = () => {
    if (signingOut) return;
    setSigningOut(true);
    ApiService.post(API_LINK.Logout, { refreshToken })
      .catch(() => undefined)
      .finally(clearSession);
  };

  return (
    <CustomDropDown
      trigger={
        <button type="button" className="account-box">
          <span className="account-avatar">
            {labels.title.charAt(0).toUpperCase()}
          </span>
          <span className="account-meta">
            <span className="account-name">{labels.title}</span>
            <span className="account-role">{labels.subtitle}</span>
          </span>
          <LuChevronDown className="account-chevron" />
        </button>
      }
      groups={[
        {
          label: user?.email,
          items: [
            {
              label: "My Account",
              icon: LuUserRound,
              onClick: () => navigate(accountLink),
            },
            {
              label: "Change Password",
              icon: LuKeyRound,
              onClick: () => navigate(`${accountLink}?tab=password`),
            },
          ],
        },
        {
          items: [
            {
              label: signingOut ? "Signing Out..." : "Sign Out",
              icon: LuLogOut,
              variant: "destructive",
              onClick: signOut,
            },
          ],
        },
      ]}
    />
  );
}
