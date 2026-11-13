#!/usr/bin/env python3
"""生成「纯净可分发目录」——只含 Git 跟踪的程序文件，绝不含运行数据。

用途：需要以文件夹形式分发（拷贝到移动硬盘 / 内网共享 / 网盘）时使用。
直接分发放着 API/.env、history.json、用户素材的运行目录是危险的。

用法：
    python tools/make_release_dir.py                       # 生成到 dist/<版本>-publish
    python tools/make_release_dir.py --output D:/xxx       # 指定目标（也支持 UNC 网络路径）
    python tools/make_release_dir.py --check D:/xxx        # 只检查某个目录是否适合发布
    python tools/make_release_dir.py --force               # 允许重建默认的 dist 生成目录

校验规则统一来自 tools/publish_guard.py，与 make_release_zip.py 完全一致。
"""
from __future__ import annotations

import argparse
import datetime
import os
import shutil
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from make_release_zip import read_version, tracked_files  # noqa: E402
from publish_guard import assert_clean, scan_dir  # noqa: E402


def default_output(version: str) -> str:
    return os.path.join(BASE_DIR, "dist", f"Infinite-Canvas-UDG-{version}-publish")


def check(path: str) -> int:
    total, bad = scan_dir(path)
    print(f"检查目录：{path}")
    print(f"文件总数：{total}")
    if bad:
        print(f"发现 {len(bad)} 个不应发布的文件：")
        for rel, why in bad[:40]:
            print(f"  - {rel} ({why})")
        if len(bad) > 40:
            print(f"  ... 另有 {len(bad) - 40} 项")
        print("结论：不适合直接发布 ❌ 请改用本脚本生成的纯净目录或发布 zip。")
        return 1
    print("结论：干净，可用于发布 ✅")
    return 0


def build(output: str, force: bool, version: str) -> int:
    files = tracked_files()
    total = assert_clean(files)
    print(f"打包清单：{total} 个跟踪文件，发布安全校验通过")

    output = os.path.abspath(output)
    is_default = os.path.normcase(output) == os.path.normcase(
        os.path.abspath(default_output(version))
    )
    if os.path.exists(output):
        if not os.path.isdir(output):
            raise SystemExit(f"目标不是目录：{output}")
        if os.listdir(output):
            # 只对脚本自己生成的默认目录允许重建，避免误删用户指定的目录（含网络共享）
            if force and is_default:
                shutil.rmtree(output)
                print("已清理旧的生成目录")
            else:
                raise SystemExit(
                    "目标目录非空。出于安全考虑不会自动清空自定义目录；"
                    "请换一个空目录，或先自行移走其中内容后重试。"
                )
    os.makedirs(output, exist_ok=True)

    copied = 0
    for rel in files:
        src = os.path.join(BASE_DIR, rel.replace("/", os.sep))
        if not os.path.isfile(src):
            print(f"警告：跟踪文件缺失，已跳过 {rel}", file=sys.stderr)
            continue
        dst = os.path.join(output, rel.replace("/", os.sep))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(src, dst)
        copied += 1

    manifest = os.path.join(output, "PUBLISH_MANIFEST.txt")
    now = datetime.datetime.now().astimezone().isoformat(timespec="seconds")
    with open(manifest, "w", encoding="utf-8", newline="\n") as f:
        f.write(
            "发布物清单 / PUBLISH MANIFEST\n"
            f"版本: {version}\n"
            f"生成时间: {now}\n"
            f"程序文件数: {copied}\n"
            "发布安全校验: 通过（0 个敏感 / 运行时文件）\n"
            "判定规则: tools/publish_guard.py\n\n"
            "本目录只含 Git 跟踪的程序文件，不含 API/.env、history.json、\n"
            "用户素材、运行日志、画布数据等运行时内容，可安全对外分发。\n"
            "请勿直接复制正在运行的工作目录对外发布。\n"
        )

    # 生成后再扫一遍实体目录，防止复制过程中混入额外内容
    scanned, bad = scan_dir(output)
    if bad:
        raise SystemExit(f"生成后复核失败，发现 {len(bad)} 个敏感文件：{bad[:5]}")
    print(f"已生成纯净发布目录：{output}")
    print(f"复核：{scanned} 个文件（含清单），0 个敏感项 ✅")
    print("可整体拷贝/压缩后分发；也可用 --check <目录> 复查任意目标。")
    return 0


def main() -> int:
    version = read_version()
    parser = argparse.ArgumentParser(description="生成不含运行数据的纯净发布目录")
    parser.add_argument("--output", default=default_output(version), help="输出目录（支持 UNC 路径）")
    parser.add_argument("--check", metavar="DIR", help="只检查目录是否适合发布，不生成")
    parser.add_argument("--force", action="store_true", help="允许重建默认的 dist 生成目录")
    args = parser.parse_args()
    if args.check:
        return check(args.check)
    return build(args.output, args.force, version)


if __name__ == "__main__":
    raise SystemExit(main())
