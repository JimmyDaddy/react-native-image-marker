export declare enum Position {
    topLeft = "topLeft",
    topCenter = "topCenter",
    topRight = "topRight",
    bottomLeft = "bottomLeft",
    bottomCenter = "bottomCenter",
    bottomRight = "bottomRight",
    center = "center"
}
export declare enum TextBackgroundType {
    stretchX = "stretchX",
    stretchY = "stretchY"
}
export declare enum ImageFormat {
    png = "png",
    jpg = "jpg",
    base64 = "base64"
}
export declare type ShadowLayerStyle = {
    'dx': number;
    'dy': number;
    'radius': number;
    'color': string;
};
export declare type TextBackgroundStyle = {
    'paddingX': number;
    'paddingY': number;
    'type': TextBackgroundType;
    'color': string;
};
export declare type TextMarkOption = {
    // FIXME: ImageSourcePropType type define bug
    src: any;
    text: string;
    X?: number;
    Y?: number;
    color: string;
    fontName: string;
    fontSize: number;
    scale: number;
    quality: number;
    position?: Position;
    filename?: string;
    shadowStyle: ShadowLayerStyle;
    textBackgroundStyle: TextBackgroundStyle;
    saveFormat?: ImageFormat;
    maxSize?: number;
};
export declare type ImageMarkOption = {
    // FIXME: ImageSourcePropType type define bug
    src: any;
    markerSrc: any;
    X?: number;
    Y?: number;
    markerScale: number;
    scale: number;
    quality: number;
    position?: Position;
    filename?: string;
    saveFormat?: ImageFormat;
    maxSize?: number;
};
export default class Marker {
    static markText(option: TextMarkOption): Promise<string>;
    static markImage(option: ImageMarkOption): Promise<string>;
}
