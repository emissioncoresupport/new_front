import React, { useState } from 'react';
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Check, X, AlertOctagon, ExternalLink, Database, CheckCircle2 } from "lucide-react";
import { PFASExternalAPIService } from './services/PFASExternalAPIService';

export default function PFASSubstanceCheck() {
    const [query, setQuery] = useState("");
    const [result, setResult] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [verification, setVerification] = useState(null);

    const searchMutation = useMutation({
        mutationFn: async () => {
            setIsSearching(true);
            try {
                // Use robust multi-source lookup
                const substance = await PFASExternalAPIService.lookupAndStoreSubstance(query);
                
                return {
                    name: substance.name,
                    cas_number: substance.cas_number,
                    is_pfas: substance.pfas_flag,
                    status: substance.restricted_status ? 'Restricted' : 
                            substance.svhc_status ? 'SVHC' : 'Allowed',
                    description: `Molecular Formula: ${substance.molecular_formula || 'N/A'} | MW: ${substance.molecular_weight || 'N/A'}`,
                    regulation_details: substance.restricted_status ? 
                        `REACH Annex XVII (${substance.restriction_threshold_ppm || 0} ppm)` : 
                        substance.svhc_status ? 'REACH Candidate List' : 'Not restricted',
                    external_ids: substance.external_ids,
                    verification_metadata: substance.verification_metadata,
                    synonyms: substance.synonyms?.slice(0, 5)
                };
            } catch (error) {
                throw new Error(error.message || 'Substance lookup failed');
            } finally {
                setIsSearching(false);
            }
        },
        onSuccess: (data) => {
            setResult(data);
            setVerification(data.verification_metadata);
        }
    });

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-[#545454]">Substance Checker</h2>
                <p className="text-slate-500">Instant AI check against ECHA & REACH databases.</p>
            </div>

            <div className="flex gap-2">
                <Input 
                    placeholder="Enter CAS Number or Chemical Name (e.g. PFOA, 335-67-1)" 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-12 text-lg"
                    onKeyDown={(e) => e.key === 'Enter' && searchMutation.mutate()}
                />
                <Button 
                    size="lg" 
                    className="h-12 px-6 bg-rose-600 hover:bg-rose-700 text-white"
                    onClick={() => searchMutation.mutate()}
                    disabled={!query || isSearching}
                >
                    {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </Button>
            </div>

            {result && (
                <Card className="animate-in fade-in slide-in-from-bottom-4">
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <CardTitle className="text-xl">{result.name}</CardTitle>
                                <CardDescription>CAS: {result.cas_number}</CardDescription>
                                {result.synonyms && result.synonyms.length > 0 && (
                                    <p className="text-xs text-slate-400 mt-1">Also known as: {result.synonyms.join(', ')}</p>
                                )}
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${
                                result.is_pfas || result.status === 'Restricted' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                                {result.is_pfas || result.status === 'Restricted' ? <AlertOctagon className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                {result.status}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-slate-700">
                            {result.description}
                        </div>
                        
                        {verification && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Database className="w-4 h-4 text-blue-600" />
                                    <span className="text-xs font-bold text-blue-900 uppercase">Multi-Source Verification</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    {verification.sources_checked?.map(source => (
                                        <Badge key={source} variant="outline" className="bg-white">
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                            {source}
                                        </Badge>
                                    ))}
                                </div>
                                <p className="text-xs text-blue-700 mt-2">
                                    Verification Score: <strong>{verification.verification_score}%</strong>
                                </p>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 border rounded-lg">
                                <p className="text-xs text-slate-400 uppercase font-bold">Is PFAS?</p>
                                <p className={`font-medium ${result.is_pfas ? 'text-rose-600' : 'text-slate-700'}`}>
                                    {result.is_pfas ? 'Yes' : 'No'}
                                </p>
                            </div>
                            <div className="p-3 border rounded-lg">
                                <p className="text-xs text-slate-400 uppercase font-bold">Regulation</p>
                                <p className="font-medium text-slate-700">{result.regulation_details || 'None'}</p>
                            </div>
                        </div>

                        {result.external_ids && (
                            <div className="p-3 bg-slate-50 rounded-lg text-xs">
                                <p className="font-bold text-slate-600 mb-2">Database IDs:</p>
                                <div className="space-y-1 text-slate-600">
                                    {result.external_ids.pubchem_cid && (
                                        <p>PubChem CID: <a href={`https://pubchem.ncbi.nlm.nih.gov/compound/${result.external_ids.pubchem_cid}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{result.external_ids.pubchem_cid}</a></p>
                                    )}
                                    {result.external_ids.chemspider_id && (
                                        <p>ChemSpider: {result.external_ids.chemspider_id}</p>
                                    )}
                                    {result.external_ids.echa_substance_id && (
                                        <p>ECHA: {result.external_ids.echa_substance_id}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="pt-4 flex justify-center">
                            <a href={`https://echa.europa.eu/search-for-chemicals?p_p_id=disclist_WAR_disclistportlet&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_disclist_WAR_disclistportlet_keyword=${result.cas_number || result.name}`} target="_blank" rel="noreferrer" className="flex items-center text-sm text-blue-600 hover:underline">
                                Verify on ECHA Website <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}