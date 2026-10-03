import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ProfileInput } from "@dial/contracts";

/*
  Deterministic CV template (A4). Pure JavaScript with PDF standard fonts built in, so it needs no font files at runtime:
  that matters on serverless hosts, where files loaded dynamically at runtime are not shipped with the function.
*/
const INK = rgb(0x29 / 255, 0x23 / 255, 0x2e / 255);
const MUTED = rgb(0x61 / 255, 0x5c / 255, 0x63 / 255);
const RULE = rgb(0xda / 255, 0xd6 / 255, 0xce / 255);
const PAGE = { w: 595.28, h: 841.89 };
const M = { top: 48, bottom: 56, x: 54 };
const CONTENT_W = PAGE.w - M.x * 2;

// Standard PDF fonts cover Latin-1 only: map common typography to ASCII, strip control characters, replace the rest.
const typographic: Record<string, string> = { "–": "-", "—": "-", "‘": "'", "’": "'", "“": '"', "”": '"', "…": "...", " ": " " };
const clean = (s: string) =>
  s.replace(/[–—‘’“”… ]/g, (c) => typographic[c] ?? c)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/\r?\n/g, " ").replace(/[^ -ÿ]/g, "?");

export interface CvInput { profile: ProfileInput; selectedEntryIds: string[]; wording: { entryId: string; bullets: string[] }[] }

const kindTitle: Record<string, string> = { experience: "Experience", project: "Projects", education: "Education", certification: "Certifications", skill: "Skills" };

function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    // A single word longer than the line is hard-split so nothing overflows the margin.
    let w = word;
    while (font.widthOfTextAtSize(w, size) > maxW) {
      let cut = w.length - 1;
      while (cut > 1 && font.widthOfTextAtSize(w.slice(0, cut), size) > maxW) cut--;
      if (line) { lines.push(line); line = ""; }
      lines.push(w.slice(0, cut)); w = w.slice(cut);
    }
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= maxW) line = next; else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}

/** Selected entries come first and use the (validated) reworded bullets. */
export async function renderCvPdf({ profile, selectedEntryIds, wording }: CvInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${clean(profile.fullName)} - CV`); doc.setAuthor(clean(profile.fullName)); doc.setProducer("Dial");
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = doc.addPage([PAGE.w, PAGE.h]);
  let y = PAGE.h - M.top;
  const newPage = () => { page = doc.addPage([PAGE.w, PAGE.h]); y = PAGE.h - M.top; };
  const need = (h: number) => { if (y - h < M.bottom) newPage(); };
  const text = (t: string, x: number, size: number, font: PDFFont, color = INK) => page.drawText(t, { x, y: y - size, size, font, color });
  const para = (t: string, size: number, font: PDFFont, color = INK, indent = 0, leading = 1.45) => {
    for (const l of wrap(clean(t), font, size, CONTENT_W - indent)) { need(size * leading); text(l, M.x + indent, size, font, color); y -= size * leading; }
  };

  text(clean(profile.fullName), M.x, 22, bold); y -= 22 * 1.3;
  if (profile.headline) { text(clean(profile.headline), M.x, 11, reg, MUTED); y -= 11 * 1.4; }
  text(clean(profile.email), M.x, 9, reg, MUTED); y -= 9 * 1.4 + 10;

  const heading = (t: string) => {
    need(40); y -= 8;
    const label = clean(t).toUpperCase();
    page.drawText(label, { x: M.x, y: y - 9, size: 9, font: bold, color: INK });
    y -= 9 + 4; page.drawLine({ start: { x: M.x, y }, end: { x: PAGE.w - M.x, y }, thickness: 0.75, color: RULE }); y -= 8;
  };

  if (profile.summary) { heading("Summary"); para(profile.summary, 10, reg); }

  const w = new Map(wording.map((x) => [x.entryId, x.bullets]));
  const sel = new Set(selectedEntryIds);
  for (const k of ["experience", "project", "education", "certification", "skill"]) {
    const items = profile.entries.filter((e) => e.kind === k).sort((a, b) => Number(sel.has(b.id)) - Number(sel.has(a.id)));
    if (!items.length) continue;
    heading(kindTitle[k]!);
    for (const e of items) {
      const bullets = sel.has(e.id) && w.get(e.id)?.length ? (w.get(e.id) as string[]) : e.bullets;
      const bl = bullets.map((b) => wrap(clean(b), reg, 10, CONTENT_W - 12));
      // Keep an entry together on one page when it fits (as the earlier template did).
      const height = 10.5 * 1.45 + (e.organization ? 10 * 1.45 : 0) + bl.reduce((n, l) => n + l.length * 10 * 1.45 + 2, 0) + 8;
      need(Math.min(height, PAGE.h - M.top - M.bottom));
      const dates = clean([e.start, e.end].filter(Boolean).join(" - "));
      text(clean(e.title), M.x, 10.5, bold);
      if (dates) text(dates, PAGE.w - M.x - reg.widthOfTextAtSize(dates, 9), 9, reg, MUTED);
      y -= 10.5 * 1.45;
      if (e.organization) { text(clean(e.organization), M.x, 10, reg, MUTED); y -= 10 * 1.45; }
      for (const lines of bl) {
        lines.forEach((l, i) => { need(10 * 1.45); if (i === 0) text("•", M.x, 10, reg); text(l, M.x + 12, 10, reg); y -= 10 * 1.45; });
        y -= 2;
      }
      y -= 8;
    }
  }

  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const label = `${i + 1} / ${pages.length}`;
    p.drawText(label, { x: PAGE.w - M.x - reg.widthOfTextAtSize(label, 8), y: 28, size: 8, font: reg, color: MUTED });
  });
  return doc.save();
}
