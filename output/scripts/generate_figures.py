"""HeteroCam Lab presentation diagrams (dark cinematic palette)."""

from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, Rectangle, Polygon, Wedge
import numpy as np

OUT = Path(__file__).resolve().parents[1] / "assets" / "figures"
OUT.mkdir(parents=True, exist_ok=True)

BG = "#0E141C"
INK = "#E8EEF4"
MUTED = "#8B9AA8"
GOLD = "#E4C98A"
CYAN = "#6EE0C5"
ORANGE = "#F0A36B"
BLUE = "#7EB6FF"
SILVER = "#C5CDD8"
LINE = "#2A3540"
CARD = "#1A232E"

PLAT = {
    "PTZ": GOLD,
    "RAIL": SILVER,
    "ROVER": ORANGE,
    "DOG": CYAN,
    "UAV": BLUE,
}

plt.rcParams.update(
    {
        "font.sans-serif": ["Microsoft YaHei", "SimHei", "DengXian", "Arial Unicode MS"],
        "font.family": "sans-serif",
        "axes.unicode_minus": False,
        "figure.facecolor": BG,
        "savefig.facecolor": BG,
        "text.color": INK,
        "axes.edgecolor": LINE,
    }
)


def _fig(w=13.2, h=6.4):
    fig, ax = plt.subplots(figsize=(w, h), dpi=180)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.set_aspect("equal")
    ax.axis("off")
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    return fig, ax


def _box(ax, x, y, w, h, fc, title, sub="", ec=None, tw=11.5, sw=9):
    p = FancyBboxPatch(
        (x, y),
        w,
        h,
        boxstyle="round,pad=0.4,rounding_size=1.2",
        linewidth=1.2,
        edgecolor=ec or fc,
        facecolor=fc if fc != CARD else CARD,
        alpha=0.95,
    )
    ax.add_patch(p)
    ax.text(x + w / 2, y + h * 0.62 if sub else y + h / 2, title, ha="center", va="center", fontsize=tw, color=INK, fontweight="medium")
    if sub:
        ax.text(x + w / 2, y + h * 0.28, sub, ha="center", va="center", fontsize=sw, color=MUTED)
    return p


def _arrow(ax, x1, y1, x2, y2, color=GOLD, lw=1.4):
    ax.add_patch(
        FancyArrowPatch(
            (x1, y1),
            (x2, y2),
            arrowstyle="-|>",
            mutation_scale=12,
            lw=lw,
            color=color,
            shrinkA=2,
            shrinkB=2,
        )
    )


def fig_system():
    fig, ax = _fig()
    _box(ax, 38, 82, 24, 10, CARD, "操作员 / 导演", "键盘 · 鼠标 · 任务模式", ec=GOLD, tw=12)
    _arrow(ax, 50, 82, 50, 74, GOLD)

    _box(ax, 22, 64, 56, 14, CARD, "指挥台 HUD  +  三维视口", "选中机位 · 内外参 · 覆盖指标 · 多路实时画面 · 导出 JSON", ec=CYAN, tw=13)
    _arrow(ax, 50, 64, 50, 51, CYAN)

    _box(ax, 28, 38, 44, 11, CARD, "zustand 仿真核  tick(dt)", "主体轨迹 · 运动学步进 · 可见性 / 基线 / GSD", ec=ORANGE, tw=12)

    # platforms
    items = [
        (6, "PTZ", "0 维位移\n仅云台"),
        (24.5, "RAIL", "1 维滑轨\n+ 云台"),
        (43, "ROVER", "非完整\n轮式"),
        (61.5, "DOG", "近完整\n头部相机"),
        (80, "UAV", "三维飞行\n+ 云台"),
    ]
    for x, name, sub in items:
        _arrow(ax, 50, 38, x + 7, 28.5, PLAT[name])
        _box(ax, x, 16, 14.5, 12, CARD, name, sub, ec=PLAT[name], tw=12, sw=8)

    ax.add_patch(Circle((50, 8.2), 4.2, facecolor="#2a1814", edgecolor="#c4543a", lw=1.4))
    ax.text(50, 8.2, "主体", ha="center", va="center", fontsize=10, color="#f3c14a")
    ax.text(50, 2.4, "摄影棚世界  ·  AABB 障碍  ·  8 字轨迹", ha="center", fontsize=9, color=MUTED)

    fig.savefig(OUT / "fig_system.png", bbox_inches="tight", pad_inches=0.18)
    plt.close(fig)


