import { Radius } from './Radius'
import { RNNativeImageMarker } from '@rnoh/react-native-openharmony/generated/turboModules/RNNativeImageMarker'
import { parseSpreadValue, PathPotions } from './Utils'
import { common2D } from '@kit.ArkGraphics2D';

export class CornerRadius {
  private topLeft: Radius | undefined = undefined;
  private topRight: Radius | undefined = undefined;
  private bottomLeft: Radius | undefined = undefined;
  private bottomRight: Radius | undefined = undefined;
  private all: Radius | undefined = undefined;

  constructor(opts: RNNativeImageMarker.CornerRadius | undefined | null) {
    if (opts) {
      for (const [key, value] of Object.entries(opts)) {
        const cornerRadius = value;
        this.setCornerRadius(key, cornerRadius);
      }
    }
  }

  private setCornerRadius(key: string, cornerRadius: RNNativeImageMarker.RadiusValue) {
    switch (key) {
      case 'topLeft':
        if (cornerRadius) {
          this.topLeft = new Radius(cornerRadius);
        }
        break;

      case 'topRight':
        if (cornerRadius) {
          this.topRight = new Radius(cornerRadius);
        }
        break;

      case 'bottomLeft':
        if (cornerRadius) {
          this.bottomLeft = new Radius(cornerRadius);
        }
        break;

      case 'bottomRight':
        if (cornerRadius) {
          this.bottomRight = new Radius(cornerRadius);
        }
        break;

      default:
        if (cornerRadius) {
          this.all = new Radius(cornerRadius);
        }
        break;
    }
  }

  radii(rect: common2D.Rect): PathPotions[] {
    let mxRadius: number = 0;
    let myRadius: number = 0;
    let width = rect.right - rect.left
    let height = rect.bottom - rect.top
    let topLeftPath
    let topRightPath
    let bottomLeftPath
    let bottomRightPath
    if (this.all !== null && this.all !== undefined) {
      mxRadius = parseSpreadValue(this.all.x.toString(), width);
      myRadius = parseSpreadValue(this.all.y.toString(), height);
      topLeftPath = this.getRadiusPath(mxRadius, myRadius, rect, "topLeft")
      topRightPath = this.getRadiusPath(mxRadius, myRadius, rect, "topRight")
      bottomLeftPath = this.getRadiusPath(mxRadius, myRadius, rect, "bottomLeft")
      bottomRightPath = this.getRadiusPath(mxRadius, myRadius, rect, "bottomRight")
    }
    const radii: PathPotions[] = [
      topLeftPath, // topLeft
      topRightPath, // topRight
      bottomRightPath, // bottomRight
      bottomLeftPath,// bottomLeft
    ];
    if (this.topLeft !== null && this.topLeft !== undefined) {
      mxRadius = parseSpreadValue(this.topLeft.x.toString(), width);
      myRadius = parseSpreadValue(this.topLeft.y.toString(), height);
      topLeftPath = this.getRadiusPath(mxRadius, myRadius, rect, "topLeft")
      radii[0] = topLeftPath
    }

    if (this.topRight !== null && this.topRight !== undefined) {
      mxRadius = parseSpreadValue(this.topRight.x.toString(), width);
      myRadius = parseSpreadValue(this.topRight.y.toString(), height);
      topRightPath = this.getRadiusPath(mxRadius, myRadius, rect, "topRight")
      radii[1] = topRightPath
    }

    if (this.bottomRight !== null && this.bottomRight !== undefined) {
      mxRadius = parseSpreadValue(this.bottomRight.x.toString(), width);
      myRadius = parseSpreadValue(this.bottomRight.y.toString(), height);
      bottomRightPath = this.getRadiusPath(mxRadius, myRadius, rect, "bottomRight")
      radii[2] = bottomRightPath
    }

    if (this.bottomLeft !== null && this.bottomLeft !== undefined) {
      mxRadius = parseSpreadValue(this.bottomLeft.x.toString(), width);
      myRadius = parseSpreadValue(this.bottomLeft.y.toString(), height);
      bottomLeftPath = this.getRadiusPath(mxRadius, myRadius, rect, "bottomLeft")
      radii[3] = bottomLeftPath
    }
    return radii;
  }

  getRadiusPath(mxRadius: number, myRadius: number, rect: common2D.Rect, position: string): PathPotions {
    let startX
    let startY
    let endX
    let endY
    let ctrX
    let ctrY
    switch (position) {
      case "topLeft":
        startX = rect.left
        startY = rect.top + myRadius
        endX = rect.left + mxRadius
        endY = rect.top
        ctrX = rect.left
        ctrY = rect.top
        break
      case "topRight":
        startX = rect.right - mxRadius
        startY = rect.top
        endX = rect.right
        endY = rect.top + myRadius
        ctrX = rect.right
        ctrY = rect.top
        break
      case "bottomLeft":
        endX = rect.left
        endY = rect.bottom - myRadius
        startX = rect.left + mxRadius
        startY = rect.bottom
        ctrX = rect.left
        ctrY = rect.bottom
        break
      case "bottomRight":
        endX = rect.right - mxRadius
        endY = rect.bottom
        startX = rect.right
        startY = rect.bottom - myRadius
        ctrX = rect.right
        ctrY = rect.bottom
        break
      default:
        break
    }

    return {
      startX, startY,
      endX, endY,
      ctrX, ctrY
    }
  }
}