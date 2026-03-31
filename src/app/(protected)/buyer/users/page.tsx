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
import { useBuyerRole } from "../context/BuyerRoleContext";
import { useAuthStore } from "@/lib/store/auth-store";
import { toast } from "sonner";

export default function BuyerUsersPage() {
    const { canManageUsers } = useBuyerRole();
    const { user: currentUser } = useAuthStore();
    const [users, setUsers] = useState<any[]>([]);
    const [circles, setCircles] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [newUser, setNewUser] = useState({ name: "", email: "", role: "BUYER", subRole: "User", circleId: "", password: "" });
    const [editingUserId, setEditingUserId] = useState<number | null>(null);

    const fetchData = async () => {
        if (!currentUser?.buyerId) return;
        try {
            setLoading(true);
            const [usersRes, circlesRes, rolesRes] = await Promise.all([
                apiClient.get(`/api/users/buyer/${currentUser.buyerId}`),
                apiClient.get(`/api/circles/buyer/${currentUser.buyerId}`),
                apiClient.get(`/api/buyers/${currentUser.buyerId}/roles`)
            ]) as any[];

            const mappedUsers = (usersRes || []).map((u: any) => ({
                ...u,
                userId: u.userId || u.userid,
                username: u.username || u.username,
                email: u.email,
                subRole: u.subRole || u.subrole,
                circleName: u.circleName || u.circlename,
                circleId: u.circleId || u.circleid
            }));
            setUsers(mappedUsers);

            // Map circles to handle Postgres lowercase keys
            const mappedCircles = (circlesRes || []).map((c: any) => ({
                ...c,
                circleId: c.circleId || c.circleid || c.id,
                name: c.circleName || c.circlename || c.name || "Unnamed Circle"
            }));
            setCircles(mappedCircles);

            const mappedRoles = (rolesRes as any).data || rolesRes || [];
            setRoles(mappedRoles);
            // Default subRole to the first available role so the dropdown isn't empty
            if (mappedRoles.length > 0) {
                const firstName = mappedRoles[0].roleName || mappedRoles[0].rolename;
                if (firstName) {
                    setNewUser(prev => ({ ...prev, subRole: prev.subRole === 'User' ? firstName : prev.subRole }));
                }
            }
        } catch (error: any) {
            console.error("Failed to fetch buyer team data", error);
            const msg = error.response?.data?.error || error.message;
            toast.error(`Error loading team data: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (canManageUsers) {
            fetchData();
        }
    }, [canManageUsers, currentUser?.buyerId]);

    const handleAddUser = async () => {
        if (!currentUser?.buyerId) {
            toast.error("Session error: buyer ID not found. Please log out and log in again.");
            return;
        }

        if (!newUser.name.trim()) {
            toast.error("Full name is required");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) {
            toast.error("Invalid email format");
            return;
        }

        try {
            const payload = {
                username: newUser.name,
                email: newUser.email,
                role: "BUYER",
                subRole: newUser.subRole,
                buyerId: currentUser.buyerId,
                circleId: newUser.circleId ? parseInt(newUser.circleId) : null,
                ...(newUser.password && !editingUserId ? { password: newUser.password } : {})
            };

            if (editingUserId) {
                await apiClient.put(`/api/users/${editingUserId}`, payload);
            } else {
                await apiClient.post('/api/users', payload);
            }
            await fetchData();
            setIsAddUserOpen(false);
            // Reset with first available role as default subRole
            const firstRole = roles.length > 0 ? (roles[0].roleName || roles[0].rolename || 'User') : 'User';
            setNewUser({ name: "", email: "", role: "BUYER", subRole: firstRole, circleId: "", password: "" });
            setEditingUserId(null);
            toast.success(editingUserId ? "User updated successfully" : "User created successfully");
        } catch (error: any) {
            const apiError = error?.response?.data?.error || error?.message || '';
            if (apiError.toLowerCase().includes('email')) {
                toast.error(apiError || "Invalid email address");
            } else if (apiError.toLowerCase().includes('already exists') || apiError.toLowerCase().includes('duplicate') || apiError.toLowerCase().includes('unique')) {
                toast.error("A user with this email already exists");
            } else if (apiError.toLowerCase().includes('password')) {
                toast.error(apiError || "Password does not meet requirements (minimum 8 characters)");
            } else {
                toast.error(apiError || "Failed to save user. Please try again.");
            }
        }
    };

    const handleEditUser = (user: any) => {
        setNewUser({
            name: user.username,
            email: user.email,
            role: user.role,
            subRole: user.subRole || "User",
            circleId: user.circleId?.toString() || "",
            password: ""
        });
        setEditingUserId(user.userId);
        setIsAddUserOpen(true);
    };

    const [userToDelete, setUserToDelete] = useState<any>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const handleRemoveUser = async () => {
        if (!userToDelete) return;
        try {
            await apiClient.delete(`/api/users/${userToDelete.userId}`);
            toast.success("User removed successfully");
            fetchData();
            setIsDeleteOpen(false);
            setUserToDelete(null);
        } catch (error) {
            toast.error("Failed to remove user");
        }
    };

    if (!canManageUsers) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 text-center">
                <ShieldAlert className="h-16 w-16 text-destructive" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground max-w-md">
                    You do not have permission to access User Management. This area is restricted to Buyer Admins only.
                </p>
            </div>
        );
    }

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                    <p className="text-muted-foreground">Manage users and assign them to procurement circles.</p>
                </div>
                <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                    <DialogTrigger asChild>
                        <Button data-testid="add-user-btn">
                            <Plus className="mr-2 h-4 w-4" />
                            Add User
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingUserId ? "Edit User" : "Add New User"}</DialogTitle>
                            <DialogDescription>
                                Create a new account and assign a circle.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Full Name / Username</Label>
                                <Input
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                    placeholder="Jane Doe"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    placeholder="jane@buyer.com"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Role</Label>
                                    <Select
                                        value={newUser.subRole}
                                        onValueChange={(val: string) => setNewUser({ ...newUser, subRole: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roles.map((r: any) => (
                                                <SelectItem key={r.roleId || r.roleid} value={r.roleName || r.rolename}>
                                                    {r.roleName || r.rolename}
                                                </SelectItem>
                                            ))}
                                            {roles.length === 0 && <SelectItem value="User" disabled>No roles found</SelectItem>}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Assign a dynamic role for specific approval workflows.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Assigned Circle</Label>
                                    <Select
                                        value={newUser.circleId}
                                        onValueChange={(val: string) => setNewUser({ ...newUser, circleId: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a circle" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {circles.filter(c => c && (c.circleId || c.id)).map(c => {
                                                const id = c.circleId || c.id;
                                                return (
                                                    <SelectItem key={id} value={id.toString()}>{c.name}</SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
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
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                        Active users in your buying organization.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Circle</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.userId}>
                                    <TableCell className="font-medium">{user.username}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.subRole === "Admin" ? "default" : "secondary"}>
                                            {user.subRole || "User"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{user.circleName || "None"}</TableCell>
                                    <TableCell className="text-right">
                                        <ActionMenu items={[
                                            { label: "Edit User", onClick: () => handleEditUser(user) },
                                            {
                                                label: "Remove User",
                                                onClick: () => {
                                                    setUserToDelete(user);
                                                    setIsDeleteOpen(true);
                                                },
                                                className: "text-destructive"
                                            }
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
                                        No team members found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove <strong>{userToDelete?.username}</strong>? This user will no longer have access to the platform.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleRemoveUser}>Remove User</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
