# Changelog

## [2.1.1](https://github.com/JimmyDaddy/react-native-image-marker/compare/v2.1.0...v2.1.1) (2026-08-20)

### Bug Fixes

- **android:** support 16 KB page sizes ([475eef1](https://github.com/JimmyDaddy/react-native-image-marker/commit/475eef1c2a51150cbf546c25ba9dcf3d6d5e173e))
- **release:** provide node types to registry consumers ([5a0567d](https://github.com/JimmyDaddy/react-native-image-marker/commit/5a0567d97e7de1c46f791dd7b87ebdd1d5f9359f))
- **release:** tolerate npm first-publish propagation ([f7d021b](https://github.com/JimmyDaddy/react-native-image-marker/commit/f7d021b22e8397183eb776033a70cc0beb8fd048))
- **release:** use current registry verifier ([0ab5167](https://github.com/JimmyDaddy/react-native-image-marker/commit/0ab5167fa7d4d1e7921c134d8bbd9dbb810d76d7))

## 2.1.0 (2026-07-30)

### Features

- Added `Marker.getImageInfo(source)` across Android, iOS, and Web with upright
  and encoded dimensions, format, EXIF orientation, rotation, mirroring, and
  normalization metadata.
- Added cross-platform text constraints and layout controls: `maxWidth`,
  `lineHeight`, `letterSpacing`, `direction`, `wrap`, `maxLines`, and
  `overflow`.
- Moved the platform-neutral Recipe v2 schema, validation, migration,
  templating, serialization, and immutable layer operations into
  `@image-marker/recipe@0.1.0`.
- Re-exported the shared Recipe authoring API from Core so existing consumers
  can continue importing from `react-native-image-marker`.

### Quality

- Added one shared Recipe fixture exercised by Android, iOS, and Web text
  conformance tests.
- Added encoded-orientation metadata tests on TypeScript, Android, and iOS.
- Preserved the Core 2.0 rendering, result, and Recipe contracts; this is a
  backward-compatible minor release.

## 2.0.0 (2026-07-28)

### Breaking changes

- Rendering and invisible-embed methods now return a structured
  `MarkerResult`; existing consumers must read `result.uri`.
- Recipe v2 replaces `watermarks` plus top-level encoding options with stable
  `layers` and nested `output`. Use `migrateWatermarkRecipe()` for persisted v1
  documents.
- Removed `positionOptions`, `watermarkImage`, and `watermarkPositions`.
- Raised the supported application baseline to React Native 0.73+, React 18+,
  iOS 13+, and Android API 24+.
- Replaced loosely typed native option objects with complete generated
  TurboModule structures.
- Newly encoded output normalizes pixel orientation and strips copied source
  EXIF/GPS metadata.

### Features

- Added job IDs, stable error codes, progress phases, abort signals, native
  cancellation, and timeouts for single operations.
- Added Recipe v2 layer IDs, names, visibility, locks, conditions, explicit
  import migration, validation, and serialization.
- Added font fallback chains across TypeScript, Android, iOS, and Web.
- Added WebP output on Android and Web with an explicit unsupported error on
  iOS.
- Productized invisible trace detection results, batch control, Web Worker
  execution, and optional Content Credentials composition.
- Added a portable shared C++ size-fit core plus Android JNI and iOS
  Objective-C++/Swift bridges.
- Added the separately versioned
  `react-native-image-marker-editor@0.0.1` workspace and optional Core adapter.

### Performance and reliability

- Kept native queues serial, capped Web queues at four, and made cancellation
  idempotent to bound decode memory.
- Added repeated Android and iOS large-image downsample gates, shared-core
  bridge tests, four-ABI Android native builds, and browser stress coverage.
- Added real packed-package CommonJS, ESM, TypeScript, peer-dependency, and
  production-audit consumer verification.

### Documentation and release infrastructure

- Added complete English and Chinese v1-to-v2 migration, compatibility,
  performance, output, task-control, and Editor documentation.
- Migrated the bare, Expo, Playground, and online-tool examples to
  `MarkerResult` and Recipe v2.
- Added protected v1 LTS and immutable v1.0.0 archive lines, a combined
  versioned documentation deployment, and strict Core/Editor tag routing with
  post-publish registry consumer checks.

## [1.12.0](https://github.com/JimmyDaddy/react-native-image-marker/compare/v1.11.0...v1.12.0) (2026-07-20)

### Features

* add server trace runtime and worker detection ([b9976c5](https://github.com/JimmyDaddy/react-native-image-marker/commit/b9976c52d2a9e99ae478259e4a7b2f77aa926f7a))
* **docs:** reorganize playground workflows ([f26524c](https://github.com/JimmyDaddy/react-native-image-marker/commit/f26524c56d0d1359cc9853188853511b16c38032))

### Bug Fixes

* isolate worker types from native consumers ([d79379d](https://github.com/JimmyDaddy/react-native-image-marker/commit/d79379d4660cdac12f35e0f8281fbff85e158e63))

## [1.11.0](https://github.com/JimmyDaddy/react-native-image-marker/compare/v1.10.1...v1.11.0) (2026-07-19)

### Features

* **watermark:** add durable provenance workflows ([7887786](https://github.com/JimmyDaddy/react-native-image-marker/commit/7887786f21d131f685b8a2053028e30b6235b746))

## [1.10.1](https://github.com/JimmyDaddy/react-native-image-marker/compare/v1.10.0...v1.10.1) (2026-07-19)

### Bug Fixes

* harden v1.10 release quality gates ([95d7d2b](https://github.com/JimmyDaddy/react-native-image-marker/commit/95d7d2b59dc3b2662bebff1b559cef55e1174b0a))

## [1.10.0](https://github.com/JimmyDaddy/react-native-image-marker/compare/v1.9.0...v1.10.0) (2026-07-19)

### Features

* **watermark:** add invisible trace watermarking ([#334](https://github.com/JimmyDaddy/react-native-image-marker/pull/334)) ([b0d5f06](https://github.com/JimmyDaddy/react-native-image-marker/commit/b0d5f06710b09a61ee09f31ca3e769b67794b321))

## [1.9.0](https://github.com/JimmyDaddy/react-native-image-marker/compare/v1.8.0...v1.9.0) (2026-07-18)

### Features

* add dynamic recipes and blend modes ([#332](https://github.com/JimmyDaddy/react-native-image-marker/pull/332)) ([c71a0e3](https://github.com/JimmyDaddy/react-native-image-marker/commit/c71a0e3ae3f50d259af66b1549517d750dfd5845))

## [1.8.0](https://github.com/JimmyDaddy/react-native-image-marker/compare/v1.7.0...v1.8.0) (2026-07-18)

### Features

* add reusable watermark recipes ([#327](https://github.com/JimmyDaddy/react-native-image-marker/issues/327)) ([ef62443](https://github.com/JimmyDaddy/react-native-image-marker/commit/ef62443a1c3cdcd47e35b442554670311d28645b))
* add controlled watermark batches ([#328](https://github.com/JimmyDaddy/react-native-image-marker/issues/328)) ([3b2e941](https://github.com/JimmyDaddy/react-native-image-marker/commit/3b2e9418004ec730bd1155585ea607c920979322))
* **web:** add Blob recipe output ([#329](https://github.com/JimmyDaddy/react-native-image-marker/issues/329)) ([bb3113b](https://github.com/JimmyDaddy/react-native-image-marker/commit/bb3113b1bfe8c70d9ceaa1fd8fdde803e060a351))
* complete v1.8 examples and text opacity ([#330](https://github.com/JimmyDaddy/react-native-image-marker/issues/330)) ([266a3c8](https://github.com/JimmyDaddy/react-native-image-marker/commit/266a3c8c3bab2cbd45b495f03caec60ac782e4f8))

### Bug Fixes

* **ios:** honor maxSize while decoding images ([#326](https://github.com/JimmyDaddy/react-native-image-marker/issues/326)) ([0da1b9d](https://github.com/JimmyDaddy/react-native-image-marker/commit/0da1b9d27ce4ef9db86a9674d58a0a0c6e928fec))

## [1.7.0](https://github.com/JimmyDaddy/react-native-image-marker/compare/v1.6.0...v1.7.0) (2026-07-18)

### Features

* add text stroke rendering ([#322](https://github.com/JimmyDaddy/react-native-image-marker/issues/322)) ([e98cdfd](https://github.com/JimmyDaddy/react-native-image-marker/commit/e98cdfd96d35dbfa58a416bc2c7388edc4927b8f))
* add tiled watermark layouts ([#323](https://github.com/JimmyDaddy/react-native-image-marker/issues/323)) ([42511fd](https://github.com/JimmyDaddy/react-native-image-marker/commit/42511fdd452d049bd6385338c1053627a9a7d509))
* showcase v1.7 watermark layouts ([#324](https://github.com/JimmyDaddy/react-native-image-marker/issues/324)) ([4d0c1c1](https://github.com/JimmyDaddy/react-native-image-marker/commit/4d0c1c15d643775bb0bf2c21bfe4eab3482c5931))

## [1.6.0](https://github.com/JimmyDaddy/react-native-image-marker/compare/v1.5.0...v1.6.0) (2026-07-18)

### Features

* **web:** harden browser rendering compatibility ([9e1256a](https://github.com/JimmyDaddy/react-native-image-marker/commit/9e1256a2117c4c76e142f45d7cef758e60a661c1))

### Bug Fixes

* **ci:** generate lockfile with npm 10 ([21f025f](https://github.com/JimmyDaddy/react-native-image-marker/commit/21f025f79ff00758db646a0c1996838b55fa0b39))
* **ci:** require modern compatibility jobs ([7a81903](https://github.com/JimmyDaddy/react-native-image-marker/commit/7a81903ae5baccf660ab0c3daa8cc70bea3eb740))
* **ci:** run Expo prebuild in example ([2cc19e0](https://github.com/JimmyDaddy/react-native-image-marker/commit/2cc19e06071b95d3b1dd1104893660b907da5f7b))
* **expo:** resolve config plugin from host app ([0ac0220](https://github.com/JimmyDaddy/react-native-image-marker/commit/0ac02200d8b5484d92a6cbf3232ff3c58b5ba0fd))
* **release:** pin compatible changelog preset ([45e9db6](https://github.com/JimmyDaddy/react-native-image-marker/commit/45e9db62330991e92087aea4605009dc721f4d01))

## 1.5.0 (2026-07-18)

* fix(ci): stabilize web example typecheck ([51af719](https://github.com/JimmyDaddy/react-native-image-marker/commit/51af719))
* fix(ci): sync web example clean install ([0a540c4](https://github.com/JimmyDaddy/react-native-image-marker/commit/0a540c4))
* fix(docs): correct production domain ([d78de8e](https://github.com/JimmyDaddy/react-native-image-marker/commit/d78de8e))
* feat(web): add browser SDK and live documentation ([3e08838](https://github.com/JimmyDaddy/react-native-image-marker/commit/3e08838))

## <small>1.4.3 (2026-07-14)</small>

* fix(native): guard nullable image marker inputs (#301) ([5225c88](https://github.com/JimmyDaddy/react-native-image-marker/commit/5225c88)), closes [#301](https://github.com/JimmyDaddy/react-native-image-marker/issues/301)

## <small>1.4.2 (2026-07-11)</small>

* fix(ci): repair npm publish setup ([5a35143](https://github.com/JimmyDaddy/react-native-image-marker/commit/5a35143))
* fix(rendering): align cross-platform output and harden pipeline (#299) ([94b623f](https://github.com/JimmyDaddy/react-native-image-marker/commit/94b623f)), closes [#299](https://github.com/JimmyDaddy/react-native-image-marker/issues/299)
* refactor: improve marker pipeline maintainability (#296) ([58f9a1e](https://github.com/JimmyDaddy/react-native-image-marker/commit/58f9a1e)), closes [#296](https://github.com/JimmyDaddy/react-native-image-marker/issues/296)

## <small>1.4.1 (2026-07-01)</small>

* fix: keep scaled image watermarks sharp (#295) ([a5d7112](https://github.com/JimmyDaddy/react-native-image-marker/commit/a5d7112)), closes [#295](https://github.com/JimmyDaddy/react-native-image-marker/issues/295)

## 1.4.0 (2026-07-01)

* feat: add native layered watermark renderer (#293) ([50fc255](https://github.com/JimmyDaddy/react-native-image-marker/commit/50fc255)), closes [#293](https://github.com/JimmyDaddy/react-native-image-marker/issues/293)

## 1.3.0 (2026-07-01)

* feat: add new architecture codegen support (#291) ([26011b6](https://github.com/JimmyDaddy/react-native-image-marker/commit/26011b6)), closes [#291](https://github.com/JimmyDaddy/react-native-image-marker/issues/291)
* ci: enable npm trusted publishing ([ac889c7](https://github.com/JimmyDaddy/react-native-image-marker/commit/ac889c7))
* ci: fix pages deployment trigger ([0f4df9c](https://github.com/JimmyDaddy/react-native-image-marker/commit/0f4df9c))

## <small>1.2.12 (2026-06-30)</small>

* test: add native functional coverage (#290) ([90dbfa4](https://github.com/JimmyDaddy/react-native-image-marker/commit/90dbfa4)), closes [#290](https://github.com/JimmyDaddy/react-native-image-marker/issues/290)
* feat: support position offsets (#285) ([85d9644](https://github.com/JimmyDaddy/react-native-image-marker/commit/85d9644)), closes [#285](https://github.com/JimmyDaddy/react-native-image-marker/issues/285)
* feat(example): add shared image marker lab (#289) ([8dab7b4](https://github.com/JimmyDaddy/react-native-image-marker/commit/8dab7b4)), closes [#289](https://github.com/JimmyDaddy/react-native-image-marker/issues/289)
* fix: move patch tooling to dev dependencies (#277) ([9f74cdb](https://github.com/JimmyDaddy/react-native-image-marker/commit/9f74cdb)), closes [#277](https://github.com/JimmyDaddy/react-native-image-marker/issues/277)
* fix: normalize ios image orientation (#287) ([2497f58](https://github.com/JimmyDaddy/react-native-image-marker/commit/2497f58)), closes [#287](https://github.com/JimmyDaddy/react-native-image-marker/issues/287)
* fix: preserve android named colors (#278) ([2208a15](https://github.com/JimmyDaddy/react-native-image-marker/commit/2208a15)), closes [#278](https://github.com/JimmyDaddy/react-native-image-marker/issues/278)
* fix: propagate image loading errors via rejecter on iOS (#267) ([7e9bb86](https://github.com/JimmyDaddy/react-native-image-marker/commit/7e9bb86)), closes [#267](https://github.com/JimmyDaddy/react-native-image-marker/issues/267)
* fix: scope root typecheck to library sources (#288) ([dc48a11](https://github.com/JimmyDaddy/react-native-image-marker/commit/dc48a11)), closes [#288](https://github.com/JimmyDaddy/react-native-image-marker/issues/288)
* fix: support responsive watermark font sizing (#282) ([a9643f4](https://github.com/JimmyDaddy/react-native-image-marker/commit/a9643f4)), closes [#282](https://github.com/JimmyDaddy/react-native-image-marker/issues/282)
* fix: use react native pod dependency helper (#286) ([98a422a](https://github.com/JimmyDaddy/react-native-image-marker/commit/98a422a)), closes [#286](https://github.com/JimmyDaddy/react-native-image-marker/issues/286)
* fix(android): remove deprecated jcenter repository (#262) ([6f665ce](https://github.com/JimmyDaddy/react-native-image-marker/commit/6f665ce)), closes [#262](https://github.com/JimmyDaddy/react-native-image-marker/issues/262)
* fix(ios): guard against nil markOpts and request to prevent EXC_BREAKPOINT crashes (#271) ([1323326](https://github.com/JimmyDaddy/react-native-image-marker/commit/1323326)), closes [#271](https://github.com/JimmyDaddy/react-native-image-marker/issues/271)
* fix(ios): reject malformed marker inputs (#284) ([df8d9f5](https://github.com/JimmyDaddy/react-native-image-marker/commit/df8d9f5)), closes [#284](https://github.com/JimmyDaddy/react-native-image-marker/issues/284)
* docs: clarify font support (#279) ([da1eabf](https://github.com/JimmyDaddy/react-native-image-marker/commit/da1eabf)), closes [#279](https://github.com/JimmyDaddy/react-native-image-marker/issues/279)
* docs: expand expo installation guide (#280) ([c9ae370](https://github.com/JimmyDaddy/react-native-image-marker/commit/c9ae370)), closes [#280](https://github.com/JimmyDaddy/react-native-image-marker/issues/280)
* ci: bump Cocoapods version from 1.15.0 to 1.15.2 in the iOS build matrix (#266) ([f12c10b](https://github.com/JimmyDaddy/react-native-image-marker/commit/f12c10b)), closes [#266](https://github.com/JimmyDaddy/react-native-image-marker/issues/266)
* ci: change macos-13 pipline image to macos-14 (#263) ([9362fc4](https://github.com/JimmyDaddy/react-native-image-marker/commit/9362fc4)), closes [#263](https://github.com/JimmyDaddy/react-native-image-marker/issues/263)
* ci: stabilize android emulator tests (#283) ([b7b590a](https://github.com/JimmyDaddy/react-native-image-marker/commit/b7b590a)), closes [#283](https://github.com/JimmyDaddy/react-native-image-marker/issues/283)
* ci: update npm publish workflow to Node.js 24, newer actions, and OIDC permissions (#265) ([db893db](https://github.com/JimmyDaddy/react-native-image-marker/commit/db893db)), closes [#265](https://github.com/JimmyDaddy/react-native-image-marker/issues/265)
* chore: add workflow_dispatch trigger to npm-publish.yml ([27951a8](https://github.com/JimmyDaddy/react-native-image-marker/commit/27951a8))
* chore: release 1.2.11 (#268) ([515cc2c](https://github.com/JimmyDaddy/react-native-image-marker/commit/515cc2c)), closes [#268](https://github.com/JimmyDaddy/react-native-image-marker/issues/268)
* chore: update dev dep ([db37b64](https://github.com/JimmyDaddy/react-native-image-marker/commit/db37b64))
* cd/bump v 1.2.10 (#264) ([7ffef10](https://github.com/JimmyDaddy/react-native-image-marker/commit/7ffef10)), closes [#264](https://github.com/JimmyDaddy/react-native-image-marker/issues/264)

## [1.2.11](///compare/v1.2.10...v1.2.11) (2026-01-31)

### Bug Fixes
* fix: propagate image loading errors via rejecter on iOS (#267) ([7e9bb86](https://github.com/JimmyDaddy/react-native-image-marker/commit/7e9bb86)), closes [#267](https://github.com/JimmyDaddy/react-native-image-marker/issues/267)
* ci: bump Cocoapods version from 1.15.0 to 1.15.2 in the iOS build matrix (#266) ([f12c10b](https://github.com/JimmyDaddy/react-native-image-marker/commit/f12c10b)), closes [#266](https://github.com/JimmyDaddy/react-native-image-marker/issues/266)
* ci: change macos-13 pipline image to macos-14 (#263) ([9362fc4](https://github.com/JimmyDaddy/react-native-image-marker/commit/9362fc4)), closes [#263](https://github.com/JimmyDaddy/react-native-image-marker/issues/263)
* ci: update npm publish workflow to Node.js 24, newer actions, and OIDC permissions (#265) ([db893db](https://github.com/JimmyDaddy/react-native-image-marker/commit/db893db)), closes [#265](https://github.com/JimmyDaddy/react-native-image-marker/issues/265)


## [1.2.10](///compare/v1.2.9-1...v1.2.10) (2026-01-30)

### Bug Fixes
* fix(android): remove deprecated jcenter repository (#262) ([6f665ce](https://github.com/JimmyDaddy/react-native-image-marker/commit/6f665ce)), closes [#262](https://github.com/JimmyDaddy/react-native-image-marker/issues/262)

## [1.2.9](///compare/v1.1.8...v1.2.9) (2025-11-20)

### Features

* expo support ([#207](undefined/undefined/undefined/issues/207)) 7a6ca14

### Bug Fixes

*  fix [#158](undefined/undefined/undefined/issues/158) android release bug  style not working ([#160](undefined/undefined/undefined/issues/160)) a942e30
*  fontName bug (android) ([#196](undefined/undefined/undefined/issues/196)) 83d9856
* add custom fonts to example ([#197](undefined/undefined/undefined/issues/197)) 6e2ad75
* cd scripts error f01c061
* coil load image with original size ([#217](undefined/undefined/undefined/issues/217)) d6e8744
* fix [#164](undefined/undefined/undefined/issues/164) Build Failure on CI Due to CocoaPods 1.1.9 in iOS Project ([#165](undefined/undefined/undefined/issues/165)) 532e8a4
* fix [#179](undefined/undefined/undefined/issues/179) Same watermark image is behaving differently on ANDROID and iOS ([#180](undefined/undefined/undefined/issues/180)) 10d71e1
* fix [#179](undefined/undefined/undefined/issues/179) same watermark image is behaving differently on android and ios when use given position enum ([#187](undefined/undefined/undefined/issues/187)) 1c62250
* fix [#202](undefined/undefined/undefined/issues/202) generates inconsistent text size across different devices ([#204](undefined/undefined/undefined/issues/204)) 47c0cd9
* fix[#176](undefined/undefined/undefined/issues/176) Fresco 3.1.3 compatibility issues with RN 0.73.0, compileDebugKotlin FAILED ([#177](undefined/undefined/undefined/issues/177)) 06d65c4
* Handle Nullable Map and Enum Mismatch in MarkTextOptions.kt ([#247](undefined/undefined/undefined/issues/247)) 9878efa
* load base64 image on android ([#240](undefined/undefined/undefined/issues/240)) 4764a6f
* parse hex color string crash on iOS ([#186](undefined/undefined/undefined/issues/186)) 53ac1f1
* RN 0.80.2 build error ([#248](undefined/undefined/undefined/issues/248)) 76d6972

## [1.2.6](https://github.com/JimmyDaddy/react-native-image-marker/compare/v1.1.8...v1.2.6) (2024-02-04)


### Bug Fixes

* coil load image use the original dimensions by default ([fc29a6a](https://github.com/JimmyDaddy/react-native-image-marker/commit/fc29a6ac4c55e994863bd32d8b32e7414be0d378))

### Other Changes

* remove expo android ios folders and ignore it ([7cd0df2](https://github.com/JimmyDaddy/react-native-image-marker/commit/7cd0df272e516a18cacea6f4d8114ad14c36f769))


## [1.2.5](https://github.com/JimmyDaddy/react-native-image-marker/compare/v1.2.4...v1.2.5) (2024-01-26)


### Features

* expo support ([6c97c55](https://github.com/JimmyDaddy/react-native-image-marker/commit/6c97c5560e874b2e1509db34627c9775f71e9d7a))

## [1.2.4](https://github.com/JimmyDaddy/react-native-image-marker/compare/v1.2.3...v1.2.4) (2024-01-24)


### Bug Fixes

* set the font size without considering the screen density ([3df1080](https://github.com/JimmyDaddy/react-native-image-marker/commit/3df10801fceb3bbef894af4089074ed6a3bd64e7))


### Features

* replace positionOptions to postions ([482198f](https://github.com/JimmyDaddy/react-native-image-marker/commit/482198f55f1c18f7aecdbbcdaaa9f6a2ef35b119))

## [1.2.3](https://github.com/JimmyDaddy/react-native-image-marker/compare/v1.2.2...v1.2.3) (2024-01-22)


### Bug Fixes

*  fontName bug (android) ([#196](https://github.com/JimmyDaddy/react-native-image-marker/issues/196)) ([83d9856](https://github.com/JimmyDaddy/react-native-image-marker/commit/83d9856c01d275fac81741f908fbb61a39e34219))
* add custom fonts to example ([#197](https://github.com/JimmyDaddy/react-native-image-marker/issues/197)) ([6e2ad75](https://github.com/JimmyDaddy/react-native-image-marker/commit/6e2ad75b56c8a8e23bfb181beca11b4d60213f20))

## [1.2.2](https://github.com/JimmyDaddy/react-native-image-marker/compare/v1.2.1...v1.2.2) (2024-01-01)

### Bug Fixes

* remove debug  fill red color in rect ([7ed675a](https://github.com/JimmyDaddy/react-native-image-marker/commit/7ed675aea5a4a3d4b42e181ec7ea6bd7327f834e))

## [1.2.1](https://github.com/JimmyDaddy/react-native-image-marker/compare/v1.2.0...v1.2.1) (2023-12-28)

### Bug Fixes

* [#179](https://github.com/JimmyDaddy/react-native-image-marker/issues/179) Same watermark image is behaving differently on ANDROID and IOS when use given position enum ([39107f0](https://github.com/JimmyDaddy/react-native-image-marker/commit/39107f0977a400faf4dc7ed8f94e3877287d9d78))
* parse hex color string crash on iOS ([#186](https://github.com/JimmyDaddy/react-native-image-marker/issues/186)) ([53ac1f1](https://github.com/JimmyDaddy/react-native-image-marker/commit/53ac1f14461e3007a2e028d0c401a1eed3ddd962))

## [1.2.0](https://github.com/JimmyDaddy/react-native-image-marker/compare/v1.1.8...v1.2.0) (2023-12-21)


### Bug Fixes

* fix [#164](https://github.com/JimmyDaddy/react-native-image-marker/issues/164) Build Failure on CI Due to CocoaPods 1.1.9 in iOS Project ([#165](https://github.com/JimmyDaddy/react-native-image-marker/issues/165)) ([532e8a4](https://github.com/JimmyDaddy/react-native-image-marker/commit/532e8a4d325fd1c30315eac0f1ab81fbf81c144f))
* fix[#176](https://github.com/JimmyDaddy/react-native-image-marker/issues/176) Fresco 3.1.3 compatibility issues with RN 0.73.0, compileDebugKotlin FAILED ([2fd4fef](https://github.com/JimmyDaddy/react-native-image-marker/commit/2fd4feff34e3bf9ada3de0dbb6f9789facbd0500))


### Features

* use Coil instead of Fresco to load images on the Android platform ([4438127](https://github.com/JimmyDaddy/react-native-image-marker/commit/44381276fa2973782f839415f2b3e735d63f93fa))

## [1.1.11](https://github.com/JimmyDaddy/react-native-image-marker/compare/v1.1.8...v1.1.11) (2023-12-21)


### Bug Fixes

*  fix [#158](https://github.com/JimmyDaddy/react-native-image-marker/issues/158) android release bug  style not working ([#160](https://github.com/JimmyDaddy/react-native-image-marker/issues/160)) ([a942e30](https://github.com/JimmyDaddy/react-native-image-marker/commit/a942e30732c61094abc1e95ca5003c883d1e4410))
* fix [#164](https://github.com/JimmyDaddy/react-native-image-marker/issues/164) Build Failure on CI Due to CocoaPods 1.1.9 in iOS Project ([#165](https://github.com/JimmyDaddy/react-native-image-marker/issues/165)) ([532e8a4](https://github.com/JimmyDaddy/react-native-image-marker/commit/532e8a4d325fd1c30315eac0f1ab81fbf81c144f))
* fix [#179](https://github.com/JimmyDaddy/react-native-image-marker/issues/179) Same watermark image is behaving differently on ANDROID and IOS ([a269510](https://github.com/JimmyDaddy/react-native-image-marker/commit/a269510ad8887bb5466493ce304714d01f067c6a))

## [1.1.10](https://github.com/JimmyDaddy/react-native-image-marker/compare/v1.1.8...v1.1.10) (2023-11-29)


### Bug Fixes

* fix  [#164](https://github.com/JimmyDaddy/react-native-image-marker/issues/164) Build Failure on CI Due to CocoaPods 1.1.9 in iOS Project ([d1758e5](https://github.com/JimmyDaddy/react-native-image-marker/commit/d1758e528befba9a9d125bad3c9c1b182865c1a5))

## [1.1.9](https://github.com/JimmyDaddy/react-native-image-marker/compare/v1.1.8...v1.1.9) (2023-11-18)

### Bug Fixes

* fix [#158](https://github.com/JimmyDaddy/react-native-image-marker/issues/158) android release bug style not working ([82e0a9a](https://github.com/JimmyDaddy/react-native-image-marker/commit/a942e30732c61094abc1e95ca5003c883d1e4410))


## [1.1.8](https://github.com/JimmyDaddy/react-native-image-marker/compare/v1.1.7...v1.1.8) (2023-10-20)


### Bug Fixes

* fix android text rotation fix [#156](https://github.com/JimmyDaddy/react-native-image-marker/issues/156) ([21b0f1b](https://github.com/JimmyDaddy/react-native-image-marker/commit/21b0f1b69808f4e3d741bfe668ef357a05155adf))

## [1.1.7](https://github.com/JimmyDaddy/react-native-image-marker/compare/v1.1.6...v1.1.7) (2023-10-03)


### Bug Fixes

* fix: image marker position bug WatermarkImageOptions.swift ([f3789cb](https://github.com/JimmyDaddy/react-native-image-marker/pull/149/commits/f3789cba1dd42f5896531bb1deb665acc3fc2fc4))


## [1.1.6](https://github.com/JimmyDaddy/react-native-image-marker/compare/v1.1.1...v1.1.6) (2023-10-01)


### Bug Fixes

* fix [#143](https://github.com/JimmyDaddy/react-native-image-marker/issues/143) & document ([#144](https://github.com/JimmyDaddy/react-native-image-marker/issues/144)) ([4179dc0](https://github.com/JimmyDaddy/react-native-image-marker/commit/4179dc08f737875e7bed857cf3b5dfd5b0c5dfbb))


### Features

* text background border radius ([#139](https://github.com/JimmyDaddy/react-native-image-marker/issues/139)) ([7a476ac](https://github.com/JimmyDaddy/react-native-image-marker/commit/7a476ac9ec650fa46db2efbfcf123e9ee0dba737))


## [1.1.4](https://github.com/JimmyDaddy/react-native-image-marker/compare/v1.1.1...v1.1.4) (2023-09-27)


### Chore

* add icon ([#126](https://github.com/JimmyDaddy/react-native-image-marker/issues/126)) ([c62fb32](https://github.com/JimmyDaddy/react-native-image-marker/commit/c62fb32c3b790d7c2c447fa26f1605f8ace52d5b))


### Features

* android text background padding setting ([b53ac1d](https://github.com/JimmyDaddy/react-native-image-marker/commit/b53ac1ddb5e1c53f8cd9601898327b82699be3e9))
* coordinates set support percentage ([f96f4a9](https://github.com/JimmyDaddy/react-native-image-marker/commit/f96f4a93da70b7ea2fb7582a117b986d9ff228dc))
* iOS text background padding setting ([03eb4d1](https://github.com/JimmyDaddy/react-native-image-marker/commit/03eb4d195a01fe86df69cb51baacd62695bd6398))

## [1.1.2](https://github.com/JimmyDaddy/react-native-image-marker/compare/v1.1.1...v1.1.2) (2023-09-20)


### Bug Fixes

*  textAlignment not uniform in android-ios,  fixed [#119](https://github.com/JimmyDaddy/react-native-image-marker/issues/119) ([f86f7a0](https://github.com/JimmyDaddy/react-native-image-marker/commit/f86f7a0dcea16b555ddf8107c498daa21d8727cb))

## [1.1.1](https://github.com/JimmyDaddy/react-native-image-marker/compare/v0.9.2...v1.1.1) (2023-09-05)


### Bug Fixes

* android api level compatible setting and docs ([#117](https://github.com/JimmyDaddy/react-native-image-marker/issues/117)) ([bea81ab](https://github.com/JimmyDaddy/react-native-image-marker/commit/bea81abda1355b7633a2e107f2e0a4e4237d3746))
* image scale ([#114](https://github.com/JimmyDaddy/react-native-image-marker/issues/114)) ([783b2ab](https://github.com/JimmyDaddy/react-native-image-marker/commit/783b2abc36586c6f6087295682a348b6c9010d17))


### Features

* support multiple image watermarks ([#113](https://github.com/JimmyDaddy/react-native-image-marker/issues/113)) ([ec73482](https://github.com/JimmyDaddy/react-native-image-marker/commit/ec73482f7f2fd8518845c19a549fc589aff28445))
* support multiple text and more style options ([#104](https://github.com/JimmyDaddy/react-native-image-marker/issues/104)) ([0b91cd4](https://github.com/JimmyDaddy/react-native-image-marker/commit/0b91cd4baaf2f664f908483b225509e443f9bae7))

# [1.1.0](https://github.com/JimmyDaddy/react-native-image-marker/compare/v0.9.2...v1.1.0) (2023-07-31)


### Bug Fixes

* image scale ([#114](https://github.com/JimmyDaddy/react-native-image-marker/issues/114)) ([783b2ab](https://github.com/JimmyDaddy/react-native-image-marker/commit/783b2abc36586c6f6087295682a348b6c9010d17))


### Features

* support multiple image watermarks ([#113](https://github.com/JimmyDaddy/react-native-image-marker/issues/113)) ([ec73482](https://github.com/JimmyDaddy/react-native-image-marker/commit/ec73482f7f2fd8518845c19a549fc589aff28445))
* support multiple text and more style options ([#104](https://github.com/JimmyDaddy/react-native-image-marker/issues/104)) ([0b91cd4](https://github.com/JimmyDaddy/react-native-image-marker/commit/0b91cd4baaf2f664f908483b225509e443f9bae7))

## [1.0.1](https://github.com/JimmyDaddy/react-native-image-marker/compare/v0.9.2...v1.0.1) (2023-07-29)


### Features

* support multiple text and more style options ([#104](https://github.com/JimmyDaddy/react-native-image-marker/issues/104)) ([0b91cd4](https://github.com/JimmyDaddy/react-native-image-marker/commit/0b91cd4baaf2f664f908483b225509e443f9bae7))

# [1.0.0](https://github.com/JimmyDaddy/react-native-image-marker/compare/v0.9.2...v1.0.0) (2023-07-29)


### Features

* support multiple text and more style options ([#104](https://github.com/JimmyDaddy/react-native-image-marker/issues/104)) ([0b91cd4](https://github.com/JimmyDaddy/react-native-image-marker/commit/0b91cd4baaf2f664f908483b225509e443f9bae7))
