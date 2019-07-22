# react-native-image-marker ![npm version](https://badge.fury.io/js/react-native-image-marker.svg) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/JimmyDaddy/react-native-image-marker/pulls)

Add text or icon watermark to your images

## sample

<figure>
  <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/asset/IOSMarker.gif" width='300'>
  <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/asset/AndroidMarker.gif" width='300'>
</figure>

<figure>
  <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/asset/shadow_bg_fit.png" width='300'>
  <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/asset/shadow_bg_sx.png" width='300'>
  <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/asset/shadow.png" width='300'>
  <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/asset/shadow_bg_sy.png" width='300'>
</figure>

## Installation

* npm install react-native-image-marker --save
* react-native link

### iOS Pod Install

You can use `pod` instead of `link`. Add following lines in your `Podfile`:

```shell
pod 'RNImageMarker', :path => '../node_modules/react-native-image-marker'
```

## API 

|name|parameter|return|decription|
|--|--|--|--|
|`markText`|`TextMarkOption`|`Promise<String>`|mark image with text|
|`markImage`|`ImageMarkOption`|`Promise<String>`| mark image with icon|

* `TextMarkOption`

|name|description|
|--|--|
|`src`|image url |
|`text`|the text you want to mark with|
|`position`| text position(`topLeft`,`topRight`,`topCenter`, `center`, `bottomLeft`, `bottomCenter`, `bottomRight`)|
|`X`|distance from the left, **if you have set `position` yet you don't need to set this property again**|
|`Y`|distance from the top, **if you have set `position` you don't need to set this property again**|
|`color`| text color |
|`fontName`| fontName |
|`fontSize`| fontSize |
|`shadowStyle`| text's shadow style: iOS's `NSShadowAttributeName`, Android's `textPaint.shadowLayerStyle` |
|`scale`| scale image |
|`quality`| image qulaity |
|`filename` | set filename for the result |
|`saveFormat`| `png` or `jpg` |
|`textBackgroundStyle` | text background style |

* `ImageMarkOption`

|name|description|
|--|--|
|`src`|image url |
|`markerSrc`|the icon you want to mark with |
|`position`| text position(`topLeft`,`topRight`,`topCenter`, `center`, `bottomLeft`, `bottomCenter`, `bottomRight`)|
|`X`|distance from the left, **if you have set `position` yet you don't need to set this property again**|
|`Y`|distance from the top, **if you have set `position` you don't need to set this property again**|
|`markerScale`| scale icon |
|`scale`| scale image |
|`quality`| image qulaity |
|`filename` | set filename for the result |
|`saveFormat`| `png` or `jpg`, default is `jpg` |

* `ShadowStyle`

|name|description|
|--|--|
|`radius`| blur radius |
|`dx`| x offset|
|`dy`| y offset|
|`color`| shadow color |

* `textBackgroundStyle`

