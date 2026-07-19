/** @param {string} image */
function parseDataUrl(image) {
  const match = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/]+={0,2})$/u.exec(
    image
  );
  if (!match) {
    throw new Error('The example adapter requires a JPEG or PNG data URL.');
  }
  return { mimeType: match[1], base64: match[2] };
}

/** @param {Response} response */
async function readResponse(response) {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(
      body && typeof body.error === 'string'
        ? body.error
        : `C2PA service returned HTTP ${response.status}.`
    );
  }
  return body;
}

/**
 * Creates an adapter compatible with Marker.embedInvisibleWithCredentials().
 * This example intentionally accepts data URLs only; native file URI upload
 * policy belongs in the application.
 *
 * @param {{baseUrl: string, fetch?: typeof globalThis.fetch}} options
 */
export function createHttpContentCredentialsAdapter({
  baseUrl,
  fetch: request = globalThis.fetch,
}) {
  if (typeof request !== 'function') {
    throw new Error('A fetch implementation is required.');
  }
  const endpoint = baseUrl.replace(/\/$/u, '');
  return {
    /**
     * @param {{image: string, locator: string, algorithm: string, claim: Record<string, unknown>}} input
     */
    async sign(input) {
      const image = parseDataUrl(input.image);
      const body = await readResponse(
        await request(`${endpoint}/sign`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            image,
            locator: input.locator,
            algorithm: input.algorithm,
            claim: input.claim,
          }),
        })
      );
      return {
        image: `data:${body.image.mimeType};base64,${body.image.base64}`,
        manifestId: body.manifestId,
      };
    },
    /** @param {string} imageUrl */
    async verify(imageUrl) {
      const image = parseDataUrl(imageUrl);
      return readResponse(
        await request(`${endpoint}/verify`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ image }),
        })
      );
    },
  };
}
