import { HelpCircle } from 'lucide-react'

export function TipsButton() {
  return (
    <div className="mbp-tips">
      <button
        type="button"
        className="mbp-tips__btn"
        aria-label="Show hotkeys"
      >
        <HelpCircle size={16} />
      </button>
      <div className="mbp-tips__popover" role="tooltip">
        <div className="mbp-tips__title">Hotkeys</div>
        <ul className="mbp-tips__list">
          <li>
            <span className="mbp-kbd">Esc</span> cursor
          </li>
          <li>
            <span className="mbp-kbd">Del</span> delete
          </li>
          <li>
            <span className="mbp-kbd">Ctrl+Z</span> undo
          </li>
          <li>
            <span className="mbp-kbd">Q</span>/<span className="mbp-kbd">E</span> rotate
          </li>
        </ul>
      </div>
    </div>
  )
}
