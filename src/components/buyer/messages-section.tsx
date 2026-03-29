"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useAuthStore } from "@/lib/store/auth-store";
import { useMessageStore } from "@/lib/store/message-store";
import { ComposeMessageDialog } from "./compose-message-dialog";
import { Button } from "@/components/ui/button";

export function BuyerMessagesSection() {
    const { user } = useAuthStore();
    const { messagesData, fetchMessages, markAsRead } = useMessageStore();
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [isComposeOpen, setIsComposeOpen] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await fetchMessages();
            setLoading(false);
        };
        load();
    }, [fetchMessages]);

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    const sortedMessages = [...messagesData].sort((a: any, b: any) =>
        new Date(b.sentAt || b.sentat || 0).getTime() - new Date(a.sentAt || a.sentat || 0).getTime()
    );

    return (
        <Card className="overflow-hidden border-none shadow-md">
            <CardHeader className="bg-muted/30">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Mail className="h-5 w-5 text-indigo-600" />
                            Direct Messages
                        </CardTitle>
                        <CardDescription>Read and send direct messages.</CardDescription>
                    </div>
                    <ComposeMessageDialog
                        isOpen={isComposeOpen}
                        onClose={() => setIsComposeOpen(false)}
                        onMessageSent={fetchMessages}
                    />
                    <Button onClick={() => setIsComposeOpen(true)} className="ml-auto">
                        Compose Message
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {sortedMessages.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground bg-muted/5">
                        <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg">No messages yet</p>
                        <p className="text-sm">Direct communications will appear here</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {sortedMessages.map((msg: any) => {
                            const messageId = msg.messageId || msg.messageid;
                            const isRead = msg.isRead || msg.isread;
                            const sentAt = msg.sentAt || msg.sentat;

                            return (
                                <div
                                    key={messageId}
                                    className={`group transition-all hover:bg-muted/30 ${!isRead ? 'bg-indigo-50/20' : ''}`}
                                >
                                    <div
                                        className="p-4 cursor-pointer flex items-center justify-between gap-4"
                                        onClick={() => {
                                            if (expandedId !== messageId) {
                                                setExpandedId(messageId);
                                                if (!isRead) markAsRead(messageId);
                                            } else {
                                                setExpandedId(null);
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${!isRead ? 'bg-indigo-100 text-indigo-600' : 'bg-muted text-muted-foreground'}`}>
                                                <Mail className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={`flex items-center gap-2 ${!isRead ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                                                    <span className="truncate">{msg.senderName || "Unknown Sender"}</span>
                                                    {!isRead && <span className="h-2 w-2 rounded-full bg-indigo-500" />}
                                                </div>
                                                <div className={`text-sm truncate ${!isRead ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                                    {msg.subject}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {sentAt ? format(new Date(sentAt), "MMM d, h:mm a") : ""}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 shrink-0">
                                            {expandedId === messageId ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </div>
                                    </div>

                                    {expandedId === messageId && (
                                        <div className="px-12 pb-6 pt-2 animate-in slide-in-from-top-1 duration-200">
                                            <div className="bg-muted/50 rounded-lg p-5 border border-border/50 shadow-inner">
                                                <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                                                <div className="mt-4 flex items-center gap-2">
                                                    {(msg.supplierId || msg.supplierid) && (
                                                        <span className="text-xs text-muted-foreground">Supplier Reference: {msg.supplierId || msg.supplierid}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
