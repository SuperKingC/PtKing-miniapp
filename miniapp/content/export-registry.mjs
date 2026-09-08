import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = ts.transpileModule(
  `
  import { listTestDefinitions } from '../src/services/testRegistry'
  export const tests = listTestDefinitions()
  `,
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019, esModuleInterop: true, jsx: ts.JsxEmit.React }, fileName: resolve(here, 'export-registry.tmp.ts') },
)
const module = { exports: {} }
const fn = new Function('exports', 'require', 'module', '__filename', '__dirname', source.outputText)
fn(module.exports, require, module, resolve(here, 'export-registry.tmp.js'), here)
const tests = module.exports.tests
if (!Array.isArray(tests) || tests.length === 0) {
  throw new Error('registry export produced no tests')
}
const output = resolve(here, '../../art/generated-art/tests/registry-v1.json')
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, `${JSON.stringify({ version: 1, tests }, null, 2)}\n`)
console.log(`wrote ${tests.length} tests to ${output}`)
