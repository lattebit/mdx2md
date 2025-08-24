# Branching Strategy

## Overview

This repository uses a structured branching strategy to manage documentation conversion for multiple repositories.

## Branch Types

### Main Branch (`main`)
- **Purpose**: Production-ready code with all repositories configured
- **Builds**: Runs full conversion for ALL configured repositories
- **Trigger**: 
  - Daily schedule (2 AM UTC)
  - Manual workflow dispatch
  - Changes to core conversion code
  - After PR merges

### Repository Branches (`repos/*`)
- **Purpose**: Add or update individual repository configurations
- **Naming**: `repos/<repository-name>` (e.g., `repos/fastapi`, `repos/nextjs`)
- **Builds**: Only converts the specific repository being added/modified
- **Workflow**: Creates PRs to main branch

## Workflow Process

### Adding a New Repository

1. **Create a new branch**
   ```bash
   git checkout -b repos/my-new-repo
   ```

2. **Create repository folder and configuration**
   ```bash
   mkdir repos/my-new-repo
   ```

3. **Add `meta.json` configuration**
   ```json
   {
     "url": "https://github.com/org/repo",
     "branch": "main",
     "docsPath": "docs",
     "outputPath": "output/my-new-repo",
     "preset": "docusaurus"
   }
   ```

4. **Optionally add custom configuration file**
   - Create `repos/my-new-repo/my-new-repo.ts` if needed
   - Update `meta.json` to include: `"configFile": "my-new-repo.ts"`

5. **Push and create PR**
   ```bash
   git push origin repos/my-new-repo
   ```
   - The single-repo workflow will automatically run
   - Only your repository will be built and tested
   - Results will be commented on the PR

6. **Merge to main**
   - After PR approval and merge
   - Full build will run on main including all repositories

### Updating an Existing Repository

1. **Create a branch for the specific repo**
   ```bash
   git checkout -b repos/fastapi
   ```

2. **Make changes to the repository configuration**
   - Edit `repos/fastapi/meta.json`
   - Update `repos/fastapi/fastapi.ts` if it exists

3. **Push and create PR**
   - Single-repo workflow runs automatically
   - Validates changes for just that repository

## GitHub Actions Workflows

### `convert-single-repo.yml`
- **Triggers**:
  - Push to `repos/*` branches
  - PRs modifying files in `repos/**`
  - Manual workflow dispatch with repo name
- **Behavior**: Builds only the detected/specified repository
- **Use Case**: Testing and validating individual repository configurations

### `convert-docs.yml`
- **Triggers**:
  - Daily schedule (2 AM UTC)
  - Push to main branch
  - After PR merge to main
  - Manual workflow dispatch
- **Behavior**: Builds ALL configured repositories
- **Use Case**: Production builds with all documentation

## Benefits

1. **Isolated Testing**: Each repository can be tested independently
2. **Faster Feedback**: Single-repo builds are much faster than full builds
3. **Parallel Development**: Multiple repositories can be added simultaneously
4. **Clear History**: Branch names clearly indicate which repository is being modified
5. **Reduced CI Time**: PRs only build what they change

## Example Scenarios

### Scenario 1: Adding FastAPI Documentation
```bash
git checkout -b repos/fastapi
mkdir repos/fastapi
# Create meta.json and optional fastapi.ts
git add repos/fastapi/
git commit -m "Add FastAPI documentation configuration"
git push origin repos/fastapi
# Create PR, wait for single-repo build to pass
# Merge to main, full build runs
```

### Scenario 2: Updating Next.js Configuration
```bash
git checkout -b repos/nextjs
# Edit repos/nextjs/meta.json
git commit -m "Update Next.js docs path"
git push origin repos/nextjs
# PR runs single Next.js build
# After merge, main branch rebuilds all repos
```

### Scenario 3: Manual Single Repository Build
```yaml
# Go to Actions tab in GitHub
# Select "Convert Single Repository"
# Click "Run workflow"
# Enter repository name (e.g., "prisma")
# Click "Run workflow"
```

## Best Practices

1. Always use `repos/<name>` branch naming convention
2. Test your configuration with single-repo workflow before merging
3. Keep repository configurations isolated in their own folders
4. Use descriptive commit messages indicating the repository affected
5. Review workflow artifacts before merging to main
6. Don't modify multiple repositories in a single PR

## Troubleshooting

### Build fails on repos/* branch
- Check `meta.json` is valid JSON
- Verify repository URL and branch exist
- Ensure docs path is correct
- Check preset is supported

### Can't detect repository from branch
- Ensure branch follows `repos/<name>` pattern
- Verify `repos/<name>/meta.json` exists
- Check folder name matches branch suffix

### Full build fails after merge
- Review single-repo build artifacts
- Check for conflicts with other repositories
- Verify all dependencies are installed