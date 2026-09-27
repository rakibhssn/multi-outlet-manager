import { useEffect } from "react";
import { useSetAtom } from "jotai";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { userData } from "@/lib/Variables";

export default function useAccessSync() {
  const setLoginData = useSetAtom(userData);

  useEffect(() => {
    ApiService.get(API_LINK.Me)
      .then((res) =>
        setLoginData((prev) =>
          prev.isLoggedIn
            ? {
                ...prev,
                user: res?.data?.user ?? prev.user,
                access: res?.data?.access,
              }
            : prev,
        ),
      )
      .catch(() => undefined);
  }, [setLoginData]);
}
