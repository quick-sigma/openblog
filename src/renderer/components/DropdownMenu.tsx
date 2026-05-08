import { useState, useRef, useEffect, type ReactNode } from 'react'

export interface DropdownMenuItem {
  label: string
  onClick: () => void
  visible?: boolean
  icon?: ReactNode
}

interface DropdownMenuProps {
  items: DropdownMenuItem[]
}

function DropdownMenu({ items }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const visibleItems = items.filter((i) => i.visible !== false)

  return (
    <div className="dropdown-menu" ref={ref}>
      <button
        className="trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Menú"
      >
        …
      </button>
      {isOpen && visibleItems.length > 0 && (
        <div className="menu-items">
          {visibleItems.map((item, idx) => (
            <div
              key={idx}
              className="menu-item"
              role="menuitem"
              onClick={() => {
                item.onClick()
                setIsOpen(false)
              }}
            >
              {item.icon && <span className="menu-item-icon">{item.icon}</span>}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DropdownMenu
