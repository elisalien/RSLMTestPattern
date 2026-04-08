import { XMLParser } from 'fast-xml-parser';
import { ResolumeSetup, ScreenData, SliceData, ViewMode, Point } from '../types';

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
      if (!xmlState) throw new Error('Missing XmlState root element');

      const versionInfo = xmlState.versionInfo;
      const screenSetup = xmlState.ScreenSetup;
      if (!screenSetup) throw new Error('Missing ScreenSetup element');

      const screensNode = screenSetup.screens;
      if (!screensNode?.Screen) throw new Error('Missing Screen elements');

      const screenArray = Array.isArray(screensNode.Screen)
        ? screensNode.Screen
        : [screensNode.Screen];

      // Parse all screens
      const screens: ScreenData[] = screenArray.map((screen: any, idx: number) => {
        const compositionSize = this.resolveCompositionSize(screen, screenSetup);
        const slices = this.parseScreenSlices(screen, viewMode, compositionSize);
        const screenName = screen['@_name'] || screen.Params?.Param?.['@_value'] || `Screen ${idx + 1}`;
        return {
          id: screen['@_uniqueId']?.toString() || `screen_${idx}`,
          name: typeof screenName === 'string' ? screenName : `Screen ${idx + 1}`,
          slices,
          compositionSize,
        };
      });

      // Use first screen as default active
      const activeScreen = screens[0];

      return {
        name: xmlState['@_name'] || 'Resolume Setup',
        version: {
          name: versionInfo?.['@_name'] || 'Resolume Arena',
          major: versionInfo?.['@_majorVersion'] || 7,
          minor: versionInfo?.['@_minorVersion'] || 0,
          micro: versionInfo?.['@_microVersion'] || 0,
        },
        compositionSize: activeScreen?.compositionSize || { width: 1920, height: 1080 },
        slices: activeScreen?.slices || [],
        screens,
      };
    } catch (error) {
      console.error('Error parsing Resolume XML:', error);
      return null;
    }
  }

  private parseScreenSlices(
    screen: any,
    viewMode: ViewMode,
    compositionSize: { width: number; height: number },
  ): SliceData[] {
    const layers = screen.layers;
    if (!layers?.Slice) return [];

    const sliceArray: any[] = Array.isArray(layers.Slice) ? layers.Slice : [layers.Slice];

    // Calculate internal bounding box for scaling
    let maxX = 0, maxY = 0;
    sliceArray.forEach((slice: any) => {
      this.parseRect(slice.OutputRect).forEach(v => {
        maxX = Math.max(maxX, v.x);
        maxY = Math.max(maxY, v.y);
      });
    });

    const scaleX = maxX > 0 ? compositionSize.width / maxX : 1;
    const scaleY = maxY > 0 ? compositionSize.height / maxY : 1;

    return sliceArray
      .map((slice: any) => this.parseSlice(slice, viewMode, scaleX, scaleY))
      .filter((slice): slice is SliceData => slice !== null);
  }

  private resolveCompositionSize(
    screen: any,
    screenSetup: any,
  ): { width: number; height: number } {
    if (screen.OutputDevice?.OutputDeviceVirtual) {
      const vo = screen.OutputDevice.OutputDeviceVirtual;
      return { width: vo['@_width'] || 1920, height: vo['@_height'] || 1080 };
    }
    if (screenSetup.CurrentCompositionTextureSize) {
      const cs = screenSetup.CurrentCompositionTextureSize;
      return { width: cs['@_width'] || 1920, height: cs['@_height'] || 1080 };
    }
    return { width: 1920, height: 1080 };
  }

  private parseSlice(
    slice: any,
    viewMode: ViewMode,
    scaleX: number,
    scaleY: number,
  ): SliceData | null {
    try {
      const id = slice['@_uniqueId']?.toString() || `slice_${Date.now()}_${Math.random()}`;
      const nameParam = this.findParam(slice.Params, 'Name');
      const name = nameParam?.['@_value'] || 'Unnamed Slice';

      const outputRect = this.parseRect(slice.OutputRect);
      const inputRect = this.parseRect(slice.InputRect);
      const activeRect = viewMode === 'input' ? inputRect : outputRect;

      if (activeRect.length < 4) return null;

      const xs = activeRect.map(p => p.x);
      const ys = activeRect.map(p => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const width = Math.round((maxX - minX) * scaleX);
      const height = Math.round((maxY - minY) * scaleY);
      if (width <= 0 || height <= 0) return null;

      return {
        id,
        name,
        width,
        height,
        x: Math.round(minX * scaleX),
        y: Math.round(minY * scaleY),
        inputRect,
        outputRect,
      };
    } catch {
      return null;
    }
  }

  private parseRect(rectObj: any): Point[] {
    if (!rectObj?.v) return [];
    const vertices = Array.isArray(rectObj.v) ? rectObj.v : [rectObj.v];
    return vertices.map((v: any) => ({
      x: parseFloat(v['@_x']) || 0,
      y: parseFloat(v['@_y']) || 0,
    }));
  }

  private findParam(params: any, paramName: string): any {
    if (!params) return null;
    const list = Array.isArray(params) ? params : [params];
    for (const p of list) {
      if (p.Param) {
        const arr = Array.isArray(p.Param) ? p.Param : [p.Param];
        const found = arr.find((param: any) => param['@_name'] === paramName);
        if (found) return found;
      }
    }
    return null;
  }
}
