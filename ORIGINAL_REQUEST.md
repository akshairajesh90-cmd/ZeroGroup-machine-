# Original User Request

## Initial Request — 2026-08-12T10:42:49Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Delegate to teamwork_preview

Automate the Playwright e2e test scenarios defined in the `simulation-blueprint.md` for the IronRent ERP project. The agent team will act as Dev, QA, and PM to fully implement and verify the test suite.

Working directory: c:/Users/AKSHAI RAJESH/project/project7
Integrity mode: development

## Requirements

### R1. Implement Core Scenarios
Implement the page-by-page simulation scenarios described in `simulation-blueprint.md` (Admin, Staff, Driver, and Operator portals) as Playwright tests in the `e2e/` or `tests/` directory.

### R2. Implement Edge Cases & Resilience Tests
Implement the edge cases specified (OCC version mismatch, Offline IndexedDB queueing, Supabase media uploads) using Playwright mocking/offline emulation where appropriate.

## Acceptance Criteria

### Automated Verification
- [ ] All newly created Playwright tests pass when executed via `npx playwright test`.
- [ ] Test execution does not result in hanging browsers or unhandled promise rejections.
