import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ContextualFilter } from './contextual-filters.service';
import { SmartCollection, SmartCollectionEntry } from './smart-collections.service';

type ActiveFilters = {
  topic?: string;
  country?: string;
  year?: number;
};

interface BaseEventPayload {
  type: 'filter_suggestion_applied' | 'smart_collection_entry_opened';
  query: string;
  filters: ActiveFilters;
  payload: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root'
})
export class TelemetryService {
  private readonly apiUrl = environment.apiUrl;
  private readonly endpoint = `${this.apiUrl}/telemetry/contextual`;
  private readonly sessionId = this.generateSessionId();

  constructor(private http: HttpClient) {}

  recordFilterSuggestionApplied(params: {
    suggestion: ContextualFilter;
    query: string;
    currentFilters: ActiveFilters;
    nextFilters: ActiveFilters;
  }): void {
    const { suggestion, query, currentFilters, nextFilters } = params;

    this.dispatch({
      type: 'filter_suggestion_applied',
      query,
      filters: currentFilters,
      payload: {
        suggestionId: suggestion.id,
        tone: suggestion.tone,
        confidence: suggestion.confidence,
        nextFilters
      }
    });
  }

  recordSmartCollectionEntryOpened(params: {
    collection: SmartCollection;
    entry: SmartCollectionEntry;
    query: string;
    filters: ActiveFilters;
  }): void {
    const { collection, entry, query, filters } = params;

    this.dispatch({
      type: 'smart_collection_entry_opened',
      query,
      filters,
      payload: {
        collectionId: collection.id,
        entryId: entry.id,
        novelty: collection.novelty,
        timeframe: collection.timeframe,
        entryType: entry.type
      }
    });
  }

  private dispatch(event: BaseEventPayload): void {
    const body = {
      ...event,
      clientTimestamp: new Date().toISOString(),
      sessionId: this.sessionId
    };

    this.http.post(this.endpoint, body).subscribe({
      // Telemetry is fire-and-forget; we only log failures.
      error: (error) => console.error('[TelemetryService] Failed to submit event', error)
    });
  }

  private generateSessionId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2);
  }
}
