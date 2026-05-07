import { useState, useCallback, useEffect, useRef } from 'react'
import { clampWidth, getInitialWidth } from './panelUtils'
import DividerHandle from './DividerHandle'
import './App.css'

const STORAGE_KEY = 'riat:agent-panel-width'

function App() {
  const [agentWidth, setAgentWidth] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return getInitialWidth(window.innerWidth, stored)
  })
  const [isDragging, setIsDragging] = useState(false)
  const layoutRef = useRef<HTMLDivElement>(null)
  const agentWidthRef = useRef(agentWidth)
  agentWidthRef.current = agentWidth

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const vw = window.innerWidth
    const newWidth = vw - e.clientX
    setAgentWidth(clampWidth(newWidth, vw))
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    localStorage.setItem(STORAGE_KEY, String(agentWidthRef.current))
  }, [])

  // Attach/remove global listeners during drag
  useEffect(() => {
    if (!isDragging) return

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // ResizeObserver: adjust if viewport shrinks below persisted width
  useEffect(() => {
    const layout = layoutRef.current
    if (!layout) return

    const observer = new ResizeObserver(() => {
      const vw = window.innerWidth
      setAgentWidth((prev) => {
        const maxWidth = Math.round(vw * 0.5)
        if (prev > maxWidth) {
          localStorage.setItem(STORAGE_KEY, String(maxWidth))
          return maxWidth
        }
        return prev
      })
    })

    observer.observe(layout)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={layoutRef}
      className={`layout${isDragging ? ' layout--dragging' : ''}`}
    >
      <main className="panel-main">
        <h1>Blog Comp</h1>
        <p>Running on {window.electronAPI.platform}</p>
      </main>
      <DividerHandle onMouseDown={handleMouseDown} isDragging={isDragging} />
      <aside className="panel-agent" style={{ width: agentWidth }}>
        <h2>AI Agent</h2>
      </aside>
    </div>
  )
}

export default App
