import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, FileJson } from 'lucide-react';
import { toast } from 'sonner';

/**
 * PAYLOAD EXAMPLES — Shows exact JSON sent to ingestEvidenceDeterministic per method
 */

const PAYLOAD_EXAMPLES = {
  MANUAL_ENTRY: {
    origin: 'USER_SUBMITTED',
    ingestion_method: 'MANUAL_ENTRY',
    source_system: 'INTERNAL_MANUAL',
    dataset_type: 'SUPPLIER_MASTER',
    declared_scope: 'SITE',
    scope_target_id: 'SITE-FAC-001',
    primary_intent: 'Manual correction of supplier address after verification call',
    purpose_tags: ['COMPLIANCE', 'AUDIT'],
    contains_personal_data: false,
    retention_policy: 'STANDARD_1_YEAR',
    payload_bytes: '{"supplier_name":"ACME Corp","corrected_address":"123 Updated St, Berlin"}',
    entry_notes: 'Correcting supplier address based on phone verification with contact person on 2026-01-26. Previous address was incorrect in ERP.',
    request_id: 'req_manual_20260126_001',
    correlation_id: 'corr_manual_session_abc123',
    // attestor_user_id: auto-set server-side to current user
    // attested_by_email: auto-set server-side
  },
  FILE_UPLOAD: {
    origin: 'USER_SUBMITTED',
    ingestion_method: 'FILE_UPLOAD',
    source_system: 'OTHER',
    source_system_friendly_name: 'Supplier CSV Extract',
    dataset_type: 'SUPPLIER_MASTER',
    declared_scope: 'ENTIRE_ORGANIZATION',
    primary_intent: 'Quarterly supplier master data refresh from external vendor',
    purpose_tags: ['COMPLIANCE', 'RISK_ASSESSMENT'],
    contains_personal_data: false,
    retention_policy: '3_YEARS',
    payload_bytes: '<file_contents_or_pasted_json>',
    file_name: 'suppliers_q1_2026.csv',
    request_id: 'req_file_20260126_002',
    correlation_id: 'corr_quarterly_refresh_2026q1'
  },
  API_PUSH: {
    origin: 'SYSTEM_INTEGRATION',
    ingestion_method: 'API_PUSH',
    source_system: 'SAP',
    source_system_friendly_name: 'SAP S/4HANA Production',
    dataset_type: 'TRANSACTION_LOG',
    declared_scope: 'LEGAL_ENTITY',
    scope_target_id: 'LE-DE-001',
    primary_intent: 'Real-time purchase order ingestion from SAP webhook',
    purpose_tags: ['COMPLIANCE', 'AUDIT'],
    contains_personal_data: false,
    retention_policy: '7_YEARS',
    payload_bytes: '{"po_number":"PO-2026-5678","total":15000,"currency":"EUR"}',
    external_reference_id: 'SAP_PO_2026_5678',
    request_id: 'req_api_20260126_003',
    correlation_id: 'corr_webhook_batch_001'
  },
  ERP_EXPORT: {
    origin: 'SYSTEM_INTEGRATION',
    ingestion_method: 'ERP_EXPORT',
    source_system: 'SAP',
    source_system_friendly_name: 'SAP S/4HANA Production',
    dataset_type: 'PRODUCT_MASTER',
    declared_scope: 'ENTIRE_ORGANIZATION',
    primary_intent: 'Monthly product master export from SAP for compliance reporting',
    purpose_tags: ['COMPLIANCE', 'QUALITY_CONTROL'],
    contains_personal_data: false,
    retention_policy: '3_YEARS',
    payload_bytes: '<file_upload_required>',
    snapshot_datetime_utc: '2026-01-26T02:00:00.000Z',
    export_job_id: 'SAP_EXPORT_20260126_001',
    request_id: 'req_erp_export_20260126_004',
    correlation_id: 'corr_monthly_export_jan2026'
  },
  ERP_API: {
    origin: 'SYSTEM_INTEGRATION',
    ingestion_method: 'ERP_API',
    source_system: 'ORACLE',
    source_system_friendly_name: 'Oracle EBS Production',
    dataset_type: 'EMISSION_FACTORS',
    declared_scope: 'PRODUCT_FAMILY',
    scope_target_id: 'PROD_FAM_ELECTRONICS',
    primary_intent: 'Live API fetch of emission factors from Oracle sustainability module',
    purpose_tags: ['COMPLIANCE'],
    contains_personal_data: false,
    retention_policy: 'STANDARD_1_YEAR',
    snapshot_datetime_utc: '2026-01-26T08:30:00.000Z',
    connector_reference: 'ORACLE_EBS_PROD_CONN_02',
    request_id: 'req_erp_api_20260126_005',
    correlation_id: 'corr_live_fetch_20260126',
    // NO payload_bytes - server fetches data using connector_reference
  },
  SUPPLIER_PORTAL: {
    origin: 'USER_SUBMITTED',
    ingestion_method: 'SUPPLIER_PORTAL',
    source_system: 'SUPPLIER_PORTAL',
    dataset_type: 'CERTIFICATES',
    declared_scope: 'SITE',
    scope_target_id: 'SITE-FAC-SUPPLIER-XYZ',
    primary_intent: 'ISO 13485 certificate submitted by supplier via portal',
    purpose_tags: ['COMPLIANCE', 'QUALITY_CONTROL'],
    contains_personal_data: false,
    retention_policy: '7_YEARS',
    supplier_portal_request_id: 'PRT-20260126-001',
    request_id: 'req_portal_20260126_006',
    correlation_id: 'corr_supplier_cert_upload',
    // NO payload_bytes - retrieved server-side from portal submission
  }
};

