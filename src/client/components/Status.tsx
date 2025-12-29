import React, { useMemo } from "react";

export interface StatusProps {
  color?: "gray" | "yellow" | "green" | "red";
  text?: string;
}

/**
 * Component to display the current application status with a colored indicator.
 */
export default function Status({ color = "gray", text = "Ready" }: StatusProps) {
  const dot = useMemo(() => ({
    gray: "bg-gray-400",
    yellow: "bg-yellow-500",
    green: "bg-green-500",
    red: "bg-red-500",
  }[color] || "bg-gray-400"), [color]);

  return (
    <div className="flex items-center space-x-2" aria-live="polite">
      <div className={`w-2 h-2 rounded-full ${dot}`}></div>
      <span className="text-sm text-gray-500">{text}</span>
    </div>
  );
}
