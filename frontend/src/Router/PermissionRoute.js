import React from "react";
import { Navigate, Outlet, Route, useLocation } from "react-router";
import { useAtomValue } from "jotai";
import { LuShieldOff } from "react-icons/lu";
import { userData } from "@/lib/Variables";
import { homeFor } from "@/lib/Menus";
import { canAccess, hasAccess } from "@/lib/Access";

export default function PermissionRoute({ permission }) {
  const { user, access } = useAtomValue(userData);
  const { pathname } = useLocation();

  if (!hasAccess(access)) return null;
  if (canAccess(access, permission)) return <Outlet />;

  const home = homeFor(user, access);
  if (home === pathname) {
    return (
      <div className="no-access">
        <LuShieldOff className="no-access-icon" />
        <p className="no-access-title">No access</p>
        <p className="no-access-text">
          Your role has no pages enabled. Please contact your administrator.
        </p>
      </div>
    );
  }

  return <Navigate to={home} replace />;
}

export const guarded = (permission, ...routes) => (
  <Route key={permission} element={<PermissionRoute permission={permission} />}>
    {routes.map((route) =>
      React.cloneElement(route, { key: route.props.path }),
    )}
  </Route>
);
