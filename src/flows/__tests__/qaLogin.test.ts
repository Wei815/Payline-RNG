import { describe, expect, it } from 'vitest';
import { parseQaLoginSpec, pickOption, planQaLogin } from '../qaLogin';

const SPEC = [
  '測試位置\thttp://qa-royalgameweb-cocos.rsg-games.com/QALogin\t',
  'Server\tSlot-7778(Group2-QA)\t',
  'Port\t80(qa測試專用)        \t',
  '用戶來源\tCocos斷線續玩, Cocos無斷線續玩\t',
  '登入方式\tmobile\t',
  '語系\t全語系\t',
  '幣別\t全幣別',
].join('\n');

const PLATFORMS = ['Cocos單一錢包(有JP)', 'Cocos(無JP)', 'Cocos斷線續玩', 'Cocos無斷線續玩', 'Cocos單一錢包(無JP)'];
const LANGS = ['英', '繁', '簡', '泰'];
const CURRENCIES = ['台灣　　 ( NT )', '香港　　 ( HK )', '泰達幣　( USDT )', '美國　　 ( USA )'];
const HOSTS = ['Slot-7776(Group1-QA)', 'Slot-7778(Group2-QA)', 'Slot-7775(Group2-Prod)'];
const ACCOUNTS = ['QA1', 'QA2', 'QA10', '路人甲'];

describe('QA 快速登入：測試單解析', () => {
  it('讀出測試位置與各欄的值（多選拆開、去掉尾端空白）', () => {
    const spec = parseQaLoginSpec(SPEC);
    expect(spec.url).toBe('http://qa-royalgameweb-cocos.rsg-games.com/QALogin');
    expect(spec.values).toEqual({
      host: ['Slot-7778(Group2-QA)'],
      port: ['80(qa測試專用)'],
      platform: ['Cocos斷線續玩', 'Cocos無斷線續玩'],
      website: ['mobile'],
      lang: ['全語系'],
      currency: ['全幣別'],
    });
  });

  it('沒有 Tab 時以空白分隔，未知欄位略過', () => {
    expect(parseQaLoginSpec('Server Slot-7776(Group1-QA)\n備註 xxx').values).toEqual({ host: ['Slot-7776(Group1-QA)'] });
  });
});

describe('QA 快速登入：選項挑選', () => {
  it('用戶來源多選時優先「無斷線續玩」', () => {
    expect(PLATFORMS[pickOption('platform', PLATFORMS, ['Cocos斷線續玩', 'Cocos無斷線續玩'])]).toBe('Cocos無斷線續玩');
  });

  it('語系「全語系」或多選時優先「繁」', () => {
    expect(LANGS[pickOption('lang', LANGS, ['全語系'])]).toBe('繁');
    expect(LANGS[pickOption('lang', LANGS, ['英', '繁'])]).toBe('繁');
    expect(LANGS[pickOption('lang', LANGS, ['泰'])]).toBe('泰');
  });

  it('幣別「全幣別」或多選時優先台灣（NT），單選則照填', () => {
    expect(CURRENCIES[pickOption('currency', CURRENCIES, ['全幣別'])]).toBe('台灣　　 ( NT )');
    expect(CURRENCIES[pickOption('currency', CURRENCIES, ['美國 (USA)', '台灣 (NT)'])]).toBe('台灣　　 ( NT )');
    expect(CURRENCIES[pickOption('currency', CURRENCIES, ['香港 ( HK )'])]).toBe('香港　　 ( HK )');
  });

  it('沒有優先規則的欄位多選時取第一個；完全相同優先於包含（QA1 不會選到 QA10）', () => {
    expect(HOSTS[pickOption('host', HOSTS, ['Slot-7778(Group2-QA)', 'Slot-7776(Group1-QA)'])]).toBe('Slot-7778(Group2-QA)');
    expect(ACCOUNTS[pickOption('account', ACCOUNTS, ['QA1'])]).toBe('QA1');
  });

  it('找不到對應選項回傳 -1', () => {
    expect(pickOption('host', HOSTS, ['Fish-5488(QA)'])).toBe(-1);
  });
});

describe('QA 快速登入：整頁計畫', () => {
  it('每欄選出索引與文字；對不到的欄位列入 missing', () => {
    const spec = parseQaLoginSpec(SPEC);
    const plan = planQaLogin(
      { host: HOSTS, port: ['80(qa測試專用)'], platform: PLATFORMS, website: ['mobile', 'web'], lang: LANGS, currency: CURRENCIES, account: ACCOUNTS },
      { ...spec.values, account: ['QA10'], website: ['iframe'] },
    );
    expect(plan.choices).toEqual({ host: 1, port: 0, platform: 3, lang: 1, currency: 0, account: 2 });
    expect(plan.applied.platform).toBe('Cocos無斷線續玩');
    expect(plan.missing).toEqual(['website']);
  });
});
