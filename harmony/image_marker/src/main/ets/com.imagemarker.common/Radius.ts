import { RNNativeImageMarker } from '@rnoh/react-native-openharmony/generated/turboModules/RNNativeImageMarker'
import { handleDynamicToString } from './Utils'

export class Radius {
  x: string;
  y: string;

  constructor(options: RNNativeImageMarker.RadiusValue | null | undefined) {
    this.x = options?.x ? handleDynamicToString(options?.x) : '0';
    this.y = options?.y ? handleDynamicToString(options?.y) : '0';
  }
}