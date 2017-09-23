# react-native-image-marker

Marking text and image icon on image

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
    X,
    Y,
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

// mark image icon on image

const iconUri = Platform.OS == 'android'? icon.uri.replace('file://', '') : icon.uri
const backGroundUri = Platform.OS == 'android'? img.uri.replace('file://', '') : img.uri

ImageMarker.markWithImage(
    backGroundUri, 
    iconUri, // icon uri
    X, 
    Y, 
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

## sample

![sample1](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/asset/sample1.png)

![sample2](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/asset/sample2.png)
