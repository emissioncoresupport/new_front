import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, X, Minus, Sparkles, Bot, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';

export default function SupplierChatBot({ supplier }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();
  const scrollRef = useRef(null);

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ['supplier-chat', supplier.id],
    queryFn: async () => {
      const msgs = await base44.entities.SupplierCommunication.filter({
        supplier_id: supplier.id,
        type: 'chat' // Filter out broadcasts if we want only chat history here? Let's keep all.
      }, '-created_date', 50);
      // Sort by date ascending
      return msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    // Poll every 5 seconds for new messages
    refetchInterval: 5000
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      // 1. Save User Message
      await base44.entities.SupplierCommunication.create({
        supplier_id: supplier.id,
        sender_type: 'supplier',
        message: content,
        type: 'chat',
        read: false,
        sentiment_score: 0 // Can implement sentiment analysis here later
      });
      
      // 2. Trigger AI Response
      // We'll use InvokeLLM to get a reply
      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `
          You are Caro, a helpful AI assistant for the CBAM (Carbon Border Adjustment Mechanism) Compliance Portal.
          You are talking to a supplier named "${supplier.legal_name}".
          
          Your Persona:
          - Name: Caro
          - Role: CBAM Compliance Specialist
          - Tone: Professional, knowledgeable, friendly, and helpful.
          
          Current Context:
          - Supplier Tier: ${supplier.tier}
          - CBAM Relevance: ${supplier.cbam_relevant ? 'Yes' : 'No'}
          - Risk Level: ${supplier.risk_level}
          
          The user just said: "${content}"
          
          Please provide a helpful response specifically regarding CBAM compliance, emissions reporting, and EU regulations.
          If they ask about technical issues, tell them to email cbam-support@base44.com.
          If they ask about emissions calculations, guide them to use the "Calculations" tab or upload their ISO 14064 reports.
        `,
        response_json_schema: {
          type: "object",
          properties: {
            reply: { type: "string" },
            sentiment: { type: "number", description: "Sentiment of user's message (-1 to 1)" }
          },
          required: ["reply"]
        }
      });

      // 3. Save AI Response
      await base44.entities.SupplierCommunication.create({
        supplier_id: supplier.id,
        sender_type: 'ai',
        message: aiResponse.reply,
        type: 'chat',
        read: true,
        sentiment_score: 0
      });
      
      return aiResponse;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ['supplier-chat'] });
    }
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessageMutation.mutate(message);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-4">
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-[350px] h-[500px] shadow-2xl rounded-2xl overflow-hidden flex flex-col bg-white border border-slate-200"
          >
            {/* Header */}
            <div className="bg-[#86b027] p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border-2 border-white/50">
                  <img src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=facearea&facepad=1.5&w=256&h=256&q=80" alt="Caro" />
                  <AvatarFallback>CA</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-sm">Caro (CBAM Support)</h3>
                  <p className="text-[10px] text-white/90 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    Online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 bg-slate-50 relative overflow-hidden flex flex-col">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 pb-4">
                  {/* Welcome Message */}
                  <div className="flex gap-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <img src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=facearea&facepad=1.5&w=256&h=256&q=80" alt="Caro" />
                      <AvatarFallback>CA</AvatarFallback>
                    </Avatar>
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-3 shadow-sm max-w-[85%]">
                      <p className="text-sm text-slate-700">
                        Hi there! I'm Caro, your CBAM compliance guide. Do you have questions about your emissions reporting or the new EU regulations?
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 block">Just now</span>
                    </div>
                  </div>

                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={cn(
                        "flex gap-3",
                        msg.sender_type === 'supplier' ? "flex-row-reverse" : ""
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        msg.sender_type === 'supplier' ? "bg-slate-200" : "bg-transparent"
                      )}>
                        {msg.sender_type === 'supplier' ? <User className="w-4 h-4 text-slate-600" /> :
                         msg.sender_type === 'ai' ? (
                            <Avatar className="w-8 h-8">
                              <img src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=facearea&facepad=1.5&w=256&h=256&q=80" alt="Caro" />
                            </Avatar>
                         ) :
                         <Sparkles className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div className={cn(
                        "p-3 shadow-sm max-w-[85%] text-sm",
                        msg.sender_type === 'supplier' 
                          ? "bg-[#86b027] text-white rounded-2xl rounded-tr-none" 
                          : "bg-white border border-slate-100 rounded-2xl rounded-tl-none text-slate-700"
                      )}>
                        <p>{msg.message}</p>
                        <span className={cn(
                          "text-[10px] mt-1 block",
                          msg.sender_type === 'supplier' ? "text-white/90" : "text-slate-400"
                        )}>
                          {format(new Date(msg.created_date), 'h:mm a')}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {sendMessageMutation.isPending && (
                    <div className="flex gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                          <img src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=facearea&facepad=1.5&w=256&h=256&q=80" alt="Caro" />
                      </Avatar>
                      <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-3 shadow-sm">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-[#86b027] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-1.5 h-1.5 bg-[#86b027] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-1.5 h-1.5 bg-[#86b027] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-slate-200">
              <form onSubmit={handleSend} className="flex gap-2">
                <Input 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-50 border-slate-200 focus-visible:ring-[#86b027]"
                />
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  className="bg-[#86b027] hover:bg-[#769c22] text-white shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
        }}
        className={cn(
          "h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300",
          isOpen && !isMinimized 
            ? "bg-slate-200 text-slate-600 rotate-90 scale-0 opacity-0 pointer-events-none absolute" 
            : "bg-[#86b027] text-white hover:bg-[#769c22]"
        )}
      >
        <MessageSquare className="w-6 h-6" />
        {/* Unread Badge (Mock) */}
        <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border-2 border-white"></span>
        </span>
      </motion.button>
    </div>
  );
}