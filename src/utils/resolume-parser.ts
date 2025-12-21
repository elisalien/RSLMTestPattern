import { XMLParser } from 'fast-xml-parser';
import { ResolumeSetup, SliceData } from '../types';

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

  parse(xmlString: string): ResolumeSetup | null {
    try {
      const result = this.parser.parse(xmlString);
      const xmlState = result.XmlState;

      if (!xmlState) {
        throw new Error('Invalid Resolume XML format');
      }

      const versionInfo = xmlState.versionInfo;
      const screenSetup = xmlState.ScreenSetup;
      const screen = screenSetup.screens.Screen;

      // Extract composition size
      const compSize = screenSetup.CurrentCompositionTextureSize;
      const compositionSize = {
        width: compSize?.['@_width'] || 1920,
        height: compSize?.['@_height'] || 1080,
      };

      // Extract slices
      const layers = screen.layers;
      const sliceArray = Array.isArray(layers.Slice) ? layers.Slice : [layers.Slice];

      const slices: SliceData[] = sliceArray.map((slice: any) => {
        return this.parseSlice(slice);
      });

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

  private parseSlice(slice: any): SliceData {
    const id = slice['@_uniqueId']?.toString() || Date.now().toString();
    
    // Get slice name
    const nameParam = this.findParam(slice.Params, 'Name');
    const name = nameParam?.['@_value'] || 'Unnamed Slice';

    // Parse OutputRect to get dimensions and position
    const outputRect = this.parseRect(slice.OutputRect);
    const inputRect = this.parseRect(slice.InputRect);

    // Calculate width and height from outputRect
    const width = Math.abs(outputRect[1].x - outputRect[0].x);
    const height = Math.abs(outputRect[2].y - outputRect[1].y);
    const x = Math.min(outputRect[0].x, outputRect[1].x);
    const y = Math.min(outputRect[0].y, outputRect[1].y);

    return {
      id,
      name,
      width,
      height,
      x,
      y,
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
