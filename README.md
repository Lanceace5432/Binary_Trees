# Binary Search Tree Visualizer

An educational web project for exploring how a Binary Search Tree (BST) works. Follow each comparison and traversal in the source while the tree grows or changes.

> **Status:** The BST core, responsive SVG visualization, and trace-driven browser interface are implemented.

## Technology stack

- **HTML5 and CSS3** for the document and responsive, cozy farm-inspired presentation.
- **Vanilla JavaScript with ES modules** for application logic and UI.
- **Vite** for development and production builds.
- **Node.js built-in test runner** for core, renderer, and UI interaction tests.

No backend or additional runtime dependency is required. The core BST is independent of the DOM; the renderer and UI consume its structured operation results and trace events.

## Project structure

```text
Binary_Trees/
├── docs/
│   └── ARCHITECTURE.md
├── src/
│   ├── core/
│   │   ├── TreeNode.js
│   │   └── BinarySearchTree.js
│   ├── visualization/
│   │   └── TreeRenderer.js
│   ├── ui/
│   │   ├── Controls.js
│   │   ├── CodePanel.js
│   │   └── StatusPanel.js
│   ├── utils/
│   │   └── animation.js
│   ├── styles/
│   │   ├── main.css
│   │   ├── theme.css
│   │   └── components.css
│   ├── assets/
│   │   └── .gitkeep
│   └── main.js
├── tests/
│   ├── BinarySearchTree.test.js
│   ├── TreeRenderer.test.js
│   └── ui.test.js
├── index.html
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for module responsibilities and data flow.

## Getting started

Requires Node.js and npm.

```sh
npm install
npm run dev
```

Build and preview the production output:

```sh
npm run build
npm run preview
```

Run all tests with:

```sh
npm test
```

## Features

The BST core supports finite-number insertion, search, duplicate prevention, all deletion cases (including two-child deletion by in-order successor), clearing, and in-order traversal. Operations return structured trace events with stable `code` identifiers.

The browser interface provides **Plant**, **Harvest**, and **Clear bed** controls, a live SVG tree, status explanations, and a line-numbered panel of the actual `BinarySearchTree.js` source. Each operation trace synchronizes node/edge highlighting, comparison text, LEFT/RIGHT direction, and source-line highlighting. Insertions and deletions animate; other trace steps play sequentially. Controls are locked during playback, while Clear cancels and resets an in-progress operation.

The desktop layout places source and visualization panels side-by-side; on mobile they stack. Search and in-order traversal are available in the core API and covered by tests, but do not currently have dedicated interface controls.
