import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { auth, logout } from '../../lib/firebase';
import { deleteUser } from 'firebase/auth';
import { deleteUserData } from '../../services/userService';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  User, 
  Mail, 
  Trash2, 
  AlertTriangle, 
  LogOut, 
  Key,
  CheckCircle2
} from 'lucide-react';

const SettingsEditor = () => {
  const state = useStore();
  const tr = (ko: string, en: string) => state.language === 'ko' ? ko : en;
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const user = state.user || auth.currentUser;

  const handleDeleteAccount = async () => {
    if (confirmInput.trim() !== '탈퇴합니다') {
      setErrorMsg("'탈퇴합니다'를 정확히 입력해주세요.");
      return;
    }

    setIsDeleting(true);
    setErrorMsg('');

    try {
      if (user?.uid) {
        // 1. Delete user document from Firestore
        await deleteUserData(user.uid, state.profile.username);
      }

      // 2. Delete user authentication account
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }

      // 3. Clear store state & redirect to home
      state.setUser(null);
      alert('회원 탈퇴가 완료되었습니다. 그동안 이용해주셔서 감사합니다.');
      navigate('/');
    } catch (error: any) {
      console.error('Account deletion error:', error);
      setIsDeleting(false);

      if (error.code === 'auth/requires-recent-login') {
        setErrorMsg('보안을 위해 다시 로그인하신 직후에 회원 탈퇴를 진행해주세요.');
      } else {
        setErrorMsg('탈퇴 처리 중 오류가 발생했습니다: ' + (error.message || '다시 시도해주세요.'));
      }
    }
  };

  return (
    <div className="space-y-6 pb-20 font-sans">
      
      {/* 1. Profile Account Info Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">내 계정 정보</h3>
            <p className="text-xs text-gray-500">현재 로그인된 계정 프로필</p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between text-xs py-2 border-b border-gray-50">
            <span className="font-semibold text-gray-500">이메일 계정</span>
            <span className="font-bold text-gray-900">{user?.email || '이메일 정보 없음'}</span>
          </div>

          <div className="flex items-center justify-between text-xs py-2 border-b border-gray-50">
            <span className="font-semibold text-gray-500">프로필 URL 아이디</span>
            <span className="font-bold text-purple-600">@{state.profile.username || 'username'}</span>
          </div>

          <div className="flex items-center justify-between text-xs py-2">
            <span className="font-semibold text-gray-500">계정 상태</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> 활성화됨
            </span>
          </div>
        </div>
      </div>

      {user?.email?.toLowerCase() === 'brownrice0916@gmail.com' && (
        <button type="button" onClick={() => navigate('/site-admin')} className="flex w-full cursor-pointer items-center gap-4 rounded-3xl border border-indigo-200 bg-indigo-50/70 p-6 text-left transition hover:-translate-y-0.5 hover:bg-indigo-50">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white"><Key className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><strong className="block text-sm font-black text-indigo-950">사이트 관리자</strong><span className="mt-1 block text-xs font-medium text-indigo-700">가입자와 비공개 베타 초대코드를 관리합니다.</span></span>
        </button>
      )}

      {/* 2. Logout Action Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">로그아웃</h3>
          <p className="text-xs text-gray-500 mt-0.5">현재 기기에서 안전하게 로그아웃합니다.</p>
        </div>

        <button
          onClick={async () => {
            await logout();
            navigate('/');
          }}
          className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-gray-600" />
          로그아웃
        </button>
      </div>

      {/* 3. Danger Zone / Withdraw Account Card */}
      <div className="bg-red-50/60 border border-red-200 rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-900">{tr('위험 구역', 'Danger zone')}</h3>
            <p className="text-xs text-red-600 font-medium">계정 삭제 및 데이터 영구 제거</p>
          </div>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed font-medium">
          회원 탈퇴 시 저장된 모든 링크, 디자인 설정, 프로필 데이터 및 계정이 영구 삭제되며, 삭제된 정보는 절대 복구할 수 없습니다.
        </p>

        <div className="pt-2">
          <button
            onClick={() => {
              setConfirmInput('');
              setErrorMsg('');
              setIsDeleteModalOpen(true);
            }}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold shadow-md shadow-red-600/20 transition flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            {tr('회원 탈퇴', 'Delete account')}
          </button>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">정말 회원 탈퇴하시겠습니까?</h3>
                <p className="text-xs text-red-600 font-bold">이 작업은 취소할 수 없습니다.</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              탈퇴 시 사용자의 모든 링크 데이터, 커스텀 디자인, 프로필 정보가 시스템에서 영구히 삭제됩니다.
              확인을 위해 아래 입력창에 <strong className="text-red-600 font-bold">'탈퇴합니다'</strong>를 입력해 주세요.
            </p>

            <div className="space-y-1">
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="탈퇴합니다"
                className="w-full px-4 py-3 rounded-2xl border border-gray-300 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50 focus:bg-white"
              />
              {errorMsg && (
                <p className="text-xs font-bold text-red-600 pt-1">{errorMsg}</p>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || confirmInput.trim() !== '탈퇴합니다'}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-full shadow-md shadow-red-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? '탈퇴 처리 중...' : '회원 탈퇴 확정'}
              </button>

              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="w-full py-2.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-xs font-bold rounded-full transition cursor-pointer"
              >
                취소하고 계속 이용하기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SettingsEditor;