def fig_framework():
    fig, ax = _fig(13.2, 6.6)
    ax.set_aspect("auto")
    layers = [
        (84, "交互层", "React HUD · 快捷键 · 滑条 · 导出外参", CYAN),
        (66, "渲染层", "R3F Canvas · Studio / Platforms / Feeds · layer 0/1/2", BLUE),
        (50, "仿真核", "store.tick · stepAgent · 任务模式 · 路点 / 编队", ORANGE),
        (34, "几何与视觉", "cameraPose · pointInFront · 遮挡 slab · 覆盖 / GSD", GOLD),
        (18, "类型与世界", "Agent · LIMITS · WORLD.rail · OBSTACLES AABB", SILVER),
    ]
    for y, title, sub, c in layers:
        ax.add_patch(
            FancyBboxPatch((8, y - 6), 84, 13, boxstyle="round,pad=0.3,rounding_size=1.0", lw=1.4, edgecolor=c, facecolor=CARD)
        )
        ax.add_patch(Rectangle((8, y - 6), 1.3, 13, facecolor=c, edgecolor="none"))
        ax.text(14, y + 1.6, title, fontsize=14, color=c, fontweight="medium")
        ax.text(14, y - 2.6, sub, fontsize=11, color=MUTED)
        ax.text(86, y, "↓", ha="center", va="center", fontsize=14, color=LINE)
    ax.text(50, 6, "渲染只读 getState() 写 Object3D；60 Hz 位姿不走 React 调和", ha="center", fontsize=10, color=MUTED)
    fig.savefig(OUT / "fig_framework.png", bbox_inches="tight", pad_inches=0.18)
    plt.close(fig)


def fig_loop():
    fig, ax = _fig(13.2, 5.8)
    ax.set_aspect("auto")
    ax.text(50, 96, "", ha="center", fontsize=1, color=BG)
    steps = [
        (4, "useFrame −3\nSimClock", "dt ≤ 0.05"),
        (24, "tick()\n推进时间", "subjectAt(t)"),
        (44, "stepAgent\n五类运动学", "look-at / 路点"),
        (64, "evaluateMetrics\n视锥·遮挡·基线", "LOCK / GSD"),
        (84, "useFrame −1\n离屏 FBO", "320×180"),
    ]
    for i, (x, title, sub) in enumerate(steps):
        _box(ax, x, 48, 14, 28, CARD, title, sub, ec=GOLD if i < 4 else CYAN, tw=10, sw=9)
        if i < 4:
            _arrow(ax, x + 14.2, 62, steps[i + 1][0] - 0.4, 62, GOLD)
    _box(ax, 24, 12, 52, 22, CARD, "默认通道：轨道相机  layer 0+1+2", "机体相机仅 layer 0  ·  画面条挂在轨道相机前方", ec=BLUE, tw=12)
    _arrow(ax, 91, 48, 50, 35, BLUE)
    fig.savefig(OUT / "fig_loop.png", bbox_inches="tight", pad_inches=0.18)
    plt.close(fig)


