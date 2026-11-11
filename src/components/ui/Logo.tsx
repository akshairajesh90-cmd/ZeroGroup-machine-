import React from "react";
import Image from "next/image";

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  priority?: boolean;
}

const SIZE_MAP = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

export default function Logo({ size = "md", className = "", priority = false }: LogoProps) {
  const px = SIZE_MAP[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden ${className}`}
      style={{ width: px, height: px }}
    >
      <Image
        src="/logo.png"
        alt="ZERO GROUP Logo"
        width={px}
        height={px}
        className="h-full w-full object-contain"
        priority={priority}
      />
    </div>
  );
}
