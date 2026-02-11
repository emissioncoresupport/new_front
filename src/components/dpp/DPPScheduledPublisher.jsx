import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { validateScheduledDate, getRecommendedPublicationDate } from './DPPAutoPublishService';

export default function DPPScheduledPublisher({ 
  open, 
  onOpenChange, 
  dppId, 
  productId, 
  qualityScore,
  onScheduled 
}) {
  const [scheduledDate, setScheduledDate] = useState(null);
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [autoPublish, setAutoPublish] = useState(true);
  const [notes, setNotes] = useState('');
  
  const queryClient = useQueryClient();

  const recommendedDate = getRecommendedPublicationDate(qualityScore);

  const scheduleMutation = useMutation({
    mutationFn: async (scheduleData) => {
      const user = await base44.auth.me();
      
      return base44.entities.DPPScheduledPublication.create({
        ...scheduleData,
        scheduled_by: user.email,
        quality_score_at_schedule: qualityScore
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dpp-scheduled-publications']);
      toast.success('DPP publication scheduled successfully');
      onScheduled?.();
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to schedule publication');
    }
  });

  const handleSchedule = () => {
    if (!scheduledDate) {
      toast.error('Please select a date');
      return;
    }

    // Combine date and time
    const [hours, minutes] = scheduledTime.split(':');
    const fullDate = new Date(scheduledDate);
    fullDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const validation = validateScheduledDate(fullDate);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    scheduleMutation.mutate({
      dpp_id: dppId,
      product_id: productId,
      scheduled_date: fullDate.toISOString(),
      auto_publish: autoPublish,
      publication_notes: notes
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule DPP Publication</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Recommended Date Alert */}
          <Alert className="border-blue-200 bg-blue-50">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <div className="text-sm text-blue-900">
                <strong>Recommended:</strong> {format(recommendedDate, 'PPP')}
              </div>
              <div className="text-xs text-blue-700 mt-1">
                Based on current data quality score ({qualityScore}%)
              </div>
            </AlertDescription>
          </Alert>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Publication Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduledDate ? format(scheduledDate, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={scheduledDate}
                  onSelect={setScheduledDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Picker */}
          <div className="space-y-2">
            <Label>Time (24h format)</Label>
            <Input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
          </div>

          {/* Auto-Publish Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="font-medium text-sm">Auto-Publish</div>
              <div className="text-xs text-slate-500">
                Automatically publish when scheduled time arrives
              </div>
            </div>
            <Switch
              checked={autoPublish}
              onCheckedChange={setAutoPublish}
            />
          </div>

          {!autoPublish && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                You will receive a notification when it's time to publish. Manual approval required.
              </AlertDescription>
            </Alert>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Publication Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this scheduled publication..."
              rows={3}
            />
          </div>

          {/* Preview */}
          {scheduledDate && (
            <div className="p-3 bg-slate-50 rounded-lg border text-sm">
              <div className="font-medium mb-2">Schedule Summary:</div>
              <div className="space-y-1 text-slate-600">
                <div>📅 {format(new Date(scheduledDate.setHours(scheduledTime.split(':')[0], scheduledTime.split(':')[1])), 'PPPp')}</div>
                <div>⚙️ {autoPublish ? 'Auto-publish enabled' : 'Manual approval required'}</div>
                <div>📊 Quality Score: {qualityScore}%</div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSchedule}
            disabled={!scheduledDate || scheduleMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Clock className="w-4 h-4 mr-2" />
            Schedule Publication
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}