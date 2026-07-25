import React, { useState } from 'react';
import { useStore, type DMAutomationRule } from '../../store/useStore';
import { 
  X, 
  ChevronLeft, 
  Check, 
  Plus, 
  Info, 
  Sparkles
} from 'lucide-react';
import clsx from 'clsx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// Mock Instagram Posts for Selection Grid (Step 1)
const mockPosts = [
  { id: 'post-1', title: '해외 출장이라 쓰고 관광데이트라 읽는다', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80', gradient: 'from-purple-600 to-indigo-600' },
  { id: 'post-2', title: '괴짜 철학관 다녀온 후기(완)', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=80', gradient: 'from-emerald-600 to-teal-700' },
  { id: 'post-3', title: '좋소 IT 회사에 CC가 없는 이유', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=300&auto=format&fit=crop&q=80', gradient: 'from-blue-600 to-cyan-600' },
  { id: 'post-4', title: '괴짜 철학관 다녀온 후기(2)', image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=300&auto=format&fit=crop&q=80', gradient: 'from-pink-500 to-rose-600' },
  { id: 'post-5', title: '집구석에만 있으니 님 심심해서', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80', gradient: 'from-amber-500 to-orange-600' },
  { id: 'post-6', title: '프로젝트 폭망과 우울증', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80', gradient: 'from-violet-600 to-purple-800' },
  { id: 'post-7', title: '왜 힘든 일은 한번에 일어날까', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=80', gradient: 'from-slate-700 to-slate-900' },
  { id: 'post-8', title: '무능한 대표가 폭주하면 생기는 일', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80', gradient: 'from-indigo-600 to-blue-700' },
  { id: 'post-9', title: '능력없는 직원이 팀장 되면 벌어지는 일', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=300&auto=format&fit=crop&q=80', gradient: 'from-rose-500 to-pink-700' }
];

export const InstagramDmRuleCreateWizardModal: React.FC<Props> = ({
  isOpen,
  onClose
}) => {
  const state = useStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Selected Post
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [postType, setPostType] = useState<'uploaded' | 'upcoming'>('uploaded');

  // Step 2: Keywords
  const [keywordMode, setKeywordMode] = useState<'all' | 'specific'>('specific');
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);

  // Step 3: DM Message & Buttons
  const [message, setMessage] = useState('');
  const [buttonCount, setButtonCount] = useState<0 | 1 | 2 | 3>(0);

  // Step 4: Button Links Config (up to 3 buttons)
  const [buttons, setButtons] = useState<Array<{ name: string; url: string }>>([
    { name: '', url: '' },
    { name: '', url: '' },
    { name: '', url: '' }
  ]);
  const [currentButtonIndex, setCurrentButtonIndex] = useState<number>(0);
  const [urlMode, setUrlMode] = useState<'new' | 'blocks'>('new');

  // Step 5: Comment Reply Option
  const [wantCommentReply, setWantCommentReply] = useState<'no' | 'yes'>('no');
  const [commentReplies, setCommentReplies] = useState<string[]>([]);
  const [newReplyInput, setNewReplyInput] = useState('');

  if (!isOpen) return null;

  const handleAddKeyword = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setKeywords(keywords.filter(k => k !== kw));
  };

  const handleUpdateButtonName = (index: number, name: string) => {
    const next = [...buttons];
    next[index] = { ...next[index], name };
    setButtons(next);
  };

  const handleUpdateButtonUrl = (index: number, url: string) => {
    const next = [...buttons];
    next[index] = { ...next[index], url };
    setButtons(next);
  };

  const handleStep3Next = () => {
    if (buttonCount === 0) {
      setStep(5);
    } else {
      setCurrentButtonIndex(0);
      setStep(4);
    }
  };

  const handleStep4LinkNext = () => {
    if (currentButtonIndex + 1 < buttonCount) {
      setCurrentButtonIndex(currentButtonIndex + 1);
    } else {
      setStep(5);
    }
  };

  const handleSaveAutomationRule = () => {
    const mainKeyword = keywords[0] || '자동응답';
    const mainButtonUrl = buttons[0]?.url || 'https://www.naver.com';

    const newRule: DMAutomationRule = {
      id: `rule-${Date.now()}`,
      keyword: mainKeyword,
      responseMessage: message || '안녕하세요! 요청하신 정보 링크입니다.',
      targetLinkUrl: mainButtonUrl,
      isActive: true
    };

    state.addDMRule(newRule);
    alert('DM 자동화 규칙이 성공적으로 저장되었습니다!');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-[#EDF2F7] rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 border border-gray-200">
        
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (step === 4 && currentButtonIndex > 0) {
                  setCurrentButtonIndex(currentButtonIndex - 1);
                } else if (step > 1) {
                  setStep((step - 1) as any);
                }
              }}
              className="p-1 text-gray-500 hover:text-black rounded-lg hover:bg-gray-100 transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-base font-extrabold text-gray-900">Create automation</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar Header */}
        <div className="bg-white px-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mb-2">
            <div 
              className="bg-black h-full transition-all duration-300" 
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
          <span className="text-xs font-bold text-gray-500">Step {step} of 5</span>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#EDF2F7]">

          {/* =========================================================
             STEP 1 OF 5: Post Selection (Matching Screenshot 1)
             ========================================================= */}
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="text-sm font-extrabold text-gray-900">
                Which posts would you like to automate?
              </h4>

              {/* Radio Group */}
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-900">
                  <input
                    type="radio"
                    name="postType"
                    checked={postType === 'uploaded'}
                    onChange={() => setPostType('uploaded')}
                    className="w-4 h-4 text-black focus:ring-black"
                  />
                  <span className="flex items-center gap-1">
                    Settings for uploaded posts <Info className="w-3.5 h-3.5 text-gray-400" />
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-400">
                  <input
                    type="radio"
                    name="postType"
                    checked={postType === 'upcoming'}
                    onChange={() => setPostType('upcoming')}
                    className="w-4 h-4 text-black focus:ring-black"
                  />
                  <span>Pre-set upcoming posts</span>
                </label>
              </div>

              {/* Mock Posts Thumbnail Grid */}
              <div className="grid grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                {mockPosts.map((post) => {
                  const isSelected = selectedPostId === post.id;
                  return (
                    <button
                      key={post.id}
                      onClick={() => setSelectedPostId(post.id)}
                      className={clsx(
                        "aspect-square rounded-2xl overflow-hidden relative border-2 transition-all cursor-pointer group shadow-2xs bg-gradient-to-tr",
                        post.gradient,
                        isSelected ? "border-black ring-2 ring-black" : "border-transparent opacity-90 hover:opacity-100"
                      )}
                    >
                      <img 
                        src={post.image} 
                        alt={post.title} 
                        className="w-full h-full object-cover relative z-0" 
                        onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-2.5 z-10 text-left">
                        <div className="flex justify-end">
                          {isSelected && (
                            <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center shadow-md">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-white font-extrabold line-clamp-2 leading-tight drop-shadow-sm">
                          {post.title}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================
             STEP 2 OF 5: Keyword Settings (Matching Screenshot 2)
             ========================================================= */}
          {step === 2 && (
            <div className="space-y-5">
              <h4 className="text-sm font-extrabold text-gray-900">
                Which comments to send a DM to?
              </h4>

              {/* Radio Group */}
              <div className="space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-400">
                  <input
                    type="radio"
                    name="keywordMode"
                    checked={keywordMode === 'all'}
                    onChange={() => setKeywordMode('all')}
                    className="w-4 h-4 text-black focus:ring-black"
                  />
                  <span>All keywords</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-900">
                  <input
                    type="radio"
                    name="keywordMode"
                    checked={keywordMode === 'specific'}
                    onChange={() => setKeywordMode('specific')}
                    className="w-4 h-4 text-black focus:ring-black"
                  />
                  <span>Send based on specific keywords (e.g., monetization, automation)</span>
                </label>
              </div>

              {/* Keywords Tag Input */}
              {keywordMode === 'specific' && (
                <div className="space-y-2 pt-2 text-left">
                  <label className="text-xs font-bold text-gray-700">Keywords<span className="text-red-500">*</span></label>
                  <div className="bg-white p-3 rounded-2xl border border-gray-300 min-h-[60px] flex flex-wrap gap-2 items-center shadow-2xs">
                    {keywords.map((kw) => (
                      <span 
                        key={kw} 
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-900 text-xs font-bold rounded-xl border border-gray-200 shadow-2xs"
                      >
                        {kw}
                        <button 
                          onClick={() => handleRemoveKeyword(kw)}
                          className="hover:text-red-500 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}

                    <input
                      type="text"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={handleAddKeyword}
                      placeholder={keywords.length === 0 ? "Enter keyword..." : ""}
                      className="flex-1 bg-transparent border-none text-xs font-bold focus:outline-none min-w-[100px]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
             STEP 3 OF 5: Write DM Message & Button Count (Matching Screenshot 3)
             ========================================================= */}
          {step === 3 && (
            <div className="space-y-5">
              <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-1">
                <span>Please write the Instagram message you want to send.</span>
                <Info className="w-4 h-4 text-gray-400" />
              </h4>

              {/* Live Preview Container (Matching Screenshot 3) */}
              <div className="bg-white p-6 rounded-3xl border border-gray-200 flex items-end gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-amber-300 shrink-0 bg-amber-100 flex items-center justify-center">
                  <img 
                    src={state.profile.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"} 
                    alt="avatar" 
                    className="w-full h-full object-cover" 
                  />
                </div>

                <div className="bg-[#E5E7EB] p-4 rounded-2xl rounded-bl-xs text-xs font-semibold text-gray-900 shadow-2xs flex-1 space-y-2">
                  <p>{message || 'Please enter your message'}</p>

                  {/* Render Button Slots based on buttonCount */}
                  {buttonCount > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {Array.from({ length: buttonCount }).map((_, idx) => (
                        <div 
                          key={idx}
                          className="bg-white py-2.5 px-4 rounded-xl text-center text-xs font-bold text-gray-400 border border-gray-100 shadow-2xs truncate"
                        >
                          {buttons[idx]?.name || 'Please enter the button name'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Form Controls */}
              <div className="space-y-4 text-left">
                {/* Message Textarea */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Message<span className="text-red-500">*</span></label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Please enter your message"
                    rows={3}
                    className="w-full p-4 rounded-2xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black bg-white shadow-2xs"
                  />
                </div>

                {/* Message buttons selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700">Message buttons<span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setButtonCount(count as any)}
                        className={clsx(
                          "py-3 rounded-2xl font-extrabold text-xs transition cursor-pointer border shadow-2xs",
                          buttonCount === count 
                            ? "bg-black text-white border-black" 
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        {count === 0 ? 'none' : count}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
             STEP 4 OF 5: Button Link Setup (Matching Screenshot 4)
             ========================================================= */}
          {step === 4 && (
            <div className="space-y-5">
              <h4 className="text-sm font-extrabold text-gray-900">
                Button link #{currentButtonIndex + 1} setup
              </h4>

              {/* Live Preview Container (Matching Screenshot 4) */}
              <div className="bg-white p-6 rounded-3xl border border-gray-200 flex items-end gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-amber-300 shrink-0 bg-amber-100 flex items-center justify-center">
                  <img 
                    src={state.profile.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"} 
                    alt="avatar" 
                    className="w-full h-full object-cover" 
                  />
                </div>

                <div className="bg-[#E5E7EB] p-4 rounded-2xl rounded-bl-xs text-xs font-semibold text-gray-900 shadow-2xs flex-1 space-y-2">
                  <p>{message || '하이융ㅋ'}</p>

                  <div className="space-y-1.5 pt-1">
                    {Array.from({ length: buttonCount }).map((_, idx) => (
                      <div 
                        key={idx}
                        className={clsx(
                          "py-2.5 px-4 rounded-xl text-center text-xs font-bold border shadow-2xs truncate",
                          idx === currentButtonIndex 
                            ? "bg-white text-gray-900 border-black" 
                            : "bg-white/80 text-gray-400 border-gray-100"
                        )}
                      >
                        {buttons[idx]?.name || 'Please enter the button name'}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Controls */}
              <div className="space-y-4 text-left">
                {/* Button Message Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Button message<span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={buttons[currentButtonIndex]?.name || ''}
                    onChange={(e) => handleUpdateButtonName(currentButtonIndex, e.target.value)}
                    placeholder="Please enter the button name"
                    className="w-full p-3.5 rounded-2xl border border-gray-300 text-xs font-extrabold focus:outline-none focus:ring-2 focus:ring-black bg-white shadow-2xs"
                  />
                </div>

                {/* URL Options */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700">URL<span className="text-red-500">*</span></label>
                  
                  {/* Segmented Option Selector */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setUrlMode('new')}
                      className={clsx(
                        "py-3 rounded-2xl text-xs font-extrabold transition cursor-pointer border shadow-2xs",
                        urlMode === 'new' ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-200"
                      )}
                    >
                      Set up a new link
                    </button>

                    <button
                      type="button"
                      onClick={() => setUrlMode('blocks')}
                      className={clsx(
                        "py-3 rounded-2xl text-xs font-extrabold transition cursor-pointer border shadow-2xs",
                        urlMode === 'blocks' ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-200"
                      )}
                    >
                      Select from your link blocks
                    </button>
                  </div>

                  {/* URL Input Field */}
                  <input
                    type="url"
                    value={buttons[currentButtonIndex]?.url || ''}
                    onChange={(e) => handleUpdateButtonUrl(currentButtonIndex, e.target.value)}
                    placeholder="https://www.naver.com"
                    className="w-full p-3.5 rounded-2xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black bg-white shadow-2xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
             STEP 5 OF 5: Comment Reply Option (Matching Screenshot 5)
             ========================================================= */}
          {step === 5 && (
            <div className="space-y-6 pt-4 text-left">
              <h4 className="text-base font-extrabold text-gray-900">
                Automatically reply to the comments you send messages to?
              </h4>

              {/* Radio Options */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer text-xs font-bold text-gray-900">
                  <input
                    type="radio"
                    name="wantCommentReply"
                    checked={wantCommentReply === 'no'}
                    onChange={() => setWantCommentReply('no')}
                    className="w-4 h-4 text-black focus:ring-black"
                  />
                  <span>No, thank you</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-xs font-bold text-gray-900">
                  <input
                    type="radio"
                    name="wantCommentReply"
                    checked={wantCommentReply === 'yes'}
                    onChange={() => setWantCommentReply('yes')}
                    className="w-4 h-4 text-black focus:ring-black"
                  />
                  <span>Yes, I want to reply</span>
                </label>
              </div>

              {/* Additional Comment Replies if Yes */}
              {wantCommentReply === 'yes' && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-gray-500 font-medium">
                    Set random reply comments to make your account look natural:
                  </p>
                  <div className="space-y-2">
                    {commentReplies.map((reply, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-2xl border border-gray-200 text-xs font-bold text-gray-800 flex items-center justify-between shadow-2xs">
                        <span>💬 {reply}</span>
                        <button 
                          onClick={() => setCommentReplies(commentReplies.filter((_, i) => i !== idx))}
                          className="text-gray-400 hover:text-red-500 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newReplyInput}
                      onChange={(e) => setNewReplyInput(e.target.value)}
                      placeholder="Add reply (e.g. DM 확인해보세요! ❤️)"
                      className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-300 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newReplyInput.trim()) {
                          setCommentReplies([...commentReplies, newReplyInput.trim()]);
                          setNewReplyInput('');
                        }
                      }}
                      className="px-4 py-2.5 bg-black hover:bg-gray-800 text-white rounded-2xl text-xs font-bold transition cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Action Button */}
        <div className="p-6 bg-white border-t border-gray-200 shrink-0">
          {step === 1 && (
            <button
              onClick={() => setStep(2)}
              className="w-full py-4 bg-black hover:bg-gray-800 text-white font-extrabold text-sm rounded-2xl shadow-lg transition cursor-pointer"
            >
              Next
            </button>
          )}

          {step === 2 && (
            <button
              onClick={() => setStep(3)}
              className="w-full py-4 bg-black hover:bg-gray-800 text-white font-extrabold text-sm rounded-2xl shadow-lg transition cursor-pointer"
            >
              Next
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleStep3Next}
              className="w-full py-4 bg-black hover:bg-gray-800 text-white font-extrabold text-sm rounded-2xl shadow-lg transition cursor-pointer"
            >
              Next
            </button>
          )}

          {step === 4 && (
            <button
              onClick={handleStep4LinkNext}
              className="w-full py-4 bg-black hover:bg-gray-800 text-white font-extrabold text-sm rounded-2xl shadow-lg transition cursor-pointer"
            >
              {currentButtonIndex + 1}/{buttonCount} link setup complete
            </button>
          )}

          {step === 5 && (
            <button
              onClick={handleSaveAutomationRule}
              className="w-full py-4 bg-black hover:bg-gray-800 text-white font-extrabold text-sm rounded-2xl shadow-lg transition cursor-pointer"
            >
              Finish &amp; Save
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
