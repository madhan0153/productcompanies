import {
  DSA_CATALOG,
  DSA_PATTERNS_DISPLAY,
  type DsaPattern,
  type DsaProblem,
} from "./dsa-catalog";

export type DsaCodeLang = "python" | "java" | "cpp";

export const DSA_CODE_LANGS: readonly DsaCodeLang[] = ["python", "java", "cpp"] as const;

export const DSA_CODE_LANG_LABEL: Record<DsaCodeLang, string> = {
  python: "Python",
  java: "Java",
  cpp: "C++",
};

export interface DsaLearningGuide {
  prompt: string;
  examples: string[];
  approach: string[];
  solution: string[];
  code?: string;
  codeByLang?: Partial<Record<DsaCodeLang, string>>;
  complexity: string;
  whyItMatters: string;
  pitfalls: string[];
  edgeCases: string[];
  optimizations: string[];
  similarSlugs: string[];
  estimatedMinutes: number;
}

export interface DsaPatternRoadmapItem {
  pattern: DsaPattern;
  label: string;
  order: number;
  focus: string;
}

export const DSA_PATTERN_ROADMAP: readonly DsaPatternRoadmapItem[] = [
  { pattern: "arrays_hashing",      label: "Arrays & Hashing",       order: 1,  focus: "Frequency maps, stable identity, duplicate resolution" },
  { pattern: "two_pointers",        label: "Two Pointers",           order: 2,  focus: "Sorted scans, partitioning, pairwise constraints" },
  { pattern: "sliding_window",      label: "Sliding Window",         order: 3,  focus: "Real-time windows, anomaly budgets, contiguous streams" },
  { pattern: "stack_queue",         label: "Stack / Queue",          order: 4,  focus: "Monotonic stacks, BFS queues, workflow ordering" },
  { pattern: "binary_search",       label: "Binary Search",          order: 5,  focus: "Minimum feasible capacity and monotonic decisions" },
  { pattern: "linked_list",         label: "Linked List",            order: 6,  focus: "Pointer mutation, cache chains, stream re-linking" },
  { pattern: "trees",               label: "Trees",                  order: 7,  focus: "Hierarchy aggregation, decision trees, segment splits" },
  { pattern: "heap_priority_queue", label: "Heap / Priority Queue",  order: 8,  focus: "Top-k, merge streams, realtime ranking" },
  { pattern: "graphs",              label: "Graphs",                 order: 9,  focus: "Dependency DAGs, shortest paths, GraphRAG traversal" },
  { pattern: "backtracking",        label: "Backtracking",           order: 10, focus: "Search with pruning, assignment, candidate generation" },
  { pattern: "dp_1d",               label: "Dynamic Programming 1D", order: 11, focus: "Optimal choices over ordered events" },
  { pattern: "dp_2d",               label: "Dynamic Programming 2D", order: 12, focus: "Grid, sequence, and matrix optimization" },
  { pattern: "greedy",              label: "Greedy",                 order: 13, focus: "Local choice with a proof invariant" },
  { pattern: "intervals",           label: "Intervals",              order: 14, focus: "Capacity calendars, overlaps, scheduling" },
  { pattern: "tries",               label: "Tries",                  order: 15, focus: "Prefix intent, autocomplete, hierarchical indexes" },
  { pattern: "bit_manipulation",    label: "Bit Manipulation",       order: 16, focus: "Compact flags, feature masks, state compression" },
  { pattern: "math_geometry",       label: "Math / Geometry",        order: 17, focus: "Formulae, coordinates, invariants" },
] as const;

export function getDsaLearningGuide(problem: DsaProblem): DsaLearningGuide {
  const pattern = patternGuide(problem.pattern);
  const code = codeTemplates(problem);
  const roleLine = problem.primaryRole.replace(/_/g, " ");
  return {
    prompt: problem.statement,
    examples: problem.examples,
    approach: [
      `Translate the ${problem.context.productSurface} story into the formal input: ${problem.inputFormat}`,
      `Use the ${DSA_PATTERNS_DISPLAY[problem.pattern]} pattern because the decision depends on ${pattern.invariant}.`,
      ...pattern.approach,
      "Before coding, dry-run the provided example and one edge case from the constraints.",
    ],
    solution: [
      ...pattern.solution,
      `Return exactly what the product team needs: ${problem.outputFormat}`,
      "Keep the implementation deterministic so repeated runs and tests are easy to audit.",
    ],
    code: code.python,
    codeByLang: code,
    complexity: pattern.complexity,
    whyItMatters: `${problem.premiumSignal} This is a ProdMatch-owned ${roleLine} drill, framed as a ${problem.context.month} ${problem.context.company} ${problem.context.productTeam} simulation, not a copied platform question.`,
    pitfalls: pattern.pitfalls,
    edgeCases: [
      ...pattern.edgeCases,
      ...problem.constraints.slice(0, 2).map((constraint) => `Validate boundary: ${constraint}`),
    ],
    optimizations: pattern.optimizations,
    similarSlugs: defaultSimilar(problem),
    estimatedMinutes: defaultMinutes(problem.difficulty),
  };
}

