import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Calendar } from "lucide-react";

export default function VCCCostComparison({ requiredCertificates, priceHistory }) {
  const [quantity, setQuantity] = useState(requiredCertificates || 1000);
  const [monthsAhead, setMonthsAhead] = useState(12);

  const currentPrice = priceHistory[0]?.cbam_certificate_price || 85;
  const vccSpotPrice = currentPrice * 0.95; // ~5% discount
  
  // Project future prices based on historical volatility
  const projectedFuturePrice = currentPrice * (1 + (monthsAhead * 0.015)); // ~1.5% monthly increase estimate

  // Calculate costs for different strategies
  const spotPurchaseNow = quantity * currentPrice;
  const vccSpotNow = quantity * vccSpotPrice;
  const spotPurchaseFuture = quantity * projectedFuturePrice;
  const vccMargined = vccSpotNow * 0.20; // 20% collateral upfront
  
  const comparisonData = [
    {
      strategy: 'Buy CBAM Spot Now',
      cost: spotPurchaseNow,
      timing: 'Immediate',
      risk: 'Low',
      color: '#94a3b8'
    },
    {
      strategy: 'VCC Spot',
      cost: vccSpotNow,
      timing: 'Lock now, convert later',
      risk: 'Zero price risk',
      color: '#86b027'
    },
    {
      strategy: 'VCC Margined Forward',
      cost: vccMargined,
      timing: 'Low upfront, pay on convert',
      risk: 'Zero price risk',
      color: '#02a1e8'
    },
    {
      strategy: `Buy CBAM Spot in ${monthsAhead}mo`,
      cost: spotPurchaseFuture,
      timing: 'Future purchase',
      risk: 'High price risk',
      color: '#f59e0b'
    }
  ];

  const potentialSavings = spotPurchaseFuture - vccSpotNow;
  const savingsPercent = ((potentialSavings / spotPurchaseFuture) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Input Controls */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#86b027]" />
            Cost Comparison Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label>Certificate Quantity Needed</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Time Horizon (months)</Label>
              <Input
                type="number"
                value={monthsAhead}
                onChange={(e) => setMonthsAhead(Number(e.target.value))}
                className="mt-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Potential Savings Alert */}
      {potentialSavings > 0 && (
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-emerald-900 mb-1">Potential Savings with VCC</h3>
                <p className="text-sm text-emerald-700">
                  By locking in VCC prices today, you could save <strong>€{potentialSavings.toFixed(2)}</strong> ({savingsPercent}%) 
                  compared to buying CBAM certificates in {monthsAhead} months at projected prices.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Chart */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Strategy Cost Comparison</CardTitle>
          <p className="text-sm text-slate-500">Total cost analysis for {quantity} certificates</p>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis type="category" dataKey="strategy" stroke="#94a3b8" fontSize={11} width={150} />
                <Tooltip />
                <Bar dataKey="cost" fill="#86b027" radius={[0, 8, 8, 0]}>
                  {comparisonData.map((entry, index) => (
                    <cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Comparison Table */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Detailed Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {comparisonData.map((strategy, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-[#86b027] transition-colors">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 mb-1">{strategy.strategy}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {strategy.timing}
                    </span>
                    <span>Risk: {strategy.risk}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">€{strategy.cost.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">
                    €{(strategy.cost / quantity).toFixed(2)} per unit
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}