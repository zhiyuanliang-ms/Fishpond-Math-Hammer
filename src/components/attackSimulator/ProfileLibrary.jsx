import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Copy,
  Download,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  deleteNamedTargetSet,
  deleteNamedWeaponSet,
  getSavedTargetSetLibrary,
  getSavedWeaponSetLibrary,
  listSavedTargetSets,
  listSavedWeaponSets,
  loadNamedTargetSet,
  loadNamedWeaponSet,
  mergeSavedTargetSetLibrary,
  mergeSavedWeaponSetLibrary,
  renameNamedTargetSet,
  renameNamedWeaponSet,
  saveNamedTargetSet,
  saveNamedWeaponSet,
  StorageQuotaError,
} from '../../lib/attackSimStorage'
import {
  buildAttackerProfileLibraryExport,
  buildDefenderProfileLibraryExport,
  parseAttackerProfileLibrary,
  parseDefenderProfileLibrary,
} from '../../lib/attackSimProfileLibrary'
import {
  createDefaultAttackerProfile,
  createDefaultDefenderProfile,
  hydrateAttackerProfile,
  hydrateDefenderProfile,
  serializeAttackerProfile,
  serializeDefenderProfile,
} from '../../lib/attackSimProfiles'
import { Tabs } from '../ui'
import { useT } from '../attackSim/lang'
import ProfileNameDialog from './ProfileNameDialog'
import { trackEvent, TELEMETRY_EVENTS } from '../../lib/telemetry'
import {
  AttackerProfileWorkspace,
  DefenderProfileWorkspace,
} from './ProfileWorkspaces'

const downloadJson = (payload, filenamePrefix) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  anchor.href = url
  anchor.download = `${filenamePrefix}-${stamp}.json`
  document.body.appendChild(anchor)
  try {
    anchor.click()
  } finally {
    anchor.remove()
    URL.revokeObjectURL(url)
  }
}

const sideApis = {
  attacker: {
    list: listSavedWeaponSets,
    load: loadNamedWeaponSet,
    save: saveNamedWeaponSet,
    remove: deleteNamedWeaponSet,
    rename: renameNamedWeaponSet,
    getLibrary: getSavedWeaponSetLibrary,
    mergeLibrary: mergeSavedWeaponSetLibrary,
    parseLibrary: parseAttackerProfileLibrary,
    buildExport: buildAttackerProfileLibraryExport,
    hydrate: hydrateAttackerProfile,
    serialize: serializeAttackerProfile,
    create: createDefaultAttackerProfile,
    filename: 'attack-sim-attacker-profiles',
  },
  defender: {
    list: listSavedTargetSets,
    load: loadNamedTargetSet,
    save: saveNamedTargetSet,
    remove: deleteNamedTargetSet,
    rename: renameNamedTargetSet,
    getLibrary: getSavedTargetSetLibrary,
    mergeLibrary: mergeSavedTargetSetLibrary,
    parseLibrary: parseDefenderProfileLibrary,
    buildExport: buildDefenderProfileLibraryExport,
    hydrate: hydrateDefenderProfile,
    serialize: serializeDefenderProfile,
    create: createDefaultDefenderProfile,
    filename: 'attack-sim-defender-profiles',
  },
}

