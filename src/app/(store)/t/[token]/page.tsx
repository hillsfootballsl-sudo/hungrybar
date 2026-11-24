import { notFound } from "next/navigation";
import { TableStart } from "@/components/store/TableStart";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TablePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await db.diningTable.findUnique({ where: { token } });
  if (!t || !t.active) notFound();
  return <TableStart token={t.token} label={t.label} />;
}
