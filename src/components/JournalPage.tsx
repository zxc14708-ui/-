import { BookOpen } from 'lucide-react';

export function JournalPage() {
  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">매매일지</h2>
      </div>
      <div className="bg-[#1a1d2e] border border-dashed border-[#2e3151] rounded-xl p-16 text-center">
        <BookOpen size={32} className="text-gray-700 mx-auto mb-3" />
        <p className="text-gray-400 mb-1.5">매매일지 기능 준비 중입니다</p>
        <p className="text-gray-600 text-xs">곧 업데이트될 예정입니다</p>
      </div>
    </div>
  );
}
