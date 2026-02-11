import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Search, ExternalLink, FileText, Globe, Bookmark, ChevronRight } from "lucide-react";

export default function PFASKnowledgeHub() {
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("all");

    const articles = [
        {
            id: 1,
            title: "Understanding REACH Annex XVII Restrictions on PFAS",
            category: "Regulation",
            source: "ECHA Official",
            date: "2025-10-15",
            summary: "Comprehensive guide to the latest restrictions on per- and polyfluoroalkyl substances under REACH regulation.",
            url: "https://echa.europa.eu/hot-topics/perfluoroalkyl-chemicals-pfas"
        },
        {
            id: 2,
            title: "PFAS in Electronics: Compliance Guide",
            category: "Industry Guide",
            source: "Emission Core Research",
            date: "2025-11-02",
            summary: "Best practices for identifying and substituting PFAS in semiconductor manufacturing and electronic components.",
            url: "#"
        },
        {
            id: 3,
            title: "ECHA Candidate List Update (SVHC)",
            category: "Update",
            source: "ECHA",
            date: "2025-12-01",
            summary: "New substances added to the Candidate List of Substances of Very High Concern, including several PFAS.",
            url: "https://echa.europa.eu/candidate-list-table"
        },
        {
            id: 4,
            title: "Alternatives to PTFE in Consumer Goods",
            category: "Substitution",
            source: "Green Chemistry Institute",
            date: "2025-09-20",
            summary: "Technical analysis of fluorine-free water repellents and non-stick coatings for textiles and cookware.",
            url: "#"
        },
        {
            id: 5,
            title: "US EPA vs EU REACH: PFAS Regulatory Comparison",
            category: "Regulation",
            source: "Global Compliance News",
            date: "2025-10-30",
            summary: "Key differences between TSCA reporting obligations and REACH restriction proposals.",
            url: "#"
        }
    ];

    const filteredArticles = articles.filter(article => {
        const matchesSearch = article.title.toLowerCase().includes(search.toLowerCase()) || article.summary.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = category === 'all' || article.category === category;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 to-violet-800 p-8 text-white shadow-xl">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">PFAS Knowledge Hub</h1>
                    <p className="text-indigo-100 max-w-2xl mb-6">
                        Stay updated with the latest regulatory changes, compliance guides, and substitution strategies directly from ECHA and industry experts.
                    </p>
                    
                    <div className="flex gap-2 max-w-md bg-white/10 p-1 rounded-lg border border-white/20 backdrop-blur-sm">
                        <Search className="w-5 h-5 text-indigo-200 ml-2 mt-2.5" />
                        <Input 
                            placeholder="Search articles, regulations, guides..." 
                            className="bg-transparent border-none text-white placeholder:text-indigo-200 focus-visible:ring-0"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                {/* Decorative BG */}
                <BookOpen className="absolute right-[-20px] bottom-[-40px] w-64 h-64 text-white/5 rotate-12" />
            </div>

            {/* Categories */}
            <Tabs defaultValue="all" onValueChange={setCategory} className="w-full">
                <TabsList className="bg-white border border-slate-100 p-1 rounded-lg">
                    <TabsTrigger value="all">All Resources</TabsTrigger>
                    <TabsTrigger value="Regulation">Regulations</TabsTrigger>
                    <TabsTrigger value="Substitution">Substitution</TabsTrigger>
                    <TabsTrigger value="Industry Guide">Industry Guides</TabsTrigger>
                    <TabsTrigger value="Update">Updates</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredArticles.map((article) => (
                    <Card key={article.id} className="hover:shadow-lg transition-all group cursor-pointer border-slate-200">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start mb-2">
                                <Badge variant="outline" className="bg-slate-50">{article.category}</Badge>
                                <span className="text-xs text-slate-400">{article.date}</span>
                            </div>
                            <CardTitle className="text-lg text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2">
                                {article.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-500 mb-4 line-clamp-3">
                                {article.summary}
                            </p>
                            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                    <Globe className="w-3 h-3" /> {article.source}
                                </span>
                                <Button variant="ghost" size="sm" className="h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={() => window.open(article.url, '_blank')}>
                                    Read <ExternalLink className="w-3 h-3 ml-1" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* API Status Banner */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-full">
                        <Globe className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-emerald-900">ECHA API Connection Active</h4>
                        <p className="text-sm text-emerald-700">Real-time regulatory data is being synced for Candidate List & Annex XVII.</p>
                    </div>
                </div>
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">Connected</Badge>
            </div>
        </div>
    );
}