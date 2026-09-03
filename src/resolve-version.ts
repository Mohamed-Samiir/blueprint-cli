import { execa } from "execa";

export async function resolveFoundationVersion(
  channel: "stable" | "latest",
  registry?: string,
): Promise<string> {
  const args = [
    "view",
    "@blueprint-platform/foundation",
    `dist-tags.${channel}`,
  ];
  if (registry) {
    args.push(`--@blueprint-platform:registry=${registry}`);
  }
  const { stdout } = await execa("npm", args);
  const version = stdout.trim();
  if (!version) {
    throw new Error(
      `Could not resolve a "${channel}" version for @blueprint-platform/foundation. ` +
        `Is the "${channel}" dist-tag set on the registry?`,
    );
  }
  return version;
}