export function getDsaPatternProgress(completedSlugs: readonly string[]): Array<DsaPatternRoadmapItem & { completed: number; total: number }> {
  const completed = new Set(completedSlugs);
  return DSA_PATTERN_ROADMAP.map((item) => {
    const total = DSA_CATALOG_BY_PATTERN[item.pattern]?.length ?? 0;
    const done = (DSA_CATALOG_BY_PATTERN[item.pattern] ?? []).filter((p) => completed.has(p.slug)).length;
    return { ...item, completed: done, total };
  }).filter((item) => item.total > 0);
}

const DSA_CATALOG_BY_PATTERN = DSA_PATTERN_ROADMAP.reduce<Record<DsaPattern, DsaProblem[]>>((acc, item) => {
  acc[item.pattern] = DSA_CATALOG.filter((problem) => problem.pattern === item.pattern);
  return acc;
}, {} as Record<DsaPattern, DsaProblem[]>);

interface PatternGuide {
  invariant: string;
  approach: string[];
  solution: string[];
  complexity: string;
  pitfalls: string[];
  edgeCases: string[];
  optimizations: string[];
}

function patternGuide(pattern: DsaPattern): PatternGuide {
  switch (pattern) {
    case "arrays_hashing":
      return {
        invariant: "identity, frequency, or latest-version lookup",
        approach: ["Store the best record per key in a map.", "Preserve first-seen order separately if output order matters.", "Update the map only when the incoming version wins."],
        solution: ["Scan events once.", "For each ID, remember the first position and the strongest retained event.", "Emit keys in first-seen order with their retained value."],
        complexity: "Time O(n), space O(n) for retained identities.",
        pitfalls: ["Do not sort if first-seen order is required.", "Treat duplicate IDs with equal versions deterministically."],
        edgeCases: ["All events have the same ID.", "Every event is unique.", "Versions arrive out of order."],
        optimizations: ["Use integer indexes instead of copying records when payloads are large."],
      };
    case "sliding_window":
      return {
        invariant: "a contiguous stream window whose cost stays within a budget",
        approach: ["Expand the right boundary one event at a time.", "Update the window cost or risk score.", "Shrink from the left until the window becomes valid again.", "Track the best valid window after every repair."],
        solution: ["Use two pointers over the event stream.", "Maintain frequency/cost state incrementally.", "The left pointer only moves forward, so the scan stays linear."],
        complexity: "Time O(n), space O(k) for tracked event categories.",
        pitfalls: ["Update the answer only after the window is valid.", "Avoid recomputing the whole window on every move."],
        edgeCases: ["Single event exceeds the budget.", "The optimal window starts at index 0.", "The stream contains repeated identical signals."],
        optimizations: ["Keep rolling aggregates; never slice the window for computation."],
      };
    case "heap_priority_queue":
      return {
        invariant: "only the strongest k candidates need to be retained",
        approach: ["Score each item as it arrives.", "Keep a min-heap of the current top k.", "When the heap grows beyond k, drop the weakest candidate.", "Sort the final heap only for display."],
        solution: ["Process the stream once.", "Push candidate scores into a bounded heap.", "The heap root is always the cheapest item to evict."],
        complexity: "Time O(n log k), space O(k).",
        pitfalls: ["Use a stable tie-breaker for equal scores.", "Do not sort the full stream when k is small."],
        edgeCases: ["k is zero.", "k exceeds number of items.", "Many items share the same score."],
        optimizations: ["Encode score and tie-break fields into one tuple to simplify comparisons."],
      };
    case "intervals":
      return {
        invariant: "sorted boundaries make overlap decisions local",
        approach: ["Normalize all intervals to inclusive or half-open form.", "Sort by start time, then by end time.", "Sweep from left to right while tracking active capacity.", "Merge or reject intervals when capacity would be exceeded."],
        solution: ["Convert interval events into starts and ends.", "Sweep chronologically and update active load.", "The maximum active load determines feasibility or required capacity."],
        complexity: "Time O(n log n), space O(n) for events or merged output.",
        pitfalls: ["Be explicit about whether touching endpoints overlap.", "Process end events before start events for half-open intervals."],
        edgeCases: ["Zero-length intervals.", "All intervals overlap.", "Intervals arrive unsorted."],
        optimizations: ["When time range is small, a difference array can beat sorting."],
      };
    case "bit_manipulation":
      return {
        invariant: "a compact mask represents which features or states are active",
        approach: ["Map each feature flag to one bit.", "Use OR to enable, AND with complement to disable, and XOR for toggles.", "Compare masks to detect compatible states.", "Use DP over masks if the state space is small."],
        solution: ["Convert each record to a bit mask.", "Apply bit operations instead of nested set comparisons.", "Return the best mask or count demanded by the question."],
        complexity: "Time O(n * b) to build masks, usually O(n) after b is bounded; space O(n) or O(2^b) for mask DP.",
        pitfalls: ["Do not shift beyond the integer width in fixed-width languages.", "Keep feature-to-bit mapping stable."],
        edgeCases: ["No active features.", "All features active.", "Duplicate masks with different scores."],
        optimizations: ["Use bit-count/popcount intrinsics for scoring coverage quickly."],
      };
    case "graphs":
      return {
        invariant: "each node is processed after its dependency or with its shortest known distance",
        approach: ["Build adjacency lists from the product entities.", "Choose topological sort for DAG dependencies or Dijkstra/BFS for reachability.", "Track visited/in-degree/distance explicitly.", "Fail fast on cycles when the workflow requires an acyclic plan."],
        solution: ["Represent dependencies as a graph.", "Initialize the traversal frontier.", "Relax neighbors or reduce in-degree until no work remains.", "Validate that all required nodes were processed."],
        complexity: "Time O(V + E) for BFS/topological sort, O((V + E) log V) for weighted shortest paths; space O(V + E).",
        pitfalls: ["Mark visited when enqueueing, not after repeated dequeue.", "Do not ignore disconnected components if the product surface can have them."],
        edgeCases: ["Cycle in dependency graph.", "Target node is unreachable.", "Multiple valid topological orders."],
        optimizations: ["Use arrays for dense numeric IDs and maps only at ingestion boundaries."],
      };
    case "dp_1d":
      return {
        invariant: "the best answer up to index i depends on a small set of previous states",
        approach: ["Define dp[i] in one sentence.", "Write the transition before writing code.", "Initialize base cases for empty and first item.", "Iterate in dependency order and compress state when possible."],
        solution: ["Create the DP array or rolling variables.", "For each position, choose between taking, skipping, or combining previous states.", "Return the final state for the full sequence."],
        complexity: "Time O(n * transitions), space O(n) or O(1) after rolling-state compression.",
        pitfalls: ["Unclear state definition usually causes off-by-one bugs.", "Do not overwrite a state before all consumers have used it."],
        edgeCases: ["Empty sequence.", "Only one item.", "Negative or zero scores when allowed."],
        optimizations: ["Compress to rolling variables once the transition only looks back a fixed distance."],
      };
    case "dp_2d":
      return {
        invariant: "cell or pair state is solved after its required neighbors are solved",
        approach: ["Define what dp[row][col] means.", "List valid transitions from top/left/diagonal or previous pair states.", "Initialize blocked or boundary cells carefully.", "Fill rows/columns in the dependency order."],
        solution: ["Allocate a grid DP table.", "Skip invalid cells.", "Combine reachable predecessor states using max/min as required.", "Return the destination state or impossible marker."],
        complexity: "Time O(rows * cols), space O(rows * cols) or O(cols) with rolling rows.",
        pitfalls: ["Blocked start/end must be handled before the loop.", "Use the impossible sentinel consistently."],
        edgeCases: ["Single row or single column.", "All routes blocked.", "Zero-valued cells should not look unreachable."],
        optimizations: ["Use one rolling row when only the previous row and current left cell are needed."],
      };
    case "tries":
      return {
        invariant: "each prefix node stores the best active candidate beneath it",
        approach: ["Insert each character into the trie.", "At every node, maintain the best term under that prefix.", "On delete or weight change, repair prefix nodes touched by the term.", "Answer prefix queries by landing on the prefix node."],
        solution: ["Build nodes with children and best-candidate metadata.", "Insertion updates metadata along the path.", "Queries walk the prefix once and return the stored best value."],
        complexity: "Time O(total characters) for updates plus O(prefix length) per query; space O(total characters).",
        pitfalls: ["Deletion is hard if nodes cache best child; use lazy invalidation or per-node heap when deletes are frequent.", "Tie-break lexicographically for deterministic output."],
        edgeCases: ["Query prefix does not exist.", "Inserted term has empty string if allowed.", "Weight changes lower the current best."],
        optimizations: ["Use small fixed arrays for alphabets with bounded character sets."],
      };
    case "binary_search":
      return {
        invariant: "if a capacity works, every larger capacity also works",
        approach: ["Identify the monotonic predicate.", "Set low to the smallest plausible answer and high to a guaranteed feasible answer.", "Binary search the first value that passes.", "Keep the feasibility check linear and side-effect free."],
        solution: ["Implement can(capacity).", "While low < high, test mid.", "Move high down when feasible, otherwise move low up.", "Return low as the minimum feasible answer."],
        complexity: "Time O(n log A), where A is the answer range; space O(1).",
        pitfalls: ["Use low + (high - low) // 2 to avoid overflow.", "The predicate must be monotonic or binary search is invalid."],
        edgeCases: ["Deadline equals number of items.", "One huge item dominates.", "All items are equal."],
        optimizations: ["Tighten low with max item size and high with total work when applicable."],
      };
    case "greedy":
      return {
        invariant: "the local move cannot make the global optimum worse",
        approach: ["Sort or normalize data so the next move is obvious.", "Name the exchange argument that proves the move is safe.", "Apply the cheapest valid move at each step.", "Track only the state needed for future moves."],
        solution: ["Transform the input into ordered deltas.", "Move surplus toward deficit in sorted order.", "Accumulate cost as units move across boundaries."],
        complexity: "Time O(n log n) if sorting is required; space O(n) or O(1) after sorting in place.",
        pitfalls: ["A greedy idea without a proof may fail hidden cases.", "Do not mutate sorted keys in a way that breaks ordering."],
        edgeCases: ["Already balanced input.", "All surplus sits at one end.", "Total load not divisible evenly."],
        optimizations: ["When keys are already ordered, skip sorting and sweep directly."],
      };
    default:
      return {
        invariant: "a named state transition beats brute force",
        approach: ["Write the brute force in words.", "Find the repeated subproblem or invariant.", "Choose the smallest data structure that preserves that invariant.", "Prove the update is safe before coding."],
        solution: ["Initialize state.", "Process each item exactly once when possible.", "Update the answer from the maintained invariant.", "Return the final state."],
        complexity: "Time and space depend on the chosen invariant; the expected solution avoids exponential brute force.",
        pitfalls: ["Do not code before defining state.", "Test empty and maximum-size inputs."],
        edgeCases: ["Empty input.", "Single element.", "Duplicate values."],
        optimizations: ["Compress state after the first correct version passes."],
      };
  }
}

