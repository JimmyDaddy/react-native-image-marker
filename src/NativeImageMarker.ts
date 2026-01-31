import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  markWithText(options: Object): Promise<string>;
  markWithImage(options: Object): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('ImageMarker');
