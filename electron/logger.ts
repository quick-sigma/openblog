import fs from 'node:fs'
import path from 'node:path'
import { parseEnvBoolean, pickString, readDotEnvFile } from './dotenv'

type LogLevel = 'SYSTEM' | 'LOGGER' | 'STARTUP' | 'WINDOW' | 'LOADING' | 'SHUTDOWN' | 'INFO' | 'WARN' | 'ERROR'

type LoggerOptions = {
	appRoot: string
	isDevelopment: boolean
	isPackaged: boolean
	sessionId: string
}

type LogMeta = Record<string, unknown>

function pad2(value: number) {
	return String(value).padStart(2, '0')
}

function pad3(value: number) {
	return String(value).padStart(3, '0')
}

function toDateStamp(date: Date) {
	return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`
}

function toTimeStamp(date: Date) {
	return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}.${pad3(date.getMilliseconds())}`
}

function resolveLoggerConfig(isDevelopment: boolean, isPackaged: boolean, appRoot: string): ElectronLoggerConfig {
	const dotEnv = readDotEnvFile(appRoot)

	const enabledRaw = pickString(process.env.LOG_ENABLED, dotEnv.LOG_ENABLED)
	const enabled = parseEnvBoolean(enabledRaw, true)
	if (!enabled) {
		return { enabled: false, file: false, console: false }
	}

	const fileRaw = pickString(process.env.LOG_FILE, dotEnv.LOG_FILE)
	const consoleRaw = pickString(process.env.LOG_CONSOLE, dotEnv.LOG_CONSOLE)

	return {
		enabled: true,
		file: parseEnvBoolean(fileRaw, !isPackaged),
		console: parseEnvBoolean(consoleRaw, isDevelopment),
	}
}

class AppLogger {
	private readonly config: ElectronLoggerConfig
	private readonly isDevelopment: boolean
	private readonly logsDir: string
	private readonly logFile: string
	private readonly sessionId: string

	constructor(options: LoggerOptions) {
		this.isDevelopment = options.isDevelopment
		this.sessionId = options.sessionId
		this.config = resolveLoggerConfig(options.isDevelopment, options.isPackaged, options.appRoot)
		this.logsDir = path.join(options.appRoot, 'logs')
		this.logFile = path.join(this.logsDir, `system.${toDateStamp(new Date())}.log`)
	}

	init() {
		if (!this.config.enabled) return
		if (!this.config.file && !this.config.console) return

		if (this.config.file) {
			fs.mkdirSync(this.logsDir, { recursive: true })
		}
		this.writeLine('SYSTEM', '='.repeat(112))
		this.writeLine('SYSTEM', `Application Started | ${JSON.stringify({ devMode: this.isDevelopment, sessionId: this.sessionId })}`)
		this.writeLine('SYSTEM', '='.repeat(112))
		this.writeLine('LOGGER', 'Logger ready')
	}

	info(level: LogLevel, message: string, meta: LogMeta = {}) {
		const metaJson = JSON.stringify(meta)
		if (!metaJson || metaJson === '{}') {
			this.writeLine(level, message)
		} else {
			this.writeLine(level, `${message} | ${metaJson}`)
		}
	}

	log(level: LogLevel, message: string) {
		this.writeLine(level, message)
	}

	shutdown() {
		if (!this.config.enabled) return
		if (!this.config.file && !this.config.console) return

		this.writeLine('INFO', 'Logger shutting down')
		this.writeLine('SYSTEM', '='.repeat(112))
		this.writeLine('SYSTEM', `Application Ended | ${JSON.stringify({ sessionId: this.sessionId })}`)
		this.writeLine('SYSTEM', '='.repeat(112) + '\n')
	}

	private writeLine(level: LogLevel, body: string) {
		if (!this.config.enabled) return
		if (!this.config.file && !this.config.console) return

		const line = `[${toTimeStamp(new Date())}] [${level}] ${body}`
		if (this.config.file) {
			fs.appendFileSync(this.logFile, `${line}\n`, 'utf-8')
		}
		if (this.config.console) {
			console.log(line)
		}
	}
}

export { AppLogger, resolveLoggerConfig }
export type { LogLevel, LogMeta }
