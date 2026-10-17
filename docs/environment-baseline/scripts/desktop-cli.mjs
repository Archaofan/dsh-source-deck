/** Development carrier adapter: use the official Desktop CLI with explicit development resource paths. */
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const sandboxRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const upstream = join(sandboxRoot, 'upstream');
const runtimeDirectory = join(upstream, 'apps', 'desktop', '.desktop-build', 'development', 'project');
const supportDirectory = join(upstream, 'apps', 'desktop', '.desktop-build', 'targets', 'win-x64', 'runtime');
const homePath = join(sandboxRoot, 'home');
if (process.env.ELECTRON_RUN_AS_NODE !== '1' || !process.versions.electron) {
  throw new Error('Invoke this adapter through the sandbox PowerShell script with its prepared Electron runtime.');
}
if (resolve(process.env.DSH_HOME ?? '') !== homePath) throw new Error('Unexpected DSH_HOME.');
if (!existsSync(join(homePath, 'profiles', 'desktop', 'package.json'))) {
  throw new Error('Start and fully exit the sandbox Desktop once before managing its profile.');
}
if (!existsSync(join(runtimeDirectory, 'desktop-runtime.json'))) throw new Error('Missing official development runtime metadata.');
const argumentsForPnpm = process.argv.slice(2);
if (!['list', 'add', 'remove'].includes(argumentsForPnpm[0])) throw new Error('Only plugin list/add/remove is supported by this sandbox adapter.');
process.argv = [process.execPath, fileURLToPath(import.meta.url), 'plugin', '--profile', 'desktop', ...argumentsForPnpm];
const { runDesktopCli } = await import(pathToFileURL(join(upstream, 'apps', 'desktop-host', 'lib', 'cli.js')).href);
await runDesktopCli(runtimeDirectory, supportDirectory);
