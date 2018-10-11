# react-native-image-marker ![npm version](https://badge.fury.io/js/react-native-image-marker.svg)

Add watermark to the image with text and icon

## sample

<figure>
    <img src="https://github.com/JimmyDaddy/react-native-image-marker/blob/master/asset/IOSMarker.gif" width='300'><img src="https://github.com/JimmyDaddy/react-native-image-marker/blob/master/asset/AndroidMarker.gif" width='300'>
</figure>


## Installation

* npm install react-native-image-marker --save
* react-native link

## API 

|name|parameter|return|decription|
|--|--|--|--|
|`markText`|`TextMarkOption`|`Promise<String>`|mark image with text|
|`markImage`|`ImageMarkOption`|`Promise<String>`| mark image with icon|

* `TextMarkOption`

|name|description|
|--|--|
|`src`|image url **(Android only support local image)**|
|`text`|the text you want to mark with|
|`position`| text position(`topLeft`,`topRight`,`topCenter`, `center`, `bottomLeft`, `bottomCenter`, `bottomRight`)|
|`X`|distance to the left, **if you set `position` you don't need to set this property**|
|`Y`|distance to the top,**if you set `position` you don't need to set this property**|
|`color`| text color |
|`fontName`| fontName |
|`fontSize`| fontSize |
|`scale`| scale image |
|`quality`| image qulaity |

* `ImageMarkOption`

|name|description|
|--|--|
|`src`|image url **(Android only support local image)**|
|`markerSrc`|the icon you want to mark with  **(Android only support local image)** |
|`position`| text position(`topLeft`,`topRight`,`topCenter`, `center`, `bottomLeft`, `bottomCenter`, `bottomRight`)|
|`X`|distance to the left, **if you set `position` you don't need to set this property**|
|`Y`|distance to the top, **if you set `position` you don't need to set this property**|
|`markerScale`| scale icon |
|`scale`| scale image |
|`quality`| image qulaity |

## Usage

```javascript

import ImageMarker from "react-native-image-marker"

···
// mark text on image

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

// mark icon on image

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
    quality: 100 // quality of image
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

// you can also use the bundled images for marking
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

```

## Save image to file

* If you want to save the new image result to the phone camera roll, just use the [CameraRoll-module from react-native](https://facebook.github.io/react-native/docs/cameraroll.html#savetocameraroll).
* If you want to save it to an arbitrary file path, use something like [react-native-fs](https://github.com/itinance/react-native-fs).
* For any more advanced needs, you can write your own (or find another) native module that would solve your use-case.

## Contributors
[@filipef101](https://github.com/filipef101)
[@mikaello](https://github.com/mikaello)
[@Peretz30](https://github.com/Peretz30)


## Example

[example](https://github.com/JimmyDaddy/react-native-image-marker/tree/master/example/example)


