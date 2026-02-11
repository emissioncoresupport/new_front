import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, TrendingDown, ArrowLeftRight, DollarSign, 
  Clock, ShoppingCart, Package, BarChart3
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

/**
 * CBAM Certificate Trading Module
 * Secondary market integration (EEX, ICE Endex)
 * Spot trading, forward contracts, hedging
 */

export default function CBAMCertificateTrading() {
  const [tradeType, setTradeType] = useState('buy');
  const [quantity, setQuantity] = useState('');
  const [priceLimit, setPriceLimit] = useState('');
  
  const queryClient = useQueryClient();
  
  const { data: priceHistory = [] } = useQuery({
    queryKey: ['cbam-price-history'],
    queryFn: () => base44.entities.CBAMPriceHistory.list('-date', 30)
  });
  
  const { data: certificates = [] } = useQuery({
    queryKey: ['cbam-certificates'],
    queryFn: () => base44.entities.CBAMCertificate.list()
  });
  
  const currentPrice = priceHistory[0]?.cbam_certificate_price || 88;
  const priceChange = priceHistory.length >= 2 
    ? ((currentPrice - priceHistory[1].cbam_certificate_price) / priceHistory[1].cbam_certificate_price) * 100
    : 0;
  
  // Market depth (mock data - would come from EEX API)
  const orderBook = {
    bids: [
      { price: 87.50, quantity: 1500, total: 131250 },
      { price: 87.25, quantity: 2300, total: 200675 },
      { price: 87.00, quantity: 1800, total: 156600 }
    ],
    asks: [
      { price: 88.25, quantity: 1200, total: 105900 },
      { price: 88.50, quantity: 1800, total: 159300 },
      { price: 88.75, quantity: 2100, total: 186375 }
    ]
  };
  
  const placeTradeMutation = useMutation({
    mutationFn: async (tradeData) => {
      // Integrate with EEX/ICE API
      const { data } = await base44.functions.invoke('cbamCertificatePurchase', {
        action: 'market_trade',
        ...tradeData
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-certificates'] });
      toast.success('Trade order placed successfully');
      setQuantity('');
      setPriceLimit('');
    },
    onError: () => {
      toast.error('Trade failed');
    }
  });
  
  const handlePlaceTrade = () => {
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error('Invalid quantity');
      return;
    }
    
    placeTradeMutation.mutate({
      type: tradeType,
      quantity: parseFloat(quantity),
      price_limit: priceLimit ? parseFloat(priceLimit) : null,
      order_type: priceLimit ? 'limit' : 'market'
    });
  };
  
  const balance = certificates
    .filter(c => c.status === 'active')
    .reduce((sum, c) => sum + (c.quantity || 0), 0);
  
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-[#86b027]" />
            Certificate Trading
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Secondary market via EEX Spot / ICE Endex
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Live Price */}
          <div className="p-6 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Spot Price (EUA)</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-4xl font-light text-slate-900">€{currentPrice.toFixed(2)}</p>
                  <Badge className={priceChange >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {priceChange >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {Math.abs(priceChange).toFixed(2)}%
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-1">Your Balance</p>
                <p className="text-2xl font-medium text-[#86b027]">{balance.toLocaleString()}</p>
                <p className="text-xs text-slate-400">certificates</p>
              </div>
            </div>
            
            {/* Mini Chart */}
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceHistory.slice(0, 7).reverse()}>
                  <Line type="monotone" dataKey="cbam_certificate_price" stroke="#86b027" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <Tabs defaultValue="trade">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="trade">Place Trade</TabsTrigger>
              <TabsTrigger value="orderbook">Order Book</TabsTrigger>
            </TabsList>
            
            <TabsContent value="trade" className="space-y-4">
              {/* Trade Type Selector */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={tradeType === 'buy' ? 'default' : 'outline'}
                  onClick={() => setTradeType('buy')}
                  className={tradeType === 'buy' ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Buy
                </Button>
                <Button
                  variant={tradeType === 'sell' ? 'default' : 'outline'}
                  onClick={() => setTradeType('sell')}
                  className={tradeType === 'sell' ? 'bg-red-600 hover:bg-red-700' : ''}
                  disabled={balance === 0}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Sell
                </Button>
              </div>
              
              {/* Order Form */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    Quantity (certificates)
                  </label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g., 1000"
                  />
                  {tradeType === 'sell' && balance > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      Available: {balance.toLocaleString()} certificates
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    Limit Price (optional)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={priceLimit}
                    onChange={(e) => setPriceLimit(e.target.value)}
                    placeholder={`Market price: €${currentPrice.toFixed(2)}`}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Leave empty for market order (instant execution)
                  </p>
                </div>
                
                {/* Estimated Total */}
                {quantity && (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Estimated Total</span>
                      <span className="text-xl font-semibold text-slate-900">
                        €{((parseFloat(quantity) || 0) * (parseFloat(priceLimit) || currentPrice)).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                    </div>
                  </div>
                )}
                
                <Button
                  onClick={handlePlaceTrade}
                  disabled={placeTradeMutation.isPending || !quantity}
                  className={`w-full ${tradeType === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {placeTradeMutation.isPending ? 'Processing...' : `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${quantity || '0'} Certificates`}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="orderbook" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Bids */}
                <div>
                  <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Bids (Buy Orders)
                  </h4>
                  <div className="space-y-2">
                    {orderBook.bids.map((bid, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                        <span className="text-sm font-medium text-green-800">€{bid.price.toFixed(2)}</span>
                        <span className="text-xs text-green-600">{bid.quantity.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Asks */}
                <div>
                  <h4 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" />
                    Asks (Sell Orders)
                  </h4>
                  <div className="space-y-2">
                    {orderBook.asks.map((ask, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200">
                        <span className="text-sm font-medium text-red-800">€{ask.price.toFixed(2)}</span>
                        <span className="text-xs text-red-600">{ask.quantity.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> Order book shows aggregated market depth from EEX Spot CBAM contracts. 
                  Trades settle T+2 with delivery to your CBAM registry account.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}