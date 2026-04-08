import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { generateComposition, GeneratorOptions } from '../utils/pattern-generator';
import { VIDEO_PRESETS, ANIMATION_PRESETS } from '../types';

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
    decorativeSettings: s.decorativeSettings || { enabled: [], density: 2, size: 100, opacity: 40, animated: false },
    globalOverlay: s.globalOverlay,
    sliceOverlays: s.sliceOverlays,
    brandName: s.brandName,
    animationPreset: s.animationPreset,
    videoPreset: s.videoPreset,
    animationProgress: animProgress,
  };
}

export function Preview() {
  const imgRef = useRef<HTMLImageElement>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);

  const setup = useStore(s => s.resolumeSetup);
  const template = useStore(s => s.template);
  const graphicPreset = useStore(s => s.graphicPreset);
  const gridSize = useStore(s => s.gridSize);
  const showLabels = useStore(s => s.showLabels);
  const showSafeZones = useStore(s => s.showSafeZones);
  const logo = useStore(s => s.logo);
  const logoSettings = useStore(s => s.logoSettings);
  const globalOverlay = useStore(s => s.globalOverlay);
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
    if (!setup || !imgRef.current) return;

    const dims = getDims();
    const allSlices = getScaledSlices(setup, dims, outputResolution);
    const slices = allSlices.filter((s: any) => !disabledSlices.has(s.id));

    const options = buildOptions(useStore.getState(), progress);

    const canvas = generateComposition(slices, dims.width, dims.height, options);
    imgRef.current.src = canvas.toDataURL();
  }, [setup, getDims, outputResolution, disabledSlices]);

  useEffect(() => {
    if (!setup) return;

    if (hasAnimation) {
      startTimeRef.current = performance.now();

      const vpInfo = VIDEO_PRESETS.find(p => p.id === videoPreset);
      const apInfo = ANIMATION_PRESETS.find(p => p.id === animationPreset);
      const duration = Math.max(vpInfo?.durationMs || 2000, apInfo?.durationMs || 2000);

      const targetInterval = 1000 / 30; // Cap preview at 30fps for performance
      const animate = (time: number) => {
        const sinceLastFrame = time - lastFrameTimeRef.current;
        if (sinceLastFrame >= targetInterval) {
          lastFrameTimeRef.current = time;
          const elapsed = time - startTimeRef.current;
          const progress = (elapsed * animationSpeed / duration) % 1;
          renderFrame(progress);
        }
        animRef.current = requestAnimationFrame(animate);
      };

      animRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animRef.current);
    } else {
      renderFrame(undefined);
    }
  }, [setup, template, graphicPreset, gridSize, showLabels, showSafeZones, logo, logoSettings,
      globalOverlay, sliceOverlays, brandName, outputResolution, customWidth, customHeight,
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
      <img
        ref={imgRef}
        alt="Test Pattern Preview"
        className="max-w-full max-h-full object-contain rounded border border-gray-700/50 shadow-2xl"
        style={{ imageRendering: 'crisp-edges' }}
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

    const vpInfo = VIDEO_PRESETS.find(p => p.id === s.videoPreset);
    const apInfo = ANIMATION_PRESETS.find(p => p.id === s.animationPreset);
    const duration = Math.max(vpInfo?.durationMs || 2000, apInfo?.durationMs || 2000);
    const fps = vpInfo?.fps || 30;
    const totalFrames = Math.round((duration / 1000) * fps);

    // Use OffscreenCanvas or regular canvas for recording
    const recordCanvas = document.createElement('canvas');
    recordCanvas.width = dims.width;
    recordCanvas.height = dims.height;

    const stream = recordCanvas.captureStream(fps);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 8000000,
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const exportPromise = new Promise<void>((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
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

    mediaRecorder.start();

    // Render frames
    const recordCtx = recordCanvas.getContext('2d')!;
    for (let frame = 0; frame < totalFrames; frame++) {
      const progress = frame / totalFrames;
      const options = buildOptions(s, progress);
      const frameCanvas = generateComposition(slices, dims.width, dims.height, options);
      recordCtx.clearRect(0, 0, dims.width, dims.height);
      recordCtx.drawImage(frameCanvas, 0, 0);

      // Wait for next frame timing
      await new Promise(r => setTimeout(r, 1000 / fps));
    }

    mediaRecorder.stop();
    await exportPromise;
  } catch (err) {
    console.error('Video export failed:', err);
    alert('Video export failed. Your browser may not support WebM recording.');
  } finally {
    s.setIsExporting(false);
  }
}
