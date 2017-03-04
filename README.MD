# react-native-image-marker
Marking text on image

## Installation
* npm install react-native-image-marker --save
* react-native link

## Usage

```
let ImageMarker = NativeModules.ImageMarker;

···

ImageMarker.addText(img.uri, text, waterMarker.rect, waterMarker.color, waterMarker.fontName, waterMarker.fontSize, (b ,path)=>{
    //TODO
});

···

ImageMarker.addTextByPostion(img.uri, text, waterMarker.position, waterMarker.size, waterMarker.color, waterMarker.fontName, waterMarker.fontSize, (b ,path)=>{
    //TODO
});

```
