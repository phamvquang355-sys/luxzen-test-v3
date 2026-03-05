import React, { useState } from 'react';
import { IdeaGeneratorProps } from '../types';

export const IdeaGenerator: React.FC<IdeaGeneratorProps> = ({ state, onStateChange, onDeductCredits, userCredits }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <div className="flex h-full w-full">
      
      {/* BẢNG ĐIỀU KHIỂN (Panel Trái) - Rộng cố định 360px, scroll dọc */}
      <div className="w-[360px] shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col h-full">
        
        {/* Nội dung bảng điều khiển (Có scroll) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Section 1: Upload */}
          <div>
            <label className="block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              1. Ảnh tham chiếu
            </label>
            <div className="w-full aspect-video border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer">
               <span className="text-xs text-zinc-500">Kéo thả ảnh vào đây</span>
            </div>
          </div>

          {/* Section 2: Prompt */}
          <div>
            <label className="block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              2. Nhập mô tả Concept
            </label>
            <textarea 
              className="w-full h-28 p-3 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition-shadow resize-none placeholder:text-zinc-400"
              placeholder="VD: Không gian sự kiện với hoa hồng trắng..."
            />
          </div>

          {/* Section 3: Select Options (Ví dụ tỷ lệ) */}
          <div>
            <label className="block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              3. Tỷ lệ khung hình
            </label>
            <select className="w-full p-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 focus:outline-none">
              <option>16:9 (Ngang)</option>
              <option>9:16 (Dọc Reels)</option>
              <option>1:1 (Vuông)</option>
            </select>
          </div>

        </div>

        {/* Nút Lệnh Gắn Chặt Dưới Cùng (Sticky Footer) */}
        <div className="p-5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <button 
            className="w-full py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors flex items-center justify-center gap-2"
          >
            ✨ Tạo Kết Quả Render
          </button>
        </div>

      </div>

      {/* KHÔNG GIAN CANVAS (Panel Phải) - Chứa kết quả */}
      <div className="flex-1 bg-[#FAFAFA] dark:bg-zinc-950 flex flex-col h-full relative p-6 overflow-y-auto">
        
        {/* Vùng Render */}
        <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex items-center justify-center overflow-hidden">
          
          {/* Empty State Khoa học */}
          <div className="flex flex-col items-center text-center max-w-sm">
            <svg className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
              Chưa có dữ liệu Render
            </h3>
            <p className="text-xs text-zinc-500">
              Hãy thiết lập thông số ở bảng bên trái và nhấn Tạo Kết Quả để AI bắt đầu quá trình kết xuất.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};