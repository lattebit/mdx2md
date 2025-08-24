# 添加新仓库快速指南

## 步骤概览

### 1. 创建分支
```bash
git checkout -b repos/你的仓库名
```

### 2. 创建仓库文件夹
```bash
mkdir -p repos/你的仓库名
```

### 3. 创建配置文件
创建 `repos/你的仓库名/meta.json`：

```json
{
  "url": "https://github.com/组织名/仓库名",
  "branch": "main",
  "docsPath": "docs",
  "outputPath": "output/你的仓库名",
  "preset": "docusaurus"
}
```

**配置说明**：
- `url`: GitHub 仓库地址
- `branch`: 文档所在分支（通常是 main 或 master）
- `docsPath`: 文档目录路径（相对于仓库根目录）
- `outputPath`: 输出目录（建议使用 `output/仓库名`）
- `preset`: 文档框架类型，可选值：
  - `docusaurus` - Docusaurus 文档
  - `vitepress` - VitePress 文档
  - `mkdocs` - MkDocs 文档
  - `fumadocs` - Fumadocs 文档

### 4. （可选）添加自定义配置
如果需要自定义转换规则，创建 `repos/你的仓库名/你的仓库名.ts`：

```typescript
import type { Mdx2MdConfig } from '../../mdx2md/src/types';

export function getConfig(repoPath: string, docsPath: string, preset?: string): Mdx2MdConfig {
  return {
    source: `${repoPath}/${docsPath}`,
    output: 'output/你的仓库名',
    preset: preset || 'docusaurus',
    // 自定义配置...
  };
}
```

并在 `meta.json` 中添加：
```json
{
  ...
  "configFile": "你的仓库名.ts"
}
```

### 5. 提交并推送
```bash
git add repos/你的仓库名/
git commit -m "feat: add 你的仓库名 documentation configuration"
git push origin repos/你的仓库名
```

### 6. 创建 PR
- 前往 GitHub 创建 Pull Request
- 自动触发单仓库构建测试
- 查看构建结果和转换的文件数

### 7. 合并到主分支
- PR 审核通过后合并
- 主分支自动运行全量构建

## 实际示例

### 示例 1：添加 Astro 文档
```bash
# 1. 创建分支
git checkout -b repos/astro

# 2. 创建文件夹
mkdir repos/astro

# 3. 创建配置
cat > repos/astro/meta.json << 'EOF'
{
  "url": "https://github.com/withastro/docs",
  "branch": "main",
  "docsPath": "src/content/docs",
  "outputPath": "output/astro",
  "preset": "docusaurus"
}
EOF

# 4. 提交推送
git add repos/astro/
git commit -m "feat: add Astro documentation configuration"
git push origin repos/astro
```

### 示例 2：添加带自定义配置的 Vue 文档
```bash
# 1. 创建分支
git checkout -b repos/vue

# 2. 创建文件夹
mkdir repos/vue

# 3. 创建基础配置
cat > repos/vue/meta.json << 'EOF'
{
  "url": "https://github.com/vuejs/docs",
  "branch": "main",
  "docsPath": "src",
  "outputPath": "output/vue",
  "preset": "vitepress",
  "configFile": "vue.ts"
}
EOF

# 4. 创建自定义配置
cat > repos/vue/vue.ts << 'EOF'
import type { Mdx2MdConfig } from '../../mdx2md/src/types';

export function getConfig(repoPath: string, docsPath: string, preset?: string): Mdx2MdConfig {
  return {
    source: `${repoPath}/${docsPath}`,
    output: 'output/vue',
    preset: preset || 'vitepress',
    corePass: {
      headingOffset: 1,
      rewriteLinks: true
    }
  };
}
EOF

# 5. 提交推送
git add repos/vue/
git commit -m "feat: add Vue documentation with custom config"
git push origin repos/vue
```

## 验证检查清单

提交前确认：
- [ ] `meta.json` 是有效的 JSON 格式
- [ ] 仓库 URL 可访问
- [ ] 指定的分支存在
- [ ] 文档路径正确
- [ ] 选择了合适的 preset
- [ ] 输出路径遵循 `output/仓库名` 格式
- [ ] 如有自定义配置，`configFile` 字段指向正确文件

## 已知问题和注意事项

### 常见配置问题
1. **分支名称**：注意某些仓库使用 `master` 而非 `main`（如 Redux）
2. **文档路径**：
   - React: `src/content` (不是 `docs`)
   - Jest: `website` (不是 `docs`)
   - Docusaurus: `website/docs`
   - Redux: `docs`
   - Playwright: `docs`

### 转换成功率参考
基于 Tier 1 项目的测试结果：
- React: 129/191 文件 (67.5%)
- Jest: 28/96 文件 (29.2%)
- Docusaurus: 2/90 文件 (2.2%)
- Redux: 48/85 文件 (56.5%)
- Playwright: 44/172 文件 (25.6%)

转换成功率较低通常是由于：
- 复杂的 MDX/JSX 组件使用
- HTML 注释语法（需要转换为 `{/* */}`）
- 特殊字符转义问题
- 内联样式中的引号问题

## 常见问题

**Q: 如何确定使用哪个 preset？**
- Docusaurus: 查找 `docusaurus.config.js`
- VitePress: 查找 `.vitepress/config.js`
- MkDocs: 查找 `mkdocs.yml`
- Fumadocs: 查找 `fumadocs.config.js`

**Q: 构建失败怎么办？**
1. 检查 Actions 日志中的错误信息
2. 验证文档路径是否正确
3. 确认仓库和分支可访问
4. 检查 meta.json 格式

**Q: MDX 解析错误如何处理？**
转换过程中常见的 MDX 解析错误类型：
- **Parse Error**: 无法处理的 MDX/JSX 节点类型
- **Syntax Error**: 特殊字符转义问题（如 HTML 注释 `<!--` 在 MDX 中需要用 `{/* */}`）
- **MDX Expression Parse Error**: 无效的 JavaScript 表达式或未闭合的大括号

这些错误不会阻止转换，失败的文件会保留原始内容并添加警告头部。

**Q: 如何手动测试单个仓库？**

方法 1 - 使用 CLI：
```bash
# 列出所有可用仓库
bun run cli list-repos

# 转换特定仓库
bun run cli convert --repo-name fastapi
```

方法 2 - 使用 GitHub Actions：
1. 选择 "Convert Single Repository" 工作流
2. 点击 "Run workflow"
3. 输入仓库名（如 "fastapi"）
4. 运行并查看结果