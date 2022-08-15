import { Base, define, html } from '@djalmajr/elements/base.js';
import styles from './app.css' assert { type: 'css' };

/**
 *
 * @param {number} num
 * @return
 */
const times = (num) =>
  Array(num)
    .fill(0)
    .map((_, idx) => idx + 1);

export class App extends Base {
  static styles = styles;

  state = {
    count: 0,
  };

  #print = () => {
    this.state.count++;
  };

  render() {
    const { count } = this.state;

    return html`
      <div>
        <button @click=${this.#print}>Count: ${count}</button>
        <ul>
          ${times(3).map((idx) => html`<li>${idx}</li>`)}
        </ul>
      </div>
    `;
  }
}

define('v-app', App);
