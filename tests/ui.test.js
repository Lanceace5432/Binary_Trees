import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import BinarySearchTree from '../src/core/BinarySearchTree.js';
import CodePanel from '../src/ui/CodePanel.js';
import Controls from '../src/ui/Controls.js';
import StatusPanel from '../src/ui/StatusPanel.js';
import TraceAnimator from '../src/utils/animation.js';
import TreeRenderer from '../src/visualization/TreeRenderer.js';

class FakeElement {
  constructor(ownerDocument = null) {
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.dataset = {};
    this.disabled = false;
    this.textContent = '';
    this.className = '';
    this.classList = {
      add: (...names) => {
        const values = new Set((this.getAttribute('class') ?? '').split(/\s+/).filter(Boolean));
        names.forEach((name) => values.add(name));
        this.setAttribute('class', [...values].join(' '));
      },
      remove: (...names) => {
        const values = new Set((this.getAttribute('class') ?? '').split(/\s+/).filter(Boolean));
        names.forEach((name) => values.delete(name));
        this.setAttribute('class', [...values].join(' '));
      },
      contains: (name) => (this.getAttribute('class') ?? '').split(/\s+/).includes(name),
    };
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  set className(value) {
    this.setAttribute('class', value);
  }

  get className() {
    return this.getAttribute('class') ?? '';
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  append(...elements) {
    this.children.push(...elements);
  }

  replaceChildren(...elements) {
    this.children = elements;
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) ?? [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  dispatch(type, event = {}) {
    for (const handler of this.listeners.get(type) ?? []) {
      handler({ preventDefault() {}, ...event });
    }
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = (element) => {
      for (const child of element.children) {
        const matched = selector === '[data-node-value]'
          ? child.getAttribute('data-node-value') !== null
          : selector === '.tree-node'
            ? child.classList.contains('tree-node')
            : selector === '.tree-edge'
              ? child.classList.contains('tree-edge')
              : false;
        if (matched) matches.push(child);
        visit(child);
      }
    };
    visit(this);
    return matches;
  }
}

function fakeDocument() {
  const document = {
    createElement() {
      return new FakeElement(document);
    },
    createElementNS() {
      return new FakeElement(document);
    },
  };
  return document;
}

function makeSvg(document) {
  return new FakeElement(document);
}

function makePanelElement(document) {
  const element = document.createElement();
  element.scrollIntoView = () => {};
  return element;
}

function createInteractionHarness({ delay = 0, animationDuration = 0 } = {}) {
  const document = fakeDocument();
  const sourceCode = makePanelElement(document);
  const methodLabel = makePanelElement(document);
  const comparison = makePanelElement(document);
  const direction = makePanelElement(document);
  const resultStatus = makePanelElement(document);
  const svg = makeSvg(document);
  const source = readFileSync(
    new URL('../src/core/BinarySearchTree.js', import.meta.url),
    'utf8',
  );
  const tree = new BinarySearchTree();
  const animator = new TraceAnimator({ delay });
  const renderer = new TreeRenderer(svg, { animationDuration });
  const codePanel = new CodePanel({
    container: sourceCode,
    operationLabel: methodLabel,
    source,
  });
  const statusPanel = new StatusPanel({ comparison, direction, result: resultStatus });
  const seenCodes = [];

  async function run(operation, value) {
    const outcome = tree[operation](value);
    const completed = await animator.play(outcome.events, async (event, index) => {
      seenCodes.push(event.code);
      statusPanel.showEvent(operation, event);
      assert.equal(codePanel.highlight(event.code), true, event.code);
      renderer.updateTrace(event);
      if (index === outcome.events.length - 1) {
        if ((operation === 'insert' && outcome.inserted)
          || (operation === 'delete' && outcome.deleted)) {
          await new Promise((resolve) => {
            renderer.render(tree.root, {
              events: outcome.events,
              onComplete: resolve,
            });
          });
        } else {
          renderer.render(tree.root, { events: outcome.events });
        }
      }
    });
    if (completed) statusPanel.complete(operation, outcome);
  }

  const form = makePanelElement(document);
  const input = makePanelElement(document);
  Object.assign(input, {
    value: '',
    valueAsNumber: Number.NaN,
    reportValidity: () => true,
    setCustomValidity() {},
  });
  const insertButton = makePanelElement(document);
  const deleteButton = makePanelElement(document);
  const clearButton = makePanelElement(document);
  const controls = new Controls({
    form,
    input,
    insertButton,
    deleteButton,
    clearButton,
    onInsert: (value) => run('insert', value),
    onDelete: (value) => run('delete', value),
    onClear() {
      animator.cancel();
      tree.clear();
      renderer.reset(null);
      codePanel.reset();
      statusPanel.reset('Garden bed cleared.');
    },
    onError(error) {
      throw error;
    },
  });

  return {
    tree,
    animator,
    renderer,
    codePanel,
    statusPanel,
    sourceCode,
    methodLabel,
    comparison,
    direction,
    resultStatus,
    seenCodes,
    controls,
    input,
    form,
    insertButton,
    deleteButton,
    clearButton,
  };
}

function setValue(input, value) {
  input.value = String(value);
  input.valueAsNumber = value;
}

async function waitForIdle(controls) {
  for (let attempt = 0; controls.busy && attempt < 100; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  assert.equal(controls.busy, false);
}

test('code panel shows the actual BST source and maps trace identifiers to their source lines', async () => {
  const document = fakeDocument();
  const container = makePanelElement(document);
  const label = makePanelElement(document);
  const source = await readFile(new URL('../src/core/BinarySearchTree.js', import.meta.url), 'utf8');
  const panel = new CodePanel({ container, operationLabel: label, source });

  const compareLine = source.split(/\r?\n/).findIndex((line) => line.includes('@trace insert.compare'));
  const row = container.children[compareLine];
  assert.equal(row.dataset.line, String(compareLine + 1));
  assert.ok(row.children[1].textContent.includes("'insert.compare'"));
  assert.equal(panel.highlight('insert.compare'), true);
  assert.ok(row.classList.contains('is-current'));
  assert.equal(label.textContent, 'insert.compare');
  assert.equal(panel.highlight('unknown.event'), false);
  assert.equal(row.classList.contains('is-current'), false);
});

test('every core event identifier is mapped to a real source line', async () => {
  const document = fakeDocument();
  const source = await readFile(new URL('../src/core/BinarySearchTree.js', import.meta.url), 'utf8');
  const panel = new CodePanel({
    container: makePanelElement(document),
    source,
  });
  const insertionTree = new BinarySearchTree();
  const leafTree = new BinarySearchTree();
  const oneChildTree = new BinarySearchTree();
  const twoChildTree = new BinarySearchTree();
  [8, 4, 12].forEach((value) => insertionTree.insert(value));
  [8, 4, 12].forEach((value) => leafTree.insert(value));
  [8, 4, 2].forEach((value) => oneChildTree.insert(value));
  [8, 4, 12, 10, 14, 9, 11].forEach((value) => twoChildTree.insert(value));
  const eventSets = [
    new BinarySearchTree().insert(8).events,
    insertionTree.insert(4).events,
    insertionTree.insert(2).events,
    insertionTree.insert(16).events,
    insertionTree.search(4).events,
    insertionTree.search(6).events,
    insertionTree.delete(4).events,
    insertionTree.delete(99).events,
    leafTree.delete(4).events,
    oneChildTree.delete(4).events,
    twoChildTree.delete(8).events,
    new BinarySearchTree().inOrderTraversal().events,
    twoChildTree.inOrderTraversal().events,
    twoChildTree.clear().events,
  ];

  for (const events of eventSets) {
    for (const event of events) {
      assert.equal(panel.highlight(event.code), true, `Missing source mapping: ${event.code}`);
    }
  }
});

test('status panel explains comparisons, directions, and deletion cases', () => {
  const document = fakeDocument();
  const comparison = makePanelElement(document);
  const direction = makePanelElement(document);
  const result = makePanelElement(document);
  const panel = new StatusPanel({ comparison, direction, result });

  panel.showEvent('insert', { type: 'start', value: 4 });
  panel.showEvent('insert', {
    type: 'compare',
    value: 4,
    nodeValue: 9,
    code: 'insert.compare',
  });
  assert.equal(comparison.textContent, '4 is smaller than 9.');
  panel.showEvent('insert', {
    type: 'traverse',
    value: 4,
    nodeValue: 9,
    direction: 'left',
    code: 'insert.left',
  });
  assert.equal(direction.textContent, 'LEFT');
  assert.match(result.textContent, /Move LEFT/);
  panel.showEvent('delete', {
    type: 'deleteStep',
    value: 9,
    nodeValue: 9,
    childValue: 4,
    code: 'delete.oneChild',
  });
  assert.match(result.textContent, /Reconnect 4/);
  panel.showEvent('search', { type: 'start', value: -2 });
  assert.match(comparison.textContent, /Searching for -2/);
});

test('invalid input and negative values are handled without suppressing valid submissions', async () => {
  const h = createInteractionHarness();
  setValue(h.input, Number.NaN);
  h.form.dispatch('submit');
  assert.equal(h.controls.busy, false);
  assert.equal(h.tree.size, 0);

  setValue(h.input, -7);
  h.form.dispatch('submit');
  await waitForIdle(h.controls);
  assert.equal(h.tree.root.value, -7);
  assert.match(h.resultStatus.textContent, /-7 found/);
});

test('controls reject overlapping actions, while clear remains available to cancel safely', async () => {
  const h = createInteractionHarness({ delay: 30 });
  setValue(h.input, 20);
  h.form.dispatch('submit');
  assert.equal(h.controls.busy, true);
  assert.equal(h.input.disabled, true);
  assert.equal(h.deleteButton.disabled, true);
  assert.equal(h.clearButton.disabled, false);

  await new Promise((resolve) => setTimeout(resolve, 1));
  setValue(h.input, 10);
  h.deleteButton.dispatch('click');
  assert.equal(h.tree.size, 1);

  h.clearButton.dispatch('click');
  assert.equal(h.tree.size, 0);
  assert.equal(h.animator.isRunning, false);
  assert.equal(h.controls.busy, false);
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(h.tree.size, 0);
  assert.ok(h.sourceCode.children.length > 0);
  assert.equal(
    h.sourceCode.children.some((row) => row.classList.contains('is-current')),
    false,
  );
  assert.equal(h.comparison.textContent, 'Garden bed cleared.');
});

test('controls remain locked until insertion and deletion animations finish', async () => {
  const h = createInteractionHarness({ animationDuration: 25 });

  setValue(h.input, 20);
  h.form.dispatch('submit');
  for (let attempt = 0; !h.renderer.pendingAnimationTimer && attempt < 100; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  assert.notEqual(h.renderer.pendingAnimationTimer, null);
  assert.equal(h.controls.busy, true);

  setValue(h.input, 10);
  h.form.dispatch('submit');
  assert.equal(h.tree.size, 1);
  await waitForIdle(h.controls);

  setValue(h.input, 20);
  h.deleteButton.dispatch('click');
  for (let attempt = 0; !h.renderer.pendingAnimationTimer && attempt < 100; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  assert.notEqual(h.renderer.pendingAnimationTimer, null);
  assert.equal(h.controls.busy, true);
  await waitForIdle(h.controls);
  assert.equal(h.tree.root, null);
});

test('an immediate clear invalidates a queued click before its operation can mutate the tree', async () => {
  const h = createInteractionHarness({ delay: 20 });
  setValue(h.input, 42);
  h.form.dispatch('submit');
  h.clearButton.dispatch('click');
  await new Promise((resolve) => setTimeout(resolve, 5));

  assert.equal(h.tree.root, null);
  assert.equal(h.controls.busy, false);
  assert.equal(h.seenCodes.length, 0);
  assert.equal(h.comparison.textContent, 'Garden bed cleared.');
});

test('clearing during deletion animation cancels its pending redraw and completion safely', async () => {
  const h = createInteractionHarness({ animationDuration: 80 });
  for (const value of [10, 5, 15]) h.tree.insert(value);
  h.renderer.render(h.tree.root, { animate: false });

  setValue(h.input, 10);
  h.deleteButton.dispatch('click');
  for (let attempt = 0; !h.renderer.pendingAnimationTimer && attempt < 100; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  assert.notEqual(h.renderer.pendingAnimationTimer, null);
  assert.equal(h.controls.busy, true);

  h.clearButton.dispatch('click');
  assert.equal(h.renderer.pendingAnimationTimer, null);
  assert.equal(h.animator.isRunning, false);
  assert.equal(h.tree.root, null);
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(h.tree.root, null);
  assert.equal(h.controls.busy, false);
});

test('insert and delete traces synchronize real source, status, and SVG updates', async () => {
  const h = createInteractionHarness();

  setValue(h.input, 10);
  h.form.dispatch('submit');
  await waitForIdle(h.controls);

  setValue(h.input, 5);
  h.form.dispatch('submit');
  await waitForIdle(h.controls);
  assert.equal(h.direction.textContent, 'LEFT');
  assert.match(h.comparison.textContent, /5 is smaller than 10/);
  assert.ok(h.renderer.findNode(5));

  setValue(h.input, 15);
  h.form.dispatch('submit');
  await waitForIdle(h.controls);
  assert.equal(h.direction.textContent, 'RIGHT');
  assert.ok(h.renderer.findNode(15));

  setValue(h.input, 10);
  h.deleteButton.dispatch('click');
  await waitForIdle(h.controls);
  assert.deepEqual(h.tree.inOrderTraversal().values, [5, 15]);
  assert.match(h.resultStatus.textContent, /was harvested/);
  assert.ok(h.seenCodes.includes('delete.successor.found'));
  assert.ok(h.seenCodes.includes('delete.twoChildren.complete'));
  assert.ok(h.codePanel.highlight('delete.twoChildren.complete'));
  assert.deepEqual(
    h.sourceCode.children
      .filter((row) => row.classList.contains('is-current'))
      .map((row) => row.children[1].textContent.trim()),
    ["events.push(createEvent('delete', 'delete.twoChildren.complete', {"],
  );
});
