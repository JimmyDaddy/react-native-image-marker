import { RNNativeImageMarker } from '@rnoh/react-native-openharmony/generated/turboModules/RNNativeImageMarker'
import { TextAlign } from './TextAlign'
import { ShadowLayerStyle } from './ShadowLayerStyle'
import { TextBackgroundStyle } from './TextBackgroundStyle'
import { DefaultConstants } from './DefaultConstants'

export class TextStyle {
  private color: string | null

  public setColor(value: string | null) {
    this.color = value
  }

  public getColor(): string | null {
    return this.color
  }

  private fontName: string | null

  public setFontName(value: string | null) {
    this.fontName = value
  }

  public getFontName(): string | null {
    return this.fontName
  }

  private fontSize: number

  public setFontSize(value: number) {
    this.fontSize = value
  }

  public getFontSize(): number {
    return this.fontSize
  }

  private shadowLayerStyle: ShadowLayerStyle | null

  public setShadowLayerStyle(value: ShadowLayerStyle | null) {
    this.shadowLayerStyle = value
  }

  public getShadowLayerStyle(): ShadowLayerStyle | null {
    return this.shadowLayerStyle
  }

  private textBackgroundStyle: TextBackgroundStyle | null

  public setTextBackgroundStyle(value: TextBackgroundStyle | null) {
    this.textBackgroundStyle = value
  }

  public getTextBackgroundStyle(): TextBackgroundStyle | null {
    return this.textBackgroundStyle
  }

  private underline: boolean

  public setUnderline(value: boolean) {
    this.underline = value
  }

  public getUnderline(): boolean {
    return this.underline
  }

  private skewX: number | null

  public setSkewX(value: number | null) {
    this.skewX = value
  }

  public getSkewX(): number | null {
    return this.skewX
  }

  private strikeThrough: boolean

  public setStrikeThrough(value: boolean) {
    this.strikeThrough = value
  }

  public getStrikeThrough(): boolean {
    return this.strikeThrough
  }

  private textAlign: string

  public setTextAlign(value: string) {
    this.textAlign = value
  }

  public getTextAlign(): string {
    return this.textAlign
  }

  private italic: boolean

  public setItalic(value: boolean) {
    this.italic = value
  }

  public getItalic(): boolean {
    return this.italic
  }

  private bold: boolean

  public setBold(value: boolean) {
    this.bold = value
  }

  public getBold(): boolean {
    return this.bold
  }

  private rotate: number

  public setRotate(value: number) {
    this.rotate = value
  }

  public getRotate(): number {
    return this.rotate
  }

  constructor(options: RNNativeImageMarker.TextStyle | null | undefined) {
    this.color = options?.color ?? null;
    this.fontName = options?.fontName ?? null;
    this.fontSize = options?.fontSize ? options.fontSize : DefaultConstants.DEFAULT_FONT_SIZE;
    this.shadowLayerStyle = options?.shadowStyle ? new ShadowLayerStyle(options.shadowStyle) : null;
    this.textBackgroundStyle =
      options?.textBackgroundStyle ? new TextBackgroundStyle(options.textBackgroundStyle) : null;
    this.underline = options?.underline ? options.underline! : false;
    this.skewX = options?.skewX ? options.skewX! : 0;
    this.strikeThrough = options?.strikeThrough ? options.strikeThrough! : false;
    this.textAlign = TextAlign.LEFT;
    this.setTextAlin(options)
    this.italic = options?.italic ? options.italic! : false;
    this.bold = options?.bold ? options.bold! : false;
    this.rotate = options?.rotate ? options.rotate! : 0;
  }

  private setTextAlin(options: RNNativeImageMarker.TextStyle | null | undefined) {
    if (options?.textAlign) {
      switch (options.textAlign) {
        case "center":
          this.textAlign = TextAlign.CENTER
          break
        case "right":
          this.textAlign = TextAlign.RIGHT
          break
        default:
          this.textAlign = TextAlign.LEFT
          break
      }
    }
  }
}