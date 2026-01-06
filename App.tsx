import React, { useState, useRef, useEffect } from 'react';
import { Adjustments, DEFAULT_ADJUSTMENTS, ToolType, FilterPreset, Overlay } from './types';
import { getCssFilterString, exportCanvasToBase64, rotateImage } from './utils/canvasUtils';
import { editImageWithGemini } from './services/geminiService';
import { ToolsPanel } from './components/ToolsPanel';
import Cropper, { ReactCropperElement } from "react-cropper";
import { 
  Upload, Download, Undo, Redo, Image as ImageIcon, 
  ZoomIn, ZoomOut, AlertCircle, Menu, Search, HelpCircle, 
  Settings, Grid, X, Plus, RotateCcw, Home, Trash2, Maximize, Check
} from 'lucide-react';

interface HistoryState {
  imageSrc: string;
  adjustments: Adjustments;
  overlays: Overlay[];
}

const App: React.FC = () => {
  // --- Global State ---
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [activeTool, setActiveTool] = useState<ToolType>('adjust');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // --- Live Preview State ---
  const [liveAdjustments, setLiveAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);

  // --- Crop Interaction State ---
  const [cropAspectRatio, setCropAspectRatio] = useState<number | undefined>(undefined); // undefined = free
  
  // --- Overlay Interaction State ---
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const cropperRef = useRef<ReactCropperElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Computed state
  const currentImageSrc = historyIndex >= 0 ? history[historyIndex].imageSrc : null;
  const currentOverlays = historyIndex >= 0 ? history[historyIndex].overlays : [];
  
  // Sync live adjustments when history changes
  useEffect(() => {
    if (historyIndex >= 0) {
      setLiveAdjustments(history[historyIndex].adjustments);
    }
  }, [historyIndex, history]);

  // --- Helpers ---

  const pushToHistory = (newState: Partial<HistoryState>) => {
    if (historyIndex === -1 && !newState.imageSrc) return;
    const baseState = historyIndex >= 0 ? history[historyIndex] : { imageSrc: '', adjustments: DEFAULT_ADJUSTMENTS, overlays: [] };
    const nextState: HistoryState = { ...baseState, ...newState };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(nextState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const updateOverlays = (newOverlays: Overlay[]) => {
      const updatedHistory = [...history];
      updatedHistory[historyIndex] = { ...updatedHistory[historyIndex], overlays: newOverlays };
      setHistory(updatedHistory);
  };

  // --- Handlers ---

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const initialState = { imageSrc: result, adjustments: DEFAULT_ADJUSTMENTS, overlays: [] };
        setHistory([initialState]);
        setLiveAdjustments(DEFAULT_ADJUSTMENTS);
        setHistoryIndex(0);
        setZoom(1);
        setErrorMsg(null);
        setActiveTool('adjust');
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  };

  const handleGoHome = () => {
    setHistory([]);
    setHistoryIndex(-1);
    setActiveTool('adjust');
    setErrorMsg(null);
  };

  const handleRevertToOriginal = () => {
    if (history.length > 0) {
      pushToHistory({ ...history[0], adjustments: DEFAULT_ADJUSTMENTS, overlays: [] });
      setLiveAdjustments(DEFAULT_ADJUSTMENTS);
    }
  };

  // --- Optimized Adjustment Handlers ---

  const handleLiveAdjustmentUpdate = (key: keyof Adjustments, value: number) => {
      setLiveAdjustments(prev => ({ ...prev, [key]: value }));
  };

  const handleCommitAdjustment = () => {
      pushToHistory({ adjustments: liveAdjustments });
  };

  const handleApplyPreset = (preset: FilterPreset) => {
     const newAdj = { ...DEFAULT_ADJUSTMENTS, ...preset.adjustments };
     setLiveAdjustments(newAdj);
     pushToHistory({ adjustments: newAdj });
  };

  const handleResetAdjustments = () => {
    setLiveAdjustments(DEFAULT_ADJUSTMENTS);
    pushToHistory({ adjustments: DEFAULT_ADJUSTMENTS });
  };

  // --- Handlers: AI, Crop, Rotate ---

  const handleAiEdit = async (prompt: string) => {
    if (!currentImageSrc) return;
    setIsLoading(true);
    try {
      const bakedImage = await exportCanvasToBase64(currentImageSrc, liveAdjustments, currentOverlays);
      const newImage = await editImageWithGemini(bakedImage, prompt);
      pushToHistory({ imageSrc: newImage, adjustments: DEFAULT_ADJUSTMENTS, overlays: [] });
      setLiveAdjustments(DEFAULT_ADJUSTMENTS);
    } catch (error) {
      setErrorMsg("Failed to process image.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualCropStart = (ratio: number | 'free') => {
      setActiveTool('crop');
      setCropAspectRatio(ratio === 'free' ? undefined : ratio);
  };

  const handleApplyCrop = async () => {
      const cropper = cropperRef.current?.cropper;
      if (!cropper) return;
      
      setIsLoading(true);
      try {
          // Get cropped canvas. Note: Filters from live adjustments are NOT applied here to the raw crop.
          // They will be reapplied via CSS to the new cropped image, which is usually desired behavior.
          // If you want to bake filters in, you'd need to bake them before feeding to Cropper.
          const croppedDataUrl = cropper.getCroppedCanvas().toDataURL('image/png');
          
          pushToHistory({ imageSrc: croppedDataUrl });
          setActiveTool('adjust'); 
      } finally {
          setIsLoading(false);
      }
  };

  const handleRotate = async () => {
      if (!currentImageSrc) return;
      setIsLoading(true);
      try {
          const newImg = await rotateImage(currentImageSrc, 90);
          pushToHistory({ imageSrc: newImg });
      } finally {
          setIsLoading(false);
      }
  };

  // --- Handlers: Overlays ---
  const handleAddOverlayImage = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const newOverlay: Overlay = { id: Date.now().toString(), type: 'image', content: ev.target?.result as string, x: 50, y: 50, scale: 1, rotation: 0, width: 150, height: 150 };
            pushToHistory({ overlays: [...currentOverlays, newOverlay] });
        };
        reader.readAsDataURL(file);
     }
  };

  const handleAddText = (text: string, color: string) => {
     const newOverlay: Overlay = { id: Date.now().toString(), type: 'text', content: text, x: 50, y: 50, scale: 1, rotation: 0, color };
     pushToHistory({ overlays: [...currentOverlays, newOverlay] });
  };

  const handleAddSticker = (url: string) => {
     const newOverlay: Overlay = { id: Date.now().toString(), type: 'sticker', content: url, x: 50, y: 50, scale: 1, rotation: 0, width: 100, height: 100 };
     pushToHistory({ overlays: [...currentOverlays, newOverlay] });
  };
  
  const handleDownload = async () => {
    if (!currentImageSrc) return;
    const finalImage = await exportCanvasToBase64(currentImageSrc, liveAdjustments, currentOverlays);
    const link = document.createElement('a');
    link.download = `artify-edit-${Date.now()}.png`;
    link.href = finalImage;
    link.click();
  };

  const filterString = getCssFilterString(liveAdjustments);

  return (
    <div className="flex flex-col h-screen bg-[#f0f2f5] text-[#1f1f1f] font-sans overflow-hidden">
      
      {/* Header */}
      <header className="h-14 md:h-16 bg-white border-b border-[#dadce0] flex items-center px-4 shrink-0 z-40 relative shadow-sm">
        {currentImageSrc ? (
             <button onClick={handleGoHome} className="mr-3 p-2 text-[#5f6368] active:bg-gray-100 rounded-full" title="Home">
                <Home size={22} />
             </button>
        ) : (
             <div className="md:hidden mr-3 p-2 text-[#5f6368]"><Menu size={22} /></div>
        )}
        <div className="flex items-center gap-2 md:gap-4 md:w-64 shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-[#1a73e8] to-[#8ab4f8] rounded-lg flex items-center justify-center text-white shadow-sm"><ImageIcon size={18} /></div>
          <span className="text-lg md:text-[20px] text-[#444746] font-normal font-google">Artify</span>
        </div>
        <div className="flex items-center gap-2 ml-auto text-[#5f6368]">
          {currentImageSrc && (
              <button onClick={handleDownload} className="md:hidden p-2 text-[#1a73e8]"><Download size={24} /></button>
          )}
        </div>
      </header>

      {/* Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {currentImageSrc && (
            <ToolsPanel 
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                adjustments={liveAdjustments}
                updateAdjustment={handleLiveAdjustmentUpdate}
                commitAdjustment={handleCommitAdjustment}
                applyPreset={handleApplyPreset}
                resetAdjustments={handleResetAdjustments}
                onAiEdit={handleAiEdit}
                onCrop={handleManualCropStart}
                onApplyCrop={handleApplyCrop}
                onRotate={handleRotate}
                onAddText={handleAddText}
                onAddSticker={handleAddSticker}
                isProcessing={isLoading}
                isSidebarOpen={isSidebarOpen}
                onAddPhotoClick={() => overlayInputRef.current?.click()}
            />
        )}

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#eef1f5]">
            
            {/* Desktop Toolbar */}
            <div className="hidden md:flex h-14 border-b border-[#dadce0] bg-white items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                     {currentImageSrc && <button onClick={handleGoHome} className="text-[#5f6368] hover:text-[#1f1f1f] flex items-center gap-1 text-sm font-medium"><Home size={16}/> Home</button>}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleRevertToOriginal} disabled={!currentImageSrc} className="text-xs font-medium text-[#1a73e8] hover:bg-blue-50 px-3 py-1.5 rounded flex items-center gap-1"><RotateCcw size={14}/> Revert</button>
                    <div className="w-px h-4 bg-[#dadce0] mx-2"></div>
                     <button onClick={() => { if(historyIndex > 0) setHistoryIndex(historyIndex - 1) }} disabled={historyIndex <= 0} className="p-2 text-[#5f6368] disabled:opacity-30"><Undo size={18} /></button>
                     <button onClick={() => { if(historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1) }} disabled={historyIndex >= history.length - 1} className="p-2 text-[#5f6368] disabled:opacity-30"><Redo size={18} /></button>
                    <div className="w-px h-4 bg-[#dadce0] mx-2"></div>
                    <button onClick={handleDownload} disabled={!currentImageSrc} className="bg-[#1a73e8] text-white text-sm font-medium px-6 py-2 rounded-full hover:shadow-md transition-all">Export</button>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center pb-[220px] md:pb-8 relative scroll-smooth bg-[#e0e3e7]" ref={containerRef}>
                
                {isLoading && (
                    <div className="absolute inset-0 z-50 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 flex flex-col items-center">
                            <div className="w-8 h-8 border-4 border-[#1a73e8] border-t-transparent rounded-full animate-spin mb-2"></div>
                            <span className="text-sm font-medium">Processing...</span>
                        </div>
                    </div>
                )}

                {!currentImageSrc ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
                         <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"><Plus size={48} className="text-[#1a73e8] opacity-50" /></div>
                         <h3 className="text-2xl font-normal text-[#1f1f1f] mb-2 font-google">Start Designing</h3>
                         <button onClick={() => fileInputRef.current?.click()} className="bg-[#1f1f1f] text-white px-8 py-3 rounded-full hover:scale-105 transition-all font-medium text-lg shadow-lg flex items-center gap-2"><ImageIcon size={20} /> Select Photo</button>
                    </div>
                ) : (
                    activeTool === 'crop' ? (
                        <div className="w-full h-full flex items-center justify-center p-4">
                           <Cropper
                                src={currentImageSrc}
                                style={{ height: '100%', width: '100%', maxHeight: '75vh' }}
                                aspectRatio={cropAspectRatio}
                                guides={true}
                                ref={cropperRef}
                                viewMode={1}
                                dragMode="move"
                                background={false}
                                responsive={true}
                                checkOrientation={false} 
                            />
                        </div>
                    ) : (
                        <div className="relative shadow-xl transition-transform duration-200 inline-block" style={{ transform: `scale(${zoom})` }}>   
                            {/* Wrapper for image to ensure tight fit */}
                            <div className="relative inline-block">
                                <img ref={imgRef} src={currentImageSrc} alt="Workspace" className="max-w-full max-h-[70vh] w-auto h-auto block bg-white/5" style={{ filter: filterString }} />

                                {/* Overlays Layer */}
                                {currentOverlays.map(ov => (
                                    <div key={ov.id} onClick={(e) => { e.stopPropagation(); setSelectedOverlayId(ov.id); }} className={`absolute cursor-move select-none group ${selectedOverlayId === ov.id ? 'z-40' : 'z-30'}`} style={{ left: `${ov.x}%`, top: `${ov.y}%`, transform: `translate(-50%, -50%) scale(${ov.scale}) rotate(${ov.rotation}deg)` }}>
                                        {ov.type === 'text' ? (
                                            <div style={{ color: ov.color, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }} className="font-bold text-6xl whitespace-nowrap">{ov.content}</div>
                                        ) : (
                                            <img src={ov.content} alt="overlay" style={{ width: ov.width || 100 }} className="pointer-events-none" />
                                        )}
                                        {selectedOverlayId === ov.id && (
                                            <div className="absolute -inset-4 border-2 border-[#1a73e8] rounded-lg">
                                                <button onClick={(e) => { e.stopPropagation(); const newOvs = currentOverlays.filter(o => o.id !== ov.id); updateOverlays(newOvs); setSelectedOverlayId(null); }} className="absolute -top-3 -left-3 bg-red-500 text-white p-1 rounded-full"><X size={12} /></button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                )}
            </div>
        </main>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
      <input type="file" ref={overlayInputRef} onChange={handleAddOverlayImage} accept="image/*" className="hidden" />
    </div>
  );
};

export default App;