import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideNavComponent } from './layout/side-nav/side-nav.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SideNavComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('CustomerApp');

  constructor() {
    console.log('App component initialized');
  }
}
