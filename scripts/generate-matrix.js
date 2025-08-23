#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function generateMatrix() {
  const reposDir = path.join(process.cwd(), 'repos');
  const metaPath = path.join(reposDir, 'meta.json');
  
  if (!fs.existsSync(metaPath)) {
    console.error('repos/meta.json not found');
    process.exit(1);
  }
  
  // Read meta.json
  const metaContent = fs.readFileSync(metaPath, 'utf-8');
  const meta = JSON.parse(metaContent);
  
  const repos = [];
  
  // Process each repository from meta.json
  for (const [key, repoInfo] of Object.entries(meta.repositories)) {
    // If configFile is specified, check if it exists
    if (repoInfo.configFile) {
      const configFile = path.join(reposDir, repoInfo.configFile);
      
      // Check if config file exists
      if (!fs.existsSync(configFile)) {
        console.error(`Config file not found: ${configFile}`);
        continue;
      }
    }
    
    repos.push({
      name: key,
      file: repoInfo.configFile ? `repos/${repoInfo.configFile}` : null,
      url: repoInfo.url,
      branch: repoInfo.branch,
      docsPath: repoInfo.docsPath,
      output: repoInfo.outputPath,
      preset: repoInfo.preset
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