// SpinDoctor Qwerty 1.1.0 - MCP test transport to real OpenClaw native tools
// Copyright (C) 2026 RUSSELL PHILIP SMITHSON <russellsmithson77@outlook.com>
// SPDX-License-Identifier: GPL-3.0-or-later
// This program is free software: you can redistribute it and/or modify it under the terms of the GNU General
// Public License as published by the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. It is distributed WITHOUT ANY WARRANTY; see the LICENSE file for details.
import readline from 'node:readline';
import { loadNativeTools } from './native_host.mjs';

console.log = (...items) => console.error(...items);
const { tools } = await loadNativeTools();
const input = readline.createInterface({ input: process.stdin });
for await (const line of input) {
  if (!line.trim()) continue;
  let message;
  try { message = JSON.parse(line); } catch { continue; }
  if (message.id === undefined) continue;
  let result, error;
  try {
    if (message.method === 'initialize') result = { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'spindoctor-openclaw-native-test-bridge', version: '1.1.0' } };
    else if (message.method === 'tools/list') result = { tools: [...tools.values()].map(({ name, description, parameters }) => ({ name, description, inputSchema: parameters })) };
    else if (message.method === 'tools/call') {
      const tool = tools.get(message.params?.name);
      if (!tool) throw new Error('Unknown tool');
      const native = await tool.execute(String(message.id), message.params.arguments || {});
      result = { content: native.content, structuredContent: native.details.result, isError: native.details.ok !== true };
    } else if (message.method === 'ping') result = {};
    else error = { code: -32601, message: 'Unknown method' };
  } catch (cause) { error = { code: -32603, message: cause.message }; }
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: message.id, ...(error ? { error } : { result }) }) + '\n');
}
