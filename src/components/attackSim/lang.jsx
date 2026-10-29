import { createContext, useContext, useState } from 'react'

// ---------------------------------------------------------------------------
// Attack Simulator – EN / ZH translation dictionary
// ---------------------------------------------------------------------------

const translations = {
  en: {
    // Page
    pageTitle: '40K Attack Simulator',
    editionTooltip: 'Based on Warhammer 40,000 11th Edition rules',
    attackSimulatorSections: 'Attack Simulator sections',
    navSimulator: 'Simulator',
    navProfileLibrary: 'Library',
    navComparison: 'Comparison',

    // Profile libraries
    import: 'Import',
    export: 'Export',
    savedAttackerSets: 'Saved attacker profiles',
    savedDefenderSets: 'Saved defender profiles',
    saveProfile: 'Save Profile',
    profileLibrary: 'Library',
    attackerLibrary: 'Attacker Profiles',
    defenderLibrary: 'Defender Profiles',
    searchProfiles: 'Search profiles…',
    newProfile: 'New Profile',
    saveChanges: 'Save',
    discardChanges: 'Discard',
    renameProfile: 'Rename',
    duplicateProfile: 'Duplicate',
    deleteProfile: 'Delete',
    unsavedChanges: 'Unsaved changes',
    selectProfileToEdit: 'Select a saved Profile to view and edit it.',
    chooseProfileFromList: 'Choose a Profile from the list.',
    noSavedProfiles: 'No saved Profiles yet.',
    comparison: 'Profile Comparison',
    comparisonNeedsProfiles: 'Saved Profiles are required for comparison.',
    comparisonMinimumAttackers: 'Choose at least two attacker Profiles.',
    selectDefender: 'Select Defender Profile',
    attackersToCompare: 'Attackers to Compare',
    selectAttacker: 'Select Attacker Profile',
    attackerNumber: (n) => `Attacker ${n}`,
    addAttacker: '+ Add Attacker',
    removeAttacker: (n) => `Remove attacker ${n}`,
    runComparison: 'Run Comparison',
    comparing: 'Comparing…',
    comparisonResults: 'Comparison Results',
    manageProfiles: 'Manage Profiles',
    expandProfilePreview: 'Show full profile',
    collapseProfilePreview: 'Show less',
    additionalUnitBuffs: 'Additional Unit Buffs',
    clearAdditionalBuffs: 'Clear additions',
    addReroll: 'Add reroll…',
    attackerProfile: 'attacker profile',
    defenderProfile: 'defender profile',
    savedAttackerGroup: 'Saved attacker profiles',
    savedDefenderGroup: 'Saved defender profiles',
    loadAttackerProfile: 'Load saved attacker profile',
    loadDefenderProfile: 'Load saved defender profile',
    saveProfileAs: (type) => `Save ${type} as:`,
    profileExistsConfirm: (name) => `Profile "${name}" already exists. Overwrite?`,
    profileSaved: (type, name) => `Saved ${type} "${name}".`,
    profileLoaded: (type, name) => `Loaded ${type} "${name}".`,
    profileLoadFailed: (type, name) => `Could not load ${type} "${name}".`,
    invalidProfile: (type, detail) => `Invalid ${type}: ${detail}.`,
    nameCannotBeEmpty: 'Name cannot be empty.',
    profileNameLabel: 'Profile name',
    saveProfileAction: 'Save',
    createProfileAction: 'Create',
    overwriteProfile: 'Overwrite',
    cancel: 'Cancel',
    profileSaveFailed: 'Could not save the Profile.',
    profileStorageFull: 'Browser storage is full. Delete some saved Profiles and try again.',
    storageUnavailable: 'Browser storage is unavailable.',
    discardProfileChangesConfirm: 'Discard unsaved Profile changes?',
    deleteProfileConfirm: (name) => `Delete saved Profile "${name}"?`,
    renameProfileFailed: 'Could not rename the Profile.',
    deleteProfileFailed: 'Could not delete the Profile.',
    profileRenamed: (name) => `Renamed to "${name}".`,
    profileDeleted: (name) => `Deleted "${name}".`,
    noProfilesToExport: 'There are no saved Profiles to export.',
    profilesExported: (count) => `Exported ${count} Profiles.`,
    profilesImported: (count, added, updated) =>
      `Imported ${count} Profiles: ${added} added, ${updated} updated.`,
    exportFailed: (reason) => `Export failed: ${reason}.`,
    unknownError: 'unknown error',
    needTargetProfile: 'Add at least one target profile.',

    // Sections
    attackerSection: 'Attacker Profiles',
    defenderSection: 'Defender Profiles',
    addWeapon: '+ Add Weapon',
    addProfile: '+ Add Profile',
    attackerUnit: (n) => `Unit ${n}`,
    expandAttackerUnit: (name) => `Expand ${name}`,
    collapseAttackerUnit: (name) => `Collapse ${name}`,
    addAttackerUnit: '+ Add Unit',
    removeAttackerUnit: (n) => `Remove unit ${n}`,
    savedAttackerUnitGroup: (n) => `Saved profiles for unit ${n}`,
    loadAttackerUnitProfile: (n) => `Load saved profile for unit ${n}`,
    invalidUnitWeaponExpression: (unit, weapon, field, value) =>
      `${unit}: weapon "${weapon}" has invalid ${field} "${value}".`,

    // Unit buffs
    unitBuffsSection: 'Unit Buffs',
    rerollFailedHit: 'REROLL FAILED HIT DICE',
    rerollFailedWound: 'REROLL FAILED WOUND DICE',
    noUnitBuffs: 'No unit buffs.',
    unitUpgradedTag: 'Upgraded by unit buff',
    unitGrantedTag: 'Granted by unit buff',

    // Weapon card popover
    editBuffs: 'Edit buffs…',
    closeBuffs: 'Done',
    buffsDialogTitle: 'Weapon Buffs',
    targetBuffsDialogTitle: 'Target Buffs',
    noWeaponBuffs: 'No buffs configured.',

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

    // Report
    copyReport: 'Copy Report',
    reportCopied: 'Report copied to clipboard.',
    reportCopyFailed: 'Could not copy report to clipboard.',
    reportAttacker: 'Attacker',
    reportDefender: 'Defender',
    reportResults: 'Results',
    reportExpectedKills: 'Expected kills',
    reportExpectedDamage: 'Expected damage',
    reportWipeChance: 'Wipe chance',
    reportIterations: (n) => `Monte Carlo, ${n} iterations`,

    // Per-profile table headers
    thProfile: 'Profile',
    thModels: 'Models',
    thExpectedKills: 'Expected Kills',
    thStdDev: 'Std Dev',
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
    attackReroll: 'Attacks Reroll',
    damageReroll: 'Damage Reroll',

    // Weapon buff chips
    lethalHits: 'LETHAL HITS',
    sustainedHits: 'SUSTAINED HITS',
    devastatingWounds: 'DEVASTATING WOUNDS',
    blast: 'BLAST',
    cleave: 'CLEAVE',
    plusOneAttack: '+1 A',
    plusOneDamage: '+1 D',
    plusOneAp: '+1 AP',
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
    minusOneAp: '−1 AP',

    // Reroll option labels
    noReroll: 'No Reroll',
    rerollOnes: 'Reroll Ones',
    rerollOnesAndTwos: 'Reroll Ones and Twos',
    rerollFails: 'Reroll Fails',
    rerollNonCritical: 'Reroll Non-Critical',
    rerollOne: 'Reroll One',

    // Random-value reroll labels (Attacks / Damage)
    rerollLow123: 'Reroll ≤3 (D3: 1s)',

    // Reroll scope toggle
    rerollScopeAll: 'All',
    rerollScopeSingle: 'One',
    rerollScopeTooltip: 'All dice: every qualifying die gets one reroll. One die: only a single die may be rerolled for this weapon card.',

    // Torrent
    torrent: 'Torrent',
  },

  zh: {
    // Page
    pageTitle: '40K 攻击模拟器',
    editionTooltip: '基于战锤40K 第11版规则',
    attackSimulatorSections: '攻击模拟器页面',
    navSimulator: '模拟器',
    navProfileLibrary: '面板库',
    navComparison: '对比',

    // Profile libraries
    import: '导入',
    export: '导出',
    savedAttackerSets: '已保存攻击方面板',
    savedDefenderSets: '已保存防御方面板',
    saveProfile: '保存面板',
    profileLibrary: '面板库',
    attackerLibrary: '攻击方面板',
    defenderLibrary: '防御方面板',
    searchProfiles: '搜索面板…',
    newProfile: '新建面板',
    saveChanges: '保存',
    discardChanges: '放弃修改',
    renameProfile: '重命名',
    duplicateProfile: '复制',
    deleteProfile: '删除',
    unsavedChanges: '有未保存修改',
    selectProfileToEdit: '选择一个已保存的面板进行查看和编辑。',
    chooseProfileFromList: '从列表中选择一个面板。',
    noSavedProfiles: '还没有保存的面板。',
    comparison: '面板对比',
    comparisonNeedsProfiles: '请先保存用于对比的面板。',
    comparisonMinimumAttackers: '请至少选择两个攻击方面板。',
    selectDefender: '选择防御方面板',
    attackersToCompare: '参与对比的攻击方',
    selectAttacker: '选择攻击方面板',
    attackerNumber: (n) => `攻击方 ${n}`,
    addAttacker: '+ 添加攻击方',
    removeAttacker: (n) => `移除攻击方 ${n}`,
    runComparison: '运行对比',
    comparing: '对比计算中…',
    comparisonResults: '对比结果',
    manageProfiles: '管理面板',
    expandProfilePreview: '展开完整面板',
    collapseProfilePreview: '收起详情',
    additionalUnitBuffs: '额外单位加成',
    clearAdditionalBuffs: '清除新增',
    addReroll: '添加重投…',
    attackerProfile: '攻击方面板',
    defenderProfile: '防御方面板',
    savedAttackerGroup: '已保存的攻击方面板',
    savedDefenderGroup: '已保存的防御方面板',
    loadAttackerProfile: '加载已保存的攻击方面板',
    loadDefenderProfile: '加载已保存的防御方面板',
    saveProfileAs: (type) => `保存${type}，请输入名称：`,
    profileExistsConfirm: (name) => `面板“${name}”已存在，是否覆盖？`,
    profileSaved: (type, name) => `已保存${type}“${name}”。`,
    profileLoaded: (type, name) => `已加载${type}“${name}”。`,
    profileLoadFailed: (type, name) => `无法加载${type}“${name}”。`,
    invalidProfile: (type, detail) => `${type}无效：${detail}。`,
    nameCannotBeEmpty: '名称不能为空。',
    profileNameLabel: '面板名称',
    saveProfileAction: '保存',
    createProfileAction: '创建',
    overwriteProfile: '覆盖',
    cancel: '取消',
    profileSaveFailed: '无法保存面板。',
    profileStorageFull: '浏览器存储空间已满，请删除部分已保存的面板后重试。',
    storageUnavailable: '浏览器存储不可用。',
    discardProfileChangesConfirm: '放弃尚未保存的面板修改？',
    deleteProfileConfirm: (name) => `删除已保存的面板“${name}”？`,
    renameProfileFailed: '无法重命名面板。',
    deleteProfileFailed: '无法删除面板。',
    profileRenamed: (name) => `面板已重命名为“${name}”。`,
    profileDeleted: (name) => `已删除面板“${name}”。`,
    noProfilesToExport: '没有可导出的已保存面板。',
    profilesExported: (count) => `已导出 ${count} 个面板。`,
    profilesImported: (count, added, updated) =>
      `已导入 ${count} 个面板：新增 ${added} 个，覆盖 ${updated} 个。`,
    exportFailed: (reason) => `导出失败：${reason}。`,
    unknownError: '未知错误',
    needTargetProfile: '请至少添加一个目标面板。',

    // Sections
    attackerSection: '攻击方面板',
    defenderSection: '防御方 — 目标面板',
    addWeapon: '+ 添加武器',
    addProfile: '+ 添加面板',
    attackerUnit: (n) => `单位 ${n}`,
    expandAttackerUnit: (name) => `展开${name}`,
    collapseAttackerUnit: (name) => `折叠${name}`,
    addAttackerUnit: '+ 添加单位',
    removeAttackerUnit: (n) => `移除单位 ${n}`,
    savedAttackerUnitGroup: (n) => `单位 ${n} 的已保存面板`,
    loadAttackerUnitProfile: (n) => `为单位 ${n} 加载已保存面板`,
    invalidUnitWeaponExpression: (unit, weapon, field, value) =>
      `${unit}：武器“${weapon}”的${field}“${value}”无效。`,

    // Unit buffs
    unitBuffsSection: '单位加成',
    rerollFailedHit: '重投失败命中骰',
    rerollFailedWound: '重投失败造伤骰',
    noUnitBuffs: '当前没有启用任何单位加成。',
    unitUpgradedTag: '由单位加成强化',
    unitGrantedTag: '由单位加成提供',

    // Weapon card popover
    editBuffs: '编辑加成…',
    closeBuffs: '完成',
    buffsDialogTitle: '武器加成',
    targetBuffsDialogTitle: '目标加成',
    noWeaponBuffs: '尚未配置加成。',

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
    perProfileBreakdown: '逐面板详情',
    totalModelsKilledDist: '总击杀模型数 — 分布',
    simulationNote: (n) =>
      `* 通过蒙特卡洛模拟估算（${n} 次模拟）`,

    // Report
    copyReport: '复制报告',
    reportCopied: '战报已复制到剪贴板。',
    reportCopyFailed: '无法复制报告到剪贴板。',
    reportAttacker: '攻击方',
    reportDefender: '防御方',
    reportResults: '结果',
    reportExpectedKills: '预期击杀',
    reportExpectedDamage: '预期伤害',
    reportWipeChance: '全歼概率',
    reportIterations: (n) => `蒙特卡洛模拟 ${n} 次`,

    // Per-profile table headers
    thProfile: '面板',
    thModels: '模型数',
    thExpectedKills: '预期击杀',    thStdDev: '标准差',    thWipePercent: '全歼 %',

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
    attackReroll: '攻击次数重投',
    damageReroll: '伤害重投',

    // Weapon buff chips
    lethalHits: '致命一击',
    sustainedHits: '连击',
    devastatingWounds: '毁灭伤害',
    blast: '爆炸',
    cleave: '劈砍',
    plusOneAttack: '+1 攻击次数',
    plusOneDamage: '+1 伤害',
    plusOneAp: '+1 AP',
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
    minusOneAp: '−1 AP',
    // Reroll option labels
    noReroll: '无重投',
    rerollOnes: '重投1',
    rerollOnesAndTwos: '重投1和2',
    rerollFails: '重投失败',
    rerollNonCritical: '重投非暴击',
    rerollOne: '重投一',

    // Random-value reroll labels (Attacks / Damage)
    rerollLow123: '重投 ≤3（D3：仅 1）',

    // Reroll scope toggle
    rerollScopeAll: '全部',
    rerollScopeSingle: '一颗',
    rerollScopeTooltip: '全部：每个符合条件的骰子重投一次。一颗：此武器面板仅一颗骰子可以重投。',

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
