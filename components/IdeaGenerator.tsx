import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FileData, IdeaAsset, IdeaGeneratorProps } from '../types';
import { ImageUpload } from './common/ImageUpload';
import { Spinner } from './Spinner';
import * as geminiService from '../services/geminiService';

// Icons
const WandIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h0"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;
const LayoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>;
const LayersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;

const getRenderedImageRect = (img: HTMLImageElement) => {
  const ratio = img.naturalWidth / img.naturalHeight;
  const width = img.width;   
  const height = img.height; 
  let renderedWidth, renderedHeight, left, top;

  if (width / height > ratio) {
    renderedHeight = height;
    renderedWidth = height * ratio;
  } else {
    renderedWidth = width;
    renderedHeight = width / ratio;
  }

  left = (width - renderedWidth) / 2;
  top = (height - renderedHeight) / 2;

  return { left, top, width: renderedWidth, height: renderedHeight };
};

export const IdeaGenerator: React.FC<IdeaGeneratorProps> = ({ state, onStateChange }) => {
  const [sketchImage, setSketchImage] = useState<FileData | null>(state.sourceSketch || null);
  const [styleImage, setStyleImage] = useState<FileData | null>(state.referenceStyle || null);
  const [assets, setAssets] = useState<IdeaAsset[]>(state.assets || []); 
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<string>('');
  const [numberOfImages, setNumberOfImages] = useState<number>(1);
  
  const [result, setResult] = useState<{ structure: string; final: string[] } | null>(null);
  const [showDebugStructure, setShowDebugStructure] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageMetrics, setImageMetrics] = useState({ left: 0, top: 0, width: 0, height: 0 }); 
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null); 
  const [currentSelection, setCurrentSelection] = useState<{ x: number, y: number, width: number, height: number } | null>(null); 

  const hiddenAssetInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAssetId, setUploadingAssetId] = useState<string | null>(null);

  const updateMetrics = useCallback(() => {
      if (!imgRef.current || !containerRef.current || !sketchImage) return;
      
      const img = imgRef.current;
      const container = containerRef.current;
      
      const imgRect = img.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      const imgElemLeft = imgRect.left - containerRect.left;
      const imgElemTop = imgRect.top - containerRect.top;
      
      const rendered = getRenderedImageRect(img);
      
      setImageMetrics({
          left: imgElemLeft + rendered.left,
          top: imgElemTop + rendered.top,
          width: rendered.width,
          height: rendered.height
      });
  }, [sketchImage]);

  useEffect(() => {
      window.addEventListener('resize', updateMetrics);
      return () => window.removeEventListener('resize', updateMetrics);
  }, [updateMetrics]);

  const handleSketchUpload = (file: FileData) => {
    setSketchImage(file);
    setResult(null); 
    setAssets([]); 
    onStateChange({ sourceSketch: file });
  };

  const handleStyleUpload = (file: FileData) => {
    setStyleImage(file);
    onStateChange({ referenceStyle: file });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !imgRef.current || isProcessing) return;
    e.preventDefault();
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setStartPoint({ x, y });
    setIsDrawing(true);
    setCurrentSelection({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPoint || !containerRef.current) return;
    e.preventDefault();
    
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    const width = Math.abs(currentX - startPoint.x);
    const height = Math.abs(currentY - startPoint.y);
    const x = Math.min(currentX, startPoint.x);
    const y = Math.min(currentY, startPoint.y);

    setCurrentSelection({ x, y, width, height });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !startPoint || !currentSelection) return;
    setIsDrawing(false);

    if (currentSelection.width > 10 && currentSelection.height > 10) {
        const relativeX = currentSelection.x - imageMetrics.left;
        const relativeY = currentSelection.y - imageMetrics.top;
        
        if (imageMetrics.width > 0 && imageMetrics.height > 0) {
            const xPercent = Math.max(0, Math.min(100, (relativeX / imageMetrics.width) * 100));
            const yPercent = Math.max(0, Math.min(100, (relativeY / imageMetrics.height) * 100));
            const wPercent = Math.min(100 - xPercent, (currentSelection.width / imageMetrics.width) * 100);
            const hPercent = Math.min(100 - yPercent, (currentSelection.height / imageMetrics.height) * 100);

            const newAsset: IdeaAsset = {
                id: Date.now().toString(),
                x: xPercent,
                y: yPercent,
                width: wPercent,
                height: hPercent,
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
                      image: { file, objectURL, base64, mimeType },
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
    
    try {
      const styleDesc = styleImage ? "Follow the visual style of the reference image exactly." : `Professional Wedding Design`;
      
      let backgroundOverride: FileData | undefined = undefined;

      if (result && result.final && result.final.length > 0) {
          const currentResultDataURI = result.final[0];
          const parts = currentResultDataURI.split(';base64,');
          const mimeType = parts[0].replace('data:', '');
          const base64 = parts[1];
          
          backgroundOverride = {
              base64: base64,
              mimeType: mimeType,
              objectURL: currentResultDataURI 
          };
          
          setProcessStatus('Đang ghép Decor vào không gian có sẵn (Bước 2)...');
      } else {
          setProcessStatus('Đang dựng không gian kiến trúc & Decor (Bước 1)...');
      }

      const data = await geminiService.generateSeamlessIdea(
        sketchImage.base64,
        sketchImage.mimeType,
        styleImage || null,
        styleDesc,
        assets,
        numberOfImages,
        (status) => setProcessStatus(status),
        backgroundOverride 
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
      <input type="file" ref={hiddenAssetInputRef} className="hidden" accept="image/*" onChange={handleAssetImageChange} />

      {isProcessing && (
        <div className="w-full bg-theme-surface2 text-theme-gold p-4 rounded-xl flex items-center justify-center animate-pulse border border-theme-gold/20">
          <Spinner />
          <span className="font-normal ml-2 tracking-wide uppercase text-sm">{processStatus}</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 h-[800px]">
        {/* LEFT COLUMN */}
        <div className="w-full lg:w-[30%] flex flex-col gap-4 h-full min-w-[300px] overflow-hidden">
            <div className="bg-theme-surface p-4 rounded-2xl shadow-xl border border-theme-gold/10">
                {/* H3 -> text-base font-normal */}
                <h3 className="text-base font-normal text-theme-text-main mb-3 uppercase tracking-widest flex items-center">
                  <span className="bg-theme-gold text-theme-base w-5 h-5 rounded flex items-center justify-center text-xs mr-2">1</span>
                  Style Tổng Thể
                </h3>
                <div className="h-32">
                    <ImageUpload onFileSelect={handleStyleUpload} previewUrl={styleImage?.objectURL || null} placeholder="Ảnh Moodboard..." compact />
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-theme-surface rounded-2xl shadow-xl border border-theme-gold/10 overflow-hidden">
                <div className="p-3 border-b border-theme-gold/10 bg-theme-surface2 flex justify-between items-center">
                    {/* H3 -> text-base (scaled down slightly for list header) or keep text-xs? Prompt says H3 for sidebar section headers. This is a section header inside a panel. Let's use text-xs or text-sm for list header, font-normal */}
                    <h3 className="text-xs font-normal text-theme-text-main uppercase tracking-widest">Danh sách Decor ({assets.length})</h3>
                    {/* Micro -> text-[11px] font-normal */}
                    <span className="text-[11px] text-theme-text-sub font-normal">Khoanh vùng ở bên phải ➔</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {assets.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-theme-text-sub border-2 border-dashed border-theme-gold/10 rounded-xl p-4 opacity-70">
                        <LayoutIcon />
                        <p className="mt-2 text-xs text-center">Chưa có vùng chọn nào.</p>
                    </div>
                    ) : (
                    assets.map((asset, idx) => (
                        <div key={asset.id} className="flex gap-2 p-2 bg-theme-base rounded-lg border border-theme-gold/10 shadow-sm group hover:border-theme-gold/50 transition-colors">
                            <div className="flex flex-col items-center gap-1">
                                <span className="bg-theme-gold text-theme-base w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-normal">#{idx + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <input 
                                    type="text" 
                                    value={asset.label}
                                    onChange={(e) => {
                                        const newAssets = assets.map(a => a.id === asset.id ? { ...a, label: e.target.value } : a);
                                        setAssets(newAssets);
                                    }}
                                    className="font-normal text-xs text-theme-text-main bg-transparent border-none focus:ring-0 p-0 w-full truncate placeholder-theme-text-sub/50"
                                    placeholder="Tên vật thể..."
                                />
                                <p className="text-[11px] text-theme-text-sub mt-0.5">Vùng: {Math.round(asset.width)}% x {Math.round(asset.height)}%</p>
                            </div>
                            <div className="relative w-8 h-8 flex-shrink-0">
                                {asset.image ? (
                                    <div className="w-full h-full relative group/img cursor-pointer" onClick={() => triggerAssetUpload(asset.id)}>
                                        <img src={asset.image.objectURL} alt="Asset" className="w-full h-full object-cover rounded-md border border-theme-gold/20" />
                                    </div>
                                ) : (
                                    <button onClick={() => triggerAssetUpload(asset.id)} className="w-full h-full bg-theme-surface rounded-md border border-dashed border-theme-gold/30 flex items-center justify-center text-theme-text-sub hover:text-theme-gold hover:border-theme-gold"><UploadIcon /></button>
                                )}
                            </div>
                            <button onClick={() => handleRemoveAsset(asset.id)} className="text-theme-text-sub hover:text-red-500"><TrashIcon /></button>
                        </div>
                    )))}
                </div>
            </div>

            <div className="bg-theme-surface p-4 rounded-2xl shadow-xl border border-theme-gold/10 space-y-4">
                <div>
                    <label className="block text-xs font-normal text-theme-text-sub mb-2 uppercase tracking-widest">Số lượng phương án</label>
                    <div className="flex bg-theme-base rounded-xl p-1 border border-theme-gold/10">
                        {[1, 2, 3, 4].map(num => (
                            <button key={num} onClick={() => setNumberOfImages(num)} className={`flex-1 py-2 text-sm font-normal rounded-lg transition-all ${numberOfImages === num ? 'bg-theme-gold text-theme-base shadow-lg' : 'text-theme-text-sub hover:text-theme-gold'}`}>{num}</button>
                        ))}
                    </div>
                </div>
                <button onClick={handleGenerateOnePass} disabled={!sketchImage || isProcessing} className={`w-full py-4 text-sm font-normal rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${!sketchImage || isProcessing ? 'bg-theme-surface2 text-theme-text-sub cursor-not-allowed border border-theme-gold/10' : 'bg-theme-gold text-theme-base hover:bg-white hover:shadow-theme-gold/40'}`}>{isProcessing ? <Spinner /> : <WandIcon />} 
                    {result && result.final.length > 0 ? "GHÉP ĐỒ (BƯỚC 2)" : "TẠO Ý TƯỞNG"}
                </button>
            </div>
        </div>

        {/* RIGHT COLUMN: SKETCH CANVAS */}
        <div className="w-full lg:w-[70%] h-full flex flex-col">
             <div className="bg-theme-surface p-4 rounded-2xl shadow-xl border border-theme-gold/10 h-full flex flex-col relative group">
                <h3 className="text-base font-normal text-theme-text-main mb-3 uppercase tracking-widest flex items-center justify-between">
                    <span className="flex items-center">
                        <span className="bg-theme-gold text-theme-base w-5 h-5 rounded flex items-center justify-center text-xs mr-2">2</span>
                        Phác thảo & Khoanh vùng
                    </span>
                    <button onClick={() => { setSketchImage(null); setAssets([]); setResult(null); onStateChange({ sourceSketch: null, assets: [] }); }} className="text-theme-text-sub hover:text-red-500 transition-colors" title="Xóa tất cả"><TrashIcon /></button>
                </h3>
                
                {/* CONTAINER CHO CANVAS */}
                <div 
                    ref={containerRef}
                    className="flex-1 relative bg-black/60 rounded-xl overflow-hidden border border-dashed border-theme-gold/20 flex items-center justify-center select-none cursor-crosshair backdrop-blur-sm"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {!sketchImage ? (
                        <div className="w-full h-full p-10 flex items-center justify-center pointer-events-none">
                             <div className="pointer-events-auto w-full max-w-md"><ImageUpload onFileSelect={handleSketchUpload} previewUrl={null} placeholder="Tải ảnh phác thảo (Sketch)..." /></div>
                        </div>
                    ) : (
                        <>
                            <img 
                                ref={imgRef}
                                src={sketchImage.objectURL}
                                onLoad={updateMetrics}
                                alt="Sketch"
                                className="max-w-full max-h-full object-contain pointer-events-none" 
                                draggable={false}
                            />
                            
                            {/* Selection Box */}
                            {currentSelection && (
                                <div 
                                    className="absolute border-2 border-dashed border-white bg-theme-gold/20 pointer-events-none z-50 shadow-sm"
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
                                const leftPx = imageMetrics.left + (asset.x / 100) * imageMetrics.width;
                                const topPx = imageMetrics.top + (asset.y / 100) * imageMetrics.height;
                                const widthPx = (asset.width / 100) * imageMetrics.width;
                                const heightPx = (asset.height / 100) * imageMetrics.height;

                                return (
                                    <div 
                                        key={asset.id}
                                        className="absolute border-2 border-theme-gold bg-theme-gold/10 flex items-start justify-start group/pin hover:bg-theme-gold/20 transition-colors z-40"
                                        style={{ left: leftPx, top: topPx, width: widthPx, height: heightPx }}
                                        onClick={(e) => e.stopPropagation()} 
                                    >
                                        <span className="bg-theme-gold text-theme-base text-[10px] font-normal px-1.5 rounded-br shadow-sm">#{idx + 1}</span>
                                        <div className="absolute top-0 right-0 -mt-2 -mr-2 opacity-0 group-hover/pin:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); handleRemoveAsset(asset.id); }} className="bg-red-500 text-white rounded-full p-1 shadow-sm hover:scale-110"><TrashIcon /></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
                 <div className="mt-3 text-xs text-theme-text-sub flex justify-between">
                     <p>💡 Kéo chuột để tạo vùng. Vùng chọn sẽ tự động bám sát ảnh.</p>
                     <p>{sketchImage ? `${Math.round(sketchImage.width || 0)} x ${Math.round(sketchImage.height || 0)} px` : ''}</p>
                 </div>
            </div>
        </div>
      </div>
      
      {/* Result Section */}
      {result && (
        <div className="w-full bg-theme-surface p-6 rounded-2xl shadow-2xl border border-theme-gold/10 animate-in fade-in slide-in-from-bottom-8 duration-500 mb-8">
             <div className="flex justify-between items-center mb-6 border-b border-theme-gold/10 pb-4">
                {/* Result Title -> text-lg font-normal */}
                <h3 className="text-lg font-normal text-theme-gold flex items-center gap-2">✨ Kết quả Ý Tưởng ({result.final.length})</h3>
                <div className="flex gap-2">
                     <button onClick={() => setShowDebugStructure(!showDebugStructure)} className={`text-sm px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${showDebugStructure ? 'bg-theme-gold text-theme-base border-theme-gold' : 'text-theme-gold border-theme-gold/30 hover:bg-theme-base'}`}><LayersIcon /> {showDebugStructure ? 'Đang xem Khung Sườn' : 'Xem Khung Sườn'}</button>
                     <button onClick={() => setResult(null)} className="text-sm text-red-400 hover:text-red-300 px-4 py-2 rounded-lg transition-colors">Đóng kết quả</button>
                </div>
            </div>
            <div className={`grid gap-6 ${result.final.length === 1 ? 'grid-cols-1 max-w-4xl mx-auto' : 'grid-cols-1 md:grid-cols-2'}`}>
                {result.final.map((imgSrc, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden shadow-2xl bg-black border border-theme-gold/10">
                        <img src={showDebugStructure ? result.structure : imgSrc} alt={`Option ${idx + 1}`} className="w-full h-auto object-cover" />
                        <div className="absolute inset-0 bg-theme-base/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                            <a href={imgSrc} download={`idea-render-${idx+1}.png`} className="px-8 py-3 bg-theme-gold text-theme-base font-normal rounded-full hover:scale-105 transition-transform shadow-lg">Tải xuống</a>
                        </div>
                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-white text-xs font-normal px-3 py-1 rounded-full border border-white/10">Phương án {idx + 1}</div>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};