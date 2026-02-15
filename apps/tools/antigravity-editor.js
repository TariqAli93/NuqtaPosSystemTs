// tools/antigravity-editor.cjs
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function stripFileScheme(s) {
  return s.replace(/^file:\/\/\//i, '').replace(/^file:\/\//i, '');
}

function stripOuterQuotes(s) {
  let t = String(s ?? '').trim();
  for (let i = 0; i < 3; i++) {
    t = t.replace(/^"+/, '').replace(/"+$/, '').trim();
    t = t.replace(/^'+/, '').replace(/'+$/, '').trim();
  }
  return t;
}

function parseFileLineCol(input) {
  const s = stripOuterQuotes(stripFileScheme(input));
  // Match end ...:<line>:<col>  (keep Windows drive D:\ intact)
  const m = s.match(/^(.*):(\d+):(\d+)$/);
  if (!m) return { file: s, line: null, col: null };
  return { file: m[1], line: m[2], col: m[3] };
}

function isProbablyPath(s) {
  return /[\\/]/.test(s) || /^[A-Za-z]:\\/.test(s);
}

function findFileInRoots(filename, roots) {
  for (const root of roots) {
    if (!root || !fs.existsSync(root)) continue;
    const hit = findFirstMatch(root, filename);
    if (hit) return hit;
  }
  return null;
}

function findFirstMatch(dir, filename) {
  // fast DFS search; stops at first match
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(cur, e.name);
      if (e.isFile() && e.name === filename) return full;
      if (e.isDirectory()) stack.push(full);
    }
  }
  return null;
}

function main() {
  // Vue DevTools عادة يمرّر argument واحد، لكن خليه يدعم الكل
  const raw = process.argv.slice(2).join(' ').trim();
  if (!raw) process.exit(1);

  const { file, line, col } = parseFileLineCol(raw);

  const cwd = process.cwd();
  const roots = [path.join(cwd, 'apps', 'ui', 'src'), path.join(cwd, 'src')];

  let targetPath = file;

  // إذا DevTools أرسل بس اسم ملف (LoginView.vue) ابحث عنه داخل المشروع
  if (!isProbablyPath(targetPath)) {
    const found = findFileInRoots(targetPath, roots);
    if (found) targetPath = found;
  } else {
    // إذا مسار نسبي، حوّله لمسار مطلق
    if (!path.isAbsolute(targetPath)) targetPath = path.resolve(cwd, targetPath);
  }

  const gotoArg = line && col ? `${targetPath}:${line}:${col}` : targetPath;

  // شغّل Antigravity. إذا CLI عندك يستخدم -g بدل --goto غيّرها هنا فقط.
  const res = spawnSync('antigravity', ['--goto', gotoArg], {
    stdio: 'inherit',
    windowsHide: true,
    shell: true, // مهم حتى يلقى antigravity من PATH
  });

  process.exit(res.status ?? 1);
}

main();
