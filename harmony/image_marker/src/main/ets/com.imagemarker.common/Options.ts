import { ImageOptions } from './ImageOptions';
import { MarkerError } from './MarkerError';
import { ErrorCode } from './ErrorCode';
import { DefaultConstants } from './DefaultConstants';
import { RNNativeImageMarker } from '@rnoh/react-native-openharmony/generated/turboModules/RNNativeImageMarker'
import { getFormat, SaveFormat } from './Utils'

export class Options {
  options: RNNativeImageMarker.TextMarkOptions | RNNativeImageMarker.ImageMarkOptions;
  backgroundImage: ImageOptions;
  quality: number;
  filename?: string;
  saveFormat: SaveFormat;
  maxSize: number;
  scale?: number;
  constructor(options) {
    this.options = options;
    this.backgroundImage = this.options['backgroundImage']
      ? new ImageOptions(this.options['backgroundImage'])
      : (() => {
      throw new MarkerError(ErrorCode.PARAMS_REQUIRED, 'backgroundImage is required');
    })();

    this.quality = this.options['quality'] !== undefined ? this.options['quality'] : DefaultConstants.DEFAULT_QUALITY;
    this.maxSize = this.options['maxSize'] !== undefined ? this.options['maxSize'] : DefaultConstants.DEFAULT_MAX_SIZE;
    this.filename = this.options['filename'] || undefined;
    this.saveFormat = getFormat(this.options['saveFormat']);
    this.scale = this.options['scale']!== undefined ? this.options['quality'] : DefaultConstants.DEFAULT_SCALE;
  }

  static PROP_ICON_URI: string = "uri";

  static checkParams(opts: RNNativeImageMarker.TextMarkOptions | RNNativeImageMarker.ImageMarkOptions,
    reject: (arg0: string, arg1: string, arg2: Error | null) => void): Options | null {
    try {
      return new Options(opts);
    } catch (e) {
      if (e instanceof MarkerError) {
        reject(e.getErrorCode().toString(), e.getErrMsg(),e);
      }
      return null;
    }
  }
}