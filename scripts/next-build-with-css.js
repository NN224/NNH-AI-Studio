#!/usr/bin/env node
const { spawn } = require('node:child_process')
const { mkdirSync, writeFileSync } = require('node:fs')
const path = require('node:path')

const projectRoot = process.cwd()
const targetDir = path.join(projectRoot, '.next/browser')
const targetFile = path.join(targetDir, 'default-stylesheet.css')
const cssStub = '/* Placeholder default stylesheet generated during build */\n'

function ensureStylesheet() {
  try {
    mkdirSync(targetDir, { recursive: true })
    writeFileSync(targetFile, cssStub, { flag: 'w' })
  } catch (error) {
    console.warn('[Build Helper] Failed to write default-stylesheet.css:', error)
  }
}

ensureStylesheet()
const interval = setInterval(ensureStylesheet, 750)

const child = spawn('next', ['build'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: '',
  },
})

child.on('exit', (code) => {
  clearInterval(interval)
  process.exit(code ?? 1)
})

