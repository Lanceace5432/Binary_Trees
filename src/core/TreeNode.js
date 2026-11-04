export default class TreeNode {
  constructor(value) {
    if (!Number.isFinite(value)) {
      throw new TypeError('TreeNode value must be a finite number.');
    }

    this.value = value;
    this.left = null;
    this.right = null;
  }
}