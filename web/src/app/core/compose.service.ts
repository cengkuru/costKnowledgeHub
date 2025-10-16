import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AnswerBullet } from './search.service';
import { environment } from '../../environments/environment';

/**
 * Compose request format
 */
export interface ComposeRequest {
  items: string[];
  bullets: AnswerBullet[];
  format: 'brief' | 'pack' | 'notes';
}

/**
 * Compose response format
 */
export interface ComposeResponse {
  markdown: string;
  title: string;
}

/**
 * Compose service for generating exports
 *
 * Takes selected items and answer bullets and generates
 * formatted Markdown documents in various formats
 */
@Injectable({
  providedIn: 'root'
})
export class ComposeService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Generates export document
   *
   * @param request Items, bullets, and format
   * @returns Observable of markdown content and filename
   */
  compose(request: ComposeRequest): Observable<ComposeResponse> {
    return this.http.post<ComposeResponse>(`${this.apiUrl}/compose`, request);
  }

  /**
   * Downloads markdown as file
   *
   * @param markdown Content to download
   * @param filename Suggested filename
   */
  downloadMarkdown(markdown: string, filename: string): void {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Generates and downloads PDF export
   *
   * @param request Items, bullets, and optional title
   * @returns Observable that completes when download starts
   */
  exportPDF(request: Omit<ComposeRequest, 'format'> & { title?: string }): Observable<void> {
    return new Observable(observer => {
      this.http.post(`${this.apiUrl}/compose/pdf`, request, {
        responseType: 'blob',
        observe: 'response'
      }).subscribe({
        next: (response) => {
          const blob = response.body;
          if (!blob) {
            observer.error(new Error('No PDF data received'));
            return;
          }

          // Extract filename from Content-Disposition header or use default
          const contentDisposition = response.headers.get('Content-Disposition');
          let filename = 'CoST-Export.pdf';
          if (contentDisposition) {
            const matches = /filename="([^"]+)"/.exec(contentDisposition);
            if (matches && matches[1]) {
              filename = matches[1];
            }
          }

          // Download the PDF
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          window.URL.revokeObjectURL(url);

          observer.next();
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  /**
   * Copies markdown to clipboard
   *
   * @param markdown Content to copy
   */
  async copyToClipboard(markdown: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(markdown);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      throw err;
    }
  }
}
