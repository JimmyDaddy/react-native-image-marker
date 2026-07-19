import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Builder, LocalSigner, Reader } from '@contentauth/c2pa-node';

const TRACE_ASSERTION_LABEL = 'org.corerobin.image-marker.trace.v1';
const SIGNING_ALGORITHMS = new Set([
  'es256',
  'es384',
  'es512',
  'ps256',
  'ps384',
  'ps512',
  'ed25519',
]);

/** @param {string} locator @param {unknown} metadata */
export function createTraceAssertion(locator, metadata) {
  return {
    algorithm: 'dct-qim-v1',
    locator_sha256: createHash('sha256')
      .update(locator, 'utf8')
      .digest('hex'),
    ...(metadata === undefined ? {} : { metadata }),
  };
}

/** @param {unknown} value */
function validationCodes(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) =>
    entry && typeof entry === 'object' && typeof entry.code === 'string'
      ? [entry.code]
      : []
  );
}

/** @param {unknown} value */
function failureCodes(value) {
  if (!value || typeof value !== 'object') return [];
  const activeManifest = /** @type {Record<string, unknown>} */ (value)
    .activeManifest;
  return activeManifest && typeof activeManifest === 'object'
    ? validationCodes(
        /** @type {Record<string, unknown>} */ (activeManifest).failure
      )
    : [];
}

/**
 * @param {{certificate: Buffer, privateKey: Buffer, algorithm?: string, tsaUrl?: string}} options
 */
export function createC2paEngine({
  certificate,
  privateKey,
  algorithm = 'es256',
  tsaUrl,
}) {
  if (!SIGNING_ALGORITHMS.has(algorithm)) {
    throw new Error(`Unsupported C2PA signing algorithm: ${algorithm}.`);
  }
  const signer = LocalSigner.newSigner(
    certificate,
    privateKey,
    /** @type {import('@contentauth/c2pa-node').SigningAlg} */ (algorithm),
    tsaUrl
  );

  return {
    /**
     * @param {{image: Buffer, mimeType: string, locator: string, claim: Record<string, unknown>}} input
     */
    async sign(input) {
      const generator =
        typeof input.claim.generator === 'string'
          ? input.claim.generator
          : 'react-native-image-marker/1.11';
      const builder = Builder.withJson({
        claim_generator_info: [{ name: generator, version: '1.11.0' }],
        title: String(input.claim.title),
        format: input.mimeType,
      });
      builder.addAssertion(
        TRACE_ASSERTION_LABEL,
        JSON.stringify(
          createTraceAssertion(input.locator, input.claim.metadata)
        ),
        'Json'
      );
      const destination = /** @type {import('@contentauth/c2pa-node').DestinationBufferAsset} */ ({
        buffer: null,
      });
      builder.sign(
        signer,
        { buffer: input.image, mimeType: input.mimeType },
        destination
      );
      if (!destination.buffer) {
        throw new Error('C2PA SDK did not return a signed image.');
      }
      const reader = await Reader.fromAsset({
        buffer: destination.buffer,
        mimeType: input.mimeType,
      });
      return {
        image: destination.buffer,
        mimeType: input.mimeType,
        manifestId: reader?.activeLabel(),
      };
    },

    /** @param {{image: Buffer, mimeType: string}} input */
    async verify(input) {
      const reader = await Reader.fromAsset({
        buffer: input.image,
        mimeType: input.mimeType,
      });
      if (!reader) {
        return {
          valid: false,
          validationStatus: ['manifest.missing'],
        };
      }
      const store = reader.json();
      const failures = failureCodes(store.validation_results);
      const statuses = [
        ...validationCodes(store.validation_status),
        ...failures,
      ];
      return {
        valid:
          Boolean(reader.activeLabel()) &&
          store.validation_state !== 'Invalid' &&
          failures.length === 0,
        manifestId: reader.activeLabel(),
        validationStatus: [...new Set(statuses)],
        manifest: reader.getActive(),
      };
    },
  };
}

/** @param {NodeJS.ProcessEnv} [environment] */
export async function createC2paEngineFromEnvironment(
  environment = process.env
) {
  const certificatePath = environment.C2PA_CERT_PATH;
  const privateKeyPath = environment.C2PA_PRIVATE_KEY_PATH;
  if (!certificatePath || !privateKeyPath) {
    throw new Error(
      'C2PA_CERT_PATH and C2PA_PRIVATE_KEY_PATH must point to signing material.'
    );
  }
  const [certificate, privateKey] = await Promise.all([
    readFile(certificatePath),
    readFile(privateKeyPath),
  ]);
  return createC2paEngine({
    certificate,
    privateKey,
    algorithm: environment.C2PA_SIGNING_ALGORITHM ?? 'es256',
    tsaUrl: environment.C2PA_TSA_URL,
  });
}
