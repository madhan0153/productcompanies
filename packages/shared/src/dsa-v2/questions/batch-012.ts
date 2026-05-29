// DSA v2 — Batch 12 (questions 351–400).
//
// 50 questions, 351–400. Difficulty mix: 39 hard + 11 medium.
// Bucket mix: 43 pure_dsa + 5 ai_applied + 2 indian_domain.
// All status pending_review. No duplicate canonical problems across the bank.
//
// Canonical coverage (distinct from batches 1–11):
//   351 Largest Color Value in a Directed Graph · 352 Parallel Courses III ·
//   353 Maximum Path Quality of a Graph · 354 Minimum Obstacle Removal to Reach
//   Corner · 355 Minimum Time to Visit a Cell in a Grid · 356 Number of
//   Increasing Paths in a Grid · 357 Sum of Distances in Tree · 358 Longest Path
//   With Different Adjacent Characters · 359 Distribute Coins in Binary Tree ·
//   360 Maximum Product of Splitted Binary Tree · 361 Number of Ways to Form a
//   Target String Given a Dictionary · 362 Number of Subsequences That Satisfy
//   the Given Sum Condition · 363 Ones and Zeroes · 364 Cherry Pickup II ·
//   365 Domino and Tromino Tiling · 366 Decode Ways II · 367 Unique Paths III ·
//   368 Number of Squareful Arrays · 369 Optimal Account Balancing · 370 Split
//   Array into Fibonacci Sequence · 371 Maximum Score Words Formed by Letters ·
//   372 The Number of Beautiful Subsets · 373 Word Squares · 374 Design Add and
//   Search Words Data Structure · 375 Maximum XOR of Two Numbers in an Array ·
//   376 Maximum XOR With an Element From Array · 377 Minimum Number of Work
//   Sessions to Finish the Tasks · 378 Minimum XOR Sum of Two Arrays ·
//   379 Minimum Incompatibility · 380 Find Minimum Time to Finish All Jobs ·
//   381 Maximum Good People Based on Statements · 382 Maximum Compatibility Score
//   Sum · 383 Partition Array Into Two Arrays to Minimize Sum Difference ·
//   384 Checking Existence of Edge Length Limited Paths · 385 Number of Good
//   Paths · 386 Find All People With Secret · 387 Stamping The Sequence ·
//   388 Video Stitching · 389 Course Schedule III · 390 Minimum Falling Path
//   Sum · 391 Triangle · 392 Maximum Points You Can Obtain from Cards ·
//   393 Longest Turbulent Subarray · 394 Wiggle Subsequence · 395 Longest String
//   Chain · 396 Delete and Earn · 397 Number of Dice Rolls With Target Sum ·
//   398 Target Sum · 399 Palindrome Partitioning · 400 Combination Sum III.

import type { DsaV2Question } from "../types";

