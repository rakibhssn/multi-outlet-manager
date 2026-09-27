import React, { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { LuCoffee, LuLogIn, LuLogOut, LuPlay } from "react-icons/lu";
import { AnimateButton } from "@/components/custom";
import useConfirm from "@/hooks/useConfirm";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { formatDuration } from "@/lib/Functions/Common";
import { cn } from "@/lib/utils";
import { shiftRefresh } from "@/lib/Variables";
import { openBreakOf } from "@/Screens/Outlet/Shift/shiftTime";

const TICK_INTERVAL = 60000;

export default function ShiftButton() {
  const notify = useNotify();
  const confirm = useConfirm();
  const [version, setVersion] = useAtom(shiftRefresh);
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(null);
  const [, setTick] = useState(0);
  const shift = state?.shift;
  const onBreak = openBreakOf(shift);

  useEffect(() => {
    notify.load(ApiService.get(API_LINK.ShiftMe), {
      errorText: "Failed to load your shift",
      onSuccess: (res) => setState(res.data),
    });
  }, [version, notify]);

  useEffect(() => {
    if (!shift) return undefined;
    const timer = setInterval(() => setTick((n) => n + 1), TICK_INTERVAL);
    return () => clearInterval(timer);
  }, [shift]);

  if (!state?.staff) return null;

  const send = (action, link) => {
    setBusy(action);
    notify
      .submit(ApiService.post(link), {
        errorText: "Failed to update your shift",
        onSuccess: () => {
          confirm.close();
          setVersion((n) => n + 1);
        },
      })
      .finally(() => setBusy(null));
  };

  const endShift = () =>
    confirm.ask({
      title: "End Shift",
      body: `End your shift now? You have been on shift for ${formatDuration(shift.clockInAt)}.`,
      label: "End Shift",
      onConfirm: () => send("shift", API_LINK.ShiftEnd),
    });

  if (!shift) {
    return (
      <AnimateButton
        size="sm"
        preIcon={LuLogIn}
        label="Start Shift"
        loading={busy === "shift"}
        onClick={() => send("shift", API_LINK.ShiftStart)}
      />
    );
  }

  return (
    <div className="shift-button">
      <span
        className={cn(
          "shift-button-status",
          onBreak && "shift-button-status-break",
        )}
      >
        <span className="shift-dot" />
        {onBreak
          ? `On break · ${formatDuration(onBreak.startAt)}`
          : `On shift · ${formatDuration(shift.clockInAt)}`}
      </span>
      <AnimateButton
        size="sm"
        variant="outline"
        preIcon={onBreak ? LuPlay : LuCoffee}
        label={onBreak ? "End Break" : "Take Break"}
        loading={busy === "break"}
        onClick={() =>
          send(
            "break",
            onBreak ? API_LINK.ShiftBreakEnd : API_LINK.ShiftBreakStart,
          )
        }
      />
      <AnimateButton
        size="sm"
        variant="outline"
        preIcon={LuLogOut}
        label="End Shift"
        loading={busy === "shift"}
        onClick={endShift}
      />
    </div>
  );
}
