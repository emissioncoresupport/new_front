import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Send, X, Minimize2, Maximize2, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

export default function CSRDAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickActions = [
    { label: "What is CSRD?", query: "Explain the EU Corporate Sustainability Reporting Directive and who needs to comply" },
    { label: "Double Materiality", query: "How do I conduct a double materiality assessment per EFRAG IG 1?" },
    { label: "ESRS Standards", query: "Explain the ESRS standards structure - Environmental, Social, and Governance" },
    { label: "Data Collection", query: "What data do I need to collect for ESRS E1 (Climate Change)?" },
    { label: "Reporting Timeline", query: "What is the CSRD reporting timeline and deadlines?" },
    { label: "Stakeholder Engagement", query: "How should I engage stakeholders for CSRD compliance?" }
  ];

  const handleSend = async (query = input) => {
    if (!query.trim()) return;

    const userMessage = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Fetch relevant CSRD data for context
      const [materialityTopics, dataPoints, tasks, narratives] = await Promise.all([
        base44.entities.CSRDMaterialityTopic.list(),
        base44.entities.CSRDDataPoint.list(),
        base44.entities.CSRDTask.list(),
        base44.entities.CSRDNarrative.list()
      ]);

      const contextSummary = `
CURRENT CSRD COMPLIANCE STATUS:
- Materiality Topics: ${materialityTopics.length} assessed (${materialityTopics.filter(t => t.is_material).length} material)
- Data Points Collected: ${dataPoints.length}
- Active Tasks: ${tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length}
- Narratives Drafted: ${narratives.length}

MATERIAL TOPICS:
${materialityTopics.filter(t => t.is_material).map(t => `- ${t.esrs_standard}: ${t.topic_name} (Impact: ${t.impact_materiality_score}, Financial: ${t.financial_materiality_score})`).join('\n')}

DATA COLLECTION PROGRESS:
${['ESRS E1', 'ESRS E2', 'ESRS E3', 'ESRS E4', 'ESRS E5', 'ESRS S1', 'ESRS S2', 'ESRS S3', 'ESRS S4', 'ESRS G1'].map(std => {
  const count = dataPoints.filter(d => d.esrs_standard === std).length;
  return `- ${std}: ${count} data points`;
}).join('\n')}
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are Caro, an expert CSRD (Corporate Sustainability Reporting Directive) consultant and advisor. You help companies navigate EU sustainability reporting requirements with expertise in:

- CSRD regulation (Directive 2022/2464)
- All 12 ESRS standards (E1-E5 Environmental, S1-S4 Social, G1 Governance)
- EFRAG Implementation Guidance (IG 1, IG 3)
- Double materiality assessment methodology
- XBRL digital tagging requirements
- Value chain data collection
- Limited assurance preparation
- Stakeholder engagement processes

Your personality: Professional, supportive, and precise. You break down complex regulations into actionable steps.

${contextSummary}

IMPORTANT: When providing guidance, reference the user's actual data from above. Be specific about what they've completed and what's missing.

When suggesting actions, use this format:
- For materiality: "Navigate to **Double Materiality** tab"
- For data collection: "Navigate to **ESRS Data Collection** tab"
- For tasks: "Navigate to **Task Management** tab"
- For reporting: "Navigate to **Reporting** tab"

If user is missing critical data or hasn't completed materiality assessment, proactively guide them.

User question: ${query}

Provide clear, actionable guidance with specific references to their progress and relevant EFRAG/CSRD articles.`,
        add_context_from_internet: false
      });

      const assistantMessage = { role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast.error('Failed to get response from Caro');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (query) => {
    handleSend(query);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-purple-600 to-purple-700 hover:scale-110 transition-transform z-50"
      >
        <MessageSquare className="w-6 h-6 text-white" />
      </Button>
    );
  }

  return (
    <Card className={`fixed ${isMinimized ? 'bottom-6 right-6 w-80' : 'bottom-6 right-6 w-[480px] h-[600px]'} shadow-2xl z-50 flex flex-col`}>
      <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 flex-row items-center justify-between space-y-0 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <CardTitle className="text-white text-base">Caro - CSRD Assistant</CardTitle>
        </div>
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <p className="text-sm text-slate-600 mb-3">
                    👋 Hi! I'm Caro, your CSRD compliance consultant. I can help you with:
                  </p>
                  <ul className="text-xs text-slate-500 space-y-1 ml-4 list-disc">
                    <li>Understanding CSRD requirements</li>
                    <li>Double materiality assessments</li>
                    <li>ESRS data collection guidance</li>
                    <li>Stakeholder engagement strategies</li>
                    <li>Report preparation and assurance</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-500 font-semibold">Quick questions:</p>
                  <div className="flex flex-wrap gap-2">
                    {quickActions.map((action, idx) => (
                      <Button
                        key={idx}
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuickAction(action.query)}
                        className="text-xs"
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg p-3 ${
                    msg.role === 'user' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white border border-slate-200'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown 
                        className="text-sm prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="ml-4 mb-2 list-disc">{children}</ul>,
                          ol: ({ children }) => <ol className="ml-4 mb-2 list-decimal">{children}</ol>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold text-purple-600">{children}</strong>,
                          h1: ({ children }) => <h1 className="text-base font-bold mb-2">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-sm font-bold mb-2">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  <span className="text-sm text-slate-600">Caro is thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          <div className="p-4 border-t bg-white rounded-b-lg">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Caro about CSRD compliance..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </>
      )}

      {isMinimized && (
        <CardContent className="p-4">
          <p className="text-sm text-slate-600">Caro is minimized</p>
        </CardContent>
      )}
    </Card>
  );
}