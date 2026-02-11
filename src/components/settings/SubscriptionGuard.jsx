import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

/**
 * Subscription Guard - enforces module access based on active subscriptions
 * Wraps module pages to check if subscription is ACTIVE before allowing writes
 */
export default function SubscriptionGuard({ moduleName, children, readOnly = false }) {
  const { data: company } = useQuery({
    queryKey: ['company'],
    queryFn: async () => {
      const companies = await base44.entities.Company.list();
      return companies[0];
    }
  });

  const isModuleActive = company?.active_modules?.includes(moduleName);

  if (!isModuleActive && !readOnly) {
    return (
      <div className="p-8">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-600" />
            <h3 className="text-xl font-bold mb-2">Module Not Active</h3>
            <p className="text-slate-600 mb-4">
              The {moduleName} module is not active in your subscription.
            </p>
            <p className="text-sm text-slate-500">
              Contact your administrator to enable this module.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pass module status as context to children
  return React.cloneElement(children, { 
    moduleActive: isModuleActive,
    readOnlyMode: !isModuleActive 
  });
}