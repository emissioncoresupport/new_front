import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Database, ExternalLink } from "lucide-react";

/**
 * Displays verification status for multi-source chemical lookups
 * Shows data consistency across PubChem, ChemSpider, ECHA
 */
export default function PFASVerificationPanel({ substance }) {
  if (!substance?.verification_metadata) return null;

  const { verification_score, sources_checked, consistency_checks } = substance.verification_metadata;

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600" />
          Multi-Source Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Verification Score */}
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
          <span className="text-sm font-medium">Confidence Score</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${verification_score >= 70 ? 'bg-emerald-500' : verification_score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                style={{ width: `${verification_score}%` }}
              />
            </div>
            <span className="text-lg font-bold">{verification_score}%</span>
          </div>
        </div>

        {/* Sources Checked */}
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase mb-2">Data Sources</p>
          <div className="flex flex-wrap gap-2">
            {sources_checked?.map(source => (
              <Badge key={source} variant="outline" className="bg-white">
                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                {source}
              </Badge>
            ))}
          </div>
        </div>

        {/* Consistency Checks */}
        {consistency_checks && consistency_checks.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Consistency Checks</p>
            <div className="space-y-2">
              {consistency_checks.map((check, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2 bg-white rounded border">
                  <span className="text-slate-600">
                    {check.check.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  {check.pass ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-amber-500" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* External IDs */}
        {substance.external_ids && (
          <div className="pt-2 border-t">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Database IDs</p>
            <div className="space-y-1 text-xs text-slate-600">
              {substance.external_ids.pubchem_cid && (
                <a 
                  href={`https://pubchem.ncbi.nlm.nih.gov/compound/${substance.external_ids.pubchem_cid}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-blue-600"
                >
                  PubChem CID: {substance.external_ids.pubchem_cid}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {substance.external_ids.chemspider_id && (
                <p>ChemSpider: {substance.external_ids.chemspider_id}</p>
              )}
              {substance.external_ids.echa_substance_id && (
                <p>ECHA: {substance.external_ids.echa_substance_id}</p>
              )}
            </div>
          </div>
        )}

        {verification_score < 50 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
            ⚠️ Low verification confidence - consider manual review or additional sources
          </div>
        )}
      </CardContent>
    </Card>
  );
}