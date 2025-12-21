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

      // Extract composition size
      const compSize = screenSetup.CurrentCompositionTextureSize;
      const compositionSize = {
        width: compSize?.['@_width'] || 1920,
        height: compSize?.['@_height'] || 1080,
      };

      // Extract slices
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

      const slices: SliceData[] = sliceArray
        .map((slice: any) => {
          try {
            return this.parseSlice(slice, viewMode);
          } catch (error) {
            console.error('Error parsing slice:', error);
            return null;
          }
        })
        .filter((slice): slice is SliceData => slice !== null);

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

  private parseSlice(slice: any, viewMode: ViewMode = 'output'): SliceData {
    const id = slice['@_uniqueId']?.toString() || `slice_${Date.now()}_${Math.random()}`;

    // Get slice name
    const nameParam = this.findParam(slice.Params, 'Name');
    const name = nameParam?.['@_value'] || 'Unnamed Slice';

    // Parse both rects
    const outputRect = this.parseRect(slice.OutputRect);
    const inputRect = this.parseRect(slice.InputRect);

    // Validate that we have valid rectangles
    if (outputRect.length < 3) {
      console.warn(`Slice ${name} has invalid OutputRect, using defaults`);
    }
    if (inputRect.length < 3) {
      console.warn(`Slice ${name} has invalid InputRect, using defaults`);
    }

    // Select which rect to use based on viewMode
    const activeRect = viewMode === 'input' ? inputRect : outputRect;

    // Ensure we have at least 3 points to calculate dimensions
    if (activeRect.length < 3) {
      console.error(`Slice ${name} has insufficient points in active rect`);
      throw new Error(`Invalid slice data for ${name}`);
    }

    // Calculate width and height from the selected rect
    const width = Math.abs(activeRect[1].x - activeRect[0].x);
    const height = Math.abs(activeRect[2].y - activeRect[1].y);
    const x = Math.min(activeRect[0].x, activeRect[1].x);
    const y = Math.min(activeRect[0].y, activeRect[1].y);

    // Validate dimensions
    if (width <= 0 || height <= 0) {
      console.error(`Slice ${name} has invalid dimensions: ${width}x${height}`);
      throw new Error(`Invalid dimensions for slice ${name}`);
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
