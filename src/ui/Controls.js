function readNumber(input) {
  if (input.value.trim() === '') {
    input.reportValidity();
    return null;
  }

  const value = input.valueAsNumber;
  if (!Number.isFinite(value)) {
    input.setCustomValidity('Enter a finite number.');
    input.reportValidity();
    input.setCustomValidity('');
    return null;
  }

  return value;
}

export default class Controls {
  constructor({
    form,
    input,
    insertButton,
    deleteButton,
    clearButton,
    onInsert,
    onDelete,
    onClear,
    onError = console.error,
  }) {
    if (!form || !input || !insertButton || !deleteButton || !clearButton) {
      throw new TypeError('Controls requires a form, number input, and operation buttons.');
    }

    this.form = form;
    this.input = input;
    this.insertButton = insertButton;
    this.deleteButton = deleteButton;
    this.clearButton = clearButton;
    this.onInsert = onInsert;
    this.onDelete = onDelete;
    this.onClear = onClear;
    this.onError = onError;
    this.busy = false;
    this.operationId = 0;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.run(this.onInsert);
    });
    deleteButton.addEventListener('click', () => this.run(this.onDelete));
    clearButton.addEventListener('click', () => {
      this.operationId += 1;
      this.setBusy(false);
      try {
        this.onClear?.();
      } catch (error) {
        this.onError(error);
      }
    });
  }

  setBusy(busy) {
    this.busy = busy;
    this.input.disabled = busy;
    this.insertButton.disabled = busy;
    this.deleteButton.disabled = busy;
    this.clearButton.disabled = false;
    this.form.setAttribute('aria-busy', String(busy));
  }

  run(callback) {
    if (this.busy || typeof callback !== 'function') return;
    const value = readNumber(this.input);
    if (value === null) return;

    const operationId = ++this.operationId;
    this.setBusy(true);
    Promise.resolve()
      .then(() => (
        this.operationId === operationId ? callback(value) : undefined
      ))
      .catch((error) => this.onError(error))
      .finally(() => {
        if (this.operationId === operationId) this.setBusy(false);
      });
  }
}