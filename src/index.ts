#!/usr/bin/env node
import {
  intro,
  outro,
  text,
  select,
  confirm,
  isCancel,
  cancel,
} from "@clack/prompts";
import { execa } from "execa";
import { resolveFoundationVersion } from "./resolve-version";

async function main() {
  intro("Blueprint — Angular project builder");

  const name = await text({
    message: "Project name?",
    validate: (value) => (value?.trim().length === 0 ? "Required" : undefined),
  });
  if (isCancel(name)) return cancel("Cancelled.");

  const channel = await select({
    message: "Release channel?",
    options: [
      { value: "stable", label: "Stable (recommended)" },
      { value: "latest", label: "Latest (may include unreleased changes)" },
    ],
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
      { value: "none", label: "None — I'll build my own shell" },
    ],
  });
  if (isCancel(layout)) return cancel("Cancelled.");

  // Both switchers only make sense with layout chrome to live in —
  // skip both questions entirely for `none`, matching preset.ts's own
  // layout !== 'none' gating.
  let showThemeSwitcher: boolean | undefined;
  let showLanguageSwitcher: boolean | undefined;

  if (layout !== "none") {
    const themeAnswer = await confirm({
      message: "Enable theme switching?",
      initialValue: true,
    });
    if (isCancel(themeAnswer)) return cancel("Cancelled.");
    showThemeSwitcher = themeAnswer;

    const languageAnswer = await confirm({
      message: "Enable language switching?",
      initialValue: true,
    });
    if (isCancel(languageAnswer)) return cancel("Cancelled.");
    showLanguageSwitcher = languageAnswer;
  }

  const registry = process.env.BLUEPRINT_REGISTRY;

  const version = await resolveFoundationVersion(
    channel as "stable" | "latest",
    registry,
  );

  const args = [
    "create-nx-workspace@latest",
    String(name),
    `--preset=@blueprint-platform/foundation@${version}`,
    `--rtl=${rtl}`,
    `--layout=${layout}`,
  ];
  if (showThemeSwitcher !== undefined) {
    args.push(`--showThemeSwitcher=${showThemeSwitcher}`);
  }
  if (showLanguageSwitcher !== undefined) {
    args.push(`--showLanguageSwitcher=${showLanguageSwitcher}`);
  }
  if (registry) args.push(`--registry=${registry}`);

  //   await execa("npx", args, { stdio: "inherit" });

  console.log(`Running: npx ${args.join(" ")}`);

  outro(`Done — cd ${name} && npx nx serve ${name}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
