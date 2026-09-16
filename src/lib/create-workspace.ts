import { execa } from 'execa';

/**
 * Runs `npx create-nx-workspace@latest <args>` with stdio streamed live
 * (`stdio: 'inherit'`) — this step installs the full dependency tree and can
 * take a while, unlike the `cli-core`-driven post-creation steps (adding
 * modules), which run quietly behind a spinner since they're fast, scripted
 * `nx g` calls with no interesting output of their own.
 *
 * Strips `NX_WORKSPACE_ROOT_PATH` from the child's env, same as `cli-core`'s
 * own `runGenerator` — if this process inherited it (some dev shells set it
 * globally), `create-nx-workspace` would silently try to resolve the
 * `@blueprint-platform/foundation` preset from a local monorepo checkout
 * instead of the requested npm package, and fail in a confusing way deep
 * inside Nx's own preset-resolution code rather than with a clear error here.
 */
export async function createWorkspace(args: string[]): Promise<void> {
  const { NX_WORKSPACE_ROOT_PATH: _drop, ...env } = process.env;
  await execa('npx', ['create-nx-workspace@latest', ...args], {
    stdio: 'inherit',
    env,
  });
}
