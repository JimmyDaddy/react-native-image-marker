export class  MarkerInsets {
  private top: number;

  public setTop(value: number) {
    this.top = value;
  }

  public getTop(): number {
    return this.top;
  }

  private left: number;

  public setLeft(value: number) {
    this.left = value;
  }

  public getLeft(): number {
    return this.left;
  }

  private bottom: number;

  public setBottom(value: number) {
    this.bottom = value;
  }

  public getBottom(): number {
    return this.bottom;
  }

  private right: number;

  public setRight(value: number) {
    this.right = value;
  }

  public getRight(): number {
    return this.right;
  }

  constructor(top,left,bottom,right) {
    this.top =top
    this.left =left
    this.bottom =bottom
    this.right =right
  }

}
