import type { ReactNode } from "react";
import { requireAdminPageAccess } from "@/lib/admin-auth";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdminPageAccess();
  return children;
}
