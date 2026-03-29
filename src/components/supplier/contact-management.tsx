"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit2, Save, Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/lib/store/auth-store";
import { useSupplierRole } from "@/app/(protected)/supplier/context/SupplierRoleContext";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Contact {
    contactId: number;
    firstName: string;
    lastName: string;
    contactType: string;
    email: string;
    phone: string;
}

interface SupplierContactManagementProps {
    title?: string;
    description?: string;
}

export function SupplierContactManagement({
    title = "Authorized Contacts",
    description = "People who can access this portal or be contacted by buyers."
}: SupplierContactManagementProps) {
    const { user } = useAuthStore();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const { allPendingRequests, refreshChangeRequests } = useSupplierRole();
    const isLocked = ['PENDING', 'SUBMITTED', 'PRE_APPROVED'].includes(user?.approvalStatus || '');

    // Pending Requests Logic
    const pendingAdditions = allPendingRequests.flatMap(r =>
        (r.items || []).filter(i => i.fieldName === 'contact').map(i => {
            try {
                const data = typeof i.newValue === 'string' ? JSON.parse(i.newValue) : i.newValue;
                if (!data.contactId) {
                    return { ...data, requestId: r.requestId, isPending: true };
                }
            } catch (e) { }
            return null;
        }).filter(Boolean)
    ) as any[];

    const getPendingStatus = (id: number): string | null => {
        for (const req of allPendingRequests) {
            if (req.status !== 'PENDING') continue;
            for (const item of (req.items || [])) {
                if (item.fieldName === 'contact') {
                    try {
                        const data = typeof item.newValue === 'string' ? JSON.parse(item.newValue) : item.newValue;
                        if (data.contactId === id) return 'UPDATE';
                    } catch (e) { }
                }
            }
        }
        return null;
    };

    // Form State
    const [formData, setFormData] = useState<any>({
        firstName: "",
        lastName: "",
        contactType: "PRIMARY",
        email: "",
        phone: ""
    });

    const fetchContacts = async () => {
        if (!user?.supplierId) return;
        try {
            setLoading(true);
            const res = await apiClient.get(`/api/suppliers/${user.supplierId}/contacts`) as any;
            const rawContacts = res || [];
            // Map lowercase keys from Postgres
            const mappedContacts = rawContacts.map((c: any) => ({
                ...c,
                contactId: c.contactId || c.contactid,
                firstName: c.firstName || c.firstname,
                lastName: c.lastName || c.lastname,
                contactType: c.contactType || c.contacttype,
                email: c.email,
                phone: c.phone
            }));
            setContacts(mappedContacts);
        } catch (error) {
            console.error("Failed to fetch contacts", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, [user?.supplierId]);

    const handleOpenDialog = (contact?: Contact) => {
        if (contact) {
            setEditingContact(contact);
            setFormData({
                firstName: contact.firstName || (contact as any).firstname || "",
                lastName: contact.lastName || (contact as any).lastname || "",
                contactType: contact.contactType || (contact as any).contacttype || "PRIMARY",
                email: contact.email,
                phone: contact.phone
            });
        } else {
            setEditingContact(null);
            setFormData({
                firstName: "",
                lastName: "",
                contactType: "PRIMARY",
                email: "",
                phone: ""
            });
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.firstName || !formData.email || !user?.supplierId) return;

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            toast.error("Invalid email format");
            return;
        }

        try {
            if (editingContact) {
                await apiClient.put(`/api/contacts/${editingContact.contactId}`, formData);
            } else {
                await apiClient.post(`/api/suppliers/${user.supplierId}/contacts`, formData);
            }
            fetchContacts();
            refreshChangeRequests();
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Failed to save contact", error);
            toast.error("Failed to save contact.");
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this contact?")) {
            try {
                await apiClient.delete(`/api/contacts/${id}`);
                fetchContacts();
                refreshChangeRequests();
            } catch (error) {
                console.error("Failed to delete contact", error);
                toast.error("Failed to delete contact.");
            }
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex flex-col space-y-1.5">
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                    {!isLocked && (
                        <Button onClick={() => handleOpenDialog()}>
                            <Plus className="mr-2 h-4 w-4" /> Add Contact
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="mt-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Role / Type</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingAdditions.map((contact, i) => (
                                <TableRow key={`pending-${i}`} className="bg-yellow-50/50">
                                    <TableCell className="font-medium">
                                        {contact.firstName} {contact.lastName} <Badge variant="outline" className="ml-2 text-yellow-600 bg-yellow-50 border-yellow-200">Pending Add</Badge>
                                    </TableCell>
                                    <TableCell>{contact.contactType}</TableCell>
                                    <TableCell>{contact.email}</TableCell>
                                    <TableCell>{contact.phone}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Awaiting Approval</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {contacts.map((contact) => {
                                const pendingStatus = getPendingStatus(contact.contactId);
                                return (
                                    <TableRow key={contact.contactId} className={pendingStatus ? "bg-blue-50/50" : ""}>
                                        <TableCell className="font-medium">
                                            {contact.firstName} {contact.lastName}
                                            {pendingStatus === 'UPDATE' && <Badge variant="outline" className="ml-2 text-blue-600 bg-blue-50 border-blue-200">Pending Update</Badge>}
                                        </TableCell>
                                        <TableCell>{contact.contactType}</TableCell>
                                        <TableCell>{contact.email}</TableCell>
                                        <TableCell>{contact.phone}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            {pendingStatus ? (
                                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">Awaiting Approval</Badge>
                                            ) : (
                                                !isLocked && (
                                                    <>
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(contact)}>
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(contact.contactId)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            {contacts.length === 0 && pendingAdditions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                        No contacts found. Add one to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingContact ? "Edit Contact" : "Add New Contact"}</DialogTitle>
                        <DialogDescription>
                            {editingContact ? "Update contact details below." : "Enter the details for the new contact person."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="firstName" className="text-right">First Name</Label>
                            <Input
                                id="firstName"
                                value={formData.firstName || ""}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="lastName" className="text-right">Last Name</Label>
                            <Input
                                id="lastName"
                                value={formData.lastName || ""}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="contactType" className="text-right">Type / Role</Label>
                            <Input
                                id="contactType"
                                value={formData.contactType || ""}
                                onChange={(e) => setFormData({ ...formData, contactType: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email || ""}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="phone" className="text-right">Phone</Label>
                            <Input
                                id="phone"
                                value={formData.phone || ""}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" onClick={handleSave}>
                            <Save className="mr-2 h-4 w-4" /> Save Contact
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
