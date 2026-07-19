import type { EmbedInvisibleWatermarkOptions } from './invisible-watermark';
import { INVISIBLE_WATERMARK_ALGORITHM } from './invisible-watermark';

export interface ContentCredentialsClaim {
  /** Human-readable asset title included in the signed manifest. */
  title: string;
  /** Encoded image type. The v1.11 workflow supports JPEG and PNG. */
  format?: 'image/jpeg' | 'image/png';
  /** Claim generator name shown by Content Credentials readers. */
  generator?: string;
  /** Adapter-specific public metadata. Never include signing secrets. */
  metadata?: Readonly<Record<string, unknown>>;
}

export interface ContentCredentialsSignRequest {
  /** Image already containing the invisible locator. */
  image: string;
  /** Locator used to correlate the signed record. */
  locator: string;
  /** Pixel algorithm that wrote the locator. */
  algorithm: typeof INVISIBLE_WATERMARK_ALGORITHM;
  claim: ContentCredentialsClaim;
}

export interface ContentCredentialsSignResult {
  /** Image containing the signed Content Credential. */
  image: string;
  manifestId?: string;
}

export interface ContentCredentialsVerificationResult {
  valid: boolean;
  manifestId?: string;
  validationStatus?: readonly string[];
  manifest?: unknown;
}

export interface ContentCredentialsAdapter {
  sign(
    request: ContentCredentialsSignRequest
  ): Promise<ContentCredentialsSignResult>;
  verify(image: string): Promise<ContentCredentialsVerificationResult>;
}

export interface EmbedInvisibleWithCredentialsOptions {
  watermark: EmbedInvisibleWatermarkOptions;
  adapter: ContentCredentialsAdapter;
  claim: ContentCredentialsClaim;
}

export interface EmbedInvisibleWithCredentialsResult {
  watermarkedImage: string;
  signedImage: string;
  manifestId?: string;
}

export interface VerifyContentCredentialsOptions {
  image: string;
  adapter: ContentCredentialsAdapter;
}

function validateAdapter(
  adapter: ContentCredentialsAdapter
): ContentCredentialsAdapter {
  if (
    !adapter ||
    typeof adapter.sign !== 'function' ||
    typeof adapter.verify !== 'function'
  ) {
    throw new Error(
      'Content Credentials adapter must provide sign() and verify() functions.'
    );
  }
  return adapter;
}

function snapshotClaim(
  claim: ContentCredentialsClaim
): ContentCredentialsClaim {
  if (!claim || typeof claim.title !== 'string' || !claim.title.trim()) {
    throw new Error('Content Credentials claim title must not be empty.');
  }
  if (
    claim.format !== undefined &&
    claim.format !== 'image/jpeg' &&
    claim.format !== 'image/png'
  ) {
    throw new Error(
      'Content Credentials claim format must be image/jpeg or image/png.'
    );
  }
  if (
    claim.generator !== undefined &&
    (typeof claim.generator !== 'string' || !claim.generator.trim())
  ) {
    throw new Error(
      'Content Credentials claim generator must be a non-empty string.'
    );
  }
  if (
    claim.metadata !== undefined &&
    (!claim.metadata ||
      typeof claim.metadata !== 'object' ||
      Array.isArray(claim.metadata))
  ) {
    throw new Error('Content Credentials claim metadata must be an object.');
  }
  return {
    title: claim.title.trim(),
    format: claim.format,
    generator: claim.generator?.trim(),
    metadata: claim.metadata ? { ...claim.metadata } : undefined,
  };
}

function validateSignResult(
  result: ContentCredentialsSignResult
): ContentCredentialsSignResult {
  if (!result || typeof result.image !== 'string' || !result.image) {
    throw new Error(
      'Content Credentials adapter returned an invalid signed image.'
    );
  }
  if (
    result.manifestId !== undefined &&
    typeof result.manifestId !== 'string'
  ) {
    throw new Error(
      'Content Credentials adapter returned an invalid manifest ID.'
    );
  }
  return result;
}

function validateVerificationResult(
  result: ContentCredentialsVerificationResult
): ContentCredentialsVerificationResult {
  if (!result || typeof result.valid !== 'boolean') {
    throw new Error(
      'Content Credentials adapter returned an invalid verification result.'
    );
  }
  if (
    result.manifestId !== undefined &&
    typeof result.manifestId !== 'string'
  ) {
    throw new Error(
      'Content Credentials adapter returned an invalid manifest ID.'
    );
  }
  if (
    result.validationStatus !== undefined &&
    (!Array.isArray(result.validationStatus) ||
      result.validationStatus.some((status) => typeof status !== 'string'))
  ) {
    throw new Error(
      'Content Credentials adapter returned invalid validation status data.'
    );
  }
  return result;
}

export async function embedInvisibleWithCredentials(
  embed: (options: EmbedInvisibleWatermarkOptions) => Promise<string>,
  options: EmbedInvisibleWithCredentialsOptions
): Promise<EmbedInvisibleWithCredentialsResult> {
  const adapter = validateAdapter(options?.adapter);
  const claim = snapshotClaim(options?.claim);
  const watermark = {
    ...options.watermark,
    image: { ...options.watermark?.image },
  };
  const locator = watermark.payload;
  const watermarkedImage = await embed(watermark);
  const signed = validateSignResult(
    await adapter.sign({
      image: watermarkedImage,
      locator,
      algorithm: INVISIBLE_WATERMARK_ALGORITHM,
      claim,
    })
  );
  const result: EmbedInvisibleWithCredentialsResult = {
    watermarkedImage,
    signedImage: signed.image,
  };
  if (signed.manifestId !== undefined) {
    result.manifestId = signed.manifestId;
  }
  return result;
}

export async function verifyContentCredentials(
  options: VerifyContentCredentialsOptions
): Promise<ContentCredentialsVerificationResult> {
  const adapter = validateAdapter(options?.adapter);
  if (typeof options?.image !== 'string' || !options.image) {
    throw new Error('Content Credentials image must not be empty.');
  }
  return validateVerificationResult(await adapter.verify(options.image));
}
