import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, CheckCircle2, ExternalLink, Server, 
  Key, FileCode, Shield, Lock
} from "lucide-react";

export default function CBAMBackendSetupGuide() {
  return (
    <div className="space-y-6">
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Backend Functions Required for Official Submission
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-slate-200 bg-white">
            <Server className="h-4 w-4 text-slate-600" />
            <AlertDescription className="text-sm">
              <strong>Current Status:</strong> Backend functions are disabled. 
              The system can generate compliant XML reports for download and manual submission, 
              but cannot submit directly to the EU Transitional Registry.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h4 className="font-bold text-slate-900">Setup Steps:</h4>
            
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                <div className="mt-0.5">
                  <Badge variant="outline" className="w-6 h-6 rounded-full flex items-center justify-center">1</Badge>
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold text-slate-900">Enable Backend Functions</h5>
                  <p className="text-sm text-slate-600 mt-1">
                    Go to <strong>Dashboard → Settings → Backend Functions</strong> and enable server-side capabilities
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                <div className="mt-0.5">
                  <Badge variant="outline" className="w-6 h-6 rounded-full flex items-center justify-center">2</Badge>
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold text-slate-900">Register with EU Transitional Registry</h5>
                  <p className="text-sm text-slate-600 mt-1">
                    Visit the <a 
                      href="https://ec.europa.eu/taxation_customs/dds2/cbam/cbam_home.jsp" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#02a1e8] hover:underline inline-flex items-center gap-1"
                    >
                      EU Commission CBAM Portal <ExternalLink className="w-3 h-3" />
                    </a> and register as an authorized declarant
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                <div className="mt-0.5">
                  <Badge variant="outline" className="w-6 h-6 rounded-full flex items-center justify-center">3</Badge>
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Configure API Credentials
                  </h5>
                  <p className="text-sm text-slate-600 mt-1">
                    Add the following secrets in <strong>Settings → Secrets</strong>:
                  </p>
                  <ul className="mt-2 space-y-1 text-xs font-mono bg-slate-900 text-green-400 p-3 rounded">
                    <li>• EU_CBAM_REGISTRY_API_KEY</li>
                    <li>• EU_CBAM_REGISTRY_ENDPOINT</li>
                    <li>• CBAM_EORI_NUMBER</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                <div className="mt-0.5">
                  <Badge variant="outline" className="w-6 h-6 rounded-full flex items-center justify-center">4</Badge>
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Digital Signature Certificate
                  </h5>
                  <p className="text-sm text-slate-600 mt-1">
                    Obtain a qualified digital certificate from an EU-recognized Certificate Authority for signing XML submissions
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                <div className="mt-0.5">
                  <Badge variant="outline" className="w-6 h-6 rounded-full flex items-center justify-center">5</Badge>
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold text-slate-900 flex items-center gap-2">
                    <FileCode className="w-4 h-4" />
                    Download Official Schemas
                  </h5>
                  <p className="text-sm text-slate-600 mt-1">
                    Download the official XSD schema files from the EU Commission for validation
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Alert className="border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-sm text-slate-700">
              <strong>What works now:</strong> XML generation, validation, and download for manual submission via the EU portal.
              You can export compliant XML files and submit them manually until backend integration is complete.
            </AlertDescription>
          </Alert>

          <div className="pt-4 border-t">
            <h4 className="font-bold text-slate-900 mb-2">Useful Resources:</h4>
            <ul className="space-y-1 text-sm">
              <li>
                <a 
                  href="https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#02a1e8] hover:underline inline-flex items-center gap-1"
                >
                  EU CBAM Official Website <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a 
                  href="https://eur-lex.europa.eu/eli/reg/2023/956/oj" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#02a1e8] hover:underline inline-flex items-center gap-1"
                >
                  Regulation (EU) 2023/956 <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a 
                  href="https://eur-lex.europa.eu/eli/reg_impl/2023/1773/oj" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#02a1e8] hover:underline inline-flex items-center gap-1"
                >
                  Implementing Regulation (EU) 2023/1773 <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}