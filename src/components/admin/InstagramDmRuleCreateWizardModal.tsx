import React, { useState } from 'react';
import { useStore, type DMAutomationRule } from '../../store/useStore';
import { 
  X, 
  ChevronLeft, 
  Check, 
  Plus, 
  Info, 
  Image as ImageIcon,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import clsx from 'clsx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// Mock Instagram Posts for Selection Grid (Step 1)
const mockPosts = [
  { id: 'post-1', title: '해외 출장이라 쓰고 관광데이트라 읽는다', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80' },
  { id: 'post-2', title: '괴짜 철학관 다녀온 후기(완)', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=80' },
  { id: 'post-3', title: '좋소 IT 회사에 CC가 없는 이유', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=300&auto=format&fit=crop&q=80' },
  { id: 'post-4', title: '괴짜 철학관 다녀온 후기(2)', image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=300&auto=format&fit=crop&q=80' },
  { id: 'post-5', title: '집구석에만 있으니 님 심심해서', image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300&auto=format&fit=crop&q=80' },
  { id: 'post-6', title: '프로젝트 폭망과 우울증', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80' },
  { id: 'post-7', title: '왜 힘든 일은 한번에 일어날까', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80' },
  { id: 'post-8', title: '무능한 대표가 폭주하면 생기는 일', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80' },
  { id: 'post-9', title: '능력없는 직원이 팀장 되면 벌어지는 일', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=80' }
];

export const InstagramDmRuleCreateWizardModal: React.FC<Props> = ({
  isOpen,
  onClose
}) => {
  const state = useStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Selected Post
  const [selectedPostId, setSelectedPostId] = useState<string>('post-1');
  const [postType, setPostType] = useState<'uploaded' | 'upcoming'>('uploaded');

  // Step 2: Keywords
  const [keywordMode, setKeywordMode] = useState<'all' | 'specific'>('specific');
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>(['리포데이']);

  // Step 3: Message & Buttons
  const [message, setMessage] = useState('리포데이');
  const [buttonCount, setButtonCount] = useState<0 | 1 | 2 | 3>(1);
  const [buttonName, setButtonName] = useState('정보 바로 보기 🏞️');
  const [buttonUrl, setButtonUrl] = useState(`https://linkzip.kr/${state.profile.username || 'preview'}`);

  // Step 4: Random Comment Replies
  const [commentReplies, setCommentReplies] = useState<string[]>([
    '전달드렸어요! 감사해요 ❤️',
    '항상 응원해요 ><💕',
    '정보 확인해보세요! 🚀'
  ]);
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

  const handleAddCommentReply = () => {
    if (newReplyInput.trim() && !commentReplies.includes(newReplyInput.trim())) {
      setCommentReplies([...commentReplies, newReplyInput.trim()]);
      setNewReplyInput('');
    }
  };

  const handleSaveAutomationRule = () => {
    const mainKeyword = keywords[0] || '자동응답';
    const newRule: DMAutomationRule = {
      id: `rule-${Date.now()}`,
      keyword: mainKeyword,
      responseMessage: message || '안녕하세요! 요청하신 정보 링크입니다.',
      targetLinkUrl: buttonUrl,
      isActive: true
    };

    state.addDMRule(newRule);
    alert('새 DM 자동화 규칙이 성공적으로 생성되었습니다!');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-[#EDF2F7] rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 border border-gray-200">
        
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button 
                onClick={() => setStep((step - 1) as any)}
                className="p-1 text-gray-500 hover:text-black rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
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

          {/* STEP 1 OF 5: Post Selection (Matching Screenshot 2) */}
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="text-sm font-extrabold text-gray-900">
                Which posts would you like to automate?
              </h4>

              {/* Radio Group */}
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-800">
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
                        "aspect-square rounded-2xl overflow-hidden relative border-2 transition-all cursor-pointer group shadow-2xs",
                        isSelected ? "border-black ring-2 ring-black" : "border-transparent opacity-90 hover:opacity-100"
                      )}
                    >
                      <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center shadow-md">
                            <Check className="w-4 h-4" />
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-black/80 to-transparent text-[9px] text-white font-bold truncate">
                        {post.title}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2 OF 5: Keyword Settings (Matching Screenshot 3) */}
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
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-gray-700">Keywords<span className="text-red-500">*</span></label>
                  <div className="bg-white p-3 rounded-2xl border border-gray-300 min-h-[70px] flex flex-wrap gap-2 items-center">
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
                      placeholder={keywords.length === 0 ? "Enter keyword (e.g. 리포데이)" : "Type & press Enter..."}
                      className="flex-1 bg-transparent border-none text-xs font-bold focus:outline-none min-w-[120px]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3 OF 5: Write DM Message & Buttons (Matching Screenshot 4) */}
          {step === 3 && (
            <div className="space-y-5">
              <h4 className="text-sm font-extrabold text-gray-900 flex items-center justify-between">
                <span>Please write the Instagram message you want to send.</span>
                <Info className="w-4 h-4 text-gray-400" />
              </h4>

              {/* Live Preview Bubble Box */}
              <div className="bg-white p-6 rounded-3xl border border-gray-200 flex items-start gap-3 shadow-xs">
                <div className="w-10 h-10 rounded-full bg-amber-100 overflow-hidden border border-amber-300 shrink-0 flex items-center justify-center">
                  <img src={state.profile.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"} alt="avatar" className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 space-y-2">
                  <div className="bg-[#E5E7EB] p-4 rounded-2xl rounded-tl-xs text-xs font-semibold text-gray-900 shadow-2xs">
                    {message || 'Please enter your message'}
                  </div>

                  {buttonCount > 0 && (
                    <div className="bg-white p-3 rounded-2xl border border-gray-200 text-center text-xs font-bold text-gray-700 shadow-2xs">
                      {buttonName || 'Please enter the button name'}
                    </div>
                  )}
                </div>
              </div>

              {/* Message Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Message<span className="text-red-500">*</span></label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter message content"
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
                        "py-2.5 rounded-xl font-bold text-xs transition cursor-pointer border",
                        buttonCount === count 
                          ? "bg-black text-white border-black shadow-md" 
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      {count === 0 ? 'none' : count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Button Details Input */}
              {buttonCount > 0 && (
                <div className="space-y-3 p-4 bg-white rounded-2xl border border-gray-200">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">Button Name</label>
                    <input
                      type="text"
                      value={buttonName}
                      onChange={(e) => setButtonName(e.target.value)}
                      placeholder="e.g. 정보 바로 보기 🏞️"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">Target URL Link</label>
                    <input
                      type="url"
                      value={buttonUrl}
                      onChange={(e) => setButtonUrl(e.target.value)}
                      placeholder="https://linkzip.kr/username"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4 OF 5: Random Comment Replies */}
          {step === 4 && (
            <div className="space-y-5">
              <h4 className="text-sm font-extrabold text-gray-900">
                Random reply to comments
              </h4>
              <p className="text-xs text-gray-500 font-medium">
                Set random reply comments to make your account look natural and avoid spam detection.
              </p>

              <div className="space-y-2">
                {commentReplies.map((reply, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-2xl border border-gray-200 text-xs font-bold text-gray-800 flex items-center justify-between">
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
                  onClick={handleAddCommentReply}
                  className="px-4 py-2.5 bg-black hover:bg-gray-800 text-white rounded-2xl text-xs font-bold transition cursor-pointer"
                >
                  Add Reply
                </button>
              </div>
            </div>
          )}

          {/* STEP 5 OF 5: Final Review & Activate */}
          {step === 5 && (
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md border border-emerald-200">
                <Sparkles className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-xl font-black text-gray-900">Automation Ready!</h4>
                <p className="text-xs text-gray-500 font-medium">
                  Review your DM automation rule settings and click activate.
                </p>
              </div>

              <div className="p-5 bg-white rounded-3xl border border-gray-200 text-left space-y-3 text-xs shadow-2xs">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-400 font-bold">Target Keyword:</span>
                  <span className="font-extrabold text-indigo-600">#{keywords.join(', ') || 'All'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-400 font-bold">DM Message:</span>
                  <span className="font-bold text-gray-800 truncate max-w-[200px]">{message}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 font-bold">Target Link:</span>
                  <span className="font-bold text-blue-600 truncate max-w-[200px]">{buttonUrl}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Action Button */}
        <div className="p-6 bg-white border-t border-gray-200 shrink-0">
          {step < 5 ? (
            <button
              onClick={() => setStep((step + 1) as any)}
              className="w-full py-4 bg-black hover:bg-gray-800 text-white font-extrabold text-sm rounded-2xl shadow-lg transition cursor-pointer"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSaveAutomationRule}
              className="w-full py-4 bg-[#4285F4] hover:bg-[#3367D6] text-white font-extrabold text-sm rounded-2xl shadow-lg transition cursor-pointer"
            >
              Activate Automation
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
