# Contributing

Thanks for taking a look at ScenarioBridge.

## Reporting a bug

Please include:
- The `.xosc` (and `.xodr`, if used) that reproduces it, or a minimal excerpt.
- What you expected vs. what happened.
- Any browser console errors (open DevTools → Console).

## Making a change

1. Fork and clone the repo.
2. Edit `index.html` directly — it's a single self-contained file (HTML, CSS,
   and JS inline), intentionally with no build step.
3. Run the test suite before opening a PR:

   ```bash
   npm install
   npx playwright install --with-deps chromium
   npm test
   ```

4. If you change parsing or generation logic, add or update a test in
   `tests/smoke.spec.js` (and a fixture under `test-fixtures/` if needed)
   covering it.
5. Update `CHANGELOG.md` under an "Unreleased" heading.

## Scope

Keep in mind this is meant to stay a lightweight, dependency-free,
single-file tool. Larger features (e.g. full OpenDRIVE geometry support,
real binary OSI protobuf serialization) are welcome as discussion first —
open an issue describing the use case before investing in an implementation.
