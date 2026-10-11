// SpinDoctor Qwerty 1.1.0 - native OpenClaw checks
// Copyright (C) 2026 RUSSELL PHILIP SMITHSON <russellsmithson77@outlook.com>
// SPDX-License-Identifier: GPL-3.0-or-later
// This program is free software: you can redistribute it and/or modify it under the terms of the GNU General
// Public License as published by the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. It is distributed WITHOUT ANY WARRANTY; see the LICENSE file for details.
import { readFileSync, existsSync, mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadNativeTools } from './native_host.mjs';
import entry, { TOOL_DEFS, callTool } from '../dist/index.js';

console.log = (...items) => console.error(...items);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [];
function check(name, pass, detail) { checks.push({ name, pass: Boolean(pass), ...(detail === undefined ? {} : { detail }) }); console.error(`${pass ? 'PASS' : 'FAIL'} ${name}`); }
const temp = mkdtempSync(path.join(tmpdir(), 'spindoctor-openclaw-'));
const oldWorkspace = process.env.SPINDOCTOR_WORKSPACE;
try {
  const native = await loadNativeTools();
  const { tools } = native;
  const manifest = JSON.parse(readFileSync(path.join(root, 'openclaw.plugin.json'), 'utf8'));
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  check(native.components ? 'real installed registry registrar accepted six native tools' : 'real installed OpenClaw loader accepted plugin', native.plugin.status === 'loaded', { version: native.host.version, status: native.plugin.status, components: native.components });
  check('native registry owns exactly six tools', tools.size === 6 && [...tools.keys()].every((name) => manifest.contracts.tools.includes(name)));
  if (native.components) {
    check('real installed module-export resolver accepts plain definition', native.nativeDefinitionResolved);
    const count = native.registry.tools.length;
    const badRecord = { ...native.plugin, id: 'broken-contract', contracts: {}, toolNames: [] };
    native.registrar(badRecord, { ...TOOL_DEFS[0], execute() {} });
    check('real registrar rejects missing tool ownership contract', native.registry.tools.length === count && native.registry.diagnostics.at(-1)?.message.includes('contracts.tools'));
    const undeclared = { ...native.plugin, id: 'undeclared-tool', contracts: { tools: ['other'] }, toolNames: [] };
    native.registrar(undeclared, { ...TOOL_DEFS[0], execute() {} });
    check('real registrar rejects undeclared tool names', native.registry.tools.length === count && native.registry.diagnostics.at(-1)?.message.includes(TOOL_DEFS[0].name));
  }
  check('versions, full author and GPL-3.0-or-later', pkg.version === '1.1.0' && manifest.version === '1.1.0' && pkg.license === 'GPL-3.0-or-later' && pkg.author === 'RUSSELL PHILIP SMITHSON <russellsmithson77@outlook.com>' && readFileSync(path.join(root, 'LICENSE'), 'utf8').includes('Version 3, 29 June 2007'));
  check('manifest relative entry and skill paths exist', pkg.openclaw.extensions.every((file) => existsSync(path.resolve(root, file))) && manifest.skills.every((file) => existsSync(path.resolve(root, file, 'spindoctor-qwerty/SKILL.md'))));
  check('native concrete tools preserve six schemas', TOOL_DEFS.every((def) => JSON.stringify(tools.get(def.name)?.parameters) === JSON.stringify(def.parameters)));
  check('native execution mode is sequential', [...tools.values()].every((tool) => tool.executionMode === 'sequential'));
  const python = process.env.SPINDOCTOR_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const snapshot = spawnSync(python, ['-B', '-c', "import sys,json;sys.path.insert(0,sys.argv[1]);from spindoctor import api;print(json.dumps(api.TOOLS))", path.join(root, 'engine')], { encoding: 'utf8', windowsHide: true });
  const engineDefs = JSON.parse(snapshot.stdout);
  check('schemas match engine except closed top-level objects', engineDefs.every((def, index) => { def.parameters.additionalProperties = false; return JSON.stringify(def) === JSON.stringify(TOOL_DEFS[index]); }));
  const execute = async (name, args, signal) => (await tools.get(name).execute(`check-${checks.length}`, args, signal)).details.result;
  const functions = await tools.get('spindoctor_functions').execute('functions', {});
  check('function table is raw Markdown in native text', functions.details.ok && functions.content[0].text === functions.details.result.markdown && functions.content[0].text.includes('Function | What it does | Command to type'));
  const presets = await execute('spindoctor_list_presets', {});
  check('all 241 presets available through native execution', presets.ok && presets.count === 241);
  const run = await execute('spindoctor_run_script', { script: 'q.circuit new persisted 2\nq.circuit add h 0\nq.circuit add cx 0 1\nq.circuit run shots 64 basis z', workspace: temp });
  check('native Bell circuit creates TXT and PDF reports', run.ok && run.results.some((item) => item.reports?.some((file) => file.endsWith('.pdf') && existsSync(file))));
  const second = await execute('spindoctor_run_script', { script: 'q.circuit result', workspace: temp });
  check('separate native calls retain workspace state', second.ok && second.results[0].result.qubits === 2);
  const reports = await execute('spindoctor_report', { workspace: temp });
  check('reports are per-call workspace outputs', reports.ok && path.resolve(reports.reportsDir) === path.join(temp, 'reports') && reports.reports.length > 0);
  const traversal = await execute('spindoctor_report', { workspace: temp, name: '../outside.txt' });
  check('report traversal is rejected', traversal.ok === false && traversal.error.includes('inside'));
  check('missing required arguments rejected', (await execute('spindoctor_run_script', {})).ok === false);
  check('argument arrays rejected', (await execute('spindoctor_run_script', [])).ok === false);
  check('wrong nested override type rejected', (await execute('spindoctor_run_preset', { preset_id: 'qc-001', overrides: { shots: 32 } })).ok === false);
  check('unknown argument rejected', (await execute('spindoctor_functions', { unexpected: true })).ok === false);
  check('prototype-named unknown argument rejected', (await execute('spindoctor_functions', JSON.parse('{"__proto__": {}}'))).ok === false);
  check('invalid enum rejected', (await execute('spindoctor_functions', { section: 'invalid' })).ok === false);
  check('fractional report limit rejected', (await execute('spindoctor_report', { limit: 1.5 })).ok === false);
  check('relative workspace rejected', (await execute('spindoctor_run_script', { script: 'q.help', workspace: 'relative' })).ok === false);
  check('relative attachment rejected', (await execute('spindoctor_test_theory', { source: 'file', path: 'relative.txt' })).ok === false);
  check('unknown tool returns a structured failure', (await callTool('missing', {})).details.ok === false);
  const failed = await tools.get('spindoctor_run_script').execute('invalid-command', { script: 'q.invalid', workspace: temp });
  check('engine failure stays a native failure', failed.details.ok === false && failed.details.result.ok === false && failed.content[0].type === 'text');
  check('299 logical qubits rejected', (await execute('spindoctor_run_script', { script: 'q.circuit new over 299', workspace: temp })).ok === false);
  const order = await Promise.all([
    execute('spindoctor_run_script', { script: 'q.circuit new ordered 1', workspace: temp }),
    execute('spindoctor_run_script', { script: 'q.circuit add x 0\nq.circuit run shots 8 basis z\nq.circuit result', workspace: temp }),
  ]);
  check('concurrent native calls serialize workspace state', order.every((result) => result.ok) && order[1].results.at(-1).result.histogram[0].bitstring === '1');
  const aborted = new AbortController(); aborted.abort();
  check('pre-cancelled native call produces no engine reports', (await execute('spindoctor_run_script', { script: 'q.help', workspace: path.join(temp, 'cancelled') }, aborted.signal)).ok === false && !existsSync(path.join(temp, 'cancelled')));
  const oldPython = process.env.SPINDOCTOR_PYTHON;
  const oldTimeout = process.env.SPINDOCTOR_TOOL_TIMEOUT_MS;
  process.env.SPINDOCTOR_TOOL_TIMEOUT_MS = '50';
  check('timeout terminates the child and returns a structured failure', (await execute('spindoctor_functions', {})).error?.includes('timed out'));
  if (oldTimeout === undefined) delete process.env.SPINDOCTOR_TOOL_TIMEOUT_MS; else process.env.SPINDOCTOR_TOOL_TIMEOUT_MS = oldTimeout;
  const inFlight = new AbortController();
  const pending = execute('spindoctor_functions', {}, inFlight.signal);
  setTimeout(() => inFlight.abort(), 10);
  check('in-flight cancellation terminates the child', (await pending).error?.includes('cancelled'));
  check('queue recovers after timeout and cancellation', (await execute('spindoctor_functions', {})).ok);
  process.env.SPINDOCTOR_PYTHON = path.join(temp, 'missing-python');
  check('Python startup failure is structured', (await execute('spindoctor_functions', {})).error.includes('Could not start Python'));
  if (oldPython === undefined) delete process.env.SPINDOCTOR_PYTHON; else process.env.SPINDOCTOR_PYTHON = oldPython;
  const skill = readFileSync(path.join(root, 'skills/spindoctor-qwerty/SKILL.md'), 'utf8');
  check('skill names all tools and confirms chat theories', TOOL_DEFS.every((def) => skill.includes(def.name)) && skill.includes("user's confirmation") && skill.includes('cannot'));
  const forbidden = [];
  const walk = (dir) => { for (const file of readdirSync(dir, { withFileTypes: true })) { const child = path.join(dir, file.name); if (file.name === '__pycache__' || file.name.endsWith('.pyc')) forbidden.push(child); if (file.isDirectory() && file.name !== '.git' && file.name !== 'node_modules') walk(child); } };
  walk(root);
  check('source stays free of Python caches', forbidden.length === 0, forbidden.length);
  const summary = { hostVersion: native.host.version, node: process.version, passed: checks.filter((item) => item.pass).length, total: checks.length, checks, boundary: native.boundary + ' No model, interactive UI or Linux/macOS host session.' };
  const out = process.argv[2];
  if (out) { mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); writeFileSync(out, JSON.stringify(summary, null, 2) + '\n'); }
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  if (summary.passed !== summary.total) process.exitCode = 1;
} finally {
  if (oldWorkspace === undefined) delete process.env.SPINDOCTOR_WORKSPACE; else process.env.SPINDOCTOR_WORKSPACE = oldWorkspace;
  if (path.dirname(path.resolve(temp)) !== path.resolve(tmpdir()) || !path.basename(temp).startsWith('spindoctor-openclaw-')) throw new Error('Unsafe test cleanup path');
  rmSync(temp, { recursive: true, force: true });
}
