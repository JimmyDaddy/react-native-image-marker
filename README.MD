<div align="center">
  <a href="https://image-marker.corerobin.com">
    <img src="assets/icon.png" alt="React Native Image Marker" width="128" />
  </a>
  <h1>React Native Image Marker</h1>
  <p>Text, image, and ordered watermark layers for iOS, Android, and Web.</p>

[![npm version](https://img.shields.io/npm/v/react-native-image-marker.svg?label=npm)](https://www.npmjs.com/package/react-native-image-marker)

</div>

## See what you can make

Compose text and image layers, keep their render order under control, and export the finished image on iOS, Android, or Web.

<p align="center">
  <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/website/public/media/watermark-after-dark.jpg" alt="A night street photograph with layered title, metadata, vertical text, and an Image Marker logo" width="100%" />
</p>

<table>
  <tr>
    <td width="50%">
      <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/website/public/media/watermark-coast.jpg" alt="A coastal photograph with a title, date, status badge, and logo watermark" width="100%" />
    </td>
    <td width="50%">
      <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/website/public/media/watermark-waypoint.jpg" alt="A mountain road photograph demonstrating absolute watermark coordinates" width="100%" />
    </td>
  </tr>
  <tr>
    <td><strong>Ready to share.</strong><br />Add titles, metadata, badges, and your logo in one export.</td>
    <td><strong>Placed where you want it.</strong><br />Use anchors, offsets, rotation, or absolute coordinates.</td>
  </tr>
</table>

## Install

```sh
npm install react-native-image-marker
```

Install iOS pods and rebuild the native app:

```sh
npx pod-install
```

Expo projects must use a development build because this package's native code is not bundled with Expo Go. See the [Expo installation steps](https://image-marker.corerobin.com/getting-started/).

## Quick start

```ts
import Marker, { ImageFormat, Position } from 'react-native-image-marker';

const result = await Marker.markText({
  backgroundImage: {
    src: require('./images/background.jpg'),
  },
  watermarkTexts: [
    {
      text: '© Acme Studio',
      position: {
        position: Position.bottomRight,
        X: 24,
        Y: 24,
      },
      style: {
        color: '#FFFFFF',
        fontSize: 28,
      },
    },
  ],
  filename: 'marked-photo',
  saveFormat: ImageFormat.jpg,
  quality: 92,
});
```

On iOS and Android, JPEG and PNG calls resolve with a native cache-file path. On Web, every format resolves with a browser-ready data URL; native `ImageFormat.base64` also returns a PNG data URL.

## Live Web SDK

[Try the live playground](https://image-marker.corerobin.com/playground/) to run the same `Marker.markText`, `Marker.markImage`, and `Marker.mark` API entirely in your browser. Images stay local.

The Web renderer accepts URL strings, `{ uri }`, data URLs, `Blob`, `File`, and loaded browser images. In Expo Web, resolve a numeric bundled asset first:

```ts
import { Asset } from 'expo-asset';

const background = Asset.fromModule(require('./images/background.jpg'));
const webSource = { uri: background.uri };
```

Browser Canvas and native graphics stacks share the API and positioning model but are not guaranteed to be pixel-identical. Fonts, decoding, antialiasing, and JPEG encoding can differ.

## Choose an API

| Method             | Use it for                                       |
| ------------------ | ------------------------------------------------ |
| `Marker.markText`  | One or many text layers                          |
| `Marker.markImage` | One or many logo, icon, or image layers          |
| `Marker.mark`      | Ordered text and image layers in one render pass |

Layers render in array order, so later layers draw over earlier layers. `markText` and `markImage` remain supported; use `mark` when mixed layer order matters.

## Compatibility

- iOS 13 or newer
- Android API 24 or newer
- Modern browsers with Canvas 2D / React Native Web
- React Native New Architecture support since library v1.3.0
- Legacy bridge fallback
- Expo development builds through native autolinking
- CI coverage for RN 0.73 legacy/new architecture, RN 0.86 New Architecture, and Expo SDK 57 / RN 0.86

See the full [compatibility guide](https://image-marker.corerobin.com/compatibility/) when maintaining an older React Native app.

## Documentation

- [简体中文文档](https://image-marker.corerobin.com/zh-cn/)
- [Installation](https://image-marker.corerobin.com/getting-started/)
- [Live playground](https://image-marker.corerobin.com/playground/)
- [Guides](https://image-marker.corerobin.com/guides/choose-an-api/)
- [Visual cookbook](https://image-marker.corerobin.com/cookbook/)
- [Troubleshooting](https://image-marker.corerobin.com/troubleshooting/)
- [API reference](https://image-marker.corerobin.com/api/)

## Examples

- [React Native example](example) — full Image Marker Lab and architecture status
- [Expo example](expo-example) — native development-build workflow plus a dedicated React Native Web entry

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development and release workflow.

## License

[MIT](LICENSE)
