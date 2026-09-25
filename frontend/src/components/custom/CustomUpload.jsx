import React, { useEffect, useMemo, useRef, useState } from "react";
import { LuFile, LuUpload, LuX } from "react-icons/lu";
import { cn } from "@/lib/utils";
import FormField from "./FormField";
import { useFieldId } from "./fieldUtils";

export default function CustomUpload({
  id,
  name,
  label,
  value,
  onChange,
  multiple = false,
  maxFiles = multiple ? 5 : 1,
  maxSize = 5,
  accept = "image/*,.pdf",
  helperText,
  error,
  showError = true,
  hint,
  required,
  disabled,
  labelAction,
  className,
}) {
  const fieldId = useFieldId(id, name);
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const files = useMemo(() => {
    if (multiple) return value ?? [];
    return value ? [value] : [];
  }, [multiple, value]);

  const previews = useMemo(
    () => files.map((file) => (file.type?.startsWith("image/") ? URL.createObjectURL(file) : null)),
    [files],
  );

  useEffect(
    () => () => previews.forEach((url) => url && URL.revokeObjectURL(url)),
    [previews],
  );

  const emit = (next) => onChange?.(multiple ? next : next[0] ?? null, name);

  const processFiles = (incoming) => {
    setUploadError("");
    const valid = incoming.filter((file) => {
      if (file.size > maxSize * 1024 * 1024) {
        setUploadError(`${file.name} exceeds the ${maxSize}MB limit.`);
        return false;
      }
      return true;
    });
    if (!valid.length) return;
    if (!multiple) return emit([valid[0]]);
    const merged = [...files, ...valid];
    if (merged.length > maxFiles) setUploadError(`You can upload up to ${maxFiles} files.`);
    emit(merged.slice(0, maxFiles));
  };

  const removeFile = (index) => {
    setUploadError("");
    emit(files.filter((_, i) => i !== index));
  };

  return (
    <FormField
      id={fieldId}
      label={label}
      required={required}
      hint={hint}
      error={uploadError || error}
      showError={!!uploadError || showError}
      labelAction={labelAction}
      className={className}
    >
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) processFiles(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "upload-zone",
          dragging && "upload-zone-active",
          disabled && "upload-zone-disabled",
        )}
      >
        <input
          ref={inputRef}
          id={fieldId}
          name={name}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => {
            processFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
          className="hidden"
        />
        <span className="upload-icon">
          <LuUpload />
        </span>
        <p className="upload-title">
          {dragging
            ? `Drop your ${multiple ? "files" : "file"} here`
            : "Click to upload or drag and drop"}
        </p>
        <p className="upload-subtitle">
          {helperText ?? (accept === "image/*" ? "PNG, JPG, JPEG, WEBP" : `Select your ${multiple ? "files" : "file"}`)}
        </p>
        <p className="upload-limit">
          Maximum {maxSize}MB per file
          {multiple && ` · Up to ${maxFiles} files`}
        </p>
      </div>

      {files.length > 0 && (
        <div className="upload-list">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="upload-item">
              <div className="upload-preview">
                {previews[index] ? (
                  <img src={previews[index]} alt={file.name} />
                ) : (
                  <LuFile />
                )}
              </div>
              <div className="upload-meta">
                <p title={file.name} className="upload-name">
                  {file.name}
                </p>
                <p className="upload-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => removeFile(index)}
                className="upload-remove"
              >
                <LuX />
              </button>
            </div>
          ))}
        </div>
      )}
    </FormField>
  );
}
