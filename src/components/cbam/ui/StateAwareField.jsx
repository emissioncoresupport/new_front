/**
 * State-Aware Field Component
 * Automatically disables/enables based on state machine
 * Prevents illegal user actions at UI level
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

export default function StateAwareField({
  label,
  value,
  onChange,
  disabled,
  isEditable,
  isVisible,
  isGreyed,
  required,
  error,
  type = 'text',
  placeholder,
  step
}) {
  if (!isVisible) {
    return null;
  }

  const isDisabled = !isEditable || disabled;

  return (
    <div>
      <Label className="text-xs font-semibold">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </Label>
      <div className="relative mt-1.5">
        <Input
          type={type}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isDisabled}
          placeholder={placeholder}
          className={`${
            isDisabled ? 'bg-slate-100 text-slate-400' : ''
          } ${isGreyed ? 'opacity-60 cursor-not-allowed' : ''} ${
            error ? 'border-red-500' : ''
          }`}
        />
        {isDisabled && (
          <div className="absolute inset-0 rounded-md bg-gradient-to-r from-transparent to-white/10 pointer-events-none" />
        )}
      </div>
      {error && (
        <div className="flex items-center gap-1 mt-1.5 text-xs text-red-600">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}
    </div>
  );
}