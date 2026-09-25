import React from "react";
import { Navigate, Outlet } from "react-router";
import { useAtomValue } from "jotai";
import { userData } from "@/lib/Variables";
import { homeFor, isDeveloper } from "@/lib/Menus";

export default function DeveloperRoute() {
  const { user } = useAtomValue(userData);

  return isDeveloper(user) ? <Outlet /> : <Navigate to={homeFor(user)} replace />;
}
