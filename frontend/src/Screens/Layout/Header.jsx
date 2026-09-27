import React from "react";
import { Link } from "react-router";
import { PiForkKnife } from "react-icons/pi";
import { useAtomValue } from "jotai";
import { userData } from "@/lib/Variables";
import { homeFor } from "@/lib/Menus";
import useCan from "@/hooks/useCan";
import HeaderAccountMenu from "./HeaderAccountMenu";
import ShiftButton from "./ShiftButton";

export default function Header() {
  const { user, access } = useAtomValue(userData);
  const can = useCan();

  return (
    <header className="layout-header">
      <Link to={homeFor(user, access)} className="layout-logo">
        <span className="layout-logo-mark">
          <PiForkKnife />
        </span>
        <span className="layout-logo-text">Tablewise</span>
      </Link>
      <div className="layout-header-actions">
        {user?.accountType === "OUTLET_STAFF" && can("shifts.self") && (
          <ShiftButton />
        )}
        {user && <HeaderAccountMenu user={user} />}
      </div>
    </header>
  );
}
