"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ActionMenu } from "@/components/ui/action-menu";
import { RFIStatusBadge } from "@/components/rfi/RFIStatusBadge";
import { FileText, Plus, Search, Loader2, MoreHorizontal, Archive, Copy, Globe } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { RFITemplate } from "@/types/rfi";

export default function BuyerRFITemplatesPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<RFITemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get("/api/rfi/templates") as any;
            const raw = res.content || (Array.isArray(res) ? res : []);
            setTemplates(raw);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load templates");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handlePublish = async (id: number) => {
        try {
            await apiClient.post(`/api/rfi/templates/${id}/publish`);
            toast.success("Template published.");
            fetchTemplates();
        } catch (err) {
            toast.error("Failed to publish template.");
        }
    };

    const handleArchive = async (id: number) => {
        if (!confirm("Archive this template? It will no longer be available for new RFI events.")) return;
        try {
            await apiClient.post(`/api/rfi/templates/${id}/archive`);
            toast.success("Template archived.");
            fetchTemplates();
        } catch (err) {
            toast.error("Failed to archive template.");
        }
    };

    const handleNewVersion = async (id: number) => {
        try {
            const res = await apiClient.post(`/api/rfi/templates/${id}/new-version`) as any;
            const newId = res.templateId || res.id;
            toast.success("New version created as draft.");
            router.push(`/buyer/rfi/templates/${newId}/edit`);
        } catch (err) {
            toast.error("Failed to create new version.");
        }
    };

    const filtered = templates.filter((t) =>
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.category?.toLowerCase().includes(search.toLowerCase())
    );

    const stats = {
        total: templates.length,
        published: templates.filter((t) => t.status === "PUBLISHED").length,
        draft: templates.filter((t) => t.status === "DRAFT").length,
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 p-4 bg-[#f8fafc] min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <FileText className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 data-testid="template-library-heading" className="text-3xl font-extrabold text-[#1e293b] tracking-tight">Template Library</h1>
                        <p className="text-muted-foreground text-sm">Manage RFI questionnaire templates</p>
                    </div>
                </div>
                <Button data-testid="create-template-btn" asChild>
                    <Link href="/buyer/rfi/templates/create">
                        <Plus className="h-4 w-4 mr-2" /> Create Template
                    </Link>
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Total", value: stats.total },
                    { label: "Published", value: stats.published },
                    { label: "Draft", value: stats.draft },
                ].map((s) => (
                    <Card key={s.label}>
                        <CardHeader className="py-4 px-5">
                            <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
                            <div className="text-2xl font-bold">{s.value}</div>
                        </CardHeader>
                    </Card>
                ))}
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>All Templates</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search templates…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Version</TableHead>
                                    <TableHead>Sections</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Updated</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((t) => {
                                    const actions = [
                                        ...(t.status === "DRAFT"
                                            ? [
                                                  {
                                                      label: "Edit Template",
                                                      "data-testid": `template-edit-btn-${t.templateId}`,
                                                      onClick: () => {
                                                          window.location.href = `/buyer/rfi/templates/${t.templateId}/edit`;
                                                      },
                                                  },
                                                  {
                                                      label: "Publish",
                                                      "data-testid": `template-publish-btn-${t.templateId}`,
                                                      onClick: () => handlePublish(t.templateId),
                                                  },
                                              ]
                                            : []),
                                        {
                                            label: "New Version",
                                            "data-testid": `template-new-version-btn-${t.templateId}`,
                                            onClick: () => handleNewVersion(t.templateId),
                                        },
                                        ...(t.status !== "ARCHIVED"
                                            ? [
                                                  {
                                                      label: "Archive",
                                                      "data-testid": `template-archive-btn-${t.templateId}`,
                                                      onClick: () => handleArchive(t.templateId),
                                                      className: "text-destructive",
                                                  },
                                              ]
                                            : []),
                                    ] as any[];

                                    return (
                                        <TableRow key={t.templateId} data-testid={`template-card-${t.templateId}`}>
                                            <TableCell className="font-medium">
                                                <Link
                                                    href={`/buyer/rfi/templates/${t.templateId}/edit`}
                                                    className="hover:underline"
                                                >
                                                    {t.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                {t.category && (
                                                    <span className="text-sm">
                                                        {t.category}
                                                        {t.subcategory && (
                                                            <span className="text-muted-foreground"> / {t.subcategory}</span>
                                                        )}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">v{t.version}</Badge>
                                            </TableCell>
                                            <TableCell>{t.sections?.length ?? 0}</TableCell>
                                            <TableCell data-testid={`template-status-${t.templateId}`}>
                                                <RFIStatusBadge status={t.status} />
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {t.updatedAt
                                                    ? new Date(t.updatedAt).toLocaleDateString()
                                                    : new Date(t.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <ActionMenu items={actions}>
                                                    <Button data-testid={`template-action-menu-${t.templateId}`} variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </ActionMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                            {templates.length === 0
                                                ? "No templates yet. Create one to get started."
                                                : "No templates match your search."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
