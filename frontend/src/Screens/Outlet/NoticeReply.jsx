import React, { useEffect, useState } from "react";
import { CustomDialog, CustomTextarea } from "@/components/custom";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";

export default function NoticeReply({ target, onClose, onSaved }) {
  const notify = useNotify();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const accept = target?.mode === "accept";

  useEffect(() => setMessage(""), [target]);

  function handleSubmit() {
    setSaving(true);
    notify
      .submit(
        ApiService.post(API_LINK.ReminderReplies(target.notice.id), {
          message,
          accept,
        }),
        {
          errorText: accept
            ? "Failed to accept the notice"
            : "Failed to send the reply",
          onSuccess: () => onSaved?.(),
        },
      )
      .finally(() => setSaving(false));
  }

  return (
    <CustomDialog
      open={!!target}
      openChange={(next) => !next && onClose?.()}
      title={accept ? "Accept Notice" : "Reply to Notice"}
      description={
        target
          ? accept
            ? `Confirm to headquarters that you take on "${target.notice.title}".`
            : `Send a note to headquarters about "${target.notice.title}".`
          : ""
      }
      submitLabel={accept ? "Accept" : "Send Reply"}
      submitLoading={saving}
      submitDisabled={!accept && !message.trim()}
      onSubmit={handleSubmit}
    >
      <CustomTextarea
        label={accept ? "Note" : "Reply"}
        placeholder={
          accept
            ? "Optional, e.g. we will finish it by 5 PM"
            : "Write your reply"
        }
        required={!accept}
        rows={3}
        maxLength={500}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
    </CustomDialog>
  );
}
