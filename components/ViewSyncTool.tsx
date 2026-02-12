
import React, { useState } from 'react';
import { ViewSyncProps, FileData } from '../types';
import { ImageUpload } from './common/ImageUpload';
import { ImageComparator } from './ImageComparator';
import { Spinner } from './Spinner';
import * as geminiService from '../services/geminiService';
import { VIEW_ANGLES } from '../constants';

export const ViewSyncTool: React.FC<ViewSyncProps> = ({ state, onStateChange, userCredits, onDeductCredits }) => {
  const { sourceImage, resultImage, selectedViewId, userPrompt, isLoading, error } = state;
  const COST = 20;

  const handleSourceUpload = (fileData: FileData) => {
    onStateChange({ sourceImage: fileData, resultImage: null, error: null });
  };

  const handleGenerate = async () => {
    if (!sourceImage) {
      onStateChange({ error: 'Vui lòng tải lên hình ảnh hiện trạng hoặc phác thảo.' });
      return;
    }

    if (onDeductCredits && userCredits < COST) {
        onStateChange({ error: `Bạn cần ${COST} credits để thực hiện tính năng này.` });
        return;
    }

    onStateChange({ isLoading: true, error: null, resultImage: null });

    try {
      if (onDeductCredits) await onDeductCredits(COST, "View Sync Generation");

      const selectedView = VIEW_ANGLES.find(v => v.id === selectedViewId) || VIEW_ANGLES[0];
      
      // 1. Xây dựng Prompt "Cứng" để khóa không gian
      let structuralConstraint = "";
      
      if (selectedView.id === 'top-down') {
        // Logic riêng cho Top-down: Cho phép thay đổi cấu trúc trần nhà
        structuralConstraint = `
          CRITICAL INSTRUCTION: REMOVE THE CEILING/ROOF. 
          Generate a cutaway view looking directly down into the space.
          Show the floor layout, tables, and stage clearly.
          Ignore the original ceiling structure.
        `;
      } else {
        // Logic cho các góc khác: Bắt buộc giữ nguyên không gian
        structuralConstraint = `
          CRITICAL INSTRUCTION: PRESERVE THE ROOM GEOMETRY.
          Do NOT change the walls, columns, windows, or floor material.
          Only move the camera position to '${selectedView.label}'.
          Keep the exact spatial context of the uploaded image.
        `;
      }

      // 2. Ghép Prompt hoàn chỉnh
      const finalPrompt = `
        Role: Professional Architectural Visualizer.
        Task: Re-render the uploaded event space from a new camera angle.
        
        [INPUT IMAGE ANALYSIS]
        Analyze the uploaded image's architectural style and dimensions.

        [TARGET VIEW]
        ${selectedView.prompt_suffix}

        [CONSTRAINTS]
        ${structuralConstraint}

        [USER DECORATION REQUEST]
        ${userPrompt || "Keep current decoration style"}
        
        Output: Photorealistic 8K render.
      `.trim();

      const result = await geminiService.generateViewSync(sourceImage, finalPrompt);
      
      onStateChange({ resultImage: result });
    } catch (err) {
      console.error(err);
      onStateChange({ error: 'Đã xảy ra lỗi kết nối với AI.' });
    } finally {
      onStateChange({ isLoading: false });
    }
  };

  return (
    <div className="flex flex-col h-full bg-theme-base p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto w-full">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-normal text-theme-text-main">View Sync - Đồng bộ Góc nhìn</h1>
          <p className="text-theme-text-sub mt-2 text-sm">
            Chuyển đổi hình ảnh hiện trạng hoặc bản vẽ tay sang các góc phối cảnh 3D khác nhau.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT PANEL: Controls */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Chọn Góc nhìn */}
            <div className="bg-theme-surface p-5 rounded-xl shadow-lg border border-theme-gold/10">
              <label className="block text-xs font-normal text-theme-text-sub uppercase tracking-widest mb-3">
                1. Chọn Góc nhìn mong muốn
              </label>
              <div className="space-y-2">
                {VIEW_ANGLES.map((angle) => (
                  <button
                    key={angle.id}
                    onClick={() => onStateChange({ selectedViewId: angle.id })}
                    className={`w-full text-left p-3 rounded-xl border transition-all duration-200 flex flex-col ${
                      selectedViewId === angle.id
                        ? 'border-theme-gold bg-theme-gold/10 shadow-sm'
                        : 'border-theme-gold/10 hover:border-theme-gold/30 hover:bg-theme-surface2'
                    }`}
                  >
                    <span className={`font-normal text-sm ${selectedViewId === angle.id ? 'text-theme-gold' : 'text-theme-text-main'}`}>
                      {angle.label}
                    </span>
                    <span className="text-[11px] text-theme-text-sub mt-1 line-clamp-1 opacity-70">
                      {angle.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Nhập mô tả chi tiết */}
            <div className="bg-theme-surface p-5 rounded-xl shadow-lg border border-theme-gold/10">
              <label className="block text-xs font-normal text-theme-text-sub uppercase tracking-widest mb-2">
                2. Mô tả ý tưởng (Tùy chọn)
              </label>
              <textarea
                value={userPrompt}
                onChange={(e) => onStateChange({ userPrompt: e.target.value })}
                placeholder="Ví dụ: Tiệc cưới tone màu trắng vàng, nhiều hoa hồng, đèn chùm pha lê sang trọng..."
                className="w-full h-32 p-3 bg-theme-base border border-theme-gold/20 rounded-xl focus:ring-1 focus:ring-theme-gold outline-none resize-none text-sm text-theme-text-main placeholder-theme-text-sub/50"
              />
            </div>

            {/* Button Action */}
            <button
              onClick={handleGenerate}
              disabled={isLoading || !sourceImage}
              className={`w-full py-4 px-6 rounded-xl font-normal text-white shadow-lg transition-all transform hover:-translate-y-0.5 ${
                isLoading || !sourceImage
                  ? 'bg-theme-surface2 text-theme-text-sub cursor-not-allowed border border-theme-gold/10'
                  : 'bg-theme-gold hover:bg-white hover:shadow-theme-gold/40 text-theme-base'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Spinner />
                  <span>Đang xử lý không gian...</span>
                </div>
              ) : (
                'Tạo Phối Cảnh Mới'
              )}
            </button>
            
            {error && (
              <div className="p-3 bg-red-900/20 text-red-400 text-sm rounded-lg border border-red-500/30 text-center">
                {error}
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Image Area */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Input Image */}
            <div className="bg-theme-surface p-6 rounded-xl shadow-lg border border-theme-gold/10">
              <h3 className="text-sm font-normal text-theme-text-main mb-4 uppercase tracking-widest">Hình ảnh gốc (Hiện trạng / Sketch)</h3>
              <div className="w-full">
                <ImageUpload
                  onFileSelect={handleSourceUpload}
                  previewUrl={sourceImage?.objectURL || null}
                  placeholder="Tải lên ảnh chụp sảnh hoặc bản vẽ tay"
                  maxWidth={1024}
                />
              </div>
            </div>

            {/* Result Area */}
            {resultImage && sourceImage && (
              <div className="bg-theme-surface p-6 rounded-xl shadow-lg border border-theme-gold/10 animate-in fade-in">
                <h3 className="text-sm font-normal text-theme-text-main mb-4 uppercase tracking-widest">So sánh kết quả</h3>
                <div className="w-full rounded-xl overflow-hidden border border-theme-gold/20 bg-black/40">
                  <ImageComparator
                    originalImage={sourceImage.objectURL || ''} 
                    generatedImage={resultImage}
                  />
                </div>
                <div className="mt-4 flex justify-end">
                   <a 
                     href={resultImage} 
                     download={`luxzen-viewsync-${Date.now()}.png`}
                     className="px-6 py-2 bg-theme-gold text-theme-base rounded-full text-sm font-normal hover:bg-white transition-colors shadow-lg flex items-center gap-2"
                   >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                     Tải ảnh xuống
                   </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
