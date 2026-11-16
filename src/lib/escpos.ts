// Minimal ESC/POS encoder for 58/80mm thermal printers.
import { charsFor, colsLine, type Op, wrap } from "./receipt";

const ESC = 0x1b;
const GS = 0x1d;

export function encodeEscPos(ops: Op[], paperWidth: number, logo?: { width: number; height: number; data: Uint8Array } | null): Uint8Array {
  const out: number[] = [ESC, 0x40]; // init
  const W = charsFor(paperWidth);
  const text = (s: string) => {
    for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0x7f);
    out.push(0x0a);
  };
  const align = (a?: string) => out.push(ESC, 0x61, a === "center" ? 1 : a === "right" ? 2 : 0);
  const bold = (b?: boolean) => out.push(ESC, 0x45, b ? 1 : 0);
  const size = (n?: number) => out.push(GS, 0x21, n === 2 ? 0x11 : 0x00);
  const invert = (b?: boolean) => out.push(GS, 0x42, b ? 1 : 0);

  for (const op of ops) {
    switch (op.t) {
      case "logo":
        if (logo) {
          align("center");
          const xBytes = logo.width / 8;
          out.push(GS, 0x76, 0x30, 0x00, xBytes & 0xff, (xBytes >> 8) & 0xff, logo.height & 0xff, (logo.height >> 8) & 0xff);
          for (const b of logo.data) out.push(b);
          out.push(0x0a);
        }
        break;
      case "text": {
        align(op.align);
        bold(op.bold);
        size(op.size);
        invert(op.invert);
        const width = op.size === 2 ? Math.floor(W / 2) : W;
        const t = op.invert ? ` ${op.text} ` : op.text;
        for (const l of wrap(t, width)) text(l);
        invert(false);
        size(1);
        bold(false);
        break;
      }
      case "cols": {
        align("left");
        bold(op.bold);
        size(op.size);
        const width = op.size === 2 ? Math.floor(W / 2) : W;
        for (const l of colsLine(op.left, op.right, width)) text(l);
        size(1);
        bold(false);
        break;
      }
      case "rule":
        align("left");
        text((op.char ?? "-").repeat(W));
        break;
      case "qr": {
        align("center");
        const data = Array.from(new TextEncoder().encode(op.data));
        const len = data.length + 3;
        out.push(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00); // model 2
        out.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, paperWidth === 58 ? 5 : 6); // module size
        out.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31); // error level M
        out.push(GS, 0x28, 0x6b, len & 0xff, (len >> 8) & 0xff, 0x31, 0x50, 0x30, ...data);
        out.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
        out.push(0x0a);
        break;
      }
      case "feed":
        out.push(ESC, 0x64, op.n);
        break;
      case "cut":
        out.push(GS, 0x56, 0x42, 0x00);
        break;
      case "drawer":
        out.push(ESC, 0x70, 0x00, 0x19, 0xfa);
        break;
    }
  }
  return new Uint8Array(out);
}
