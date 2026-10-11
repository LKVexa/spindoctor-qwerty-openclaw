# SpinDoctor Qwerty for OpenClaw 1.1.0

Six native OpenClaw tools and one skill for the SpinDoctor **3.1.2** classical simulator, updated build
`3.1.2-298-20261010`. The bundled Python engine is **1.1.0** and matches the shared upgrade kit.
It supports up to 298 logical qubits, 241 presets, a function table and theory test reports.

SpinDoctor performs classical FP64 simulation on an ordinary computer. It connects to no quantum
hardware and claims no quantum speed-up or advantage.

## Install

Use OpenClaw **2026.10.1** or newer with its supported Node runtime (Node 24.16+ on the 24.x line,
or Node 26.1+), and Python **3.8+**. Python packages are optional; NumPy can accelerate suitable
dense circuits. The plugin is already built JavaScript and needs no npm dependency installation.

Review this repository, then install from GitHub:

```sh
openclaw plugins install git:github.com/LKVexa/spindoctor-qwerty-openclaw --force --accept-capabilities
openclaw plugins inspect spindoctor-qwerty --runtime --json
```

For a local checkout:

```sh
git clone https://github.com/LKVexa/spindoctor-qwerty-openclaw
cd spindoctor-qwerty-openclaw
openclaw plugins install . --force --accept-capabilities
openclaw plugins inspect spindoctor-qwerty --runtime --json
```

OpenClaw asks for trust confirmation for a new Git/local source. `--force` accepts that source
confirmation after review, and also permits replacing an existing install. `--accept-capabilities`
accepts the plugin's declared capabilities. These flags do not bypass an operator's blocking install
policy. If installation is disabled by existing policy, configure the policy and enable it with
`openclaw plugins enable spindoctor-qwerty --accept-capabilities`. When a Gateway is already running,
management commands apply through that Gateway; otherwise they save state for its next start.

Verify that runtime inspection reports the six tools below. The manifest's `skills` directory contains
`spindoctor-qwerty/SKILL.md`. A restrictive agent tool policy must allow the six names or the plugin id.
Keep the plugin enabled in the relevant OpenClaw profile.

## Tools and reports

| Tool | Purpose |
| --- | --- |
| `spindoctor_functions` | Raw Markdown function table, including all command families, gates and optional presets |
| `spindoctor_run_script` | Run newline-separated `q.*` commands; return results and report paths |
| `spindoctor_run_preset` | Run one of `qc-001` through `qc-241`, with optional string-valued overrides |
| `spindoctor_list_presets` | List/filter the 241 presets |
| `spindoctor_report` | List or read workspace TXT reports |
| `spindoctor_test_theory` | Extract/test a theory from local files, text or a confirmed chat summary |

Ask OpenClaw to show the function table on first use. A Bell example is:

```text
q.circuit new bell 2
q.circuit add h 0
q.circuit add cx 0 1
q.circuit run shots 1000 basis z
q.circuit result
```

State and reports belong to the user account running OpenClaw and default to `~/spindoctor-workspace`.
Set `SPINDOCTOR_WORKSPACE` before starting OpenClaw, or provide an absolute `workspace` per tool call.
Reports include TXT, JSON and PDF, plus CSV where applicable. Keep that workspace outside the plugin
installation. One loaded plugin module serializes its calls; separate processes/profiles should use
separate workspaces. The wrapper preserves cancellation, bounds child output and allows ten minutes
per call by default; `SPINDOCTOR_TOOL_TIMEOUT_MS` changes that timeout (minimum 50 ms).

The interpreter defaults to `python` on Windows and `python3` elsewhere. If an alias is unavailable
or opens a store prompt, set `SPINDOCTOR_PYTHON` to the absolute path of a working Python executable
before starting OpenClaw. Arguments go through JSON stdin, with no shell. Python bytecode caching is
disabled so first use does not change the installed plugin directory.

