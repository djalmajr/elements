import { Base, define, html } from '@djalmajr/elements/base.js';
import styles from './app.css' assert { type: 'css' };

export class App extends Base {
  static styles = styles;

  state = {
    count: 0,
  };

  #print = () => {
    this.state.count++;
  };

  #renderItems() {
    return Array(3)
      .fill(0)
      .map((_, idx) => html`<span>${idx + 1}</span>`);
  }

  render() {
    const { count } = this.state;

    return html`
      <div>
        <button @click=${this.#print}>Count: ${count}</button>
        ${this.#renderItems()}
      </div>
    `;
  }
}

define('v-app', App);
