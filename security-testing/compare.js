const fs = require('fs');
const path = require('path');

const read = n => JSON.parse(fs.readFileSync(path.join(__dirname, `results_${n}.json`), 'utf8'));
const before = read('before');
const after = read('after');

const rows = before.map(b => {
  const a = after.find(x => x.Check === b.Check);
  return {
    Check: b.Check,
    Before: b.Status,
    After: a ? a.Status : 'n/a',
    Result: a && a.Status !== b.Status ? 'FIXED' : '',
  };
});

console.table(rows);

const md = [
  '| Check | Before | After | Result |',
  '|---|---|---|---|',
  ...rows.map(r => `| ${r.Check} | ${r.Before} | ${r.After} | ${r.Result} |`),
].join('\n');
fs.writeFileSync(path.join(__dirname, 'comparison.md'), md + '\n');
console.log('Saved comparison.md');