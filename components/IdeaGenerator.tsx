import React, { useState, useRef } from 'react';
import { FileData, IdeaAsset, IdeaGeneratorProps } from '../types';
import { ImageUpload } from './common/ImageUpload';
import { Spinner } from './Spinner';
import * as geminiService from '../services/geminiService';

// Icons as components
const WandIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h0"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;
const LayersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>;
const LayoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>;

export const IdeaGenerator: React.FC<IdeaGeneratorProps> = ({ state, onStateChange }) => {
  // --- STATE ---
  const [sketchImage, setSketchImage] = useState<FileData | null>(state.sourceSketch || null);
  const [styleImage, setStyleImage] = useState<FileData | null>(state.referenceStyle || null);
  const [assets, setAssets] = useState<IdeaAsset[]>(state.assets || []); 
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<string>('');
  
  const [result, setResult] = useState<{ structure: string; final: string } | null>(null);
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

    // Only add if area is significant (avoid accidental clicks)
    if (currentSelection.width > 10 && currentSelection.height > 10) {
        const rect = imgRef.current.getBoundingClientRect();
        
        // Convert to percentages
        const newAsset: IdeaAsset = {
            id: Date.now().toString(),
            x: (currentSelection.x / rect.width) * 100,
            y: (currentSelection.y / rect.height) * 100,
            width: (currentSelection.width / rect.width) * 100,
            height: (currentSelection.height / rect.height) * 100,
            image: null,
            label: `Khu vực ${assets.length + 1}`
        };

        const newAssets = [...assets, newAsset];
        setAssets(newAssets);
        onStateChange({ assets: newAssets });
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
           // Use simple local preview for asset thumbnail
          const objectURL = URL.createObjectURL(file);
          // Compress for API
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
                      label: a.label.startsWith('Khu vực') ? file.name.split('.')[0] : a.label // Auto update label if it's default
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
    <div className="flex flex-col h-full bg-gray-50 p-4 gap-4 rounded-xl min-h-[calc(100vh-150px)]">
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

      {/* --- MAIN LAYOUT: FLEX 30% - 70% --- */}
      <div className="flex flex-col lg:flex-row gap-6 h-full flex-grow">
        
        {/* === CỘT TRÁI (30%): INPUT & PINNING === */}
        <div className="w-full lg:w-[30%] flex flex-col gap-4 h-full min-w-[300px]">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col relative group">
            <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider flex items-center">
              <span className="bg-gray-800 text-white w-5 h-5 rounded flex items-center justify-center text-xs mr-2">1</span>
              Khoanh Vùng & Ghép Ảnh
            </h3>
            
            <div className="flex-1 relative bg-gray-100 rounded-lg overflow-hidden border border-dashed border-gray-300 flex items-center justify-center min-h-[300px] select-none">
              {!sketchImage ? (
                <ImageUpload onFileSelect={handleSketchUpload} previewUrl={null} placeholder="Tải sketch..." />
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
                   
                   {/* Draw Current Selection Box */}
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

                   {/* Render Defined Regions */}
                   {assets.map((asset, idx) => (
                       <div 
                         key={asset.id}
                         className="absolute border-2 border-blue-500 bg-blue-500/10 flex items-start justify-start"
                         style={{ 
                             left: `${asset.x}%`, 
                             top: `${asset.y}%`,
                             width: `${asset.width}%`,
                             height: `${asset.height}%`
                         }}
                       >
                         <span className="bg-blue-500 text-white text-[10px] font-bold px-1 rounded-br shadow-sm">
                             #{idx + 1}
                         </span>
                       </div>
                   ))}

                   {/* Delete Button */}
                   <button 
                    onClick={() => { setSketchImage(null); setAssets([]); setResult(null); onStateChange({ sourceSketch: null, assets: [] }); }}
                    className="absolute top-2 right-2 p-2 bg-white/90 rounded-md text-gray-500 hover:text-red-500 shadow-sm transition-colors z-10"
                    title="Xóa ảnh sketch"
                  >
                    <TrashIcon />
                  </button>
                </div>
              )}
            </div>
            
            <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
              <p>💡 <strong>Mẹo:</strong> Kéo chuột để khoanh vùng vị trí (Sân khấu, Cổng, Bàn...) trên ảnh sketch, sau đó tải ảnh decor mẫu lên ở danh sách bên phải.</p>
            </div>
          </div>
        </div>

        {/* === CỘT PHẢI (70%): CONTEXT & OUTPUT === */}
        <div className="w-full lg:w-[70%] flex flex-col gap-4 h-full overflow-hidden">
          
          {/* VIEW 1: KHI CHƯA CÓ KẾT QUẢ (STYLE + LIST) */}
          {!result ? (
            <div className="flex flex-col h-full gap-4">
              
              {/* Style Selection Area */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider flex items-center">
                  <span className="bg-gray-800 text-white w-5 h-5 rounded flex items-center justify-center text-xs mr-2">2</span>
                  Định hình & Danh sách vật thể
                </h3>
                
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-600 mb-2">Upload ảnh Style mẫu (Tổng thể)</label>
                    <div className="h-40">
                      <ImageUpload onFileSelect={handleStyleUpload} previewUrl={styleImage?.objectURL || null} placeholder="Kéo thả ảnh mẫu (Moodboard)..." compact />
                    </div>
                    
                    {/* Removed Quick Preset Buttons as requested */}
                    
                    <button
                        onClick={handleGenerateOnePass}
                        disabled={!sketchImage || isProcessing}
                        className={`w-full py-3 mt-6 text-base font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2
                          ${!sketchImage || isProcessing
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:scale-[1.02] hover:shadow-blue-500/25'}`}
                      >
                        {isProcessing ? <Spinner /> : <WandIcon />}
                        TẠO Ý TƯỞNG (RENDER)
                      </button>
                  </div>
                  
                  {/* Pinned Items List - Review Area */}
                  <div className="flex-1 flex flex-col bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-3 border-b border-gray-200 bg-white flex justify-between items-center">
                      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Danh sách cần ghép ({assets.length})</h3>
                      <span className="text-[10px] text-gray-400">Đã khoanh vùng từ bên trái</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[400px]">
                      {assets.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg p-8 opacity-60">
                          <LayoutIcon />
                          <p className="mt-2 text-sm text-center">Chưa có vùng chọn.<br/>Hãy vẽ lên ảnh sketch.</p>
                        </div>
                      ) : (
                        assets.map((asset, idx) => (
                          <div key={asset.id} className="flex gap-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm group hover:border-blue-300 transition-colors">
                            {/* Number Badge */}
                            <div className="flex flex-col items-center gap-2">
                                <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                                #{idx + 1}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <input 
                                    type="text" 
                                    value={asset.label}
                                    onChange={(e) => {
                                        const newAssets = assets.map(a => a.id === asset.id ? { ...a, label: e.target.value } : a);
                                        setAssets(newAssets);
                                    }}
                                    className="font-bold text-sm text-gray-800 bg-transparent border-none focus:ring-0 p-0 w-full truncate placeholder-gray-400"
                                    placeholder="Tên vật thể..."
                                />
                                <p className="text-[10px] text-gray-400 mt-1">
                                    Vùng: {Math.round(asset.width)}% x {Math.round(asset.height)}%
                                </p>
                            </div>

                            {/* Image Uploader for Asset */}
                            <div className="relative w-12 h-12 flex-shrink-0">
                                {asset.image ? (
                                    <div className="w-full h-full relative group/img cursor-pointer" onClick={() => triggerAssetUpload(asset.id)}>
                                        <img src={asset.image.objectURL} alt="Asset" className="w-full h-full object-cover rounded-md border border-gray-200" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 rounded-md transition-opacity">
                                            <UploadIcon />
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => triggerAssetUpload(asset.id)}
                                        className="w-full h-full bg-gray-100 rounded-md border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-500 hover:border-blue-300 transition-colors"
                                        title="Tải ảnh vật thể cần ghép"
                                    >
                                        <UploadIcon />
                                    </button>
                                )}
                            </div>

                            <button 
                              onClick={() => handleRemoveAsset(asset.id)}
                              className="self-start text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            // VIEW 2: KHI ĐÃ CÓ KẾT QUẢ (FULL 70% WIDTH)
            <div className="h-full bg-white p-4 rounded-xl shadow-lg border border-gray-200 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-gray-800">Kết quả Design</h3>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Hoàn thành</span>
                </div>
                
                <div className="flex items-center gap-2">
                   {/* Debug Toggle */}
                  <button 
                    onClick={() => setShowDebugStructure(!showDebugStructure)}
                    className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded transition-colors border
                      ${showDebugStructure ? 'bg-orange-50 text-orange-700 border-orange-200 font-medium' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  >
                    <LayersIcon />
                    {showDebugStructure ? 'Đang xem: Khung sườn' : 'Xem lớp khung sườn'}
                  </button>
                  
                  <button onClick={() => setResult(null)} className="text-sm text-blue-600 hover:text-blue-800 font-medium ml-2 px-3 py-1 hover:bg-blue-50 rounded">
                    Tạo mới
                  </button>
                </div>
              </div>

              {/* Main Result Display */}
              <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden relative flex items-center justify-center group">
                <img 
                  src={showDebugStructure ? result.structure : result.final} 
                  alt="Final Render" 
                  className="max-w-full max-h-full object-contain"
                />
                
                {/* Image Controls Overlay */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <a href={result.final} download="render-idea.png" className="text-white text-xs hover:text-blue-300 transition-colors font-bold">⬇️ Tải Về</a>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button 
                    onClick={() => setResult(null)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Chỉnh sửa lại
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};