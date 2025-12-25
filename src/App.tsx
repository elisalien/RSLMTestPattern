import { useState, useRef, useEffect } from 'react';
import { Upload, Download, Settings, Eye, Grid3x3, Image as ImageIcon, Type, Layers, FileText, Monitor, Film } from 'lucide-react';
import { resolumeParser } from './utils/resolume-parser';
import { patternGenerator } from './utils/pattern-generator';
import { ResolumeSetup, TemplateType, TemplateConfig, BrandingConfig, ViewMode, OutputResolution, SliceGifConfig } from './types';

// Template options
const TEMPLATES = [
  { id: 'classic-broadcast', name: 'Classic Broadcast', icon: '📺', description: 'Professional SMPTE-style grid with safe zones' },
  { id: 'led-panel-pro', name: 'LED Panel Pro', icon: '🔲', description: 'Precise pixel grid for LED alignment' },
  { id: 'projection-alignment', name: 'Projection Alignment', icon: '🎯', description: 'Focus circles and convergence markers' },
  { id: 'minimal-clean', name: 'Minimal Clean', icon: '⚪', description: 'Ultra-minimal modern aesthetic' },
] as const;

const OUTPUT_RESOLUTIONS: OutputResolution[] = [
  { id: 'original', name: 'Original (XML)', width: 0, height: 0 },
  { id: 'hd', name: 'HD 1280×720', width: 1280, height: 720 },
  { id: 'fhd', name: 'Full HD 1920×1080', width: 1920, height: 1080 },
  { id: '2k', name: '2K 2560×1440', width: 2560, height: 1440 },
  { id: '4k', name: '4K UHD 3840×2160', width: 3840, height: 2160 },
  { id: 'custom', name: 'Custom', width: 0, height: 0 },
];

