import '../styles/App.css'
import '../styles/agent-panel.css'
import ThemeToggler from './components/ThemeToggler'
import AgentPanel from './components/AgentPanel'

function App() {
	return (
		<>
			<ThemeToggler />
			<div id="app-container">
				<div id="content-panel" />
				<AgentPanel />
			</div>
		</>
	)
}

export default App
