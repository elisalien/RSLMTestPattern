import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { generateComposition } from '../utils/pattern-generator';

export function Preview() {
  const imgRef = useRef<HTMLImageElement>(null);

  const setup = useStore(s => s.resolumeSetup);
  const template = useStore(s => s.template);
  const gridSize = useStore(s => s.gridSize);
  const showLabels = useStore(s => s.showLabels);
  const showSafeZones = useStore(s => s.showSafeZones);
  const logo = useStore(s => s.logo);
  const globalOverlay = useStore(s => s.globalOverlay);
  const sliceOverlays = useStore(s => s.sliceOverlays);
  const brandName = useStore(s => s.brandName);
  const outputResolution = useStore(s => s.outputResolution);
  const customWidth = useStore(s => s.customWidth);
  const customHeight = useStore(s => s.customHeight);
  const getDims = useStore(s => s.getOutputDimensions);

  useEffect(() => {
    if (!setup || !imgRef.current) return;

    const dims = getDims();
    const { compositionSize } = setup;

    // Scale slices if resolution differs from original
    let slices = setup.slices;
    if (outputResolution.id !== 'original') {
      const sx = dims.width / compositionSize.width;
      const sy = dims.height / compositionSize.height;
      slices = setup.slices.map(s => ({
        ...s,
        x: Math.round(s.x * sx),
        y: Math.round(s.y * sy),
        width: Math.round(s.width * sx),
        height: Math.round(s.height * sy),
      }));
    }

    const canvas = generateComposition(slices, dims.width, dims.height, {
      template,
      gridSize,
      showLabels,
      showSafeZones,
      logo,
      globalOverlay,
      sliceOverlays,
      brandName,
    });

    imgRef.current.src = canvas.toDataURL();
  }, [setup, template, gridSize, showLabels, showSafeZones, logo, globalOverlay, sliceOverlays, brandName, outputResolution, customWidth, customHeight, getDims]);

  if (!setup) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-5xl mb-4">📐</div>
          <p className="text-lg font-medium text-gray-400">Import a Resolume XML to start</p>
          <p className="text-sm mt-1">Drag & drop or use the sidebar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-950/50">
      <img
        ref={imgRef}
        alt="Test Pattern Preview"
        className="max-w-full max-h-full object-contain rounded border border-gray-700/50 shadow-2xl"
        style={{ imageRendering: 'crisp-edges' }}
      />
    </div>
  );
}

/** Export composition as PNG — called from Sidebar */
export function exportComposition() {
  const s = useStore.getState();
  const { resolumeSetup: setup } = s;
  if (!setup) return;

  const dims = s.getOutputDimensions();
  let slices = setup.slices;
  if (s.outputResolution.id !== 'original') {
    const sx = dims.width / setup.compositionSize.width;
    const sy = dims.height / setup.compositionSize.height;
    slices = setup.slices.map(sl => ({
      ...sl,
      x: Math.round(sl.x * sx),
      y: Math.round(sl.y * sy),
      width: Math.round(sl.width * sx),
      height: Math.round(sl.height * sy),
    }));
  }

  const canvas = generateComposition(slices, dims.width, dims.height, {
    template: s.template,
    gridSize: s.gridSize,
    showLabels: s.showLabels,
    showSafeZones: s.showSafeZones,
    logo: s.logo,
    globalOverlay: s.globalOverlay,
    sliceOverlays: s.sliceOverlays,
    brandName: s.brandName,
  });

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