function codeTemplates(problem: DsaProblem): Record<DsaCodeLang, string> {
  switch (problem.pattern) {
    case "graphs":
      return graphCode(problem);
    case "dp_1d":
      return dp1dCode(problem);
    case "dp_2d":
      return dp2dCode(problem);
    case "heap_priority_queue":
      return heapCode(problem);
    case "intervals":
      return intervalsCode(problem);
    case "binary_search":
      return binarySearchCode(problem);
    case "sliding_window":
      return slidingWindowCode(problem);
    case "tries":
      return trieCode(problem);
    case "bit_manipulation":
      return bitCode(problem);
    default:
      return arraysCode(problem);
  }
}

function arraysCode(problem: DsaProblem): Record<DsaCodeLang, string> {
  return {
    python: `def resolve_latest(events):
    """${problem.title}: keep newest version per id in first-seen order."""
    order = []
    best = {}
    for event_id, version in events:
        if event_id not in best:
            order.append(event_id)
            best[event_id] = version
        else:
            best[event_id] = max(best[event_id], version)
    return [(event_id, best[event_id]) for event_id in order]`,
    java: `import java.util.*;

class Solution {
    record Event(String id, long version) {}

    List<Event> resolveLatest(List<Event> events) {
        Map<String, Long> best = new HashMap<>();
        List<String> order = new ArrayList<>();
        for (Event event : events) {
            if (!best.containsKey(event.id())) order.add(event.id());
            best.merge(event.id(), event.version(), Math::max);
        }
        List<Event> out = new ArrayList<>();
        for (String id : order) out.add(new Event(id, best.get(id)));
        return out;
    }
}`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

vector<pair<string, long long>> resolveLatest(const vector<pair<string, long long>>& events) {
    unordered_map<string, long long> best;
    vector<string> order;
    for (auto [id, version] : events) {
        if (!best.count(id)) order.push_back(id);
        best[id] = max(best[id], version);
    }
    vector<pair<string, long long>> out;
    for (const string& id : order) out.push_back({id, best[id]});
    return out;
}`,
  };
}

function slidingWindowCode(problem: DsaProblem): Record<DsaCodeLang, string> {
  return {
    python: `def longest_stable_window(costs, budget):
    """${problem.title}: longest contiguous window with total cost <= budget."""
    left = 0
    total = 0
    best = 0
    for right, cost in enumerate(costs):
        total += cost
        while total > budget and left <= right:
            total -= costs[left]
            left += 1
        best = max(best, right - left + 1)
    return best`,
    java: `class Solution {
    int longestStableWindow(int[] costs, long budget) {
        int left = 0, best = 0;
        long total = 0;
        for (int right = 0; right < costs.length; right++) {
            total += costs[right];
            while (total > budget && left <= right) {
                total -= costs[left++];
            }
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int longestStableWindow(const vector<int>& costs, long long budget) {
    int left = 0, best = 0;
    long long total = 0;
    for (int right = 0; right < (int)costs.size(); ++right) {
        total += costs[right];
        while (total > budget && left <= right) total -= costs[left++];
        best = max(best, right - left + 1);
    }
    return best;
}`,
  };
}

function heapCode(problem: DsaProblem): Record<DsaCodeLang, string> {
  return {
    python: `import heapq

def top_k_signals(items, k):
    """${problem.title}: return k strongest (score, id) pairs."""
    if k <= 0:
        return []
    heap = []
    for item_id, score in items:
        entry = (score, item_id)
        if len(heap) < k:
            heapq.heappush(heap, entry)
        elif entry > heap[0]:
            heapq.heapreplace(heap, entry)
    return sorted(heap, reverse=True)`,
    java: `import java.util.*;

class Solution {
    record Item(String id, long score) {}

    List<Item> topKSignals(List<Item> items, int k) {
        if (k <= 0) return List.of();
        PriorityQueue<Item> heap = new PriorityQueue<>(
            Comparator.comparingLong(Item::score).thenComparing(Item::id)
        );
        for (Item item : items) {
            if (heap.size() < k) heap.offer(item);
            else if (compare(item, heap.peek()) > 0) {
                heap.poll();
                heap.offer(item);
            }
        }
        ArrayList<Item> out = new ArrayList<>(heap);
        out.sort((a, b) -> compare(b, a));
        return out;
    }

    int compare(Item a, Item b) {
        int byScore = Long.compare(a.score(), b.score());
        return byScore != 0 ? byScore : a.id().compareTo(b.id());
    }
}`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

vector<pair<long long, string>> topKSignals(const vector<pair<string, long long>>& items, int k) {
    if (k <= 0) return {};
    priority_queue<pair<long long, string>, vector<pair<long long, string>>, greater<>> heap;
    for (auto [id, score] : items) {
        pair<long long, string> entry = {score, id};
        if ((int)heap.size() < k) heap.push(entry);
        else if (entry > heap.top()) {
            heap.pop();
            heap.push(entry);
        }
    }
    vector<pair<long long, string>> out;
    while (!heap.empty()) {
        out.push_back(heap.top());
        heap.pop();
    }
    sort(out.rbegin(), out.rend());
    return out;
}`,
  };
}

function intervalsCode(problem: DsaProblem): Record<DsaCodeLang, string> {
  return {
    python: `def max_overlap(intervals):
    """${problem.title}: compute peak concurrent load for half-open intervals."""
    events = []
    for start, end in intervals:
        events.append((start, 1))
        events.append((end, -1))
    events.sort(key=lambda x: (x[0], x[1]))
    active = peak = 0
    for _, delta in events:
        active += delta
        peak = max(peak, active)
    return peak`,
    java: `import java.util.*;

class Solution {
    int maxOverlap(int[][] intervals) {
        int[][] events = new int[intervals.length * 2][2];
        int idx = 0;
        for (int[] in : intervals) {
            events[idx++] = new int[] { in[0], 1 };
            events[idx++] = new int[] { in[1], -1 };
        }
        Arrays.sort(events, (a, b) -> a[0] == b[0] ? Integer.compare(a[1], b[1]) : Integer.compare(a[0], b[0]));
        int active = 0, peak = 0;
        for (int[] event : events) {
            active += event[1];
            peak = Math.max(peak, active);
        }
        return peak;
    }
}`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int maxOverlap(const vector<pair<int, int>>& intervals) {
    vector<pair<int, int>> events;
    for (auto [start, end] : intervals) {
        events.push_back({start, 1});
        events.push_back({end, -1});
    }
    sort(events.begin(), events.end());
    int active = 0, peak = 0;
    for (auto [_, delta] : events) {
        active += delta;
        peak = max(peak, active);
    }
    return peak;
}`,
  };
}

function graphCode(problem: DsaProblem): Record<DsaCodeLang, string> {
  return {
    python: `from collections import deque

def can_finish(nodes, edges):
    """${problem.title}: return True when dependency graph is acyclic."""
    graph = [[] for _ in range(nodes)]
    indegree = [0] * nodes
    for before, after in edges:
        graph[before].append(after)
        indegree[after] += 1
    queue = deque(i for i, deg in enumerate(indegree) if deg == 0)
    seen = 0
    while queue:
        node = queue.popleft()
        seen += 1
        for nxt in graph[node]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                queue.append(nxt)
    return seen == nodes`,
    java: `import java.util.*;

class Solution {
    boolean canFinish(int nodes, int[][] edges) {
        List<List<Integer>> graph = new ArrayList<>();
        for (int i = 0; i < nodes; i++) graph.add(new ArrayList<>());
        int[] indegree = new int[nodes];
        for (int[] edge : edges) {
            graph.get(edge[0]).add(edge[1]);
            indegree[edge[1]]++;
        }
        ArrayDeque<Integer> queue = new ArrayDeque<>();
        for (int i = 0; i < nodes; i++) if (indegree[i] == 0) queue.add(i);
        int seen = 0;
        while (!queue.isEmpty()) {
            int node = queue.remove();
            seen++;
            for (int next : graph.get(node)) {
                if (--indegree[next] == 0) queue.add(next);
            }
        }
        return seen == nodes;
    }
}`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

bool canFinish(int nodes, const vector<pair<int, int>>& edges) {
    vector<vector<int>> graph(nodes);
    vector<int> indegree(nodes);
    for (auto [before, after] : edges) {
        graph[before].push_back(after);
        indegree[after]++;
    }
    queue<int> q;
    for (int i = 0; i < nodes; ++i) if (indegree[i] == 0) q.push(i);
    int seen = 0;
    while (!q.empty()) {
        int node = q.front();
        q.pop();
        seen++;
        for (int next : graph[node]) if (--indegree[next] == 0) q.push(next);
    }
    return seen == nodes;
}`,
  };
}

function dp1dCode(problem: DsaProblem): Record<DsaCodeLang, string> {
  return {
    python: `def max_non_adjacent_value(values):
    """${problem.title}: choose non-conflicting items for max value."""
    take = 0
    skip = 0
    for value in values:
        take, skip = skip + value, max(skip, take)
    return max(take, skip)`,
    java: `class Solution {
    long maxNonAdjacentValue(long[] values) {
        long take = 0, skip = 0;
        for (long value : values) {
            long nextTake = skip + value;
            long nextSkip = Math.max(skip, take);
            take = nextTake;
            skip = nextSkip;
        }
        return Math.max(take, skip);
    }
}`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

long long maxNonAdjacentValue(const vector<long long>& values) {
    long long take = 0, skip = 0;
    for (long long value : values) {
        long long nextTake = skip + value;
        long long nextSkip = max(skip, take);
        take = nextTake;
        skip = nextSkip;
    }
    return max(take, skip);
}`,
  };
}

function dp2dCode(problem: DsaProblem): Record<DsaCodeLang, string> {
  return {
    python: `def max_reliability_path(grid):
    """${problem.title}: max score path moving right/down; -1 means blocked."""
    if not grid or not grid[0] or grid[0][0] == -1:
        return -1
    rows, cols = len(grid), len(grid[0])
    neg = -10**30
    dp = [neg] * cols
    dp[0] = grid[0][0]
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == -1:
                dp[c] = neg
                continue
            if r == 0 and c == 0:
                continue
            best_prev = dp[c]
            if c > 0:
                best_prev = max(best_prev, dp[c - 1])
            dp[c] = neg if best_prev == neg else best_prev + grid[r][c]
    return -1 if dp[-1] == neg else dp[-1]`,
    java: `import java.util.*;

class Solution {
    long maxReliabilityPath(int[][] grid) {
        if (grid.length == 0 || grid[0].length == 0 || grid[0][0] == -1) return -1;
        int rows = grid.length, cols = grid[0].length;
        long neg = Long.MIN_VALUE / 4;
        long[] dp = new long[cols];
        Arrays.fill(dp, neg);
        dp[0] = grid[0][0];
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] == -1) {
                    dp[c] = neg;
                    continue;
                }
                if (r == 0 && c == 0) continue;
                long bestPrev = dp[c];
                if (c > 0) bestPrev = Math.max(bestPrev, dp[c - 1]);
                dp[c] = bestPrev == neg ? neg : bestPrev + grid[r][c];
            }
        }
        return dp[cols - 1] == neg ? -1 : dp[cols - 1];
    }
}`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

long long maxReliabilityPath(const vector<vector<int>>& grid) {
    if (grid.empty() || grid[0].empty() || grid[0][0] == -1) return -1;
    int rows = grid.size(), cols = grid[0].size();
    const long long NEG = LLONG_MIN / 4;
    vector<long long> dp(cols, NEG);
    dp[0] = grid[0][0];
    for (int r = 0; r < rows; ++r) {
        for (int c = 0; c < cols; ++c) {
            if (grid[r][c] == -1) {
                dp[c] = NEG;
                continue;
            }
            if (r == 0 && c == 0) continue;
            long long bestPrev = dp[c];
            if (c > 0) bestPrev = max(bestPrev, dp[c - 1]);
            dp[c] = bestPrev == NEG ? NEG : bestPrev + grid[r][c];
        }
    }
    return dp.back() == NEG ? -1 : dp.back();
}`,
  };
}

