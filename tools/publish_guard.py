#!/usr/bin/env python3
"""发布安全规则（单一来源）。

打包 zip、生成可分发目录、发布前检查三处共用同一套判定，避免
「某条链路漏排除」导致 API/.env、用户素材、历史记录被发布出去。

注意：`static/runninghub/api_providers.json` 是随程序分发的内置模板，
不含密钥，属于正常资源；只有运行时目录下的同名文件才算敏感数据。
"""
from __future__ import annotations

import os

# 运行时状态 / 密钥文件：出现在任何位置都不允许发布
SENSITIVE_NAMES = {
    ".env",
    "history.json",
    "global_config.json",
    "storage_settings.json",
    "asset_library.json",
    "runninghub_workflows.json",
    "shared_folders.json",
    "projects.json",
    "prompt_libraries.json",
    "recommended_providers_seed.json",
}

# 运行时 / 用户数据目录：整目录排除
SENSITIVE_DIR_PREFIXES = (
    "assets/", "data/", "output/", "logs/", "workflows/",
    "conversations/", "dist/", ".git/", "__pycache__/",
)

# 编译产物 / 私钥类后缀
SENSITIVE_SUFFIXES = (".pyc", ".pyo", ".key")

# 明确路径（即便名字不在上面列表里）
SENSITIVE_EXACT = {
    "API/.env",
    "api/.env",
}


def normalize(rel: str) -> str:
    return rel.replace("\\", "/").lstrip("./")


def reason(rel: str) -> str:
    """返回不允许发布的原因；空字符串表示安全。"""
    r = normalize(rel)
    low = r.lower()
    if r in SENSITIVE_EXACT or low.endswith("/.env") or r == ".env":
        return "密钥文件"
    if any(low.startswith(p) for p in SENSITIVE_DIR_PREFIXES):
        return "运行时/用户数据目录"
    if r.split("/")[-1] in SENSITIVE_NAMES:
        return "运行时状态文件"
    if low.endswith(SENSITIVE_SUFFIXES):
        return "编译产物/私钥"
    return ""


def find_sensitive(files) -> list[tuple[str, str]]:
    return [(rel, reason(rel)) for rel in files if reason(rel)]


def assert_clean(files) -> int:
    """打包前硬校验：发现敏感项直接失败，绝不静默跳过。"""
    bad = find_sensitive(files)
    if bad:
        detail = "\n".join(f"  - {r} ({why})" for r, why in bad[:30])
        more = f"\n  ... 另有 {len(bad) - 30} 项" if len(bad) > 30 else ""
        raise SystemExit(
            "发布安全校验失败，以下内容不允许进入发布物：\n" + detail + more
        )
    return len(files)


def scan_dir(root: str) -> tuple[int, list[tuple[str, str]]]:
    """扫描实体目录，返回 (文件总数, 敏感项列表)。用于发布前检查任意目标。"""
    total = 0
    bad: list[tuple[str, str]] = []
    if not os.path.isdir(root):
        raise SystemExit(f"目录不存在：{root}")
    for base, _dirs, names in os.walk(root):
        rel_base = os.path.relpath(base, root).replace("\\", "/")
        for name in names:
            rel = name if rel_base == "." else f"{rel_base}/{name}"
            total += 1
            why = reason(rel)
            if why:
                bad.append((rel, why))
    return total, bad
