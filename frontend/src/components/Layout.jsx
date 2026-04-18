import { Link, useLocation } from 'react-router-dom'

export default function Layout({ children }) {
  const loc = useLocation()
  const isNew = loc.pathname.startsWith('/new')

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-mark">Meridian Advisory</span>
          <span className="brand-sub">Wealth Management Workbench</span>
        </div>
        <nav className="header-nav">
          <Link to="/">Portfolio</Link>
          <Link to="/new/profile">New Client</Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  )
}
