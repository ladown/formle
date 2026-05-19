// Shared semantic-release configuration for the monorepo.
//
// semantic-release loads its config via cosmiconfig from the current working
// directory upward, so when the release workflow runs `semantic-release` from
// inside `packages/<pkg>/` (see .github/workflows/release.yml), this file is
// discovered at the repo root. `.mjs` is used so the config is plain ESM
// without needing `"type": "module"` on the root package.json.
//
// `tagFormat` is derived from the running package's own package.json `name`,
// so each package keeps its own tag namespace (e.g. `@formle/core@1.2.3`)
// without per-package duplication of the rest of the pipeline.

import { readFileSync } from "node:fs";
import { join } from "node:path";

const pkg = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8"),
);

/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
  extends: "semantic-release-monorepo",
  branches: ["master"],
  tagFormat: `${pkg.name}@\${version}`,
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@semantic-release/npm",
      {
        npmPublish: false,
      },
    ],
    [
      "@semantic-release/exec",
      {
        publishCmd: "pnpm publish --no-git-checks --access public",
      },
    ],
    [
      "@semantic-release/git",
      {
        assets: ["package.json", "CHANGELOG.md"],
        message:
          "chore(release): ${nextRelease.gitTag} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
  ],
};
