import { spinner } from '@clack/prompts';
import { runModule } from '@blueprint-platform/cli-core';

/**
 * "Admin Dashboard" — a canned bundle of foundation options + module
 * generator calls, standing in for the `@blueprint-platform/templates`
 * pillar's eventual `admin-dashboard` composite generator (per
 * `blueprint-platform`'s CLAUDE.md: "Composite generators bundling
 * components+modules+layout into presets like admin-dashboard — not yet
 * built"). Until that pillar exists, this is where that composition lives:
 * a fixed set of `foundation:preset` options applied at creation time (see
 * `ADMIN_TEMPLATE_PRESET_OPTIONS`, used directly in `src/index.ts`), plus a
 * fixed sequence of `modules:*` generator calls run immediately after
 * workspace creation via `runAdminModules` below.
 *
 * `runAdminModules` calls `cli-core`'s `runModule` — the exact same function
 * `@blueprint-platform/cli`'s `blueprint add module` uses post-project. This
 * is the direct proof, per `task-cli-core-and-cli.md`'s Part C, that these
 * functions serve both project-creation-time sequencing and post-project
 * one-off additions without duplicating the underlying `nx g` invocation
 * logic in two places.
 */
export const ADMIN_TEMPLATE_PRESET_OPTIONS = {
  layout: 'sidebar-shell',
  showThemeSwitcher: true,
  showLanguageSwitcher: true,
} as const;

interface AdminModuleStep {
  name: 'auth' | 'rbac' | 'user-management';
  label: string;
  flags: Record<string, unknown>;
}

/**
 * Order — auth, then rbac, then user-management — chosen for a sensible
 * generated nav (rbac injects Roles + Permissions links, user-management
 * injects one User Management link, auth injects none — see CLAUDE.md's
 * nav-link-injection status bullet), not because another order would break:
 * `blueprint-platform`'s own e2e already covered auth<->rbac both ways and
 * user-management standalone, all with green builds.
 *
 * Flag values match each generator's own schema defaults exactly (see
 * `packages/modules/src/generators/*\/schema.json` in `blueprint-platform`)
 * — this template doesn't invent new defaults, it just avoids asking the
 * developer to re-confirm them one prompt at a time.
 */
const ADMIN_MODULE_STEPS: AdminModuleStep[] = [
  {
    name: 'auth',
    label: 'Authentication (JWT, local storage, split layout)',
    flags: {
      authType: 'jwt',
      storeType: 'local',
      authLayout: 'split',
      includeSignup: true,
      includeForgotPassword: true,
      includeChangePassword: true,
    },
  },
  {
    name: 'rbac',
    label: 'Roles & permissions',
    flags: { routePrefix: 'admin' },
  },
  {
    name: 'user-management',
    label: 'User management',
    flags: { routePrefix: 'admin/users' },
  },
];

export async function runAdminModules(cwd: string, registry: string | undefined): Promise<void> {
  for (const step of ADMIN_MODULE_STEPS) {
    const s = spinner();
    s.start(`Adding ${step.label}...`);
    try {
      await runModule(cwd, step.name, step.flags, registry);
      s.stop(`Added ${step.label}.`);
    } catch (err) {
      s.stop(`Failed to add ${step.label}.`);
      throw err;
    }
  }
}
