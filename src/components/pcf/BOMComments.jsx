import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function BOMComments({ productId }) {
    const queryClient = useQueryClient();
    const [newComment, setNewComment] = useState("");

    const { data: comments = [], isLoading } = useQuery({
        queryKey: ['product-comments', productId],
        queryFn: async () => {
            const all = await base44.entities.Comment.filter({ 
                entity_type: 'Product',
                entity_id: productId 
            });
            return all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        }
    });

    const createCommentMutation = useMutation({
        mutationFn: async (content) => {
            const user = await base44.auth.me();
            return base44.entities.Comment.create({
                entity_type: 'Product',
                entity_id: productId,
                content: content,
                author_email: user.email,
                author_name: user.full_name
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['product-comments', productId]);
            setNewComment("");
            toast.success("Comment added");
        }
    });

    return (
        <Card className="border-slate-200">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-600" />
                    Team Comments ({comments.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
                <div className="space-y-2">
                    <Textarea 
                        placeholder="Add a comment or insight about this product's footprint..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[80px] text-sm"
                    />
                    <div className="flex justify-end">
                        <Button 
                            size="sm" 
                            onClick={() => createCommentMutation.mutate(newComment)}
                            disabled={!newComment.trim()}
                            className="bg-[#86b027] hover:bg-[#769c22] text-white"
                        >
                            <Send className="w-3 h-3 mr-1" /> Post Comment
                        </Button>
                    </div>
                </div>

                <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                        {comments.length === 0 ? (
                            <p className="text-center text-slate-400 text-sm py-8">No comments yet. Start the conversation!</p>
                        ) : (
                            comments.map((comment) => (
                                <div key={comment.id} className="bg-slate-50 rounded-lg p-3 space-y-2">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 bg-slate-200 rounded-full">
                                                <User className="w-3 h-3 text-slate-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{comment.author_name || comment.author_email}</p>
                                                <p className="text-[10px] text-slate-500">
                                                    {formatDistanceToNow(new Date(comment.created_date), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-700 leading-relaxed">{comment.content}</p>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}