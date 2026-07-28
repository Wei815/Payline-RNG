import React from 'react';
import { Home, Play, FileBox, Calculator, FileCheck2, Menu, Link as LinkIcon, FileSpreadsheet } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { useMachineStore } from '../store/useMachineStore';
import type { GameType } from '../types';

export const Sidebar: React.FC = () => {
  const clearProject = useGameStore(state => state.clearProject);
  const setLoadTemplateTrigger = useMachineStore(state => state.setLoadTemplateTrigger);
  const setGameType = useMachineStore(state => state.setGameType);
  
  const handleSelectTemplate = (templateName: string) => {
    const engineMap: Record<string, GameType> = {
      'Line Game': 'linegame',
      'Way Game': 'waygame',
      'Pay Anywhere': 'payanywhere',
      'Megaway': 'megaway'
    };
    if (engineMap[templateName]) {
      setGameType(engineMap[templateName]);
      setLoadTemplateTrigger('預設泛用');
    } else {
      setLoadTemplateTrigger(templateName);
    }
  };

  const menuSection = (title: string, items: { name: string, icon: React.ReactNode, action?: () => void, disabled?: boolean }[]) => (
    <div className="flex flex-col gap-1 mb-6">
      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-3 mb-2">{title}</div>
      {items.map(item => (
        <button
          key={item.name}
          onClick={item.action}
          disabled={item.disabled}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium w-full text-left
            ${item.disabled ? 'opacity-40 cursor-not-allowed text-gray-500' : 'text-gray-300 hover:bg-[#112240] hover:text-dashboard-accent'}
          `}
        >
          {item.icon}
          <span className="truncate">{item.name}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="w-64 h-full bg-[#0a192f] border-r border-gray-800 flex flex-col shrink-0 hidden md:flex">
      <div className="h-14 flex items-center px-4 shrink-0 border-b border-gray-800">
        <button className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-gray-800">
          <Menu size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
        <button 
          onClick={() => clearProject()}
          className="flex items-center gap-3 px-4 py-2.5 bg-[#112240] text-dashboard-text-primary rounded-full hover:bg-dashboard-accent/10 hover:text-dashboard-accent border border-gray-700/50 hover:border-dashboard-accent transition-all w-full text-left font-bold mb-6 shadow-sm group"
        >
          <Home size={18} className="text-dashboard-accent" />
          <span>新專案 / 首頁</span>
        </button>

        {menuSection('遊戲基底 (Engines)', [
          { name: 'Line Game', icon: <Play size={16} />, action: () => handleSelectTemplate('Line Game') },
          { name: 'Way Game', icon: <Play size={16} />, action: () => handleSelectTemplate('Way Game') },
          { name: 'Pay Anywhere', icon: <Play size={16} />, action: () => handleSelectTemplate('Pay Anywhere') },
          { name: 'Megaway', icon: <Play size={16} />, action: () => handleSelectTemplate('Megaway') },
        ])}

        {menuSection('遊戲範本 (Templates)', [
          { name: '上傳自訂 Excel', icon: <FileBox size={16} />, action: () => document.getElementById('sidebar-file-upload')?.click() },
          { name: '人魚傳說', icon: <FileBox size={16} />, action: () => handleSelectTemplate('人魚傳說') },
          { name: '決戰賽特2', icon: <FileBox size={16} />, action: () => handleSelectTemplate('決戰賽特2') },
          { name: '秦皇傳說', icon: <FileBox size={16} />, action: () => handleSelectTemplate('秦皇傳說') },
          { name: '奢華', icon: <FileBox size={16} />, action: () => handleSelectTemplate('奢華') },
        ])}

        <input 
          type="file" 
          id="sidebar-file-upload" 
          accept=".xlsx,.xls" 
          className="hidden" 
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              useMachineStore.getState().setUploadedTemplateFile(file);
              e.target.value = ''; // Reset
            }
          }}
        />

        {menuSection('小工具 (Tools)', [
          { name: 'JIRA 出測 BUG 備註工具', icon: <LinkIcon size={16} />, action: () => useMachineStore.getState().setActiveModalTool('jira') },
          { name: '測試腳本暫存庫', icon: <FileBox size={16} />, action: () => useMachineStore.getState().setActiveModalTool('snippet') },
          { name: 'Jira CSV 報表轉換器', icon: <FileSpreadsheet size={16} />, action: () => useMachineStore.getState().setActiveModalTool('jiraReport') },
          { name: 'RTP 計算機 (待開發)', icon: <Calculator size={16} />, disabled: true },
          { name: 'RNG 腳本驗證 (待開發)', icon: <FileCheck2 size={16} />, disabled: true },
        ])}
      </div>
    </div>
  );
};
