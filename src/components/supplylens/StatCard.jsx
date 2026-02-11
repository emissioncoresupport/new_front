import React from 'react';
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function StatCard({ title, value, subtitle, icon: Icon, variant = "default", trend, onClick }) {
  // Ultra-modern glass/tech style with Emission Core Palette
  // Green: #86b027, Blue: #02a1e8, Dark Grey: #545454
  
  const variants = {
    default: "bg-white/80 backdrop-blur-md border-slate-200 shadow-lg shadow-slate-300/40 hover:shadow-xl hover:shadow-slate-400/50 hover:border-[#86b027]/40",
    primary: "bg-white/80 backdrop-blur-md border-slate-200 shadow-lg shadow-[#86b027]/20 hover:shadow-xl hover:shadow-[#86b027]/30 hover:border-[#86b027] hover:scale-[1.02] group", 
    success: "bg-white/80 backdrop-blur-md border-slate-200 shadow-lg shadow-[#86b027]/20 hover:shadow-xl hover:shadow-[#86b027]/30 hover:border-[#86b027] hover:scale-[1.02] group", 
    warning: "bg-white/80 backdrop-blur-md border-slate-200 shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 hover:border-amber-400 hover:scale-[1.02] group",
    danger: "bg-white/80 backdrop-blur-md border-slate-200 shadow-lg shadow-rose-500/20 hover:shadow-xl hover:shadow-rose-500/30 hover:border-rose-400 hover:scale-[1.02] group",
    purple: "bg-white/80 backdrop-blur-md border-slate-200 shadow-lg shadow-[#86b027]/20 hover:shadow-xl hover:shadow-[#86b027]/30 hover:border-[#86b027] hover:scale-[1.02] group"
  };

  const iconColors = {
    default: "text-[#545454] bg-slate-50 group-hover:bg-[#86b027] group-hover:text-white",
    primary: "text-[#86b027] bg-[#86b027]/10 group-hover:bg-[#86b027] group-hover:text-white", 
    success: "text-[#86b027] bg-[#86b027]/10 group-hover:bg-[#86b027] group-hover:text-white", 
    warning: "text-amber-600 bg-amber-50 group-hover:bg-amber-500 group-hover:text-white",
    danger: "text-rose-600 bg-rose-50 group-hover:bg-rose-500 group-hover:text-white",
    purple: "text-[#86b027] bg-[#86b027]/10 group-hover:bg-[#86b027] group-hover:text-white" // Changed to Green
  };

  return (
    <Card 
      onClick={onClick}
      className={cn(
      "p-4 border transition-all duration-300 rounded-xl backdrop-blur-sm",
      variants[variant],
      onClick && "cursor-pointer hover:-translate-y-1"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#545454]/60">
            {title}
          </p>
          <p className="text-3xl font-black text-[#545454] tracking-tight leading-none">
            {value}
          </p>
          {subtitle && (
            <p className={cn(
              "text-[10px] font-semibold flex items-center gap-1",
              variant === 'danger' ? "text-rose-600" : 
              variant === 'warning' ? "text-amber-600" :
              "text-[#86b027]"
            )}>
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn("p-2.5 rounded-xl transition-all duration-300 shadow-sm shrink-0", iconColors[variant])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </Card>
  );
}