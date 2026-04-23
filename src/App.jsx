import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import './styles/app.css'
import Sidebar from './components/Sidebar'
import DiceCalculator from './components/DiceCalculator'
import DiceRoller from './components/DiceRoller'
import Cheatsheet from './components/Cheatsheet'
import About from './components/About'
import Footer from './components/Footer'

function AppContent() {
  const navigate = useNavigate()
  const location = useLocation()

  const getPageKey = () => {
    switch (location.pathname) {
      case '/dice-calculator':
        return 'dice-calculator'
      case '/dice-roller':
        return 'dice-roller'
      case '/cheat-sheet':
        return 'cheat-sheet'
      case '/about':
        return 'about'
      default:
        return 'dice-calculator'
    }
  }

  const handlePageChange = (page) => {
    switch (page) {
      case 'dice-calculator':
        navigate('/dice-calculator')
        break
      case 'dice-roller':
        navigate('/dice-roller')
        break
      case 'cheat-sheet':
        navigate('/cheat-sheet')
        break
      case 'about':
        navigate('/about')
        break
      default:
        navigate('/dice-calculator')
    }
  }

  return (
    <div className="app">
      <Sidebar currentPage={getPageKey()} onPageChange={handlePageChange} />
      <div className="main-wrapper">
        <main className="main-content">
          <Routes>
            <Route path="/dice-calculator" element={<DiceCalculator />} />
            <Route path="/dice-roller" element={<DiceRoller />} />
            <Route path="/cheat-sheet" element={<Cheatsheet />} />
            <Route path="/about" element={<About />} />
            <Route path="/" element={<DiceCalculator />} />
          </Routes>
        </main>
        <Footer onCopyrightClick={() => navigate('/about')} />
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
