import { useCallback } from "react";
import { useAtomValue } from "jotai";
import { userData } from "@/lib/Variables";
import { canAccess } from "@/lib/Access";

export default function useCan() {
  const { access } = useAtomValue(userData);
  return useCallback((permission) => canAccess(access, permission), [access]);
}
