import { useCallback, useState } from "react";

const readValue = (input) => {
  if (!input || typeof input !== "object" || !("target" in input)) return input;
  const { type, checked, value } = input.target;
  return type === "checkbox" ? checked : value;
};

export default function useForm(initialValues = {}, validate) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const setValue = useCallback((input, name) => {
    const value = readValue(input);
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  }, []);

  const bind = (name) => {
    const onChange = (input) => setValue(input, name);
    return {
      name,
      value: values[name],
      values: values[name],
      error: errors[name],
      onChange,
      onValueChange: onChange,
    };
  };

  const runValidation = () => {
    const next = validate ? validate(values) : {};
    setErrors(next);
    return Object.values(next).every((msg) => !msg);
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
  };

  return { values, errors, setValue, setErrors, bind, validate: runValidation, reset };
}
