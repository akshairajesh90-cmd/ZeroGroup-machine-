// src/components/shared/Avatar.tsx
import Image from "next/image";

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: { px: 32, text: "text-xs" },
  md: { px: 44, text: "text-sm" },
  lg: { px: 56, text: "text-base" },
  xl: { px: 80, text: "text-xl" },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getColor(name: string) {
  const colors = [
    "bg-blue-600", "bg-emerald-600", "bg-violet-600",
    "bg-orange-600", "bg-rose-600", "bg-teal-600",
    "bg-amber-600", "bg-cyan-600",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

export default function Avatar({ name, photoUrl, size = "md" }: AvatarProps) {
  const { px, text } = sizeMap[size];

  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={name}
        width={px}
        height={px}
        className="rounded-full object-cover shrink-0"
        style={{ width: px, height: px }}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 font-black text-white ${getColor(name)}`}
      style={{ width: px, height: px }}
    >
      <span className={text}>{getInitials(name)}</span>
    </div>
  );
}
