import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Battery, Zap, Recycle, AlertTriangle, Shield, Leaf } from "lucide-react";
import { Progress } from "@/components/ui/progress";

/**
 * Battery DPP Template
 * Per EU Battery Regulation 2023/1542 + ESPR
 * Mandatory from: February 18, 2027 (for new batteries)
 * 
 * Requirements:
 * - Carbon footprint declaration (Annex XIII)
 * - Recycled content (Annex VIII)
 * - Supply chain due diligence (Annex X)
 * - Hazardous substances info
 * - Battery lifespan and performance
 */

export default function BatteryDPPTemplate({ dpp, product, onUpdate }) {
  const batteryData = dpp?.battery_specific_data || {};

  return (
    <div className="space-y-6">
      {/* Critical Battery Info */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Battery className="w-5 h-5 text-amber-600" />
            Battery Identification & Classification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-600 uppercase font-bold mb-1">Battery Type</div>
              <div className="font-bold">{batteryData.battery_type || 'Not specified'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-600 uppercase font-bold mb-1">Chemistry</div>
              <div className="font-bold">{batteryData.chemistry || 'Li-ion'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-600 uppercase font-bold mb-1">Capacity</div>
              <div className="font-bold">{batteryData.nominal_capacity_kwh || 'N/A'} kWh</div>
            </div>
            <div>
              <div className="text-xs text-slate-600 uppercase font-bold mb-1">Voltage</div>
              <div className="font-bold">{batteryData.nominal_voltage_v || 'N/A'} V</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Carbon Footprint (Annex XIII - Mandatory) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Leaf className="w-5 h-5 text-emerald-600" />
            Carbon Footprint Declaration (Mandatory per Art. 7)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {batteryData.carbon_footprint_kgco2e || product?.total_co2e_kg || 'N/A'}
              </div>
              <div className="text-xs text-slate-600 mt-1">kg CO₂e (total lifecycle)</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">
                {batteryData.carbon_footprint_per_kwh || 'N/A'}
              </div>
              <div className="text-xs text-slate-600 mt-1">kg CO₂e/kWh</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <Badge className={
                (batteryData.carbon_footprint_per_kwh || 999) < 40 ? 'bg-emerald-500' :
                (batteryData.carbon_footprint_per_kwh || 999) < 60 ? 'bg-amber-500' : 'bg-rose-500'
              }>
                {(batteryData.carbon_footprint_per_kwh || 999) < 40 ? 'Excellent' :
                 (batteryData.carbon_footprint_per_kwh || 999) < 60 ? 'Good' : 'Needs Improvement'}
              </Badge>
              <div className="text-xs text-slate-600 mt-1">Performance Class</div>
            </div>
          </div>
          <div className="text-xs text-slate-500">
            ℹ️ Calculated per EN IEC 63376 standard • Verified: {batteryData.carbon_footprint_verified ? 'Yes ✓' : 'Pending'}
          </div>
        </CardContent>
      </Card>

      {/* Recycled Content (Annex VIII) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Recycle className="w-5 h-5 text-blue-600" />
            Recycled Content (Art. 8 Requirements)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {['Cobalt', 'Lithium', 'Nickel', 'Lead'].map(material => {
            const current = batteryData[`recycled_${material.toLowerCase()}_pct`] || 0;
            const target2030 = material === 'Cobalt' ? 16 : material === 'Lead' ? 85 : material === 'Lithium' ? 6 : 6;
            const target2035 = material === 'Cobalt' ? 26 : material === 'Lead' ? 85 : material === 'Lithium' ? 12 : 15;
            
            return (
              <div key={material}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-slate-700">{material}</span>
                  <div className="text-right">
                    <span className="font-bold text-lg">{current}%</span>
                    <span className="text-xs text-slate-500 ml-2">
                      (Target 2030: {target2030}% | 2035: {target2035}%)
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <Progress value={(current / target2035) * 100} className="flex-1" />
                  <Badge className={current >= target2030 ? 'bg-emerald-500' : 'bg-amber-500'}>
                    {current >= target2030 ? '✓ 2030' : '⚠ Below'}
                  </Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Performance & Durability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-5 h-5 text-yellow-600" />
            Performance & Durability (Art. 9-10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-600 uppercase font-bold mb-1">State of Health (SOH)</div>
              <div className="text-2xl font-bold">{batteryData.state_of_health_pct || 100}%</div>
              <Progress value={batteryData.state_of_health_pct || 100} className="mt-2" />
            </div>
            <div>
              <div className="text-xs text-slate-600 uppercase font-bold mb-1">Expected Lifespan</div>
              <div className="text-2xl font-bold">{batteryData.expected_lifespan_years || 8} years</div>
              <div className="text-xs text-slate-500 mt-1">or {batteryData.cycle_life || 3000} cycles</div>
            </div>
            <div>
              <div className="text-xs text-slate-600 uppercase font-bold mb-1">Minimum Capacity (500 cycles)</div>
              <div className="font-bold">{batteryData.capacity_fade_500_cycles || 80}% retained</div>
            </div>
            <div>
              <div className="text-xs text-slate-600 uppercase font-bold mb-1">Power Capability</div>
              <div className="font-bold">{batteryData.power_capability_w || 'N/A'} W</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hazardous Substances (Annex VI) */}
      <Card className="border-rose-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            Hazardous Substances Declaration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {batteryData.contains_hazardous_substances ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <div className="font-bold text-rose-900 mb-2">⚠️ Contains Hazardous Substances</div>
                <div className="text-sm text-rose-800">
                  {batteryData.hazardous_substances_list?.join(', ') || 'See safety datasheet'}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="font-bold text-emerald-900">✓ No hazardous substances above threshold</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Supply Chain Due Diligence (Annex X) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-5 h-5 text-indigo-600" />
            Supply Chain Due Diligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Cobalt sourcing verified:</span>
              <Badge className={batteryData.cobalt_sourcing_verified ? 'bg-emerald-500' : 'bg-amber-500'}>
                {batteryData.cobalt_sourcing_verified ? '✓ Verified' : 'Pending'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Conflict minerals check:</span>
              <Badge className={batteryData.conflict_minerals_compliant ? 'bg-emerald-500' : 'bg-rose-500'}>
                {batteryData.conflict_minerals_compliant ? '✓ Compliant' : '⚠ Non-compliant'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">OECD due diligence:</span>
              <Badge className={batteryData.oecd_due_diligence_completed ? 'bg-emerald-500' : 'bg-slate-400'}>
                {batteryData.oecd_due_diligence_completed ? '✓ Completed' : 'Not completed'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dismantling & Recycling Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Recycle className="w-5 h-5 text-emerald-600" />
            End-of-Life & Recycling (Art. 74-77)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-bold text-slate-700 mb-1">Dismantling Information Available:</div>
              <Badge className={batteryData.dismantling_info_available ? 'bg-emerald-500' : 'bg-rose-500'}>
                {batteryData.dismantling_info_available ? '✓ Yes (mandatory per Art. 74)' : '✗ Missing'}
              </Badge>
            </div>
            <div>
              <div className="font-bold text-slate-700 mb-1">Collection & Recycling:</div>
              <p className="text-slate-600">
                {batteryData.collection_instructions || 'Return to authorized collection point or retailer'}
              </p>
            </div>
            {batteryData.recycling_efficiency && (
              <div>
                <div className="font-bold text-slate-700 mb-1">Recycling Efficiency Target:</div>
                <div className="flex items-center gap-2">
                  <Progress value={batteryData.recycling_efficiency} className="flex-1" />
                  <span className="font-bold">{batteryData.recycling_efficiency}%</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* QR Code for Public Access */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <CardContent className="p-6 text-center">
          <div className="text-sm mb-3">Scan to access public Battery Passport</div>
          {dpp.qr_code_url ? (
            <img src={dpp.qr_code_url} alt="Battery Passport QR" className="w-40 h-40 mx-auto bg-white p-3 rounded-lg" />
          ) : (
            <div className="w-40 h-40 mx-auto bg-white/10 rounded-lg flex items-center justify-center">
              <div className="text-xs text-white/50">QR Not Generated</div>
            </div>
          )}
          <div className="text-xs text-white/70 mt-3">
            Public URL: {dpp.public_url || 'Not published yet'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}