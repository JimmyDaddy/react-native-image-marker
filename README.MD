# react-native-image-marker
Marking text on image, 

## Installation
* npm install react-native-image-marker --save
* react-native link

## Usage

```
let ImageMarker = NativeModules.ImageMarker;

···

ImageMarker.addText(
    Platform.OS == 'android'? img.uri.replace('file://', '') : img.uri,
    text,
    X,
    Y,
    color,
    fontName,
    fontSize,
    (path)=>{
    //TODO
});

···

ImageMarker.addTextByPostion(
    Platform.OS == 'android'? img.uri.replace('file://', '') : img.uri,
    text,
    position,
    width,
    height,
    color,
    fontName,
    fontSize,
    (path)=>{
        //TODO
    });

```
