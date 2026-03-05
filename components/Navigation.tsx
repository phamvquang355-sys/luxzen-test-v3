import React from 'react';
import { Tool } from '../types';

interface NavigationProps {
  activeTab: Tool;
  setActiveTab: (tab: Tool) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const menuGroups = [
    {
      title: 'Tạo hình & Concept',
      items: [
        { id: Tool.RENDER, label: 'Render 3D', icon: '🏠' },
        { id: Tool.IDEA_GENERATOR, label: 'Ý tưởng 3D', icon: '✨' },
        { id: Tool.SKETCH_CONVERTER, label: 'Chuyển đổi Phác thảo', icon: '📐' },
      ]
    },
    {
      title: 'Tiền kỳ & Xử lý',
      items: [
        { id: Tool.VIEW_SYNC, label: 'Đồng bộ Góc nhìn', icon: '🎯' },
        { id: Tool.PANORAMIC_AXO, label: 'Mặt bằng', icon: '🗺️' },
        { id: Tool.AXONOMETRIC, label: 'Axonometric', icon: '🧊' },
      ]
    },
    {
      title: 'Hậu kỳ & Video',
      items: [
        { id: Tool.VIDEO_GENERATOR, label: 'Đạo diễn Video Veo', icon: '🎬' },
        { id: Tool.UPSCALE, label: 'Tăng nét 8K', icon: '🔍' },
        { id: Tool.ADVANCED_EDIT, label: 'Chỉnh Sửa', icon: '✏️' },
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full py-4">
      {/* Logo Area */}
      <div className="px-6 mb-6 flex items-center gap-3 cursor-pointer">
        <div className="w-8 h-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded flex items-center justify-center font-bold text-lg">
          L
        </div>
        <span className="text-lg font-bold tracking-tight">Luxzen</span>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 space-y-6">
        {menuGroups.map((group, idx) => (
          <div key={idx}>
            {/* Tiêu đề nhóm: Chữ cực nhỏ (text-xs), viết hoa, nhạt màu */}
            <h3 className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-2 px-3">
              {group.title}
            </h3>
            <div className="space-y-0.5">
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 font-medium ${
                    activeTab === item.id
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <span className="text-base opacity-80">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
