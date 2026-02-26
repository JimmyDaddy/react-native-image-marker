import { test, describe, expect } from 'vitest';
import { SerializationOptimizer } from '../SerializationOptimizer';
import {
  Position,
  ImageFormat,
  TextBackgroundType,
  type TextMarkOptions,
  type ImageMarkOptions,
} from '../types';

describe('Serialization Optimization', () => {
  describe('Text Mark Options Optimization', () => {
    test('should remove undefined values from text mark options', () => {
      const options: TextMarkOptions = {
        backgroundImage: {
          src: 'test.jpg',
          scale: undefined,
          rotate: 0,
          alpha: 1.0,
        },
        watermarkTexts: [
          {
            text: 'Test',
            position: { position: Position.center },
            style: {
              color: '#FF0000',
              fontSize: 20,
              bold: undefined,
              italic: false,
              rotate: 0,
            },
          },
        ],
        quality: undefined,
        filename: '',
        saveFormat: ImageFormat.jpg,
      };

      const optimized = SerializationOptimizer.optimizeTextMarkOptions(options);

      // Should remove undefined and default values
      expect(optimized.backgroundImage.scale).toBeUndefined();
      expect(optimized.backgroundImage.rotate).toBeUndefined();
      expect(optimized.backgroundImage.alpha).toBeUndefined();
      expect(optimized.quality).toBeUndefined();
      expect(optimized.filename).toBeUndefined();
      expect(optimized.watermarkTexts[0]!.style?.bold).toBeUndefined();
      expect(optimized.watermarkTexts[0]!.style?.italic).toBeUndefined();
      expect(optimized.watermarkTexts[0]!.style?.rotate).toBeUndefined();

      // Should keep meaningful values
      expect(optimized.backgroundImage.src).toBe('test.jpg');
      expect(optimized.watermarkTexts[0]!.text).toBe('Test');
      expect(optimized.watermarkTexts[0]!.style?.color).toBe('#FF0000');
      expect(optimized.watermarkTexts[0]!.style?.fontSize).toBe(20);
      expect(optimized.saveFormat).toBe(ImageFormat.jpg);
    });

    test('should optimize complex text styling', () => {
      const options: TextMarkOptions = {
        backgroundImage: { src: 'test.jpg' },
        watermarkTexts: [
          {
            text: 'Complex Style Test',
            style: {
              color: '  #FF0000  ', // Should trim whitespace
              fontName: '  Arial  ',
              fontSize: 24,
              bold: true,
              italic: false, // Should be removed
              underline: true,
              strikeThrough: false, // Should be removed
              rotate: 45,
              textAlign: 'left', // Should be removed (default)
              skewX: 0, // Should be removed
              shadowStyle: {
                dx: 0, // Should be removed
                dy: 2,
                radius: 4,
                color: '#000000',
              },
              textBackgroundStyle: {
                type: TextBackgroundType.fit, // Should be removed (default)
                color: '  #FFFFFF  ',
                padding: 10,
                cornerRadius: {
                  all: { x: 5, y: 5 },
                },
              },
            },
          },
        ],
      };

      const optimized = SerializationOptimizer.optimizeTextMarkOptions(options);
      const style = optimized.watermarkTexts[0]!.style!;

      // Should trim whitespace
      expect(style.color).toBe('#FF0000');
      expect(style.fontName).toBe('Arial');

      // Should keep meaningful boolean values
      expect(style.bold).toBe(true);
      expect(style.underline).toBe(true);

      // Should remove false/default values
      expect(style.italic).toBeUndefined();
      expect(style.strikeThrough).toBeUndefined();
      expect(style.textAlign).toBeUndefined();
      expect(style.skewX).toBeUndefined();

      // Should optimize shadow style (remove dx: 0)
      expect(style.shadowStyle?.dx).toBeUndefined();
      expect(style.shadowStyle?.dy).toBe(2);
      expect(style.shadowStyle?.radius).toBe(4);
      expect(style.shadowStyle?.color).toBe('#000000');

      // Should optimize text background style
      expect(style.textBackgroundStyle?.type).toBeUndefined(); // Default value removed
      expect(style.textBackgroundStyle?.color).toBe('#FFFFFF');
      expect(style.textBackgroundStyle?.padding).toBe(10);
    });

    test('should remove empty shadow and background styles', () => {
      const options: TextMarkOptions = {
        backgroundImage: { src: 'test.jpg' },
        watermarkTexts: [
          {
            text: 'Test',
            style: {
              shadowStyle: {
                dx: 0,
                dy: 0,
                radius: 0,
                color: '',
              },
              textBackgroundStyle: {
                color: '',
              },
            },
          },
        ],
      };

      const optimized = SerializationOptimizer.optimizeTextMarkOptions(options);
      const style = optimized.watermarkTexts[0]!.style;

      // Should remove empty shadow style
      expect(style?.shadowStyle).toBeUndefined();

      // Should remove empty background style
      expect(style?.textBackgroundStyle).toBeUndefined();
    });
  });

  describe('Image Mark Options Optimization', () => {
    test('should optimize image mark options', () => {
      const options: ImageMarkOptions = {
        backgroundImage: {
          src: 'bg.jpg',
          scale: 1.0, // Should be removed (default)
          rotate: 0, // Should be removed (default)
          alpha: 0.8, // Should be kept
        },
        watermarkImages: [
          {
            src: 'watermark.png',
            scale: 0.5,
            rotate: 45,
            alpha: 1.0, // Should be removed (default)
            position: { position: Position.bottomRight },
          },
        ],
        quality: 0, // Should be removed (invalid)
        filename: '   test.jpg   ', // Should be trimmed
        maxSize: 1024,
      };

      const optimized =
        SerializationOptimizer.optimizeImageMarkOptions(options);

      // Should remove default values
      expect(optimized.backgroundImage.scale).toBeUndefined();
      expect(optimized.backgroundImage.rotate).toBeUndefined();
      expect(optimized.watermarkImages[0]!.alpha).toBeUndefined();
      expect(optimized.quality).toBeUndefined();

      // Should keep meaningful values
      expect(optimized.backgroundImage.alpha).toBe(0.8);
      expect(optimized.watermarkImages[0]!.scale).toBe(0.5);
      expect(optimized.watermarkImages[0]!.rotate).toBe(45);
      expect(optimized.filename).toBe('test.jpg');
      expect(optimized.maxSize).toBe(1024);
    });

    test('should handle legacy watermarkImage field', () => {
      const options: ImageMarkOptions = {
        backgroundImage: { src: 'bg.jpg' },
        watermarkImage: {
          src: 'legacy.png',
          scale: 1.0,
          rotate: 0,
        },
        watermarkPositions: { position: Position.center },
        watermarkImages: [],
      };

      const optimized =
        SerializationOptimizer.optimizeImageMarkOptions(options);

      // Should optimize legacy fields
      expect(optimized.watermarkImage?.src).toBe('legacy.png');
      expect(optimized.watermarkImage?.scale).toBeUndefined();
      expect(optimized.watermarkImage?.rotate).toBeUndefined();
      expect(optimized.watermarkPositions?.position).toBe(Position.center);
    });
  });

  describe('Position Options Optimization', () => {
    test('should convert string coordinates to numbers', () => {
      const options: TextMarkOptions = {
        backgroundImage: { src: 'test.jpg' },
        watermarkTexts: [
          {
            text: 'Test',
            position: {
              X: '100.5',
              Y: '200.7',
            },
          },
        ],
      };

      const optimized = SerializationOptimizer.optimizeTextMarkOptions(options);
      const position = optimized.watermarkTexts[0]!.position!;

      expect(position.X).toBe(100.5);
      expect(position.Y).toBe(200.7);
    });

    test('should handle invalid string coordinates', () => {
      const options: TextMarkOptions = {
        backgroundImage: { src: 'test.jpg' },
        watermarkTexts: [
          {
            text: 'Test',
            position: {
              X: 'invalid',
              Y: 'also-invalid',
            },
          },
        ],
      };

      const optimized = SerializationOptimizer.optimizeTextMarkOptions(options);
      const position = optimized.watermarkTexts[0]!.position!;

      // Should keep original string values if conversion fails
      expect(position.X).toBe('invalid');
      expect(position.Y).toBe('also-invalid');
    });
  });

  describe('Padding Optimization', () => {
    test('should consolidate padding values', () => {
      const options: TextMarkOptions = {
        backgroundImage: { src: 'test.jpg' },
        watermarkTexts: [
          {
            text: 'Test',
            style: {
              textBackgroundStyle: {
                color: '#FFFFFF',
                padding: 10, // Should use consolidated padding
                paddingLeft: 5, // Should be ignored when padding is set
                paddingRight: 5,
              },
            },
          },
        ],
      };

      const optimized = SerializationOptimizer.optimizeTextMarkOptions(options);
      const backgroundStyle =
        optimized.watermarkTexts[0]!.style?.textBackgroundStyle!;

      expect(backgroundStyle.padding).toBe(10);
      expect(backgroundStyle.paddingLeft).toBeUndefined();
      expect(backgroundStyle.paddingRight).toBeUndefined();
    });

    test('should use horizontal/vertical padding when appropriate', () => {
      const options: TextMarkOptions = {
        backgroundImage: { src: 'test.jpg' },
        watermarkTexts: [
          {
            text: 'Test',
            style: {
              textBackgroundStyle: {
                color: '#FFFFFF',
                paddingHorizontal: 15,
                paddingVertical: 10,
              },
            },
          },
        ],
      };

      const optimized = SerializationOptimizer.optimizeTextMarkOptions(options);
      const backgroundStyle =
        optimized.watermarkTexts[0]!.style?.textBackgroundStyle!;

      expect(backgroundStyle.paddingHorizontal).toBe(15);
      expect(backgroundStyle.paddingVertical).toBe(10);
    });
  });

  describe('Serialization Size Calculation', () => {
    test('should calculate serialization size correctly', () => {
      const simpleObject = { a: 1, b: 'test' };
      const size =
        SerializationOptimizer.calculateSerializationSize(simpleObject);

      expect(size).toBe(JSON.stringify(simpleObject).length);
      expect(size).toBeGreaterThan(0);
    });

    test('should compare optimization results', () => {
      const original = {
        value: 1,
        undefined: undefined,
        empty: '',
        zero: 0,
        false: false,
        nested: {
          keep: 'this',
          remove: undefined,
        },
      };

      const optimized = {
        value: 1,
        nested: {
          keep: 'this',
        },
      };

      const comparison = SerializationOptimizer.compareOptimization(
        original,
        optimized
      );

      expect(comparison.originalSize).toBeGreaterThan(comparison.optimizedSize);
      expect(comparison.reduction).toBeGreaterThan(0);
      expect(comparison.reductionPercentage).toBeGreaterThan(0);
      expect(comparison.reductionPercentage).toBeLessThanOrEqual(100);
    });
  });

  describe('Real-world Optimization Scenarios', () => {
    test('should optimize complex real-world text options', () => {
      const complexOptions: TextMarkOptions = {
        backgroundImage: {
          src: 'large-background.jpg',
          scale: 1.0,
          rotate: 0,
          alpha: 1.0,
        },
        watermarkTexts: Array.from({ length: 5 }, (_, index) => ({
          text: `Watermark ${index}`,
          position: {
            X: 100 + index * 50,
            Y: 100 + index * 30,
          },
          style: {
            color: '#FF0000',
            fontSize: 16,
            fontName: 'Arial',
            bold: index % 2 === 0,
            italic: false,
            underline: false,
            strikeThrough: false,
            rotate: 0,
            textAlign: 'left',
            skewX: 0,
            shadowStyle: {
              dx: 0,
              dy: 0,
              radius: 0,
              color: '',
            },
            textBackgroundStyle: {
              type: TextBackgroundType.fit,
              color: '#FFFFFF',
              padding: 0,
              cornerRadius: {
                all: { x: 0, y: 0 },
              },
            },
          },
        })),
        quality: 90,
        filename: 'optimized-output.jpg',
        saveFormat: ImageFormat.jpg,
        maxSize: 2048,
      };

      const optimized =
        SerializationOptimizer.optimizeTextMarkOptions(complexOptions);
      const comparison = SerializationOptimizer.compareOptimization(
        complexOptions,
        optimized
      );

      // Should achieve significant size reduction
      expect(comparison.reduction).toBeGreaterThan(0);
      expect(comparison.reductionPercentage).toBeGreaterThan(10); // At least 10% reduction

      // Should preserve essential data
      expect(optimized.watermarkTexts).toHaveLength(5);
      expect(optimized.quality).toBe(90);
      expect(optimized.filename).toBe('optimized-output.jpg');
      expect(optimized.saveFormat).toBe(ImageFormat.jpg);
      expect(optimized.maxSize).toBe(2048);

      // Should remove default/empty values
      optimized.watermarkTexts.forEach((text, index) => {
        expect(text.style?.italic).toBeUndefined();
        expect(text.style?.underline).toBeUndefined();
        expect(text.style?.strikeThrough).toBeUndefined();
        expect(text.style?.rotate).toBeUndefined();
        expect(text.style?.textAlign).toBeUndefined();
        expect(text.style?.skewX).toBeUndefined();
        expect(text.style?.shadowStyle).toBeUndefined(); // Empty shadow removed
        expect(text.style?.textBackgroundStyle).toBeUndefined(); // Empty background removed

        // Should keep meaningful boolean values
        if (index % 2 === 0) {
          expect(text.style?.bold).toBe(true);
        } else {
          expect(text.style?.bold).toBeUndefined();
        }
      });
    });

    test('should optimize large image watermark scenarios', () => {
      const largeImageOptions: ImageMarkOptions = {
        backgroundImage: {
          src: 'huge-background.jpg',
          scale: 2.0,
          rotate: 45,
          alpha: 0.9,
        },
        watermarkImages: Array.from({ length: 10 }, (_, index) => ({
          src: `watermark-${index}.png`,
          scale: 1.0, // Default, should be removed
          rotate: index * 36, // Meaningful values
          alpha: 1.0, // Default, should be removed
          position: {
            position: [
              Position.topLeft,
              Position.topCenter,
              Position.topRight,
              Position.center,
              Position.bottomLeft,
              Position.bottomCenter,
              Position.bottomRight,
              Position.center,
              Position.topLeft,
              Position.bottomRight,
            ][index],
          },
        })),
        quality: 95,
        filename: 'large-watermarked-image.png',
        saveFormat: ImageFormat.png,
        maxSize: 4096,
      };

      const optimized =
        SerializationOptimizer.optimizeImageMarkOptions(largeImageOptions);
      const comparison = SerializationOptimizer.compareOptimization(
        largeImageOptions,
        optimized
      );

      // Should achieve size reduction
      expect(comparison.reduction).toBeGreaterThan(0);

      // Should preserve essential data
      expect(optimized.backgroundImage.scale).toBe(2.0);
      expect(optimized.backgroundImage.rotate).toBe(45);
      expect(optimized.backgroundImage.alpha).toBe(0.9);
      expect(optimized.watermarkImages).toHaveLength(10);

      // Should remove default values from watermark images
      optimized.watermarkImages.forEach((watermark, index) => {
        expect(watermark.scale).toBeUndefined(); // Default value removed
        expect(watermark.alpha).toBeUndefined(); // Default value removed

        if (index > 0) {
          expect(watermark.rotate).toBe(index * 36); // Meaningful values kept
        } else {
          expect(watermark.rotate).toBeUndefined(); // Zero value removed
        }
      });
    });
  });
});
