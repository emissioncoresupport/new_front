import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Sparkles, Clock, Zap } from "lucide-react";

export default function DPPAutoPublishPrompt({ 
  qualityScore, 
  readinessStatus,
  onPublishNow,
  onSchedule,
  onDismiss 
}) {
  if (!readinessStatus.can_publish) {
    return null;
  }

  const getAlertStyle = () => {
    if (readinessStatus.status === 'excellent') {
      return 'border-emerald-300 bg-gradient-to-r from-emerald-50 to-green-50';
    }
    return 'border-green-300 bg-gradient-to-r from-green-50 to-blue-50';
  };

  const getIcon = () => {
    if (readinessStatus.status === 'excellent') {
      return <Sparkles className="h-5 w-5 text-emerald-600 animate-pulse" />;
    }
    return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  };

  return (
    <Alert className={`${getAlertStyle()} border-2 shadow-lg`}>
      <div className="flex items-start gap-4">
        {getIcon()}
        <div className="flex-1">
          <AlertDescription>
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-lg text-slate-900">
                    {readinessStatus.status === 'excellent' ? '🎉 Excellent Quality!' : '✅ Ready for Publication'}
                  </span>
                  <Badge className={`${
                    readinessStatus.status === 'excellent' ? 'bg-emerald-500' : 'bg-green-500'
                  } text-white`}>
                    {qualityScore}% Quality Score
                  </Badge>
                </div>
                <p className="text-sm text-slate-700">
                  {readinessStatus.message}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={onPublishNow}
                  className={`${
                    readinessStatus.status === 'excellent' 
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  } text-white shadow-lg`}
                  size="sm"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Publish Now
                </Button>
                
                <Button 
                  onClick={onSchedule}
                  variant="outline"
                  size="sm"
                  className="border-slate-300"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Schedule for Later
                </Button>

                <Button 
                  onClick={onDismiss}
                  variant="ghost"
                  size="sm"
                  className="text-slate-500"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}