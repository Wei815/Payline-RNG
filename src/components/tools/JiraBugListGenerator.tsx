import React, { useState } from 'react';
import { FileSpreadsheet, X, Upload, Copy, Download } from 'lucide-react';
import { useMachineStore } from '../../store/useMachineStore';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface JiraBugListGeneratorProps {
  onClose: () => void;
}

const COLUMNS = [
  '編號 Bug No.',
  '第幾階段 (R)',
  '測試日期',
  '驗證結果',
  '新舊BUG',
  '環境',
  '說明/執行步驟 Description/Duplication',
  '驗收人員',
  '備註'
];

export const JiraBugListGenerator: React.FC<JiraBugListGeneratorProps> = ({ onClose }) => {
  const { jiraBugListData, setJiraBugListData, jiraBugListFileName, setJiraBugListFileName } = useMachineStore();
  
  const [phase, setPhase] = useState('R1');
  const [errorMsg, setErrorMsg] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setJiraBugListFileName(file.name);
    
    // Check if it's CSV or Excel based on extension
    if (file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        if (text) handleConvert(text);
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const xlsx = await import('xlsx');
          const workbook = xlsx.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const csvText = xlsx.utils.sheet_to_csv(worksheet);
          handleConvert(csvText);
        } catch (err) {
          setErrorMsg('Excel 解析失敗，請確保檔案格式正確或改用 CSV。');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setErrorMsg('請上傳 CSV 或 Excel (.xlsx, .xls) 檔案。');
    }
    
    e.target.value = ''; // Reset input so same file can be uploaded again if needed
  };

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

  const handleConvert = (csvText: string) => {
    setCopySuccess(false);
    setErrorMsg('');
    if (!csvText.trim()) {
      setJiraBugListData([]);
      return;
    }

    const parsedLines = parseCSV(csvText);
    if (parsedLines.length < 2) {
      setErrorMsg('檔案格式錯誤或內容為空');
      return;
    }

    const headers = parsedLines[0];
    const issueKeyIndex = headers.findIndex(h => 
      h.toLowerCase().includes('issue key') || h.includes('問題金鑰') || h.includes('問題關鍵字') || h.includes('議題鍵值') || h.includes('議題索引鍵')
    );
    const summaryIndex = headers.findIndex(h => h.toLowerCase().includes('summary') || h.includes('摘要'));
    const reporterIndex = headers.findIndex(h => h.toLowerCase().includes('reporter') || h.includes('報告者') || h.includes('回報者'));
    const createdIndex = headers.findIndex(h => h.toLowerCase().includes('created') || h.includes('已建立') || h.includes('建立日期'));
    
    if (issueKeyIndex === -1 || summaryIndex === -1) {
      setErrorMsg(`找不到必要欄位 (議題索引鍵: ${issueKeyIndex !== -1 ? '有' : '無'}, 摘要: ${summaryIndex !== -1 ? '有' : '無'})，請確認匯出的檔案是否包含。`);
      return;
    }
    
    const dataLines = parsedLines.slice(1).filter(arr => arr.length > Math.max(issueKeyIndex, summaryIndex));
    const processedData: string[][] = [];

    dataLines.forEach((row, index) => {
      const issueKey = row[issueKeyIndex]?.trim() || '';
      if (!issueKey) return;
      
      const summary = row[summaryIndex]?.trim() || '';
      
      let reporter = '';
      if (reporterIndex !== -1) {
        reporter = row[reporterIndex]?.trim() || '';
        
        // 特殊人員對應表
        const reporterMap: Record<string, string> = {
          'QA-Leo': 'Leo',
          'QA-lilyxue': 'Lily',
          'QA-Sean': 'Sean',
          'QA-WillChou': 'Will',
          'QA-darwin': '小波',
          'QA-Thomas': 'Thomas'
        };

        // 如果在對應表中，直接使用對應值，否則移除 QA- 前綴
        if (reporterMap[reporter]) {
          reporter = reporterMap[reporter];
        } else {
          reporter = reporter.replace(/^QA-/i, '');
        }
      }

      let createdDate = '';
      if (createdIndex !== -1) {
        let rawDate = row[createdIndex]?.trim() || '';
        
        // 處理 Jira 繁體中文匯出格式 (例如 "08/九月/26")
        const monthMap: Record<string, string> = {
          '一月': '01', '二月': '02', '三月': '03', '四月': '04', '五月': '05', '六月': '06',
          '七月': '07', '八月': '08', '九月': '09', '十月': '10', '十一月': '11', '十二月': '12'
        };
        
        Object.entries(monthMap).forEach(([k, v]) => {
          rawDate = rawDate.replace(k, v);
        });

        // 嘗試解析 DD/MM/YY 或其他格式
        const parts = rawDate.split(/[\/\-\s]/);
        // 如果是 DD/MM/YY 格式 (中文替換後會變成 08/09/26)
        if (parts.length >= 3 && rawDate.includes('/')) {
          let day = parseInt(parts[0], 10);
          let month = parseInt(parts[1], 10);
          let year = parseInt(parts[2], 10);
          
          if (year < 100) year += 2000;
          
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            createdDate = `${year}/${month}/${day}`;
          }
        }
        
        // Fallback 機制 (標準 Date.parse)
        if (!createdDate) {
          try {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
              createdDate = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
            } else {
              createdDate = rawDate.split(' ')[0];
            }
          } catch {
            createdDate = rawDate.split(' ')[0];
          }
        }
      }

      const bugNo = String(index + 1).padStart(2, '0');
      const hyperlink = `=HYPERLINK("https://auforce.atlassian.net/browse/${issueKey}", "${issueKey}")`;

      // 產生 A~I 欄位
      processedData.push([
        bugNo,
        phase,
        createdDate,
        'Fail', // 驗證結果
        'New',  // 新舊BUG
        'UAT',  // 環境
        summary, // 說明/執行步驟
        reporter, // 驗收人員
        hyperlink // 備註
      ]);
    });

    setJiraBugListData(processedData);
  };

  // 當選擇的 phase 改變時，如果已經有資料，一併更新 B 欄
  const handlePhaseChange = (newPhase: string) => {
    setPhase(newPhase);
    if (jiraBugListData && jiraBugListData.length > 0) {
      const updated = jiraBugListData.map(row => {
        const newRow = [...row];
        newRow[1] = newPhase;
        return newRow;
      });
      setJiraBugListData(updated);
    }
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    if (!jiraBugListData) return;
    const newData = [...jiraBugListData];
    newData[rowIndex] = [...newData[rowIndex]];
    newData[rowIndex][colIndex] = value;
    setJiraBugListData(newData);
  };

  const handleCopy = async () => {
    if (!jiraBugListData || !jiraBugListData.length) return;
    
    // TSV 格式
    const tsv = [COLUMNS.join('\t'), ...jiraBugListData.map(row => row.map(cell => {
      // 處理含有換行或 tab 的儲存格
      if (cell.includes('\n') || cell.includes('\t') || cell.includes('"')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join('\t'))].join('\n');

    // 產生 HTML table 讓支援 rich text 的環境可以吃到完整的 formatting
    const htmlRows = jiraBugListData.map(row => {
      const tds = row.map((cell, j) => {
        const isLeftAlign = j === 6 || j === 7;
        const alignStyle = isLeftAlign ? 'left' : 'center';
        return `<td style="text-align: ${alignStyle};">${cell.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</td>`;
      }).join('');
      return `<tr>${tds}</tr>`;
    }).join('');
    
    const htmlTable = `
      <table border="1">
        <thead>
          <tr>${COLUMNS.map(c => `<th style="text-align: center;">${c}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${htmlRows}
        </tbody>
      </table>
    `;

    try {
      const blobHtml = new Blob([htmlTable], { type: 'text/html' });
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

  const handleExportExcel = async () => {
    if (!jiraBugListData || !jiraBugListData.length) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bug List');

    // Add headers
    const headerRow = worksheet.addRow(COLUMNS);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' }
    };

    // Set column widths and alignments
    worksheet.columns = [
      { width: 15, style: { alignment: { horizontal: 'center' } } }, // Bug No.
      { width: 15, style: { alignment: { horizontal: 'center' } } }, // Phase
      { width: 15, style: { alignment: { horizontal: 'center' } } }, // Date
      { width: 15, style: { alignment: { horizontal: 'center' } } }, // Result
      { width: 15, style: { alignment: { horizontal: 'center' } } }, // New/Old
      { width: 15, style: { alignment: { horizontal: 'center' } } }, // Env
      { width: 60, style: { alignment: { horizontal: 'left' } } }, // Desc
      { width: 15, style: { alignment: { horizontal: 'left' } } }, // Tester
      { width: 25, style: { alignment: { horizontal: 'center' } } }, // Note
    ];

    // Force header row to be center aligned
    headerRow.eachCell((cell) => {
      cell.alignment = { horizontal: 'center' };
    });

    jiraBugListData.forEach((rowData, index) => {
      const row = worksheet.addRow(rowData);
      const rowNum = index + 2; // +1 for header, +1 for 0-index

      // C: 測試日期 (Date type)
      // rowData[2] is "YYYY/MM/DD"
      if (rowData[2]) {
        const parts = rowData[2].split('/');
        if (parts.length === 3) {
          const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          row.getCell(3).value = dateObj;
          row.getCell(3).numFmt = 'yyyy/m/d';
        }
      }

      // D: 驗證結果 (Pass/Fail/Pending)
      row.getCell(4).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Pass,Fail,Pending"'],
        showErrorMessage: true,
        errorTitle: '無效的值',
        error: '請選擇清單中的項目'
      };

      // B: 第幾階段 (R)
      row.getCell(2).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"R1,R2,R3,R4,R5,R6"']
      };

      // E: 新舊BUG
      row.getCell(5).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"New,Old"']
      };

      // F: 環境
      row.getCell(6).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"DEV,UAT,UAT-PROD,PROD,正式站"']
      };

      // I: 備註 (Hyperlink)
      const issueKey = rowData[8].match(/browse\/(.+?)"/)?.[1] || '';
      if (issueKey) {
        row.getCell(9).value = {
          text: issueKey,
          hyperlink: `https://auforce.atlassian.net/browse/${issueKey}`
        };
        row.getCell(9).font = { color: { argb: 'FF0563C1' }, underline: true };
      }
    });

    // Add borders to all cells
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: {style:'thin'},
          left: {style:'thin'},
          bottom: {style:'thin'},
          right: {style:'thin'}
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Jira_Bug_List.xlsx');
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
            <h2 className="text-lg font-bold text-white">JIRA 出測 Bug list 工具</h2>
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
          <div className="flex items-center gap-4 flex-wrap">
            <button 
              onClick={() => document.getElementById('jira-buglist-upload')?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-[#112240] hover:bg-[#152e4b] border border-blue-500/50 hover:border-blue-400 text-blue-300 font-bold rounded-lg transition-colors shadow-lg"
            >
              <Upload className="w-5 h-5" />
              上傳 Jira CSV/Excel
            </button>
            <span className={`text-sm font-bold ${jiraBugListFileName ? 'text-green-300' : 'text-gray-400'} ml-2`}>
              {jiraBugListFileName ? `已上傳檔案: ${jiraBugListFileName}` : '尚未上傳任何檔案'}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-2">
            <label className="text-sm font-bold text-gray-300">設定第幾階段 (R)：</label>
            <select 
              value={phase}
              onChange={(e) => handlePhaseChange(e.target.value)}
              className="bg-[#112240] border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="R1">R1</option>
              <option value="R2">R2</option>
              <option value="R3">R3</option>
              <option value="R4">R4</option>
              <option value="R5">R5</option>
              <option value="R6">R6</option>
            </select>
          </div>

          {errorMsg && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-sm text-red-400 font-bold">
              ⚠️ {errorMsg}
            </div>
          )}
          <input 
            type="file" 
            id="jira-buglist-upload" 
            accept=".csv,.xlsx,.xls" 
            className="hidden" 
            onChange={handleFileUpload}
          />

          <div className="flex flex-col gap-2 flex-1 mt-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-blue-300 flex items-center gap-2">
                預覽並複製轉換結果
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportExcel}
                  disabled={!jiraBugListData || jiraBugListData.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  下載 Excel 檔案
                </button>
                <button
                  onClick={handleCopy}
                  disabled={!jiraBugListData || jiraBugListData.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg"
                >
                  <Copy className="w-4 h-4" />
                  {copySuccess ? '已複製！' : '一鍵複製為 Excel 格式 (TSV)'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-300 overflow-hidden flex-1 relative min-h-[300px] shadow-inner">
              <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
                <table className="w-full text-sm text-center whitespace-nowrap text-black">
                  <thead className="text-xs text-black uppercase bg-gray-200 sticky top-0 z-10 border-b border-gray-300">
                    <tr>
                      {COLUMNS.map((col, i) => (
                        <th key={i} className="px-4 py-3 border-r border-gray-300 font-bold text-center">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(!jiraBugListData || jiraBugListData.length === 0) ? (
                      <tr>
                        <td colSpan={COLUMNS.length} className="px-4 py-8 text-center text-gray-500">
                          上傳檔案後將在此顯示預覽
                        </td>
                      </tr>
                    ) : (
                      jiraBugListData.map((row, i) => (
                        <tr key={i} className="border-b border-gray-300 hover:bg-blue-50 transition-colors">
                          {row.map((cell, j) => {
                            const isLeftAlign = j === 6 || j === 7;
                            const alignClass = isLeftAlign ? 'text-left' : 'text-center';
                            const selectClass = `bg-white border border-gray-300 text-black text-sm rounded px-1 py-1 focus:ring-blue-500 focus:border-blue-500 w-full shadow-sm hover:border-blue-400 outline-none ${alignClass}`;
                            
                            let content;
                            if (j === 1) {
                              content = (
                                <select value={cell} onChange={(e) => updateCell(i, j, e.target.value)} className={selectClass}>
                                  {['R1', 'R2', 'R3', 'R4', 'R5', 'R6'].map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              );
                            } else if (j === 3) {
                              content = (
                                <select value={cell} onChange={(e) => updateCell(i, j, e.target.value)} className={selectClass}>
                                  {['Pass', 'Fail', 'Pending'].map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              );
                            } else if (j === 4) {
                              content = (
                                <select value={cell} onChange={(e) => updateCell(i, j, e.target.value)} className={selectClass}>
                                  {['New', 'Old'].map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              );
                            } else if (j === 5) {
                              content = (
                                <select value={cell} onChange={(e) => updateCell(i, j, e.target.value)} className={selectClass}>
                                  {['DEV', 'UAT', 'UAT-PROD', 'PROD', '正式站'].map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              );
                            } else {
                              content = <div className={`max-w-[300px] truncate ${alignClass}`} title={cell}>{cell}</div>;
                            }

                            return (
                              <td key={j} className={`px-2 py-1.5 border-r border-gray-200 ${alignClass}`}>
                                {content}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
