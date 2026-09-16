#!/usr/bin/env node

// src/index.ts
import { resolve } from "path";
import {
  intro,
  outro,
  text,
  select,
  confirm,
  isCancel,
  cancel,
  log
} from "@clack/prompts";
import { resolveFoundationVersion } from "@blueprint-platform/cli-core";

// src/lib/create-workspace.ts
import { execa } from "execa";
async function createWorkspace(args) {
  const { NX_WORKSPACE_ROOT_PATH: _drop, ...env } = process.env;
  await execa("npx", ["create-nx-workspace@latest", ...args], {
    stdio: "inherit",
    env
  });
}

// src/lib/registry.ts
function registryArgs(registry) {
  if (!registry) return [];
  return [`--registry=${registry}`, `--@blueprint-platform:registry=${registry}`];
}

// src/lib/admin-template.ts
import { spinner } from "@clack/prompts";
import { runModule } from "@blueprint-platform/cli-core";
var ADMIN_TEMPLATE_PRESET_OPTIONS = {
  layout: "sidebar-shell",
  showThemeSwitcher: true,
  showLanguageSwitcher: true
};
var ADMIN_MODULE_STEPS = [
  {
    name: "auth",
    label: "Authentication (JWT, local storage, split layout)",
    flags: {
      authType: "jwt",
      storeType: "local",
      authLayout: "split",
      includeSignup: true,
      includeForgotPassword: true,
      includeChangePassword: true
    }
  },
  {
    name: "rbac",
    label: "Roles & permissions",
    flags: { routePrefix: "admin" }
  },
  {
    name: "user-management",
    label: "User management",
    flags: { routePrefix: "admin/users" }
  }
];
async function runAdminModules(cwd, registry) {
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

// src/index.ts
async function promptBlankPresetOptions() {
  const layout = await select({
    message: "Choose a layout:",
    options: [
      { value: "sidebar-shell", label: "Sidebar" },
      { value: "floating-shell", label: "Floating sidebar" },
      { value: "inset-shell", label: "Inset sidebar" },
      { value: "topbar-shell", label: "Top bar (no sidebar)" },
      { value: "none", label: "None \u2014 I'll build my own shell" }
    ]
  });
  if (isCancel(layout)) return layout;
  if (layout === "none") {
    return { layout };
  }
  const showThemeSwitcher = await confirm({
    message: "Enable theme switching?",
    initialValue: true
  });
  if (isCancel(showThemeSwitcher)) return showThemeSwitcher;
  const showLanguageSwitcher = await confirm({
    message: "Enable language switching?",
    initialValue: true
  });
  if (isCancel(showLanguageSwitcher)) return showLanguageSwitcher;
  return { layout, showThemeSwitcher, showLanguageSwitcher };
}
async function main() {
  intro("Blueprint \u2014 Angular project builder");
  const name = await text({
    message: "Project name?",
    validate: (value) => value?.trim().length === 0 ? "Required" : void 0
  });
  if (isCancel(name)) return cancel("Cancelled.");
  const template = await select({
    message: "Starting point?",
    options: [
      {
        value: "blank",
        label: "Blank",
        hint: "pick a layout and switchers yourself"
      },
      {
        value: "admin-dashboard",
        label: "Admin Dashboard",
        hint: "sidebar layout + auth + roles/permissions + user management, preconfigured"
      }
    ]
  });
  if (isCancel(template)) return cancel("Cancelled.");
  const channel = await select({
    message: "Release channel?",
    options: [
      { value: "stable", label: "Stable (recommended)" },
      { value: "latest", label: "Latest (may include unreleased changes)" }
    ],
    initialValue: "stable"
  });
  if (isCancel(channel)) return cancel("Cancelled.");
  const rtl = await confirm({ message: "Enable RTL?", initialValue: false });
  if (isCancel(rtl)) return cancel("Cancelled.");
  let presetOptions;
  if (template === "admin-dashboard") {
    presetOptions = { ...ADMIN_TEMPLATE_PRESET_OPTIONS };
  } else {
    const result = await promptBlankPresetOptions();
    if (isCancel(result)) return cancel("Cancelled.");
    presetOptions = result;
  }
  const registry = process.env.BLUEPRINT_REGISTRY;
  try {
    const resolved = await resolveFoundationVersion(channel, registry);
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
    "--nxCloud=skip"
  ];
  if (presetOptions.showThemeSwitcher !== void 0) {
    args.push(`--showThemeSwitcher=${presetOptions.showThemeSwitcher}`);
  }
  if (presetOptions.showLanguageSwitcher !== void 0) {
    args.push(`--showLanguageSwitcher=${presetOptions.showLanguageSwitcher}`);
  }
  args.push(...registryArgs(registry));
  await createWorkspace(args);
  if (template === "admin-dashboard") {
    const cwd = resolve(process.cwd(), String(name));
    await runAdminModules(cwd, registry);
  }
  outro(`Done \u2014 cd ${name} && npx nx serve ${name}`);
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
