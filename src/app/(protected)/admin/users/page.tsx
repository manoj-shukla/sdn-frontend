"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActionMenu } from "@/components/ui/action-menu";
import { Plus, ShieldAlert, MoreHorizontal, Loader2 } from "lucide-react";
import { useAdminRole } from "../context/AdminRoleContext";
import { toast } from "sonner";

export default function AdminUsersPage() {
    const { canCreateAdmins } = useAdminRole();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [newUser, setNewUser] = useState({ name: "", email: "", role: "User", password: "" });
    const [editingUserId, setEditingUserId] = useState<number | null>(null);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/api/users') as any;
            // Backend returns paginated { users: [...], total, page, pageSize }
            const userList: any[] = Array.isArray(res) ? res : (res.users || []);
            const mappedUsers = userList.map((u: any) => ({
                id: u.userId || u.userid,
                name: u.username,
                email: u.email,
                role: u.subRole || u.subrole || "Admin",
                status: "Active"
            }));
            setUsers(mappedUsers);
        } catch (error: any) {
            console.error("Failed to fetch internal users", error);
            if (error.response) {
                console.error("Error Status:", error.response.status);
                console.error("Error Data:", error.response.data);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (canCreateAdmins) {
            fetchUsers();
        }
    }, [canCreateAdmins]);

    const handleAddUser = async () => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) {
            toast.error("Invalid email format");
            return;
        }

        try {
            const payload: any = {
                username: newUser.name,
                email: newUser.email,
                role: "ADMIN",
                subRole: newUser.role
            };
            // Only include password for new users, not when editing
            if (!editingUserId && newUser.password) {
                payload.password = newUser.password;
            }

            if (editingUserId) {
                await apiClient.put(`/api/users/${editingUserId}`, payload);
            } else {
                await apiClient.post('/api/users', payload);
            }
            fetchUsers();
            setIsAddUserOpen(false);
            setNewUser({ name: "", email: "", role: "User", password: "" });
            setEditingUserId(null);
        } catch (error: any) {
            const apiError = error?.response?.data?.error;
            if (apiError === "Invalid email format") {
                toast.error("Invalid email format");
            } else {
                toast.error("Failed to save user");
            }
        }
    };

    const handleEditUser = (user: any) => {
        setNewUser({ name: user.name, email: user.email, role: user.role, password: "" });
        setEditingUserId(user.id);
        setIsAddUserOpen(true);
    };

    const handleRemoveUser = async (id: number) => {
        if (confirm("Are you sure you want to remove this user?")) {
            try {
                await apiClient.delete(`/api/users/${id}`);
                fetchUsers();
            } catch (error) {
                toast.error("Failed to remove user");
            }
        }
    };

    if (!canCreateAdmins) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 text-center">
                <ShieldAlert className="h-16 w-16 text-destructive" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground max-w-md">
                    Only Super Admins can manage internal admin users.
                </p>
            </div>
        );
    }

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Internal Users</h1>
                    <p className="text-muted-foreground">Manage Super Admins, company users.</p>
                </div>
                <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add User
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingUserId ? "Edit User" : "Add Internal User"}</DialogTitle>
                            <DialogDescription>
                                Create a new internal user account.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Full Name / Username</Label>
                                <Input
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    placeholder="john@admin.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select
                                    value={newUser.role}
                                    onValueChange={(val: string) => setNewUser({ ...newUser, role: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="User">User (View Only)</SelectItem>
                                        <SelectItem value="Super Admin">Super Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {!editingUserId && (
                                <div className="space-y-2">
                                    <Label>Password (Optional)</Label>
                                    <Input
                                        type="password"
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        placeholder="Leave empty for default"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Default password: SDNtech123!
                                    </p>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
                            <Button onClick={handleAddUser}>{editingUserId ? "Save Changes" : "Create User"}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Internal Team</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{user.role}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="text-green-600 bg-green-50">
                                            {user.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <ActionMenu items={[
                                            { label: "Edit User", onClick: () => handleEditUser(user) },
                                            { label: "Remove User", onClick: () => handleRemoveUser(user.id), className: "text-destructive" }
                                        ]}>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </ActionMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {users.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                        No internal users found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
