import { useAtomValue } from "jotai";
import { userData } from "@/lib/Variables";

export default function useScope() {
  const { user } = useAtomValue(userData);
  const accountType = user?.accountType;

  if (accountType === "HEADQUARTER") {
    return {
      companyId: user.branchId,
      companyName: user.company?.name,
      outletId: null,
      outletName: null,
    };
  }

  if (accountType === "OUTLET" || accountType === "OUTLET_STAFF") {
    return {
      companyId: user.company?.parentId ?? null,
      companyName: user.company?.parent?.name ?? null,
      outletId: user.branchId,
      outletName: user.company?.name,
    };
  }

  return { companyId: null, companyName: null, outletId: null, outletName: null };
}
