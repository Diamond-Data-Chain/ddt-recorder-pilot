'use strict';

function assertScalarString(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF) {
      if (i + 1 >= s.length) throw new Error('unpaired high surrogate');
      const d = s.charCodeAt(i + 1);
      if (!(d >= 0xDC00 && d <= 0xDFFF)) throw new Error('unpaired high surrogate');
      i++;
    } else if (c >= 0xDC00 && c <= 0xDFFF) {
      throw new Error('unpaired low surrogate');
    }
  }
}

function canonicalize(v) {
  if (v === null) return 'null';
  const t = typeof v;
  if (t === 'boolean') return v ? 'true' : 'false';
  if (t === 'number') {
    if (!Number.isFinite(v)) throw new Error('non-finite number');
    return JSON.stringify(v);
  }
  if (t === 'string') {
    assertScalarString(v);
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) return '[' + v.map(canonicalize).join(',') + ']';
  if (t === 'object') {
    const keys = Object.keys(v);
    for (const k of keys) assertScalarString(k);
    keys.sort(); // ECMAScript UTF-16 code-unit order, as required by RFC 8785/JCS.
    return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(v[k])).join(',') + '}';
  }
  throw new Error('unsupported JSON type: ' + t);
}

let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => data += c);
process.stdin.on('end', () => {
  try {
    const value = JSON.parse(data);
    process.stdout.write(canonicalize(value));
  } catch (e) {
    process.stderr.write(String(e && e.message ? e.message : e));
    process.exit(2);
  }
});
