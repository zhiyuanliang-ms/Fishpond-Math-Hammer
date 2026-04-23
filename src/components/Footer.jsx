import '../styles/footer.css'

function Footer({ onCopyrightClick }) {
  return (
    <footer className="footer">
      <p className="footer-text">
        © 2025 Fishpond Math Hammer
        <button className="footer-link" onClick={onCopyrightClick}>
          About
        </button>
      </p>
    </footer>
  )
}

export default Footer
