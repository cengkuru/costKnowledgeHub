import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResourceCardComponent } from './resource-card.component';
import { ResourceItem, ResourceCategory, ResourceType } from '../../models/types';

describe('ResourceCardComponent', () => {
  let component: ResourceCardComponent;
  let fixture: ComponentFixture<ResourceCardComponent>;

  const mockResource: ResourceItem = {
    id: 'test-1',
    title: 'Test Resource',
    description: 'This is a test resource description for testing purposes.',
    url: 'https://test.com',
    category: ResourceCategory.OC4IDS,
    type: ResourceType.DOCUMENTATION,
    date: '2024-01-15'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResourceCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ResourceCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display resource title', () => {
    component.resource = mockResource;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const titleElement = compiled.querySelector('h3');
    expect(titleElement?.textContent).toContain('Test Resource');
  });

  it('should display resource description', () => {
    component.resource = mockResource;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const descElement = compiled.querySelector('p');
    expect(descElement?.textContent).toContain('This is a test resource description');
  });

  it('should emit interact event when clicked', () => {
    component.resource = mockResource;
    spyOn(component.interact, 'emit');

    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const cardLink = compiled.querySelector('a');
    cardLink?.click();

    expect(component.interact.emit).toHaveBeenCalledWith('test-1');
  });

  it('should show popular badge when isPopular is true', () => {
    component.resource = mockResource;
    component.isPopular = true;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const badge = compiled.querySelector('.popular-badge');
    expect(badge).toBeTruthy();
  });

  it('should not show popular badge when isPopular is false', () => {
    component.resource = mockResource;
    component.isPopular = false;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const badge = compiled.querySelector('.popular-badge');
    expect(badge).toBeFalsy();
  });

  it('should format date correctly', () => {
    component.resource = mockResource;
    fixture.detectChanges();

    const formattedDate = component.getFormattedDate();
    expect(formattedDate).toContain('Jan');
    expect(formattedDate).toContain('15');
    expect(formattedDate).toContain('2024');
  });

  it('should have correct link href', () => {
    component.resource = mockResource;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const cardLink = compiled.querySelector('a') as HTMLAnchorElement;
    expect(cardLink?.href).toBe('https://test.com/');
  });

  it('should have target="_blank" for external links', () => {
    component.resource = mockResource;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const cardLink = compiled.querySelector('a') as HTMLAnchorElement;
    expect(cardLink?.target).toBe('_blank');
  });
});
