import React, { useState } from "react";
import { Link } from "react-router";
import { PiForkKnife } from "react-icons/pi";
import { LuArrowRight, LuLock, LuMail } from "react-icons/lu";
import { useFormik } from "formik";
import { AnimateButton, FoodBackground, InputField } from "@/components/custom";
import { LoginValues } from "@/lib/Schema/FormValues";
import { LoginValidation } from "@/lib/Schema/FormValidation";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { useSetAtom } from "jotai";
import { userData } from "@/lib/Variables";
import { inputProps } from "@/lib/Functions/FormField";

export default function Login() {
  const setLoginData = useSetAtom(userData);
  const notify = useNotify();
  const [loading, setLoading] = useState(false);

  function handleSubmit(values) {
    setLoading(true);

    notify
      .submit(ApiService.post(API_LINK.Login, values), {
        errorText: "Failed to Login",
        onSuccess: (res) => setLoginData({ ...res?.data, isLoggedIn: true }),
      })
      .finally(() => setLoading(false));
  }

  const formik = useFormik({
    initialValues: LoginValues,
    validationSchema: LoginValidation,
    onSubmit: handleSubmit,
  });

  return (
    <div className="login-page">
      <FoodBackground />

      <main className="login-main">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <PiForkKnife className="login-logo-icon" />
            </div>
            <p className="login-brand">Tablewise</p>
            <h1 className="login-title">Welcome Back To Your Kitchen</h1>
          </div>

          <form
            onSubmit={formik.handleSubmit}
            noValidate
            className="login-form"
          >
            <InputField
              type="email"
              label="Work email"
              placeholder="chef@restaurant.com"
              autoComplete="email"
              preIcon={LuMail}
              {...inputProps(formik, "email")}
            />

            <InputField
              type="password"
              label="Password"
              placeholder="••••••••"
              autoComplete="current-password"
              preIcon={LuLock}
              labelAction={
                <Link
                  to="/forgot-password"
                  className="login-link login-link-sm"
                >
                  Forgot password?
                </Link>
              }
              {...inputProps(formik, "password")}
            />

            <AnimateButton
              type="submit"
              fullWidth
              loading={loading}
              loadingText="Signing in…"
              postIcon={LuArrowRight}
              className="login-submit"
            >
              Sign in
            </AnimateButton>
          </form>
        </div>

        <p className="login-footer">
          © {new Date().getFullYear()} Tablewise · Multi-outlet management for
          restaurants, cafés &amp; bars
        </p>
      </main>
    </div>
  );
}
