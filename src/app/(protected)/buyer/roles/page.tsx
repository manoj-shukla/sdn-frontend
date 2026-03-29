"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Role {
    roleId: number;
    roleName: string;
    description: string;
    permissions: string[]; // JSON string from DB converted to array
}

const AVAILABLE_PERMISSIONS = [
    { id: "CAN_INVITE", label: "Invite Suppliers" },
    { id: "CAN_APPROVE", label: "Approve Suppliers" },
    { id: "CAN_REJECT", label: "Reject Suppliers" },
    { id: "VIEW_WORKFLOWS", label: "View Full Workflows" },
    { id: "MANAGE_WORKFLOWS", label: "Create/Edit Workflows" },
    { id: "VIEW_OWN_TASKS", label: "View Only Assigned Tasks" },
];

import { useBuyerRole } from "../context/BuyerRoleContext";

export default function RolesPage() {
    const { user } = useAuthStore();
    const { refreshSandboxRoles } = useBuyerRole();
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form State
    const [newRoleName, setNewRoleName] = useState("");
    const [newRoleDesc, setNewRoleDesc] = useState("");
    const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

    useEffect(() => {
        if (user?.buyerId) {
            fetchRoles();
        }
    }, [user?.buyerId]);

    const fetchRoles = async () => {
        if (!user?.buyerId) return;
        console.log("Fetching roles for buyerId:", user.buyerId, typeof user.buyerId);
        try {
            const res = await apiClient.get(`/api/buyers/${user?.buyerId}/roles`);
            // Parse permissions if they come as string
            const parsedRoles = (res.data as any[]).map(r => ({
                roleId: r.roleId || r.roleid,
                roleName: r.roleName || r.rolename,
                description: r.description,
                permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions
            }));
            setRoles(parsedRoles);
        } catch (error) {
            console.error("Failed to fetch roles", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateRole = async () => {
        if (!newRoleName.trim() || newRoleName.trim().length < 3) {
            toast.error("Role name must be at least 3 characters long.");
            return;
        }
        setIsCreating(true);
        try {
            await apiClient.post(`/api/buyers/${user?.buyerId}/roles`, {
                roleName: newRoleName,
                description: newRoleDesc,
                permissions: selectedPerms
            });
            setIsDialogOpen(false);
            resetForm();
            toast.success("Role created successfully.");
            fetchRoles();
            refreshSandboxRoles();
        } catch (error: any) {
            console.error("Failed to create role", error);
            const msg = error.response?.data?.error || "Failed to create role.";
            toast.error(msg);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteRole = async (roleId: number) => {
        try {
            await apiClient.delete(`/api/buyers/${user?.buyerId}/roles/${roleId}`);
            toast.success("Role deleted successfully.");
            fetchRoles();
            refreshSandboxRoles();
        } catch (error: any) {
            console.error("Failed to delete role", error);
            const msg = error.response?.data?.error || "Failed to delete role.";
            toast.error(msg);
        }
    };

    const resetForm = () => {
        setNewRoleName("");
        setNewRoleDesc("");
        setSelectedPerms([]);
    };

    const togglePerm = (permId: string) => {
        setSelectedPerms(prev =>
            prev.includes(permId)
                ? prev.filter(p => p !== permId)
                : [...prev, permId]
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Role Management</h1>
                    <p className="text-muted-foreground">Define roles and permissions for your team.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="mr-2 h-4 w-4" /> Create Role
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Role</DialogTitle>
                            <DialogDescription>
                                Define a new role and assign specific permissions.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Role Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Procurement Manager"
                                    value={newRoleName}
                                    onChange={(e) => setNewRoleName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="desc">Description</Label>
                                <Textarea
                                    id="desc"
                                    placeholder="What does this role do?"
                                    value={newRoleDesc}
                                    onChange={(e) => setNewRoleDesc(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Permissions</Label>
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    {AVAILABLE_PERMISSIONS.map((perm) => (
                                        <div key={perm.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={perm.id}
                                                checked={selectedPerms.includes(perm.id)}
                                                onCheckedChange={() => togglePerm(perm.id)}
                                            />
                                            <label
                                                htmlFor={perm.id}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                {perm.label}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateRole} disabled={isCreating}>
                                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Role
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {roles.map((role) => (
                        <Card key={role.roleId}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-base font-medium">
                                    {role.roleName}
                                </CardTitle>
                                <Shield className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4 h-10 line-clamp-2">
                                    {role.description || "No description provided."}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {role.permissions && role.permissions.length > 0 ? role.permissions.map((p) => (
                                        <span key={p} className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground ring-1 ring-inset ring-gray-500/10">
                                            {AVAILABLE_PERMISSIONS.find(ap => ap.id === p)?.label || p}
                                        </span>
                                    )) : (
                                        <span className="text-xs text-muted-foreground italic">No permissions</span>
                                    )}
                                </div>

                                <div className="flex justify-end mt-4 pt-4 border-t">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/90 p-0 h-8">
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete Role
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Delete Role</DialogTitle>
                                                <DialogDescription>
                                                    Are you sure you want to delete the <strong>{role.roleName}</strong> role? This will fail if users are still assigned to it.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <DialogFooter>
                                                <Button variant="outline">Cancel</Button>
                                                <Button variant="destructive" onClick={() => handleDeleteRole(role.roleId)}>
                                                    Confirm Delete
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {roles.length === 0 && (
                        <div className="col-span-full text-center p-8 text-muted-foreground border rounded-lg border-dashed">
                            No roles defined yet. Create one to get started.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
