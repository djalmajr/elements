declare module '@djalmajr/elements';

declare module '@djalmajr/elements/*';

declare module '*.css' {
  const value: CSSStyleSheet;

  export default value;
}

interface Document {
  adoptedStyleSheets: any[];
}

interface ShadowRoot {
  adoptedStyleSheets: any[];
}

interface CSSStyleSheet {
  replaceSync(css: string): void;
}

interface HTMLElement {
  attributeChangedCallback(key: string, old: string | null, val: string | null): void;
  connectedCallback(): void;
  disconnectedCallback(): void;
}
