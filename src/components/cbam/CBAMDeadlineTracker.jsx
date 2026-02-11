import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, Clock, AlertTriangle, CheckCircle2, 
  Bell, BellOff, ChevronRight, ArrowRight 
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

/**
 * CBAM Deadline Tracker with Real-Time Countdown
 * Monitors quarterly submission deadlines per Art. 6(2) Reg 2023/956
 */

export default function CBAMDeadlineTracker({ compact = false }) {
  const [now, setNow] = useState(new Date());
  const queryClient = useQueryClient();
  
  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);
  
  const { data: reports = [] } = useQuery({
    queryKey: ['cbam-reports'],
    queryFn: () => base44.entities.CBAMReport.list('-created_date')
  });
  
  // Calculate deadlines for each report
  const deadlines = reports
    .filter(r => r.status !== 'submitted' && r.status !== 'accepted')
    .map(report => {
      const deadline = new Date(report.submission_deadline);
      const msUntil = deadline - now;
      const daysUntil = Math.ceil(msUntil / (1000 * 60 * 60 * 24));
      const hoursUntil = Math.ceil(msUntil / (1000 * 60 * 60));
      
      let urgency = 'low';
      if (daysUntil <= 1) urgency = 'critical';
      else if (daysUntil <= 7) urgency = 'high';
      else if (daysUntil <= 15) urgency = 'medium';
      
      return {
        ...report,
        deadline,
        daysUntil,
        hoursUntil,
        urgency,
        overdue: msUntil < 0
      };
    })
    .sort((a, b) => a.deadline - b.deadline);
  
  const checkDeadlinesMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('cbamNotificationEngine', {
        action: 'check_deadlines',
        params: {}
      });
      return data;
    },
    onSuccess: (data) => {
      if (data.alerts_sent > 0) {
        toast.success(`Sent ${data.alerts_sent} deadline alerts`);
      } else {
        toast.info('All deadlines monitored - no urgent alerts');
      }
    }
  });
  
  const urgencyColors = {
    low: 'bg-slate-100 text-slate-700 border-slate-200',
    medium: 'bg-blue-50 text-blue-700 border-blue-200',
    high: 'bg-amber-50 text-amber-700 border-amber-200',
    critical: 'bg-red-50 text-red-700 border-red-200'
  };
  
  const urgencyIcons = {
    low: Clock,
    medium: Calendar,
    high: AlertTriangle,
    critical: AlertTriangle
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#86b027]" />
          <div>
            <h3 className="text-base font-medium text-slate-900">Deadline Tracker</h3>
            <p className="text-xs text-slate-500">Real-time monitoring</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => checkDeadlinesMutation.mutate()}
          disabled={checkDeadlinesMutation.isPending}
          className="h-8 text-xs"
        >
          <Bell className="w-3 h-3 mr-1.5" />
          {checkDeadlinesMutation.isPending ? 'Checking...' : 'Check All'}
        </Button>
      </div>
      
      <div>
        {deadlines.length === 0 ? (
          <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500" />
            <p className="text-sm text-slate-600">No pending deadlines</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deadlines.map((deadline) => {
              const Icon = urgencyIcons[deadline.urgency];
              const progressValue = deadline.overdue 
                ? 100 
                : Math.max(0, 100 - ((deadline.daysUntil / 31) * 100));
              
              return (
                <div
                  key={deadline.id}
                  className={`p-4 rounded-lg border ${urgencyColors[deadline.urgency]} transition-all hover:shadow-sm`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${
                        deadline.urgency === 'critical' ? 'bg-red-100' :
                        deadline.urgency === 'high' ? 'bg-amber-100' :
                        deadline.urgency === 'medium' ? 'bg-blue-100' :
                        'bg-slate-100'
                      }`}>
                        <Icon className={`w-4 h-4 ${
                          deadline.urgency === 'critical' ? 'text-red-600' :
                          deadline.urgency === 'high' ? 'text-amber-600' :
                          deadline.urgency === 'medium' ? 'text-blue-600' :
                          'text-slate-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-slate-900">
                            {deadline.reporting_period}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {deadline.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600">
                          Due: {deadline.deadline.toLocaleDateString('en-GB', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {deadline.overdue ? (
                        <Badge className="bg-red-500 text-white">
                          OVERDUE
                        </Badge>
                      ) : deadline.daysUntil < 1 ? (
                        <div>
                          <div className="text-2xl font-bold text-red-600">
                            {deadline.hoursUntil}h
                          </div>
                          <div className="text-xs text-red-500">remaining</div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-2xl font-bold text-slate-900">
                            {deadline.daysUntil}
                          </div>
                          <div className="text-xs text-slate-500">
                            {deadline.daysUntil === 1 ? 'day' : 'days'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Progress 
                    value={progressValue} 
                    className="h-1.5 mb-3"
                    indicatorClassName={
                      deadline.urgency === 'critical' ? 'bg-red-500' :
                      deadline.urgency === 'high' ? 'bg-amber-500' :
                      deadline.urgency === 'medium' ? 'bg-blue-500' :
                      'bg-slate-400'
                    }
                  />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-slate-500">
                        {deadline.total_imports_count || 0} imports
                      </span>
                      <span className="text-slate-500">
                        {(deadline.total_embedded_emissions || 0).toFixed(1)} tCO2e
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant={deadline.urgency === 'critical' ? 'default' : 'ghost'}
                      className={deadline.urgency === 'critical' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                      onClick={() => {
                        window.location.href = `/CBAM?tab=reports&report=${deadline.id}`;
                      }}
                    >
                      {deadline.urgency === 'critical' ? 'Submit Now' : 'View Report'}
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}