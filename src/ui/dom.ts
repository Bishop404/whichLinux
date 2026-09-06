/** Tiny element helper. Text is always set as text, never parsed as HTML. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | boolean | undefined> = {},
  children: (Node | string | undefined | false)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (name === "class") node.className = String(value);
    else if (name === "text") node.textContent = String(value);
    else node.setAttribute(name, String(value));
  }

  for (const child of children) {
    if (!child) continue;
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

export function clear(node: HTMLElement): void {
  node.replaceChildren();
}
