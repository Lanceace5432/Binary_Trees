import assert from 'node:assert/strict';
import test from 'node:test';
import BinarySearchTree from '../src/core/BinarySearchTree.js';
import TreeRenderer, { calculateTreeLayout } from '../src/visualization/TreeRenderer.js';

function makeTree(values) {
  const tree = new BinarySearchTree();
  for (const value of values) tree.insert(value);
  return tree;
}

class FakeElement {
  constructor(ownerDocument, name) {
    this.ownerDocument = ownerDocument;
    this.name = name;
    this.attributes = new Map();
    this.children = [];
    this.textContent = '';
    this.classList = {
      add: (...classes) => {
        const current = new Set((this.getAttribute('class') ?? '').split(/\s+/).filter(Boolean));
        for (const className of classes) current.add(className);
        this.setAttribute('class', [...current].join(' '));
      },
      contains: (className) => (this.getAttribute('class') ?? '')
        .split(/\s+/)
        .includes(className),
      remove: (...classes) => {
        const current = new Set((this.getAttribute('class') ?? '').split(/\s+/).filter(Boolean));
        for (const className of classes) current.delete(className);
        this.setAttribute('class', [...current].join(' '));
      },
    };
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
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

  querySelectorAll(selector) {
    const matches = [];
    const visit = (element) => {
      for (const child of element.children) {
        if (
          selector === '[data-node-value]'
            ? child.getAttribute('data-node-value') !== null
            : selector === '.tree-node'
              ? child.classList.contains('tree-node')
              : selector === '.tree-edge'
                ? child.classList.contains('tree-edge')
                : false
        ) {
          matches.push(child);
        }
        visit(child);
      }
    };
    visit(this);
    return matches;
  }
}

function makeSvg() {
  const document = {
    createElementNS(_namespace, name) {
      return new FakeElement(document, name);
    },
  };
  return new FakeElement(document, 'svg');
}

function positionsAtDepth(layout, depth) {
  return layout.nodes
    .filter((entry) => entry.depth === depth)
    .map((entry) => entry.x)
    .sort((a, b) => a - b);
}

test('balanced trees are centered and keep nodes separated at each depth', () => {
  const tree = makeTree([8, 4, 12, 2, 6, 10, 14]);
  const layout = calculateTreeLayout(tree.root);
  const rootPosition = layout.nodes.find(({ node }) => node === tree.root);

  assert.equal(layout.nodes.length, 7);
  assert.equal(layout.edges.length, 6);
  assert.equal(rootPosition.x, layout.width / 2);
  for (let depth = 1; depth <= 2; depth += 1) {
    const positions = positionsAtDepth(layout, depth);
    assert.ok(positions.every((x, index) => (
      index === 0 || x - positions[index - 1] >= 68
    )));
  }
});

test('left- and right-skewed trees receive dynamic, collision-free layouts', () => {
  const leftValues = Array.from({ length: 10 }, (_, index) => 50 - index * 5);
  const rightValues = [...leftValues].reverse();
  for (const values of [leftValues, rightValues]) {
    const tree = makeTree(values);
    const layout = calculateTreeLayout(tree.root);
    const positions = new Map(layout.nodes.map(({ node, x, y }) => [node.value, { x, y }]));

    assert.ok(layout.width > 560);
    assert.equal(layout.nodes.length, values.length);
    for (let depth = 0; depth < values.length; depth += 1) {
      assert.equal(positions.get(values[depth]).y, 38 + depth * 86);
    }
    assert.equal(layout.edges.length, values.length - 1);
  }
});

test('irregular trees preserve parent-child relationships and separate branch bounds', () => {
  const tree = makeTree([40, 20, 60, 10, 30, 25, 27, 55, 70, 65]);
  const layout = calculateTreeLayout(tree.root);
  const positions = new Map(layout.nodes.map(({ node, x, y }) => [node, { x, y }]));

  assert.equal(layout.edges.length, tree.size - 1);
  for (const { parent, child, direction } of layout.edges) {
    assert.equal(child, parent[direction]);
    assert.equal(positions.get(child).y, positions.get(parent).y + 86);
    assert.ok(
      direction === 'left'
        ? positions.get(child).x < positions.get(parent).x
        : positions.get(child).x > positions.get(parent).x,
    );
  }
});

test('renderer draws nodes and relationship edges with trace highlighting', () => {
  const tree = makeTree([8, 4, 12, 2, 6]);
  const svg = makeSvg();
  const renderer = new TreeRenderer(svg);

  renderer.render(tree.root, {
    animate: false,
    events: [
      { type: 'compare', code: 'insert.compare', nodeValue: 4 },
      { type: 'traverse', code: 'insert.right', nodeValue: 4, direction: 'right' },
    ],
  });

  const nodes = svg.querySelectorAll('[data-node-value]');
  const edges = svg.querySelectorAll('.tree-edge');
  assert.equal(nodes.length, 5);
  assert.equal(edges.length, 4);
  assert.ok(nodes.some((node) => (
    node.getAttribute('data-node-value') === '4'
    && node.classList.contains('is-highlighted')
  )));
  assert.ok(edges.some((edge) => (
    edge.getAttribute('data-parent-value') === '4'
    && edge.getAttribute('data-direction') === 'right'
    && edge.classList.contains('is-traversed')
    && edge.getAttribute('marker-end').includes('right')
  )));
  assert.equal(renderer.highlightNode(12), true);
  assert.equal(renderer.markTraversal(8, 'left'), true);
  assert.equal(renderer.highlightNode(999), false);
});

test('trace updates move the node and traversal highlight from step to step', () => {
  const tree = makeTree([8, 4, 12]);
  const svg = makeSvg();
  const renderer = new TreeRenderer(svg);
  renderer.render(tree.root, { animate: false });

  renderer.updateTrace({ type: 'compare', nodeValue: 8 });
  assert.ok(svg.querySelectorAll('[data-node-value]').find((node) => (
    node.getAttribute('data-node-value') === '8'
  )).classList.contains('is-highlighted'));

  renderer.updateTrace({
    type: 'traverse',
    nodeValue: 8,
    direction: 'left',
  });
  const nodes = svg.querySelectorAll('[data-node-value]');
  assert.ok(nodes.find((node) => node.getAttribute('data-node-value') === '8')
    .classList.contains('is-highlighted'));
  assert.equal(nodes.find((node) => node.getAttribute('data-node-value') === '12')
    .classList.contains('is-highlighted'), false);
  assert.ok(svg.querySelectorAll('.tree-edge').some((edge) => (
    edge.getAttribute('data-direction') === 'left'
    && edge.classList.contains('is-traversed')
    && edge.getAttribute('marker-end').includes('left')
  )));
});

test('insertions are highlighted for the CSS entry animation', () => {
  const tree = makeTree([8]);
  const svg = makeSvg();
  const renderer = new TreeRenderer(svg, { animationDuration: 0 });
  renderer.render(tree.root, { animate: false });

  const insertion = tree.insert(4);
  let completed = false;
  renderer.render(tree.root, {
    events: insertion.events,
    onComplete: () => {
      completed = true;
    },
  });

  assert.ok(svg.querySelectorAll('[data-node-value]').some((node) => (
    node.getAttribute('data-node-value') === '4'
    && node.classList.contains('is-entering')
  )));
  return new Promise((resolve) => setTimeout(resolve, 5)).then(() => {
    assert.equal(completed, true);
  });
});

test('deletions animate the removed node and then render the updated tree', async () => {
  const tree = makeTree([8, 4, 12]);
  const svg = makeSvg();
  const renderer = new TreeRenderer(svg, { animationDuration: 0 });
  renderer.render(tree.root, { animate: false });

  const deletion = tree.delete(4);
  renderer.render(tree.root, { events: deletion.events });
  assert.ok(svg.querySelectorAll('[data-node-value]').some((node) => (
    node.getAttribute('data-node-value') === '4'
    && node.classList.contains('is-deleting')
  )));

  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.deepEqual(
    svg.querySelectorAll('[data-node-value]')
      .map((node) => Number(node.getAttribute('data-node-value')))
      .sort((a, b) => a - b),
    [8, 12],
  );
  assert.throws(() => renderer.markTraversal(8, 'up'), TypeError);
});

test('deleting the final node completes its animation before showing an empty SVG', async () => {
  const tree = makeTree([8]);
  const svg = makeSvg();
  const renderer = new TreeRenderer(svg, { animationDuration: 0 });
  renderer.render(tree.root, { animate: false });

  const deletion = tree.delete(8);
  let completed = false;
  renderer.render(tree.root, {
    events: deletion.events,
    onComplete: () => {
      completed = true;
    },
  });

  assert.equal(svg.querySelectorAll('[data-node-value]')[0].classList.contains('is-deleting'), true);
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(completed, true);
  assert.equal(svg.querySelectorAll('[data-node-value]').length, 0);
});
