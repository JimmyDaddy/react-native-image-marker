# react-native-image-marker

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

## example

[example](https://github.com/JimmyDaddy/react-native-image-marker/tree/master/example/example)


