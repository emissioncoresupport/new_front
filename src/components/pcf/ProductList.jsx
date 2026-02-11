import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Leaf, Plus, ArrowUpRight, Box, Layers, Calendar, Package } from "lucide-react";
import { format } from "date-fns";

export default function ProductList({ onCreate, onProductClick, viewMode = 'grid', searchQuery = '' }) {
    const { data: products = [] } = useQuery({
        queryKey: ['products'],
        queryFn: () => base44.entities.Product.list('-created_date')
    });

    const filteredProducts = products.filter(product => {
        if (!searchQuery) return true;
        const search = searchQuery.toLowerCase();
        return (
            product.name?.toLowerCase().includes(search) ||
            product.sku?.toLowerCase().includes(search) ||
            product.description?.toLowerCase().includes(search) ||
            product.category?.toLowerCase().includes(search)
        );
    });

    if (viewMode === 'table') {
        return (
            <div className="space-y-4">
                {filteredProducts.length === 0 ? (
                    <div className="col-span-full py-16 text-center relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-dashed border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
                        <div className="relative">
                        <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-light text-slate-900">No Products Found</h3>
                        <p className="text-slate-500 font-light mb-6">Start by adding your first product to calculate its carbon footprint.</p>
                        <Button onClick={onCreate} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 transition-all">
                            Create Product
                        </Button>
                        </div>
                    </div>
                ) : (
                    <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
                        <Table>
                            <TableHeader className="bg-white/30 backdrop-blur-md border-b border-white/30">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="font-light text-slate-600">Product</TableHead>
                                    <TableHead className="font-light text-slate-600">Status</TableHead>
                                    <TableHead className="font-light text-slate-600">Version</TableHead>
                                    <TableHead className="font-light text-slate-600">Created</TableHead>
                                    <TableHead className="font-light text-slate-600 text-right">Total Impact</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProducts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center">
                                            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                            <h3 className="text-lg font-light text-slate-900">No Products Match Your Search</h3>
                                            <p className="text-slate-500 font-light">Try adjusting your search terms.</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredProducts.map(product => (
                                        <TableRow 
                                            key={product.id}
                                            className="cursor-pointer hover:bg-white/40 backdrop-blur-sm transition-all"
                                            onClick={() => onProductClick(product.id)}
                                        >
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center">
                                                        {product.image_url ? (
                                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                                                        ) : (
                                                            <Box className="w-5 h-5 text-slate-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-light text-slate-900">{product.name}</p>
                                                        <p className="text-xs text-slate-500 font-light">{product.sku || 'No SKU'}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={
                                                    product.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    product.status === 'Verified' ? 'bg-[#86b027]/10 text-[#86b027] border-[#86b027]/30' :
                                                    'bg-slate-50 text-slate-600 border-slate-200'
                                                }>
                                                    {product.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-slate-600 font-light">{product.version}</TableCell>
                                            <TableCell className="text-slate-600 font-light">{format(new Date(product.created_date), 'MMM d, yyyy')}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="font-extralight text-slate-900">
                                                    {product.total_co2e_kg ? product.total_co2e_kg.toFixed(2) : '-'} <span className="text-xs font-light text-slate-500">kg CO₂e</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map(product => (
                    <div 
                        key={product.id} 
                        className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden group cursor-pointer hover:shadow-[0_16px_48px_rgba(134,176,39,0.2)] hover:-translate-y-1 transition-all duration-300"
                        onClick={() => onProductClick(product.id)}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 via-transparent to-transparent pointer-events-none"></div>
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#86b027]"></div>
                        <div className="relative p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center">
                                    {product.image_url ? (
                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                                    ) : (
                                        <Box className="w-6 h-6 text-slate-400" />
                                    )}
                                </div>
                                <Badge variant="outline" className={
                                    product.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    product.status === 'Verified' ? 'bg-[#86b027]/10 text-[#86b027] border-[#86b027]/30' :
                                    'bg-slate-50 text-slate-600 border-slate-200'
                                }>
                                    {product.status}
                                </Badge>
                            </div>
                            
                            <h3 className="text-lg font-light text-slate-900 mb-1 group-hover:text-[#86b027] transition-colors tracking-tight">
                                {product.name}
                            </h3>
                            <p className="text-sm text-slate-500 font-light mb-4 line-clamp-2">
                                {product.description || "No description provided."}
                            </p>

                            <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                                <span className="flex items-center gap-1">
                                    <Layers className="w-3 h-3" /> {product.version}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> {format(new Date(product.created_date), 'MMM d, yyyy')}
                                </span>
                            </div>

                            <div className="pt-4 border-t border-white/30 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-light">Total Impact</p>
                                    <p className="text-lg font-extralight text-slate-900">
                                        {product.total_co2e_kg ? product.total_co2e_kg.toFixed(2) : '-'} <span className="text-xs font-light text-slate-500">kg CO₂e</span>
                                    </p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-[#86b027]/10 flex items-center justify-center group-hover:bg-[#86b027] transition-all backdrop-blur-sm">
                                    <ArrowUpRight className="w-4 h-4 text-[#86b027] group-hover:text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                
                {/* Empty State if no products */}
                {filteredProducts.length === 0 && (
                    <div className="col-span-full py-16 text-center relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-dashed border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
                        <div className="relative">
                        <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-light text-slate-900">{searchQuery ? 'No Products Match Your Search' : 'No Products Found'}</h3>
                        <p className="text-slate-500 font-light mb-6">{searchQuery ? 'Try adjusting your search terms.' : 'Start by adding your first product to calculate its carbon footprint.'}</p>
                        {!searchQuery && (
                            <Button onClick={onCreate} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 transition-all">
                                Create Product
                            </Button>
                        )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}