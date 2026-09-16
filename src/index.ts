#!/usr/bin/env node
import { resolve } from 'node:path';
import {
  intro,
  outro,
  text,
  select,
  confirm,
  isCancel,
  cancel,
  log,
} from '@clack/prompts';
import { resolveFoundationVersion } from '@blueprint-platform/cli-core';
import { createWorkspace } from './lib/create-workspace';
import { registryArgs } from './lib/registry';
import { ADMIN_TEMPLATE_PRESET_OPTIONS, runAdminModules } from './lib/admin-template';

type Channel = 'stable' | 'latest';

interface PresetOptions {
  layout: string;
  showThemeSwitcher?: boolean;
  showLanguageSwitcher?: boolean;
}

/** The "Blank" flow's own layout/switcher questions — unchanged from the original design sketch. */
async function promptBlankPresetOptions(): Promise<PresetOptions | symbol> {
  const layout = await select({
    message: 'Choose a layout:',
    options: [
      { value: 'sidebar-shell', label: 'Sidebar' },
      { value: 'floating-shell', label: 'Floating sidebar' },
      { value: 'inset-shell', label: 'Inset sidebar' },
      { value: 'topbar-shell', label: 'Top bar (no sidebar)' },
      { value: 'none', label: "None — I'll build my own shell" },
    ],
  });
  if (isCancel(layout)) return layout;

  // Both switchers only make sense with layout chrome to live in — skip both
  // questions entirely for `none`, matching preset.ts's own `layout !== 'none'`
  // gating.
  if (layout === 'none') {
    return { layout };
  }

  const showThemeSwitcher = await confirm({
    message: 'Enable theme switching?',
    initialValue: true,
  });
  if (isCancel(showThemeSwitcher)) return showThemeSwitcher;

  const showLanguageSwitcher = await confirm({
    message: 'Enable language switching?',
    initialValue: true,
  });
  if (isCancel(showLanguageSwitcher)) return showLanguageSwitcher;

  return { layout, showThemeSwitcher, showLanguageSwitcher };
}

async function main() {
  intro('Blueprint — Angular project builder');

  const name = await text({
    message: 'Project name?',
    validate: (value) => (value?.trim().length === 0 ? 'Required' : undefined),
  });
  if (isCancel(name)) return cancel('Cancelled.');

  const template = await select({
    message: 'Starting point?',
    options: [
      {
        value: 'blank',
        label: 'Blank',
        hint: "pick a layout and switchers yourself",
      },
      {
        value: 'admin-dashboard',
        label: 'Admin Dashboard',
        hint: 'sidebar layout + auth + roles/permissions + user management, preconfigured',
      },
    ],
  });
  if (isCancel(template)) return cancel('Cancelled.');

  const channel = (await select({
    message: 'Release channel?',
    options: [
      { value: 'stable', label: 'Stable (recommended)' },
      { value: 'latest', label: 'Latest (may include unreleased changes)' },
    ],
    initialValue: 'stable',
  })) as Channel | symbol;
  if (isCancel(channel)) return cancel('Cancelled.');

  const rtl = await confirm({ message: 'Enable RTL?', initialValue: false });
  if (isCancel(rtl)) return cancel('Cancelled.');

  let presetOptions: PresetOptions;
  if (template === 'admin-dashboard') {
    presetOptions = { ...ADMIN_TEMPLATE_PRESET_OPTIONS };
  } else {
    const result = await promptBlankPresetOptions();
    if (isCancel(result)) return cancel('Cancelled.');
    presetOptions = result;
  }

  const registry = process.env.BLUEPRINT_REGISTRY;

  // Display-only — never embedded in `--preset=`. Resolving a scoped
  // package's version and passing it as `@scope/pkg@x.y.z` to
  // `create-nx-workspace` is unreliable on the Nx version this targets
  // (Nx issue #23174); the actual scaffold call below always uses the
  // dist-tag name (`@stable`/`@latest`) literally instead. This call is
  // purely so the developer sees which concrete version they're getting,
  // and fails fast if the channel/registry combo doesn't resolve.
  try {
    const resolved = await resolveFoundationVersion(channel as Channel, registry);
    log.info(`Scaffolding with @blueprint-platform/foundation ${resolved} ("${channel}")`);
  } catch (err) {
    log.warn(err instanceof Error ? err.message : String(err));
  }

  const args = [
    String(name),
    `--preset=@blueprint-platform/foundation@${channel}`,
    `--rtl=${rtl}`,
    `--layout=${presetOptions.layout}`,
    // Skips the unrelated Nx Cloud sign-up prompt that create-nx-workspace
    // otherwise asks on top of everything already asked above.
    '--nxCloud=skip',
  ];
  if (presetOptions.showThemeSwitcher !== undefined) {
    args.push(`--showThemeSwitcher=${presetOptions.showThemeSwitcher}`);
  }
  if (presetOptions.showLanguageSwitcher !== undefined) {
    args.push(`--showLanguageSwitcher=${presetOptions.showLanguageSwitcher}`);
  }
  args.push(...registryArgs(registry));

  await createWorkspace(args);

  if (template === 'admin-dashboard') {
    // `rootProject: true` (blueprint-platform's flattened-layout convention)
    // means the new workspace lives directly at `./<name>`, not `./<name>/apps/<name>`.
    const cwd = resolve(process.cwd(), String(name));
    await runAdminModules(cwd, registry);
  }

  outro(`Done — cd ${name} && npx nx serve ${name}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
