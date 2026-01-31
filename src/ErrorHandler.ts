/**
 * Unified error handling for both legacy and new architecture implementations
 * Ensures consistent error formats and messages across architectures
 */

export interface StandardError {
  message: string;
  code?: string;
  nativeError?: any;
}

export class ErrorHandler {
  /**
   * Normalizes errors from different sources to a consistent format
   * @param error - Error from native module or TurboModule
   * @param context - Additional context about where the error occurred
   * @returns Standardized Error object
   */
  static normalizeError(error: any, context?: string): Error {
    let message = 'Unknown error occurred';
    let code: string | undefined;

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object') {
      // Handle native module error objects
      if (error.message) {
        message = error.message;
      } else if (error.description) {
        message = error.description;
      } else if (error.localizedDescription) {
        message = error.localizedDescription;
      }

      if (error.code) {
        code = error.code;
      }
    }

    // Add context if provided
    if (context) {
      message = `${context}: ${message}`;
    }

    const standardError = new Error(message);
    if (code) {
      (standardError as any).code = code;
    }

    return standardError;
  }

  /**
   * Validates input parameters and throws standardized errors
   * @param options - Options object to validate
   * @param method - Method name for error context
   */
  static validateInput(options: any, method: string): void {
    if (!options) {
      throw new Error(`${method}: options parameter is required`);
    }

    if (!options.backgroundImage) {
      throw new Error(`${method}: backgroundImage is required`);
    }

    if (!options.backgroundImage.src) {
      throw new Error(`${method}: backgroundImage.src is required`);
    }

    // Method-specific validations
    if (method === 'markText') {
      if (!options.watermarkTexts || !Array.isArray(options.watermarkTexts)) {
        throw new Error(`${method}: watermarkTexts array is required`);
      }

      if (options.watermarkTexts.length === 0) {
        throw new Error(`${method}: watermarkTexts array cannot be empty`);
      }

      // Validate each text watermark
      options.watermarkTexts.forEach((textOption: any, index: number) => {
        if (!textOption.text || typeof textOption.text !== 'string') {
          throw new Error(
            `${method}: watermarkTexts[${index}].text is required and must be a string`
          );
        }
      });
    }

    if (method === 'markImage') {
      if (!options.watermarkImages || !Array.isArray(options.watermarkImages)) {
        throw new Error(`${method}: watermarkImages array is required`);
      }

      if (options.watermarkImages.length === 0) {
        throw new Error(`${method}: watermarkImages array cannot be empty`);
      }

      // Validate each image watermark
      options.watermarkImages.forEach((imageOption: any, index: number) => {
        if (!imageOption.src) {
          throw new Error(
            `${method}: watermarkImages[${index}].src is required`
          );
        }
      });
    }
  }

  /**
   * Wraps async operations with consistent error handling
   * @param operation - Async operation to wrap
   * @param context - Context for error messages
   * @returns Promise with normalized error handling
   */
  static async wrapAsyncOperation<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw this.normalizeError(error, context);
    }
  }

  /**
   * Handles architecture detection failures gracefully
   * @param error - Error from architecture detection
   * @returns boolean indicating fallback to legacy
   */
  static handleArchitectureDetectionError(error: any): boolean {
    console.warn(
      'Architecture detection failed, falling back to legacy bridge:',
      this.normalizeError(error).message
    );
    return false; // Always fallback to legacy on detection failure
  }

  /**
   * Handles TurboModule loading failures
   * @param error - Error from TurboModule loading
   * @returns Error to throw
   */
  static handleTurboModuleLoadError(error: any): Error {
    return this.normalizeError(error, 'TurboModule loading failed');
  }
}
