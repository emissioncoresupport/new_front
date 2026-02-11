import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, ExternalLink, Calendar, AlertCircle, Info } from "lucide-react";
import PPWRAutomationEngine from './services/PPWRAutomationEngine';

export default function PPWRRegulatoryUpdateMonitor() {
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    loadUpdates();
  }, []);

  const loadUpdates = async () => {
    const regulatoryUpdates = await PPWRAutomationEngine.checkRegulatoryUpdates();
    setUpdates(regulatoryUpdates);
  };

  const getImpactBadge = (impact) => {
    const styles = {
      high: 'bg-rose-500',
      medium: 'bg-amber-500',
      low: 'bg-blue-500'
    };
    return <Badge className={styles[impact] || styles.low}>{impact} impact</Badge>;
  };

  return (
    <Card className="border-[#02a1e8]/30 bg-gradient-to-br from-white to-[#02a1e8]/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#02a1e8]" />
            <CardTitle className="text-[#02a1e8]">Regulatory Updates</CardTitle>
          </div>
          <Button size="sm" variant="outline" onClick={loadUpdates}>
            <Bell className="w-4 h-4 mr-2" />
            Check for Updates
          </Button>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Latest amendments and implementation guidance (EU PPWR 2024/1852)
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {updates.length === 0 ? (
          <div className="text-center py-6">
            <Info className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No recent regulatory updates</p>
          </div>
        ) : (
          updates.map((update, idx) => (
            <div 
              key={idx}
              className="p-4 bg-white rounded-lg border border-slate-200 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-900">{update.title}</h4>
                    {getImpactBadge(update.impact)}
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(update.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <p className="text-sm text-slate-600 mb-3">{update.regulation}</p>
              
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <p className="text-xs text-[#86b027] font-semibold">
                  Action: {update.action_required}
                </p>
                <Button size="sm" variant="ghost" className="text-[#02a1e8]">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View Details
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}