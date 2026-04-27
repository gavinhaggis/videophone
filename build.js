#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = __dirname;

const JS_FILES = [
  'js/utils.js',
  'js/scene.js',
  'js/iphone.js',
  'js/animation.js',
  'js/export.js',
  'js/controls.js',
  'js/main.js',
];

function build() {
  // ── GLB ──────────────────────────────────────────────────────────────────
  const glbPath = path.join(ROOT, 'scene.glb');
  if (!fs.existsSync(glbPath)) {
    console.error('Error: scene.glb not found');
    process.exit(1);
  }
  const glbBase64 = fs.readFileSync(glbPath).toString('base64');

  // ── JS files ──────────────────────────────────────────────────────────────
  const cdnImports = new Set();
  const chunks = [];

  for (const file of JS_FILES) {
    const filePath = path.join(ROOT, file);
    if (!fs.existsSync(filePath)) {
      console.error(`Error: ${file} not found`);
      process.exit(1);
    }
    let code = fs.readFileSync(filePath, 'utf8');

    // Collect CDN imports (anything not starting with ./)
    const lines = code.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^import\s+/.test(trimmed) && !/from\s+['"]\.\//.test(trimmed)) {
        cdnImports.add(trimmed.replace(/;$/, '') + ';');
      }
    }

    // Strip all import lines then collapse excess blank lines
    code = code
      .replace(/^import\s+.+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    chunks.push(`// ── ${file} ──\n${code}`);
  }

  // Replace the GLB file path with the injected blob URL variable
  let js = chunks.join('\n\n');
  js = js.replace(/['"]\.\/scene\.glb['"]/g, '__glbUrl');

  // ── CSS ───────────────────────────────────────────────────────────────────
  const css = fs.readFileSync(path.join(ROOT, 'css/styles.css'), 'utf8');

  // ── Assemble HTML ─────────────────────────────────────────────────────────
  const glbDecoder = [
    '// Decode embedded GLB into a blob URL',
    'const __glbUrl = (() => {',
    `  const b64 = '${glbBase64}';`,
    '  const bin = atob(b64);',
    '  const buf = new Uint8Array(bin.length);',
    "  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);",
    "  return URL.createObjectURL(new Blob([buf], { type: 'model/gltf-binary' }));",
    '})();',
  ].join('\n');

  const html = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="UTF-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '  <title>3D iPhone Renderer</title>',
    '  <style>',
    css,
    '  </style>',
    '  <script type="importmap">',
    '  {',
    '    "imports": {',
    '      "three": "https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js",',
    '      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/",',
    '      "lil-gui": "https://cdn.jsdelivr.net/npm/lil-gui@0.20.0/dist/lil-gui.esm.js"',
    '    }',
    '  }',
    '  </' + 'script>',
    '  <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></' + 'script>',
    '</head>',
    '<body>',
    '  <div id="loading">',
    '    <div class="spinner"></div>',
    '    <p id="loading-text">Loading model...</p>',
    '  </div>',
    '  <div id="status-bar"></div>',
    '  <script type="module">',
    [...cdnImports].join('\n'),
    '',
    glbDecoder,
    '',
    js,
    '  </' + 'script>',
    '</body>',
    '</html>',
  ].join('\n');

  const outPath = path.join(ROOT, 'standalone.html');
  fs.writeFileSync(outPath, html, 'utf8');

  const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
  console.log(`Built standalone.html — ${sizeMB} MB`);
}

build();
