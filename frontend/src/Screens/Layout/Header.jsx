import React from "react";
import { Link } from "react-router";
import { PiForkKnife } from "react-icons/pi";
import { useAtomValue } from "jotai";
import { userData } from "@/lib/Variables";
import { homeFor } from "@/lib/Menus";
import HeaderAccountMenu from "./HeaderAccountMenu";

export default function Header() {
  const { user } = useAtomValue(userData);

  return (
    <header className="layout-header">
      <Link to={homeFor(user)} className="layout-logo">
        <span className="layout-logo-mark">
          <PiForkKnife />
        </span>
        <span className="layout-logo-text">Tablewise</span>
      </Link>
      <div className="layout-header-actions">
        {user && <HeaderAccountMenu user={user} />}
      </div>
    </header>
  );
}
