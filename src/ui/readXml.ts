import { useStore } from '../state/store';

export function readXmlFile(file: File) {
  const reader = new FileReader();
  reader.onload = () => useStore.getState().loadXML(String(reader.result || ''), file.name);
  reader.readAsText(file);
}
