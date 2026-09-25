import { Routes, Route, BrowserRouter, Navigate } from "react-router";
import { useAtomValue } from "jotai";
import Login from "../Screens/Auth/Login";
import AuthWrapper from "@/Screens/Layout/AuthWrapper";
import HQRouter from "./HQRouter";
import OutletRouter from "./OutletRouter";
import { userData } from "@/lib/Variables";
import { homeFor, isHQAccount } from "@/lib/Menus";

export default function MainRoute() {
  const { isLoggedIn, user } = useAtomValue(userData);

  const isHQ = isHQAccount(user);
  const home = homeFor(user);

  const guest = (page) => (isLoggedIn ? <Navigate to={home} replace /> : page);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={guest(<Login />)} />
        <Route path="/login" element={guest(<Login />)} />

        <Route
          element={
            isLoggedIn ? <AuthWrapper /> : <Navigate to="/login" replace />
          }
        >
          {isHQ ? HQRouter : OutletRouter}
        </Route>

        <Route
          path="*"
          element={<Navigate to={isLoggedIn ? home : "/login"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
