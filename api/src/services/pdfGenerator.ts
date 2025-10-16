/**
 * PDF Generator Service
 *
 * Generates beautiful, card-based PDF exports for research documents
 * Uses PDFKit for server-side PDF generation with professional layouts
 */

import PDFDocument from 'pdfkit';
import type { AnswerBullet } from '../types.js';

// Color palette (CoST brand colors)
const COLORS = {
  primary: '#2563eb',      // Blue
  secondary: '#64748b',    // Slate gray
  background: '#f8fafc',   // Light gray
  cardBg: '#ffffff',       // White
  text: '#1e293b',         // Dark slate
  textLight: '#64748b',    // Light gray text
  border: '#e2e8f0',       // Border gray
  accent: '#0ea5e9'        // Light blue accent
};

// Typography
const FONTS = {
  title: 24,
  heading: 18,
  subheading: 14,
  body: 11,
  small: 9
};

export interface PDFExportOptions {
  title?: string;
  includeAnswers?: boolean;
  includeSources?: boolean;
}

export interface ExportData {
  bullets: AnswerBullet[];
  items: string[];
}

/**
 * Generates a beautiful PDF document from research data
 */
export class PDFGenerator {
  private doc: PDFKit.PDFDocument;
  private pageMargin = 50;
  private contentWidth: number;
  private currentY: number;

