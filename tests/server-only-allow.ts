/**
 * Lets a test module import the app lock's server-only files.
 *
 * `server-only` is a build marker whose default export throws on purpose: that is what
 * keeps a module out of a client bundle. Next resolves it through the `react-server`
 * condition, where the marker is an empty file, so anything importing it is genuinely
 * server-side in the app either way. `tsx --test` runs in plain Node, where the marker
 * resolves to the throwing default, so the modules under test could not be loaded at
 * all without saying something about it.
 *
 * This says the minimum: inside the test process only, `require('server-only')` yields
 * an empty object. It does not make a server module safe for a browser, and it is not
 * used by the application — nothing outside `tests/` imports this file.
 *
 * Call it before the first `await import()` of a server-only module, since a static
 * import would be resolved before this code has run.
 */

import Module from 'node:module';

type LoadFn = (this: unknown, request: string, parent: unknown, isMain: boolean) => unknown;

let patched = false;

export function allowServerOnly(): void {
  if (patched) return;
  patched = true;
  const internal = Module as unknown as { _load: LoadFn };
  const load = internal._load;
  internal._load = function (this: unknown, request: string, parent: unknown, isMain: boolean) {
    if (request === 'server-only') return {};
    return load.call(this, request, parent, isMain);
  };
}
