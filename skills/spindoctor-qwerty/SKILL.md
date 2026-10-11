---
name: spindoctor-qwerty
description: Run SpinDoctor circuits and presets, show the function table, ingest command folders, and test theories from files, pasted text or a confirmed chat summary. Use for Bell/GHZ/QFT circuits, qubits, gates, measurements or SpinDoctor.
license: GPL-3.0-or-later
compatibility: OpenClaw native tools; Python 3.8+ for the bundled engine. Classical FP64 simulation only.
metadata:
  author: RUSSELL PHILIP SMITHSON
  version: "1.1.0"
---

Use the native OpenClaw tools `spindoctor_functions`, `spindoctor_run_script`, `spindoctor_run_preset`,
`spindoctor_list_presets`, `spindoctor_report` and `spindoctor_test_theory`. On first use or when asked for
help, capabilities or functions, call `spindoctor_functions` and show its Markdown table verbatim.
`section="presets"` lists all 241 presets. If the host exposes tools through search, search for these exact
names before calling them. A restrictive OpenClaw tool policy must allow these tools or this plugin.

Provide absolute local paths for attachment files, exported transcripts, command folders and custom
workspaces. Have the host make attachments available locally, or pass their text. The plugin cannot
read the conversation or fetch attachments by itself. Reports/state default to `~/spindoctor-workspace`;
`SPINDOCTOR_WORKSPACE` or a call's `workspace` parameter selects another folder. Keep reports outside
the plugin installation. Calls through one loaded plugin instance execute in order; use separate
workspaces for separate processes or host profiles.

For a chat-derived theory, summarize the claims, assumptions, variables and measurable prediction,
then obtain the user's confirmation or correction before calling `spindoctor_test_theory` with
`source="chat"`. Pass the confirmed summary and optional verbatim excerpts or an exported transcript.
`action="extract"` reads the source; `action="run"` tests it and writes TXT, JSON and PDF reports.
Verdicts are supported, not supported or inconclusive within the stated simulator limits.

Example script: `q.circuit new bell 2`, `q.circuit add h 0`, `q.circuit add cx 0 1`,
`q.circuit run shots 1000 basis z`, `q.circuit result` (one command per line).

SpinDoctor is a classical FP64 simulator on an ordinary computer. It is not a quantum computer,
connects to no quantum hardware and claims no quantum speed-up or advantage. Registers contain
1–298 logical qubits; each entangled factor contains at most 59 and dense state is limited by memory
(2^n × 16 bytes). Registers wider than 29 qubits sample in basis Z only. Full joint query analysis is
limited to 16 qubits. Shot counts fluctuate around exact probabilities. `q.compile synthesize` returns
an explanatory unsupported error. `q.folder` runs synchronously, so cancel has nothing to interrupt.

Folder ingestion reads the top-level `.txt/.csv/.json/.qasm/.qasm2/.circuit/.pdf` files, at most 128 files,
4 MiB per file, 128 commands per file and 4096 characters per command. Other files are skipped and
listed. The first failing file stops the job. Use the function table for all 16 command families and gates.

If native tools are unavailable, the bundled CLI is `engine/scripts/spindoctor_cli.py` relative to the
plugin root. Locate its absolute path before invoking Python. On Windows use `python`; elsewhere
use `python3`. Example: `<python> -B <absolute-cli-path> functions`. No Python packages are required;
NumPy is optional. An explicit CLI invocation bypasses the wrapper's call queue and cancellation.

Copyright (C) 2026 RUSSELL PHILIP SMITHSON <russellsmithson77@outlook.com>.
