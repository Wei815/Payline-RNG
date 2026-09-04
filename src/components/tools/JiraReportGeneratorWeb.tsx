import React, { useState } from 'react';
import { FileSpreadsheet, X, Copy, Upload, ExternalLink, Download } from 'lucide-react';
import { useMachineStore } from '../../store/useMachineStore';
import type { JiraIssueDetail } from '../../store/useMachineStore';
import Papa from 'papaparse';

interface JiraReportGeneratorWebProps {
  onClose: () => void;
}

const orderedProjects = [
  'RSG.Web.Slot.Common\n(電子共用)',
  'RSG.Web.Fish.Common\n(魚機共用)',
  'RSG.Web.EventIssues\n(活動)',
  'RSG.Web.Slot.FortuneThai\n(泰有錢)',
  'RSG.Web.Slot.MagicGem\n(魔法石)',
  'RSG.Web.Slot.Royal777\n(皇家777)',
  'RSG.Web.Slot.LoveCity\n(慾望城市)',
  'RSG.Web.Slot.GoldChicken\n(金鷄報喜)',
  'RSG.Web.Slot.Pharaoh\n(法老王)',
  'RSG.Web.Slot.Alibaba\n(阿里巴巴)',
  'RSG.Web.Slot.LuckyFruits\n(幸運水果)',
  'RSG.Web.Slot.Jungle\n(動物叢林)',
  'RSG.Web.Slot.CaptainHook\n(虎克船長)',
  'RSG.Web.Slot.HUCA\n(野蠻遊戲)',
  'RSG.Web.Slot.SweetCandy\n(甜蜜糖果)',
  'RSG.Web.Slot.FireSpin\n(烈焰轉輪)',
  'RSG.Web.Slot.Popeye\n(大力水手)',
  'RSG.Web.Slot.CrazyDoctor\n(瘋狂博士)',
  'RSG.Web.Slot.Nonstop\n(永不停止)',
  'RSG.Web.Slot.5Dragons\n(五龍爭霸)',
  'RSG.Web.Slot.72Changes\n(七十二變)',
  'RSG.Web.Slot.Mermaid\n(人魚傳說)',
  'RSG.Web.Slot.Buffalo\n(荒野水牛)',
  'RSG.Web.Slot.WildPanda\n(竹林熊貓)',
  'RSG.Web.Slot.LuckyThailand\n(泰好運)',
  'RSG.Web.Slot.GodofWealth\n(財神到)',
  'RSG.Web.Slot.LuckyDragon\n(行運一條龍)',
  'RSG.Web.Slot.HUSA\n(HUSA)',
  'RSG.Web.Slot.DragonKing\n(龍王)',
  'RSG.Web.Slot.TikiParty\n(提金派對)',
  'RSG.Web.Slot.GoblinMiner\n(礦工哥布林)',
  'RSG.Web.Slot.LuckyBar\n(幸運拉霸)',
  'RSG.Web.Slot.Africa\n(非洲)',
  'RSG.Web.Slot.WizardStore\n(巫師商店)',
  'RSG.Web.Slot.MrDoggy\n(家犬先生)',
  'RSG.Web.Slot.DiscoNight\n(迪斯可之夜)',
  'RSG.Web.Slot.HorrorNights\n(農場夜驚魂)',
  'RSG.Web.Slot.ChinaEmpress\n(武媚娘)',
  'RSG.Web.Slot.FuWaFaFa\n(福娃發發)',
  'RSG.Web.Slot.Tarzan\n(泰山)',
  'RSG.Web.Slot.Jalapeno\n(墨西哥辣椒)',
  'RSG.Web.Slot.PiggyPunch\n(金豬爆吉)',
  'RSG.Web.Slot.SevensHigh\n(七起來)',
  'RSG.Web.Slot.Kunoichi\n(女忍者)',
  'RSG.Web.Slot.Ninja\n(忍者)',
  'RSG.Web.Slot.Jelly27\n(果凍27)',
  'RSG.Web.Slot.AngryBear\n(暴怒棕熊)',
  'RSG.Web.Slot.Poseidon\n(海神)',
  'RSG.Web.Slot.DancingLion\n(跳跳獅)',
  'RSG.Web.Slot.Medusa\n(美杜莎)',
  'RSG.Web.Slot.Medea\n(美狄亞)',
  'RSG.Web.Slot.NeonCircle\n(霓虹圓)',
  'RSG.Web.Slot.GetHigh\n(嗨起來)',
  'RSG.Web.Slot.Cowboy\n(西部牛仔)',
  'RSG.Web.Slot.TheLittleMatchGirl\n(賣火柴的小女孩)',
  'RSG.Web.Slot.MysteryPanda\n(秘林熊貓)',
  'RSG.Web.Slot.HipHopMonkey\n(嘻哈金剛)',
  'RSG.Web.Slot.BookofGold\n(黃金之書)',
  'RSG.Web.Slot.TaiChi\n(太極)',
  'RSG.Web.Slot.GoldenLeafClover\n(金色幸運草)',
  'RSG.Web.Slot.WizardStoreGold\n(巫師商店黃金版)',
  'RSG.Web.Slot.RatsMoney\n(鼠來寶)',
  'RSG.Web.Slot.Songkran\n(潑水節)',
  'RSG.Web.Slot.ElfArcher\n(精靈射手)',
  'RSG.Web.Slot.Luchadors\n(黃金摔角手)',
  'RSG.Web.Slot.BearKingdom\n(小熊王國)',
  'RSG.Web.Slot.Royal7777\n(皇家7777)',
  'RSG.Web.Slot.DragonKing2\n(龍王2)',
  'RSG.Web.Slot.PharaohII\n(法老王 II)',
  'RSG.Web.Slot.DragonFight\n(龍行天下)',
  'RSG.Web.Slot.Roma\n(羅馬競技場)',
  'RSG.Web.Slot.HappyFarm\n(開心農場)',
  'RSG.Web.Slot.PowerOfThor\n(雷神之錘)',
  'RSG.Web.Slot.ChinShiHuang\n(秦皇傳說)',
  'RSG.Web.Slot.CaishenWins\n(聚寶財神)',
  'RSG.Web.Slot.FortuneOfAztecs\n(勇闖黃金城)',
  'RSG.Web.Slot.MahjongWays\n(麻將發了)',
  'RSG.Web.Slot.DragonLegend\n(魔龍傳奇)',
  'RSG.Web.Slot.CaishenComing\n(有請財神)',
  'RSG.Web.Slot.LegendOfLuBu\n(戰神呂布)',
  'RSG.Web.Slot.LuckyDog\n(狗來富)',
  'RSG.Web.Slot.JurassicTreasure\n(侏羅紀寶藏)',
  'RSG.Web.Slot.FortuneGems4\n(迦羅寶石4)',
  'RSG.Web.Slot.NightMarket3\n(逛夜市3)',
  'RSG.Web.Slot.ChineseNewYear3\n(大過年3)',
  'RSG.Web.Slot.SuperAce2\n(超級王牌2)',
  'RSG.Web.Slot.Power of Thor Thunder Storm\n(雷神之錘2)',
  'RSG.Web.Slot.BountyHunter\n(賞金獵人)',
  'RSG.Web.Slot.RoyalGanesha\n(皇家金象)',
  'RSG.Web.Cascading.EnergyCombo\n(能量外星人)',
  'RSG.Web.Slot.Racing Master\n(極速巔峰)',
  'RSG.Web.Slot.Tsar Showdown\n(沙皇對決)',
  'RSG.Web.Slot.Trumpo\n(Trumpo)',
  'RSG.Web.Slot.ModernWar\n(現代戰爭)',
  'RSG.Web.Slot.Atlantis\n(亞特蘭提斯)',
  'RSG.Web.Slot.ColorCircle\n(ColorCircle)',
  'RSG.Web.Slot.NinjaBoy\n(NinjaBoy)',
  'RSG.Web.Slot.GodOfWarsThorVsSeth\n(諸神之戰：雷神VS戰神)',
  'RSG.Web.Slot.TheLuxe\n(奢華)',
  'RSG.Web.Slot.BattleOfSet2Awakening\n(決戰賽特2：全面覺醒)',
  'RSG.Web.Slot.DeluxeStorm\n(黑金風暴)',
  'RSG.Web.Slot.StormOfSeth2Awakening\n(戰神賽特2：覺醒之力)',
  'RSG.Web.Fish.OceanEmperor\n(八爪天下海霸王)',
  'RSG.Web.Fish.FuwaFishing\n(福娃捕魚)',
  'RSG.Web.Poker.Crown5PK\n(皇冠5PK)',
];

