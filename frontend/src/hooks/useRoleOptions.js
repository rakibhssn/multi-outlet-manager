import { useEffect, useState } from "react";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import useNotify from "./useNotify";

const FIELD = "userRoleId";

const DEFAULT_ROLE = { OUTLET: "ADMIN", OUTLET_STAFF: "USER" };

const toOption = (role) => ({
  value: role.id,
  label: role.shared ? role.name : `${role.name} (company)`,
  key: role.key,
});

const pick = (options, account, accountType) =>
  options.find((option) => option.value === account?.role?.id) ??
  options.find((option) => option.key === DEFAULT_ROLE[accountType]);

export default function useRoleOptions({
  accountType,
  companyId,
  account,
  formik,
  enabled = true,
}) {
  const notify = useNotify();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const current = formik.values[FIELD];
  const setField = formik.setFieldValue;

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    const params = { companyId: companyId || undefined };
    notify
      .load(ApiService.get(API_LINK.RoleOptions, { params }), {
        errorText: "Failed to load roles",
        onSuccess: (res) => setOptions((res.data ?? []).map(toOption)),
      })
      .finally(() => setLoading(false));
  }, [companyId, enabled, notify]);

  useEffect(() => {
    if (!options.length || options.some((option) => option.value === current))
      return;
    const match = pick(options, account, accountType);
    if (match) setField(FIELD, match.value, false);
  }, [current, options, account, accountType, setField]);

  return { options, loading };
}
