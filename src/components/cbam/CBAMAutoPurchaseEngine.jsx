import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Zap, ShoppingCart, TrendingUp, CheckCircle2, Settings } from "lucide-react";

export default function CBAMAutoPurchaseEngine() {
  const [autoEnabled, setAutoEnabled] = React.useState(false);
  const [threshold, setThreshold] = React.useState(100);
  const queryClient = useQueryClient();

  const triggerPurchase = useMutation({
    mutationFn: async ({ quantity, auto_approve }) => {
      const { data } = await base44.functions.invoke('cbamAutoPurchase', {
        action: 'check_and_purchase',
        quantity,
        member_state: 'DE',
        auto_approve
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cbam-certificates'] });
      queryClient.invalidateQueries({ queryKey: ['cbam-purchase-orders'] });
      
      if (data.action === 'purchased') {
        toast.success('Certificates Purchased', {
          description: `${data.quantity} certificates @ €${data.price_per_unit}/unit`
        });
      } else if (data.action === 'order_created') {
        toast.info('Purchase Order Created', {
          description: 'Awaiting approval'
        });
      }
    }
  });

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-600" />
          Auto-Purchase Engine
        </CardTitle>
        <p className="text-sm text-slate-600">
          Automatically purchase certificates when shortfall detected
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
          <div>
            <Label className="font-bold">Enable Auto-Purchase</Label>
            <p className="text-xs text-slate-600">Triggers when balance drops below threshold</p>
          </div>
          <Switch checked={autoEnabled} onCheckedChange={setAutoEnabled} />
        </div>

        {autoEnabled && (
          <>
            <div className="space-y-2">
              <Label>Minimum Balance Threshold (certificates)</Label>
              <Input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value))}
                className="text-lg font-mono"
              />
              <p className="text-xs text-slate-500">
                System will auto-purchase when balance + pending orders &lt; {threshold}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-bold">Auto-enabled features:</p>
              </div>
              <ul className="text-sm text-slate-600 ml-6 space-y-1">
                <li>• Real-time EU ETS price monitoring</li>
                <li>• Member state payment gateway integration</li>
                <li>• Certificate registry auto-update</li>
                <li>• Email notifications on purchase</li>
                <li>• Blockchain audit trail</li>
              </ul>
            </div>
          </>
        )}

        <div className="pt-4 border-t">
          <Button 
            onClick={() => triggerPurchase.mutate({ auto_approve: true })}
            disabled={triggerPurchase.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {triggerPurchase.isPending ? 'Processing...' : 'Trigger Manual Purchase Check'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}