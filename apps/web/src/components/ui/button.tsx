import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// Pill buttons, as in the Dial website CTA ("Meet Dial →"): Ink fill, Paper label. Touch targets are at least 40px.
const button = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[15px] font-semibold transition-[background,color,transform,box-shadow] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-ink text-paper hover:bg-[color-mix(in_srgb,#29232e_88%,#817b83)]",
        accent: "bg-citron text-ink hover:bg-[color-mix(in_srgb,#dded9c_88%,#29232e)]",
        secondary: "border border-line-strong bg-transparent text-ink hover:bg-ink/5",
        ghost: "text-ink hover:bg-ink/6",
        danger: "bg-end text-white hover:bg-[color-mix(in_srgb,#cc403d_88%,#29232e)]",
      },
      size: { sm: "h-10 px-4", md: "h-11 px-6", lg: "h-[58px] px-8 text-base" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof button> { asChild?: boolean }
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, ...p }, ref) => {
  const C = asChild ? Slot : "button";
  return <C ref={ref} className={cn(button({ variant, size }), className)} {...p} />;
});
Button.displayName = "Button";
export const buttonClass = (v: VariantProps<typeof button>["variant"] = "primary", s: VariantProps<typeof button>["size"] = "md") => button({ variant: v, size: s });
