# How to Run Tests

## Setup

```bash
cd backend
npm install
```

Jest and related packages should be listed in `devDependencies`. If not yet installed:

```bash
npm install --save-dev jest axios-mock-adapter
```

---

## Running Tests

```bash
# Run all tests once
npm test

# Watch mode (re-runs on file save — use during development)
npm test -- --watch

# Run a specific test file
npm test -- academicSupport

# Coverage report
npm test -- --coverage
```

---

## Test File Locations

```
backend/
  __tests__/
    scrapers/
      academicSupport.test.js    ← unit + integration tests
    fixtures/
      tutoring-page.html         ← HTML snapshot for unit tests
      math-lab-page.html
      writing-center-page.html
```

---

## Updating HTML Fixtures

Run these when the ASU pages are redesigned or a new semester schedule goes live:

```bash
curl -s "https://www.angelo.edu/current-students/freshman-college/academic-tutoring.php" \
  > backend/__tests__/fixtures/tutoring-page.html

curl -s "https://www.angelo.edu/current-students/freshman-college/math-lab.php" \
  > backend/__tests__/fixtures/math-lab-page.html

curl -s "https://www.angelo.edu/current-students/writing-center/" \
  > backend/__tests__/fixtures/writing-center-page.html
```

Always update fixtures **after** updating selectors and confirming the scraper works against the live page.

---

## Contract Test (Live Network)

The contract test hits the real ASU URLs and should **not** run in regular CI.

```bash
# Run only the contract test
npm test -- --testPathPattern=contract
```

This is intended to run on a weekly schedule to catch page redesigns early.

---

## CI Integration

Unit and integration tests run automatically on every PR via GitHub Actions. Add a `test` job to `.github/workflows/deploy-frontend.yml` (or a separate `test.yml`) that runs before the deploy step.

```yaml
- name: Run backend tests
  working-directory: backend
  run: npm test -- --ci --forceExit
```

The `--forceExit` flag is needed because the SQLite in-memory connection keeps the Node process alive after tests complete.
