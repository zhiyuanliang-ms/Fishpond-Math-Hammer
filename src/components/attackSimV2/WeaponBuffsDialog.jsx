// Modal wrapper around WeaponBuffsEditor — see BuffsDialog for the shell.

import BuffsDialog from './BuffsDialog'
import WeaponBuffsEditor from './WeaponBuffsEditor'
import { useT } from '../attackSim/lang'

function WeaponBuffsDialog({ profile, onChange, onClose }) {
  const { t } = useT()
  return (
    <BuffsDialog
      title={t('buffsDialogTitle')}
      subtitle={profile.name || ''}
      onClose={onClose}
    >
      <WeaponBuffsEditor profile={profile} onChange={onChange} />
    </BuffsDialog>
  )
}

export default WeaponBuffsDialog
