import { useEffect, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ComposeMessageDialogProps {
    isOpen: boolean;
    onClose: () => void;
    defaultSupplierId?: string;
    onMessageSent?: () => void;
}

export function ComposeMessageDialog({ isOpen, onClose, defaultSupplierId, onMessageSent }: ComposeMessageDialogProps) {
    const { user } = useAuthStore();
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<string>("");
    const [subject, setSubject] = useState("");
    const [content, setContent] = useState("");
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchSuppliers();
            if (defaultSupplierId) {
                setSelectedSupplier(defaultSupplierId);
            }
        } else {
            // Reset fields on close if needed, or keep for draft persistence?
            // Resetting for now to avoid sending to wrong person
            if (!defaultSupplierId) setSelectedSupplier("");
            setSubject("");
            setContent("");
        }
    }, [isOpen, defaultSupplierId]);

    const fetchSuppliers = async () => {
        try {
            const res = await apiClient.get('/api/suppliers') as any;
            setSuppliers((Array.isArray(res) ? res : res?.data) || []);
        } catch (error) {
            console.error("Failed to fetch suppliers", error);
            toast.error("Failed to load suppliers");
        }
    };

    const handleSendMessage = async () => {
        if (!selectedSupplier || !subject || !content) {
            toast.error("Please fill all fields");
            return;
        }
        setSending(true);
        try {
            await apiClient.post('/api/messages', {
                supplierId: selectedSupplier,
                recipientRole: 'SUPPLIER',
                subject,
                content,
                senderName: user?.username || "Buyer Admin"
            });
            toast.success("Message sent successfully");
            onClose();
            if (onMessageSent) onMessageSent();
        } catch (error) {
            console.error("Failed to send message", error);
            toast.error("Failed to send message");
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Send Message to Supplier</DialogTitle>
                    <DialogDescription>Valid for general updates or specific requests.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Recipient Supplier</label>
                        <Select onValueChange={setSelectedSupplier} value={selectedSupplier} disabled={!!defaultSupplierId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select supplier..." />
                            </SelectTrigger>
                            <SelectContent>
                                {suppliers.map(s => (
                                    <SelectItem key={s.supplierId} value={String(s.supplierId)}>
                                        {s.legalName} (ID: {s.supplierId})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Subject</label>
                        <Input
                            placeholder="e.g. Profile Update Required"
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
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSendMessage} disabled={sending}>
                        {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Message
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
