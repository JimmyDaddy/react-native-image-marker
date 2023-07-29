# [react-native-image-marker](https://jimmydaddy.github.io/react-native-image-marker/) ![npm version](https://badge.fury.io/js/react-native-image-marker.svg) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/JimmyDaddy/react-native-image-marker/pulls)

Add text or icon watermark to your images

## sample

<p>
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

## Installation

**RN version < 0.60.0 please use v0.5.2 or older**

* npm install react-native-image-marker --save
* link
    * react-native link (RN version < 0.60.0)
    * [auto link](https://github.com/react-native-community/cli/blob/main/docs/autolinking.md)(RN version > 0.60.0)

### iOS Pod Install (RN version < 0.60.0)

You can use `pod` instead of `link`. Add following lines in your `Podfile`:

```shell
pod 'RNImageMarker', :path => '../node_modules/react-native-image-marker'
```

## Usage

### text watermarks

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
 watermarkTexts: [
 {
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
 },
 {
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
 ],
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

### icon watermarks

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
 watermarkImage: {
   src: require('./images/watermark.png'),
   scale: 1,
   rotate: 20,
   alpha: 0.5,
 },
 watermarkPositions: {
   position: Position.center,
 },
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

[the latest version](https://jimmydaddy.github.io/react-native-image-marker/classes/Marker.html)

If you are using a version lower than 1.0.0, please go to [v0.9.2](https://github.com/JimmyDaddy/react-native-image-marker/tree/master/README.0.9.2.MD)

## Extra about Android decoding image

This library use [Fresco](https://github.com/facebook/fresco) to decode image on Android. You can set your configuration through [Configure Fresco in React Native](https://medium.com/in-the-hudl/configure-fresco-in-react-native-28c2bc7dcc4d)

* RN version < 0.60.0 use fresco v1.10.0
* RN version >= 0.60.0 use fresco v2.0.0 +

[see](https://github.com/facebook/react-native/blob/8cf9505bd27c5dade33b17cc177fa5ef1613dbcd/ReactAndroid/gradle.properties#L15)

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

## Example

[example](https://github.com/JimmyDaddy/react-native-image-marker/tree/master/example)

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
