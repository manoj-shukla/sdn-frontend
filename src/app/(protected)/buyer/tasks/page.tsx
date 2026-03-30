'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { CheckSquare, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MyTasksPage() {
    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage and track your pending onboarding actions and approvals.
                    </p>
                </div>
                <div className="bg-primary/10 p-3 rounded-full">
                    <CheckSquare className="h-6 w-6 text-primary" />
                </div>
            </div>

            <Card className="border-dashed border-2 bg-muted/30">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="h-20 w-20 rounded-full bg-background flex items-center justify-center mb-6 shadow-sm">
                        <Inbox className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">No tasks found</h2>
                    <p className="text-muted-foreground max-w-xs mx-auto mb-8">
                        You're all caught up! There are currently no onboarding tasks or approvals requiring your attention.
                    </p>
                    <Button variant="outline" onClick={() => window.location.reload()}>
                        Refresh Tasks
                    </Button>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-primary">0</div>
                        <p className="text-sm text-muted-foreground">Pending Approvals</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-amber-500">0</div>
                        <p className="text-sm text-muted-foreground">Rework Requests</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-500">0</div>
                        <p className="text-sm text-muted-foreground">Completed Today</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
