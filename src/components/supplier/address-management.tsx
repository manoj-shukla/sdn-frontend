"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, MapPin, Save, Trash2, Edit2, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
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

interface Address {
    addressId: number;
    addressType: string;
    addressLine1: string;
    city: string;
    country: string;
    stateProvince?: string;
    postalCode?: string;
}

const COUNTRIES = [
    { value: "US", label: "United States" },
    { value: "CA", label: "Canada" },
    { value: "GB", label: "United Kingdom" },
    { value: "AU", label: "Australia" },
    { value: "IN", label: "India" },
    { value: "DE", label: "Germany" },
    { value: "FR", label: "France" },
    { value: "SG", label: "Singapore" },
    { value: "SE", label: "Sweden" },
    { value: "NZ", label: "New Zealand" },
    { value: "AE", label: "United Arab Emirates" },
    { value: "JP", label: "Japan" },
    { value: "CN", label: "China" },
    { value: "BR", label: "Brazil" },
    { value: "ZA", label: "South Africa" }
];

interface SupplierAddressManagementProps {
    title?: string;
    description?: string;
}

export function SupplierAddressManagement({
    title = "Addresses",
    description = "Manage your physical locations."
}: SupplierAddressManagementProps) {
    const { user } = useAuthStore();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [openCountry, setOpenCountry] = useState(false);
    const isLocked = ['PENDING', 'SUBMITTED', 'PRE_APPROVED'].includes(user?.approvalStatus || '');
    const [editingId, setEditingId] = useState<number | null>(null);
    const { allPendingRequests, refreshChangeRequests } = useSupplierRole();

    // Pending Requests Logic
    const pendingAdditions = allPendingRequests.flatMap(r =>
        (r.items || []).filter(i => i.fieldName === 'address').map(i => {
            try {
                const data = typeof i.newValue === 'string' ? JSON.parse(i.newValue) : i.newValue;
                if (!data.addressId) {
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
                if (item.fieldName === 'address') {
                    try {
                        const data = typeof item.newValue === 'string' ? JSON.parse(item.newValue) : item.newValue;
                        if (data.addressId === id) return 'UPDATE';
                    } catch (e) { }
                }
            }
        }
        return null;
    };

    const [formData, setFormData] = useState<any>({
        addressType: "BUSINESS",
        addressLine1: "",
        city: "",
        stateProvince: "",
        postalCode: "",
        country: ""
    });

    const fetchAddresses = async () => {
        if (!user?.supplierId) return;
        try {
            setLoading(true);
            const res = await apiClient.get(`/api/suppliers/${user.supplierId}/addresses`) as any;
            const rawAddresses = res || [];
            // Map lowercase keys
            const mappedAddresses = rawAddresses.map((a: any) => ({
                ...a,
                addressId: a.addressId || a.addressid,
                addressType: a.addressType || a.addresstype,
                addressLine1: a.addressLine1 || a.addressline1,
                city: a.city,
                country: a.country,
                stateProvince: a.stateProvince || a.stateprovince,
                postalCode: a.postalCode || a.postalcode
            }));
            setAddresses(mappedAddresses);
        } catch (error) {
            console.error("Failed to fetch addresses", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAddresses();
    }, [user?.supplierId]);

    const handleOpenDialog = (address?: Address) => {
        if (address) {
            setEditingId(address.addressId);
            setFormData({
                addressType: address.addressType || (address as any).addresstype || "BUSINESS",
                addressLine1: address.addressLine1 || (address as any).addressline1 || "",
                city: address.city || "",
                stateProvince: address.stateProvince || (address as any).stateprovince || "",
                postalCode: address.postalCode || (address as any).postalcode || "",
                country: address.country || ""
            });
        } else {
            setEditingId(null);
            setFormData({
                addressType: "BUSINESS",
                addressLine1: "",
                city: "",
                stateProvince: "",
                postalCode: "",
                country: ""
            });
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.addressLine1 || !formData.city || !user?.supplierId) return;

        try {
            if (editingId) {
                await apiClient.put(`/api/addresses/${editingId}`, formData);
                toast.success("Address updated successfully.");
            } else {
                await apiClient.post(`/api/suppliers/${user.supplierId}/addresses`, formData);
                toast.success("Address saved successfully.");
            }
            await fetchAddresses();
            refreshChangeRequests();
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Failed to save address", error);
            toast.error("Failed to save address.");
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this address?")) {
            try {
                await apiClient.delete(`/api/addresses/${id}`);
                await fetchAddresses();
                refreshChangeRequests();
            } catch (error) {
                console.error("Failed to delete address", error);
                toast.error("Failed to delete address.");
            }
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex flex-col space-y-1.5">
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>{description}                    </CardDescription>
                    </div>
                    {!isLocked && (
                        <Button onClick={() => handleOpenDialog()}>
                            <Plus className="mr-2 h-4 w-4" /> Add Address
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="mt-4">
                    <div className="grid gap-6 md:grid-cols-2">
                        {pendingAdditions.map((address, i) => (
                            <div key={`pending-${i}`} className="rounded-lg border bg-yellow-50/50 text-card-foreground shadow-sm">
                                <div className="p-6 flex flex-col space-y-1.5">
                                    <div className="flex items-center gap-2 font-semibold leading-none tracking-tight">
                                        <MapPin className="h-5 w-5 text-yellow-600" />
                                        {address.addressType}
                                        <Badge variant="outline" className="ml-auto text-yellow-600 bg-yellow-50 border-yellow-200">Pending Add</Badge>
                                    </div>
                                </div>
                                <div className="p-6 pt-0">
                                    <address className="not-italic text-sm opacity-70 mb-4">
                                        {address.addressLine1}<br />
                                        {address.city}, {address.stateProvince} {address.postalCode}<br />
                                        {address.country}
                                    </address>
                                    <div className="flex gap-2">
                                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Awaiting Approval</Badge>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {addresses.map((address) => {
                            const pendingStatus = getPendingStatus(address.addressId);
                            return (
                                <div key={address.addressId} className={`rounded-lg border bg-card text-card-foreground shadow-sm ${pendingStatus ? 'bg-blue-50/50' : ''}`}>
                                    <div className="p-6 flex flex-col space-y-1.5">
                                        <div className="flex items-center gap-2 font-semibold leading-none tracking-tight">
                                            <MapPin className={`h-5 w-5 ${pendingStatus ? 'text-blue-600' : 'text-muted-foreground'}`} />
                                            {address.addressType}
                                            {pendingStatus && <Badge variant="outline" className="ml-auto text-blue-600 bg-blue-50 border-blue-200">Pending Update</Badge>}
                                        </div>
                                    </div>
                                    <div className="p-6 pt-0">
                                        <address className="not-italic text-sm text-muted-foreground mb-4">
                                            {address.addressLine1}<br />
                                            {address.city}, {address.stateProvince} {address.postalCode}<br />
                                            {address.country}
                                        </address>
                                        <div className="flex gap-2">
                                            {pendingStatus ? (
                                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">Awaiting Approval</Badge>
                                            ) : (
                                                !isLocked && (
                                                    <>
                                                        <Button variant="outline" size="sm" onClick={() => handleOpenDialog(address)}>
                                                            <Edit2 className="h-3 w-3 mr-2" /> Edit
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(address.addressId)}>
                                                            <Trash2 className="h-3 w-3 mr-2" /> Delete
                                                        </Button>
                                                    </>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        {addresses.length === 0 && pendingAdditions.length === 0 && (
                            <div className="col-span-2 text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                                No addresses found. Please add one.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingId ? "Edit Address" : "Add New Address"}</DialogTitle>
                        <DialogDescription>Location details.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="addressType" className="text-right">Label</Label>
                            <Input
                                id="addressType"
                                placeholder="BUSINESS, BILLING, SHIPPING..."
                                value={formData.addressType || ""}
                                onChange={(e) => setFormData({ ...formData, addressType: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="addressLine1" className="text-right">Address</Label>
                            <Input
                                id="addressLine1"
                                placeholder="Street Address"
                                value={formData.addressLine1 || ""}
                                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="city" className="text-right">City</Label>
                            <Input
                                id="city"
                                placeholder="City"
                                value={formData.city || ""}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="stateProvince" className="text-right">State</Label>
                            <Input
                                id="stateProvince"
                                placeholder="State / Province"
                                value={formData.stateProvince || ""}
                                onChange={(e) => setFormData({ ...formData, stateProvince: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="postalCode" className="text-right">Postal Code</Label>
                            <Input
                                id="postalCode"
                                placeholder="Zip / Postal Code"
                                value={formData.postalCode || ""}
                                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="country" className="text-right">Country</Label>
                            <Popover open={openCountry} onOpenChange={setOpenCountry}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openCountry}
                                        className="col-span-3 justify-between"
                                    >
                                        {formData.country
                                            ? COUNTRIES.find((country) => country.value === formData.country)?.label || formData.country
                                            : "Select country..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search country..." />
                                        <CommandEmpty>No country found.</CommandEmpty>
                                        <CommandList>
                                            <CommandGroup>
                                                {COUNTRIES.map((country) => (
                                                    <CommandItem
                                                        key={country.value}
                                                        value={country.label}
                                                        onSelect={() => {
                                                            setFormData({ ...formData, country: country.value });
                                                            setOpenCountry(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                formData.country === country.value ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {country.label} ({country.value})
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" onClick={handleSave}>
                            <Save className="mr-2 h-4 w-4" /> Save Address
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
