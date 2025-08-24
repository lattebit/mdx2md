#!/bin/bash

# 批量转换 repos/meta.json 中配置的所有仓库

echo "🚀 开始批量转换所有配置的仓库..."
echo ""

# 确保在正确的目录运行
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "📂 工作目录: $(pwd)"
echo ""

# 设置颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 临时目录
TEMP_DIR="/tmp/mdx2md-repos"
mkdir -p $TEMP_DIR

# 统计
SUCCESS=0
FAILED=0
TOTAL=6

# 函数：转换单个仓库
convert_repo() {
  local repo_name=$1
  local url=$2
  local branch=$3
  local use_config=$4
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 处理: $repo_name"
  echo "   URL: $url"
  echo "   分支: $branch"
  
  # 克隆或更新仓库
  CLONE_PATH="$TEMP_DIR/$repo_name"
  
  if [ -d "$CLONE_PATH/.git" ]; then
    echo "   📂 使用已存在的克隆..."
    cd $CLONE_PATH
    git fetch --depth 1 origin $branch 2>/dev/null
    git checkout $branch 2>/dev/null
    cd "$SCRIPT_DIR" > /dev/null
  else
    echo "   📥 克隆仓库..."
    git clone --depth 1 -b $branch $url $CLONE_PATH 2>/dev/null
    
    if [ $? -ne 0 ]; then
      echo -e "   ${RED}❌ 克隆失败${NC}"
      ((FAILED++))
      return 1
    fi
  fi
  
  # 转换文档
  echo "   🔄 转换中..."
  
  if [ "$use_config" = "yes" ]; then
    # 使用配置文件的仓库
    bun src/cli.ts convert --repo-file ../repos/${repo_name}.ts --clone-path $CLONE_PATH 2>&1 | tail -3
  else
    # 直接使用 repo-name
    bun src/cli.ts convert --repo-name $repo_name --clone-path $CLONE_PATH 2>&1 | tail -3
  fi
  
  # 检查输出
  OUTPUT_DIR="output/$repo_name"
  if [ -d "$OUTPUT_DIR" ]; then
    FILE_COUNT=$(find $OUTPUT_DIR -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "   ${GREEN}✅ 成功转换 $FILE_COUNT 个文件${NC}"
    echo "   📁 输出位置: $OUTPUT_DIR"
    ((SUCCESS++))
    return 0
  else
    echo -e "   ${RED}❌ 转换失败或无输出${NC}"
    ((FAILED++))
    return 1
  fi
}

# 转换每个仓库
convert_repo "shadcn-ui" "https://github.com/shadcn-ui/ui" "main" "yes"
echo ""

convert_repo "nextjs" "https://github.com/vercel/next.js" "canary" "yes"
echo ""

convert_repo "hono" "https://github.com/honojs/website" "main" "no"
echo ""

convert_repo "trpc" "https://github.com/trpc/trpc" "main" "no"
echo ""

convert_repo "prisma" "https://github.com/prisma/docs" "main" "no"
echo ""

convert_repo "fastapi" "https://github.com/fastapi/fastapi" "master" "yes"
echo ""

# 总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 转换完成统计："
echo -e "   ${GREEN}✅ 成功: $SUCCESS/$TOTAL${NC}"
if [ $FAILED -gt 0 ]; then
  echo -e "   ${RED}❌ 失败: $FAILED/$TOTAL${NC}"
fi
echo ""

# 显示输出目录大小
echo "💾 输出目录大小："
for repo_name in shadcn-ui nextjs hono trpc prisma fastapi; do
  OUTPUT_DIR="output/$repo_name"
  if [ -d "$OUTPUT_DIR" ]; then
    SIZE=$(du -sh $OUTPUT_DIR 2>/dev/null | cut -f1)
    COUNT=$(find $OUTPUT_DIR -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
    printf "   %-12s: %6s (%3s 个文件)\n" "$repo_name" "$SIZE" "$COUNT"
  fi
done

echo ""
echo "🎉 全部完成！"
echo "   查看所有输出: ls -la output/"
echo "   保留的克隆仓库: $TEMP_DIR"
echo ""
echo "💡 提示："
echo "   - 单独转换某个仓库: ./test-repo.sh <repo-name>"
echo "   - 清理输出目录: rm -rf output/*"
echo "   - 清理克隆缓存: rm -rf $TEMP_DIR"