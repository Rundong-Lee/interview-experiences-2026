# 算法学习看板

跨公司、跨秋招春招的个人算法题库。当前已整理字节面经，默认开发岗常规算法，按资料中的去重来源数排序。支持常用方法分类、个人总结、Python 代码、练习记录和复写状态。

## 换设备继续学习

需要 Git 和 Python 3.10 或更新版本；只使用 Python 标准库，不需要安装依赖。使用有权限访问本仓库的 GitHub 账号。

首次使用：

```sh
git clone https://github.com/Rundong-Lee/interview-experiences-2026.git
cd interview-experiences-2026
python -X utf8 算法/serve_board.py --open
```

Windows 也可直接双击 `算法/启动看板.cmd`。macOS/Linux 如无 `python` 命令，改用 `python3`。

打开 http://127.0.0.1:8766/ 。终端运行期间可使用看板，Ctrl+C 停止服务。不要直接双击 HTML，GitHub 页面也不能代替本机保存服务。

## 每次学习前后

**开始前**：确保上一台设备已保存、提交、推送；关闭本机看板服务，在仓库根目录执行：

```sh
git pull --ff-only
python -X utf8 算法/serve_board.py --open
```

**结束后**：先在页面点击“保存总结与状态”或“保存这次练习”，关闭页面并停止服务，在仓库根目录执行：

```sh
git add -- 算法/study.json
git commit -m "更新算法练习进度"
git push
```

没有进度变化时无需提交。页面保存只写入本机文件，**不会自动推送 GitHub**。换设备后先拉取再启动；不要同时在两台设备修改进度。

如果拉取/推送因冲突失败，先保留两边文件，请 Agent 合并练习记录后再同步；不要强推、不要用 reset --hard 丢弃记录。启动时端口占用说明可能已有看板运行，先关闭旧服务。

## 文件

- `study.json`：唯一学习进度，包含题目、总结、代码与练习记录。
- `board.html` / `board.js` / `serve_board.py`：看板界面和本机保存服务。
- `curated-bytedance.txt` / `bytedance-catalog.json`：人工核对的题目与原文行号证据。
- `字节全量频率表.txt`：静态的字节开发岗频率参考；动态筛选以看板为准。
- `backups/`：每次保存的本机备份，已忽略，不上传。

频率按同题同来源去重，4 组疑似转载保守合并，不等于真实面试命中概率。原文行号不是力扣题号。题意不完整、口述、笔试和模型实现单独筛选。页面浏览和讲解不自动算作掌握。
