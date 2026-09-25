import { tv } from "tailwind-variants";

export const FlexCol = tv({
  base: "flex flex-col",
  variants: {
    justify: {
      base: "justify-baseline",
      between: "justify-between",
      center: "justify-center",
      end: "justify-end",
    },
    place: {
      center: "place-items-center",
      start: "place-items-start",
      end: "place-items-end",
    },
    gap: {
      0: "gap-0",
      0.5: "gap-1",
      1: "gap-1",
      1.5: "gap-1",
      2: "gap-2",
      2.5: "gap-2",
      4: "gap-4",
      6: "gap-6",
      8: "gap-8",
      10: "gap-10",
    },
  },
  defaultVariants: {
    justify: "base",
    place: "start",
    gap: 4,
  },
});
