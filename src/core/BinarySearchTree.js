import TreeNode from './TreeNode.js';

function validateValue(value) {
  if (!Number.isFinite(value)) {
    throw new TypeError('BinarySearchTree values must be finite numbers.');
  }
}

function createEvent(type, code, details = {}) {
  return { type, code, ...details };
}

export default class BinarySearchTree {
  constructor() {
    this.root = null;
    this.size = 0;
  }

  insert(value) {
    validateValue(value);
    const events = [
      createEvent('start', 'insert.start', { value }), // @trace insert.start
    ];

    if (this.root === null) {
      this.root = new TreeNode(value);
      this.size += 1;
      events.push(createEvent('insert', 'insert.root', { // @trace insert.root
        value,
        parentValue: null,
        direction: null,
      }));
      return { inserted: true, value, events };
    }

    let current = this.root;
    while (true) {
      events.push(createEvent('compare', 'insert.compare', { // @trace insert.compare
        value,
        nodeValue: current.value,
      }));

      if (value === current.value) {
        events.push(createEvent('duplicate', 'insert.duplicate', { // @trace insert.duplicate
          value,
          nodeValue: current.value,
        }));
        return { inserted: false, value, events };
      }

      const direction = value < current.value ? 'left' : 'right';
      const child = current[direction];
      events.push(createEvent('traverse', `insert.${direction}`, { // @trace insert.left, insert.right
        value,
        nodeValue: current.value,
        direction,
      }));

      if (child === null) {
        current[direction] = new TreeNode(value);
        this.size += 1;
        events.push(createEvent('insert', 'insert.node', { // @trace insert.node
          value,
          parentValue: current.value,
          direction,
        }));
        return { inserted: true, value, events };
      }

      current = child;
    }
  }

  search(value) {
    validateValue(value);
    const events = [createEvent('start', 'search.start', { value })]; // @trace search.start
    let current = this.root;

    while (current !== null) {
      events.push(createEvent('compare', 'search.compare', { // @trace search.compare
        value,
        nodeValue: current.value,
      }));

      if (value === current.value) {
        events.push(createEvent('search', 'search.found', { // @trace search.found
          value,
          nodeValue: current.value,
        }));
        return { found: true, node: current, value, events };
      }

      const direction = value < current.value ? 'left' : 'right';
      events.push(createEvent('traverse', `search.${direction}`, { // @trace search.left, search.right
        value,
        nodeValue: current.value,
        direction,
      }));
      current = current[direction];
    }

    events.push(createEvent('search', 'search.notFound', { value })); // @trace search.notFound
    return { found: false, node: null, value, events };
  }

  delete(value) {
    validateValue(value);
    const events = [createEvent('start', 'delete.start', { value })]; // @trace delete.start
    let parent = null;
    let current = this.root;

    while (current !== null && current.value !== value) {
      events.push(createEvent('compare', 'delete.compare', { // @trace delete.compare
        value,
        nodeValue: current.value,
      }));
      const direction = value < current.value ? 'left' : 'right';
      events.push(createEvent('traverse', `delete.${direction}`, { // @trace delete.left, delete.right
        value,
        nodeValue: current.value,
        direction,
      }));
      parent = current;
      current = current[direction];
    }

    if (current === null) {
      events.push(createEvent('delete', 'delete.notFound', { value })); // @trace delete.notFound
      return { deleted: false, value, events };
    }

    events.push(createEvent('compare', 'delete.compare', { // @trace delete.compare
      value,
      nodeValue: current.value,
    }));

    if (current.left !== null && current.right !== null) {
      events.push(createEvent('deleteStep', 'delete.twoChildren', { // @trace delete.twoChildren
        value,
        nodeValue: current.value,
      }));

      let successorParent = current;
      let successor = current.right;
      events.push(createEvent('traverse', 'delete.successor.right', { // @trace delete.successor.right
        nodeValue: current.value,
        direction: 'right',
      }));

      while (true) {
        events.push(createEvent('compare', 'delete.successor.compare', { // @trace delete.successor.compare
          nodeValue: successor.value,
          candidateValue: successor.left?.value ?? null,
        }));
        if (successor.left === null) break;

        events.push(createEvent('traverse', 'delete.successor.left', { // @trace delete.successor.left
          nodeValue: successor.value,
          direction: 'left',
        }));
        successorParent = successor;
        successor = successor.left;
      }

      events.push(createEvent('successor', 'delete.successor.found', { // @trace delete.successor.found
        value: successor.value,
        deletedValue: current.value,
      }));
      current.value = successor.value;
      const successorChild = successor.right;
      if (successorParent === current) {
        successorParent.right = successorChild;
      } else {
        successorParent.left = successorChild;
      }

      this.size -= 1;
      events.push(createEvent('delete', 'delete.twoChildren.complete', { // @trace delete.twoChildren.complete
        value,
        replacementValue: successor.value,
      }));
      return { deleted: true, value, events };
    }

    const child = current.left ?? current.right;
    const deletionCase = child === null ? 'leaf' : 'oneChild';
    events.push(createEvent('deleteStep', `delete.${deletionCase}`, { // @trace delete.leaf, delete.oneChild
      value,
      nodeValue: current.value,
      childValue: child?.value ?? null,
    }));

    if (parent === null) {
      this.root = child;
    } else if (parent.left === current) {
      parent.left = child;
    } else {
      parent.right = child;
    }

    this.size -= 1;
    events.push(createEvent('delete', `delete.${deletionCase}.complete`, { // @trace delete.leaf.complete, delete.oneChild.complete
      value,
      nodeValue: current.value,
    }));
    return { deleted: true, value, events };
  }

  clear() {
    const previousSize = this.size; // @trace clear.start
    this.root = null;
    this.size = 0;

    return {
      cleared: true,
      previousSize,
      events: [
        createEvent('start', 'clear.start', { previousSize }),
        createEvent('clear', 'clear.complete', { previousSize }), // @trace clear.complete
      ],
    };
  }

  inOrderTraversal() {
    const values = [];
    const events = [createEvent('start', 'traversal.inOrder.start')]; // @trace traversal.inOrder.start

    const visit = (node) => {
      if (node === null) return;

      events.push(createEvent('traverse', 'traversal.inOrder.left', { // @trace traversal.inOrder.left
        nodeValue: node.value,
        direction: 'left',
      }));
      visit(node.left);

      values.push(node.value);
      events.push(createEvent('visit', 'traversal.inOrder.visit', { // @trace traversal.inOrder.visit
        value: node.value,
      }));

      events.push(createEvent('traverse', 'traversal.inOrder.right', { // @trace traversal.inOrder.right
        nodeValue: node.value,
        direction: 'right',
      }));
      visit(node.right);
    };

    visit(this.root);
    events.push(createEvent('complete', 'traversal.inOrder.complete', { // @trace traversal.inOrder.complete
      count: values.length,
    }));
    return { values, events };
  }
}