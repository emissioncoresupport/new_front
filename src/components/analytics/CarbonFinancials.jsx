import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Euro } from "lucide-react";

export default function CarbonFinancials({ emissions = 0, className = "" }) {
    const [scenario, setScenario] = useState("EU_ETS");
    const [price, setPrice] = useState(68.50);

    useEffect(() => {
        if (scenario === "EU_ETS") setPrice(68.50);
        if (scenario === "Voluntary") setPrice(12.00);
        if (scenario === "Internal") setPrice(100.00);
    }, [scenario]);

    const cost = emissions * price;

    return (
        <Card className={`bg-white border-l-4 border-l-[#86b027] shadow-md ${className}`}>
            <CardHeader className="pb-2 p-4">
                <CardTitle className="text-sm font-medium text-slate-500 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                        <Euro className="w-4 h-4 text-[#86b027] shrink-0" /> <span className="truncate">Carbon Financials</span>
                    </div>
                    <Select value={scenario} onValueChange={setScenario}>
                         <SelectTrigger className="h-7 text-xs w-[120px]">
                            <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                            <SelectItem value="EU_ETS">EU ETS</SelectItem>
                            <SelectItem value="Voluntary">Voluntary</SelectItem>
                            <SelectItem value="Internal">Internal</SelectItem>
                            <SelectItem value="Custom">Custom</SelectItem>
                         </SelectContent>
                    </Select>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="flex justify-between items-end mb-2">
                    <div className="text-2xl font-bold text-slate-800">€{cost.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                    <div className="text-xs text-slate-400 text-right">
                        @ 
                        <input 
                            type="number" 
                            value={price} 
                            onChange={(e) => { setPrice(Number(e.target.value)); setScenario('Custom'); }}
                            className="w-12 h-5 text-right border-b border-slate-300 text-xs focus:outline-none mx-1 bg-transparent"
                        />
                        €/t
                    </div>
                </div>
                <div className="w-full bg-[#86b027]/10 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#86b027] h-full" style={{width: '100%'}}></div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 truncate">Estimated liability based on {scenario} pricing.</p>
            </CardContent>
        </Card>
    );
}