import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary";
type Size = "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const variantClass: Record<Variant, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-500",
  secondary: "bg-zinc-200 text-zinc-900 hover:bg-zinc-300",
};

const sizeClass: Record<Size, string> = {
  md: "px-5 py-2 text-xl",
  lg: "px-12 py-5 text-4xl",
};

/** 프로젝터 화면에서도 잘 보이도록 큼직한 기본 버튼 */
export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "rounded-2xl font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    />
  );
}
