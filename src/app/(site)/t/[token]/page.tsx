import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { TableClient } from "./TableClient";

export const dynamic = "force-dynamic";

export default async function TablePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await db.diningTable.findUnique({ where: { token } });
  if (!t || !t.active) notFound();
  return <TableClient token={t.token} label={t.label} />;
}
