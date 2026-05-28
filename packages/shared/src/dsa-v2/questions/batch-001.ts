// DSA v2 — Batch 001 (launch pilot, 10 questions).
//
// Hand-authored by Claude (Opus 4.7). Every question is fresh original
// framing — no LeetCode or third-party text. Difficulty mix and bucket
// distribution intentionally biased to validate the progressive-reveal
// UX before we scale to 25/batch.
//
// All status = "pending_review" — admin must approve each before live.

import type { DsaV2Question } from "../types";

export const BATCH_001: readonly DsaV2Question[] = [
  // ──────────────────────────────────────────────────────────────────────
  // 1 — pure_dsa · arrays_hashing · easy · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "daily-balance-snapshot",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 1,
    pattern: "arrays_hashing",
    difficulty: "easy",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer", "full_stack_engineer"],
    title: "Daily Balance Snapshot",
    framing:
      "An internal finance dashboard wants to display the end-of-day balance for every account that appeared in today's batch of ledger postings. You receive the day's postings as a flat list and must compute one final number per account in one pass.",
    statement:
      "You are given a list of postings. Each posting is a pair (account_id, delta) where delta is a signed integer representing money credited (positive) or debited (negative) from the account on that line. Return the end-of-day balance for each account that appears at least once in the postings, sorted by account_id ascending.",
    inputFormat:
      "An integer n (1 ≤ n ≤ 10^5) followed by n pairs. Each pair has a string account_id (length 1–16, lowercase alphanumeric) and an integer delta (−10^9 ≤ delta ≤ 10^9).",
    outputFormat:
      "A list of (account_id, balance) pairs sorted lexicographically by account_id. Each balance fits in a signed 64-bit integer.",
    constraints: [
      "1 ≤ n ≤ 100,000",
      "|delta| ≤ 1,000,000,000 per line",
      "Account ids are case-sensitive ASCII strings up to 16 chars",
      "An account with a net balance of 0 must still appear if it had any postings",
    ],
    examples: [
      {
        input: "5\nacme +500\nbeta -200\nacme -100\nbeta +200\ngamma +1000",
        output: "acme 400\nbeta 0\ngamma 1000",
        explanation:
          "acme: 500 − 100 = 400. beta: −200 + 200 = 0 (still listed because it had postings). gamma: +1000.",
      },
      {
        input: "3\nx +1\nx -1\nx -1",
        output: "x -1",
        explanation: "Single account with three postings. Net = −1.",
      },
    ],
    approach: [
      "Frequency-map (or rather sum-map) the postings: walk the list once, accumulating each account's delta into a hash table keyed by account_id.",
      "After the single pass, extract the entries, sort by key, and return them as (id, balance) pairs.",
      "Use a 64-bit integer for the running sum — up to 10^5 deltas of size 10^9 can overflow 32-bit.",
    ],
    solutionSteps: [
      "Initialize an empty hash map balances : str → int64.",
      "For each (account_id, delta) in the input, do balances[account_id] += delta. Insertion-or-update is O(1) amortized.",
      "Collect the items, sort by account_id lexicographically — O(k log k) where k is the number of distinct accounts.",
      "Emit each pair in the sorted order.",
      "Total work: O(n + k log k) time, O(k) extra space.",
    ],
    code: {
      python: `from collections import defaultdict
from typing import Iterable

def daily_balance_snapshot(postings: Iterable[tuple[str, int]]) -> list[tuple[str, int]]:
    balances: dict[str, int] = defaultdict(int)
    for account_id, delta in postings:
        balances[account_id] += delta
    return sorted(balances.items())
`,
      java: `import java.util.*;

public final class DailyBalanceSnapshot {
    public static List<Map.Entry<String, Long>> compute(List<String[]> postings) {
        Map<String, Long> balances = new HashMap<>();
        for (String[] p : postings) {
            balances.merge(p[0], Long.parseLong(p[1]), Long::sum);
        }
        List<Map.Entry<String, Long>> out = new ArrayList<>(balances.entrySet());
        out.sort(Map.Entry.comparingByKey());
        return out;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<pair<string, long long>> dailyBalanceSnapshot(
    const vector<pair<string, long long>>& postings) {
    unordered_map<string, long long> balances;
    balances.reserve(postings.size() * 2);
    for (const auto& [acc, delta] : postings) {
        balances[acc] += delta;
    }
    vector<pair<string, long long>> out(balances.begin(), balances.end());
    sort(out.begin(), out.end(),
         [](const auto& a, const auto& b) { return a.first < b.first; });
    return out;
}
`,
    },
    complexity: { time: "O(n + k log k)", space: "O(k) where k is the number of distinct accounts" },
    pitfalls: [
      "Using a 32-bit running total — overflows once you cross ~2 billion of signed accumulation.",
      "Skipping accounts that net to zero — the spec keeps them.",
      "Sorting by raw insertion order instead of lexicographic account id.",
    ],
    edgeCases: [
      "Single account, single posting.",
      "All deltas for one account sum to zero — must still appear in output.",
      "Two account ids that differ only by case — they are distinct.",
      "Empty postings list (degenerate, but defensive: return empty list).",
    ],
    whyItMatters:
      "The aggregate-by-key pattern is the most common DSA primitive in product engineering. Almost every analytics, billing, or moderation pipeline reduces to 'group, fold, sort'. Solving this cleanly under interview pressure is table stakes.",
    estimatedMinutes: 15,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 2 — pure_dsa · arrays_hashing · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "idempotent-event-stream",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 1,
    pattern: "arrays_hashing",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "platform_engineer", "data_engineer", "devops_sre"],
    title: "Idempotent Event Stream",
    framing:
      "A producer pushes events onto a topic and occasionally retries them on transient errors. The consumer must process each logical event exactly once and preserve the original order of first occurrence for downstream replay.",
    statement:
      "Given an ordered list of events where each event has a string event_id and a string payload, return the de-duplicated list in the order each event_id first appeared. If the same event_id reappears with a different payload, keep the first payload (producer is the source of truth on first commit).",
    inputFormat:
      "An integer n (1 ≤ n ≤ 2·10^5) followed by n pairs (event_id, payload). event_id is up to 64 ASCII chars. payload is an opaque string up to 256 bytes.",
    outputFormat: "The de-duplicated list of (event_id, payload), preserving order of first occurrence.",
    constraints: [
      "1 ≤ n ≤ 200,000",
      "Up to ~50% of events may be duplicates",
      "event_id is a unique business key (e.g. UUID); payload may legitimately differ on retries",
      "Memory budget: O(n)",
    ],
    examples: [
      {
        input: "5\nevt-a {amount:10}\nevt-b {amount:20}\nevt-a {amount:10,retry:1}\nevt-c {amount:30}\nevt-b {amount:20}",
        output: "evt-a {amount:10}\nevt-b {amount:20}\nevt-c {amount:30}",
        explanation: "evt-a's second occurrence is dropped (keep first payload). evt-b's duplicate is dropped. Order preserved.",
      },
    ],
    approach: [
      "Walk the input once, remembering which event_ids we've already emitted using a hash set.",
      "On each event: if its id is not in the set, append (id, payload) to the output and insert the id into the set; otherwise skip.",
      "This preserves first-occurrence order naturally because we only emit on the first sighting.",
    ],
    solutionSteps: [
      "Initialize an empty hash set seen and an empty output list out.",
      "For each (id, payload) in the input, if id not in seen, append (id, payload) to out and add id to seen.",
      "Return out.",
      "Hash-set membership check + insertion is O(1) amortized, so the total is O(n) time and O(n) space.",
    ],
    code: {
      python: `from typing import Iterable

def dedupe_stream(events: Iterable[tuple[str, str]]) -> list[tuple[str, str]]:
    seen: set[str] = set()
    out: list[tuple[str, str]] = []
    for event_id, payload in events:
        if event_id not in seen:
            seen.add(event_id)
            out.append((event_id, payload))
    return out
`,
      java: `import java.util.*;

public final class IdempotentEventStream {
    public static List<String[]> dedupe(List<String[]> events) {
        HashSet<String> seen = new HashSet<>(events.size() * 2);
        List<String[]> out = new ArrayList<>(events.size());
        for (String[] e : events) {
            if (seen.add(e[0])) {
                out.add(e);
            }
        }
        return out;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<pair<string, string>> dedupeStream(
    const vector<pair<string, string>>& events) {
    unordered_set<string> seen;
    seen.reserve(events.size() * 2);
    vector<pair<string, string>> out;
    out.reserve(events.size());
    for (const auto& e : events) {
        if (seen.insert(e.first).second) {
            out.push_back(e);
        }
    }
    return out;
}
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Using a list-based 'seen' check — degrades to O(n²).",
      "Returning the LAST payload instead of the FIRST (the spec is explicit on first-wins).",
      "Sorting the output by event_id — destroys the original ordering required for replay.",
    ],
    edgeCases: [
      "All events have the same id — output has exactly one entry.",
      "All events unique — output equals input.",
      "Empty input — return empty list.",
      "A duplicate event has a longer payload than the first — still keep the shorter, first one.",
    ],
    whyItMatters:
      "Exactly-once semantics over an at-least-once channel is the foundational backend interview topic. The hash-set / first-occurrence trick maps directly to real-world Kafka, SQS, and webhook consumers.",
    estimatedMinutes: 20,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 3 — pure_dsa · sliding_window · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "latency-budget-window",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 1,
    pattern: "sliding_window",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "devops_sre", "platform_engineer"],
    title: "Latency Budget Window",
    framing:
      "An SRE wants to find the longest contiguous run of requests whose total p99 latency stayed under a hard budget. Each request is logged with its measured latency in milliseconds. The team will use the length as a leading reliability indicator.",
    statement:
      "Given an array of non-negative integers latencies and an integer budget, return the length of the longest contiguous subarray whose sum is less than or equal to budget.",
    inputFormat: "An integer n (1 ≤ n ≤ 2·10^5), the array latencies (0 ≤ latencies[i] ≤ 10^4), and an integer budget (0 ≤ budget ≤ 10^9).",
    outputFormat: "A single integer — the length of the longest subarray whose sum ≤ budget. Zero if no element fits (i.e., budget is 0 and all latencies are positive).",
    constraints: [
      "1 ≤ n ≤ 200,000",
      "0 ≤ latencies[i] ≤ 10,000",
      "0 ≤ budget ≤ 10^9",
      "All values are integers",
    ],
    examples: [
      {
        input: "n = 7, latencies = [3, 1, 2, 1, 5, 1, 1], budget = 6",
        output: "3",
        explanation: "The window [3, 1, 2] sums to 6 (length 3). Any length-4 window would have to include 1 more element (sum 7+) or skip into the 5, both of which exceed the budget.",
      },
      {
        input: "n = 7, latencies = [3, 1, 2, 1, 5, 1, 1], budget = 8",
        output: "4",
        explanation: "Windows summing ≤ 8 include [3,1,2,1] = 7 (length 4) and [1,5,1,1] = 8 (length 4). Longest is 4.",
      },
      {
        input: "n = 3, latencies = [10, 20, 30], budget = 5",
        output: "0",
        explanation: "No single element ≤ 5, so no window fits.",
      },
    ],
    approach: [
      "Use two pointers l and r that delimit the current window [l, r). Maintain a running sum.",
      "Expand the window by incrementing r and adding latencies[r-1] to the sum. While the sum exceeds budget, shrink by incrementing l and subtracting latencies[l-1].",
      "After every expansion, the window [l, r) is the longest window ending at r-1 with sum ≤ budget. Track the maximum length seen.",
    ],
    solutionSteps: [
      "Initialize l = 0, best = 0, total = 0.",
      "For r from 1 to n: total += latencies[r-1].",
      "While total > budget and l < r: total -= latencies[l]; l += 1.",
      "best = max(best, r - l).",
      "After the loop, return best.",
      "Each index is touched at most twice (once on expand, once on shrink), so total work is O(n).",
    ],
    code: {
      python: `def longest_within_budget(latencies: list[int], budget: int) -> int:
    l = best = total = 0
    for r in range(len(latencies)):
        total += latencies[r]
        while total > budget and l <= r:
            total -= latencies[l]
            l += 1
        best = max(best, r - l + 1)
    return best
`,
      java: `public final class LatencyBudgetWindow {
    public static int longestWithinBudget(int[] latencies, int budget) {
        int l = 0, best = 0;
        long total = 0;
        for (int r = 0; r < latencies.length; r++) {
            total += latencies[r];
            while (total > budget && l <= r) {
                total -= latencies[l++];
            }
            best = Math.max(best, r - l + 1);
        }
        return best;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int longestWithinBudget(const vector<int>& latencies, long long budget) {
    int l = 0, best = 0;
    long long total = 0;
    for (int r = 0; r < (int)latencies.size(); ++r) {
        total += latencies[r];
        while (total > budget && l <= r) {
            total -= latencies[l++];
        }
        best = max(best, r - l + 1);
    }
    return best;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Re-summing the window on each expansion — gives O(n²) and times out at n = 2·10^5.",
      "Not shrinking aggressively enough — a single huge latency forces the window past the budget; you must move l until total ≤ budget.",
      "Using a 32-bit accumulator — 2·10^5 × 10^4 = 2·10^9 fits, but cumulative running sums in some templates can briefly overflow; use long.",
    ],
    edgeCases: [
      "All elements are 0 — the entire array fits regardless of budget.",
      "Budget is 0 and array contains only zeros — answer is n.",
      "Budget is 0 and array has at least one positive — answer is the longest stretch of consecutive zeros.",
      "Single element greater than budget — answer is 0.",
    ],
    whyItMatters:
      "Sliding window is the daily-bread pattern for any throughput, rate-limit, or budget question. Real systems use this for SLO calculations, anomaly detection, and quota enforcement.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 4 — pure_dsa · graphs · medium · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "deploy-dependency-order",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 1,
    pattern: "graphs",
    difficulty: "medium",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "backend_engineer", "devops_sre"],
    title: "Deploy Dependency Order",
    framing:
      "A release engineer has a list of services to deploy and a list of dependency edges (\"service A must be deployed before service B\"). They need a deploy order that respects all dependencies, or a clear signal that no order is possible.",
    statement:
      "You are given an integer n (number of services, numbered 0..n−1) and a list of pairs (a, b) meaning service a must be deployed strictly before service b. Return any valid topological ordering of the services. If no valid order exists (i.e., the dependency graph has a cycle), return an empty list.",
    inputFormat: "Integer n (1 ≤ n ≤ 10^4) and a list of m pairs (a, b) with 0 ≤ a, b < n and a ≠ b (1 ≤ m ≤ 5·10^4).",
    outputFormat: "A list of n integers — a valid topological order. Empty list if the graph is cyclic.",
    constraints: [
      "1 ≤ n ≤ 10,000",
      "0 ≤ m ≤ 50,000",
      "Edges may contain duplicates — treat them as a single edge",
      "Multiple valid orders may exist; any one is acceptable",
    ],
    examples: [
      {
        input: "n = 4, edges = [(0,1), (0,2), (1,3), (2,3)]",
        output: "[0, 1, 2, 3]  (or [0, 2, 1, 3])",
        explanation: "0 must precede 1 and 2; both 1 and 2 must precede 3. Both orderings honor every edge.",
      },
      {
        input: "n = 3, edges = [(0,1), (1,2), (2,0)]",
        output: "[]",
        explanation: "Cycle 0 → 1 → 2 → 0 — no valid order exists.",
      },
    ],
    approach: [
      "Build an adjacency list and an array of in-degrees.",
      "Use Kahn's algorithm: seed a queue with every node whose in-degree is zero (a node with no unmet prerequisites).",
      "Pop a node, append it to the output, and for each outgoing edge decrement the neighbor's in-degree; if it hits zero, enqueue.",
      "After the loop, if the output has fewer than n entries the graph has a cycle.",
    ],
    solutionSteps: [
      "Build adj : list of lists of size n, and indeg : list of length n, both initialised empty/zero.",
      "For each (a, b) in edges, append b to adj[a] and increment indeg[b].",
      "Create a queue q, push every i with indeg[i] == 0.",
      "While q is non-empty: pop u, append u to out, for each v in adj[u] decrement indeg[v]; if indeg[v] becomes 0, push v.",
      "If len(out) == n return out, else return [] (cycle detected).",
      "Each node and edge is visited once → O(n + m) time, O(n + m) space.",
    ],
    code: {
      python: `from collections import deque

def deploy_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj: list[list[int]] = [[] for _ in range(n)]
    indeg = [0] * n
    seen_edges: set[tuple[int, int]] = set()
    for a, b in edges:
        if (a, b) in seen_edges:
            continue
        seen_edges.add((a, b))
        adj[a].append(b)
        indeg[b] += 1

    q = deque(i for i in range(n) if indeg[i] == 0)
    out: list[int] = []
    while q:
        u = q.popleft()
        out.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)

    return out if len(out) == n else []
`,
      java: `import java.util.*;

public final class DeployDependencyOrder {
    public static List<Integer> order(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        int[] indeg = new int[n];
        Set<Long> seen = new HashSet<>();
        for (int[] e : edges) {
            long key = (long) e[0] * n + e[1];
            if (!seen.add(key)) continue;
            adj.get(e[0]).add(e[1]);
            indeg[e[1]]++;
        }
        Deque<Integer> q = new ArrayDeque<>();
        for (int i = 0; i < n; i++) if (indeg[i] == 0) q.add(i);
        List<Integer> out = new ArrayList<>(n);
        while (!q.isEmpty()) {
            int u = q.poll();
            out.add(u);
            for (int v : adj.get(u)) {
                if (--indeg[v] == 0) q.add(v);
            }
        }
        return out.size() == n ? out : Collections.emptyList();
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> deployOrder(int n, const vector<pair<int, int>>& edges) {
    vector<vector<int>> adj(n);
    vector<int> indeg(n, 0);
    unordered_set<long long> seen;
    for (const auto& [a, b] : edges) {
        long long key = (long long)a * n + b;
        if (!seen.insert(key).second) continue;
        adj[a].push_back(b);
        indeg[b]++;
    }
    queue<int> q;
    for (int i = 0; i < n; ++i) if (indeg[i] == 0) q.push(i);
    vector<int> out;
    out.reserve(n);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        out.push_back(u);
        for (int v : adj[u]) {
            if (--indeg[v] == 0) q.push(v);
        }
    }
    if ((int)out.size() != n) return {};
    return out;
}
`,
    },
    complexity: { time: "O(n + m)", space: "O(n + m)" },
    pitfalls: [
      "Forgetting to dedupe edges — duplicates inflate in-degrees and you'll mis-detect a cycle.",
      "Returning a partial order when a cycle is present instead of an empty list.",
      "Using DFS without colouring nodes — recursive DFS topo sort needs 3-colour cycle detection, easy to bug under pressure. Kahn's algorithm is shorter.",
    ],
    edgeCases: [
      "n = 1, no edges — the single node is the answer.",
      "Disconnected graph — Kahn's still works because all 0-in-degree nodes seed the queue.",
      "Self-loop (a, a) — instant cycle, even though spec says a ≠ b; defensive guard: skip self-loops or return [].",
      "Empty edges list with n > 0 — every node has in-degree 0; output is [0, 1, ..., n−1].",
    ],
    whyItMatters:
      "Topological sort is the single most useful graph algorithm for backend and platform interviews. Build systems, schedulers, ORMs, and CI pipelines all reduce to 'order a DAG'.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 5 — pure_dsa · stack_queue · medium · full_stack_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "feature-rollout-rollback",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 1,
    pattern: "stack_queue",
    difficulty: "medium",
    primaryRole: "full_stack_engineer",
    roles: ["full_stack_engineer", "backend_engineer", "frontend_engineer"],
    title: "Feature Rollout Rollback",
    framing:
      "A feature-flag service records every rollout action as a single line: ENABLE name, DISABLE name, or ROLLBACK. ROLLBACK undoes the most recent action that has not already been rolled back. After processing the log, you must report the final set of enabled features.",
    statement:
      "You are given a sequence of operations. Each operation is one of: ENABLE x, DISABLE x, or ROLLBACK. ENABLE x marks feature x as enabled. DISABLE x marks feature x as disabled. ROLLBACK reverts the most recent non-rollback action (an ENABLE becomes a no-op, a DISABLE becomes a no-op). After all operations, return the sorted list of feature names that are currently enabled.",
    inputFormat: "An integer n (1 ≤ n ≤ 10^5) followed by n operations. Feature names are lowercase ASCII up to 32 chars.",
    outputFormat: "The sorted list of enabled feature names after processing all operations.",
    constraints: [
      "1 ≤ n ≤ 100,000",
      "ROLLBACK with nothing to undo is a no-op",
      "Toggling the same feature multiple times is allowed",
      "Two consecutive ROLLBACKs undo the two most recent non-rollback actions, in reverse order",
    ],
    examples: [
      {
        input: "6\nENABLE search\nENABLE checkout\nDISABLE checkout\nROLLBACK\nROLLBACK\nENABLE profile",
        output: "profile search",
        explanation:
          "After ENABLE search → {search}. ENABLE checkout → {search, checkout}. DISABLE checkout → {search}. ROLLBACK undoes DISABLE → {search, checkout}. ROLLBACK undoes ENABLE checkout → {search}. ENABLE profile → {search, profile}.",
      },
    ],
    approach: [
      "Maintain a hash set of enabled features and a stack of reversible actions.",
      "On ENABLE x: if x is not enabled, add it and push ('disable', x) onto the stack as the reverse action; if x was already enabled, push ('noop',) so the rollback has something to skip.",
      "On DISABLE x: if x is enabled, remove and push ('enable', x); otherwise push noop.",
      "On ROLLBACK: pop the top of the stack and apply its reverse — but DO NOT push a new reverse action (rollbacks themselves are not undoable).",
      "At the end, sort and return the enabled set.",
    ],
    solutionSteps: [
      "Initialize enabled : set[str] and stack : list[tuple] (one entry per non-rollback op).",
      "For each op:",
      "  if op is ENABLE x and x not in enabled: insert x; push ('disable', x).",
      "  elif op is ENABLE x and x in enabled: push ('noop',).",
      "  elif op is DISABLE x and x in enabled: remove x; push ('enable', x).",
      "  elif op is DISABLE x and x not in enabled: push ('noop',).",
      "  elif op is ROLLBACK and stack is non-empty: pop the top reverse action and apply it without pushing.",
      "Return sorted(enabled).",
      "Time O(n + k log k) for k distinct features; space O(n).",
    ],
    code: {
      python: `def feature_rollout_rollback(operations: list[str]) -> list[str]:
    enabled: set[str] = set()
    stack: list[tuple[str, str | None]] = []
    for op in operations:
        parts = op.split()
        if parts[0] == "ENABLE":
            name = parts[1]
            if name not in enabled:
                enabled.add(name)
                stack.append(("disable", name))
            else:
                stack.append(("noop", None))
        elif parts[0] == "DISABLE":
            name = parts[1]
            if name in enabled:
                enabled.discard(name)
                stack.append(("enable", name))
            else:
                stack.append(("noop", None))
        elif parts[0] == "ROLLBACK" and stack:
            kind, name = stack.pop()
            if kind == "enable" and name is not None:
                enabled.add(name)
            elif kind == "disable" and name is not None:
                enabled.discard(name)
    return sorted(enabled)
`,
      java: `import java.util.*;

public final class FeatureRolloutRollback {
    public static List<String> apply(List<String> operations) {
        Set<String> enabled = new HashSet<>();
        Deque<String[]> stack = new ArrayDeque<>();
        for (String op : operations) {
            String[] parts = op.split(" ");
            switch (parts[0]) {
                case "ENABLE" -> {
                    if (enabled.add(parts[1])) stack.push(new String[]{"disable", parts[1]});
                    else                       stack.push(new String[]{"noop", null});
                }
                case "DISABLE" -> {
                    if (enabled.remove(parts[1])) stack.push(new String[]{"enable", parts[1]});
                    else                          stack.push(new String[]{"noop", null});
                }
                case "ROLLBACK" -> {
                    if (stack.isEmpty()) continue;
                    String[] reverse = stack.pop();
                    if ("enable".equals(reverse[0]))  enabled.add(reverse[1]);
                    if ("disable".equals(reverse[0])) enabled.remove(reverse[1]);
                }
            }
        }
        List<String> out = new ArrayList<>(enabled);
        Collections.sort(out);
        return out;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<string> featureRolloutRollback(const vector<string>& operations) {
    unordered_set<string> enabled;
    vector<pair<string, string>> stk;
    for (const auto& op : operations) {
        stringstream ss(op);
        string cmd, name;
        ss >> cmd >> name;
        if (cmd == "ENABLE") {
            if (enabled.insert(name).second) stk.push_back({"disable", name});
            else                             stk.push_back({"noop", ""});
        } else if (cmd == "DISABLE") {
            if (enabled.erase(name) > 0) stk.push_back({"enable", name});
            else                         stk.push_back({"noop", ""});
        } else if (cmd == "ROLLBACK" && !stk.empty()) {
            auto [kind, target] = stk.back(); stk.pop_back();
            if (kind == "enable")  enabled.insert(target);
            if (kind == "disable") enabled.erase(target);
        }
    }
    vector<string> out(enabled.begin(), enabled.end());
    sort(out.begin(), out.end());
    return out;
}
`,
    },
    complexity: { time: "O(n + k log k)", space: "O(n)" },
    pitfalls: [
      "Pushing the rollback itself onto the stack — then a second rollback undoes the first rollback, which the spec forbids.",
      "Skipping the 'noop' marker on already-enabled ENABLE — a subsequent ROLLBACK then incorrectly modifies a different action.",
      "Returning the stack instead of the enabled set.",
    ],
    edgeCases: [
      "ROLLBACK with empty stack — no-op.",
      "ENABLE x then ENABLE x — second is a no-op; one ROLLBACK leaves x enabled.",
      "All operations are ROLLBACKs — output is empty.",
      "DISABLE a never-enabled feature — no-op (DSL accepts it).",
    ],
    whyItMatters:
      "Stacks-as-history is the canonical interview pattern for undo, transactions, and version control. The trickiest part is reasoning about what the rollback actually pops — many candidates push the rollback itself and confuse themselves.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 6 — pure_dsa · intervals · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "interview-slot-calendar",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 1,
    pattern: "intervals",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer", "full_stack_engineer"],
    title: "Interview Slot Calendar",
    framing:
      "An interview-scheduling tool receives a list of busy intervals from a panel of interviewers. To suggest meeting times, the tool needs the merged set of busy intervals (no overlaps, sorted by start) so the UI can render the free slots in between.",
    statement:
      "Given a list of closed intervals [start_i, end_i] with start_i ≤ end_i, return the merged list of intervals where any overlapping or touching intervals have been collapsed into one. Two intervals [a, b] and [c, d] should be merged if c ≤ b.",
    inputFormat: "An integer n (1 ≤ n ≤ 10^5) and a list of n intervals. Each interval has integer endpoints in [0, 10^9].",
    outputFormat: "A list of merged intervals, sorted by start ascending, with no overlaps or touches.",
    constraints: [
      "1 ≤ n ≤ 100,000",
      "0 ≤ start ≤ end ≤ 10^9",
      "Intervals may be given in any order",
      "Touching intervals (b == c) merge into [a, d]",
    ],
    examples: [
      {
        input: "[[1, 3], [2, 6], [8, 10], [9, 12]]",
        output: "[[1, 6], [8, 12]]",
        explanation: "[1,3] and [2,6] overlap → [1,6]. [8,10] and [9,12] overlap → [8,12].",
      },
      {
        input: "[[3, 5], [5, 7]]",
        output: "[[3, 7]]",
        explanation: "Touching at 5 — merge per spec.",
      },
    ],
    approach: [
      "Sort the intervals by start. After sorting, two intervals can only merge if the next one starts at or before the current one ends.",
      "Walk the sorted list, holding a 'current' merged interval. For each subsequent interval: if its start ≤ current.end, extend current.end := max(current.end, this.end); otherwise, push current to the output and replace current with this interval.",
      "After the loop, push the last current.",
    ],
    solutionSteps: [
      "If the input is empty, return empty.",
      "Sort intervals by their first endpoint — O(n log n).",
      "Initialise current = intervals[0] and out = [].",
      "For each remaining interval [a, b]:",
      "  if a ≤ current[1]: current = [current[0], max(current[1], b)].",
      "  else: append current to out; current = [a, b].",
      "Append current to out.",
      "Return out.",
    ],
    code: {
      python: `def merge_intervals(intervals: list[list[int]]) -> list[list[int]]:
    if not intervals:
        return []
    intervals.sort(key=lambda iv: iv[0])
    out: list[list[int]] = []
    cur = list(intervals[0])
    for a, b in intervals[1:]:
        if a <= cur[1]:
            cur[1] = max(cur[1], b)
        else:
            out.append(cur)
            cur = [a, b]
    out.append(cur)
    return out
`,
      java: `import java.util.*;

public final class InterviewSlotCalendar {
    public static int[][] merge(int[][] intervals) {
        if (intervals.length == 0) return new int[0][0];
        Arrays.sort(intervals, Comparator.comparingInt(a -> a[0]));
        List<int[]> out = new ArrayList<>();
        int[] cur = intervals[0].clone();
        for (int i = 1; i < intervals.length; i++) {
            int[] iv = intervals[i];
            if (iv[0] <= cur[1]) {
                cur[1] = Math.max(cur[1], iv[1]);
            } else {
                out.add(cur);
                cur = iv.clone();
            }
        }
        out.add(cur);
        return out.toArray(new int[0][]);
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<pair<int, int>> mergeIntervals(vector<pair<int, int>> intervals) {
    if (intervals.empty()) return {};
    sort(intervals.begin(), intervals.end(),
         [](const auto& a, const auto& b) { return a.first < b.first; });
    vector<pair<int, int>> out;
    auto cur = intervals[0];
    for (size_t i = 1; i < intervals.size(); ++i) {
        const auto& iv = intervals[i];
        if (iv.first <= cur.second) {
            cur.second = max(cur.second, iv.second);
        } else {
            out.push_back(cur);
            cur = iv;
        }
    }
    out.push_back(cur);
    return out;
}
`,
    },
    complexity: { time: "O(n log n)", space: "O(n) for output" },
    pitfalls: [
      "Forgetting to sort first — the merge invariant only holds on sorted starts.",
      "Using a < b instead of a ≤ b for the merge check — drops touching intervals that the spec says should merge.",
      "Mutating the input array unintentionally — clone if the caller needs the original.",
    ],
    edgeCases: [
      "Single interval — return it unchanged.",
      "All intervals identical — return one entry.",
      "One interval fully contains the rest — the result is the outer interval.",
      "Touching at the boundary (b == c) — merges per spec.",
    ],
    whyItMatters:
      "Interval merging is the single most reused interval pattern. Calendars, ad campaigns, rate limits, log compaction — once you can solve this in your sleep, half the interval interview corpus is trivial.",
    estimatedMinutes: 20,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 7 — pure_dsa · dp_2d · hard · mobile_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "image-pyramid-resize",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 1,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "mobile_engineer",
    roles: ["mobile_engineer", "ai_ml_engineer", "data_engineer"],
    title: "Image Pyramid Cost",
    framing:
      "A photo-editor app pre-computes a multi-resolution pyramid of every image so the viewer can scrub between zoom levels smoothly. Generating each tile has a cost (in CPU ms) given by a grid. The pipeline walks from the top-left tile (highest resolution) to the bottom-right tile (thumbnail), and at each step can move only right or down. Find the minimum total cost path.",
    statement:
      "Given an m × n grid of non-negative integers grid where grid[i][j] is the cost of generating tile (i, j), return the minimum total cost to travel from grid[0][0] to grid[m−1][n−1] moving only right (i, j+1) or down (i+1, j).",
    inputFormat: "Integers m and n (1 ≤ m, n ≤ 500) and the grid (0 ≤ grid[i][j] ≤ 10^4).",
    outputFormat: "A single integer — the minimum cumulative cost of any valid path.",
    constraints: [
      "1 ≤ m, n ≤ 500",
      "0 ≤ grid[i][j] ≤ 10,000",
      "Movement restricted to right or down",
      "The cost of the starting and ending tiles are included",
    ],
    examples: [
      {
        input: "grid = [[1,3,1],[1,5,1],[4,2,1]]",
        output: "7",
        explanation: "Path 1→3→1→1→1 sums to 7. No path is cheaper given the right/down restriction.",
      },
      {
        input: "grid = [[5]]",
        output: "5",
        explanation: "Single cell — just the cell's cost.",
      },
    ],
    approach: [
      "Classical 2-D DP. Let dp[i][j] be the minimum cost to reach (i, j). Then dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1]).",
      "Base cases: dp[0][0] = grid[0][0]; top row accumulates left-to-right; first column accumulates top-to-bottom.",
      "Answer is dp[m-1][n-1].",
      "Space optimisation: only the previous row is needed, so we can collapse to a 1-D dp of length n. This drops the memory from O(mn) to O(n).",
    ],
    solutionSteps: [
      "Allocate a 1-D dp array of length n.",
      "Set dp[0] = grid[0][0]; for j > 0, dp[j] = dp[j-1] + grid[0][j].",
      "For each row i from 1 to m-1: dp[0] += grid[i][0]; for j from 1 to n-1, dp[j] = grid[i][j] + min(dp[j], dp[j-1]).",
      "After the outer loop, dp[n-1] holds the answer.",
      "Time O(m·n), space O(n).",
    ],
    code: {
      python: `def image_pyramid_cost(grid: list[list[int]]) -> int:
    m, n = len(grid), len(grid[0])
    dp = [0] * n
    dp[0] = grid[0][0]
    for j in range(1, n):
        dp[j] = dp[j - 1] + grid[0][j]
    for i in range(1, m):
        dp[0] += grid[i][0]
        for j in range(1, n):
            dp[j] = grid[i][j] + min(dp[j], dp[j - 1])
    return dp[n - 1]
`,
      java: `public final class ImagePyramidCost {
    public static int minCost(int[][] grid) {
        int m = grid.length, n = grid[0].length;
        int[] dp = new int[n];
        dp[0] = grid[0][0];
        for (int j = 1; j < n; j++) dp[j] = dp[j - 1] + grid[0][j];
        for (int i = 1; i < m; i++) {
            dp[0] += grid[i][0];
            for (int j = 1; j < n; j++) {
                dp[j] = grid[i][j] + Math.min(dp[j], dp[j - 1]);
            }
        }
        return dp[n - 1];
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int imagePyramidCost(const vector<vector<int>>& grid) {
    int m = grid.size(), n = grid[0].size();
    vector<int> dp(n, 0);
    dp[0] = grid[0][0];
    for (int j = 1; j < n; ++j) dp[j] = dp[j - 1] + grid[0][j];
    for (int i = 1; i < m; ++i) {
        dp[0] += grid[i][0];
        for (int j = 1; j < n; ++j) {
            dp[j] = grid[i][j] + min(dp[j], dp[j - 1]);
        }
    }
    return dp[n - 1];
}
`,
    },
    complexity: { time: "O(m · n)", space: "O(n)" },
    pitfalls: [
      "Allocating a full O(m · n) DP table when a single row suffices — wasted memory under tight mobile budgets.",
      "Mishandling the first row / first column — many candidates forget the column accumulation.",
      "Doing DFS with memoization instead of bottom-up — recursion stack of 500+500 is risky on constrained mobile devices.",
    ],
    edgeCases: [
      "1×1 grid — answer is grid[0][0].",
      "Single row — answer is sum of the row.",
      "Single column — answer is sum of the column.",
      "All zeros — answer is 0.",
    ],
    whyItMatters:
      "Grid DP is the gateway hard pattern. The 1-D space trick is what distinguishes a senior answer from a junior one — exactly what hard mobile interviews probe.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 8 — pure_dsa · heap_priority_queue · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "recommendation-quorum",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 1,
    pattern: "heap_priority_queue",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer", "ai_ml_engineer"],
    title: "Recommendation Quorum",
    framing:
      "A recommendation gateway gets per-source ranked candidate lists from k retrieval services. Each list is already sorted by score descending. The gateway must merge them into one globally sorted feed and emit the first N items as the user scrolls.",
    statement:
      "You are given k sorted (descending) lists of integers, where list i has length n_i. Return the first N items of the merged global descending order. Total items across all lists is at least N.",
    inputFormat: "An integer N (1 ≤ N ≤ 10^5), an integer k (1 ≤ k ≤ 10^4), and k lists of integers each in [−10^9, 10^9]. The sum of all n_i is at most 10^6.",
    outputFormat: "A list of N integers — the top N in global descending order. Ties may break in any consistent way.",
    constraints: [
      "1 ≤ N ≤ 100,000",
      "1 ≤ k ≤ 10,000",
      "Each list is already sorted descending",
      "Total elements ≤ 10^6 — full materialisation is too much memory if you flatten and sort naively",
    ],
    examples: [
      {
        input: "N = 4, lists = [[9, 5, 1], [8, 6, 0], [7, 2]]",
        output: "[9, 8, 7, 6]",
        explanation: "Merge front-of-each: 9, 8, 7, 6 are the four largest.",
      },
    ],
    approach: [
      "Use a max-heap whose entries are (value, list_index, position_in_list). Seed it with the head of each non-empty list.",
      "Repeat N times: pop the top, append its value to the output, and if the list it came from has another element, push the next element with its updated position.",
      "Heap size is at most k, so each of the N pops is O(log k).",
    ],
    solutionSteps: [
      "Build a max-heap by pushing (lists[i][0], i, 0) for every non-empty list — O(k log k).",
      "Allocate an output list of capacity N.",
      "Repeat N times: pop (val, li, pos); append val to output; if pos + 1 < len(lists[li]), push (lists[li][pos+1], li, pos+1).",
      "Return the output list.",
      "Total work: O(k log k + N log k).",
    ],
    code: {
      python: `import heapq

def merge_top_n(lists: list[list[int]], n: int) -> list[int]:
    # Python's heapq is a min-heap, so we negate values for max-heap behaviour.
    heap: list[tuple[int, int, int]] = []
    for i, lst in enumerate(lists):
        if lst:
            heapq.heappush(heap, (-lst[0], i, 0))
    out: list[int] = []
    while heap and len(out) < n:
        neg_val, li, pos = heapq.heappop(heap)
        out.append(-neg_val)
        if pos + 1 < len(lists[li]):
            heapq.heappush(heap, (-lists[li][pos + 1], li, pos + 1))
    return out
`,
      java: `import java.util.*;

public final class RecommendationQuorum {
    public static int[] mergeTopN(int[][] lists, int n) {
        PriorityQueue<int[]> heap = new PriorityQueue<>(
            (a, b) -> Integer.compare(b[0], a[0])
        );
        for (int i = 0; i < lists.length; i++) {
            if (lists[i].length > 0) {
                heap.offer(new int[]{lists[i][0], i, 0});
            }
        }
        int[] out = new int[n];
        int filled = 0;
        while (!heap.isEmpty() && filled < n) {
            int[] top = heap.poll();
            out[filled++] = top[0];
            int li = top[1], pos = top[2];
            if (pos + 1 < lists[li].length) {
                heap.offer(new int[]{lists[li][pos + 1], li, pos + 1});
            }
        }
        return Arrays.copyOf(out, filled);
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> mergeTopN(const vector<vector<int>>& lists, int n) {
    using Entry = tuple<int, int, int>; // (value, list_index, position)
    priority_queue<Entry> heap;
    for (int i = 0; i < (int)lists.size(); ++i) {
        if (!lists[i].empty()) {
            heap.emplace(lists[i][0], i, 0);
        }
    }
    vector<int> out;
    out.reserve(n);
    while (!heap.empty() && (int)out.size() < n) {
        auto [val, li, pos] = heap.top();
        heap.pop();
        out.push_back(val);
        if (pos + 1 < (int)lists[li].size()) {
            heap.emplace(lists[li][pos + 1], li, pos + 1);
        }
    }
    return out;
}
`,
    },
    complexity: { time: "O((k + N) log k)", space: "O(k)" },
    pitfalls: [
      "Flattening all lists and sorting — O(M log M) where M can be 10^6; passes but wastes memory and is wrong if M is even larger or streaming.",
      "Forgetting to push the next element from the same list after a pop — silently drops items.",
      "Comparing tuples by all fields when ties on value matter — break ties on list_index to keep ordering deterministic if downstream needs it.",
    ],
    edgeCases: [
      "k = 1 — just take the first N from the single list.",
      "Some lists are empty — skip them when seeding.",
      "All lists identical length — verify the loop terminates when total items < N (defensive break).",
      "N larger than sum of list lengths — return whatever you got and stop.",
    ],
    whyItMatters:
      "K-way merge with a heap is the canonical 'merge sorted streams' pattern — used in external sort, log aggregation, distributed search result merging. Senior data interviews probe this exact construction.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 9 — ai_applied · binary_search · medium · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "embedding-shard-router",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 1,
    pattern: "binary_search",
    difficulty: "medium",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "data_engineer", "backend_engineer"],
    title: "Embedding Shard Router",
    framing:
      "A vector store partitions its 384-dim embeddings into k contiguous shards, each indexed by a sorted starting boundary (the lowest-id vector each shard owns). When a query arrives with a vector id, the router has to pick the shard that owns it. The shards array is sorted by start id.",
    statement:
      "You are given an integer array shard_starts of length k that is strictly sorted ascending. shard_starts[i] is the lowest vector id owned by shard i. Given a vector id query, return the index of the shard that owns the id — that is, the largest i such that shard_starts[i] ≤ query. If query is below shard_starts[0], return −1 (no shard owns it).",
    inputFormat: "An integer k (1 ≤ k ≤ 10^5), the strictly ascending array shard_starts (each in [0, 10^9]), and a query (0 ≤ query ≤ 10^9). Multiple queries may be invoked.",
    outputFormat: "A single integer — the shard index, or −1 if the query is below all shard starts.",
    constraints: [
      "1 ≤ k ≤ 100,000",
      "shard_starts is strictly increasing",
      "Answer must be O(log k) per query — linear scan won't pass",
    ],
    examples: [
      {
        input: "shard_starts = [0, 1024, 2048, 4096], query = 1500",
        output: "1",
        explanation: "1500 ≥ 1024 (shard 1's start) but < 2048. So shard 1 owns it.",
      },
      {
        input: "shard_starts = [100, 200, 300], query = 50",
        output: "-1",
        explanation: "50 is below 100 — no shard owns it.",
      },
      {
        input: "shard_starts = [10], query = 100",
        output: "0",
        explanation: "Only one shard, query is at or above its start.",
      },
    ],
    approach: [
      "This is binary search for the largest index whose value is ≤ query — a 'floor' search.",
      "Standard recipe: maintain lo = 0, hi = k − 1, ans = −1. While lo ≤ hi, mid = (lo + hi) // 2. If shard_starts[mid] ≤ query, record ans = mid and search the right half (lo = mid + 1). Else search left (hi = mid − 1).",
      "Return ans.",
    ],
    solutionSteps: [
      "Initialise lo = 0, hi = k - 1, ans = -1.",
      "While lo ≤ hi:",
      "  mid = lo + (hi - lo) // 2 (use this form to avoid overflow in Java/C++).",
      "  if shard_starts[mid] ≤ query: ans = mid; lo = mid + 1.",
      "  else: hi = mid - 1.",
      "Return ans.",
      "O(log k) time, O(1) space.",
    ],
    code: {
      python: `def shard_for_query(shard_starts: list[int], query: int) -> int:
    lo, hi, ans = 0, len(shard_starts) - 1, -1
    while lo <= hi:
        mid = (lo + hi) // 2
        if shard_starts[mid] <= query:
            ans = mid
            lo = mid + 1
        else:
            hi = mid - 1
    return ans
`,
      java: `public final class EmbeddingShardRouter {
    public static int shardForQuery(int[] shardStarts, int query) {
        int lo = 0, hi = shardStarts.length - 1, ans = -1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (shardStarts[mid] <= query) {
                ans = mid;
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }
        return ans;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int shardForQuery(const vector<int>& shardStarts, int query) {
    int lo = 0, hi = (int)shardStarts.size() - 1, ans = -1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (shardStarts[mid] <= query) {
            ans = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    return ans;
}
`,
    },
    complexity: { time: "O(log k) per query", space: "O(1)" },
    pitfalls: [
      "Off-by-one in the comparator — `<` vs `≤` flips the boundary case where query exactly equals a shard start.",
      "Using `mid = (lo + hi) / 2` in Java/C++ with large lo and hi — integer overflow at k near 2^31. Use lo + (hi - lo) / 2.",
      "Returning lo at the end instead of the recorded ans — for queries below shard_starts[0] you'd return 0 instead of −1.",
    ],
    edgeCases: [
      "Query exactly equals a shard_starts[i] — answer is i (≤ matches).",
      "Query above the last shard_starts entry — answer is k − 1.",
      "Query below shard_starts[0] — answer is −1.",
      "k = 1 — answer is 0 if query ≥ shard_starts[0], else −1.",
    ],
    whyItMatters:
      "Binary search for floor/ceiling is the AI-infra interview's quietest workhorse — used in vector store routing, kv-cache lookup, and rate-limit windows. The product framing is incidental; the DSA is the point.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 10 — indian_domain · two_pointers · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "upi-merchant-reconcile",
    version: 1,
    status: "pending_review",
    bucket: "indian_domain",
    batchNo: 1,
    pattern: "two_pointers",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer", "full_stack_engineer"],
    title: "UPI Merchant Reconcile",
    framing:
      "An Indian payment processor reconciles two streams at the end of each day: the merchant's claimed receipts and the bank's actual settlement file. Each row in both streams is a transaction reference (a UTR string) and a paise amount. Both streams are already sorted by UTR ascending. Find the reconciled pairs (same UTR, same amount).",
    statement:
      "You are given two arrays merchant and bank. Each entry is a pair (utr, amount). Both arrays are sorted ascending by utr (lexicographically). Return the list of (utr, amount) pairs that appear in BOTH streams with identical amounts. Preserve the sorted UTR order in the output.",
    inputFormat:
      "Integers m and n (1 ≤ m, n ≤ 10^5), the merchant array, and the bank array. utr is a 12-char ASCII string; amount is an integer in [1, 10^11] paise.",
    outputFormat: "A list of (utr, amount) pairs sorted by utr.",
    constraints: [
      "1 ≤ m, n ≤ 100,000",
      "Both inputs already sorted ascending by utr",
      "amounts are int64 paise values; an exact match is required",
      "UTRs are unique within each stream",
    ],
    examples: [
      {
        input:
          "merchant = [(\"A001\",100), (\"A003\",250), (\"A005\",400)]\nbank     = [(\"A001\",100), (\"A002\",200), (\"A005\",400)]",
        output: "[(\"A001\",100), (\"A005\",400)]",
        explanation: "A001 matches in both with amount 100. A005 matches in both with amount 400. A003 and A002 are only in one stream.",
      },
      {
        input: "merchant = [(\"X1\", 50)]\nbank = [(\"X1\", 60)]",
        output: "[]",
        explanation: "Same UTR but mismatched amount — not a reconciled pair.",
      },
    ],
    approach: [
      "Both arrays are sorted by UTR. Walk them with two pointers i (merchant) and j (bank).",
      "If merchant[i].utr == bank[j].utr: compare amounts. If equal, emit. Advance both pointers.",
      "Else if merchant[i].utr < bank[j].utr: advance i (this merchant UTR has no match ahead in bank).",
      "Else: advance j.",
      "Stop when either pointer reaches the end.",
    ],
    solutionSteps: [
      "Initialise i = j = 0 and out = [].",
      "While i < m and j < n:",
      "  if merchant[i].utr == bank[j].utr:",
      "    if merchant[i].amount == bank[j].amount: append (utr, amount) to out.",
      "    Advance i and j.",
      "  elif merchant[i].utr < bank[j].utr: i += 1.",
      "  else: j += 1.",
      "Return out.",
      "Each pointer advances at most m + n times → O(m + n).",
    ],
    code: {
      python: `def reconcile(merchant: list[tuple[str, int]], bank: list[tuple[str, int]]) -> list[tuple[str, int]]:
    i = j = 0
    out: list[tuple[str, int]] = []
    while i < len(merchant) and j < len(bank):
        m_utr, m_amt = merchant[i]
        b_utr, b_amt = bank[j]
        if m_utr == b_utr:
            if m_amt == b_amt:
                out.append((m_utr, m_amt))
            i += 1
            j += 1
        elif m_utr < b_utr:
            i += 1
        else:
            j += 1
    return out
`,
      java: `import java.util.*;

public final class UpiMerchantReconcile {
    public static List<Object[]> reconcile(List<Object[]> merchant, List<Object[]> bank) {
        int i = 0, j = 0;
        List<Object[]> out = new ArrayList<>();
        while (i < merchant.size() && j < bank.size()) {
            String mUtr = (String) merchant.get(i)[0];
            long  mAmt  = (long)   merchant.get(i)[1];
            String bUtr = (String) bank.get(j)[0];
            long  bAmt  = (long)   bank.get(j)[1];
            int cmp = mUtr.compareTo(bUtr);
            if (cmp == 0) {
                if (mAmt == bAmt) out.add(new Object[]{mUtr, mAmt});
                i++; j++;
            } else if (cmp < 0) {
                i++;
            } else {
                j++;
            }
        }
        return out;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<pair<string, long long>> reconcile(
    const vector<pair<string, long long>>& merchant,
    const vector<pair<string, long long>>& bank) {
    int i = 0, j = 0;
    vector<pair<string, long long>> out;
    while (i < (int)merchant.size() && j < (int)bank.size()) {
        if (merchant[i].first == bank[j].first) {
            if (merchant[i].second == bank[j].second) {
                out.push_back(merchant[i]);
            }
            ++i; ++j;
        } else if (merchant[i].first < bank[j].first) {
            ++i;
        } else {
            ++j;
        }
    }
    return out;
}
`,
    },
    complexity: { time: "O(m + n)", space: "O(min(m, n)) for output" },
    pitfalls: [
      "Using a hash map of one stream and lookups from the other — O(m + n) too, but uses O(m) memory unnecessarily when both inputs are already sorted.",
      "Forgetting the amount check on UTR match — the spec requires identical amounts, not just identical UTRs.",
      "Advancing only one pointer on a UTR match — drops the other side's entry and breaks the next comparison.",
    ],
    edgeCases: [
      "One stream is empty — return empty.",
      "All UTRs match but no amounts match — return empty.",
      "Heavy skew (m=1, n=10^5) — two-pointer handles this trivially.",
      "Identical streams — return all entries.",
    ],
    whyItMatters:
      "Two-pointer intersection on sorted streams is the canonical reconciliation algorithm. Every fintech, ad-tech, and analytics backend does this nightly. Real-world UPI/NEFT reconciliation in India runs exactly this loop at terabyte scale.",
    estimatedMinutes: 25,
  },
];
