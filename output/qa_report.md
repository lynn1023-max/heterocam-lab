# HeteroCam Lab 汇报 PPT 质量记录

- 主文件：`output/final_presentation_cn.pptx`
- 页数：16，16:9
- 配图：8 张系统/框架/运动学/相机/覆盖/渲染/模块图（`output/assets/figures/`）
- 备注：每页都有演讲者备注
- 语言：中文
- 分类：工程方法汇报（problem-to-solution），不是论文组会稿

## 自检

- 第 4 页表格曾因 `Inches(i) * Inches(...)` 把行顶到幻灯片外，已改为 `Inches(0.7 + i * 1.05)`。
- 程序化审计：`output/pptx_audit.md`。修复后无 high；剩余 low 为近邻对齐（约 3–5 pt），属圆角卡片与文字框的有意错缝，未再强行对齐到同一像素。
- 图内大标题已去掉，避免与幻灯片结论式标题重复。
- 未插入仿真截图：当前自动化浏览器访问不到本机 `localhost:5173`。第 14 页用指挥台分区示意代替；现场演示可直接投仿真。

## 打开方式

PowerPoint 打开 `output/final_presentation_cn.pptx`。配图为嵌入位图，框图与标题为原生形状/文本，可在 PowerPoint 里继续改字。
