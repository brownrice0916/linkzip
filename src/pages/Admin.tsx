import React from 'react';
import { useStore } from '../store/useStore';
import LinkTreePreview from '../components/LinkTreePreview';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Edit, Settings } from 'lucide-react';
import { auth, logout } from '../lib/firebase';

const Admin = () => {
  const navigate = useNavigate();
  const { profile, templateType, templateValue, socialLinks, customLinks } = useStore();
  const user = useStore(state => state.user);

  // Using username for the URL
  const username = profile.username || 'preview';
  const profileUrl = `${window.location.origin}/@${username}`;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      
      {/* Sidebar / Forms area */}
      <div className="w-full lg:w-1/2 flex flex-col h-full border-r border-gray-200 bg-white">
        
        {/* Admin Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">Manage your Linktree clone</p>
          </div>
          <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-gray-900">
            Logout
          </button>
        </div>

        {/* Editing Tabs (Mocked for now, just buttons linking to onboarding steps) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="p-4 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">Your Link is Live!</p>
              <a href={`/${username}`} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline flex items-center mt-1">
                {window.location.host}/{username} <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
            <button onClick={() => window.open(`/${username}`, '_blank')} className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700">
              Share
            </button>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Edit Content</h2>
            
            <button onClick={() => navigate('/onboarding/links')} className="w-full flex items-center p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="p-2 bg-blue-100 rounded-lg mr-4">
                <Edit className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left flex-1">
                <h3 className="font-semibold text-gray-900">Links & Socials</h3>
                <p className="text-xs text-gray-500">Update your URLs and social handles</p>
              </div>
            </button>

            <button onClick={() => navigate('/onboarding/profile')} className="w-full flex items-center p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="p-2 bg-pink-100 rounded-lg mr-4">
                <Settings className="w-5 h-5 text-pink-600" />
              </div>
              <div className="text-left flex-1">
                <h3 className="font-semibold text-gray-900">Profile</h3>
                <p className="text-xs text-gray-500">Update your name, bio, and avatar</p>
              </div>
            </button>

            <button onClick={() => navigate('/onboarding/template')} className="w-full flex items-center p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="p-2 bg-purple-100 rounded-lg mr-4">
                <Settings className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-left flex-1">
                <h3 className="font-semibold text-gray-900">Appearance</h3>
                <p className="text-xs text-gray-500">Change your theme or background color</p>
              </div>
            </button>
          </div>
        </div>

      </div>

      {/* Preview Area */}
      <div className="hidden lg:flex w-1/2 bg-gray-100 items-center justify-center p-12">
        {/* Mobile Phone frame mockup */}
        <div className="relative w-[375px] h-[812px] bg-white rounded-[3rem] shadow-2xl border-[8px] border-gray-900 overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-6 bg-gray-900 rounded-b-3xl w-40 mx-auto z-10" />
          <div className="h-full w-full overflow-y-auto hide-scrollbar">
            <LinkTreePreview 
              profile={profile}
              templateType={templateType}
              templateValue={templateValue}
              socialLinks={socialLinks}
              customLinks={customLinks}
            />
          </div>
        </div>
      </div>

    </div>
  );
};

export default Admin;
