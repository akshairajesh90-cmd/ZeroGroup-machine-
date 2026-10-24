"use client";

import React, { useState } from "react";
import { Power, PowerOff } from "lucide-react";
import { toggleToolActiveStatus } from "@/actions/assets";

export function ToggleToolStatusButton({
  toolId,
  toolName,
  isActive,
}: {
  toolId: string;
  toolName: string;
  isActive: boolean;
}) {
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    const nextStatus = !isActive;
    const actionWord = nextStatus ? "enable" : "disable";
    if (
      !confirm(
        `Are you sure you want to ${actionWord} ${toolName}? ${!nextStatus ? "It will be marked disabled and not allocated to dispatches." : ""}`
      )
    ) {
      return;
    }

    setIsToggling(true);
    try {
      const res = await toggleToolActiveStatus(toolId, nextStatus);
      if (res.success) {
        window.location.reload();
      } else {
        alert(res.error || `Failed to ${actionWord} tool.`);
        setIsToggling(false);
      }
    } catch (err: any) {
      alert(err.message || `Failed to ${actionWord} tool.`);
      setIsToggling(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isToggling}
      className={`p-2 rounded-lg transition-colors border ml-1 disabled:opacity-50 ${
        !isActive
          ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30"
          : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/30"
      }`}
      title={!isActive ? "Enable Tool (In Service)" : "Disable Tool"}
    >
      {!isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
    </button>
  );
}
