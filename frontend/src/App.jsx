import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import './App.css'
import Home from './pages/Home.jsx'
import Overview from './pages/Overview.jsx'
import About from './pages/About.jsx'
import React, { useState } from "react"
import './index.css'
import {
  IoHomeOutline, IoInformationCircleOutline, IoSwapHorizontal,
  IoCubeOutline, IoPlayCircleOutline, IoMenuOutline, IoCloseOutline,
} from "react-icons/io5"
import Results from './pages/Results.jsx'
import { IoMdBook } from "react-icons/io"
import TSNETransition from './pages/TSNETransition.jsx'
import TSNETransition3D from './pages/TSNETransition3D.jsx'

const linkClass = ({ isActive }) =>
  `p-3 rounded-lg transition duration-300 flex flex-col items-center gap-1 w-full ${
    isActive
      ? 'bg-[var(--color-magenta)]/60 text-[var(--color-honeydew)]'
      : 'hover:bg-[var(--color-magenta)]/30 text-[var(--color-honeydew)]'
  }`

function NavItems({ onNavigate }) {
  return (
    <>
      <NavLink to="/" end className={linkClass} title="Home" onClick={onNavigate}>
        <IoHomeOutline className="text-2xl" />
        <span className="text-xs">Home</span>
      </NavLink>
      <NavLink to="/demo" className={linkClass} title="Demo" onClick={onNavigate}>
        <IoPlayCircleOutline className="text-2xl" />
        <span className="text-xs">Demo</span>
      </NavLink>
      <NavLink to="/results" className={linkClass} title="Results" onClick={onNavigate}>
        <IoMdBook className="text-2xl" />
        <span className="text-xs">Results</span>
      </NavLink>
      <NavLink to="/tsne-transition" className={linkClass} title="t-SNE Transition" onClick={onNavigate}>
        <IoSwapHorizontal className="text-2xl" />
        <span className="text-xs">Transition</span>
      </NavLink>
      <NavLink to="/tsne-transition-3d" className={linkClass} title="3D t-SNE" onClick={onNavigate}>
        <IoCubeOutline className="text-2xl" />
        <span className="text-xs">3D</span>
      </NavLink>
      <NavLink to="/about" className={linkClass} title="About" onClick={onNavigate}>
        <IoInformationCircleOutline className="text-2xl" />
        <span className="text-xs">About</span>
      </NavLink>
    </>
  )
}

function App() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const close = () => setMobileNavOpen(false)

  return (
    <BrowserRouter>
      <div className="relative w-screen h-screen flex">

        {/* Desktop sidebar — hidden below md breakpoint */}
        <nav className="hidden md:flex w-24 shrink-0 bg-[var(--color-onyx)]/50 border-r border-[var(--color-honeydew)]/20 flex-col items-center py-4 gap-4">
          <NavItems />
        </nav>

        {/* Mobile: hamburger button (only when nav is closed) */}
        {!mobileNavOpen && (
          <button
            className="fixed top-3 left-3 z-50 md:hidden p-2 rounded-lg
                       bg-[var(--color-onyx)]/80 border border-[var(--color-honeydew)]/20
                       text-[var(--color-honeydew)] backdrop-blur-sm"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <IoMenuOutline className="text-xl" />
          </button>
        )}

        {/* Mobile: backdrop — click outside to close */}
        {mobileNavOpen && (
          <div
            className="fixed inset-0 z-40 md:hidden bg-black/50 backdrop-blur-sm"
            onClick={close}
          />
        )}

        {/* Mobile: slide-in nav overlay */}
        <nav
          className={`fixed left-0 top-0 h-full w-24 z-50 md:hidden
                      bg-[var(--color-onyx)] border-r border-[var(--color-honeydew)]/20
                      flex flex-col items-center pt-3 pb-4 gap-4
                      transition-transform duration-300 ease-in-out
                      ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          {/* Close button */}
          <button
            className="self-center p-2 rounded-lg text-[var(--color-honeydew)]/50
                       hover:text-[var(--color-honeydew)] hover:bg-white/10 transition"
            onClick={close}
            aria-label="Close navigation"
          >
            <IoCloseOutline className="text-xl" />
          </button>
          <NavItems onNavigate={close} />
        </nav>

        {/* Main content — always full width on mobile (sidebar doesn't take space) */}
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Overview className="relative z-10" />} />
            <Route path="/demo" element={<Home className="relative z-10" />} />
            <Route path="/results" element={<Results className="relative z-10" />} />
            <Route path="/tsne-transition" element={<TSNETransition className="relative z-10" />} />
            <Route path="/tsne-transition-3d" element={<TSNETransition3D className="relative z-10" />} />
            <Route path="/about" element={<About className="relative z-10" />} />
          </Routes>
        </div>

      </div>
    </BrowserRouter>
  )
}

export default App
