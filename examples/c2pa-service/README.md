# C2PA service example

This independent Node.js 22 example adds a signed C2PA Content Credential **after** `react-native-image-marker` has embedded its invisible locator. It is not installed with the main package.

The service deliberately uses a C2PA hard binding. `dct-qim-v1` is not registered in the C2PA Soft Binding Algorithm List, so the example does not emit `c2pa.watermarked` or a standard soft-binding assertion. Instead, the private `org.corerobin.image-marker.trace.v1` assertion stores the algorithm name and `SHA-256(locator)`, never the locator itself.

## Run

```sh
npm install
export C2PA_CERT_PATH=/secure/path/certificate.pem
export C2PA_PRIVATE_KEY_PATH=/secure/path/private-key.pem
export C2PA_TSA_URL=https://timestamp.example.com # optional
npm start
```

The signing certificate must be suitable for C2PA. `C2PA_SIGNING_ALGORITHM` defaults to `es256`. Never commit private signing material or expose this example without your own authentication, rate limiting, TLS, audit logging, and origin policy.

The service exposes `POST /sign` and `POST /verify` with JSON/base64 JPEG or PNG bodies. `src/client-adapter.mjs` provides a data-URL adapter for `Marker.embedInvisibleWithCredentials()` and `Marker.verifyContentCredentials()`.

```js
import Marker from 'react-native-image-marker';
import { createHttpContentCredentialsAdapter } from './src/client-adapter.mjs';

const adapter = createHttpContentCredentialsAdapter({
  baseUrl: 'https://credentials.example.com',
});

const result = await Marker.embedInvisibleWithCredentials({
  watermark: {
    image: { src: inputDataUrl },
    payload: 'asset-42',
    key: process.env.WATERMARK_KEY,
    saveFormat: 'png',
  },
  claim: { title: 'asset-42.png', format: 'image/png' },
  adapter,
});
```

The sample adapter accepts data URLs only. Native file upload, authentication, retry policy, and locator-to-record storage belong in the application.
