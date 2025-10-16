import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FiltersDrawer } from './filters-drawer';
import { signal } from '@angular/core';
import { SearchService } from '../../core/search.service';
import { ContextualFiltersService } from '../../core/contextual-filters.service';
import { TelemetryService } from '../../core/telemetry.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

class MockContextualFiltersService {
  suggestions = signal(null);
  loading = signal(false);
  error = signal(null);
  load() {}
}

class MockTelemetryService {
  recordFilterSuggestionApplied() {}
}

describe('FiltersDrawer', () => {
  let component: FiltersDrawer;
  let fixture: ComponentFixture<FiltersDrawer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FiltersDrawer, HttpClientTestingModule],
      providers: [
        SearchService,
        { provide: ContextualFiltersService, useClass: MockContextualFiltersService },
        { provide: TelemetryService, useClass: MockTelemetryService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FiltersDrawer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
