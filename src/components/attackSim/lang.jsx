import { createContext, useContext, useState } from 'react'

// ---------------------------------------------------------------------------
// Attack Simulator – EN / ZH translation dictionary
// ---------------------------------------------------------------------------

const translations = {
  en: {
    // Page
    pageTitle: 'Attack Simulator',

    // Toolbar
    scenario: 'Scenario',
    savedScenarios: '— Saved scenarios —',
    saveAs: 'Save As…',
    data: 'Data',
    import: 'Import',
    export: 'Export',
    savedAttackerSets: '— Saved attacker sets —',
    savedDefenderSets: '— Saved defender sets —',
    saveSet: 'Save Set…',

    // Sections
    attackerSection: 'Attacker — Weapon Profiles',
    defenderSection: 'Defender — Target Profiles',
    addWeapon: '+ Add Weapon',
    addProfile: '+ Add Profile',

    // Run / precision
    runSim: 'Run Simulation',
    simulating: 'Simulating…',
    highPrecision: 'High precision',
    iterations: (n) => `${n} iterations`,

    // Results
    results: 'Results',
    expectedModelsKilled: 'Expected Models Killed',
    expectedDamageDealt: 'Expected Damage Dealt',
    chanceToWipe: 'Chance to Wipe Unit',
    perProfileBreakdown: 'Per-Profile Breakdown',
    totalModelsKilledDist: 'Total Models Killed — Distribution',
    simulationNote: (n) =>
      `* Estimated using Monte Carlo simulation (${n} iterations)`,

    // Per-profile table headers
    thProfile: 'Profile',
    thModels: 'Models',
    thExpectedKills: 'Expected Kills',
    thWipePercent: 'Wipe %',

    // Profile card actions
    moveUp: 'Move up',
    moveDown: 'Move down',
    duplicate: 'Duplicate',
    remove: 'Remove',

    // Weapon stat labels
    weapons: 'Weapons',
    attacks: 'Attacks',
    bsws: 'BS/WS',
    strength: 'Strength',
    ap: 'AP',
    damage: 'Damage',
    hitReroll: 'Hit Reroll',
    woundReroll: 'Wound Reroll',

    // Weapon buff chips
    lethalHits: 'LETHAL HITS',
    sustainedHits: 'SUSTAINED HITS',
    devastatingWounds: 'DEVASTATING WOUNDS',
    blast: 'BLAST',
    plusOneHit: '+1 HIT',
    plusOneWound: '+1 WOUND',
    ignoresCover: 'IGNORES COVER',
    criticalHit: 'CRITICAL HIT',
    anti: 'ANTI',

    // Target stat labels
    models: 'Models',
    toughness: 'Toughness',
    wounds: 'Wounds',
    sv: 'Sv',
    inv: 'Inv',
    saveReroll: 'Save Reroll',

    // Target buff chips
    fnp: 'FNP',
    fnpMortal: 'FNP vs MORTAL',
    minusOneHit: '−1 HIT',
    minusOneWound: '−1 WOUND',
    minusOneWoundST: '−1 WOUND (S>T)',
    halfDamage: 'HALF DAMAGE',
    damageMinus1: 'DAMAGE −1',
    damageOne: 'DAMAGE = 1',
    benefitOfCover: 'BENEFIT OF COVER',

    // Reroll option labels
    noReroll: 'No Reroll',
    rerollOnes: 'Reroll Ones',
    rerollFails: 'Reroll Fails',
    rerollNonCritical: 'Reroll Non-Critical',
    rerollOne: 'Reroll One',

    // Torrent
    torrent: 'Torrent',
  },

  zh: {
    // Page
    pageTitle: '攻击模拟器',

    // Toolbar
    scenario: '方案',
    savedScenarios: '— 已保存配置 —',
    saveAs: '另存为…',
    data: '数据',
    import: '导入',
    export: '导出',
    savedAttackerSets: '— 已保存攻击方面板 —',
    savedDefenderSets: '— 已保存防御方面板 —',
    saveSet: '保存配置…',

    // Sections
    attackerSection: '攻击方 — 武器面板',
    defenderSection: '防御方 — 目标面板',
    addWeapon: '+ 添加武器',
    addProfile: '+ 添加面板',

    // Run / precision
    runSim: '运行模拟',
    simulating: '模拟中…',
    highPrecision: '高精度',
    iterations: (n) => `${n} 次模拟`,

    // Results
    results: '结果',
    expectedModelsKilled: '预期击杀模型数',
    expectedDamageDealt: '预期造成伤害',
    chanceToWipe: '全歼概率',
    perProfileBreakdown: '逐配置详情',
    totalModelsKilledDist: '总击杀模型数 — 分布',
    simulationNote: (n) =>
      `* 通过蒙特卡洛模拟估算（${n} 次模拟）`,

    // Per-profile table headers
    thProfile: '配置',
    thModels: '模型数',
    thExpectedKills: '预期击杀',
    thWipePercent: '全歼 %',

    // Profile card actions
    moveUp: '上移',
    moveDown: '下移',
    duplicate: '复制',
    remove: '移除',

    // Weapon stat labels
    weapons: '武器数',
    attacks: '攻击次数',
    bsws: '命中',
    strength: '力量',
    ap: '穿甲',
    damage: '伤害',
    hitReroll: '命中重投',
    woundReroll: '造伤重投',

    // Weapon buff chips
    lethalHits: '致命一击',
    sustainedHits: '连击',
    devastatingWounds: '毁灭伤害',
    blast: '爆炸',
    plusOneHit: '+1 命中',
    plusOneWound: '+1 造伤',
    ignoresCover: '无视掩体',
    criticalHit: '命中暴击',
    anti: '反XX',

    // Target stat labels
    models: '模型数',
    toughness: '坚韧',
    wounds: '血量',
    sv: '保护',
    inv: '特保',
    saveReroll: '保护重投',

    // Target buff chips
    fnp: '不怕疼',
    fnpMortal: '对致命伤不怕疼',
    minusOneHit: '−1 命中',
    minusOneWound: '−1 造伤',
    minusOneWoundST: '−1 造伤 (S>T)',
    halfDamage: '伤害减半',
    damageMinus1: '伤害 −1',
    damageOne: '伤害 = 1',
    benefitOfCover: '掩体增益',

    // Reroll option labels
    noReroll: '无重投',
    rerollOnes: '重投1',
    rerollFails: '重投失败',
    rerollNonCritical: '重投非暴击',
    rerollOne: '重投一',

    // Torrent
    torrent: '洪流',

  },
}

// ---------------------------------------------------------------------------
// React Context + hook
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'attackSim_lang'

const LangContext = createContext({ lang: 'en', setLang: () => {}, t: (k) => k })

export function LangProvider({ children }) {
  const [lang, setLangRaw] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored === 'zh' ? 'zh' : 'en'
    } catch {
      return 'en'
    }
  })

  const setLang = (next) => {
    setLangRaw(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* quota exceeded — ignore */
    }
  }

  const t = (key, ...args) => {
    const val = translations[lang]?.[key] ?? translations.en[key] ?? key
    return typeof val === 'function' ? val(...args) : val
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useT() {
  return useContext(LangContext)
}
