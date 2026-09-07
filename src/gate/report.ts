import type { Finding } from './types.js'

export interface GateReport {
  pass: boolean
  findings: Finding[]
  scannedFiles: number
  at: string
}

export function buildReport(findings: readonly Finding[], scannedFiles: number, at: Date = new Date()): GateReport {
  return {
    pass: findings.length === 0,
    findings: [...findings],
    scannedFiles,
    at: at.toISOString()
  }
}

export function formatReportJson(report: GateReport): string {
  return `${JSON.stringify(report, null, 2)}\n`
}
