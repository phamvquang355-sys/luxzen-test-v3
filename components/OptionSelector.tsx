import React from 'react';
import { OptionItem } from '../types';

interface OptionSelectorProps {
  id?: string;
  label: string;
  options: OptionItem[];
  value: string;
  onChange: (value: string) => void;
  variant?: 'select' | 'grid';
}

export const OptionSelector: React.FC<OptionSelectorProps> = ({ label, options, value, onChange, variant = 'select' }) => {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-theme-gold-dim uppercase tracking-widest">
        {label}
      </label>
      
      {variant === 'grid' ? (
        <div className="grid grid-cols-2 gap-2">
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className={`p-3 rounded-xl text-sm font-bold transition-all border ${
                        value === option.value 
                        ? 'bg-theme-gold text-theme-base border-theme-gold shadow-lg shadow-theme-gold/20' 
                        : 'bg-theme-base text-theme-gold-dim border-theme-gold/20 hover:border-theme-gold hover:text-theme-gold hover:bg-theme-base/80'
                    }`}
                >
                    {option.label}
                </button>
            ))}
        </div>
      ) : (
        <div className="relative">
            <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full appearance-none bg-theme-base border border-theme-gold/20 text-theme-gold py-3 px-4 pr-8 rounded-xl focus:outline-none focus:ring-1 focus:ring-theme-gold focus:border-theme-gold transition-all shadow-sm cursor-pointer"
            >
            {options.map((option) => (
                <option key={option.value} value={option.value} className="bg-theme-surface text-theme-gold py-2">
                {option.label}
                </option>
            ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-theme-gold">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
            </svg>
            </div>
        </div>
      )}
      
      {/* Description display for selected item */}
      <p className="text-[10px] text-theme-gold-dim/70 italic h-3 mt-1 truncate">
        {options.find(o => o.value === value)?.description || ''}
      </p>
    </div>
  );
};