function binarySearchCode(problem: DsaProblem): Record<DsaCodeLang, string> {
  return {
    python: `import math

def minimum_rate(sizes, deadline):
    """${problem.title}: minimum integer rate to finish within deadline."""
    low, high = 1, max(sizes)

    def feasible(rate):
        return sum(math.ceil(size / rate) for size in sizes) <= deadline

    while low < high:
        mid = (low + high) // 2
        if feasible(mid):
            high = mid
        else:
            low = mid + 1
    return low`,
    java: `class Solution {
    int minimumRate(int[] sizes, long deadline) {
        int low = 1, high = 1;
        for (int size : sizes) high = Math.max(high, size);
        while (low < high) {
            int mid = low + (high - low) / 2;
            if (feasible(sizes, deadline, mid)) high = mid;
            else low = mid + 1;
        }
        return low;
    }

    boolean feasible(int[] sizes, long deadline, int rate) {
        long used = 0;
        for (int size : sizes) used += (size + rate - 1L) / rate;
        return used <= deadline;
    }
}`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int minimumRate(const vector<int>& sizes, long long deadline) {
    int low = 1, high = *max_element(sizes.begin(), sizes.end());
    auto feasible = [&](int rate) {
        long long used = 0;
        for (int size : sizes) used += (size + rate - 1LL) / rate;
        return used <= deadline;
    };
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (feasible(mid)) high = mid;
        else low = mid + 1;
    }
    return low;
}`,
  };
}

function trieCode(problem: DsaProblem): Record<DsaCodeLang, string> {
  return {
    python: `class TrieNode:
    def __init__(self):
        self.children = {}
        self.best = None  # (weight, term)

def better(a, b):
    if b is None:
        return a
    if a[0] != b[0]:
        return a if a[0] > b[0] else b
    return a if a[1] < b[1] else b

class PrefixIndex:
    """${problem.title}: insert terms and query best weighted prefix."""
    def __init__(self):
        self.root = TrieNode()

    def insert(self, term, weight):
        node = self.root
        candidate = (weight, term)
        node.best = better(candidate, node.best)
        for ch in term:
            node = node.children.setdefault(ch, TrieNode())
            node.best = better(candidate, node.best)

    def top_prefix(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return None
            node = node.children[ch]
        return node.best[1] if node.best else None`,
    java: `import java.util.*;

class PrefixIndex {
    static class Node {
        Map<Character, Node> children = new HashMap<>();
        String bestTerm;
        long bestWeight = Long.MIN_VALUE;
    }

    private final Node root = new Node();

    void insert(String term, long weight) {
        Node node = root;
        update(node, term, weight);
        for (char ch : term.toCharArray()) {
            node = node.children.computeIfAbsent(ch, unused -> new Node());
            update(node, term, weight);
        }
    }

    String topPrefix(String prefix) {
        Node node = root;
        for (char ch : prefix.toCharArray()) {
            node = node.children.get(ch);
            if (node == null) return null;
        }
        return node.bestTerm;
    }

    private void update(Node node, String term, long weight) {
        if (node.bestTerm == null || weight > node.bestWeight || (weight == node.bestWeight && term.compareTo(node.bestTerm) < 0)) {
            node.bestWeight = weight;
            node.bestTerm = term;
        }
    }
}`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

struct Node {
    unordered_map<char, int> child;
    string bestTerm = "";
    long long bestWeight = LLONG_MIN;
};

class PrefixIndex {
    vector<Node> trie{{}};

    void update(int node, const string& term, long long weight) {
        if (trie[node].bestTerm.empty() || weight > trie[node].bestWeight ||
            (weight == trie[node].bestWeight && term < trie[node].bestTerm)) {
            trie[node].bestWeight = weight;
            trie[node].bestTerm = term;
        }
    }

public:
    void insert(const string& term, long long weight) {
        int node = 0;
        update(node, term, weight);
        for (char ch : term) {
            if (!trie[node].child.count(ch)) {
                trie[node].child[ch] = trie.size();
                trie.push_back(Node{});
            }
            node = trie[node].child[ch];
            update(node, term, weight);
        }
    }

    string topPrefix(const string& prefix) {
        int node = 0;
        for (char ch : prefix) {
            if (!trie[node].child.count(ch)) return "";
            node = trie[node].child[ch];
        }
        return trie[node].bestTerm;
    }
};`,
  };
}

