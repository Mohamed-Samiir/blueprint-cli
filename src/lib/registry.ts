/**
 * `--registry=` alone is silently overridden by any `.npmrc` scope-specific
 * mapping for `@blueprint-platform` (project-local or global) — the same
 * gotcha documented for `npm publish`/`npm dist-tag`/`create-nx-workspace` in
 * `blueprint-platform`'s CLAUDE.md. The scoped-override flag form is required
 * alongside it for `create-nx-workspace` to reliably resolve
 * `@blueprint-platform/foundation` from a local Verdaccio registry.
 */
export function registryArgs(registry: string | undefined): string[] {
  if (!registry) return [];
  return [`--registry=${registry}`, `--@blueprint-platform:registry=${registry}`];
}
