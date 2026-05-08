import '../styles/App.css'
import ThemeToggler from './components/ThemeToggler'

function App() {
	return (
		<>
			<ThemeToggler />
			<div id="app-container">
				<div id="content-panel" />
				<div id="agent-panel" />
			</div>
		</>
	)
}

export default App
