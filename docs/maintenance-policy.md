# Release lines and maintenance policy

This repository maintains independent release lines so applications can keep
using v1 while v2 evolves.

## Protected references

| Reference | Purpose | Accepted changes |
| --- | --- | --- |
| `master` | Active v2 development | Features, fixes, and documentation |
| `release/2.0` | v2.0 stabilization and patch releases | Compatible fixes only |
| `release/1.x` | Latest v1 LTS (`1.12.x`) | Security, compatibility, critical correctness, and documentation fixes |
| `archive/v1.0.0` | Immutable source mirror of the `v1.0.0` tag | None |
| `v1.0.0` | Original release tag | None |

The archive branch and tag preserve the historical release. They are not
rewritten to contain later bug fixes. Active v1 fixes are released from
`release/1.x` as `1.12.N`.

## v1 LTS scope

v1 LTS accepts:

- security and privacy fixes;
- crashes, data loss, and materially incorrect output;
- React Native, Expo, Android, iOS, and toolchain compatibility fixes;
- documentation corrections for supported v1 behavior.

v1 LTS does not accept new product features, broad refactors, dependency major
upgrades, or breaking API changes. A v1 fix that also applies to v2 is
forward-ported in a separate pull request. `master` is never merged backward
into `release/1.x`.

v1 receives fixes for at least 12 months after the v2 general-availability
date. An end-of-life date must be announced at least three months in advance.
The v1 and v1.0.0 documentation remains available after maintenance ends.

## Release provenance

- `v1.x.y` tags must be contained in `release/1.x`.
- `v2.x.y` and v2 prerelease tags must be contained in `release/2.0`.
- `editor-v0.x.y` tags publish only `react-native-image-marker-editor`.
- Published package versions must exactly match their release tags.
- Existing tags and published package contents are never replaced.

The release workflow enforces these invariants before npm trusted publishing.
