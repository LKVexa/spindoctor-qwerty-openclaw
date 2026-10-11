// SpinDoctor Qwerty 1.1.0 - installed OpenClaw loader harness
// Copyright (C) 2026 RUSSELL PHILIP SMITHSON <russellsmithson77@outlook.com>
// SPDX-License-Identifier: GPL-3.0-or-later
// This program is free software: you can redistribute it and/or modify it under the terms of the GNU General
// Public License as published by the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. It is distributed WITHOUT ANY WARRANTY; see the LICENSE file for details.
import path from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import definition from '../dist/index.js';

// Explicit component mode keeps useful real registrar tests available when the OS prevents
// the complete host's guarded filesystem discovery. It never replaces native registry code.
async function loadRegistryComponents(hostRoot, host) {
  const dist = path.join(hostRoot, 'dist');
  let file, symbol;
  for (const item of readdirSync(dist)) {
    if (!/^registry-.*\.mjs$/.test(item)) continue;
    const source = readFileSync(path.join(dist, item), 'utf8');
    if (!source.includes('function createPluginRegistry(registryParams)')) continue;
    const exported = source.match(/createPluginRegistry as (\w+)/);
    if (exported) { file = item; symbol = exported[1]; break; }
  }
  if (!file) throw new Error('Installed host does not expose the expected compiled native registry.');
  const registryModule = await import(pathToFileURL(path.join(dist, file)));
  const composed = registryModule[symbol]({ runtime: { config: { current: () => ({}) } }, coreGatewayMethodNames: [] });
  const exportFile = readdirSync(dist).find((item) => /^module-export-.*\.mjs$/.test(item) && readFileSync(path.join(dist, item), 'utf8').includes('function resolvePluginModuleExport('));
  if (!exportFile) throw new Error('Installed host module-export resolver is unavailable.');
  const exportSource = readFileSync(path.join(dist, exportFile), 'utf8');
  const exportSymbol = exportSource.match(/resolvePluginModuleExport as (\w+)/)?.[1];
  const exportModule = await import(pathToFileURL(path.join(dist, exportFile)));
  const resolved = exportModule[exportSymbol]({ default: definition });
  if (resolved.definition !== definition || resolved.register !== definition.register) throw new Error('Native host rejected the plugin definition export.');
  const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const manifest = JSON.parse(readFileSync(path.join(pluginRoot, 'openclaw.plugin.json'), 'utf8'));
  const record = { id: manifest.id, name: manifest.name, version: manifest.version, contracts: manifest.contracts,
    rootDir: pluginRoot, source: path.join(pluginRoot, 'dist/index.js'), origin: 'global', enabled: true,
    toolNames: [], hookNames: [], status: 'loaded' };
  resolved.register({ registerTool: (tool, options) => composed.registerTool(record, tool, options) });
  const tools = new Map();
  for (const item of composed.registry.tools) {
    const created = item.factory({});
    for (const tool of Array.isArray(created) ? created : [created]) if (tool) tools.set(tool.name, tool);
  }
  return { host, registry: composed.registry, plugin: record, tools, components: true, nativeDefinitionResolved: true, registrar: composed.registerTool,
    boundary: 'Complete installed native registry/registrars, supplied record and registration API initialization. CLI install, manifest discovery, enablement and lifecycle guards are not covered.' };
}

export async function loadNativeTools() {
  const hostRoot = process.env.OPENCLAW_PACKAGE;
  if (!hostRoot || !path.isAbsolute(hostRoot)) throw new Error('Set OPENCLAW_PACKAGE to the absolute installed OpenClaw package directory.');
  const host = JSON.parse(readFileSync(path.join(hostRoot, 'package.json'), 'utf8'));
  if (process.env.SPINDOCTOR_OPENCLAW_COMPONENTS === '1') return loadRegistryComponents(hostRoot, host);
  const { loadOpenClawPlugins } = await import(pathToFileURL(path.join(hostRoot, 'dist/plugins/loader.js')));
  const { loadConfig } = await import(pathToFileURL(path.join(hostRoot, 'dist/config/config.js')));
  const config = loadConfig();
  const registry = loadOpenClawPlugins({ config, workspaceDir: process.env.SPINDOCTOR_WORKSPACE, cache: false });
  const plugin = registry.plugins.find((entry) => entry.id === 'spindoctor-qwerty');
  if (!plugin || plugin.status !== 'loaded') throw new Error(`SpinDoctor native loading failed: ${JSON.stringify(plugin || registry.diagnostics.slice(0, 3))}`);
  const entries = registry.tools.filter((entry) => entry.pluginId === 'spindoctor-qwerty');
  const tools = new Map();
  for (const entry of entries) {
    const created = entry.factory({ config, workspaceDir: process.env.SPINDOCTOR_WORKSPACE, agentId: 'spindoctor-check', sessionKey: 'spindoctor-check' });
    for (const tool of Array.isArray(created) ? created : [created]) if (tool) tools.set(tool.name, tool);
  }
  return { host, registry, plugin, tools, components: false,
    boundary: 'Real installed native loader/registry and concrete native tool execution.' };
}
