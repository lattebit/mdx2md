#!/usr/bin/env node

/**
 * Custom repository processor that extends mdx2md with repository-specific logic
 * This keeps the mdx2md package clean while allowing custom extensions
 */

const path = require('path');
const { spawn } = require('child_process');

// Get repository name from command line
const args = process.argv.slice(2);
const repoConfigIndex = args.indexOf('--repo-file');

if (repoConfigIndex === -1 || !args[repoConfigIndex + 1]) {
  console.error('Usage: node process-repo.js --repo-file <config-file> [other-options]');
  process.exit(1);
}

const configFile = args[repoConfigIndex + 1];
const repoName = path.basename(configFile, '.ts');

console.log(`Processing repository: ${repoName}`);

// Adjust the config file path to be absolute
const absoluteConfigFile = path.resolve(process.cwd(), configFile);
const adjustedArgs = [...args];
adjustedArgs[repoConfigIndex + 1] = absoluteConfigFile;

// Special handling for specific repositories can be added here
// For now, just pass through to the mdx2md CLI

const mdx2mdPath = path.join(__dirname, '..', 'mdx2md', 'src', 'cli.ts');
const tsxPath = path.join(__dirname, '..', 'mdx2md', 'node_modules', '.bin', 'tsx');

const child = spawn(tsxPath, [mdx2mdPath, 'convert', ...adjustedArgs], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..', 'mdx2md')
});

child.on('exit', (code) => {
  process.exit(code);
});