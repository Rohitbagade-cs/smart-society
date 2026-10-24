import { Injectable } from '@angular/core';

/**
 * Browser-side face recognition via face-api.js.
 *
 * The library + model weights are bundled under `src/assets/face/` — no CDN
 * at runtime, so ad-blockers / tracking prevention can't break loading.
 *
 * The library detects a face and computes a 128-number descriptor
 * ("fingerprint"). Only the descriptor ever leaves the browser — raw photos
 * are never uploaded or stored. The Django backend compares descriptors
 * with Euclidean distance; a distance under ~0.55 counts as a match.
 */
@Injectable({ providedIn: 'root' })
export class FaceService {
  private readonly LIB_URL = 'assets/face/face-api.min.js';
  private readonly MODEL_URL = 'assets/face/models';

  private loading: Promise<void> | null = null;
  backend = '';

  private get api(): any {
    return (window as any).faceapi;
  }

  get ready(): boolean {
    return !!this.api?.nets?.faceRecognitionNet?.isLoaded;
  }

  /** Loads the library + models (idempotent). Throws on failure. */
  ensureModels(status?: (msg: string) => void): Promise<void> {
    if (this.ready) return Promise.resolve();
    if (!this.loading) {
      this.loading = this.doLoad(status).catch((e) => {
        this.loading = null; // allow a later retry instead of caching the failure
        throw e;
      });
    }
    return this.loading;
  }

  private async doLoad(status?: (msg: string) => void): Promise<void> {
    status?.('Loading face model…');
    await this.loadScript(this.LIB_URL);
    const fa = this.api;
    if (!fa) throw new Error('Face library failed to initialise.');

    // Prefer WebGL; fall back to CPU where WebGL is blocked/unavailable.
    try {
      await fa.tf.setBackend('webgl');
      await fa.tf.ready();
    } catch {
      /* fall through to cpu */
    }
    if (fa.tf.getBackend() !== 'webgl') {
      await fa.tf.setBackend('cpu');
      await fa.tf.ready();
    }
    this.backend = fa.tf.getBackend();

    try {
      await Promise.all([
        fa.nets.tinyFaceDetector.loadFromUri(this.MODEL_URL),
        fa.nets.faceLandmark68Net.loadFromUri(this.MODEL_URL),
        fa.nets.faceRecognitionNet.loadFromUri(this.MODEL_URL),
      ]);
    } catch (e: any) {
      throw new Error('Face model files failed to load: ' + (e?.message || e));
    }
  }

  /** 128-d descriptor for the single face in a live video frame, or null. */
  async descriptorFromVideo(
    video: HTMLVideoElement,
    diag?: (msg: string) => void,
  ): Promise<number[] | null> {
    await this.ensureModels();
    const fa = this.api;
    const attempts = [
      new fa.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }),
      new fa.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 }),
    ];
    for (const opt of attempts) {
      const t0 = performance.now();
      const det = await fa
        .detectSingleFace(video, opt)
        .withFaceLandmarks()
        .withFaceDescriptor();
      diag?.(
        `video detect ${Math.round(performance.now() - t0)}ms (min-score ${opt.scoreThreshold}): ${det ? 'FOUND' : 'none'}`,
      );
      if (det?.descriptor) return Array.from(det.descriptor as Float32Array);
    }
    return null;
  }

  /** 128-d descriptor for the single face in a photo, or null. */
  async descriptorFromImage(
    img: HTMLImageElement,
    diag?: (msg: string) => void,
  ): Promise<number[] | null> {
    await this.ensureModels();
    const fa = this.api;
    const attempts = [
      new fa.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }),
      new fa.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.3 }),
    ];
    for (const opt of attempts) {
      const t0 = performance.now();
      const det = await fa
        .detectSingleFace(img, opt)
        .withFaceLandmarks()
        .withFaceDescriptor();
      diag?.(
        `photo detect ${Math.round(performance.now() - t0)}ms (min-score ${opt.scoreThreshold}): ${det ? 'FOUND' : 'none'}`,
      );
      if (det?.descriptor) return Array.from(det.descriptor as Float32Array);
    }
    return null;
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[data-face-lib]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.setAttribute('data-face-lib', '1');
      s.onload = () => resolve();
      s.onerror = () =>
        reject(new Error('Could not load the face library from the app server.'));
      document.head.appendChild(s);
    });
  }
}