function App() {
  // State management
  const [resolumeSetup, setResolumeSetup] = useState<ResolumeSetup | null>(null);
  const [rawXML, setRawXML] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('output');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('classic-broadcast');
  const [isLoading, setIsLoading] = useState(false);
  const [outputResolution, setOutputResolution] = useState<OutputResolution>(OUTPUT_RESOLUTIONS[0]);
  const [customWidth, setCustomWidth] = useState<number>(1920);
  const [customHeight, setCustomHeight] = useState<number>(1080);
  const [branding, setBranding] = useState<BrandingConfig>({
    name: '',
    logo: null,
  });
  const [globalGif, setGlobalGif] = useState<HTMLImageElement | null>(null);
  const [sliceGifs, setSliceGifs] = useState<SliceGifConfig>({});
  const [templateConfig, setTemplateConfig] = useState<TemplateConfig>({
    type: 'classic-broadcast',
    gridSize: 64,
    globalGif: null,
  });
  const [compositionCanvas, setCompositionCanvas] = useState<HTMLCanvasElement | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const globalGifInputRef = useRef<HTMLInputElement>(null);
  const sliceGifInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Get actual output dimensions
  const getOutputDimensions = (): { width: number; height: number } => {
    if (!resolumeSetup) return { width: 1920, height: 1080 };

    if (outputResolution.id === 'original') {
      return resolumeSetup.compositionSize;
    } else if (outputResolution.id === 'custom') {
      return { width: customWidth, height: customHeight };
    } else {
      return { width: outputResolution.width, height: outputResolution.height };
    }
  };

  // Handle XML file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const xmlContent = e.target?.result as string;
      setRawXML(xmlContent);
      const setup = resolumeParser.parse(xmlContent, viewMode);

      if (setup) {
        setResolumeSetup(setup);
      } else {
        alert('Error parsing Resolume XML. Check console for details.');
      }
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  // Re-parse when view mode changes
  useEffect(() => {
    if (rawXML) {
      const setup = resolumeParser.parse(rawXML, viewMode);
      if (setup) {
        setResolumeSetup(setup);
      }
    }
  }, [viewMode, rawXML]);

  // Handle logo upload
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setBranding({ ...branding, logo: img });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Handle global GIF upload
  const handleGlobalGifUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setGlobalGif(img);
        setTemplateConfig({ ...templateConfig, globalGif: img });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Handle per-slice GIF upload
  const handleSliceGifUpload = (sliceId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setSliceGifs({ ...sliceGifs, [sliceId]: img });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Generate complete composition
  useEffect(() => {
    if (!resolumeSetup) return;

    const config = { ...templateConfig, type: selectedTemplate };
    const outputDims = getOutputDimensions();

    // Only scale if user selected a different resolution than original
    // The parser already scales OutputRect to match Virtual Output resolution
    let scaledSlices = resolumeSetup.slices;

    if (outputResolution.id !== 'original') {
      // User wants a different resolution than the XML's Virtual Output
      const scaleX = outputDims.width / resolumeSetup.compositionSize.width;
      const scaleY = outputDims.height / resolumeSetup.compositionSize.height;

      scaledSlices = resolumeSetup.slices.map(slice => ({
        ...slice,
        x: Math.round(slice.x * scaleX),
        y: Math.round(slice.y * scaleY),
        width: Math.round(slice.width * scaleX),
        height: Math.round(slice.height * scaleY),
      }));
    }

    const canvas = patternGenerator.generateComposition(
      scaledSlices,
      outputDims.width,
      outputDims.height,
      config,
      sliceGifs,
      branding.logo,
      globalGif
    );

    setCompositionCanvas(canvas);
  }, [resolumeSetup, selectedTemplate, templateConfig, sliceGifs, branding, globalGif, outputResolution, customWidth, customHeight]);

  // Export composition as PNG
  const exportComposition = () => {
    if (!compositionCanvas || !resolumeSetup) return;

    compositionCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const modeLabel = viewMode === 'output' ? 'Output' : 'Input';
      const outputDims = getOutputDimensions();
      const filename = `${branding.name || resolumeSetup.name}_${selectedTemplate}_${modeLabel}_${outputDims.width}x${outputDims.height}.png`;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="animate-fade-in">
              <h1 className="text-4xl font-bold gradient-text mb-2">
                Resolume Test Pattern Generator
              </h1>
              <p className="text-gray-400 text-sm">Professional test patterns for LED panels, projectors & displays</p>
            </div>
            {resolumeSetup && (
              <div className="flex items-center gap-4 text-sm text-gray-400 animate-slide-up">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-cyan-400" />
                  <span>{resolumeSetup.slices.length} slices</span>
                </div>
                <div className="text-gray-600">|</div>
                <div className="flex items-center gap-2">
                  <Monitor size={16} className="text-purple-400" />
                  <span>{getOutputDimensions().width}×{getOutputDimensions().height}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Upload Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 animate-fade-in">
          {/* XML Upload Card */}
          <div className="card">
            <div className="card-header">
              <FileText size={24} className="text-green-400" />
              Import XML
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="w-full btn btn-success flex items-center justify-center gap-2 py-4"
            >
              {isLoading ? (
                <>
                  <div className="spinner w-5 h-5" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <Upload size={20} />
                  <span>Import Resolume XML</span>
                </>
              )}
            </button>

            {resolumeSetup && (
              <div className="mt-4 space-y-3 animate-slide-up">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-green-400 font-medium">✓ Loaded successfully</span>
                </div>

                <div className="section-header">View Mode</div>
                <div className="toggle-group w-full justify-center">
                  <button
                    onClick={() => setViewMode('output')}
                    className={`toggle-btn flex-1 ${viewMode === 'output' ? 'active' : ''}`}
                  >
                    Advanced Output
                  </button>
                  <button
                    onClick={() => setViewMode('input')}
                    className={`toggle-btn flex-1 ${viewMode === 'input' ? 'active' : ''}`}
                  >
                    Advanced Input
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Branding & Media Card */}
          <div className="card">
            <div className="card-header">
              <ImageIcon size={24} className="text-purple-400" />
              Branding & Media
            </div>

            {/* Brand Name */}
            <div className="mb-4">
              <label className="section-header">
                <Type size={16} />
                Branding Name
              </label>
              <input
                type="text"
                value={branding.name}
                onChange={(e) => setBranding({ ...branding, name: e.target.value })}
                placeholder="Your name or company..."
                className="input"
              />
            </div>

            {/* Logo Upload */}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <button
              onClick={() => logoInputRef.current?.click()}
              className="w-full btn btn-purple flex items-center justify-center gap-2 py-3 mb-3"
            >
              <ImageIcon size={18} />
              <span>{branding.logo ? 'Change Logo' : 'Upload Logo'}</span>
            </button>

            {/* Global GIF Upload */}
            <input
              ref={globalGifInputRef}
              type="file"
              accept="image/gif"
              onChange={handleGlobalGifUpload}
              className="hidden"
            />
            <button
              onClick={() => globalGifInputRef.current?.click()}
              className="w-full btn btn-secondary flex items-center justify-center gap-2 py-3"
            >
              <Film size={18} />
              <span>{globalGif ? 'Change Global GIF' : 'Upload Global GIF'}</span>
            </button>

            <p className="text-xs text-gray-400 mt-2">
              Logo and GIF will appear on ALL slices. You can also add per-slice GIFs below.
            </p>
          </div>
        </div>

        {resolumeSetup && (
          <div className="space-y-6 animate-scale-in">
            {/* Template Selection */}
            <div className="card">
              <div className="card-header">
                <Grid3x3 size={24} className="text-cyan-400" />
                Template Selection
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id as TemplateType)}
                    className={`pattern-card border-gray-600 ${selectedTemplate === template.id ? 'active' : ''}`}
                    title={template.description}
                  >
                    <div className="text-3xl mb-2">{template.icon}</div>
                    <div className="text-xs text-gray-300 font-medium text-center">{template.name}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                All templates include: grid, center crosshair, corner markers, and labels on each slice.
              </p>
            </div>

            {/* Settings */}
            <div className="card">
              <div className="card-header">
                <Settings size={24} className="text-orange-400" />
                Settings
              </div>

              {/* Resolution Selector */}
              <div className="mb-6">
                <label className="section-header flex items-center gap-2">
                  <Monitor size={16} />
                  Output Resolution
                </label>
                <select
                  value={outputResolution.id}
                  onChange={(e) => {
                    const selected = OUTPUT_RESOLUTIONS.find(r => r.id === e.target.value);
                    if (selected) setOutputResolution(selected);
                  }}
                  className="input mb-2"
                >
                  <option value="original">
                    Original ({resolumeSetup?.compositionSize.width}×{resolumeSetup?.compositionSize.height})
                  </option>
                  {OUTPUT_RESOLUTIONS.slice(1).map((res) => (
                    <option key={res.id} value={res.id}>
                      {res.name}
                    </option>
                  ))}
                </select>

                {outputResolution.id === 'custom' && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Width</label>
                      <input
                        type="number"
                        min="320"
                        max="7680"
                        value={customWidth}
                        onChange={(e) => setCustomWidth(parseInt(e.target.value) || 1920)}
                        className="input"
                        placeholder="1920"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Height</label>
                      <input
                        type="number"
                        min="240"
                        max="4320"
                        value={customHeight}
                        onChange={(e) => setCustomHeight(parseInt(e.target.value) || 1080)}
                        className="input"
                        placeholder="1080"
                      />
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-400 mt-2">
                  {outputResolution.id === 'original'
                    ? 'Using composition size from XML'
                    : `Output: ${getOutputDimensions().width}×${getOutputDimensions().height}`}
                </div>
              </div>

              {/* Grid Size */}
              <div>
                <label className="section-header flex items-center gap-2">
                  <Grid3x3 size={16} />
                  Grid Size: {templateConfig.gridSize}px
                </label>
                <input
                  type="range"
                  min="20"
                  max="200"
                  step="4"
                  value={templateConfig.gridSize}
                  onChange={(e) => setTemplateConfig({ ...templateConfig, gridSize: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Fine (20px)</span>
                  <span>Coarse (200px)</span>
                </div>
              </div>
            </div>

            {/* Per-Slice GIFs */}
            <div className="card">
              <div className="card-header">
                <Film size={24} className="text-pink-400" />
                Per-Slice GIFs (Optional)
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {resolumeSetup.slices.map((slice) => (
                  <div key={slice.id} className="border border-gray-700 rounded-lg p-3 hover:border-gray-600 transition-colors">
                    <div className="text-white text-sm font-medium truncate mb-2">{slice.name}</div>
                    <div className="text-gray-400 text-xs mb-3">{slice.width}×{slice.height}</div>
                    <input
                      ref={(el) => (sliceGifInputRefs.current[slice.id] = el)}
                      type="file"
                      accept="image/gif"
                      onChange={(e) => handleSliceGifUpload(slice.id, e)}
                      className="hidden"
                    />
                    <button
                      onClick={() => sliceGifInputRefs.current[slice.id]?.click()}
                      className={`w-full btn ${sliceGifs[slice.id] ? 'btn-primary' : 'btn-secondary'} text-xs py-2`}
                    >
                      {sliceGifs[slice.id] ? 'Change GIF' : 'Add GIF'}
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Per-slice GIFs override the global GIF for that specific slice.
              </p>
            </div>

            {/* Export & Preview */}
            <div className="card">
              <button
                onClick={exportComposition}
                className="w-full btn btn-success flex items-center justify-center gap-3 py-6 text-lg"
              >
                <Download size={24} />
                <span>
                  Export {viewMode === 'output' ? 'Output' : 'Input'}
                  ({getOutputDimensions().width}×{getOutputDimensions().height})
                </span>
              </button>
            </div>

            {/* Preview */}
            <div className="card">
              <div className="card-header">
                <Eye size={24} className="text-blue-400" />
                Composition Preview
              </div>
              {compositionCanvas && (
                <div className="canvas-preview">
                  <img
                    src={compositionCanvas.toDataURL()}
                    alt="Test Pattern Composition"
                    className="w-full h-auto"
                    style={{ imageRendering: 'crisp-edges' }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!resolumeSetup && !isLoading && (
          <div className="card text-center py-16 animate-fade-in">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="text-2xl font-bold text-white mb-2">Ready to Start</h3>
            <p className="text-gray-400">Import your Resolume XML file to begin creating test patterns</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
