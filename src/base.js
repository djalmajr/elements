const bound = { get: (target, method) => target[method].bind(target) };
const { createTreeWalker } = new Proxy(document, bound);
const cached = new WeakMap();
const prefix = 'δ';

// prettier-ignore
const rx = {
  texts: /^(?:textarea|script|style|title|plaintext|xmp)$/,
  empty: /^(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)$/i,
  nodes: /<([a-z]+[a-z0-9:._-]*)([^>]*?)(\/?)>/g,
  attrs: /([^\s\\>"'=]+)\s*=\s*(['"]?)\x01/g,
  parts: /[\x01\x02]/g,
};

/**
 * Check if value is "null" or "undefined".
 *
 * @param {unknown} value
 * @return
 */
const isNullish = (value) => value == null;

/**
 *
 * @param {string} str
 * @return
 */
const createHTML = (str) => new DOMParser().parseFromString(str, 'text/html').body;

/**
 *
 * @param {Node} root
 * @param {any[]} values
 */
const updateNodes = (root, values) => {
  const walker = createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT);
  let search = `${prefix}0`;
  let idx = 0;

  while (idx < values.length) {
    const node = /** @type {HTMLElement} */ (walker.nextNode());

    if (!node) throw new Error('Bad templated');

    if (node.nodeType === Node.COMMENT_NODE) {
      if (/** @type {any} */ (node).data === search) {
        // handleAnything(node)
      }
    } else {
      while (node.hasAttribute(search)) {
        const name = node.getAttribute(search);

        (() => {
          switch (name[0]) {
            case '?':
              node.toggleAttribute(name.slice(1), !!values[idx]);
              return;

            case '@':
              node[`on${name.slice(1)}`] = values[idx];
              return;

            case 'o':
              name[1] === 'n' && (node[`on${name.slice(2)}`] = values[idx]);
              return;

            case '.': {
              if (name.slice(1) === 'dataset') {
                for (const key in values[idx]) {
                  const val = values[idx][key];

                  if (isNullish(val)) {
                    delete node.dataset[key];
                  } else {
                    node.dataset[key] = val;
                  }
                }
              } else {
                node[name] = values[idx];
              }

              return;
            }
          }

          switch (name) {
            case 'ref': {
              if (typeof values[idx] === 'function') {
                values[idx](node);
              } else {
                values[idx].current = node;
              }

              return;
            }

            case 'aria': {
              for (const k in values[idx]) {
                const key = k === 'role' ? k : `aria-${k}`;
                const val = values[k];

                if (isNullish(val)) {
                  node.removeAttribute(key);
                } else {
                  node.setAttribute(key, val);
                }
              }

              return;
            }
          }

          if (isNullish(values[idx])) {
            node.removeAttribute(name);
          } else {
            node.setAttribute(name, values[idx]);
          }
        })();

        node.removeAttribute(search);
        search = `${prefix}${++idx}`;
      }

      if (
        rx.texts.test(/** @type {Element} */ node.localName) &&
        node.textContent.trim() === `<!--${search}-->`
      ) {
        node.textContent = isNullish(values[idx]) ? '' : values[idx];
        search = `${prefix}${++idx}`;
      }
    }
  }

  return root.childNodes;
};

/**
 *
 * @param {TemplateStringsArray} chunks
 * @return
 */
const cache = (chunks) => {
  return cached.get(chunks) || cached.set(chunks, normalize(chunks)).get(chunks);
};

/**
 *
 * @param {TemplateStringsArray} chunks
 * @param {number} [i]
 * @return
 */
const normalize = (chunks, i = 0) => {
  return chunks
    .join('\x01')
    .trim()
    .replace(rx.nodes, (_, name, attrs, empty) => {
      let ml = name + attrs.replace(rx.attrs, '\x02=$2$1').trimEnd();
      if (empty.length) ml += rx.empty.test(name) ? ' /' : '></' + name;
      return '<' + ml + '>';
    })
    .replace(rx.parts, (match) => {
      return match === '\x01' ? `<!--${prefix + i++}-->` : prefix + i++;
    });
};

/**
 * @type {CustomElementRegistry['define']}
 */
export const define = (tag, ctor, options) => {
  if (!customElements.get(tag)) {
    customElements.define(tag, ctor, options);
  }
};

/**
 *
 * @param {TemplateStringsArray} chunks
 * @param {...unknown} values
 * @return
 */
export function html(chunks, ...values) {
  return updateNodes(createHTML(cache(chunks)), values);
}

export class Base extends HTMLElement {
  static shadowDOM = true;

  #mounted = false;

  constructor() {
    super();

    const { shadowDOM, styles } = /** @type {any} */ (this.constructor);

    shadowDOM && this.attachShadow({ mode: 'open' });

    const target = this.shadowRoot || document;

    if (styles && !target.adoptedStyleSheets.includes(styles)) {
      target.adoptedStyleSheets = [...target.adoptedStyleSheets, styles];
    }
  }

  connectedCallback() {
    super.connectedCallback?.();
    this.#mounted = true;
    this.on('update', this.#render);
    this.#render();
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    this.off('update', this.#render);
  }

  /**
   * @param {string} key
   * @param {string | null} old
   * @param {string | null} val
   */
  attributeChangedCallback(key, old, val) {
    super.attributeChangedCallback?.(key, old, val);

    if (!this.#mounted) {
      queueMicrotask(() => this.attributeChangedCallback(key, old, val));
      return;
    }

    this.#render();
  }

  // DOM

  /**
   * The root node where content is rendered
   *
   * @return {ShadowRoot | HTMLElement}
   */
  get $el() {
    return this.shadowRoot || this;
  }

  /**
   * Shorthand for Element.querySelector
   *
   * @param {string} selector
   */
  $(selector) {
    return this.$el.querySelector(selector);
  }

  /**
   * Shorthand for Element.querySelectorAll
   *
   * @param {string} selector
   */
  $$(selector) {
    return this.$el.querySelectorAll(selector);
  }

  /**
   * Shorthand for Element.{getAttribute,setAttribute,removeAttribute}
   *
   * @param {string} name
   * @param {string} [value]
   */
  attr(name, value) {
    if (value !== undefined) {
      value === null ? this.removeAttribute(name) : this.setAttribute(name, value);
    }

    return this.getAttribute(name);
  }

  /**
   * Shorthand for Element.hasAttribute
   *
   * @param {string} name
   */
  has(name) {
    return this.hasAttribute(name);
  }

  // Events

  /**
   * Shorthand for dispatching a Custom Event
   *
   * @param {string} name
   * @param {unknown} detail
   */
  emit(name, detail) {
    this.dispatchEvent(new CustomEvent(name, { detail }));
  }

  /**
   * Shorthand for HTMLElement.addEventListener
   *
   * @param {string} name
   * @param {EventListenerOrEventListenerObject} listener
   * @param {boolean | AddEventListenerOptions} [options]
   */
  on(name, listener, options) {
    this.addEventListener(name, listener, options);
  }

  /**
   * Shorthand for HTMLElement.removeEventListener
   *
   * @param {string} name
   * @param {EventListenerOrEventListenerObject} listener
   * @param {boolean | AddEventListenerOptions} [options]
   */
  off(name, listener, options) {
    this.removeEventListener(name, listener, options);
  }

  // Rendering

  render() {
    return html`<slot></slot>`;
  }

  #render = () => {
    if (!this.isConnected) return;

    this.$el.replaceChildren(...Array.from(this.render()));
  };
}
