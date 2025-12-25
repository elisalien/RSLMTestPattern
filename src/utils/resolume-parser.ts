import { XMLParser } from 'fast-xml-parser';
import { ResolumeSetup, SliceData, ViewMode } from '../types';

export class ResolumeXMLParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
    });
  }

  parse(xmlString: string, viewMode: ViewMode = 'output'): ResolumeSetup | null {
    try {
      const result = this.parser.parse(xmlString);
      const xmlState = result.XmlState;

      if (!xmlState) {
        console.error('XML does not contain XmlState root element');
        throw new Error('Invalid Resolume XML format: Missing XmlState root element');
      }

      const versionInfo = xmlState.versionInfo;
      const screenSetup = xmlState.ScreenSetup;

      if (!screenSetup) {
        console.error('XML does not contain ScreenSetup element');
        throw new Error('Invalid Resolume XML format: Missing ScreenSetup element');
      }

      // Handle both single screen and multiple screens
      const screens = screenSetup.screens;
      if (!screens || !screens.Screen) {
        console.error('XML does not contain Screen elements');
        throw new Error('Invalid Resolume XML format: Missing Screen elements');
      }

      // Get the first screen (Resolume typically exports one screen)
      const screen = Array.isArray(screens.Screen) ? screens.Screen[0] : screens.Screen;

      // Extract composition size from Virtual Output Device (preferred) or fallback to CurrentCompositionTextureSize
      let compositionSize = { width: 1920, height: 1080 };

      // Try to get from Virtual Output Device first
      if (screen.OutputDevice?.OutputDeviceVirtual) {
        const virtualOutput = screen.OutputDevice.OutputDeviceVirtual;
        compositionSize = {
          width: virtualOutput['@_width'] || 1920,
          height: virtualOutput['@_height'] || 1080,
        };
        console.log('📺 Using Virtual Output resolution:', compositionSize);
      } else if (screenSetup.CurrentCompositionTextureSize) {
        // Fallback to old method
        const compSize = screenSetup.CurrentCompositionTextureSize;
        compositionSize = {
          width: compSize?.['@_width'] || 1920,
          height: compSize?.['@_height'] || 1080,
        };
        console.log('📐 Using CurrentCompositionTextureSize:', compositionSize);
      }

      // Calculate bounding box of all OutputRect to determine the internal resolution
      const layers = screen.layers;
      if (!layers || !layers.Slice) {
        console.warn('No slices found in XML, creating empty setup');
        return {
          name: xmlState['@_name'] || 'Resolume Setup',
          version: {
            name: versionInfo?.['@_name'] || 'Resolume Arena',
            major: versionInfo?.['@_majorVersion'] || 7,
            minor: versionInfo?.['@_minorVersion'] || 0,
            micro: versionInfo?.['@_microVersion'] || 0,
          },
          compositionSize,
          slices: [],
        };
      }

      const sliceArray = Array.isArray(layers.Slice) ? layers.Slice : [layers.Slice];

      // Calculate the bounding box of all OutputRect to get internal resolution
      let maxX = 0, maxY = 0;
      sliceArray.forEach((slice: any) => {
        const outputRect = this.parseRect(slice.OutputRect);
        outputRect.forEach(v => {
          maxX = Math.max(maxX, v.x);
          maxY = Math.max(maxY, v.y);
        });
      });

      const internalResolution = { width: maxX, height: maxY };
      console.log('🔧 Internal OutputRect resolution:', internalResolution);

      // Calculate scale factor from internal resolution to Virtual Output
      const scaleX = compositionSize.width / internalResolution.width;
      const scaleY = compositionSize.height / internalResolution.height;
      console.log('📏 Scale factors:', { scaleX, scaleY });

      const slices: SliceData[] = sliceArray
        .map((slice: any, index: number) => {
          try {
            const parsed = this.parseSlice(slice, viewMode, scaleX, scaleY);
            console.log(`✓ Slice ${index + 1} parsed successfully:`, {
              name: parsed.name,
              dimensions: `${parsed.width}x${parsed.height}`,
              position: `(${parsed.x}, ${parsed.y})`,
              mode: viewMode
            });
            return parsed;
          } catch (error) {
            console.error(`✗ Error parsing slice ${index + 1}:`, error);
            return null;
          }
        })
        .filter((slice): slice is SliceData => slice !== null);

      console.log(`📊 Total slices loaded: ${slices.length} out of ${sliceArray.length} (mode: ${viewMode})`);

      return {
        name: xmlState['@_name'] || 'Resolume Setup',
        version: {
          name: versionInfo?.['@_name'] || 'Resolume Arena',
          major: versionInfo?.['@_majorVersion'] || 7,
          minor: versionInfo?.['@_minorVersion'] || 0,
          micro: versionInfo?.['@_microVersion'] || 0,
        },
        compositionSize,
        slices,
      };
    } catch (error) {
      console.error('Error parsing Resolume XML:', error);
      return null;
    }
  }

  private parseSlice(slice: any, viewMode: ViewMode = 'output', scaleX: number = 1, scaleY: number = 1): SliceData {
    const id = slice['@_uniqueId']?.toString() || `slice_${Date.now()}_${Math.random()}`;

    // Get slice name
    const nameParam = this.findParam(slice.Params, 'Name');
    const name = nameParam?.['@_value'] || 'Unnamed Slice';

    console.log(`🔍 Parsing slice "${name}":`, {
      hasOutputRect: !!slice.OutputRect,
      hasInputRect: !!slice.InputRect,
      viewMode,
      scale: `${scaleX.toFixed(3)}x, ${scaleY.toFixed(3)}y`
    });

    // Parse both rects
    const outputRect = this.parseRect(slice.OutputRect);
    const inputRect = this.parseRect(slice.InputRect);

    console.log(`  OutputRect points:`, outputRect);
    console.log(`  InputRect points:`, inputRect);

    // Validate that we have valid rectangles
    if (outputRect.length < 4) {
      console.warn(`  ⚠️ Slice ${name} has invalid OutputRect (${outputRect.length} points, need 4)`);
    }
    if (inputRect.length < 4) {
      console.warn(`  ⚠️ Slice ${name} has invalid InputRect (${inputRect.length} points, need 4)`);
    }

    // Select which rect to use based on viewMode
    const activeRect = viewMode === 'input' ? inputRect : outputRect;

    // Ensure we have at least 4 points (rectangle vertices)
    if (activeRect.length < 4) {
      console.error(`  ❌ Slice ${name} has insufficient points in ${viewMode} rect (${activeRect.length}/4)`);
      throw new Error(`Invalid slice data for ${name}: only ${activeRect.length} points in ${viewMode} rect`);
    }

    // Calculate bounding box from all 4 points
    const xValues = activeRect.map(p => p.x);
    const yValues = activeRect.map(p => p.y);

    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);

    // Apply scaling to convert from internal resolution to Virtual Output resolution
    const width = (maxX - minX) * scaleX;
    const height = (maxY - minY) * scaleY;
    const x = minX * scaleX;
    const y = minY * scaleY;

    console.log(`  📐 Calculated dimensions (after scaling):`, {
      x, y, width, height,
      originalX: minX, originalY: minY,
      originalWidth: maxX - minX, originalHeight: maxY - minY
    });

    // Validate dimensions
    if (width <= 0 || height <= 0) {
      console.error(`  ❌ Slice ${name} has invalid dimensions: ${width}x${height}`);
      throw new Error(`Invalid dimensions for slice ${name}: ${width}x${height}`);
    }

    return {
      id,
      name,
      width: Math.round(width),
      height: Math.round(height),
      x: Math.round(x),
      y: Math.round(y),
      inputRect,
      outputRect,
    };
  }

  private parseRect(rectObj: any): { x: number; y: number }[] {
    if (!rectObj || !rectObj.v) return [];
    
    const vertices = Array.isArray(rectObj.v) ? rectObj.v : [rectObj.v];
    return vertices.map((v: any) => ({
      x: parseFloat(v['@_x']) || 0,
      y: parseFloat(v['@_y']) || 0,
    }));
  }

  private findParam(params: any, paramName: string): any {
    if (!params) return null;
    
    // Params can be nested
    const paramsList = Array.isArray(params) ? params : [params];
    
    for (const p of paramsList) {
      if (p.Param) {
        const paramArray = Array.isArray(p.Param) ? p.Param : [p.Param];
        const found = paramArray.find((param: any) => param['@_name'] === paramName);
        if (found) return found;
      }
    }
    
    return null;
  }

  generateXML(setup: ResolumeSetup): string {
    // Regenerate XML with modified setup
    // This is a simplified version - you'd need to reconstruct the full XML structure
    return `<?xml version="1.0" encoding="utf-8"?>
<XmlState name="${setup.name}">
  <versionInfo name="${setup.version.name}" majorVersion="${setup.version.major}" minorVersion="${setup.version.minor}" microVersion="${setup.version.micro}"/>
  <!-- Full XML reconstruction would go here -->
</XmlState>`;
  }
}

export const resolumeParser = new ResolumeXMLParser();
