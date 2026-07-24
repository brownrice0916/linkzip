import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, type SocialLink } from '../../store/useStore';
import { FaInstagram, FaTwitter, FaYoutube, FaGithub, FaLinkedin, FaEnvelope, FaGlobe, FaFigma } from 'react-icons/fa';
import clsx from 'clsx';

const snsPlatforms = [
  { id: 'instagram', name: 'Instagram', icon: FaInstagram, color: 'hover:text-pink-600', bg: 'hover:bg-pink-50' },
  { id: 'twitter', name: 'Twitter / X', icon: FaTwitter, color: 'hover:text-blue-400', bg: 'hover:bg-blue-50' },
  { id: 'youtube', name: 'YouTube', icon: FaYoutube, color: 'hover:text-red-600', bg: 'hover:bg-red-50' },
  { id: 'github', name: 'GitHub', icon: FaGithub, color: 'hover:text-gray-900', bg: 'hover:bg-gray-100' },
  { id: 'linkedin', name: 'LinkedIn', icon: FaLinkedin, color: 'hover:text-blue-700', bg: 'hover:bg-blue-50' },
  { id: 'mail', name: 'Email', icon: FaEnvelope, color: 'hover:text-blue-600', bg: 'hover:bg-blue-50' },
  { id: 'globe', name: 'Website', icon: FaGlobe, color: 'hover:text-green-500', bg: 'hover:bg-green-50' },
  { id: 'figma', name: 'Figma', icon: FaFigma, color: 'hover:text-purple-500', bg: 'hover:bg-purple-50' },
];

const SNSSelection = () => {
  const navigate = useNavigate();
  const { socialLinks, setSocialLinks } = useStore();
  const [selectedIds, setSelectedIds] = useState<string[]>(
    socialLinks.map((link) => link.platform)
  );

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    // Merge new selections with existing ones to preserve IDs if they already exist
    const newLinks: SocialLink[] = selectedIds.map(id => {
      const existing = socialLinks.find(link => link.platform === id);
      return existing || { platform: id, id: '' };
    });
    setSocialLinks(newLinks);
    navigate('/onboarding/links');
  };

  const handleBack = () => {
    navigate('/onboarding/template');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-12 bg-white p-10 rounded-2xl shadow-sm border border-gray-100">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">Select Your Socials</h1>
          <p className="mt-4 text-gray-600">Choose the platforms you want to showcase on your profile. You can select multiple.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {snsPlatforms.map((platform) => {
            const isSelected = selectedIds.includes(platform.id);
            const Icon = platform.icon;
            return (
              <button
                key={platform.id}
                onClick={() => toggleSelection(platform.id)}
                className={clsx(
                  'flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200',
                  isSelected 
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-md transform scale-105' 
                    : `border-gray-100 bg-white shadow-sm ${platform.bg} ${platform.color}`
                )}
              >
                <Icon className={clsx("w-8 h-8 mb-3 transition-colors", isSelected ? 'text-indigo-600' : 'text-gray-400')} />
                <span className={clsx("text-sm font-medium", isSelected ? 'text-indigo-900' : 'text-gray-600')}>
                  {platform.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-between pt-8 border-t border-gray-100">
          <button
            onClick={handleBack}
            className="px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            className="px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            Next: Add Links
          </button>
        </div>
      </div>
    </div>
  );
};

export default SNSSelection;
