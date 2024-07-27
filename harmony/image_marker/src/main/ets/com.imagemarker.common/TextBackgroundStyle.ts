import { convertHexToArgb } from './Utils'
import { common2D } from '@kit.ArkGraphics2D';
import { RNNativeImageMarker } from '@rnoh/react-native-openharmony/generated/turboModules/RNNativeImageMarker'
import { CornerRadius } from './CornerRadius'
import { Padding } from './Padding';

export class TextBackgroundStyle extends Padding{
  type: string | null = null;
  color: common2D.Color
  cornerRadius: CornerRadius | null = null;

  constructor(readableMap: RNNativeImageMarker.TextBackgroundStyle | null | undefined) {
    super(readableMap);
    if (readableMap) {
      try {
        this.type = readableMap.type || null;
        this.setColor(readableMap.color);
        this.InitCornerRadius(readableMap);
      } catch (e) {
        throw new Error("Unknown text background options");
      }
    }
  }

  private InitCornerRadius(readableMap: RNNativeImageMarker.TextBackgroundStyle) {
    if (readableMap.cornerRadius) {
      const cornerRadiusMap = readableMap.cornerRadius;
      if (cornerRadiusMap) {
        this.cornerRadius = new CornerRadius(cornerRadiusMap);
      }
    }
  }

  private setColor(color: string | undefined | null) {
    try {
      if (color) {
        // Assuming Utils.transRGBColor exists and performs the color transformation
        const parsedColor = convertHexToArgb(color);
        this.color = parsedColor;
      }
    } catch (e) {
      throw new Error('Unknown color string ')
    }
  }
}