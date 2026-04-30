import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import './App.css'
import Home from './pages/Home.jsx'
import About from './pages/About.jsx'
import Sequential from './pages/Sequential.jsx'
import React from "react"
import './index.css'
import { IoHomeOutline } from "react-icons/io5"
import { IoInformationCircleOutline } from "react-icons/io5"
import Results from './pages/Results.jsx'
import { IoMdBook } from "react-icons/io";
import { IoLayers } from "react-icons/io5";
import { IoStatsChart } from "react-icons/io5";
import { IoSwapHorizontal } from "react-icons/io5";
import { IoCubeOutline } from "react-icons/io5";
import TSNE from './pages/TSNE.jsx'
import TSNETransition from './pages/TSNETransition.jsx'
import TSNETransition3D from './pages/TSNETransition3D.jsx'


function App() {
  return (
    <BrowserRouter>
      <div className="relative w-screen h-screen flex">
        {/* Left Sidebar */}
        <nav className="w-16 bg-[var(--color-onyx)]/50 border-r border-[var(--color-honeydew)]/20 flex flex-col items-center py-4 gap-4">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `p-3 rounded-lg transition duration-300 flex flex-col items-center gap-1 ${
                isActive
                  ? 'bg-[var(--color-magenta)]/60 text-[var(--color-honeydew)]'
                  : 'hover:bg-[var(--color-magenta)]/30 text-[var(--color-honeydew)]/70'
              }`
            }
            title="Home"
          >
            <IoHomeOutline className="text-2xl" />
            <span className="text-xs">Home</span>
          </NavLink>

          <NavLink
            to="/sequential"
            className={({ isActive }) =>
              `p-3 rounded-lg transition duration-300 flex flex-col items-center gap-1 ${
                isActive
                  ? 'bg-[var(--color-magenta)]/60 text-[var(--color-honeydew)]'
                  : 'hover:bg-[var(--color-magenta)]/30 text-[var(--color-honeydew)]/70'
              }`
            }
            title="Sequential"
          >
            <IoLayers className="text-2xl" />
            <span className="text-xs">Sequential</span>
          </NavLink>

          <NavLink
            to="/results"
            className={({ isActive }) =>
              `p-3 rounded-lg transition duration-300 flex flex-col items-center gap-1 ${isActive
                ? 'bg-[var(--color-magenta)]/60 text-[var(--color-honeydew)]'
                : 'hover:bg-[var(--color-magenta)]/30 text-[var(--color-honeydew)]/70'
              }`
            }
            title="Results"
          >
            <IoMdBook className="text-2xl" />
            <span className="text-xs">Results</span>
          </NavLink>

          <NavLink
            to="/tsne"
            className={({ isActive }) =>
              `p-3 rounded-lg transition duration-300 flex flex-col items-center gap-1 ${
                isActive
                  ? 'bg-[var(--color-magenta)]/60 text-[var(--color-honeydew)]'
                  : 'hover:bg-[var(--color-magenta)]/30 text-[var(--color-honeydew)]/70'
              }`
            }
            title="t-SNE"
          >
            <IoStatsChart className="text-2xl" />
            <span className="text-xs">t-SNE</span>
          </NavLink>

          <NavLink
            to="/tsne-transition"
            className={({ isActive }) =>
              `p-3 rounded-lg transition duration-300 flex flex-col items-center gap-1 ${
                isActive
                  ? 'bg-[var(--color-magenta)]/60 text-[var(--color-honeydew)]'
                  : 'hover:bg-[var(--color-magenta)]/30 text-[var(--color-honeydew)]/70'
              }`
            }
            title="t-SNE Transition"
          >
            <IoSwapHorizontal className="text-2xl" />
            <span className="text-xs">Transition</span>
          </NavLink>

          <NavLink
            to="/tsne-transition-3d"
            className={({ isActive }) =>
              `p-3 rounded-lg transition duration-300 flex flex-col items-center gap-1 ${
                isActive
                  ? 'bg-[var(--color-magenta)]/60 text-[var(--color-honeydew)]'
                  : 'hover:bg-[var(--color-magenta)]/30 text-[var(--color-honeydew)]/70'
              }`
            }
            title="3D t-SNE"
          >
            <IoCubeOutline className="text-2xl" />
            <span className="text-xs">3D</span>
          </NavLink>

          <NavLink
            to="/about"
            className={({ isActive }) =>
              `p-3 rounded-lg transition duration-300 flex flex-col items-center gap-1 ${
                isActive
                  ? 'bg-[var(--color-magenta)]/60 text-[var(--color-honeydew)]'
                  : 'hover:bg-[var(--color-magenta)]/30 text-[var(--color-honeydew)]/70'
              }`
            }
            title="About"
          >
            <IoInformationCircleOutline className="text-2xl" />
            <span className="text-xs">About</span>
          </NavLink>
        </nav>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Home className="relative z-10" />} />
            <Route path="/sequential" element={<Sequential className="relative z-10" />} />
            <Route path="/results" element={<Results className="relative z-10" />} />
            <Route path="/tsne" element={<TSNE className="relative z-10" />} />
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
