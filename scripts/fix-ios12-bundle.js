/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function listJsFiles(buildDir) {
  const jsDir = path.join(buildDir, 'static', 'js');
  if (!fs.existsSync(jsDir)) return [];
  return fs
    .readdirSync(jsDir)
    .filter((f) => f.endsWith('.js') && !f.endsWith('.js.LICENSE.txt'))
    .map((f) => path.join(jsDir, f));
}

function patchOptionalChainingAmbiguity(code) {
  // En bundles minificados, a veces el ternario `cond ? .5 : 1` acaba como `cond?.5:1`,
  // que en Safari iOS 12 se tokeniza como optional chaining (`?.`) y rompe con SyntaxError.
  // Sustituimos solo el patrón ambiguo `?.<digito>` por `? .<digito>` (espacio), que vuelve
  // a ser un literal numérico válido (`.5`, `.05`, etc.).
  return code.replace(/\?\.(?=\d)/g, '? .');
}

function main() {
  const buildDir = path.join(process.cwd(), 'build');
  const files = listJsFiles(buildDir);
  if (!files.length) {
    console.log('[fix-ios12-bundle] No JS files found in build output; skipping.');
    return;
  }

  let totalReplacements = 0;
  for (const file of files) {
    const original = fs.readFileSync(file, 'utf8');
    const patched = patchOptionalChainingAmbiguity(original);
    if (patched === original) continue;

    const before = (original.match(/\?\.(?=\d)/g) || []).length;
    const after = (patched.match(/\?\.(?=\d)/g) || []).length;
    const replaced = before - after;
    totalReplacements += replaced;

    fs.writeFileSync(file, patched, 'utf8');
    console.log(`[fix-ios12-bundle] Patched ${path.basename(file)} (replaced ${replaced}).`);
  }

  if (!totalReplacements) {
    console.log('[fix-ios12-bundle] No ambiguous `?.<digit>` patterns found; nothing to patch.');
  } else {
    console.log(`[fix-ios12-bundle] Done. Total replacements: ${totalReplacements}.`);
  }
}

main();

