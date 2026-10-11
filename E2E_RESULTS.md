# OpenClaw native plugin 1.1.0 validation

Date: 2026-10-11. Base: SpinDoctor 3.1.2 update `3.1.2-298-20261010`; bundled engine 1.1.0.
Host: genuine OpenClaw npm release **2026.10.1**, release commit
`e178c39e9aae3fa440735217f9aef9574f286677`. Windows checks use Node **24.19.0** and Python **3.12.14**.
The current-main contracts were also reviewed at `961bd6b1677339c6dcf769cbe5393508eb4f2de0`.

## Current results

- Native registry component checks: **36/36 passed**. The installed host's real module-export resolver
  accepts the definition, and its real registry/registrars own and instantiate exactly six tools. Two
  deliberately broken ownership contracts are rejected by the registrar. Offline manifest/package
  structure, versions, license, author, entry paths, skill paths and all six schemas are checked.
- Native tool execution covers the raw Markdown function table, all 241 listed presets, Bell TXT/PDF
  reports, persistent state, per-call workspaces, report traversal, malformed/unknown arguments,
  invalid enum/integer/override values, prototype-named unknown keys, relative paths, unknown tools,
  engine failures, the 299-qubit rejection, concurrent call serialization, pre-cancellation, timeout,
  in-flight cancellation, queue recovery and Python startup errors. It checks that no Python caches appear.
- The timeout and in-flight cancellation checks were observed on this Windows runtime using a 50 ms
  timeout and a 10 ms abort. They depend on process startup timing and are not cross-platform timing
  guarantees. The tool waits for the child's close event before settling those calls.
- End-to-end checks through the native registry bridge: **12/12 passed in 85.3 seconds**. Six tools,
  the raw function table and all 16 command families, 298-qubit `mcx7`, mixed-folder ingestion,
  file/chat-summary/exported-chat theory tests, and all recorded `qc-001` through `qc-025` references:
  20 identical and five documented differences. The report check validates **255 PDFs and 255 TXT twins**.
- Bundled engine: all **35 files byte-identical** to the published upgrade kit at
  `89a8205a4eba18bb039b7101779b18718c8cf93e`. No simulator results changed.
- Strict publication scan: **clean**. Final source inventory: **53 files**. No binary, archive or
  compilation step is required; the native entry point is committed JavaScript.

## Coverage boundary and blocked tests

This is **partial native registry component coverage (host-simulated initialization)**. The test harness
imports the complete installed OpenClaw registry/registrars and module-export resolver unchanged. It
supplies the plugin record and the registration API's initial state. Native tool factories and handlers
execute the bundled engine; this is not a substitute for complete host discovery or installation.
The bridge's stdio MCP framing is test-only; OpenClaw loads a native plugin, not this MCP bridge.

The real CLI reported 2026.10.1, and its install command/help were checked. A genuine local installation
was attempted in an isolated profile with `--force --accept-capabilities`, but failed with **EPERM from
the host's native realpath operation** in the Windows filesystem sandbox. Full loader discovery was
also attempted and failed guarded path checks for installed manifests. Host guards were not bypassed
or altered. These failures are environmental blocks, not successful installation tests.

**Not completed:** full CLI installation, native manifest discovery/validation, plugin enablement,
lifecycle guards, startup/reload through a running Gateway, a real model, an interactive OpenClaw
session, Linux and macOS host loading, or installation from GitHub through the OpenClaw CLI. The
component checks validate package structure offline but do not claim the host's full manifest validator
ran. The two broken ownership tests do not claim malformed plugin installations were tested.

Report checks cover PDF structure and nonempty TXT twins. Reports were not visually inspected;
`pdftotext` was unavailable in this Windows run, so the optional PDF text extraction check did not run.
No host source or dependencies are vendored in this repository.

## Reproduction

Use a separately installed compatible OpenClaw package. Set `OPENCLAW_PACKAGE` to its absolute npm
package directory, `SPINDOCTOR_PYTHON` to the Python executable, TEMP/TMP and `SPINDOCTOR_WORKSPACE`
to scratch directories outside the checkout, and `SPINDOCTOR_OPENCLAW_COMPONENTS=1`.
Run from the checkout root:

```sh
node tests/openclaw_host_check.mjs <results-json-path>
python3 -B tests/e2e_mcp.py --server node tests/native_bridge.mjs --examples <absolute-engine-examples-theory-directory> --out <results-json-path>
```

On Windows use `python`. The example directory must be absolute because file tools enforce absolute
local paths. An initial invocation used a relative example directory and passed 10/12: the two file
theory calls were correctly rejected. The clean rerun uses the required absolute path.

## Inherited engine evidence

A fresh Windows run of the shared kit passed **10/10 offline checks**, including 168 function-table
examples, 43/43 theory checks with and without the optional PDF library, 32/32 engine checks with
NumPy, wide-register reference replay and the 11-file 298-qubit example. Two scratch harness
adaptations were required: use `pypdf` to extract PDF text because `pdftotext` is absent, and exclude
the already documented internal `actualAmplitudeWrites`/`actualTensorProducts` accounting differences
from the wide example comparison. The engine was unchanged. The initial unadapted Windows kit run
was 8/10 for those two reasons; network link checks were skipped.

The upgrade kit records SpinDoctor 3.1.2's own suite passing **18/18 with three checks adapted** from the
old 29-qubit bound to 298, on the publishing basis approved by Russell. That historical C# run was not
repeated here. The kit also records 241-preset parity and accepted CPU/GPU, work-accounting,
checkpoint and state-file differences. The host end-to-end suite replays the first 25 recorded references.
