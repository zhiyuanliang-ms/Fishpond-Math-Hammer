import './Sidebar.css'

function Sidebar({ currentPage, onPageChange }) {
  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <h2>Fishpond Math Hammer</h2>
      </div>
      
      <ul className="nav-list">
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
            className={`nav-button ${currentPage === 'cheat-sheet' ? 'active' : ''}`}
            onClick={() => onPageChange('cheat-sheet')}
          >
            Cheat Sheet
          </button>
        </li>
      </ul>
    </nav>
  )
}

export default Sidebar
