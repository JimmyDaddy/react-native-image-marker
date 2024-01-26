<div align="center">
    <a href="https://jimmydaddy.github.io/react-native-image-marker/" title="react native image marker">
        <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/icon.png" alt="react native image marker Logo" width="150" />
    </a>
    <a href="https://jimmydaddy.github.io/react-native-image-marker/"><h1 style="color: #424E6D">react native image marker</h1></a>
    <h6>Add text or icon watermarks to images</h6>
</div>
<div align="center">

  [![npm version](https://img.shields.io/npm/v/react-native-image-marker.svg?logo=npm&style=for-the-badge&label=latest)](https://www.npmjs.com/package/react-native-image-marker)
  [![npm](https://img.shields.io/npm/dm/react-native-image-marker?logo=npm&style=for-the-badge)](https://www.npmjs.com/package/react-native-image-marker) [![npm](https://img.shields.io/npm/dt/react-native-image-marker.svg?cacheSeconds=88660&logo=npm&label=total%20downloads&style=for-the-badge)](https://www.npmjs.com/package/react-native-image-marker)
  [![stars](https://img.shields.io/github/stars/jimmydaddy/react-native-image-marker?logo=github&style=for-the-badge)](https://github.com/JimmyDaddy/react-native-image-marker) [![forks](https://img.shields.io/github/forks/jimmydaddy/react-native-image-marker?logo=github&style=for-the-badge)](https://github.com/JimmyDaddy/react-native-image-marker/fork)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?logo=github&style=for-the-badge)](https://github.com/JimmyDaddy/react-native-image-marker/pulls) ![license](https://img.shields.io/npm/l/react-native-image-marker?style=for-the-badge)
  [![github](https://img.shields.io/badge/github-repo-blue?logo=github&style=for-the-badge)](https://github.com/JimmyDaddy/react-native-image-marker)
  [![CI](https://github.com/JimmyDaddy/react-native-image-marker/actions/workflows/ci.yml/badge.svg)](https://github.com/JimmyDaddy/react-native-image-marker/actions/workflows/ci.yml)
  ![platform-iOS](https://img.shields.io/badge/iOS-black?logo=Apple&style=for-the-badge) ![platform-Android](https://img.shields.io/badge/Android-black?logo=Android&style=for-the-badge)
  <br/>

</div>

---

> * If this library is useful to you, please give me a ⭐️. 🤩
> * If there is any bug, please submit an issue 🐛, or create a pull request 🤓.
> * If there is any problem about using this library, please contact me, or [open a QA discussion](https://github.com/JimmyDaddy/react-native-image-marker/discussions/categories/q-a). 🤔

---

<!-- toc -->
## Table of Contents

* [Features](#features)
* [Installation](#installation)
  * [React Native](#react-native)
  * [Expo](#expo)
* [Compatibility](#compatibility)

* <details>
  <summary><a href="#usage">Usage</a></summary>

    * [Text background fit](#text-background-fit)
    * [Text background stretchX](#text-background-stretchx)
    * [Text background stretchY](#text-background-stretchy)
    * [Text background border radius](#text-background-border-radius)
    * [Text with shadow](#text-with-shadow)
    * [Multiple text watermarks](#multiple-text-watermarks)
    * [Text rotation](#text-rotation)
    * [Icon watermarks](#icon-watermarks)
    * [Multiple icon watermarks](#multiple-icon-watermarks)
    * [Background rotation](#background-rotation)
    * [Icon rotation](#icon-rotation)
    * [Transparent background](#transparent-background)
    * [Transparent icon](#transparent-icon)

</details>

* [API](#api-6)
* [Save image to file](#save-image-to-file)
* [Contributors](#contributors)
* [Examples](#examples)
* [Contributing](#contributing)
* [License](#license)

<!-- tocstop -->

<br/>

## Features

<div>
  <img align="right" width="25%" src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/IOSMarker.gif" width='150'>
  <img align="right" width="25%" src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/AndroidMarker.gif" width='150'>
</div>

* [**Multiple text** watermarks](https://jimmydaddy.github.io/react-native-image-marker/interfaces/TextMarkOptions.html#watermarkTexts)
* [**Multiple icon** watermarks](https://jimmydaddy.github.io/react-native-image-marker/classes/Marker.html#markImage)
* [**Rotating** background and icon](https://jimmydaddy.github.io/react-native-image-marker/interfaces/ImageOptions.html#rotate)
* [Setting transparency for background and icon](https://jimmydaddy.github.io/react-native-image-marker/interfaces/ImageOptions.html#rotate)
* Base64
* Flexible text style settings, including:
  * [Rotating](https://jimmydaddy.github.io/react-native-image-marker/interfaces/TextStyle.html#rotate)
  * [Shadow](https://jimmydaddy.github.io/react-native-image-marker/interfaces/ShadowLayerStyle.html)
  * Background color
  * [Italic](https://jimmydaddy.github.io/react-native-image-marker/interfaces/TextStyle.html#italic)
  * [Bold](https://jimmydaddy.github.io/react-native-image-marker/interfaces/TextStyle.html#bold)
  * [Stroke](https://jimmydaddy.github.io/react-native-image-marker/interfaces/TextStyle.html#strikeThrough)
  * [Text align](https://jimmydaddy.github.io/react-native-image-marker/interfaces/TextStyle.html#textAlign)
  * [Padding](https://jimmydaddy.github.io/react-native-image-marker/interfaces/TextBackgroundStyle.html#padding)
  * Relative position
  * [Background border radius](https://jimmydaddy.github.io/react-native-image-marker/interfaces/TextBackgroundStyle.html#cornerRadius)
* Compatible with both Android and iOS
* Expo

## Installation

#### React Native

```shell
# npm
npm install react-native-image-marker --save

# yarn
yarn add react-native-image-marker
```

#### Expo

```shell
# install
npx expo install react-native-image-marker

# compile
npx expo prebuild

```

## Compatibility

| React Native Version | react-native-image-marker Version |
| ---------------------| --------------------------------- |
| < 0.60.0             | v0.5.2 or earlier                 |
| >= 0.60.0, ***iOS < 13, Android < N(API Level 24)*** | v1.0.x |
|  0.60.0  <= rn version < 0.73.0 | v1.1.x |
| >= 0.73.0, other cases | v1.2.0 or later |

> ***Note: This table is only applicable to major versions of react-native-image-marker. Patch versions should be backwards compatible.***

## Usage

### Text background fit

#### API

[TextBackgroundType.none](https://jimmydaddy.github.io/react-native-image-marker/enums/TextBackgroundType.html#none)

#### Sample

 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/shadow_bg_fit.jpeg" width='400'>

#### Example

<details>
<summary>example code</summary>

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
    text: 'text marker \n multiline text',
    position: {
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
};
Marker.markText(options);

```
</details>

### Text background stretchX

#### API

[TextBackgroundType.stretchX](https://jimmydaddy.github.io/react-native-image-marker/enums/TextBackgroundType.html#stretchX)

#### Sample

 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/shadow_bg_sx.jpeg" width='400'>

#### Example

<details>
<summary>example code</summary>

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
    text: 'text marker \n multiline text',
    position: {
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
};
Marker.markText(options);
```
</details>

### Text background stretchY

#### API

[TextBackgroundType.stretchY](https://jimmydaddy.github.io/react-native-image-marker/enums/TextBackgroundType.html#stretchY)

#### Sample

 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/shadow_bg_sy.jpeg" width='400'>

#### Example

<details>
<summary>example code</summary>

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
    text: 'text marker \n multiline text',
    position: {
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
};
ImageMarker.markText(options);

```

</details>

### Text background border radius

#### API

[TextBackgroundType.cornerRadius](https://jimmydaddy.github.io/react-native-image-marker/enums/TextBackgroundType.html#cornerRadius)

#### Sample

 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/textbgcornerradius.png" width='400'>

#### Example

<details>
<summary>example code</summary>

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
    position: {
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
};
ImageMarker.markText(options);

```

</details>

### Text with shadow

#### API

[ShadowLayerStyle](https://jimmydaddy.github.io/react-native-image-marker/interfaces/ShadowLayerStyle.html)

#### Sample

 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/shadow.jpeg" width='400'>

#### Example

<details>
<summary>example code</summary>

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
    text: 'text marker \n multiline text',
    position: {
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
};
Marker.markText(options);

```

</details>

### Multiple text watermarks

#### Sample

 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/multipletexts.png" width='400'>

#### Example

<details>
<summary>example code</summary>

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
    position: {
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
    position: {
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

</details>

### Text rotation

#### Sample

<p style="display: flex">
 <img style="flex: 1" src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/rotatetexts_1.png" width='250'>
 <img style="flex: 1; margin-left: 4px" src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/textswihoutbg.png" width='250'>
 <img style="flex: 1; margin-left: 4px" src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/rotatetexts.png" width='250'>
</p>

#### Example

<details>
<summary>example code</summary>

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
    position: {
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
    position: {
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

</details>

### Icon watermarks

#### Sample

 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/imagewatermark.png" width='400'>

#### Example

<details>
<summary>example code</summary>

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
</details>

### Multiple icon watermarks

> Note: ***require Android >= N, iOS >= iOS 13***

#### API

[markImage](https://jimmydaddy.github.io/react-native-image-marker/classes/Marker.html#markImage)

#### Sample

 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/multiple_icon_markers.png" width='400'>

#### Example

<details>
<summary>example code</summary>

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

</details>

### Background rotation

#### Sample

<p style="display:flex">
 <img style="flex: 1" src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/rotatebg.png" width='400'>
 <img style="flex: 1;margin-left: 8px" src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/rotateimageicon.png" style="" width='400'>
</p>

#### Example

<details>
<summary>example code</summary>

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
    position: {
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
    position: {
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

</details>

### Icon rotation

#### Sample

 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/rotateicon.png" width='400'>

#### Example

<details>
<summary>example code</summary>

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

</details>

### Transparent background

#### Sample

 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/alphabgonly.png" width='400'>

#### Example

<details>
<summary>example code</summary>

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

</details>

### Transparent icon

#### Sample

 <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/alphicononly.png" width='400'>

#### Example

<details>
<summary>example code</summary>

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

</details>

## API

* [the latest version](https://jimmydaddy.github.io/react-native-image-marker/classes/Marker.html)
* [v1.1.x](https://github.com/JimmyDaddy/react-native-image-marker/wiki/v1.1.x)
* [v1.0.x](https://github.com/JimmyDaddy/react-native-image-marker/wiki/v1.0.x)
* If you are using a version lower than 1.0.0, please go to [v0.9.2](https://github.com/JimmyDaddy/react-native-image-marker/wiki/0.9.2)

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
[@vioku](https://github.com/vioku)

## Examples

#### React Native

[example](https://github.com/JimmyDaddy/react-native-image-marker/tree/master/example)

If you want to run the example locally, you can do the following:

```bash

git clone git@github.com:JimmyDaddy/react-native-image-marker.git

cd ./react-native-image-marker

# install dependencies
yarn

# Android
# Open an android emulator or connect a real device at first
yarn example android

# iOS
yarn example ios

```

#### Expo

[expo-example](https://github.com/JimmyDaddy/react-native-image-marker/tree/master/expo-example)

If you want to run the example locally, you can do the following:

```bash

git clone git@github.com:JimmyDaddy/react-native-image-marker.git

cd ./react-native-image-marker

# Expo
# install dependencies
yarn

# Android
# Open an android emulator or connect a real device at first
yarn expo-example android

# iOS
yarn expo-example ios

```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

[MIT](LICENSE)

---

* If this library is useful to you, please give me a ⭐️. 🤩
* If there is any bug, please submit an issue 🐛, or create a pull request 🤓.
* If there is any problem about using this library, please contact me, or [open a QA discussion](https://github.com/JimmyDaddy/react-native-image-marker/discussions/categories/q-a). 🤔

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
