import React from "react";
import { useSetAtom } from "jotai";
import {
  LuChevronDown,
  LuKeyRound,
  LuLogOut,
  LuUserRound,
} from "react-icons/lu";
import { CustomDropDown } from "@/components/custom";
import { userData } from "@/lib/Variables";

const humanize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function HeaderAccountMenu({ user }) {
  const setUserData = useSetAtom(userData);

  const signOut = () => setUserData({ isLoggedIn: false, user: null });

  return (
    <CustomDropDown
      trigger={
        <button type="button" className="account-box">
          <span className="account-avatar">
            {humanize(user?.role).charAt(0).toUpperCase()}
          </span>
          <span className="account-meta">
            <span className="account-name">{humanize(user?.role)}</span>
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
            { label: "My Account", icon: LuUserRound },
            { label: "Change Password", icon: LuKeyRound },
          ],
        },
        {
          items: [
            {
              label: "Sign Out",
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
