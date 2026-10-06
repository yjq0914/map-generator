# Flappy 地图生成研究

保存两条实验分支的源码、规则、设计说明和部分结果索引。

| 目录 | 内容 | 状态 |
|---|---|---|
| `c006/` | 请求驱动的自适应生成器及 c006 暂停检查点 | c001–c005 已终判；c006 正式槽 171/192 已结算，未终判、未采用。接受入口仍由 `c006/ACCEPTED.json` 指向 c005 |
| `r10/` | 组合整图生成器 revision10、压力/节奏 skill、四轮改进记录 | 实验版本；报告记录两张连续 120 秒模拟通关地图，不代表真人体验或任意输入合格 |

两套源码独立保存，尚未完成旧经验向 r10 的系统整合。它们的版本编号不在同一序列中。

## 阅读入口

- 自适应分支：`c006/PLAN.zh-CN.md`、`PROGRESS.zh-CN.md`、`STATUS.json`、`ACCEPTED.json`、`outer/c006/PLAN.zh-CN.md`。
- 最新整图分支：`r10/README.md`、`SKILL.md`、`integration/runs/stage-pressure/REPORT.zh-CN.md`。
- r10 生成入口：`r10/integration/generator.py`，依赖 Python 标准库及 Node.js 20+；绘图额外需要 matplotlib。

```sh
cd r10
python -X utf8 integration/generator.py --experimental --revision 10 --seed 7703 --duration 120 --difficulty medium --theme signal --holdout --out new-map.json
```

这条命令生成地图，未替代物理验证。Windows 使用 `-X utf8`，避免默认 GBK 无法编码地图中的字符；输出文件应不存在。c006 的 STOP 与暂停状态原样保留，本次导入未恢复实验或启动新批次。

## 导入范围与复现限制

来源归档：

- `Flappy-adaptive-general-c006-interrupted-evidence.tar.gz`
- `combo-stage-pressure-r10-9e8e288-available-source-evidence.zip`

源码按原字节复制。保留代码、规则、配置、测试、说明、部分小型报告和示例地图；不提交完整逐帧轨迹、输入流、图片、原始账本、嵌套归档、Git bundle 及大型派生报告。所有源包成员的 SHA-256、大小及是否导入见根目录 `IMPORT-INVENTORY.json`。

子目录中的原清单、报告和路径引用保持历史原文，可能引用此次未提交的证据。原清单描述的是完整来源包，不能直接作为本仓库完整性清单。依赖省略证据的测试和归约流程需要原始归档；本次未声称完整实验可复现，也未重新验证历史通关结论。

r10 的旧组合库接口仍缺部分 schemas 与历史资格资料；保留的实验整图生成链和该旧库接口应分别判断。十二轮旧经验包与早期三层组合库未作为第三套内容加入此次提交。
