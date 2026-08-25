import { NavLink, Outlet } from 'react-router-dom'
import { Home, PlusCircle, BookOpen, BarChart3 } from 'lucide-react'
import './Layout.css'

export default function Layout() {
  return (
    <div className="layout">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand">
            <BookOpen size={18} aria-hidden="true" />
            <span>王者荣耀游戏错题本</span>
          </div>
          <nav className="app-nav" aria-label="主导航">
            <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <Home size={16} aria-hidden="true" />
              <span>首页</span>
            </NavLink>
            <NavLink to="/add" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <PlusCircle size={16} aria-hidden="true" />
              <span>添加对局</span>
            </NavLink>
            <NavLink to="/growth" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <BarChart3 size={16} aria-hidden="true" />
              <span>成长档案</span>
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="app-main">
        <div className="app-main-inner">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
