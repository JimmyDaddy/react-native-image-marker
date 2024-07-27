import { RNOHLogger, TurboModule, TurboModuleContext } from '@rnoh/react-native-openharmony/ts';
import { TM } from '@rnoh/react-native-openharmony/generated/ts';
import { RNNativeImageMarker } from '@rnoh/react-native-openharmony/generated/turboModules/RNNativeImageMarker'
import window from '@ohos.window';
import resourceManager from '@ohos.resourceManager';
import { Context } from '@ohos.abilityAccessCtrl';
import { photoAccessHelper } from '@kit.MediaLibraryKit';
import { drawing } from '@kit.ArkGraphics2D';
import { image } from '@kit.ImageKit';
import fs from '@ohos.file.fs';
import abilityAccessCtrl, { Permissions } from '@ohos.abilityAccessCtrl';
import { BusinessError } from '@ohos.base';
import common from '@ohos.app.ability.common';
import { DefaultConstants } from "./com.imagemarker.common/DefaultConstants"
import { MarkImageOptions } from './com.imagemarker.common/MarkImageOptions'
import { TextOptions } from './com.imagemarker.common/TextOptions'
import { getPixelMap, getResource } from './com.imagemarker.common/Utils'
import { ImageOptions } from './com.imagemarker.common/ImageOptions';
import { util } from '@kit.ArkTS';


const TAG = 'ImageMarker';
let fd: number | null = null
const permissions: Array<Permissions> = ['ohos.permission.WRITE_IMAGEVIDEO'];

export class RNImageMarkerTurboModule extends TurboModule implements TM.RNNativeImageMarker.Spec {
  windowClass: window.Window | undefined = undefined;
  isKeepScreenOn: boolean = true;
  unisKeepScreenOn: boolean = false;
  private context: Context; // ApplicationContext
  private resourceManager: resourceManager.ResourceManager;
  public logger: RNOHLogger;
  imageWidth: number = 0
  imageHeight: number = 0

  constructor(ctx: TurboModuleContext) {
    super(ctx)
    this.context = this.ctx.uiAbilityContext;
    this.reqPermissionsFromUser(permissions, this.ctx.uiAbilityContext)
    this.resourceManager = this.context.resourceManager;
    this.logger = this.ctx.logger.clone(TAG)
  }

  async markWithText(options: RNNativeImageMarker.TextMarkOptions): Promise<string> {
    this.logger.info(TAG, "markWithText params: ", JSON.stringify(options))
    try {
      let backgroundImage = new ImageOptions(options.backgroundImage)
      this.imageWidth = backgroundImage.src.width * backgroundImage.scale
      this.imageHeight = backgroundImage.src.height * backgroundImage.scale
      let backgroundImageResource = await getResource(backgroundImage.src.uri, this.resourceManager);
      let backgroundPixelMap = await getPixelMap(backgroundImageResource, backgroundImage, true)
      let canvas = new drawing.Canvas(backgroundPixelMap);
      let watermarkTexts = options.watermarkTexts;
      if(options.scale&&options.scale!=0){
        canvas.scale(options.scale,options.scale)
      }
      canvas.save()
      for (let index = 0; index < watermarkTexts.length; index++) {
        let watermarkText = watermarkTexts[index]
        let textOptions = new TextOptions(watermarkText, this.imageWidth, this.imageHeight)
        let positionEnum = watermarkText.positionOptions?.position
        if (!positionEnum) {
          positionEnum = watermarkText.position?.position
        }
        textOptions.applyStyle(canvas, DefaultConstants.DEFAULT_MARGIN, positionEnum, textOptions.getX(),
          textOptions.getY(), textOptions.getStyle(), this.imageWidth, this.imageHeight)
      }
      if (backgroundImage.rotate != 0) {
        await backgroundPixelMap.rotate(backgroundImage.rotate)
      }
      let url = await this.saveImage(backgroundPixelMap, options.filename, options.saveFormat, options.quality);
      return new Promise((resolve, reject) => {
        resolve(url);
      })
    } catch (e) {
      this.logger.error(TAG + "_error", e.message, e.stack)
      return new Promise((resolve, reject) => {
        reject('result AAA');
      })
    } finally {
      if (fd) {
        fs.closeSync(fd);
      }
    }
  }

