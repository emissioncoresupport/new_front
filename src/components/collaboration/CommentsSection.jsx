import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function CommentsSection({ entityId, entityType, currentUserEmail }) {
    const [newComment, setNewComment] = useState("");
    const queryClient = useQueryClient();

    const { data: comments = [], isLoading } = useQuery({
        queryKey: ['comments', entityType, entityId],
        queryFn: async () => {
            const all = await base44.entities.Comment.list('-created_date');
            return all.filter(c => c.related_entity_id === entityId && c.related_entity_type === entityType);
        },
        enabled: !!entityId
    });

    const addCommentMutation = useMutation({
        mutationFn: async (content) => {
            await base44.entities.Comment.create({
                related_entity_id: entityId,
                related_entity_type: entityType,
                content: content,
                author_email: currentUserEmail,
                author_name: currentUserEmail.split('@')[0], // Simple name extraction
                created_at: new Date().toISOString()
            });
            
            // Notify relevant users (simplified: notify everyone else who commented or the assignee if it's a task)
            // This logic would ideally be backend, but here we mock a notification to "others"
            // For now, we just add the comment.
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['comments', entityType, entityId]);
            setNewComment("");
            toast.success("Comment posted");
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        addCommentMutation.mutate(newComment);
    };

    return (
        <div className="flex flex-col h-full max-h-[500px]">
            <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                <h3 className="font-bold text-slate-700">Comments ({comments.length})</h3>
            </div>

            <ScrollArea className="flex-1 pr-4 -mr-4 mb-4 min-h-[200px]">
                <div className="space-y-4">
                    {comments.map(comment => (
                        <div key={comment.id} className={`flex gap-3 ${comment.author_email === currentUserEmail ? 'flex-row-reverse' : ''}`}>
                            <Avatar className="w-8 h-8 border border-slate-200">
                                <AvatarFallback className="text-xs bg-slate-100 text-slate-600">
                                    {comment.author_name?.[0]?.toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className={`flex flex-col max-w-[80%] ${comment.author_email === currentUserEmail ? 'items-end' : 'items-start'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-slate-700">{comment.author_name}</span>
                                    <span className="text-[10px] text-slate-400">
                                        {comment.created_at ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }) : 'Just now'}
                                    </span>
                                </div>
                                <div className={`p-3 rounded-2xl text-sm ${
                                    comment.author_email === currentUserEmail 
                                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                                    : 'bg-slate-100 text-slate-700 rounded-tl-none'
                                }`}>
                                    {comment.content}
                                </div>
                            </div>
                        </div>
                    ))}
                    {comments.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            No comments yet. Start the discussion!
                        </div>
                    )}
                </div>
            </ScrollArea>

            <form onSubmit={handleSubmit} className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
                <Input 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!newComment.trim() || addCommentMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                    {addCommentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
            </form>
        </div>
    );
}