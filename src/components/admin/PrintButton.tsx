"use client";
export function PrintButton({ label = "🖨️ Print" }: { label?: string }) {
  return <button className="btn-ghost" onClick={() => window.print()}>{label}</button>;
}
