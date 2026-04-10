import { Buffer } from 'buffer';

// jpeg-js (and other Node-style libs) rely on a global Buffer.
// React Native does not provide one, so we polyfill it here.
// This file must be imported before any jpeg-js usage.
if (typeof globalThis.Buffer === 'undefined') {
  (globalThis as any).Buffer = Buffer;
}
