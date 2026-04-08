import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { generateComposition, renderCompositionInto, GeneratorOptions } from '../utils/pattern-generator';
import { LOOP_DURATION_MS } from '../types';

function getScaledSlices(setup: any, dims: any, outputResolution: any) {
  let slices = setup.slices;
  if (outputResolution.id !== 'original') {
    const sx = dims.width / setup.compositionSize.width;
    const sy = dims.height / setup.compositionSize.height;
    slices = setup.slices.map((s: any) => ({
      ...s,
      x: Math.round(s.x * sx),
      y: Math.round(s.y * sy),
      width: Math.round(s.width * sx),
      height: Math.round(s.height * sy),
    }));
  }
  return slices;
}

function buildOptions(s: any, animProgress?: number): GeneratorOptions {
  return {
    template: s.template,
    graphicPreset: s.graphicPreset,
    gridSize: s.gridSize,
    showLabels: s.showLabels,
    showSafeZones: s.showSafeZones,
    logo: s.logo,
    logoSettings: s.logoSettings,
    extraLogos: s.extraLogos || [],
    decorativeSettings: s.decorativeSettings || { enabled: [], density: 2, size: 100, opacity: 40, animated: false, animSpeed: 1, durationMs: 3000 },
    globalOverlay: s.globalOverlay,
    overlaySettings: s.overlaySettings,
    sliceOverlays: s.sliceOverlays,
    brandName: s.brandName,
    animationPreset: s.animationPreset,
    videoPreset: s.videoPreset,
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
  const videoPreset = useStore(s => s.videoPreset);
  const animationSpeed = useStore(s => s.animationSpeed);
  const decorativeSettings = useStore(s => s.decorativeSettings);
  const extraLogos = useStore(s => s.extraLogos);

  const hasAnimation = animationPreset !== 'none' || videoPreset !== 'none' || decorativeSettings.animated;

  const renderFrame = useCallback((progress?: number) => {
    if (!setup || !canvasRef.current) return;

    const dims = getDims();
    const allSlices = getScaledSlices(setup, dims, outputResolution);
    const slices = allSlices.filter((s: any) => !disabledSlices.has(s.id));

    const options = buildOptions(useStore.getState(), progress);

    const canvas = canvasRef.current;
    if (canvas.width !== dims.width || canvas.height !== dims.height) {
      canvas.width = dims.width;
      canvas.height = dims.height;
    }

    // Render directly into the visible canvas context
    const offscreen = generateComposition(slices, dims.width, dims.height, options);
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, dims.width, dims.height);
    ctx.drawImage(offscreen, 0, 0);
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
      getDims, disabledSlices, animationPreset, videoPreset, animationSpeed, hasAnimation, renderFrame,
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
  const slices = allSlices.filter((sl: any) => !s.disabledSlices.has(sl.id));

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

/** Detect the best supported mimeType for MediaRecorder */
function getSupportedMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return '';
}

/** Export composition as looping video (WebM) */
export async function exportVideo() {
  const s = useStore.getState();
  const { resolumeSetup: setup } = s;
  if (!setup) return;

  s.setIsExporting(true);

  try {
    const dims = s.getOutputDimensions();
    const allSlices = getScaledSlices(setup, dims, s.outputResolution);
    const slices = allSlices.filter((sl: any) => !s.disabledSlices.has(sl.id));

    const fps = 30;
    const totalFrames = Math.round((LOOP_DURATION_MS / 1000) * fps);

    // Single reusable canvas for the stream - avoids allocating new canvas per frame
    const streamCanvas = document.createElement('canvas');
    streamCanvas.width = dims.width;
    streamCanvas.height = dims.height;
    const streamCtx = streamCanvas.getContext('2d', { alpha: false })!;

    // captureStream(0) = manual frame capture, decoupled from real-time
    const stream = streamCanvas.captureStream(0);
    const videoTrack = stream.getVideoTracks()[0];

    const mimeType = getSupportedMimeType();
    const recorderOptions: MediaRecorderOptions = {
      videoBitsPerSecond: 16000000,
    };
    if (mimeType) recorderOptions.mimeType = mimeType;

    const mediaRecorder = new MediaRecorder(stream, recorderOptions);
    const actualMime = mediaRecorder.mimeType || 'video/webm';

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const exportPromise = new Promise<void>((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: actualMime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const label = s.viewMode === 'output' ? 'Output' : 'Input';
        a.download = `${s.brandName || setup.name}_${s.template}_${label}_${dims.width}x${dims.height}_loop.webm`;
        a.click();
        URL.revokeObjectURL(url);
        resolve();
      };
    });

    // Request data periodically for smoother encoding
    mediaRecorder.start(200);

    // Render all frames with same animationSpeed as preview.
    // captureStream(0) + requestFrame() decouples from wall-clock time.
    for (let frame = 0; frame < totalFrames; frame++) {
      const progress = (frame * s.animationSpeed / totalFrames) % 1;
      const options = buildOptions(s, progress);

      renderCompositionInto(streamCtx, slices, dims.width, dims.height, options);

      // Manually push this frame into the MediaRecorder stream
      if (videoTrack.requestFrame) {
        videoTrack.requestFrame();
      }

      // Yield to browser to avoid blocking UI
      await new Promise(r => setTimeout(r, 0));
    }

    // Ensure last frame is captured
    await new Promise(r => setTimeout(r, 100));
    mediaRecorder.stop();
    await exportPromise;

  } catch (err) {
    console.error('Video export failed:', err);
    alert('Video export failed. Your browser may not support WebM recording.\nTry using Chrome or Edge for best compatibility.');
  } finally {
    s.setIsExporting(false);
  }
}
