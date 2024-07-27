import { RNPackage, TurboModulesFactory } from '@rnoh/react-native-openharmony/ts';
import type { TurboModule, TurboModuleContext } from '@rnoh/react-native-openharmony/ts';
import { TM } from '@rnoh/react-native-openharmony/generated/ts'
import { RNImageMarkerTurboModule } from './RNImageMarkerTurboModule';

class RNImageMarkerTurboModuleFactory extends TurboModulesFactory {
  createTurboModule(name: string): TurboModule | null {
    globalThis.uiAbilityContext = this.ctx.uiAbilityContext
    if (this.hasTurboModule(name)) {
      return new RNImageMarkerTurboModule(this.ctx);
    }
    return null;
  }

  hasTurboModule(name: string): boolean {
    return name === TM.RNNativeImageMarker.NAME;
  }

}

export class RNImageMarkerPackage extends RNPackage {
  createTurboModulesFactory(ctx: TurboModuleContext): TurboModulesFactory {
    return new RNImageMarkerTurboModuleFactory(ctx);
  }
}