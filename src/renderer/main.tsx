import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext'
import { AgentProvider } from './context/AgentContext'
import { ConversationProvider } from './context/ConversationContext'
import '../styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<ThemeProvider>
			<AgentProvider>
				<ConversationProvider>
					<App />
				</ConversationProvider>
			</AgentProvider>
		</ThemeProvider>
	</React.StrictMode>
)

// Use contextBridge
window.ipcRenderer.on('main-process-message', (_event, message) => {
	console.log(message)
})
