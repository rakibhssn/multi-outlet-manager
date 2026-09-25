import { tv } from "tailwind-variants";

export const FlexRow = tv({
  base: "flex w-full",
  variants: {
    justify: {
      base: "justify-baseline",
      between: "justify-between",
      center: "justify-center",
      end: "justify-end",
    },
    mobile: {
      enable: "flex-col md:flex-row",
      disable: "flex-row",
    },
    place: {
      center: "place-items-center",
      start: "place-items-start",
      end: "place-items-end",
    },
    gap: {
      0: "gap-0",
      2: "gap-2",
      4: "gap-4",
      6: "gap-6",
      8: "gap-8",
      10: "gap-10",
    },
  },
  defaultVariants: {
    justify: "base",
    place: "center",
    gap: 4,
    mobile: "disable",
  },
});
