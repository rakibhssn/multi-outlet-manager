import React, { useState } from "react";
import { LuLogOut, LuMonitorSmartphone } from "react-icons/lu";
import { AnimateButton, StatusComp } from "@/components/custom";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { formatDateTime } from "@/lib/Functions/Common";
import { deviceLabel } from "./deviceLabel";

export default function SessionList({ sessions, onChange }) {
  const notify = useNotify();
  const [busy, setBusy] = useState(null);
  const others = sessions.filter((session) => !session.current);

  const revoke = (key, request) => {
    setBusy(key);
    notify
      .submit(request, { errorText: "Could not sign out", onSuccess: onChange })
      .finally(() => setBusy(null));
  };

  return (
    <section className="account-card">
      <div className="account-card-head account-card-head-row">
        <div>
          <h2 className="account-card-title">Where you're signed in</h2>
          <p className="account-card-text">
            Sign out of a device you no longer use. Its tokens stop working
            straight away.
          </p>
        </div>
        {others.length > 0 && (
          <AnimateButton
            variant="outline"
            size="sm"
            preIcon={LuLogOut}
            label="Sign out other sessions"
            loading={busy === "all"}
            onClick={() =>
              revoke("all", ApiService.delete(API_LINK.AccountSessions))
            }
          />
        )}
      </div>
      <ul className="session-list">
        {sessions.map((session) => (
          <li key={session.id} className="session-row">
            <LuMonitorSmartphone className="session-icon" />
            <div className="session-info">
              <span className="cell-title">
                {deviceLabel(session.userAgent)}
              </span>
              <span className="cell-sub">
                {session.ip ?? "Unknown IP"} · Active{" "}
                {formatDateTime(session.lastUsedAt)} · Signed in{" "}
                {formatDateTime(session.createdAt)}
              </span>
            </div>
            {session.current ? (
              <StatusComp type="ACTIVE" label="This device" />
            ) : (
              <AnimateButton
                variant="outline"
                size="sm"
                label="Sign out"
                loading={busy === session.id}
                disabled={!!busy}
                onClick={() =>
                  revoke(
                    session.id,
                    ApiService.delete(API_LINK.AccountSession(session.id)),
                  )
                }
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
