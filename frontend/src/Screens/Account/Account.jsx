import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { LuKeyRound, LuUserRound } from "react-icons/lu";
import { CustomTab } from "@/components/custom";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/Screens/Layout/DashboardBlocks";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import PasswordTab from "./PasswordTab";
import ProfileTab from "./ProfileTab";

const TABS = ["profile", "password"];

export default function Account() {
  const notify = useNotify();
  const [searchParams, setSearchParams] = useSearchParams();
  const [account, setAccount] = useState(null);
  const requested = searchParams.get("tab");
  const tab = TABS.includes(requested) ? requested : TABS[0];

  const load = useCallback(
    () =>
      notify.load(ApiService.get(API_LINK.Account), {
        errorText: "Failed to load your account",
        onSuccess: (res) => setAccount(res.data),
      }),
    [notify],
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page">
      <PageHeader
        title="My account"
        subtitle="See your account details, change the password you sign in with, and manage where you're signed in."
      />

      {!account && <Skeleton className="h-80 rounded-lg" />}

      {account && (
        <CustomTab
          value={tab}
          onChange={(value) =>
            value && setSearchParams(value === TABS[0] ? {} : { tab: value })
          }
          tabs={[
            {
              key: "profile",
              label: "Profile",
              icon: LuUserRound,
              content: <ProfileTab account={account} />,
            },
            {
              key: "password",
              label: "Password & sessions",
              icon: LuKeyRound,
              content: (
                <PasswordTab sessions={account.sessions} onChange={load} />
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
