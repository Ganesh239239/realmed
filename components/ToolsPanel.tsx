import React, { useState } from 'react';
import { Adjustments, ToolType, FilterPreset } from '../types';
import { 
    Sliders, Layers, Sparkles, ChevronDown, RotateCcw, Zap, Check, 
    Sun, Contrast, Droplet, Eye, Palette, Aperture, Type, Smile, Crop, 
    Wand2, Image as ImageIcon, RotateCw, Scissors, Trash2, Layout, MousePointer2
} from 'lucide-react';

interface ToolsPanelProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  adjustments: Adjustments;
  updateAdjustment: (key: keyof Adjustments, value: number) => void; // Live update
  commitAdjustment: () => void; // History save
  applyPreset: (preset: FilterPreset) => void;
  resetAdjustments: () => void;
  onAiEdit: (prompt: string) => void;
  onCrop: (ratio: number | 'free') => void;
  onApplyCrop: () => void; // Apply manual crop
  onRotate: () => void;
  onAddText: (text: string, color: string) => void;
  onAddSticker: (url: string) => void;
  isProcessing: boolean;
  isSidebarOpen: boolean;
  onAddPhotoClick: () => void;
}

const PRESETS: FilterPreset[] = [
  { name: 'Normal', adjustments: { brightness: 100, contrast: 100, saturation: 100, grayscale: 0, sepia: 0 } },
  { name: 'B&W', adjustments: { grayscale: 100, contrast: 120 } },
  { name: 'Vintage', adjustments: { sepia: 80, brightness: 90, contrast: 110 } },
  { name: 'Vibrant', adjustments: { saturation: 150, contrast: 110, brightness: 105 } },
  { name: 'Matte', adjustments: { brightness: 110, saturation: 80, contrast: 90 } },
  { name: 'Punch', adjustments: { contrast: 150, saturation: 120, brightness: 90 } },
];

const EMOJI_STICKERS = [
    '❤️', '😂', '🔥', '✨', '🎉', '👍', '🌈', '😎', '💡', '🌟', 
    '🍀', '🍔', '🍕', '🚀', '🐱', '🐶', '🌺', '⚽', '👑', '💎'
];

const ADJUSTMENT_ICONS: Record<keyof Adjustments, any> = {
    brightness: Sun,
    contrast: Contrast,
    saturation: Droplet,
    blur: Eye,
    hue: Palette,
    sepia: Aperture,
    grayscale: Layers
};

