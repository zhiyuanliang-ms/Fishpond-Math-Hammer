// Modal wrapper around TargetBuffsEditor — see BuffsDialog for the shell.

import BuffsDialog from './BuffsDialog'
import TargetBuffsEditor from './TargetBuffsEditor'
import { useT } from '../attackSim/lang'

function TargetBuffsDialog({ profile, onChange, onClose }) {
  const { t } = useT()
  return (
    <BuffsDialog
      title={t('targetBuffsDialogTitle')}
      subtitle={profile.name || ''}
      onClose={onClose}
    >
      <TargetBuffsEditor profile={profile} onChange={onChange} />
    </BuffsDialog>
  )
}

export default TargetBuffsDialog
