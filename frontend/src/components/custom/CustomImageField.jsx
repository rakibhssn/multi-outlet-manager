import React, { useRef, useState } from "react";
import { LuImage, LuImageOff, LuUpload, LuX } from "react-icons/lu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { cn } from "@/lib/utils";
import FormField from "./FormField";
import { blurEvent, describedBy, useFieldId } from "./fieldUtils";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function CustomImageField({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  folder = "general",
  maxSize = 5,
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [broken, setBroken] = useState(false);
  const invalid = !!(showError && error) || !!uploadError;

  const change = (url) => {
    setBroken(false);
    onChange?.(url, name);
  };

  function upload(file) {
    if (!file) return;
    setUploadError("");

    if (!IMAGE_TYPES.includes(file.type)) {
      setUploadError("Only JPG, PNG, WEBP or GIF images are allowed.");
      return;
    }
    if (file.size > maxSize * 1024 * 1024) {
      setUploadError(`Image must be ${maxSize}MB or smaller.`);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);

    ApiService.post(API_LINK.UploadImage(folder), formData)
      .then((res) => {
        if (res.status === "success") {
          change(res?.data?.url ?? "");
        } else {
          setUploadError(res.message);
        }
      })
      .catch((err) => {
        setUploadError(err?.response?.data?.message ?? "Failed to upload image");
      })
      .finally(() => {
        setUploading(false);
        onBlur?.(blurEvent(name, value));
      });
  }

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
      <div className="image-field">
        <div className="image-field-preview">
          {value && !broken ? (
            <img src={value} alt="" onError={() => setBroken(true)} />
          ) : value && broken ? (
            <LuImageOff />
          ) : (
            <LuImage />
          )}
          {value && !disabled && (
            <button
              type="button"
              aria-label="Remove image"
              onClick={() => change("")}
              className="image-field-remove"
            >
              <LuX />
            </button>
          )}
        </div>

        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled || uploading || undefined}
          onClick={() => !disabled && !uploading && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (!disabled && !uploading && (e.key === "Enter" || e.key === " ")) {
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
            if (!disabled && !uploading) upload(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "image-field-drop",
            dragging && "upload-zone-active",
            (disabled || uploading) && "upload-zone-disabled",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            disabled={disabled}
            onChange={(e) => {
              upload(e.target.files?.[0]);
              e.target.value = "";
            }}
            className="hidden"
          />
          {uploading ? <Spinner className="image-field-drop-icon" /> : <LuUpload className="image-field-drop-icon" />}
          <p className="upload-title">
            {uploading ? "Uploading..." : dragging ? "Drop the image here" : "Click to upload or drag and drop"}
          </p>
          <p className="upload-limit">JPG, PNG, WEBP or GIF · up to {maxSize}MB</p>
        </div>
      </div>

      <InputGroup data-disabled={disabled || undefined} className="field-group">
        <InputGroupAddon align="inline-start">
          <span className="image-field-or">or URL</span>
        </InputGroupAddon>
        <InputGroupInput
          id={fieldId}
          type="url"
          placeholder="https://..."
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => change(e.target.value)}
          onBlur={onBlur}
          aria-invalid={invalid}
          aria-describedby={describedBy(fieldId, invalid && (uploadError || error), hint)}
          className="field-group-input"
        />
      </InputGroup>
    </FormField>
  );
}
