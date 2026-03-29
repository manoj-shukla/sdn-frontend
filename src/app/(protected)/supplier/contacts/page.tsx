"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { SupplierContactManagement } from "@/components/supplier/contact-management";
import { useAuthStore } from "@/lib/store/auth-store";

export default function SupplierContactsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isLocked = ['PENDING', 'APPROVED', 'SUBMITTED', 'PRE_APPROVED'].includes(user?.approvalStatus || '');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">Manage authorized personnel for your organization.</p>
        </div>
      </div>

      <SupplierContactManagement
        title="Authorized Contacts"
        description="People who can access this portal or be contacted by buyers."
      />

      <div className="flex justify-end items-center gap-4">
        {isLocked && (
          <div className="flex items-center text-sm text-muted-foreground">
            <AlertCircle className="mr-2 h-4 w-4" />
            Fields are locked
          </div>
        )}
        <Button
          variant={isLocked ? "outline" : "default"}
          onClick={() => router.push('/supplier/tax')}
        >
          Next: Tax Information
        </Button>
      </div>
    </div>
  );
}