const projectKeyMap: Record<string, string> = {
  'SC': 'RSG.Web.Slot.Common\n(電子共用)',
  'RSGFC': 'RSG.Web.Fish.Common\n(魚機共用)',
  'EV': 'RSG.Web.EventIssues\n(活動)',
  'FOR': 'RSG.Web.Slot.FortuneThai\n(泰有錢)',
  'MAG': 'RSG.Web.Slot.MagicGem\n(魔法石)',
  'RL': 'RSG.Web.Slot.Royal7777\n(皇家7777)',
  'ROYAL': 'RSG.Web.Slot.Royal777\n(皇家777)',
  'LOV': 'RSG.Web.Slot.LoveCity\n(慾望城市)',
  'GOL': 'RSG.Web.Slot.GoldChicken\n(金鷄報喜)',
  'PHAR': 'RSG.Web.Slot.Pharaoh\n(法老王)',
  'AL': 'RSG.Web.Slot.Alibaba\n(阿里巴巴)',
  'LCKFRTS': 'RSG.Web.Slot.LuckyDragon\n(行運一條龍)',
  'JUN': 'RSG.Web.Slot.Jungle\n(動物叢林)',
  'CAP': 'RSG.Web.Slot.CaptainHook\n(虎克船長)',
  'HUCA': 'RSG.Web.Slot.HUCA\n(野蠻遊戲)',
  'SWEET': 'RSG.Web.Slot.SweetCandy\n(甜蜜糖果)',
  'FIR': 'RSG.Web.Slot.FireSpin\n(烈焰轉輪)',
  'POP': 'RSG.Web.Slot.Popeye\n(大力水手)',
  'CRAZ': 'RSG.Web.Slot.CrazyDoctor\n(瘋狂博士)',
  'NON': 'RSG.Web.Slot.Nonstop\n(永不停止)',
  'KBWE': 'RSG.Web.Slot.5Dragons\n(五龍爭霸)',
  'TWCH': 'RSG.Web.Slot.72Changes\n(七十二變)',
  'MER': 'RSG.Web.Slot.Mermaid\n(人魚傳說)',
  'BUF': 'RSG.Web.Slot.Buffalo\n(荒野水牛)',
  'WIL': 'RSG.Web.Slot.WildPanda\n(竹林熊貓)',
  'LUC': 'RSG.Web.Slot.LuckyThailand\n(泰好運)',
  'GOD': 'RSG.Web.Slot.GodofWealth\n(財神到)',
  'HUSA': 'RSG.Web.Slot.HUSA\n(HUSA)',
  'DRAG': 'RSG.Web.Slot.DragonKing\n(龍王)',
  'TIK': 'RSG.Web.Slot.TikiParty\n(提金派對)',
  'GOB': 'RSG.Web.Slot.GoblinMiner\n(礦工哥布林)',
  'LCKBR': 'RSG.Web.Slot.LuckyBar\n(幸運拉霸)',
  'AF': 'RSG.Web.Slot.Africa\n(非洲)',
  'WIZ': 'RSG.Web.Slot.WizardStore\n(巫師商店)',
  'MRDOG': 'RSG.Web.Slot.MrDoggy\n(家犬先生)',
  'DIS': 'RSG.Web.Slot.DiscoNight\n(迪斯可之夜)',
  'HOR': 'RSG.Web.Slot.HorrorNights\n(農場夜驚魂)',
  'CHIN': 'RSG.Web.Slot.ChinaEmpress\n(武媚娘)',
  'FUW': 'RSG.Web.Slot.FuWaFaFa\n(福娃發發)',
  'TAR': 'RSG.Web.Slot.Tarzan\n(泰山)',
  'JAL': 'RSG.Web.Slot.Jalapeno\n(墨西哥辣椒)',
  'PIG': 'RSG.Web.Slot.PiggyPunch\n(金豬爆吉)',
  'SEV': 'RSG.Web.Slot.SevensHigh\n(七起來)',
  'KUN': 'RSG.Web.Slot.Kunoichi\n(女忍者)',
  'NIN': 'RSG.Web.Slot.Ninja\n(忍者)',
  'JEL': 'RSG.Web.Slot.Jelly27\n(果凍27)',
  'AN': 'RSG.Web.Slot.AngryBear\n(暴怒棕熊)',
  'POS': 'RSG.Web.Slot.Poseidon\n(海神)',
  'DAN': 'RSG.Web.Slot.DancingLion\n(跳跳獅)',
  'MED': 'RSG.Web.Slot.Medusa\n(美杜莎)',
  'MD': 'RSG.Web.Slot.Medea\n(美狄亞)',
  'NEON': 'RSG.Web.Slot.NeonCircle\n(霓虹圓)',
  'GET': 'RSG.Web.Slot.GetHigh\n(嗨起來)',
  'COW': 'RSG.Web.Slot.Cowboy\n(西部牛仔)',
  'THEL': 'RSG.Web.Slot.TheLittleMatchGirl\n(賣火柴的小女孩)',
  'MYS': 'RSG.Web.Slot.MysteryPanda\n(秘林熊貓)',
  'HIP': 'RSG.Web.Slot.HipHopMonkey\n(嘻哈金剛)',
  'BOOK': 'RSG.Web.Slot.BookofGold\n(黃金之書)',
  'TAIC': 'RSG.Web.Slot.TaiChi\n(太極)',
  'GL': 'RSG.Web.Slot.GoldenLeafClover\n(金色幸運草)',
  'WZ': 'RSG.Web.Slot.WizardStoreGold\n(巫師商店黃金版)',
  'RAT': 'RSG.Web.Slot.RatsMoney\n(鼠來寶)',
  'SON': 'RSG.Web.Slot.Songkran\n(潑水節)',
  'EL': 'RSG.Web.Slot.ElfArcher\n(精靈射手)',
  'LCHDRS': 'RSG.Web.Slot.Luchadors\n(黃金摔角手)',
  'BEAR': 'RSG.Web.Slot.BearKingdom\n(小熊王國)',
  'DRG2': 'RSG.Web.Slot.DragonKing2\n(龍王2)',
  'PHR': 'RSG.Web.Slot.PharaohII\n(法老王 II)',
  'DRGNFGHT': 'RSG.Web.Slot.DragonFight\n(龍行天下)',
  'ROMA': 'RSG.Web.Slot.Roma\n(羅馬競技場)',
  'HAP': 'RSG.Web.Slot.HappyFarm\n(開心農場)',
  'POW': 'RSG.Web.Slot.PowerOfThor\n(雷神之錘)',
  'CHN': 'RSG.Web.Slot.ChinShiHuang\n(秦皇傳說)',
  'CAIS': 'RSG.Web.Slot.CaishenWins\n(聚寶財神)',
  'FRTNFZTCS': 'RSG.Web.Slot.FortuneOfAztecs\n(勇闖黃金城)',
  'MAH': 'RSG.Web.Slot.MahjongWays\n(麻將發了)',
  'MH': 'RSG.Web.Slot.MahjongWays2\n(麻將發了)',
  'DRGNLGND': 'RSG.Web.Slot.DragonLegend\n(魔龍傳奇)',
  'CSHNCMNG': 'RSG.Web.Slot.CaishenComing\n(有請財神)',
  'LEG': 'RSG.Web.Slot.LegendOfLuBu\n(戰神呂布)',
  'LCKDG': 'RSG.Web.Slot.LuckyDog\n(狗來富)',
  'RSGJT': 'RSG.Web.Slot.JurassicTreasure\n(侏羅紀寶藏)',
  'RWSF': 'RSG.Web.Slot.FortuneGems4\n(迦羅寶石4)',
  'RWSN': 'RSG.Web.Slot.NightMarket3\n(逛夜市3)',
  'RWSC': 'RSG.Web.Slot.ChineseNewYear3\n(大過年3)',
  'RWSS': 'RSG.Web.Slot.SuperAce2\n(超級王牌2)',
  'RSGPOW2': 'RSG.Web.Slot.Power of Thor Thunder Storm\n(雷神之錘2)',
  'RSGBH': 'RSG.Web.Slot.BountyHunter\n(賞金獵人)',
  'RSGRG': 'RSG.Web.Slot.RoyalGanesha\n(皇家金象)',
  'EN': 'RSG.Web.Cascading.EnergyCombo\n(能量外星人)',
  'RSGRM': 'RSG.Web.Slot.Racing Master\n(極速巔峰)',
  'RSGTS': 'RSG.Web.Slot.Tsar Showdown\n(沙皇對決)',
  'TRUM': 'RSG.Web.Slot.Trumpo\n(Trumpo)',
  'MOD': 'RSG.Web.Slot.ModernWar\n(現代戰爭)',
  'AT': 'RSG.Web.Slot.Atlantis\n(亞特蘭提斯)',
  'COL': 'RSG.Web.Slot.ColorCircle\n(ColorCircle)',
  'NN': 'RSG.Web.Slot.NinjaBoy\n(NinjaBoy)',
  'RSGGOW': 'RSG.Web.Slot.GodOfWarsThorVsSeth\n(諸神之戰：雷神VS戰神)',
  'RSGLUXE': 'RSG.Web.Slot.TheLuxe\n(奢華)',
  'RSGBOS2': 'RSG.Web.Slot.BattleOfSet2Awakening\n(決戰賽特2：全面覺醒)',
  'RSGDS': 'RSG.Web.Slot.DeluxeStorm\n(黑金風暴)',
  'RSGSOS2A': 'RSG.Web.Slot.StormOfSeth2Awakening\n(戰神賽特2：覺醒之力)',
  'OC': 'RSG.Web.Fish.OceanEmperor\n(八爪天下海霸王)',
  'FW': 'RSG.Web.Fish.FuwaFishing\n(福娃捕魚)',
  'RWPC': 'RSG.Web.Poker.Crown5PK\n(皇冠5PK)',
  'RWSR': 'RSG.Web.Slot.RichMahjong2\n(麻將發了2)',
};

