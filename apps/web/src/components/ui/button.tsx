import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// shadcn/ui-style primitive (MIT), adapted to DIAL tokens.
const button = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[background,box-shadow,transform,color] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(23,25,24,0.25)] hover:bg-[#2c4f3f]",
        secondary: "bg-surface text-ink border border-line-strong shadow-[0_1px_0_rgba(23,25,24,0.04)] hover:bg-canvas",
        ghost: "text-ink hover:bg-black/5",
        danger: "bg-danger text-white hover:bg-[#843226]",
      },
      size: { sm: "h-8 px-3.5", md: "h-10 px-5", lg: "h-12 px-7 text-base" },
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
