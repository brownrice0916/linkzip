import React from 'react';
import { useNavigate } from 'react-router-dom';
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

const TemplateSelection = () => {
  const navigate = useNavigate();
  const { templateType, templateValue, setTemplate } = useStore();

  const handleNext = () => {
    navigate('/onboarding/sns');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Choose Your Style</h1>
          <p className="mt-4 text-lg text-gray-600">Select a beautiful preset template or a solid background color.</p>
        </div>

        <div className="space-y-8">
          {/* Presets */}
          <section>
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <h2 className="text-xl font-bold text-gray-900">Preset Templates</h2>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                    <div className={clsx('h-48 rounded-lg border flex flex-col items-center justify-center p-4', preset.classes)}>
                      <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md mb-4 shadow-sm" />
                      <div className="w-24 h-4 rounded-full bg-white/30 backdrop-blur-md mb-2 shadow-sm" />
                      <div className="w-32 h-4 rounded-full bg-white/30 backdrop-blur-md shadow-sm" />
                    </div>
                    {isSelected && (
                      <div className="absolute top-3 right-3 bg-indigo-600 text-white rounded-full p-1 shadow-md">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                    <div className="mt-3 text-center">
                      <p className="text-sm font-medium text-gray-900">{preset.name}</p>
                      <p className="text-xs text-gray-500">{preset.desc}</p>
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
              <h2 className="text-xl font-bold text-gray-900">Solid Colors</h2>
            </div>
            <div className="flex flex-wrap gap-4">
              {colors.map((color) => {
                const isSelected = templateType === 'color' && templateValue === color;
                return (
                  <button
                    key={color}
                    onClick={() => setTemplate('color', color)}
                    className={clsx(
                      'w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-sm border',
                      isSelected ? 'ring-4 ring-offset-2 ring-indigo-600' : 'border-gray-200'
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {isSelected && <Check className={clsx("w-6 h-6", color === '#0f172a' ? 'text-white' : 'text-gray-900')} />}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="flex justify-end pt-8 border-t border-gray-200">
          <button
            onClick={handleNext}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            Next: Add Socials
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelection;
