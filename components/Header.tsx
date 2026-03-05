import React from 'react';

interface HeaderProps {
    userCredits: number;
}

export const Header: React.FC<HeaderProps> = ({ userCredits }) => {
  return (
    <div className="h-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6">
      
      {/* Title & Badge */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          Không gian làm việc
        </h2>
        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 text-[11px] font-bold rounded">
          Pro
        </span>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {/* Khối hiển thị Credits chuẩn SaaS */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
          <span className="text-yellow-500 text-sm">✦</span>
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{userCredits}</span>
        </div>

        {/* Nút Render chính của Header */}
        <button className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors">
          Xuất dự án
        </button>

        {/* Avatar vuông bo góc nhỏ (Chuyên nghiệp hơn hình tròn) */}
        <div className="w-8 h-8 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-100 overflow-hidden cursor-pointer">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="User" />
        </div>
      </div>
    </div>
  );
};