export const ToolsPanel: React.FC<ToolsPanelProps> = (props) => {
    return (
        <>
            {/* Desktop Sidebar */}
            <div className={`hidden md:flex w-80 bg-white border-r border-[#dadce0] h-full flex-col shrink-0 shadow-[2px_0_5px_rgba(0,0,0,0.02)] z-20 ${!props.isSidebarOpen ? 'md:hidden' : ''}`}>
                <div className="flex-1 overflow-y-auto py-6 custom-scrollbar">
                    <DesktopPanelContent {...props} />
                </div>
            </div>

            {/* Mobile Bottom Bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-[#dadce0] shadow-[0_-4px_20px_rgba(0,0,0,0.15)] pb-[env(safe-area-inset-bottom)]">
                <MobilePanelContent {...props} />
            </div>
        </>
    );
};

// --- Mobile Implementation ---

const MobilePanelContent: React.FC<ToolsPanelProps> = ({
  activeTool, setActiveTool, adjustments, updateAdjustment, commitAdjustment, applyPreset, onAiEdit, isProcessing,
  onCrop, onApplyCrop, onRotate, onAddText, onAddSticker, onAddPhotoClick
}) => {
    const [activeMobileAdj, setActiveMobileAdj] = useState<keyof Adjustments | null>(null);
    const [aiPrompt, setAiPrompt] = useState('');
    const [textInput, setTextInput] = useState('');
    const [textColor, setTextColor] = useState('#ffffff');

    const getRange = (key: keyof Adjustments) => {
        if (key === 'blur') return { min: 0, max: 20 };
        if (key === 'hue') return { min: 0, max: 360 };
        if (key === 'sepia' || key === 'grayscale') return { min: 0, max: 100 };
        return { min: 0, max: 200 };
    };

    const NavItem = ({ id, label, icon: Icon }: { id: ToolType, label: string, icon: any }) => (
        <button 
            type="button"
            onClick={() => { setActiveTool(id); setActiveMobileAdj(null); }}
            className={`flex flex-col items-center gap-1 min-w-[72px] px-2 py-3 transition-colors active:scale-95 ${
                activeTool === id ? 'text-[#1a73e8]' : 'text-[#5f6368]'
            }`}
        >
            <div className={`p-1.5 rounded-full ${activeTool === id ? 'bg-[#e8f0fe]' : ''}`}>
                <Icon size={24} strokeWidth={activeTool === id ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-medium ${activeTool === id ? 'font-bold' : ''}`}>{label}</span>
        </button>
    );

    return (
        <div className="flex flex-col bg-white w-full">
            
            {/* Context Menu (Slide up) */}
            <div className="bg-[#f8f9fa] border-b border-[#dadce0] relative transition-all duration-300 ease-out w-full">
                
                {/* 1. Tools (Adjustments) */}
                {activeTool === 'adjust' && (
                    <div className="flex flex-col py-4 px-2 min-h-[140px] justify-center w-full">
                        {activeMobileAdj ? (
                             <div className="animate-in slide-in-from-bottom-2 fade-in duration-200 px-4 w-full">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-sm font-bold capitalize text-[#1f1f1f] flex items-center gap-2">
                                        {React.createElement(ADJUSTMENT_ICONS[activeMobileAdj], { size: 18 })}
                                        {activeMobileAdj}
                                    </span>
                                    <span className="text-xs font-mono bg-white border border-[#dadce0] px-2 py-1 rounded text-[#1a73e8] font-bold">
                                        {adjustments[activeMobileAdj].toFixed(0)}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min={getRange(activeMobileAdj).min}
                                    max={getRange(activeMobileAdj).max}
                                    value={adjustments[activeMobileAdj]}
                                    onChange={(e) => updateAdjustment(activeMobileAdj, Number(e.target.value))}
                                    onTouchEnd={commitAdjustment}
                                    onMouseUp={commitAdjustment}
                                    className="w-full h-2 bg-[#dadce0] rounded-lg appearance-none cursor-pointer accent-[#1a73e8]"
                                />
                                <div className="mt-4 flex justify-center">
                                    <button onClick={() => { setActiveMobileAdj(null); commitAdjustment(); }} className="text-[#1a73e8] text-xs font-bold uppercase tracking-wider py-2 px-4 hover:bg-blue-50 rounded-full">Done</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-4 overflow-x-auto hide-scrollbar px-2 pb-2 w-full">
                                <button onClick={onRotate} className="flex flex-col items-center gap-2 min-w-[64px] snap-center">
                                    <div className="w-12 h-12 rounded-full bg-white border border-[#dadce0] flex items-center justify-center text-[#5f6368] shadow-sm"><RotateCw size={20} /></div>
                                    <span className="text-[10px] font-medium text-[#444746]">Rotate</span>
                                </button>
                                <button onClick={() => onAiEdit("Remove background and make it white")} className="flex flex-col items-center gap-2 min-w-[64px] snap-center">
                                    <div className="w-12 h-12 rounded-full bg-white border border-[#dadce0] flex items-center justify-center text-[#5f6368] shadow-sm"><Scissors size={20} /></div>
                                    <span className="text-[10px] font-medium text-[#444746]">Remove BG</span>
                                </button>
                                {Object.keys(adjustments).map((key) => {
                                    const k = key as keyof Adjustments;
                                    const Icon = ADJUSTMENT_ICONS[k] || Sliders;
                                    return (
                                        <button key={k} onClick={() => setActiveMobileAdj(k)} className="flex flex-col items-center gap-2 min-w-[64px] snap-center">
                                            <div className="w-12 h-12 rounded-full bg-white border border-[#dadce0] flex items-center justify-center text-[#5f6368] shadow-sm"><Icon size={20} /></div>
                                            <span className="text-[10px] font-medium text-[#444746] capitalize">{k}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* 2. Effects */}
                {activeTool === 'filters' && (
                     <div className="flex gap-3 overflow-x-auto p-4 hide-scrollbar min-h-[140px] items-center w-full">
                        {PRESETS.map((p) => (
                            <button key={p.name} onClick={() => applyPreset(p)} className="flex flex-col gap-2 min-w-[80px] group flex-shrink-0">
                                <div className="w-20 h-20 bg-white rounded-lg border border-[#dadce0] overflow-hidden shadow-sm relative">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-gray-200 to-gray-300" style={{ filter: `brightness(${p.adjustments.brightness || 100}%) contrast(${p.adjustments.contrast || 100}%) sepia(${p.adjustments.sepia || 0}%)` }}></div>
                                </div>
                                <span className="text-xs text-center text-[#3c4043] font-medium">{p.name}</span>
                            </button>
                        ))}
                     </div>
                )}

                {/* 3. AI Magic */}
                {activeTool === 'ai-magic' && (
                    <div className="p-4 min-h-[140px] flex flex-col justify-center w-full">
                         <div className="relative flex items-center w-full">
                            <input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Describe edit..." className="w-full bg-white border border-[#dadce0] rounded-full px-5 py-3 text-sm focus:border-[#1a73e8] focus:outline-none pr-14 shadow-sm" />
                            <button onClick={() => onAiEdit(aiPrompt)} disabled={isProcessing || !aiPrompt.trim()} className="absolute right-1.5 bg-[#1a73e8] text-white rounded-full w-10 h-10 flex items-center justify-center disabled:bg-[#dadce0] shadow-sm">
                                {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Zap size={18} fill="currentColor" />}
                            </button>
                         </div>
                    </div>
                )}

                {/* 4. Text */}
                {activeTool === 'text' && (
                    <div className="p-4 min-h-[140px] flex flex-col items-center justify-center gap-3 w-full">
                        <div className="flex w-full gap-2">
                            <input value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="Enter text..." className="flex-1 bg-white border border-[#dadce0] rounded-lg px-4 py-2 text-sm" />
                            <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent" />
                        </div>
                        <button onClick={() => { if(textInput) { onAddText(textInput, textColor); setTextInput(''); setActiveTool('adjust'); } }} className="bg-[#1a73e8] text-white px-6 py-2 rounded-full text-sm font-medium w-full">
                            Add Text
                        </button>
                    </div>
                )}

                {/* 5. Stickers */}
                {activeTool === 'stickers' && (
                    <div className="grid grid-cols-5 gap-4 p-4 min-h-[140px] overflow-y-auto max-h-[200px] w-full">
                        {EMOJI_STICKERS.map((emoji, i) => (
                             <button key={i} onClick={() => onAddSticker(`data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${emoji}</text></svg>`)} className="text-3xl hover:scale-110 transition-transform">
                                {emoji}
                             </button>
                        ))}
                    </div>
                )}

                {/* 6. Crop */}
                {activeTool === 'crop' && (
                    <div className="flex flex-col w-full">
                        <div className="flex justify-center py-2 border-b border-gray-100">
                            <span className="text-xs text-[#5f6368]">Adjust crop box on image</span>
                        </div>
                        <div className="flex gap-4 overflow-x-auto p-4 hide-scrollbar min-h-[100px] items-center px-4 w-full">
                            <button onClick={onApplyCrop} className="bg-[#1a73e8] text-white px-4 py-2 rounded-full text-sm font-bold shadow-sm whitespace-nowrap flex items-center gap-2">
                                <Check size={16} /> Apply
                            </button>
                            <div className="w-px h-8 bg-gray-200 mx-2 flex-shrink-0"></div>
                            <button onClick={() => onCrop(1)} className="min-w-[60px] flex flex-col items-center gap-2 text-[#5f6368]"><div className="w-8 h-8 border-2 border-current rounded-sm"></div><span className="text-[10px]">1:1</span></button>
                            <button onClick={() => onCrop(4/3)} className="min-w-[60px] flex flex-col items-center gap-2 text-[#5f6368]"><div className="w-8 h-6 border-2 border-current rounded-sm"></div><span className="text-[10px]">4:3</span></button>
                            <button onClick={() => onCrop(16/9)} className="min-w-[60px] flex flex-col items-center gap-2 text-[#5f6368]"><div className="w-8 h-5 border-2 border-current rounded-sm"></div><span className="text-[10px]">16:9</span></button>
                        </div>
                    </div>
                )}

            </div>

            {/* Navigation Bar */}
            <div className="flex items-center overflow-x-auto hide-scrollbar bg-white py-1 pb-[calc(4px+env(safe-area-inset-bottom))] px-2 w-full flex-nowrap">
                <NavItem id="adjust" label="Tools" icon={Sliders} />
                <NavItem id="filters" label="Effects" icon={Wand2} />
                <NavItem id="text" label="Text" icon={Type} />
                <NavItem id="stickers" label="Sticker" icon={Smile} />
                <NavItem id="crop" label="Crop" icon={Crop} />
                <NavItem id="ai-magic" label="AI Magic" icon={Sparkles} />
                <div className="w-px h-8 bg-gray-200 mx-2 flex-shrink-0"></div>
                <button type="button" onClick={onAddPhotoClick} className="flex flex-col items-center gap-1 min-w-[72px] px-2 py-3 text-[#9aa0a6] hover:text-[#1a73e8]">
                    <ImageIcon size={24} strokeWidth={2} />
                    <span className="text-[10px] font-medium">Add Photo</span>
                </button>
            </div>
        </div>
    );
}

// --- Desktop Implementation ---

const DesktopPanelContent: React.FC<ToolsPanelProps> = ({ 
  activeTool, setActiveTool, adjustments, updateAdjustment, commitAdjustment, applyPreset, resetAdjustments, onAiEdit, isProcessing,
  onCrop, onApplyCrop, onRotate, onAddText, onAddSticker, onAddPhotoClick
}) => {
  const [aiPrompt, setAiPrompt] = React.useState('');
  const [textInput, setTextInput] = React.useState('');
  const [textColor, setTextColor] = React.useState('#ffffff');

  const DesktopNavItem = ({ id, label, icon: Icon, children }: { id: ToolType, label: string, icon: any, children?: React.ReactNode }) => {
    // Only expand if active. Clicking header toggles it off or switches to it.
    const isActive = activeTool === id;
    return (
      <div className="mb-2">
        <button
          onClick={() => setActiveTool(isActive ? null as any : id)}
          className={`w-full flex items-center px-6 py-3.5 text-sm font-medium transition-all rounded-r-full mr-2 relative ${
            isActive ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'text-[#3c4043] hover:bg-[#f1f3f4]'
          }`}
        >
          {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1a73e8] rounded-r"></div>}
          <Icon size={20} className={`mr-4 ${isActive ? 'text-[#1a73e8]' : 'text-[#5f6368]'}`} />
          <span className="flex-1 text-left tracking-wide">{label}</span>
          {isActive && <ChevronDown size={16} className="text-[#1a73e8]" />}
        </button>
        {isActive && children && (
          <div className="ml-0 pl-0 pb-4 animate-in slide-in-from-top-2 duration-200 bg-white">
             {children}
          </div>
        )}
      </div>
    );
  };

  const SliderControl = ({ label, prop, min, max }: { label: string, prop: keyof Adjustments, min: number, max: number }) => (
    <div className="px-6 py-3 hover:bg-[#f8f9fa] transition-colors">
      <div className="flex justify-between mb-2">
        <label className="text-xs font-bold text-[#5f6368] uppercase tracking-wider">{label}</label>
        <span className="text-xs font-mono text-[#1a73e8] bg-[#e8f0fe] px-1.5 rounded">{adjustments[prop].toFixed(0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={adjustments[prop]}
        onChange={(e) => updateAdjustment(prop, Number(e.target.value))}
        onMouseUp={commitAdjustment} // Commit on release
        className="w-full h-1.5 bg-[#dadce0] rounded-lg appearance-none cursor-pointer accent-[#1a73e8]"
      />
    </div>
  );

  return (
    <>
      <div className="px-6 mb-6">
        <span className="text-xs font-bold text-[#9aa0a6] uppercase tracking-widest">Editor Tools</span>
      </div>

      <DesktopNavItem id="adjust" label="Adjustments" icon={Sliders}>
         <div className="mt-2 space-y-1">
            <div className="px-6 flex justify-between mb-4 mt-2">
                <button onClick={onRotate} className="flex flex-col items-center gap-1 text-[#5f6368] hover:text-[#1a73e8] text-xs"><div className="p-2 border rounded-full hover:bg-gray-50"><RotateCw size={16} /></div>Rotate</button>
                <button onClick={() => onAiEdit("Remove background")} className="flex flex-col items-center gap-1 text-[#5f6368] hover:text-[#1a73e8] text-xs"><div className="p-2 border rounded-full hover:bg-gray-50"><Scissors size={16} /></div>Remove BG</button>
                 <button onClick={resetAdjustments} className="flex flex-col items-center gap-1 text-[#5f6368] hover:text-[#1a73e8] text-xs"><div className="p-2 border rounded-full hover:bg-gray-50"><RotateCcw size={16} /></div>Reset</button>
            </div>
            <SliderControl label="Brightness" prop="brightness" min={0} max={200} />
            <SliderControl label="Contrast" prop="contrast" min={0} max={200} />
            <SliderControl label="Saturation" prop="saturation" min={0} max={200} />
            <SliderControl label="Blur" prop="blur" min={0} max={20} />
            <SliderControl label="Hue" prop="hue" min={0} max={360} />
            <SliderControl label="Sepia" prop="sepia" min={0} max={100} />
         </div>
      </DesktopNavItem>

      <DesktopNavItem id="filters" label="Filters" icon={Wand2}>
         <div className="px-6 py-3 grid grid-cols-2 gap-3">
            {PRESETS.map(p => (
                <button key={p.name} onClick={() => applyPreset(p)} className="text-xs border border-[#dadce0] rounded-lg py-3 hover:bg-[#f1f3f4] hover:border-[#1a73e8] text-[#3c4043] font-medium flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100" style={{ filter: `brightness(${p.adjustments.brightness || 100}%) contrast(${p.adjustments.contrast || 100}%)` }}></div>
                    {p.name}
                </button>
            ))}
         </div>
      </DesktopNavItem>

      <DesktopNavItem id="crop" label="Crop" icon={Crop}>
          <div className="px-6 py-3 flex flex-col gap-3">
             <div className="text-xs text-gray-500 mb-2">Adjust the box on the image manually or use presets:</div>
             <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => onCrop(1)} className="p-2 border rounded text-xs hover:bg-gray-50">Square (1:1)</button>
                 <button onClick={() => onCrop(4/3)} className="p-2 border rounded text-xs hover:bg-gray-50">4:3</button>
                 <button onClick={() => onCrop(16/9)} className="p-2 border rounded text-xs hover:bg-gray-50">16:9</button>
             </div>
             <button onClick={onApplyCrop} className="w-full bg-[#1a73e8] text-white py-2 rounded-lg text-sm font-medium mt-2">Apply Crop</button>
          </div>
      </DesktopNavItem>

      <DesktopNavItem id="text" label="Text" icon={Type}>
        <div className="px-6 py-3">
             <input value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="Enter text..." className="w-full bg-white border border-[#dadce0] rounded-lg px-3 py-2 text-sm mb-3" />
            <div className="flex gap-2 mb-3">
                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-[#dadce0]" />
                <span className="text-xs text-gray-500 self-center">Pick Color</span>
            </div>
            <button onClick={() => { if(textInput) { onAddText(textInput, textColor); setTextInput(''); } }} className="w-full bg-[#1a73e8] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1557b0]">Add Text Layer</button>
        </div>
      </DesktopNavItem>

      <DesktopNavItem id="stickers" label="Stickers" icon={Smile}>
        <div className="px-6 py-3 grid grid-cols-5 gap-2">
            {EMOJI_STICKERS.map((emoji, i) => (
                    <button key={i} onClick={() => onAddSticker(`data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${emoji}</text></svg>`)} className="text-2xl hover:scale-125 transition-transform p-1">{emoji}</button>
            ))}
        </div>
      </DesktopNavItem>

      <DesktopNavItem id="ai-magic" label="Magic Editor" icon={Sparkles}>
         <div className="px-6 py-2">
            <div className="bg-[#f8f9fa] border border-[#dadce0] rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-[#1a73e8]"><Zap size={14} /><span className="text-xs font-bold uppercase">Generative AI</span></div>
                <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Describe change..." className="w-full bg-white border border-[#dadce0] rounded-lg p-3 text-sm h-28 resize-none mb-4" />
                <button onClick={() => onAiEdit(aiPrompt)} disabled={isProcessing || !aiPrompt.trim()} className="w-full py-2 bg-[#1a73e8] text-white rounded-lg text-sm font-medium">Generate</button>
            </div>
         </div>
      </DesktopNavItem>
      
      <button onClick={onAddPhotoClick} className="mx-6 mt-4 flex items-center justify-center gap-2 border border-dashed border-[#dadce0] rounded-xl p-3 text-[#5f6368] hover:border-[#1a73e8] transition-colors">
        <ImageIcon size={20} /><span className="text-sm font-medium">Upload Overlay Image</span>
      </button>

      <div className="h-10"></div>
    </>
  );
};