import React from 'react';
import { Play, FileBox, Calculator, FileCheck2, Upload, Link as LinkIcon, FileSpreadsheet } from 'lucide-react';
import { useMachineStore } from '../store/useMachineStore';

interface WelcomeScreenProps {
  onSelectTemplate: (templateName: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectTemplate }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-start pt-20 px-4 md:px-8 bg-[#0a192f] text-dashboard-text-primary overflow-y-auto">
      <div className="max-w-5xl w-full flex flex-col gap-10">
        
        {/* Header */}
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-wider">
            歡迎使用 <span className="text-dashboard-accent">RNG PAY</span>
          </h1>
          <p className="text-[#8892b0] text-sm md:text-base">請選擇要建立或載入的專案，開始您的 RTP 測試與模擬</p>
        </div>

        <div className="flex flex-col gap-12 mt-4">
          
          {/* Section 1: Game Engines */}
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-[#e6f1ff] border-b border-gray-700/50 pb-2">遊戲基底 (Game Engines)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'Line Game', type: 'linegame' },
                { name: 'Way Game', type: 'waygame' },
                { name: 'Pay Anywhere', type: 'payanywhere' },
                { name: 'Megaway', type: 'megaway' },
              ].map((engine) => (
                <div 
                  key={engine.name}
                  onClick={() => onSelectTemplate(engine.name)}
                  className="bg-[#112240] border border-gray-700/50 rounded-xl p-5 flex flex-col items-start gap-4 cursor-pointer hover:border-dashboard-accent hover:-translate-y-1 transition-all duration-200 group shadow-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-[#0a192f] border border-gray-700/50 flex items-center justify-center group-hover:border-dashboard-accent/50 group-hover:text-dashboard-accent transition-colors">
                    <Play size={18} className="text-[#8892b0] group-hover:text-dashboard-accent" />
                  </div>
                  <span className="font-bold text-[#e6f1ff] group-hover:text-dashboard-accent transition-colors">{engine.name}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Section 2: Templates */}
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-[#e6f1ff] border-b border-gray-700/50 pb-2">遊戲範本 (Templates)</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              
              {/* Upload Custom Template Card */}
              <div 
                onClick={() => document.getElementById('welcome-file-upload')?.click()}
                className="bg-[#112240] border border-dashboard-accent/30 rounded-xl p-5 flex flex-col items-start gap-4 cursor-pointer hover:border-dashboard-accent hover:-translate-y-1 transition-all duration-200 group shadow-lg relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-dashboard-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-10 h-10 rounded-full bg-dashboard-accent/10 border border-dashboard-accent/30 flex items-center justify-center group-hover:border-dashboard-accent/50 group-hover:text-dashboard-accent transition-colors relative z-10">
                  <Upload size={18} className="text-dashboard-accent group-hover:scale-110 transition-transform" />
                </div>
                <span className="font-bold text-dashboard-accent relative z-10">上傳自訂 Excel</span>
              </div>

              <input 
                type="file" 
                id="welcome-file-upload" 
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

              {['人魚傳說', '決戰賽特2', '秦皇傳說', '奢華', '皇家金象'].map((template) => (
                <div 
                  key={template}
                  onClick={() => onSelectTemplate(template)}
                  className="bg-[#112240] border border-gray-700/50 rounded-xl p-5 flex flex-col items-start gap-4 cursor-pointer hover:border-dashboard-accent hover:-translate-y-1 transition-all duration-200 group shadow-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-[#0a192f] border border-gray-700/50 flex items-center justify-center group-hover:border-dashboard-accent/50 group-hover:text-dashboard-accent transition-colors">
                    <FileBox size={18} className="text-[#8892b0] group-hover:text-dashboard-accent" />
                  </div>
                  <span className="font-bold text-[#e6f1ff] group-hover:text-dashboard-accent transition-colors">{template}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: Tools */}
          <section className="flex flex-col gap-4 mb-10">
            <h2 className="text-xl font-bold text-[#e6f1ff] border-b border-gray-700/50 pb-2">小工具 (Tools)</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              
              {/* JIRA Tool */}
              <div 
                onClick={() => useMachineStore.getState().setActiveModalTool('jira')}
                className="bg-[#112240] border border-gray-700/50 rounded-xl p-5 flex items-center gap-4 cursor-pointer hover:border-dashboard-accent transition-colors shadow-lg group"
              >
                <div className="w-10 h-10 rounded-full bg-[#0a192f] border border-gray-700/50 flex items-center justify-center text-[#8892b0] group-hover:text-dashboard-accent group-hover:border-dashboard-accent/50 transition-colors">
                  <LinkIcon size={18} />
                </div>
                <span className="font-bold text-[#e6f1ff] group-hover:text-dashboard-accent transition-colors">JIRA 出測 BUG 備註工具</span>
              </div>

              {/* Snippet Tool */}
              <div 
                onClick={() => useMachineStore.getState().setActiveModalTool('snippet')}
                className="bg-[#112240] border border-gray-700/50 rounded-xl p-5 flex items-center gap-4 cursor-pointer hover:border-dashboard-accent transition-colors shadow-lg group"
              >
                <div className="w-10 h-10 rounded-full bg-[#0a192f] border border-gray-700/50 flex items-center justify-center text-[#8892b0] group-hover:text-dashboard-accent group-hover:border-dashboard-accent/50 transition-colors">
                  <FileBox size={18} />
                </div>
                <span className="font-bold text-[#e6f1ff] group-hover:text-dashboard-accent transition-colors">測試腳本暫存庫</span>
              </div>

              {/* Jira Report Generator Tool */}
              <div 
                onClick={() => useMachineStore.getState().setActiveModalTool('jiraReport')}
                className="bg-[#112240] border border-gray-700/50 rounded-xl p-5 flex items-center gap-4 cursor-pointer hover:border-blue-500 transition-colors shadow-lg group"
              >
                <div className="w-10 h-10 rounded-full bg-[#0a192f] border border-gray-700/50 flex items-center justify-center text-[#8892b0] group-hover:text-blue-500 group-hover:border-blue-500/50 transition-colors">
                  <FileSpreadsheet size={18} />
                </div>
                <span className="font-bold text-[#e6f1ff] group-hover:text-blue-500 transition-colors">Jira CSV 報表轉換器</span>
              </div>

              {[
                { name: 'RTP 計算機 (待開發)', icon: <Calculator size={18} /> },
                { name: 'RNG 腳本驗證 (待開發)', icon: <FileCheck2 size={18} /> },
              ].map((tool) => (
                <div 
                  key={tool.name}
                  className="bg-[#112240] border border-gray-700/50 rounded-xl p-5 flex items-center gap-4 opacity-50 cursor-not-allowed shadow-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-[#0a192f] border border-gray-700/50 flex items-center justify-center text-[#8892b0]">
                    {tool.icon}
                  </div>
                  <span className="font-bold text-[#8892b0]">{tool.name}</span>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
