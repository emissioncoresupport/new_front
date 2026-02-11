import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Info, Search } from 'lucide-react';
import SKUPicker from '../pickers/SKUPicker';

export default function BOMForm({ formData, setFormData, errors = {} }) {
  const data = formData.payload_data_json || { components: [] };
  
  // Derive parent from Step 1 binding
  const bindingMode = formData.binding_mode;
  const boundEntityId = formData.bound_entity_id;
  const isDeferredBinding = bindingMode === 'DEFER';

  const updateField = (field, value) => {
    setFormData({
      ...formData,
      payload_data_json: { ...data, [field]: value }
    });
  };

  const [componentModes, setComponentModes] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const firstErrorRowRef = React.useRef(null);

  // Validate components: returns map of rowIndex -> error message
  const validateComponents = () => {
    const newErrors = {};
    (data.components || []).forEach((comp, idx) => {
      const mode = componentModes[idx] || 'SELECT_SKU';
      const errors = [];
      
      // Check qty
      if (!comp.quantity || comp.quantity <= 0) {
        errors.push('qty > 0');
      }
      
      // Check UOM
      if (!comp.uom) {
        errors.push('UOM required');
      }
      
      // Check identifier based on mode
      if (mode === 'SELECT_SKU') {
        if (!comp.component_sku_id) {
          errors.push('Select a SKU');
        }
      } else {
        const code = ((comp.component_sku_code || '').toString() || '').trim();
        if (code.length < 3) {
          errors.push('Code >= 3 chars');
        }
      }
      
      if (errors.length > 0) {
        newErrors[idx] = errors.join(', ');
      }
    });
    
    setValidationErrors(newErrors);
    
    // Auto-scroll to first error
    if (Object.keys(newErrors).length > 0 && firstErrorRowRef.current) {
      setTimeout(() => {
        firstErrorRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  // Expose validation to parent via formData
  React.useEffect(() => {
    if (!formData.payload_data_json) return;
    setFormData({
      ...formData,
      _bomValidate: validateComponents
    });
  }, [data.components, componentModes]);

  const addComponent = () => {
    const components = [...(data.components || []), { quantity: 1, uom: 'pcs' }];
    updateField('components', components);
    setComponentModes({ ...componentModes, [components.length - 1]: 'sku' });
  };

  const removeComponent = (index) => {
    const components = (data.components || []).filter((_, i) => i !== index);
    updateField('components', components);
    const newModes = { ...componentModes };
    delete newModes[index];
    setComponentModes(newModes);
  };

  const updateComponent = (index, field, value) => {
    const components = [...(data.components || [])];
    components[index] = { ...components[index], [field]: value };
    updateField('components', components);
  };

  const toggleComponentMode = (index) => {
    const mode = componentModes[index] || 'SELECT_SKU';
    const newMode = mode === 'SELECT_SKU' ? 'ENTER_CODE' : 'SELECT_SKU';
    setComponentModes({ ...componentModes, [index]: newMode });
    
    // CRITICAL: Clear existing identifiers when switching modes
    const components = [...(data.components || [])];
    delete components[index].component_sku_id;
    delete components[index].component_sku_code;
    delete components[index].match_status;
    updateField('components', components);
    
    // Clear validation error for this row when mode changes
    const newErrors = { ...validationErrors };
    delete newErrors[index];
    setValidationErrors(newErrors);
  };

  const setComponentSKU = (index, skuId) => {
    const components = [...(data.components || [])];
    components[index] = {
      ...components[index],
      component_sku_id: skuId
    };
    // CRITICAL: Clear code when SKU is selected (deterministic identifier)
    delete components[index].component_sku_code;
    delete components[index].match_status;
    updateField('components', components);
  };

  const setComponentCode = (index, code) => {
    const components = [...(data.components || [])];
    // Safe string normalization: handle null/undefined
    const normalizedCode = ((code || '').toString() || '').trim();
    
    components[index] = {
      ...components[index],
      component_sku_code: normalizedCode,
      match_status: normalizedCode && normalizedCode.length > 0 ? 'PENDING_MATCH' : undefined
    };
    // CRITICAL: Clear SKU ID when code is entered (deterministic identifier)
    delete components[index].component_sku_id;
    updateField('components', components);
  };

  return (
    <div className="space-y-4">
      {/* Validation Error Banner */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="p-4 bg-red-50/80 backdrop-blur-xl border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-900 mb-2">
            {Object.keys(validationErrors).length} row(s) have validation errors:
          </p>
          <div className="space-y-1">
            {Object.entries(validationErrors).map(([rowIdx, msg]) => (
              <p key={rowIdx} className="text-xs text-red-700">
                Row {parseInt(rowIdx) + 1}: {msg}
              </p>
            ))}
          </div>
        </div>
      )}
      {/* Parent SKU: Read-Only (from Step 1 binding) or Optional Hint (if DEFER) */}
      {!isDeferredBinding && boundEntityId && (
        <div className="p-4 bg-gradient-to-br from-slate-50/80 to-white/60 backdrop-blur-xl rounded-xl border-2 border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-slate-600" />
            <Label className="text-slate-700 font-medium">Parent SKU (from Step 1 Binding)</Label>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-slate-900 text-white font-mono text-xs">
              {boundEntityId}
            </Badge>
            <span className="text-xs text-slate-600">
              Read-only · Derived from Step 1 target selection
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            The parent SKU is automatically set from the scope binding in Step 1. This ensures traceability.
          </p>
        </div>
      )}

      {isDeferredBinding && (
        <div>
          <Label className="text-slate-700 font-medium">Parent SKU Code Hint (optional)</Label>
          <p className="text-xs text-slate-500 mb-2">
            Optional identifier for future reconciliation (e.g., SKU code, product reference)
          </p>
          <Input
            value={data.parent_sku_code_hint || ''}
            onChange={(e) => updateField('parent_sku_code_hint', e.target.value)}
            placeholder="e.g., ASSEMBLY-001, PROD-SKU-789"
            className="border-slate-200 bg-white/50 backdrop-blur-sm"
            maxLength={120}
          />
          <p className="text-xs text-amber-700 mt-1.5 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Parent binding deferred · BOM cannot be used until reconciled
          </p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-slate-700 font-medium">Components *</Label>
          <Button
            type="button"
            size="sm"
            onClick={addComponent}
            className="bg-slate-900 hover:bg-slate-800 text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Component
          </Button>
        </div>

        {(!data.components || data.components.length === 0) && (
          <div className="p-6 border-2 border-dashed border-slate-200 rounded-lg text-center bg-white/30">
            <p className="text-sm text-slate-500">No components added yet</p>
          </div>
        )}

        {(data.components || []).map((component, index) => {
           const mode = componentModes[index] || 'SELECT_SKU';
           const hasError = validationErrors[index];
           const isFirstError = index === Math.min(...Object.keys(validationErrors).map(Number));

           return (
             <div 
               key={index} 
               ref={isFirstError && hasError ? firstErrorRowRef : null}
               className={`p-3 bg-white/50 backdrop-blur-sm rounded-lg border space-y-2 transition-all ${
                 hasError ? 'border-red-300 bg-red-50/30 ring-2 ring-red-200' : 'border-slate-200'
               }`}>
              <div className="flex gap-2 items-start">
                {/* Component Identifier */}
                <div className="flex-1">
                    {mode === 'SELECT_SKU' ? (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Label className="text-xs text-slate-600">Select SKU</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleComponentMode(index)}
                            className="h-6 px-2 text-xs text-slate-500 hover:text-slate-700"
                          >
                            Enter code instead
                          </Button>
                        </div>
                        <SKUPicker
                          value={component.component_sku_id || null}
                          onChange={(skuId) => setComponentSKU(index, skuId)}
                          error={null}
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Label className="text-xs text-slate-600">Component Code</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleComponentMode(index)}
                            className="h-6 px-2 text-xs text-slate-500 hover:text-slate-700"
                          >
                            <Search className="w-3 h-3 mr-1" />
                            Search SKU
                          </Button>
                        </div>
                        <Input
                          value={((component.component_sku_code || '').toString() || '')}
                          onChange={(e) => setComponentCode(index, e.target.value)}
                          placeholder="e.g., COMP-123, PART-456"
                          className={`border-slate-200 ${hasError ? 'border-red-300' : ''}`}
                        />
                        {((component.component_sku_code || '').toString() || '').trim().length > 0 && (
                          <Badge className="mt-1 bg-amber-100 text-amber-800 text-xs">
                            Pending Match
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                {/* Quantity */}
                <div className="w-24">
                  <Label className="text-xs text-slate-600 mb-1 block">Qty *</Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={component.quantity || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (val > 0 || e.target.value === '') {
                        updateComponent(index, 'quantity', val || 1);
                      }
                    }}
                    placeholder="1.0"
                    className={`border-slate-200 ${component.quantity <= 0 ? 'border-red-300' : ''}`}
                  />
                </div>

                {/* UOM */}
                <div className="w-20">
                  <Label className="text-xs text-slate-600 mb-1 block">UoM *</Label>
                  <Select
                    value={component.uom || 'pcs'}
                    onValueChange={(value) => updateComponent(index, 'uom', value)}
                  >
                    <SelectTrigger className="h-9 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">pcs</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="m">m</SelectItem>
                      <SelectItem value="l">l</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Delete */}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeComponent(index)}
                  className="text-red-500 hover:bg-red-50 mt-5"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Validation feedback */}
              {hasError && (
                <p className="text-xs text-red-600 font-medium">{hasError}</p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 italic">
        💡 For complex BOMs with many items, prefer FILE_UPLOAD method with CSV/Excel
      </p>
    </div>
  );
}