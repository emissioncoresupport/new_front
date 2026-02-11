import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageSquare, Send, Search, Filter, BarChart2, 
  Users, AlertCircle, CheckCircle2, Sparkles, MoreVertical 
} from "lucide-react";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";

// --- Sub-components defined in same file for cohesion (or split if preferred) ---

function ChatInbox({ suppliers }) {
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const queryClient = useQueryClient();
  const scrollRef = useRef(null);

  // Fetch all communications
  const { data: communications = [] } = useQuery({
    queryKey: ['supplier-communications'],
    queryFn: () => base44.entities.SupplierCommunication.list('-created_date', 100)
  });

  // Group by supplier
  const threads = React.useMemo(() => {
    const grouped = {};
    communications.forEach(msg => {
      if (!grouped[msg.supplier_id]) {
        grouped[msg.supplier_id] = {
          supplierId: msg.supplier_id,
          supplier: suppliers.find(s => s.id === msg.supplier_id),
          messages: [],
          lastMessage: msg,
          unreadCount: 0
        };
      }
      grouped[msg.supplier_id].messages.push(msg);
      if (!msg.read && msg.sender_type === 'supplier') {
        grouped[msg.supplier_id].unreadCount++;
      }
    });
    
    // Sort messages within threads
    Object.values(grouped).forEach(thread => {
      thread.messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    });

    // Sort threads by last message
    return Object.values(grouped).sort((a, b) => 
      new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date)
    );
  }, [communications, suppliers]);

  const activeThread = threads.find(t => t.supplierId === selectedSupplierId);

  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      return await base44.entities.SupplierCommunication.create({
        supplier_id: selectedSupplierId,
        sender_type: 'admin',
        message: content,
        type: 'chat',
        read: true,
        sentiment_score: 0
      });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ['supplier-communications'] });
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeThread?.messages]);

  return (
    <div className="flex h-[600px] border rounded-xl overflow-hidden bg-white">
      {/* Sidebar List */}
      <div className="w-1/3 border-r border-slate-200 bg-slate-50 flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input placeholder="Search messages..." className="pl-9 bg-slate-50" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {threads.map(thread => (
            <div
              key={thread.supplierId}
              onClick={() => setSelectedSupplierId(thread.supplierId)}
              className={cn(
                "p-4 border-b border-slate-100 cursor-pointer hover:bg-white transition-colors",
                selectedSupplierId === thread.supplierId ? "bg-white border-l-4 border-l-emerald-500" : ""
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-semibold text-sm text-slate-900 truncate max-w-[140px]">
                  {thread.supplier?.legal_name || 'Unknown Supplier'}
                </h4>
                <span className="text-[10px] text-slate-400">
                  {format(new Date(thread.lastMessage.created_date), 'MMM d')}
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">
                {thread.lastMessage.sender_type === 'admin' && <span className="text-emerald-600">You: </span>}
                {thread.lastMessage.message}
              </p>
              {thread.unreadCount > 0 && (
                <Badge className="mt-2 h-5 px-1.5 bg-emerald-500 hover:bg-emerald-600">
                  {thread.unreadCount} new
                </Badge>
              )}
            </div>
          ))}
          {threads.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">
              No messages yet
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedSupplierId ? (
          <>
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 bg-emerald-100 text-emerald-600 border border-emerald-200">
                  <AvatarFallback>{activeThread?.supplier?.legal_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-sm text-slate-900">
                    {activeThread?.supplier?.legal_name}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Online via Portal
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4 text-slate-400" />
              </Button>
            </div>

            <ScrollArea className="flex-1 p-4 bg-slate-50/50">
              <div className="space-y-4">
                {activeThread?.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex w-max max-w-[80%] flex-col gap-1 rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                      msg.sender_type === 'admin'
                        ? "ml-auto bg-emerald-600 text-white"
                        : msg.sender_type === 'ai'
                        ? "bg-slate-100 text-slate-800 border border-slate-200"
                        : "bg-white text-slate-800 border border-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-0.5 opacity-80">
                      <span className="text-[10px] font-medium uppercase tracking-wider">
                        {msg.sender_type === 'ai' ? 'AI Assistant' : msg.sender_type === 'admin' ? 'Support Team' : 'Supplier'}
                      </span>
                      {msg.sender_type === 'ai' && <Sparkles className="w-3 h-3" />}
                    </div>
                    <p className="leading-relaxed">{msg.message}</p>
                    <span className={cn(
                      "text-[10px] self-end mt-1",
                      msg.sender_type === 'admin' ? "text-emerald-100" : "text-slate-400"
                    )}>
                      {format(new Date(msg.created_date), 'h:mm a')}
                    </span>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-slate-100 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newMessage.trim()) sendMessageMutation.mutate(newMessage);
                }}
                className="flex gap-2"
              >
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your reply..."
                  className="flex-1 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500"
                />
                <Button 
                  type="submit" 
                  disabled={sendMessageMutation.isPending || !newMessage.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}

function BroadcastTool({ suppliers }) {
  const [step, setStep] = useState('select'); // select, compose, confirm
  const [filters, setFilters] = useState({ tier: 'all', risk: 'all' });
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [requestType, setRequestType] = useState("general"); // general, bom_update, document_request
  
  const filteredSuppliers = suppliers.filter(s => {
    if (filters.tier !== 'all' && s.tier !== filters.tier) return false;
    if (filters.risk !== 'all' && s.risk_level !== filters.risk) return false;
    return true;
  });

  const sendBroadcastMutation = useMutation({
    mutationFn: async () => {
      const promises = filteredSuppliers.map(s => 
        base44.entities.SupplierCommunication.create({
          supplier_id: s.id,
          sender_type: 'admin',
          message: `[BROADCAST: ${subject}] ${message}`,
          type: 'broadcast',
          read: false,
          sentiment_score: 0
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      setStep('select');
      setMessage("");
      setSubject("");
      setFilters({ tier: 'all', risk: 'all' });
    }
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Filters Card */}
        <Card className="md:col-span-1 border-slate-200 h-fit">
          <CardHeader className="bg-slate-50/50 pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-600" />
              Target Audience
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Supply Chain Tier</label>
              <select 
                className="w-full p-2 border rounded-md text-sm bg-white"
                value={filters.tier}
                onChange={(e) => setFilters({...filters, tier: e.target.value})}
              >
                <option value="all">All Tiers</option>
                <option value="tier_1">Tier 1 Direct</option>
                <option value="tier_2">Tier 2</option>
                <option value="tier_3">Tier 3+</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Risk Level</label>
              <select 
                className="w-full p-2 border rounded-md text-sm bg-white"
                value={filters.risk}
                onChange={(e) => setFilters({...filters, risk: e.target.value})}
              >
                <option value="all">Any Risk Level</option>
                <option value="high">High Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="low">Low Risk</option>
              </select>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-500">Recipients:</span>
                <span className="font-bold text-emerald-600">{filteredSuppliers.length}</span>
              </div>
              <p className="text-xs text-slate-400">
                Suppliers matching your criteria will receive this alert.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Compose Card */}
        <Card className="md:col-span-2 border-slate-200">
          <CardHeader className="bg-slate-50/50 pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-600" />
              Compose Broadcast
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Request Type</label>
              <select 
                className="w-full p-2 border rounded-md text-sm bg-white"
                value={requestType}
                onChange={(e) => {
                  setRequestType(e.target.value);
                  if (e.target.value === 'bom_update') {
                    setSubject("Updated BOM Request");
                    setMessage("Please provide an updated Bill of Materials for your supplied products. You can upload the latest BOM document (PDF, Excel, CSV) through your supplier portal.");
                  } else if (e.target.value === 'document_request') {
                    setSubject("Compliance Document Request");
                    setMessage("We require additional compliance documentation for regulatory reporting. Please upload the requested documents through your portal within 14 days.");
                  } else {
                    setSubject("");
                    setMessage("");
                  }
                }}
              >
                <option value="general">General Message</option>
                <option value="bom_update">BOM Update Request</option>
                <option value="document_request">Document Request</option>
              </select>
            </div>
            <div>
              <Input 
                placeholder="Subject / Alert Title" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="font-medium"
              />
            </div>
            <div>
              <Textarea 
                placeholder="Write your message here..." 
                className="min-h-[200px]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSubject("");
                  setMessage("");
                }}
              >
                Clear
              </Button>
              <Button 
                onClick={() => sendBroadcastMutation.mutate()}
                disabled={sendBroadcastMutation.isPending || !message || !subject || filteredSuppliers.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {sendBroadcastMutation.isPending ? 'Sending...' : `Send to ${filteredSuppliers.length} Suppliers`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SentimentAnalysis({ communications }) {
  // Calculate basic sentiment metrics
  const sentimentData = React.useMemo(() => {
    // Mock data generation since we don't have real sentiment scores yet
    // In reality this would aggregate `communications.sentiment_score`
    return {
      average: 0.65,
      distribution: { positive: 65, neutral: 25, negative: 10 },
      trend: [0.4, 0.5, 0.45, 0.6, 0.7, 0.65]
    };
  }, [communications]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-200 bg-emerald-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Overall Sentiment</p>
                <h3 className="text-2xl font-bold text-slate-900">Positive</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Active Conversations</p>
                <h3 className="text-2xl font-bold text-slate-900">24</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-full text-amber-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Requires Attention</p>
                <h3 className="text-2xl font-bold text-slate-900">3</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sentiment Distribution</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
             <BarChart2 className="w-8 h-8 mr-2 opacity-50" />
             <span>Sentiment analysis visualization placeholder</span>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CommunicationHub({ suppliers }) {
  return (
    <Tabs defaultValue="inbox" className="space-y-8">
      <div className="flex items-center justify-between">
        <TabsList className="bg-white border border-slate-100 p-1.5 h-auto shadow-sm rounded-full">
          <TabsTrigger 
            value="inbox" 
            className="gap-2 px-6 py-2.5 rounded-full text-sm font-bold text-[#545454] data-[state=active]:bg-[#02a1e8] data-[state=active]:text-white transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            Inbox
          </TabsTrigger>
          <TabsTrigger 
            value="broadcast" 
            className="gap-2 px-6 py-2.5 rounded-full text-sm font-bold text-[#545454] data-[state=active]:bg-[#02a1e8] data-[state=active]:text-white transition-all"
          >
            <Send className="w-4 h-4" />
            Broadcast
          </TabsTrigger>
          <TabsTrigger 
            value="sentiment" 
            className="gap-2 px-6 py-2.5 rounded-full text-sm font-bold text-[#545454] data-[state=active]:bg-[#02a1e8] data-[state=active]:text-white transition-all"
          >
            <BarChart2 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="inbox">
        <ChatInbox suppliers={suppliers} />
      </TabsContent>

      <TabsContent value="broadcast">
        <BroadcastTool suppliers={suppliers} />
      </TabsContent>

      <TabsContent value="sentiment">
        <SentimentAnalysis />
      </TabsContent>
    </Tabs>
  );
}