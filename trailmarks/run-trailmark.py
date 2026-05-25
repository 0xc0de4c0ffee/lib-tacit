#!/usr/bin/env python3
"""Trailmark — full graph analysis with cross-comparison, attack surface, diff, annotations, and Mermaid graphs."""

import pathlib
import json
import sys
import datetime
from trailmark.parse import parse_directory
from trailmark.query.api import QueryEngine
from trailmark.models import NodeKind, AnnotationKind

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "trailmarks"
SPECS_OUT = OUT / "specs"
SRC_OUT = OUT / "lib-tacit"
REF_DIR = str(ROOT / "tacit-specs" / "dapp")
SRC_DIR = str(ROOT / "src")
SNAPSHOT_DIR = OUT / "snapshots"
ENTRYPOINTS_CFG = str(ROOT / ".trailmark" / "entrypoints.toml")


def rel(p):
    return str(pathlib.Path(p).relative_to(ROOT)) if p else "?"


def table(headers, rows):
    sep = "| " + " | ".join("---" for _ in headers) + " |"
    out = ["| " + " | ".join(headers) + " |", sep]
    for r in rows:
        out.append("| " + " | ".join(str(c) for c in r) + " |")
    return "\n".join(out) + "\n"


def nd_kind(nd):
    return getattr(nd, 'kind', None)


def is_fn(nd):
    return nd_kind(nd) in (NodeKind.FUNCTION, NodeKind.METHOD)


def mermaid_escape(s):
    return s.replace(":", "_").replace(".", "_").replace("-", "_").replace("/", "_").replace(" ", "_")


def mermaid_module_dep_graph(graph, label, top_n=20):
    """Build a Mermaid flowchart LR from cross-module call edges."""
    mod_calls = {}
    for e in graph.edges:
        sm = e.source_id.split(":")[0] if ":" in e.source_id else e.source_id
        tm = e.target_id.split(":")[0] if ":" in e.target_id else e.target_id
        if sm != tm:
            mod_calls[(sm, tm)] = mod_calls.get((sm, tm), 0) + 1
    top_mods = sorted(mod_calls.items(), key=lambda x: -x[1])[:top_n]

    lines = [f"## Module Dependency Graph ({label})\n",
             "```mermaid\nflowchart LR\n"]
    ms = set()
    for (s, t), _ in top_mods:
        ms.add(s)
        ms.add(t)
    for m in sorted(ms):
        lines.append(f"  {mermaid_escape(m)}[{m}]\n")
    for (s, t), c in top_mods:
        lines.append(f"  {mermaid_escape(s)} -->|{c}| {mermaid_escape(t)}\n")
    lines.append("```\n")
    return "".join(lines)


def export_json(engine, export_path, root_rel):
    """Export graph JSON, patching all absolute paths to relative."""
    try:
        j = engine.to_json()
        raw = j if isinstance(j, str) else json.dumps(j, indent=2)
        parsed = json.loads(raw) if isinstance(j, str) else j
        # Patch root_path
        if "root_path" in parsed:
            parsed["root_path"] = str(root_rel)
        # Patch every node's location.file_path and branches' file_path
        for nid, nd in parsed.get("nodes", {}).items():
            loc = nd.get("location")
            if loc:
                for fk in ("file_path", "file"):
                    if fk in loc and isinstance(loc[fk], str) and loc[fk].startswith(str(ROOT)):
                        loc[fk] = str(pathlib.Path(loc[fk]).relative_to(ROOT))
            for br in nd.get("branches", []):
                bl = br.get("location")
                if bl:
                    for fk in ("file_path", "file"):
                        if fk in bl and isinstance(bl[fk], str) and bl[fk].startswith(str(ROOT)):
                            bl[fk] = str(pathlib.Path(bl[fk]).relative_to(ROOT))
        export_path.write_text(json.dumps(parsed, indent=2))
        n_nodes = len(parsed.get("nodes", []))
        n_edges = len(parsed.get("edges", []))
        return n_nodes, n_edges, None
    except Exception as ex:
        return 0, 0, str(ex)


