import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { PasswordForm } from "./PasswordForm";

export const metadata: Metadata = { title: "Change password" };

export default async function AccountPage() {
  const admin = await requireAdmin();
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Account"
        title="Change password"
        description={`Signed in as ${admin.email}. Changing the password signs out every other device.`}
      />
      <PasswordForm />
    </div>
  );
}
