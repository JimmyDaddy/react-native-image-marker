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

## props

| name | type | value | description |
| --- | --- | --- | --- |
| position | string | 'topLeft', 'topCenter','topRight','bottomLeft','bottomCenter','bottomRight','center'| text postion enum on image |
| X | number | any number | x |
| Y | number | any number | y |
| text | string | any string | the text you want to mark on |
| color | hexColor | any color | text color |
| fontName | string | any fontFamily name |  |
| fontSize | number | any number | the text font size |
| width | number | any number | text width |
| height | number | any number | text height |
