import '../styles/sidebar.css'

function Sidebar({ currentPage, onPageChange }) {
  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <h2>Fishpond Math Hammer</h2>
      </div>
      
      <ul className="nav-list">
        <li>
          <button
            className={`nav-button ${currentPage === 'attack-simulator' ? 'active' : ''}`}
            onClick={() => onPageChange('attack-simulator')}
          >
            40K Attack Simulator
          </button>
        </li>
        <li>
          <button
            className={`nav-button ${currentPage === 'aos-attack-simulator' ? 'active' : ''}`}
            onClick={() => onPageChange('aos-attack-simulator')}
          >
            AoS Attack Simulator
          </button>
        </li>
        <li>
          <button
            className={`nav-button ${currentPage === 'cheat-sheet' ? 'active' : ''}`}
            onClick={() => onPageChange('cheat-sheet')}
          >
            Cheat Sheet
          </button>
        </li>
        <li>
          <button
            className={`nav-button ${currentPage === 'dice-calculator' ? 'active' : ''}`}
            onClick={() => onPageChange('dice-calculator')}
          >
            Dice Calculator
          </button>
        </li>
        <li>
          <button
            className={`nav-button ${currentPage === 'dice-roller' ? 'active' : ''}`}
            onClick={() => onPageChange('dice-roller')}
          >
            Dice Roller
          </button>
        </li>
        <li>
          <button
            className={`nav-button ${currentPage === 'macro-battleplan' ? 'active' : ''}`}
            onClick={() => onPageChange('macro-battleplan')}
          >
            40K Tactical Board
            <span className="nav-preview-pill">Preview</span>
          </button>
        </li>
      </ul>
    </nav>
  )
}

export default Sidebar
