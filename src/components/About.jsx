import { useState } from 'react'
import { Page } from './ui'
import { clearAllAttackSimStorage } from '../lib/attackSimV2Storage'
import { useBoardStore } from '../macro-battleplan/store/boardStore'
import { isLegacy10eEnabled, setLegacy10eEnabled } from '../macro-battleplan/legacyEdition'
import '../styles/about.css'

function About() {
  const [legacy10e, setLegacy10e] = useState(isLegacy10eEnabled)

  const handleCoffeeClick = () => {
    alert('This function is not implemented yet')
  }

  const handleLegacyToggle = (event) => {
    const { checked } = event.target
    setLegacy10e(checked)
    setLegacy10eEnabled(checked)
  }

  const handleClearStorage = () => {
    const msg =
      'Clear ALL Fishpond Math Hammer data from this browser?\n\n' +
      'This deletes every saved Attack Simulator scenario / profile set ' +
      'and every saved Macro Battleplan board and scoreboard. ' +
      'On-screen state is kept until you reload.'
    if (!window.confirm(msg)) return
    try {
      clearAllAttackSimStorage()
      useBoardStore.getState().clearAllStorage?.()
    } catch {
      /* ignore */
    }
    alert('Local storage cleared.')
  }

  return (
    <Page>
      <div className="about-container">
        <div className="fishpond-logo">
          <img src="/the-fishpond.png" alt="The Fishpond" />
        </div>
        
        <div className="about-main">
          <div className="about-text">
            <h2>Fishpond Math Hammer</h2>
            <p>
              A comprehensive calculator tool for Warhammer tabletop game dice roll calculations.
            </p>
            
            <h3>Developed by</h3>
            <p>
              Charles
            </p>
            
            <h3>Copyright</h3>
            <p>
              © 2025 Fishpond Math Hammer. All rights reserved.
            </p>
          </div>
          
          <div className="about-actions">
            <div className="contact-info">
              <h4>Contact</h4>
              <p>Got feedback or found a bug?</p>
              <a href="mailto:charlesliangzhiyuan@gmail.com" className="email-link">
                charlesliangzhiyuan@gmail.com
              </a>
            </div>
            
            <div className="support-info">
              <h4>Support This Project</h4>
              <button onClick={handleCoffeeClick} className="coffee-button">
                Buy Me a Coffee
              </button>
            </div>

            <div className="legacy-info">
              <h4>Legacy Content</h4>
              <p>
                The 10th edition Macro Battleplan board is deprecated. Turn this
                on to keep it available as an extra tab on the Macro Battleplan
                page.
              </p>
              <label className="legacy-toggle">
                <input type="checkbox" checked={legacy10e} onChange={handleLegacyToggle} />
                <span>Show 10th edition battleplan</span>
              </label>
            </div>

            <div className="storage-info">
              <h4>Local Storage</h4>
              <p>
                Remove every saved scenario, profile set, board, and scoreboard
                that this app keeps in your browser.
              </p>
              <button onClick={handleClearStorage} className="clear-storage-button">
                Clear Storage
              </button>
            </div>
          </div>
        </div>
      </div>
    </Page>
  )
}

export default About
