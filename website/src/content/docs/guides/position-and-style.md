---
title: Position and style
description: Anchor, offset, size, rotate, and style text and image watermarks.
---

## Anchored positions

Set a named `Position` and use `X` and `Y` as offsets from that anchor.

```ts
{
  text: '© Acme Studio',
  position: {
    position: Position.bottomRight,
    X: 24,
    Y: 24,
  },
}
```

Available anchors are `topLeft`, `topCenter`, `topRight`, `bottomLeft`, `bottomCenter`, `bottomRight`, and `center`.

Named positions keep a compatibility inset of `20` when the relevant axis is omitted. Set `edgeInset: 0` when the layer should sit flush with the selected edge.

```ts
position: {
  position: Position.topLeft,
  edgeInset: 0,
}
```

## Absolute and percentage coordinates

Omit the named anchor to treat `X` and `Y` as absolute coordinates. Numbers are pixels in the output image coordinate space; strings can be percentages resolved against the background image.

```ts
position: {
  X: '8%',
  Y: '12%',
}
```

## Single and tiled layouts

Leave `layout` unset for one positioned watermark. Set `layout.type` to `tile` to repeat a text or image layer across the full output.

```ts
{
  type: 'text',
  text: 'CONFIDENTIAL',
  layout: {
    type: 'tile',
    gapX: '8%',
    gapY: '7%',
    offsetX: '-2%',
    stagger: true,
  },
  style: {
    color: '#FFFFFF88',
    fontSize: 30,
    rotate: -24,
  },
}
```

`gapX`, `gapY`, `offsetX`, and `offsetY` accept output pixels or percentages. Gaps are measured from each copy's visible bounds after rotation. A tiled layer cannot also set `position`; the call rejects that conflict instead of guessing which value wins.

Each layer is limited to 4096 copies. Image layers decode the logo once and reuse it for every placement, and one tiled layer finishes before the next layer starts.

## Responsive text

Use `fontSizeRatio` when text should scale with the background image width.

```ts
style: {
  color: '#FFFFFF',
  fontSizeRatio: 0.03,
}
```

Do not set both `fontSize` and `fontSizeRatio` unless you have verified which behavior you want for every target size.

## Text style

These text options work on iOS, Android, and Web:

| Property | Purpose |
| --- | --- |
| `color` | Text color |
| `fontName` | Platform font family or iOS PostScript name |
| `fontSize` / `fontSizeRatio` | Fixed or responsive size |
| `bold`, `italic`, `underline`, `strikeThrough` | Font decorations |
| `rotate`, `skewX` | Transform the text |
| `shadowStyle` | Shadow offset, radius, and color |
| `strokeStyle` | Outline color and width |
| `textBackgroundStyle` | Padding, color, stretch mode, and corner radius |

Use `TextBackgroundType.none` when the background should fit the text rather than stretch. Its serialized value is `fit`.

### Text outlines

Use a contrasting outline when text must remain readable over both light and dark parts of a photo.

```ts
style: {
  color: '#FFFFFF',
  fontSize: 32,
  strokeStyle: {
    color: '#0F172ACC',
    width: 2,
  },
}
```

The outline is included in anchoring and tile spacing. Set `strokeStyle` to `null` or omit it to keep the previous fill-only rendering.

### Custom fonts

The package does not bundle fonts.

- On iOS, `fontName` is passed to `UIFont(name:size:)`; use the font's registered PostScript name and include it in the app bundle.
- On Android, the name is resolved through React Native's font manager; place linked font files in the usual Android assets location.
- On Web, the name becomes a Canvas CSS font family. Load the web font before calling Marker or the browser will use a fallback.
- If a name cannot be resolved, the platform default font is used.

Confirm the font in a normal React Native `<Text>` or Web Canvas first, then pass the platform-appropriate family name to the marker style.

## Image layers

Image watermarks support `scale`, `rotate`, `alpha`, `position`, `layout`, and `trimTransparentPadding`. Transparent outer pixels are trimmed before scaling, rotation, positioning, or tiling. Tune `scale` for the intended output image size.