  constructor() {
    this.doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: this.pageMargin,
        bottom: this.pageMargin,
        left: this.pageMargin,
        right: this.pageMargin
      }
    });

    this.contentWidth = this.doc.page.width - (this.pageMargin * 2);
    this.currentY = this.pageMargin;
  }

  /**
   * Generate complete PDF from export data
   */
  async generate(data: ExportData, options: PDFExportOptions = {}): Promise<PDFKit.PDFDocument> {
    const {
      title = 'CoST Knowledge Hub Export',
      includeAnswers = true,
      includeSources = true
    } = options;

    // Header
    this.renderHeader(title);
    this.currentY += 40;

    // Executive Summary Card
    if (includeAnswers && data.bullets.length > 0) {
      this.renderSectionHeader('Research Summary');
      this.currentY += 15;

      data.bullets.forEach((bullet, index) => {
        this.renderAnswerCard(bullet, index + 1);
        this.currentY += 10;
      });
    }

    // Sources Card
    if (includeSources && data.items.length > 0) {
      this.currentY += 20;
      this.renderSectionHeader('Selected Sources');
      this.currentY += 15;
      this.renderSourcesCard(data.items);
    }

    // Footer
    this.renderFooter();

    return this.doc;
  }

  /**
   * Render document header with CoST branding
   */
  private renderHeader(title: string): void {
    // Title
    this.doc
      .font('Helvetica-Bold')
      .fontSize(FONTS.title)
      .fillColor(COLORS.primary)
      .text(title, this.pageMargin, this.currentY, {
        width: this.contentWidth,
        align: 'left'
      });

    this.currentY = this.doc.y + 10;

    // Metadata line
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    this.doc
      .font('Helvetica')
      .fontSize(FONTS.small)
      .fillColor(COLORS.textLight)
      .text(`Generated on ${date}`, this.pageMargin, this.currentY);

    this.currentY = this.doc.y + 20;

    // Divider line
    this.doc
      .strokeColor(COLORS.border)
      .lineWidth(1)
      .moveTo(this.pageMargin, this.currentY)
      .lineTo(this.doc.page.width - this.pageMargin, this.currentY)
      .stroke();
  }

  /**
   * Render section header
   */
  private renderSectionHeader(title: string): void {
    this.checkPageBreak(60);

    this.doc
      .font('Helvetica-Bold')
      .fontSize(FONTS.heading)
      .fillColor(COLORS.text)
      .text(title, this.pageMargin, this.currentY);

    this.currentY = this.doc.y;
  }

  /**
   * Render answer bullet as a card
   */
  private renderAnswerCard(bullet: AnswerBullet, number: number): void {
    const cardPadding = 15;
    const cardHeight = this.calculateCardHeight(bullet, cardPadding);

    this.checkPageBreak(cardHeight + 20);

    const cardY = this.currentY;

    // Card background
    this.doc
      .roundedRect(
        this.pageMargin,
        cardY,
        this.contentWidth,
        cardHeight,
        5
      )
      .fillAndStroke(COLORS.cardBg, COLORS.border);

    // Card content
    const contentX = this.pageMargin + cardPadding;
    const contentY = cardY + cardPadding;
    const contentWidth = this.contentWidth - (cardPadding * 2);

    // Bullet number badge
    this.doc
      .circle(contentX + 8, contentY + 8, 8)
      .fill(COLORS.primary);

    this.doc
      .font('Helvetica-Bold')
      .fontSize(FONTS.small)
      .fillColor('#ffffff')
      .text(number.toString(), contentX, contentY + 3, {
        width: 16,
        align: 'center'
      });

    // Bullet text
    this.doc
      .font('Helvetica')
      .fontSize(FONTS.body)
      .fillColor(COLORS.text)
      .text(bullet.text, contentX + 25, contentY + 2, {
        width: contentWidth - 25,
        align: 'left'
      });

    let citationY = this.doc.y + 8;

    // Citations
    if (bullet.cites && bullet.cites.length > 0) {
      bullet.cites.forEach((citation, index) => {
        this.doc
          .font('Helvetica')
          .fontSize(FONTS.small)
          .fillColor(COLORS.textLight)
          .text('• ', contentX + 25, citationY, {
            continued: true,
            width: contentWidth - 25
          })
          .fillColor(COLORS.accent)
          .text(citation.title, {
            link: citation.url,
            underline: false,
            continued: false
          });

        citationY = this.doc.y + 3;
      });
    }

    this.currentY = cardY + cardHeight;
  }

  /**
   * Render sources summary card
   */
  private renderSourcesCard(items: string[]): void {
    const cardPadding = 15;
    const cardHeight = 80;

    this.checkPageBreak(cardHeight + 20);

    const cardY = this.currentY;

    // Card background
    this.doc
      .roundedRect(
        this.pageMargin,
        cardY,
        this.contentWidth,
        cardHeight,
        5
      )
      .fillAndStroke(COLORS.cardBg, COLORS.border);

    // Content
    const contentX = this.pageMargin + cardPadding;
    const contentY = cardY + cardPadding;

    // Icon placeholder (document icon)
    this.doc
      .roundedRect(contentX, contentY, 40, 50, 3)
      .stroke(COLORS.border);

    this.doc
      .font('Helvetica-Bold')
      .fontSize(FONTS.small)
      .fillColor(COLORS.textLight)
      .text('DOCS', contentX, contentY + 18, {
        width: 40,
        align: 'center'
      });

    // Sources count
    this.doc
      .font('Helvetica-Bold')
      .fontSize(FONTS.heading)
      .fillColor(COLORS.primary)
      .text(items.length.toString(), contentX + 60, contentY + 5);

    // Calculate number width with heading font
    this.doc.font('Helvetica-Bold').fontSize(FONTS.heading);
    const numberWidth = this.doc.widthOfString(items.length.toString());

    this.doc
      .font('Helvetica')
      .fontSize(FONTS.body)
      .fillColor(COLORS.text)
      .text(' documents selected', contentX + 60 + numberWidth, contentY + 9);

    this.doc
      .font('Helvetica')
      .fontSize(FONTS.small)
      .fillColor(COLORS.textLight)
      .text('Research compiled from verified CoST Knowledge Hub sources', contentX + 60, contentY + 35, {
        width: this.contentWidth - 100
      });

    this.currentY = cardY + cardHeight;
  }

  /**
   * Render page footer
   */
  private renderFooter(): void {
    const footerY = this.doc.page.height - 40;

    this.doc
      .font('Helvetica')
      .fontSize(FONTS.small)
      .fillColor(COLORS.textLight)
      .text(
        'Generated by CoST Knowledge Hub • infrastructuretransparency.org',
        this.pageMargin,
        footerY,
        {
          width: this.contentWidth,
          align: 'center'
        }
      );
  }

  /**
   * Calculate required card height based on content
   */
  private calculateCardHeight(bullet: AnswerBullet, padding: number): number {
    const contentWidth = this.contentWidth - (padding * 2) - 25; // Subtract badge width

    // Save current font size and set temporarily for calculation
    const currentSize = FONTS.body;
    this.doc.fontSize(currentSize);

    // Calculate text height
    const textHeight = this.doc.heightOfString(bullet.text, {
      width: contentWidth
    });

    // Calculate citations height
    let citationsHeight = 0;
    if (bullet.cites && bullet.cites.length > 0) {
      citationsHeight = 8; // Top margin
      this.doc.fontSize(FONTS.small);
      bullet.cites.forEach(citation => {
        const citeHeight = this.doc.heightOfString(`• ${citation.title}`, {
          width: contentWidth
        });
        citationsHeight += citeHeight + 3;
      });
    }

    return padding * 2 + textHeight + citationsHeight + 10; // 10 for extra spacing
  }

  /**
   * Check if we need a page break
   */
  private checkPageBreak(requiredHeight: number): void {
    const pageHeight = this.doc.page.height;
    const bottomMargin = this.pageMargin + 60; // Extra space for footer

    if (this.currentY + requiredHeight > pageHeight - bottomMargin) {
      this.doc.addPage();
      this.currentY = this.pageMargin;
    }
  }

  /**
   * Get the PDFKit document instance
   */
  getDocument(): PDFKit.PDFDocument {
    return this.doc;
  }

  /**
   * Finalize the PDF document
   */
  end(): void {
    this.doc.end();
  }
}

/**
 * Quick helper function to generate PDF buffer
 */
export async function generatePDFBuffer(data: ExportData, options?: PDFExportOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const generator = new PDFGenerator();
    const chunks: Buffer[] = [];

    generator.generate(data, options)
      .then(doc => {
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        generator.end();
      })
      .catch(reject);
  });
}
