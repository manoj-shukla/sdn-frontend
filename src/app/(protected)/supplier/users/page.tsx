"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActionMenu } from "@/components/ui/action-menu";
import { Plus, Trash2, ShieldAlert, MoreHorizontal } from "lucide-react";
import { useSupplierRole } from "../context/SupplierRoleContext";

export default function SupplierUsersPage() {
    const { canManageUsers } = useSupplierRole();
    const [users, setUsers] = useState([
        { id: 1, name: "Alice Admin", email: "alice@acme.com", role: "Admin", status: "Active" },
        { id: 2, name: "Bob User", email: "bob@acme.com", role: "User", status: "Active" },
    ]);

    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [newUser, setNewUser] = useState({ name: "", email: "", role: "User" });
    const [editingUserId, setEditingUserId] = useState<number | null>(null);

    const handleAddUser = () => {
        if (editingUserId) {
            setUsers(users.map(u => u.id === editingUserId ? { ...u, ...newUser } : u));
            setEditingUserId(null);
        } else {
            setUsers([...users, { id: Date.now(), ...newUser, status: "Active" }]);
        }
        setIsAddUserOpen(false);
        setNewUser({ name: "", email: "", role: "User" });
    };

    const handleEditUser = (user: any) => {
        setNewUser({ name: user.name, email: user.email, role: user.role });
        setEditingUserId(user.id);
        setIsAddUserOpen(true);
    };

    const handleRemoveUser = (id: number) => {
        if (confirm("Are you sure you want to remove this user?")) {
            setUsers(users.filter(u => u.id !== id));
        }
    };

    if (!canManageUsers) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 text-center">
                <ShieldAlert className="h-16 w-16 text-destructive" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground max-w-md">
                    You do not have permission to access User Management. This area is restricted to Supplier Admins only.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                    <p className="text-muted-foreground">Manage user access and roles for your organization.</p>
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
                            <DialogTitle>{editingUserId ? "Edit User" : "Add New User"}</DialogTitle>
                            <DialogDescription>
                                Create a new account for your organization.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
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
                                    placeholder="jane@company.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select
                                    value={newUser.role}
                                    onValueChange={(val) => setNewUser({ ...newUser, role: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Admin">Admin</SelectItem>
                                        <SelectItem value="User">User</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
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
                        Active users with access to your supplier portal.
                    </CardDescription>
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
                                        <Badge variant={user.role === "Admin" ? "default" : "secondary"}>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
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
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
