import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchService } from '../../core/search.service';

@Component({
  selector: 'app-answer-block',
  imports: [CommonModule],
  templateUrl: './answer-block.html',
  styles: ``
})
export class AnswerBlock {
  constructor(public searchService: SearchService) {}

  async copyAnswer() {
    const answer = this.searchService.answer();
    const text = answer.map(b => b.text).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      console.log('Answer copied to clipboard');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
}
