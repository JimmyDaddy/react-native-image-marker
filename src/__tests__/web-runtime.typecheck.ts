import { createWebMarker } from '../web';

const marker = createWebMarker({
  resources: {
    createImage: () => new Image(),
    createCanvas: () => document.createElement('canvas'),
    createObjectURL: URL.createObjectURL,
    revokeObjectURL: URL.revokeObjectURL,
    readBlobBytes: (blob) => blob.arrayBuffer(),
  },
});

export const capabilities = marker.capabilities;
export const disposal: Promise<void> = marker.dispose();