export default function Contract1PayloadExamples() {
  const [selectedMethod, setSelectedMethod] = useState('MANUAL_ENTRY');

  const copyPayload = () => {
    const payload = PAYLOAD_EXAMPLES[selectedMethod];
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    toast.success('Payload example copied to clipboard');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileJson className="w-5 h-5" />
          Contract 1 Payload Examples
        </CardTitle>
        <p className="text-xs text-slate-600">Example JSON payloads sent to ingestEvidenceDeterministic per method</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Select value={selectedMethod} onValueChange={setSelectedMethod}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MANUAL_ENTRY">MANUAL_ENTRY</SelectItem>
              <SelectItem value="FILE_UPLOAD">FILE_UPLOAD</SelectItem>
              <SelectItem value="API_PUSH">API_PUSH</SelectItem>
              <SelectItem value="ERP_EXPORT">ERP_EXPORT</SelectItem>
              <SelectItem value="ERP_API">ERP_API</SelectItem>
              <SelectItem value="SUPPLIER_PORTAL">SUPPLIER_PORTAL</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={copyPayload} className="gap-2">
            <Copy className="w-4 h-4" />
            Copy JSON
          </Button>
        </div>

        <div className="relative">
          <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto text-xs font-mono max-h-96 overflow-y-auto">
            {JSON.stringify(PAYLOAD_EXAMPLES[selectedMethod], null, 2)}
          </pre>
        </div>

        {/* Method-specific notes */}
        <div className="space-y-2 text-xs">
          {selectedMethod === 'MANUAL_ENTRY' && (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-3 text-amber-900">
                <p><strong>Note:</strong> attestor_user_id and attested_by_email are auto-set server-side from authenticated user. source_system forced to INTERNAL_MANUAL.</p>
              </CardContent>
            </Card>
          )}
          {selectedMethod === 'ERP_API' && (
            <Card className="bg-violet-50 border-violet-200">
              <CardContent className="p-3 text-violet-900">
                <p><strong>Note:</strong> NO payload_bytes in request. Server fetches data using connector_reference. Credentials never in payload or logs.</p>
              </CardContent>
            </Card>
          )}
          {selectedMethod === 'SUPPLIER_PORTAL' && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3 text-green-900">
                <p><strong>Note:</strong> NO payload_bytes in request. Server retrieves submission using supplier_portal_request_id. source_system forced to SUPPLIER_PORTAL.</p>
              </CardContent>
            </Card>
          )}
          {selectedMethod === 'ERP_EXPORT' && (
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-3 text-purple-900">
                <p><strong>Note:</strong> File upload required. snapshot_datetime_utc marks when export was generated. export_job_id from ERP batch job.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
}