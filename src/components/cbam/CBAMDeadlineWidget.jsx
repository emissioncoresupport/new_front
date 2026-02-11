import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock } from 'lucide-react';

/**
 * CBAM Deadline Widget
 * Shows next submission deadline per Art. 6(2) Reg 2023/956
 */
export default function CBAMDeadlineWidget() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentQuarter = Math.floor(currentMonth / 3) + 1;
  
  // Calculate next deadline (end of month following quarter)
  const nextQuarter = currentQuarter === 4 ? 1 : currentQuarter + 1;
  const deadlineYear = currentQuarter === 4 ? currentYear + 1 : currentYear;
  const deadlineMonth = nextQuarter * 3; // Last month of quarter
  const deadline = new Date(deadlineYear, deadlineMonth, 0); // Last day of month
  
  const daysUntil = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
  
  return (
    <Card className="p-4 bg-gradient-to-br from-blue-50 to-white border-blue-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-900">Next Deadline</h3>
        </div>
        <Badge className="bg-blue-100 text-blue-800 text-xs">Q{currentQuarter} {currentYear}</Badge>
      </div>
      
      <div className="space-y-3">
        <div>
          <p className="text-2xl font-light text-slate-900">
            {deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <p className="text-xs text-slate-500">Quarterly reporting deadline</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-slate-500" />
          <span className={`text-sm font-medium ${daysUntil < 30 ? 'text-amber-600' : 'text-slate-700'}`}>
            {daysUntil} days remaining
          </span>
        </div>
        
        <div className="pt-2 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Art. 6(2) Reg 2023/956
          </p>
        </div>
      </div>
    </Card>
  );
}