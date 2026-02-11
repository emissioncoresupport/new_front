import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { format } from "date-fns";

export default function VCCPriceTracker({ priceHistory }) {
  const currentPrice = priceHistory[0]?.cbam_certificate_price || 85;
  const previousPrice = priceHistory[1]?.cbam_certificate_price || 80;
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = ((priceChange / previousPrice) * 100).toFixed(2);

  // Format data for chart (reverse to show oldest to newest)
  const chartData = [...priceHistory].reverse().slice(-60).map(entry => ({
    date: format(new Date(entry.date), 'MMM dd'),
    cbam: entry.cbam_certificate_price,
    vcc: entry.vcc_spot_price || entry.cbam_certificate_price * 0.95,
    eua: entry.eua_price || entry.cbam_certificate_price * 1.05
  }));

  // Calculate volatility
  const volatility = priceHistory.length > 0
    ? priceHistory[0].volatility_index || calculateVolatility(priceHistory.slice(0, 30))
    : 0;

  return (
    <div className="space-y-6">
      {/* Current Prices */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-[#86b027] bg-gradient-to-br from-[#86b027]/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-700">CBAM Certificate</p>
              {priceChange > 0 ? (
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-rose-500" />
              )}
            </div>
            <p className="text-4xl font-bold text-slate-900 mb-1">€{currentPrice.toFixed(2)}</p>
            <p className={`text-sm font-medium ${priceChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {priceChange >= 0 ? '+' : ''}€{priceChange.toFixed(2)} ({priceChangePercent}%)
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="pt-6">
            <p className="text-sm font-semibold text-slate-700 mb-3">VCC Spot Price</p>
            <p className="text-4xl font-bold text-slate-900 mb-1">€{(currentPrice * 0.95).toFixed(2)}</p>
            <p className="text-sm text-slate-500">~5% discount to CBAM</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-700">Price Volatility</p>
              <Activity className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-4xl font-bold text-slate-900 mb-1">{volatility.toFixed(1)}%</p>
            <p className={`text-sm font-medium ${
              volatility > 15 ? 'text-rose-600' : volatility > 8 ? 'text-amber-600' : 'text-emerald-600'
            }`}>
              {volatility > 15 ? 'High volatility' : volatility > 8 ? 'Moderate' : 'Low volatility'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Price History Chart */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>60-Day Price History & Comparison</CardTitle>
          <p className="text-sm text-slate-500">CBAM Certificates vs VCC Spot vs EU Allowances</p>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cbam" 
                  stroke="#86b027" 
                  strokeWidth={2}
                  name="CBAM Certificate" 
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="vcc" 
                  stroke="#02a1e8" 
                  strokeWidth={2}
                  name="VCC Spot" 
                  dot={false}
                  strokeDasharray="5 5"
                />
                <Line 
                  type="monotone" 
                  dataKey="eua" 
                  stroke="#94a3b8" 
                  strokeWidth={1}
                  name="EU Allowance (EUA)" 
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Why VCC Info */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="p-6">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#86b027]" />
            Why Use VCC Instead of Buying Certificates Directly?
          </h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-semibold text-slate-700 mb-1">🔒 Lock in Costs</p>
              <p className="text-slate-600">Fix prices today against future volatility - protect profit margins</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700 mb-1">💧 Liquidity</p>
              <p className="text-slate-600">VCCs never expire and can be resold anytime at market value</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700 mb-1">📈 Better than EUAs</p>
              <p className="text-slate-600">Direct 1:1 conversion to CBAM certs - no proxy hedge risk</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function calculateVolatility(priceData) {
  if (priceData.length < 2) return 0;
  
  const returns = [];
  for (let i = 1; i < priceData.length; i++) {
    const currentPrice = priceData[i - 1].cbam_certificate_price;
    const previousPrice = priceData[i].cbam_certificate_price;
    if (previousPrice && currentPrice) {
      returns.push((currentPrice - previousPrice) / previousPrice);
    }
  }
  
  if (returns.length === 0) return 0;
  
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  return stdDev * 100; // Convert to percentage
}