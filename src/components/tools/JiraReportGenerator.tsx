import React, { useState } from 'react';
import { FileSpreadsheet, X, Copy, Upload, ExternalLink } from 'lucide-react';
import { useMachineStore } from '../../store/useMachineStore';

interface JiraReportGeneratorProps {
  onClose: () => void;
}

const orderedProjects = [
  'RSG.Console.Lobby\n(大廳)',
  'RSG.Console.Machine.Common\n(硬體共用)',
  'RSG.Console.Slot.Common\n(遊戲共用)',
  'RSG.Console.Slot.BattleOfSet2Awakening\n(決戰賽特2)',
  'RSG.Console.Slot.BountyHunter\n(賞金獵人)',
  'RSG.Console.Slot.CaishenComing\n(有請財神)',
  'RSG.Console.Slot.ChinShiHuang\n(秦皇傳說)',
  'RSG.Console.Slot.ChineseNewYear3\n(大過年3)',
  'RSG.Console.Slot.FortuneOfAztecs\n(勇闖黃金城)',
  'RSG.Console.Slot.GoldChicken\n(金雞有喜)',
  'RSG.Console.Slot.HappyFarm\n(開心農場)',
  'RSG.Console.Slot.LegendOfLuBu\n(戰神呂布)',
  'RSG.Console.Slot.LuckyDog\n(狗來富)',
  'RSG.Console.Slot.PowerOfThor\n(雷神之錘)',
  'RSG.Console.Slot.PowerOfThor2\n(雷神之錘 II：雷霆風暴)',
  'RSG.Console.Slot.RichMahjong\n(麻將發了)',
  'RSG.Console.Slot.RichMahjong2\n(麻將發了2)',
  'RSG.Console.Slot.SuperAce2\n(超級王牌2)',
  'RSG.Console.Slot.TheLuxe\n(奢華)'
];

const projectKeyMap: Record<string, string> = {
  'RSGCL': 'RSG.Console.Lobby\n(大廳)',
  'RSGCMC': 'RSG.Console.Machine.Common\n(硬體共用)',
  'RSGCSC': 'RSG.Console.Slot.Common\n(遊戲共用)',
  'RSGCBOS2': 'RSG.Console.Slot.BattleOfSet2Awakening\n(決戰賽特2)',
  'RSGCBH': 'RSG.Console.Slot.BountyHunter\n(賞金獵人)',
  'RSGCCC': 'RSG.Console.Slot.CaishenComing\n(有請財神)',
  'RSGCCHN': 'RSG.Console.Slot.ChinShiHuang\n(秦皇傳說)',
  'RSGCCNY3': 'RSG.Console.Slot.ChineseNewYear3\n(大過年3)',
  'RSGCFA': 'RSG.Console.Slot.FortuneOfAztecs\n(勇闖黃金城)',
  'RSGCGC': 'RSG.Console.Slot.GoldChicken\n(金雞有喜)',
  'RSGCHF': 'RSG.Console.Slot.HappyFarm\n(開心農場)',
  'RSGCLEG': 'RSG.Console.Slot.LegendOfLuBu\n(戰神呂布)',
  'RSGCLD': 'RSG.Console.Slot.LuckyDog\n(狗來富)',
  'RSGCPOW': 'RSG.Console.Slot.PowerOfThor\n(雷神之錘)',
  'RSGCPOW2': 'RSG.Console.Slot.PowerOfThor2\n(雷神之錘 II：雷霆風暴)',
  'RSGCRM': 'RSG.Console.Slot.RichMahjong\n(麻將發了)',
  'RSGCRM2': 'RSG.Console.Slot.RichMahjong2\n(麻將發了2)',
  'RSGCSA2': 'RSG.Console.Slot.SuperAce2\n(超級王牌2)',
  'RSGCLUXE': 'RSG.Console.Slot.TheLuxe\n(奢華)',
};

