"use client";

import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { softDelete } from "@/actions/adminApprovals";

export function DeleteToolButton({
  toolId,
  toolName,
}: {
  toolId: string;
  toolName: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to retire ${toolName}? It will be removed from available inventory and moved to the Trash Hub.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await softDelete("TOOL", toolId);
      if (res.success) {
        window.location.reload();
      } else {
        alert("Failed to delete tool.");
        setIsDeleting(false);
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete tool.");
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors border border-rose-500/30 ml-1 disabled:opacity-50"
      title="Retire Tool (Move to Trash)"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
