# react-native-image-marker ![npm version](https://badge.fury.io/js/react-native-image-marker.svg)

Marking text and icon on image

## sample

<figure>
    <img src="https://github.com/JimmyDaddy/react-native-image-marker/blob/master/asset/IOSMarker.gif" width='300'><img src="https://github.com/JimmyDaddy/react-native-image-marker/blob/master/asset/AndroidMarker.gif" width='300'>
</figure>


## Installation

* npm install react-native-image-marker --save
* react-native link

## Usage

```javascript

import ImageMarker from "react-native-image-marker"

···
// mark text on image
ImageMarker.addText(
    Platform.OS == 'android'? img.uri.replace('file://', '') : img.uri,
    text,
    X, // left
    Y, // top
    color,
    fontName,
    fontSize
).then((res) => {
    console.log("the path is"+res)
}).catch((err) => {
    console.log(err)
})

···

ImageMarker.addTextByPostion(
    Platform.OS == 'android'? img.uri.replace('file://', '') : img.uri,
    text,
    position, // topLeft, topCenter,topRight, bottomLeft, bottomCenter , bottomRight, center
    color,
    fontName,
    fontSize
).then((res) => {
    console.log("the path is"+res)
}).catch((err) => {
    console.log(err)
})

// mark icon on image

const iconUri = Platform.OS == 'android'? icon.uri.replace('file://', '') : icon.uri
const backGroundUri = Platform.OS == 'android'? img.uri.replace('file://', '') : img.uri

ImageMarker.markWithImage(
    backGroundUri, 
    iconUri, // icon uri
    X, // left
    Y, // top
    scale // scale of icon
).then((path) => {
    this.setState({
        uri: Platform.OS === 'android' ? 'file://' + path : path
    })
}).catch((err) => {
    console.log(err, 'err')
})

ImageMarker.markWithImageByPosition(
    backGroundUri, 
    iconUri,
    position, // topLeft, topCenter,topRight, bottomLeft, bottomCenter , bottomRight, center
    scale // scale of icon
).then((path) => {
    this.setState({
        uri: Platform.OS === 'android' ? 'file://' + path : path
    })
}).catch((err) => {
    console.log(err, 'err')
})

```

## Save image to file

* If you want to save the new image result to the phone camera roll, just use the [CameraRoll-module from react-native](https://facebook.github.io/react-native/docs/cameraroll.html#savetocameraroll).
* If you want to save it to an arbitrary file path, use something like [react-native-fs](https://github.com/itinance/react-native-fs).
* For any more advanced needs, you can write your own (or find another) native module that would solve your use-case.

## Contributors
[@filipef101](https://github.com/filipef101)
[@mikaello](https://github.com/mikaello)


## Example

[example](https://github.com/JimmyDaddy/react-native-image-marker/tree/master/example/example)


