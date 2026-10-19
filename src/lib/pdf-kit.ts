import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { LanguageCode } from './types';

/**
 * The page-drawing engine behind every document OmoNetTab prints.
 *
 * It is shared by receipts and by administrator reports so both come out of the
 * same A4 layout, the same palette and the same pagination rules. Nothing here
 * reads a repository or a request — a caller passes text it has already decided
 * may be printed.
 *
 * Two properties matter for a printed record:
 *   1. Every block asks for the height it needs before it draws, so a long name
 *      or a table with many rows continues onto the next page instead of being
 *      cut off at the bottom of one.
 *   2. The embedded fonts are the standard Helvetica family, whose encoding is
 *      WinAnsi. `toWinAnsi` makes that visible: a character the font cannot draw
 *      becomes `?` and is counted, so the document can admit the substitution.
 */

export const PAGE = { width: 595.28, height: 841.89, margin: 48, footerReserve: 54 } as const;
export const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;

function hex(value: string) {
  const digits = value.replace('#', '');
  return rgb(
    Number.parseInt(digits.slice(0, 2), 16) / 255,
    Number.parseInt(digits.slice(2, 4), 16) / 255,
    Number.parseInt(digits.slice(4, 6), 16) / 255
  );
}

/** The colour type pdf-lib's drawing options take. */
export type PdfColor = ReturnType<typeof rgb>;

// The palette the site is built with, so a printed document is recognisably the
// same product: clay-500/700, moss-500, ochre-500, the ink ramp.
export const INK = hex('#111418');
export const MUTED = hex('#4b5563');
export const RULE = hex('#e6e8ec');
export const BAND = hex('#f5f6f8');
export const CLAY = hex('#b96a2c');
export const CLAY_DARK = hex('#733e1c');
export const MOSS = hex('#5d7d4a');
export const OCHRE = hex('#8a6410');
export const WHITE = hex('#f5f6f8');

const CP1252_EXTRA =
  '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';

function isWinAnsi(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  if (code >= 0x20 && code <= 0x7e) return true;
  if (code >= 0xa1 && code <= 0xff) return true;
  return CP1252_EXTRA.includes(ch);
}

/**
 * Prepares text for the embedded font. Anything outside the encoding becomes a
 * question mark and is counted, so the document can admit the substitution
 * instead of letting a reader assume the record said nothing.
 */
export function toWinAnsi(text: string): { text: string; replaced: number } {
  const cleaned = text.replace(/[\u0000-\u001f\u007f]/g, ' ');
  let replaced = 0;
  let out = '';
  for (const ch of cleaned) {
    if (isWinAnsi(ch)) {
      out += ch;
      continue;
    }
    replaced += 1;
    out += '?';
  }
  return { text: out.replace(/ {2,}/g, ' ').trim(), replaced };
}

/**
 * Printed documents are drawn with the standard Helvetica family, whose encoding
 * is WinAnsi (Latin letters, accents, € and the usual punctuation). Amharic’s
 * Ethiopic script and Chinese characters have no code points there, so a document
 * for those visitors is printed in English and says so, rather than printing boxes
 * or silently dropping words. Hamer, Dasenech and Tsamai have no dictionary at
 * all, and `t()` already falls back to English for them — a different reason, so
 * the document states the reason that applies.
 */
const PRINTABLE_LANGUAGES: LanguageCode[] = ['en', 'it'];
const UNSUPPORTED_SCRIPTS: LanguageCode[] = ['am', 'zh-Hans'];

export function printableLanguage(lang: LanguageCode): {
  printedLanguage: LanguageCode;
  fallbackReason: 'script' | 'dictionary' | null;
} {
  if (PRINTABLE_LANGUAGES.includes(lang)) return { printedLanguage: lang, fallbackReason: null };
  return { printedLanguage: 'en', fallbackReason: UNSUPPORTED_SCRIPTS.includes(lang) ? 'script' : 'dictionary' };
}

/** Word wrap that also breaks a single word too long for its column. */
export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  const push = () => {
    if (line.trim()) lines.push(line.trim());
    line = '';
  };
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    push();
    let chunk = '';
    for (const ch of word) {
      if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth && chunk) {
        lines.push(chunk);
        chunk = ch;
      } else {
        chunk += ch;
      }
    }
    line = chunk;
  }
  push();
  return lines.length > 0 ? lines : [''];
}

