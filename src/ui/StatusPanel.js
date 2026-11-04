function directionText(direction) {
  return direction === 'left' ? 'LEFT' : direction === 'right' ? 'RIGHT' : '—';
}

export default class StatusPanel {
  constructor({ comparison, direction, result }) {
    if (!comparison || !direction || !result) {
      throw new TypeError('StatusPanel requires comparison, direction, and result elements.');
    }

    this.comparison = comparison;
    this.direction = direction;
    this.result = result;
  }

  showEvent(operation, event) {
    switch (event.type) {
      case 'start':
        this.comparison.textContent = operation === 'insert'
          ? `Finding a place for ${event.value}.`
          : operation === 'delete'
            ? `Looking for ${event.value} to harvest.`
            : `Searching for ${event.value}.`;
        this.direction.textContent = '—';
        this.result.textContent = operation === 'insert'
          ? `Planting ${event.value}…`
          : operation === 'delete'
            ? `Searching for ${event.value}…`
            : `Looking for ${event.value}…`;
        break;
      case 'compare': {
        if (event.code === 'delete.successor.compare') {
          this.comparison.textContent = event.candidateValue === null
            ? `${event.nodeValue} has no left child; it is the successor.`
            : `Check for a smaller successor than ${event.nodeValue}.`;
          this.direction.textContent = event.candidateValue === null ? 'FOUND' : 'LEFT?';
          this.result.textContent = event.candidateValue === null
            ? `The in-order successor is ${event.nodeValue}.`
            : `Inspect the left subtree of ${event.nodeValue}.`;
          break;
        }
        const target = event.value ?? this.activeValue;
        const comparedValue = event.nodeValue;
        if (target === undefined || comparedValue === undefined) break;
        const relation = target < comparedValue
          ? 'smaller than'
          : target > comparedValue
            ? 'larger than'
            : 'equal to';
        this.comparison.textContent = `${target} is ${relation} ${comparedValue}.`;
        this.direction.textContent = target === comparedValue ? 'FOUND' : '—';
        this.result.textContent = target === comparedValue
          ? `Found ${target}.`
          : `Comparing ${target} with ${comparedValue}.`;
        break;
      }
      case 'traverse':
        if (event.direction === 'left' || event.direction === 'right') {
          this.direction.textContent = directionText(event.direction);
          if (event.code.startsWith('delete.successor.')) {
            this.comparison.textContent = `Move ${directionText(event.direction)} to find the in-order successor.`;
            this.result.textContent = `Follow the ${directionText(event.direction)} branch.`;
            break;
          }
          if (event.nodeValue !== undefined) {
            const target = event.value ?? this.activeValue;
            if (target !== undefined) {
              const relation = target < event.nodeValue ? 'smaller than' : 'larger than';
              this.comparison.textContent = `${target} is ${relation} ${event.nodeValue}.`;
            }
          }
          this.result.textContent = `Move ${directionText(event.direction)} from ${event.nodeValue}.`;
        }
        break;
      case 'insert':
        this.result.textContent = event.parentValue === null
          ? `Planted ${event.value} as the root of the garden.`
          : `Planted ${event.value} ${directionText(event.direction)} of ${event.parentValue}.`;
        break;
      case 'duplicate':
        this.result.textContent = `${event.value} is already growing here. Each value gets one spot.`;
        break;
      case 'search':
        this.result.textContent = event.nodeValue !== undefined
          ? `Found ${event.value}.`
          : `${event.value} is not growing here.`;
        break;
      case 'deleteStep':
        this.result.textContent = event.code === 'delete.leaf'
          ? `${event.nodeValue} is a leaf; remove it directly.`
          : event.code === 'delete.oneChild'
            ? `Reconnect ${event.childValue} where ${event.nodeValue} was.`
            : `Find the in-order successor of ${event.nodeValue}.`;
        break;
      case 'successor':
        this.comparison.textContent = `Successor ${event.value} replaces ${event.deletedValue}.`;
        this.result.textContent = `The next value in order is ${event.value}.`;
        break;
      case 'delete':
        this.result.textContent = event.code.endsWith('.complete')
          ? `Harvested ${event.value}.`
          : `${event.value} is not growing in this garden.`;
        break;
      default:
        break;
    }

    if (event.value !== undefined) this.activeValue = event.value;
    this.direction.dataset.direction = ['LEFT', 'RIGHT'].includes(this.direction.textContent)
      ? this.direction.textContent.toLowerCase()
      : '';
    if (event.code === 'clear.complete') this.reset('Garden bed cleared.');
  }

  complete(operation, result) {
    if (operation === 'insert') {
      this.result.textContent = result.inserted
        ? `${result.value} found a place in your garden.`
        : `${result.value} is already growing here. Each value gets one spot.`;
    } else if (operation === 'delete') {
      this.result.textContent = result.deleted
        ? `${result.value} was harvested from your garden.`
        : `${result.value} isn’t growing in this garden.`;
    }
  }

  showError(error) {
    this.result.textContent = `Operation failed: ${error.message}`;
  }

  reset(message = 'Add a number to begin.') {
    this.activeValue = undefined;
    this.comparison.textContent = message;
    this.direction.textContent = '—';
    this.direction.dataset.direction = '';
    this.result.textContent = message;
  }
}