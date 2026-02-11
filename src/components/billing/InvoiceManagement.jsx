import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Download, Send } from "lucide-react";
import { toast } from "sonner";

export default function InvoiceManagement() {
  const queryClient = useQueryClient();

  const { data: invoices = [] } = useQuery({
    queryKey: ['monthly-billing'],
    queryFn: async () => {
      // Admin sees ALL invoices across all tenants
      return base44.entities.MonthlyBilling.list('-billing_period', 100);
    }
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: async (period) => {
      const user = await base44.auth.me();
      const tenantId = user.tenant_id || user.email.split('@')[1];
      
      const logs = await base44.entities.UsageLog.filter({
        tenant_id: tenantId,
        billing_period: period,
        invoiced: false
      });

      const totalCost = logs.reduce((sum, log) => sum + log.total_cost_eur, 0);
      
      const byModule = {};
      const byOperation = {};
      logs.forEach(log => {
        byModule[log.module] = (byModule[log.module] || 0) + log.total_cost_eur;
        byOperation[log.operation_type] = (byOperation[log.operation_type] || 0) + log.total_cost_eur;
      });

      const invoice = await base44.entities.MonthlyBilling.create({
        tenant_id: tenantId,
        billing_period: period,
        total_cost_eur: totalCost,
        breakdown_by_module: byModule,
        breakdown_by_operation: byOperation,
        total_operations: logs.length,
        total_ai_tokens: logs.reduce((sum, l) => sum + (l.ai_tokens_used || 0), 0),
        invoice_status: 'generated',
        invoice_number: `INV-${period}-${Date.now()}`,
        invoice_date: new Date().toISOString().split('T')[0]
      });

      // Mark logs as invoiced
      for (const log of logs) {
        await base44.entities.UsageLog.update(log.id, { invoiced: true });
      }

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-billing'] });
      toast.success('Invoice generated successfully');
    }
  });

  const currentPeriod = new Date().toISOString().slice(0, 7);
  const hasCurrentPeriodInvoice = invoices.some(inv => inv.billing_period === currentPeriod);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Invoices</CardTitle>
            {!hasCurrentPeriodInvoice && (
              <Button 
                onClick={() => generateInvoiceMutation.mutate(currentPeriod)}
                disabled={generateInvoiceMutation.isPending}
                className="bg-blue-600"
              >
                <FileText className="w-4 h-4 mr-2" />
                Generate Current Invoice
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invoices.map(invoice => (
              <Card key={invoice.id} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        Invoice {invoice.invoice_number || invoice.billing_period}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        Period: {invoice.billing_period}
                      </p>
                      <p className="text-2xl font-bold text-blue-600 mt-2">
                        €{invoice.total_cost_eur.toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {invoice.total_operations} operations | {(invoice.total_ai_tokens / 1000).toFixed(1)}k AI tokens
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={
                        invoice.invoice_status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                        invoice.invoice_status === 'sent' ? 'bg-blue-100 text-blue-700' :
                        invoice.invoice_status === 'overdue' ? 'bg-rose-100 text-rose-700' :
                        'bg-slate-100 text-slate-700'
                      }>
                        {invoice.invoice_status}
                      </Badge>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" variant="outline">
                          <Download className="w-3 h-3 mr-1" />
                          PDF
                        </Button>
                        <Button size="sm" variant="outline">
                          <Send className="w-3 h-3 mr-1" />
                          Send
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                    <div className="p-3 bg-slate-50 rounded">
                      <p className="text-slate-600 text-xs">Top Module</p>
                      <p className="font-semibold mt-1">
                        {Object.entries(invoice.breakdown_by_module || {})
                          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded">
                      <p className="text-slate-600 text-xs">Invoice Date</p>
                      <p className="font-semibold mt-1">
                        {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded">
                      <p className="text-slate-600 text-xs">Due Date</p>
                      <p className="font-semibold mt-1">
                        {invoice.payment_due_date ? new Date(invoice.payment_due_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}