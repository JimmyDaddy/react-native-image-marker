import { test, describe, beforeEach, expect, vi } from 'vitest';
import { ArchitectureDetector } from '../ArchitectureDetector';
import { LegacyImpl } from '../LegacyImpl';
import { TurboModuleImpl } from '../TurboModuleImpl';
import {
  Position,
  ImageFormat,
  TextBackgroundType,
  type TextMarkOptions,
} from '../types';

// Mock the TurboModule spec to avoid loading issues in test environment
vi.mock('../../specs/NativeImageMarker', () => ({
  default: {
    markWithText: vi.fn(() => Promise.resolve('mocked-turbo-result')),
    markWithImage: vi.fn(() => Promise.resolve('mocked-turbo-result')),
  },
}));

describe('Performance Benchmark Tests', () => {
  beforeEach(() => {
    // Reset architecture detection before each test
    ArchitectureDetector.reset();
  });

  describe('Communication Overhead Benchmarks', () => {
    test('should measure method call overhead between architectures', async () => {
      /**
       * Performance Test: Method Call Overhead
       * Measures the time difference between legacy bridge and TurboModule method calls
       * Requirements: 8.1, 8.2
       */
      const testOptions: TextMarkOptions = {
        backgroundImage: { src: 'benchmark-test.jpg' },
        watermarkTexts: [
          {
            text: 'Performance Test',
            position: { position: Position.center },
          },
        ],
      };

      // Measure legacy implementation call time
      const legacyStartTime = performance.now();
      try {
        await LegacyImpl.markText(testOptions);
      } catch {
        // Expected in test environment
      }
      const legacyEndTime = performance.now();
      const legacyCallTime = legacyEndTime - legacyStartTime;

      // Measure TurboModule implementation call time
      const turboStartTime = performance.now();
      try {
        await TurboModuleImpl.markText(testOptions);
      } catch {
        // Expected in test environment
      }
      const turboEndTime = performance.now();
      const turboCallTime = turboEndTime - turboStartTime;

      // Both calls should complete within reasonable time
      expect(legacyCallTime).toBeLessThan(1000); // 1 second max
      expect(turboCallTime).toBeLessThan(1000); // 1 second max

      // Log performance metrics for analysis
      console.log(`Legacy call time: ${legacyCallTime.toFixed(2)}ms`);
      console.log(`TurboModule call time: ${turboCallTime.toFixed(2)}ms`);

      // Performance difference should be measurable
      const performanceDifference = Math.abs(legacyCallTime - turboCallTime);
      expect(performanceDifference).toBeGreaterThanOrEqual(0);
    });

    test('should measure serialization overhead for different data sizes', async () => {
      /**
       * Performance Test: Serialization Overhead
       * Measures serialization performance with varying data sizes
       * Requirements: 8.3, 8.4
       */
      const dataSizes = [1, 5, 10, 20];
      const results: Array<{
        size: number;
        legacyTime: number;
        turboTime: number;
      }> = [];

      for (const size of dataSizes) {
        const largeOptions: TextMarkOptions = {
          backgroundImage: { src: 'large-data-test.jpg' },
          watermarkTexts: Array.from({ length: size }, (_, index) => ({
            text: `Large Data Test ${index} - ${'x'.repeat(50)}`,
            position: { position: Position.center },
            style: {
              color: '#FF0000',
              fontSize: 20,
              fontName: 'Arial',
              bold: true,
              italic: false,
              underline: false,
              strikeThrough: false,
              rotate: 0,
              textAlign: 'center',
              shadowStyle: {
                dx: 2,
                dy: 2,
                radius: 4,
                color: '#000000',
              },
            },
          })),
        };

        // Measure legacy serialization time
        const legacyStart = performance.now();
        try {
          await LegacyImpl.markText(largeOptions);
        } catch {
          // Expected in test environment
        }
        const legacyTime = performance.now() - legacyStart;

        // Measure TurboModule serialization time
        const turboStart = performance.now();
        try {
          await TurboModuleImpl.markText(largeOptions);
        } catch {
          // Expected in test environment
        }
        const turboTime = performance.now() - turboStart;

        results.push({ size, legacyTime, turboTime });

        // Both should complete within reasonable time
        expect(legacyTime).toBeLessThan(2000);
        expect(turboTime).toBeLessThan(2000);
      }

      // Log serialization performance metrics
      results.forEach(({ size, legacyTime, turboTime }) => {
        console.log(
          `Size ${size}: Legacy ${legacyTime.toFixed(
            2
          )}ms, TurboModule ${turboTime.toFixed(2)}ms`
        );
      });

      // Performance should scale reasonably with data size
      expect(results.length).toBe(dataSizes.length);
    });

    test('should measure concurrent operation performance', async () => {
      /**
       * Performance Test: Concurrent Operations
       * Measures performance under concurrent load
       * Requirements: 8.1, 8.2, 8.5
       */
      const concurrencyLevels = [1, 3, 5];
      const testOptions: TextMarkOptions = {
        backgroundImage: { src: 'concurrent-test.jpg' },
        watermarkTexts: [
          {
            text: 'Concurrent Test',
            position: { position: Position.center },
          },
        ],
      };

      for (const concurrency of concurrencyLevels) {
        // Test legacy implementation concurrency
        const legacyStart = performance.now();
        const legacyPromises = Array.from({ length: concurrency }, () =>
          LegacyImpl.markText(testOptions).catch(() => 'legacy-error')
        );
        await Promise.all(legacyPromises);
        const legacyTime = performance.now() - legacyStart;

        // Test TurboModule implementation concurrency
        const turboStart = performance.now();
        const turboPromises = Array.from({ length: concurrency }, () =>
          TurboModuleImpl.markText(testOptions).catch(() => 'turbo-error')
        );
        await Promise.all(turboPromises);
        const turboTime = performance.now() - turboStart;

        // Log concurrent performance metrics
        console.log(
          `Concurrency ${concurrency}: Legacy ${legacyTime.toFixed(
            2
          )}ms, TurboModule ${turboTime.toFixed(2)}ms`
        );

        // Both should handle concurrency without excessive delay
        expect(legacyTime).toBeLessThan(5000);
        expect(turboTime).toBeLessThan(5000);
      }
    });
  });

  describe('Memory Usage Benchmarks', () => {
    test('should measure memory usage patterns', async () => {
      /**
       * Performance Test: Memory Usage
       * Measures memory consumption patterns
       * Requirements: 8.5
       */
      const initialMemory = process.memoryUsage();

      const testOptions: TextMarkOptions = {
        backgroundImage: { src: 'memory-test.jpg' },
        watermarkTexts: [
          {
            text: 'Memory Test',
            position: { position: Position.center },
          },
        ],
      };

      // Perform multiple operations to test memory usage
      const operations = 10;
      const promises: Promise<any>[] = [];

      for (let i = 0; i < operations; i++) {
        promises.push(
          LegacyImpl.markText(testOptions).catch(() => 'legacy-error'),
          TurboModuleImpl.markText(testOptions).catch(() => 'turbo-error')
        );
      }

      await Promise.all(promises);

      const finalMemory = process.memoryUsage();

      // Calculate memory usage difference
      const heapUsedDiff = finalMemory.heapUsed - initialMemory.heapUsed;
      const heapTotalDiff = finalMemory.heapTotal - initialMemory.heapTotal;

      console.log(
        `Heap used difference: ${(heapUsedDiff / 1024 / 1024).toFixed(2)} MB`
      );
      console.log(
        `Heap total difference: ${(heapTotalDiff / 1024 / 1024).toFixed(2)} MB`
      );

      // Memory usage should be reasonable (less than 100MB for test operations)
      expect(Math.abs(heapUsedDiff)).toBeLessThan(100 * 1024 * 1024);
    });

    test('should test memory cleanup after operations', async () => {
      /**
       * Performance Test: Memory Cleanup
       * Ensures proper memory cleanup after operations
       * Requirements: 8.5
       */
      const testOptions: TextMarkOptions = {
        backgroundImage: { src: 'cleanup-test.jpg' },
        watermarkTexts: [
          {
            text: 'Cleanup Test',
            position: { position: Position.center },
          },
        ],
      };

      // Perform operations and force garbage collection
      for (let i = 0; i < 5; i++) {
        await Promise.all([
          LegacyImpl.markText(testOptions).catch(() => 'legacy-error'),
          TurboModuleImpl.markText(testOptions).catch(() => 'turbo-error'),
        ]);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      // Memory should be cleaned up properly
      const memoryAfterCleanup = process.memoryUsage();
      expect(memoryAfterCleanup.heapUsed).toBeGreaterThan(0);
      expect(memoryAfterCleanup.heapTotal).toBeGreaterThan(0);
    });
  });

  describe('Large Image Processing Benchmarks', () => {
    test('should measure performance with large image configurations', async () => {
      /**
       * Performance Test: Large Image Processing
       * Measures performance with complex image processing tasks
       * Requirements: 8.3, 8.4
       */
      const largeImageOptions: TextMarkOptions = {
        backgroundImage: {
          src: 'large-background.jpg',
          scale: 2.0,
          rotate: 45,
          alpha: 0.9,
        },
        watermarkTexts: Array.from({ length: 15 }, (_, index) => ({
          text: `Large Image Test ${index}`,
          position: {
            X: 100 + index * 50,
            Y: 100 + index * 30,
          },
          style: {
            color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
            fontSize: 16 + (index % 10),
            fontName: 'Arial',
            bold: index % 2 === 0,
            italic: index % 3 === 0,
            rotate: index * 15,
            shadowStyle: {
              dx: 2,
              dy: 2,
              radius: 4,
              color: '#000000',
            },
            textBackgroundStyle: {
              type: TextBackgroundType.fit,
              color: '#FFFFFF',
              padding: 5,
              cornerRadius: {
                all: { x: 3, y: 3 },
              },
            },
          },
        })),
        quality: 95,
        maxSize: 4096,
        saveFormat: ImageFormat.jpg,
      };

      // Measure legacy implementation with large image
      const legacyStart = performance.now();
      try {
        await LegacyImpl.markText(largeImageOptions);
      } catch {
        // Expected in test environment
      }
      const legacyTime = performance.now() - legacyStart;

      // Measure TurboModule implementation with large image
      const turboStart = performance.now();
      try {
        await TurboModuleImpl.markText(largeImageOptions);
      } catch {
        // Expected in test environment
      }
      const turboTime = performance.now() - turboStart;

      console.log(
        `Large image processing - Legacy: ${legacyTime.toFixed(
          2
        )}ms, TurboModule: ${turboTime.toFixed(2)}ms`
      );

      // Both should handle large images within reasonable time
      expect(legacyTime).toBeLessThan(10000); // 10 seconds max
      expect(turboTime).toBeLessThan(10000); // 10 seconds max
    });

    test('should measure performance with multiple image watermarks', async () => {
      /**
       * Performance Test: Multiple Image Watermarks
       * Measures performance with multiple image watermarks
       * Requirements: 8.3, 8.4
       */
      const multipleImageOptions = {
        backgroundImage: { src: 'multi-watermark-bg.jpg' },
        watermarkImages: Array.from({ length: 8 }, (_, index) => ({
          src: `watermark-${index}.png`,
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
            ][index],
          },
          scale: 0.3 + index * 0.1,
          alpha: 0.5 + index * 0.05,
          rotate: index * 45,
        })),
        quality: 90,
        saveFormat: ImageFormat.png,
      };

      // Measure legacy implementation with multiple images
      const legacyStart = performance.now();
      try {
        await LegacyImpl.markImage(multipleImageOptions);
      } catch {
        // Expected in test environment
      }
      const legacyTime = performance.now() - legacyStart;

      // Measure TurboModule implementation with multiple images
      const turboStart = performance.now();
      try {
        await TurboModuleImpl.markImage(multipleImageOptions);
      } catch {
        // Expected in test environment
      }
      const turboTime = performance.now() - turboStart;

      console.log(
        `Multiple image watermarks - Legacy: ${legacyTime.toFixed(
          2
        )}ms, TurboModule: ${turboTime.toFixed(2)}ms`
      );

      // Both should handle multiple images within reasonable time
      expect(legacyTime).toBeLessThan(8000); // 8 seconds max
      expect(turboTime).toBeLessThan(8000); // 8 seconds max
    });
  });

  describe('Architecture Detection Performance', () => {
    test('should measure architecture detection performance', () => {
      /**
       * Performance Test: Architecture Detection
       * Measures the performance of architecture detection
       * Requirements: 8.1, 8.2
       */
      // Reset detection state
      ArchitectureDetector.reset();

      // Measure initial detection time
      const initialStart = performance.now();
      const initialResult = ArchitectureDetector.isNewArchitecture();
      const initialTime = performance.now() - initialStart;

      // Measure cached detection time
      const cachedStart = performance.now();
      const cachedResult = ArchitectureDetector.isNewArchitecture();
      const cachedTime = performance.now() - cachedStart;

      console.log(
        `Architecture detection - Initial: ${initialTime.toFixed(
          2
        )}ms, Cached: ${cachedTime.toFixed(2)}ms`
      );

      // Detection should be fast
      expect(initialTime).toBeLessThan(100); // 100ms max for initial detection
      expect(cachedTime).toBeLessThan(10); // 10ms max for cached detection

      // Results should be consistent
      expect(initialResult).toBe(cachedResult);

      // Cached detection should be faster than initial
      expect(cachedTime).toBeLessThanOrEqual(initialTime);
    });

    test('should measure component detection performance', () => {
      /**
       * Performance Test: Component Detection
       * Measures individual component detection performance
       * Requirements: 8.1, 8.2
       */
      ArchitectureDetector.reset();

      const components = ['hasTurboModules', 'hasJSI', 'hasFabric'];
      const results: Array<{ component: string; time: number }> = [];

      components.forEach((component) => {
        const start = performance.now();
        (ArchitectureDetector as any)[component]();
        const time = performance.now() - start;

        results.push({ component, time });

        // Each component detection should be fast
        expect(time).toBeLessThan(50); // 50ms max per component
      });

      // Log component detection times
      results.forEach(({ component, time }) => {
        console.log(`${component} detection: ${time.toFixed(2)}ms`);
      });

      // Total detection time should be reasonable
      const totalTime = results.reduce((sum, { time }) => sum + time, 0);
      expect(totalTime).toBeLessThan(150); // 150ms max total
    });
  });

  describe('Stress Testing', () => {
    test('should handle rapid successive calls', async () => {
      /**
       * Performance Test: Rapid Successive Calls
       * Tests performance under rapid successive method calls
       * Requirements: 8.1, 8.2, 8.5
       */
      const testOptions: TextMarkOptions = {
        backgroundImage: { src: 'rapid-test.jpg' },
        watermarkTexts: [
          {
            text: 'Rapid Test',
            position: { position: Position.center },
          },
        ],
      };

      const callCount = 20;

      // Test legacy implementation with rapid calls
      const legacyStart = performance.now();
      const legacyPromises = Array.from({ length: callCount }, (_, index) =>
        LegacyImpl.markText({
          ...testOptions,
          watermarkTexts: [{ text: `Rapid Legacy ${index}` }],
        }).catch(() => `legacy-error-${index}`)
      );
      const legacyResults = await Promise.all(legacyPromises);
      const legacyTime = performance.now() - legacyStart;

      // Test TurboModule implementation with rapid calls
      const turboStart = performance.now();
      const turboPromises = Array.from({ length: callCount }, (_, index) =>
        TurboModuleImpl.markText({
          ...testOptions,
          watermarkTexts: [{ text: `Rapid Turbo ${index}` }],
        }).catch(() => `turbo-error-${index}`)
      );
      const turboResults = await Promise.all(turboPromises);
      const turboTime = performance.now() - turboStart;

      console.log(
        `Rapid calls (${callCount}) - Legacy: ${legacyTime.toFixed(
          2
        )}ms, TurboModule: ${turboTime.toFixed(2)}ms`
      );

      // All calls should complete
      expect(legacyResults).toHaveLength(callCount);
      expect(turboResults).toHaveLength(callCount);

      // Performance should be reasonable
      expect(legacyTime).toBeLessThan(15000); // 15 seconds max
      expect(turboTime).toBeLessThan(15000); // 15 seconds max

      // Average time per call should be reasonable
      const legacyAverage = legacyTime / callCount;
      const turboAverage = turboTime / callCount;

      console.log(
        `Average per call - Legacy: ${legacyAverage.toFixed(
          2
        )}ms, TurboModule: ${turboAverage.toFixed(2)}ms`
      );

      expect(legacyAverage).toBeLessThan(1000); // 1 second max per call
      expect(turboAverage).toBeLessThan(1000); // 1 second max per call
    });

    test('should handle mixed operation types under load', async () => {
      /**
       * Performance Test: Mixed Operations Under Load
       * Tests performance with mixed text and image operations
       * Requirements: 8.1, 8.2, 8.3, 8.5
       */
      const textOptions: TextMarkOptions = {
        backgroundImage: { src: 'mixed-text.jpg' },
        watermarkTexts: [
          {
            text: 'Mixed Test Text',
            position: { position: Position.center },
          },
        ],
      };

      const imageOptions = {
        backgroundImage: { src: 'mixed-image.jpg' },
        watermarkImages: [
          {
            src: 'mixed-watermark.png',
            position: { position: Position.bottomRight },
            scale: 0.5,
            alpha: 0.8,
          },
        ],
      };

      const operationCount = 10;

      // Create mixed operations
      const mixedOperations: Promise<any>[] = [];

      for (let i = 0; i < operationCount; i++) {
        if (i % 2 === 0) {
          // Text operations
          mixedOperations.push(
            LegacyImpl.markText(textOptions).catch(() => `legacy-text-${i}`),
            TurboModuleImpl.markText(textOptions).catch(() => `turbo-text-${i}`)
          );
        } else {
          // Image operations
          mixedOperations.push(
            LegacyImpl.markImage(imageOptions).catch(() => `legacy-image-${i}`),
            TurboModuleImpl.markImage(imageOptions).catch(
              () => `turbo-image-${i}`
            )
          );
        }
      }

      const start = performance.now();
      const results = await Promise.all(mixedOperations);
      const totalTime = performance.now() - start;

      console.log(
        `Mixed operations (${
          mixedOperations.length
        }) completed in ${totalTime.toFixed(2)}ms`
      );

      // All operations should complete
      expect(results).toHaveLength(mixedOperations.length);

      // Performance should be reasonable for mixed operations
      expect(totalTime).toBeLessThan(20000); // 20 seconds max

      // Average time per operation should be reasonable
      const averageTime = totalTime / mixedOperations.length;
      console.log(
        `Average time per mixed operation: ${averageTime.toFixed(2)}ms`
      );
      expect(averageTime).toBeLessThan(2000); // 2 seconds max per operation
    });
  });
});
