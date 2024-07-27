import { RNImageSRC } from './RNImageSRC'
import { ErrorCode } from './ErrorCode'
import { MarkerError } from './MarkerError'
import { DefaultConstants } from './DefaultConstants'
import { RNNativeImageMarker } from '@rnoh/react-native-openharmony/generated/turboModules/RNNativeImageMarker'

export class ImageOptions{
  src: RNImageSRC;
  uri?: string;
  scale: number;
  rotate: number;
  alpha: number;

  constructor(options: RNNativeImageMarker.ImageOptions) {
    if (!options.src) {
      throw new MarkerError(ErrorCode.PARAMS_REQUIRED, "image is required");
    }
    let srcMap = this.getImageUri(options.src)
    this.src = new RNImageSRC(srcMap);
    this.uri = srcMap.get(ImageOptions.PROP_ICON_URI);
    this.scale = options.scale ? options.scale : DefaultConstants.DEFAULT_SCALE;
    this.rotate = options.rotate ? options.rotate : DefaultConstants.DEFAULT_ROTATE;
    this.alpha = options.alpha ? options.alpha  : DefaultConstants.DEFAULT_ALPHA;
  }

  static readonly PROP_ICON_URI: string = "uri";

  getImageUri(src: string): Map<string, any> {
    let srcObj = JSON.parse(JSON.stringify(src)) as RNImageSRC;
    let uri = srcObj.uri
    let realUrl = uri.substring(uri.indexOf("//") + 2);
    let url = "assets/" + realUrl;
    let map = new Map<string, any>();
    map.set('uri', url)
    map.set('height', srcObj.height)
    map.set('width', srcObj.width)
    map.set('scale', srcObj.scale)
    return map;
  }
}


