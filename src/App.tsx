import { useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Preview } from './components/Preview';
import { useStore } from './store';

export default function App() {
  const importXML = useStore(s => s.importXML);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.xml')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const xml = ev.target?.result as string;
        if (xml) importXML(xml);
      };
      reader.readAsText(file);
    }
  }, [importXML]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <div
      className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <Preview />
      </div>
    </div>
  );
}
