import { TestBed } from '@angular/core/testing';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyState]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(EmptyState);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should emit query when quick start is selected', () => {
    const fixture = TestBed.createComponent(EmptyState);
    const component = fixture.componentInstance;
    let emittedQuery = '';

    component.quickStartSelected.subscribe((query: string) => {
      emittedQuery = query;
    });

    component.selectQuickStart('OC4IDS standard');
    expect(emittedQuery).toBe('OC4IDS standard');
  });
});
