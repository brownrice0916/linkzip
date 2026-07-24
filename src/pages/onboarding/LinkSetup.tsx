import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, type SocialLink } from '../../store/useStore';
import { Plus, Trash2, Link as LinkIcon, AtSign } from 'lucide-react';

// Using simple id generation since we don't have uuid installed yet
const generateId = () => Math.random().toString(36).substr(2, 9);

const LinkSetup = () => {
  const navigate = useNavigate();
  const { socialLinks, setSocialLinks, customLinks, addCustomLink, updateCustomLink, removeCustomLink } = useStore();

  const handleSocialChange = (platform: string, value: string) => {
    const updated = socialLinks.map(link => 
      link.platform === platform ? { ...link, id: value } : link
    );
    setSocialLinks(updated);
  };

  const handleAddCustomLink = () => {
    addCustomLink({ id: generateId(), title: '', url: '' });
  };

  const handleNext = () => {
    navigate('/onboarding/profile');
  };

  const handleBack = () => {
    navigate('/onboarding/sns');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-10 bg-white p-10 rounded-2xl shadow-sm border border-gray-100">
        
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">Add Your Links</h1>
          <p className="mt-4 text-gray-600">Enter your social handles and add any custom links you want to share.</p>
        </div>

        {/* Social IDs */}
        {socialLinks.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <AtSign className="w-5 h-5 mr-2 text-indigo-500" />
              Social Handles
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {socialLinks.map((link) => (
                <div key={link.platform} className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 capitalize">
                    {link.platform} Username
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">@</span>
                    </div>
                    <input
                      type="text"
                      value={link.id}
                      onChange={(e) => handleSocialChange(link.platform, e.target.value)}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-8 sm:text-sm border-gray-300 rounded-md py-2 border px-3"
                      placeholder="username"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Custom Links */}
        <section className="space-y-4 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <LinkIcon className="w-5 h-5 mr-2 text-indigo-500" />
              Custom Links
            </h2>
            <button
              onClick={handleAddCustomLink}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Link
            </button>
          </div>

          <div className="space-y-4">
            {customLinks.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <p className="text-gray-500 text-sm">No custom links added yet.</p>
              </div>
            ) : (
              customLinks.map((link) => (
                <div key={link.id} className="flex gap-4 items-start bg-gray-50 p-4 rounded-lg border border-gray-200 relative group">
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                      <input
                        type="text"
                        value={link.title}
                        onChange={(e) => updateCustomLink(link.id, { title: e.target.value })}
                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                        placeholder="My Website"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">URL</label>
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => updateCustomLink(link.id, { url: e.target.value })}
                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeCustomLink(link.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title="Remove Link"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

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
            Next: Complete Profile
          </button>
        </div>

      </div>
    </div>
  );
};

export default LinkSetup;
