import { useEffect, useState } from "react";
import { Loader2, ChevronsUpDown, Check } from "lucide-react";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AdminComposeMessageDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onMessageSent?: () => void;
}

export function AdminComposeMessageDialog({ isOpen, onClose, onMessageSent }: AdminComposeMessageDialogProps) {
    const { user } = useAuthStore();
    const [buyers, setBuyers] = useState<any[]>([]);
    const [selectedBuyer, setSelectedBuyer] = useState<string>("");
    const [buyerOpen, setBuyerOpen] = useState(false);
    const [subject, setSubject] = useState("");
    const [content, setContent] = useState("");
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchBuyers();
        } else {
            setSelectedBuyer("");
            setBuyerOpen(false);
            setSubject("");
            setContent("");
        }
    }, [isOpen]);

    const fetchBuyers = async () => {
        try {
            const res = await apiClient.get('/api/buyers') as any;
            setBuyers((Array.isArray(res) ? res : res?.data) || []);
        } catch (error) {
            console.error("Failed to fetch buyers", error);
            toast.error("Failed to load buyers");
        }
    };

    const handleSendMessage = async () => {
        if (!selectedBuyer || !subject || !content) {
            toast.error("Please fill all fields");
            return;
        }
        setSending(true);
        try {
            await apiClient.post('/api/messages', {
                buyerId: Number(selectedBuyer),
                recipientRole: 'BUYER',
                subject,
                content,
                senderName: user?.username || "Super Admin",
                supplierId: null // explicitly unbinding supplierId
            });
            toast.success("Message sent successfully to Buyer");
            onClose();
            if (onMessageSent) onMessageSent();
        } catch (error) {
            console.error("Failed to send message", error);
            toast.error("Failed to send message: " + (error as any).response?.data?.error || "Unknown error");
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Send Message to Buyer</DialogTitle>
                    <DialogDescription>Draft a direct notification that will appear in the specific Buyer's inbox.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Recipient Buyer</label>
                        <Popover open={buyerOpen} onOpenChange={setBuyerOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={buyerOpen}
                                    className="w-full justify-between font-normal"
                                >
                                    {selectedBuyer
                                        ? (() => {
                                            const b = buyers.find(b => String(b.buyerId || b.buyerid) === selectedBuyer);
                                            return b ? `${b.buyerName || b.buyername} (${b.buyerCode || b.buyercode})` : "Select buyer organization...";
                                        })()
                                        : "Select buyer organization..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start" style={{ width: "var(--radix-popover-trigger-width)" }}>
                                <Command>
                                    <CommandInput placeholder="Search buyer..." />
                                    <CommandList className="max-h-52 overflow-y-auto">
                                        <CommandEmpty>No buyer found.</CommandEmpty>
                                        <CommandGroup>
                                            {buyers.map(b => {
                                                const id = String(b.buyerId || b.buyerid);
                                                const name = b.buyerName || b.buyername;
                                                const code = b.buyerCode || b.buyercode;
                                                return (
                                                    <CommandItem
                                                        key={id}
                                                        value={`${name} ${code}`}
                                                        onSelect={() => {
                                                            setSelectedBuyer(id);
                                                            setBuyerOpen(false);
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", selectedBuyer === id ? "opacity-100" : "opacity-0")} />
                                                        {name} (Code: {code})
                                                    </CommandItem>
                                                );
                                            })}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Subject</label>
                        <Input
                            placeholder="e.g. Action Required: System Update"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Message</label>
                        <Textarea
                            placeholder="Type your message here..."
                            className="min-h-[100px]"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
                    <Button onClick={handleSendMessage} disabled={sending}>
                        {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Message
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
