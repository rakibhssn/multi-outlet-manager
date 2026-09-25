import React from "react";
import { Link } from "react-router";
import { LuDownload, LuEye, LuPencil, LuTrash2 } from "react-icons/lu";
import { cn } from "@/lib/utils";
import CustomTooltip from "./CustomTooltip";

const ACTIONS = {
  view: { icon: LuEye, title: "View" },
  edit: { icon: LuPencil, title: "Edit" },
  download: { icon: LuDownload, title: "Download" },
  remove: { icon: LuTrash2, title: "Delete", className: "action-btn-danger" },
};

export default function ActionComp({
  view = false,
  viewLabel,
  viewTitle,
  viewAction,
  edit = false,
  editLink,
  editLabel,
  editTitle,
  editAction,
  download = false,
  downloadLabel,
  downloadTitle,
  downloadAction,
  remove = false,
  deleteLabel,
  deleteTitle,
  deleteAction,
  className,
}) {
  return (
    <div className={cn("action-group", className)}>
      {view && (
        <ActionButton type="view" label={viewLabel} title={viewTitle} onClick={viewAction} />
      )}
      {edit && (
        <ActionButton type="edit" label={editLabel} title={editTitle} onClick={editAction} link={editLink} />
      )}
      {download && (
        <ActionButton type="download" label={downloadLabel} title={downloadTitle} onClick={downloadAction} />
      )}
      {remove && (
        <ActionButton type="remove" label={deleteLabel} title={deleteTitle} onClick={deleteAction} />
      )}
    </div>
  );
}

function ActionButton({ type, label, title, onClick, link }) {
  const { icon: Icon, title: fallback, className } = ACTIONS[type];
  const tooltip = title ?? (label ? null : fallback);
  const content = (
    <>
      <Icon className="action-btn-icon" />
      {label && <span>{label}</span>}
    </>
  );
  const classes = cn("action-btn", label && "action-btn-labelled", className);

  const element = link ? (
    <Link to={link} onClick={onClick} aria-label={label || fallback} className={classes}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-label={label || fallback} className={classes}>
      {content}
    </button>
  );

  return <CustomTooltip title={tooltip}>{element}</CustomTooltip>;
}
