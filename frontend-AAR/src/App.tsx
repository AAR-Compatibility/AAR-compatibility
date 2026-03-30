import './App.css'
import { useEffect, useState } from 'react'
import Contact from './Pages/Contact'
import Login from './Pages/Login'

function getCurrentPath(): string {
  const hash = window.location.hash.replace(/^#/, '')
  return hash || '/'
}

function App() {
  const [path, setPath] = useState<string>(getCurrentPath())

  useEffect(() => {
    const onHashChange = () => setPath(getCurrentPath())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return (
    <div className="app">
      {path === '/contact' ? <Contact /> : <Login />}
    </div>
  )
}

export default App