Provide absolute paths for files, exported transcripts, folders and workspaces. Host attachments must
be made available as local files, or their text passed to the tool. The plugin does not read chat history
or retrieve host attachments. For a chat theory, the AI summarizes claims, assumptions, variables and
a measurable prediction, obtains the user's confirmation, then sends the summary and optional quoted
excerpts to `spindoctor_test_theory`. Its report records a supported / not supported / inconclusive
verdict within the simulation's limits.

The fallback CLI is `engine/scripts/spindoctor_cli.py`; resolve its absolute path before invoking Python.
`python3 -B <absolute-cli-path> functions` prints the function table. On Windows use `python`.
The full function reference is [FUNCTIONS.md](FUNCTIONS.md).

## Limits

- At most 298 logical qubits and 59 in one entangled factor. Dense storage needs `2^n × 16` bytes and
  is further restricted by the memory budget. Wide prepared/factorized states do not allocate 2^298 amplitudes.
- Above 29 qubits, sampling is basis Z only. Full joint query analysis is limited to 16 qubits.
- Folder ingestion is synchronous: up to 128 top-level supported files, 4 MiB each, 128 commands per
  file, 4096 characters per command. `q.folder cancel` has no background job to cancel.
- Engine command runs are limited to 200 commands per `spindoctor_run_script` call.
- `q.compile synthesize` returns an explanatory unsupported error. GPU/OpenCL timing and C# work
  accounting fields are outside Python parity. Seeded Born measurements have ordinary shot noise.

## Verification

See [E2E_RESULTS.md](E2E_RESULTS.md) for exact tests, evidence and remaining coverage. The portable
native tests require a separately installed OpenClaw package; no host source or dependencies are
vendored here. Set `OPENCLAW_PACKAGE` to the absolute OpenClaw npm package directory,
`SPINDOCTOR_PYTHON` to the interpreter, TEMP/TMP to a scratch directory and `SPINDOCTOR_WORKSPACE`
to a scratch engine workspace. To reproduce the recorded **partial native registry component** checks,
set `SPINDOCTOR_OPENCLAW_COMPONENTS=1`, then run:

```sh
node tests/openclaw_host_check.mjs <results-json-path>
```

The same component-mode environment applies to the bundled end-to-end suite:

```sh
python3 -B tests/e2e_mcp.py --server node tests/native_bridge.mjs --examples <absolute-engine-examples-theory-directory> --out <results-json-path>
```

On Windows use `python`. `tests/native_bridge.mjs` is a test-only stdio transport to genuine native
registry tools. Component mode supplies initial record/API state, and excludes CLI install, manifest
discovery, enablement and lifecycle guards. For a full installed-loader attempt, unset
`SPINDOCTOR_OPENCLAW_COMPONENTS` and use an isolated OpenClaw profile with this plugin installed.
That mode was blocked by a Windows sandbox native-path permission error in this verification run.
A real model and interactive OpenClaw session are separate from these deterministic checks.

Official contracts were reviewed at current-main source commit
[`961bd6b1677339c6dcf769cbe5393508eb4f2de0`](https://github.com/openclaw/openclaw/tree/961bd6b1677339c6dcf769cbe5393508eb4f2de0)
and the installed 2026.10.1 release
[`e178c39e9aae3fa440735217f9aef9574f286677`](https://github.com/openclaw/openclaw/tree/e178c39e9aae3fa440735217f9aef9574f286677).
See [native tools](https://docs.openclaw.ai/plugins/tool-plugins),
[manifest](https://docs.openclaw.ai/plugins/manifest) and
[installation](https://docs.openclaw.ai/cli/plugins/install). Native definition metadata declares six
`contracts.tools`; author/license metadata resides in package.json and the license files.

## Author and license

Copyright (C) 2026 **RUSSELL PHILIP SMITHSON <russellsmithson77@outlook.com>**.
GNU General Public License **v3.0 or later** (`GPL-3.0-or-later`); see LICENSE, NOTICE and COPYRIGHT.
The engine is bundled unchanged. OpenClaw is a separate dependency and is not redistributed here.
