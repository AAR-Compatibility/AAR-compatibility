import '../../Styles/header.css'

export default function Header() {
  return (
    <header className="site-header">
      <div className="site-header__brand">
        <a className="site-header__eyebrow" href="#/">
          JAPCC
        </a>
      </div>
      <nav className="site-header__nav" aria-label="Main navigation">
        <a className="site-header__link" href="#/">
          Home
        </a>
        <a className="site-header__link" href="#/contact">
          Contact
        </a>
      </nav>
    </header>
  )
}
