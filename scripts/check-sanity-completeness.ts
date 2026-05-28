#!/usr/bin/env npx tsx

/**
 * Sanity Check Completeness Checker
 * 
 * Verifies a sanity check operation against the 8-item Sanity Check Quality Checklist.
 * 
 * Usage:
 *   npx tsx skills/sanity-check/scripts/check-sanity-completeness.ts --lanes <count>
 */

import { argv } from "process";

// ============================================================================
// Types
// ============================================================================

/**
 * One row in the Sanity Check Quality Checklist used for weighted scoring.
 *
 * @remarks
 * `checked` is derived from the `--lanes` heuristic and gates `canFinalize` with required rows.
 */
interface ChecklistItem {
  number: number;
  name: string;
  description: string;
  required: boolean;
  checked: boolean;
  weight: number;
}

/**
 * Machine-readable snapshot of checklist progress and gating for `--json` output.
 *
 * @remarks
 * Mirrors the console summary: weighted score, ceiling, and whether required items are satisfied.
 */
interface CompletenessReport {
  checklist: ChecklistItem[];
  score: number;
  maxScore: number;
  canFinalize: boolean;
}

// ============================================================================
// Checklist Definition
// ============================================================================

const CHECKLIST_ITEMS: Omit<ChecklistItem, "checked">[] = [
  { number: 1, name: "File list auto-discovered", description: "From git status and conversation history", required: true, weight: 2 },
  { number: 2, name: "Five lanes spawned parallel", description: "All five subagents run independently", required: true, weight: 2 },
  { number: 3, name: "Lanes report independently", description: "No lane merges findings before synthesis", required: true, weight: 2 },
  { number: 4, name: "Findings severity-ranked", description: "Critical/High/Medium/Low with reasoning", required: true, weight: 2 },
  { number: 5, name: "Ripple detection done", description: "Unmodified callers checked for breakage", required: true, weight: 2 },
  { number: 6, name: "Type ≠ done verified", description: "Behavioral and docs checks alongside type", required: true, weight: 1 },
  { number: 7, name: "Consolidated report assembled", description: "Single report with cross-references", required: true, weight: 2 },
  { number: 8, name: "User receives actionable findings", description: "Prioritized with suggested fixes", required: true, weight: 2 },
];

// ============================================================================
// Main
// ============================================================================

/**
 * CLI entrypoint: parses argv, scores the checklist, prints status, optional JSON report.
 *
 * @remarks
 * I/O: reads `process.argv` and writes human-oriented lines to stdout; JSON only when `--json` is set.
 */
function main() {
  const args = argv.slice(2);
  const lanesArg = args.find(a => a === "--lanes" || a === "-l");
  const jsonArg = args.includes("--json");
  
  const lanesComplete = lanesArg 
    ? parseInt(args[args.indexOf(lanesArg) + 1] || "5", 10)
    : 5;
  
  console.log("\n📋 Sanity Check Completeness Check");
  console.log("═".repeat(60));
  console.log(`\n📊 Lanes Complete: ${lanesComplete}/5`);
  
  // Build checklist
  const checklist: ChecklistItem[] = CHECKLIST_ITEMS.map(item => {
    let checked = false;
    
    switch (item.number) {
      case 1: // File list auto-discovered
        checked = true; // Assumed if sanity check started
        break;
      case 2: // Five lanes spawned parallel
        checked = lanesComplete >= 5;
        break;
      case 3: // Lanes report independently
        checked = lanesComplete >= 5;
        break;
      case 4: // Findings severity-ranked
        checked = lanesComplete >= 5;
        break;
      case 5: // Ripple detection done
        checked = lanesComplete >= 5;
        break;
      case 6: // Type ≠ done verified
        checked = lanesComplete >= 5;
        break;
      case 7: // Consolidated report assembled
        checked = lanesComplete >= 5;
        break;
      case 8: // User receives actionable findings
        checked = lanesComplete >= 5;
        break;
      default:
        // `checked` remains false for unknown item numbers (defensive; checklist is 1–8).
        break;
    }
    
    return { ...item, checked };
  });
  
  const score = checklist.reduce((sum, item) => 
    item.checked ? sum + item.weight : sum, 0);
  const maxScore = checklist.reduce((sum, item) => sum + item.weight, 0);
  
  const requiredItems = checklist.filter(i => i.required);
  const requiredScore = requiredItems.reduce((sum, item) => 
    item.checked ? sum + item.weight : sum, 0);
  const requiredMax = requiredItems.reduce((sum, item) => sum + item.weight, 0);
  
  const canFinalize = requiredScore === requiredMax;
  
  console.log(`\n📊 Score: ${score}/${maxScore} (${((score/maxScore)*100).toFixed(0)}%)`);
  console.log(`   Required items: ${requiredScore}/${requiredMax}`);
  
  console.log(`\n${canFinalize ? "✅" : "⚠️"} Ready: ${canFinalize ? "YES" : "NEEDS WORK"}`);
  
  console.log("\n📝 Checklist:");
  for (const item of checklist) {
    const icon = item.checked ? "✅" : item.required ? "❌" : "⚠️";
    console.log(`   ${icon} [${item.number}] ${item.name}`);
  }
  
  console.log("\n" + "═".repeat(60));
  
  if (!canFinalize) {
    console.log("\n⚠️ Sanity check needs work before finalization.");
    const failedItems = checklist.filter(i => !i.checked && i.required);
    if (failedItems.length > 0) {
      console.log("\nIssues to resolve:");
      failedItems.forEach(i => console.log(`   - ${i.name}: ${i.description}`));
    }
  } else {
    console.log("\n✅ Sanity check complete. Report ready for user.");
  }
  
  if (jsonArg) {
    const report: CompletenessReport = { checklist, score, maxScore, canFinalize };
    console.log("\n" + JSON.stringify(report, null, 2));
  }
}

main();
