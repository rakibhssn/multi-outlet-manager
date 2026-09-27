import { format } from "date-fns";

export const fieldProps = (formik, name) => ({
  value: formik.values[name],
  onBlur: formik.handleBlur(name),
  error: formik.errors[name],
  showError: !!(formik.touched[name] && formik.errors[name]),
});

export const inputProps = (formik, name) => ({
  ...fieldProps(formik, name),
  onChange: formik.handleChange(name),
});

export const selectProps = (formik, name) => ({
  ...fieldProps(formik, name),
  onValueChange: formik.handleChange(name),
});

export const dateProps = (formik, name) => ({
  ...fieldProps(formik, name),
  onChange: (date) =>
    formik.handleChange(name)(date ? format(date, "yyyy-MM-dd") : ""),
});
