# TypeScript Usage Guide

This guide provides detailed instructions on how to use the type-safe features of `react-native-image-marker` in TypeScript projects.

## Table of Contents

- [Basic Type Usage](#basic-type-usage)
- [Generic Type System](#generic-type-system)
- [Type Aliases](#type-aliases)
- [Advanced Type Patterns](#advanced-type-patterns)
- [Type Safety Best Practices](#type-safety-best-practices)
- [Common Type Errors](#common-type-errors)

## Basic Type Usage

### Importing Types

```typescript
// Import main API and types
import ImageMarker, {
  // Enum types
  Position,
  ImageFormat,
  TextBackgroundType,
  
  // Interface types
  type TextMarkOptions,
  type ImageMarkOptions,
  type TextStyle,
  type ImageOptions,
  
  // Type aliases
  type StandardTextMarkOptions,
  type StandardImageMarkOptions,
  type StrictTextMarkOptions,
  type URITextMarkOptions,
  
  // Utility classes
  ArchitectureDetector,
  FabricImageLoader,
  ErrorHandler
} from 'react-native-image-marker';
```

### Basic Usage

```typescript
// Using default types (recommended)
const basicOptions: TextMarkOptions = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{
    text: 'Hello World',
    position: { position: Position.center },
    style: {
      fontSize: 20,
      color: '#FFFFFF'
    }
  }]
};

const result = await ImageMarker.markText(basicOptions);
```

## Generic Type System

### Numeric Type Generics

Control the types of coordinates and dimensions:

```typescript
// Numeric coordinates
const numberOptions: TextMarkOptions<number> = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{
    text: 'Number Coordinates',
    position: { X: 100, Y: 200 }, // Must be numbers
    style: {
      fontSize: 24,
      textBackgroundStyle: {
        padding: 10, // Must be number
        cornerRadius: {
          all: { x: 5, y: 5 } // Must be numbers
        }
      }
    }
  }]
};

// String coordinates (supports percentages)
const stringOptions: TextMarkOptions<string> = {
  backgroundImage: { src: 'https://example.com/bg.jpg' },
  watermarkTexts: [{
    text: 'String Coordinates',
    position: { X: '50%', Y: '25%' }, // Can be percentages
    style: {
      fontSize: 24,
      textBackgroundStyle: {
        padding: '5%', // Can be percentage
        cornerRadius: {
          all: { x: '10px', y: '10px' } // Can be strings
        }
      }
    }
  }]
};

// Mixed types (numbers and strings)
const mixedOptions: TextMarkOptions<number | string> = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{
    text: 'Mixed Coordinates',
    position: { X: 100, Y: '50%' }, // Mixed usage
    style: {
      fontSize: 24,
      textBackgroundStyle: {
        padding: 10,
        paddingTop: '5%' // Mixed usage
      }
    }
  }]
};
```

### Image Source Type Generics

Control the types of image sources:

```typescript
// require() image sources
const requireOptions: TextMarkOptions<number, number> = {
  backgroundImage: { src: require('./bg.jpg') }, // Must be require()
  watermarkTexts: [{
    text: 'Require Source',
    position: { X: 100, Y: 200 }
  }]
};

// URI image sources
const uriOptions: TextMarkOptions<string, string> = {
  backgroundImage: { src: 'https://example.com/bg.jpg' }, // Must be string URI
  watermarkTexts: [{
    text: 'URI Source',
    position: { X: '50%', Y: '25%' }
  }]
};

// Any image source
const anyOptions: TextMarkOptions<number, any> = {
  backgroundImage: { 
    src: require('./bg.jpg') // Can be any type
    // or src: 'https://example.com/bg.jpg'
    // or src: { uri: 'https://example.com/bg.jpg' }
    // or src: { data: 'base64string' }
  },
  watermarkTexts: [{
    text: 'Any Source',
    position: { X: 100, Y: 200 }
  }]
};
```
## Type Aliases

To simplify usage, predefined type aliases are provided:

### Standard Type Aliases

```typescript
// Most commonly used combination
type StandardTextMarkOptions = TextMarkOptions<number, any>;
type StandardImageMarkOptions = ImageMarkOptions<number, any>;

const standardOptions: StandardTextMarkOptions = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{
    text: 'Standard',
    position: { X: 100, Y: 200 } // Numeric coordinates
  }]
};
```

### Strict Type Aliases

```typescript
// Strict type constraints
type StrictTextMarkOptions = TextMarkOptions<number, number>;
type StrictImageMarkOptions = ImageMarkOptions<number, number>;

const strictOptions: StrictTextMarkOptions = {
  backgroundImage: { src: require('./bg.jpg') }, // Must be require()
  watermarkTexts: [{
    text: 'Strict',
    position: { X: 100, Y: 200 } // Must be numbers
  }]
};
```

### URI Type Aliases

```typescript
// URI and percentage coordinates
type URITextMarkOptions = TextMarkOptions<string, string>;
type URIImageMarkOptions = ImageMarkOptions<string, string>;

const uriOptions: URITextMarkOptions = {
  backgroundImage: { src: 'https://example.com/bg.jpg' }, // Must be string URI
  watermarkTexts: [{
    text: 'URI',
    position: { X: '50%', Y: '25%' } // Can be percentages
  }]
};
```

## Advanced Type Patterns

### Conditional Types

```typescript
// Infer output types based on input types
type InferNumericType<T> = T extends TextMarkOptions<infer N, any> ? N : number;
type InferSourceType<T> = T extends TextMarkOptions<any, infer S> ? S : any;

// Usage example
type MyOptionsType = TextMarkOptions<string, number>;
type MyNumericType = InferNumericType<MyOptionsType>; // string
type MySourceType = InferSourceType<MyOptionsType>; // number
```

### Utility Types

```typescript
// Extract specific parts of types
type BackgroundImageType<T extends TextMarkOptions<any, any>> = T['backgroundImage'];
type WatermarkTextType<T extends TextMarkOptions<any, any>> = T['watermarkTexts'][0];

// Usage example
type MyOptions = StandardTextMarkOptions;
type MyBackgroundImage = BackgroundImageType<MyOptions>; // ImageOptions<any>
type MyWatermarkText = WatermarkTextType<MyOptions>; // TextOptions<number>
```

### Mapped Types

```typescript
// Create optional version of types
type PartialTextMarkOptions<T extends NumericValue = number, S = any> = {
  [K in keyof TextMarkOptions<T, S>]?: TextMarkOptions<T, S>[K];
};

// Create readonly version of types
type ReadonlyTextMarkOptions<T extends NumericValue = number, S = any> = {
  readonly [K in keyof TextMarkOptions<T, S>]: TextMarkOptions<T, S>[K];
};
```
## Type Safety Best Practices

### 1. Use Type Aliases

```typescript
// Good practice: Use predefined type aliases
const options: StandardTextMarkOptions = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{ text: 'Hello' }]
};

// Avoid: Direct use of complex generic types
const options2: TextMarkOptions<number, any> = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{ text: 'Hello' }]
};
```

### 2. Create Type-Safe Utility Functions

```typescript
// Create type-safe builder functions
function createTextWatermark(
  text: string,
  position: { X: number; Y: number },
  style?: Partial<TextStyle<number>>
): StandardTextMarkOptions {
  return {
    backgroundImage: { src: require('./default-bg.jpg') },
    watermarkTexts: [{
      text,
      position,
      style: {
        fontSize: 20,
        color: '#FFFFFF',
        ...style
      }
    }]
  };
}

// Usage
const watermark = createTextWatermark('Hello', { X: 100, Y: 200 }, {
  bold: true,
  fontSize: 24
});
```

### 3. Use Type Guards

```typescript
// Type guard functions
function isStandardOptions(options: any): options is StandardTextMarkOptions {
  return options && 
         options.backgroundImage && 
         Array.isArray(options.watermarkTexts);
}

function isURIOptions(options: any): options is URITextMarkOptions {
  return options && 
         options.backgroundImage && 
         typeof options.backgroundImage.src === 'string' &&
         options.backgroundImage.src.startsWith('http');
}

// Using type guards
function processOptions(options: unknown) {
  if (isStandardOptions(options)) {
    // TypeScript knows options is StandardTextMarkOptions here
    return ImageMarker.markText(options);
  } else if (isURIOptions(options)) {
    // TypeScript knows options is URITextMarkOptions here
    return ImageMarker.markText(options);
  } else {
    throw new Error('Invalid options');
  }
}
```

### 4. Use Generic Constraints

```typescript
// Constrain generic parameters
function createWatermarkWithConstraints<
  T extends NumericValue,
  S extends string | number
>(
  backgroundSrc: ImageSource<S>,
  text: string,
  position: PositionOptions<T>
): TextMarkOptions<T, S> {
  return {
    backgroundImage: { src: backgroundSrc },
    watermarkTexts: [{
      text,
      position
    }]
  };
}

// Usage
const numberWatermark = createWatermarkWithConstraints(
  require('./bg.jpg'), // S inferred as number
  'Hello',
  { X: 100, Y: 200 } // T inferred as number
);

const stringWatermark = createWatermarkWithConstraints(
  'https://example.com/bg.jpg', // S inferred as string
  'Hello',
  { X: '50%', Y: '25%' } // T inferred as string
);
```

### 5. Type-Safe Error Handling

```typescript
// Type-safe error handling
async function safeMarkText(
  options: StandardTextMarkOptions
): Promise<{ success: true; result: string } | { success: false; error: Error }> {
  try {
    const result = await ImageMarker.markText(options);
    return { success: true, result };
  } catch (error) {
    const normalizedError = ErrorHandler.normalizeError(error, 'markText');
    return { success: false, error: normalizedError };
  }
}

// Usage
const result = await safeMarkText(options);
if (result.success) {
  console.log('Success:', result.result); // TypeScript knows result property exists
} else {
  console.error('Failed:', result.error.message); // TypeScript knows error property exists
}
```
## Common Type Errors

### 1. Coordinate Type Mismatch

```typescript
// ❌ Wrong: Mixing number and string types
const badOptions: TextMarkOptions<number> = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{
    text: 'Bad',
    position: { X: 100, Y: '50%' } // Error: Y should be number
  }]
};

// ✅ Correct: Use union types
const goodOptions: TextMarkOptions<number | string> = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{
    text: 'Good',
    position: { X: 100, Y: '50%' } // Correct: supports mixed types
  }]
};
```

### 2. Image Source Type Mismatch

```typescript
// ❌ Wrong: Image source type mismatch
const badOptions: StrictTextMarkOptions = {
  backgroundImage: { src: 'https://example.com/bg.jpg' }, // Error: should be require()
  watermarkTexts: [{ text: 'Bad' }]
};

// ✅ Correct: Use correct image source type
const goodOptions: StrictTextMarkOptions = {
  backgroundImage: { src: require('./bg.jpg') }, // Correct: use require()
  watermarkTexts: [{ text: 'Good' }]
};
```

### 3. Missing Required Properties

```typescript
// ❌ Wrong: Missing required properties
const badOptions: TextMarkOptions = {
  backgroundImage: { src: require('./bg.jpg') },
  // Error: missing watermarkTexts
};

// ✅ Correct: Include all required properties
const goodOptions: TextMarkOptions = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{ text: 'Good' }] // Correct: include required property
};
```

### 4. Misuse of Type Assertions

```typescript
// ❌ Wrong: Unsafe type assertion
const unsafeOptions = {
  backgroundImage: { src: 'invalid' },
  // Missing watermarkTexts
} as TextMarkOptions; // Dangerous: bypasses type checking

// ✅ Correct: Use type guards or proper type definitions
const safeOptions: TextMarkOptions = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{ text: 'Safe' }]
};
```

### 5. Generic Parameter Inference Errors

```typescript
// ❌ Wrong: Generic parameter inference incorrect
function badFunction<T>(options: TextMarkOptions<T>) {
  // Error: T type cannot be inferred correctly
  return options;
}

// ✅ Correct: Provide default generic parameters or constraints
function goodFunction<T extends NumericValue = number>(
  options: TextMarkOptions<T>
): TextMarkOptions<T> {
  return options;
}
```

## Debugging Type Issues

### Using TypeScript Compiler

```bash
# Check type errors
npx tsc --noEmit

# View type inference
npx tsc --noEmit --pretty
```

### Using IDE Features

```typescript
// Use TypeScript's type queries
type WhatIsThisType = typeof ImageMarker.markText; // View function type
type WhatAreTheseOptions = Parameters<typeof ImageMarker.markText>[0]; // View parameter type
type WhatIsTheReturnType = ReturnType<typeof ImageMarker.markText>; // View return type

// Use type assertions for debugging
const debugOptions = {} as TextMarkOptions;
// IDE will show complete structure of TextMarkOptions
```

### Type Testing

```typescript
// Create type tests to verify type correctness
type AssertEqual<T, U> = T extends U ? (U extends T ? true : false) : false;

// Test type aliases are correct
type TestStandardOptions = AssertEqual<
  StandardTextMarkOptions,
  TextMarkOptions<number, any>
>; // Should be true

type TestURIOptions = AssertEqual<
  URITextMarkOptions,
  TextMarkOptions<string, string>
>; // Should be true
```

By following these TypeScript best practices, you can fully leverage the type-safe features of `react-native-image-marker` to write more reliable and maintainable code.