/**
 * Cursor-based page writer. Every block asks for the height it needs; if the page
 * cannot take it, a new page starts first, so a long name or a table with many
 * rows flows onto the next page instead of being cut off.
 */
export class Writer {
  readonly doc: PDFDocument;
  private readonly regular: PDFFont;
  private readonly bold: PDFFont;
  private readonly oblique: PDFFont;
  private page: PDFPage;
  private y: number;
  private readonly usedPageNumbers: PDFPage[] = [];

  private constructor(doc: PDFDocument, regular: PDFFont, bold: PDFFont, oblique: PDFFont) {
    this.doc = doc;
    this.regular = regular;
    this.bold = bold;
    this.oblique = oblique;
    this.page = doc.addPage([PAGE.width, PAGE.height]);
    this.y = PAGE.height - PAGE.margin;
    this.usedPageNumbers.push(this.page);
  }

  static async create(): Promise<Writer> {
    const doc = await PDFDocument.create();
    const [regular, bold, oblique] = await Promise.all([
      doc.embedFont(StandardFonts.Helvetica),
      doc.embedFont(StandardFonts.HelveticaBold),
      doc.embedFont(StandardFonts.HelveticaOblique)
    ]);
    return new Writer(doc, regular, bold, oblique);
  }

  private newPage(): void {
    this.page = this.doc.addPage([PAGE.width, PAGE.height]);
    this.y = PAGE.height - PAGE.margin;
    this.usedPageNumbers.push(this.page);
    this.rule();
    this.text('OmoNetTab', { size: 8, font: this.bold, color: MUTED });
    this.y -= 14;
  }

  ensure(height: number): void {
    if (this.y - height < PAGE.margin + PAGE.footerReserve) this.newPage();
  }

  private text(
    value: string,
    options: { size: number; font?: PDFFont; color?: ReturnType<typeof rgb>; x?: number; maxWidth?: number }
  ): void {
    const { size, font = this.regular, color = INK, x = PAGE.margin, maxWidth } = options;
    this.page.drawText(value, {
      x,
      y: this.y - size,
      size,
      font,
      color,
      ...(maxWidth === undefined ? {} : { maxWidth })
    });
  }

