import { Base, define, html } from '@djalmajr/elements/base.js';
import styles from './app.css' assert { type: 'css' };

export class App extends Base {
  static styles = styles;

  #count = 0;

  connectedCallback() {
    super.connectedCallback();
    this.#updateCounter();
  }

  #updateCounter = () => {
    this.#count++;
    this.emit('update');
    setTimeout(this.#updateCounter, 10000);
  };

  #print = () => {
    console.log('clicked');
  };

  render() {
    console.log(this.#count);
    return html`
      <div>
        <button .dataset=${{ count: this.#count }} @click=${this.#print}>Click me</button>
      </div>
    `;
  }
}

define('v-app', App);
