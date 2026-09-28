import React from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { LuCircleCheck, LuMessageSquare } from "react-icons/lu";
import { personName } from "@/lib/Functions/Common";

const ago = (value) =>
  formatDistanceToNowStrict(new Date(value), { addSuffix: true });

export default function ReminderThread({ reminder }) {
  const replies = reminder.replies ?? [];
  if (!reminder.acceptedAt && !replies.length) return null;

  return (
    <div className="reminder-thread">
      {reminder.acceptedAt && (
        <span className="reminder-accepted">
          <LuCircleCheck />
          Accepted by {personName(reminder.acceptedBy) || "outlet"} ·{" "}
          {ago(reminder.acceptedAt)}
        </span>
      )}
      {replies
        .filter((reply) => reply.message)
        .map((reply) => (
          <div key={reply.id} className="reminder-reply">
            <LuMessageSquare className="reminder-reply-icon" />
            <div className="reminder-reply-body">
              <p className="reminder-reply-text">{reply.message}</p>
              <span className="reminder-reply-meta">
                {personName(reply.author) || "Outlet"}
                {reply.author?.role?.name
                  ? ` (${reply.author.role.name})`
                  : ""}{" "}
                · {ago(reply.createdAt)}
                {reply.accepted ? " · accepted" : ""}
              </span>
            </div>
          </div>
        ))}
    </div>
  );
}
