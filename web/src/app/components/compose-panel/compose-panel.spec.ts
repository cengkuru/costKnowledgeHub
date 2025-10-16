import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComposePanel } from './compose-panel';

describe('ComposePanel', () => {
  let component: ComposePanel;
  let fixture: ComponentFixture<ComposePanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComposePanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComposePanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
