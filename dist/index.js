// SpinDoctor Qwerty 1.1.0 - OpenClaw native tools
// Copyright (C) 2026 RUSSELL PHILIP SMITHSON <russellsmithson77@outlook.com>
// SPDX-License-Identifier: GPL-3.0-or-later
// This program is free software: you can redistribute it and/or modify it under the terms of the GNU General
// Public License as published by the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. It is distributed WITHOUT ANY WARRANTY; see the LICENSE file for details.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const TOOL_DEFS = JSON.parse(readFileSync(new URL('./tools.json', import.meta.url), 'utf8'));
const MAX_INPUT = 8 * 1024 * 1024;
const MAX_OUTPUT = 16 * 1024 * 1024;
const MAX_ERROR = 128 * 1024;
let queue = Promise.resolve();

function invalid(schema, value, at = 'arguments') {
  const type = schema.type;
  if (type === 'object' && (!value || typeof value !== 'object' || Array.isArray(value))) return `${at} must be an object.`;
  if (type === 'array' && !Array.isArray(value)) return `${at} must be an array.`;
  if (type === 'string' && typeof value !== 'string') return `${at} must be a string.`;
  if (type === 'boolean' && typeof value !== 'boolean') return `${at} must be a boolean.`;
  if (type === 'integer' && !Number.isSafeInteger(value)) return `${at} must be an integer.`;
  if (schema.enum && !schema.enum.includes(value)) return `${at} must be one of ${schema.enum.join(', ')}.`;
  if (type === 'object') {
    for (const key of schema.required || []) if (!Object.hasOwn(value, key)) return `${at}.${key} is required.`;
    for (const [key, item] of Object.entries(value)) {
      const known = schema.properties && Object.hasOwn(schema.properties, key);
      const child = known ? schema.properties[key] : schema.additionalProperties;
      if (child === false) return `${at}.${key} is not supported.`;
      if (child && typeof child === 'object') { const error = invalid(child, item, `${at}.${key}`); if (error) return error; }
    }
  }
  if (type === 'array' && schema.items) for (let i = 0; i < value.length; i++) { const error = invalid(schema.items, value[i], `${at}[${i}]`); if (error) return error; }
  return null;
}

function toolResult(result) {
  const text = result.ok && typeof result.markdown === 'string' ? result.markdown : JSON.stringify(result, null, 2);
  return { content: [{ type: 'text', text }], details: { ok: result.ok === true, result } };
}

function executePython(name, args, signal) {
  return new Promise((resolve) => {
    const python = process.env.SPINDOCTOR_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
    const cli = path.join(ROOT, 'engine', 'scripts', 'spindoctor_cli.py');
    const configured = Number(process.env.SPINDOCTOR_TOOL_TIMEOUT_MS || 600000);
    const timeout = Number.isFinite(configured) && configured >= 50 ? configured : 600000;
    let child, timer, stopped = null, out = [], err = [], outBytes = 0, errBytes = 0, settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort);
      resolve(result);
    };
    const stop = (message) => {
      if (settled || stopped) return;
      stopped = message;
      try { child.kill(); } catch (error) { finish({ ok: false, error: `${message} ${error.message}` }); }
    };
    const abort = () => stop('SpinDoctor tool call was cancelled.');
    if (signal?.aborted) { finish({ ok: false, error: 'SpinDoctor tool call was cancelled.' }); return; }
    try {
      child = spawn(python, ['-B', cli, 'tool', name], {
        cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, shell: false,
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONUTF8: '1' },
      });
    } catch (error) { finish({ ok: false, error: `Could not start Python: ${error.message}` }); return; }
    signal?.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => stop(`SpinDoctor tool call timed out after ${timeout} ms.`), timeout);
    child.stdout.on('data', (data) => { outBytes += data.length; if (outBytes > MAX_OUTPUT) stop('SpinDoctor output exceeded 16 MiB.'); else out.push(data); });
    child.stderr.on('data', (data) => { errBytes += data.length; if (errBytes <= MAX_ERROR) err.push(data); });
    child.stdin.on('error', (error) => { if (!settled && !stopped && error.code !== 'EPIPE') stop(`Could not send tool arguments: ${error.message}`); });
    child.on('error', (error) => finish({ ok: false, error: `Could not start Python: ${error.message}` }));
    child.on('close', (code) => {
      if (stopped) { finish({ ok: false, error: stopped }); return; }
      const stdout = Buffer.concat(out).toString('utf8').trim();
      const stderr = Buffer.concat(err).toString('utf8').trim();
      try {
        const result = JSON.parse(stdout);
        if (!result || typeof result !== 'object' || Array.isArray(result) || typeof result.ok !== 'boolean') throw new Error('missing boolean ok');
        if (code !== 0 && result.ok) { finish({ ok: false, error: `Python exited with code ${code} after reporting success.` }); return; }
        finish(result);
      } catch { finish({ ok: false, error: stderr || `Python exited with code ${code}; it did not return a valid tool result.` }); }
    });
    child.stdin.end(JSON.stringify(args));
  });
}

export async function callTool(name, args = {}, signal) {
  const def = TOOL_DEFS.find((item) => item.name === name);
  if (!def) return toolResult({ ok: false, error: `Unknown SpinDoctor tool: ${name}` });
  const error = invalid(def.parameters, args);
  if (error) return toolResult({ ok: false, error });
  for (const field of ['workspace', 'path']) if (args[field] && !path.isAbsolute(args[field])) return toolResult({ ok: false, error: `${field} must be an absolute local path.` });
  let payload;
  try { payload = JSON.stringify(args); } catch (error) { return toolResult({ ok: false, error: `Arguments must be JSON: ${error.message}` }); }
  if (Buffer.byteLength(payload) > MAX_INPUT) return toolResult({ ok: false, error: 'Tool arguments exceeded 8 MiB.' });
  // Snapshot inputs before waiting; one module instance serializes shared workspace updates.
  const inputs = JSON.parse(payload);
  const run = queue.then(() => executePython(name, inputs, signal));
  queue = run.then(() => undefined, () => undefined);
  try { return toolResult(await run); } catch (error) { return toolResult({ ok: false, error: error.message }); }
}

// Native OpenClaw definition object; no optional SDK import or hidden fallback.
export default {
  id: 'spindoctor-qwerty',
  name: 'SpinDoctor Qwerty',
  description: 'Classical SpinDoctor 3.1.2 circuit simulation, presets, function table and theory reports.',
  register(api) {
    for (const def of TOOL_DEFS) api.registerTool({
      ...def, label: def.name, executionMode: 'sequential',
      async execute(_toolCallId, params, signal) { return callTool(def.name, params, signal); },
    });
  },
};
