"use client";

import { useState } from "react";
import { UserCircle } from "lucide-react";
import MyProfileModal from "@/components/MyProfileModal";

export default function DriverHeaderProfile() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors"
        title="My Profile"
      >
        <UserCircle className="h-4 w-4" />
      </button>
      <MyProfileModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