  async markWithImage(options: RNNativeImageMarker.ImageMarkOptions): Promise<string> {
    this.logger.info(TAG, "markWithImage params: ", JSON.stringify(options))
    try {
      // 绘制背景
      let watermarkImageOptions = new MarkImageOptions(options);
      this.imageWidth =
        watermarkImageOptions.backgroundImage.src.width * watermarkImageOptions.backgroundImage.scale
      this.imageHeight =
        watermarkImageOptions.backgroundImage.src.height * watermarkImageOptions.backgroundImage.scale
      let backgroundImageResource =
        await getResource(watermarkImageOptions.backgroundImage.src.uri, this.resourceManager);
      let backgroundPixelMap =
        await getPixelMap(backgroundImageResource, watermarkImageOptions.backgroundImage, true)
      const canvas = new drawing.Canvas(backgroundPixelMap);
      canvas.save()
      await watermarkImageOptions.applyStyle(canvas, this.resourceManager, this.imageWidth,
        this.imageHeight,)
      if (watermarkImageOptions.backgroundImage.rotate != 0) {
        await backgroundPixelMap.rotate(watermarkImageOptions.backgroundImage.rotate)
      }
      let uri = await this.saveImage(backgroundPixelMap, options.filename, options.saveFormat, options.quality);
      return new Promise((resolve, reject) => {
        resolve(uri);
      })
    } catch (err) {
      this.logger.error(TAG + "_error", err.message, err.stack)
      return new Promise((resolve, reject) => {
        reject(err);
      })
    } finally {
      if (fd) {
        fs.closeSync(fd);
      }
    }

  }

  private async saveImage(backgroundPixelMap: image.PixelMap, filename: string, format: RNNativeImageMarker.ImageFormat,
    quality: number) {
    const imagePacker = image.createImagePacker();
    let opts = {
      format: 'image/jpeg',
      quality: !!quality ? quality : 100
    }
    if (format == 'png') {
      opts = {
        format: 'image/png',
        quality: !!quality ? quality : 100
      }
    }
    if (format === RNNativeImageMarker.ImageFormat.base64) {
      let buffer = await imagePacker.packing(backgroundPixelMap, opts)
      let bufferArr = new Uint8Array(buffer)
      let help = new util.Base64Helper
      var base = await help.encodeToString(bufferArr)
      return 'data:image/jpeg;base64,'+base
    } else {
      const imageBuffer = await imagePacker.packing(backgroundPixelMap, opts);
      let phAccessHelper = photoAccessHelper.getPhotoAccessHelper(this.context);
      let uri =
        await phAccessHelper.createAsset(photoAccessHelper.PhotoType.IMAGE, (!!format ? format : "png"),
          { title: filename });
      const mode = fs.OpenMode.READ_WRITE | fs.OpenMode.CREATE;
      fd = (await fs.open(uri, mode)).fd;
      await fs.truncate(fd);
      await fs.write(fd, imageBuffer);
      return uri;
    }
  }

  reqPermissionsFromUser(permissions: Array<Permissions>, context: common.UIAbilityContext): void {
    let atManager: abilityAccessCtrl.AtManager = abilityAccessCtrl.createAtManager();
    atManager.requestPermissionsFromUser(context, permissions).then((data) => {
      let grantStatus: Array<number> = data.authResults;
      let length: number = grantStatus.length;
      for (let i = 0; i < length; i++) {
        if (grantStatus[i] === 0) {
        } else {
          return;
        }
      }
    }).catch((err: BusinessError) => {
      this.logger.error(`Failed to request permissions from user. Code is ${err.code}, message is ${err.message}`);
    })
  }
}

