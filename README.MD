<div align="center">
    <a href="https://jimmydaddy.github.io/react-native-image-marker/" title="react native image marker">
        <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/icon.png" alt="react native image marker Logo" width="150" />
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
  * padding
  * relative position
  * background border radius
* Compatible with both Android and iOS

## Sample

<p>
 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/IOSMarker.gif" width='150'>
 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/AndroidMarker.gif" width='150'>
</p>

## Usage

### Text background

* [TextBackgroundType](https://jimmydaddy.github.io/react-native-image-marker/enums/TextBackgroundType.html)
* [TextBackgroundStyle](https://jimmydaddy.github.io/react-native-image-marker/interfaces/TextBackgroundStyle.html)

#### Text background fit

##### API

[TextBackgroundType.none](https://jimmydaddy.github.io/react-native-image-marker/enums/TextBackgroundType.html#none)

##### Sample


 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/shadow_bg_fit.png" width='150'>


##### Example


```typescript
import Marker, { Position, TextBackgroundType } from "react-native-image-marker"
···
const options = {
  // background image
  backgroundImage: {
    src: require('./images/test.jpg'),
    scale: 1,
  },
  watermarkTexts: [{
    text: 'text marker \n multline text',
    positionOptions: {
      position: Position.topLeft,
    },
    style: {
      color: '#ff00ff',
      fontSize: 30,
      fontName: 'Arial',
      shadowStyle: {
        dx: 10,
        dy: 10,
        radius: 10,
        color: '#008F6D',
      },
      textBackgroundStyle: {
        padding: '10% 10%',
        type: TextBackgroundType.none,
        color: '#0FFF00',
      },
    },
  }],
  scale: 1,
  quality: 100,
  filename: 'test',
  saveFormat: ImageFormat.png,
  maxSize: 1000,
};
Marker.markText(options);

```

#### Text background stretchX

##### API


[TextBackgroundType.stretchX](https://jimmydaddy.github.io/react-native-image-marker/enums/TextBackgroundType.html#stretchX)

##### Sample


 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/shadow_bg_sx.png" width='150'>

##### Example


```typescript
import Marker, { Position, TextBackgroundType } from "react-native-image-marker"
···
const options = {
  // background image
  backgroundImage: {
    src: require('./images/test.jpg'),
    scale: 1,
  },
  watermarkTexts: [{
    text: 'text marker \n multline text',
    positionOptions: {
      position: Position.topLeft,
    },
    style: {
      color: '#FC0700',
      fontSize: 30,
      fontName: 'Arial',
      shadowStyle: {
        dx: 10,
        dy: 10,
        radius: 10,
        color: '#008F6D',
      },
      textBackgroundStyle: {
        padding: '10% 10%',
        type: TextBackgroundType.stretchX,
        color: '#0FFF00',
      },
    },
  }],
  scale: 1,
  quality: 100,
  filename: 'test',
  saveFormat: ImageFormat.png,
  maxSize: 1000,
};
Marker.markText(options);
```

#### Text background stretchY

##### API


[TextBackgroundType.stretchY](https://jimmydaddy.github.io/react-native-image-marker/enums/TextBackgroundType.html#stretchY)

##### Sample


 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/shadow_bg_sy.png" width='150'>

##### Example


```typescript
import Marker, { Position, TextBackgroundType } from "react-native-image-marker"
···
const options = {
  // background image
  backgroundImage: {
    src: require('./images/test.jpg'),
    scale: 1,
  },
  watermarkTexts: [{
    text: 'text marker \n multline text',
    positionOptions: {
      position: Position.topLeft,
    },
    style: {
      color: '#FC0700',
      fontSize: 30,
      fontName: 'Arial',
      shadowStyle: {
        dx: 10,
        dy: 10,
        radius: 10,
        color: '#008F6D',
      },
      textBackgroundStyle: {
        padding: '10% 10%',
        type: TextBackgroundType.stretchY,
        color: '#0FFF00',
      },
    },
  }],
  scale: 1,
  quality: 100,
  filename: 'test',
  saveFormat: ImageFormat.png,
  maxSize: 1000,
};
ImageMarker.markText(options);

```

#### Text background border radius

##### API


[TextBackgroundType.cornerRadius](https://jimmydaddy.github.io/react-native-image-marker/enums/TextBackgroundType.html#cornerRadius)

##### Sample


 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/textbgcornerradius.png" width='150'>

##### Example


```typescript
import Marker, { Position } from "react-native-image-marker"
···
const options = {
  // background image
  backgroundImage: {
    src: require('./images/test.jpg'),
    scale: 1,
  },
  watermarkTexts: [{
    text: 'text marker normal',
    positionOptions: {
      position: Position.center,
    },
    style: {
      color: '#FC0700',
      fontSize: 30,
      fontName: 'Arial',
      shadowStyle: {
        dx: 10,
        dy: 10,
        radius: 10,
        color: '#008F6D',
      },
      textBackgroundStyle: {
        padding: '10%',
        color: '#0fA',
        cornerRadius: {
          topLeft: {
            x: '20%',
            y: '50%',
          },
          topRight: {
            x: '20%',
            y: '50%',
          },
        },
      },
    },
  }],
  scale: 1,
  quality: 100,
  filename: 'test',
  saveFormat: ImageFormat.png,
  maxSize: 1000,
};
ImageMarker.markText(options);

```

#### Text with shadow

##### API


[ShadowLayerStyle](https://jimmydaddy.github.io/react-native-image-marker/interfaces/ShadowLayerStyle.html)

##### Sample


 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/shadow.png" width='150'>

##### Example



```typescript
import Marker, { Position, TextBackgroundType } from "react-native-image-marker"
···
const options = {
  // background image
  backgroundImage: {
    src: require('./images/test.jpg'),
    scale: 1,
  },
  watermarkTexts: [{
    text: 'text marker \n multline text',
    positionOptions: {
      position: Position.topLeft,
    },
    style: {
      color: '#F4F50A',
      fontSize: 30,
      fontName: 'Arial',
      shadowStyle: {
        dx: 10,
        dy: 10,
        radius: 10,
        color: '#6450B0',
      },
    },
  }],
  scale: 1,
  quality: 100,
  filename: 'test',
  saveFormat: ImageFormat.png,
  maxSize: 1000,
};
Marker.markText(options);

```

#### Multiple text watermarks

##### API


[markImage](https://jimmydaddy.github.io/react-native-image-marker/classes/Marker.html#markImage)

##### Sample


 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/multipletexts.png" width='150'>

##### Example



```typescript
import Marker, { Position, TextBackgroundType } from "react-native-image-marker"
···
Marker.markText({
  backgroundImage: {
    src: require('./images/test.jpg'),
    scale: 1,
  },
  waterMarkTexts: [{
    text: 'hello world \n 你好',
    positionOptions: {
      position: Position.topLeft,
    },
    style: {
      color: '#BB3B20',
      fontSize: 30,
      fontName: 'Arial',
      textBackgroundStyle: {
        padding: '10% 10%',
        color: '#0FFF00',
      },
    },
  }, {
    text: 'text marker normal',
    positionOptions: {
      position: Position.topRight,
    },
    style: {
      color: '#6450B0',
      fontSize: 30,
      fontName: 'Arial',
      textBackgroundStyle: {
        padding: '10% 10%',
        color: '#02FBBE',
      },
    },
  }],
})

```

#### Text rotation

##### Sample


<p>
 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/rotatetexts_1.png" width='150'>
 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/textswihoutbg.png" width='150'>
 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/rotatetexts.png" width='150'>
</p>

##### Example



```typescript
import Marker, { Position, TextBackgroundType } from "react-native-image-marker"
···
Marker.markText({
  backgroundImage: {
    src: require('./images/test.jpg'),
    scale: 1,
    rotate: 30,
  },
  waterMarkTexts: [{
    text: 'hello world \n 你好',
    positionOptions: {
      position: Position.topLeft,
    },
    style: {
      color: '#FFFF00',
      fontSize: 30,
      fontName: 'Arial',
      rotate: 30,
      textBackgroundStyle: {
        padding: '10% 10%',
        color: '#02B96B',
      },
      strikeThrough: true,
      underline: true,
    },
  }, {
    text: 'text marker normal',
    positionOptions: {
      position: Position.center,
    },
    style: {
      color: '#FFFF00',
      fontSize: 30,
      fontName: 'Arial',
      rotate: 30,
      textBackgroundStyle: {
        padding: '10% 10%',
        color: '#0FFF00',
      },
      strikeThrough: true,
      underline: true,
    },
  }],
})

```

#### Icon watermarks

##### Sample


 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/imagewatermark.png" width='150'>

##### Example



```typescript
import Marker, { Position, TextBackgroundType } from "react-native-image-marker"
···
Marker.markImage({
  backgroundImage: {
    src: require('./images/test.jpg'),
    scale: 1,
  },
  watermarkImages: [{
    src: require('./images/watermark.png'),
    position: {
      position: Position.topLeft,
    },
  }],
})

```


#### Multiple icon watermarks

> Note: ***require Android >= N, iOS >= iOS 13***

##### Sample



 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/multiple_icon_markers.png" width='150'>


##### Example



```typescript
import Marker, { Position, TextBackgroundType } from "react-native-image-marker"
···
Marker.markImage({
  backgroundImage: {
    src: require('./images/test.jpg'),
    scale: 1,
  },
  watermarkImages: [{
    src: require('./images/watermark.png'),
    position: {
      position: Position.topLeft,
    },
  }, {
    src: require('./images/watermark1.png'),
    position: {
      position: Position.topRight,
    },
  }, {
    src: require('./images/watermark2.png'),
    position: {
      position: Position.bottomCenter,
    },
  }],
})

```
#### Background rotation

##### Sample


<p>
 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/rotatebg.png" width='150'>
 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/rotateimageicon.png" width='150'>
</p>

##### Example


```typescript
import Marker, { Position, TextBackgroundType } from "react-native-image-marker"
···
Marker.markImage({
  backgroundImage: {
    src: require('./images/test.jpg'),
    scale: 1,
    rotate: 30,
  },
  watermarkImages: [{
    src: require('./images/watermark.png'),
    position: {
      position: Position.topLeft,
    },
  }],
});

Marker.markText({
  backgroundImage: {
    src: require('./images/test.jpg'),
    scale: 1,
    rotate: 30,
  },
  watermarkTexts: [{
    text: 'hello world \n 你好',
    positionOptions: {
      position: Position.topLeft,
    },
    style: {
      color: '#FFFF00',
      fontSize: 30,
      fontName: 'Arial',
      rotate: 30,
      textBackgroundStyle: {
        padding: '10% 10%',
        color: '#02B96B',
      },
      shadowStyle: {
        dx: 10,
        dy: 10,
        radius: 10,
        color: '#008F6D',
      },
      strikeThrough: true,
      underline: true,
    },
  }, {
    text: 'hello world \n 你好',
    positionOptions: {
      position: Position.center,
    },
    style: {
      color: '#FFFF00',
      fontSize: 30,
      fontName: 'Arial',
      textBackgroundStyle: {
        padding: '10% 10%',
        color: '#0FFF00',
      },
      strikeThrough: true,
      underline: true,
    },
  }],
})

```

#### Icon rotation

##### Sample


 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/rotateicon.png" width='150'>

##### Example



```typescript
import Marker, { Position, TextBackgroundType } from "react-native-image-marker"
···
Marker.markImage({
  backgroundImage: {
    src: require('./images/test.jpg'),
    scale: 1,
  },
  watermarkImages: [{
    src: require('./images/watermark.png'),
    position: {
      position: Position.topLeft,
    },
    rotate: 30,
  }],
});
```

#### Transparent background

##### Sample


 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/alphabgonly.png" width='150'>

##### Example



```typescript
import Marker, { Position, TextBackgroundType } from "react-native-image-marker"
···
Marker.markImage({
  backgroundImage: {
    src: require('./images/test.jpg'),
    scale: 1,
    alpha: 0.5,
  },
  watermarkImages: [{
    src: require('./images/watermark.png'),
    position: {
      position: Position.topLeft,
    },
  }],
});
```

#### Transparent icon

##### Sample


 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/alphicononly.png" width='150'>

##### Example



```typescript
import Marker, { Position, TextBackgroundType } from "react-native-image-marker"
···
Marker.markImage({
  backgroundImage: {
    src: require('./images/test.jpg'),
    scale: 1,
  },
  watermarkImages: [{
    src: require('./images/watermark.png'),
    position: {
      position: Position.topLeft,
    },
    alpha: 0.5,
  }],
});
```

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

git clone git@github.com:JimmyDaddy/react-native-image-marker.git

cd ./react-native-image-marker

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
