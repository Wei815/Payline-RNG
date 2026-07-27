import React, { useState, useMemo } from 'react';
import { X, Copy, Check, Link as LinkIcon } from 'lucide-react';

interface JiraLinkGeneratorProps {
  onClose: () => void;
}

export const JiraLinkGenerator: React.FC<JiraLinkGeneratorProps> = ({ onClose }) => {
  const [baseUrl, setBaseUrl] = useState('https://auforce.atlassian.net/browse');
  const [issues, setIssues] = useState('');
  const [copied, setCopied] = useState(false);

  const generatedLines = useMemo(() => {
    if (!issues.trim()) return [];
    
    // Split by newline or whitespace, filter out empty strings
    const issueList = issues.split(/[\n\s]+/).filter(i => i.trim());
    
    // Clean up base URL to ensure it doesn't end with a slash
    const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    return issueList.map(issue => {
      const cleanIssue = issue.trim();
      return `=HYPERLINK("${base}/${cleanIssue}", "${cleanIssue}")`;
    });
  }, [baseUrl, issues]);

  const handleCopy = async () => {
    if (generatedLines.length === 0) return;
    await navigator.clipboard.writeText(generatedLines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
      <div className="bg-[#0a192f] border border-gray-600 w-full max-w-6xl h-full max-h-[85vh] rounded-xl flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-700 bg-[#0f1d35] shrink-0">
          <div className="flex items-center gap-3">
            <LinkIcon className="text-dashboard-accent" />
            <h2 className="text-xl font-bold text-dashboard-text-primary tracking-wide">JIRA 出測 BUG 備註工具</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-800 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row p-6 gap-6 bg-[#0a192f]">
          
          {/* Left: Inputs */}
          <div className="w-full md:w-[320px] shrink-0 flex flex-col gap-6 h-full">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-300">基底網址 (Base URL)</label>
              <input 
                type="text" 
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full bg-[#112240] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-dashboard-accent transition-colors"
                placeholder="https://auforce.atlassian.net/browse"
              />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-sm font-bold text-gray-300">Issue ID 列表 (每行一個)</label>
              <textarea 
                value={issues}
                onChange={(e) => setIssues(e.target.value)}
                className="w-full flex-1 bg-[#112240] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-dashboard-accent transition-colors resize-none font-mono custom-scrollbar"
                placeholder={"RSGCLUXE-15\nRSGCLUXE-18\n..."}
              />
            </div>
          </div>

          {/* Right: Output */}
          <div className="w-full flex-1 min-w-0 flex flex-col h-full bg-[#1e1e1e] rounded-xl border border-gray-700 overflow-hidden shadow-inner relative group">
            
            <div className="absolute top-0 left-0 w-full flex justify-between items-center p-3 bg-[#252526] border-b border-gray-700">
              <span className="text-xs font-bold text-gray-400">Excel 格式輸出</span>
              <button
                onClick={handleCopy}
                disabled={generatedLines.length === 0}
                className="flex items-center gap-1.5 text-xs font-bold bg-[#333333] hover:bg-[#444444] disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 px-3 py-1.5 rounded-md transition-colors"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                {copied ? '已複製' : '複製全部'}
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 pt-14 custom-scrollbar font-mono text-[13px] leading-relaxed select-text whitespace-nowrap">
              {generatedLines.length === 0 ? (
                <div className="text-gray-500 h-full flex items-center justify-center italic">
                  等待輸入...
                </div>
              ) : (
                generatedLines.map((line, idx) => (
                  <div key={idx} className="mb-1.5">
                    <span className="text-[#d4d4d4]">=</span>
                    <span className="text-[#569cd6]">HYPERLINK</span>
                    <span className="text-[#d4d4d4]">(</span>
                    <span className="text-[#ce9178]">"{line.match(/"([^"]+)"/g)?.[0].replace(/"/g, '')}"</span>
                    <span className="text-[#d4d4d4]">, </span>
                    <span className="text-[#ce9178]">"{line.match(/"([^"]+)"/g)?.[1].replace(/"/g, '')}"</span>
                    <span className="text-[#d4d4d4]">)</span>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
