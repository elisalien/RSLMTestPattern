import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { generateComposition, renderCompositionInto, GeneratorOptions } from '../utils/pattern-generator';
import {
  LOOP_DURATION_MS,
  ResolumeSetup,
  SliceData,
  OutputResolution,
  DEFAULT_OVERLAY_SETTINGS,
  DEFAULT_DECORATIVE_SETTINGS,
  DEFAULT_LOGO_SETTINGS,
} from '../types';

type StoreState = ReturnType<typeof useStore.getState>;

function getScaledSlices(
  setup: ResolumeSetup,
  dims: { width: number; height: number },
  outputResolution: OutputResolution,
): SliceData[] {
  const compW = setup.compositionSize?.width || 0;
  const compH = setup.compositionSize?.height || 0;

  // If there's no meaningful composition size, just return slices as-is
  if (outputResolution.id === 'original' || compW <= 0 || compH <= 0) {
    return setup.slices;
  }

  const sx = dims.width / compW;
  const sy = dims.height / compH;
  if (!isFinite(sx) || !isFinite(sy)) return setup.slices;

  return setup.slices.map((s) => ({
    ...s,
    x: Math.round(s.x * sx),
    y: Math.round(s.y * sy),
    width: Math.max(1, Math.round(s.width * sx)),
    height: Math.max(1, Math.round(s.height * sy)),
  }));
}

function buildOptions(s: StoreState, animProgress?: number): GeneratorOptions {
  return {
    template: s.template,
    graphicPreset: s.graphicPreset,
    gridSize: s.gridSize,
    showLabels: s.showLabels,
    showSafeZones: s.showSafeZones,
    logo: s.logo,
    logoSettings: s.logoSettings || DEFAULT_LOGO_SETTINGS,
    extraLogos: s.extraLogos || [],
    decorativeSettings: s.decorativeSettings || DEFAULT_DECORATIVE_SETTINGS,
    globalOverlay: s.globalOverlay,
    overlaySettings: s.overlaySettings || DEFAULT_OVERLAY_SETTINGS,
    sliceOverlays: s.sliceOverlays,
    brandName: s.brandName,
    animationPreset: s.animationPreset,
    animationProgress: animProgress,
  };
}

export function Preview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const setup = useStore(s => s.resolumeSetup);
  const template = useStore(s => s.template);
  const graphicPreset = useStore(s => s.graphicPreset);
  const gridSize = useStore(s => s.gridSize);
  const showLabels = useStore(s => s.showLabels);
  const showSafeZones = useStore(s => s.showSafeZones);
  const logo = useStore(s => s.logo);
  const logoSettings = useStore(s => s.logoSettings);
  const globalOverlay = useStore(s => s.globalOverlay);
  const overlaySettings = useStore(s => s.overlaySettings);
  const sliceOverlays = useStore(s => s.sliceOverlays);
  const brandName = useStore(s => s.brandName);
  const outputResolution = useStore(s => s.outputResolution);
  const customWidth = useStore(s => s.customWidth);
  const customHeight = useStore(s => s.customHeight);
  const getDims = useStore(s => s.getOutputDimensions);
  const disabledSlices = useStore(s => s.disabledSlices);
  const animationPreset = useStore(s => s.animationPreset);
  const animationSpeed = useStore(s => s.animationSpeed);
  const decorativeSettings = useStore(s => s.decorativeSettings);
  const extraLogos = useStore(s => s.extraLogos);

  const hasAnimation = animationPreset !== 'none' || decorativeSettings.animated;

  const renderFrame = useCallback((progress?: number) => {
    if (!setup || !canvasRef.current) return;

    const dims = getDims();
    if (!dims || dims.width <= 0 || dims.height <= 0) return;

    const allSlices = getScaledSlices(setup, dims, outputResolution);
    const slices = allSlices.filter((s) => !disabledSlices.has(s.id));

    const options = buildOptions(useStore.getState(), progress);

    const canvas = canvasRef.current;
    if (canvas.width !== dims.width || canvas.height !== dims.height) {
      canvas.width = dims.width;
      canvas.height = dims.height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const offscreen = generateComposition(slices, dims.width, dims.height, options);
      ctx.clearRect(0, 0, dims.width, dims.height);
      ctx.drawImage(offscreen, 0, 0);
    } catch (err) {
      console.error('Preview render failed:', err);
      // Paint an obvious fallback so the canvas isn't silently blank
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, dims.width, dims.height);
      ctx.fillStyle = '#ff4466';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Render error — check console', dims.width / 2, dims.height / 2);
    }
  }, [setup, getDims, outputResolution, disabledSlices]);

  useEffect(() => {
    if (!setup) return;

    if (hasAnimation) {
      startTimeRef.current = performance.now();

      const animate = (time: number) => {
        const elapsed = time - startTimeRef.current;
        const progress = (elapsed * animationSpeed / LOOP_DURATION_MS) % 1;
        renderFrame(progress);
        animRef.current = requestAnimationFrame(animate);
      };

      animRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animRef.current);
    } else {
      renderFrame(undefined);
    }
  }, [setup, template, graphicPreset, gridSize, showLabels, showSafeZones, logo, logoSettings,
      globalOverlay, overlaySettings, sliceOverlays, brandName, outputResolution, customWidth, customHeight,
      getDims, disabledSlices, animationPreset, animationSpeed, hasAnimation, renderFrame,
      decorativeSettings, extraLogos]);

  if (!setup) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 preview-responsive">
        <div className="text-center px-4">
          <div className="text-5xl mb-4">📐</div>
          <p className="text-lg font-medium text-gray-400">Import a Resolume XML to start</p>
          <p className="text-sm mt-1">Drag & drop or use the sidebar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-950/50 preview-responsive">
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full object-contain rounded border border-gray-700/50 shadow-2xl"
        style={{ imageRendering: 'auto' }}
      />
    </div>
  );
}