function bitCode(problem: DsaProblem): Record<DsaCodeLang, string> {
  return {
    python: `def max_compatible_score(items, required_mask):
    """${problem.title}: best item covering all required feature bits."""
    best = -1
    for mask, score in items:
        if (mask & required_mask) == required_mask:
            best = max(best, score)
    return best`,
    java: `class Solution {
    long maxCompatibleScore(long[][] items, long requiredMask) {
        long best = -1;
        for (long[] item : items) {
            long mask = item[0], score = item[1];
            if ((mask & requiredMask) == requiredMask) best = Math.max(best, score);
        }
        return best;
    }
}`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

long long maxCompatibleScore(const vector<pair<long long, long long>>& items, long long requiredMask) {
    long long best = -1;
    for (auto [mask, score] : items) {
        if ((mask & requiredMask) == requiredMask) best = max(best, score);
    }
    return best;
}`,
  };
}

function defaultSimilar(problem: DsaProblem): string[] {
  return [
    ...new Set(
      DSA_CATALOG_BY_PATTERN[problem.pattern]
        ?.filter((p) => p.slug !== problem.slug && p.primaryRole === problem.primaryRole)
        .slice(0, 3)
        .map((p) => p.slug) ?? [],
    ),
  ];
}

function defaultMinutes(difficulty: DsaProblem["difficulty"]): number {
  if (difficulty === "easy") return 25;
  if (difficulty === "medium") return 45;
  return 70;
}

// Spaced repetition (SM-2-lite).
export type DsaConfidence = "got_it" | "review" | "confused";

export const DSA_CONFIDENCE_LABEL: Record<DsaConfidence, string> = {
  got_it: "Got it",
  review: "Review later",
  confused: "Need more work",
};

export const DSA_CONFIDENCE_HINT: Record<DsaConfidence, string> = {
  got_it: "Nice. We'll resurface this in about 3 weeks.",
  review: "We'll bring this back in a few days.",
  confused: "We'll show this again tomorrow with a refresher.",
};

const REVIEW_CURVE: Record<DsaConfidence, readonly number[]> = {
  got_it: [3, 7, 14, 21, 30],
  review: [2, 4, 8, 14, 21],
  confused: [1, 2, 4, 7, 14],
};

export interface DsaReviewSchedule {
  nextOffsetDays: number;
  nextRepetitions: number;
}

export function planDsaReview(input: {
  confidence: DsaConfidence;
  currentRepetitions: number;
}): DsaReviewSchedule {
  const curve = REVIEW_CURVE[input.confidence];
  const reps = Math.max(1, Math.min(input.currentRepetitions, curve.length));
  const nextRepetitions = Math.min(reps + 1, curve.length);
  const offset = curve[reps - 1] ?? curve[curve.length - 1]!;
  return { nextOffsetDays: offset, nextRepetitions };
}
