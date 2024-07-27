
export class RNImageSRC {
  width: number = 0;
  height: number = 0;
  scale: number = 1;
  uri: string = "";
  constructor(options: Map<string,object>) {
    this.width = options.has("width") ? Number(options.get("width")) : 0;
    this.height = options.has("height") ? Number(options.get("height")): 0;
    this.scale = options.has("scale") ?Number(options.get("scale")): 1;
    this.uri = options.has("uri") ? String(options.get("uri")): "";
  }
}