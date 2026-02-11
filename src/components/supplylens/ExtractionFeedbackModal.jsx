import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Star, Send, CheckCircle, XCircle, AlertTriangle, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ExtractionFeedbackModal({ open, onOpenChange, document, extractedMaterials, onSubmitSuccess }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comments, setComments] = useState('');
  const [fieldsIncorrect, setFieldsIncorrect] = useState([]);
  const [fieldsMissing, setFieldsMissing] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableFields = [
    'internal_sku', 'supplier_sku', 'material_name', 'description', 'category',
    'chemical_composition', 'physical_properties', 'tolerances', 
    'compliance_standards', 'material_grade', 'surface_treatment',
    'hs_code', 'weight_kg', 'recycled_content_percentage', 'pfas_content'
  ];

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please provide a rating');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await base44.auth.me();
      
      await base44.entities.ExtractionFeedback.create({
        tenant_id: user.company_id,
        document_url: document.url,
        document_name: document.name,
        document_type: document.document_type || 'material_datasheet',
        extraction_timestamp: new Date().toISOString(),
        extracted_data: { materials: extractedMaterials },
        accuracy_rating: rating,
        fields_incorrect: fieldsIncorrect,
        fields_missing: fieldsMissing,
        user_comments: comments,
        complexity_level: document.complexity_level || 'moderate',
        submitted_by: user.email,
        submitted_at: new Date().toISOString(),
        used_for_training: false
      });

      toast.success('Thank you for your feedback!', {
        description: 'This helps improve our AI extraction accuracy',
        icon: <Sparkles className="w-4 h-4" />
      });
      
      if (onSubmitSuccess) onSubmitSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to submit feedback: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleField = (field, list, setList) => {
    if (list.includes(field)) {
      setList(list.filter(f => f !== field));
    } else {
      setList([...list, field]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#86b027]" />
            Extraction Feedback - Help Improve AI Accuracy
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Info */}
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm font-semibold text-slate-700 mb-2">Document</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{document.name}</p>
                <p className="text-xs text-slate-500">{extractedMaterials?.length || 0} materials extracted</p>
              </div>
              {document.extraction_confidence && (
                <Badge variant={document.extraction_confidence > 85 ? 'default' : 'secondary'}>
                  {document.extraction_confidence}% Confidence
                </Badge>
              )}
            </div>
          </div>

          {/* Rating */}
          <div>
            <Label className="mb-2 block">How accurate was the extraction? *</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={cn(
                      "w-10 h-10 transition-all",
                      (hoveredRating >= star || rating >= star)
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300"
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {rating === 0 && 'Click to rate'}
              {rating === 1 && 'Very Inaccurate - Major issues'}
              {rating === 2 && 'Mostly Inaccurate - Multiple errors'}
              {rating === 3 && 'Partially Accurate - Some corrections needed'}
              {rating === 4 && 'Mostly Accurate - Minor corrections'}
              {rating === 5 && 'Highly Accurate - Perfect extraction'}
            </p>
          </div>

          {/* Incorrect Fields */}
          {rating > 0 && rating < 5 && (
            <div>
              <Label className="mb-3 block">Which fields were incorrect or inaccurate?</Label>
              <div className="grid grid-cols-2 gap-2">
                {availableFields.map(field => (
                  <label
                    key={field}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded border cursor-pointer transition-all",
                      fieldsIncorrect.includes(field)
                        ? "border-rose-500 bg-rose-50"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <Checkbox
                      checked={fieldsIncorrect.includes(field)}
                      onCheckedChange={() => toggleField(field, fieldsIncorrect, setFieldsIncorrect)}
                    />
                    <span className="text-sm capitalize">{field.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Missing Fields */}
          {rating > 0 && rating < 5 && (
            <div>
              <Label className="mb-3 block">Which fields were missing from the extraction?</Label>
              <div className="grid grid-cols-2 gap-2">
                {availableFields.map(field => (
                  <label
                    key={field}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded border cursor-pointer transition-all",
                      fieldsMissing.includes(field)
                        ? "border-amber-500 bg-amber-50"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <Checkbox
                      checked={fieldsMissing.includes(field)}
                      onCheckedChange={() => toggleField(field, fieldsMissing, setFieldsMissing)}
                    />
                    <span className="text-sm capitalize">{field.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div>
            <Label className="mb-2 block">Additional Comments</Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Share specific issues, suggestions for improvement, or what worked well..."
              className="h-24"
            />
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-900 mb-1">How Your Feedback Helps</p>
                <p className="text-blue-700">
                  Your feedback is used to continuously improve our AI models. High-quality feedback helps 
                  the system learn to extract data more accurately from complex technical documents, chemical 
                  compositions, and CAD files.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || rating === 0}
              className="bg-[#86b027] hover:bg-[#6d8f20]"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Feedback
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}