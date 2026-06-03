import { useState, useEffect } from 'react';
import { X, Cloud, Upload, Download, Copy, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { encryptPortfolio, decryptPortfolio, generateSyncKey } from '../utils/syncCrypto';

const WORKER_URL = 'https://my-stock-proxy.zxc14708.workers.dev';
const SYNC_KEY_STORAGE = 'portfolio_sync_key';
const LAST_SYNC_STORAGE = 'portfolio_last_sync';

type Status = 'idle' | 'busy' | 'success' | 'error';

interface Props {
  onClose: () => void;
  onImportDone: () => void;
}

export function SyncModal({ onClose, onImportDone }: Props) {
  const [syncKey, setSyncKey] = useState<string>(() => {
    return localStorage.getItem(SYNC_KEY_STORAGE) ?? '';
  });
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(() => {
    const v = localStorage.getItem(LAST_SYNC_STORAGE);
    return v ? Number(v) : null;
  });

  useEffect(() => {
    if (!syncKey) {
      const newKey = generateSyncKey();
      setSyncKey(newKey);
      localStorage.setItem(SYNC_KEY_STORAGE, newKey);
    }
  }, [syncKey]);

  function copySyncKey() {
    navigator.clipboard.writeText(syncKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function regenerateKey() {
    if (!window.confirm('새 동기화 키를 생성하면 기존 키로는 불러올 수 없습니다. 계속할까요?')) return;
    const newKey = generateSyncKey();
    setSyncKey(newKey);
    localStorage.setItem(SYNC_KEY_STORAGE, newKey);
  }

  async function handleUpload() {
    if (!password) { setMessage('비밀번호를 입력해주세요'); setStatus('error'); return; }
    if (!syncKey)  { setMessage('동기화 키가 없습니다'); setStatus('error'); return; }

    setStatus('busy'); setMessage('암호화 중...');
    try {
      const encrypted = await encryptPortfolio(password);
      setMessage('업로드 중...');
      const res = await fetch(`${WORKER_URL}?action=sync&key=${encodeURIComponent(syncKey)}`, {
        method: 'PUT',
        body: encrypted,
      });
      if (!res.ok) throw new Error(`서버 오류 (${res.status})`);
      const now = Date.now();
      localStorage.setItem(LAST_SYNC_STORAGE, String(now));
      setLastSync(now);
      setStatus('success');
      setMessage('업로드 완료! 다른 기기에서 동기화 키와 비밀번호로 불러올 수 있습니다.');
    } catch (e) {
      setStatus('error');
      setMessage(`업로드 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
    }
  }

  async function handleDownload() {
    if (!password) { setMessage('비밀번호를 입력해주세요'); setStatus('error'); return; }
    if (!syncKey)  { setMessage('동기화 키를 입력해주세요'); setStatus('error'); return; }

    setStatus('busy'); setMessage('다운로드 중...');
    try {
      const res = await fetch(`${WORKER_URL}?action=sync&key=${encodeURIComponent(syncKey)}`);
      if (res.status === 404) throw new Error('해당 키의 데이터가 없습니다. 키를 확인해주세요.');
      if (!res.ok) throw new Error(`서버 오류 (${res.status})`);
      const encrypted = await res.text();
      setMessage('복호화 중...');
      await decryptPortfolio(encrypted, password);
      const now = Date.now();
      localStorage.setItem(LAST_SYNC_STORAGE, String(now));
      setLastSync(now);
      setStatus('success');
      setMessage('불러오기 완료! 페이지를 새로고침합니다...');
      setTimeout(() => { onImportDone(); onClose(); }, 1500);
    } catch (e) {
      setStatus('error');
      const msg = e instanceof Error ? e.message : '알 수 없는 오류';
      setMessage(msg.includes('오류') ? msg : `복호화 실패: 비밀번호를 확인해주세요`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e3151]">
          <div className="flex items-center gap-2">
            <Cloud size={16} className="text-blue-400" />
            <h2 className="text-white font-semibold">기기 간 동기화</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* 동기화 키 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-gray-400 text-xs font-medium">동기화 키</label>
              <button
                onClick={regenerateKey}
                className="text-gray-600 hover:text-gray-400 text-xs flex items-center gap-1 transition-colors"
              >
                <RefreshCw size={10} /> 새로 생성
              </button>
            </div>
            <div className="flex gap-2">
              <input
                value={syncKey}
                onChange={e => {
                  setSyncKey(e.target.value);
                  localStorage.setItem(SYNC_KEY_STORAGE, e.target.value);
                }}
                className="flex-1 bg-[#0f1117] border border-[#2e3151] text-white text-xs font-mono rounded-lg px-3 py-2.5 outline-none focus:border-blue-500"
                placeholder="동기화 키 입력 또는 자동 생성"
              />
              <button
                onClick={copySyncKey}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#0f1117] border border-[#2e3151] hover:border-gray-500 rounded-lg text-gray-400 hover:text-white text-xs transition-colors"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copied ? '복사됨' : '복사'}
              </button>
            </div>
            <p className="text-gray-600 text-xs mt-1.5">
              다른 기기에서 불러올 때 이 키가 필요합니다. 안전한 곳에 보관하세요.
            </p>
          </div>

          {/* 비밀번호 */}
          <div>
            <label className="text-gray-400 text-xs font-medium block mb-1.5">
              암호화 비밀번호 <span className="text-gray-600">(서버에 저장되지 않음)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setStatus('idle'); setMessage(''); }}
              placeholder="비밀번호 입력..."
              className="w-full bg-[#0f1117] border border-[#2e3151] text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 placeholder:text-gray-700"
            />
            <p className="text-gray-600 text-xs mt-1.5">
              업로드·다운로드 모두 동일한 비밀번호를 사용해야 합니다.
            </p>
          </div>

          {/* 상태 메시지 */}
          {message && (
            <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs ${
              status === 'error'   ? 'bg-red-950/40 border border-red-800/40 text-red-400' :
              status === 'success' ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-400' :
              'bg-blue-950/30 border border-blue-800/30 text-blue-400'
            }`}>
              {status === 'error' && <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />}
              {status === 'busy'  && <RefreshCw size={13} className="flex-shrink-0 mt-0.5 animate-spin" />}
              <span>{message}</span>
            </div>
          )}

          {/* 마지막 동기화 */}
          {lastSync && (
            <p className="text-gray-600 text-xs">
              마지막 동기화: {new Date(lastSync).toLocaleString('ko-KR')}
            </p>
          )}

          {/* 버튼 */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleUpload}
              disabled={status === 'busy'}
              className="flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white text-sm font-semibold transition-colors"
            >
              <Upload size={14} />
              이 기기 → 클라우드
            </button>
            <button
              onClick={handleDownload}
              disabled={status === 'busy'}
              className="flex items-center justify-center gap-2 py-2.5 bg-[#2e3151] hover:bg-[#3a3f6b] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white text-sm font-semibold transition-colors"
            >
              <Download size={14} />
              클라우드 → 이 기기
            </button>
          </div>

          {/* 보안 안내 */}
          <div className="bg-[#0f1117] rounded-lg px-3 py-2.5 space-y-1">
            <p className="text-gray-500 text-xs font-medium">보안 안내</p>
            <p className="text-gray-600 text-xs">• 데이터는 AES-256-GCM으로 브라우저에서 암호화 후 전송</p>
            <p className="text-gray-600 text-xs">• 비밀번호는 서버에 전달되지 않음 — 분실 시 복구 불가</p>
            <p className="text-gray-600 text-xs">• 서버에는 암호문만 저장됨 (내용 해독 불가)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
