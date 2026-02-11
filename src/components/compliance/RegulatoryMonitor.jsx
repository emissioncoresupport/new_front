import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function RegulatoryMonitor() {
    const queryClient = useQueryClient();
    const [isChecking, setIsChecking] = useState(false);

    const checkMutation = useMutation({
        mutationFn: async () => {
            setIsChecking(true);
            try {
                // 1. Check for updates using LLM with internet access
                const prompt = `
                    Search for the latest regulatory updates from the last 30 days regarding:
                    1. REACH Annex XVII (specifically PFAS restrictions)
                    2. ECHA Candidate List (SVHC updates)
                    3. US EPA PFAS reporting rules (TSCA)
                    
                    Return a JSON object with a list of updates.
                    Format:
                    {
                        "updates": [
                            {
                                "title": "Brief Title",
                                "summary": "Concise summary of the change.",
                                "regulation_type": "PFAS" | "General",
                                "source": "ECHA" | "EPA" | "Other",
                                "publication_date": "YYYY-MM-DD",
                                "impact_level": "High" | "Medium" | "Low",
                                "url": "Source URL if available"
                            }
                        ]
                    }
                    Only include ACTUAL updates from the last 30-60 days. If nothing significant, return an empty list.
                `;

                const response = await base44.integrations.Core.InvokeLLM({
                    prompt: prompt,
                    add_context_from_internet: true,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            updates: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        title: { type: "string" },
                                        summary: { type: "string" },
                                        regulation_type: { type: "string", enum: ["PFAS", "General"] },
                                        source: { type: "string" },
                                        publication_date: { type: "string" },
                                        impact_level: { type: "string", enum: ["High", "Medium", "Low"] },
                                        url: { type: "string" }
                                    }
                                }
                            }
                        }
                    }
                });

                const result = typeof response === 'string' ? JSON.parse(response) : response;
                const updates = result.updates || [];

                if (updates.length === 0) {
                    return { count: 0 };
                }

                // 2. Save updates to database (avoiding duplicates by title check - simple logic)
                // In a real app, we'd query existing by title/date first.
                // For this demo, we just create them.
                
                const existing = await base44.entities.RegulatoryUpdate.list();
                const newUpdates = updates.filter(u => !existing.some(e => e.title === u.title));

                if (newUpdates.length > 0) {
                    await Promise.all(newUpdates.map(u => base44.entities.RegulatoryUpdate.create(u)));
                    
                    // 3. Create Notifications for high impact updates
                    const highImpact = newUpdates.filter(u => u.impact_level === 'High');
                    if (highImpact.length > 0) {
                        // Mock notification creation - assuming Notification entity exists or using toast
                        // We'll just rely on the feed for now, but let's try to create a generic notification if possible
                        // Or just toast the user
                    }
                }

                return { count: newUpdates.length, updates: newUpdates };
            } finally {
                setIsChecking(false);
            }
        },
        onSuccess: (data) => {
            if (data.count > 0) {
                toast.success(`Found ${data.count} new regulatory updates.`);
                queryClient.invalidateQueries(['regulatory-updates']);
            } else {
                toast.info("No new regulatory updates found.");
            }
        },
        onError: () => {
            toast.error("Failed to check for updates.");
        }
    });

    return (
        <Button 
            variant="outline" 
            size="sm" 
            onClick={() => checkMutation.mutate()}
            disabled={isChecking}
            className="gap-2"
        >
            {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {isChecking ? "Scanning..." : "Check Regulations"}
        </Button>
    );
}