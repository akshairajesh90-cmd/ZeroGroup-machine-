"use client";

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface DraggableEventProps {
  event: any;
  title: string;
}

export default function DraggableEvent({ event, title }: DraggableEventProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: event.id,
    data: {
      event,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    cursor: "grab",
    padding: "4px",
    backgroundColor: event.status === "COMPLETED" ? "#10b981" : "#3b82f6",
    color: "white",
    borderRadius: "4px",
    fontSize: "0.8rem",
    boxShadow: transform ? "0 4px 6px -1px rgb(0 0 0 / 0.1)" : "none",
    zIndex: transform ? 50 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {title}
    </div>
  );
}
