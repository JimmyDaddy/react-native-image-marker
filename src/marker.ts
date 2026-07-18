// The default implementation is browser-safe so standard web bundlers and
// server-side rendering can import the package without loading React Native's
// NativeModules. Metro selects marker.native.ts on iOS and Android.
export { default } from './web';
