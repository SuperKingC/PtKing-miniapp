import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import Module from 'node:module'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const ts = require('typescript')
const compilerOptions = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2019,
  esModuleInterop: true,
  jsx: ts.JsxEmit.React,
}

function compileTs(filename) {
  const source = readFileSync(filename, 'utf8')
  return ts.transpileModule(source, { compilerOptions, fileName: filename }).outputText
}

Module._extensions['.ts'] = (module, filename) => {
  module._compile(compileTs(filename), filename)
}
Module._extensions['.tsx'] = (module, filename) => {
  module._compile(compileTs(filename), filename)
}

const originalResolve = Module._resolveFilename
Module._resolveFilename = function resolveTs(request, parent, isMain, options) {
  try {
    return originalResolve.call(this, request, parent, isMain, options)
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND' || extname(request)) throw error
    for (const ext of ['.ts', '.tsx']) {
      try {
        return originalResolve.call(this, `${request}${ext}`, parent, isMain, options)
      } catch {
        // try next TypeScript extension
      }
    }
    throw error
  }
}

const { listTestDefinitions } = require(resolve(here, '../src/services/testRegistry.ts'))
const tests = listTestDefinitions()
if (!Array.isArray(tests) || tests.length === 0) {
  throw new Error('registry export produced no tests')
}

const output = process.env.PTKING_REGISTRY_OUT
  ? resolve(process.env.PTKING_REGISTRY_OUT)
  : resolve(here, '../../art/generated-art/tests/registry-v1.json')
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, `${JSON.stringify({ version: 1, tests })}\n`)
console.log(`wrote ${tests.length} tests to ${output}`)