/** Export composition as PNG */
export function exportComposition() {
  const s = useStore.getState();
  const { resolumeSetup: setup } = s;
  if (!setup) return;

  const dims = s.getOutputDimensions();
  const allSlices = getScaledSlices(setup, dims, s.outputResolution);
  const slices = allSlices.filter((sl) => !s.disabledSlices.has(sl.id));

  const options = buildOptions(s);

  const canvas = generateComposition(slices, dims.width, dims.height, options);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const label = s.viewMode === 'output' ? 'Output' : 'Input';
    a.download = `${s.brandName || setup.name}_${s.template}_${label}_${dims.width}x${dims.height}.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

/** Export composition as a looping MP4 video.
 *
 * Implementation uses WebCodecs VideoEncoder + mp4-muxer when available. This
 * gives frame-accurate, deterministic output at 60 fps: PTS are controlled
 * explicitly so encoding speed is decoupled from wall-clock time — fixes the
 * stutter previously caused by MediaRecorder + captureStream(0)+requestFrame()
 * where frame timestamps came from `performance.now()` at the moment of
 * capture (variable render cost ⇒ uneven playback).
 *
 * Falls back to MediaRecorder/WebM on browsers without WebCodecs.
 */
const EXPORT_FPS = 60;
const EXPORT_BITRATE = 20_000_000; // 20 Mbps — high quality for test patterns

export async function exportVideo() {
  const s = useStore.getState();
  const { resolumeSetup: setup } = s;
  if (!setup) return;

  s.setIsExporting(true);

  try {
    const dims = s.getOutputDimensions();
    const allSlices = getScaledSlices(setup, dims, s.outputResolution);
    const slices = allSlices.filter((sl) => !s.disabledSlices.has(sl.id));

    const totalFrames = Math.round((LOOP_DURATION_MS / 1000) * EXPORT_FPS);

    // Single reusable canvas for encoding
    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = dims.width;
    renderCanvas.height = dims.height;
    const renderCtx = renderCanvas.getContext('2d', { alpha: false })!;

    const label = s.viewMode === 'output' ? 'Output' : 'Input';
    const baseName = `${s.brandName || setup.name}_${s.template}_${label}_${dims.width}x${dims.height}_loop`;

    const renderFrameAt = (frame: number) => {
      const progress = (frame * s.animationSpeed / totalFrames) % 1;
      const options = buildOptions(s, progress);
      renderCompositionInto(renderCtx, slices, dims.width, dims.height, options);
    };

    if (webCodecsAvailable()) {
      await exportViaWebCodecs(renderCanvas, renderFrameAt, dims, totalFrames, baseName);
    } else {
      await exportViaMediaRecorder(renderCanvas, renderFrameAt, totalFrames, baseName);
    }
  } catch (err) {
    console.error('Video export failed:', err);
    alert('Video export failed. See console for details.\nFor best results, use Chrome, Edge, or Safari 16.4+.');
  } finally {
    s.setIsExporting(false);
  }
}

function webCodecsAvailable(): boolean {
  return typeof window !== 'undefined'
    && 'VideoEncoder' in window
    && 'VideoFrame' in window;
}

/** Primary path: WebCodecs H.264 in MP4 — frame-perfect, fast, Resolume-friendly. */
async function exportViaWebCodecs(
  canvas: HTMLCanvasElement,
  renderFrameAt: (frame: number) => void,
  dims: { width: number; height: number },
  totalFrames: number,
  baseName: string,
) {
  // Dynamic import keeps mp4-muxer out of the initial bundle
  const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');

  // Try H.264 first (best compatibility, especially for Resolume/Premiere/etc.),
  // then fall through to other codecs. Most desktop browsers support avc1 via
  // hardware or software. We use a conservative High@L5.1 profile descriptor
  // good up to ~4K@60.
  const codecCandidates: Array<{ codec: 'avc' | 'vp9' | 'av1'; webCodec: string }> = [
    { codec: 'avc', webCodec: 'avc1.640033' }, // H.264 High@L5.1
    { codec: 'avc', webCodec: 'avc1.4d0034' }, // H.264 Main@L5.2
    { codec: 'avc', webCodec: 'avc1.42e01f' }, // H.264 Baseline@L3.1 (fallback)
    { codec: 'vp9', webCodec: 'vp09.00.50.08' },
    { codec: 'av1', webCodec: 'av01.0.08M.08' },
  ];

  let selected: { codec: 'avc' | 'vp9' | 'av1'; webCodec: string } | null = null;
  for (const cand of codecCandidates) {
    try {
      const { supported } = await VideoEncoder.isConfigSupported({
        codec: cand.webCodec,
        width: dims.width,
        height: dims.height,
        bitrate: EXPORT_BITRATE,
        framerate: EXPORT_FPS,
      });
      if (supported) {
        selected = cand;
        break;
      }
    } catch { /* try next */ }
  }

  if (!selected) {
    // No encoder available — degrade to MediaRecorder path
    await exportViaMediaRecorder(canvas, renderFrameAt, totalFrames, baseName);
    return;
  }

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec: selected.codec,
      width: dims.width,
      height: dims.height,
      frameRate: EXPORT_FPS,
    },
    fastStart: 'in-memory',
  });

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { throw e; },
  });

  encoder.configure({
    codec: selected.webCodec,
    width: dims.width,
    height: dims.height,
    bitrate: EXPORT_BITRATE,
    framerate: EXPORT_FPS,
    // H.264 avc format matches what the muxer expects by default
    ...(selected.codec === 'avc' ? { avc: { format: 'avc' } } : {}),
  });

  const frameDurationUs = Math.round(1_000_000 / EXPORT_FPS);
  // Keyframe every ~1s keeps seeking snappy without hurting size much for 5s loops
  const keyframeInterval = EXPORT_FPS;

  for (let frame = 0; frame < totalFrames; frame++) {
    renderFrameAt(frame);

    const timestamp = frame * frameDurationUs;
    const videoFrame = new VideoFrame(canvas, {
      timestamp,
      duration: frameDurationUs,
    });

    encoder.encode(videoFrame, { keyFrame: frame % keyframeInterval === 0 });
    videoFrame.close();

    // Back-pressure: if the encoder queue gets long, yield so the browser
    // can flush. This keeps memory bounded and the UI responsive.
    if (encoder.encodeQueueSize > 8) {
      await new Promise<void>((resolve) => {
        const check = () => {
          if (encoder.encodeQueueSize <= 2) resolve();
          else setTimeout(check, 8);
        };
        check();
      });
    } else if (frame % 10 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  await encoder.flush();
  encoder.close();
  muxer.finalize();

  const { buffer } = muxer.target;
  const blob = new Blob([buffer], { type: 'video/mp4' });
  downloadBlob(blob, `${baseName}.mp4`);
}

/** Fallback path: MediaRecorder/WebM (older browsers without WebCodecs). */
async function exportViaMediaRecorder(
  canvas: HTMLCanvasElement,
  renderFrameAt: (frame: number) => void,
  totalFrames: number,
  baseName: string,
) {
  const mimeCandidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';

  const stream = (canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream })
    .captureStream(0);
  const videoTrack = stream.getVideoTracks()[0];

  const recorderOptions: MediaRecorderOptions = { videoBitsPerSecond: EXPORT_BITRATE };
  if (mimeType) recorderOptions.mimeType = mimeType;

  const recorder = new MediaRecorder(stream, recorderOptions);
  const actualMime = recorder.mimeType || 'video/webm';
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const done = new Promise<void>((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: actualMime });
      const ext = actualMime.includes('webm') ? 'webm' : 'mp4';
      downloadBlob(blob, `${baseName}.${ext}`);
      resolve();
    };
  });

  recorder.start(200);

  for (let frame = 0; frame < totalFrames; frame++) {
    renderFrameAt(frame);
    const rf = (videoTrack as unknown as { requestFrame?: () => void }).requestFrame;
    if (typeof rf === 'function') rf.call(videoTrack);
    await new Promise((r) => setTimeout(r, 0));
  }

  await new Promise((r) => setTimeout(r, 100));
  recorder.stop();
  await done;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
