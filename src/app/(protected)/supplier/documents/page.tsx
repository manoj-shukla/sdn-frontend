"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SupplierDocumentManagement } from "@/components/supplier/document-management";

export default function SupplierDocumentsPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">Upload and manage compliance documents.</p>
        </div>
      </div>

      <SupplierDocumentManagement />
    </div>
  );
}
