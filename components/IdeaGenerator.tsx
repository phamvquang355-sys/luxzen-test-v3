import React, { useState, useRef } from 'react';
import { FileData, IdeaAsset, IdeaGeneratorProps } from '../types';
import { ImageUpload } from './common/ImageUpload';
import { Spinner } from './Spinner';
import * as geminiService from '../services/geminiService';

// Icons as components
const WandIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h0"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;
const LayoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>;
const LayersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;

// Helper to calculate actual image dimensions within object-contain
const getRenderedImageRect = (img: HTMLImageElement) => {
  const ratio = img.naturalWidth / img.naturalHeight;
  const width = img.width;
  const height = img.height;
  let renderedWidth, renderedHeight, left, top;

  if (width / height > ratio) {
    // Container is wider than image (Pillarbox)
    renderedHeight = height;
    renderedWidth = height * ratio;
  } else {
    // Container is taller than image (Letterbox)
    renderedWidth = width;
    renderedHeight = width / ratio;
  }

  left = (width - renderedWidth) / 2;
  top = (height - renderedHeight) / 2;

  return { left, top, width: renderedWidth, height: renderedHeight };
};

export const IdeaGenerator: React.FC<IdeaGeneratorProps> = ({ state, onStateChange }) => {
  // --- STATE ---
  const [sketchImage, setSketchImage] = useState<FileData | null>(state.sourceSketch || null);
  const [styleImage, setStyleImage] = useState<FileData | null>(state.referenceStyle || null);
  const [assets, setAssets] = useState<IdeaAsset[]>(state.assets || []); 
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<string>('');
  const [numberOfImages, setNumberOfImages] = useState<number>(1);
  
  const [result, setResult] = useState<{ structure: string; final: string[] } | null>(null);
  const [showDebugStructure, setShowDebugStructure] = useState(false);
  
  // Drawing Box State
  const imgRef = useRef<HTMLImageElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null);
  const [currentSelection, setCurrentSelection] = useState<{ x: number, y: number, width: number, height: number } | null>(null);

  // Hidden file input ref for asset upload
  const hiddenAssetInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAssetId, setUploadingAssetId] = useState<string | null>(null);

  // --- HANDLERS ---
  const handleSketchUpload = (file: FileData) => {
    setSketchImage(file);
    setResult(null); 
    setAssets([]); // Reset assets when new sketch uploaded
    onStateChange({ sourceSketch: file });
  };

  const handleStyleUpload = (file: FileData) => {
    setStyleImage(file);
    onStateChange({ referenceStyle: file });
  };

  // --- REGION SELECTION LOGIC ---
  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current || isProcessing) return;
    e.preventDefault();
    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPoint({ x, y });
    setIsDrawing(true);
    setCurrentSelection({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isDrawing || !startPoint || !imgRef.current) return;
    e.preventDefault();
    const rect = imgRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    const width = Math.abs(currentX - startPoint.x);
    const height = Math.abs(currentY - startPoint.y);
    const x = Math.min(currentX, startPoint.x);
    const y = Math.min(currentY, startPoint.y);

    setCurrentSelection({ x, y, width, height });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !startPoint || !currentSelection || !imgRef.current) return;
    setIsDrawing(false);

    // Only add if area is significant
    if (currentSelection.width > 10 && currentSelection.height > 10) {
        // Calculate based on ACTUAL rendered image dimensions (excluding padding)
        const rendered = getRenderedImageRect(imgRef.current);
        
        // Convert from element coordinates to image content coordinates
        const relativeX = currentSelection.x - rendered.left;
        const relativeY = currentSelection.y - rendered.top;
        
        if (rendered.width > 0 && rendered.height > 0) {
            const newAsset: IdeaAsset = {
                id: Date.now().toString(),
                x: Math.max(0, Math.min(100, (relativeX / rendered.width) * 100)),
                y: Math.max(0, Math.min(100, (relativeY / rendered.height) * 100)),
                width: Math.min(100, (currentSelection.width / rendered.width) * 100),
                height: Math.min(100, (currentSelection.height / rendered.height) * 100),
                image: null,
                label: `Khu vực ${assets.length + 1}`
            };

            const newAssets = [...assets, newAsset];
            setAssets(newAssets);
            onStateChange({ assets: newAssets });
        }
    }
    
    setStartPoint(null);
    setCurrentSelection(null);
  };

  // --- ASSET MANAGEMENT ---
  const handleRemoveAsset = (id: string) => {
      const newAssets = assets.filter(a => a.id !== id);
      setAssets(newAssets);
      onStateChange({ assets: newAssets });
  };

  const triggerAssetUpload = (id: string) => {
      setUploadingAssetId(id);
      hiddenAssetInputRef.current?.click();
  };

  const handleAssetImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && uploadingAssetId) {
          const file = e.target.files[0];
          const objectURL = URL.createObjectURL(file);
          const { base64, mimeType } = await geminiService.resizeAndCompressImage(file, 512, 0.8);
          
          const newAssets = assets.map(a => {
              if (a.id === uploadingAssetId) {
                  return {
                      ...a,
                      image: {
                          file,
                          objectURL,
                          base64,
                          mimeType
                      },
                      label: a.label.startsWith('Khu vực') ? file.name.split('.')[0] : a.label
                  };
              }
              return a;
          });
          setAssets(newAssets);
          onStateChange({ assets: newAssets });
          setUploadingAssetId(null);
          if (hiddenAssetInputRef.current) hiddenAssetInputRef.current.value = '';
      }
  };

  const handleGenerateOnePass = async () => {
    if (!sketchImage) return;
    setIsProcessing(true);
    setProcessStatus('Đang phân tích không gian & Dựng decor...');

    try {
      const styleDesc = styleImage 
        ? "Follow the visual style of the reference image exactly." 
        : `Professional Wedding Design`;

      const data = await geminiService.generateSeamlessIdea(
        sketchImage.base64,
        sketchImage.mimeType,
        styleImage || null,
        styleDesc,
        assets,
        numberOfImages, // Pass user selected count
        (status) => setProcessStatus(status)
      );

      setResult(data);
      setProcessStatus('Hoàn tất!');
    } catch (error) {
      console.error(error);
      alert('Lỗi xử lý. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full min-h-[calc(100vh-150px)]">
      {/* Hidden Input for Asset Upload */}
      <input 
        type="file" 
        ref={hiddenAssetInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={handleAssetImageChange}
      />

      {/* Header Loading State */}
      {isProcessing && (
        <div className="w-full bg-indigo-50 text-indigo-800 p-3 rounded-lg flex items-center justify-center animate-pulse border border-indigo-100">
          <Spinner />
          <span className="font-medium ml-2">{processStatus}</span>
        </div>
      )}

      {/* --- TOP SECTION: 2 COLUMNS (30% Left - 70% Right) --- */}
      <div className="flex flex-col lg:flex-row gap-6 h-[800px]">
        
        {/* === LEFT COLUMN (30%): STYLE & LIST === */}
        <div className="w-full lg:w-[30%] flex flex-col gap-4 h-full min-w-[300px] overflow-hidden">
            
            {/* 1. Style Reference (Top) */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider flex items-center">
                  <span className="bg-gray-800 text-white w-5 h-5 rounded flex items-center justify-center text-xs mr-2">1</span>
                  Style Tổng Thể
                </h3>
                <div className="h-32">
                    <ImageUpload onFileSelect={handleStyleUpload} previewUrl={styleImage?.objectURL || null} placeholder="Ảnh Moodboard..." compact />
                </div>
            </div>

            {/* 2. Asset List (Middle - Scrollable) */}
            <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Danh sách Decor ({assets.length})</h3>
                    <span className="text-[10px] text-gray-400">Khoanh vùng ở bên phải ➔</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {assets.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-lg p-4 opacity-60">
                        <LayoutIcon />
                        <p className="mt-2 text-xs text-center">Chưa có vùng chọn.</p>
                    </div>
                    ) : (
                    assets.map((asset, idx) => (
                        <div key={asset.id} className="flex gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100 shadow-sm group hover:border-blue-300 transition-colors">
                            <div className="flex flex-col items-center gap-1">
                                <span className="bg-blue-100 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">
                                #{idx + 1}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <input 
                                    type="text" 
                                    value={asset.label}
                                    onChange={(e) => {
                                        const newAssets = assets.map(a => a.id === asset.id ? { ...a, label: e.target.value } : a);
                                        setAssets(newAssets);
                                    }}
                                    className="font-bold text-xs text-gray-800 bg-transparent border-none focus:ring-0 p-0 w-full truncate placeholder-gray-400"
                                    placeholder="Tên vật thể..."
                                />
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                    Vùng: {Math.round(asset.width)}% x {Math.round(asset.height)}%
                                </p>
                            </div>
                            <div className="relative w-8 h-8 flex-shrink-0">
                                {asset.image ? (
                                    <div className="w-full h-full relative group/img cursor-pointer" onClick={() => triggerAssetUpload(asset.id)}>
                                        <img src={asset.image.objectURL} alt="Asset" className="w-full h-full object-cover rounded-md border border-gray-200" />
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => triggerAssetUpload(asset.id)}
                                        className="w-full h-full bg-white rounded-md border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-blue-500"
                                        title="Tải ảnh"
                                    >
                                        <UploadIcon />
                                    </button>
                                )}
                            </div>
                            <button onClick={() => handleRemoveAsset(asset.id)} className="text-gray-300 hover:text-red-500">
                                <TrashIcon />
                            </button>
                        </div>
                    ))
                    )}
                </div>
            </div>

            {/* 3. Controls (Bottom) */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Số lượng phương án</label>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        {[1, 2, 3, 4].map(num => (
                            <button
                                key={num}
                                onClick={() => setNumberOfImages(num)}
                                className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${
                                    numberOfImages === num ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleGenerateOnePass}
                    disabled={!sketchImage || isProcessing}
                    className={`w-full py-3 text-sm font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2
                        ${!sketchImage || isProcessing
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:scale-[1.02] hover:shadow-blue-500/25'}`}
                >
                    {isProcessing ? <Spinner /> : <WandIcon />}
                    TẠO Ý TƯỞNG
                </button>
            </div>
        </div>

        {/* === RIGHT COLUMN (70%): SKETCH CANVAS === */}
        <div className="w-full lg:w-[70%] h-full flex flex-col">
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 h-full flex flex-col relative group">
                <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center">
                        <span className="bg-gray-800 text-white w-5 h-5 rounded flex items-center justify-center text-xs mr-2">2</span>
                        Phác thảo & Khoanh vùng
                    </span>
                    <button 
                        onClick={() => { setSketchImage(null); setAssets([]); setResult(null); onStateChange({ sourceSketch: null, assets: [] }); }}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Xóa tất cả"
                    >
                        <TrashIcon />
                    </button>
                </h3>
                
                <div className="flex-1 relative bg-gray-100 rounded-lg overflow-hidden border border-dashed border-gray-300 flex items-center justify-center select-none">
                    {!sketchImage ? (
                        <div className="w-full h-full p-10">
                             <ImageUpload onFileSelect={handleSketchUpload} previewUrl={null} placeholder="Tải ảnh phác thảo (Sketch)..." />
                        </div>
                    ) : (
                        <div className="relative w-full h-full flex items-center justify-center bg-gray-900 overflow-hidden">
                            <img 
                                ref={imgRef}
                                src={sketchImage.objectURL}
                                alt="Sketch"
                                className="max-w-full max-h-full object-contain cursor-crosshair"
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                draggable={false}
                            />
                            
                            {/* Selection Box */}
                            {currentSelection && (
                                <div 
                                    className="absolute border-2 border-dashed border-blue-400 bg-blue-400/20 pointer-events-none"
                                    style={{
                                        left: currentSelection.x,
                                        top: currentSelection.y,
                                        width: currentSelection.width,
                                        height: currentSelection.height
                                    }}
                                />
                            )}

                            {/* Defined Regions */}
                            {assets.map((asset, idx) => {
                                const imgRect = imgRef.current ? getRenderedImageRect(imgRef.current) : { left: 0, top: 0, width: 100, height: 100 };
                                const leftPx = imgRect.left + (asset.x / 100) * imgRect.width;
                                const topPx = imgRect.top + (asset.y / 100) * imgRect.height;
                                const widthPx = (asset.width / 100) * imgRect.width;
                                const heightPx = (asset.height / 100) * imgRect.height;

                                return (
                                    <div 
                                        key={asset.id}
                                        className="absolute border-2 border-blue-500 bg-blue-500/10 flex items-start justify-start group/pin"
                                        style={{ left: leftPx, top: topPx, width: widthPx, height: heightPx }}
                                    >
                                        <span className="bg-blue-500 text-white text-[10px] font-bold px-1 rounded-br shadow-sm">#{idx + 1}</span>
                                        <div className="absolute top-0 right-0 -mt-2 -mr-2 opacity-0 group-hover/pin:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); handleRemoveAsset(asset.id); }} className="bg-red-500 text-white rounded-full p-1"><TrashIcon /></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                 <div className="mt-3 text-xs text-gray-500 flex justify-between">
                     <p>💡 Kéo chuột trên ảnh để tạo vùng chọn.</p>
                     <p>{sketchImage ? `${Math.round(sketchImage.width || 0)} x ${Math.round(sketchImage.height || 0)} px` : ''}</p>
                 </div>
            </div>
        </div>
      </div>

      {/* --- BOTTOM SECTION (100%): RESULTS --- */}
      {result && (
        <div className="w-full bg-white p-6 rounded-xl shadow-lg border border-gray-200 animate-in fade-in slide-in-from-bottom-8 duration-500 mb-8">
             <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    ✨ Kết quả Ý Tưởng ({result.final.length})
                </h3>
                <div className="flex gap-2">
                     <button 
                        onClick={() => setShowDebugStructure(!showDebugStructure)}
                        className={`text-sm px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${showDebugStructure ? 'bg-orange-50 text-orange-700 border-orange-200' : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                     >
                        <LayersIcon /> {showDebugStructure ? 'Đang xem Khung Sườn' : 'Xem Khung Sườn'}
                     </button>
                     <button onClick={() => setResult(null)} className="text-sm text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors">Đóng kết quả</button>
                </div>
            </div>

            <div className={`grid gap-6 ${result.final.length === 1 ? 'grid-cols-1 max-w-4xl mx-auto' : 'grid-cols-1 md:grid-cols-2'}`}>
                {result.final.map((imgSrc, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden shadow-md bg-gray-900">
                        <img 
                            src={showDebugStructure ? result.structure : imgSrc} 
                            alt={`Option ${idx + 1}`} 
                            className="w-full h-auto object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <a href={imgSrc} download={`idea-render-${idx+1}.png`} className="px-6 py-2 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform">
                                Tải xuống
                            </a>
                        </div>
                        <div className="absolute top-4 left-4 bg-black/60 text-white text-xs font-bold px-3 py-1 rounded-full">
                            Phương án {idx + 1}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};