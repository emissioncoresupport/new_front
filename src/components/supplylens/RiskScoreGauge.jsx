import React from 'react';
import { cn } from "@/lib/utils";

export default function RiskScoreGauge({ score, size = "md" }) {
  const getColor = (score) => {
    if (score <= 25) return { stroke: "#86b027", bg: "#f1f5f9", text: "text-slate-700" };
    if (score <= 50) return { stroke: "#64748b", bg: "#f1f5f9", text: "text-slate-700" };
    if (score <= 75) return { stroke: "#64748b", bg: "#f1f5f9", text: "text-slate-700" };
    return { stroke: "#64748b", bg: "#f1f5f9", text: "text-slate-700" };
  };

  const colors = getColor(score || 0);
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - ((score || 0) / 100) * circumference;

  const sizes = {
    sm: { width: 60, fontSize: "text-sm" },
    md: { width: 80, fontSize: "text-lg" },
    lg: { width: 100, fontSize: "text-xl" }
  };

  const { width, fontSize } = sizes[size];

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width, height: width }}>
      <svg className="transform -rotate-90" width={width} height={width}>
        <circle
          cx={width / 2}
          cy={width / 2}
          r={40 * (width / 100)}
          fill="none"
          stroke={colors.bg}
          strokeWidth={8 * (width / 100)}
        />
        <circle
          cx={width / 2}
          cy={width / 2}
          r={40 * (width / 100)}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={8 * (width / 100)}
          strokeLinecap="round"
          strokeDasharray={circumference * (width / 100)}
          strokeDashoffset={strokeDashoffset * (width / 100)}
          className="transition-all duration-500"
        />
      </svg>
      <span className={cn("absolute font-bold", fontSize, colors.text)}>
        {score || 0}
      </span>
    </div>
  );
}