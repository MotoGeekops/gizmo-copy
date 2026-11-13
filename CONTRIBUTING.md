# Contributing to RecallForge

Thank you for your interest in RecallForge! This guide covers the local workflow and verification checks expected before opening a pull request.

## Local Setup

1. Ensure you have **Node.js >= 22.13**, **npm**, **Git**, and **Rust** (`stable`) with the `wasm32-unknown-unknown` target installed:

   ```bash
   rustup target add wasm32-unknown-unknown
   ```

2. Install dependencies and build:

   ```bash
   npm ci
   npm run build:rust
   npm run build
   ```

## Running Verification Checks

Before submitting changes, run the full verification suite:

```bash
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
npm run check
npm run test:wasm
npm run build
```

If you modify Rust code under `crates/study_core/`, rebuild the committed WebAssembly artifacts so browser and Worker bundles stay in sync:

```bash
npm run build:rust
```

To run the full database integration suite against a local Worker:

```bash
# Terminal 1
npm start -- --port 5180

# Terminal 2
npm run test:integration
```

> [!NOTE]
> The integration suite refuses non-loopback targets and cleans up its synthetic test accounts automatically.

## Scope & Style Notes

- Keep core scheduling, answer evaluation, and progression logic inside [`crates/study_core/`](crates/study_core/) without DOM, HTTP, or database dependencies.
- Keep secrets out of Git (use `.dev.vars` locally; see [`.env.example`](.env.example)).
- Document any verified behavior changes in [`docs/FEATURE_VERIFICATION.md`](docs/FEATURE_VERIFICATION.md).
