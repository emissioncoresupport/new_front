import React, { useState } from 'react';
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Loader2, Send, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function DirectInviteModal({ open, onOpenChange }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);

    const inviteMutation = useMutation({
        mutationFn: async () => {
            setIsSending(true);
            try {
                // 1. Create Supplier Record (Minimal)
                const supplier = await base44.entities.Supplier.create({
                    legal_name: name,
                    country: "Unknown", // Placeholder until they fill it
                    status: "pending_review",
                    source: "manual",
                    notes: "Invited via Direct Email"
                });

                // 2. Create Invite Token (Assuming entity exists, otherwise skip)
                // We'll just assume we send a link to the portal with a generic or specific token if we had the logic.
                // For now, we'll simulate the token generation logic or just send a generic link.
                
                // 3. Send Email
                await base44.integrations.Core.SendEmail({
                    to: email,
                    subject: `Invitation to Emission Core Supplier Portal`,
                    body: `Dear ${name},\n\nYou have been invited to join the Emission Core Supplier Portal to submit your compliance and sustainability data.\n\nPlease click the link below to complete your profile:\n\nhttps://emission-core.app/SupplierPortal?supplier=${supplier.id}\n\nMessage from buyer:\n${message}\n\nBest regards,\nEmission Core Team`
                });

                return supplier;
            } finally {
                setIsSending(false);
            }
        },
        onSuccess: () => {
            toast.success(`Invitation sent to ${email}`);
            onOpenChange(false);
            setName("");
            setEmail("");
            setMessage("");
        },
        onError: () => toast.error("Failed to send invitation")
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-[#86b027]" />
                        Direct Supplier Invitation
                    </DialogTitle>
                    <DialogDescription>
                        Invite a supplier via email to onboard themselves. No prior data needed.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Supplier Company Name</Label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <Input 
                                placeholder="e.g. Acme Corp" 
                                className="pl-9"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Contact Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <Input 
                                type="email" 
                                placeholder="contact@supplier.com" 
                                className="pl-9"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Custom Message (Optional)</Label>
                        <Textarea 
                            placeholder="Please onboard to provide PFAS declarations..." 
                            className="min-h-[100px]"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button 
                        className="bg-[#86b027] hover:bg-[#769c22] text-white"
                        onClick={() => inviteMutation.mutate()}
                        disabled={!name || !email || isSending}
                    >
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                        Send Invitation
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}