def fig_kinematics():
    fig, ax = _fig(13.2, 6.4)
    ax.set_aspect("auto")
    ax.text(50, 96, "", ha="center", fontsize=1, color=BG)
    cols = [
        ("PTZ", GOLD, "固定机位", ["x,z 锁死", "pan / tilt / zoom", "侧机、无法进场"]),
        ("RAIL", SILVER, "吊装滑轨", ["x ∈ [−8.6, 8.6]", "z 钉在轨道", "巡航跟主体 x"]),
        ("ROVER", ORANGE, "轮式机器人", ["unicycle", "不能横移", "先转后走"]),
        ("DOG", CYAN, "拍摄机器狗", ["前进 + 侧移", "脖子 pan 有限", "bodyPitch 耦合"]),
        ("UAV", BLUE, "航拍无人机", ["平面机动", "Q/E 限高 1.4–7.2 m", "巡航绕飞起伏"]),
    ]
    w = 16.6
    for i, (name, c, role, lines) in enumerate(cols):
        x = 4 + i * 19.2
        ax.add_patch(FancyBboxPatch((x, 14), w, 72, boxstyle="round,pad=0.5,rounding_size=1.4", lw=1.5, edgecolor=c, facecolor=CARD))
        ax.add_patch(Circle((x + w / 2, 74), 4.2, facecolor=BG, edgecolor=c, lw=1.6))
        glyph = {"PTZ": "P", "RAIL": "L", "ROVER": "V", "DOG": "D", "UAV": "U"}[name]
        ax.text(x + w / 2, 74, glyph, ha="center", va="center", color=c, fontsize=13)
        ax.text(x + w / 2, 64, name, ha="center", fontsize=13, color=c)
        ax.text(x + w / 2, 57, role, ha="center", fontsize=10, color=MUTED)
        for j, line in enumerate(lines):
            ax.text(x + w / 2, 46 - j * 9, line, ha="center", fontsize=11, color=INK)
    fig.savefig(OUT / "fig_kinematics.png", bbox_inches="tight", pad_inches=0.18)
    plt.close(fig)


def fig_camera():
    fig, ax = plt.subplots(figsize=(13.2, 6.2), dpi=180)
    ax.set_xlim(-0.6, 8.4)
    ax.set_ylim(-0.4, 4.6)
    ax.set_aspect("equal")
    ax.axis("off")
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    ax.set_title("")

    cam = np.array([1.2, 2.2])
    # frustum
    far = np.array([[6.6, 3.9], [6.6, 0.5]])
    poly = np.vstack([cam, far[0], far[1]])
    ax.add_patch(Polygon(poly, closed=True, facecolor=CYAN, alpha=0.12, edgecolor=CYAN, lw=1.3))
    ax.plot(*cam, "o", color=GOLD, ms=10, zorder=5)
    ax.annotate("光学中心 C\ncameraPose()", xy=cam, xytext=(0.05, 3.4), color=GOLD, fontsize=11, arrowprops=dict(arrowstyle="->", color=GOLD))

    chest = np.array([5.4, 1.7])
    ax.plot(*chest, "o", color="#c4543a", ms=9)
    ax.annotate("主体胸部\n(x, 1.12, z)", xy=chest, xytext=(6.5, 2.6), color="#c4543a", fontsize=11, arrowprops=dict(arrowstyle="->", color="#c4543a"))
    ax.plot([cam[0], chest[0]], [cam[1], chest[1]], "--", color=ORANGE, lw=1.2)

    ax.text(3.6, 4.15, "fov_eff = fovY / zoom", color=INK, fontsize=12)
    ax.text(3.6, 3.75, "fy = (resY/2) / tan(fov_eff/2)", color=MUTED, fontsize=11)
    ax.text(0.0, 1.15, "PTZ  +1.38 m\nROVER  1.30 m\nDOG 头前 0.34 m\nRAIL  y=3.96 m\nUAV  机腹 −0.20 m", color=MUTED, fontsize=10, va="top")
    ax.text(3.4, 0.15, "导出 T_wc.t = C，rpy_yxz = (pitch, yaw, 0)；下游 PnP 需先求 T_cw", color=MUTED, fontsize=10)

    fig.savefig(OUT / "fig_camera.png", bbox_inches="tight", pad_inches=0.18)
    plt.close(fig)


def fig_coverage():
    fig, ax = _fig(13.2, 5.9)
    ax.set_aspect("auto")
    ax.text(50, 95, "", ha="center", fontsize=1, color=BG)
    nodes = [
        (6, "pointInFront", "胸部点落在\n针孔矩形内"),
        (28, "slab 遮挡", "光学中心到胸部\nvs AABB"),
        (50, "LOCK / LOST", "seesSubject\n驱动 HUD"),
        (72, "覆盖 / 热力", "地面网格采样\n视锥计数上色"),
    ]
    for i, (x, t, s) in enumerate(nodes):
        _box(ax, x, 52, 20, 28, CARD, t, s, ec=CYAN if i % 2 == 0 else GOLD, tw=12, sw=9)
        if i < 3:
            _arrow(ax, x + 20.3, 66, nodes[i + 1][0] - 0.4, 66)
    _box(ax, 8, 12, 38, 28, CARD, "基线", "同时可见相机两两距离\n平均 / 最短", ec=ORANGE, tw=13)
    _box(ax, 54, 12, 38, 28, CARD, "三角化启发分", "视线夹角相对 60° 的偏差\n映射到 [0, 1]，非协方差", ec=BLUE, tw=13)
    fig.savefig(OUT / "fig_coverage.png", bbox_inches="tight", pad_inches=0.18)
    plt.close(fig)


