import React from 'react';
import { ArrowRight, Calculator, FileCheck2, FileSpreadsheet, Link as LinkIcon, Library, Play, Upload, Gem } from 'lucide-react';
import { useMachineStore } from '../store/useMachineStore';
import { ENGINE_MENU, TEMPLATE_MENU, getTraits } from '../games/registry';
import { GameRegistry } from '../core/GameRegistry';
import type { GameFamily } from '../games/base/GameManifest';
import type { GameType } from '../types';

interface WelcomeScreenProps {
  onSelectTemplate: (templateName: string) => void;
}

const FAMILY_LABEL: Record<GameFamily, string> = {
  line: 'Line',
  way: 'Ways',
  payanywhere: 'Pay Anywhere',
  megaway: 'Megaways',
};

/** 卡片上顯示的機制標籤（取自各遊戲 manifest 的 traits） */
function featureTags(id: GameType): string[] {
  const t = getTraits(id);
  const tags: string[] = [];
  if (t.mathIdGenerator) tags.push('MathID 盤面');
  if (GameRegistry.tryGetGame(id)?.hasCascadeFeature?.()) tags.push('消除掉落');
  if (t.goldFramesAndJackpots) tags.push('金框 / Jackpot');
  if (t.wyReels) tags.push('WY 整軸');
  if (t.goldCascadeSearch) tags.push('金框轉 WX');
  if (t.doublingTumbleMultiplier) tags.push('倍數翻倍');
  if (t.multiplierBalls) tags.push('倍數球');
  return tags.slice(0, 3);
}

const TOOLS: { tool: Parameters<ReturnType<typeof useMachineStore.getState>['setActiveModalTool']>[0]; name: string; desc: string; icon: React.ReactNode }[] = [
  { tool: 'jiraBugList', name: 'JIRA 出測 Bug list', desc: '整理出測清單並匯出', icon: <FileSpreadsheet size={17} /> },
  { tool: 'jira', name: 'JIRA BUG 備註', desc: '產生附 RNG 的 Bug 備註與連結', icon: <LinkIcon size={17} /> },
  { tool: 'snippet', name: '測試腳本庫', desc: '儲存、搜尋、套用測試腳本', icon: <Library size={17} /> },
  { tool: 'jiraReport', name: 'Jira CSV 報表轉換', desc: 'CSV 轉成可貼上的報表', icon: <FileSpreadsheet size={17} /> },
  { tool: 'rngValidator', name: 'RNG 腳本驗證', desc: '貼上腳本，逐步檢查盤面與贏分', icon: <FileCheck2 size={17} /> },
  { tool: 'rtpCalculator', name: 'RTP 模擬計算機', desc: '大量局數模擬 RTP 與命中率', icon: <Calculator size={17} /> },
];

const SectionTitle: React.FC<{ title: string; hint?: string }> = ({ title, hint }) => (
  <div className="flex items-baseline justify-between gap-3 mb-3">
    <h2 className="text-[13px] font-semibold tracking-wide text-dashboard-text-secondary">{title}</h2>
    {hint && <span className="text-[11px] text-dashboard-text-muted">{hint}</span>}
  </div>
);

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectTemplate }) => {
  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar bg-dashboard-bg text-dashboard-text-primary">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 flex flex-col gap-10">

        {/* Hero */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-dashboard-accent text-dashboard-on-accent flex items-center justify-center shadow-lg shadow-dashboard-accent/25">
              <Gem size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight">RNG PAY</h1>
              <p className="text-sm text-dashboard-text-secondary">老虎機數學模型驗證、QA 測試腳本產生與 RTP 模擬</p>
            </div>
          </div>
          <button
            onClick={() => document.getElementById('welcome-file-upload')?.click()}
            className="h-9 inline-flex items-center gap-2 px-4 rounded-md bg-dashboard-accent text-dashboard-on-accent text-sm font-medium hover:bg-dashboard-accent-strong transition-colors self-start sm:self-auto"
          >
            <Upload size={16} /> 上傳自訂 Excel
          </button>
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
        </div>

        {/* 遊戲範本 */}
        <section>
          <SectionTitle title="遊戲範本" hint="載入 templates/ 內的數學模型" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {TEMPLATE_MENU.map(({ name, id }) => {
              const family = getTraits(id).family;
              return (
                <button
                  key={name}
                  onClick={() => onSelectTemplate(name)}
                  className="group text-left rounded-xl border border-dashboard-border bg-dashboard-card p-4 hover:border-dashboard-accent/60 hover:bg-dashboard-raised transition-colors flex flex-col gap-3 min-h-[7.5rem]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[15px] font-semibold text-dashboard-text-primary">{name}</span>
                    <span className="shrink-0 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-dashboard-border text-dashboard-text-muted">
                      {FAMILY_LABEL[family]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-auto">
                    {featureTags(id).map(tag => (
                      <span key={tag} className="text-[11px] px-1.5 py-0.5 rounded bg-dashboard-accent/10 text-dashboard-accent">{tag}</span>
                    ))}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[12px] text-dashboard-text-muted group-hover:text-dashboard-accent transition-colors">
                    開啟 <ArrowRight size={13} />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 遊戲基底 */}
        <section>
          <SectionTitle title="遊戲基底" hint="不載入範本，使用通用規則" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {ENGINE_MENU.map(engine => (
              <button
                key={engine.name}
                onClick={() => onSelectTemplate(engine.name)}
                className="group h-14 flex items-center gap-3 px-4 rounded-xl border border-dashboard-border bg-dashboard-card hover:border-dashboard-accent/60 hover:bg-dashboard-raised transition-colors text-left"
              >
                <Play size={16} className="text-dashboard-text-muted group-hover:text-dashboard-accent" />
                <span className="text-sm font-medium">{engine.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 小工具 */}
        <section className="pb-6">
          <SectionTitle title="小工具" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TOOLS.map(t => (
              <button
                key={t.tool}
                onClick={() => useMachineStore.getState().setActiveModalTool(t.tool)}
                className="group flex items-center gap-3 p-4 rounded-xl border border-dashboard-border bg-dashboard-card hover:border-dashboard-accent/60 hover:bg-dashboard-raised transition-colors text-left"
              >
                <span className="w-9 h-9 shrink-0 rounded-lg bg-dashboard-raised border border-dashboard-border flex items-center justify-center text-dashboard-text-secondary group-hover:text-dashboard-accent">
                  {t.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-dashboard-text-primary">{t.name}</span>
                  <span className="block text-[12px] text-dashboard-text-muted truncate">{t.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
