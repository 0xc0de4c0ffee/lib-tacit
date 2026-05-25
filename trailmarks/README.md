# trailmarks — lib-tacit Graph Analysis

Trailmark ([trailofbits/trailmark](https://github.com/trailofbits/trailmark) v0.3.1) graph-database analysis of the tacit protocol reference (`tacit-specs/dapp/`) and library source (`src/`).

## Directory Layout

| Path | Description |
|------|-------------|
| `README.md` | This file — directory index and navigation |
| `run-trailmark.py` | Script that generates all reports and snapshots |
| `trailmark-report.md` | Cross-comparison audit: structural diff, attack surface, preanalysis, entrypoint paths, annotations |
| `diff.json` | Structural diff between lib-tacit src and tacit-specs/dapp (machine-readable) |
| `specs/ref-report.md` | Standalone report for `tacit-specs/dapp/` (reference JavaScript dapp) |
| `specs/ref-graph.json` | Full graph export for `tacit-specs/dapp/` (machine-readable) |
| `specs/ref-graph-entrypoints.md` | Entrypoint classification for tacit-specs/dapp/ |
| `lib-tacit/src-report.md` | Standalone report for `src/` (TypeScript library) |
| `lib-tacit/src-graph.json` | Full graph export for `src/` (machine-readable) |
| `lib-tacit/src-graph-entrypoints.md` | Entrypoint classification for src/ |
| `snapshots/` | Timestamped snapshots for cross-comparing after changes (gitignored) |

## Key Findings Summary

- **Scale**: Reference `tacit-specs/dapp/` — 1792 nodes, 33525 edges; Library `src/` — 1458 nodes, 4054 edges
- **Attack surface**: 21 classified entrypoints (see `trailmark-report.md`)
- **Complexity hotspot**: `bppRangeVerify` at cyclomatic complexity 26 (highest in library)
- **Preanalysis**: 2 findings, 7 subgraphs

## Usage

```bash
# Generate all reports (requires trailmark >= 0.3.1)
python3 trailmarks/run-trailmark.py

# Save a snapshot of current graphs for later comparison
# (saves to trailmarks/snapshots/<timestamp>/, gitignored)
python3 trailmarks/run-trailmark.py --snapshot

# Compare current graphs against a saved snapshot
# Automated in trailmark-report.md via structural diff
```
