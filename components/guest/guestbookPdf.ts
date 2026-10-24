import { toPng } from "html-to-image";
import { PDFDocument, degrees, rgb } from "pdf-lib";

const PAGE = { width: 595.28, height: 841.89 }; // A4
const MARGIN = 40;
const GAP = 22;
const COLUMN_WIDTH = (PAGE.width - MARGIN * 2 - GAP) / 2;
const ROTATIONS = [-1.5, 1.5, -0.5]; // mirrors .sticky-note-0..2 in globals.css

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function renderHeader(title: string, subtitle: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 420;
  const ctx = canvas.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.fillStyle = "#c96f5c";
  ctx.font = "italic 64px Georgia, serif";
  const brandWidth = ctx.measureText("OAn").width + 44;
  const left = (canvas.width - brandWidth) / 2;
  ctx.textAlign = "left";
  ctx.fillText("O", left, 90);
  ctx.fillStyle = "#dc2626";
  ctx.fillText("♥", left + ctx.measureText("O").width + 4, 90);
  ctx.fillStyle = "#c96f5c";
  ctx.fillText("An", left + ctx.measureText("O").width + 48, 90);
  ctx.textAlign = "center";
  ctx.fillStyle = "#243130";
  ctx.font = "italic 110px Georgia, serif";
  ctx.fillText(title, canvas.width / 2, 250, canvas.width - 120);
  ctx.fillStyle = "#6f7e77";
  ctx.font = "34px Arial, sans-serif";
  ctx.fillText(subtitle.toLocaleUpperCase(), canvas.width / 2, 330);
  return canvas.toDataURL("image/png");
}

// Captures the rendered sticky notes (colors, fonts, rounded corners) and lays them out on A4 pages.
export async function downloadGuestbookPdf(notes: HTMLElement[], { title, subtitle, filename }: { title: string; subtitle: string; filename: string }) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${title} – ${subtitle}`);
  const paper = rgb(0.973, 0.953, 0.925);
  const addPage = () => {
    const page = pdf.addPage([PAGE.width, PAGE.height]);
    page.drawRectangle({ x: 0, y: 0, width: PAGE.width, height: PAGE.height, color: paper });
    return page;
  };

  let page = addPage();
  const header = await pdf.embedPng(await renderHeader(title, subtitle));
  const headerHeight = (PAGE.width - MARGIN * 2) * (header.height / header.width);
  page.drawImage(header, { x: MARGIN, y: PAGE.height - MARGIN - headerHeight, width: PAGE.width - MARGIN * 2, height: headerHeight });
  const top = PAGE.height - MARGIN - headerHeight - 12;
  let columns = [top, top];

  for (const [index, note] of notes.entries()) {
    const dataUrl = await toPng(note, { pixelRatio: 2, style: { transform: "none", margin: "0" }, filter: (node) => !(node instanceof HTMLElement && node.dataset.noPdf !== undefined) });
    const image = await pdf.embedPng(dataUrl);
    const { width, height } = await loadImage(dataUrl);
    const drawWidth = COLUMN_WIDTH - 6;
    const drawHeight = drawWidth * (height / width);
    let column = columns[0] >= columns[1] ? 0 : 1;
    if (columns[column] - drawHeight < MARGIN) {
      page = addPage();
      columns = [PAGE.height - MARGIN, PAGE.height - MARGIN];
      column = 0;
    }
    const x = MARGIN + column * (COLUMN_WIDTH + GAP) + 3;
    const y = columns[column] - drawHeight;
    page.drawImage(image, { x, y, width: drawWidth, height: drawHeight, rotate: degrees(ROTATIONS[index % 3]) });
    columns[column] = y - GAP;
  }

  const bytes = await pdf.save();
  const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
