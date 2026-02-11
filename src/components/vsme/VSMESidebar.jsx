import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BookOpen, Users, Menu } from "lucide-react";
import VSMEKnowledgeHub from './VSMEKnowledgeHub';
import VSMECollaboratorManager from './VSMECollaboratorManager';

export default function VSMESidebar() {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('knowledge');

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Menu className="w-4 h-4" />
          Resources
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[600px] sm:w-[700px] p-0">
        <div className="flex h-full">
          {/* Sidebar Navigation */}
          <div className="w-48 border-r border-slate-200 bg-slate-50 p-4">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-sm">VSME Resources</SheetTitle>
            </SheetHeader>
            <div className="space-y-2">
              <Button
                variant={activeSection === 'knowledge' ? 'default' : 'ghost'}
                className={`w-full justify-start gap-2 ${activeSection === 'knowledge' ? 'bg-[#86b027]' : ''}`}
                onClick={() => setActiveSection('knowledge')}
              >
                <BookOpen className="w-4 h-4" />
                Knowledge Hub
              </Button>
              <Button
                variant={activeSection === 'collaborators' ? 'default' : 'ghost'}
                className={`w-full justify-start gap-2 ${activeSection === 'collaborators' ? 'bg-[#86b027]' : ''}`}
                onClick={() => setActiveSection('collaborators')}
              >
                <Users className="w-4 h-4" />
                Collaborators
              </Button>
            </div>
          </div>

          {/* Content Area */}
          <ScrollArea className="flex-1 p-6">
            {activeSection === 'knowledge' && <VSMEKnowledgeHub />}
            {activeSection === 'collaborators' && <VSMECollaboratorManager />}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}