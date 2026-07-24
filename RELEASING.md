# Releasing

PreviewForm releases are published from version tags through GitHub Actions.

## Release flow

1. Close all issues in the target milestone.
2. Update `CHANGELOG.md` and bump `package.json` to the release version.
3. Run local verification:
   - `npm run typecheck`
   - `npm test`
   - `npm run build`
   - `npm run test:e2e`
   - `npm pack --dry-run`
   - `npm publish --dry-run`
4. Commit the release changes.
5. Create and push a matching tag, for example `v2.0.1` for `package.json` version `2.0.1`.
6. The `Publish` workflow publishes the package to npm with provenance.
7. Create a GitHub Release and link the closed milestone issues.

## npm trusted publishing

Configure npm trusted publishing for:

- Package: `preview-form`
- Repository: `aniketan/previewForm`
- Workflow: `publish.yml`
- Environment: none

The publish workflow checks that the tag matches `package.json` and that the version does not already exist on npm before publishing.