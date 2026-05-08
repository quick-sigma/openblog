interface NewChatButtonProps {
  onClick: () => void
  variant: 'compact' | 'full'
}

function NewChatButton({ onClick, variant }: NewChatButtonProps) {
  return (
    <button
      className={`new-chat-btn ${variant}`}
      onClick={onClick}
      aria-label="Nueva conversación"
    >
      {variant === 'compact' ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Nueva conversación
        </>
      )}
    </button>
  )
}

export default NewChatButton