const statusMap: Record<string, string> = {
  '未解決問題': '未解決',
  '重啟問題': '未解決',
  '處理中': '未解決',
  '待辦': '待辦',
  '觀察中': '觀察中',
  '已解決': '後續安排進測(已解決)'
};

const COLUMNS = ['專案', '未解決', '待辦', '待優化', '觀察中', '後續安排進測(已解決)'];

export const JiraReportGeneratorWeb: React.FC<JiraReportGeneratorWebProps> = ({ onClose }) => {
  const { jiraReportWebData = [], jiraReportWebFileName, setJiraReportWebData, setJiraReportWebFileName, jiraIssuesWebByProject, setJiraIssuesWebByProject } = useMachineStore();
  const [copySuccess, setCopySuccess] = useState(false);
  const [hideEmpty, setHideEmpty] = useState(true);
  
  const displayData = hideEmpty 
    ? (jiraReportWebData || []).filter(row => row.some((cell, idx) => idx > 0 && cell && cell.trim() !== '')) 
    : (jiraReportWebData || []);
  const [errorMsg, setErrorMsg] = useState('');
  
  // MR form states
  const [showMrModal, setShowMrModal] = useState(false);
  const [mrSelectedProjects, setMrSelectedProjects] = useState<string[]>([]);
  const [mrCopySuccess, setMrCopySuccess] = useState(false);
  
  // Project Details Modal states
  const [selectedProjectDetails, setSelectedProjectDetails] = useState<string | null>(null);
  const [reporterFilter, setReporterFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const handleExportExcel = async () => {
    try {
      const xlsx = await import('xlsx');
      
      const projectsToRender = selectedProjectDetails === 'ALL' 
        ? Object.keys(jiraIssuesWebByProject || {})
        : [selectedProjectDetails];
      
      const rows: any[][] = [
        ['專案', '單號', '狀態', '標題', '回報者', '受託人']
      ];
      const merges: any[] = [];
      
      let currentRow = 1;

      projectsToRender.forEach(proj => {
        if (!proj) return;
        const pIssues = jiraIssuesWebByProject?.[proj] || [];
        const filteredPIssues = pIssues.filter(issue => 
          (reporterFilter === 'All' || issue.reporter === reporterFilter) &&
          (assigneeFilter === 'All' || issue.assignee === assigneeFilter) &&
          (statusFilter === 'All' || issue.status === statusFilter)
        );

        if (filteredPIssues.length === 0) return;

        const startRow = currentRow;
        filteredPIssues.forEach((issue) => {
          rows.push([
            proj,
            issue.issueKey,
            issue.status,
            issue.summary || '',
            issue.reporter || '未知',
            issue.assignee || '未指派'
          ]);
          currentRow++;
        });

        if (currentRow - startRow > 1) {
          merges.push({ s: { r: startRow, c: 0 }, e: { r: currentRow - 1, c: 0 } });
        }
      });

      if (rows.length === 1) {
        alert('沒有資料可供匯出');
        return;
      }

      const ws = xlsx.utils.aoa_to_sheet(rows);
      if (merges.length > 0) {
        ws['!merges'] = merges;
      }

      for (let r = 1; r < rows.length; r++) {
        const issueKey = rows[r][1];
        const cellAddress = xlsx.utils.encode_cell({ r, c: 1 });
        if (ws[cellAddress]) {
          ws[cellAddress].l = { Target: `https://auforce.atlassian.net/browse/${issueKey}` };
        }
      }
      
      ws['!cols'] = [
        { wch: 30 },
        { wch: 15 },
        { wch: 15 },
        { wch: 60 },
        { wch: 15 },
        { wch: 15 },
      ];

      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Jira Report");
      
      const fileName = selectedProjectDetails === 'ALL' 
        ? 'Jira_All_Projects_Report.xlsx'
        : `Jira_${selectedProjectDetails?.split('\n')[0]}_Report.xlsx`;
        
      xlsx.writeFile(wb, fileName);
    } catch (err) {
      console.error('Export failed:', err);
      alert('匯出 Excel 失敗，請重試');
    }
  };

  const handleConvert = (csvText: string) => {
    setCopySuccess(false);
    setErrorMsg('');
    if (!csvText.trim()) {
      setJiraReportWebData([]);
      setJiraIssuesWebByProject(null);
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
      h.toLowerCase().includes('issue key') || h.includes('問題金鑰') || h.includes('問題關鍵字') || h.includes('議題鍵值') || h.includes('議題索引鍵')
    );
    const statusIndex = headers.findIndex(h => 
      h.toLowerCase().includes('status') || h.includes('狀態')
    );
    
    const summaryIndex = headers.findIndex(h => h.toLowerCase().includes('summary') || h.includes('摘要'));
    const assigneeIndex = headers.findIndex(h => h.toLowerCase().includes('assignee') || h.includes('經辦人') || h.includes('受託人'));
    const reporterIndex = headers.findIndex(h => h.toLowerCase().includes('reporter') || h.includes('報告者') || h.includes('回報者'));
    
    if (issueKeyIndex === -1 || statusIndex === -1) {
      setErrorMsg(`找不到必要欄位 (Issue key: ${issueKeyIndex !== -1 ? '有' : '無'}, Status: ${statusIndex !== -1 ? '有' : '無'})，請確認匯出的 CSV 是否包含這兩個欄位。`);
      return;
    }
    
    const dataLines = parsedLines.slice(1).filter(arr => arr.length > Math.max(issueKeyIndex, statusIndex));
    
    const group: Record<string, Record<string, string[]>> = {};
    const issuesByProj: Record<string, JiraIssueDetail[]> = {};
    
    dataLines.forEach(row => {
      const issueKey = row[issueKeyIndex].trim();
      const rawStatus = row[statusIndex].trim();
      if (!issueKey || !rawStatus) return;
      
      const mappedStatus = statusMap[rawStatus];
      if (!mappedStatus) return;
      
      const pKey = issueKey.split('-')[0];
      const projectName = projectKeyMap[pKey] || `未分類 (${pKey})`;
      
      if (!group[projectName]) group[projectName] = {};
      if (!group[projectName][mappedStatus]) group[projectName][mappedStatus] = [];
      
      group[projectName][mappedStatus].push(issueKey);

      if (!issuesByProj[projectName]) issuesByProj[projectName] = [];
      issuesByProj[projectName].push({
        issueKey,
        status: mappedStatus,
        summary: summaryIndex !== -1 ? row[summaryIndex] : '',
        assignee: assigneeIndex !== -1 ? row[assigneeIndex] : '',
        reporter: reporterIndex !== -1 ? row[reporterIndex] : '',
        projectName,
      });
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

    // Sort detailed issues by status (matching COLUMNS order) and then by issue key
    Object.keys(issuesByProj).forEach(proj => {
      issuesByProj[proj].sort((a, b) => {
        const statusOrder = COLUMNS.slice(1);
        const idxA = statusOrder.indexOf(a.status);
        const idxB = statusOrder.indexOf(b.status);
        
        if (idxA !== idxB) {
          return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
        }
        
        const numA = parseInt(a.issueKey.split('-')[1]) || 0;
        const numB = parseInt(b.issueKey.split('-')[1]) || 0;
        return numA - numB;
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
    
    setJiraReportWebData(finalRows);
    
    // Sort the detailed issues for the modal view from smallest to largest number
    Object.keys(issuesByProj).forEach(proj => {
      issuesByProj[proj].sort((a, b) => {
        const numA = parseInt(a.issueKey.split('-')[1]) || 0;
        const numB = parseInt(b.issueKey.split('-')[1]) || 0;
        return numA - numB;
      });
    });
    
    setJiraIssuesWebByProject(issuesByProj);
  };

  const generateTableHtml = () => {
    if (!displayData || !displayData.length) return '';
    let html = '<table style="border-collapse: collapse; font-family: sans-serif; width: 100%;">';
    // Header
    html += '<tr>';
    COLUMNS.forEach(col => {
      html += `<th align="center" valign="middle" style="border: 1px solid #000000; font-size: 15pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 6px; white-space: nowrap;"><b>${col}</b></th>`;
    });
    html += '</tr>';
    // Rows
    displayData.forEach(row => {
      html += '<tr>';
      row.forEach((cell, idx) => {
        let cellContent = cell.replace(/\n/g, '<br/>');
        if (idx !== 0) {
          // Replace Jira ticket IDs with hyperlinks (support alphanumeric project keys like RSGCCNY3)
          cellContent = cellContent.replace(/([A-Z][A-Z0-9]+-\d+)/g, '<a href="https://auforce.atlassian.net/browse/$1" target="_blank" style="color: #1155cc; text-decoration: underline;">$1</a>');
        }
        
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
    
    setJiraReportWebFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) handleConvert(text);
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input so same file can be uploaded again if needed
  };

  const handleCopy = async () => {
    if (!jiraReportWebData || !jiraReportWebData.length) return;
    const html = generateTableHtml();
    
    // Fallback TSV string
    const safeData = displayData || [];
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
    if (!jiraReportWebData) return '';
    return mrSelectedProjects.map(proj => {
      const row = jiraReportWebData.find(r => r[0] === proj);
      if (!row) return '';
      let text = `${proj}\n`;
      let hasData = false;
      for (let i = 1; i < COLUMNS.length; i++) {
        if (row[i]) {
          text += `${COLUMNS[i]}\n${row[i]}\n`;
          hasData = true;
        }
      }
      if (!hasData) {
        text += '無\n';
      }
      return text.trim();
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
            <h2 className="text-lg font-bold text-white">Jira CSV 報表轉換器(WEB)</h2>
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
            <span className={`text-sm font-bold ${jiraReportWebFileName ? 'text-green-300' : 'text-gray-400'} ml-2`}>
              {jiraReportWebFileName ? `已上傳檔案: ${jiraReportWebFileName}` : '尚未上傳任何檔案'}
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
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} className="w-4 h-4 rounded bg-[#0a192f] border-gray-600 text-blue-500" />
                  <span className="text-sm font-bold">隱藏無資料專案</span>
                </label>
<button
                  onClick={() => {
                    setSelectedProjectDetails('ALL');
                    setReporterFilter('All');
                    setAssigneeFilter('All');
                    setStatusFilter('All');
                  }}
                  disabled={!displayData || displayData.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg"
                >
                  👁️ 查看所有專案細項
                </button>
                <button
                  onClick={() => {
                    setMrSelectedProjects([]);
                    setShowMrModal(true);
                  }}
                  disabled={!displayData || displayData.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg"
                >
                  📝 產生 MR 表單
                </button>
                <button
                  onClick={handleCopy}
                  disabled={!displayData || displayData.length === 0}
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
            <div className={`w-full flex-1 min-h-[400px] border rounded-lg overflow-auto ${displayData && displayData.length > 0 ? 'bg-white border-gray-700 p-1' : 'bg-[#0a192f]/50 border-gray-700 border-dashed flex flex-col items-center justify-center p-8'}`}>
              {displayData && displayData.length > 0 ? (
                <table className="w-full text-black border-collapse border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      {COLUMNS.map(col => (
                        <th key={col} className="border border-gray-300 p-2 whitespace-nowrap" style={{ fontSize: '15px', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/50">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="border border-gray-300 p-1" style={
                            cIdx === 0 
                              ? { fontSize: '15px', fontWeight: 'bold', textAlign: 'left', verticalAlign: 'middle' }
                              : { fontSize: '10px', textAlign: 'left', verticalAlign: 'middle' }
                          }>
                            {cell.split('\n').map((line, i) => (
                              <React.Fragment key={i}>
                                {cIdx === 0 ? (
                                  <span 
                                    className="cursor-pointer text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                                    onClick={() => {
                                      setSelectedProjectDetails(cell);
                                      setReporterFilter('All');
                                      setAssigneeFilter('All');
                                      setStatusFilter('All');
                                    }}
                                  >
                                    {line}
                                  </span>
                                ) : line.split(/([A-Z][A-Z0-9]+-\d+)/g).map((part, pIdx) => {
                                  if (/^[A-Z][A-Z0-9]+-\d+$/.test(part)) {
                                    return (
                                      <a 
                                        key={pIdx} 
                                        href={`https://auforce.atlassian.net/browse/${part}`} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="text-blue-600 hover:text-blue-800 hover:underline"
                                      >
                                        {part}
                                      </a>
                                    );
                                  }
                                  return part;
                                })}
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
                    <button className="text-xs bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 px-2 py-1 rounded transition-colors" onClick={() => setMrSelectedProjects((jiraReportWebData || []).map(r => r[0]))}>全選</button>
                    <button className="text-xs bg-gray-500/20 hover:bg-gray-500/40 text-gray-300 px-2 py-1 rounded transition-colors" onClick={() => setMrSelectedProjects([])}>全不選</button>
                  </div>
                </div>
                <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-2 min-h-0">
                  {(jiraReportWebData || []).map(row => (
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
                    const row = jiraReportWebData?.find(r => r[0] === proj);
                    if (!row) return null;
                    let hasData = false;
                    const items = [];
                    for (let i = 1; i < COLUMNS.length; i++) {
                      if (row[i]) {
                        hasData = true;
                        let colorClass = 'text-blue-400';
                        if (COLUMNS[i] === '未解決') colorClass = 'text-red-400';
                        else if (COLUMNS[i] === '待辦') colorClass = 'text-orange-400';
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
                    return (
                      <div key={proj} className="mb-6 last:mb-0">
                        <div className="text-purple-300 font-bold mb-1">
                          {proj.split('\n').map((line, idx) => <div key={idx}>{line}</div>)}
                        </div>
                        {hasData ? items : (
                          <div className="text-gray-400 whitespace-pre-wrap leading-relaxed mt-1">無</div>
                        )}
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

      {/* Project Details Modal */}
      {selectedProjectDetails && (() => {
        let projectIssues: any[] = [];
        let modalTitle = '';
        if (selectedProjectDetails === 'ALL') {
          modalTitle = '所有專案議題狀態';
          projectIssues = Object.values(jiraIssuesWebByProject || {}).flat();
          projectIssues.sort((a, b) => {
            const numA = parseInt(a.issueKey.split('-')[1]) || 0;
            const numB = parseInt(b.issueKey.split('-')[1]) || 0;
            return numA - numB;
          });
        } else {
          modalTitle = `專案議題狀態 - ${selectedProjectDetails.split('\n')[0]}`;
          projectIssues = jiraIssuesWebByProject?.[selectedProjectDetails] || [];
        }

        const uniqueReporters = Array.from(new Set(projectIssues.map(issue => issue.reporter))).filter(name => name && name !== '未知');
        const uniqueAssignees = Array.from(new Set(projectIssues.map(issue => issue.assignee))).filter(name => name && name !== '未指派');
        const uniqueStatuses = Array.from(new Set(projectIssues.map(issue => issue.status))).filter(status => status);

        return (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
          <div className="bg-[#0a192f] w-full max-w-5xl min-h-[600px] rounded-xl shadow-2xl border border-blue-500/50 flex flex-col overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-700/50 bg-[#112240]">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold text-blue-300">
                  {modalTitle}
                </h2>
                <div className="flex items-center gap-2">
                  {uniqueStatuses.length > 0 && (
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-[#0a192f] text-sm text-green-300 border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-green-500"
                    >
                      <option value="All">所有狀態</option>
                      {uniqueStatuses.map(status => (
                        <option key={status as string} value={status as string}>{status as string}</option>
                      ))}
                    </select>
                  )}
                  {uniqueReporters.length > 0 && (
                    <select 
                      value={reporterFilter}
                      onChange={(e) => setReporterFilter(e.target.value)}
                      className="bg-[#0a192f] text-sm text-purple-300 border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-purple-500"
                    >
                      <option value="All">所有回報者</option>
                      {uniqueReporters.map(name => (
                        <option key={name as string} value={name as string}>{name as string}</option>
                      ))}
                    </select>
                  )}
                  {uniqueAssignees.length > 0 && (
                    <select 
                      value={assigneeFilter}
                      onChange={(e) => setAssigneeFilter(e.target.value)}
                      className="bg-[#0a192f] text-sm text-cyan-300 border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="All">所有受託人</option>
                      {uniqueAssignees.map(name => (
                        <option key={name as string} value={name as string}>{name as string}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded transition-colors shadow-lg"
                  title="匯出目前篩選結果為 Excel"
                >
                  <Download size={16} />
                  匯出報表
                </button>
                <button onClick={() => setSelectedProjectDetails(null)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 flex-1 overflow-auto">
              {(() => {
                const projectsToRender = selectedProjectDetails === 'ALL' 
                  ? Object.keys(jiraIssuesWebByProject || {})
                  : [selectedProjectDetails];

                const renderedProjects = projectsToRender.map(proj => {
                  const pIssues = jiraIssuesWebByProject?.[proj] || [];
                  
                  const filteredPIssues = pIssues.filter(issue => 
                    (reporterFilter === 'All' || issue.reporter === reporterFilter) &&
                    (assigneeFilter === 'All' || issue.assignee === assigneeFilter) &&
                    (statusFilter === 'All' || issue.status === statusFilter)
                  );

                  if (filteredPIssues.length === 0) return null;

                  return (
                    <div key={proj} className="flex flex-col gap-6">
                      {selectedProjectDetails === 'ALL' && (
                        <div className="text-2xl font-bold text-indigo-400 border-l-4 border-indigo-500 pl-3">
                          {proj.split('\n')[0]}
                        </div>
                      )}
                      <div className="flex flex-col gap-8">
                        {COLUMNS.slice(1).map(statusColumn => {
                          const issuesInStatus = filteredPIssues.filter(issue => issue.status === statusColumn);
                          if (issuesInStatus.length === 0) return null;
                          
                          let statusColor = 'text-blue-300 border-blue-500/30';
                          if (statusColumn === '未解決') statusColor = 'text-red-400 border-red-500/30';
                          else if (statusColumn === '待辦') statusColor = 'text-orange-400 border-orange-500/30';
                          else if (statusColumn === '待優化') statusColor = 'text-yellow-400 border-yellow-500/30';
                          else if (statusColumn === '觀察中') statusColor = 'text-teal-400 border-teal-500/30';
                          else if (statusColumn.includes('已解決')) statusColor = 'text-green-400 border-green-500/30';

                          return (
                            <div key={statusColumn} className="flex flex-col gap-4">
                              <div className={`text-lg font-bold border-b-2 pb-2 ${statusColor}`}>
                                {statusColumn}
                              </div>
                              <div className="flex flex-col gap-3">
                                {issuesInStatus.map((issue, idx) => (
                                  <div key={idx} className="bg-[#112240] rounded-lg p-3 border border-gray-700 shadow-md flex flex-col sm:flex-row sm:items-center gap-3">
                                    <a 
                                      href={`https://auforce.atlassian.net/browse/${issue.issueKey}`} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="text-blue-400 font-bold hover:underline flex items-center gap-1 text-base shrink-0 w-[140px]"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      <span className="truncate" title={issue.issueKey}>{issue.issueKey}</span>
                                    </a>
                                    <div className="hidden sm:block w-px h-8 bg-gray-700 shrink-0"></div>
                                    <div className="text-white font-medium text-sm leading-relaxed flex-1">
                                      {issue.summary || '無摘要'}
                                    </div>
                                    <div className="hidden sm:block w-px h-8 bg-gray-700 shrink-0"></div>
                                    <div className="flex items-center gap-4 text-xs bg-[#0a192f] p-2 px-4 rounded-lg border border-gray-800 shrink-0">
                                      <div className="flex flex-col gap-1 w-[80px]">
                                        <span className="text-gray-500">回報者</span>
                                        <span className="text-purple-300 font-medium truncate" title={issue.reporter || '未知'}>{issue.reporter || '未知'}</span>
                                      </div>
                                      <div className="w-px h-6 bg-gray-700 shrink-0"></div>
                                      <div className="flex flex-col gap-1 w-[80px]">
                                        <span className="text-gray-500">受託人</span>
                                        <span className="text-cyan-300 font-medium truncate" title={issue.assignee || '未指派'}>{issue.assignee || '未指派'}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }).filter(Boolean);

                if (renderedProjects.length === 0) {
                  return (
                    <div className="text-gray-500 h-full flex items-center justify-center">
                      沒有符合條件的議題資料
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col gap-16">
                    {renderedProjects}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
};
