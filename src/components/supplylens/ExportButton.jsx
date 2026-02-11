import React from 'react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Download, FileText, Building2, MapPin, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export default function ExportButton({ suppliers, sites, alerts }) {
  const downloadCSV = (data, filename, headers) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const key = h.toLowerCase().replace(/ /g, '_');
        const value = row[key] ?? '';
        const escaped = String(value).replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('\n') ? `"${escaped}"` : escaped;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportSuppliers = () => {
    const data = suppliers.map(s => ({
      legal_name: s.legal_name,
      trade_name: s.trade_name || '',
      vat_number: s.vat_number || '',
      country: s.country,
      city: s.city || '',
      tier: s.tier,
      risk_score: s.risk_score || 0,
      risk_level: s.risk_level || 'medium',
      status: s.status,
      cbam_relevant: s.cbam_relevant ? 'Yes' : 'No',
      pfas_relevant: s.pfas_relevant ? 'Yes' : 'No',
      eudr_relevant: s.eudr_relevant ? 'Yes' : 'No',
      ppwr_relevant: s.ppwr_relevant ? 'Yes' : 'No'
    }));
    downloadCSV(data, 'suppliers', [
      'Legal_Name', 'Trade_Name', 'VAT_Number', 'Country', 'City', 
      'Tier', 'Risk_Score', 'Risk_Level', 'Status',
      'CBAM_Relevant', 'PFAS_Relevant', 'EUDR_Relevant', 'PPWR_Relevant'
    ]);
  };

  const exportHighRisk = () => {
    const highRiskSuppliers = suppliers.filter(s => 
      s.risk_level === 'high' || s.risk_level === 'critical'
    );
    const data = highRiskSuppliers.map(s => ({
      legal_name: s.legal_name,
      country: s.country,
      tier: s.tier,
      risk_score: s.risk_score || 0,
      risk_level: s.risk_level,
      location_risk: s.location_risk || 0,
      human_rights_risk: s.human_rights_risk || 0,
      environmental_risk: s.environmental_risk || 0,
      chemical_risk: s.chemical_risk || 0
    }));
    downloadCSV(data, 'high_risk_suppliers', [
      'Legal_Name', 'Country', 'Tier', 'Risk_Score', 'Risk_Level',
      'Location_Risk', 'Human_Rights_Risk', 'Environmental_Risk', 'Chemical_Risk'
    ]);
  };

  const exportSites = () => {
    const data = (sites || []).map(s => {
      const supplier = suppliers.find(sup => sup.id === s.supplier_id);
      return {
        site_name: s.site_name,
        supplier: supplier?.legal_name || '',
        country: s.country,
        city: s.city || '',
        facility_type: s.facility_type,
        certifications: (s.certifications || []).join('; '),
        risk_score: s.site_risk_score || 0
      };
    });
    downloadCSV(data, 'supplier_sites', [
      'Site_Name', 'Supplier', 'Country', 'City', 
      'Facility_Type', 'Certifications', 'Risk_Score'
    ]);
  };

  const exportAlerts = () => {
    const openAlerts = alerts.filter(a => a.status === 'open');
    const data = openAlerts.map(a => {
      const supplier = suppliers.find(s => s.id === a.supplier_id);
      return {
        title: a.title,
        supplier: supplier?.legal_name || '',
        alert_type: a.alert_type,
        severity: a.severity,
        description: a.description || '',
        created_date: a.created_date ? format(new Date(a.created_date), 'yyyy-MM-dd') : ''
      };
    });
    downloadCSV(data, 'risk_alerts', [
      'Title', 'Supplier', 'Alert_Type', 'Severity', 'Description', 'Created_Date'
    ]);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Export Reports</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportSuppliers}>
          <Building2 className="w-4 h-4 mr-2" />
          All Suppliers
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportHighRisk}>
          <AlertTriangle className="w-4 h-4 mr-2 text-rose-600" />
          High Risk Suppliers
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportSites}>
          <MapPin className="w-4 h-4 mr-2" />
          All Sites
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAlerts}>
          <FileText className="w-4 h-4 mr-2" />
          Open Alerts
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}