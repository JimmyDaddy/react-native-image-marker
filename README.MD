<div align="center">
    <a href="https://jimmydaddy.github.io/react-native-image-marker/" title="react native image marker">
        <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/asset/icon.png" alt="react native image marker Logo" width="200" />
    </a>
    <a href="https://jimmydaddy.github.io/react-native-image-marker/"><h1 style="color: #424E6D">react native image marker</h1></a>
    <h6>Add text or icon watermarks to images</h6>
</div>

<div align="center">

[![npm version](https://img.shields.io/npm/v/react-native-image-marker.svg?logo=npm)](https://www.npmjs.com/package/react-native-image-marker) [![npm](https://img.shields.io/npm/dm/react-native-image-marker?logo=npm)](https://www.npmjs.com/package/react-native-image-marker) [![stars](https://img.shields.io/github/stars/jimmydaddy/react-native-image-marker?style=social)](https://github.com/JimmyDaddy/react-native-image-marker) [![forks](https://img.shields.io/github/forks/jimmydaddy/react-native-image-marker?style=social)](https://github.com/JimmyDaddy/react-native-image-marker/fork)[![github](https://img.shields.io/badge/github-repo-blue?logo=github)](https://github.com/JimmyDaddy/react-native-image-marker) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?logo=github)](https://github.com/JimmyDaddy/react-native-image-marker/pulls) ![license](https://img.shields.io/npm/l/react-native-image-marker) 

</div>

## Features

* Add **multiple text** watermarks to images
* Add **multiple icon** watermarks to images *(Android >= N, iOS >= iOS 13)*
* Support **rotating** background image and icon watermarks.
* Support setting opacity for background image and icon watermarks.
* Support base64 format
* Flexible text style settings
  * rotating
  * text shadow
  * background color
  * italic
  * bold
  * stroke
  * text align
* Compatible with both Android and iOS

## Samples

<p align="center">
 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/asset/multiple_icon_markers.png" width='200'>
 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/asset/alphabgonly.png" width='200'>
 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/asset/alphicononly.png" width='200'>
 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/asset/imagewatermark.png" width='200'>
 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/asset/multipletexts.png" width='200'>
 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/asset/rotatebg.png" width='200'>
 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/asset/rotateicon.png" width='200'>
 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/asset/rotateimageicon.png" width='200'>
 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/asset/rotatetexts_1.png" width='200'>
 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/asset/rotatetexts.png" width='200'>
 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/asset/textswihoutbg.png" width='200'>
 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/asset/IOSMarker.gif" width='200'>
 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/asset/AndroidMarker.gif" width='200'>
 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/asset/shadow_bg_fit.png" width='200'>
 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/asset/shadow_bg_sx.png" width='200'>
 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/asset/shadow.png" width='200'>
 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/asset/shadow_bg_sy.png" width='200'>
</p>

## Compatibility

| React Native Version | react-native-image-marker Version |
| ---------------------| --------------------------------- |
| < 0.60.0             | v0.5.2 or earlier                 |
| >= 0.60.0, ***iOS < 13, Android < N(API Level 24)*** | v1.0.x |
| >= 0.60.0, other cases | v1.1.0 or later |

> Note: This table is only applicable to major versions of react-native-image-marker. Patch versions should be backwards compatible.

## Installation

* npm install react-native-image-marker --save
* link
  * react-native link (RN version < 0.60.0)
  * [auto link](https://github.com/react-native-community/cli/blob/main/docs/autolinking.md)(RN version > 0.60.0)

> **RN version < 0.60.0 please use v0.5.2 or older**

#### iOS Pod Install (RN version < 0.60.0)

You can use `pod` instead of `link`. Add following lines in your `Podfile`:

```ruby
pod 'RNImageMarker', :path => '../node_modules/react-native-image-marker'
```

## Usage

### Text watermarks

```javascript

import Marker from "react-native-image-marker"

···
// add text watermark to a photo
const options = {
 backgroundImage: {
  src: require('./images/test.jpg'),
  scale: 1,
  rotate: 20,
  alpha: 0.5,
 },
 // support multiple texts
 watermarkTexts: [{
   text: 'hello',
   positionOptions: {
     position: Position.center,
   },
   style: {
     color: '#ff00ff',
     fontSize: 30,
     fontName: 'Arial',
     rotate: 30,
     shadowStyle: {
       dx: 10,
       dy: 10,
       radius: 10,
       color: '#ffaa22',
     },
     textBackgroundStyle: {
       paddingX: 10,
       paddingY: 10,
       type: TextBackgroundType.none,
       color: '#faaaff',
     },
     underline: true,
     strikeThrough: true,
     textAlign: 'left',
     italic: true,
     bold: true,
   },
 }, {
   text: 'world',
   positionOptions: {
     X: 10,
     Y: 10,
   },
   style: {
    color: '#AAFFDD',
    fontSize: 30,
    fontName: 'Arial',
    rotate: 170,
    shadowStyle: {
     dx: 10,
     dy: 10,
     radius: 10,
     color: '#ffaa22',
    },
    textBackgroundStyle: {
     paddingX: 10,
     paddingY: 10,
     type: TextBackgroundType.stretchX,
     color: '#faaaff',
    },
    textAlign: 'right',
    skewX: 10,
   },
 }],
 scale: 1,
 quality: 100,
 filename: 'test',
 saveFormat: ImageFormat.png,
 maxSize: 1000,
};
ImageMarker.markText(options).then((res) => {
 console.log(res);
}).catch((err) => {
 console.log(err);
});
// or
await ImageMarker.markText(options);

```

### Icon watermarks

```javascript

import Marker from "react-native-image-marker"

···
// add icon watermark to a background image
const options = {
 backgroundImage: {
   src: require('./images/test.jpg'),
   scale: 1,
   rotate: 20,
   alpha: 0.5,
 },
 // support multiple icons, iOS >= 13, Android >= N(API Level 24)
 watermarkImages: [{
   src: require('./images/watermark.png'),
   scale: 1,
   rotate: 20,
   alpha: 0.5,
   position: {
    position: Position.center,
   }
 }, {
  src: require('./images/watermark1.png'),
   scale: 1,
   rotate: 20,
   alpha: 0.5,
   position: {
    X: 20,
    Y: 20,
   }
 }],
 quality: 100,
 filename: 'test',
 saveFormat: ImageFormat.png,
 maxSize: 1000,
};
ImageMarker.markImage(options).then((res) => {
 console.log(res);
}).catch((err) => {
 console.log(err);
});
// or
await ImageMarker.markImage(options);

```

## API

* [the latest version](https://jimmydaddy.github.io/react-native-image-marker/classes/Marker.html)
* [v1.0.x](https://jimmydaddy.github.io/react-native-image-marker/v1.0.x/classes/Marker.html)
* If you are using a version lower than 1.0.0, please go to [v0.9.2](https://github.com/JimmyDaddy/react-native-image-marker/wiki/0.9.2)

## Extra about Android decoding image

This library use [Fresco](https://github.com/facebook/fresco) to decode image on Android. You can set your configuration through [Configure Fresco in React Native](https://medium.com/in-the-hudl/configure-fresco-in-react-native-28c2bc7dcc4d)

* RN version < 0.60.0 use fresco v1.10.0
* RN version >= 0.60.0 use fresco v2.0.0 +

[ref](https://github.com/facebook/react-native/blob/8cf9505bd27c5dade33b17cc177fa5ef1613dbcd/ReactAndroid/gradle.properties#L15)

## Save image to file

* If you want to save the new image result to the phone camera roll, just use the [CameraRoll-module from react-native](https://facebook.github.io/react-native/docs/cameraroll.html#savetocameraroll).
* If you want to save it to an arbitrary file path, use something like [react-native-fs](https://github.com/itinance/react-native-fs).
* For any more advanced needs, you can write your own (or find another) native module that would solve your use-case.

## Contributors

[@filipef101](https://github.com/filipef101)
[@mikaello](https://github.com/mikaello)
[@Peretz30](https://github.com/Peretz30)
[@gaoxiaosong](https://github.com/gaoxiaosong)
[@onka13](https://github.com/onka13)
[@OrangeFlavoredColdCoffee](https://github.com/OrangeFlavoredColdCoffee)

## Examples

[examples](https://github.com/JimmyDaddy/react-native-image-marker/tree/master/example)

If you want to run the example locally, you can do the following:

```bash
# Android
# Open an android emulator or connect a real device at first
yarn example android

# iOS
yarn example ios

```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

[MIT](LICENSE)

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
