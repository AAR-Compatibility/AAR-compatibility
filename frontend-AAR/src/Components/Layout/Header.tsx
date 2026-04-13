import type { MouseEvent } from 'react'
import '../../Styles/header.css'

type HeaderProps = {
  onHome?: () => void
}

export default function Header({ onHome }: HeaderProps) {
  const handleHomeClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onHome) {
      return
    }

    event.preventDefault()
    onHome()
  }

  return (
    <header className="site-header">
      <div className="site-header__brand">
        <a className="site-header__eyebrow" href="#/">
          JAPCC
        </a>
      </div>
      <nav className="site-header__nav" aria-label="Main navigation">
        <a className="site-header__link" href="#/" onClick={handleHomeClick}>
          Home
        </a>
        <a className="site-header__link" href="#/contact">
          Contact
        </a>
      </nav>
    </header>
  )
}
