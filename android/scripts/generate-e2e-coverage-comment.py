#!/usr/bin/env python3
"""Parse JaCoCo XML coverage report and generate a markdown comment for PR."""
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

REPORT_PATH = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
    "app/build/reports/jacoco/jacocoConnectedTestReport/jacocoConnectedTestReport.xml"
)
OUTPUT_PATH = Path("android-e2e-coverage-comment.md")

METRIC_ORDER = ["LINE", "BRANCH", "METHOD", "CLASS"]
METRIC_LABELS = {
    "LINE": "Lines",
    "BRANCH": "Branches",
    "METHOD": "Methods",
    "CLASS": "Classes",
}


def parse_counters(xml_path: Path) -> dict:
    tree = ET.parse(xml_path)
    root = tree.getroot()
    counters = {}
    for counter in root.findall("counter"):
        type_name = counter.get("type")
        missed = int(counter.get("missed", 0))
        covered = int(counter.get("covered", 0))
        total = missed + covered
        pct = round(covered / total * 100, 2) if total > 0 else 0
        counters[type_name] = {"covered": covered, "total": total, "pct": pct}
    return counters


def generate_comment(counters: dict | None) -> str:
    lines = [
        "## 🧪 Android E2E Coverage Report",
        "",
        "_Informational only — collected from instrumented tests on an API 31 emulator "
        "against the :app module. Hardware-dependent classes (camera, sensors) and generated code are excluded._",
        "",
        "### Android E2E Coverage",
    ]

    if counters:
        lines.append("| Metric | Coverage |")
        lines.append("|--------|----------|")
        for key in METRIC_ORDER:
            if key in counters:
                c = counters[key]
                lines.append(
                    f"| {METRIC_LABELS[key]} | {c['pct']}% ({c['covered']}/{c['total']}) |"
                )
        lines.append("")
        lines.append(
            "_Full HTML report is uploaded as the `android-e2e-coverage` workflow artifact._"
        )
    else:
        lines.append("Coverage data not available.")

    lines.append("")
    return "\n".join(lines)


def main():
    if REPORT_PATH.exists():
        counters = parse_counters(REPORT_PATH)
    else:
        print(f"Warning: {REPORT_PATH} not found, generating empty report", file=sys.stderr)
        counters = None

    comment = generate_comment(counters)
    OUTPUT_PATH.write_text(comment)
    print(f"Coverage comment written to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
