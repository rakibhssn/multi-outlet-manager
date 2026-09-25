import React, { useId } from "react";

export function useFieldId(id, name) {
  const auto = useId();
  return id || `${name || "field"}-${auto.replace(/[^a-zA-Z0-9-_]/g, "")}`;
}

export function describedBy(id, error, hint) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export function renderIcon(icon, className) {
  if (!icon) return null;
  if (React.isValidElement(icon)) {
    return React.cloneElement(icon, {
      className: [className, icon.props.className].filter(Boolean).join(" "),
    });
  }
  if (typeof icon === "string") return icon;
  return React.createElement(icon, { className });
}

export function normalizeOptions(options = []) {
  return options.map((opt) =>
    typeof opt === "object"
      ? { ...opt, value: String(opt.value) }
      : { label: String(opt), value: String(opt) },
  );
}

export function blurEvent(name, value) {
  return { type: "blur", persist() {}, target: { name, value } };
}
