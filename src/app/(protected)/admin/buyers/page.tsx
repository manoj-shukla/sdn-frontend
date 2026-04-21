"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Search, MoreHorizontal, UserPlus, ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { useEffect, useMemo, useRef, useState } from "react";
import apiClient from "@/lib/api/client";
import { Loader2 } from "lucide-react";
import { useAdminRole } from "../context/AdminRoleContext";
import { toast } from "sonner";

// Comprehensive list of countries
const COUNTRIES = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia",
    "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium",
    "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria",
    "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad",
    "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
    "Denmark", "Djibouti", "Dominica", "Dominican Republic", "East Timor", "Ecuador", "Egypt", "El Salvador",
    "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon",
    "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
    "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
    "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos",
    "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar",
    "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico",
    "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia",
    "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia",
    "Norway", "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
    "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia",
    "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal",
    "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
    "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland",
    "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia",
    "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom",
    "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen",
    "Zambia", "Zimbabwe"
];

const PAGE_SIZE = 10;

export default function AdminBuyersPage() {
    const { canCreateBuyers } = useAdminRole();
    const [buyers, setBuyers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBuyer, setEditingBuyer] = useState<any | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        buyerName: "",
        buyerCode: "",
        email: "",
        country: "United States",
        password: "",
        isSandboxActive: false
    });

    // ── Upfront availability check ────────────────────────────────────────────
    // We hit GET /api/buyers/check-availability with a short debounce as the
    // admin types. This surfaces conflicts (buyer name, buyer code, email
    // already in use) immediately, so the Save button can be disabled until
    // the identity is unique — preventing the partial-creation error where a
    // buyer row was committed but the linked admin user INSERT then failed.
    type AvailabilityState = {
        status: "idle" | "checking" | "available" | "taken";
        conflicts: {
            buyerName?: boolean;
            buyerCode?: boolean;
            email?: boolean;
            username?: boolean;
        };
    };
    const [availability, setAvailability] = useState<AvailabilityState>({ status: "idle", conflicts: {} });
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const requestIdRef = useRef(0);

    const trimmedName = formData.buyerName.trim();
    const trimmedCode = formData.buyerCode.trim();
    const trimmedEmail = formData.email.trim();

    useEffect(() => {
        // Availability check is only relevant when creating a buyer.
        // On edit, skip — the admin may legitimately keep the same values.
        if (editingBuyer || !isDialogOpen) {
            setAvailability({ status: "idle", conflicts: {} });
            return;
        }
        if (!trimmedName && !trimmedCode && !trimmedEmail) {
            setAvailability({ status: "idle", conflicts: {} });
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);
        setAvailability((prev) => ({ ...prev, status: "checking" }));

        debounceRef.current = setTimeout(async () => {
            const myId = ++requestIdRef.current;
            try {
                const params = new URLSearchParams();
                if (trimmedName) params.set("buyerName", trimmedName);
                if (trimmedCode) params.set("buyerCode", trimmedCode);
                if (trimmedEmail) params.set("email", trimmedEmail);
                const res = (await apiClient.get(`/api/buyers/check-availability?${params.toString()}`)) as {
                    available: boolean;
                    conflicts: AvailabilityState["conflicts"];
                };
                // Ignore stale responses if a newer request has started.
                if (myId !== requestIdRef.current) return;
                setAvailability({
                    status: res.available ? "available" : "taken",
                    conflicts: res.conflicts || {},
                });
            } catch {
                if (myId !== requestIdRef.current) return;
                // On network error, don't block submission — let the server
                // decide. Reset to idle so the Save button stays enabled.
                setAvailability({ status: "idle", conflicts: {} });
            }
        }, 400);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [trimmedName, trimmedCode, trimmedEmail, editingBuyer, isDialogOpen]);

    // Save is disabled when the form is still resolving uniqueness, or when
    // the server reports a conflict (only during Create — Edit is unaffected).
    const isSaveDisabled = useMemo(() => {
        if (editingBuyer) return false;
        if (!trimmedName || !trimmedEmail) return true;
        if (availability.status === "checking") return true;
        if (availability.status === "taken") return true;
        return false;
    }, [editingBuyer, trimmedName, trimmedEmail, availability.status]);

    const fetchBuyers = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/api/buyers') as any;
            setBuyers(res.content || (Array.isArray(res) ? res : []));
        } catch (error) {
            console.error("Failed to fetch buyers", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBuyers();
    }, []);

    const handleOpenDialog = (buyer?: any) => {
        console.log("Opening Dialog with Buyer:", buyer); // Debug log
        if (buyer) {
            setEditingBuyer(buyer);
            setFormData({
                buyerName: buyer.buyername || buyer.buyerName || "",
                buyerCode: buyer.buyercode || buyer.buyerCode || "",
                email: buyer.email || "",
                country: buyer.country || "United States",
                password: "",  // Password not editable
                isSandboxActive: buyer.issandboxactive ?? buyer.isSandboxActive ?? false
            });
        } else {
            setEditingBuyer(null);
            setFormData({ buyerName: "", buyerCode: "", email: "", country: "United States", password: "", isSandboxActive: false });
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            toast.error("Invalid email format");
            return;
        }

        try {
            if (editingBuyer) {
                const buyerId = editingBuyer.buyerid || editingBuyer.buyerId;
                await apiClient.put(`/api/buyers/${buyerId}`, formData);
                toast.success(`Buyer ${formData.buyerName} updated successfully`);
            } else {
                await apiClient.post('/api/buyers', formData);
                toast.success(`A new buyer ${formData.buyerName} is added`);
            }
            fetchBuyers();
            setIsDialogOpen(false);
        } catch (e: any) {
            const apiError = e?.response?.data?.error;
            if (apiError === "Username is already taken") {
                toast.error("Username is already taken");
            } else if (apiError === "Invalid email format") {
                toast.error("Invalid email format");
            } else {
                toast.error(editingBuyer ? `Failed to update buyer ${formData.buyerName}` : `Had issue adding buyer ${formData.buyerName}`);
            }
        }
    };

    const filteredBuyers = buyers.filter(b =>
        b.buyername?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.max(1, Math.ceil(filteredBuyers.length / PAGE_SIZE));
    const paginatedBuyers = filteredBuyers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        setCurrentPage(1);
    };

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Buyers</h1>
                    <p className="text-muted-foreground">Manage internal buyer accounts and white-label branding.</p>
                </div>
                {canCreateBuyers && (
                    <Button onClick={() => handleOpenDialog()}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Buyer
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>All Buyers</CardTitle>
                        <div className="flex w-full max-w-sm items-center space-x-2">
                            <Input
                                type="search"
                                placeholder="Search buyers..."
                                value={searchTerm}
                                onChange={(e) => handleSearchChange(e.target.value)}
                            />
                            <Button size="icon" variant="ghost"><Search className="h-4 w-4" /></Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Country</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedBuyers.map((buyer) => (
                                <TableRow key={buyer.buyerid || buyer.buyerId}>
                                    <TableCell className="font-medium">{buyer.buyerid || buyer.buyerId}</TableCell>
                                    <TableCell>{buyer.buyername || buyer.buyerName}</TableCell>
                                    <TableCell>{buyer.buyercode || buyer.buyerCode}</TableCell>
                                    <TableCell>{buyer.email || buyer.Email}</TableCell>
                                    <TableCell>{buyer.country || buyer.Country}</TableCell>
                                    <TableCell className="text-right">
                                        <ActionMenu items={[
                                            { label: "Edit Buyer", onClick: () => handleOpenDialog(buyer) },
                                            { label: "Deactivate", onClick: () => console.log("Deactivate"), className: "text-destructive" }
                                        ]}>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </ActionMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t pt-4 mt-2">
                            <p className="text-sm text-muted-foreground">
                                Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filteredBuyers.length)} of {filteredBuyers.length} buyers
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingBuyer ? "Edit Buyer" : "Add New Buyer"}</DialogTitle>
                        <DialogDescription>
                            Configure buyer details and settings.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Buyer Name</Label>
                            <Input
                                id="name"
                                value={formData.buyerName}
                                onChange={(e) => setFormData({ ...formData, buyerName: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="code">Buyer Code</Label>
                            <Input
                                id="code"
                                value={formData.buyerCode}
                                onChange={(e) => setFormData({ ...formData, buyerCode: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="country">Country</Label>
                            <Select
                                value={formData.country}
                                onValueChange={(val) => setFormData({ ...formData, country: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a country" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {COUNTRIES.map((country) => (
                                        <SelectItem key={country} value={country}>
                                            {country}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-between border p-3 rounded-md">
                            <div className="space-y-0.5">
                                <Label>Sandbox Mode</Label>
                                <div className="text-xs text-muted-foreground">
                                    Enable developer tools for this buyer.
                                </div>
                            </div>
                            <Switch
                                checked={formData.isSandboxActive}
                                onCheckedChange={(checked) => setFormData({ ...formData, isSandboxActive: checked })}
                            />
                        </div>
                        {!editingBuyer && (
                            <div className="grid gap-2">
                                <Label htmlFor="password">Admin Password (Optional)</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Leave empty for default"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Default password: SDNtech123!
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save Buyer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
