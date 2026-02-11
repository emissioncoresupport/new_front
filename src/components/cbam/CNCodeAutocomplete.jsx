import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CBAM_SCOPE_CODES, getCBAMCategory } from './constants.jsx';
import { Search, Check } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function CNCodeAutocomplete({ value, onChange, label = "CN Code", required = false, placeholder = "Type to search...", filterByCategory = null }) {
  const [inputValue, setInputValue] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCodes, setFilteredCodes] = useState([]);
  const wrapperRef = useRef(null);

  // Convert CBAM_SCOPE_CODES to array for filtering
  const allCodes = Object.entries(CBAM_SCOPE_CODES).map(([code, desc]) => ({
    code,
    description: desc,
    category: getCBAMCategory(code)
  }));

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    if (inputValue.length >= 2) {
      const filtered = allCodes.filter(item => {
        // Filter by category if specified
        if (filterByCategory && item.category !== filterByCategory) {
          return false;
        }
        // Filter by search term
        return item.code.startsWith(inputValue) || 
          item.code.includes(inputValue) ||
          item.description.toLowerCase().includes(inputValue.toLowerCase());
      }).slice(0, 50); // Limit to 50 results
      
      setFilteredCodes(filtered);
      setIsOpen(filtered.length > 0);
    } else {
      setFilteredCodes([]);
      setIsOpen(false);
    }
  }, [inputValue, filterByCategory]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code, description) => {
    setInputValue(code || '');
    onChange(code || '', description || '');
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value || '';
    setInputValue(val);
    onChange(val, '');
  };

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <Label className="text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <div className="relative mt-1.5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => inputValue.length >= 2 && filteredCodes.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10"
        />
      </div>
      
      {isOpen && filteredCodes.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
          {filteredCodes.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(item.code, item.description)}
              className={cn(
                "w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors",
                value === item.code && "bg-[#86b027]/10"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-slate-900 text-sm">{item.code}</span>
                    {item.category && (
                      <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>
                </div>
                {value === item.code && (
                  <Check className="w-4 h-4 text-[#86b027] flex-shrink-0 mt-1" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
      
      {inputValue.length >= 2 && filteredCodes.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-red-100 rounded-lg shadow-lg p-5">
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-sm font-semibold text-red-700">⚠️ Not in CBAM Scope</p>
              <p className="text-xs text-slate-500 mt-1">CN code <span className="font-mono font-bold">{inputValue}</span> is not covered by EU Regulation 2023/956</p>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-left">
              <p className="text-xs font-semibold text-amber-800 mb-2">🔍 What this means:</p>
              <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                <li>No CBAM reporting required</li>
                <li>No certificate purchase needed</li>
                <li>Product can be imported normally</li>
              </ul>
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setInputValue('');
                  onChange('', '');
                }}
                className="flex-1 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Clear & Retry
              </button>
              <button
                type="button"
                onClick={() => {
                  // Log non-CBAM import for reference
                  onChange(inputValue, 'Non-CBAM product');
                  setIsOpen(false);
                }}
                className="flex-1 px-3 py-2 text-xs font-medium text-white bg-slate-600 hover:bg-slate-700 rounded-lg"
              >
                Log as Non-CBAM
              </button>
            </div>
            
            <p className="text-xs text-slate-400 text-center">
              Only Iron & Steel, Aluminium, Cement, Fertilizers, Hydrogen, and Electricity are in CBAM scope
            </p>
          </div>
        </div>
      )}
    </div>
  );
}