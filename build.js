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

function embedGlb(varName, filename) {
  const glbPath = path.join(ROOT, filename);
  if (!fs.existsSync(glbPath)) {
    console.error(`Error: ${filename} not found`);
    process.exit(1);
  }
  const b64 = fs.readFileSync(glbPath).toString('base64');
  return [
    `const ${varName} = (() => {`,
    `  const b64 = '${b64}';`,
    '  const bin = atob(b64);',
    '  const buf = new Uint8Array(bin.length);',
    '  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);',
    "  return URL.createObjectURL(new Blob([buf], { type: 'model/gltf-binary' }));",
    '})();',
  ].join('\n');
}

function build() {

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

  // Replace GLB file paths with injected blob URL variables
  let js = chunks.join('\n\n');
  js = js.replace(/['"]\.\/scene\.glb['"]/g, '__glbUrl');
  js = js.replace(/['"]\.\/macbook\.glb['"]/g, '__macbookGlbUrl');

  // ── CSS ───────────────────────────────────────────────────────────────────
  const css = fs.readFileSync(path.join(ROOT, 'css/styles.css'), 'utf8');

  // ── Body content from index.html (preserves loading screen SVG etc.) ───────
  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const bodyMatch = indexHtml.match(/<body>([\s\S]*?)<\/body>/);
  const bodyContent = bodyMatch[1]
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '') // strip script tags
    .trimEnd();

  // ── Assemble HTML ─────────────────────────────────────────────────────────
  const glbDecoder = [
    '// Decode embedded GLBs into blob URLs',
    embedGlb('__glbUrl', 'scene.glb'),
    embedGlb('__macbookGlbUrl', 'macbook.glb'),
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
    bodyContent,
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
