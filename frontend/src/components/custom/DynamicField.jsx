import React from "react";
import AutoCompleteField from "./AutoCompleteField";
import CustomCheckbox from "./CustomCheckbox";
import CustomCheckboxGroup from "./CustomCheckboxGroup";
import CustomDatepicker from "./CustomDatepicker";
import CustomRadioField from "./CustomRadioField";
import CustomSelectField from "./CustomSelectField";
import CustomSwitch from "./CustomSwitch";
import CustomTextarea from "./CustomTextarea";
import CustomTimepicker from "./CustomTimepicker";
import CustomUpload from "./CustomUpload";
import CustomImageField from "./CustomImageField";
import InputField from "./InputField";

const INPUT_TYPES = ["text", "email", "password", "number", "tel", "url", "search"];

const FIELD_COMPONENTS = {
  textarea: CustomTextarea,
  select: CustomSelectField,
  autocomplete: AutoCompleteField,
  date: CustomDatepicker,
  time: CustomTimepicker,
  checkbox: CustomCheckbox,
  "checkbox-group": CustomCheckboxGroup,
  radio: CustomRadioField,
  switch: CustomSwitch,
  upload: CustomUpload,
  image: CustomImageField,
};

export default function DynamicField({ type = "text", ...props }) {
  if (INPUT_TYPES.includes(type)) return <InputField type={type} {...props} />;

  const Component = FIELD_COMPONENTS[type];
  if (!Component) {
    console.warn(`DynamicField: unknown field type "${type}"`);
    return null;
  }
  return <Component {...props} />;
}
