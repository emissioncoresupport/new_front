import React from 'react';
import { useEntitlement } from './useEntitlement';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock } from "lucide-react";

/**
 * Protected Action Component
 * Wraps buttons/actions with entitlement checks
 * 
 * Usage:
 * <ProtectedAction moduleCode="PFAS" permission="WRITE">
 *   <Button onClick={handleSave}>Save</Button>
 * </ProtectedAction>
 */
export default function ProtectedAction({ 
  moduleCode, 
  permission = 'WRITE', 
  children,
  fallback = null 
}) {
  const { allowed, readOnly, loading, reason } = useEntitlement(moduleCode, permission);

  if (loading) {
    return React.cloneElement(children, { disabled: true });
  }

  if (!allowed || readOnly) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              {React.cloneElement(children, { 
                disabled: true,
                className: children.props.className + ' opacity-50 cursor-not-allowed'
              })}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span>{reason || 'Action not available'}</span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return children;
}