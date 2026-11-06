const TRACE_MARKER = /\s*\/\/\s*@trace\s+([\w., ]+)\s*$/;

export default class CodePanel {
  constructor({ container, operationLabel, source }) {
    if (!container || !container.ownerDocument || typeof source !== 'string') {
      throw new TypeError('CodePanel requires a source container and source text.');
    }

    this.container = container;
    this.document = container.ownerDocument;
    this.operationLabel = operationLabel;
    this.lines = source.split(/\r?\n/).map((sourceLine, index) => {
      const marker = sourceLine.match(TRACE_MARKER);
      const code = marker
        ? sourceLine.slice(0, marker.index).trimEnd()
        : sourceLine;

      return {
        number: index + 1,
        code,
        traceCodes: marker
          ? marker[1].split(',').map((identifier) => identifier.trim())
          : [],
      };
    });
    this.rowsByCode = new Map();
    this.activeRows = [];
    this.render();
  }

  render() {
    this.container.replaceChildren();
    this.rowsByCode.clear();

    for (const line of this.lines) {
      const row = this.document.createElement('span');
      row.className = 'code-line';
      row.dataset.line = String(line.number);

      const number = this.document.createElement('span');
      number.className = 'line-number';
      number.setAttribute('aria-hidden', 'true');
      number.textContent = String(line.number).padStart(3, '0');

      const text = this.document.createElement('span');
      text.className = 'line-text';
      text.textContent = line.code;

      row.append(number, text);
      this.container.append(row);

      for (const code of line.traceCodes) {
        const rows = this.rowsByCode.get(code) ?? [];
        rows.push(row);
        this.rowsByCode.set(code, rows);
      }
    }
  }

  highlight(code) {
    for (const row of this.activeRows) {
      row.classList.remove('is-current');
      row.removeAttribute('aria-current');
    }
    this.activeRows = [];

    const rows = this.rowsByCode.get(code);
    if (!rows) return false;

    this.activeRows = rows;
    for (const row of rows) {
      row.classList.add('is-current');
      row.setAttribute('aria-current', 'step');
      row.scrollIntoView?.({ block: 'nearest' });
    }
    if (this.operationLabel) this.operationLabel.textContent = code;
    return true;
  }

  reset() {
    for (const row of this.activeRows) {
      row.classList.remove('is-current');
      row.removeAttribute('aria-current');
    }
    this.activeRows = [];
    if (this.operationLabel) this.operationLabel.textContent = 'Ready';
  }
}