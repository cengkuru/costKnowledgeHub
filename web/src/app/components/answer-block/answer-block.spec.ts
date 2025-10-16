import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnswerBlock } from './answer-block';

describe('AnswerBlock', () => {
  let component: AnswerBlock;
  let fixture: ComponentFixture<AnswerBlock>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnswerBlock]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnswerBlock);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