def fig_render():
    fig, ax = _fig(13.2, 6.0)
    ax.set_aspect("auto")
    ax.text(50, 95, "", ha="center", fontsize=1, color=BG)
    layers = [
        (68, 2, CYAN, "Layer 2", "画面条（挂在轨道相机前方 z=−1.15）"),
        (44, 1, GOLD, "Layer 1", "视锥线 · 覆盖热力 · 立体基线 · 路点"),
        (20, 0, BLUE, "Layer 0", "摄影棚 · 主体 · 五类平台网格"),
    ]
    for y, idx, c, title, sub in layers:
        ax.add_patch(FancyBboxPatch((8, y), 54, 20, boxstyle="round,pad=0.4,rounding_size=1.1", lw=1.5, edgecolor=c, facecolor=CARD))
        ax.text(12, y + 12.5, title, fontsize=14, color=c)
        ax.text(12, y + 6, sub, fontsize=11, color=INK)
    _box(ax, 68, 62, 26, 22, CARD, "轨道相机", "enable 0+1+2", ec=GOLD, tw=12)
    _box(ax, 68, 28, 26, 22, CARD, "各机相机", "仅 layer 0\n干净拍摄画面", ec=CYAN, tw=12)
    _arrow(ax, 62, 73, 68, 73, GOLD)
    _arrow(ax, 35, 20, 68, 38, CYAN)
    ax.text(50, 6, "drei Hud + makeDefault 曾抢走默认相机，主视角近黑；现改为相机父子化画面条", ha="center", fontsize=10, color=MUTED)
    fig.savefig(OUT / "fig_render.png", bbox_inches="tight", pad_inches=0.18)
    plt.close(fig)


def fig_modules():
    fig, ax = _fig(13.2, 6.3)
    ax.set_aspect("auto")
    ax.text(50, 96, "", ha="center", fontsize=1, color=BG)
    left = [
        ("sim/types.ts", "平台种类 · Agent · AABB"),
        ("sim/kinematics.ts", "限幅 · 光学中心 · 8 字轨迹"),
        ("sim/coverage.ts", "视锥 · 遮挡 · 热力 · GSD"),
        ("sim/store.ts", "tick · 输入 · 编队"),
    ]
    right = [
        ("scene/World.tsx", "Canvas · SimClock · Orbit"),
        ("scene/Platforms.tsx", "外形 + PerspectiveCamera"),
        ("scene/Feeds.tsx", "FBO 离屏 + 画面条"),
        ("ui/Hud.tsx", "指挥台 · 导出 JSON"),
    ]
    ax.text(26, 86, "仿真核（无 Three 依赖）", ha="center", color=ORANGE, fontsize=12)
    ax.text(74, 86, "渲染与交互", ha="center", color=CYAN, fontsize=12)
    for i, (a, b) in enumerate(left):
        _box(ax, 6, 64 - i * 16, 40, 13, CARD, a, b, ec=ORANGE, tw=12, sw=9)
    for i, (a, b) in enumerate(right):
        _box(ax, 54, 64 - i * 16, 40, 13, CARD, a, b, ec=CYAN, tw=12, sw=9)
        _arrow(ax, 46.2, 70.5 - i * 16, 53.6, 70.5 - i * 16, GOLD)
    fig.savefig(OUT / "fig_modules.png", bbox_inches="tight", pad_inches=0.18)
    plt.close(fig)


if __name__ == "__main__":
    fig_system()
    fig_framework()
    fig_loop()
    fig_kinematics()
    fig_camera()
    fig_coverage()
    fig_render()
    fig_modules()
    print("wrote", list(OUT.glob("fig_*.png")))
