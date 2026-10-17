/**
 * SourceDeck build: the Node half plus the browser half.
 *
 * The browser half is the lazy-CJS factory artifact the client module system
 * expects: a script that registers the package with the page module loader via
 * `window.__ModuleLoader__.load({ id, factory: (require) => ... })`. This is a
 * local reproduction of the preset documented in the RC cookbook
 * (docs/cookbook/adding-a-settings-card.zh.md section 5), which states the
 * `clientBundle` preset is not published and out-of-tree packages must
 * reproduce this build step.
 *
 * Externals: the browser bundle requests exactly the shell baseline module
 * table rows (PLATFORM_MODULES in packages/client/web/src/platform.ts of the
 * fixed RC); every other specifier is inlined. The Node half keeps its peer
 * dependencies as imports and inlines everything else.
 */
import { transform } from 'lightningcss'
import { readFile } from 'node:fs/promises'
import { defineConfig, type UserConfig } from 'tsdown'

const ID = 'dsh-source-deck'

/** Shell-seeded module table rows, mirrored from the fixed RC. */
const CLIENT_EXTERNALS: ReadonlySet<string> = new Set([
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  'zod',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
])

/** Node-half imports that stay external: the package's own peer dependencies. */
const NODE_EXTERNALS: readonly string[] = [
  '@deepseek-ai/dsh',
  '@deepseek-ai/dsh-session',
  '@deepseek-ai/dsh-typert-protocol',
  '@deepseek-ai/cordis',
]
const isNodeExternal = (specifier: string): boolean =>
  NODE_EXTERNALS.some(name => specifier === name || specifier.startsWith(`${name}/`))

/**
 * Compile one CSS Module into an injector module: the hashed class map is the
 * default export, and executing the module appends the tagged stylesheet once.
 * @param fileId - physical stylesheet path, used for the style tag identity.
 * @param source - stylesheet text.
 * @returns the virtual module source.
 */
function cssModuleSource(fileId: string, source: Buffer): string {
  const { code, exports: cssExports } = transform({
    filename: fileId,
    code: source,
    cssModules: { pattern: '[hash]_[local]' },
    minify: true,
  })
  const classMap: Record<string, string> = {}
  for (const [local, exported] of Object.entries(cssExports ?? {})) classMap[local] = exported.name
  const tagId = `${ID}/${fileId.split(/[/\\]/).pop()}`
  return [
    `const css = ${JSON.stringify(code.toString())};`,
    `const tagId = ${JSON.stringify(tagId)};`,
    'if (typeof document !== \'undefined\' && document.querySelector(\'style[data-plugin-css=\' + JSON.stringify(tagId) + \']\') === null) {',
    '  const tag = document.createElement(\'style\');',
    `  tag.dataset.plugin = ${JSON.stringify(ID)};`,
    '  tag.dataset.pluginCss = tagId;',
    '  tag.textContent = css;',
    '  document.head.appendChild(tag);',
    '}',
    `export default ${JSON.stringify(classMap)};`,
  ].join('\n')
}

const cssModulesPlugin: UserConfig['plugins'] = [{
  name: 'dsh-source-deck-css-modules',
  resolveId(source: string, importer: string | undefined) {
    if (!source.endsWith('.module.css') || importer === undefined) return null
    const absolute = new URL(source, `file://${importer}`).pathname.replace(/^\/([A-Za-z]:)/, '$1')
    return `\0dsh-deck-css:${absolute}.mjs`
  },
  async load(id: string) {
    if (!id.startsWith('\0dsh-deck-css:')) return null
    const fileId = id.slice('\0dsh-deck-css:'.length, -'.mjs'.length)
    this.addWatchFile(fileId)
    return cssModuleSource(fileId, await readFile(fileId))
  },
}]

/** The Node half: the profile Loader imports this artifact. */
const nodeConfig: UserConfig = {
  name: ID,
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  clean: true,
  sourcemap: true,
  dts: false,
  outputOptions: {
    entryFileNames: '[name].js',
  },
  deps: {
    neverBundle: isNodeExternal,
    alwaysBundle: (specifier: string) => !isNodeExternal(specifier),
  },
}

/** The browser half: the lazy-CJS factory artifact, mounted from the bare package name. */
const clientConfig: UserConfig = {
  name: `${ID}/client`,
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: ['cjs'],
  platform: 'browser',
  target: 'es2024',
  clean: false,
  sourcemap: true,
  dts: false,
  inputOptions: {
    resolve: {
      conditionNames: ['production', 'browser', 'import', 'module', 'default'],
    },
  },
  define: {
    'process.env.NODE_ENV': '"production"',
    'import.meta.env.MODE': '"production"',
    'import.meta.env': '{"MODE":"production"}',
  },
  deps: {
    neverBundle: (specifier: string) => CLIENT_EXTERNALS.has(specifier),
    alwaysBundle: (specifier: string) => !CLIENT_EXTERNALS.has(specifier),
  },
  plugins: [{
    // Build-time mirror of the cross-plugin value import ban: anything under
    // @deepseek-ai/ that is not a shell baseline row must be inlined, never
    // requested from the module table under a name the table cannot answer.
    name: 'dsh-source-deck-client-purity',
    resolveId(source: string) {
      if (!source.startsWith('@deepseek-ai/')) return null
      if (CLIENT_EXTERNALS.has(source)) return null
      // The Remote contribution factory is a self-contained wire layer with no
      // shared runtime identity; upstream's INLINE_SAFE list names this exact
      // subpath, and the plugin owns the contribution it constructs.
      if (source === '@deepseek-ai/dsh-typert-protocol/remote-info') return null
      throw new Error(
        `client bundle purity: "${source}" is not a shell baseline module row; `
        + 'cross-plugin value imports are forbidden, collaborate through cordis services or import types only',
      )
    },
  }, ...cssModulesPlugin],
  outputOptions: {
    entryFileNames: 'client.js',
    banner: (chunk) => `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, ${chunk.isEntry ? '' : `chunk: ${JSON.stringify(chunk.fileName)}, `}factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

export default defineConfig([nodeConfig, clientConfig])
