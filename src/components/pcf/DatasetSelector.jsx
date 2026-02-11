import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Database, Check, Cloud, Loader2 } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DatasetSelector({ searchTerm: initialSearch, onSelect }) {
    const [search, setSearch] = useState(initialSearch);
    const [useClimatiq, setUseClimatiq] = useState(false);
    const [climatiqResults, setClimatiqResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    
    // Mock Data - Expanded for realism and ISO fields
    const mockDatasets = [
        { id: 'd1', name: 'Aluminum slugs (cast aluminium)', category: 'Metals', source: 'CEDA', year: 2022, factor: 0.311, unit: 'kg CO2e/kg', dqr: 2, region: 'Global' },
        { id: 'd2', name: 'Aluminum sheet (rolled)', category: 'Metals', source: 'Ecoinvent', year: 2023, factor: 0.494, unit: 'kg CO2e/kg', dqr: 1, region: 'EU' },
        { id: 'd3', name: 'Steel unalloyed', category: 'Metals', source: 'Ecoinvent', year: 2023, factor: 1.85, unit: 'kg CO2e/kg', dqr: 2, region: 'CN' },
        { id: 'd4', name: 'Injection molding (plastic)', category: 'Processing', source: 'CEDA', year: 2022, factor: 0.528, unit: 'kg CO2e/kg', dqr: 3, region: 'Global' },
        { id: 'd5', name: 'Polypropylene (PP) granulate', category: 'Plastics', source: 'PlasticsEurope', year: 2021, factor: 1.60, unit: 'kg CO2e/kg', dqr: 1, region: 'EU' },
        { id: 'd6', name: 'Cardboard packaging', category: 'Packaging', source: 'DEFRA', year: 2023, factor: 0.265, unit: 'kg CO2e/kg', dqr: 2, region: 'UK' },
        { id: 'd7', name: 'Transport, freight, lorry >32t', category: 'Transport', source: 'GLEC', year: 2023, factor: 0.062, unit: 'kg CO2e/tkm', dqr: 2, region: 'Global' },
        { id: 'd8', name: 'Electricity, grid mix', category: 'Energy', source: 'IEA', year: 2023, factor: 0.412, unit: 'kg CO2e/kWh', dqr: 1, region: 'US' },
        { id: 'd9', name: 'Tap water', category: 'Utilities', source: 'Ecoinvent', year: 2023, factor: 0.0003, unit: 'kg CO2e/kg', dqr: 2, region: 'EU' },
    ];

    const searchClimatiq = async () => {
        if (!search) return;
        setIsSearching(true);
        try {
            const response = await base44.functions.invoke('climatiqAPI', {
                method: 'search',
                params: { query: search }
            });
            
            setClimatiqResults(response.data.results || []);
            setUseClimatiq(true);
            toast.success(`Found ${response.data.results?.length || 0} factors from Climatiq`);
        } catch (error) {
            toast.error('Climatiq search failed - using local database');
            setUseClimatiq(false);
        } finally {
            setIsSearching(false);
        }
    };

    const filtered = useClimatiq 
        ? climatiqResults.filter(d => 
            d.name.toLowerCase().includes(search.toLowerCase())
          )
        : mockDatasets.filter(d => 
            d.name.toLowerCase().includes(search.toLowerCase()) || 
            d.category.toLowerCase().includes(search.toLowerCase())
          );

    return (
        <div className="flex gap-6 h-[600px]">
            {/* Filters Sidebar */}
            <div className="w-64 space-y-6 border-r pr-4">
                <div>
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Filter className="w-4 h-4" /> Filters
                    </h4>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-500">Keywords</label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input 
                                    className="pl-9" 
                                    value={search} 
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-500">Source</label>
                            <Select>
                                <SelectTrigger><SelectValue placeholder="Select Source" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Sources</SelectItem>
                                    <SelectItem value="ecoinvent">Ecoinvent</SelectItem>
                                    <SelectItem value="ceda">CEDA</SelectItem>
                                    <SelectItem value="defra">DEFRA</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-500">Region</label>
                            <Select>
                                <SelectTrigger><SelectValue placeholder="Select Region" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="global">Global</SelectItem>
                                    <SelectItem value="eu">Europe</SelectItem>
                                    <SelectItem value="us">North America</SelectItem>
                                    <SelectItem value="cn">China</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button 
                            className="w-full bg-[#02a1e8] hover:bg-[#028ac7] text-white"
                            onClick={searchClimatiq}
                            disabled={isSearching || !search}
                        >
                            {isSearching ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching...</>
                            ) : (
                                <><Cloud className="w-4 h-4 mr-2" /> Search Climatiq API</>
                            )}
                        </Button>
                        <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => setUseClimatiq(false)}
                        >
                            <Database className="w-4 h-4 mr-2" />
                            Use Local Database
                        </Button>
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="flex-1">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-800">
                        Search Results <span className="text-slate-400 font-normal">({filtered.length} items)</span>
                        {useClimatiq && <Badge className="ml-2 bg-blue-500 text-white"><Cloud className="w-3 h-3 mr-1" />Climatiq API</Badge>}
                    </h4>
                    <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setUseClimatiq(false); }}>Clear Search</Button>
                </div>

                <div className="border rounded-xl overflow-hidden bg-white shadow-sm h-[500px] overflow-y-auto">
                    <Table>
                        <TableHeader className="bg-slate-50 sticky top-0 z-10">
                            <TableRow>
                                <TableHead>Activity Name</TableHead>
                                <TableHead>Factor</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Region</TableHead>
                                <TableHead>DQR</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map(dataset => (
                                <TableRow key={dataset.id} className="hover:bg-slate-50/50">
                                    <TableCell>
                                        <div className="font-medium text-slate-700">{dataset.name}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="text-[10px] text-slate-500">{dataset.category}</Badge>
                                            <span className="text-[10px] text-slate-400">{dataset.year}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-bold text-[#86b027]">{dataset.factor}</span>
                                        <span className="text-xs text-slate-400 ml-1">{dataset.unit}</span>
                                    </TableCell>
                                    <TableCell><Badge variant="secondary">{dataset.source}</Badge></TableCell>
                                    <TableCell className="text-xs text-slate-500">{dataset.region}</TableCell>
                                    <TableCell>
                                        <Badge className={
                                            dataset.dqr <= 2 ? 'bg-emerald-100 text-emerald-800' :
                                            dataset.dqr <= 3 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                                        }>
                                            {dataset.dqr}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" className="bg-[#02a1e8] hover:bg-[#028ac7] text-white h-8" onClick={() => onSelect(dataset)}>
                                            <Check className="w-3 h-3 mr-1" /> Assign
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filtered.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                                        <Database className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No emission factors found.</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}