import { AdminNav } from "@/components/admin/AdminNav";
import { MANAGERS, requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Admin", template: "%s · Hungry Bar Admin" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireStaff(MANAGERS);
  return (
    <div className="staff flex min-h-screen">
      <AdminNav name={s.name} />
      <main className="min-w-0 flex-1 px-4 pb-16 pt-20 lg:px-8">{children}</main>
    </div>
  );
}
