export enum PositionEnum {
  TOP_LEFT = "topLeft",
  TOP_CENTER = "topCenter",
  TOP_RIGHT = "topRight",
  CENTER = "center",
  BOTTOM_LEFT = "bottomLeft",
  BOTTOM_CENTER = "bottomCenter",
  BOTTOM_RIGHT = "bottomRight"
}

export namespace PositionEnum {
  export function getPosition(position: string | null | undefined): PositionEnum {
    switch (position) {
      case "topLeft":
        return PositionEnum.TOP_LEFT;
      case "topCenter":
        return PositionEnum.TOP_CENTER;
      case "topRight":
        return PositionEnum.TOP_RIGHT;
      case "center":
        return PositionEnum.CENTER;
      case "bottomLeft":
        return PositionEnum.BOTTOM_LEFT;
      case "bottomCenter":
        return PositionEnum.BOTTOM_CENTER;
      default:
        return PositionEnum.BOTTOM_RIGHT;
    }
  }
}