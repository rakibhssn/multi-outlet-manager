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
import { isHQAccount } from "@/lib/Menus";
import { userData } from "@/lib/Variables";

export default function HeaderAccountMenu({ user }) {
  const navigate = useNavigate();
  const { refreshToken } = useAtomValue(userData);
  const [signingOut, setSigningOut] = useState(false);
  const accountLink = `${isHQAccount(user) ? "/hq" : "/outlet"}/account`;

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
            {(user?.role?.name ?? "").charAt(0).toUpperCase()}
          </span>
          <span className="account-meta">
            <span className="account-name">{user?.role?.name ?? ""}</span>
            <span className="account-role">
              {user?.company?.name ? `${user.company.name}` : ""}
            </span>
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
