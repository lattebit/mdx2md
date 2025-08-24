#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function generateMatrix() {
  const reposDir = path.join(process.cwd(), 'repos');
  const repos = [];
  
  // Read all directories in repos/
  const dirs = fs.readdirSync(reposDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  // For each directory, read its meta.json
  for (const dir of dirs) {
    const metaPath = path.join(reposDir, dir, 'meta.json');
    
    if (!fs.existsSync(metaPath)) {
      console.error(`meta.json not found for ${dir}`);
      continue;
    }
    
    const metaContent = fs.readFileSync(metaPath, 'utf-8');
    const meta = JSON.parse(metaContent);
    
    // Check if a config file exists
    let file = null;
    if (meta.configFile) {
      const configPath = path.join(reposDir, dir, meta.configFile);
      if (fs.existsSync(configPath)) {
        file = path.join('repos', dir, meta.configFile);
      }
    }
    
    repos.push({
      name: dir,
      file: file,
      url: meta.url,
      branch: meta.branch,
      docsPath: meta.docsPath,
      output: meta.outputPath,
      preset: meta.preset
    });
  }
  
  // Output JSON for GitHub Actions matrix
  const matrix = { repo: repos };
  console.log(JSON.stringify(matrix));
}

generateMatrix().catch(error => {
  console.error('Error generating matrix:', error);
  process.exit(1);
});