const statusMap: Record<string, string> = {
  '未解決問題': '未解決',
  '重啟問題': '未解決',
  '處理中': '未解決',
  '待辦': '代辦',
  '觀察中': '觀察中',
  '已解決': '後續安排進測(已解決)'
};

const COLUMNS = ['專案', '未解決', '代辦', '待優化', '觀察中', '後續安排進測(已解決)'];

export const JiraReportGenerator: React.FC<JiraReportGeneratorProps> = ({ onClose }) => {
  const { jiraReportData = [], jiraReportFileName, setJiraReportData, setJiraReportFileName } = useMachineStore();
  const [copySuccess, setCopySuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // MR form states
  const [showMrModal, setShowMrModal] = useState(false);
  const [mrSelectedProjects, setMrSelectedProjects] = useState<string[]>([]);
  const [mrCopySuccess, setMrCopySuccess] = useState(false);
  
  const handleConvert = (csvText: string) => {
    setCopySuccess(false);
    setErrorMsg('');
    if (!csvText.trim()) {
      setJiraReportData([]);
      return;
    }

    // Robust CSV parser to handle quotes, commas inside quotes, and newlines inside quotes
    const parseCSV = (text: string) => {
      const rows: string[][] = [];
      let curRow: string[] = [];
      let cur = '';
      let inQuote = false;
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
          inQuote = !inQuote;
        } else if (c === ',' && !inQuote) {
          curRow.push(cur);
          cur = '';
        } else if ((c === '\n' || c === '\r') && !inQuote) {
          if (c === '\r' && text[i+1] === '\n') {
            i++; // skip \n
          }
          curRow.push(cur);
          if (curRow.some(cell => cell.trim() !== '')) {
            rows.push(curRow);
          }
          curRow = [];
          cur = '';
        } else {
          cur += c;
        }
      }
      if (cur !== '' || curRow.length > 0) {
        curRow.push(cur);
        if (curRow.some(cell => cell.trim() !== '')) {
          rows.push(curRow);
        }
      }
      return rows.map(r => r.map(s => s.trim().replace(/^"|"$/g, '').replace(/""/g, '"')));
    };

    const parsedLines = parseCSV(csvText);
    if (parsedLines.length < 2) {
      setErrorMsg('檔案格式錯誤或內容為空');
      return;
    }

    const headers = parsedLines[0];
    const issueKeyIndex = headers.findIndex(h => 
      h.toLowerCase().includes('issue key') || h.includes('問題金鑰') || h.includes('問題關鍵字') || h.includes('議題索引鍵')
    );
    const statusIndex = headers.findIndex(h => 
      h.toLowerCase().includes('status') || h.includes('狀態')
    );
    
    if (issueKeyIndex === -1 || statusIndex === -1) {
      setErrorMsg(`找不到必備欄位 (Issue key: ${issueKeyIndex !== -1 ? '✅' : '❌'}, Status: ${statusIndex !== -1 ? '✅' : '❌'})。請確認匯出的 CSV 是否包含這兩個欄位。`);
      return;
    }
    
    const dataLines = parsedLines.slice(1).filter(arr => arr.length > Math.max(issueKeyIndex, statusIndex));
    
    const group: Record<string, Record<string, string[]>> = {};

    dataLines.forEach(row => {
      const issueKey = row[issueKeyIndex];
      const statusRaw = row[statusIndex];
      if (!issueKey || !statusRaw) return;
      
      const mappedStatus = statusMap[statusRaw];
      if (!mappedStatus) return;
      
      const pKey = issueKey.split('-')[0];
      const projectName = projectKeyMap[pKey] || `未分類 (${pKey})`;
      
      if (!group[projectName]) group[projectName] = {};
      if (!group[projectName][mappedStatus]) group[projectName][mappedStatus] = [];
      
      group[projectName][mappedStatus].push(issueKey);
    });

    // Sort the issues from smallest to largest number
    Object.keys(group).forEach(proj => {
      Object.keys(group[proj]).forEach(status => {
        group[proj][status].sort((a, b) => {
          const numA = parseInt(a.split('-')[1]) || 0;
          const numB = parseInt(b.split('-')[1]) || 0;
          return numA - numB;
        });
      });
    });

    const finalRows: string[][] = [];
    
    // First, process the ordered ones to guarantee the output order and that every project is listed
    orderedProjects.forEach(proj => {
      const row = COLUMNS.map(col => {
        if (col === '專案') return proj;
        return (group[proj] && group[proj][col]) ? group[proj][col].join('、') : '';
      });
      finalRows.push(row);
      delete group[proj];
    });

    // If there are any extra projects found in the CSV that weren't in the ordered list, append them
    Object.keys(group).forEach(proj => {
      const row = COLUMNS.map(col => {
        if (col === '專案') return proj;
        return (group[proj] && group[proj][col]) ? group[proj][col].join('、') : '';
      });
      finalRows.push(row);
    });
    
    setJiraReportData(finalRows);
  };

  const generateTableHtml = () => {
    if (!jiraReportData || !jiraReportData.length) return '';
    let html = '<table style="border-collapse: collapse; font-family: sans-serif; width: 100%;">';
    // Header
    html += '<tr>';
    COLUMNS.forEach(col => {
      html += `<th align="center" valign="middle" style="border: 1px solid #000000; font-size: 15pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 6px; white-space: nowrap;"><b>${col}</b></th>`;
    });
    html += '</tr>';
    // Rows
    (jiraReportData || []).forEach(row => {
      html += '<tr>';
      row.forEach((cell, idx) => {
        const cellContent = cell.replace(/\n/g, '<br/>');
        if (idx === 0) {
          html += `<td align="left" valign="middle" style="border: 1px solid #000000; font-size: 15pt; font-weight: bold; text-align: left; vertical-align: middle; padding: 6px;"><b>${cellContent}</b></td>`;
        } else {
          html += `<td align="left" valign="middle" style="border: 1px solid #000000; font-size: 10pt; text-align: left; vertical-align: middle; padding: 6px;">${cellContent}</td>`;
        }
      });
      html += '</tr>';
    });
    html += '</table>';
    return html;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Reset input value to allow selecting the same file again
    e.target.value = '';
    
    setJiraReportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) handleConvert(text);
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input so same file can be uploaded again if needed
  };

  const handleCopy = async () => {
    if (!jiraReportData || !jiraReportData.length) return;
    const html = generateTableHtml();
    
    // Fallback TSV string
    const safeData = jiraReportData || [];
    const tsv = [COLUMNS.join('\t'), ...safeData.map(row => row.map(cell => {
      if (cell.includes('\n') || cell.includes('\t') || cell.includes('"')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join('\t'))].join('\n');

    try {
      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobText = new Blob([tsv], { type: 'text/plain' });
      const item = new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText
      });
      await navigator.clipboard.write([item]);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Copy failed, using fallback', err);
      navigator.clipboard.writeText(tsv);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const generateMrText = () => {
    if (!jiraReportData) return '';
    return mrSelectedProjects.map(proj => {
      const row = jiraReportData.find(r => r[0] === proj);
      if (!row) return '';
      let text = `${proj}\n`;
      let hasData = false;
      for (let i = 1; i < COLUMNS.length; i++) {
        if (row[i]) {
          text += `${COLUMNS[i]}\n${row[i]}\n`;
          hasData = true;
        }
      }
      return hasData ? text.trim() : '';
    }).filter(t => t !== '').join('\n\n');
  };

  const handleMrCopy = () => {
    navigator.clipboard.writeText(generateMrText());
    setMrCopySuccess(true);
    setTimeout(() => setMrCopySuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0a192f] w-[95vw] max-w-[1600px] rounded-xl shadow-2xl border border-blue-500/30 flex flex-col overflow-hidden max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50 bg-[#112240]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Jira CSV 報表轉換器</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => document.getElementById('jira-csv-upload')?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-[#112240] hover:bg-[#152e4b] border border-blue-500/50 hover:border-blue-400 text-blue-300 font-bold rounded-lg transition-colors shadow-lg"
            >
              <Upload className="w-5 h-5" />
              上傳 Jira CSV
            </button>
            <button
              onClick={() => window.open('https://docs.google.com/spreadsheets/d/1-R8yri4STdd8sjgdWmcCmOOjbOWaoZeleXjbBzBgBrc/edit?gid=1865707977#gid=1865707977', '_blank')}
              className="flex items-center gap-2 px-4 py-2 bg-[#112240] hover:bg-[#152e4b] border border-green-500/50 hover:border-green-400 text-green-300 font-bold rounded-lg transition-colors shadow-lg"
            >
              <ExternalLink className="w-5 h-5" />
              開啟目標追蹤表
            </button>
            <span className={`text-sm font-bold ${jiraReportFileName ? 'text-green-300' : 'text-gray-400'} ml-2`}>
              {jiraReportFileName ? `已上傳檔案: ${jiraReportFileName}` : '尚未上傳任何檔案'}
            </span>
          </div>
          {errorMsg && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-sm text-red-400 font-bold">
              ⚠️ {errorMsg}
            </div>
          )}
          <input 
            type="file" 
            id="jira-csv-upload" 
            accept=".csv" 
            className="hidden" 
            onChange={handleFileUpload}
          />

          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-blue-300 flex items-center gap-2">
                預覽並複製轉換結果 (TSV 格式)
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setMrSelectedProjects([]);
                    setShowMrModal(true);
                  }}
                  disabled={!jiraReportData || jiraReportData.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg"
                >
                  📝 產生 MR 表單
                </button>
                <button
                  onClick={handleCopy}
                  disabled={!jiraReportData || jiraReportData.length === 0}
                  className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-bold rounded-lg transition-colors shadow-lg ${
                    copySuccess 
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500'
                  }`}
                >
                  <Copy className="w-4 h-4" />
                  {copySuccess ? '✅ 已複製！' : '📋 一鍵複製為 Excel 格式'}
                </button>
              </div>
            </div>
            {/* Visual Table Preview */}
            <div className={`w-full flex-1 min-h-[400px] border rounded-lg overflow-auto ${jiraReportData && jiraReportData.length > 0 ? 'bg-white border-gray-700 p-1' : 'bg-[#0a192f]/50 border-gray-700 border-dashed flex flex-col items-center justify-center p-8'}`}>
              {jiraReportData && jiraReportData.length > 0 ? (
                <table className="w-full text-black border-collapse border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      {COLUMNS.map(col => (
                        <th key={col} className="border border-gray-300 p-2 whitespace-nowrap" style={{ fontSize: '15px', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(jiraReportData || []).map((row, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/50">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="border border-gray-300 p-1" style={
                            cIdx === 0 
                              ? { fontSize: '15px', fontWeight: 'bold', textAlign: 'left', verticalAlign: 'middle' }
                              : { fontSize: '10px', textAlign: 'left', verticalAlign: 'middle' }
                          }>
                            {cell.split('\n').map((line, i) => (
                              <React.Fragment key={i}>
                                {line}
                                {i < cell.split('\n').length - 1 && <br />}
                              </React.Fragment>
                            ))}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <>
                  <div className="text-5xl mb-4 opacity-40">📊</div>
                  <div className="text-gray-400 text-lg font-bold mb-2 tracking-wider">尚未上傳任何資料</div>
                  <div className="text-gray-500 text-sm">請點選左上方「上傳 Jira CSV」按鈕匯入您的報表</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MR Modal */}
      {showMrModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-[#0a192f] w-full max-w-6xl min-h-[700px] rounded-xl shadow-2xl border border-purple-500/50 flex flex-col overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-700/50 bg-[#112240]">
              <h2 className="text-lg font-bold text-purple-300">產生 MR 表單</h2>
              <button onClick={() => setShowMrModal(false)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 h-[600px] flex gap-8">
              <div className="w-2/5 flex flex-col gap-4 border-r border-gray-700 pr-6 h-full overflow-hidden">
                <div className="flex justify-between items-center shrink-0">
                  <span className="text-white font-bold">選擇專案</span>
                  <div className="flex gap-2">
                    <button className="text-xs bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 px-2 py-1 rounded transition-colors" onClick={() => setMrSelectedProjects((jiraReportData || []).filter(r => r.slice(1).some(c => c !== '')).map(r => r[0]))}>全選</button>
                    <button className="text-xs bg-gray-500/20 hover:bg-gray-500/40 text-gray-300 px-2 py-1 rounded transition-colors" onClick={() => setMrSelectedProjects([])}>全不選</button>
                  </div>
                </div>
                <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-2 min-h-0">
                  {(jiraReportData || []).filter(r => r.slice(1).some(c => c !== '')).map(row => (
                    <label key={row[0]} className="flex items-start gap-2 text-sm text-gray-300 cursor-pointer hover:text-white py-1">
                      <input type="checkbox" checked={mrSelectedProjects.includes(row[0])} onChange={(e) => {
                        if (e.target.checked) setMrSelectedProjects([...mrSelectedProjects, row[0]]);
                        else setMrSelectedProjects(mrSelectedProjects.filter(p => p !== row[0]));
                      }} className="rounded bg-gray-800 border-gray-600 text-purple-500 focus:ring-purple-500 mt-1" />
                      <div className="flex flex-col">
                        {row[0].split('\n').map((text, i) => (
                          <span key={i} className={i === 1 ? "text-gray-400 text-xs mt-0.5" : ""}>{text}</span>
                        ))}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="w-3/5 flex flex-col gap-4 h-full overflow-hidden">
                <div className="flex justify-between items-center shrink-0">
                  <span className="text-white font-bold">預覽 MR 表單</span>
                  <button onClick={handleMrCopy} className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-bold rounded-lg transition-colors shadow-lg">
                    <Copy className="w-4 h-4" />
                    {mrCopySuccess ? '✅ 已複製' : '📋 複製內容'}
                  </button>
                </div>
                <div className="flex-1 w-full min-h-0 bg-[#050b14] text-sm p-4 rounded-lg border border-gray-700 overflow-y-auto font-mono">
                  {mrSelectedProjects.map((proj) => {
                    const row = jiraReportData?.find(r => r[0] === proj);
                    if (!row) return null;
                    let hasData = false;
                    const items = [];
                    for (let i = 1; i < COLUMNS.length; i++) {
                      if (row[i]) {
                        hasData = true;
                        let colorClass = 'text-blue-400';
                        if (COLUMNS[i] === '未解決') colorClass = 'text-red-400';
                        else if (COLUMNS[i] === '代辦') colorClass = 'text-orange-400';
                        else if (COLUMNS[i] === '待優化') colorClass = 'text-yellow-400';
                        else if (COLUMNS[i] === '觀察中') colorClass = 'text-teal-400';
                        else if (COLUMNS[i].includes('已解決')) colorClass = 'text-green-400';

                        items.push(
                          <div key={COLUMNS[i]} className="mb-2">
                            <div className={`${colorClass} font-bold`}>{COLUMNS[i]}</div>
                            <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">{row[i]}</div>
                          </div>
                        );
                      }
                    }
                    if (!hasData) return null;
                    return (
                      <div key={proj} className="mb-6 last:mb-0">
                        <div className="text-purple-300 font-bold mb-1">
                          {proj.split('\n').map((line, idx) => <div key={idx}>{line}</div>)}
                        </div>
                        {items}
                      </div>
                    );
                  })}
                  {mrSelectedProjects.length === 0 && (
                    <div className="text-gray-500 h-full flex items-center justify-center">
                      請由左側勾選專案以預覽內容...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