> thanks [@onka13](https://github.com/onka13) for [#38](https://github.com/JimmyDaddy/react-native-image-marker/pull/38)

|name|description|
|--|--|
|`paddingX`| padding X |
|`paddingY`| padding y|
|`type`| default is fit the text, `stretchX` stretch to fill width, `stretchY` stretch to fill height |
|`color`| bg color |

## Usage

```javascript

import ImageMarker from "react-native-image-marker"

···
// add text watermark to a photo

 this.setState({
    loading: true
 })
 Marker.markText({
    src: img.uri,
    text: 'text marker', 
    X: 30,
    Y: 30, 
    color: '#FF0000',
    fontName: 'Arial-BoldItalicMT',
    fontSize: 44,
    shadowStyle: {
        dx: 10.5,
        dy: 20.8,
        radius: 20.9,
        color: '#ff00ff'
    },
    textBackgroundStyle: {
        type: 'stretchX',
        paddingX: 10,
        paddingY: 10,
        color: '#0f0'
    },
    scale: 1, 
    quality: 100
 }).then((res) => {
     this.setState({
        loading: false,
        markResult: res
     })
    console.log("the path is"+res)
 }).catch((err) => {
    console.log(err)
    this.setState({
        loading: false,
        err
    })
 })

···
this.setState({
    loading: true
})
Marker.markText({
    src: img.uri,
    text: 'text marker', 
    position: 'topLeft', 
    color: '#FF0000',
    fontName: 'Arial-BoldItalicMT', 
    fontSize: 44, 
    scale: 1, 
    quality: 100
}).then((res) => {
    console.log("the path is"+res)
    this.setState({
        loading: false,
        markResult: res
    })
}).catch((err) => {
    console.log(err)
    this.setState({
        loading: false,
        err
    })
})

// add icon watermark to a photo

const iconUri = icon.uri
const backGroundUri = img.uri
this.setState({
    loading: true
})

Marker.markImage({
    src: backGroundUri, 
    markerSrc: iconUri, // icon uri
    X: 100, // left
    Y: 150, // top
    scale: 1, // scale of bg
    markerScale: 0.5, // scale of icon
    quality: 100, // quality of image
    saveFormat: 'png', 
}).then((path) => {
    this.setState({
        uri: Platform.OS === 'android' ? 'file://' + path : path,
        loading: false
    })
}).catch((err) => {
    console.log(err, 'err')
    this.setState({
        loading: false,
        err
    })
})

Marker.markImage({
    src: backGroundUri, 
    markerSrc: iconUri, 
    position: 'topLeft',  // topLeft, topCenter,topRight, bottomLeft, bottomCenter , bottomRight, center
    scale: 1, 
    markerScale: 0.5, 
    quality: 100
}).then((path) => {
    this.setState({
        uri: Platform.OS === 'android' ? 'file://' + path : path,
        loading: false
    })
}).catch((err) => {
    console.log(err, 'err')
     this.setState({
        loading: false,
        err
    })
})

// you can also add watermark to a photo with static images
Marker.markImage({
    src: backGroundUri, 
    markerSrc: require('./icon.png'), 
    position: 'topLeft',  // topLeft, topCenter,topRight, bottomLeft, bottomCenter , bottomRight, center
    scale: 1, 
    markerScale: 0.5, 
    quality: 100
}).then((path) => {
    this.setState({
        uri: Platform.OS === 'android' ? 'file://' + path : path,
        loading: false
    })
}).catch((err) => {
    console.log(err, 'err')
     this.setState({
        loading: false,
        err
    })
})
// or base64
Marker.markImage({
    src: { uri: `data:img/jpg;base64,/9j/4qqqAQSkZJRgABAQEBLAEsAAD/2wBDAAIBAQEBAQIBAQECAgICAgQDAgICAgUEBAMEBgUGBgYFBgYGBwkIBgcJBwYGCAsICQoKCgoKBggLDAsKDAkKCgr/2wBDAQICAgICAgUDAwUKBwYHCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgr/wAARCAHnAooDASIA
AhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgddddcI` }, 
    markerSrc: { uri: `data:img/jpg;base64,/9j/4AAQSkZJRgABAQEBLAEsAAD/2wBDAAIBAQEBAQIBAQECAgICAgQDAgICAgUEBAMEBgUGBgYFBgYGBwkIBgcJBwYGCAsICQoKCgoKBggLDAsKDAkKCgr/2wBDAQICAgICAgUDAwUKBwYHCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgr/wAARCAHnAooDASIA
AhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcI` }, 
    position: 'topLeft',  // topLeft, topCenter,topRight, bottomLeft, bottomCenter , bottomRight, center
    scale: 1, 
    markerScale: 0.5, 
    quality: 100
}).then((path) => {
    this.setState({
        uri: Platform.OS === 'android' ? 'file://' + path : path,
        loading: false
    })
}).catch((err) => {
    console.log(err, 'err')
     this.setState({
        loading: false,
        err
    })
})

```

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

[example](https://github.com/JimmyDaddy/react-native-image-marker/tree/master/example/markerExample)