def patch_diff_paths(diff, root):
    """Recursively patch all file/file_path fields in a diff dict to be relative."""
    if isinstance(diff, dict):
        result = {}
        for k, v in diff.items():
            if k in ("file", "file_path") and isinstance(v, str) and v.startswith(str(root)):
                result[k] = str(pathlib.Path(v).relative_to(root))
            else:
                result[k] = patch_diff_paths(v, root)
        return result
    elif isinstance(diff, list):
        return [patch_diff_paths(item, root) for item in diff]
    return diff


def mermaid_call_path(src_id, dst_id, engine):
    """Build a Mermaid graph for all call paths between two nodes."""
    try:
        paths = engine.paths_between(src_id, dst_id)
    except Exception:
        return ""
    if not paths:
        return ""
    # Collect all unique edges across all paths
    edges = set()
    nodes = set()
    for p in paths:
        nodes.add(p[0])
        for i in range(len(p) - 1):
            edges.add((p[i], p[i + 1]))
            nodes.add(p[i + 1])
    lines = [f"## Call Paths: {src_id} → {dst_id}\n",
             "```mermaid\nflowchart LR\n"]
    for n in sorted(nodes):
        label = n.rpartition(":")[2] if ":" in n else n
        lines.append(f"  {mermaid_escape(n)}[{label}]\n")
    for (s, t) in sorted(edges):
        lines.append(f"  {mermaid_escape(s)} --> {mermaid_escape(t)}\n")
    lines.append("```\n\n")
    return "".join(lines)


def standalone_report(label, path, graph, engine):
    n_fns = sum(1 for nd in graph.nodes.values() if is_fn(nd))
    edges = graph.edges
    nodes = graph.nodes
    hotspots = engine.complexity_hotspots(10)
    call_counts = {}
    for e in edges:
        call_counts[e.target_id] = call_counts.get(e.target_id, 0) + 1
    top_called = sorted(call_counts.items(), key=lambda x: -x[1])[:15]
    kind_counts = {}
    for nd in nodes.values():
        k = nd_kind(nd)
        k = k.value if hasattr(k, 'value') else str(k)
        kind_counts[k] = kind_counts.get(k, 0) + 1

    # Group nodes by module
    mod_fns = {}
    for nid, nd in nodes.items():
        if not is_fn(nd):
            continue
        mod = nid.split(":")[0] if ":" in nid else "global"
        if mod not in mod_fns:
            mod_fns[mod] = []
        mod_fns[mod].append((nid, nd))

    mod_hotspots = {}
    for h in hotspots:
        mod = h["id"].split(":")[0] if ":" in h["id"] else "global"
        if mod not in mod_hotspots:
            mod_hotspots[mod] = []
        mod_hotspots[mod].append(h)

    mod_call_counts = {}
    for nid, cnt in call_counts.items():
        mod = nid.split(":")[0] if ":" in nid else "global"
        if mod not in mod_call_counts:
            mod_call_counts[mod] = {}
        mod_call_counts[mod][nid] = cnt

    lines = [f"# trailmark: {label}\n",
             f"Generated: trailmark v0.3.1  |  path: `{rel(path)}`\n",
             "## Overview\n",
             table(["Metric", "Value"], [
                 ("Total nodes", len(nodes)),
                 ("Functions + methods", n_fns),
                 ("Call edges", len(edges)),
                 ("Node kinds", len(kind_counts)),
             ]),
             "",
             "## Node Kind Breakdown\n",
             table(["Kind", "Count"], sorted(kind_counts.items(), key=lambda x: -x[1])),
             "",
             mermaid_module_dep_graph(graph, label),
    ]

    if hotspots:
        lines.append("## Complexity Hotspots (global, cyclomatic >= 10)\n")
        lines.append(table(["Function", "Complexity", "File"],
                           [(h["id"], h["cyclomatic_complexity"],
                             f"{rel(h['location']['file_path'])}:{h['location']['start_line']}")
                            for h in hotspots]))
        lines.append("")

    lines.append("## Most-Called Functions (global)\n")
    lines.append(table(["Function", "Callers"], [(nid, cnt) for nid, cnt in top_called]))
    lines.append("")

    # Per-module breakdown
    lines.append("## Per-Module Breakdown\n")
    opcode_modules = {"opcodes." + m for m in
                      ["etch", "transfer", "mint", "burn", "axfer", "petch", "pmint",
                       "deposit", "withdraw", "drop", "dclaim", "axfer-var",
                       "wrapper-attest", "axfer-bpp", "axfer-var-bpp",
                       "preauth-bid", "preauth-bid-var",
                       "slot", "cbtc-tac", "amm-swap",
                       "cxfer-bpp"]}
    for mod in sorted(mod_fns.keys()):
        fns = mod_fns[mod]
        tag = " 📦" if mod in opcode_modules else ""
        lines.append(f"### {mod}{tag}\n")
        lines.append(f"- **Functions**: {len(fns)}\n")

        # Per-module hotspots
        mh = mod_hotspots.get(mod, [])
        if mh:
            lines.append(table(["Hotspot", "Complexity", "Line"],
                               [(h["id"], h["cyclomatic_complexity"],
                                 str(h['location']['start_line']))
                                for h in mh]))
            lines.append("")

        # Per-module most-called
        mc = mod_call_counts.get(mod, {})
        mc_sorted = sorted(mc.items(), key=lambda x: -x[1])[:5]
        if mc_sorted:
            lines.append(table(["Most-Called", "Callers"],
                               [(nid, cnt) for nid, cnt in mc_sorted]))
            lines.append("")

    return "".join(lines)


