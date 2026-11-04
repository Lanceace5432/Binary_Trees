import assert from 'node:assert/strict';
import test from 'node:test';
import BinarySearchTree from '../src/core/BinarySearchTree.js';
import TreeNode from '../src/core/TreeNode.js';

function makeTree(values) {
  const tree = new BinarySearchTree();
  for (const value of values) tree.insert(value);
  return tree;
}

function valuesOf(tree) {
  return tree.inOrderTraversal().values;
}

test('TreeNode initializes its value and empty children', () => {
  const node = new TreeNode(8);
  assert.equal(node.value, 8);
  assert.equal(node.left, null);
  assert.equal(node.right, null);
});

test('TreeNode and BST reject non-finite values', () => {
  assert.throws(() => new TreeNode(Number.NaN), TypeError);
  const tree = new BinarySearchTree();
  assert.throws(() => tree.insert(Infinity), TypeError);
  assert.throws(() => tree.insert('8'), TypeError);
  assert.throws(() => tree.insert(null), TypeError);
  assert.throws(() => tree.search(Number.NaN), TypeError);
  assert.throws(() => tree.search('8'), TypeError);
  assert.throws(() => tree.delete(-Infinity), TypeError);
  assert.throws(() => tree.delete(null), TypeError);
});

test('insert builds an ordered tree and emits comparison and traversal traces', () => {
  const tree = new BinarySearchTree();
  assert.equal(tree.insert(8).inserted, true);

  const result = tree.insert(3);
  assert.equal(result.inserted, true);
  assert.deepEqual(valuesOf(tree), [3, 8]);
  assert.ok(result.events.some((event) => event.code === 'insert.compare'));
  assert.ok(result.events.some((event) => (
    event.type === 'traverse'
    && event.code === 'insert.left'
    && event.direction === 'left'
  )));
  assert.ok(result.events.every((event) => typeof event.code === 'string'));
  assert.equal(tree.size, 2);
});

test('duplicate insertion is prevented without changing the tree', () => {
  const tree = makeTree([8, 3, 10]);
  const result = tree.insert(3);

  assert.equal(result.inserted, false);
  assert.deepEqual(valuesOf(tree), [3, 8, 10]);
  assert.equal(tree.size, 3);
  assert.ok(result.events.some((event) => event.code === 'insert.duplicate'));
});

test('search reports found and missing values with comparison and traversal traces', () => {
  const tree = makeTree([8, 3, 10, 1]);
  const found = tree.search(1);
  const missing = tree.search(6);

  assert.equal(found.found, true);
  assert.equal(found.node.value, 1);
  assert.ok(found.events.some((event) => event.code === 'search.compare'));
  assert.ok(found.events.some((event) => event.code === 'search.left'));
  assert.ok(found.events.some((event) => event.code === 'search.found'));
  assert.equal(missing.found, false);
  assert.equal(missing.node, null);
  assert.ok(missing.events.some((event) => event.code === 'search.notFound'));
});

test('negative and zero values insert, search, and traverse in numeric order', () => {
  const tree = makeTree([0, -10, 10, -2, 4]);

  assert.deepEqual(valuesOf(tree), [-10, -2, 0, 4, 10]);
  assert.equal(tree.search(-2).found, true);
  assert.equal(tree.search(-3).found, false);
  assert.equal(tree.delete(-10).deleted, true);
  assert.deepEqual(valuesOf(tree), [-2, 0, 4, 10]);
});

test('deleting a leaf removes only that node', () => {
  const tree = makeTree([8, 3, 10]);
  const result = tree.delete(3);

  assert.equal(result.deleted, true);
  assert.deepEqual(valuesOf(tree), [8, 10]);
  assert.equal(tree.size, 2);
  assert.ok(result.events.some((event) => event.code === 'delete.leaf'));
  assert.ok(result.events.some((event) => event.code === 'delete.leaf.complete'));
});

test('deleting a node with one child reconnects its child', () => {
  const tree = makeTree([8, 3, 1, 10]);
  const result = tree.delete(3);

  assert.equal(result.deleted, true);
  assert.deepEqual(valuesOf(tree), [1, 8, 10]);
  assert.equal(tree.root.left.value, 1);
  assert.ok(result.events.some((event) => event.code === 'delete.oneChild'));
});

test('deleting a node with only a right child reconnects that child', () => {
  const tree = makeTree([8, 3, 6]);
  assert.equal(tree.delete(3).deleted, true);
  assert.deepEqual(valuesOf(tree), [6, 8]);
  assert.equal(tree.root.left.value, 6);
});

test('deleting a node with two children replaces it with its in-order successor', () => {
  const tree = makeTree([8, 3, 12, 10, 14, 9, 11]);
  const result = tree.delete(8);

  assert.equal(result.deleted, true);
  assert.equal(tree.root.value, 9);
  assert.deepEqual(valuesOf(tree), [3, 9, 10, 11, 12, 14]);
  assert.equal(tree.size, 6);
  assert.ok(result.events.some((event) => event.code === 'delete.twoChildren'));
  assert.ok(result.events.some((event) => event.code === 'delete.successor.left'));
  assert.ok(result.events.some((event) => event.code === 'delete.successor.found'));
});

test('deleting a node whose right child is its successor reconnects the successor child', () => {
  const tree = makeTree([8, 3, 10, 11]);
  assert.equal(tree.delete(8).deleted, true);
  assert.deepEqual(valuesOf(tree), [3, 10, 11]);
  assert.equal(tree.root.value, 10);
  assert.equal(tree.root.right.value, 11);
});

test('deleting the root with one child updates the root', () => {
  const tree = makeTree([8, 3]);
  assert.equal(tree.delete(8).deleted, true);
  assert.equal(tree.root.value, 3);
  assert.deepEqual(valuesOf(tree), [3]);
});

test('deleting a missing value leaves the tree unchanged', () => {
  const tree = makeTree([8, 3, 10]);
  const result = tree.delete(7);

  assert.equal(result.deleted, false);
  assert.deepEqual(valuesOf(tree), [3, 8, 10]);
  assert.equal(tree.size, 3);
  assert.ok(result.events.some((event) => event.code === 'delete.notFound'));
});

test('in-order traversal returns sorted values and trace events', () => {
  const result = makeTree([8, 3, 10, 1, 6]).inOrderTraversal();

  assert.deepEqual(result.values, [1, 3, 6, 8, 10]);
  assert.ok(result.events.some((event) => event.code === 'traversal.inOrder.left'));
  assert.ok(result.events.some((event) => event.code === 'traversal.inOrder.visit'));
  assert.ok(result.events.some((event) => event.code === 'traversal.inOrder.right'));
  assert.equal(result.events.at(-1).code, 'traversal.inOrder.complete');
});

test('clear empties the tree and reports the previous size', () => {
  const tree = makeTree([8, 3, 10]);
  const result = tree.clear();

  assert.equal(result.cleared, true);
  assert.equal(result.previousSize, 3);
  assert.equal(tree.root, null);
  assert.equal(tree.size, 0);
  assert.deepEqual(valuesOf(tree), []);
  assert.ok(result.events.some((event) => event.code === 'clear.complete'));
});