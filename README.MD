# react-native-image-marker

Marking text on image

## Installation

* npm install react-native-image-marker --save
* react-native link

## Usage

```javascript

import ImageMarker from "react-native-image-marker"

···

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
    width,
    height,
    color,
    fontName,
    fontSize
).then((res) => {
    console.log("the path is"+res)
}).catch((err) => {
    console.log(err)
})

```

## sample

![sample1](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/asset/sample1.png)

![sample2](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/asset/sample2.png)
