"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ShieldAlert, Users, Loader2 } from "lucide-react";
import { useBuyerRole } from "../context/BuyerRoleContext";
import { useAuthStore } from "@/lib/store/auth-store";
import { toast } from "sonner";

export default function BuyerCirclesPage() {
    const { canManageCircles } = useBuyerRole();
    const { user } = useAuthStore();
    const [circles, setCircles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddCircleOpen, setIsAddCircleOpen] = useState(false);
    const [newCircle, setNewCircle] = useState({ name: "", description: "" });

    const fetchCircles = async () => {
        if (!user?.buyerId) return;
        try {
            setLoading(true);
            const res = await apiClient.get(`/api/circles/buyer/${user.buyerId}`) as any;
            console.log("Fetched circles with counts:", res);
            const rawCircles = res || [];
            // Map lowercase keys and fix field name mismatch (circleName vs name)
            const mappedCircles = rawCircles.map((c: any) => ({
                ...c,
                circleId: c.circleId || c.circleid,
                name: c.circleName || c.circleName || c.name || c.Name,
                description: c.description || c.Description,
                suppliers: c.suppliers || c.supplierCount || 0,
                members: c.members || c.memberCount || 0
            }));
            setCircles(mappedCircles);
        } catch (error) {
            console.error("Failed to fetch circles", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (canManageCircles) {
            fetchCircles();
        }
    }, [canManageCircles, user?.buyerId]);

    const handleAddCircle = async () => {
        if (!newCircle.name.trim() || newCircle.name.trim().length < 3) {
            toast.error("Circle name must be at least 3 characters long.");
            return;
        }
        console.log("Attempting to add circle. User buyerId:", user?.buyerId);
        if (!user?.buyerId) {
            toast.error("No Buyer organization associated with your account. Access Denied.");
            return;
        }
        try {
            console.log("Sending POST /api/circles with payload:", { buyerId: user.buyerId, ...newCircle });
            const res = await apiClient.post('/api/circles', {
                buyerId: user.buyerId,
                ...newCircle
            }) as any;
            console.log("Circle created successfully:", res);
            fetchCircles();
            setIsAddCircleOpen(false);
            setNewCircle({ name: "", description: "" });
        } catch (error) {
            console.error("Failed to create circle:", error);
            toast.error("Failed to create circle");
        }
    };

    const handleRemoveCircle = async (id: number) => {
        try {
            await apiClient.delete(`/api/circles/${id}`);
            toast.success("Circle deleted successfully");
            fetchCircles();
        } catch (error: any) {
            console.error("Failed to delete circle:", error);
            const msg = error.response?.data?.error || "Failed to delete circle";
            toast.error(msg);
        }
    };

    if (!canManageCircles) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 text-center">
                <ShieldAlert className="h-16 w-16 text-destructive" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground max-w-md">
                    You do not have permission to manage Circles. This area is restricted to Buyer Admins only.
                </p>
            </div>
        );
    }

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Circles Management</h1>
                    <p className="text-muted-foreground">Manage procurement groups and circle assignments.</p>
                </div>
                <Dialog open={isAddCircleOpen} onOpenChange={setIsAddCircleOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Circle
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Circle</DialogTitle>
                            <DialogDescription>
                                Define a new procurement group.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Circle Name</Label>
                                <Input
                                    value={newCircle.name}
                                    onChange={(e) => setNewCircle({ ...newCircle, name: e.target.value })}
                                    placeholder="e.g. Office Supplies"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Input
                                    value={newCircle.description}
                                    onChange={(e) => setNewCircle({ ...newCircle, description: e.target.value })}
                                    placeholder="Brief description of scope"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddCircleOpen(false)}>Cancel</Button>
                            <Button onClick={handleAddCircle}>Create Circle</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {circles.map((circle) => (
                    <Card key={circle.circleId}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{circle.name}</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{circle.memberCount || 0} Users</div>
                            <p className="text-sm text-muted-foreground mt-4 h-10">
                                {circle.description || "No description provided."}
                            </p>
                            <div className="flex justify-end mt-4">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive/90"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Delete Circle</DialogTitle>
                                            <DialogDescription>
                                                Are you sure you want to delete <strong>{circle.name}</strong>? This action cannot be undone.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={(e) => {
                                                const target = e.target as HTMLElement;
                                                target.closest('dialog')?.close(); // Crude but might work depending on radix version, better to manage state
                                            }}>Cancel</Button>
                                            <Button variant="destructive" onClick={() => handleRemoveCircle(circle.circleId)}>
                                                Delete Circle
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {circles.length === 0 && <p className="col-span-full text-center py-12 text-muted-foreground">No circles created yet.</p>}
            </div>
        </div>
    );
}
