import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

type Message = { guest_name: string | null; text: string; created_at: string };
type Labels = { title: string; guest: string; empty: string; page: string };

const PAGE = { width: 595.28, height: 841.89 }; // A4
const MARGIN = 64;
const CONTENT_WIDTH = PAGE.width - MARGIN * 2;
const COLORS = { paper: rgb(0.973, 0.953, 0.925), ink: rgb(0.141, 0.192, 0.176), muted: rgb(0.435, 0.494, 0.467), coral: rgb(0.788, 0.435, 0.361), line: rgb(0.86, 0.83, 0.79) };

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) { line = candidate; continue; }
      if (line) lines.push(line);
      // Break words longer than a whole line character by character.
      line = "";
      for (const char of word) {
        if (font.widthOfTextAtSize(line + char, size) > maxWidth) { lines.push(line); line = ""; }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function createGuestbookPdf(event: { title: string; event_date?: string | null }, messages: Message[], locale: string, labels: Labels) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`${event.title} – ${labels.title}`);
  const fontDir = path.join(process.cwd(), "lib/fonts");
  const [regular, italic] = await Promise.all([
    readFile(path.join(fontDir, "Lora.ttf")).then((bytes) => pdf.embedFont(bytes, { subset: false })),
    readFile(path.join(fontDir, "Lora-Italic.ttf")).then((bytes) => pdf.embedFont(bytes, { subset: false })),
  ]);
  // Drop characters the font cannot draw (emoji etc.) instead of printing empty boxes.
  const supported = new Set(regular.getCharacterSet());
  const printable = (text: string) => Array.from(text).filter((char) => char === "\n" || supported.has(char.codePointAt(0)!)).join("").replace(/[ \t]+/g, " ").trim();
  const formatDate = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(value));

  let page: PDFPage;
  let y = 0;
  const newPage = () => {
    page = pdf.addPage([PAGE.width, PAGE.height]);
    page.drawRectangle({ x: 0, y: 0, width: PAGE.width, height: PAGE.height, color: COLORS.paper });
    y = PAGE.height - MARGIN;
  };
  const centered = (text: string, font: PDFFont, size: number, color = COLORS.ink) => {
    page.drawText(text, { x: (PAGE.width - font.widthOfTextAtSize(text, size)) / 2, y, size, font, color });
  };

  newPage();
  y -= 40;
  // Brand mark "O♥An": the heart is drawn as a path because Lora has no ♥ glyph.
  const brandSize = 14;
  const oWidth = italic.widthOfTextAtSize("O", brandSize);
  const brandWidth = oWidth + 12 + italic.widthOfTextAtSize("An", brandSize);
  const brandX = (PAGE.width - brandWidth) / 2;
  page!.drawText("O", { x: brandX, y, size: brandSize, font: italic, color: COLORS.coral });
  page!.drawSvgPath("M5 9 C5 9 0 5.5 0 2.6 C0 1 1.2 0 2.5 0 C3.6 0 4.5 0.7 5 1.6 C5.5 0.7 6.4 0 7.5 0 C8.8 0 10 1 10 2.6 C10 5.5 5 9 5 9 Z", { x: brandX + oWidth + 1, y: y + 9, scale: 1, color: rgb(0.86, 0.15, 0.15) });
  page!.drawText("An", { x: brandX + oWidth + 12, y, size: brandSize, font: italic, color: COLORS.coral });
  y -= 50;
  for (const line of wrap(printable(event.title), italic, 34, CONTENT_WIDTH)) { centered(line, italic, 34); y -= 40; }
  y -= 4;
  centered(labels.title.toLocaleUpperCase(locale), regular, 10, COLORS.muted);
  if (event.event_date) { y -= 18; centered(formatDate(`${event.event_date}T12:00:00`), regular, 11, COLORS.muted); }
  y -= 36;
  page!.drawLine({ start: { x: PAGE.width / 2 - 40, y }, end: { x: PAGE.width / 2 + 40, y }, thickness: 0.8, color: COLORS.coral });
  y -= 44;

  if (messages.length === 0) centered(labels.empty, italic, 13, COLORS.muted);

  const textSize = 13;
  const lineHeight = 20;
  for (const [index, message] of messages.entries()) {
    const lines = wrap(printable(message.text), regular, textSize, CONTENT_WIDTH);
    const blockHeight = lines.length * lineHeight + 50;
    // Keep short messages together; long ones may continue on the next page.
    if (y - Math.min(blockHeight, 140) < MARGIN) newPage();
    for (const line of lines) {
      if (y - lineHeight < MARGIN) newPage();
      page!.drawText(line, { x: MARGIN, y, size: textSize, font: regular, color: COLORS.ink });
      y -= lineHeight;
    }
    y -= 4;
    page!.drawText(`— ${printable(message.guest_name ?? "") || labels.guest} · ${formatDate(message.created_at)}`, { x: MARGIN, y, size: 10.5, font: italic, color: COLORS.coral });
    y -= 30;
    if (index < messages.length - 1 && y - 20 > MARGIN) {
      page!.drawLine({ start: { x: MARGIN, y: y + 12 }, end: { x: PAGE.width - MARGIN, y: y + 12 }, thickness: 0.5, color: COLORS.line });
      y -= 16;
    }
  }

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    const text = `${labels.page} ${i + 1} / ${pages.length}`;
    p.drawText(text, { x: (PAGE.width - regular.widthOfTextAtSize(text, 9)) / 2, y: MARGIN / 2, size: 9, font: regular, color: COLORS.muted });
  });

  return pdf.save();
}
