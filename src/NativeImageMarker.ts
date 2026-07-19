import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Keep the native schema dynamic because the public API accepts mixed
  // number/string coordinate values that RN 0.73 codegen cannot model in
  // nested structs on iOS.
  markWithText(options: Object): Promise<string>;
  markWithImage(options: Object): Promise<string>;
  markWithWatermarks(options: Object): Promise<string>;
  embedInvisible(options: Object): Promise<string>;
  // JSON keeps the return shape compatible with RN 0.73 codegen.
  detectInvisible(options: Object): Promise<string>;
}

export default TurboModuleRegistry.get<Spec>('ImageMarker');
