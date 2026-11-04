const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const DEFAULT_OPTIONS = {
  nodeRadius: 20,
  horizontalGap: 28,
  verticalGap: 86,
  padding: 38,
  minWidth: 560,
  animationDuration: 280,
};

let rendererId = 0;

function createSvgElement(document, name, attributes = {}) {
  const element = document.createElementNS(SVG_NAMESPACE, name);
  for (const [attribute, value] of Object.entries(attributes)) {
    element.setAttribute(attribute, String(value));
  }
  return element;
}

function layoutSubtree(node, level, separation) {
  if (node === null) {
    return { nodes: [], minX: 0, maxX: 0 };
  }

  const left = layoutSubtree(node.left, level + 1, separation);
  const right = layoutSubtree(node.right, level + 1, separation);
  let leftOffset = 0;
  let rightOffset = 0;

  if (node.left !== null && node.right !== null) {
    leftOffset = -left.maxX - separation / 2;
    rightOffset = separation / 2 - right.minX;
    const midpoint = (leftOffset + rightOffset) / 2;
    leftOffset -= midpoint;
    rightOffset -= midpoint;
  } else if (node.left !== null) {
    leftOffset = -separation - left.maxX;
  } else if (node.right !== null) {
    rightOffset = separation - right.minX;
  }

  const nodes = [
    { node, x: 0, depth: level },
    ...left.nodes.map((entry) => ({ ...entry, x: entry.x + leftOffset })),
    ...right.nodes.map((entry) => ({ ...entry, x: entry.x + rightOffset })),
  ];

  return {
    nodes,
    minX: Math.min(0, left.minX + leftOffset, right.minX + rightOffset),
    maxX: Math.max(0, left.maxX + leftOffset, right.maxX + rightOffset),
  };
}

/**
 * Lay out an existing binary tree without changing its structure.
 * The subtree bounds are kept apart so sibling branches cannot overlap.
 */
export function calculateTreeLayout(root, options = {}) {
  const {
    nodeRadius,
    horizontalGap,
    verticalGap,
    padding,
    minWidth,
  } = { ...DEFAULT_OPTIONS, ...options };

  if (root === null) {
    return { nodes: [], edges: [], width: minWidth, height: padding * 2 };
  }

  const separation = nodeRadius * 2 + horizontalGap;
  const subtree = layoutSubtree(root, 0, separation);
  const contentWidth = subtree.maxX - subtree.minX;
  const width = Math.max(minWidth, contentWidth + padding * 2);
  const height = padding * 2 + Math.max(...subtree.nodes.map(({ depth }) => depth)) * verticalGap;
  const nodes = subtree.nodes.map((entry) => ({
    ...entry,
    x: padding + (width - padding * 2 - contentWidth) / 2 + entry.x - subtree.minX,
    y: padding + entry.depth * verticalGap,
  }));
  const positions = new Map(nodes.map((entry) => [entry.node, entry]));
  const edges = [];

  for (const { node } of nodes) {
    for (const direction of ['left', 'right']) {
      const child = node[direction];
      if (child !== null) {
        edges.push({
          parent: node,
          child,
          direction,
          from: positions.get(node),
          to: positions.get(child),
        });
      }
    }
  }

  return { nodes, edges, width, height };
}

export default class TreeRenderer {
  constructor(svg, options = {}) {
    if (!svg || !svg.ownerDocument || typeof svg.replaceChildren !== 'function') {
      throw new TypeError('TreeRenderer requires an SVG element.');
    }

    this.svg = svg;
    this.document = svg.ownerDocument;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.markerPrefix = `tree-arrow-${rendererId}`;
    rendererId += 1;
    this.pendingAnimationTimer = null;
    this.pendingAnimationComplete = null;
  }

  render(root, {
    events = [],
    highlightValue,
    traversal,
    animate = true,
    onComplete,
  } = {}) {
    this.cancelPendingAnimation();

    const deletion = [...events].reverse().find((event) => (
      event.type === 'delete'
      && event.code.endsWith('.complete')
    ));

    if (animate && deletion && this.animateDeletion(deletion.value)) {
      this.scheduleCompletion(() => {
        this.render(root, { animate: false });
        onComplete?.();
      });
      return this.getLayout(root);
    }

    const layout = this.getLayout(root);
    const comparison = [...events].reverse().find((event) => (
      event.type === 'compare' && !event.code.includes('successor')
    ));
    const traceTraversal = [...events].reverse().find((event) => (
      event.type === 'traverse'
      && ['left', 'right'].includes(event.direction)
      && !event.code.startsWith('traversal.')
    ));
    const activeTraversal = traversal ?? traceTraversal;
    const activeValue = highlightValue ?? comparison?.nodeValue;
    const insertion = animate
      ? [...events].reverse().find((event) => event.type === 'insert')
      : null;

    this.svg.setAttribute('viewBox', `0 0 ${layout.width} ${layout.height}`);
    this.svg.setAttribute('width', layout.width);
    this.svg.setAttribute('height', layout.height);
    this.svg.replaceChildren();
    this.svg.append(this.createMarkers());

    for (const edge of layout.edges) {
      this.svg.append(this.createEdge(edge, activeTraversal));
    }

    for (const entry of layout.nodes) {
      this.svg.append(this.createNode(entry, {
        activeValue,
        insertedValue: insertion?.value,
      }));
    }

    if (insertion && this.findNode(insertion.value)) {
      this.scheduleCompletion(() => onComplete?.());
    }

    return layout;
  }

