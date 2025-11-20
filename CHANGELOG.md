# Changelog

## [1.2.7](///compare/v1.1.8...v1.2.7) (2025-11-20)

### Features

* expo support ([#207](undefined/undefined/undefined/issues/207)) 7a6ca14

### Bug Fixes

*  fix [#158](undefined/undefined/undefined/issues/158) android release bug  style not working ([#160](undefined/undefined/undefined/issues/160)) a942e30
*  fontName bug (android) ([#196](undefined/undefined/undefined/issues/196)) 83d9856
* add custom fonts to example ([#197](undefined/undefined/undefined/issues/197)) 6e2ad75
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
