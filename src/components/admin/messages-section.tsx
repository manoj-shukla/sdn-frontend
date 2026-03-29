"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, ChevronDown, ChevronUp, Loader2, Send } from "lucide-react";
import { format } from "date-fns";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { AdminComposeMessageDialog } from "./compose-message-dialog";
import { Button } from "@/components/ui/button";

export function AdminMessagesSection() {
    const { user } = useAuthStore();
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [isComposeOpen, setIsComposeOpen] = useState(false);

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/api/messages') as any;
            const msgs = (Array.isArray(res) ? res : res?.data) || [];
            const sorted = msgs.sort((a: any, b: any) =>
                new Date(b.sentAt || b.sentat || 0).getTime() - new Date(a.sentAt || a.sentat || 0).getTime()
            );
            setMessages(sorted);
        } catch (error) {
            console.error("Failed to fetch messages", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <Card className="overflow-hidden border-none shadow-md">
            <CardHeader className="bg-muted/30">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Mail className="h-5 w-5 text-indigo-600" />
                            Global Message Log
                        </CardTitle>
                        <CardDescription>View latest 100 messages sent across the platform.</CardDescription>
                    </div>
                    <AdminComposeMessageDialog
                        isOpen={isComposeOpen}
                        onClose={() => setIsComposeOpen(false)}
                        onMessageSent={fetchMessages}
                    />
                    <Button onClick={() => setIsComposeOpen(true)} className="ml-auto">
                        <Send className="mr-2 h-4 w-4" /> Message Buyer
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {messages.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground bg-muted/5">
                        <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg">No messages found</p>
                        <p className="text-sm">Platform communication is currently empty.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {messages.map((msg: any) => {
                            const messageId = msg.messageId || msg.messageid;
                            const sentAt = msg.sentAt || msg.sentat;
                            const recipientRole = msg.recipientRole || msg.recipientrole;

                            return (
                                <div
                                    key={messageId}
                                    className="group transition-all hover:bg-muted/30"
                                >
                                    <div
                                        className="p-4 cursor-pointer flex items-center justify-between gap-4"
                                        onClick={() => {
                                            setExpandedId(expandedId === messageId ? null : messageId);
                                        }}
                                    >
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 bg-muted text-muted-foreground">
                                                <Mail className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 font-medium text-foreground">
                                                    <span className="truncate">{msg.senderName || "Unknown Sender"}</span>
                                                    <Badge variant="outline" className="text-[10px] ml-2 tracking-wider">
                                                        To: {recipientRole}
                                                    </Badge>
                                                </div>
                                                <div className="text-sm truncate text-muted-foreground">
                                                    {msg.subject}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {sentAt ? format(new Date(sentAt), "MMM d, yyyy h:mm a") : ""}
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
                                                <div className="mt-4 flex flex-wrap items-center gap-3">
                                                    {(msg.buyerId || msg.buyerid) && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            Buyer ID: {msg.buyerId || msg.buyerid}
                                                        </Badge>
                                                    )}
                                                    {(msg.supplierId || msg.supplierid) && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            Supplier ID: {msg.supplierId || msg.supplierid}
                                                        </Badge>
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
