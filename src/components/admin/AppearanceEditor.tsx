import React from 'react';
import { useStore } from '../../store/useStore';
import { Check, Palette, Sparkles } from 'lucide-react';
import clsx from 'clsx';

const presets = [
  { id: 'minimalist', name: 'Minimalist', desc: 'Clean and simple white', classes: 'bg-white border-gray-200' },
  { id: 'neon-dark', name: 'Neon Dark', desc: 'Dark with glowing accents', classes: 'bg-gray-900 border-indigo-500' },
  { id: 'soft-gradient', name: 'Soft Gradient', desc: 'Pastel dream', classes: 'bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-400 border-transparent' },
];

const colors = [
  '#f8fafc', // slate-50
  '#0f172a', // slate-900
  '#fee2e2', // red-100
  '#fef08a', // yellow-200
  '#bbf7d0', // green-200
  '#bfdbfe', // blue-200
  '#e9d5ff', // purple-200
  '#fbcfe8', // pink-200
];

const AppearanceEditor = () => {
  const { templateType, templateValue, setTemplate } = useStore();

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Appearance</h2>
        <p className="text-sm text-gray-500">Design your LinkZip to match your brand.</p>
      </div>

      <div className="space-y-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        {/* Presets */}
        <section>
          <div className="flex items-center space-x-2 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-gray-900">Themes</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {presets.map((preset) => {
              const isSelected = templateType === 'preset' && templateValue === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => setTemplate('preset', preset.id)}
                  className={clsx(
                    'relative rounded-xl border-2 p-1 cursor-pointer transition-all duration-200 hover:scale-105',
                    isSelected ? 'border-indigo-600' : 'border-transparent hover:border-indigo-300'
                  )}
                >
                  <div className={clsx('h-32 rounded-lg border flex flex-col items-center justify-center p-4', preset.classes)}>
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md mb-3 shadow-sm" />
                    <div className="w-20 h-3 rounded-full bg-white/30 backdrop-blur-md mb-2 shadow-sm" />
                    <div className="w-28 h-3 rounded-full bg-white/30 backdrop-blur-md shadow-sm" />
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-1 shadow-md">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                  <div className="mt-2 text-center">
                    <p className="text-xs font-bold text-gray-900">{preset.name}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Solid Colors */}
        <section>
          <div className="flex items-center space-x-2 mb-4">
            <Palette className="w-5 h-5 text-pink-500" />
            <h2 className="text-lg font-bold text-gray-900">Solid Colors</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {colors.map((color) => {
              const isSelected = templateType === 'color' && templateValue === color;
              return (
                <button
                  key={color}
                  onClick={() => setTemplate('color', color)}
                  className={clsx(
                    'w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-sm border',
                    isSelected ? 'ring-4 ring-offset-2 ring-indigo-600' : 'border-gray-200'
                  )}
                  style={{ backgroundColor: color }}
                >
                  {isSelected && <Check className={clsx("w-5 h-5", color === '#0f172a' ? 'text-white' : 'text-gray-900')} />}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AppearanceEditor;