export default function ProfileLibrary() {
  const { t } = useT()
  const [side, setSide] = useState('attacker')
  const [names, setNames] = useState(() => listSavedWeaponSets())
  const [selectedName, setSelectedName] = useState('')
  const [draft, setDraft] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState(null)
  const [nameAction, setNameAction] = useState(null)
  const fileInputRef = useRef(null)
  const api = sideApis[side]

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timeout)
  }, [toast])

  const confirmDiscard = () =>
    !dirty || window.confirm(t('discardProfileChangesConfirm'))

  const refresh = () => {
    const next = api.list()
    setNames(next)
    return next
  }

  const showStorageError = (error) => {
    const message =
      error instanceof StorageQuotaError
        ? t('profileStorageFull')
        : error instanceof Error
          ? error.message
          : t('storageUnavailable')
    setToast({ kind: 'error', message })
  }

  const trackProfile = (action) => trackEvent(TELEMETRY_EVENTS.Profile, { action })

  const handleSideChange = (nextSide) => {
    if (nextSide === side || !confirmDiscard()) return
    setSide(nextSide)
    setNames(sideApis[nextSide].list())
    setSelectedName('')
    setDraft(null)
    setDirty(false)
    setQuery('')
  }

  const handleSelect = (name) => {
    if (name === selectedName || !confirmDiscard()) return
    const stored = api.load(name)
    if (!stored) {
      setToast({ kind: 'error', message: t('profileLoadFailed', t('thProfile'), name) })
      return
    }
    setSelectedName(name)
    setDraft(api.hydrate(stored))
    setDirty(false)
    trackProfile('view')
  }

  const openNameDialog = (action) => {
    if (action !== 'duplicate' && !confirmDiscard()) return
    setNameAction(action)
  }

  const handleNew = (name) => {
    const nextDraft = api.create()
    if (!api.save(name, api.serialize(nextDraft))) {
      throw new Error(t('storageUnavailable'))
    }
    refresh()
    setSelectedName(name)
    setDraft(nextDraft)
    setDirty(false)
    trackProfile('new')
  }

  const handleSave = () => {
    if (!selectedName || !draft) return
    try {
      if (!api.save(selectedName, api.serialize(draft))) {
        throw new Error(t('storageUnavailable'))
      }
      setDirty(false)
      trackProfile('save')
    } catch (error) {
      showStorageError(error)
    }
  }

  const handleDiscard = () => {
    if (!selectedName) return
    const stored = api.load(selectedName)
    if (!stored) return
    setDraft(api.hydrate(stored))
    setDirty(false)
  }

  const handleRename = (name) => {
    if (name === selectedName) return
    const stored = api.load(selectedName)
    if (!stored || !api.rename(selectedName, name)) {
      throw new Error(t('renameProfileFailed'))
    }
    setSelectedName(name)
    setNames(api.list())
    setDraft(api.hydrate(stored))
    setDirty(false)
    trackProfile('rename')
    setToast({ kind: 'success', message: t('profileRenamed', name) })
  }

  const handleDuplicate = (name) => {
    if (!api.save(name, api.serialize(draft))) {
      throw new Error(t('storageUnavailable'))
    }
    setNames(api.list())
    setSelectedName(name)
    setDraft(api.hydrate(api.load(name)))
    setDirty(false)
    trackProfile('duplicate')
  }

  const handleDelete = () => {
    if (!selectedName) return
    if (!window.confirm(t('deleteProfileConfirm', selectedName))) return
    try {
      if (!api.remove(selectedName)) {
        throw new Error(t('deleteProfileFailed'))
      }
      setNames(api.list())
      setSelectedName('')
      setDraft(null)
      setDirty(false)
      trackProfile('delete')
    } catch (error) {
      showStorageError(error)
    }
  }

  const handleExport = () => {
    try {
      const profiles = api.getLibrary()
      if (Object.keys(profiles).length === 0) {
        throw new Error(t('noProfilesToExport'))
      }
      downloadJson(api.buildExport(profiles), api.filename)
      trackProfile('export')
      setToast({
        kind: 'success',
        message: t('profilesExported', Object.keys(profiles).length),
      })
    } catch (error) {
      setToast({
        kind: 'error',
        message: t('exportFailed', error.message || t('unknownError')),
      })
    }
  }

  const handleImport = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !confirmDiscard()) return
    try {
      const text = await file.text()
      let parsed
      try {
        parsed = JSON.parse(text)
      } catch {
        throw new Error('not valid JSON')
      }
      const profiles = api.parseLibrary(parsed)
      const existing = new Set(names)
      const importedNames = Object.keys(profiles)
      const updated = importedNames.filter((name) => existing.has(name)).length
      if (!api.mergeLibrary(profiles)) {
        throw new Error(t('storageUnavailable'))
      }
      setNames(api.list())
      setSelectedName('')
      setDraft(null)
      setDirty(false)
      trackProfile('import')
      setToast({
        kind: 'success',
        message: t('profilesImported', importedNames.length, importedNames.length - updated, updated),
      })
    } catch (error) {
      showStorageError(error)
    }
  }

  const filteredNames = names.filter((name) =>
    name.toLowerCase().includes(query.trim().toLowerCase())
  )

  return (
    <section className="profile-library-page">
      <header className="attack-sim-section-header profile-page-heading">
        <h2>{t('profileLibrary')}</h2>
      </header>

      <div className="profile-library-tabs-row">
        <Tabs
          value={side}
          onChange={handleSideChange}
          ariaLabel={t('profileLibrary')}
          tabs={[
            { value: 'attacker', label: `${t('attackerLibrary')} (${side === 'attacker' ? names.length : listSavedWeaponSets().length})` },
            { value: 'defender', label: `${t('defenderLibrary')} (${side === 'defender' ? names.length : listSavedTargetSets().length})` },
          ]}
        />
        <div className="profile-library-toolbar">
          <button
            type="button"
            className="toolbar-button toolbar-button--icon"
            onClick={() => openNameDialog('new')}
            aria-label={t('newProfile')}
            title={t('newProfile')}
          >
            <Plus size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="toolbar-button toolbar-button--icon"
            onClick={() => fileInputRef.current?.click()}
            aria-label={t('import')}
            title={t('import')}
          >
            <Upload size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="toolbar-button toolbar-button--icon"
            onClick={handleExport}
            disabled={names.length === 0}
            aria-label={t('export')}
            title={t('export')}
          >
            <Download size={14} aria-hidden="true" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImport}
            hidden
          />
        </div>
      </div>

      {toast && (
        <div className="attack-sim-toast-row">
          <span className={`toolbar-toast toolbar-toast--${toast.kind}`}>
            {toast.message}
          </span>
        </div>
      )}

      {nameAction && (
        <ProfileNameDialog
          title={t(nameAction === 'new' ? 'newProfile' : nameAction === 'rename' ? 'renameProfile' : 'duplicateProfile')}
          initialName={nameAction === 'new' ? '' : nameAction === 'rename' ? selectedName : `${selectedName} copy`}
          existingNames={names}
          replaceName={nameAction === 'rename' ? selectedName : ''}
          submitLabel={t(nameAction === 'new' ? 'createProfileAction' : nameAction === 'rename' ? 'renameProfile' : 'duplicateProfile')}
          onSubmit={nameAction === 'new' ? handleNew : nameAction === 'rename' ? handleRename : handleDuplicate}
          onClose={() => setNameAction(null)}
        />
      )}

      <div className="profile-library-layout">
        <aside className="profile-library-sidebar">
          <input
            type="search"
            className="profile-library-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('searchProfiles')}
            aria-label={t('searchProfiles')}
          />
          <div className="profile-library-list">
            {filteredNames.map((name) => (
              <button
                type="button"
                key={name}
                className={`profile-library-list-item${selectedName === name ? ' active' : ''}`}
                aria-pressed={selectedName === name}
                onClick={() => handleSelect(name)}
              >
                <span>{name}</span>
              </button>
            ))}
            {filteredNames.length === 0 && (
              <div className="profile-library-empty-list">
                {t('noSavedProfiles')}
              </div>
            )}
          </div>
        </aside>

        <div className="profile-library-editor">
          {!draft ? (
            <div className="profile-library-empty-editor">
              <strong>{t('selectProfileToEdit')}</strong>
              <span>
                {names.length === 0
                  ? t('noSavedProfiles')
                  : t('chooseProfileFromList')}
              </span>
            </div>
          ) : (
            <>
              <header className="profile-library-editor-header">
                <div>
                  <h3>{selectedName}</h3>
                  {dirty && (
                    <span className="profile-library-dirty">
                      {t('unsavedChanges')}
                    </span>
                  )}
                </div>
                <div className="profile-library-editor-actions">
                  <button
                    type="button"
                    className="toolbar-button"
                    onClick={handleSave}
                    disabled={!dirty}
                  >
                    <Save size={14} />
                    <span>{t('saveChanges')}</span>
                  </button>
                  <button
                    type="button"
                    className="toolbar-button"
                    onClick={handleDiscard}
                    disabled={!dirty}
                  >
                    <ArrowLeft size={14} />
                    <span>{t('discardChanges')}</span>
                  </button>
                  <button type="button" className="toolbar-button" onClick={() => openNameDialog('rename')}>
                    <Pencil size={14} />
                    <span>{t('renameProfile')}</span>
                  </button>
                  <button type="button" className="toolbar-button" onClick={() => openNameDialog('duplicate')}>
                    <Copy size={14} />
                    <span>{t('duplicateProfile')}</span>
                  </button>
                  <button
                    type="button"
                    className="toolbar-button toolbar-button--danger"
                    onClick={handleDelete}
                  >
                    <Trash2 size={14} />
                    <span>{t('deleteProfile')}</span>
                  </button>
                </div>
              </header>

              {side === 'attacker' ? (
                <AttackerProfileWorkspace
                  weapons={draft.weapons}
                  unitBuffs={draft.unitBuffs}
                  onWeaponsChange={(weapons) =>
                    setDraft((current) => ({ ...current, weapons }))
                  }
                  onUnitBuffsChange={(unitBuffs) =>
                    setDraft((current) => ({ ...current, unitBuffs }))
                  }
                  onEdit={() => setDirty(true)}
                />
              ) : (
                <DefenderProfileWorkspace
                  targets={draft.targets}
                  defenderUnitBuffs={draft.defenderUnitBuffs}
                  onTargetsChange={(targets) =>
                    setDraft((current) => ({ ...current, targets }))
                  }
                  onDefenderUnitBuffsChange={(defenderUnitBuffs) =>
                    setDraft((current) => ({
                      ...current,
                      defenderUnitBuffs,
                    }))
                  }
                  onEdit={() => setDirty(true)}
                />
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
