#!/usr/bin/env node

// src/index.ts
import {
  intro,
  outro,
  text,
  select,
  confirm,
  isCancel,
  cancel
} from "@clack/prompts";

// src/resolve-version.ts
import { execa } from "execa";
async function resolveFoundationVersion(channel, registry) {
  const args = [
    "view",
    "@blueprint-platform/foundation",
    `dist-tags.${channel}`
  ];
  if (registry) {
    args.push(`--@blueprint-platform:registry=${registry}`);
  }
  const { stdout } = await execa("npm", args);
  const version = stdout.trim();
  if (!version) {
    throw new Error(
      `Could not resolve a "${channel}" version for @blueprint-platform/foundation. Is the "${channel}" dist-tag set on the registry?`
    );
  }
  return version;
}

// src/index.ts
async function main() {
  intro("Blueprint \u2014 Angular project builder");
  const name = await text({
    message: "Project name?",
    validate: (value) => value?.trim().length === 0 ? "Required" : void 0
  });
  if (isCancel(name)) return cancel("Cancelled.");
  const channel = await select({
    message: "Release channel?",
    options: [
      { value: "stable", label: "Stable (recommended)" },
      { value: "latest", label: "Latest (may include unreleased changes)" }
    ]
  });
  if (isCancel(channel)) return cancel("Cancelled.");
  const rtl = await confirm({ message: "Enable RTL?", initialValue: false });
  if (isCancel(rtl)) return cancel("Cancelled.");
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
  if (isCancel(layout)) return cancel("Cancelled.");
  let showThemeSwitcher;
  let showLanguageSwitcher;
  if (layout !== "none") {
    const themeAnswer = await confirm({
      message: "Enable theme switching?",
      initialValue: true
    });
    if (isCancel(themeAnswer)) return cancel("Cancelled.");
    showThemeSwitcher = themeAnswer;
    const languageAnswer = await confirm({
      message: "Enable language switching?",
      initialValue: true
    });
    if (isCancel(languageAnswer)) return cancel("Cancelled.");
    showLanguageSwitcher = languageAnswer;
  }
  const registry = process.env.BLUEPRINT_REGISTRY;
  const version = await resolveFoundationVersion(
    channel,
    registry
  );
  const args = [
    "create-nx-workspace@latest",
    String(name),
    `--preset=@blueprint-platform/foundation@${version}`,
    `--rtl=${rtl}`,
    `--layout=${layout}`
  ];
  if (showThemeSwitcher !== void 0) {
    args.push(`--showThemeSwitcher=${showThemeSwitcher}`);
  }
  if (showLanguageSwitcher !== void 0) {
    args.push(`--showLanguageSwitcher=${showLanguageSwitcher}`);
  }
  if (registry) args.push(`--registry=${registry}`);
  console.log(`Running: npx ${args.join(" ")}`);
  outro(`Done \u2014 cd ${name} && npx nx serve ${name}`);
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
