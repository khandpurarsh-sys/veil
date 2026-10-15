# Test safety
Run `npm test` for local unit/regression tests. The browser install test uses a disposable blank page.

Do not run `e2e-live.mjs` against the active owner project. It was written for empty disposable bootstrap state and can replace owner configuration.

`cleanup-live.mjs` is an explicit integration fixture test. It requires the approved private DB credential locator and the scheduler token file. It tests expired metadata with no real object bytes, then removes its own UUID fixtures. It is not part of `npm test`.
