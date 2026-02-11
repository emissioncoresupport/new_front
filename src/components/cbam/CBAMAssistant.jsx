import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, Send, Sparkles, X, Maximize2, Minimize2, 
  AlertCircle, CheckCircle2, Info, Lightbulb, Code
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  chatWithAssistant, 
  getHSCodeSuggestion, 
  getCalculationMethodSuggestion,
  interpretValidationError,
  analyzeComplianceRisks
} from './CBAMAssistantService';
import { toast } from "sonner";

export default function CBAMAssistant({ entries = [], reports = [], validationErrors = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: '👋 Hi! I\'m your CBAM compliance assistant. I can help with:\n\n• HS code suggestions\n• Calculation methods\n• Validation errors\n• Compliance risk analysis\n\nHow can I help you today?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Draggable state
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Dragging handlers
  const handleDragStart = (e) => {
    if (e.target.closest('button, input')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleQuickAction = async (action) => {
    setIsLoading(true);
    try {
      let response;
      
      switch(action) {
        case 'analyze_risks':
          const risks = await analyzeComplianceRisks(entries, reports);
          const riskMessage = `**Compliance Risk Analysis**\n\n` +
            `🔴 Critical Risks: ${risks.critical_risks?.length || 0}\n` +
            risks.critical_risks?.map(r => `• ${r.description} - ${r.action}`).join('\n') +
            `\n\n📅 Upcoming Deadlines:\n` +
            risks.upcoming_deadlines?.map(d => `• ${d.period}: ${d.date} (${d.days_remaining} days)`).join('\n') +
            `\n\n💡 Recommendations:\n` +
            risks.recommendations?.map((r, i) => `${i + 1}. ${r}`).join('\n');
          
          setMessages(prev => [...prev, { role: 'assistant', content: riskMessage }]);
          break;

        case 'validation_help':
          if (validationErrors.length === 0) {
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: '✅ Great! You have no validation errors. All entries are compliant.' 
            }]);
          } else {
            const firstError = validationErrors[0];
            const interpretation = await interpretValidationError(firstError);
            const errorMessage = `**Validation Error Help**\n\n` +
              `❌ ${firstError.message}\n\n` +
              `📖 ${interpretation.simple_explanation}\n\n` +
              `⚡ Priority: ${interpretation.importance}\n\n` +
              `**How to Fix:**\n` +
              interpretation.fix_steps?.map((step, i) => `${i + 1}. ${step}`).join('\n') +
              `\n\n**Required Data:**\n` +
              interpretation.required_data?.map(d => `• ${d}`).join('\n');
            
            setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
          }
          break;

        case 'hs_code_help':
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: '📦 To suggest an HS code, please describe your product. For example:\n"Hot-rolled steel coils from China"\n"Primary aluminium ingots from Russia"\n"Grey cement from Turkey"' 
          }]);
          break;
      }
    } catch (error) {
      toast.error('Assistant error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Check if asking for HS code
      if (userMessage.toLowerCase().includes('hs code') || userMessage.toLowerCase().includes('cn code')) {
        const hsResult = await getHSCodeSuggestion(userMessage);
        const hsMessage = `**HS Code Suggestion**\n\n` +
          `📋 CN Code: **${hsResult.cn_code}**\n` +
          `${hsResult.cbam_covered ? '✅ CBAM Covered' : '⚠️ Not CBAM Covered'}\n` +
          `Goods Type: ${hsResult.goods_type || 'Unknown'}\n\n` +
          `**Explanation:**\n${hsResult.explanation}\n\n` +
          `Confidence: ${hsResult.confidence?.toUpperCase()}\n` +
          (hsResult.warning ? `\n⚠️ ${hsResult.warning}` : '');
        
        setMessages(prev => [...prev, { role: 'assistant', content: hsMessage }]);
      } else {
        // General chat
        const context = {
          total_entries: entries.length,
          pending_validations: entries.filter(e => e.validation_status === 'pending').length,
          total_reports: reports.length,
          draft_reports: reports.filter(r => r.status === 'draft').length
        };
        
        const response = await chatWithAssistant(userMessage, context);
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      }
    } catch (error) {
      toast.error('Failed to get response');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '❌ Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="h-16 w-16 rounded-full bg-gradient-to-br from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 shadow-2xl border border-white/10 group"
        >
          <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8 text-white group-hover:scale-110 transition-transform">
            <path d="M16 4C9.4 4 4 8.5 4 14c0 3.2 1.8 6.1 4.6 8L8 28l6.5-3.5c.5.1 1 .1 1.5.1 6.6 0 12-4.5 12-10S22.6 4 16 4z" 
                  stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
            <circle cx="12" cy="13" r="1.5" fill="currentColor"/>
            <circle cx="16" cy="13" r="1.5" fill="currentColor"/>
            <circle cx="20" cy="13" r="1.5" fill="currentColor"/>
            <path d="M10 18c1.5 1.5 4 2 6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed z-50 ${isExpanded ? 'inset-4' : 'w-[420px] h-[640px]'}`}
      style={isExpanded ? {} : {
        transform: `translate(calc(-100% - 24px + ${position.x}px), calc(-100% - 24px + ${position.y}px))`,
        right: '24px',
        bottom: '24px'
      }}
    >
      <Card className="h-full flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.12)] border-2 border-slate-900/10 bg-gradient-to-br from-white/95 via-slate-50/90 to-white/95 backdrop-blur-2xl overflow-hidden">
        <CardHeader 
          onMouseDown={isExpanded ? undefined : handleDragStart}
          className={`bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/10 p-4 ${!isExpanded ? 'cursor-move' : ''}`}
        >
          {!isExpanded && (
            <div className="flex justify-center mb-2">
              <div className="w-12 h-1 bg-white/30 rounded-full" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5 text-white">
                  <path d="M16 4C9.4 4 4 8.5 4 14c0 3.2 1.8 6.1 4.6 8L8 28l6.5-3.5c.5.1 1 .1 1.5.1 6.6 0 12-4.5 12-10S22.6 4 16 4z" 
                        stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
                  <circle cx="12" cy="13" r="1.5" fill="currentColor"/>
                  <circle cx="16" cy="13" r="1.5" fill="currentColor"/>
                  <circle cx="20" cy="13" r="1.5" fill="currentColor"/>
                  <path d="M10 18c1.5 1.5 4 2 6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <CardTitle className="text-base font-light text-white">CBAM AI Assistant</CardTitle>
                <p className="text-xs text-slate-300">Powered by EU Regulation Knowledge</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white/70 hover:bg-white/10 hover:text-white transition-all"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/70 hover:bg-white/10 hover:text-white transition-all"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden bg-gradient-to-b from-slate-50/40 to-white/60 backdrop-blur-xl">
          {/* Quick Actions */}
          <div className="p-3 border-b border-slate-900/5 bg-white/30 backdrop-blur-md flex-shrink-0">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('analyze_risks')}
                disabled={isLoading}
                className="text-xs border-slate-900/10 bg-white/60 hover:bg-white/80 backdrop-blur-sm transition-all"
              >
                <AlertCircle className="w-3 h-3 mr-1" />
                Analyze Risks
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('validation_help')}
                disabled={isLoading}
                className="text-xs border-slate-900/10 bg-white/60 hover:bg-white/80 backdrop-blur-sm transition-all"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Validation Help
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('hs_code_help')}
                disabled={isLoading}
                className="text-xs border-slate-900/10 bg-white/60 hover:bg-white/80 backdrop-blur-sm transition-all"
              >
                <Code className="w-3 h-3 mr-1" />
                HS Code Help
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-gradient-to-b from-transparent via-white/10 to-white/20 backdrop-blur-md">
            <AnimatePresence>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 break-words ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white shadow-lg'
                        : 'bg-white/80 backdrop-blur-xl border border-slate-900/10 text-slate-900 shadow-md'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/80 backdrop-blur-xl border border-slate-900/10 rounded-2xl px-4 py-3 shadow-md">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-slate-900/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-900/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-900/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-900/5 bg-gradient-to-r from-white/50 via-white/40 to-white/50 backdrop-blur-xl flex-shrink-0">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about CBAM compliance..."
                disabled={isLoading}
                className="flex-1 bg-white/80 backdrop-blur-md border-2 border-slate-900/10 hover:border-slate-900/20 focus:border-slate-900/30 transition-all rounded-xl shadow-sm"
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-slate-900 hover:bg-slate-800 text-white flex-shrink-0 shadow-lg disabled:opacity-50 rounded-xl"
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-slate-600 mt-2 font-light">
              💡 Try: "Suggest HS code for cement from Turkey" or "Explain validation errors"
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}