  /** Draws wrapped text and advances the cursor by the lines it used. */
  paragraph(value: string, options: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number; width?: number } = {}): void {
    const size = options.size ?? 9.5;
    const font = options.bold ? this.bold : this.regular;
    const color = options.color ?? INK;
    const x = options.x ?? PAGE.margin;
    const width = options.width ?? CONTENT_WIDTH - (x - PAGE.margin);
    for (const line of wrapText(value, font, size, width)) {
      this.ensure(size + 2);
      this.text(line, { size, font, color, x });
      this.y -= size + 2;
    }
  }

  /** Label and value on one row, with the value wrapped when it is long. */
  keyLine(label: string, value: string, options: { labelWidth?: number; boldValue?: boolean } = {}): void {
    const labelWidth = options.labelWidth ?? 170;
    const valueWidth = CONTENT_WIDTH - labelWidth;
    const boldFont = options.boldValue ? this.bold : this.regular;
    const valueLines = wrapText(value, boldFont, 9.5, valueWidth);
    const rowHeight = Math.max(valueLines.length, 1) * 12 + 2;
    this.ensure(rowHeight);
    const top = this.y;
    this.text(label, { size: 9, font: this.regular, color: MUTED, x: PAGE.margin });
    valueLines.forEach((line, index) => {
      this.page.drawText(line, {
        x: PAGE.margin + labelWidth,
        y: top - 9.5 - index * 12,
        size: 9.5,
        font: boldFont,
        color: INK
      });
    });
    this.y = top - rowHeight;
  }

  rule(color = RULE): void {
    this.ensure(10);
    this.page.drawLine({
      start: { x: PAGE.margin, y: this.y - 4 },
      end: { x: PAGE.margin + CONTENT_WIDTH, y: this.y - 4 },
      thickness: 0.7,
      color
    });
    this.y -= 10;
  }

  space(amount = 10): void {
    this.y -= amount;
  }

  /** Full-width coloured block with light text; the document's status banner. */
  banner(title: string, subtitle: string, color: ReturnType<typeof rgb>): void {
    const titleLines = wrapText(title, this.bold, 14, CONTENT_WIDTH - 24);
    const subtitleLines = wrapText(subtitle, this.regular, 9, CONTENT_WIDTH - 24);
    const height = 18 + titleLines.length * 17 + subtitleLines.length * 11;
    this.ensure(height + 8);
    this.page.drawRectangle({ x: PAGE.margin, y: this.y - height, width: CONTENT_WIDTH, height, color });
    let inner = this.y - 22;
    for (const line of titleLines) {
      this.page.drawText(line, { x: PAGE.margin + 12, y: inner, size: 14, font: this.bold, color: WHITE });
      inner -= 17;
    }
    for (const line of subtitleLines) {
      this.page.drawText(line, { x: PAGE.margin + 12, y: inner, size: 9, font: this.regular, color: WHITE });
      inner -= 11;
    }
    this.y -= height + 14;
  }

  /** Outlined stamp used to mark a simulated payment, or a simulated report. */
  stamp(value: string): void {
    const width = this.bold.widthOfTextAtSize(value, 10) + 20;
    this.ensure(30);
    this.page.drawRectangle({
      x: PAGE.margin,
      y: this.y - 22,
      width: Math.min(width, CONTENT_WIDTH),
      height: 22,
      borderColor: CLAY_DARK,
      borderWidth: 1,
      borderDashArray: [4, 3],
      borderDashPhase: 0,
      color: WHITE
    });
    this.page.drawText(value, { x: PAGE.margin + 10, y: this.y - 15, size: 10, font: this.bold, color: CLAY_DARK });
    this.y -= 30;
  }

  columns(headings: string[], rows: string[][], widths: number[], size = 9): void {
    const cellPadding = 4;
    const drawRow = (cells: string[], options: { bold: boolean; fill?: ReturnType<typeof rgb> }) => {
      const wrapped = cells.map((cell, index) => wrapText(cell, options.bold ? this.bold : this.regular, size, widths[index] - cellPadding * 2));
      const rowHeight = Math.max(...wrapped.map((lines) => lines.length)) * (size + 2) + cellPadding * 2;
      this.ensure(rowHeight);
      const top = this.y;
      if (options.fill) this.page.drawRectangle({ x: PAGE.margin, y: top - rowHeight, width: CONTENT_WIDTH, height: rowHeight, color: options.fill });
      let x = PAGE.margin;
      wrapped.forEach((lines, index) => {
        lines.forEach((line, lineIndex) => {
          this.page.drawText(line, {
            x: x + cellPadding,
            y: top - cellPadding - size - lineIndex * (size + 2),
            size,
            font: options.bold ? this.bold : this.regular,
            color: options.fill ? WHITE : INK
          });
        });
        x += widths[index];
      });
      this.y = top - rowHeight;
    };
    drawRow(headings, { bold: true, fill: CLAY_DARK });
    if (rows.length === 0) {
      drawRow(headings.map(() => ''), { bold: false });
      return;
    }
    drawRow(rows[0] ?? [], { bold: false });
    for (const row of rows.slice(1)) {
      this.page.drawLine({
        start: { x: PAGE.margin, y: this.y },
        end: { x: PAGE.margin + CONTENT_WIDTH, y: this.y },
        thickness: 0.5,
        color: RULE
      });
      drawRow(row, { bold: false, fill: BAND });
    }
  }

  /** Right-aligned label/value totals. */
  totals(lines: { label: string; value: string }[]): void {
    const labelWidth = CONTENT_WIDTH - 170;
    for (const line of lines) {
      this.ensure(14);
      const top = this.y;
      wrapText(line.label, this.regular, 9.5, labelWidth).forEach((text, index) => {
        this.page.drawText(text, { x: PAGE.margin, y: top - 10 - index * 12, size: 9.5, font: this.regular, color: MUTED });
      });
      this.page.drawText(line.value, {
        x: PAGE.margin + CONTENT_WIDTH - this.bold.widthOfTextAtSize(line.value, 10.5) - 4,
        y: top - 10,
        size: 10.5,
        font: this.bold,
        color: INK
      });
      this.y = top - 16;
    }
  }

  /** The coloured brand band across the top of the first page. */
  headerBand(brand: string, tagline: string, rightLines: string[]): void {
    this.ensure(82);
    const height = 66;
    const top = this.y;
    this.page.drawRectangle({ x: 0, y: top - height, width: PAGE.width, height, color: CLAY });
    this.page.drawText(brand, { x: PAGE.margin, y: top - 27, size: 18, font: this.bold, color: WHITE });
    this.page.drawText(tagline, { x: PAGE.margin, y: top - 44, size: 9, font: this.oblique, color: WHITE });
    rightLines.forEach((line, index) => {
      const width = this.regular.widthOfTextAtSize(line, 8);
      this.page.drawText(line, { x: PAGE.margin + CONTENT_WIDTH - width, y: top - 18 - index * 12, size: 8, font: this.regular, color: WHITE });
    });
    this.y = top - height - 16;
  }

  sectionTitle(value: string): void {
    this.ensure(24);
    const top = this.y;
    wrapText(value, this.bold, 10, CONTENT_WIDTH).forEach((line, index) => {
      this.page.drawText(line, { x: PAGE.margin, y: top - 10 - index * 12, size: 10, font: this.bold, color: CLAY_DARK });
    });
    this.y = top - 17;
  }

  /** The two parties side by side, each column wrapping its own long names. */
  partyColumns(parties: { heading: string; name: string; detail: string[] }[]): void {
    const gap = 20;
    const columnWidth = (CONTENT_WIDTH - gap) / 2;
    const blocks = parties.map((party) => ({
      heading: wrapText(party.heading, this.bold, 8.5, columnWidth),
      name: party.name ? wrapText(party.name, this.bold, 11, columnWidth) : [],
      detail: party.detail.flatMap((line) => wrapText(line, this.regular, 9, columnWidth))
    }));
    const height = Math.max(
      ...blocks.map((block) => block.heading.length * 10 + block.name.length * 14 + block.detail.length * 11 + 10)
    );
    this.ensure(height + 10);
    const top = this.y;
    blocks.forEach((block, index) => {
      const x = PAGE.margin + index * (columnWidth + gap);
      let cursor = top;
      for (const line of block.heading) {
        this.page.drawText(line, { x, y: cursor - 8, size: 8.5, font: this.bold, color: MUTED });
        cursor -= 10;
      }
      cursor -= 2;
      for (const line of block.name) {
        this.page.drawText(line, { x, y: cursor - 11, size: 11, font: this.bold, color: INK });
        cursor -= 14;
      }
      cursor -= 3;
      for (const line of block.detail) {
        this.page.drawText(line, { x, y: cursor - 9, size: 9, font: this.regular, color: INK });
        cursor -= 11;
      }
    });
    const dividerX = PAGE.margin + columnWidth + gap / 2;
    this.page.drawLine({
      start: { x: dividerX, y: top - 2 },
      end: { x: dividerX, y: top - height },
      thickness: 0.6,
      color: RULE
    });
    this.y = top - height - 6;
  }

  finish(footerLines: string[], pageLabel: (page: number, total: number) => string): Promise<Uint8Array> {
    const total = this.usedPageNumbers.length;
    this.usedPageNumbers.forEach((page, index) => {
      const lines = footerLines
        .flatMap((line) => wrapText(line, this.regular, 7.8, CONTENT_WIDTH * 0.68))
        .slice(0, 4);
      lines.forEach((line, lineIndex) => {
        page.drawText(line, {
          x: PAGE.margin,
          y: PAGE.margin + (lines.length - 1 - lineIndex) * 9,
          size: 7.8,
          font: this.regular,
          color: MUTED
        });
      });
      const ruleY = PAGE.margin + (lines.length - 1) * 9 + 9;
      page.drawLine({
        start: { x: PAGE.margin, y: ruleY },
        end: { x: PAGE.margin + CONTENT_WIDTH, y: ruleY },
        thickness: 0.6,
        color: RULE
      });
      const label = pageLabel(index + 1, total);
      page.drawText(label, {
        x: PAGE.margin + CONTENT_WIDTH - this.regular.widthOfTextAtSize(label, 8),
        y: PAGE.margin,
        size: 8,
        font: this.regular,
        color: MUTED
      });
    });
    return this.doc.save();
  }
}
