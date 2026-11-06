import './styles/main.css';
import bstSource from './core/BinarySearchTree.js?raw';
import BinarySearchTree from './core/BinarySearchTree.js';
import TreeRenderer from './visualization/TreeRenderer.js';
import CodePanel from './ui/CodePanel.js';
import Controls from './ui/Controls.js';
import StatusPanel from './ui/StatusPanel.js';
import TraceAnimator from './utils/animation.js';

const tree = new BinarySearchTree();
const app = document.querySelector('#app');

app.innerHTML = `
  <div class="page-shell">
    <header class="site-header">
      <a class="brand" href="#" aria-label="Little Tree Garden home">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 40 40" focusable="false">
            <path d="M18 34h5V19h-5z" />
            <path d="M20 22C7 22 5 13 8 8c7 0 12 3 12 11C20 11 26 5 34 7c1 8-3 15-14 15z" />
            <path class="mark-vein" d="M20 20 9 10m11 9L31 9" />
          </svg>
        </span>
        <span>
          <span class="brand-title">Little Tree Garden</span>
          <span class="brand-subtitle">A binary search tree workshop</span>
        </span>
      </a>
      <div class="header-note"><span class="sun-dot" aria-hidden="true"></span> A little room to grow</div>
    </header>

    <main class="workspace">
      <section class="intro" aria-labelledby="page-title">
        <div>
          <p class="eyebrow">YOUR DATA STRUCTURE GARDEN</p>
          <h1 id="page-title">Plant a tree, <span>one number at a time.</span></h1>
          <p class="intro-copy">Watch each value find its place. Smaller numbers grow to the left; larger ones, to the right.</p>
        </div>
        <div class="intro-sprout" aria-hidden="true">
          <span>✿</span><span>✳</span><span>✿</span>
          <svg viewBox="0 0 100 70" focusable="false">
            <path d="M10 58h80M20 58V39m20 19V28m20 30V36m20 22V24" />
            <path d="M20 42c-13 0-13-13-10-17 10 0 14 6 10 17Zm20-14C27 28 26 16 31 12c10 2 13 10 9 16Zm20 10c-12 0-15-11-12-16 10-1 16 5 12 16Zm20-14c-11 0-14-10-10-15 10-1 15 6 10 15Z" />
          </svg>
        </div>
      </section>

      <div class="dashboard">
        <aside class="panel source-panel" aria-labelledby="source-heading">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">THE RECIPE</p>
              <h2 id="source-heading">JavaScript source</h2>
            </div>
            <span class="file-tag" id="source-file">BinarySearchTree.js</span>
          </div>
          <p class="panel-hint">Follow the steps that give every value its place.</p>
          <div class="code-window">
            <div class="code-toolbar">
              <span class="file-dots" aria-hidden="true"><i></i><i></i><i></i></span>
              <span id="source-method">insert()</span>
              <span class="language-tag">JS</span>
            </div>
            <pre class="code-list" id="source-code" aria-label="JavaScript source with line numbers"></pre>
          </div>
          <div class="code-legend"><span aria-hidden="true"></span> Current algorithm step</div>
        </aside>

        <section class="panel garden-panel" aria-labelledby="tree-heading">
          <div class="panel-heading tree-heading">
            <div>
              <p class="eyebrow">THE GARDEN BED</p>
              <h2 id="tree-heading">Your growing tree</h2>
            </div>
            <div class="tree-count"><span id="node-count">0</span><span>nodes</span></div>
          </div>

          <div class="tree-stage" id="tree-stage">
            <div class="empty-garden" id="empty-garden">
              <svg viewBox="0 0 120 90" aria-hidden="true" focusable="false">
                <path class="empty-ground" d="M14 72h92M24 72c8-13 64-13 72 0" />
                <path class="empty-stem" d="M60 66V40m0 12c-18 0-22-12-17-20 12 0 19 7 17 20Zm0-8c0-15 10-22 21-20 2 11-5 20-21 20Z" />
                <path class="empty-spark" d="M31 27v8m-4-4h8m52-12v8m-4-4h8" />
              </svg>
              <p class="empty-title">A fresh patch of earth</p>
              <p>Plant your first number to get started.</p>
            </div>
            <svg class="tree-svg" id="tree-svg" role="img" aria-label="Binary search tree" hidden></svg>
          </div>

          <form class="controls" id="tree-controls">
            <label class="number-field" for="number-input">
              <span>Seed number</span>
              <span class="input-wrap">
                <span aria-hidden="true">#</span>
                <input id="number-input" name="value" type="number" step="any" required placeholder="e.g. 42" autocomplete="off" />
              </span>
            </label>
            <button class="button button-plant" type="submit">
              <span aria-hidden="true">✦</span> Plant
            </button>
            <button class="button button-remove" id="delete-button" type="button">Harvest</button>
            <button class="button button-clear" id="clear-button" type="button">Clear bed</button>
          </form>
        </section>
      </div>

      <section class="status-panel" aria-labelledby="status-title">
        <div class="status-title-wrap">
          <span class="status-icon" aria-hidden="true">✿</span>
          <div>
            <p class="eyebrow">GARDEN JOURNAL</p>
            <h2 id="status-title">What’s happening?</h2>
          </div>
        </div>
        <div class="status-detail">
          <span class="status-label">COMPARISON</span>
          <span id="comparison-status">Add a number to begin.</span>
        </div>
        <div class="status-detail direction-detail">
          <span class="status-label">DIRECTION</span>
          <span class="direction-value" id="direction-status">—</span>
        </div>
        <div class="status-result" id="result-status" role="status" aria-live="polite">Your garden is ready for its first seed.</div>
      </section>
    </main>

    <footer class="site-footer">
      <span>Grown with patience &amp; a little curiosity</span>
      <span class="footer-flower" aria-hidden="true">✿</span>
      <span>Every tree starts somewhere</span>
    </footer>
  </div>
`;

