import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Send, X, Minimize2, Maximize2, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

export default function EUDAMEDAssistant() {
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
    { label: "What is MDR?", query: "Explain the EU Medical Device Regulation (MDR) and its key requirements" },
    { label: "MIR Reporting", query: "Guide me through creating a Manufacturer Incident Report (MIR) in EUDAMED" },
    { label: "UDI-DI Requirements", query: "What are the UDI-DI requirements for device registration?" },
    { label: "Vigilance Deadlines", query: "What are the reporting deadlines for serious incidents under MDR?" },
    { label: "PSUR Requirements", query: "Explain Periodic Safety Update Report requirements for different risk classes" },
    { label: "Clinical Studies", query: "What information is required for clinical investigation registration?" }
  ];

  const handleSend = async (query = input) => {
    if (!query.trim()) return;

    const userMessage = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Fetch relevant EUDAMED data for context-aware responses
      const [actors, devices, reports, incidents, studies, notifications, auditLogs, syncQueue] = await Promise.all([
        base44.entities.EUDAMEDActor.list(),
        base44.entities.EUDAMEDDevice.list(),
        base44.entities.EUDAMEDReport.list('-submission_date', 10),
        base44.entities.EUDAMEDIncident.list('-incident_date', 10),
        base44.entities.EUDAMEDClinicalInvestigation.list(),
        base44.entities.Notification.filter({ read: false }),
        base44.entities.EUDAMEDAuditLog.list('-timestamp', 20),
        base44.entities.EUDAMEDSyncQueue.filter({ status: 'retry_scheduled' })
      ]);

      // Build context summary
      const contextSummary = `
CURRENT EUDAMED DATA SNAPSHOT:
- Actors: ${actors.length} total (${actors.filter(a => a.registration_status === 'registered').length} registered, ${actors.filter(a => a.registration_status === 'draft').length} draft)
- Devices: ${devices.length} total (${devices.filter(d => d.registration_status === 'registered').length} registered)
- Reports: ${reports.length} recent (${reports.filter(r => r.submission_status === 'submitted').length} submitted, ${reports.filter(r => r.submission_status === 'draft').length} draft)
- Incidents: ${incidents.length} recent (${incidents.filter(i => i.status === 'open').length} open)
- Clinical Studies: ${studies.length} total (${studies.filter(s => s.status === 'ongoing').length} ongoing)
- Unread Notifications: ${notifications.length}
- Failed Sync Queue: ${syncQueue.length} pending retries
- Recent Audit Activity: ${auditLogs.filter(l => l.outcome === 'failure').length} failures in last 20 entries

SPECIFIC ENTITY DETAILS (if relevant to query):
Actors: ${actors.slice(0, 3).map(a => `${a.legal_name} (SRN: ${a.srn || 'pending'}, Status: ${a.registration_status})`).join(', ')}
Devices: ${devices.slice(0, 3).map(d => `${d.device_name} (UDI-DI: ${d.udi_di}, Class: ${d.risk_class})`).join(', ')}
Recent Reports: ${reports.slice(0, 3).map(r => `${r.report_type} (${r.report_reference}, Status: ${r.submission_status})`).join(', ')}
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert AI assistant for the EUDAMED (European Database on Medical Devices) system. You help users understand and comply with EU Medical Device Regulation (MDR) and In Vitro Diagnostic Regulation (IVDR).

Your expertise includes:
- MDR 2017/745 and IVDR 2017/746 regulations
- EUDAMED module functionalities (Actor Registration, UDI/Device Registration, Vigilance, Clinical Investigations)
- Report generation processes (MIR, FSCA, PSUR, Clinical Investigation Summaries)
- Compliance deadlines and requirements
- UDI-DI system and GMDN codes
- Notified Body requirements
- Post-market surveillance obligations

${contextSummary}

IMPORTANT: When providing guidance, reference specific data from the snapshot above when relevant. For example, if user asks about actors, mention the actual actors by name and their status.

When suggesting user actions, provide navigation links using this format:
- For viewing actors: "Navigate to **Actor Registry** tab"
- For viewing devices: "Navigate to **Device Registry (UDI)** tab"
- For viewing reports: "Navigate to **Reporting** tab"
- For viewing audit logs: "Navigate to **Audit Trail** tab"
- For viewing notifications: "Navigate to **Notifications** tab"
- For vigilance: "Navigate to **Vigilance & Safety** tab"

If there are unread notifications, failed syncs, or open incidents, proactively mention them in your response.

User question: ${query}

Provide a clear, accurate, and actionable response with specific references to the user's actual data. Include relevant article references from MDR/IVDR when applicable.`,
        add_context_from_internet: false
      });

      const assistantMessage = { role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast.error('Failed to get response from assistant');
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
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-[#86b027] to-[#769c22] hover:scale-110 transition-transform z-50"
      >
        <MessageSquare className="w-6 h-6 text-white" />
      </Button>
    );
  }

  return (
    <Card className={`fixed ${isMinimized ? 'bottom-6 right-6 w-80' : 'bottom-6 right-6 w-[480px] h-[600px]'} shadow-2xl z-50 flex flex-col`}>
      <CardHeader className="bg-gradient-to-r from-[#86b027] to-[#769c22] text-white p-4 flex-row items-center justify-between space-y-0 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <CardTitle className="text-white text-base">EUDAMED Assistant</CardTitle>
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
                    Hi! I'm your EUDAMED compliance assistant. I can help you with:
                  </p>
                  <ul className="text-xs text-slate-500 space-y-1 ml-4 list-disc">
                    <li>MDR and IVDR regulations</li>
                    <li>Report generation guidance</li>
                    <li>Compliance deadlines</li>
                    <li>Registration requirements</li>
                    <li>Vigilance reporting procedures</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-500 font-semibold">Quick actions:</p>
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
                      ? 'bg-[#86b027] text-white' 
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
                          strong: ({ children }) => <strong className="font-semibold text-[#86b027]">{children}</strong>,
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
                  <Loader2 className="w-4 h-4 animate-spin text-[#86b027]" />
                  <span className="text-sm text-slate-600">Thinking...</span>
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
                placeholder="Ask about MDR, IVDR, or EUDAMED..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-[#86b027] hover:bg-[#769c22]"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </>
      )}

      {isMinimized && (
        <CardContent className="p-4">
          <p className="text-sm text-slate-600">EUDAMED Assistant is minimized</p>
        </CardContent>
      )}
    </Card>
  );
}