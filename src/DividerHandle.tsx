interface DividerHandleProps {
  onMouseDown: (e: React.MouseEvent) => void
  isDragging: boolean
}

function DividerHandle({ onMouseDown, isDragging }: DividerHandleProps) {
  const className = [
    'divider-handle',
    isDragging ? 'divider-handle--dragging' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      data-testid="divider-handle"
      className={className}
      onMouseDown={onMouseDown}
    />
  )
}

export default DividerHandle