  getLayout(root) {
    return calculateTreeLayout(root, this.options);
  }

  updateTrace(event) {
    for (const node of this.svg.querySelectorAll('.tree-node')) {
      node.classList.remove('is-highlighted');
    }
    for (const edge of this.svg.querySelectorAll('.tree-edge')) {
      edge.classList.remove('is-traversed');
      edge.removeAttribute('marker-end');
    }

    const nodeValue = event.nodeValue
      ?? (event.type === 'successor' ? event.value : undefined)
      ?? (event.type === 'compare' ? event.candidateValue : undefined);
    if (nodeValue !== undefined) this.highlightNode(nodeValue);

    if (event.type === 'traverse' && ['left', 'right'].includes(event.direction)) {
      this.markTraversal(event.nodeValue, event.direction);
      const edge = [...this.svg.querySelectorAll('.tree-edge')].find((item) => (
        Number(item.getAttribute('data-parent-value')) === event.nodeValue
        && item.getAttribute('data-direction') === event.direction
      ));
      edge?.setAttribute(
        'marker-end',
        `url(#${this.markerPrefix}-${event.direction})`,
      );
    }
  }

  reset(root) {
    this.cancelPendingAnimation();
    return this.render(root, { animate: false });
  }

  scheduleCompletion(onComplete) {
    this.pendingAnimationComplete = onComplete;
    const reducedMotion = this.document.defaultView
      ?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const duration = reducedMotion ? 0 : this.options.animationDuration;

    this.pendingAnimationTimer = setTimeout(() => {
      this.pendingAnimationTimer = null;
      this.pendingAnimationComplete = null;
      onComplete();
    }, duration);
  }

  highlightNode(value) {
    const node = this.findNode(value);
    if (node) node.classList.add('is-highlighted');
    return Boolean(node);
  }

  markTraversal(nodeValue, direction) {
    if (!['left', 'right'].includes(direction)) {
      throw new TypeError('Traversal direction must be "left" or "right".');
    }

    const edge = [...this.svg.querySelectorAll('.tree-edge')].find((item) => (
      Number(item.getAttribute('data-parent-value')) === nodeValue
      && item.getAttribute('data-direction') === direction
    ));
    if (edge) edge.classList.add('is-traversed');
    return Boolean(edge);
  }

  animateDeletion(value) {
    const node = this.findNode(value);
    if (!node) return false;
    node.classList.add('is-deleting');
    return true;
  }

  cancelPendingAnimation() {
    if (this.pendingAnimationTimer !== null) {
      clearTimeout(this.pendingAnimationTimer);
      this.pendingAnimationTimer = null;
      const onComplete = this.pendingAnimationComplete;
      this.pendingAnimationComplete = null;
      onComplete?.();
    }
  }

  findNode(value) {
    return [...this.svg.querySelectorAll('[data-node-value]')].find((node) => (
      Number(node.getAttribute('data-node-value')) === value
    )) ?? null;
  }

  createMarkers() {
    const defs = createSvgElement(this.document, 'defs');

    for (const direction of ['left', 'right']) {
      const marker = createSvgElement(this.document, 'marker', {
        id: `${this.markerPrefix}-${direction}`,
        markerWidth: 8,
        markerHeight: 8,
        refX: 6,
        refY: 4,
        orient: 'auto',
        markerUnits: 'userSpaceOnUse',
      });
      marker.append(createSvgElement(this.document, 'path', {
        d: 'M 0 0 L 8 4 L 0 8 z',
        class: `traversal-arrow arrow-${direction}`,
      }));
      defs.append(marker);
    }

    return defs;
  }

  createEdge(edge, traversal) {
    const { from, to, parent, direction } = edge;
    const matchesTraversal = traversal
      && traversal.nodeValue === parent.value
      && traversal.direction === direction;
    const attributes = {
      x1: from.x,
      y1: from.y + this.options.nodeRadius,
      x2: to.x,
      y2: to.y - this.options.nodeRadius,
      class: `tree-edge edge-${direction}${matchesTraversal ? ' is-traversed' : ''}`,
      'data-parent-value': parent.value,
      'data-child-value': edge.child.value,
      'data-direction': direction,
    };

    if (matchesTraversal) {
      attributes['marker-end'] = `url(#${this.markerPrefix}-${direction})`;
    }

    return createSvgElement(this.document, 'line', attributes);
  }

  createNode(entry, { activeValue, insertedValue }) {
    const { node, x, y } = entry;
    const group = createSvgElement(this.document, 'g', {
      class: [
        'tree-node',
        node.value === activeValue ? 'is-highlighted' : '',
        node.value === insertedValue ? 'is-entering' : '',
      ].filter(Boolean).join(' '),
      transform: `translate(${x} ${y})`,
      'data-node-value': node.value,
      role: 'img',
      'aria-label': `Tree node ${node.value}`,
    });
    const title = createSvgElement(this.document, 'title');
    title.textContent = `Value ${node.value}`;
    group.append(
      title,
      createSvgElement(this.document, 'circle', {
        r: this.options.nodeRadius,
        class: 'node-shadow',
      }),
      createSvgElement(this.document, 'circle', {
        r: this.options.nodeRadius - 2,
        class: 'node-disc',
      }),
    );

    const label = createSvgElement(this.document, 'text', {
      class: 'node-label',
      y: 1,
    });
    label.textContent = String(node.value);
    group.append(label);
    return group;
  }
}