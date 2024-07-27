import {convertHexToArgb} from './Utils'
import { common2D,  } from '@kit.ArkGraphics2D';
import { RNNativeImageMarker } from '@rnoh/react-native-openharmony/generated/turboModules/RNNativeImageMarker'
export class ShadowLayerStyle {
  radius: number;
  dx: number;
  dy: number;
  color:common2D.Color ;

  constructor(shadow: RNNativeImageMarker.ShadowLayerStyle | null | undefined) {
    this.radius = 0;
    this.dx = 0;
    this.dy = 0;
    this.color ;
    if (shadow) {
      try {
        this.setColor(shadow.color);
        this.dx = shadow.dx;
        this.dy = shadow.dy;
        this.radius =shadow.radius;
      } catch (e) {
        throw new Error('Error parsing shadow style options ')
      }
    }
  }

  private setColor(color: string | undefined) {
    try {
      if (color) {
        // Assuming Utils.transRGBColor exists and performs the color transformation
        const parsedColor =convertHexToArgb(color);
        this.color = parsedColor;
      }
    } catch (e) {
      throw new Error('Error parsing color string ')
    }
  }
}