
import { RNNativeImageMarker } from '@rnoh/react-native-openharmony/generated/turboModules/RNNativeImageMarker'
import { MarkerInsets } from './MarkerInsets';
import { checkSpreadValue,parseSpreadValue } from './Utils'
export class Padding {
  private paddingTop: string = "0";

  public setPaddingTop(value: string) {
    this.paddingTop = value;
  }

  public getPaddingTop(): string {
    return this.paddingTop;
  }

  private paddingLeft: string = "0";

  public setPaddingLeft(value: string) {
    this.paddingLeft = value;
  }

  public getPaddingLeft(): string {
    return this.paddingLeft;
  }

  private paddingBottom: string = "0";

  public setPaddingBottom(value: string) {
    this.paddingBottom = value;
  }

  public getPaddingBottom(): string {
    return this.paddingBottom;
  }

  private paddingRight: string = "0";

  public setPaddingRight(value: string) {
    this.paddingRight = value;
  }

  public getPaddingRight(): string {
    return this.paddingRight;
  }

  constructor(paddingData: RNNativeImageMarker.Padding | undefined) {
    let topValue = "0";
    let leftValue = "0";
    let bottomValue = "0";
    let rightValue = "0";

    if (paddingData) {
      for (const key in paddingData) {
        ({
          topValue,
          leftValue,
          bottomValue,
          rightValue
        } = this.calculatePaddingValue(paddingData, key, topValue, leftValue, bottomValue, rightValue));
      }
    }
    this.paddingTop = topValue;
    this.paddingLeft = leftValue;
    this.paddingBottom = bottomValue;
    this.paddingRight = rightValue;
  }

  private calculatePaddingValue(paddingData: RNNativeImageMarker.Padding, key: string, topValue: string, leftValue: string,
    bottomValue: string, rightValue: string) {
    if (paddingData.hasOwnProperty(key)) {
      let paddingValue = paddingData[key];
      switch (key) {
        case "padding":
          ({
            paddingValue,
            topValue,
            leftValue,
            bottomValue,
            rightValue
          } = this.setPaddingAll(paddingValue, topValue, leftValue, bottomValue, rightValue));
          break;
        case "paddingLeft":
          leftValue = this.getLefValue(paddingValue, leftValue);
          break;
        case "paddingRight":
          rightValue = this.getRightValue(paddingValue, rightValue);
          break;
        case "paddingTop":
          topValue = this.getTopValue(paddingValue, topValue);
          break;
        case "paddingBottom":
          bottomValue = this.getBottomValue(paddingValue, bottomValue);
          break;
        case "paddingHorizontal":
        case "paddingX":
          ({ leftValue, rightValue } = this.getHorizontalValue(paddingValue, leftValue, rightValue));
          break;
        case "paddingVertical":
        case "paddingY":
          ({ topValue, bottomValue } = this.getVerticalValue(paddingValue, topValue, bottomValue));
          break;
        default:
        // Handle other cases if needed
          break;
      }
    }
    return {
      topValue,
      leftValue,
      bottomValue,
      rightValue
    };
  }

  private getVerticalValue(paddingValue: any, topValue: string, bottomValue: string) {
    if (typeof paddingValue === "string") {
      if (!checkSpreadValue(paddingValue, 1)) {
        throw new Error("padding is invalid");
      }
      topValue = paddingValue;
      bottomValue = paddingValue;
    } else if (typeof paddingValue === "number") {
      topValue = paddingValue.toString();
      bottomValue = paddingValue.toString();
    }
    return { topValue, bottomValue };
  }

  private getHorizontalValue(paddingValue: any, leftValue: string, rightValue: string) {
    if (typeof paddingValue === "string") {
      if (!checkSpreadValue(paddingValue, 1)) {
        throw new Error("padding is invalid");
      }
      leftValue = paddingValue;
      rightValue = paddingValue;
    } else if (typeof paddingValue === "number") {
      leftValue = paddingValue.toString();
      rightValue = paddingValue.toString();
    }
    return { leftValue, rightValue };
  }

  private getBottomValue(paddingValue: any, bottomValue: string) {
    if (typeof paddingValue === "string") {
      if (!checkSpreadValue(paddingValue, 1)) {
        throw new Error("padding is invalid");
      }
      bottomValue = paddingValue;
    } else if (typeof paddingValue === "number") {
      bottomValue = paddingValue.toString();
    }
    return bottomValue;
  }

  private getTopValue(paddingValue: any, topValue: string) {
    if (typeof paddingValue === "string") {
      if (!checkSpreadValue(paddingValue, 1)) {
        throw new Error("padding is invalid");
      }
      topValue = paddingValue;
    } else if (typeof paddingValue === "number") {
      topValue = paddingValue.toString();
    }
    return topValue;
  }

  private getRightValue(paddingValue: any, rightValue: string) {
    if (typeof paddingValue === "string") {
      if (!checkSpreadValue(paddingValue, 1)) {
        throw new Error("padding is invalid");
      }
      rightValue = paddingValue;
    } else if (typeof paddingValue === "number") {
      rightValue = paddingValue.toString();
    }
    return rightValue;
  }

  private getLefValue(paddingValue: any, leftValue: string) {
    if (typeof paddingValue === "string") {
      if (!checkSpreadValue(paddingValue, 1)) {
        throw new Error("padding is invalid");
      }
      leftValue = paddingValue;
    } else if (typeof paddingValue === "number") {
      leftValue = paddingValue.toString();
    }
    return leftValue;
  }

  private setPaddingAll(paddingValue: any, topValue: string, leftValue: string, bottomValue: string, rightValue: string) {
    if (typeof paddingValue === "string") {
      paddingValue = paddingValue.trim();
      if (!checkSpreadValue(paddingValue, 4)) {
        throw new Error("padding is invalid param: " + paddingValue);
      }
      const values = paddingValue.split(" ");
      switch (values.length) {
        case 1:
          topValue = values[0];
          leftValue = values[0];
          bottomValue = values[0];
          rightValue = values[0];
          break;
        case 2:
          topValue = values[0];
          leftValue = values[1];
          bottomValue = values[0];
          rightValue = values[1];
          break;
        case 3:
          topValue = values[0];
          leftValue = values[1];
          bottomValue = values[2];
          rightValue = values[1];
          break;
        case 4:
          topValue = values[0];
          leftValue = values[1];
          bottomValue = values[2];
          rightValue = values[3];
          break;
        default:
          throw new Error("Unexpected number of padding values");
      }
    } else if (typeof paddingValue === "number") {
      topValue = paddingValue.toString();
      leftValue = paddingValue.toString();
      bottomValue = paddingValue.toString();
      rightValue = paddingValue.toString();
    }
    return {
      paddingValue,
      topValue,
      leftValue,
      bottomValue,
      rightValue
    };
  }

  toEdgeInsets(width: number, height: number): MarkerInsets {
    const topValue = parseSpreadValue(this.paddingTop, height);
    const leftValue = parseSpreadValue(this.paddingLeft, width);
    const bottomValue = parseSpreadValue(this.paddingBottom, height);
    const rightValue = parseSpreadValue(this.paddingRight, width);
    return new MarkerInsets(topValue, leftValue, bottomValue, rightValue);
  }
}