const input = document.querySelector('#number-input');
const sourceCode = document.querySelector('#source-code');
const sourceMethod = document.querySelector('#source-method');
const treeSvg = document.querySelector('#tree-svg');
const emptyGarden = document.querySelector('#empty-garden');
const treeRenderer = new TreeRenderer(treeSvg);
const codePanel = new CodePanel({
  container: sourceCode,
  operationLabel: sourceMethod,
  source: bstSource,
});
const statusPanel = new StatusPanel({
  comparison: document.querySelector('#comparison-status'),
  direction: document.querySelector('#direction-status'),
  result: document.querySelector('#result-status'),
});
const animator = new TraceAnimator({ delay: 420 });

function renderTree(events = []) {
  const count = document.querySelector('#node-count');
  count.textContent = String(tree.size);

  const deletion = [...events].reverse().find((event) => (
    event.type === 'delete' && event.code.endsWith('.complete')
  ));
  const delayEmptyState = tree.root === null
    && deletion
    && treeRenderer.findNode(deletion.value);

  emptyGarden.hidden = Boolean(delayEmptyState) || tree.root !== null;
  treeSvg.hidden = tree.root === null && !delayEmptyState;

  const insertion = [...events].reverse().find((event) => event.type === 'insert');
  const waitForAnimation = Boolean(delayEmptyState || (insertion && tree.root !== null));

  if (!waitForAnimation) {
    treeRenderer.render(tree.root, { events });
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    treeRenderer.render(tree.root, {
      events,
      onComplete: () => {
        if (delayEmptyState) {
          emptyGarden.hidden = false;
          treeSvg.hidden = true;
        }
        resolve();
      },
    });
  });
}

async function playOperation(operation, result) {
  const completed = await animator.play(result.events, async (event, index) => {
    statusPanel.showEvent(operation, event);
    codePanel.highlight(event.code);
    treeRenderer.updateTrace(event);

    if (index === result.events.length - 1) {
      await renderTree(result.events);
    }
  });

  if (completed) statusPanel.complete(operation, result);
}

new Controls({
  form: document.querySelector('#tree-controls'),
  input,
  insertButton: document.querySelector('.button-plant'),
  deleteButton: document.querySelector('#delete-button'),
  clearButton: document.querySelector('#clear-button'),
  onInsert(value) {
    const result = tree.insert(value);
    return playOperation('insert', result);
  },
  onDelete(value) {
    const result = tree.delete(value);
    return playOperation('delete', result);
  },
  onClear() {
    animator.cancel();
    treeRenderer.reset(null);
    tree.clear();
    emptyGarden.hidden = false;
    treeSvg.hidden = true;
    document.querySelector('#node-count').textContent = '0';
    codePanel.reset();
    statusPanel.reset('Garden bed cleared.');
    controls.setBusy(false);
  },
  onError(error) {
    statusPanel.showError(error);
    console.error(error);
  },
});

codePanel.reset();
treeRenderer.reset(tree.root);