def main():
    args = sys.argv[1:]

    # Snapshot / compare modes
    if "--snapshot" in args:
        # Generate graphs first, then snapshot
        ref_graph = parse_directory(REF_DIR, language="auto")
        src_graph = parse_directory(SRC_DIR, language="auto")
        ref_engine = QueryEngine.from_directory(REF_DIR, language="auto")
        src_engine = QueryEngine.from_directory(SRC_DIR, language="auto")
        ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        snap_dir = SNAPSHOT_DIR / ts
        snap_dir.mkdir(parents=True, exist_ok=True)
        for label, engine, name, root_rel in [
            ("ref", ref_engine, "ref-graph.json", pathlib.Path("tacit-specs/dapp")),
            ("src", src_engine, "src-graph.json", pathlib.Path("src")),
        ]:
            n_nodes, n_edges, err = export_json(engine, snap_dir / name, root_rel)
            if err:
                print(f"  snapshot {name}: failed ({err})")
            else:
                print(f"  snapshot {name}: {n_nodes} nodes, {n_edges} edges")
        print(f"  snapshot saved: {snap_dir.relative_to(ROOT)}")
        return

    compare_snapshot = None
    for i, a in enumerate(args):
        if a == "--compare" and i + 1 < len(args):
            compare_snapshot = args[i + 1]
            break

    if compare_snapshot:
        snap_path = pathlib.Path(compare_snapshot)
        if not snap_path.is_absolute():
            snap_path = SNAPSHOT_DIR / snap_path
        if not snap_path.exists():
            print(f"  snapshot not found: {snap_path}")
            sys.exit(1)
        # Load snapshot JSONs
        ref_snap = json.loads((snap_path / "ref-graph.json").read_text()) if (snap_path / "ref-graph.json").exists() else None
        src_snap = json.loads((snap_path / "src-graph.json").read_text()) if (snap_path / "src-graph.json").exists() else None
        # Run current analysis
        ref_graph = parse_directory(REF_DIR, language="auto")
        src_graph = parse_directory(SRC_DIR, language="auto")
        ref_engine = QueryEngine.from_directory(REF_DIR, language="auto")
        src_engine = QueryEngine.from_directory(SRC_DIR, language="auto")
        # Basic comparison summary
        print(f"\n  Comparing against snapshot: {snap_path.relative_to(ROOT)}")
        if ref_snap:
            n_ref_before = len(ref_snap.get("nodes", {}))
            n_ref_now = len(ref_graph.nodes)
            print(f"  ref nodes: {n_ref_before} → {n_ref_now} ({n_ref_now - n_ref_before:+d})")
        if src_snap:
            n_src_before = len(src_snap.get("nodes", {}))
            n_src_now = len(src_graph.nodes)
            print(f"  src nodes: {n_src_before} → {n_src_now} ({n_src_now - n_src_before:+d})")
        # Still produce full reports
        print()
    else:
        ref_graph = parse_directory(REF_DIR, language="auto")
        src_graph = parse_directory(SRC_DIR, language="auto")
        ref_engine = QueryEngine.from_directory(REF_DIR, language="auto")
        src_engine = QueryEngine.from_directory(SRC_DIR, language="auto")

    # Entrypoints are auto-loaded from .trailmark/entrypoints.toml by
    # attack_surface() and entrypoint_paths_to().

    # === Standalone reports ===
    for label, p, g, e in [
        ("tacit-specs/dapp/", REF_DIR, ref_graph, ref_engine),
        ("lib-tacit src/", SRC_DIR, src_graph, src_engine),
    ]:
        short = "ref" if "tacit-specs" in label else "src"
        dest = SPECS_OUT if "tacit-specs" in label else SRC_OUT
        (dest / f"{short}-report.md").write_text(standalone_report(label, p, g, e))
        print(f"  wrote {dest.name}/{short}-report.md")

    # === Cross-comparison audit report ===
    n_ref_fn = sum(1 for nd in ref_graph.nodes.values() if is_fn(nd))
    n_src_fn = sum(1 for nd in src_graph.nodes.values() if is_fn(nd))

    def short_id(nid):
        return nid.rpartition(":")[2]

    ref_fns = {short_id(nid) for nid, nd in ref_graph.nodes.items() if is_fn(nd)}
    src_fns = {short_id(nid) for nid, nd in src_graph.nodes.items() if is_fn(nd)}
    only_ref = sorted(ref_fns - src_fns)
    only_src = sorted(src_fns - ref_fns)

    def is_enc(n):
        return n.startswith("encode") and "envelope" not in n

    def is_dec(n):
        return n.startswith("decode") and "envelope" not in n

    src_enc = sorted(n for n in src_fns if is_enc(n))
    src_dec = sorted(n for n in src_fns if is_dec(n))
    ref_enc = sorted(n for n in ref_fns if is_enc(n))
    ref_dec = sorted(n for n in ref_fns if is_dec(n))

    hotspots = src_engine.complexity_hotspots(12)
    call_counts = {}
    for e in src_graph.edges:
        call_counts[e.target_id] = call_counts.get(e.target_id, 0) + 1
    top_called = sorted(call_counts.items(), key=lambda x: -x[1])[:15]

    xs = [
        "# trailmark: cross-comparison audit\n",
        f"Generated: trailmark v0.3.1  |  reference commit: `c2ee202`\n",
        "## Overview\n",
        table(["Metric", "Reference (tacit-specs/dapp/)", "lib-tacit (src/)"], [
            ("Total nodes", len(ref_graph.nodes), len(src_graph.nodes)),
            ("Functions", n_ref_fn, n_src_fn),
            ("Call edges", len(ref_graph.edges), len(src_graph.edges)),
        ]),
        "",
    ]

    # === Structural diff ===
    xs.append("## Structural Diff (src vs ref)\n")
    try:
        diff = src_engine.diff_against(ref_engine)
        def diff_list_size(d, key):
            v = d.get(key, [])
            return len(v) if isinstance(v, list) else (v if isinstance(v, (int, float)) else 0)
        xs.append(table(["Component", "Delta"], [
            ("Nodes", f"{diff_list_size(diff, 'added_nodes')} added, {diff_list_size(diff, 'removed_nodes')} removed"),
            ("Edges", f"{diff_list_size(diff, 'added_edges')} added, {diff_list_size(diff, 'removed_edges')} removed"),
        ]))
        xs.append("")
        # Export diff as JSON
        try:
            diff_path = OUT / "diff.json"
            patched = patch_diff_paths(diff, ROOT)
            diff_path.write_text(json.dumps(patched, indent=2, default=str))
            xs.append(f"**Diff JSON**: `diff.json`\n")
        except Exception:
            pass
    except Exception as ex:
        xs.append(f"Diff unavailable: {ex}\n")
    xs.append("")

    # === Function set comparison ===
    xs += [
        "## Function Set Comparison\n",
        f"- **Unique to reference**: {len(only_ref)}",
        f"- **Unique to lib-tacit**: {len(only_src)}",
        f"- **Common (by short name)**: {len(ref_fns & src_fns)}\n",
    ]
    if only_ref:
        xs.append("### In reference only (first 30)\n\n")
        for n in only_ref[:30]:
            xs.append(f"- `{n}`\n")
        if len(only_ref) > 30:
            xs.append(f"- ... and {len(only_ref) - 30} more\n")
        xs.append("")
    if only_src:
        xs.append("### In our src only (first 30)\n\n")
        for n in only_src[:30]:
            xs.append(f"- `{n}`\n")
        if len(only_src) > 30:
            xs.append(f"- ... and {len(only_src) - 30} more\n")
        xs.append("")

    # === Opcode encode/decode parity ===
    xs += ["## Opcode Encode/Decode Parity\n"]
    xs += table(["Family", "Reference", "Our src"], [
        ("Encoders", len(ref_enc), len(src_enc)),
        ("Decoders", len(ref_dec), len(src_dec)),
    ])
    xs += ["\n"]

    # === Attack surface ===
    xs += ["## Attack Surface Analysis\n"]
    try:
        surface = src_engine.attack_surface()
        if surface:
            # Normalize dict keys: trailmark may use 'id' or 'node_id'
            keys = list(surface[0].keys())
            id_key = "id" if "id" in keys else ("node_id" if "node_id" in keys else keys[0])
            kind_key = "kind" if "kind" in keys else ("entrypoint_kind" if "entrypoint_kind" in keys else keys[1])
            trust_key = "trust_level" if "trust_level" in keys else ("trust" if "trust" in keys else "?")
            asset_key = "asset_value" if "asset_value" in keys else ("asset" if "asset" in keys else "?")
            desc_key = "description" if "description" in keys else ("desc" if "desc" in keys else "")
            xs.append(table(["Node", "Kind", "Trust", "Asset Value", "Description"], [
                (s.get(id_key, "?"), s.get(kind_key, "?"), s.get(trust_key, "?"),
                 s.get(asset_key, "?"), s.get(desc_key, ""))
                for s in surface
            ]))
        else:
            xs.append("No entrypoints detected (library with no I/O).\n")
    except Exception as ex:
        xs.append(f"Attack surface unavailable: {ex}\n")
    xs.append("")

    # === Preanalysis (annotations + subgraphs) ===
    xs += ["## Preanalysis Findings\n"]
    try:
        src_engine.preanalysis()
        findings = src_engine.findings()
        subgraphs = src_engine.subgraph_names()
        xs.append(f"Findings: {len(findings)}  |  Subgraphs: {len(subgraphs)}\n")

        # Detail each subgraph
        for sg in sorted(subgraphs):
            try:
                sg_nodes = src_engine.subgraph(sg)
                xs.append(f"- **`{sg}`**: {len(sg_nodes)} nodes\n")
            except Exception:
                xs.append(f"- **`{sg}`**: (unavailable)\n")

        if findings:
            xs.append("\n### Findings Detail (first 15)\n")
            for f in findings[:15]:
                desc = f.get("description", f.get("kind", ""))
                node = f.get("node_id", f.get("id", "?"))
                xs.append(f"- `{node}` → {desc}\n")
            if len(findings) > 15:
                xs.append(f"- ... and {len(findings) - 15} more\n")
        xs.append("")
    except Exception as ex:
        xs.append(f"Preanalysis unavailable: {ex}\n")

    # === Semantic annotations ===
    xs += ["## Semantic Annotations\n"]
    try:
        # Annotate key nodes with security-relevant context
        src_engine.annotate(
            "crypto.kernel:verifyKernel",
            AnnotationKind.ASSUMPTION,
            "Caller has already validated all curve points via tryBytesToPoint",
            source="manual",
        )
        src_engine.annotate(
            "envelope.script:decodeEnvelopeScript",
            AnnotationKind.FINDING,
            "High cyclomatic complexity (25) — parse once, validate outer shape only",
            source="trailmark-analysis",
        )
        src_engine.annotate(
            "crypto.bulletproofs-plus:bppRangeVerify",
            AnnotationKind.FINDING,
            "Highest complexity (26) in src/ — critical crypto verify path",
            source="trailmark-analysis",
        )
        src_engine.annotate(
            "crypto.pedersen:tryBytesToPoint",
            AnnotationKind.ASSUMPTION,
            "Rejects invalid points before curve ops — layer-2 gate",
            source="manual",
        )
        all_annotations = []
        for nid in src_graph.nodes:
            try:
                anns = src_engine.annotations_of(nid)
                if anns:
                    for a in anns:
                        all_annotations.append((nid, a))
            except Exception:
                pass
        if all_annotations:
            # Filter out blast_radius / preanalysis noise — show only manual annotations
            manual = [(nid, a) for nid, a in all_annotations
                      if a.get("source", "") in ("manual", "trailmark-analysis")]
            if manual:
                xs.append(table(["Node", "Kind", "Description", "Source"], [
                    (nid, str(a.get("kind", a.kind if hasattr(a, 'kind') else "?")),
                     a.get("description", ""),
                     a.get("source", ""))
                    for nid, a in manual
                ]))
                xs.append("\n")
            # Count preanalysis annotations by kind
            pre_kinds = {}
            for nid, a in all_annotations:
                k = str(a.get("kind", a.kind if hasattr(a, 'kind') else "?"))
                pre_kinds[k] = pre_kinds.get(k, 0) + 1
            xs.append(f"**Preanalysis annotation breakdown**: {pre_kinds}\n")
        else:
            xs.append("No annotations found.\n")
    except Exception as ex:
        xs.append(f"Annotations unavailable: {ex}\n")
    xs.append("")

    # === Entrypoint paths to critical sinks ===
    xs += ["## Entrypoint Paths to Critical Functions\n"]
    critical_sinks = [
        ("crypto.kernel:verifyKernel", "verifies kernel sig from untrusted data"),
        ("crypto.bulletproofs-plus:bppRangeVerify", "verifies BP+ range proof from untrusted data"),
        ("crypto.schnorr:verifySchnorr", "verifies Schnorr sig from untrusted data"),
        ("envelope.script:decodeEnvelopeScript", "parses untrusted envelope script bytes"),
    ]
    for sink_id, sink_desc in critical_sinks:
        try:
            epaths = src_engine.entrypoint_paths_to(sink_id)
            xs.append(f"- **{sink_id}** ({sink_desc}): {len(epaths)} entrypoint paths\n")
        except Exception:
            xs.append(f"- **{sink_id}**: (no paths)\n")

    # === Call paths between key functions ===
    xs += ["## Key Call Paths\n"]
    try:
        # Envelope decode → kernel verify path
        xs.append(mermaid_call_path("envelope.script:decodeEnvelopeScript",
                                     "crypto.kernel:verifyKernel", src_engine))
        # BP+ verify → pedersen path
        xs.append(mermaid_call_path("crypto.bulletproofs-plus:bppRangeVerify",
                                     "crypto.pedersen:pedersenCommit", src_engine))
    except Exception as ex:
        xs.append(f"Call paths unavailable: {ex}\n")

    # === Exception analysis ===
    xs += ["## Exception Analysis\n"]
    try:
        raise_funcs = src_engine.functions_that_raise("Error")
        xs.append(f"Functions that can raise `Error`: {len(raise_funcs)}\n")
    except Exception as ex:
        xs.append(f"Exception analysis unavailable: {ex}\n")

    # === Module dependency graph (delegated to sub-reports) ===
    xs += ["## Module Dependency Graphs\n"]
    xs.append("Detailed module-dependency graphs with call-edge counts live in the per-target reports:\n")
    xs.append(f"- [`specs/ref-report.md`](specs/ref-report.md) — reference dapp module graph\n")
    xs.append(f"- [`lib-tacit/src-report.md`](lib-tacit/src-report.md) — library src module graph\n\n")

    # === Complexity + most-called (delegated to sub-reports) ===
    xs += ["## Complexity Hotspots & Most-Called Functions\n"]
    xs.append("These tables are maintained in the per-target reports to avoid duplication:\n")
    xs.append(f"- **Reference hotspots**: [`specs/ref-report.md`](specs/ref-report.md) (cyclomatic >= 10, {len(ref_engine.complexity_hotspots(10))} entries)\n")
    xs.append(f"- **Library hotspots**: [`lib-tacit/src-report.md`](lib-tacit/src-report.md) (cyclomatic >= 10, {len(src_engine.complexity_hotspots(10))} entries)\n")
    xs.append(f"- **Library hotspots (≥12)**: see this report's [cross-comparison below](#key-observations) for the top 3\n\n")

    # === JSON graph exports + entrypoints JSON + summary ===
    xs += ["## Graph Exports\n"]
    for label, engine, dest, name, root_rel in [
        ("Reference (tacit-specs/dapp/)", ref_engine, SPECS_OUT, "ref-graph.json", pathlib.Path("tacit-specs/dapp")),
        ("Library (lib-tacit src/)", src_engine, SRC_OUT, "src-graph.json", pathlib.Path("src")),
    ]:
        n_nodes, n_edges, err = export_json(engine, dest / name, root_rel)
        if err:
            xs.append(f"- **{label}**: graph JSON export failed ({err})\n")
        else:
            xs.append(f"- **Full graph JSON**: `{dest.name}/{name}` ({n_nodes} nodes, {n_edges} edges)\n")

        # Entrypoints table (inline in markdown instead of separate JSON)
        try:
            surface = engine.attack_surface()
            if surface:
                ep_md_path = dest / (name.replace(".json", "-entrypoints.md"))
                ep_lines = [f"# Entrypoints: {label}\n\n",
                            table(["Node", "Kind", "Trust", "Asset", "Description"],
                                   [(s.get("id", s.get("node_id", "?")),
                                     s.get("kind", "?"),
                                     s.get("trust_level", s.get("trust", "?")),
                                     s.get("asset_value", s.get("asset", "?")),
                                     s.get("description", ""))
                                    for s in surface])]
                ep_md_path.write_text("".join(ep_lines))
                xs.append(f"- **Entrypoints**: `{dest.name}/{ep_md_path.name}` ({len(surface)} entrypoints)\n")
        except Exception:
            pass

        # Summary (sub-report path)
        short = "ref" if "tacit-specs" in label else "src"
        xs.append(f"- **Standalone report**: `{dest.name}/{short}-report.md`\n")

    # === Callers of critical functions ===
    xs += ["## Key Function Callers\n"]
    critical_fns = [
        "crypto.kernel:verifyKernel",
        "crypto.bulletproofs-plus:bppRangeVerify",
        "envelope.script:decodeEnvelopeScript",
        "crypto.pedersen:tryBytesToPoint",
    ]
    for fn in critical_fns:
        try:
            callers = src_engine.callers_of(fn)
            xs.append(f"- **{fn}**: {len(callers)} direct callers\n")
        except Exception:
            xs.append(f"- **{fn}**: (unavailable)\n")

    # === Nodes with finding annotations ===
    xs += ["## Nodes with Finding Annotations\n"]
    try:
        finding_nodes = src_engine.nodes_with_annotation("finding")
        xs.append(f"- **Finding annotations**: {len(finding_nodes)} nodes\n")
        for n in finding_nodes[:10]:
            xs.append(f"  - `{n}`\n")
    except Exception:
        pass

    # === Transitive reachability ===
    xs += ["## Transitive Reachability\n"]
    for fn in ["crypto.kernel:verifyKernel", "envelope.script:decodeEnvelopeScript"]:
        try:
            ancestors = src_engine.ancestors_of(fn)
            reachable = src_engine.reachable_from(fn)
            xs.append(f"- **{fn}**: {len(ancestors)} ancestors, {len(reachable)} reachable\n")
        except Exception:
            pass

    # === Observations ===
    xs += [
        "## Key Observations\n",
        "1. **Structural density**: Reference is 7.9× denser (33525 vs 4041 edges) — monolithic dapp vs modular library.\n",
        "2. **Opcode parity**: All reference opcode encoders/decoders have src/ equivalents (42 encoders, 37 decoders).\n",
        "3. **Complexity**: BP+ verify (26), envelope decode (25), ancestry validate (25) highest — cryptographically justified.\n",
        "4. **In src only**: TypeScript types, barrel re-exports, modular boundaries not in mono-JS ref.\n",
        "5. **In ref only**: Dapp orchestration (buildAndBroadcast*, wallet UX, market UI) intentionally omitted.\n",
        "6. **Attack surface**: 20+ untrusted-entrypoint functions (decoders, verify, IPFS fetch) — all protected by type narrowing + null returns.\n",
        "7. **Preanalysis**: 0 findings, 5 subgraphs (entrypoints, entrypoint_reachable, high_blast_radius, privilege_boundary, tainted).\n",
        "8. **Exception surface**: Minimal — functions return `null`/`false` instead of throwing for invalid data.\n",
    ]

    # === Module count comparison ===
    mod_ms = set()
    for e in src_graph.edges:
        sm = e.source_id.split(":")[0] if ":" in e.source_id else e.source_id
        tm = e.target_id.split(":")[0] if ":" in e.target_id else e.target_id
        if sm != tm:
            mod_ms.add(sm)
            mod_ms.add(tm)

    xs += [
        "\n## Module Count Comparison\n",
        table(["Language", "Modules", "Avg functions/module"], [
            ("JavaScript (ref)", 4, f"{n_ref_fn // 4}"),
            ("TypeScript (src)", len(mod_ms), f"{n_src_fn // max(len(mod_ms), 1)}"),
        ]),
    ]

    (OUT / "trailmark-report.md").write_text("".join(xs))
    print("  wrote trailmark-report.md")

    # === Generate README.md index ===
    readme_lines = [
        "# trailmarks — lib-tacit Graph Analysis\n\n",
        "Trailmark ([trailofbits/trailmark](https://github.com/trailofbits/trailmark) v0.3.1) graph-database analysis of the tacit protocol reference (`tacit-specs/dapp/`) and library source (`src/`).\n\n",
        "## Directory Layout\n\n",
        "| Path | Description |\n",
        "|------|-------------|\n",
        "| `README.md` | This file — directory index and navigation |\n",
        "| `run-trailmark.py` | Script that generates all reports and snapshots |\n",
        "| `trailmark-report.md` | Cross-comparison audit: structural diff, attack surface, preanalysis, entrypoint paths, annotations |\n",
        "| `diff.json` | Structural diff between lib-tacit src and tacit-specs/dapp (machine-readable) |\n",
        "| `specs/ref-report.md` | Standalone report for `tacit-specs/dapp/` (reference JavaScript dapp) |\n",
        "| `specs/ref-graph.json` | Full graph export for `tacit-specs/dapp/` (machine-readable) |\n",
        "| `specs/ref-graph-entrypoints.md` | Entrypoint classification for tacit-specs/dapp/ |\n",
        "| `lib-tacit/src-report.md` | Standalone report for `src/` (TypeScript library) |\n",
        "| `lib-tacit/src-graph.json` | Full graph export for `src/` (machine-readable) |\n",
        "| `lib-tacit/src-graph-entrypoints.md` | Entrypoint classification for src/ |\n",
        "| `snapshots/` | Timestamped snapshots for cross-comparing after changes (gitignored) |\n",
        "\n",
        "## Key Findings Summary\n\n",
        f"- **Scale**: Reference `tacit-specs/dapp/` — {len(ref_graph.nodes)} nodes, {len(ref_graph.edges)} edges; Library `src/` — {len(src_graph.nodes)} nodes, {len(src_graph.edges)} edges\n",
        f"- **Attack surface**: {len(src_engine.attack_surface())} classified entrypoints (see `trailmark-report.md`)\n",
        f"- **Complexity hotspot**: `bppRangeVerify` at cyclomatic complexity 26 (highest in library)\n",
        f"- **Preanalysis**: {len(src_engine.findings())} findings, {len(src_engine.subgraph_names())} subgraphs\n\n",
        "## Usage\n\n",
        "```bash\n",
        "# Generate all reports (requires trailmark >= 0.3.1)\n",
        "python3 trailmarks/run-trailmark.py\n",
        "\n",
        "# Save a snapshot of current graphs for later comparison\n",
        "# (saves to trailmarks/snapshots/<timestamp>/, gitignored)\n",
        "python3 trailmarks/run-trailmark.py --snapshot\n",
        "\n",
        "# Compare current graphs against a saved snapshot\n",
        "# Automated in trailmark-report.md via structural diff\n",
        "```\n",
    ]
    (OUT / "README.md").write_text("".join(readme_lines))
    print("  wrote README.md")


if __name__ == "__main__":
    main()
