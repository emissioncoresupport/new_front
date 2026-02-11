import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Globe, Mail, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function RegulatoryAlertsConfig() {
    const queryClient = useQueryClient();
    const [currentUserEmail, setCurrentUserEmail] = useState(null);
    const [formData, setFormData] = useState({
        regions: ["EU", "US"],
        topics: ["PFAS", "EUDR"],
        frequency: "Weekly Digest",
        email_enabled: true,
        in_app_enabled: true
    });

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const user = await base44.auth.me();
                setCurrentUserEmail(user.email);
            } catch (e) {
                console.log("Not logged in");
            }
        };
        fetchUser();
    }, []);

    const { data: preferences } = useQuery({
        queryKey: ['regulatory-alerts', currentUserEmail],
        queryFn: async () => {
            if (!currentUserEmail) return null;
            const list = await base44.entities.RegulatoryAlertPreference.list();
            return list.find(p => p.user_email === currentUserEmail);
        },
        enabled: !!currentUserEmail
    });

    useEffect(() => {
        if (preferences) {
            setFormData({
                regions: preferences.regions || [],
                topics: preferences.topics || [],
                frequency: preferences.frequency || "Weekly Digest",
                email_enabled: preferences.email_enabled,
                in_app_enabled: preferences.in_app_enabled
            });
        }
    }, [preferences]);

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            if (preferences) {
                return base44.entities.RegulatoryAlertPreference.update(preferences.id, data);
            } else {
                return base44.entities.RegulatoryAlertPreference.create({
                    ...data,
                    user_email: currentUserEmail
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['regulatory-alerts']);
            toast.success("Alert preferences updated");
        }
    });

    const handleToggle = (field, value) => {
        setFormData(prev => {
            const current = prev[field];
            if (current.includes(value)) {
                return { ...prev, [field]: current.filter(item => item !== value) };
            } else {
                return { ...prev, [field]: [...current, value] };
            }
        });
    };

    if (!currentUserEmail) return <div className="text-sm text-slate-500">Please log in to manage alerts.</div>;

    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="w-5 h-5 text-indigo-500" />
                    Alert Configuration
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Topics */}
                <div className="space-y-3">
                    <Label className="text-base">Monitor Topics</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {["PFAS", "REACH", "TSCA", "EUDR", "CBAM", "Prop65"].map(topic => (
                            <div key={topic} className="flex items-center space-x-2 border p-2 rounded-lg hover:bg-slate-50">
                                <Checkbox 
                                    id={`topic-${topic}`} 
                                    checked={formData.topics.includes(topic)}
                                    onCheckedChange={() => handleToggle('topics', topic)}
                                />
                                <label htmlFor={`topic-${topic}`} className="text-sm font-medium cursor-pointer w-full">
                                    {topic}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Regions */}
                <div className="space-y-3">
                    <Label className="text-base">Regions</Label>
                    <div className="flex flex-wrap gap-4">
                        {["EU", "US", "Asia", "Global"].map(region => (
                            <div key={region} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`region-${region}`} 
                                    checked={formData.regions.includes(region)}
                                    onCheckedChange={() => handleToggle('regions', region)}
                                />
                                <label htmlFor={`region-${region}`} className="text-sm font-medium cursor-pointer">
                                    {region}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Channels */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-slate-500" />
                            <div>
                                <p className="font-medium text-sm">Email Notifications</p>
                                <p className="text-xs text-slate-500">Receive digests to {currentUserEmail}</p>
                            </div>
                        </div>
                        <Switch 
                            checked={formData.email_enabled} 
                            onCheckedChange={c => setFormData({...formData, email_enabled: c})} 
                        />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                            <ShieldAlert className="w-4 h-4 text-slate-500" />
                            <div>
                                <p className="font-medium text-sm">In-App Alerts</p>
                                <p className="text-xs text-slate-500">Show badges and banners</p>
                            </div>
                        </div>
                        <Switch 
                            checked={formData.in_app_enabled} 
                            onCheckedChange={c => setFormData({...formData, in_app_enabled: c})} 
                        />
                    </div>
                </div>

                <Button onClick={() => saveMutation.mutate(formData)} className="w-full bg-indigo-600 hover:bg-indigo-700">
                    Save Preferences
                </Button>
            </CardContent>
        </Card>
    );
}