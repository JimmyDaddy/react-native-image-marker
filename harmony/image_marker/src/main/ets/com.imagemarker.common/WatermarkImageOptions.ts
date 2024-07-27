import { RNNativeImageMarker } from '@rnoh/react-native-openharmony/generated/turboModules/RNNativeImageMarker'
import { ImageOptions } from './ImageOptions'
import { PositionEnum } from './PositionEnum'
import { handleDynamicToString } from './Utils'

class WatermarkImageOptions {
  imageOption: ImageOptions;
  x: string | null;
  y: string | null;
  positionEnum: PositionEnum | null;

  static createWatermarkImageOptions(options: RNNativeImageMarker.WatermarkImageOptions | null) {
    let imageOption = new ImageOptions(options); // Initialize ImageOptions
    let x = null;
    let y = null;
    let positionOptions = null;
    if (options) {
      imageOption = new ImageOptions(options);
      positionOptions = options.position;
      x = positionOptions && positionOptions.X ? handleDynamicToString(positionOptions.X) : null;
      y = positionOptions && positionOptions.Y ? handleDynamicToString(positionOptions.Y) : null;
    }
    return new WatermarkImageOptions(imageOption, x, y, positionOptions)
  }

  constructor(watermarkImage: ImageOptions, x: string | null, y: string | null,
    position: RNNativeImageMarker.PositionOptions | null) {
    this.imageOption = watermarkImage;
    const positionOptions = position;
    this.x = x
    this.y = y
    this.positionEnum =
      positionOptions && positionOptions.position ? PositionEnum.getPosition(positionOptions.position) : null;
  }

}

export default WatermarkImageOptions;