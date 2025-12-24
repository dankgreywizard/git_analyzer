import React, { forwardRef } from "react";

const base = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

const variants = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
  dark: "bg-gray-800 text-white hover:bg-gray-900",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-base",
  icon: "p-2",
};

type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  as?: React.ElementType;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  as: Comp = "button",
  variant = "primary",
  size = "md",
  className = "",
  loading = false,
  leftIcon = null,
  rightIcon = null,
  fullWidth = false,
  children,
  ...props
}, ref) => {
  const compProps = Comp === "button" ? { type: "button" as const } : {};
  return (
    <Comp
      ref={ref}
      className={`${base} ${variants[variant] ?? variants.primary} ${sizes[size] ?? sizes.md} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      aria-busy={loading || undefined}
      {...compProps}
      {...props}
    >
      {leftIcon ? <span className="mr-2">{leftIcon}</span> : null}
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
          <span>Loading…</span>
        </span>
      ) : (
        children
      )}
      {rightIcon ? <span className="ml-2">{rightIcon}</span> : null}
    </Comp>
  );
});

export default Button;