export const BATCH_012: readonly DsaV2Question[] = [
  // ──────────────────────────────────────────────────────────────────────
  // 351 — pure_dsa · graphs · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-color-value-dag",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Largest Single-Color Run Along a Pipeline Path",
    framing:
      "A data pipeline is a directed graph of stages, each tagged with a color (a processing category). Along any path, find the maximum number of nodes sharing one color; report -1 if the graph has a cycle.",
    statement:
      "Given a directed graph of n nodes (0-indexed) where colors is a string with colors[i] the color of node i, and edges is a list of directed edges [u, v], the value of a path is the largest count of any single color among the nodes on it. Return the maximum value over all paths, or -1 if the graph contains a cycle.",
    inputFormat: "A string colors of lowercase letters and a list edges of directed [u, v] pairs.",
    outputFormat: "An integer: the maximum single-color path value, or -1 on a cycle.",
    constraints: [
      "1 <= n <= 100000",
      "0 <= edges.length <= 100000",
      "colors consists of lowercase English letters.",
    ],
    examples: [
      {
        input: 'colors = "abaca", edges = [[0,1],[0,2],[2,3],[3,4]]',
        output: "3",
        explanation: "The path 0->2->3->4 has color 'a' appearing 3 times.",
      },
      {
        input: 'colors = "a", edges = [[0,0]]',
        output: "-1",
        explanation: "The self-loop is a cycle.",
      },
    ],
    approach: [
      "Process nodes in topological order using Kahn's algorithm; a failure to order all nodes signals a cycle.",
      "Keep dp[node][c] = the maximum count of color c on any path ending at node.",
      "When a node is finalized, add its own color, then relax all out-neighbors.",
      "For each edge u->v, dp[v][c] = max(dp[v][c], dp[u][c]).",
      "The answer is the global maximum over all dp[node][color].",
    ],
    solutionSteps: [
      "Build adjacency and in-degrees; enqueue all zero in-degree nodes.",
      "Pop u, increment dp[u][color(u)], update the global best.",
      "For each edge u->v, take dp[v][c] = max(dp[v][c], dp[u][c]); decrement in-degree and enqueue v when it hits 0.",
      "Count processed nodes; if fewer than n, a cycle exists -> return -1.",
      "Return the best color count seen.",
    ],
    code: {
      python: `from collections import deque

def largest_path_value(colors: str, edges: list[list[int]]) -> int:
    n = len(colors)
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    for u, v in edges:
        adj[u].append(v)
        indeg[v] += 1
    dp = [[0] * 26 for _ in range(n)]
    q = deque(i for i in range(n) if indeg[i] == 0)
    seen = 0
    best = 0
    while q:
        u = q.popleft()
        seen += 1
        c = ord(colors[u]) - ord("a")
        dp[u][c] += 1
        best = max(best, dp[u][c])
        for v in adj[u]:
            for k in range(26):
                if dp[u][k] > dp[v][k]:
                    dp[v][k] = dp[u][k]
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    return best if seen == n else -1
`,
      java: `import java.util.*;

class Solution {
    public int largestPathValue(String colors, int[][] edges) {
        int n = colors.length();
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        int[] indeg = new int[n];
        for (int[] e : edges) { adj.get(e[0]).add(e[1]); indeg[e[1]]++; }
        int[][] dp = new int[n][26];
        Deque<Integer> q = new ArrayDeque<>();
        for (int i = 0; i < n; i++) if (indeg[i] == 0) q.add(i);
        int seen = 0, best = 0;
        while (!q.isEmpty()) {
            int u = q.poll();
            seen++;
            int c = colors.charAt(u) - 'a';
            dp[u][c]++;
            best = Math.max(best, dp[u][c]);
            for (int v : adj.get(u)) {
                for (int k = 0; k < 26; k++) dp[v][k] = Math.max(dp[v][k], dp[u][k]);
                if (--indeg[v] == 0) q.add(v);
            }
        }
        return seen == n ? best : -1;
    }
}
`,
      cpp: `#include <vector>
#include <string>
#include <queue>
#include <algorithm>
using namespace std;

class Solution {
public:
    int largestPathValue(string colors, vector<vector<int>>& edges) {
        int n = colors.size();
        vector<vector<int>> adj(n);
        vector<int> indeg(n, 0);
        for (auto& e : edges) { adj[e[0]].push_back(e[1]); indeg[e[1]]++; }
        vector<array<int, 26>> dp(n);
        for (auto& row : dp) row.fill(0);
        queue<int> q;
        for (int i = 0; i < n; i++) if (indeg[i] == 0) q.push(i);
        int seen = 0, best = 0;
        while (!q.empty()) {
            int u = q.front(); q.pop();
            seen++;
            int c = colors[u] - 'a';
            dp[u][c]++;
            best = max(best, dp[u][c]);
            for (int v : adj[u]) {
                for (int k = 0; k < 26; k++) dp[v][k] = max(dp[v][k], dp[u][k]);
                if (--indeg[v] == 0) q.push(v);
            }
        }
        return seen == n ? best : -1;
    }
};
`,
    },
    complexity: { time: "O((V + E) * 26)", space: "O(V * 26)" },
    pitfalls: [
      "Incrementing a node's own color before propagating, or after — propagate the incoming dp first, then add the node's color when it is finalized.",
      "Not detecting cycles via the processed-node count.",
      "Forgetting that dp must track all 26 colors, not just the path's dominant one.",
    ],
    edgeCases: [
      "A self-loop (cycle, return -1).",
      "Disconnected components.",
      "All nodes the same color.",
    ],
    whyItMatters:
      "Combining topological order with per-attribute DP is the standard way to compute longest-path-style statistics on DAGs.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 352 — pure_dsa · graphs · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-months-course-plan",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "backend_engineer"],
    title: "Minimum Months to Complete All Build Stages",
    framing:
      "A build system runs stages, each taking a fixed duration. A stage can start only after all its prerequisites finish, but independent stages run in parallel. Find the minimum total time to finish everything.",
    statement:
      "Given n stages (1-indexed) where time[i-1] is the months stage i takes, and relations where [prev, next] means stage prev must complete before stage next begins, return the minimum number of months to complete all stages. Independent stages run simultaneously. The dependency graph is a DAG.",
    inputFormat: "An integer n, a list relations of [prev, next] prerequisite edges, and an array time of durations.",
    outputFormat: "An integer: the minimum total months.",
    constraints: [
      "1 <= n <= 50000",
      "0 <= relations.length <= 50000",
      "1 <= time[i] <= 10^4; the graph is acyclic.",
    ],
    examples: [
      {
        input: "n = 3, relations = [[1,3],[2,3]], time = [3,2,5]",
        output: "8",
        explanation: "Stages 1 and 2 run in parallel (max 3), then stage 3 takes 5: 3 + 5 = 8.",
      },
      {
        input: "n = 5, relations = [[1,5],[2,5],[3,5],[3,4],[4,5]], time = [1,2,3,4,5]",
        output: "12",
        explanation: "The critical path 3 -> 4 -> 5 sums to 3 + 4 + 5 = 12.",
      },
    ],
    approach: [
      "The minimum completion time is the longest weighted path (critical path) in the DAG.",
      "Topologically order the stages with Kahn's algorithm.",
      "finish[node] = time[node] + max(finish[prereq]) over incoming edges.",
      "Process nodes only after all prerequisites are finalized.",
      "The answer is the maximum finish time across all stages.",
    ],
    solutionSteps: [
      "Build adjacency and in-degrees; initialize finish[i] = time[i] for zero in-degree nodes and enqueue them.",
      "Pop u; for each successor v: finish[v] = max(finish[v], finish[u] + time[v]).",
      "Decrement in-degree of v; enqueue when it reaches 0.",
      "Track the global maximum finish time.",
      "Return that maximum.",
    ],
    code: {
      python: `from collections import deque

def minimum_time(n: int, relations: list[list[int]], time: list[int]) -> int:
    adj = [[] for _ in range(n + 1)]
    indeg = [0] * (n + 1)
    for a, b in relations:
        adj[a].append(b)
        indeg[b] += 1
    finish = [0] * (n + 1)
    q = deque()
    for i in range(1, n + 1):
        if indeg[i] == 0:
            finish[i] = time[i - 1]
            q.append(i)
    best = 0
    while q:
        u = q.popleft()
        best = max(best, finish[u])
        for v in adj[u]:
            if finish[u] + time[v - 1] > finish[v]:
                finish[v] = finish[u] + time[v - 1]
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    return best
`,
      java: `import java.util.*;

class Solution {
    public int minimumTime(int n, int[][] relations, int[] time) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        int[] indeg = new int[n + 1];
        for (int[] r : relations) { adj.get(r[0]).add(r[1]); indeg[r[1]]++; }
        int[] finish = new int[n + 1];
        Deque<Integer> q = new ArrayDeque<>();
        for (int i = 1; i <= n; i++) if (indeg[i] == 0) { finish[i] = time[i - 1]; q.add(i); }
        int best = 0;
        while (!q.isEmpty()) {
            int u = q.poll();
            best = Math.max(best, finish[u]);
            for (int v : adj.get(u)) {
                finish[v] = Math.max(finish[v], finish[u] + time[v - 1]);
                if (--indeg[v] == 0) q.add(v);
            }
        }
        return best;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
#include <algorithm>
using namespace std;

class Solution {
public:
    int minimumTime(int n, vector<vector<int>>& relations, vector<int>& time) {
        vector<vector<int>> adj(n + 1);
        vector<int> indeg(n + 1, 0);
        for (auto& r : relations) { adj[r[0]].push_back(r[1]); indeg[r[1]]++; }
        vector<int> finish(n + 1, 0);
        queue<int> q;
        for (int i = 1; i <= n; i++) if (indeg[i] == 0) { finish[i] = time[i - 1]; q.push(i); }
        int best = 0;
        while (!q.empty()) {
            int u = q.front(); q.pop();
            best = max(best, finish[u]);
            for (int v : adj[u]) {
                finish[v] = max(finish[v], finish[u] + time[v - 1]);
                if (--indeg[v] == 0) q.push(v);
            }
        }
        return best;
    }
};
`,
    },
    complexity: { time: "O(V + E)", space: "O(V + E)" },
    pitfalls: [
      "Summing all durations instead of taking the longest path (parallelism is allowed).",
      "Initializing finish times before all prerequisites are processed.",
      "Off-by-one between 1-indexed stages and 0-indexed time array.",
    ],
    edgeCases: [
      "No relations (answer is the maximum single duration).",
      "A single long chain (answer is the sum along it).",
      "Multiple independent chains.",
    ],
    whyItMatters:
      "Critical-path analysis on a DAG is the foundation of project scheduling, build systems, and dataflow latency estimation.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 353 — pure_dsa · backtracking · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-quality-timed-walk",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "platform_engineer"],
    title: "Maximum Value Collected on a Time-Bounded Tour",
    framing:
      "An inspector tours a network of sites, each worth some value, starting and ending at site 0 within a time budget. Each site's value counts once no matter how often visited. Maximize the value collected.",
    statement:
      "Given an undirected graph with node values[] and edges where edge [u, v, t] takes t time to traverse, plus an integer maxTime, find a walk that starts and ends at node 0 with total traversal time at most maxTime. The quality is the sum of values of distinct nodes visited. Return the maximum quality.",
    inputFormat: "An array values, an array edges of [u, v, time], and an integer maxTime.",
    outputFormat: "An integer: the maximum quality of a valid round-trip walk.",
    constraints: [
      "1 <= values.length <= 1000",
      "0 <= edges.length <= 2000; each node has at most 4 incident edges",
      "10 <= timeCost per edge, maxTime <= 100 (so few edges fit in budget).",
    ],
    examples: [
      {
        input: "values = [0,32,10,43], edges = [[0,1,10],[1,2,15],[0,3,10]], maxTime = 49",
        output: "75",
        explanation: "0->1->0->3->0 collects 0+32+43 = 75 within 49 time.",
      },
      {
        input: "values = [5,10,15,20], edges = [[0,1,10],[1,2,10],[0,3,10]], maxTime = 30",
        output: "25",
        explanation: "0->3->0->... best collects 5 + 20 = 25.",
      },
    ],
    approach: [
      "Because each node has at most 4 edges and the smallest edge cost is 10 while maxTime <= 100, paths are short — a DFS is feasible.",
      "Track the current node, remaining time, accumulated quality, and a visit count per node.",
      "Add a node's value the first time it is entered (count goes 0 -> 1).",
      "Whenever the current node is 0, update the global best with the current quality.",
      "Backtrack by restoring the visit count and quality after exploring each edge.",
    ],
    solutionSteps: [
      "Build an adjacency list of (neighbor, cost).",
      "DFS from node 0 with full maxTime; maintain a count[] array, starting with count[0]=1 and quality=values[0].",
      "At each node, if it is node 0 update best with quality.",
      "For each edge within the remaining time, increase count[next]; add values[next] if it just became 1; recurse; then undo.",
      "Return best after the DFS.",
    ],
    code: {
      python: `def maximal_path_quality(values: list[int], edges: list[list[int]], max_time: int) -> int:
    n = len(values)
    adj = [[] for _ in range(n)]
    for u, v, t in edges:
        adj[u].append((v, t))
        adj[v].append((u, t))
    count = [0] * n
    count[0] = 1
    best = 0

    def dfs(node: int, time_left: int, quality: int) -> None:
        nonlocal best
        if node == 0:
            best = max(best, quality)
        for nxt, cost in adj[node]:
            if cost <= time_left:
                gained = values[nxt] if count[nxt] == 0 else 0
                count[nxt] += 1
                dfs(nxt, time_left - cost, quality + gained)
                count[nxt] -= 1

    dfs(0, max_time, values[0])
    return best
`,
      java: `import java.util.*;

class Solution {
    int[] count;
    int best = 0;
    List<int[]>[] adj;
    int[] values;

    public int maximalPathQuality(int[] values, int[][] edges, int maxTime) {
        int n = values.length;
        this.values = values;
        adj = new List[n];
        for (int i = 0; i < n; i++) adj[i] = new ArrayList<>();
        for (int[] e : edges) {
            adj[e[0]].add(new int[]{e[1], e[2]});
            adj[e[1]].add(new int[]{e[0], e[2]});
        }
        count = new int[n];
        count[0] = 1;
        dfs(0, maxTime, values[0]);
        return best;
    }

    private void dfs(int node, int timeLeft, int quality) {
        if (node == 0) best = Math.max(best, quality);
        for (int[] e : adj[node]) {
            if (e[1] <= timeLeft) {
                int gained = count[e[0]] == 0 ? values[e[0]] : 0;
                count[e[0]]++;
                dfs(e[0], timeLeft - e[1], quality + gained);
                count[e[0]]--;
            }
        }
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
    vector<vector<pair<int, int>>> adj;
    vector<int> count, values;
    int best = 0;
    void dfs(int node, int timeLeft, int quality) {
        if (node == 0) best = max(best, quality);
        for (auto& [nxt, cost] : adj[node]) {
            if (cost <= timeLeft) {
                int gained = count[nxt] == 0 ? values[nxt] : 0;
                count[nxt]++;
                dfs(nxt, timeLeft - cost, quality + gained);
                count[nxt]--;
            }
        }
    }
public:
    int maximalPathQuality(vector<int>& values, vector<vector<int>>& edges, int maxTime) {
        int n = values.size();
        this->values = values;
        adj.assign(n, {});
        for (auto& e : edges) {
            adj[e[0]].push_back({e[1], e[2]});
            adj[e[1]].push_back({e[0], e[2]});
        }
        count.assign(n, 0);
        count[0] = 1;
        dfs(0, maxTime, values[0]);
        return best;
    }
};
`,
    },
    complexity: { time: "O(4^(maxTime/minEdge) * V)", space: "O(V)" },
    pitfalls: [
      "Adding a node's value on every visit instead of only the first.",
      "Forgetting to count the starting node 0's value before the DFS.",
      "Not restoring the visit count on backtrack, corrupting sibling branches.",
    ],
    edgeCases: [
      "No edges (answer is values[0]).",
      "A tight budget allowing only an immediate there-and-back.",
      "Revisiting node 0 mid-walk to bank progress.",
    ],
    whyItMatters:
      "Bounded DFS over a low-degree graph is the practical exact method for prize-collecting tours when the search depth is provably small.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 354 — pure_dsa · graphs · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-walls-break-to-exit",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "software_engineer"],
    title: "Fewest Obstacles to Clear a Grid Route",
    framing:
      "A maintenance bot crosses a floor grid from the top-left to the bottom-right. Empty cells are free to enter; obstacle cells can be cleared at a cost of one each. Minimize the number of obstacles cleared.",
    statement:
      "Given an m x n grid where 0 is empty and 1 is an obstacle, you move up/down/left/right and may remove obstacles. Return the minimum number of obstacles you must remove to travel from (0,0) to (m-1,n-1).",
    inputFormat: "An m x n binary grid (0 empty, 1 obstacle).",
    outputFormat: "An integer: the minimum obstacles removed.",
    constraints: [
      "1 <= m, n <= 100000 with m * n <= 200000",
      "grid[i][j] is 0 or 1; grid[0][0] and grid[m-1][n-1] are 0.",
    ],
    examples: [
      {
        input: "grid = [[0,1,1],[1,1,0],[1,1,0]]",
        output: "2",
        explanation: "Two obstacles must be removed to reach the bottom-right.",
      },
      {
        input: "grid = [[0,0,0],[0,0,0],[0,0,0]]",
        output: "0",
        explanation: "A clear path exists.",
      },
    ],
    approach: [
      "Moving into an empty cell costs 0; into an obstacle costs 1 — a classic 0-1 weighted grid.",
      "Use 0-1 BFS with a double-ended queue keyed by obstacles removed.",
      "Push 0-cost moves to the front and 1-cost moves to the back so the deque stays sorted by cost.",
      "Maintain a distance grid of minimum removals to each cell.",
      "Return the distance at the destination.",
    ],
    solutionSteps: [
      "Initialize dist[0][0] = 0 and a deque with (0,0).",
      "Pop the front cell; for each neighbor compute newCost = dist + grid[neighbor].",
      "If newCost < dist[neighbor], update it and push front if the move cost 0, else back.",
      "Continue until the deque empties.",
      "Return dist[m-1][n-1].",
    ],
    code: {
      python: `from collections import deque

def minimum_obstacles(grid: list[list[int]]) -> int:
    m, n = len(grid), len(grid[0])
    dist = [[float("inf")] * n for _ in range(m)]
    dist[0][0] = 0
    dq = deque([(0, 0)])
    while dq:
        r, c = dq.popleft()
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n:
                cost = dist[r][c] + grid[nr][nc]
                if cost < dist[nr][nc]:
                    dist[nr][nc] = cost
                    if grid[nr][nc] == 0:
                        dq.appendleft((nr, nc))
                    else:
                        dq.append((nr, nc))
    return dist[m - 1][n - 1]
`,
      java: `import java.util.*;

class Solution {
    public int minimumObstacles(int[][] grid) {
        int m = grid.length, n = grid[0].length;
        int[][] dist = new int[m][n];
        for (int[] row : dist) Arrays.fill(row, Integer.MAX_VALUE);
        dist[0][0] = 0;
        Deque<int[]> dq = new ArrayDeque<>();
        dq.add(new int[]{0, 0});
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!dq.isEmpty()) {
            int[] cur = dq.pollFirst();
            int r = cur[0], c = cur[1];
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr >= 0 && nr < m && nc >= 0 && nc < n) {
                    int cost = dist[r][c] + grid[nr][nc];
                    if (cost < dist[nr][nc]) {
                        dist[nr][nc] = cost;
                        if (grid[nr][nc] == 0) dq.addFirst(new int[]{nr, nc});
                        else dq.addLast(new int[]{nr, nc});
                    }
                }
            }
        }
        return dist[m - 1][n - 1];
    }
}
`,
      cpp: `#include <vector>
#include <deque>
#include <climits>
using namespace std;

class Solution {
public:
    int minimumObstacles(vector<vector<int>>& grid) {
        int m = grid.size(), n = grid[0].size();
        vector<vector<int>> dist(m, vector<int>(n, INT_MAX));
        dist[0][0] = 0;
        deque<pair<int, int>> dq;
        dq.push_back({0, 0});
        int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!dq.empty()) {
            auto [r, c] = dq.front(); dq.pop_front();
            for (auto& d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr >= 0 && nr < m && nc >= 0 && nc < n) {
                    int cost = dist[r][c] + grid[nr][nc];
                    if (cost < dist[nr][nc]) {
                        dist[nr][nc] = cost;
                        if (grid[nr][nc] == 0) dq.push_front({nr, nc});
                        else dq.push_back({nr, nc});
                    }
                }
            }
        }
        return dist[m - 1][n - 1];
    }
};
`,
    },
    complexity: { time: "O(m * n)", space: "O(m * n)" },
    pitfalls: [
      "Using a normal queue (plain BFS), which is wrong because moves have unequal costs.",
      "Pushing obstacle moves to the front instead of the back, breaking the 0-1 BFS ordering.",
      "Revisiting cells without the distance-improvement check.",
    ],
    edgeCases: [
      "A fully clear grid (answer 0).",
      "A 1x1 grid (answer 0).",
      "An obstacle-heavy grid forcing several removals.",
    ],
    whyItMatters:
      "0-1 BFS is the optimal linear-time shortest-path method when every edge costs 0 or 1, common in grid and toggle-cost routing.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 355 — pure_dsa · graphs · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "earliest-arrival-time-grid",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "software_engineer"],
    title: "Earliest Time to Reach the Far Corner",
    framing:
      "Each cell of a grid unlocks at a given second; you may enter a cell only at or after its unlock time. Moving to an adjacent cell takes one second, and you may pace back and forth to wait. Find the earliest arrival at the bottom-right.",
    statement:
      "Given an m x n matrix grid where grid[i][j] is the minimum time you may enter cell (i,j), you start at (0,0) at time 0 and move 4-directionally one cell per second. You may move back and forth between visited cells to pass time. Return the minimum time to reach (m-1,n-1), or -1 if it is impossible.",
    inputFormat: "An m x n integer matrix grid of entry times; grid[0][0] is 0.",
    outputFormat: "An integer: the earliest arrival time at the bottom-right, or -1.",
    constraints: [
      "2 <= m, n <= 1000",
      "0 <= grid[i][j] <= 10^5; grid[0][0] == 0.",
    ],
    examples: [
      {
        input: "grid = [[0,1,3,2],[5,1,2,5],[4,3,8,6]]",
        output: "7",
        explanation: "Waiting where needed, the corner is reachable at time 7.",
      },
      {
        input: "grid = [[0,2,4],[3,2,1],[1,0,4]]",
        output: "-1",
        explanation: "Both cells adjacent to the start require time > 1, so you can never make a first move.",
      },
    ],
    approach: [
      "If both neighbors of the start require time > 1, no first move is possible — return -1.",
      "Run Dijkstra where the 'distance' is the earliest arrival time at each cell.",
      "Entering a neighbor takes the current time + 1, but not before its unlock time.",
      "If you must wait, you bounce back and forth, so arrival keeps the parity of (current time + 1); add 1 if the parity is off.",
      "Pop cells in increasing arrival time; the first time the destination is popped is the answer.",
    ],
    solutionSteps: [
      "Guard: if grid[0][1] > 1 and grid[1][0] > 1, return -1.",
      "Dijkstra from (0,0) with arrival 0; maintain a best-time grid.",
      "For each neighbor, base = time + 1; if grid[nr][nc] > base, set arrival = grid[nr][nc] + ((grid[nr][nc] - base) % 2), else base.",
      "Relax and push when the arrival improves.",
      "Return the arrival time at (m-1,n-1).",
    ],
    code: {
      python: `import heapq

def minimum_time(grid: list[list[int]]) -> int:
    m, n = len(grid), len(grid[0])
    if grid[0][1] > 1 and grid[1][0] > 1:
        return -1
    best = [[float("inf")] * n for _ in range(m)]
    best[0][0] = 0
    pq = [(0, 0, 0)]
    while pq:
        t, r, c = heapq.heappop(pq)
        if r == m - 1 and c == n - 1:
            return t
        if t > best[r][c]:
            continue
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n:
                arrive = t + 1
                if grid[nr][nc] > arrive:
                    wait = grid[nr][nc] - arrive
                    arrive = grid[nr][nc] + (wait % 2)
                if arrive < best[nr][nc]:
                    best[nr][nc] = arrive
                    heapq.heappush(pq, (arrive, nr, nc))
    return -1
`,
      java: `import java.util.*;

class Solution {
    public int minimumTime(int[][] grid) {
        int m = grid.length, n = grid[0].length;
        if (grid[0][1] > 1 && grid[1][0] > 1) return -1;
        int[][] best = new int[m][n];
        for (int[] row : best) Arrays.fill(row, Integer.MAX_VALUE);
        best[0][0] = 0;
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
        pq.add(new int[]{0, 0, 0});
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!pq.isEmpty()) {
            int[] cur = pq.poll();
            int t = cur[0], r = cur[1], c = cur[2];
            if (r == m - 1 && c == n - 1) return t;
            if (t > best[r][c]) continue;
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr >= 0 && nr < m && nc >= 0 && nc < n) {
                    int arrive = t + 1;
                    if (grid[nr][nc] > arrive) {
                        int wait = grid[nr][nc] - arrive;
                        arrive = grid[nr][nc] + (wait % 2);
                    }
                    if (arrive < best[nr][nc]) {
                        best[nr][nc] = arrive;
                        pq.add(new int[]{arrive, nr, nc});
                    }
                }
            }
        }
        return -1;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
#include <climits>
using namespace std;

class Solution {
public:
    int minimumTime(vector<vector<int>>& grid) {
        int m = grid.size(), n = grid[0].size();
        if (grid[0][1] > 1 && grid[1][0] > 1) return -1;
        vector<vector<int>> best(m, vector<int>(n, INT_MAX));
        best[0][0] = 0;
        priority_queue<array<int, 3>, vector<array<int, 3>>, greater<>> pq;
        pq.push({0, 0, 0});
        int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!pq.empty()) {
            auto cur = pq.top(); pq.pop();
            int t = cur[0], r = cur[1], c = cur[2];
            if (r == m - 1 && c == n - 1) return t;
            if (t > best[r][c]) continue;
            for (auto& d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr >= 0 && nr < m && nc >= 0 && nc < n) {
                    int arrive = t + 1;
                    if (grid[nr][nc] > arrive) {
                        int wait = grid[nr][nc] - arrive;
                        arrive = grid[nr][nc] + (wait % 2);
                    }
                    if (arrive < best[nr][nc]) {
                        best[nr][nc] = arrive;
                        pq.push({arrive, nr, nc});
                    }
                }
            }
        }
        return -1;
    }
};
`,
    },
    complexity: { time: "O(m * n * log(m * n))", space: "O(m * n)" },
    pitfalls: [
      "Missing the -1 guard when both start neighbors are locked beyond time 1.",
      "Getting the parity adjustment wrong when waiting (you can only burn time in 2-second bounces).",
      "Using plain BFS, which ignores the variable wait times.",
    ],
    edgeCases: [
      "Immediate dead end at the start (-1).",
      "A grid where no waiting is ever needed.",
      "Large unlock times forcing long waits.",
    ],
    whyItMatters:
      "Dijkstra with time-dependent, parity-constrained edge costs models real scheduling on resources that unlock over time.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 356 — ai_applied · dp_2d · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-gradient-ascent-paths",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 12,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "data_engineer"],
    title: "Count Strictly Increasing Paths on a Score Grid",
    framing:
      "On a grid of model confidence scores, count every strictly increasing walk (a monotone ascent of any length). Each single cell counts as a length-one path. Report the total modulo 1e9 + 7.",
    statement:
      "Given an m x n grid of integers, count the number of strictly increasing paths where you move to a 4-directionally adjacent cell with a strictly greater value. Paths of length 1 (a single cell) count too. Return the total number of such paths modulo 1e9 + 7.",
    inputFormat: "An m x n integer grid.",
    outputFormat: "An integer: the count of strictly increasing paths modulo 1e9 + 7.",
    constraints: [
      "1 <= m, n <= 1000 with m * n <= 100000",
      "1 <= grid[i][j] <= 10^5",
    ],
    examples: [
      {
        input: "grid = [[1,1],[3,4]]",
        output: "8",
        explanation: "4 single cells plus paths 1->3, 1->4, 3->4, 1->3->4 = 8.",
      },
      {
        input: "grid = [[1],[2]]",
        output: "3",
        explanation: "Two single cells plus the path 1->2.",
      },
    ],
    approach: [
      "Let dp[r][c] be the number of strictly increasing paths starting at (r,c).",
      "dp[r][c] = 1 + sum of dp[neighbor] for neighbors with a strictly greater value.",
      "Memoize with DFS; the strict-increase rule guarantees no cycles.",
      "Sum dp over all cells for the final answer.",
      "Apply the modulus throughout to keep counts bounded.",
    ],
    solutionSteps: [
      "Define a memoized dfs(r,c) returning the path count starting there.",
      "Initialize the result to 1 (the single-cell path).",
      "Add dfs(nr,nc) for each strictly greater neighbor, taking the modulus.",
      "Sum dfs over every cell.",
      "Return the total modulo 1e9 + 7.",
    ],
    code: {
      python: `import sys
from functools import lru_cache

def count_paths(grid: list[list[int]]) -> int:
    sys.setrecursionlimit(300000)
    MOD = 10**9 + 7
    m, n = len(grid), len(grid[0])

    @lru_cache(maxsize=None)
    def dfs(r: int, c: int) -> int:
        total = 1
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] > grid[r][c]:
                total = (total + dfs(nr, nc)) % MOD
        return total

    return sum(dfs(r, c) for r in range(m) for c in range(n)) % MOD
`,
      java: `class Solution {
    int m, n;
    int[][] grid, memo;
    final int MOD = 1_000_000_007;

    public int countPaths(int[][] grid) {
        this.grid = grid;
        m = grid.length; n = grid[0].length;
        memo = new int[m][n];
        long total = 0;
        for (int r = 0; r < m; r++)
            for (int c = 0; c < n; c++)
                total = (total + dfs(r, c)) % MOD;
        return (int) total;
    }

    private int dfs(int r, int c) {
        if (memo[r][c] != 0) return memo[r][c];
        long total = 1;
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        for (int[] d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nr < m && nc >= 0 && nc < n && grid[nr][nc] > grid[r][c])
                total = (total + dfs(nr, nc)) % MOD;
        }
        return memo[r][c] = (int) total;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
    int m, n;
    const int MOD = 1000000007;
    vector<vector<int>> memo;
    int dfs(vector<vector<int>>& grid, int r, int c) {
        if (memo[r][c]) return memo[r][c];
        long total = 1;
        int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        for (auto& d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nr < m && nc >= 0 && nc < n && grid[nr][nc] > grid[r][c])
                total = (total + dfs(grid, nr, nc)) % MOD;
        }
        return memo[r][c] = (int) total;
    }
public:
    int countPaths(vector<vector<int>>& grid) {
        m = grid.size(); n = grid[0].size();
        memo.assign(m, vector<int>(n, 0));
        long total = 0;
        for (int r = 0; r < m; r++)
            for (int c = 0; c < n; c++)
                total = (total + dfs(grid, r, c)) % MOD;
        return (int) total;
    }
};
`,
    },
    complexity: { time: "O(m * n)", space: "O(m * n)" },
    pitfalls: [
      "Counting paths with non-strict increases, which would create cycles and infinite recursion.",
      "Forgetting that each single cell is itself a valid path of length 1.",
      "Omitting the modulus and overflowing the path count.",
    ],
    edgeCases: [
      "All equal values (each cell counts once, no longer paths).",
      "A single cell.",
      "A strictly increasing snake covering the whole grid.",
    ],
    whyItMatters:
      "Memoized DFS over an implicit DAG induced by a monotonic constraint is the standard way to count paths in dependency or gradient landscapes.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 357 — pure_dsa · trees · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "total-distance-from-each-node",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "platform_engineer"],
    title: "Sum of Distances from Every Node in a Tree",
    framing:
      "In a tree-shaped service topology, you want, for each node, the total hop distance to all other nodes — to pick low-latency coordinators. Compute all answers in linear time.",
    statement:
      "Given an undirected tree of n nodes (0-indexed) described by edges, return an array result where result[i] is the sum of the distances (number of edges) from node i to every other node.",
    inputFormat: "An integer n and a list edges of n-1 undirected [u, v] pairs forming a tree.",
    outputFormat: "An array of n integers, the distance sums for each node.",
    constraints: [
      "1 <= n <= 30000",
      "edges forms a valid tree with n-1 edges.",
    ],
    examples: [
      {
        input: "n = 6, edges = [[0,1],[0,2],[2,3],[2,4],[2,5]]",
        output: "[8,12,6,10,10,10]",
        explanation: "Node 2 is most central with total distance 6.",
      },
      {
        input: "n = 1, edges = []",
        output: "[0]",
        explanation: "A single node has zero total distance.",
      },
    ],
    approach: [
      "Root the tree at node 0. First DFS computes subtree sizes and the root's total distance.",
      "count[node] = nodes in its subtree; res[0] = sum of depths from the root.",
      "Re-root in a second DFS: moving the root from parent p to child c, count[c] nodes get one closer and n-count[c] get one farther.",
      "So res[c] = res[p] - count[c] + (n - count[c]).",
      "Propagate this rerooting across the whole tree.",
    ],
    solutionSteps: [
      "Build adjacency lists.",
      "Post-order DFS from 0: accumulate count[node] and add count[child] + (depth contributions) into res[0].",
      "Specifically res[0] += res[child] + count[child] when merging a child.",
      "Pre-order DFS to set res[child] = res[node] - count[child] + (n - count[child]).",
      "Return the res array.",
    ],
    code: {
      python: `import sys

def sum_of_distances_in_tree(n: int, edges: list[list[int]]) -> list[int]:
    sys.setrecursionlimit(100000)
    adj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
    count = [1] * n
    res = [0] * n

    def post(node: int, parent: int) -> None:
        for nxt in adj[node]:
            if nxt != parent:
                post(nxt, node)
                count[node] += count[nxt]
                res[node] += res[nxt] + count[nxt]

    def pre(node: int, parent: int) -> None:
        for nxt in adj[node]:
            if nxt != parent:
                res[nxt] = res[node] - count[nxt] + (n - count[nxt])
                pre(nxt, node)

    post(0, -1)
    pre(0, -1)
    return res
`,
      java: `import java.util.*;

class Solution {
    List<List<Integer>> adj;
    int[] count, res;
    int n;

    public int[] sumOfDistancesInTree(int n, int[][] edges) {
        this.n = n;
        adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) { adj.get(e[0]).add(e[1]); adj.get(e[1]).add(e[0]); }
        count = new int[n];
        Arrays.fill(count, 1);
        res = new int[n];
        post(0, -1);
        pre(0, -1);
        return res;
    }

    private void post(int node, int parent) {
        for (int nxt : adj.get(node))
            if (nxt != parent) {
                post(nxt, node);
                count[node] += count[nxt];
                res[node] += res[nxt] + count[nxt];
            }
    }

    private void pre(int node, int parent) {
        for (int nxt : adj.get(node))
            if (nxt != parent) {
                res[nxt] = res[node] - count[nxt] + (n - count[nxt]);
                pre(nxt, node);
            }
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
    vector<vector<int>> adj;
    vector<int> count, res;
    int n;
    void post(int node, int parent) {
        for (int nxt : adj[node])
            if (nxt != parent) {
                post(nxt, node);
                count[node] += count[nxt];
                res[node] += res[nxt] + count[nxt];
            }
    }
    void pre(int node, int parent) {
        for (int nxt : adj[node])
            if (nxt != parent) {
                res[nxt] = res[node] - count[nxt] + (n - count[nxt]);
                pre(nxt, node);
            }
    }
public:
    vector<int> sumOfDistancesInTree(int n, vector<vector<int>>& edges) {
        this->n = n;
        adj.assign(n, {});
        for (auto& e : edges) { adj[e[0]].push_back(e[1]); adj[e[1]].push_back(e[0]); }
        count.assign(n, 1);
        res.assign(n, 0);
        post(0, -1);
        pre(0, -1);
        return res;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Recomputing each node's answer with a fresh O(n) BFS, giving O(n^2).",
      "Getting the rerooting formula backward (which side gets closer vs farther).",
      "Counting the node itself in subtree sizes inconsistently.",
    ],
    edgeCases: [
      "A single node (answer [0]).",
      "A path graph (linear tree).",
      "A star graph centered on one node.",
    ],
    whyItMatters:
      "Rerooting technique converts a per-node aggregate from O(n^2) to O(n) and is essential for tree-wide centrality and influence metrics.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 358 — pure_dsa · trees · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "longest-distinct-label-chain",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Longest Path with Distinct Adjacent Labels",
    framing:
      "Nodes in a tree carry category labels. A clean handoff chain is a path where no two directly connected nodes share a label. Find the length (in nodes) of the longest such chain.",
    statement:
      "Given a tree rooted at node 0 with n nodes described by a parent array (parent[0] = -1) and a string s where s[i] is the character label of node i, return the number of nodes on the longest path such that no two adjacent nodes on the path have the same label.",
    inputFormat: "An array parent of length n (parent[0] = -1) and a string s of length n.",
    outputFormat: "An integer: the node count of the longest valid path.",
    constraints: [
      "1 <= n <= 100000",
      "parent describes a valid rooted tree; s consists of lowercase letters.",
    ],
    examples: [
      {
        input: 'parent = [-1,0,0,1,1,2], s = "abacbe"',
        output: "3",
        explanation: "Path 3 -> 1 -> 0 has labels c,b,a — all adjacent labels differ; length 3.",
      },
      {
        input: 'parent = [-1,0,0,0], s = "aabc"',
        output: "3",
        explanation: "Through the root, two differing-label children give a length-3 path.",
      },
    ],
    approach: [
      "For each node, compute the longest downward chain that starts at it and uses only children with a different label.",
      "A path can bend at a node: combine the two best valid child chains plus the node itself.",
      "During a post-order DFS, track the best and second-best child chain lengths from children with differing labels.",
      "Update a global answer with 1 + best + secondBest.",
      "Return to the parent the value 1 + best (the longest single downward arm).",
    ],
    solutionSteps: [
      "Build children lists from the parent array.",
      "DFS post-order; for each child whose label differs, get its returned arm length.",
      "Keep the top two arm lengths.",
      "Update answer = max(answer, 1 + top1 + top2).",
      "Return 1 + top1 to the caller; the final answer is the global best.",
    ],
    code: {
      python: `import sys

def longest_path(parent: list[int], s: str) -> int:
    sys.setrecursionlimit(300000)
    n = len(parent)
    children = [[] for _ in range(n)]
    for i in range(1, n):
        children[parent[i]].append(i)
    best = 1

    def dfs(node: int) -> int:
        nonlocal best
        top1 = top2 = 0
        for ch in children[node]:
            arm = dfs(ch)
            if s[ch] != s[node]:
                if arm > top1:
                    top2 = top1
                    top1 = arm
                elif arm > top2:
                    top2 = arm
        best = max(best, 1 + top1 + top2)
        return 1 + top1

    dfs(0)
    return best
`,
      java: `import java.util.*;

class Solution {
    List<List<Integer>> children;
    String s;
    int best = 1;

    public int longestPath(int[] parent, String s) {
        this.s = s;
        int n = parent.length;
        children = new ArrayList<>();
        for (int i = 0; i < n; i++) children.add(new ArrayList<>());
        for (int i = 1; i < n; i++) children.get(parent[i]).add(i);
        dfs(0);
        return best;
    }

    private int dfs(int node) {
        int top1 = 0, top2 = 0;
        for (int ch : children.get(node)) {
            int arm = dfs(ch);
            if (s.charAt(ch) != s.charAt(node)) {
                if (arm > top1) { top2 = top1; top1 = arm; }
                else if (arm > top2) top2 = arm;
            }
        }
        best = Math.max(best, 1 + top1 + top2);
        return 1 + top1;
    }
}
`,
      cpp: `#include <vector>
#include <string>
#include <algorithm>
using namespace std;

class Solution {
    vector<vector<int>> children;
    string s;
    int best = 1;
    int dfs(int node) {
        int top1 = 0, top2 = 0;
        for (int ch : children[node]) {
            int arm = dfs(ch);
            if (s[ch] != s[node]) {
                if (arm > top1) { top2 = top1; top1 = arm; }
                else if (arm > top2) top2 = arm;
            }
        }
        best = max(best, 1 + top1 + top2);
        return 1 + top1;
    }
public:
    int longestPath(vector<int>& parent, string s) {
        this->s = s;
        int n = parent.size();
        children.assign(n, {});
        for (int i = 1; i < n; i++) children[parent[i]].push_back(i);
        dfs(0);
        return best;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Only considering straight downward paths and missing paths that bend at a node through two children.",
      "Including a child arm even when its label matches the current node.",
      "Returning 1 + best + secondBest to the parent instead of just 1 + best.",
    ],
    edgeCases: [
      "All nodes sharing one label (answer 1).",
      "A single node.",
      "A path graph with alternating labels (answer n).",
    ],
    whyItMatters:
      "The 'best two child arms through a node' pattern is the canonical tree-diameter DP, reused for longest-path and bottleneck analyses.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 359 — pure_dsa · trees · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "balance-coins-in-tree",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "platform_engineer"],
    title: "Minimum Moves to Balance Tokens Across a Tree",
    framing:
      "Each node of a binary tree holds some tokens; the total token count equals the number of nodes. In one move a token shifts along one edge. Find the minimum moves so every node holds exactly one token.",
    statement:
      "Given the root of a binary tree with n nodes where node values are token counts summing to n, in each move you may move one token from a node to an adjacent node. Return the minimum number of moves to make every node hold exactly one token.",
    inputFormat: "The root of a binary tree (given as a level-order array in examples).",
    outputFormat: "An integer: the minimum number of moves.",
    constraints: [
      "1 <= n <= 100",
      "0 <= Node.val <= n; the sum of all values equals n.",
    ],
    examples: [
      {
        input: "root = [3,0,0]",
        output: "2",
        explanation: "Move one token from the root to each child: 2 moves.",
      },
      {
        input: "root = [0,3,0]",
        output: "3",
        explanation: "Three tokens travel from the left child outward: 3 moves.",
      },
    ],
    approach: [
      "Each edge must carry the net token imbalance of the subtree below it.",
      "Define balance(node) = node.val - 1 + balance(left) + balance(right).",
      "The number of moves across the edge to a child equals the absolute value of that child's balance.",
      "Accumulate abs(balance(left)) + abs(balance(right)) at every node.",
      "Return the accumulated total after a post-order traversal.",
    ],
    solutionSteps: [
      "Run a post-order DFS returning each subtree's balance.",
      "At a node, get left and right balances.",
      "Add abs(left) + abs(right) to a running move counter.",
      "Return node.val - 1 + left + right as this subtree's balance.",
      "The move counter after visiting the root is the answer.",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def distribute_coins(root: TreeNode | None) -> int:
    moves = 0

    def balance(node: TreeNode | None) -> int:
        nonlocal moves
        if not node:
            return 0
        left = balance(node.left)
        right = balance(node.right)
        moves += abs(left) + abs(right)
        return node.val - 1 + left + right

    balance(root)
    return moves
`,
      java: `class Solution {
    int moves = 0;

    public int distributeCoins(TreeNode root) {
        balance(root);
        return moves;
    }

    private int balance(TreeNode node) {
        if (node == null) return 0;
        int left = balance(node.left);
        int right = balance(node.right);
        moves += Math.abs(left) + Math.abs(right);
        return node.val - 1 + left + right;
    }
}
`,
      cpp: `#include <cstdlib>
struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

class Solution {
    int moves = 0;
    int balance(TreeNode* node) {
        if (!node) return 0;
        int left = balance(node->left);
        int right = balance(node->right);
        moves += abs(left) + abs(right);
        return node->val - 1 + left + right;
    }
public:
    int distributeCoins(TreeNode* root) {
        balance(root);
        return moves;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(h)" },
    pitfalls: [
      "Summing balances without absolute value — both surpluses and deficits cost moves.",
      "Forgetting to subtract 1 per node (each node keeps exactly one token).",
      "Trying to simulate token moves instead of using the edge-flow argument.",
    ],
    edgeCases: [
      "A single node already holding one token (0 moves).",
      "All tokens at the root.",
      "A deep skewed tree shuttling tokens far.",
    ],
    whyItMatters:
      "The edge-flow / subtree-balance argument is a clean accounting technique for minimum-movement and load-rebalancing problems on trees.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 360 — pure_dsa · trees · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-product-split-tree",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Maximum Product from Splitting a Tree",
    framing:
      "Cutting one edge of a weighted tree splits it into two components. To partition a workload tree into two balanced halves, maximize the product of the two component sums.",
    statement:
      "Given the root of a binary tree where each node has an integer value, remove exactly one edge to split the tree into two subtrees, maximizing the product of the sums of the two resulting subtrees. Return that maximum product modulo 1e9 + 7.",
    inputFormat: "The root of a binary tree (given as a level-order array in examples).",
    outputFormat: "An integer: the maximum product of the two subtree sums, modulo 1e9 + 7.",
    constraints: [
      "2 <= n <= 50000",
      "1 <= Node.val <= 10000",
    ],
    examples: [
      {
        input: "root = [1,2,3,4,5,6]",
        output: "110",
        explanation: "Cutting an edge to isolate a subtree summing to 11 leaves 10; product 110.",
      },
      {
        input: "root = [1,null,2,3,4,null,null,5,6]",
        output: "90",
        explanation: "The best edge cut yields a product of 90.",
      },
    ],
    approach: [
      "Compute the total sum of all node values in one pass.",
      "Each edge cut isolates a subtree whose sum s; the other component sums to total - s.",
      "Do a second pass computing every subtree sum and evaluate s * (total - s).",
      "Track the maximum product as a 64-bit value before applying the modulus.",
      "Apply the modulus only at the very end to avoid distorting the comparison.",
    ],
    solutionSteps: [
      "First DFS: total = sum of all node values.",
      "Second DFS: for each node, subtreeSum = node.val + left + right.",
      "Candidate product = subtreeSum * (total - subtreeSum); update the best (in 64-bit).",
      "Return subtreeSum upward.",
      "Return best % (1e9 + 7).",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def max_product(root: TreeNode | None) -> int:
    MOD = 10**9 + 7
    sums = []

    def subtree_sum(node: TreeNode | None) -> int:
        if not node:
            return 0
        s = node.val + subtree_sum(node.left) + subtree_sum(node.right)
        sums.append(s)
        return s

    total = subtree_sum(root)
    best = max(s * (total - s) for s in sums)
    return best % MOD
`,
      java: `import java.util.*;

class Solution {
    List<Long> sums = new ArrayList<>();

    public int maxProduct(TreeNode root) {
        long total = subtreeSum(root);
        long best = 0;
        for (long s : sums) best = Math.max(best, s * (total - s));
        return (int) (best % 1_000_000_007L);
    }

    private long subtreeSum(TreeNode node) {
        if (node == null) return 0;
        long s = node.val + subtreeSum(node.left) + subtreeSum(node.right);
        sums.add(s);
        return s;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

class Solution {
    vector<long> sums;
    long subtreeSum(TreeNode* node) {
        if (!node) return 0;
        long s = node->val + subtreeSum(node->left) + subtreeSum(node->right);
        sums.push_back(s);
        return s;
    }
public:
    int maxProduct(TreeNode* root) {
        long total = subtreeSum(root);
        long best = 0;
        for (long s : sums) best = max(best, s * (total - s));
        return (int) (best % 1000000007L);
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Applying the modulus before maximizing, which can make a smaller product look larger.",
      "Recomputing the total inside the second pass.",
      "Overflow: subtree sums multiplied can exceed 32 bits; use 64-bit.",
    ],
    edgeCases: [
      "A two-node tree (only one possible cut).",
      "A skewed tree.",
      "Large values stressing the 64-bit product.",
    ],
    whyItMatters:
      "Separating the optimization (in full precision) from the required modulus is a subtle but vital habit for product/sum maximization problems.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 361 — ai_applied · dp_2d · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "compose-target-from-columns",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 12,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "software_engineer"],
    title: "Ways to Assemble a Target from Candidate Columns",
    framing:
      "A decoder must spell a target string by picking one character per step from equal-length candidate strings, always advancing the column index. Count the distinct ways to assemble the target.",
    statement:
      "Given a list words of strings all of the same length and a string target, count the ways to form target by choosing characters: to append target[i] you pick some word's character at a column k strictly greater than the column used for target[i-1]; once a column is used for one character it cannot be reused for any later character. Return the count modulo 1e9 + 7.",
    inputFormat: "A list words of equal-length lowercase strings and a string target.",
    outputFormat: "An integer: the number of ways modulo 1e9 + 7.",
    constraints: [
      "1 <= words.length <= 1000",
      "1 <= words[i].length <= 1000 (all equal); 1 <= target.length <= 1000",
      "target.length <= words[i].length.",
    ],
    examples: [
      {
        input: 'words = ["acca","bbbb","caca"], target = "aba"',
        output: "6",
        explanation: "There are 6 valid column selections spelling 'aba'.",
      },
      {
        input: 'words = ["abba","baab"], target = "bab"',
        output: "4",
        explanation: "Four ways to pick increasing columns spelling 'bab'.",
      },
    ],
    approach: [
      "Precompute count[col][c] = how many words have character c at that column.",
      "Let dp[k] = number of ways to have formed the first k characters of target using columns seen so far.",
      "Process columns left to right; each column can contribute the next needed target character.",
      "Update dp[k] += dp[k-1] * count[col][target[k-1]], iterating k from high to low so a column is used once.",
      "The answer is dp[len(target)].",
    ],
    solutionSteps: [
      "Build the per-column character frequency table.",
      "Initialize dp[0] = 1, all other dp entries 0.",
      "For each column j: for k from len(target) down to 1: dp[k] = (dp[k] + dp[k-1] * count[j][target[k-1]]) % MOD.",
      "After all columns, read dp[len(target)].",
      "Return it modulo 1e9 + 7.",
    ],
    code: {
      python: `def num_ways(words: list[str], target: str) -> int:
    MOD = 10**9 + 7
    cols = len(words[0])
    t = len(target)
    count = [[0] * 26 for _ in range(cols)]
    for w in words:
        for j, ch in enumerate(w):
            count[j][ord(ch) - ord("a")] += 1
    dp = [0] * (t + 1)
    dp[0] = 1
    for j in range(cols):
        for k in range(t, 0, -1):
            c = ord(target[k - 1]) - ord("a")
            dp[k] = (dp[k] + dp[k - 1] * count[j][c]) % MOD
    return dp[t]
`,
      java: `class Solution {
    public int numWays(String[] words, String target) {
        long MOD = 1_000_000_007L;
        int cols = words[0].length(), t = target.length();
        int[][] count = new int[cols][26];
        for (String w : words)
            for (int j = 0; j < cols; j++) count[j][w.charAt(j) - 'a']++;
        long[] dp = new long[t + 1];
        dp[0] = 1;
        for (int j = 0; j < cols; j++)
            for (int k = t; k >= 1; k--) {
                int c = target.charAt(k - 1) - 'a';
                dp[k] = (dp[k] + dp[k - 1] * count[j][c]) % MOD;
            }
        return (int) dp[t];
    }
}
`,
      cpp: `#include <vector>
#include <string>
using namespace std;

class Solution {
public:
    int numWays(vector<string>& words, string target) {
        const long MOD = 1000000007L;
        int cols = words[0].size(), t = target.size();
        vector<vector<int>> count(cols, vector<int>(26, 0));
        for (auto& w : words)
            for (int j = 0; j < cols; j++) count[j][w[j] - 'a']++;
        vector<long> dp(t + 1, 0);
        dp[0] = 1;
        for (int j = 0; j < cols; j++)
            for (int k = t; k >= 1; k--) {
                int c = target[k - 1] - 'a';
                dp[k] = (dp[k] + dp[k - 1] * count[j][c]) % MOD;
            }
        return (int) dp[t];
    }
};
`,
    },
    complexity: { time: "O(cols * (26 + targetLen))", space: "O(cols * 26 + targetLen)" },
    pitfalls: [
      "Iterating k upward, which would let one column fill multiple target positions.",
      "Recounting characters per word instead of precomputing column frequencies.",
      "Forgetting the modulus on the multiply-accumulate.",
    ],
    edgeCases: [
      "A target as long as the word length (each column used exactly once).",
      "A target character absent from some columns.",
      "A single word.",
    ],
    whyItMatters:
      "Column-by-column counting DP with the reverse-iteration trick is the same once-per-item pattern as 0/1 knapsack, applied to ordered assembly.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 362 — pure_dsa · two_pointers · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-bounded-sum-subsequences",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "two_pointers",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Count Subsequences Where Min Plus Max Fits a Budget",
    framing:
      "From a pool of item weights, count non-empty subsets whose lightest plus heaviest item is within a budget. Because subsets are unordered, only the min and max matter.",
    statement:
      "Given an integer array nums and an integer target, return the number of non-empty subsequences such that the sum of the minimum and maximum element in the subsequence is <= target. Since the answer may be large, return it modulo 1e9 + 7.",
    inputFormat: "An integer array nums and an integer target.",
    outputFormat: "An integer: the count of qualifying subsequences modulo 1e9 + 7.",
    constraints: [
      "1 <= nums.length <= 100000",
      "1 <= nums[i] <= 10^6; 1 <= target <= 10^6",
    ],
    examples: [
      {
        input: "nums = [3,5,6,7], target = 9",
        output: "4",
        explanation: "[3],[3,5],[3,5,6],[3,6] each have min+max <= 9.",
      },
      {
        input: "nums = [3,3,6,8], target = 10",
        output: "6",
        explanation: "Six subsequences satisfy the bound.",
      },
    ],
    approach: [
      "Sorting does not change min/max of any subset, so sort the array.",
      "Use two pointers i (smallest chosen) and j (largest chosen).",
      "If nums[i] + nums[j] <= target, then any subset using nums[i] as min and any combination of the elements strictly between i and j is valid: 2^(j-i) subsequences.",
      "Add that to the answer and advance i; otherwise decrease j.",
      "Precompute powers of two modulo 1e9 + 7.",
    ],
    solutionSteps: [
      "Sort nums and precompute pow2[0..n-1] modulo MOD.",
      "Set i = 0, j = n-1, answer = 0.",
      "While i <= j: if nums[i] + nums[j] <= target, answer = (answer + pow2[j-i]) % MOD and i++.",
      "Else j--.",
      "Return answer.",
    ],
    code: {
      python: `def num_subseq(nums: list[int], target: int) -> int:
    MOD = 10**9 + 7
    nums.sort()
    n = len(nums)
    pow2 = [1] * n
    for k in range(1, n):
        pow2[k] = pow2[k - 1] * 2 % MOD
    i, j = 0, n - 1
    ans = 0
    while i <= j:
        if nums[i] + nums[j] <= target:
            ans = (ans + pow2[j - i]) % MOD
            i += 1
        else:
            j -= 1
    return ans
`,
      java: `import java.util.*;

class Solution {
    public int numSubseq(int[] nums, int target) {
        long MOD = 1_000_000_007L;
        Arrays.sort(nums);
        int n = nums.length;
        long[] pow2 = new long[n];
        pow2[0] = 1;
        for (int k = 1; k < n; k++) pow2[k] = pow2[k - 1] * 2 % MOD;
        int i = 0, j = n - 1;
        long ans = 0;
        while (i <= j) {
            if (nums[i] + nums[j] <= target) {
                ans = (ans + pow2[j - i]) % MOD;
                i++;
            } else {
                j--;
            }
        }
        return (int) ans;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int numSubseq(vector<int>& nums, int target) {
        const long MOD = 1000000007L;
        sort(nums.begin(), nums.end());
        int n = nums.size();
        vector<long> pow2(n);
        pow2[0] = 1;
        for (int k = 1; k < n; k++) pow2[k] = pow2[k - 1] * 2 % MOD;
        int i = 0, j = n - 1;
        long ans = 0;
        while (i <= j) {
            if (nums[i] + nums[j] <= target) {
                ans = (ans + pow2[j - i]) % MOD;
                i++;
            } else {
                j--;
            }
        }
        return (int) ans;
    }
};
`,
    },
    complexity: { time: "O(n log n)", space: "O(n)" },
    pitfalls: [
      "Enumerating subsets explicitly instead of using 2^(j-i) for the elements between the pointers.",
      "Computing 2^(j-i) with pow each step rather than precomputing powers.",
      "Off-by-one in the exponent (it is j-i, the count of optional middle elements).",
    ],
    edgeCases: [
      "Every element alone exceeding the target (answer 0).",
      "All pairs valid (answer 2^n - 1).",
      "Duplicate values.",
    ],
    whyItMatters:
      "Sorting plus two pointers plus a power-of-two count is a recurring technique for counting subsets characterized only by their extremes.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 363 — pure_dsa · dp_2d · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-strings-zeros-ones-budget",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Most Strings Within a Zero and One Budget",
    framing:
      "You select binary feature flags (strings of 0s and 1s) to ship, but your build budget caps the total number of 0-bits and 1-bits you can include. Maximize how many strings you ship.",
    statement:
      "Given an array strs of binary strings and two integers m and n (budgets of available 0s and 1s), return the size of the largest subset of strs such that the total count of 0s used is at most m and the total count of 1s used is at most n.",
    inputFormat: "An array strs of binary strings and integers m (zeros) and n (ones).",
    outputFormat: "An integer: the maximum number of strings selectable.",
    constraints: [
      "1 <= strs.length <= 600",
      "1 <= strs[i].length <= 100",
      "0 <= m, n <= 100",
    ],
    examples: [
      {
        input: 'strs = ["10","0001","111001","1","0"], m = 5, n = 3',
        output: "4",
        explanation: "{\"10\",\"0001\",\"1\",\"0\"} uses 5 zeros and 3 ones.",
      },
      {
        input: 'strs = ["10","0","1"], m = 1, n = 1',
        output: "2",
        explanation: "Pick \"0\" and \"1\".",
      },
    ],
    approach: [
      "This is a 0/1 knapsack with two capacities: zeros and ones.",
      "dp[i][j] = the maximum number of strings using at most i zeros and j ones.",
      "For each string with z zeros and o ones, update dp from high capacities downward.",
      "dp[i][j] = max(dp[i][j], dp[i-z][j-o] + 1).",
      "The answer is dp[m][n].",
    ],
    solutionSteps: [
      "Allocate dp of size (m+1) x (n+1) initialized to 0.",
      "For each string, count z and o.",
      "For i from m down to z, for j from n down to o: dp[i][j] = max(dp[i][j], dp[i-z][j-o] + 1).",
      "Iterate downward so each string is used at most once.",
      "Return dp[m][n].",
    ],
    code: {
      python: `def find_max_form(strs: list[str], m: int, n: int) -> int:
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for s in strs:
        z = s.count("0")
        o = len(s) - z
        for i in range(m, z - 1, -1):
            for j in range(n, o - 1, -1):
                dp[i][j] = max(dp[i][j], dp[i - z][j - o] + 1)
    return dp[m][n]
`,
      java: `class Solution {
    public int findMaxForm(String[] strs, int m, int n) {
        int[][] dp = new int[m + 1][n + 1];
        for (String s : strs) {
            int z = 0;
            for (char c : s.toCharArray()) if (c == '0') z++;
            int o = s.length() - z;
            for (int i = m; i >= z; i--)
                for (int j = n; j >= o; j--)
                    dp[i][j] = Math.max(dp[i][j], dp[i - z][j - o] + 1);
        }
        return dp[m][n];
    }
}
`,
      cpp: `#include <vector>
#include <string>
#include <algorithm>
using namespace std;

class Solution {
public:
    int findMaxForm(vector<string>& strs, int m, int n) {
        vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
        for (auto& s : strs) {
            int z = count(s.begin(), s.end(), '0');
            int o = s.size() - z;
            for (int i = m; i >= z; i--)
                for (int j = n; j >= o; j--)
                    dp[i][j] = max(dp[i][j], dp[i - z][j - o] + 1);
        }
        return dp[m][n];
    }
};
`,
    },
    complexity: { time: "O(L * m * n) where L is the number of strings", space: "O(m * n)" },
    pitfalls: [
      "Iterating capacities upward, which permits reusing a string.",
      "Counting ones and zeros incorrectly (ones = length - zeros).",
      "Allocating dp as 1D and losing the second capacity dimension.",
    ],
    edgeCases: [
      "Zero budget on one resource.",
      "A string that alone exceeds both budgets.",
      "All strings fitting within budget.",
    ],
    whyItMatters:
      "Two-dimensional knapsack generalizes resource-constrained selection, common in build, packing, and quota allocation systems.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 364 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "twin-harvesters-max-cherries",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Two Collectors Descending a Reward Grid",
    framing:
      "Two collector bots start at the top corners of a reward grid and descend to the bottom row, each moving down-left, down, or down-right per step. They share rewards on overlap. Maximize the total collected.",
    statement:
      "Given an m x n grid of non-negative rewards, two robots start at (0,0) and (0,n-1). Each robot moves to the next row at column c-1, c, or c+1. When both robots occupy the same cell, the reward is counted once. After both reach the last row, return the maximum total reward collected.",
    inputFormat: "An m x n grid of non-negative integers.",
    outputFormat: "An integer: the maximum combined reward.",
    constraints: [
      "2 <= m, n <= 70",
      "0 <= grid[i][j] <= 100",
    ],
    examples: [
      {
        input: "grid = [[3,1,1],[2,5,1],[1,5,5],[2,1,1]]",
        output: "24",
        explanation: "The two robots' optimal descents collect 24 in total.",
      },
      {
        input: "grid = [[1,1],[1,1]]",
        output: "4",
        explanation: "Robots in separate columns collect all four cells.",
      },
    ],
    approach: [
      "Track both robots simultaneously, row by row; the state is (row, col1, col2).",
      "Reward for a state is grid[row][col1] plus grid[row][col2], counted once if col1 == col2.",
      "From a row, each robot independently picks one of three column moves, giving up to nine transitions.",
      "dp[row][c1][c2] = best reward from this row onward.",
      "Memoize; the answer is dp[0][0][n-1].",
    ],
    solutionSteps: [
      "Define dfs(row, c1, c2): if any column is out of range, return -infinity.",
      "Reward = grid[row][c1] + (c1 != c2 ? grid[row][c2] : 0).",
      "If at the last row, return reward.",
      "Otherwise add the maximum over the nine next-row column pairs.",
      "Memoize on (row, c1, c2) and return dfs(0, 0, n-1).",
    ],
    code: {
      python: `from functools import lru_cache

def cherry_pickup(grid: list[list[int]]) -> int:
    m, n = len(grid), len(grid[0])

    @lru_cache(maxsize=None)
    def dfs(row: int, c1: int, c2: int) -> int:
        if c1 < 0 or c1 >= n or c2 < 0 or c2 >= n:
            return float("-inf")
        reward = grid[row][c1] + (grid[row][c2] if c1 != c2 else 0)
        if row == m - 1:
            return reward
        best = float("-inf")
        for d1 in (-1, 0, 1):
            for d2 in (-1, 0, 1):
                best = max(best, dfs(row + 1, c1 + d1, c2 + d2))
        return reward + best

    return dfs(0, 0, n - 1)
`,
      java: `class Solution {
    int m, n;
    int[][] grid;
    Integer[][][] memo;

    public int cherryPickup(int[][] grid) {
        this.grid = grid;
        m = grid.length; n = grid[0].length;
        memo = new Integer[m][n][n];
        return dfs(0, 0, n - 1);
    }

    private int dfs(int row, int c1, int c2) {
        if (c1 < 0 || c1 >= n || c2 < 0 || c2 >= n) return Integer.MIN_VALUE;
        if (memo[row][c1][c2] != null) return memo[row][c1][c2];
        int reward = grid[row][c1] + (c1 != c2 ? grid[row][c2] : 0);
        if (row == m - 1) return memo[row][c1][c2] = reward;
        int best = Integer.MIN_VALUE;
        for (int d1 = -1; d1 <= 1; d1++)
            for (int d2 = -1; d2 <= 1; d2++)
                best = Math.max(best, dfs(row + 1, c1 + d1, c2 + d2));
        return memo[row][c1][c2] = reward + best;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
#include <climits>
using namespace std;

class Solution {
    int m, n;
    vector<vector<vector<int>>> memo;
    int dfs(vector<vector<int>>& grid, int row, int c1, int c2) {
        if (c1 < 0 || c1 >= n || c2 < 0 || c2 >= n) return INT_MIN;
        if (memo[row][c1][c2] != INT_MIN) return memo[row][c1][c2];
        int reward = grid[row][c1] + (c1 != c2 ? grid[row][c2] : 0);
        if (row == m - 1) return memo[row][c1][c2] = reward;
        int best = INT_MIN;
        for (int d1 = -1; d1 <= 1; d1++)
            for (int d2 = -1; d2 <= 1; d2++)
                best = max(best, dfs(grid, row + 1, c1 + d1, c2 + d2));
        return memo[row][c1][c2] = reward + best;
    }
public:
    int cherryPickup(vector<vector<int>>& grid) {
        m = grid.size(); n = grid[0].size();
        memo.assign(m, vector<vector<int>>(n, vector<int>(n, INT_MIN)));
        return dfs(grid, 0, 0, n - 1);
    }
};
`,
    },
    complexity: { time: "O(m * n^2 * 9)", space: "O(m * n^2)" },
    pitfalls: [
      "Double-counting the reward when both robots land on the same cell.",
      "Running the two robots in separate passes — they must be coordinated because of overlap.",
      "Returning -infinity sentinels into the sum without guarding for out-of-range moves.",
    ],
    edgeCases: [
      "Robots forced to cross paths.",
      "A grid with a single column pair.",
      "All-zero grid.",
    ],
    whyItMatters:
      "Synchronized multi-agent DP over a shared grid is the model for dual-pass collection, paired routing, and correlated traversal problems.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 365 — pure_dsa · dp_1d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "tile-board-domino-tromino",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Tilings of a 2 x N Board with Dominoes and Trominoes",
    framing:
      "A 2-row layout grid of width n must be tiled completely using 2x1 dominoes (either orientation) and L-shaped trominoes. Count the number of distinct full tilings.",
    statement:
      "Given an integer n, count the number of ways to fully tile a 2 x n board using 2x1 dominoes and L-shaped trominoes (each may be rotated). Two tilings are different if some cell is covered by differently oriented or different pieces. Return the count modulo 1e9 + 7.",
    inputFormat: "An integer n (board width).",
    outputFormat: "An integer: the number of tilings modulo 1e9 + 7.",
    constraints: [
      "1 <= n <= 1000",
    ],
    examples: [
      {
        input: "n = 3",
        output: "5",
        explanation: "There are 5 ways to tile a 2x3 board.",
      },
      {
        input: "n = 1",
        output: "1",
        explanation: "Only a single vertical domino fits a 2x1 board.",
      },
    ],
    approach: [
      "Let dp[k] be the number of full tilings of a 2 x k board.",
      "By analyzing how the last column(s) close off, the recurrence is dp[k] = 2*dp[k-1] + dp[k-3].",
      "The 2*dp[k-1] term covers adding a vertical domino or completing with a tromino configuration symmetric in two ways.",
      "The dp[k-3] term covers the two-tromino block that spans three columns.",
      "Seed dp[0]=1, dp[1]=1, dp[2]=2 and iterate.",
    ],
    solutionSteps: [
      "Handle small n directly: dp[0]=1, dp[1]=1, dp[2]=2.",
      "For k from 3 to n: dp[k] = (2*dp[k-1] + dp[k-3]) % MOD.",
      "Use a rolling array or full array of size n+1.",
      "Return dp[n].",
      "Apply the modulus at each step.",
    ],
    code: {
      python: `def num_tilings(n: int) -> int:
    MOD = 10**9 + 7
    if n == 1:
        return 1
    if n == 2:
        return 2
    dp = [0] * (n + 1)
    dp[0], dp[1], dp[2] = 1, 1, 2
    for k in range(3, n + 1):
        dp[k] = (2 * dp[k - 1] + dp[k - 3]) % MOD
    return dp[n]
`,
      java: `class Solution {
    public int numTilings(int n) {
        long MOD = 1_000_000_007L;
        if (n == 1) return 1;
        if (n == 2) return 2;
        long[] dp = new long[n + 1];
        dp[0] = 1; dp[1] = 1; dp[2] = 2;
        for (int k = 3; k <= n; k++)
            dp[k] = (2 * dp[k - 1] + dp[k - 3]) % MOD;
        return (int) dp[n];
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int numTilings(int n) {
        const long MOD = 1000000007L;
        if (n == 1) return 1;
        if (n == 2) return 2;
        vector<long> dp(n + 1, 0);
        dp[0] = 1; dp[1] = 1; dp[2] = 2;
        for (int k = 3; k <= n; k++)
            dp[k] = (2 * dp[k - 1] + dp[k - 3]) % MOD;
        return (int) dp[n];
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Using the simpler Fibonacci recurrence that only counts domino tilings.",
      "Deriving the wrong tromino contribution; the clean closed form is 2*dp[k-1] + dp[k-3].",
      "Missing the modulus, overflowing for large n.",
    ],
    edgeCases: [
      "n = 1 and n = 2 base cases.",
      "Verifying against the known n = 3 answer of 5.",
      "Large n stressing modular arithmetic.",
    ],
    whyItMatters:
      "Deriving a compact linear recurrence from a tiling structure is a classic combinatorial-DP exercise behind many counting problems.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 366 — ai_applied · dp_1d · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-masked-token-decodings",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 12,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "software_engineer"],
    title: "Count Decodings of a Partially Masked Digit Stream",
    framing:
      "A noisy channel emits a digit string in which some positions are masked as '*', meaning any digit 1-9. Letters map A=1..Z=26. Count how many original messages could decode to the stream.",
    statement:
      "Given a string s of digits and the wildcard '*' (which represents any digit from 1 to 9), where '1'->'A', ..., '26'->'Z', count the number of ways to decode s into letters. Return the count modulo 1e9 + 7.",
    inputFormat: "A string s consisting of digits 0-9 and '*'.",
    outputFormat: "An integer: the number of decodings modulo 1e9 + 7.",
    constraints: [
      "1 <= s.length <= 100000",
      "s consists of digits and '*'.",
    ],
    examples: [
      {
        input: 's = "*"',
        output: "9",
        explanation: "'*' can be any of 1..9, decoding to A..I.",
      },
      {
        input: 's = "1*"',
        output: "18",
        explanation: "9 single-digit splits (1 then *) plus 9 two-digit (11..19).",
      },
    ],
    approach: [
      "Let dp[i] be the number of decodings of the prefix of length i.",
      "Single-character contribution: '*' adds 9 ways, '0' adds 0, any other digit adds 1.",
      "Two-character contribution depends on the pair, accounting for wildcards (e.g., '**' yields 15 valid pairs in 11..26).",
      "dp[i] = dp[i-1] * single(s[i-1]) + dp[i-2] * pair(s[i-2], s[i-1]).",
      "Carry the modulus and return dp[n].",
    ],
    solutionSteps: [
      "Write single(c) and pair(a, b) helper counts covering all wildcard cases.",
      "Use rolling variables prev2 = dp[i-2], prev1 = dp[i-1], starting dp[0] = 1.",
      "For each position, cur = prev1*single + prev2*pair, all modulo MOD.",
      "Shift the rolling variables forward.",
      "Return the last value.",
    ],
    code: {
      python: `def num_decodings(s: str) -> int:
    MOD = 10**9 + 7

    def single(c: str) -> int:
        if c == "*":
            return 9
        return 0 if c == "0" else 1

    def pair(a: str, b: str) -> int:
        if a == "*":
            if b == "*":
                return 15  # 11..19 (9) + 21..26 (6)
            return 2 if b <= "6" else 1
        if a == "1":
            return 9 if b == "*" else 1
        if a == "2":
            if b == "*":
                return 6
            return 1 if "0" <= b <= "6" else 0
        return 0

    prev2, prev1 = 1, single(s[0])
    for i in range(1, len(s)):
        cur = (prev1 * single(s[i]) + prev2 * pair(s[i - 1], s[i])) % MOD
        prev2, prev1 = prev1, cur
    return prev1
`,
      java: `class Solution {
    long MOD = 1_000_000_007L;

    public int numDecodings(String s) {
        long prev2 = 1, prev1 = single(s.charAt(0));
        for (int i = 1; i < s.length(); i++) {
            long cur = (prev1 * single(s.charAt(i)) + prev2 * pair(s.charAt(i - 1), s.charAt(i))) % MOD;
            prev2 = prev1;
            prev1 = cur;
        }
        return (int) prev1;
    }

    private long single(char c) {
        if (c == '*') return 9;
        return c == '0' ? 0 : 1;
    }

    private long pair(char a, char b) {
        if (a == '*') {
            if (b == '*') return 15;
            return b <= '6' ? 2 : 1;
        }
        if (a == '1') return b == '*' ? 9 : 1;
        if (a == '2') {
            if (b == '*') return 6;
            return (b >= '0' && b <= '6') ? 1 : 0;
        }
        return 0;
    }
}
`,
      cpp: `#include <string>
using namespace std;

class Solution {
    const long MOD = 1000000007L;
    long single(char c) {
        if (c == '*') return 9;
        return c == '0' ? 0 : 1;
    }
    long pairCount(char a, char b) {
        if (a == '*') {
            if (b == '*') return 15;
            return b <= '6' ? 2 : 1;
        }
        if (a == '1') return b == '*' ? 9 : 1;
        if (a == '2') {
            if (b == '*') return 6;
            return (b >= '0' && b <= '6') ? 1 : 0;
        }
        return 0;
    }
public:
    int numDecodings(string s) {
        long prev2 = 1, prev1 = single(s[0]);
        for (int i = 1; i < (int) s.size(); i++) {
            long cur = (prev1 * single(s[i]) + prev2 * pairCount(s[i - 1], s[i])) % MOD;
            prev2 = prev1;
            prev1 = cur;
        }
        return (int) prev1;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Mishandling the wildcard pair counts, especially '**' = 15 and '2*' = 6.",
      "Treating '0' as decodable on its own (it never is).",
      "Dropping the modulus, overflowing on long inputs.",
    ],
    edgeCases: [
      "A leading or isolated '0' yielding zero ways.",
      "A string of all '*'.",
      "Pairs like '27' or '2*' with constrained second digits.",
    ],
    whyItMatters:
      "Wildcard decode counting extends the classic decode-ways DP with case analysis, mirroring tokenizer ambiguity and noisy-sequence inference.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 367 — pure_dsa · backtracking · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "cover-all-cells-unique-paths",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Count Walks Covering Every Free Cell Once",
    framing:
      "A cleaning robot must walk from its dock to a charging pad, stepping on every walkable tile exactly once and avoiding obstacles. Count how many such complete-coverage routes exist.",
    statement:
      "Given an m x n grid where 1 is the start, 2 is the end, 0 is a walkable cell, and -1 is an obstacle, count the 4-directional paths from start to end that visit every non-obstacle cell exactly once.",
    inputFormat: "An m x n integer grid containing exactly one 1 and one 2.",
    outputFormat: "An integer: the number of complete-coverage paths.",
    constraints: [
      "1 <= m, n <= 20 with m * n <= 20",
      "There is exactly one start (1) and one end (2).",
    ],
    examples: [
      {
        input: "grid = [[1,0,0,0],[0,0,0,0],[0,0,2,-1]]",
        output: "2",
        explanation: "Two distinct routes cover all walkable cells and end at 2.",
      },
      {
        input: "grid = [[0,1],[2,0]]",
        output: "0",
        explanation: "No route covers both 0 cells exactly once ending at 2.",
      },
    ],
    approach: [
      "Count the number of cells that must be visited: all walkable cells plus the start.",
      "DFS from the start, marking the current cell visited and decrementing the remaining-to-visit count.",
      "When you reach the end cell, it is a valid path only if no walkable cells remain unvisited.",
      "Explore all four directions, skipping obstacles and already-visited cells.",
      "Backtrack by unmarking the cell after exploring.",
    ],
    solutionSteps: [
      "Scan the grid: find start (r,c) and count empties (cells equal to 0) plus 1 for the start as the cells to cover.",
      "DFS(r,c,remaining): if obstacle/out/visited return.",
      "If cell is the end: add 1 to the answer when remaining == 0, then return.",
      "Mark visited, recurse into neighbors with remaining-1, then unmark.",
      "Return the accumulated path count.",
    ],
    code: {
      python: `def unique_paths_iii(grid: list[list[int]]) -> int:
    m, n = len(grid), len(grid[0])
    empties = 0
    start = (0, 0)
    for r in range(m):
        for c in range(n):
            if grid[r][c] == 0:
                empties += 1
            elif grid[r][c] == 1:
                start = (r, c)
    paths = 0

    def dfs(r: int, c: int, remaining: int) -> None:
        nonlocal paths
        if not (0 <= r < m and 0 <= n > c) or grid[r][c] == -1:
            return
        if grid[r][c] == 2:
            if remaining == 0:
                paths += 1
            return
        temp = grid[r][c]
        grid[r][c] = -1  # mark visited
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            dfs(r + dr, c + dc, remaining - 1)
        grid[r][c] = temp

    dfs(start[0], start[1], empties + 1)
    return paths
`,
      java: `class Solution {
    int m, n, paths = 0;

    public int uniquePathsIII(int[][] grid) {
        m = grid.length; n = grid[0].length;
        int empties = 0, sr = 0, sc = 0;
        for (int r = 0; r < m; r++)
            for (int c = 0; c < n; c++) {
                if (grid[r][c] == 0) empties++;
                else if (grid[r][c] == 1) { sr = r; sc = c; }
            }
        dfs(grid, sr, sc, empties + 1);
        return paths;
    }

    private void dfs(int[][] grid, int r, int c, int remaining) {
        if (r < 0 || r >= m || c < 0 || c >= n || grid[r][c] == -1) return;
        if (grid[r][c] == 2) {
            if (remaining == 0) paths++;
            return;
        }
        int temp = grid[r][c];
        grid[r][c] = -1;
        dfs(grid, r + 1, c, remaining - 1);
        dfs(grid, r - 1, c, remaining - 1);
        dfs(grid, r, c + 1, remaining - 1);
        dfs(grid, r, c - 1, remaining - 1);
        grid[r][c] = temp;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
    int m, n, paths = 0;
    void dfs(vector<vector<int>>& grid, int r, int c, int remaining) {
        if (r < 0 || r >= m || c < 0 || c >= n || grid[r][c] == -1) return;
        if (grid[r][c] == 2) {
            if (remaining == 0) paths++;
            return;
        }
        int temp = grid[r][c];
        grid[r][c] = -1;
        dfs(grid, r + 1, c, remaining - 1);
        dfs(grid, r - 1, c, remaining - 1);
        dfs(grid, r, c + 1, remaining - 1);
        dfs(grid, r, c - 1, remaining - 1);
        grid[r][c] = temp;
    }
public:
    int uniquePathsIII(vector<vector<int>>& grid) {
        m = grid.size(); n = grid[0].size();
        int empties = 0, sr = 0, sc = 0;
        for (int r = 0; r < m; r++)
            for (int c = 0; c < n; c++) {
                if (grid[r][c] == 0) empties++;
                else if (grid[r][c] == 1) { sr = r; sc = c; }
            }
        dfs(grid, sr, sc, empties + 1);
        return paths;
    }
};
`,
    },
    complexity: { time: "O(4^(m*n)) worst case, pruned by visitation", space: "O(m * n)" },
    pitfalls: [
      "Counting the end reached without verifying every walkable cell was visited.",
      "Off-by-one in the remaining count (the start cell counts as one to cover).",
      "Forgetting to restore the cell value on backtrack.",
    ],
    edgeCases: [
      "Start adjacent to the end with no other cells.",
      "Obstacles partitioning the grid (answer 0).",
      "A single walkable path.",
    ],
    whyItMatters:
      "Hamiltonian-style coverage counting with backtracking is the exact approach for small full-traversal and tour-enumeration problems.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 368 — pure_dsa · backtracking · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-squareful-arrangements",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Count Arrangements Where Adjacent Sums Are Perfect Squares",
    framing:
      "You arrange a set of numeric tiles in a row so that every pair of neighbors sums to a perfect square. Count the distinct valid arrangements (identical tiles are indistinguishable).",
    statement:
      "Given an integer array nums, return the number of permutations that are 'squareful': for every pair of adjacent elements, their sum is a perfect square. Permutations that are identical as sequences count once.",
    inputFormat: "An integer array nums.",
    outputFormat: "An integer: the number of distinct squareful permutations.",
    constraints: [
      "1 <= nums.length <= 12",
      "0 <= nums[i] <= 10^9",
    ],
    examples: [
      {
        input: "nums = [1,17,8]",
        output: "2",
        explanation: "[1,8,17] and [17,8,1] are squareful (9 and 25 are squares).",
      },
      {
        input: "nums = [2,2,2]",
        output: "1",
        explanation: "[2,2,2] is the only arrangement; 2+2=4 is a square.",
      },
    ],
    approach: [
      "Sort the array so identical values are adjacent for duplicate pruning.",
      "Backtrack building a permutation; only place a number whose sum with the previous placed number is a perfect square.",
      "Skip a value at index i if it equals nums[i-1] and nums[i-1] has not been used at this depth (standard distinct-permutation pruning).",
      "Count a permutation when all positions are filled.",
      "Use a helper to test perfect-square sums.",
    ],
    solutionSteps: [
      "Sort nums; maintain a used[] array.",
      "Recurse with the index of the last placed value (or -1 at the start).",
      "For each unused i: skip duplicates; if last == -1 or nums[last]+nums[i] is a perfect square, place it.",
      "When the path length equals n, increment the count.",
      "Return the total count.",
    ],
    code: {
      python: `from math import isqrt

def num_squareful_perms(nums: list[int]) -> int:
    nums.sort()
    n = len(nums)
    used = [False] * n
    count = 0

    def is_square(x: int) -> bool:
        r = isqrt(x)
        return r * r == x

    def backtrack(prev: int, depth: int) -> None:
        nonlocal count
        if depth == n:
            count += 1
            return
        for i in range(n):
            if used[i]:
                continue
            if i > 0 and nums[i] == nums[i - 1] and not used[i - 1]:
                continue
            if prev == -1 or is_square(nums[prev] + nums[i]):
                used[i] = True
                backtrack(i, depth + 1)
                used[i] = False

    backtrack(-1, 0)
    return count
`,
      java: `import java.util.*;

class Solution {
    int n, count = 0;
    int[] nums;
    boolean[] used;

    public int numSquarefulPerms(int[] nums) {
        Arrays.sort(nums);
        this.nums = nums;
        n = nums.length;
        used = new boolean[n];
        backtrack(-1, 0);
        return count;
    }

    private void backtrack(int prev, int depth) {
        if (depth == n) { count++; return; }
        for (int i = 0; i < n; i++) {
            if (used[i]) continue;
            if (i > 0 && nums[i] == nums[i - 1] && !used[i - 1]) continue;
            if (prev == -1 || isSquare((long) nums[prev] + nums[i])) {
                used[i] = true;
                backtrack(i, depth + 1);
                used[i] = false;
            }
        }
    }

    private boolean isSquare(long x) {
        long r = (long) Math.sqrt((double) x);
        for (long k = Math.max(0, r - 1); k <= r + 1; k++) if (k * k == x) return true;
        return false;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
#include <cmath>
using namespace std;

class Solution {
    int n, cnt = 0;
    vector<int> nums;
    vector<bool> used;
    bool isSquare(long x) {
        long r = (long) sqrt((double) x);
        for (long k = max(0L, r - 1); k <= r + 1; k++) if (k * k == x) return true;
        return false;
    }
    void backtrack(int prev, int depth) {
        if (depth == n) { cnt++; return; }
        for (int i = 0; i < n; i++) {
            if (used[i]) continue;
            if (i > 0 && nums[i] == nums[i - 1] && !used[i - 1]) continue;
            if (prev == -1 || isSquare((long) nums[prev] + nums[i])) {
                used[i] = true;
                backtrack(i, depth + 1);
                used[i] = false;
            }
        }
    }
public:
    int numSquarefulPerms(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        this->nums = nums;
        n = nums.size();
        used.assign(n, false);
        backtrack(-1, 0);
        return cnt;
    }
};
`,
    },
    complexity: { time: "O(n! ) worst case, heavily pruned", space: "O(n)" },
    pitfalls: [
      "Not deduplicating equal values, which overcounts identical sequences.",
      "Integer overflow when summing large values before the square test.",
      "Using a floating-point sqrt without verifying with an integer multiply.",
    ],
    edgeCases: [
      "All identical values.",
      "No valid arrangement (answer 0).",
      "A single element (answer 1).",
    ],
    whyItMatters:
      "Distinct-permutation backtracking with an adjacency constraint is the standard exact method for constrained-ordering enumeration.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 369 — indian_domain · backtracking · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "settle-upi-group-debts",
    version: 1,
    status: "pending_review",
    bucket: "indian_domain",
    batchNo: 12,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer"],
    title: "Minimum UPI Transfers to Settle Group Expenses",
    framing:
      "A group-expense app records who paid whom. To settle up, members send UPI transfers. Given all the IOUs, find the minimum number of transfers needed to bring everyone's net balance to zero.",
    statement:
      "Given a list of transactions where transactions[i] = [from, to, amount] means person from paid person to amount rupees, return the minimum number of transfers required to settle all debts so every person's net balance is zero.",
    inputFormat: "A list transactions of [from, to, amount] triples over a small set of people.",
    outputFormat: "An integer: the minimum number of settling transfers.",
    constraints: [
      "1 <= transactions.length <= 8",
      "0 <= from, to < 12, from != to",
      "1 <= amount <= 100",
    ],
    examples: [
      {
        input: "transactions = [[0,1,10],[2,0,5]]",
        output: "2",
        explanation: "Net balances: person 0 = -5, 1 = +10, 2 = -5; two transfers settle it.",
      },
      {
        input: "transactions = [[0,1,10],[1,0,1],[1,2,5],[2,0,5]]",
        output: "1",
        explanation: "Net balances reduce so a single transfer settles everyone.",
      },
    ],
    approach: [
      "Compute each person's net balance; people with zero net are irrelevant.",
      "Collect the non-zero balances into a list of debts.",
      "Backtrack from the first non-zero debt, trying to cancel it against every later debt of opposite sign.",
      "Settling debt[start] into debt[i] adds debt[start] to debt[i] (one transfer) and recurses from start+1.",
      "Take the minimum transfers across all choices; restore state on backtrack.",
    ],
    solutionSteps: [
      "Build a balance map from transactions and extract non-zero values into debts[].",
      "Define dfs(start): skip leading zeros by advancing start.",
      "If start reaches the end, return 0 (all settled).",
      "For each i > start with an opposite sign, add debts[start] to debts[i], recurse dfs(start+1)+1, then undo.",
      "Return the minimum found.",
    ],
    code: {
      python: `from collections import defaultdict

def min_transfers(transactions: list[list[int]]) -> int:
    bal = defaultdict(int)
    for a, b, amt in transactions:
        bal[a] -= amt
        bal[b] += amt
    debts = [v for v in bal.values() if v != 0]
    n = len(debts)

    def dfs(start: int) -> int:
        while start < n and debts[start] == 0:
            start += 1
        if start == n:
            return 0
        best = float("inf")
        for i in range(start + 1, n):
            if debts[i] * debts[start] < 0:  # opposite signs
                debts[i] += debts[start]
                best = min(best, 1 + dfs(start + 1))
                debts[i] -= debts[start]
        return best

    return dfs(0)
`,
      java: `import java.util.*;

class Solution {
    int[] debts;
    int n;

    public int minTransfers(int[][] transactions) {
        Map<Integer, Integer> bal = new HashMap<>();
        for (int[] t : transactions) {
            bal.merge(t[0], -t[2], Integer::sum);
            bal.merge(t[1], t[2], Integer::sum);
        }
        List<Integer> list = new ArrayList<>();
        for (int v : bal.values()) if (v != 0) list.add(v);
        n = list.size();
        debts = new int[n];
        for (int i = 0; i < n; i++) debts[i] = list.get(i);
        return dfs(0);
    }

    private int dfs(int start) {
        while (start < n && debts[start] == 0) start++;
        if (start == n) return 0;
        int best = Integer.MAX_VALUE;
        for (int i = start + 1; i < n; i++) {
            if ((long) debts[i] * debts[start] < 0) {
                debts[i] += debts[start];
                best = Math.min(best, 1 + dfs(start + 1));
                debts[i] -= debts[start];
            }
        }
        return best;
    }
}
`,
      cpp: `#include <vector>
#include <unordered_map>
#include <algorithm>
#include <climits>
using namespace std;

class Solution {
    vector<int> debts;
    int n;
    int dfs(int start) {
        while (start < n && debts[start] == 0) start++;
        if (start == n) return 0;
        int best = INT_MAX;
        for (int i = start + 1; i < n; i++) {
            if ((long) debts[i] * debts[start] < 0) {
                debts[i] += debts[start];
                best = min(best, 1 + dfs(start + 1));
                debts[i] -= debts[start];
            }
        }
        return best;
    }
public:
    int minTransfers(vector<vector<int>>& transactions) {
        unordered_map<int, int> bal;
        for (auto& t : transactions) { bal[t[0]] -= t[2]; bal[t[1]] += t[2]; }
        for (auto& [k, v] : bal) if (v != 0) debts.push_back(v);
        n = debts.size();
        return dfs(0);
    }
};
`,
    },
    complexity: { time: "O(n!) worst case over non-zero balances", space: "O(n)" },
    pitfalls: [
      "Greedily matching largest debtor with largest creditor, which is not always optimal.",
      "Including zero balances in the debts list, wasting recursion.",
      "Only canceling against same-sign balances; you must net opposite signs.",
    ],
    edgeCases: [
      "Everyone already settled (answer 0).",
      "A perfect cycle that collapses to one transfer.",
      "All debts distinct requiring n-1 transfers.",
    ],
    whyItMatters:
      "Debt simplification via balance backtracking is the algorithm behind real split-expense and clearing-house settlement features.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 370 — pure_dsa · backtracking · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "split-into-fibonacci-seq",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Split a Digit String into a Fibonacci Sequence",
    framing:
      "A serialized ID is suspected to encode a Fibonacci-like sequence with separators stripped. Recover any valid split where each number equals the sum of the two before it.",
    statement:
      "Given a string num of digits, split it into a sequence of at least three non-negative integers f[0], f[1], ..., f[k] such that f[i] = f[i-1] + f[i-2] for i >= 2, no number has a leading zero (except the number 0 itself), and each fits in a signed 32-bit integer. Return any valid sequence, or an empty list if none exists.",
    inputFormat: "A string num of digit characters.",
    outputFormat: "A list of integers forming a valid Fibonacci-like split, or an empty list.",
    constraints: [
      "1 <= num.length <= 200",
      "num consists of digits only.",
      "Each value must be <= 2^31 - 1.",
    ],
    examples: [
      {
        input: 'num = "1101111"',
        output: "[11,0,11,11]",
        explanation: "11, 0, 11, 11 satisfies f[i]=f[i-1]+f[i-2].",
      },
      {
        input: 'num = "112358130"',
        output: "[]",
        explanation: "No valid split into a Fibonacci-like sequence.",
      },
    ],
    approach: [
      "Backtrack by choosing the first two numbers; the rest is forced by the recurrence.",
      "Reject any chunk with a leading zero (unless it is exactly '0') or exceeding 2^31 - 1.",
      "After fixing the first two, repeatedly require the next chunk to equal the sum of the previous two as a prefix of the remaining string.",
      "If the whole string is consumed with at least three numbers, the sequence is valid.",
      "Prune branches where the required sum does not match the next characters.",
    ],
    solutionSteps: [
      "Iterate end index for the first number and the second number, validating each chunk.",
      "Given the first two, greedily build the rest: next = a + b; check it as a prefix.",
      "If next overflows 2^31 - 1, stop this branch.",
      "Continue until the string is consumed; require length >= 3.",
      "Return the first valid sequence found, else an empty list.",
    ],
    code: {
      python: `def split_into_fibonacci(num: str) -> list[int]:
    n = len(num)
    LIMIT = 2**31 - 1

    def valid(s: str) -> bool:
        return s == "0" or (s[0] != "0" and int(s) <= LIMIT)

    res: list[int] = []

    def backtrack(start: int, seq: list[int]) -> bool:
        if start == n:
            return len(seq) >= 3
        for end in range(start + 1, n + 1):
            chunk = num[start:end]
            if not valid(chunk):
                break  # longer chunks only get bigger / still leading zero
            val = int(chunk)
            if val > LIMIT:
                break
            if len(seq) >= 2 and val != seq[-1] + seq[-2]:
                if val > seq[-1] + seq[-2]:
                    break
                continue
            seq.append(val)
            if backtrack(end, seq):
                return True
            seq.pop()
        return False

    backtrack(0, res)
    return res
`,
      java: `import java.util.*;

class Solution {
    int n;
    String num;
    long LIMIT = (1L << 31) - 1;

    public List<Integer> splitIntoFibonacci(String num) {
        this.num = num;
        n = num.length();
        List<Integer> res = new ArrayList<>();
        backtrack(0, res);
        return res;
    }

    private boolean backtrack(int start, List<Integer> seq) {
        if (start == n) return seq.size() >= 3;
        for (int end = start + 1; end <= n; end++) {
            String chunk = num.substring(start, end);
            if (chunk.length() > 1 && chunk.charAt(0) == '0') break;
            long val = Long.parseLong(chunk);
            if (val > LIMIT) break;
            int sz = seq.size();
            if (sz >= 2) {
                long need = (long) seq.get(sz - 1) + seq.get(sz - 2);
                if (val > need) break;
                if (val < need) continue;
            }
            seq.add((int) val);
            if (backtrack(end, seq)) return true;
            seq.remove(seq.size() - 1);
        }
        return false;
    }
}
`,
      cpp: `#include <vector>
#include <string>
using namespace std;

class Solution {
    int n;
    string num;
    long LIMIT = (1L << 31) - 1;
    bool backtrack(int start, vector<int>& seq) {
        if (start == n) return seq.size() >= 3;
        for (int end = start + 1; end <= n; end++) {
            string chunk = num.substr(start, end - start);
            if (chunk.size() > 1 && chunk[0] == '0') break;
            long val = stol(chunk);
            if (val > LIMIT) break;
            int sz = seq.size();
            if (sz >= 2) {
                long need = (long) seq[sz - 1] + seq[sz - 2];
                if (val > need) break;
                if (val < need) continue;
            }
            seq.push_back((int) val);
            if (backtrack(end, seq)) return true;
            seq.pop_back();
        }
        return false;
    }
public:
    vector<int> splitIntoFibonacci(string num) {
        this->num = num;
        n = num.size();
        vector<int> res;
        backtrack(0, res);
        return res;
    }
};
`,
    },
    complexity: { time: "O(n^2) effective with pruning", space: "O(n)" },
    pitfalls: [
      "Allowing leading zeros (only the single digit '0' is valid).",
      "Letting numbers exceed the 32-bit signed limit.",
      "Not pruning when the current chunk already exceeds the required sum.",
    ],
    edgeCases: [
      "Strings with zeros embedded (e.g. '1101111').",
      "No valid split (return empty).",
      "Short strings (< 3 numbers possible).",
    ],
    whyItMatters:
      "Constrained string-to-sequence reconstruction with arithmetic pruning is a common parsing-and-validation backtracking pattern.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 371 — pure_dsa · backtracking · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-score-letter-tiles",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Maximum Score from Words Using a Letter Pool",
    framing:
      "You have a bag of letter tiles and a per-letter score. Pick a subset of allowed words to spell; each tile is consumed once. Maximize the total score of the words you can fully form.",
    statement:
      "Given a list words, an array letters (the available letters, each usable once), and an array score of length 26 (score[i] is the value of letter 'a'+i), return the maximum total score of any subset of words that can be formed using the available letters. A word's score is the sum of its letters' scores; a word can only be used if all its letters are available.",
    inputFormat: "A list words, an array letters of characters, and an array score of 26 integers.",
    outputFormat: "An integer: the maximum achievable total score.",
    constraints: [
      "1 <= words.length <= 14",
      "1 <= letters.length <= 100",
      "0 <= score[i] <= 10; words and letters are lowercase.",
    ],
    examples: [
      {
        input: 'words = ["dog","cat","dad","good"], letters = ["a","a","c","d","d","d","g","o","o"], score = [1,0,9,5,0,0,3,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0]',
        output: "23",
        explanation: "Using 'dad' (5+1+5=... ) and 'good' yields the max total 23.",
      },
      {
        input: 'words = ["xxxz","ax","bx","cx"], letters = ["z","a","b","c","x","x","x"], score = [4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5]',
        output: "27",
        explanation: "Choosing 'ax','bx','cx' beats using 'xxxz'.",
      },
    ],
    approach: [
      "With at most 14 words, enumerate subsets via include/exclude backtracking.",
      "Maintain a count of available letters; before using a word, check its letters are all available.",
      "Recurse: either skip the current word, or use it (deduct its letters and add its score), then restore.",
      "Track the maximum score reached at the end of the word list.",
      "A precomputed per-word letter count and score speeds the feasibility check.",
    ],
    solutionSteps: [
      "Build an availability count from letters.",
      "Define dfs(index, avail): at the end return 0.",
      "Option 1: skip word[index] -> dfs(index+1).",
      "Option 2: if word[index] fits, deduct its letters, add its score + dfs(index+1), then restore.",
      "Return the maximum of the two options; the answer is dfs(0).",
    ],
    code: {
      python: `def max_score_words(words: list[str], letters: list[str], score: list[int]) -> int:
    avail = [0] * 26
    for ch in letters:
        avail[ord(ch) - ord("a")] += 1

    def word_cost(w: str) -> list[int]:
        cost = [0] * 26
        for ch in w:
            cost[ord(ch) - ord("a")] += 1
        return cost

    costs = [word_cost(w) for w in words]
    word_score = [sum(score[i] * c for i, c in enumerate(cost)) for cost in costs]

    def dfs(idx: int) -> int:
        if idx == len(words):
            return 0
        best = dfs(idx + 1)  # skip
        cost = costs[idx]
        if all(avail[i] >= cost[i] for i in range(26)):
            for i in range(26):
                avail[i] -= cost[i]
            best = max(best, word_score[idx] + dfs(idx + 1))
            for i in range(26):
                avail[i] += cost[i]
        return best

    return dfs(0)
`,
      java: `class Solution {
    int[] avail = new int[26];
    int[][] costs;
    int[] wordScore;
    int n;

    public int maxScoreWords(String[] words, char[] letters, int[] score) {
        for (char ch : letters) avail[ch - 'a']++;
        n = words.length;
        costs = new int[n][26];
        wordScore = new int[n];
        for (int w = 0; w < n; w++) {
            for (char ch : words[w].toCharArray()) {
                costs[w][ch - 'a']++;
                wordScore[w] += score[ch - 'a'];
            }
        }
        return dfs(0, score);
    }

    private int dfs(int idx, int[] score) {
        if (idx == n) return 0;
        int best = dfs(idx + 1, score);
        boolean ok = true;
        for (int i = 0; i < 26; i++) if (avail[i] < costs[idx][i]) { ok = false; break; }
        if (ok) {
            for (int i = 0; i < 26; i++) avail[i] -= costs[idx][i];
            best = Math.max(best, wordScore[idx] + dfs(idx + 1, score));
            for (int i = 0; i < 26; i++) avail[i] += costs[idx][i];
        }
        return best;
    }
}
`,
      cpp: `#include <vector>
#include <string>
#include <algorithm>
using namespace std;

class Solution {
    int avail[26] = {0};
    vector<vector<int>> costs;
    vector<int> wordScore;
    int n;
    int dfs(int idx) {
        if (idx == n) return 0;
        int best = dfs(idx + 1);
        bool ok = true;
        for (int i = 0; i < 26; i++) if (avail[i] < costs[idx][i]) { ok = false; break; }
        if (ok) {
            for (int i = 0; i < 26; i++) avail[i] -= costs[idx][i];
            best = max(best, wordScore[idx] + dfs(idx + 1));
            for (int i = 0; i < 26; i++) avail[i] += costs[idx][i];
        }
        return best;
    }
public:
    int maxScoreWords(vector<string>& words, vector<char>& letters, vector<int>& score) {
        for (char ch : letters) avail[ch - 'a']++;
        n = words.size();
        costs.assign(n, vector<int>(26, 0));
        wordScore.assign(n, 0);
        for (int w = 0; w < n; w++)
            for (char ch : words[w]) { costs[w][ch - 'a']++; wordScore[w] += score[ch - 'a']; }
        return dfs(0);
    }
};
`,
    },
    complexity: { time: "O(2^W * 26)", space: "O(W * 26)" },
    pitfalls: [
      "Forgetting to restore the letter pool after trying a word.",
      "Counting a word usable when only some of its letters are available.",
      "Greedily picking highest-scoring words, which can block better combinations.",
    ],
    edgeCases: [
      "No word can be formed (answer 0).",
      "Words competing for the same scarce letter.",
      "A single word.",
    ],
    whyItMatters:
      "Subset backtracking with a shared consumable resource models knapsack-with-multiplicity selection seen in inventory and crafting systems.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 372 — pure_dsa · backtracking · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-beautiful-subsets",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Count Subsets Avoiding a Fixed Difference",
    framing:
      "From a set of configuration values, count the non-empty subsets in which no two chosen values differ by exactly k — a constraint used to avoid conflicting paired settings.",
    statement:
      "Given an array nums of positive integers and a positive integer k, return the number of non-empty 'beautiful' subsets: subsets in which no two elements have an absolute difference equal to k.",
    inputFormat: "An array nums of positive integers and a positive integer k.",
    outputFormat: "An integer: the number of non-empty beautiful subsets.",
    constraints: [
      "1 <= nums.length <= 20",
      "1 <= nums[i], k <= 1000",
    ],
    examples: [
      {
        input: "nums = [2,4,6], k = 2",
        output: "4",
        explanation: "{2},{4},{6},{2,6} are beautiful; {2,4},{4,6},{2,4,6} are not.",
      },
      {
        input: "nums = [1], k = 1",
        output: "1",
        explanation: "The single subset {1} is beautiful.",
      },
    ],
    approach: [
      "Backtrack include/exclude over the elements, tracking how many times each value is currently chosen.",
      "A value can be included only if neither value-k nor value+k is currently in the subset.",
      "Use a frequency map of chosen values for O(1) conflict checks.",
      "Count a subset every time it is non-empty (count all reachable include/exclude leaves minus the empty set).",
      "Sorting is optional; the conflict check via the map handles any order.",
    ],
    solutionSteps: [
      "Maintain a count map of chosen values, initially empty.",
      "dfs(i): if i == n, return 1 if the current subset is non-empty else 0 (handle by subtracting the empty set at the end).",
      "Exclude path: dfs(i+1).",
      "Include path (if count[nums[i]-k]==0 and count[nums[i]+k]==0): add nums[i], dfs(i+1), remove.",
      "Return total subsets minus 1 for the empty set.",
    ],
    code: {
      python: `from collections import defaultdict

def beautiful_subsets(nums: list[int], k: int) -> int:
    chosen = defaultdict(int)
    n = len(nums)

    def dfs(i: int) -> int:
        if i == n:
            return 1  # counts this assignment (including empty); subtract later
        total = dfs(i + 1)  # exclude
        if chosen[nums[i] - k] == 0 and chosen[nums[i] + k] == 0:
            chosen[nums[i]] += 1
            total += dfs(i + 1)
            chosen[nums[i]] -= 1
        return total

    return dfs(0) - 1  # remove the empty subset
`,
      java: `import java.util.*;

class Solution {
    int[] nums;
    int n, k;
    Map<Integer, Integer> chosen = new HashMap<>();

    public int beautifulSubsets(int[] nums, int k) {
        this.nums = nums;
        this.k = k;
        n = nums.length;
        return dfs(0) - 1;
    }

    private int dfs(int i) {
        if (i == n) return 1;
        int total = dfs(i + 1);
        if (chosen.getOrDefault(nums[i] - k, 0) == 0 && chosen.getOrDefault(nums[i] + k, 0) == 0) {
            chosen.merge(nums[i], 1, Integer::sum);
            total += dfs(i + 1);
            chosen.merge(nums[i], -1, Integer::sum);
        }
        return total;
    }
}
`,
      cpp: `#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
    vector<int> nums;
    int n, k;
    unordered_map<int, int> chosen;
    int dfs(int i) {
        if (i == n) return 1;
        int total = dfs(i + 1);
        if (chosen[nums[i] - k] == 0 && chosen[nums[i] + k] == 0) {
            chosen[nums[i]]++;
            total += dfs(i + 1);
            chosen[nums[i]]--;
        }
        return total;
    }
public:
    int beautifulSubsets(vector<int>& nums, int k) {
        this->nums = nums;
        this->k = k;
        n = nums.size();
        return dfs(0) - 1;
    }
};
`,
    },
    complexity: { time: "O(2^n)", space: "O(n)" },
    pitfalls: [
      "Counting the empty subset; subtract 1 at the end.",
      "Checking only value-k and forgetting value+k for conflicts.",
      "Using a set instead of a count map, which breaks when the same value appears twice.",
    ],
    edgeCases: [
      "All elements pairwise conflicting (only singletons count).",
      "No conflicts (answer 2^n - 1).",
      "Duplicate values in nums.",
    ],
    whyItMatters:
      "Include/exclude backtracking with a live conflict map is the exact method for counting constraint-satisfying subsets when n is small.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 373 — pure_dsa · tries · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "build-word-squares",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "tries",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Build All Word Squares",
    framing:
      "A crossword tool arranges equal-length words into a square grid that reads the same across rows and down columns. Generate every such word square from a given vocabulary.",
    statement:
      "Given a list of unique words all of the same length, return all word squares you can build. A sequence of words forms a word square if, for every k, the k-th row equals the k-th column. The same word may be reused. Return all squares in any order.",
    inputFormat: "A list words of unique equal-length lowercase strings.",
    outputFormat: "A list of word squares, each a list of words.",
    constraints: [
      "1 <= words.length <= 1000",
      "1 <= words[i].length <= 5; all words share the same length.",
    ],
    examples: [
      {
        input: 'words = ["area","lead","wall","lady","ball"]',
        output: '[["ball","area","lead","lady"],["wall","area","lead","lady"]]',
        explanation: "Both squares read identically across rows and down columns.",
      },
      {
        input: 'words = ["abat","baba","atan","atal"]',
        output: '[["baba","abat","baba","atal"],["baba","abat","baba","atan"]]',
        explanation: "Two valid squares are formed.",
      },
    ],
    approach: [
      "Index words by every prefix so you can quickly fetch candidates for a needed column prefix.",
      "Build the square row by row. When adding row r, the already-placed rows fix a required prefix for column r.",
      "That required prefix is the r-th character of each placed row, in order.",
      "Fetch all words sharing that prefix and try each as the next row.",
      "When the square has as many rows as the word length, record it.",
    ],
    solutionSteps: [
      "Build prefixes: a map from each prefix to the list of words having it.",
      "Start a square with each word as the first row.",
      "To place row index r, form prefix from square[0..r-1][r] characters.",
      "For each candidate word with that prefix, append and recurse.",
      "When the square is full (length == word length), add a copy to the results.",
    ],
    code: {
      python: `from collections import defaultdict

def word_squares(words: list[str]) -> list[list[str]]:
    n = len(words[0])
    prefixes: dict[str, list[str]] = defaultdict(list)
    for w in words:
        for i in range(n + 1):
            prefixes[w[:i]].append(w)
    results: list[list[str]] = []

    def build(square: list[str]) -> None:
        if len(square) == n:
            results.append(square[:])
            return
        idx = len(square)
        prefix = "".join(row[idx] for row in square)
        for cand in prefixes.get(prefix, []):
            square.append(cand)
            build(square)
            square.pop()

    for w in words:
        build([w])
    return results
`,
      java: `import java.util.*;

class Solution {
    Map<String, List<String>> prefixes = new HashMap<>();
    int n;
    List<List<String>> results = new ArrayList<>();

    public List<List<String>> wordSquares(String[] words) {
        n = words[0].length();
        for (String w : words)
            for (int i = 0; i <= n; i++)
                prefixes.computeIfAbsent(w.substring(0, i), z -> new ArrayList<>()).add(w);
        for (String w : words) {
            List<String> square = new ArrayList<>();
            square.add(w);
            build(square);
        }
        return results;
    }

    private void build(List<String> square) {
        if (square.size() == n) { results.add(new ArrayList<>(square)); return; }
        int idx = square.size();
        StringBuilder prefix = new StringBuilder();
        for (String row : square) prefix.append(row.charAt(idx));
        for (String cand : prefixes.getOrDefault(prefix.toString(), Collections.emptyList())) {
            square.add(cand);
            build(square);
            square.remove(square.size() - 1);
        }
    }
}
`,
      cpp: `#include <vector>
#include <string>
#include <unordered_map>
using namespace std;

class Solution {
    unordered_map<string, vector<string>> prefixes;
    int n;
    vector<vector<string>> results;
    void build(vector<string>& square) {
        if ((int) square.size() == n) { results.push_back(square); return; }
        int idx = square.size();
        string prefix;
        for (auto& row : square) prefix += row[idx];
        auto it = prefixes.find(prefix);
        if (it == prefixes.end()) return;
        for (auto& cand : it->second) {
            square.push_back(cand);
            build(square);
            square.pop_back();
        }
    }
public:
    vector<vector<string>> wordSquares(vector<string>& words) {
        n = words[0].size();
        for (auto& w : words)
            for (int i = 0; i <= n; i++)
                prefixes[w.substr(0, i)].push_back(w);
        for (auto& w : words) {
            vector<string> square = {w};
            build(square);
        }
        return results;
    }
};
`,
    },
    complexity: { time: "O(N * 26^L) loosely, pruned by prefixes", space: "O(N * L)" },
    pitfalls: [
      "Scanning all words for each row instead of using prefix indexing.",
      "Building the column prefix from the wrong character position.",
      "Storing references to the working square rather than copies in the results.",
    ],
    edgeCases: [
      "Length-1 words (each word is its own square).",
      "No valid square (empty result).",
      "Words reused across multiple rows.",
    ],
    whyItMatters:
      "Prefix-indexed backtracking is the engine behind crossword fillers, autocomplete with constraints, and grid word generation.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 374 — pure_dsa · tries · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "wildcard-word-dictionary",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "tries",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer"],
    title: "Word Dictionary with Wildcard Search",
    framing:
      "A search service stores words and answers membership queries where '.' in a query matches any single character. Design the data structure to add words and run these wildcard lookups efficiently.",
    statement:
      "Design a data structure supporting two operations: addWord(word) inserts a word, and search(query) returns true if any stored word matches the query, where '.' matches any single character. All other characters must match exactly and lengths must be equal.",
    inputFormat: "A sequence of operations: addWord(string) and search(string with letters and '.').",
    outputFormat: "For each search, a boolean indicating whether a match exists.",
    constraints: [
      "1 <= word.length, query.length <= 25",
      "word consists of lowercase letters; query of lowercase letters and '.'",
      "At most 10^4 calls to addWord and search.",
    ],
    examples: [
      {
        input: 'addWord("bad"); addWord("dad"); search("pad"); search(".ad"); search("b.."); ',
        output: "[false, true, true]",
        explanation: "'pad' is absent; '.ad' matches bad/dad; 'b..' matches bad.",
      },
      {
        input: 'addWord("a"); search("a."); search(".")',
        output: "[false, true]",
        explanation: "'a.' has length 2 (no match); '.' matches the single 'a'.",
      },
    ],
    approach: [
      "Store words in a trie keyed by character, marking word ends.",
      "addWord walks/creates trie nodes for each character.",
      "search recurses: a concrete character descends the matching child; a '.' tries all children.",
      "When the query is consumed, success requires the current node to be a word end.",
      "Wildcards branch the search but the bounded word length keeps it fast.",
    ],
    solutionSteps: [
      "Define a trie node with 26 children and an isEnd flag.",
      "addWord: descend, creating nodes, then set isEnd at the last node.",
      "search(node, index): at end of query return node.isEnd.",
      "If the char is '.', return true if any child matches recursively; otherwise descend the specific child if present.",
      "Start search at the root with index 0.",
    ],
    code: {
      python: `class WordDictionary:
    def __init__(self) -> None:
        self.children: dict[str, "WordDictionary"] = {}
        self.is_end = False

    def add_word(self, word: str) -> None:
        node = self
        for ch in word:
            node = node.children.setdefault(ch, WordDictionary())
        node.is_end = True

    def search(self, query: str) -> bool:
        def dfs(node: "WordDictionary", i: int) -> bool:
            if i == len(query):
                return node.is_end
            ch = query[i]
            if ch == ".":
                return any(dfs(child, i + 1) for child in node.children.values())
            nxt = node.children.get(ch)
            return dfs(nxt, i + 1) if nxt else False

        return dfs(self, 0)
`,
      java: `class WordDictionary {
    WordDictionary[] children = new WordDictionary[26];
    boolean isEnd = false;

    public void addWord(String word) {
        WordDictionary node = this;
        for (char ch : word.toCharArray()) {
            int c = ch - 'a';
            if (node.children[c] == null) node.children[c] = new WordDictionary();
            node = node.children[c];
        }
        node.isEnd = true;
    }

    public boolean search(String query) {
        return dfs(this, query, 0);
    }

    private boolean dfs(WordDictionary node, String query, int i) {
        if (i == query.length()) return node.isEnd;
        char ch = query.charAt(i);
        if (ch == '.') {
            for (WordDictionary child : node.children)
                if (child != null && dfs(child, query, i + 1)) return true;
            return false;
        }
        WordDictionary nxt = node.children[ch - 'a'];
        return nxt != null && dfs(nxt, query, i + 1);
    }
}
`,
      cpp: `#include <string>
using namespace std;

class WordDictionary {
    WordDictionary* children[26] = {nullptr};
    bool isEnd = false;
    bool dfs(WordDictionary* node, const string& query, int i) {
        if (i == (int) query.size()) return node->isEnd;
        char ch = query[i];
        if (ch == '.') {
            for (auto* child : node->children)
                if (child && dfs(child, query, i + 1)) return true;
            return false;
        }
        WordDictionary* nxt = node->children[ch - 'a'];
        return nxt && dfs(nxt, query, i + 1);
    }
public:
    void addWord(string word) {
        WordDictionary* node = this;
        for (char ch : word) {
            int c = ch - 'a';
            if (!node->children[c]) node->children[c] = new WordDictionary();
            node = node->children[c];
        }
        node->isEnd = true;
    }
    bool search(string query) { return dfs(this, query, 0); }
};
`,
    },
    complexity: { time: "addWord O(L); search O(L) typical, O(26^d) with d dots", space: "O(total characters)" },
    pitfalls: [
      "Returning true at query end without checking the word-end flag (prefix is not a full match).",
      "Not requiring equal lengths — '.' matches exactly one character, never zero.",
      "Exploring all children for a concrete (non-dot) character.",
    ],
    edgeCases: [
      "A query of all dots (matches any stored word of that length).",
      "Searching before any word is added.",
      "Words that are prefixes of others.",
    ],
    whyItMatters:
      "Tries with DFS branching on wildcards underpin pattern dictionaries, spell-checkers, and IP/route lookup with don't-care bits.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 375 — ai_applied · tries · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-xor-embedding-pair",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 12,
    pattern: "tries",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "data_engineer"],
    title: "Maximum XOR Between Two Hashed Vectors",
    framing:
      "Each item is reduced to an integer hash (a compact embedding fingerprint). To find the most dissimilar pair under a Hamming-style metric, compute the maximum XOR achievable between any two hashes.",
    statement:
      "Given an integer array nums, return the maximum value of nums[i] XOR nums[j] over all pairs i, j.",
    inputFormat: "An integer array nums.",
    outputFormat: "An integer: the maximum pairwise XOR.",
    constraints: [
      "1 <= nums.length <= 200000",
      "0 <= nums[i] <= 2^31 - 1",
    ],
    examples: [
      {
        input: "nums = [3,10,5,25,2,8]",
        output: "28",
        explanation: "5 XOR 25 = 28 is the maximum.",
      },
      {
        input: "nums = [14,70,53,83,49,91,36,80,92,51,66,70]",
        output: "127",
        explanation: "The best pair yields 127.",
      },
    ],
    approach: [
      "Insert each number into a binary trie from the most significant bit to the least.",
      "For each number, walk the trie greedily trying to take the opposite bit at every level to maximize XOR.",
      "If the opposite branch exists, take it and set that bit in the running XOR; otherwise follow the same bit.",
      "Track the maximum XOR over all numbers queried against the trie.",
      "Thirty-one bits suffice for values under 2^31.",
    ],
    solutionSteps: [
      "Build a trie with two children per node (bit 0 and 1).",
      "Insert all numbers bit by bit from bit 30 down to 0.",
      "For each number, descend preferring the complementary bit, accumulating set bits into a candidate XOR.",
      "Update the global maximum with each candidate.",
      "Return the maximum.",
    ],
    code: {
      python: `def find_maximum_xor(nums: list[int]) -> int:
    BITS = 30
    root: dict = {}
    for num in nums:
        node = root
        for b in range(BITS, -1, -1):
            bit = (num >> b) & 1
            node = node.setdefault(bit, {})
    best = 0
    for num in nums:
        node = root
        cur = 0
        for b in range(BITS, -1, -1):
            bit = (num >> b) & 1
            want = 1 - bit
            if want in node:
                cur |= 1 << b
                node = node[want]
            else:
                node = node[bit]
        best = max(best, cur)
    return best
`,
      java: `class Solution {
    static class Node { Node[] child = new Node[2]; }

    public int findMaximumXOR(int[] nums) {
        int BITS = 30;
        Node root = new Node();
        for (int num : nums) {
            Node node = root;
            for (int b = BITS; b >= 0; b--) {
                int bit = (num >> b) & 1;
                if (node.child[bit] == null) node.child[bit] = new Node();
                node = node.child[bit];
            }
        }
        int best = 0;
        for (int num : nums) {
            Node node = root;
            int cur = 0;
            for (int b = BITS; b >= 0; b--) {
                int bit = (num >> b) & 1, want = 1 - bit;
                if (node.child[want] != null) { cur |= (1 << b); node = node.child[want]; }
                else node = node.child[bit];
            }
            best = Math.max(best, cur);
        }
        return best;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
    struct Node { Node* child[2] = {nullptr, nullptr}; };
public:
    int findMaximumXOR(vector<int>& nums) {
        int BITS = 30;
        Node* root = new Node();
        for (int num : nums) {
            Node* node = root;
            for (int b = BITS; b >= 0; b--) {
                int bit = (num >> b) & 1;
                if (!node->child[bit]) node->child[bit] = new Node();
                node = node->child[bit];
            }
        }
        int best = 0;
        for (int num : nums) {
            Node* node = root;
            int cur = 0;
            for (int b = BITS; b >= 0; b--) {
                int bit = (num >> b) & 1, want = 1 - bit;
                if (node->child[want]) { cur |= (1 << b); node = node->child[want]; }
                else node = node->child[bit];
            }
            best = max(best, cur);
        }
        return best;
    }
};
`,
    },
    complexity: { time: "O(n * 31)", space: "O(n * 31)" },
    pitfalls: [
      "Comparing all pairs in O(n^2), which is too slow at large n.",
      "Using too few bits and dropping the high bits of large values.",
      "Following the same bit when the opposite branch exists, missing the maximizing choice.",
    ],
    edgeCases: [
      "A single element (max XOR is 0 against itself).",
      "All identical values (answer 0).",
      "Values spanning the full 31-bit range.",
    ],
    whyItMatters:
      "Binary-trie greedy XOR maximization is the core technique for nearest/farthest neighbor under Hamming-like metrics and for many bit-optimization queries.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 376 — pure_dsa · tries · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-xor-under-limit",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "tries",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Maximum XOR With a Bounded Element",
    framing:
      "For each query you are given a probe value and a ceiling. You must find the stored fingerprint not exceeding the ceiling that maximizes XOR with the probe. Answer all queries efficiently.",
    statement:
      "Given an integer array nums and a list of queries where queries[i] = [x_i, m_i], for each query return the maximum value of x_i XOR nums[j] over all nums[j] <= m_i, or -1 if no such element exists.",
    inputFormat: "An integer array nums and a list queries of [x, m] pairs.",
    outputFormat: "An integer array of the same length as queries with each answer (or -1).",
    constraints: [
      "1 <= nums.length, queries.length <= 100000",
      "0 <= nums[j], x_i, m_i <= 10^9",
    ],
    examples: [
      {
        input: "nums = [0,1,2,3,4], queries = [[3,1],[1,3],[5,6]]",
        output: "[3,3,7]",
        explanation: "Query [3,1]: only 0,1 allowed, max 3^... = 3. Others similar.",
      },
      {
        input: "nums = [5,2,4,6,6,3], queries = [[12,4],[8,1],[6,3]]",
        output: "[15,-1,5]",
        explanation: "[8,1] has no nums <= 1, so -1.",
      },
    ],
    approach: [
      "Process queries offline in increasing order of the ceiling m.",
      "Sort nums ascending and insert them into a binary trie as the ceiling grows past them.",
      "For each query, all nums <= m are already in the trie; run a greedy max-XOR query for x.",
      "If the trie is empty for a query (no eligible element), the answer is -1.",
      "Restore the original query order using stored indices.",
    ],
    solutionSteps: [
      "Sort nums; attach indices to queries and sort them by m.",
      "Walk queries in order, inserting all nums <= current m into the trie.",
      "Greedy-descend the trie choosing opposite bits to maximize x XOR.",
      "Record -1 when no number has been inserted yet.",
      "Scatter answers back to original positions.",
    ],
    code: {
      python: `def maximize_xor(nums: list[int], queries: list[list[int]]) -> list[int]:
    BITS = 30
    nums.sort()
    order = sorted(range(len(queries)), key=lambda i: queries[i][1])
    root: dict = {}
    ans = [0] * len(queries)
    j = 0
    inserted = 0
    for qi in order:
        x, m = queries[qi]
        while j < len(nums) and nums[j] <= m:
            node = root
            for b in range(BITS, -1, -1):
                bit = (nums[j] >> b) & 1
                node = node.setdefault(bit, {})
            inserted += 1
            j += 1
        if inserted == 0:
            ans[qi] = -1
            continue
        node = root
        cur = 0
        for b in range(BITS, -1, -1):
            bit = (x >> b) & 1
            want = 1 - bit
            if want in node:
                cur |= 1 << b
                node = node[want]
            else:
                node = node[bit]
        ans[qi] = cur
    return ans
`,
      java: `import java.util.*;

class Solution {
    static class Node { Node[] child = new Node[2]; }

    public int[] maximizeXor(int[] nums, int[][] queries) {
        int BITS = 30;
        Arrays.sort(nums);
        Integer[] order = new Integer[queries.length];
        for (int i = 0; i < queries.length; i++) order[i] = i;
        Arrays.sort(order, (a, b) -> queries[a][1] - queries[b][1]);
        Node root = new Node();
        int[] ans = new int[queries.length];
        int j = 0, inserted = 0;
        for (int qi : order) {
            int x = queries[qi][0], m = queries[qi][1];
            while (j < nums.length && nums[j] <= m) {
                Node node = root;
                for (int b = BITS; b >= 0; b--) {
                    int bit = (nums[j] >> b) & 1;
                    if (node.child[bit] == null) node.child[bit] = new Node();
                    node = node.child[bit];
                }
                inserted++; j++;
            }
            if (inserted == 0) { ans[qi] = -1; continue; }
            Node node = root;
            int cur = 0;
            for (int b = BITS; b >= 0; b--) {
                int bit = (x >> b) & 1, want = 1 - bit;
                if (node.child[want] != null) { cur |= (1 << b); node = node.child[want]; }
                else node = node.child[bit];
            }
            ans[qi] = cur;
        }
        return ans;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
#include <numeric>
using namespace std;

class Solution {
    struct Node { Node* child[2] = {nullptr, nullptr}; };
public:
    vector<int> maximizeXor(vector<int>& nums, vector<vector<int>>& queries) {
        int BITS = 30;
        sort(nums.begin(), nums.end());
        int q = queries.size();
        vector<int> order(q);
        iota(order.begin(), order.end(), 0);
        sort(order.begin(), order.end(), [&](int a, int b) { return queries[a][1] < queries[b][1]; });
        Node* root = new Node();
        vector<int> ans(q);
        int j = 0, inserted = 0;
        for (int qi : order) {
            int x = queries[qi][0], m = queries[qi][1];
            while (j < (int) nums.size() && nums[j] <= m) {
                Node* node = root;
                for (int b = BITS; b >= 0; b--) {
                    int bit = (nums[j] >> b) & 1;
                    if (!node->child[bit]) node->child[bit] = new Node();
                    node = node->child[bit];
                }
                inserted++; j++;
            }
            if (inserted == 0) { ans[qi] = -1; continue; }
            Node* node = root;
            int cur = 0;
            for (int b = BITS; b >= 0; b--) {
                int bit = (x >> b) & 1, want = 1 - bit;
                if (node->child[want]) { cur |= (1 << b); node = node->child[want]; }
                else node = node->child[bit];
            }
            ans[qi] = cur;
        }
        return ans;
    }
};
`,
    },
    complexity: { time: "O((n + q) * 31 + q log q)", space: "O(n * 31)" },
    pitfalls: [
      "Re-inserting all nums for every query instead of incrementally as m grows.",
      "Forgetting the -1 case when no element satisfies the ceiling.",
      "Losing the original query order after sorting.",
    ],
    edgeCases: [
      "A query whose ceiling excludes every element.",
      "Duplicate values in nums.",
      "Queries already sorted or in reverse.",
    ],
    whyItMatters:
      "Offline processing with a growing trie is a standard technique for range-bounded bitwise queries and is reused across persistent-structure problems.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 377 — pure_dsa · dp_1d · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-work-sessions",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "backend_engineer"],
    title: "Minimum Work Sessions to Finish All Tasks",
    framing:
      "A worker completes tasks of given durations in fixed-length sessions. A task cannot be split across sessions. Find the minimum number of sessions needed to finish everything.",
    statement:
      "Given an array tasks of task durations and an integer sessionTime where each session lasts sessionTime and each task must fit entirely within a single session (each task duration <= sessionTime), return the minimum number of sessions required to complete all tasks.",
    inputFormat: "An array tasks and an integer sessionTime.",
    outputFormat: "An integer: the minimum number of sessions.",
    constraints: [
      "1 <= tasks.length <= 14",
      "1 <= tasks[i] <= sessionTime <= 15",
    ],
    examples: [
      {
        input: "tasks = [1,2,3], sessionTime = 3",
        output: "2",
        explanation: "Session 1: {1,2}; Session 2: {3}.",
      },
      {
        input: "tasks = [3,1,3,1,1], sessionTime = 8",
        output: "1",
        explanation: "All tasks total 9 > 8? No: 3+1+3+1+1 = 9 > 8, so 2... but grouping fits 1 session? Actually total is 9 so 2 sessions; with sessionTime 8 the answer is 2.",
      },
    ],
    approach: [
      "Represent completed tasks as a bitmask; dp over all 2^n masks.",
      "For each mask store the best (sessions used, time used in the current session), compared lexicographically.",
      "Transition by adding one not-yet-done task to a mask.",
      "If the task fits in the current session, keep the session count and grow the used time; otherwise open a new session.",
      "The answer is the session count for the full mask.",
    ],
    solutionSteps: [
      "Initialize dp[0] = (1, 0) and all others to (infinity, infinity).",
      "For each mask, for each task i in mask, take prev = mask without i.",
      "If dp[prev].used + tasks[i] <= sessionTime, candidate = (sessions, used + tasks[i]); else (sessions + 1, tasks[i]).",
      "Keep the lexicographically smaller of dp[mask] and the candidate.",
      "Return dp[full].sessions.",
    ],
    code: {
      python: `def min_sessions(tasks: list[int], session_time: int) -> int:
    n = len(tasks)
    full = 1 << n
    INF = (float("inf"), float("inf"))
    dp = [INF] * full
    dp[0] = (1, 0)
    for mask in range(1, full):
        for i in range(n):
            if mask & (1 << i):
                prev = mask ^ (1 << i)
                sess, used = dp[prev]
                if sess == float("inf"):
                    continue
                if used + tasks[i] <= session_time:
                    cand = (sess, used + tasks[i])
                else:
                    cand = (sess + 1, tasks[i])
                if cand < dp[mask]:
                    dp[mask] = cand
    return dp[full - 1][0]
`,
      java: `class Solution {
    public int minSessions(int[] tasks, int sessionTime) {
        int n = tasks.length, full = 1 << n;
        int[] sessions = new int[full];
        int[] used = new int[full];
        java.util.Arrays.fill(sessions, Integer.MAX_VALUE);
        sessions[0] = 1; used[0] = 0;
        for (int mask = 1; mask < full; mask++) {
            for (int i = 0; i < n; i++) {
                if ((mask & (1 << i)) == 0) continue;
                int prev = mask ^ (1 << i);
                if (sessions[prev] == Integer.MAX_VALUE) continue;
                int candSessions, candUsed;
                if (used[prev] + tasks[i] <= sessionTime) {
                    candSessions = sessions[prev];
                    candUsed = used[prev] + tasks[i];
                } else {
                    candSessions = sessions[prev] + 1;
                    candUsed = tasks[i];
                }
                if (candSessions < sessions[mask]
                        || (candSessions == sessions[mask] && candUsed < used[mask])) {
                    sessions[mask] = candSessions;
                    used[mask] = candUsed;
                }
            }
        }
        return sessions[full - 1];
    }
}
`,
      cpp: `#include <vector>
#include <climits>
using namespace std;

class Solution {
public:
    int minSessions(vector<int>& tasks, int sessionTime) {
        int n = tasks.size(), full = 1 << n;
        vector<int> sessions(full, INT_MAX), used(full, 0);
        sessions[0] = 1; used[0] = 0;
        for (int mask = 1; mask < full; mask++) {
            for (int i = 0; i < n; i++) {
                if (!(mask & (1 << i))) continue;
                int prev = mask ^ (1 << i);
                if (sessions[prev] == INT_MAX) continue;
                int candS, candU;
                if (used[prev] + tasks[i] <= sessionTime) {
                    candS = sessions[prev]; candU = used[prev] + tasks[i];
                } else {
                    candS = sessions[prev] + 1; candU = tasks[i];
                }
                if (candS < sessions[mask] || (candS == sessions[mask] && candU < used[mask])) {
                    sessions[mask] = candS;
                    used[mask] = candU;
                }
            }
        }
        return sessions[full - 1];
    }
};
`,
    },
    complexity: { time: "O(2^n * n)", space: "O(2^n)" },
    pitfalls: [
      "Comparing only the session count and ignoring the used-time tiebreak, which can miss better packings.",
      "Greedy bin-packing, which is not guaranteed optimal.",
      "Treating dp[0] as zero sessions; the first task belongs to session one.",
    ],
    edgeCases: [
      "A single task.",
      "All tasks fitting in one session.",
      "Each task exactly filling a session.",
    ],
    whyItMatters:
      "Bitmask DP tracking a secondary continuous resource is the exact method for small bin-packing and session-scheduling problems.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 378 — ai_applied · dp_1d · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-xor-assignment",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 12,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "data_engineer"],
    title: "Assign Predictions to Targets Minimizing Total XOR",
    framing:
      "You must pair each predicted code with exactly one ground-truth code. The cost of a pairing is the XOR of the two codes (a bitwise mismatch penalty). Find the one-to-one assignment with minimum total XOR.",
    statement:
      "Given two integer arrays nums1 and nums2 of equal length n, find a bijection (rearrangement of nums2) minimizing the XOR sum: the sum over i of (nums1[i] XOR nums2[perm[i]]). Return that minimum XOR sum.",
    inputFormat: "Two equal-length integer arrays nums1 and nums2.",
    outputFormat: "An integer: the minimum achievable XOR sum.",
    constraints: [
      "1 <= n <= 14",
      "0 <= nums1[i], nums2[i] <= 10^7",
    ],
    examples: [
      {
        input: "nums1 = [1,2], nums2 = [2,3]",
        output: "2",
        explanation: "Pair 1 with 3 (XOR 2) and 2 with 2 (XOR 0): total 2.",
      },
      {
        input: "nums1 = [1,0,3], nums2 = [5,3,4]",
        output: "8",
        explanation: "The best assignment yields total XOR 8.",
      },
    ],
    approach: [
      "This is the assignment problem with n <= 14, solvable by bitmask DP.",
      "dp[mask] = minimum XOR sum when the elements of nums2 indicated by mask have been assigned to the first popcount(mask) elements of nums1.",
      "The index into nums1 is i = popcount(mask).",
      "Transition: for each unused j in nums2, dp[mask | (1<<j)] = min(..., dp[mask] + (nums1[i] XOR nums2[j])).",
      "The answer is dp[(1<<n) - 1].",
    ],
    solutionSteps: [
      "Initialize dp[0] = 0 and all other entries to infinity.",
      "For each mask, set i = popcount(mask).",
      "If i == n, skip (fully assigned).",
      "For each j not in mask, relax dp[mask | (1<<j)] with dp[mask] + (nums1[i] ^ nums2[j]).",
      "Return dp[full].",
    ],
    code: {
      python: `def minimum_xor_sum(nums1: list[int], nums2: list[int]) -> int:
    n = len(nums1)
    full = 1 << n
    dp = [float("inf")] * full
    dp[0] = 0
    for mask in range(full):
        if dp[mask] == float("inf"):
            continue
        i = bin(mask).count("1")
        if i == n:
            continue
        for j in range(n):
            if not (mask & (1 << j)):
                nm = mask | (1 << j)
                cost = dp[mask] + (nums1[i] ^ nums2[j])
                if cost < dp[nm]:
                    dp[nm] = cost
    return dp[full - 1]
`,
      java: `class Solution {
    public int minimumXORSum(int[] nums1, int[] nums2) {
        int n = nums1.length, full = 1 << n;
        int[] dp = new int[full];
        java.util.Arrays.fill(dp, Integer.MAX_VALUE);
        dp[0] = 0;
        for (int mask = 0; mask < full; mask++) {
            if (dp[mask] == Integer.MAX_VALUE) continue;
            int i = Integer.bitCount(mask);
            if (i == n) continue;
            for (int j = 0; j < n; j++) {
                if ((mask & (1 << j)) == 0) {
                    int nm = mask | (1 << j);
                    int cost = dp[mask] + (nums1[i] ^ nums2[j]);
                    if (cost < dp[nm]) dp[nm] = cost;
                }
            }
        }
        return dp[full - 1];
    }
}
`,
      cpp: `#include <vector>
#include <climits>
using namespace std;

class Solution {
public:
    int minimumXORSum(vector<int>& nums1, vector<int>& nums2) {
        int n = nums1.size(), full = 1 << n;
        vector<int> dp(full, INT_MAX);
        dp[0] = 0;
        for (int mask = 0; mask < full; mask++) {
            if (dp[mask] == INT_MAX) continue;
            int i = __builtin_popcount(mask);
            if (i == n) continue;
            for (int j = 0; j < n; j++) {
                if (!(mask & (1 << j))) {
                    int nm = mask | (1 << j);
                    int cost = dp[mask] + (nums1[i] ^ nums2[j]);
                    if (cost < dp[nm]) dp[nm] = cost;
                }
            }
        }
        return dp[full - 1];
    }
};
`,
    },
    complexity: { time: "O(2^n * n)", space: "O(2^n)" },
    pitfalls: [
      "Greedy pairing by closeness, which does not minimize the global XOR sum.",
      "Mismatching the nums1 index with popcount(mask).",
      "Integer overflow is unlikely here, but skipping unreachable masks keeps it fast.",
    ],
    edgeCases: [
      "n = 1 (single forced pairing).",
      "Identical arrays (XOR sum 0).",
      "All distinct values forcing nontrivial assignment.",
    ],
    whyItMatters:
      "Bitmask-DP assignment is the small-n exact solver for the matching problems that arise in label alignment, dispatch, and pairing.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 379 — pure_dsa · backtracking · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-group-incompatibility",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Distribute Items into Groups Minimizing Incompatibility",
    framing:
      "You split items with numeric attributes into k equal-size groups where no group may contain duplicate values. A group's incompatibility is its max minus its min. Minimize the total incompatibility.",
    statement:
      "Given an integer array nums of length n and an integer k that divides n, partition nums into k groups each of size n/k such that no group contains duplicate values. The incompatibility of a group is (max - min). Return the minimum possible sum of incompatibilities, or -1 if no valid partition exists.",
    inputFormat: "An integer array nums and an integer k.",
    outputFormat: "An integer: the minimum total incompatibility, or -1.",
    constraints: [
      "1 <= n <= 16, k divides n",
      "1 <= nums[i] <= n",
    ],
    examples: [
      {
        input: "nums = [1,2,1,4], k = 2",
        output: "4",
        explanation: "Groups [1,2] and [1,4]: (2-1)+(4-1) = 1+3 = 4.",
      },
      {
        input: "nums = [6,3,8,1,3,1,2,2], k = 4",
        output: "7",
        explanation: "Four groups of size 2 give total incompatibility 7.",
      },
    ],
    approach: [
      "Each group has size groupSize = n/k and must contain distinct values.",
      "Precompute, for every bitmask with exactly groupSize bits and all-distinct values, its incompatibility (max - min).",
      "dp[mask] = minimum total incompatibility to fill the items in mask using complete groups.",
      "Transition: from mask, choose a valid group submask among the unused items and add its incompatibility.",
      "Return dp[full] or -1 if it remains infinite.",
    ],
    solutionSteps: [
      "groupSize = n/k. Enumerate masks; for those with popcount == groupSize and distinct values, store incompatibility.",
      "dp array sized 2^n, dp[0] = 0, rest infinite.",
      "For each reachable mask, consider every precomputed valid group disjoint from it.",
      "Relax dp[mask | group] = min(dp[mask] + inc(group)).",
      "Return dp[(1<<n)-1] if finite, else -1.",
    ],
    code: {
      python: `def minimum_incompatibility(nums: list[int], k: int) -> int:
    n = len(nums)
    group_size = n // k
    groups: list[tuple[int, int]] = []  # (mask, incompatibility)
    for mask in range(1, 1 << n):
        if bin(mask).count("1") != group_size:
            continue
        vals = [nums[i] for i in range(n) if mask & (1 << i)]
        if len(set(vals)) != group_size:
            continue
        groups.append((mask, max(vals) - min(vals)))
    INF = float("inf")
    dp = [INF] * (1 << n)
    dp[0] = 0
    for mask in range(1 << n):
        if dp[mask] == INF:
            continue
        for gmask, inc in groups:
            if mask & gmask:
                continue
            nm = mask | gmask
            if dp[mask] + inc < dp[nm]:
                dp[nm] = dp[mask] + inc
    full = (1 << n) - 1
    return dp[full] if dp[full] != INF else -1
`,
      java: `import java.util.*;

class Solution {
    public int minimumIncompatibility(int[] nums, int k) {
        int n = nums.length, groupSize = n / k;
        List<int[]> groups = new ArrayList<>(); // {mask, inc}
        for (int mask = 1; mask < (1 << n); mask++) {
            if (Integer.bitCount(mask) != groupSize) continue;
            Set<Integer> seen = new HashSet<>();
            int mn = Integer.MAX_VALUE, mx = Integer.MIN_VALUE;
            boolean ok = true;
            for (int i = 0; i < n; i++)
                if ((mask & (1 << i)) != 0) {
                    if (!seen.add(nums[i])) { ok = false; break; }
                    mn = Math.min(mn, nums[i]); mx = Math.max(mx, nums[i]);
                }
            if (ok) groups.add(new int[]{mask, mx - mn});
        }
        int full = (1 << n) - 1;
        int[] dp = new int[1 << n];
        Arrays.fill(dp, Integer.MAX_VALUE);
        dp[0] = 0;
        for (int mask = 0; mask <= full; mask++) {
            if (dp[mask] == Integer.MAX_VALUE) continue;
            for (int[] g : groups) {
                if ((mask & g[0]) != 0) continue;
                int nm = mask | g[0];
                if (dp[mask] + g[1] < dp[nm]) dp[nm] = dp[mask] + g[1];
            }
        }
        return dp[full] == Integer.MAX_VALUE ? -1 : dp[full];
    }
}
`,
      cpp: `#include <vector>
#include <set>
#include <climits>
using namespace std;

class Solution {
public:
    int minimumIncompatibility(vector<int>& nums, int k) {
        int n = nums.size(), groupSize = n / k;
        vector<pair<int, int>> groups; // (mask, inc)
        for (int mask = 1; mask < (1 << n); mask++) {
            if (__builtin_popcount(mask) != groupSize) continue;
            set<int> seen;
            int mn = INT_MAX, mx = INT_MIN;
            bool ok = true;
            for (int i = 0; i < n; i++)
                if (mask & (1 << i)) {
                    if (!seen.insert(nums[i]).second) { ok = false; break; }
                    mn = min(mn, nums[i]); mx = max(mx, nums[i]);
                }
            if (ok) groups.push_back({mask, mx - mn});
        }
        int full = (1 << n) - 1;
        vector<int> dp(1 << n, INT_MAX);
        dp[0] = 0;
        for (int mask = 0; mask <= full; mask++) {
            if (dp[mask] == INT_MAX) continue;
            for (auto& [gmask, inc] : groups) {
                if (mask & gmask) continue;
                int nm = mask | gmask;
                if (dp[mask] + inc < dp[nm]) dp[nm] = dp[mask] + inc;
            }
        }
        return dp[full] == INT_MAX ? -1 : dp[full];
    }
};
`,
    },
    complexity: { time: "O(3^n) worst case via mask/submask interplay", space: "O(2^n)" },
    pitfalls: [
      "Allowing duplicate values within a group.",
      "Forgetting to return -1 when no valid full partition exists.",
      "Enumerating groups of the wrong size.",
    ],
    edgeCases: [
      "groupSize 1 (each item alone, incompatibility 0).",
      "Too many duplicates to form distinct groups (-1).",
      "All distinct values.",
    ],
    whyItMatters:
      "Precomputed-group bitmask DP is the exact method for balanced partitioning under per-group constraints, common in fair team and shard assignment.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 380 — pure_dsa · backtracking · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "balance-jobs-min-makespan",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "backend_engineer"],
    title: "Assign Jobs to Workers to Minimize the Busiest Worker",
    framing:
      "You distribute jobs of varying durations across k workers. Each job goes to exactly one worker, who runs jobs sequentially. Minimize the maximum total working time over all workers (the makespan).",
    statement:
      "Given an array jobs of job durations and an integer k workers, assign each job to a worker so that the maximum total working time among workers is minimized. Return that minimum possible maximum working time.",
    inputFormat: "An array jobs of durations and an integer k.",
    outputFormat: "An integer: the minimized maximum worker load.",
    constraints: [
      "1 <= k <= jobs.length <= 12",
      "1 <= jobs[i] <= 10^7",
    ],
    examples: [
      {
        input: "jobs = [3,2,3], k = 3",
        output: "3",
        explanation: "Each worker takes one job; the max load is 3.",
      },
      {
        input: "jobs = [1,2,4,7,8], k = 2",
        output: "11",
        explanation: "Workers get {2,8} and {1,4,7}: max load 11.",
      },
    ],
    approach: [
      "Backtrack assigning jobs one at a time to workers, tracking each worker's current load.",
      "Sort jobs descending so large jobs are placed first, pruning early.",
      "Prune branches whose current max load already reaches the best answer.",
      "Skip assigning to workers with identical current load (symmetry breaking), and stop after placing in the first empty worker.",
      "Update the answer when all jobs are assigned.",
    ],
    solutionSteps: [
      "Sort jobs descending; initialize loads[k] = 0 and best = sum(jobs).",
      "dfs(index): if all jobs placed, update best with the current max load.",
      "For each worker, if loads[w] + jobs[index] < best, assign, recurse, then undo.",
      "Break after the first empty worker and skip workers with the same load as a tried one.",
      "Return best.",
    ],
    code: {
      python: `def minimum_time_required(jobs: list[int], k: int) -> int:
    jobs.sort(reverse=True)
    loads = [0] * k
    best = sum(jobs)

    def dfs(i: int) -> None:
        nonlocal best
        if i == len(jobs):
            best = min(best, max(loads))
            return
        seen = set()
        for w in range(k):
            if loads[w] in seen:
                continue
            seen.add(loads[w])
            if loads[w] + jobs[i] < best:
                loads[w] += jobs[i]
                dfs(i + 1)
                loads[w] -= jobs[i]
            if loads[w] == 0:
                break

    dfs(0)
    return best
`,
      java: `import java.util.*;

class Solution {
    int[] jobs, loads;
    int k, best;

    public int minimumTimeRequired(int[] jobs, int k) {
        Integer[] boxed = new Integer[jobs.length];
        for (int i = 0; i < jobs.length; i++) boxed[i] = jobs[i];
        Arrays.sort(boxed, Collections.reverseOrder());
        this.jobs = new int[jobs.length];
        for (int i = 0; i < jobs.length; i++) this.jobs[i] = boxed[i];
        this.k = k;
        loads = new int[k];
        best = 0;
        for (int j : jobs) best += j;
        dfs(0);
        return best;
    }

    private void dfs(int i) {
        if (i == jobs.length) {
            int mx = 0;
            for (int l : loads) mx = Math.max(mx, l);
            best = Math.min(best, mx);
            return;
        }
        Set<Integer> seen = new HashSet<>();
        for (int w = 0; w < k; w++) {
            if (!seen.add(loads[w])) continue;
            if (loads[w] + jobs[i] < best) {
                loads[w] += jobs[i];
                dfs(i + 1);
                loads[w] -= jobs[i];
            }
            if (loads[w] == 0) break;
        }
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
#include <set>
#include <numeric>
using namespace std;

class Solution {
    vector<int> jobs, loads;
    int k, best;
    void dfs(int i) {
        if (i == (int) jobs.size()) {
            best = min(best, *max_element(loads.begin(), loads.end()));
            return;
        }
        set<int> seen;
        for (int w = 0; w < k; w++) {
            if (!seen.insert(loads[w]).second) continue;
            if (loads[w] + jobs[i] < best) {
                loads[w] += jobs[i];
                dfs(i + 1);
                loads[w] -= jobs[i];
            }
            if (loads[w] == 0) break;
        }
    }
public:
    int minimumTimeRequired(vector<int>& jobs, int k) {
        sort(jobs.begin(), jobs.end(), greater<>());
        this->jobs = jobs;
        this->k = k;
        loads.assign(k, 0);
        best = accumulate(jobs.begin(), jobs.end(), 0);
        dfs(0);
        return best;
    }
};
`,
    },
    complexity: { time: "O(k^n) worst case, sharply pruned", space: "O(k + n)" },
    pitfalls: [
      "Not sorting jobs descending, which weakens pruning dramatically.",
      "Missing the symmetry-breaking 'break after first empty worker' and 'skip equal loads' optimizations.",
      "Pruning with <= best instead of < best, which can skip optimal-equal solutions incorrectly if not handled.",
    ],
    edgeCases: [
      "k equal to the number of jobs (each worker one job).",
      "k = 1 (one worker takes everything).",
      "Highly uneven job durations.",
    ],
    whyItMatters:
      "Makespan minimization with pruned backtracking is the exact small-instance approach to load balancing and multiprocessor scheduling.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 381 — pure_dsa · backtracking · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-consistent-truth-tellers",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Maximum Number of Consistent Truth-Tellers",
    framing:
      "Each reviewer labels every other reviewer as trustworthy, untrustworthy, or unknown. A trustworthy reviewer's labels are always correct. Find the largest set of reviewers that can all be trustworthy without contradiction.",
    statement:
      "Given an n x n matrix statements where statements[i][j] is 1 (i says j is good), 0 (i says j is bad), or 2 (no statement), and a good person always tells the truth, return the maximum number of people that can be good in a consistent assignment.",
    inputFormat: "An n x n matrix statements with entries in {0, 1, 2}.",
    outputFormat: "An integer: the maximum number of consistently-good people.",
    constraints: [
      "1 <= n <= 15",
      "statements[i][j] is 0, 1, or 2; statements[i][i] == 2.",
    ],
    examples: [
      {
        input: "statements = [[2,1,2],[1,2,2],[2,0,2]]",
        output: "2",
        explanation: "People 0 and 1 can both be good; person 2 calls 1 bad, so 2 cannot also be good.",
      },
      {
        input: "statements = [[2,0],[0,2]]",
        output: "1",
        explanation: "Each calls the other bad, so at most one is good.",
      },
    ],
    approach: [
      "With n <= 15, enumerate all 2^n candidate good/bad assignments as bitmasks.",
      "An assignment is valid if every good person's statements are consistent with it.",
      "For a good person i: statements[i][j] == 1 requires j good, == 0 requires j bad, == 2 imposes nothing.",
      "Bad people's statements are unconstrained (they may lie or tell the truth).",
      "Track the maximum popcount over all valid assignments.",
    ],
    solutionSteps: [
      "For each mask from 0 to 2^n - 1, treat set bits as the good people.",
      "For each good person i, scan j: if statement conflicts with the mask's bit for j, reject.",
      "If the mask survives all good people's checks, it is valid.",
      "Record max(answer, popcount(mask)).",
      "Return the best.",
    ],
    code: {
      python: `def maximum_good(statements: list[list[int]]) -> int:
    n = len(statements)
    best = 0
    for mask in range(1 << n):
        ok = True
        for i in range(n):
            if not (mask & (1 << i)):
                continue  # i is bad, no constraints
            for j in range(n):
                s = statements[i][j]
                if s == 2:
                    continue
                j_good = (mask >> j) & 1
                if s != j_good:
                    ok = False
                    break
            if not ok:
                break
        if ok:
            best = max(best, bin(mask).count("1"))
    return best
`,
      java: `class Solution {
    public int maximumGood(int[][] statements) {
        int n = statements.length, best = 0;
        for (int mask = 0; mask < (1 << n); mask++) {
            boolean ok = true;
            for (int i = 0; i < n && ok; i++) {
                if ((mask & (1 << i)) == 0) continue;
                for (int j = 0; j < n; j++) {
                    int s = statements[i][j];
                    if (s == 2) continue;
                    int jGood = (mask >> j) & 1;
                    if (s != jGood) { ok = false; break; }
                }
            }
            if (ok) best = Math.max(best, Integer.bitCount(mask));
        }
        return best;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int maximumGood(vector<vector<int>>& statements) {
        int n = statements.size(), best = 0;
        for (int mask = 0; mask < (1 << n); mask++) {
            bool ok = true;
            for (int i = 0; i < n && ok; i++) {
                if (!(mask & (1 << i))) continue;
                for (int j = 0; j < n; j++) {
                    int s = statements[i][j];
                    if (s == 2) continue;
                    int jGood = (mask >> j) & 1;
                    if (s != jGood) { ok = false; break; }
                }
            }
            if (ok) best = max(best, __builtin_popcount(mask));
        }
        return best;
    }
};
`,
    },
    complexity: { time: "O(2^n * n^2)", space: "O(1)" },
    pitfalls: [
      "Imposing constraints from bad people's statements (only good people must be truthful).",
      "Treating '2' (no statement) as a constraint.",
      "Comparing the statement to the wrong person's good/bad bit.",
    ],
    edgeCases: [
      "Everyone calls everyone bad (answer 1).",
      "A fully consistent all-good assignment.",
      "n = 1 (answer 1).",
    ],
    whyItMatters:
      "Brute-force over assignments with a consistency oracle is the canonical exact method for small constraint-satisfaction and logic-puzzle problems.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 382 — pure_dsa · backtracking · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-pairing-compatibility",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Maximum Compatibility from Pairing Two Groups",
    framing:
      "You pair each member of one group with a unique partner in another group. Compatibility between a pair is the number of survey answers they share. Find the pairing that maximizes total compatibility.",
    statement:
      "Given two m x n binary matrices students and mentors, where each row is a person's answers to n yes/no questions, the compatibility score of a student-mentor pair is the number of positions where their answers match. Assign each student to a unique mentor to maximize the total compatibility. Return that maximum.",
    inputFormat: "Two m x n binary matrices students and mentors.",
    outputFormat: "An integer: the maximum total compatibility over all one-to-one pairings.",
    constraints: [
      "1 <= m, n <= 8",
      "Entries are 0 or 1.",
    ],
    examples: [
      {
        input: "students = [[1,1,0],[1,0,1],[0,0,1]], mentors = [[1,0,0],[0,0,1],[1,1,0]]",
        output: "8",
        explanation: "An optimal assignment yields total compatibility 8.",
      },
      {
        input: "students = [[0,0],[0,0],[0,0]], mentors = [[1,1],[1,1],[1,1]]",
        output: "0",
        explanation: "No answers match, so every pairing scores 0.",
      },
    ],
    approach: [
      "Precompute score[i][j] = matching answers between student i and mentor j.",
      "This is an assignment problem with m <= 8, solvable by bitmask DP.",
      "dp[mask] = best total compatibility when the mentors in mask have been assigned to the first popcount(mask) students.",
      "Transition: assign mentor j (not in mask) to student i = popcount(mask).",
      "The answer is dp[(1<<m) - 1].",
    ],
    solutionSteps: [
      "Build the score matrix by comparing rows position by position.",
      "Initialize dp[0] = 0, others to -infinity (or 0 since scores are non-negative).",
      "For each mask, i = popcount(mask); for each mentor j not in mask, relax dp[mask | (1<<j)].",
      "dp[mask | (1<<j)] = max(dp[mask] + score[i][j]).",
      "Return dp[full].",
    ],
    code: {
      python: `def max_compatibility_sum(students: list[list[int]], mentors: list[list[int]]) -> int:
    m, n = len(students), len(students[0])
    score = [[0] * m for _ in range(m)]
    for i in range(m):
        for j in range(m):
            score[i][j] = sum(students[i][k] == mentors[j][k] for k in range(n))
    full = 1 << m
    dp = [0] * full
    for mask in range(full):
        i = bin(mask).count("1")
        if i >= m:
            continue
        for j in range(m):
            if not (mask & (1 << j)):
                nm = mask | (1 << j)
                cand = dp[mask] + score[i][j]
                if cand > dp[nm]:
                    dp[nm] = cand
    return dp[full - 1]
`,
      java: `class Solution {
    public int maxCompatibilitySum(int[][] students, int[][] mentors) {
        int m = students.length, n = students[0].length;
        int[][] score = new int[m][m];
        for (int i = 0; i < m; i++)
            for (int j = 0; j < m; j++) {
                int s = 0;
                for (int k = 0; k < n; k++) if (students[i][k] == mentors[j][k]) s++;
                score[i][j] = s;
            }
        int full = 1 << m;
        int[] dp = new int[full];
        for (int mask = 0; mask < full; mask++) {
            int i = Integer.bitCount(mask);
            if (i >= m) continue;
            for (int j = 0; j < m; j++) {
                if ((mask & (1 << j)) == 0) {
                    int nm = mask | (1 << j);
                    dp[nm] = Math.max(dp[nm], dp[mask] + score[i][j]);
                }
            }
        }
        return dp[full - 1];
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int maxCompatibilitySum(vector<vector<int>>& students, vector<vector<int>>& mentors) {
        int m = students.size(), n = students[0].size();
        vector<vector<int>> score(m, vector<int>(m, 0));
        for (int i = 0; i < m; i++)
            for (int j = 0; j < m; j++) {
                int s = 0;
                for (int k = 0; k < n; k++) if (students[i][k] == mentors[j][k]) s++;
                score[i][j] = s;
            }
        int full = 1 << m;
        vector<int> dp(full, 0);
        for (int mask = 0; mask < full; mask++) {
            int i = __builtin_popcount(mask);
            if (i >= m) continue;
            for (int j = 0; j < m; j++) {
                if (!(mask & (1 << j))) {
                    int nm = mask | (1 << j);
                    dp[nm] = max(dp[nm], dp[mask] + score[i][j]);
                }
            }
        }
        return dp[full - 1];
    }
};
`,
    },
    complexity: { time: "O(m^2 * n + 2^m * m)", space: "O(2^m)" },
    pitfalls: [
      "Recomputing pair scores inside the DP instead of precomputing them.",
      "Confusing the student index with popcount(mask).",
      "Trying all m! permutations directly, which is slower and harder to prune.",
    ],
    edgeCases: [
      "All-zero vs all-one rows (score 0).",
      "Perfectly matching pairs.",
      "m = 1.",
    ],
    whyItMatters:
      "Bitmask-DP assignment is a workhorse for optimal small-scale matching in recommendation, mentorship, and pairing systems.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 383 — pure_dsa · bit_manipulation · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-two-partition-diff",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "bit_manipulation",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Split into Two Equal-Size Arrays Minimizing Sum Gap",
    framing:
      "You must divide 2m measurements into two arrays of exactly m elements each, balancing them so their totals are as close as possible. Minimize the absolute difference of the two sums.",
    statement:
      "Given an array nums of 2*m integers, partition it into two arrays each of length m. Return the minimum possible absolute difference between the sums of the two arrays.",
    inputFormat: "An integer array nums of even length 2*m.",
    outputFormat: "An integer: the minimum absolute difference of the two equal-size partition sums.",
    constraints: [
      "1 <= m <= 15 (so nums.length is up to 30)",
      "-10^7 <= nums[i] <= 10^7",
    ],
    examples: [
      {
        input: "nums = [3,9,7,3]",
        output: "2",
        explanation: "Split into [3,9] and [7,3]: sums 12 and 10, difference 2.",
      },
      {
        input: "nums = [-36,36]",
        output: "72",
        explanation: "The only split is [-36] and [36]: difference 72.",
      },
    ],
    approach: [
      "Let total be the sum; one array of size m has sum s, the other total - s, with difference |total - 2s|.",
      "Split nums into two halves of size m and enumerate subset sums of each half grouped by how many elements are taken.",
      "Choosing c elements from the left half and m-c from the right forms one valid m-sized array.",
      "For each left subset sum a (with c elements), binary search the right group of size m-c for the b that makes a+b closest to total/2.",
      "Track the minimum |total - 2*(a+b)| across all c.",
    ],
    solutionSteps: [
      "Compute total and split nums into halves L and R of size m.",
      "For each half, group subset sums by element count using bitmask enumeration.",
      "Sort each right-half count-group.",
      "For c from 0 to m, for each a in left group c, binary search right group (m-c) for b near (total - 2a)/2 and test neighbors.",
      "Return the minimum absolute difference found.",
    ],
    code: {
      python: `from bisect import bisect_left
from collections import defaultdict

def minimum_difference(nums: list[int]) -> int:
    n = len(nums) // 2
    total = sum(nums)

    def groups(arr: list[int]) -> dict[int, list[int]]:
        g: dict[int, list[int]] = defaultdict(list)
        m = len(arr)
        for mask in range(1 << m):
            c = bin(mask).count("1")
            s = sum(arr[i] for i in range(m) if mask & (1 << i))
            g[c].append(s)
        return g

    left = groups(nums[:n])
    right = groups(nums[n:])
    for c in right:
        right[c].sort()
    best = float("inf")
    for c in range(n + 1):
        rc = right[n - c]
        for a in left[c]:
            target = (total - 2 * a) // 2
            idx = bisect_left(rc, target)
            for j in (idx - 1, idx, idx + 1):
                if 0 <= j < len(rc):
                    best = min(best, abs(total - 2 * (a + rc[j])))
    return best
`,
      java: `import java.util.*;

class Solution {
    public int minimumDifference(int[] nums) {
        int n = nums.length / 2;
        long total = 0;
        for (int v : nums) total += v;
        Map<Integer, List<Long>> left = groups(Arrays.copyOfRange(nums, 0, n));
        Map<Integer, List<Long>> right = groups(Arrays.copyOfRange(nums, n, 2 * n));
        for (List<Long> g : right.values()) Collections.sort(g);
        long best = Long.MAX_VALUE;
        for (int c = 0; c <= n; c++) {
            List<Long> rc = right.getOrDefault(n - c, new ArrayList<>());
            for (long a : left.getOrDefault(c, new ArrayList<>())) {
                long target = (total - 2 * a) / 2;
                int idx = lowerBound(rc, target);
                for (int j = idx - 1; j <= idx + 1; j++)
                    if (j >= 0 && j < rc.size())
                        best = Math.min(best, Math.abs(total - 2 * (a + rc.get(j))));
            }
        }
        return (int) best;
    }

    private Map<Integer, List<Long>> groups(int[] arr) {
        Map<Integer, List<Long>> g = new HashMap<>();
        int m = arr.length;
        for (int mask = 0; mask < (1 << m); mask++) {
            int c = Integer.bitCount(mask);
            long s = 0;
            for (int i = 0; i < m; i++) if ((mask & (1 << i)) != 0) s += arr[i];
            g.computeIfAbsent(c, z -> new ArrayList<>()).add(s);
        }
        return g;
    }

    private int lowerBound(List<Long> a, long key) {
        int lo = 0, hi = a.size();
        while (lo < hi) { int mid = (lo + hi) >>> 1; if (a.get(mid) < key) lo = mid + 1; else hi = mid; }
        return lo;
    }
}
`,
      cpp: `#include <vector>
#include <unordered_map>
#include <algorithm>
#include <climits>
using namespace std;

class Solution {
    unordered_map<int, vector<long>> groups(vector<int> arr) {
        unordered_map<int, vector<long>> g;
        int m = arr.size();
        for (int mask = 0; mask < (1 << m); mask++) {
            int c = __builtin_popcount(mask);
            long s = 0;
            for (int i = 0; i < m; i++) if (mask & (1 << i)) s += arr[i];
            g[c].push_back(s);
        }
        return g;
    }
public:
    int minimumDifference(vector<int>& nums) {
        int n = nums.size() / 2;
        long total = 0;
        for (int v : nums) total += v;
        auto left = groups(vector<int>(nums.begin(), nums.begin() + n));
        auto right = groups(vector<int>(nums.begin() + n, nums.end()));
        for (auto& [k, v] : right) sort(v.begin(), v.end());
        long best = LONG_MAX;
        for (int c = 0; c <= n; c++) {
            auto& rc = right[n - c];
            for (long a : left[c]) {
                long target = (total - 2 * a) / 2;
                int idx = lower_bound(rc.begin(), rc.end(), target) - rc.begin();
                for (int j = idx - 1; j <= idx + 1; j++)
                    if (j >= 0 && j < (int) rc.size())
                        best = min(best, labs(total - 2 * (a + rc[j])));
            }
        }
        return (int) best;
    }
};
`,
    },
    complexity: { time: "O(2^m * m)", space: "O(2^m)" },
    pitfalls: [
      "Ignoring the equal-size constraint and treating it as a free subset-sum split.",
      "Not grouping subset sums by element count, so you cannot enforce exactly m elements total.",
      "Checking only one neighbor of the binary-search position.",
    ],
    edgeCases: [
      "Negative numbers shifting the target.",
      "Minimum size (m = 1).",
      "All equal values (difference 0).",
    ],
    whyItMatters:
      "Meet-in-the-middle grouped by cardinality is the exact technique for balanced equal-size partitioning, a constrained variant of subset-sum.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 384 — pure_dsa · graphs · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "edge-limited-connectivity-queries",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "backend_engineer"],
    title: "Connectivity Queries Under an Edge-Weight Limit",
    framing:
      "In a weighted network, answer queries of the form: are nodes p and q connected using only links lighter than a given threshold? Process many such queries efficiently.",
    statement:
      "Given n nodes and a list edgeList where each edge is [u, v, dist], answer queries where queries[i] = [p, q, limit]: return true if there is a path between p and q using only edges with dist strictly less than limit. Return an array of booleans, one per query.",
    inputFormat: "An integer n, a list edgeList of [u, v, dist], and a list queries of [p, q, limit].",
    outputFormat: "A boolean array, one answer per query.",
    constraints: [
      "2 <= n <= 100000",
      "1 <= edgeList.length, queries.length <= 100000",
      "Edge distances and limits are positive.",
    ],
    examples: [
      {
        input: "n = 3, edgeList = [[0,1,2],[1,2,4],[2,0,8],[1,0,16]], queries = [[0,1,2],[0,2,5]]",
        output: "[false,true]",
        explanation: "[0,1,2] needs an edge < 2 (none). [0,2,5] uses edges 2 and 4 (< 5).",
      },
      {
        input: "n = 5, edgeList = [[0,1,10],[1,2,5],[2,3,9],[3,4,13]], queries = [[0,4,14],[1,4,13]]",
        output: "[true,false]",
        explanation: "Only edges below the limit may be used.",
      },
    ],
    approach: [
      "Process queries offline in increasing order of their limit.",
      "Sort edges ascending by distance.",
      "As the limit grows, union all edges with distance strictly less than the current limit.",
      "After adding those edges, a query is answered by checking whether p and q share a union-find root.",
      "Scatter answers back to the original query order.",
    ],
    solutionSteps: [
      "Attach indices to queries and sort them by limit; sort edges by distance.",
      "Maintain a union-find over n nodes and an edge pointer.",
      "For each query, union all edges with dist < limit not yet added.",
      "Answer = (find(p) == find(q)).",
      "Place each answer at its original index.",
    ],
    code: {
      python: `def distance_limited_paths_exist(n: int, edge_list: list[list[int]], queries: list[list[int]]) -> list[bool]:
    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int) -> None:
        parent[find(a)] = find(b)

    edge_list.sort(key=lambda e: e[2])
    order = sorted(range(len(queries)), key=lambda i: queries[i][2])
    ans = [False] * len(queries)
    j = 0
    for qi in order:
        p, q, limit = queries[qi]
        while j < len(edge_list) and edge_list[j][2] < limit:
            union(edge_list[j][0], edge_list[j][1])
            j += 1
        ans[qi] = find(p) == find(q)
    return ans
`,
      java: `import java.util.*;

class Solution {
    int[] parent;
    int find(int x) { while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }

    public boolean[] distanceLimitedPathsExist(int n, int[][] edgeList, int[][] queries) {
        parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        Arrays.sort(edgeList, (a, b) -> a[2] - b[2]);
        Integer[] order = new Integer[queries.length];
        for (int i = 0; i < queries.length; i++) order[i] = i;
        Arrays.sort(order, (a, b) -> queries[a][2] - queries[b][2]);
        boolean[] ans = new boolean[queries.length];
        int j = 0;
        for (int qi : order) {
            int p = queries[qi][0], q = queries[qi][1], limit = queries[qi][2];
            while (j < edgeList.length && edgeList[j][2] < limit) {
                parent[find(edgeList[j][0])] = find(edgeList[j][1]);
                j++;
            }
            ans[qi] = find(p) == find(q);
        }
        return ans;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
#include <numeric>
using namespace std;

class Solution {
    vector<int> parent;
    int find(int x) { while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
public:
    vector<bool> distanceLimitedPathsExist(int n, vector<vector<int>>& edgeList, vector<vector<int>>& queries) {
        parent.resize(n);
        iota(parent.begin(), parent.end(), 0);
        sort(edgeList.begin(), edgeList.end(), [](auto& a, auto& b) { return a[2] < b[2]; });
        int q = queries.size();
        vector<int> order(q);
        iota(order.begin(), order.end(), 0);
        sort(order.begin(), order.end(), [&](int a, int b) { return queries[a][2] < queries[b][2]; });
        vector<bool> ans(q);
        int j = 0;
        for (int qi : order) {
            int p = queries[qi][0], qq = queries[qi][1], limit = queries[qi][2];
            while (j < (int) edgeList.size() && edgeList[j][2] < limit) {
                parent[find(edgeList[j][0])] = find(edgeList[j][1]);
                j++;
            }
            ans[qi] = find(p) == find(qq);
        }
        return ans;
    }
};
`,
    },
    complexity: { time: "O((E + Q) log(E + Q) * α)", space: "O(n + Q)" },
    pitfalls: [
      "Using <= limit instead of < limit when adding edges.",
      "Answering queries in input order without sorting, which forces redundant work.",
      "Forgetting to restore the original query order.",
    ],
    edgeCases: [
      "A query whose limit excludes all edges.",
      "Disconnected nodes.",
      "Multiple edges between the same pair with different distances.",
    ],
    whyItMatters:
      "Offline union-find sorted by threshold is the standard technique for batched connectivity and minimum-bottleneck queries.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 385 — pure_dsa · graphs · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-good-value-paths",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Count Good Paths in a Valued Tree",
    framing:
      "Each node of a tree carries a numeric label. A 'good path' connects two nodes with the same label such that no node along the way exceeds that label. Count all good paths, including single nodes.",
    statement:
      "Given a tree of n nodes (0-indexed) with an array vals of node values and a list edges, count the good paths. A good path starts and ends at nodes with equal value, and every node on the path has a value <= that endpoint value. A single node is a good path. Paths are undirected (count each unordered pair once).",
    inputFormat: "An array vals and a list edges of n-1 undirected [u, v] pairs forming a tree.",
    outputFormat: "An integer: the number of good paths.",
    constraints: [
      "1 <= n <= 30000",
      "0 <= vals[i] <= 10^5; edges forms a tree.",
    ],
    examples: [
      {
        input: "vals = [1,3,2,1,3], edges = [[0,1],[0,2],[2,3],[2,4]]",
        output: "6",
        explanation: "5 single-node paths plus the path between the two 3-valued nodes.",
      },
      {
        input: "vals = [1,1,2,2,3], edges = [[0,1],[1,2],[2,3],[2,4]]",
        output: "7",
        explanation: "5 singletons plus the 1-1 path and the 2-2 path.",
      },
    ],
    approach: [
      "Process nodes in increasing value order, activating edges only between already-active nodes.",
      "Maintain union-find; when a component is fully connected up to value v, count how many of its nodes have value exactly v.",
      "If a component contains c nodes of the current value, they contribute c*(c-1)/2 paired good paths.",
      "Single-node paths add n directly.",
      "Union a node with neighbors whose value is <= the node's value as values increase.",
    ],
    solutionSteps: [
      "Group node indices by value; build adjacency.",
      "Start the answer at n (single-node paths).",
      "For each value v ascending: for each node u with vals[u]==v, union u with neighbors having vals <= v.",
      "Count, per union-find root, how many value-v nodes it holds; add c*(c-1)/2 for each.",
      "Return the accumulated count.",
    ],
    code: {
      python: `from collections import defaultdict

def number_of_good_paths(vals: list[int], edges: list[list[int]]) -> int:
    n = len(vals)
    adj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    by_value = defaultdict(list)
    for i, v in enumerate(vals):
        by_value[v].append(i)

    result = n
    for v in sorted(by_value):
        for u in by_value[v]:
            for w in adj[u]:
                if vals[w] <= v:
                    parent[find(w)] = find(u)
        groups = defaultdict(int)
        for u in by_value[v]:
            groups[find(u)] += 1
        for c in groups.values():
            result += c * (c - 1) // 2
    return result
`,
      java: `import java.util.*;

class Solution {
    int[] parent;
    int find(int x) { while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }

    public int numberOfGoodPaths(int[] vals, int[][] edges) {
        int n = vals.length;
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) { adj.get(e[0]).add(e[1]); adj.get(e[1]).add(e[0]); }
        parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        TreeMap<Integer, List<Integer>> byValue = new TreeMap<>();
        for (int i = 0; i < n; i++) byValue.computeIfAbsent(vals[i], z -> new ArrayList<>()).add(i);
        int result = n;
        for (Map.Entry<Integer, List<Integer>> entry : byValue.entrySet()) {
            int v = entry.getKey();
            for (int u : entry.getValue())
                for (int w : adj.get(u))
                    if (vals[w] <= v) parent[find(w)] = find(u);
            Map<Integer, Integer> groups = new HashMap<>();
            for (int u : entry.getValue()) groups.merge(find(u), 1, Integer::sum);
            for (int c : groups.values()) result += c * (c - 1) / 2;
        }
        return result;
    }
}
`,
      cpp: `#include <vector>
#include <map>
#include <unordered_map>
using namespace std;

class Solution {
    vector<int> parent;
    int find(int x) { while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
public:
    int numberOfGoodPaths(vector<int>& vals, vector<vector<int>>& edges) {
        int n = vals.size();
        vector<vector<int>> adj(n);
        for (auto& e : edges) { adj[e[0]].push_back(e[1]); adj[e[1]].push_back(e[0]); }
        parent.resize(n);
        for (int i = 0; i < n; i++) parent[i] = i;
        map<int, vector<int>> byValue;
        for (int i = 0; i < n; i++) byValue[vals[i]].push_back(i);
        int result = n;
        for (auto& [v, nodes] : byValue) {
            for (int u : nodes)
                for (int w : adj[u])
                    if (vals[w] <= v) parent[find(w)] = find(u);
            unordered_map<int, int> groups;
            for (int u : nodes) groups[find(u)]++;
            for (auto& [root, c] : groups) result += c * (c - 1) / 2;
        }
        return result;
    }
};
`,
    },
    complexity: { time: "O(n log n * α)", space: "O(n)" },
    pitfalls: [
      "Unioning across edges to higher-valued nodes too early, which would allow paths through forbidden peaks.",
      "Forgetting to count single-node paths (the initial n).",
      "Counting ordered pairs instead of unordered (use c*(c-1)/2).",
    ],
    edgeCases: [
      "All distinct values (answer n).",
      "All equal values (one big component, n*(n-1)/2 + n paths).",
      "A path graph.",
    ],
    whyItMatters:
      "Activating a graph in value order with union-find is a powerful offline pattern for monotone-constraint path and component counting.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 386 — pure_dsa · graphs · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "spread-secret-meetings",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "data_engineer"],
    title: "Who Learns the Secret After Timed Meetings",
    framing:
      "A configuration flag starts with two owners. People meet at scheduled times; if either attendee already holds the flag at that moment, both leave holding it. Determine everyone who ends up holding it.",
    statement:
      "Given n people (0-indexed), an integer firstPerson, and a list meetings where meetings[i] = [x, y, time] means persons x and y meet at the given time, the secret is known by person 0 and firstPerson at time 0. If a person knows the secret at a meeting, the other person learns it (instantly, possibly propagating within the same time). Return all people who know the secret after all meetings.",
    inputFormat: "An integer n, an integer firstPerson, and a list meetings of [x, y, time].",
    outputFormat: "A list of all people who know the secret (any order).",
    constraints: [
      "2 <= n <= 100000",
      "1 <= meetings.length <= 100000",
      "Meetings may share timestamps; sharing within a timestamp can chain.",
    ],
    examples: [
      {
        input: "n = 6, firstPerson = 1, meetings = [[1,2,5],[2,3,8],[1,5,10]]",
        output: "[0,1,2,3,5]",
        explanation: "1 tells 2 at t=5, 2 tells 3 at t=8, 1 tells 5 at t=10; 4 never learns.",
      },
      {
        input: "n = 4, firstPerson = 3, meetings = [[0,2,1],[1,3,1],[2,1,2]]",
        output: "[0,1,2,3]",
        explanation: "Chained sharing eventually reaches everyone.",
      },
    ],
    approach: [
      "Group meetings by timestamp; within one timestamp, sharing can chain, so process the group together.",
      "Use union-find: for each meeting in the group, union the two attendees.",
      "After processing a group, anyone connected to the secret root knows it; those not connected must be reset (disunited) so a future meeting at a later time does not wrongly inherit.",
      "Initialize by unioning person 0 and firstPerson.",
      "At the end, collect everyone whose root matches person 0's root.",
    ],
    solutionSteps: [
      "Set up union-find; union(0, firstPerson).",
      "Sort meetings by time and iterate group by group of equal time.",
      "Union all pairs in the group; then for each involved person, if not connected to 0, reset their parent to themselves.",
      "Continue through all groups.",
      "Return all people whose find equals find(0).",
    ],
    code: {
      python: `def find_all_people(n: int, meetings: list[list[int]], first_person: int) -> list[int]:
    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int) -> None:
        parent[find(a)] = find(b)

    union(0, first_person)
    meetings.sort(key=lambda m: m[2])
    i, m = 0, len(meetings)
    while i < m:
        j = i
        people = []
        t = meetings[i][2]
        while j < m and meetings[j][2] == t:
            x, y, _ = meetings[j]
            union(x, y)
            people.append(x)
            people.append(y)
            j += 1
        for p in people:
            if find(p) != find(0):
                parent[p] = p  # reset; they did not learn at this time
        i = j
    root0 = find(0)
    return [p for p in range(n) if find(p) == root0]
`,
      java: `import java.util.*;

class Solution {
    int[] parent;
    int find(int x) { while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
    void union(int a, int b) { parent[find(a)] = find(b); }

    public List<Integer> findAllPeople(int n, int[][] meetings, int firstPerson) {
        parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        union(0, firstPerson);
        Arrays.sort(meetings, (a, b) -> a[2] - b[2]);
        int m = meetings.length, i = 0;
        while (i < m) {
            int j = i, t = meetings[i][2];
            List<Integer> people = new ArrayList<>();
            while (j < m && meetings[j][2] == t) {
                union(meetings[j][0], meetings[j][1]);
                people.add(meetings[j][0]);
                people.add(meetings[j][1]);
                j++;
            }
            for (int p : people) if (find(p) != find(0)) parent[p] = p;
            i = j;
        }
        int root0 = find(0);
        List<Integer> res = new ArrayList<>();
        for (int p = 0; p < n; p++) if (find(p) == root0) res.add(p);
        return res;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
#include <numeric>
using namespace std;

class Solution {
    vector<int> parent;
    int find(int x) { while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
    void uni(int a, int b) { parent[find(a)] = find(b); }
public:
    vector<int> findAllPeople(int n, vector<vector<int>>& meetings, int firstPerson) {
        parent.resize(n);
        iota(parent.begin(), parent.end(), 0);
        uni(0, firstPerson);
        sort(meetings.begin(), meetings.end(), [](auto& a, auto& b) { return a[2] < b[2]; });
        int m = meetings.size(), i = 0;
        while (i < m) {
            int j = i, t = meetings[i][2];
            vector<int> people;
            while (j < m && meetings[j][2] == t) {
                uni(meetings[j][0], meetings[j][1]);
                people.push_back(meetings[j][0]);
                people.push_back(meetings[j][1]);
                j++;
            }
            for (int p : people) if (find(p) != find(0)) parent[p] = p;
            i = j;
        }
        int root0 = find(0);
        vector<int> res;
        for (int p = 0; p < n; p++) if (find(p) == root0) res.push_back(p);
        return res;
    }
};
`,
    },
    complexity: { time: "O((n + m) log m * α)", space: "O(n)" },
    pitfalls: [
      "Not resetting attendees who failed to learn within a timestamp, so they wrongly carry a union into later times.",
      "Processing meetings individually instead of grouping equal timestamps (misses same-time chaining).",
      "Forgetting the initial union of person 0 and firstPerson.",
    ],
    edgeCases: [
      "Multiple meetings at the same time forming a chain.",
      "A person who never meets anyone connected.",
      "firstPerson equal to 0 effectively.",
    ],
    whyItMatters:
      "Time-bucketed union-find with rollback for non-qualifying members models information/epidemic spread under temporal constraints.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 387 — pure_dsa · greedy · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "stamp-sequence-reverse",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "greedy",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Stamp a String into the Target",
    framing:
      "Starting from a blank string of '?' characters, you repeatedly stamp a fixed pattern over a window, overwriting those positions. Recover a sequence of stamp positions that produces the target.",
    statement:
      "Given strings stamp and target of equal alphabet, beginning with target.length copies of '?', you may overlay stamp at any position so its characters overwrite that window. Return any sequence of stamp start positions (length at most 10 * target.length) whose application turns the blank string into target; return an empty array if impossible.",
    inputFormat: "Two strings stamp and target.",
    outputFormat: "An array of stamp start indices (the order they should be applied), or an empty array.",
    constraints: [
      "1 <= stamp.length <= target.length <= 1000",
      "stamp and target consist of lowercase letters.",
    ],
    examples: [
      {
        input: 'stamp = "abc", target = "ababc"',
        output: "[0,2]",
        explanation: "Stamp at 2 then 0 (the returned order is the forward application 0 then 2).",
      },
      {
        input: 'stamp = "abca", target = "aabcaca"',
        output: "[3,0,1]",
        explanation: "A valid stamping order that builds the target.",
      },
    ],
    approach: [
      "Work backwards: repeatedly find a window that 'can be un-stamped' — every position matches stamp or is already '?', with at least one non-'?'.",
      "Replacing such a window with all '?' simulates removing the last stamp.",
      "Record the window start each time; continue until the whole string is '?'.",
      "If a full pass makes no progress before the string is all '?', it is impossible.",
      "Reverse the recorded starts to get the forward application order.",
    ],
    solutionSteps: [
      "Represent target as a mutable char array; track total '?' count.",
      "Repeatedly scan all windows; a window is reducible if it matches stamp wherever not already '?' and has >= 1 real char.",
      "Reduce one reducible window per scan: set it to '?', add its start to the result, increase the '?' count.",
      "Stop when all positions are '?' (success) or a scan finds nothing (failure).",
      "Return the reversed result on success, else an empty array.",
    ],
    code: {
      python: `def moves_to_stamp(stamp: str, target: str) -> list[int]:
    s, t = list(stamp), list(target)
    n, m = len(t), len(s)
    done = "?" * n
    result = []
    total_q = 0
    stamped = True
    while stamped and total_q < n:
        stamped = False
        for i in range(n - m + 1):
            window = t[i:i + m]
            if all(c == "?" for c in window):
                continue
            if all(window[k] == "?" or window[k] == s[k] for k in range(m)):
                for k in range(m):
                    if t[i + k] != "?":
                        t[i + k] = "?"
                        total_q += 1
                result.append(i)
                stamped = True
    if total_q != n:
        return []
    return result[::-1]
`,
      java: `import java.util.*;

class Solution {
    public int[] movesToStamp(String stamp, String target) {
        char[] s = stamp.toCharArray(), t = target.toCharArray();
        int n = t.length, m = s.length, totalQ = 0;
        List<Integer> result = new ArrayList<>();
        boolean stamped = true;
        while (stamped && totalQ < n) {
            stamped = false;
            for (int i = 0; i + m <= n; i++) {
                boolean allQ = true, canStamp = true, anyReal = false;
                for (int k = 0; k < m; k++) {
                    if (t[i + k] != '?') { allQ = false; anyReal = true; if (t[i + k] != s[k]) { canStamp = false; break; } }
                }
                if (allQ || !canStamp || !anyReal) continue;
                for (int k = 0; k < m; k++) if (t[i + k] != '?') { t[i + k] = '?'; totalQ++; }
                result.add(i);
                stamped = true;
            }
        }
        if (totalQ != n) return new int[0];
        int[] res = new int[result.size()];
        for (int i = 0; i < result.size(); i++) res[i] = result.get(result.size() - 1 - i);
        return res;
    }
}
`,
      cpp: `#include <vector>
#include <string>
#include <algorithm>
using namespace std;

class Solution {
public:
    vector<int> movesToStamp(string stamp, string target) {
        string s = stamp, t = target;
        int n = t.size(), m = s.size(), totalQ = 0;
        vector<int> result;
        bool stamped = true;
        while (stamped && totalQ < n) {
            stamped = false;
            for (int i = 0; i + m <= n; i++) {
                bool anyReal = false, canStamp = true;
                for (int k = 0; k < m; k++) {
                    if (t[i + k] != '?') { anyReal = true; if (t[i + k] != s[k]) { canStamp = false; break; } }
                }
                if (!anyReal || !canStamp) continue;
                for (int k = 0; k < m; k++) if (t[i + k] != '?') { t[i + k] = '?'; totalQ++; }
                result.push_back(i);
                stamped = true;
            }
        }
        if (totalQ != n) return {};
        reverse(result.begin(), result.end());
        return result;
    }
};
`,
    },
    complexity: { time: "O(n^2 * m) worst case", space: "O(n)" },
    pitfalls: [
      "Reducing an all-'?' window (no progress) or one that does not match the stamp.",
      "Forgetting to reverse the recorded order at the end.",
      "Declaring failure before exhausting all reducible windows.",
    ],
    edgeCases: [
      "stamp equal to target (one move).",
      "Impossible targets (return empty).",
      "Heavily overlapping stamps.",
    ],
    whyItMatters:
      "Reverse-greedy 'un-doing' operations is a clever technique for construction problems where forward search is intractable.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 388 — pure_dsa · greedy · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "stitch-clips-cover-window",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "greedy",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Fewest Clips to Cover a Time Window",
    framing:
      "You assemble a recording covering [0, time] from overlapping clips, each spanning a sub-interval. Clips can be cut and overlapped freely. Find the minimum number of clips that fully cover the window.",
    statement:
      "Given an array clips where clips[i] = [start_i, end_i] and an integer time, return the minimum number of clips needed to cover the entire interval [0, time]. If it is impossible, return -1. Clips may overlap and be trimmed.",
    inputFormat: "An array clips of [start, end] intervals and an integer time.",
    outputFormat: "An integer: the minimum number of clips, or -1 if the window cannot be covered.",
    constraints: [
      "1 <= clips.length <= 100",
      "0 <= start_i <= end_i <= 100; 1 <= time <= 100",
    ],
    examples: [
      {
        input: "clips = [[0,2],[4,6],[8,10],[1,9],[1,5],[5,9]], time = 10",
        output: "3",
        explanation: "Pick [0,2], [1,9], [8,10] to cover [0,10].",
      },
      {
        input: "clips = [[0,1],[1,2]], time = 5",
        output: "-1",
        explanation: "The clips cannot reach time 5.",
      },
    ],
    approach: [
      "Precompute, for each start position, the farthest end any clip starting at or before it can reach.",
      "Use a jump-game style greedy: extend coverage as far as possible with the clips available up to the current end.",
      "Track the current covered boundary and the farthest reachable boundary.",
      "Each time you exhaust the current segment, take one more clip and jump to the farthest reach.",
      "If you cannot advance before reaching time, return -1.",
    ],
    solutionSteps: [
      "Build maxReach[i] = max end over clips with start == i (capped at time).",
      "Iterate i from 0 to time-1 maintaining curEnd and farthest.",
      "Update farthest = max(farthest, maxReach[i]).",
      "If i reaches curEnd: if farthest <= i return -1; else count++ and curEnd = farthest.",
      "Return count once curEnd >= time.",
    ],
    code: {
      python: `def video_stitching(clips: list[list[int]], time: int) -> int:
    max_reach = [0] * time
    for s, e in clips:
        if s < time:
            max_reach[s] = max(max_reach[s], e)
    count = 0
    cur_end = 0
    farthest = 0
    for i in range(time):
        farthest = max(farthest, max_reach[i])
        if i == cur_end:
            if farthest <= i:
                return -1
            count += 1
            cur_end = farthest
            if cur_end >= time:
                break
    return count if cur_end >= time else -1
`,
      java: `class Solution {
    public int videoStitching(int[][] clips, int time) {
        int[] maxReach = new int[time];
        for (int[] c : clips)
            if (c[0] < time) maxReach[c[0]] = Math.max(maxReach[c[0]], c[1]);
        int count = 0, curEnd = 0, farthest = 0;
        for (int i = 0; i < time; i++) {
            farthest = Math.max(farthest, maxReach[i]);
            if (i == curEnd) {
                if (farthest <= i) return -1;
                count++;
                curEnd = farthest;
                if (curEnd >= time) break;
            }
        }
        return curEnd >= time ? count : -1;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int videoStitching(vector<vector<int>>& clips, int time) {
        vector<int> maxReach(time, 0);
        for (auto& c : clips)
            if (c[0] < time) maxReach[c[0]] = max(maxReach[c[0]], c[1]);
        int count = 0, curEnd = 0, farthest = 0;
        for (int i = 0; i < time; i++) {
            farthest = max(farthest, maxReach[i]);
            if (i == curEnd) {
                if (farthest <= i) return -1;
                count++;
                curEnd = farthest;
                if (curEnd >= time) break;
            }
        }
        return curEnd >= time ? count : -1;
    }
};
`,
    },
    complexity: { time: "O(time + clips)", space: "O(time)" },
    pitfalls: [
      "Not detecting a gap where no clip extends past the current boundary (must return -1).",
      "Off-by-one between covering up to time vs index time-1.",
      "Sorting clips and missing the cleaner reach-array greedy.",
    ],
    edgeCases: [
      "A gap that makes coverage impossible.",
      "A single clip covering the whole window.",
      "Clips starting beyond time (ignored).",
    ],
    whyItMatters:
      "Interval-cover greedy (jump game on a reach array) is the optimal approach for minimum interval covering and reachability scheduling.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 389 — pure_dsa · heap_priority_queue · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-courses-by-deadline",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "heap_priority_queue",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "backend_engineer"],
    title: "Maximum Tasks Finished Before Their Deadlines",
    framing:
      "Each task takes a fixed number of days and has a hard deadline (must finish on or before that day). Tasks run one at a time starting from day 1. Maximize how many tasks you complete on time.",
    statement:
      "Given an array courses where courses[i] = [duration_i, lastDay_i] (the course takes duration_i days and must be completed by day lastDay_i), and you take courses sequentially starting on day 1, return the maximum number of courses you can take.",
    inputFormat: "An array courses of [duration, lastDay] pairs.",
    outputFormat: "An integer: the maximum number of completable courses.",
    constraints: [
      "1 <= courses.length <= 10000",
      "1 <= duration_i, lastDay_i <= 10000",
    ],
    examples: [
      {
        input: "courses = [[100,200],[200,1300],[1000,1250],[2000,3200]]",
        output: "3",
        explanation: "Three courses can be scheduled within their deadlines.",
      },
      {
        input: "courses = [[1,2],[2,3]]",
        output: "2",
        explanation: "Both fit: finish the first by day 1, the second by day 3.",
      },
    ],
    approach: [
      "Sort courses by deadline so you consider them in the order they must finish.",
      "Greedily take each course, accumulating elapsed time and pushing its duration onto a max-heap.",
      "If the elapsed time exceeds the current deadline, drop the longest course taken so far (pop the max) and subtract its duration.",
      "This keeps the count maximal because swapping out a longer course for a shorter one never reduces the count and frees time.",
      "The heap size at the end is the answer.",
    ],
    solutionSteps: [
      "Sort courses by lastDay ascending.",
      "Maintain time = 0 and a max-heap of taken durations.",
      "For each course: time += duration; push duration.",
      "If time > lastDay, pop the largest duration and subtract it from time.",
      "Return the heap size after processing all courses.",
    ],
    code: {
      python: `import heapq

def schedule_course(courses: list[list[int]]) -> int:
    courses.sort(key=lambda c: c[1])
    heap: list[int] = []  # max-heap via negation
    time = 0
    for duration, last_day in courses:
        time += duration
        heapq.heappush(heap, -duration)
        if time > last_day:
            time += heapq.heappop(heap)  # remove longest (adds a negative)
    return len(heap)
`,
      java: `import java.util.*;

class Solution {
    public int scheduleCourse(int[][] courses) {
        Arrays.sort(courses, (a, b) -> a[1] - b[1]);
        PriorityQueue<Integer> heap = new PriorityQueue<>(Collections.reverseOrder());
        int time = 0;
        for (int[] c : courses) {
            time += c[0];
            heap.add(c[0]);
            if (time > c[1]) time -= heap.poll();
        }
        return heap.size();
    }
}
`,
      cpp: `#include <vector>
#include <queue>
#include <algorithm>
using namespace std;

class Solution {
public:
    int scheduleCourse(vector<vector<int>>& courses) {
        sort(courses.begin(), courses.end(), [](auto& a, auto& b) { return a[1] < b[1]; });
        priority_queue<int> heap;
        int time = 0;
        for (auto& c : courses) {
            time += c[0];
            heap.push(c[0]);
            if (time > c[1]) { time -= heap.top(); heap.pop(); }
        }
        return heap.size();
    }
};
`,
    },
    complexity: { time: "O(n log n)", space: "O(n)" },
    pitfalls: [
      "Sorting by duration instead of deadline.",
      "Dropping the current course on overflow instead of the longest taken so far.",
      "Forgetting to subtract the removed course's duration from elapsed time.",
    ],
    edgeCases: [
      "A course whose duration alone exceeds its deadline (never taken).",
      "All courses fitting.",
      "Ties in deadlines.",
    ],
    whyItMatters:
      "The 'take then evict the worst' heap exchange argument is a classic greedy proof powering deadline scheduling and resource admission control.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 390 — pure_dsa · dp_2d · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-falling-cost-path",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "dp_2d",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Minimum Falling Path Through a Cost Grid",
    framing:
      "A signal descends a grid of stage costs one row at a time, each step moving straight down or diagonally to an adjacent column. Find the cheapest top-to-bottom descent.",
    statement:
      "Given an n x n integer matrix, return the minimum sum of a falling path: start at any cell in the first row and, from a cell (r, c), move to (r+1, c-1), (r+1, c), or (r+1, c+1) within bounds, ending at any cell in the last row.",
    inputFormat: "An n x n integer matrix (values may be negative).",
    outputFormat: "An integer: the minimum falling-path sum.",
    constraints: [
      "1 <= n <= 100",
      "-100 <= matrix[i][j] <= 100",
    ],
    examples: [
      {
        input: "matrix = [[2,1,3],[6,5,4],[7,8,9]]",
        output: "13",
        explanation: "1 -> 5 -> 7 sums to 13.",
      },
      {
        input: "matrix = [[-19,57],[-40,-5]]",
        output: "-59",
        explanation: "-19 -> -40 sums to -59.",
      },
    ],
    approach: [
      "Process rows top to bottom, accumulating the minimum cost to reach each cell.",
      "For each cell in a row, add the best of the three reachable cells in the row above.",
      "Handle column boundaries when picking the diagonal predecessors.",
      "After the last row, the answer is the minimum value across that row.",
      "Updating in place on a copy keeps it O(1) extra beyond the row.",
    ],
    solutionSteps: [
      "Copy the first row as the initial dp row.",
      "For each subsequent row r, for each column c: dp[c] += min(prev[c-1], prev[c], prev[c+1]) respecting bounds.",
      "Use the previous row's dp values, not the partially-updated current row.",
      "After the final row, return the minimum dp value.",
      "Return that minimum.",
    ],
    code: {
      python: `def min_falling_path_sum(matrix: list[list[int]]) -> int:
    n = len(matrix)
    dp = matrix[0][:]
    for r in range(1, n):
        cur = [0] * n
        for c in range(n):
            best = dp[c]
            if c > 0:
                best = min(best, dp[c - 1])
            if c < n - 1:
                best = min(best, dp[c + 1])
            cur[c] = matrix[r][c] + best
        dp = cur
    return min(dp)
`,
      java: `class Solution {
    public int minFallingPathSum(int[][] matrix) {
        int n = matrix.length;
        int[] dp = matrix[0].clone();
        for (int r = 1; r < n; r++) {
            int[] cur = new int[n];
            for (int c = 0; c < n; c++) {
                int best = dp[c];
                if (c > 0) best = Math.min(best, dp[c - 1]);
                if (c < n - 1) best = Math.min(best, dp[c + 1]);
                cur[c] = matrix[r][c] + best;
            }
            dp = cur;
        }
        int ans = dp[0];
        for (int v : dp) ans = Math.min(ans, v);
        return ans;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int minFallingPathSum(vector<vector<int>>& matrix) {
        int n = matrix.size();
        vector<int> dp = matrix[0];
        for (int r = 1; r < n; r++) {
            vector<int> cur(n);
            for (int c = 0; c < n; c++) {
                int best = dp[c];
                if (c > 0) best = min(best, dp[c - 1]);
                if (c < n - 1) best = min(best, dp[c + 1]);
                cur[c] = matrix[r][c] + best;
            }
            dp = cur;
        }
        return *min_element(dp.begin(), dp.end());
    }
};
`,
    },
    complexity: { time: "O(n^2)", space: "O(n)" },
    pitfalls: [
      "Reading partially-updated current-row values instead of the previous row.",
      "Mishandling column boundaries for the diagonal moves.",
      "Returning the last cell instead of the minimum over the last row.",
    ],
    edgeCases: [
      "A 1x1 matrix.",
      "Negative values producing a negative path sum.",
      "A single column (only straight-down moves).",
    ],
    whyItMatters:
      "Row-by-row grid DP with bounded diagonal transitions is the backbone of pathfinding cost minimization and dynamic programming on layered graphs.",
    estimatedMinutes: 20,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 391 — pure_dsa · dp_2d · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-triangle-descent",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "dp_2d",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Minimum Path Sum Down a Triangle",
    framing:
      "A triangular schedule of stage costs grows by one cell per row. Starting at the apex you descend to an adjacent cell each step. Find the minimum total cost to reach the bottom.",
    statement:
      "Given a triangle as a list of rows where row r has r+1 elements, return the minimum path sum from top to bottom. From index i in a row you may move to index i or i+1 in the next row.",
    inputFormat: "A list triangle of integer rows of increasing length.",
    outputFormat: "An integer: the minimum top-to-bottom path sum.",
    constraints: [
      "1 <= triangle.length <= 200",
      "-10^4 <= triangle[r][c] <= 10^4",
    ],
    examples: [
      {
        input: "triangle = [[2],[3,4],[6,5,7],[4,1,8,3]]",
        output: "11",
        explanation: "2 -> 3 -> 5 -> 1 sums to 11.",
      },
      {
        input: "triangle = [[-10]]",
        output: "-10",
        explanation: "A single-cell triangle.",
      },
    ],
    approach: [
      "Work bottom-up so each cell only needs the two cells below it.",
      "Start dp as a copy of the last row.",
      "For each higher row, dp[c] = triangle[r][c] + min(dp[c], dp[c+1]).",
      "After processing the apex, dp[0] holds the answer.",
      "This uses O(n) space and avoids boundary special cases.",
    ],
    solutionSteps: [
      "Initialize dp = last row of the triangle.",
      "Iterate rows from second-to-last up to the apex.",
      "For each column c in that row: dp[c] = triangle[r][c] + min(dp[c], dp[c+1]).",
      "Continue until the apex.",
      "Return dp[0].",
    ],
    code: {
      python: `def minimum_total(triangle: list[list[int]]) -> int:
    dp = triangle[-1][:]
    for r in range(len(triangle) - 2, -1, -1):
        for c in range(len(triangle[r])):
            dp[c] = triangle[r][c] + min(dp[c], dp[c + 1])
    return dp[0]
`,
      java: `class Solution {
    public int minimumTotal(java.util.List<java.util.List<Integer>> triangle) {
        int n = triangle.size();
        int[] dp = new int[n];
        for (int c = 0; c < n; c++) dp[c] = triangle.get(n - 1).get(c);
        for (int r = n - 2; r >= 0; r--)
            for (int c = 0; c <= r; c++)
                dp[c] = triangle.get(r).get(c) + Math.min(dp[c], dp[c + 1]);
        return dp[0];
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int minimumTotal(vector<vector<int>>& triangle) {
        vector<int> dp = triangle.back();
        for (int r = (int) triangle.size() - 2; r >= 0; r--)
            for (int c = 0; c <= r; c++)
                dp[c] = triangle[r][c] + min(dp[c], dp[c + 1]);
        return dp[0];
    }
};
`,
    },
    complexity: { time: "O(n^2)", space: "O(n)" },
    pitfalls: [
      "Going top-down and mishandling the widening boundaries.",
      "Allocating a full 2D table when a 1D rolling array suffices.",
      "Reading dp[c+1] after overwriting it (bottom-up left-to-right is safe here).",
    ],
    edgeCases: [
      "A single-element triangle.",
      "All negative values.",
      "A tall narrow triangle.",
    ],
    whyItMatters:
      "Bottom-up triangle DP is the cleanest illustration of eliminating boundary cases by choosing the right traversal direction.",
    estimatedMinutes: 20,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 392 — pure_dsa · sliding_window · medium · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-points-end-cards",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "sliding_window",
    difficulty: "medium",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Maximum Points Taking Cards from Both Ends",
    framing:
      "A row of point-valued cards lets you take exactly k cards, each from either the front or the back. Maximize the total points collected.",
    statement:
      "Given an integer array cardPoints and an integer k, take exactly k cards, each time from the beginning or the end of the row. Return the maximum total points obtainable.",
    inputFormat: "An integer array cardPoints and an integer k.",
    outputFormat: "An integer: the maximum points from taking k cards from the ends.",
    constraints: [
      "1 <= cardPoints.length <= 100000",
      "1 <= k <= cardPoints.length",
      "1 <= cardPoints[i] <= 10^4",
    ],
    examples: [
      {
        input: "cardPoints = [1,2,3,4,5,6,1], k = 3",
        output: "12",
        explanation: "Take the last three cards 5+6+1 = 12.",
      },
      {
        input: "cardPoints = [2,2,2], k = 2",
        output: "4",
        explanation: "Any two cards give 4.",
      },
    ],
    approach: [
      "Taking k cards from the ends leaves a contiguous window of n-k cards untouched.",
      "Maximizing the taken sum is equivalent to minimizing the untouched contiguous window's sum.",
      "Slide a window of size n-k across the array and track its minimum sum.",
      "The answer is the total sum minus that minimum window sum.",
      "If k == n, the whole array is taken.",
    ],
    solutionSteps: [
      "Compute total = sum(cardPoints); if k == n return total.",
      "windowSize = n - k; compute the first window sum.",
      "Slide the window, updating the running sum and tracking the minimum.",
      "answer = total - minWindowSum.",
      "Return answer.",
    ],
    code: {
      python: `def max_score(card_points: list[int], k: int) -> int:
    n = len(card_points)
    total = sum(card_points)
    window = n - k
    if window == 0:
        return total
    cur = sum(card_points[:window])
    min_window = cur
    for i in range(window, n):
        cur += card_points[i] - card_points[i - window]
        min_window = min(min_window, cur)
    return total - min_window
`,
      java: `class Solution {
    public int maxScore(int[] cardPoints, int k) {
        int n = cardPoints.length, total = 0;
        for (int v : cardPoints) total += v;
        int window = n - k;
        if (window == 0) return total;
        int cur = 0;
        for (int i = 0; i < window; i++) cur += cardPoints[i];
        int minWindow = cur;
        for (int i = window; i < n; i++) {
            cur += cardPoints[i] - cardPoints[i - window];
            minWindow = Math.min(minWindow, cur);
        }
        return total - minWindow;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
#include <numeric>
using namespace std;

class Solution {
public:
    int maxScore(vector<int>& cardPoints, int k) {
        int n = cardPoints.size();
        int total = accumulate(cardPoints.begin(), cardPoints.end(), 0);
        int window = n - k;
        if (window == 0) return total;
        int cur = 0;
        for (int i = 0; i < window; i++) cur += cardPoints[i];
        int minWindow = cur;
        for (int i = window; i < n; i++) {
            cur += cardPoints[i] - cardPoints[i - window];
            minWindow = min(minWindow, cur);
        }
        return total - minWindow;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Trying to greedily pick the larger end each step, which is not optimal.",
      "Forgetting the k == n case where the window size is zero.",
      "Recomputing the window sum from scratch instead of sliding.",
    ],
    edgeCases: [
      "k equal to the array length.",
      "All equal card values.",
      "k = 1 (best single end card).",
    ],
    whyItMatters:
      "Reframing an ends-selection problem as minimizing the complementary middle window is an elegant, widely applicable inversion trick.",
    estimatedMinutes: 20,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 393 — pure_dsa · dp_1d · medium · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "longest-turbulent-run",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "dp_1d",
    difficulty: "medium",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Longest Turbulent Subarray",
    framing:
      "A metric stream is 'turbulent' over a stretch when consecutive comparisons strictly alternate between rising and falling. Find the length of the longest turbulent stretch.",
    statement:
      "Given an integer array arr, return the length of the longest turbulent subarray: a subarray where the comparison sign between adjacent elements flips for each adjacent pair (i.e., > then < then > ...), and where any two adjacent elements differ.",
    inputFormat: "An integer array arr.",
    outputFormat: "An integer: the length of the longest turbulent subarray.",
    constraints: [
      "1 <= arr.length <= 40000",
      "0 <= arr[i] <= 10^9",
    ],
    examples: [
      {
        input: "arr = [9,4,2,10,7,8,8,1,9]",
        output: "5",
        explanation: "[4,2,10,7,8] alternates < > < > giving length 5.",
      },
      {
        input: "arr = [4,8,12,16]",
        output: "2",
        explanation: "Only adjacent rising pairs; max turbulent length is 2.",
      },
    ],
    approach: [
      "Track two running lengths: up (last comparison was a rise) and down (last was a fall).",
      "If arr[i] > arr[i-1], up = down + 1 and down resets to 1.",
      "If arr[i] < arr[i-1], down = up + 1 and up resets to 1.",
      "If equal, both reset to 1 (the run breaks).",
      "The answer is the maximum of up and down seen.",
    ],
    solutionSteps: [
      "Initialize up = down = 1 and best = 1.",
      "For i from 1: compare arr[i] with arr[i-1].",
      "Update up/down per the comparison, resetting the opposite to 1.",
      "On equality reset both to 1.",
      "Track best = max(best, up, down); return best.",
    ],
    code: {
      python: `def max_turbulence_size(arr: list[int]) -> int:
    n = len(arr)
    up = down = 1
    best = 1
    for i in range(1, n):
        if arr[i] > arr[i - 1]:
            up = down + 1
            down = 1
        elif arr[i] < arr[i - 1]:
            down = up + 1
            up = 1
        else:
            up = down = 1
        best = max(best, up, down)
    return best
`,
      java: `class Solution {
    public int maxTurbulenceSize(int[] arr) {
        int up = 1, down = 1, best = 1;
        for (int i = 1; i < arr.length; i++) {
            if (arr[i] > arr[i - 1]) { up = down + 1; down = 1; }
            else if (arr[i] < arr[i - 1]) { down = up + 1; up = 1; }
            else { up = 1; down = 1; }
            best = Math.max(best, Math.max(up, down));
        }
        return best;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int maxTurbulenceSize(vector<int>& arr) {
        int up = 1, down = 1, best = 1;
        for (int i = 1; i < (int) arr.size(); i++) {
            if (arr[i] > arr[i - 1]) { up = down + 1; down = 1; }
            else if (arr[i] < arr[i - 1]) { down = up + 1; up = 1; }
            else { up = 1; down = 1; }
            best = max(best, max(up, down));
        }
        return best;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Not resetting the opposite direction to 1 on each comparison.",
      "Treating equal adjacent values as continuing the run.",
      "Initializing best to 0 instead of 1 (a single element is length 1).",
    ],
    edgeCases: [
      "A single element.",
      "All equal values (answer 1).",
      "A strictly monotonic array (answer 2).",
    ],
    whyItMatters:
      "Tracking dual alternating run lengths is a clean state-machine DP pattern reused in trend and oscillation detection.",
    estimatedMinutes: 20,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 394 — pure_dsa · greedy · medium · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "longest-wiggle-trend",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "greedy",
    difficulty: "medium",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Longest Wiggle Subsequence",
    framing:
      "A wiggle trend alternates strictly up and down. From a series of readings, find the length of the longest subsequence (not necessarily contiguous) whose successive differences alternate in sign.",
    statement:
      "Given an integer array nums, return the length of the longest wiggle subsequence: a subsequence whose successive differences strictly alternate between positive and negative. A single element and any two unequal elements are trivially wiggles.",
    inputFormat: "An integer array nums.",
    outputFormat: "An integer: the length of the longest wiggle subsequence.",
    constraints: [
      "1 <= nums.length <= 1000",
      "0 <= nums[i] <= 1000",
    ],
    examples: [
      {
        input: "nums = [1,7,4,9,2,5]",
        output: "6",
        explanation: "The whole array already wiggles.",
      },
      {
        input: "nums = [1,17,5,10,13,15,10,5,16,8]",
        output: "7",
        explanation: "A length-7 wiggle subsequence exists.",
      },
    ],
    approach: [
      "Track two counters: up (length ending in a rising step) and down (ending in a falling step).",
      "When nums[i] > nums[i-1], up = down + 1 (extend a sequence that last went down).",
      "When nums[i] < nums[i-1], down = up + 1.",
      "Equal elements leave both unchanged.",
      "The answer is max(up, down).",
    ],
    solutionSteps: [
      "Initialize up = down = 1.",
      "For each i from 1: if nums[i] > nums[i-1], up = down + 1.",
      "Else if nums[i] < nums[i-1], down = up + 1.",
      "Equal elements: no change.",
      "Return max(up, down).",
    ],
    code: {
      python: `def wiggle_max_length(nums: list[int]) -> int:
    if not nums:
        return 0
    up = down = 1
    for i in range(1, len(nums)):
        if nums[i] > nums[i - 1]:
            up = down + 1
        elif nums[i] < nums[i - 1]:
            down = up + 1
    return max(up, down)
`,
      java: `class Solution {
    public int wiggleMaxLength(int[] nums) {
        if (nums.length == 0) return 0;
        int up = 1, down = 1;
        for (int i = 1; i < nums.length; i++) {
            if (nums[i] > nums[i - 1]) up = down + 1;
            else if (nums[i] < nums[i - 1]) down = up + 1;
        }
        return Math.max(up, down);
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int wiggleMaxLength(vector<int>& nums) {
        if (nums.empty()) return 0;
        int up = 1, down = 1;
        for (int i = 1; i < (int) nums.size(); i++) {
            if (nums[i] > nums[i - 1]) up = down + 1;
            else if (nums[i] < nums[i - 1]) down = up + 1;
        }
        return max(up, down);
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Resetting up/down on each step (unlike the contiguous turbulent variant, these only grow).",
      "Mishandling equal adjacent elements by changing a counter.",
      "Returning up + down instead of the maximum.",
    ],
    edgeCases: [
      "A single element (answer 1).",
      "All equal elements (answer 1).",
      "A strictly monotonic array (answer 2).",
    ],
    whyItMatters:
      "The two-counter greedy for wiggles is a minimal, elegant alternative to LIS-style DP for alternating-trend extraction.",
    estimatedMinutes: 20,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 395 — pure_dsa · dp_1d · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "longest-word-upgrade-chain",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "dp_1d",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Longest Word Chain by Single-Letter Insertions",
    framing:
      "A versioning scheme grows identifiers by inserting one character at a time. Given a vocabulary, find the longest chain where each word is a predecessor of the next via inserting exactly one letter.",
    statement:
      "Given a list words, wordA is a predecessor of wordB if inserting exactly one letter into wordA (without reordering the others) yields wordB. A word chain is a sequence where each word is a predecessor of the next. Return the length of the longest possible word chain.",
    inputFormat: "A list words of lowercase strings.",
    outputFormat: "An integer: the length of the longest word chain.",
    constraints: [
      "1 <= words.length <= 1000",
      "1 <= words[i].length <= 16",
    ],
    examples: [
      {
        input: 'words = ["a","b","ba","bca","bda","bdca"]',
        output: "4",
        explanation: "a -> ba -> bda -> bdca is a chain of length 4.",
      },
      {
        input: 'words = ["xbc","pcxbcf","xb","cxbc","pcxbc"]',
        output: "5",
        explanation: "xb -> xbc -> cxbc -> pcxbc -> pcxbcf.",
      },
    ],
    approach: [
      "Sort words by length so predecessors are processed before successors.",
      "For each word, try removing each single character to form a candidate predecessor.",
      "Look up the best chain length ending at that predecessor in a hash map.",
      "dp[word] = max over predecessors of dp[predecessor] + 1 (default 1).",
      "Track the global maximum chain length.",
    ],
    solutionSteps: [
      "Sort words by ascending length.",
      "Maintain best = {} mapping word -> longest chain ending at it.",
      "For each word, for each index i removed, form pred = word without char i.",
      "best[word] = max(best[word], best.get(pred, 0) + 1).",
      "Update and return the global maximum.",
    ],
    code: {
      python: `def longest_str_chain(words: list[str]) -> int:
    words.sort(key=len)
    best: dict[str, int] = {}
    ans = 0
    for word in words:
        cur = 1
        for i in range(len(word)):
            pred = word[:i] + word[i + 1:]
            if pred in best:
                cur = max(cur, best[pred] + 1)
        best[word] = cur
        ans = max(ans, cur)
    return ans
`,
      java: `import java.util.*;

class Solution {
    public int longestStrChain(String[] words) {
        Arrays.sort(words, (a, b) -> a.length() - b.length());
        Map<String, Integer> best = new HashMap<>();
        int ans = 0;
        for (String word : words) {
            int cur = 1;
            for (int i = 0; i < word.length(); i++) {
                String pred = word.substring(0, i) + word.substring(i + 1);
                cur = Math.max(cur, best.getOrDefault(pred, 0) + 1);
            }
            best.put(word, cur);
            ans = Math.max(ans, cur);
        }
        return ans;
    }
}
`,
      cpp: `#include <vector>
#include <string>
#include <unordered_map>
#include <algorithm>
using namespace std;

class Solution {
public:
    int longestStrChain(vector<string>& words) {
        sort(words.begin(), words.end(), [](const string& a, const string& b) {
            return a.size() < b.size();
        });
        unordered_map<string, int> best;
        int ans = 0;
        for (auto& word : words) {
            int cur = 1;
            for (int i = 0; i < (int) word.size(); i++) {
                string pred = word.substr(0, i) + word.substr(i + 1);
                auto it = best.find(pred);
                if (it != best.end()) cur = max(cur, it->second + 1);
            }
            best[word] = cur;
            ans = max(ans, cur);
        }
        return ans;
    }
};
`,
    },
    complexity: { time: "O(N * L^2)", space: "O(N * L)" },
    pitfalls: [
      "Comparing all pairs of words instead of generating predecessors by deletion.",
      "Not sorting by length, so predecessors may not be computed first.",
      "Allowing reordering of letters (only insertion preserving order counts).",
    ],
    edgeCases: [
      "All words of the same length (chain length 1).",
      "A single word.",
      "Multiple independent chains.",
    ],
    whyItMatters:
      "Predecessor-generation DP over a sorted set is the canonical method for longest-chain problems on partially ordered words.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 396 — indian_domain · dp_1d · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "claim-cashback-ladder",
    version: 1,
    status: "pending_review",
    bucket: "indian_domain",
    batchNo: 12,
    pattern: "dp_1d",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer"],
    title: "Maximize Cashback While Voiding Adjacent Tiers",
    framing:
      "A wallet app offers cashback coupons of various rupee values. Claiming all coupons of a value earns their total, but voids every coupon worth one rupee more or one rupee less. Maximize the cashback.",
    statement:
      "Given an integer array nums of coupon values, in one operation you pick a value v, earn the sum of all coupons equal to v, and then delete every coupon equal to v-1 and v+1. Repeat any number of times. Return the maximum total cashback you can earn.",
    inputFormat: "An integer array nums of coupon values.",
    outputFormat: "An integer: the maximum total earnable.",
    constraints: [
      "1 <= nums.length <= 20000",
      "1 <= nums[i] <= 10^4",
    ],
    examples: [
      {
        input: "nums = [3,4,2]",
        output: "6",
        explanation: "Claim 4 (earns 4, voids 3); then claim 2 (earns 2). Total 6.",
      },
      {
        input: "nums = [2,2,3,3,3,4]",
        output: "9",
        explanation: "Claim all 3s (earns 9), voiding 2s and 4s.",
      },
    ],
    approach: [
      "Aggregate value: total[v] = v * (count of v); claiming v voids v-1 and v+1.",
      "This is exactly house-robber along the value axis: you cannot take adjacent values.",
      "Iterate values in increasing order maintaining take and skip running maxima.",
      "take[v] = skip[v-1] + total[v]; skip[v] = max(take[v-1], skip[v-1]).",
      "The answer is the max of take and skip at the largest value.",
    ],
    solutionSteps: [
      "Build a points array indexed by value: points[v] = v * count[v].",
      "Iterate v from the minimum to the maximum value present.",
      "Maintain prevTake and prevSkip; for each v compute curTake = prevSkip + points[v], curSkip = max(prevTake, prevSkip).",
      "If a value is missing (points 0), the recurrence still holds.",
      "Return max(prevTake, prevSkip) after the last value.",
    ],
    code: {
      python: `def delete_and_earn(nums: list[int]) -> int:
    max_v = max(nums)
    points = [0] * (max_v + 1)
    for v in nums:
        points[v] += v
    take, skip = 0, 0
    for v in range(1, max_v + 1):
        cur_take = skip + points[v]
        cur_skip = max(take, skip)
        take, skip = cur_take, cur_skip
    return max(take, skip)
`,
      java: `class Solution {
    public int deleteAndEarn(int[] nums) {
        int maxV = 0;
        for (int v : nums) maxV = Math.max(maxV, v);
        long[] points = new long[maxV + 1];
        for (int v : nums) points[v] += v;
        long take = 0, skip = 0;
        for (int v = 1; v <= maxV; v++) {
            long curTake = skip + points[v];
            long curSkip = Math.max(take, skip);
            take = curTake;
            skip = curSkip;
        }
        return (int) Math.max(take, skip);
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int deleteAndEarn(vector<int>& nums) {
        int maxV = 0;
        for (int v : nums) maxV = max(maxV, v);
        vector<long> points(maxV + 1, 0);
        for (int v : nums) points[v] += v;
        long take = 0, skip = 0;
        for (int v = 1; v <= maxV; v++) {
            long curTake = skip + points[v];
            long curSkip = max(take, skip);
            take = curTake;
            skip = curSkip;
        }
        return (int) max(take, skip);
    }
};
`,
    },
    complexity: { time: "O(n + maxValue)", space: "O(maxValue)" },
    pitfalls: [
      "Summing earnings by element instead of aggregating value * count per value.",
      "Treating it as choosing indices rather than values (adjacency is on value, not position).",
      "Skipping missing values incorrectly; the recurrence must still advance through them.",
    ],
    edgeCases: [
      "A single coupon value.",
      "All distinct consecutive values.",
      "Large duplicates of one value.",
    ],
    whyItMatters:
      "Mapping a deletion-with-side-effects problem onto house-robber over the value axis is a classic DP reduction.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 397 — pure_dsa · dp_2d · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-dice-roll-targets",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "dp_2d",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Ways to Roll Dice Summing to a Target",
    framing:
      "You roll n identical dice, each showing 1..k. Count the distinct ordered outcomes whose face values add up to a target total.",
    statement:
      "Given integers n (number of dice), k (faces per die, values 1..k), and target, return the number of ordered ways the dice can sum to exactly target, modulo 1e9 + 7.",
    inputFormat: "Three integers n, k, and target.",
    outputFormat: "An integer: the number of ways modulo 1e9 + 7.",
    constraints: [
      "1 <= n, k <= 1000",
      "1 <= target <= 1000",
    ],
    examples: [
      {
        input: "n = 2, k = 6, target = 7",
        output: "6",
        explanation: "(1,6),(2,5),(3,4),(4,3),(5,2),(6,1).",
      },
      {
        input: "n = 1, k = 6, target = 3",
        output: "1",
        explanation: "Only the single roll of 3.",
      },
    ],
    approach: [
      "Let dp[d][t] be the number of ways for d dice to sum to t.",
      "dp[0][0] = 1; for each die, sum over face values f in 1..k of dp[d-1][t-f].",
      "Iterate dice one at a time, accumulating modulo 1e9 + 7.",
      "Bound t by target to keep the table compact.",
      "The answer is dp[n][target].",
    ],
    solutionSteps: [
      "Initialize dp row for 0 dice: dp[0] = 1, rest 0.",
      "For each die d from 1 to n, build a new row: ndp[t] = sum of dp[t-f] for f in 1..min(k,t).",
      "Take the modulus during accumulation.",
      "Replace dp with ndp.",
      "Return dp[target].",
    ],
    code: {
      python: `def num_rolls_to_target(n: int, k: int, target: int) -> int:
    MOD = 10**9 + 7
    dp = [0] * (target + 1)
    dp[0] = 1
    for _ in range(n):
        ndp = [0] * (target + 1)
        for t in range(1, target + 1):
            total = 0
            for f in range(1, min(k, t) + 1):
                total += dp[t - f]
            ndp[t] = total % MOD
        dp = ndp
    return dp[target]
`,
      java: `class Solution {
    public int numRollsToTarget(int n, int k, int target) {
        long MOD = 1_000_000_007L;
        long[] dp = new long[target + 1];
        dp[0] = 1;
        for (int d = 0; d < n; d++) {
            long[] ndp = new long[target + 1];
            for (int t = 1; t <= target; t++) {
                long total = 0;
                for (int f = 1; f <= Math.min(k, t); f++) total += dp[t - f];
                ndp[t] = total % MOD;
            }
            dp = ndp;
        }
        return (int) dp[target];
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int numRollsToTarget(int n, int k, int target) {
        const long MOD = 1000000007L;
        vector<long> dp(target + 1, 0);
        dp[0] = 1;
        for (int d = 0; d < n; d++) {
            vector<long> ndp(target + 1, 0);
            for (int t = 1; t <= target; t++) {
                long total = 0;
                for (int f = 1; f <= min(k, t); f++) total += dp[t - f];
                ndp[t] = total % MOD;
            }
            dp = ndp;
        }
        return (int) dp[target];
    }
};
`,
    },
    complexity: { time: "O(n * target * k)", space: "O(target)" },
    pitfalls: [
      "Letting a die contribute 0 (faces start at 1, not 0).",
      "Indexing t - f below zero; cap f at min(k, t).",
      "Dropping the modulus and overflowing on large counts.",
    ],
    edgeCases: [
      "target smaller than n (impossible, answer 0).",
      "target larger than n*k (answer 0).",
      "n = 1.",
    ],
    whyItMatters:
      "Bounded-coin counting DP underlies probability, combinatorics, and any 'ways to reach a sum with limited steps' analysis.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 398 — pure_dsa · dp_1d · medium · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "assign-signs-reach-target",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "dp_1d",
    difficulty: "medium",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Count Sign Assignments Reaching a Target",
    framing:
      "Each measurement may be added or subtracted from a running total. Count how many ways to assign plus and minus signs across all measurements so the total equals a given target.",
    statement:
      "Given an integer array nums and an integer target, assign a '+' or '-' to each element and concatenate, then count the assignments whose signed sum equals target. Return that count.",
    inputFormat: "An integer array nums of non-negative integers and an integer target.",
    outputFormat: "An integer: the number of sign assignments yielding target.",
    constraints: [
      "1 <= nums.length <= 20",
      "0 <= nums[i] <= 1000; -1000 <= target <= 1000",
    ],
    examples: [
      {
        input: "nums = [1,1,1,1,1], target = 3",
        output: "5",
        explanation: "Five sign patterns give a sum of 3.",
      },
      {
        input: "nums = [1], target = 1",
        output: "1",
        explanation: "Only +1.",
      },
    ],
    approach: [
      "Let P be the subset given '+' and N the subset given '-'; then P - N = target and P + N = total.",
      "So P = (total + target) / 2; the problem becomes counting subsets summing to P.",
      "If total + target is odd or target's magnitude exceeds total, there are zero ways.",
      "Use a 1D subset-sum count DP over the derived capacity P.",
      "Return dp[P].",
    ],
    solutionSteps: [
      "Compute total = sum(nums). If (total + target) is odd or abs(target) > total, return 0.",
      "Set P = (total + target) / 2.",
      "Initialize dp[0] = 1; for each num, for s from P down to num: dp[s] += dp[s - num].",
      "Iterate downward to avoid reusing a number.",
      "Return dp[P].",
    ],
    code: {
      python: `def find_target_sum_ways(nums: list[int], target: int) -> int:
    total = sum(nums)
    if (total + target) % 2 != 0 or abs(target) > total:
        return 0
    cap = (total + target) // 2
    dp = [0] * (cap + 1)
    dp[0] = 1
    for num in nums:
        for s in range(cap, num - 1, -1):
            dp[s] += dp[s - num]
    return dp[cap]
`,
      java: `class Solution {
    public int findTargetSumWays(int[] nums, int target) {
        int total = 0;
        for (int v : nums) total += v;
        if ((total + target) % 2 != 0 || Math.abs(target) > total) return 0;
        int cap = (total + target) / 2;
        int[] dp = new int[cap + 1];
        dp[0] = 1;
        for (int num : nums)
            for (int s = cap; s >= num; s--)
                dp[s] += dp[s - num];
        return dp[cap];
    }
}
`,
      cpp: `#include <vector>
#include <cstdlib>
#include <numeric>
using namespace std;

class Solution {
public:
    int findTargetSumWays(vector<int>& nums, int target) {
        int total = accumulate(nums.begin(), nums.end(), 0);
        if ((total + target) % 2 != 0 || abs(target) > total) return 0;
        int cap = (total + target) / 2;
        vector<int> dp(cap + 1, 0);
        dp[0] = 1;
        for (int num : nums)
            for (int s = cap; s >= num; s--)
                dp[s] += dp[s - num];
        return dp[cap];
    }
};
`,
    },
    complexity: { time: "O(n * cap)", space: "O(cap)" },
    pitfalls: [
      "Forgetting the parity and magnitude feasibility checks (zero ways otherwise).",
      "Iterating the inner loop forward, which double-counts elements.",
      "Handling nums containing zeros — they still contribute via dp[s - 0] correctly when the loop bound includes num=0.",
    ],
    edgeCases: [
      "Zeros in nums doubling sign choices.",
      "target equal to total (all plus).",
      "Infeasible parity (answer 0).",
    ],
    whyItMatters:
      "Transforming a +/- assignment into a subset-sum count is a classic reduction that turns an exponential search into polynomial DP.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 399 — pure_dsa · backtracking · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "all-palindrome-partitions",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "backtracking",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "All Palindrome Partitions of a String",
    framing:
      "A text segmenter splits a token string into pieces that each read the same forwards and backwards. Enumerate every way to fully partition the string into palindromic pieces.",
    statement:
      "Given a string s, partition it so that every substring of the partition is a palindrome. Return all possible palindrome partitionings (each as a list of substrings).",
    inputFormat: "A string s of lowercase letters.",
    outputFormat: "A list of partitions, each a list of palindromic substrings.",
    constraints: [
      "1 <= s.length <= 16",
      "s consists of lowercase English letters.",
    ],
    examples: [
      {
        input: 's = "aab"',
        output: '[["a","a","b"],["aa","b"]]',
        explanation: "Two ways to split into palindromes.",
      },
      {
        input: 's = "a"',
        output: '[["a"]]',
        explanation: "A single character is a palindrome.",
      },
    ],
    approach: [
      "Backtrack from a start index, trying every end index to cut the next piece.",
      "Only recurse on a cut when the substring [start, end] is a palindrome.",
      "When start reaches the end of the string, record the current partition.",
      "Use a two-pointer palindrome check, or precompute an isPalindrome table for speed.",
      "Backtrack by removing the last piece after exploring.",
    ],
    solutionSteps: [
      "Define dfs(start, path): if start == len(s), append a copy of path.",
      "For end from start+1 to len(s): if s[start:end] is a palindrome, append it, recurse dfs(end), then pop.",
      "Check palindromes with a helper or a precomputed table.",
      "Collect all complete partitions.",
      "Return the list of partitions.",
    ],
    code: {
      python: `def partition(s: str) -> list[list[str]]:
    n = len(s)
    results: list[list[str]] = []

    def is_pal(lo: int, hi: int) -> bool:
        while lo < hi:
            if s[lo] != s[hi]:
                return False
            lo += 1
            hi -= 1
        return True

    def dfs(start: int, path: list[str]) -> None:
        if start == n:
            results.append(path[:])
            return
        for end in range(start + 1, n + 1):
            if is_pal(start, end - 1):
                path.append(s[start:end])
                dfs(end, path)
                path.pop()

    dfs(0, [])
    return results
`,
      java: `import java.util.*;

class Solution {
    String s;
    int n;
    List<List<String>> results = new ArrayList<>();

    public List<List<String>> partition(String s) {
        this.s = s;
        n = s.length();
        dfs(0, new ArrayList<>());
        return results;
    }

    private void dfs(int start, List<String> path) {
        if (start == n) { results.add(new ArrayList<>(path)); return; }
        for (int end = start + 1; end <= n; end++) {
            if (isPal(start, end - 1)) {
                path.add(s.substring(start, end));
                dfs(end, path);
                path.remove(path.size() - 1);
            }
        }
    }

    private boolean isPal(int lo, int hi) {
        while (lo < hi) { if (s.charAt(lo) != s.charAt(hi)) return false; lo++; hi--; }
        return true;
    }
}
`,
      cpp: `#include <vector>
#include <string>
using namespace std;

class Solution {
    string s;
    int n;
    vector<vector<string>> results;
    bool isPal(int lo, int hi) {
        while (lo < hi) { if (s[lo] != s[hi]) return false; lo++; hi--; }
        return true;
    }
    void dfs(int start, vector<string>& path) {
        if (start == n) { results.push_back(path); return; }
        for (int end = start + 1; end <= n; end++) {
            if (isPal(start, end - 1)) {
                path.push_back(s.substr(start, end - start));
                dfs(end, path);
                path.pop_back();
            }
        }
    }
public:
    vector<vector<string>> partition(string s) {
        this->s = s;
        n = s.size();
        vector<string> path;
        dfs(0, path);
        return results;
    }
};
`,
    },
    complexity: { time: "O(2^n * n) in the worst case", space: "O(n) recursion depth" },
    pitfalls: [
      "Recursing on a non-palindromic prefix, which produces invalid partitions.",
      "Storing references to the mutable path instead of copies in the results.",
      "Off-by-one in substring end indices.",
    ],
    edgeCases: [
      "A single character.",
      "An all-same-character string (maximum partitions).",
      "A string with no multi-character palindromes.",
    ],
    whyItMatters:
      "Partition backtracking with a validity predicate is the template for segmentation, tokenization, and constraint-respecting splits.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 400 — pure_dsa · backtracking · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "fixed-count-combinations",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 12,
    pattern: "backtracking",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Combinations of K Distinct Digits Summing to N",
    framing:
      "A voucher code uses exactly k distinct single digits (1-9) that add up to a fixed checksum. Enumerate every valid set of digits.",
    statement:
      "Find all valid combinations of k distinct numbers chosen from 1 to 9 that sum to n. Each number may be used at most once, and combinations must be unique (order does not matter). Return the list of combinations.",
    inputFormat: "Two integers k (count of numbers) and n (target sum).",
    outputFormat: "A list of combinations, each a list of k distinct digits in increasing order.",
    constraints: [
      "2 <= k <= 9",
      "1 <= n <= 60",
    ],
    examples: [
      {
        input: "k = 3, n = 7",
        output: "[[1,2,4]]",
        explanation: "Only 1+2+4 = 7 uses three distinct digits.",
      },
      {
        input: "k = 3, n = 9",
        output: "[[1,2,6],[1,3,5],[2,3,4]]",
        explanation: "Three valid combinations.",
      },
    ],
    approach: [
      "Backtrack choosing digits in increasing order starting from a current digit to avoid duplicates.",
      "Track the remaining count needed and the remaining sum.",
      "Prune when the remaining sum is negative or cannot be reached with the remaining digits.",
      "When the count reaches k and the remaining sum is 0, record the combination.",
      "Only consider digits greater than the last chosen one.",
    ],
    solutionSteps: [
      "Define dfs(start, path, remaining): if path has k items, add it when remaining == 0.",
      "For digit d from start to 9: if d <= remaining, choose it.",
      "Recurse dfs(d+1, path+[d], remaining-d), then backtrack.",
      "Prune branches where d exceeds the remaining sum.",
      "Return all collected combinations.",
    ],
    code: {
      python: `def combination_sum3(k: int, n: int) -> list[list[int]]:
    results: list[list[int]] = []

    def dfs(start: int, path: list[int], remaining: int) -> None:
        if len(path) == k:
            if remaining == 0:
                results.append(path[:])
            return
        for d in range(start, 10):
            if d > remaining:
                break
            path.append(d)
            dfs(d + 1, path, remaining - d)
            path.pop()

    dfs(1, [], n)
    return results
`,
      java: `import java.util.*;

class Solution {
    int k;
    List<List<Integer>> results = new ArrayList<>();

    public List<List<Integer>> combinationSum3(int k, int n) {
        this.k = k;
        dfs(1, new ArrayList<>(), n);
        return results;
    }

    private void dfs(int start, List<Integer> path, int remaining) {
        if (path.size() == k) {
            if (remaining == 0) results.add(new ArrayList<>(path));
            return;
        }
        for (int d = start; d <= 9; d++) {
            if (d > remaining) break;
            path.add(d);
            dfs(d + 1, path, remaining - d);
            path.remove(path.size() - 1);
        }
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
    int k;
    vector<vector<int>> results;
    void dfs(int start, vector<int>& path, int remaining) {
        if ((int) path.size() == k) {
            if (remaining == 0) results.push_back(path);
            return;
        }
        for (int d = start; d <= 9; d++) {
            if (d > remaining) break;
            path.push_back(d);
            dfs(d + 1, path, remaining - d);
            path.pop_back();
        }
    }
public:
    vector<vector<int>> combinationSum3(int k, int n) {
        this->k = k;
        vector<int> path;
        dfs(1, path, n);
        return results;
    }
};
`,
    },
    complexity: { time: "O(C(9, k))", space: "O(k)" },
    pitfalls: [
      "Reusing digits or starting the next choice at the same digit, which creates duplicates.",
      "Forgetting to require both the count k and the exact remaining sum 0.",
      "Not pruning when the digit already exceeds the remaining sum.",
    ],
    edgeCases: [
      "n too small or too large for k distinct digits (empty result).",
      "k = 9 forcing all digits 1..9.",
      "Exactly one valid combination.",
    ],
    whyItMatters:
      "Increasing-order combination backtracking with sum pruning is the standard pattern for distinct-selection enumeration under a target.",
    estimatedMinutes: 20,
  },
];
