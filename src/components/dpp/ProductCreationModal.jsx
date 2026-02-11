import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { DPP_CATEGORIES } from './DPPCategoryTemplates';

export default function ProductCreationModal({ open, onOpenChange, onProductCreated }) {
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        gtin: '',
        description: '',
        category: '',
        weight_kg: '',
        expected_lifetime: '',
        manufacturer: '',
        manufacturing_country: ''
    });

    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Product.create(data),
        onSuccess: (newProduct) => {
            queryClient.invalidateQueries(['products-dpp']);
            toast.success('Product created successfully');
            onProductCreated?.(newProduct);
            onOpenChange(false);
            setFormData({
                name: '',
                sku: '',
                gtin: '',
                description: '',
                category: '',
                weight_kg: '',
                expected_lifetime: '',
                manufacturer: '',
                manufacturing_country: ''
            });
        }
    });

    const handleSubmit = () => {
        if (!formData.name || !formData.sku) {
            toast.error('Name and SKU are required');
            return;
        }

        createMutation.mutate({
            ...formData,
            weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : undefined,
            expected_lifetime: formData.expected_lifetime ? parseFloat(formData.expected_lifetime) : undefined,
            unit: 'piece',
            quantity_amount: 1,
            status: 'Draft'
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Product</DialogTitle>
                    <p className="text-sm text-slate-600">Add a product to create its Digital Product Passport</p>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Label>Product Name *</Label>
                            <Input 
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                placeholder="e.g., Aluminum Laptop Case"
                            />
                        </div>
                        
                        <div>
                            <Label>SKU Code *</Label>
                            <Input 
                                value={formData.sku}
                                onChange={(e) => setFormData({...formData, sku: e.target.value})}
                                placeholder="e.g., ALC-2024-001"
                            />
                        </div>

                        <div>
                            <Label>GTIN / Barcode</Label>
                            <Input 
                                value={formData.gtin}
                                onChange={(e) => setFormData({...formData, gtin: e.target.value})}
                                placeholder="5901234123457"
                            />
                        </div>

                        <div className="col-span-2">
                            <Label>Category *</Label>
                            <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select product category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.values(DPP_CATEGORIES).map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-blue-600 mt-1">
                                Category determines DPP template and compliance requirements
                            </p>
                        </div>

                        <div>
                            <Label>Weight (kg)</Label>
                            <Input 
                                type="number"
                                value={formData.weight_kg}
                                onChange={(e) => setFormData({...formData, weight_kg: e.target.value})}
                                placeholder="0.5"
                                step="0.01"
                            />
                        </div>

                        <div>
                            <Label>Expected Lifetime (years)</Label>
                            <Input 
                                type="number"
                                value={formData.expected_lifetime}
                                onChange={(e) => setFormData({...formData, expected_lifetime: e.target.value})}
                                placeholder="5"
                            />
                        </div>

                        <div>
                            <Label>Manufacturer</Label>
                            <Input 
                                value={formData.manufacturer}
                                onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
                                placeholder="Company Name"
                            />
                        </div>

                        <div>
                            <Label>Manufacturing Country</Label>
                            <Input 
                                value={formData.manufacturing_country}
                                onChange={(e) => setFormData({...formData, manufacturing_country: e.target.value})}
                                placeholder="e.g., China"
                            />
                        </div>

                        <div className="col-span-2">
                            <Label>Description</Label>
                            <Textarea 
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                placeholder="Product description..."
                                rows={3}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button 
                        onClick={handleSubmit}
                        disabled={createMutation.isPending || !formData.name || !formData.sku}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        Create Product
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}