import { tv } from "tailwind-variants";
import { FlexRow } from "./FlexRow";

export const ButtonVariant = tv({
  base: `${FlexRow({ justify: "between" })} rounded-full shadow hover:shadow-md cursor-pointer`,
  variants: {
    animate: {
      none: "",
      enlarge: "w-28 hover:w-full transition-all duration-500",
    },
    variant: {
      black: "bg-black text-white",
    },
    size: {
      sm: "font-normal text-sm px-4 py-1",
      md: "font-normal text-base px-4 py-1.5",
    },
  },
  defaultVariants: {
    animate: "none",
    variant: "black",
    size: "sm",
  },
});
