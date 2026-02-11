import React from 'react';
import RegulatoryIntelligence from '@/components/compliance/RegulatoryIntelligence';

export default function RegulatoryIntelligencePage() {
    return (
        <div className="min-h-screen bg-transparent text-[#545454]">
            <div className="bg-white border-b border-slate-100 sticky top-0 z-20 shadow-sm">
                <div className="max-w-[1600px] mx-auto px-8 py-4">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-lg bg-indigo-600 shadow-lg shadow-indigo-600/20">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-[#545454] tracking-tight">
                                Regulatory Intelligence
                            </h1>
                            <p className="text-xs text-indigo-600 font-bold tracking-widest uppercase">
                                AI-Powered Monitoring
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-8 py-8">
                <RegulatoryIntelligence />
            </div>
        </div>
    );
}