# Changelog

## 1.1.0 — 2026-10-11

Updated the native OpenClaw plugin from four tools on the SpinDoctor 3.0.3 base to six tools on the
shared SpinDoctor 3.1.2 engine 1.1.0. Added the function table and file/text/chat theory testing,
298-qubit support, current tool ownership metadata, a current skill and installation instructions.
The wrapper returns raw Markdown, preserves structured success/failure, serializes its calls and
handles cancellation, timeouts, bounded I/O and Python startup errors. Python caching is disabled.
License and authorship are GPL-3.0-or-later and RUSSELL PHILIP SMITHSON, copyright 2026.

Added portable tests for the genuine OpenClaw 2026.10.1 registry components and a native tool bridge
with the bundled preset reference. Full host installation and manifest discovery encountered native
path permission errors in the Windows sandbox; E2E_RESULTS.md identifies the partial component
coverage and the tests that remain uncompleted.
