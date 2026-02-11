import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, MessageSquare, Clock, GitBranch } from "lucide-react";
import BOMActivityTimeline from './BOMActivityTimeline';
import BOMComments from './BOMComments';
import BOMVersionHistory from './BOMVersionHistory';
import BOMTeamMembers from './BOMTeamMembers';

export default function BOMCollaborationPanel({ productId }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded">
                    <Users className="w-4 h-4 text-blue-600" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900">Team Collaboration</h4>
            </div>

            <Tabs defaultValue="activity" className="w-full">
                <TabsList className="bg-slate-100 w-full justify-start">
                    <TabsTrigger value="activity" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" /> Activity
                    </TabsTrigger>
                    <TabsTrigger value="comments" className="text-xs">
                        <MessageSquare className="w-3 h-3 mr-1" /> Comments
                    </TabsTrigger>
                    <TabsTrigger value="versions" className="text-xs">
                        <GitBranch className="w-3 h-3 mr-1" /> Versions
                    </TabsTrigger>
                    <TabsTrigger value="team" className="text-xs">
                        <Users className="w-3 h-3 mr-1" /> Team
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="activity" className="mt-4">
                    <BOMActivityTimeline productId={productId} />
                </TabsContent>

                <TabsContent value="comments" className="mt-4">
                    <BOMComments productId={productId} />
                </TabsContent>

                <TabsContent value="versions" className="mt-4">
                    <BOMVersionHistory productId={productId} />
                </TabsContent>

                <TabsContent value="team" className="mt-4">
                    <BOMTeamMembers productId={productId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}