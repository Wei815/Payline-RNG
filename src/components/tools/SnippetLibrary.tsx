import React, { useState } from 'react';
import { X, Copy, Trash2, Check } from 'lucide-react';
import { useSnippetStore } from '../../store/useSnippetStore';
import { useGameStore } from '../../store/useGameStore';
import { useMachineStore } from '../../store/useMachineStore';

interface SnippetLibraryProps {
  onClose: () => void;
}

export const SnippetLibrary: React.FC<SnippetLibraryProps> = ({ onClose }) => {
  const snippets = useSnippetStore(state => state.snippets);
  const removeSnippet = useSnippetStore(state => state.removeSnippet);
  const updateSnippet = useSnippetStore(state => state.updateSnippet);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');

  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [editingContentValue, setEditingContentValue] = useState('');
  const [editingContentError, setEditingContentError] = useState('');
  
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: '', onConfirm: () => {} });

  const format2DArray = (arr: number[][]) => {
    if (!arr || arr.length === 0) return '[]';
    return `[\n${arr.map(subArr => `[${subArr.join(',')}]`).join(',\n')}\n]`;
  };

  const stringifyQA = (qaData: any) => {
    if (!qaData.QA || qaData.QA.length === 0) return JSON.stringify(qaData, null, 2);
    const qa = qaData.QA[0];
    return `{
 "QA":[
 {
 "RNGs":
${format2DArray(qa.RNGs)},
 "ClassIDs":
${format2DArray(qa.ClassIDs)},
 "LuckySelects":
${format2DArray(qa.LuckySelects)},
 "Selection":
${format2DArray(qa.Selection)}
 }
 ]
}`;
  };

  const handleCopy = (id: string, qaData: any) => {
    const jsonStr = stringifyQA(qaData);
    navigator.clipboard.writeText(jsonStr).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleLoad = (snippet: any) => {
    const store = useGameStore.getState();
    const currentProject = store.projectName;
    const targetProject = snippet.projectName || snippet.gameType;



    if (!store.isProjectLoaded) {
      useMachineStore.getState().setLoadTemplateTrigger(targetProject);
      store.setPendingSnippet(snippet);
      onClose();
      return;
    }

    if (currentProject && targetProject && currentProject !== targetProject) {
      setConfirmDialog({
        isOpen: true,
        message: `目前為「${currentProject}」，載入後將跳轉並載入「${targetProject}」。確定跳轉嗎？`,
        onConfirm: () => {
          setConfirmDialog({ ...confirmDialog, isOpen: false });
          useMachineStore.getState().setLoadTemplateTrigger(targetProject);
          store.setPendingSnippet(snippet);
          onClose();
        }
      });
      return;
    }

    store.applySnippet(snippet);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
      <div className="bg-[#0a192f] border border-gray-600 w-full max-w-4xl h-full max-h-[85vh] rounded-xl flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-700 bg-[#0f1d35] shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-dashboard-text-primary tracking-wide">測試腳本暫存庫 (Snippet Library)</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-800 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-[#0a192f] custom-scrollbar">
          {snippets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p>目前沒有任何暫存的測試腳本。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {snippets.map(snippet => (
                <div key={snippet.id} className="bg-[#112240] border border-gray-700 rounded-lg p-4 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div className="flex-1 min-w-0">
                        {editingTitleId === snippet.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={editingTitleValue}
                            onChange={e => setEditingTitleValue(e.target.value)}
                            onBlur={() => {
                              if (editingTitleValue.trim()) {
                                updateSnippet(snippet.id, { title: editingTitleValue.trim() });
                              }
                              setEditingTitleId(null);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                if (editingTitleValue.trim()) {
                                  updateSnippet(snippet.id, { title: editingTitleValue.trim() });
                                }
                                setEditingTitleId(null);
                              }
                              if (e.key === 'Escape') {
                                setEditingTitleId(null);
                              }
                            }}
                            className="w-full bg-[#0a192f] border border-dashboard-accent rounded px-2 py-0.5 text-dashboard-accent outline-none font-bold text-lg"
                          />
                        ) : (
                          <h3 
                            className="text-dashboard-accent font-bold truncate text-lg cursor-pointer hover:underline" 
                            title="點擊修改標題"
                            onClick={() => {
                              setEditingTitleId(snippet.id);
                              setEditingTitleValue(snippet.title);
                            }}
                          >
                            {snippet.title}
                          </h3>
                        )}
                      </div>
                      <button 
                        onClick={() => removeSnippet(snippet.id)}
                        className="text-gray-500 hover:text-red-400 transition-colors p-1"
                        title="刪除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs font-mono text-gray-400 bg-black/30 px-2 py-0.5 rounded">
                        {snippet.projectName || snippet.gameType}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(snippet.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setEditingContentId(snippet.id);
                        setEditingContentValue(stringifyQA(snippet.qaData));
                        setEditingContentError('');
                      }}
                      className="flex items-center justify-center gap-2 w-full py-2 bg-gray-500/10 border border-gray-500/30 text-gray-300 hover:bg-gray-500/20 rounded transition-colors text-sm font-bold"
                    >
                      📝 檢視 / 編輯內文
                    </button>
                    <button
                      onClick={() => handleCopy(snippet.id, snippet.qaData)}
                      className="flex items-center justify-center gap-2 w-full py-2 bg-dashboard-accent/10 border border-dashboard-accent/30 text-dashboard-accent hover:bg-dashboard-accent/20 rounded transition-colors text-sm font-bold"
                    >
                      {copiedId === snippet.id ? (
                        <>
                          <Check size={16} className="text-green-400" /> <span className="text-green-400">已複製</span>
                        </>
                      ) : (
                        <>
                          <Copy size={16} /> 📋 複製 QA JSON
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleLoad(snippet)}
                      className="flex items-center justify-center gap-2 w-full py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 rounded transition-colors text-sm font-bold"
                    >
                      🚀 載入至盤面生成
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Custom Confirm Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a192f] border border-gray-700 w-full max-w-sm rounded-lg p-5 shadow-2xl">
            <h3 className="text-dashboard-text-primary font-bold mb-4">系統提示</h3>
            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} 
                className="px-3 py-1.5 rounded text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={confirmDialog.onConfirm}
                className="px-3 py-1.5 rounded text-sm bg-dashboard-accent text-[#0a192f] font-bold hover:opacity-90 transition-opacity"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Content Modal */}
      {editingContentId && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a192f] border border-gray-700 w-full max-w-2xl h-[80vh] flex flex-col rounded-lg shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-[#0f1d35] shrink-0">
              <h3 className="text-dashboard-text-primary font-bold">檢視 / 編輯內文</h3>
              <button 
                onClick={() => setEditingContentId(null)} 
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-hidden flex flex-col gap-2">
              <textarea 
                value={editingContentValue}
                onChange={e => setEditingContentValue(e.target.value)}
                className="w-full h-full bg-[#112240] border border-gray-600 rounded p-3 text-white font-mono text-sm outline-none focus:border-dashboard-accent resize-none custom-scrollbar"
                spellCheck={false}
              />
              {editingContentError && <p className="text-red-400 text-xs font-bold">{editingContentError}</p>}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-700 bg-[#0f1d35] shrink-0">
              <button 
                onClick={() => setEditingContentId(null)} 
                className="px-4 py-2 rounded text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  try {
                    const parsed = JSON.parse(editingContentValue);
                    updateSnippet(editingContentId, { qaData: parsed });
                    setEditingContentId(null);
                  } catch (e) {
                    setEditingContentError('JSON 格式錯誤，請檢查內容');
                  }
                }}
                className="px-4 py-2 rounded text-sm bg-dashboard-accent text-[#0a192f] font-bold hover:opacity-90 transition-opacity"
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
