// DSA v2 — Batch 13 (questions 401–450).
//
// 50 questions, 401–450. Difficulty mix: 39 hard + 11 medium.
// Bucket mix: 43 pure_dsa + 5 ai_applied + 2 indian_domain.
// All status pending_review. No duplicate canonical problems across the bank.
//
// Canonical coverage (distinct from batches 1–12):
//   401 Network Delay Time · 402 Path with Maximum Probability · 403 Find the
//   City With Smallest Number of Neighbors at a Threshold Distance · 404 Number
//   of Ways to Arrive at Destination · 405 Second Minimum Time to Reach
//   Destination · 406 Is Graph Bipartite? · 407 Find Eventual Safe States ·
//   408 Evaluate Division · 409 Minimum Height Trees · 410 Redundant Connection
//   II · 411 Most Stones Removed with Same Row or Column · 412 Satisfiability of
//   Equality Equations · 413 Smallest String With Swaps · 414 Rank Transform of
//   a Matrix · 415 Number of Operations to Make Network Connected · 416 As Far
//   from Land as Possible · 417 01 Matrix · 418 Minimum Number of Days to
//   Disconnect Island · 419 Shortest Path with Alternating Colors · 420
//   Reachable Nodes In Subdivided Graph · 421 Lowest Common Ancestor of a Binary
//   Tree · 422 Construct Binary Tree from Preorder and Inorder Traversal · 423
//   Path Sum III · 424 House Robber III · 425 All Nodes Distance K in Binary
//   Tree · 426 Delete Nodes And Return Forest · 427 Kth Smallest Element in a
//   BST · 428 Longest Univalue Path · 429 Maximum Difference Between Node and
//   Ancestor · 430 Longest Increasing Subsequence · 431 Number of Longest
//   Increasing Subsequence · 432 Best Time to Buy and Sell Stock with Cooldown ·
//   433 Maximum Sum Circular Subarray · 434 House Robber II · 435 Integer Break ·
//   436 Painting the Walls · 437 Best Team With No Conflicts · 438 Filling
//   Bookcase Shelves · 439 Minimum Cost For Tickets · 440 Uncrossed Lines · 441
//   Count Vowels Permutation · 442 Knight Probability in Chessboard · 443 Student
//   Attendance Record II · 444 Max Dot Product of Two Subsequences · 445 Dice
//   Roll Simulation · 446 Coin Change · 447 Car Pooling · 448 Predict the Winner ·
//   449 Stone Game II · 450 Minimum ASCII Delete Sum for Two Strings.

import type { DsaV2Question } from "../types";

export const BATCH_013: readonly DsaV2Question[] = [
  // ──────────────────────────────────────────────────────────────────────
  // 401 — pure_dsa · graphs · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "signal-propagation-delay",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "platform_engineer"],
    title: "Time for a Broadcast to Reach Every Node",
    framing:
      "A control-plane node broadcasts a config change across a network of services. Each directed link has a known propagation latency. Find how long until every service has received the update, or report that some service is unreachable.",
    statement:
      "There are n services labelled 1..n. Given times where times[i] = [u, v, w] means a signal from u reaches v after w milliseconds, and a starting service k, return the minimum time for all n services to receive the signal. If not all services can be reached, return -1.",
    inputFormat: "A list times of [u, v, w] directed edges, an integer n, and a source k.",
    outputFormat: "An integer: the time for the last service to receive the signal, or -1.",
    constraints: [
      "1 <= k <= n <= 100",
      "1 <= times.length <= 6000",
      "1 <= w <= 100; all (u, v) pairs are unique.",
    ],
    examples: [
      {
        input: "times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2",
        output: "2",
        explanation: "From 2: node 1 at t=1, node 3 at t=1, node 4 at t=2. Max is 2.",
      },
      {
        input: "times = [[1,2,1]], n = 2, k = 2",
        output: "-1",
        explanation: "Node 1 is unreachable from node 2.",
      },
    ],
    approach: [
      "This is single-source shortest paths with non-negative weights: run Dijkstra from k.",
      "Maintain a min-heap keyed by tentative distance; pop the closest unsettled node and relax its edges.",
      "The answer is the maximum settled distance over all nodes.",
      "If any node is never settled, return -1.",
    ],
    solutionSteps: [
      "Build an adjacency list of (neighbor, weight).",
      "Initialize dist[k] = 0 and push (0, k) onto the heap.",
      "Pop (d, u); skip if d exceeds the recorded dist[u]; otherwise relax every edge u->v.",
      "After the heap empties, take the maximum dist; return -1 if any node is still infinite.",
    ],
    code: {
      python: `import heapq

def network_delay_time(times: list[list[int]], n: int, k: int) -> int:
    adj = [[] for _ in range(n + 1)]
    for u, v, w in times:
        adj[u].append((v, w))
    dist = [float("inf")] * (n + 1)
    dist[k] = 0
    heap = [(0, k)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue
        for v, w in adj[u]:
            if d + w < dist[v]:
                dist[v] = d + w
                heapq.heappush(heap, (dist[v], v))
    ans = max(dist[1:])
    return ans if ans < float("inf") else -1
`,
      java: `import java.util.*;

class Solution {
    public int networkDelayTime(int[][] times, int n, int k) {
        List<int[]>[] adj = new List[n + 1];
        for (int i = 1; i <= n; i++) adj[i] = new ArrayList<>();
        for (int[] t : times) adj[t[0]].add(new int[]{t[1], t[2]});
        int[] dist = new int[n + 1];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[k] = 0;
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
        pq.add(new int[]{0, k});
        while (!pq.isEmpty()) {
            int[] top = pq.poll();
            int d = top[0], u = top[1];
            if (d > dist[u]) continue;
            for (int[] e : adj[u]) {
                if (d + e[1] < dist[e[0]]) {
                    dist[e[0]] = d + e[1];
                    pq.add(new int[]{dist[e[0]], e[0]});
                }
            }
        }
        int ans = 0;
        for (int i = 1; i <= n; i++) {
            if (dist[i] == Integer.MAX_VALUE) return -1;
            ans = Math.max(ans, dist[i]);
        }
        return ans;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
#include <climits>
using namespace std;

class Solution {
public:
    int networkDelayTime(vector<vector<int>>& times, int n, int k) {
        vector<vector<pair<int,int>>> adj(n + 1);
        for (auto& t : times) adj[t[0]].push_back({t[1], t[2]});
        vector<int> dist(n + 1, INT_MAX);
        dist[k] = 0;
        priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;
        pq.push({0, k});
        while (!pq.empty()) {
            auto [d, u] = pq.top(); pq.pop();
            if (d > dist[u]) continue;
            for (auto& [v, w] : adj[u]) {
                if (d + w < dist[v]) {
                    dist[v] = d + w;
                    pq.push({dist[v], v});
                }
            }
        }
        int ans = 0;
        for (int i = 1; i <= n; i++) {
            if (dist[i] == INT_MAX) return -1;
            ans = max(ans, dist[i]);
        }
        return ans;
    }
};
`,
    },
    complexity: { time: "O(E log V)", space: "O(V + E)" },
    pitfalls: [
      "Returning the sum of distances instead of the maximum.",
      "Forgetting the stale-entry guard (d > dist[u]) and re-processing settled nodes.",
      "Using 0-indexed arrays while the nodes are 1-indexed.",
    ],
    edgeCases: [
      "A node unreachable from the source -> -1.",
      "A single node (n = 1) -> 0.",
      "Multiple shortest routes of equal latency.",
    ],
    whyItMatters:
      "Dijkstra over a latency-weighted topology is the canonical model for config or cache propagation deadlines in distributed systems.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 402 — pure_dsa · graphs · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-reliability-route",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "graphs",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "platform_engineer"],
    title: "Most Reliable Path Between Two Services",
    framing:
      "Each network link succeeds with a known probability. A request routed along a path succeeds only if every link on it succeeds. Find the path from a start service to an end service that maximizes the overall success probability.",
    statement:
      "Given n nodes and an undirected edge list edges where edge i connects edges[i] = [a, b] with success probability succProb[i], return the maximum probability of success to travel from start to end. If there is no path, return 0.",
    inputFormat: "An integer n, edges as [a, b] pairs, a parallel array succProb, and integers start and end.",
    outputFormat: "A floating-point number: the maximum path success probability.",
    constraints: [
      "2 <= n <= 10^4",
      "0 <= edges.length <= 2*10^4",
      "0 <= succProb[i] <= 1; at most one edge per pair.",
    ],
    examples: [
      {
        input: "n = 3, edges = [[0,1],[1,2],[0,2]], succProb = [0.5,0.5,0.2], start = 0, end = 2",
        output: "0.25000",
        explanation: "Path 0->1->2 gives 0.5*0.5 = 0.25, better than the direct 0.2.",
      },
      {
        input: "n = 3, edges = [[0,1]], succProb = [0.5], start = 0, end = 2",
        output: "0.00000",
        explanation: "No path connects 0 to 2.",
      },
    ],
    approach: [
      "Maximizing a product of probabilities is a longest-path variant solvable with a Dijkstra-style max-heap.",
      "Greedily settle the node reachable with the highest probability so far.",
      "Relax edges by multiplying the current probability by the edge probability.",
      "Because probabilities are <= 1, products never increase, so the greedy settle order is valid.",
    ],
    solutionSteps: [
      "Build an adjacency list of (neighbor, probability).",
      "Track prob[node], the best probability reaching it; set prob[start] = 1.",
      "Use a max-heap ordered by probability; pop the best node and relax its edges.",
      "Return prob[end] when end is settled, else 0.",
    ],
    code: {
      python: `import heapq

def max_probability(n: int, edges: list[list[int]], succ_prob: list[float], start: int, end: int) -> float:
    adj = [[] for _ in range(n)]
    for (a, b), p in zip(edges, succ_prob):
        adj[a].append((b, p))
        adj[b].append((a, p))
    prob = [0.0] * n
    prob[start] = 1.0
    heap = [(-1.0, start)]
    while heap:
        neg_p, u = heapq.heappop(heap)
        p = -neg_p
        if u == end:
            return p
        if p < prob[u]:
            continue
        for v, edge_p in adj[u]:
            np = p * edge_p
            if np > prob[v]:
                prob[v] = np
                heapq.heappush(heap, (-np, v))
    return 0.0
`,
      java: `import java.util.*;

class Solution {
    public double maxProbability(int n, int[][] edges, double[] succProb, int start, int end) {
        List<double[]>[] adj = new List[n];
        for (int i = 0; i < n; i++) adj[i] = new ArrayList<>();
        for (int i = 0; i < edges.length; i++) {
            adj[edges[i][0]].add(new double[]{edges[i][1], succProb[i]});
            adj[edges[i][1]].add(new double[]{edges[i][0], succProb[i]});
        }
        double[] prob = new double[n];
        prob[start] = 1.0;
        PriorityQueue<double[]> pq = new PriorityQueue<>((a, b) -> Double.compare(b[1], a[1]));
        pq.add(new double[]{start, 1.0});
        while (!pq.isEmpty()) {
            double[] top = pq.poll();
            int u = (int) top[0];
            double p = top[1];
            if (u == end) return p;
            if (p < prob[u]) continue;
            for (double[] e : adj[u]) {
                int v = (int) e[0];
                double np = p * e[1];
                if (np > prob[v]) {
                    prob[v] = np;
                    pq.add(new double[]{v, np});
                }
            }
        }
        return 0.0;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
using namespace std;

class Solution {
public:
    double maxProbability(int n, vector<vector<int>>& edges, vector<double>& succProb, int start, int end) {
        vector<vector<pair<int,double>>> adj(n);
        for (int i = 0; i < (int)edges.size(); i++) {
            adj[edges[i][0]].push_back({edges[i][1], succProb[i]});
            adj[edges[i][1]].push_back({edges[i][0], succProb[i]});
        }
        vector<double> prob(n, 0.0);
        prob[start] = 1.0;
        priority_queue<pair<double,int>> pq;
        pq.push({1.0, start});
        while (!pq.empty()) {
            auto [p, u] = pq.top(); pq.pop();
            if (u == end) return p;
            if (p < prob[u]) continue;
            for (auto& [v, ep] : adj[u]) {
                double np = p * ep;
                if (np > prob[v]) {
                    prob[v] = np;
                    pq.push({np, v});
                }
            }
        }
        return 0.0;
    }
};
`,
    },
    complexity: { time: "O(E log V)", space: "O(V + E)" },
    pitfalls: [
      "Treating it as a shortest-path (min) problem instead of a max-product problem.",
      "Adding probabilities instead of multiplying along the path.",
      "Forgetting the graph is undirected — push both directions.",
    ],
    edgeCases: [
      "No path from start to end -> 0.",
      "An edge with probability 0 effectively breaks that route.",
      "start equals end -> 1.0.",
    ],
    whyItMatters:
      "Reliability-weighted routing turns a product-maximization into a Dijkstra variant — a pattern used in fault-tolerant request routing.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 403 — pure_dsa · graphs · medium · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "least-reachable-hub",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "graphs",
    difficulty: "medium",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "data_engineer"],
    title: "Region With the Fewest Reachable Peers Under a Latency Budget",
    framing:
      "Data centers are connected by weighted links. Within a fixed latency budget, find the data center that can reach the fewest others; on a tie, prefer the one with the largest id (it is the natural failover candidate).",
    statement:
      "There are n cities numbered 0..n-1 connected by weighted bidirectional edges. Given a distanceThreshold, return the city with the smallest number of other cities reachable within distanceThreshold (sum of edge weights). If several cities tie, return the one with the greatest index.",
    inputFormat: "An integer n, edges as [from, to, weight], and an integer distanceThreshold.",
    outputFormat: "An integer: the chosen city id.",
    constraints: [
      "2 <= n <= 100",
      "1 <= edges.length <= n*(n-1)/2",
      "1 <= weight, distanceThreshold <= 10^4; no duplicate edges or self-loops.",
    ],
    examples: [
      {
        input: "n = 4, edges = [[0,1,3],[1,2,1],[1,3,4],[2,3,1]], distanceThreshold = 4",
        output: "3",
        explanation: "City 3 reaches only {1 via 2, 2} within 4; ties resolve to the largest id.",
      },
      {
        input: "n = 5, edges = [[0,1,2],[0,4,8],[1,2,3],[1,4,2],[2,3,1],[3,4,1]], distanceThreshold = 2",
        output: "0",
        explanation: "Cities 0 and others reach at most one peer; 0 is chosen here per the worked thresholds.",
      },
    ],
    approach: [
      "n is small (<= 100), so compute all-pairs shortest paths with Floyd-Warshall in O(n^3).",
      "Initialize the distance matrix from edges, with 0 on the diagonal and infinity elsewhere.",
      "Relax through every intermediate k: dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]).",
      "For each city count peers with dist <= threshold; pick the minimum count, breaking ties toward the larger id by iterating upward and using <=.",
    ],
    solutionSteps: [
      "Build an n x n matrix seeded with edge weights (both directions).",
      "Run the triple Floyd-Warshall loop to fill shortest paths.",
      "For each i, count j != i with dist[i][j] <= distanceThreshold.",
      "Scan i ascending, keeping the city whose count is <= the best so far (favoring larger ids).",
    ],
    code: {
      python: `def find_the_city(n: int, edges: list[list[int]], threshold: int) -> int:
    INF = float("inf")
    dist = [[INF] * n for _ in range(n)]
    for i in range(n):
        dist[i][i] = 0
    for u, v, w in edges:
        dist[u][v] = w
        dist[v][u] = w
    for k in range(n):
        for i in range(n):
            if dist[i][k] == INF:
                continue
            for j in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
    best_city, best_count = 0, n + 1
    for i in range(n):
        count = sum(1 for j in range(n) if j != i and dist[i][j] <= threshold)
        if count <= best_count:
            best_count = count
            best_city = i
    return best_city
`,
      java: `class Solution {
    public int findTheCity(int n, int[][] edges, int distanceThreshold) {
        int INF = 1000000000;
        int[][] dist = new int[n][n];
        for (int[] row : dist) java.util.Arrays.fill(row, INF);
        for (int i = 0; i < n; i++) dist[i][i] = 0;
        for (int[] e : edges) { dist[e[0]][e[1]] = e[2]; dist[e[1]][e[0]] = e[2]; }
        for (int k = 0; k < n; k++)
            for (int i = 0; i < n; i++)
                for (int j = 0; j < n; j++)
                    if (dist[i][k] + dist[k][j] < dist[i][j])
                        dist[i][j] = dist[i][k] + dist[k][j];
        int bestCity = 0, bestCount = n + 1;
        for (int i = 0; i < n; i++) {
            int count = 0;
            for (int j = 0; j < n; j++)
                if (j != i && dist[i][j] <= distanceThreshold) count++;
            if (count <= bestCount) { bestCount = count; bestCity = i; }
        }
        return bestCity;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int findTheCity(int n, vector<vector<int>>& edges, int distanceThreshold) {
        const int INF = 1000000000;
        vector<vector<int>> dist(n, vector<int>(n, INF));
        for (int i = 0; i < n; i++) dist[i][i] = 0;
        for (auto& e : edges) { dist[e[0]][e[1]] = e[2]; dist[e[1]][e[0]] = e[2]; }
        for (int k = 0; k < n; k++)
            for (int i = 0; i < n; i++)
                for (int j = 0; j < n; j++)
                    if (dist[i][k] + dist[k][j] < dist[i][j])
                        dist[i][j] = dist[i][k] + dist[k][j];
        int bestCity = 0, bestCount = n + 1;
        for (int i = 0; i < n; i++) {
            int count = 0;
            for (int j = 0; j < n; j++)
                if (j != i && dist[i][j] <= distanceThreshold) count++;
            if (count <= bestCount) { bestCount = count; bestCity = i; }
        }
        return bestCity;
    }
};
`,
    },
    complexity: { time: "O(n^3)", space: "O(n^2)" },
    pitfalls: [
      "Adding through an unreachable intermediate and overflowing infinity — guard or use a finite large sentinel.",
      "Breaking ties toward the smaller id; the spec wants the larger.",
      "Counting the city itself among reachable peers.",
    ],
    edgeCases: [
      "A disconnected graph (some pairs stay infinite).",
      "A threshold smaller than every edge (each city reaches none).",
      "Dense graphs near the maximum edge count.",
    ],
    whyItMatters:
      "All-pairs shortest paths under a budget models reachability/blast-radius questions in capacity planning where n is small enough for the cubic solution.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 404 — pure_dsa · graphs · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-shortest-commute-paths",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer"],
    title: "Number of Distinct Fastest Routes",
    framing:
      "Across a weighted road network between intersection 0 and intersection n-1, count how many distinct routes achieve the minimum travel time. Two routes differ if their edge sequences differ.",
    statement:
      "You are given n intersections (0..n-1) and a list of bidirectional roads where roads[i] = [u, v, time]. Return the number of ways to travel from intersection 0 to intersection n-1 in the shortest possible time, modulo 1e9+7.",
    inputFormat: "An integer n and roads as [u, v, time] triples.",
    outputFormat: "An integer: the count of shortest paths, modulo 1e9+7.",
    constraints: [
      "1 <= n <= 200",
      "n - 1 <= roads.length <= n*(n-1)/2",
      "1 <= time <= 10^9; exactly one road per pair; the graph is connected.",
    ],
    examples: [
      {
        input: "n = 7, roads = [[0,6,7],[0,1,2],[1,2,3],[1,3,3],[6,3,3],[3,5,1],[6,5,1],[2,5,1],[0,4,5],[4,6,2]]",
        output: "4",
        explanation: "Four different routes all reach node 6 in the minimum time of 7.",
      },
      {
        input: "n = 2, roads = [[1,0,10]]",
        output: "1",
        explanation: "The only route takes time 10.",
      },
    ],
    approach: [
      "Run Dijkstra from node 0 while carrying a path-count array alongside distances.",
      "When relaxing u->v strictly improves dist[v], set ways[v] = ways[u].",
      "When u->v ties the current best (dist[u] + w == dist[v]), add ways[u] to ways[v] under the modulus.",
      "The answer is ways[n-1].",
    ],
    solutionSteps: [
      "Build an adjacency list and arrays dist (infinity) and ways (0); set dist[0] = 0, ways[0] = 1.",
      "Pop the closest node u from a min-heap, skipping stale entries.",
      "For each edge u->v: if dist[u] + w < dist[v], update dist and set ways[v] = ways[u]; if equal, ways[v] = (ways[v] + ways[u]) % MOD.",
      "Push improved nodes; return ways[n-1].",
    ],
    code: {
      python: `import heapq

def count_paths(n: int, roads: list[list[int]]) -> int:
    MOD = 10**9 + 7
    adj = [[] for _ in range(n)]
    for u, v, w in roads:
        adj[u].append((v, w))
        adj[v].append((u, w))
    dist = [float("inf")] * n
    ways = [0] * n
    dist[0] = 0
    ways[0] = 1
    heap = [(0, 0)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue
        for v, w in adj[u]:
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                ways[v] = ways[u]
                heapq.heappush(heap, (nd, v))
            elif nd == dist[v]:
                ways[v] = (ways[v] + ways[u]) % MOD
    return ways[n - 1] % MOD
`,
      java: `import java.util.*;

class Solution {
    public int countPaths(int n, int[][] roads) {
        long MOD = 1000000007L;
        List<long[]>[] adj = new List[n];
        for (int i = 0; i < n; i++) adj[i] = new ArrayList<>();
        for (int[] r : roads) {
            adj[r[0]].add(new long[]{r[1], r[2]});
            adj[r[1]].add(new long[]{r[0], r[2]});
        }
        long[] dist = new long[n];
        long[] ways = new long[n];
        Arrays.fill(dist, Long.MAX_VALUE);
        dist[0] = 0; ways[0] = 1;
        PriorityQueue<long[]> pq = new PriorityQueue<>((a, b) -> Long.compare(a[0], b[0]));
        pq.add(new long[]{0, 0});
        while (!pq.isEmpty()) {
            long[] top = pq.poll();
            long d = top[0]; int u = (int) top[1];
            if (d > dist[u]) continue;
            for (long[] e : adj[u]) {
                int v = (int) e[0];
                long nd = d + e[1];
                if (nd < dist[v]) {
                    dist[v] = nd;
                    ways[v] = ways[u];
                    pq.add(new long[]{nd, v});
                } else if (nd == dist[v]) {
                    ways[v] = (ways[v] + ways[u]) % MOD;
                }
            }
        }
        return (int) (ways[n - 1] % MOD);
    }
}
`,
      cpp: `#include <vector>
#include <queue>
#include <climits>
using namespace std;

class Solution {
public:
    int countPaths(int n, vector<vector<int>>& roads) {
        const long long MOD = 1000000007LL;
        vector<vector<pair<int,long long>>> adj(n);
        for (auto& r : roads) {
            adj[r[0]].push_back({r[1], r[2]});
            adj[r[1]].push_back({r[0], r[2]});
        }
        vector<long long> dist(n, LLONG_MAX), ways(n, 0);
        dist[0] = 0; ways[0] = 1;
        priority_queue<pair<long long,int>, vector<pair<long long,int>>, greater<>> pq;
        pq.push({0, 0});
        while (!pq.empty()) {
            auto [d, u] = pq.top(); pq.pop();
            if (d > dist[u]) continue;
            for (auto& [v, w] : adj[u]) {
                long long nd = d + w;
                if (nd < dist[v]) {
                    dist[v] = nd;
                    ways[v] = ways[u];
                    pq.push({nd, v});
                } else if (nd == dist[v]) {
                    ways[v] = (ways[v] + ways[u]) % MOD;
                }
            }
        }
        return (int)(ways[n - 1] % MOD);
    }
};
`,
    },
    complexity: { time: "O(E log V)", space: "O(V + E)" },
    pitfalls: [
      "Forgetting to reset ways[v] (not add) when a strictly shorter path is found.",
      "Overflowing distances — edge times up to 1e9 require 64-bit sums.",
      "Applying the modulus to distances; only the counts are reduced.",
    ],
    edgeCases: [
      "n = 1 -> exactly 1 trivial path.",
      "Multiple equal-length routes converging at one node.",
      "Large times that overflow 32-bit accumulation.",
    ],
    whyItMatters:
      "Counting shortest paths layered on Dijkstra appears in reliability and load-spreading analyses where ties must be enumerated, not just detected.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 405 — pure_dsa · graphs · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "second-fastest-arrival",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "platform_engineer"],
    title: "Second-Minimum Arrival Time With Periodic Signals",
    framing:
      "A courier traverses an unweighted city graph where every edge takes the same time, but periodic traffic signals force waiting. Find the strictly second-smallest time to travel from node 1 to node n.",
    statement:
      "A city has n nodes (1..n) connected by bidirectional edges; each edge takes time minutes to cross. Every change signals are green for change minutes then red for change minutes, synchronized at all nodes from t=0. You cannot leave a node while its signal is red (you wait until green). Return the second minimum time (strictly greater than the minimum) to go from node 1 to node n.",
    inputFormat: "Integers n, time, change, and an edge list edges.",
    outputFormat: "An integer: the strictly second-minimum arrival time.",
    constraints: [
      "2 <= n <= 10^4",
      "n - 1 <= edges.length <= min(2*10^4, n*(n-1)/2)",
      "1 <= time, change <= 10^3; the graph is connected with no self-loops or multi-edges.",
    ],
    examples: [
      {
        input: "n = 5, edges = [[1,2],[1,3],[1,4],[3,4],[4,5]], time = 3, change = 5",
        output: "13",
        explanation: "The minimum is 6; the strict second minimum, accounting for one red-signal wait, is 13.",
      },
      {
        input: "n = 2, edges = [[1,2]], time = 3, change = 2",
        output: "11",
        explanation: "Minimum 3; to get a strictly larger time you must loop back and forth, arriving at 11.",
      },
    ],
    approach: [
      "Because edges are unit cost in steps, BFS expands nodes in order of increasing step count.",
      "Track the two smallest distinct step counts reaching each node (dist1, dist2).",
      "A node is worth revisiting only to record a second, strictly larger step count.",
      "Convert the step count to clock time by simulating signal waits per edge.",
    ],
    solutionSteps: [
      "BFS from node 1 storing dist1[v] and dist2[v] (smallest and second-smallest step counts).",
      "When moving to v with step d+1: accept it if it sets a new dist1 or a strictly larger dist2.",
      "Stop once dist2[n] is finalized (the second-smallest step count to n).",
      "Replay those steps: at step k the elapsed time t may fall in a red window (t/change odd) — if so wait until the next green; then add time.",
    ],
    code: {
      python: `from collections import deque

def second_minimum(n: int, edges: list[list[int]], time: int, change: int) -> int:
    adj = [[] for _ in range(n + 1)]
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
    dist1 = [-1] * (n + 1)
    dist2 = [-1] * (n + 1)
    dist1[1] = 0
    q = deque([(1, 0)])
    while q:
        node, d = q.popleft()
        nd = d + 1
        for nei in adj[node]:
            if dist1[nei] == -1:
                dist1[nei] = nd
                q.append((nei, nd))
            elif dist2[nei] == -1 and dist1[nei] != nd:
                dist2[nei] = nd
                q.append((nei, nd))
    steps = dist2[n]
    t = 0
    for _ in range(steps):
        if (t // change) % 2 == 1:
            t = (t // change + 1) * change
        t += time
    return t
`,
      java: `import java.util.*;

class Solution {
    public int secondMinimum(int n, int[][] edges, int time, int change) {
        List<Integer>[] adj = new List[n + 1];
        for (int i = 1; i <= n; i++) adj[i] = new ArrayList<>();
        for (int[] e : edges) { adj[e[0]].add(e[1]); adj[e[1]].add(e[0]); }
        int[] dist1 = new int[n + 1], dist2 = new int[n + 1];
        Arrays.fill(dist1, -1);
        Arrays.fill(dist2, -1);
        dist1[1] = 0;
        Deque<int[]> q = new ArrayDeque<>();
        q.add(new int[]{1, 0});
        while (!q.isEmpty()) {
            int[] cur = q.poll();
            int node = cur[0], nd = cur[1] + 1;
            for (int nei : adj[node]) {
                if (dist1[nei] == -1) { dist1[nei] = nd; q.add(new int[]{nei, nd}); }
                else if (dist2[nei] == -1 && dist1[nei] != nd) { dist2[nei] = nd; q.add(new int[]{nei, nd}); }
            }
        }
        int steps = dist2[n], t = 0;
        for (int i = 0; i < steps; i++) {
            if ((t / change) % 2 == 1) t = (t / change + 1) * change;
            t += time;
        }
        return t;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
using namespace std;

class Solution {
public:
    int secondMinimum(int n, vector<vector<int>>& edges, int time, int change) {
        vector<vector<int>> adj(n + 1);
        for (auto& e : edges) { adj[e[0]].push_back(e[1]); adj[e[1]].push_back(e[0]); }
        vector<int> dist1(n + 1, -1), dist2(n + 1, -1);
        dist1[1] = 0;
        queue<pair<int,int>> q;
        q.push({1, 0});
        while (!q.empty()) {
            auto [node, d] = q.front(); q.pop();
            int nd = d + 1;
            for (int nei : adj[node]) {
                if (dist1[nei] == -1) { dist1[nei] = nd; q.push({nei, nd}); }
                else if (dist2[nei] == -1 && dist1[nei] != nd) { dist2[nei] = nd; q.push({nei, nd}); }
            }
        }
        int steps = dist2[n], t = 0;
        for (int i = 0; i < steps; i++) {
            if ((t / change) % 2 == 1) t = (t / change + 1) * change;
            t += time;
        }
        return t;
    }
};
`,
    },
    complexity: { time: "O(V + E)", space: "O(V + E)" },
    pitfalls: [
      "Allowing dist2 to equal dist1 — the second minimum must be strictly larger.",
      "Computing signal waits on step counts instead of on accumulated clock time.",
      "Stopping BFS at the first time node n is seen rather than the second.",
    ],
    edgeCases: [
      "A two-node graph forces backtracking to manufacture a second time.",
      "change much larger than time (long waits).",
      "Dense graphs where many step counts tie.",
    ],
    whyItMatters:
      "Tracking the two smallest BFS layers, then overlaying a time model, mirrors SLA analyses that need both the best and the next-best path latency.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 406 — pure_dsa · graphs · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "two-cohort-partition-check",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "graphs",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Can the Conflict Graph Be Split Into Two Cohorts",
    framing:
      "Each edge marks two accounts that must be kept in different experiment cohorts. Decide whether everyone can be assigned to exactly one of two cohorts so that no conflicting pair shares a cohort.",
    statement:
      "Given an undirected graph with n nodes (0..n-1) as an adjacency list graph, return true if the graph is bipartite — its nodes can be 2-colored so that every edge connects nodes of different colors — and false otherwise.",
    inputFormat: "An adjacency list graph where graph[u] lists u's neighbors.",
    outputFormat: "A boolean: whether the graph is bipartite.",
    constraints: [
      "1 <= n <= 100",
      "0 <= graph[u].length < n",
      "The graph may be disconnected and has no self-loops or parallel edges.",
    ],
    examples: [
      {
        input: "graph = [[1,2,3],[0,2],[0,1,3],[0,2]]",
        output: "false",
        explanation: "Nodes 1 and 2 are adjacent yet both must differ from 0, forcing a conflict.",
      },
      {
        input: "graph = [[1,3],[0,2],[1,3],[0,2]]",
        output: "true",
        explanation: "Color {0,2} one cohort and {1,3} the other.",
      },
    ],
    approach: [
      "Attempt a 2-coloring with BFS or DFS from every uncolored node (to cover all components).",
      "Color a start node 0; color each neighbor with the opposite color.",
      "If a neighbor already carries the same color as the current node, the graph is not bipartite.",
      "If all components color cleanly, return true.",
    ],
    solutionSteps: [
      "Keep a color array initialized to -1 (uncolored).",
      "For each uncolored node, BFS: assign it color 0 and enqueue.",
      "Pop u; for each neighbor v, if uncolored set color[v] = 1 - color[u] and enqueue, else if color[v] == color[u] return false.",
      "Return true after all nodes are colored.",
    ],
    code: {
      python: `from collections import deque

def is_bipartite(graph: list[list[int]]) -> bool:
    n = len(graph)
    color = [-1] * n
    for start in range(n):
        if color[start] != -1:
            continue
        color[start] = 0
        q = deque([start])
        while q:
            u = q.popleft()
            for v in graph[u]:
                if color[v] == -1:
                    color[v] = 1 - color[u]
                    q.append(v)
                elif color[v] == color[u]:
                    return False
    return True
`,
      java: `import java.util.*;

class Solution {
    public boolean isBipartite(int[][] graph) {
        int n = graph.length;
        int[] color = new int[n];
        Arrays.fill(color, -1);
        for (int start = 0; start < n; start++) {
            if (color[start] != -1) continue;
            color[start] = 0;
            Deque<Integer> q = new ArrayDeque<>();
            q.add(start);
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int v : graph[u]) {
                    if (color[v] == -1) { color[v] = 1 - color[u]; q.add(v); }
                    else if (color[v] == color[u]) return false;
                }
            }
        }
        return true;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
using namespace std;

class Solution {
public:
    bool isBipartite(vector<vector<int>>& graph) {
        int n = graph.size();
        vector<int> color(n, -1);
        for (int start = 0; start < n; start++) {
            if (color[start] != -1) continue;
            color[start] = 0;
            queue<int> q;
            q.push(start);
            while (!q.empty()) {
                int u = q.front(); q.pop();
                for (int v : graph[u]) {
                    if (color[v] == -1) { color[v] = 1 - color[u]; q.push(v); }
                    else if (color[v] == color[u]) return false;
                }
            }
        }
        return true;
    }
};
`,
    },
    complexity: { time: "O(V + E)", space: "O(V)" },
    pitfalls: [
      "Only checking the component containing node 0 and missing disconnected parts.",
      "Marking a node visited without recording its color, losing the conflict check.",
      "Assuming connectivity — always loop over every start node.",
    ],
    edgeCases: [
      "A graph with no edges (trivially bipartite).",
      "An odd-length cycle (never bipartite).",
      "Several disconnected components, some bipartite and some not.",
    ],
    whyItMatters:
      "Two-coloring is the textbook test for conflict-free partitioning — cohort splits, register interference, and mutual-exclusion scheduling all reduce to it.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 407 — pure_dsa · graphs · medium · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "safe-terminal-stages",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "graphs",
    difficulty: "medium",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "backend_engineer"],
    title: "Pipeline Stages That Always Terminate",
    framing:
      "In a directed pipeline graph, a stage is safe if every path leaving it eventually ends at a terminal stage (no outgoing edges) rather than looping forever. List all safe stages.",
    statement:
      "Given a directed graph of n nodes (0..n-1) as graph where graph[i] lists i's out-neighbors, a node is safe if every walk starting there reaches a terminal node. Return all safe nodes in ascending order.",
    inputFormat: "An adjacency list graph of out-edges.",
    outputFormat: "A sorted list of safe node ids.",
    constraints: [
      "1 <= n <= 10^4",
      "0 <= sum(graph[i].length) <= 4*10^4",
      "The graph may contain cycles and self-loops.",
    ],
    examples: [
      {
        input: "graph = [[1,2],[2,3],[5],[0],[5],[],[]]",
        output: "[2,4,5,6]",
        explanation: "Nodes 5 and 6 are terminal; 2 and 4 only reach terminals; 0,1,3 sit on a cycle.",
      },
      {
        input: "graph = [[],[0,2,3,4],[3],[4],[]]",
        output: "[0,1,2,3,4]",
        explanation: "There is no cycle, so every node is safe.",
      },
    ],
    approach: [
      "A node is unsafe exactly when it can reach a cycle; reverse the perspective with three-color DFS.",
      "Mark nodes white (unvisited), gray (in the current DFS stack), black (proven safe).",
      "If DFS reaches a gray node, a cycle exists and the path is unsafe.",
      "Only nodes whose every successor is black become black themselves.",
    ],
    solutionSteps: [
      "Initialize all colors to white (0).",
      "DFS each node: paint it gray (1); for each neighbor, if gray return unsafe, if white recurse and bail on failure.",
      "If all neighbors are safe, paint the node black (2) and report safe.",
      "Collect every black node in ascending order.",
    ],
    code: {
      python: `import sys

def eventual_safe_nodes(graph: list[list[int]]) -> list[int]:
    sys.setrecursionlimit(20000)
    n = len(graph)
    color = [0] * n  # 0 white, 1 gray, 2 black

    def dfs(u: int) -> bool:
        if color[u] != 0:
            return color[u] == 2
        color[u] = 1
        for v in graph[u]:
            if not dfs(v):
                return False
        color[u] = 2
        return True

    return [u for u in range(n) if dfs(u)]
`,
      java: `import java.util.*;

class Solution {
    public List<Integer> eventualSafeNodes(int[][] graph) {
        int n = graph.length;
        int[] color = new int[n];
        List<Integer> ans = new ArrayList<>();
        for (int i = 0; i < n; i++) if (dfs(i, graph, color)) ans.add(i);
        return ans;
    }
    private boolean dfs(int u, int[][] graph, int[] color) {
        if (color[u] != 0) return color[u] == 2;
        color[u] = 1;
        for (int v : graph[u]) if (!dfs(v, graph, color)) return false;
        color[u] = 2;
        return true;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
    bool dfs(int u, vector<vector<int>>& g, vector<int>& color) {
        if (color[u] != 0) return color[u] == 2;
        color[u] = 1;
        for (int v : g[u]) if (!dfs(v, g, color)) return false;
        color[u] = 2;
        return true;
    }
public:
    vector<int> eventualSafeNodes(vector<vector<int>>& graph) {
        int n = graph.size();
        vector<int> color(n, 0), ans;
        for (int i = 0; i < n; i++) if (dfs(i, graph, color)) ans.push_back(i);
        return ans;
    }
};
`,
    },
    complexity: { time: "O(V + E)", space: "O(V)" },
    pitfalls: [
      "Treating any visited node as safe; only black (fully verified) nodes are safe.",
      "Not distinguishing gray from black, so cycles go undetected.",
      "Stack overflow on deep chains without an iterative or raised recursion limit.",
    ],
    edgeCases: [
      "A self-loop makes that node unsafe.",
      "A fully acyclic graph (all nodes safe).",
      "A single terminal node.",
    ],
    whyItMatters:
      "Three-color DFS for cycle detection underpins deadlock analysis and 'does this workflow always terminate' checks in orchestration engines.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 408 — pure_dsa · graphs · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "conversion-rate-queries",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "graphs",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer"],
    title: "Resolve Unit-Conversion Queries From Known Ratios",
    framing:
      "A service knows some pairwise conversion ratios between units (a/b). Answer queries asking for x/y by chaining known ratios; return -1 when no chain connects the two units.",
    statement:
      "You are given equations as pairs [a, b] with a parallel array values where values[i] = a / b. For each query [c, d], return c / d derived from the known ratios, or -1.0 if it cannot be determined (including when a unit never appears).",
    inputFormat: "A list equations of [a, b] string pairs, a values array, and a list queries of [c, d] string pairs.",
    outputFormat: "An array of doubles, one answer per query.",
    constraints: [
      "1 <= equations.length, queries.length <= 100",
      "values[i] > 0",
      "Unit names are short non-empty strings.",
    ],
    examples: [
      {
        input: 'equations = [["a","b"],["b","c"]], values = [2.0,3.0], queries = [["a","c"],["b","a"],["a","e"],["x","x"]]',
        output: "[6.0, 0.5, -1.0, -1.0]",
        explanation: "a/c = 2*3 = 6; b/a = 1/2; e is unknown; x never appears so x/x is -1.",
      },
      {
        input: 'equations = [["a","b"]], values = [0.5], queries = [["a","b"],["b","a"],["a","a"]]',
        output: "[0.5, 2.0, 1.0]",
        explanation: "Direct ratio, its inverse, and the trivial self-ratio.",
      },
    ],
    approach: [
      "Model units as nodes and a known ratio a/b = w as edges a->b (weight w) and b->a (weight 1/w).",
      "Each query is a weighted reachability: multiply edge weights along any path from c to d.",
      "DFS or BFS from c, accumulating the product; stop when d is reached.",
      "Return -1 if either endpoint is unknown or unreachable.",
    ],
    solutionSteps: [
      "Build a weighted adjacency map from the equations.",
      "For each query [c, d]: if c or d is absent, answer -1.",
      "DFS from c carrying the running product; on reaching d return it.",
      "If the search exhausts without reaching d, answer -1.",
    ],
    code: {
      python: `def calc_equation(equations, values, queries):
    graph = {}
    for (a, b), w in zip(equations, values):
        graph.setdefault(a, {})[b] = w
        graph.setdefault(b, {})[a] = 1.0 / w

    def dfs(src, dst, seen):
        if src == dst:
            return 1.0
        seen.add(src)
        for nei, w in graph[src].items():
            if nei not in seen:
                res = dfs(nei, dst, seen)
                if res != -1.0:
                    return w * res
        return -1.0

    out = []
    for c, d in queries:
        if c not in graph or d not in graph:
            out.append(-1.0)
        else:
            out.append(dfs(c, d, set()))
    return out
`,
      java: `import java.util.*;

class Solution {
    public double[] calcEquation(List<List<String>> equations, double[] values, List<List<String>> queries) {
        Map<String, Map<String, Double>> graph = new HashMap<>();
        for (int i = 0; i < values.length; i++) {
            String a = equations.get(i).get(0), b = equations.get(i).get(1);
            graph.computeIfAbsent(a, k -> new HashMap<>()).put(b, values[i]);
            graph.computeIfAbsent(b, k -> new HashMap<>()).put(a, 1.0 / values[i]);
        }
        double[] ans = new double[queries.size()];
        for (int i = 0; i < queries.size(); i++) {
            String c = queries.get(i).get(0), d = queries.get(i).get(1);
            if (!graph.containsKey(c) || !graph.containsKey(d)) ans[i] = -1.0;
            else ans[i] = dfs(c, d, graph, new HashSet<>());
        }
        return ans;
    }
    private double dfs(String src, String dst, Map<String, Map<String, Double>> g, Set<String> seen) {
        if (src.equals(dst)) return 1.0;
        seen.add(src);
        for (Map.Entry<String, Double> e : g.get(src).entrySet()) {
            if (!seen.contains(e.getKey())) {
                double res = dfs(e.getKey(), dst, g, seen);
                if (res != -1.0) return e.getValue() * res;
            }
        }
        return -1.0;
    }
}
`,
      cpp: `#include <vector>
#include <string>
#include <unordered_map>
#include <unordered_set>
using namespace std;

class Solution {
    double dfs(const string& src, const string& dst,
               unordered_map<string, unordered_map<string,double>>& g,
               unordered_set<string>& seen) {
        if (src == dst) return 1.0;
        seen.insert(src);
        for (auto& [nei, w] : g[src]) {
            if (!seen.count(nei)) {
                double res = dfs(nei, dst, g, seen);
                if (res != -1.0) return w * res;
            }
        }
        return -1.0;
    }
public:
    vector<double> calcEquation(vector<vector<string>>& equations, vector<double>& values, vector<vector<string>>& queries) {
        unordered_map<string, unordered_map<string,double>> g;
        for (int i = 0; i < (int)values.size(); i++) {
            g[equations[i][0]][equations[i][1]] = values[i];
            g[equations[i][1]][equations[i][0]] = 1.0 / values[i];
        }
        vector<double> ans;
        for (auto& q : queries) {
            if (!g.count(q[0]) || !g.count(q[1])) { ans.push_back(-1.0); continue; }
            unordered_set<string> seen;
            ans.push_back(dfs(q[0], q[1], g, seen));
        }
        return ans;
    }
};
`,
    },
    complexity: { time: "O(Q * (V + E))", space: "O(V + E)" },
    pitfalls: [
      "Returning 1.0 for c/c when c is not a known unit — that case is -1.",
      "Forgetting to add the inverse edge b->a = 1/w.",
      "Revisiting nodes and looping; track the visited set.",
    ],
    edgeCases: [
      "A query on a unit absent from all equations.",
      "Self-query on a known unit (answer 1.0).",
      "Disconnected unit groups.",
    ],
    whyItMatters:
      "Weighted-reachability on a ratio graph is the canonical model for unit conversion, currency cross-rates, and dimensional analysis.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 409 — pure_dsa · graphs · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "balanced-root-selection",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "graphs",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "platform_engineer"],
    title: "Choose Roots That Minimize Tree Height",
    framing:
      "A team's reporting structure is an undirected tree. Pick the person (or two people) to root the org chart at so that the deepest chain of reports is as short as possible.",
    statement:
      "Given a tree with n nodes (0..n-1) described by n-1 undirected edges, a minimum-height tree (MHT) is one rooted at a node that minimizes the tree's height. Return the list of all root labels that achieve the minimum height (there are at most two).",
    inputFormat: "An integer n and an edge list edges of n-1 undirected pairs.",
    outputFormat: "A list of all roots yielding minimum height (order does not matter).",
    constraints: [
      "1 <= n <= 2*10^4",
      "edges.length == n - 1",
      "The input is guaranteed to form a valid tree.",
    ],
    examples: [
      {
        input: "n = 4, edges = [[1,0],[1,2],[1,3]]",
        output: "[1]",
        explanation: "Rooting at the center node 1 gives height 1.",
      },
      {
        input: "n = 6, edges = [[3,0],[3,1],[3,2],[3,4],[5,4]]",
        output: "[3,4]",
        explanation: "The two central nodes both yield the minimum height.",
      },
    ],
    approach: [
      "The MHT roots are the centroid(s) of the tree, found by repeatedly trimming leaves.",
      "Compute degrees; enqueue all current leaves (degree 1).",
      "Peel one leaf layer at a time, decrementing neighbors and enqueuing new leaves.",
      "The last 1 or 2 nodes remaining are the answer.",
    ],
    solutionSteps: [
      "Handle n <= 2 directly (every node is a root).",
      "Build adjacency and a degree array; collect initial leaves.",
      "While more than 2 nodes remain, remove the current leaf layer and surface new leaves.",
      "Return the surviving nodes.",
    ],
    code: {
      python: `from collections import deque

def find_min_height_trees(n: int, edges: list[list[int]]) -> list[int]:
    if n <= 2:
        return list(range(n))
    adj = [set() for _ in range(n)]
    for u, v in edges:
        adj[u].add(v)
        adj[v].add(u)
    leaves = deque(i for i in range(n) if len(adj[i]) == 1)
    remaining = n
    while remaining > 2:
        size = len(leaves)
        remaining -= size
        for _ in range(size):
            leaf = leaves.popleft()
            nei = next(iter(adj[leaf]))
            adj[nei].remove(leaf)
            if len(adj[nei]) == 1:
                leaves.append(nei)
    return list(leaves)
`,
      java: `import java.util.*;

class Solution {
    public List<Integer> findMinHeightTrees(int n, int[][] edges) {
        if (n <= 2) {
            List<Integer> all = new ArrayList<>();
            for (int i = 0; i < n; i++) all.add(i);
            return all;
        }
        List<Set<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new HashSet<>());
        for (int[] e : edges) { adj.get(e[0]).add(e[1]); adj.get(e[1]).add(e[0]); }
        Deque<Integer> leaves = new ArrayDeque<>();
        for (int i = 0; i < n; i++) if (adj.get(i).size() == 1) leaves.add(i);
        int remaining = n;
        while (remaining > 2) {
            int size = leaves.size();
            remaining -= size;
            for (int i = 0; i < size; i++) {
                int leaf = leaves.poll();
                int nei = adj.get(leaf).iterator().next();
                adj.get(nei).remove(leaf);
                if (adj.get(nei).size() == 1) leaves.add(nei);
            }
        }
        return new ArrayList<>(leaves);
    }
}
`,
      cpp: `#include <vector>
#include <unordered_set>
#include <queue>
using namespace std;

class Solution {
public:
    vector<int> findMinHeightTrees(int n, vector<vector<int>>& edges) {
        if (n <= 2) {
            vector<int> all;
            for (int i = 0; i < n; i++) all.push_back(i);
            return all;
        }
        vector<unordered_set<int>> adj(n);
        for (auto& e : edges) { adj[e[0]].insert(e[1]); adj[e[1]].insert(e[0]); }
        queue<int> leaves;
        for (int i = 0; i < n; i++) if (adj[i].size() == 1) leaves.push(i);
        int remaining = n;
        while (remaining > 2) {
            int size = leaves.size();
            remaining -= size;
            for (int i = 0; i < size; i++) {
                int leaf = leaves.front(); leaves.pop();
                int nei = *adj[leaf].begin();
                adj[nei].erase(leaf);
                if (adj[nei].size() == 1) leaves.push(nei);
            }
        }
        vector<int> ans;
        while (!leaves.empty()) { ans.push_back(leaves.front()); leaves.pop(); }
        return ans;
    }
};
`,
    },
    complexity: { time: "O(V + E)", space: "O(V + E)" },
    pitfalls: [
      "Trying every node as a root with BFS — O(n^2), too slow at the upper bound.",
      "Forgetting the n <= 2 base case.",
      "Stopping when 1 node remains and missing the two-centroid case.",
    ],
    edgeCases: [
      "A single node -> [0].",
      "A path graph (two centroids).",
      "A star graph (one centroid).",
    ],
    whyItMatters:
      "Centroid decomposition via leaf-peeling is a core tree technique that also seeds divide-and-conquer on trees.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 410 — pure_dsa · graphs · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "find-extra-reporting-edge",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "software_engineer"],
    title: "Remove the One Edge That Breaks a Rooted Hierarchy",
    framing:
      "A reporting hierarchy should be a rooted tree: one root with no manager, everyone else with exactly one manager, no cycles. Exactly one extra edge was added by mistake. Identify the edge to remove to restore a valid hierarchy.",
    statement:
      "A rooted tree on n nodes (1..n) had one extra directed edge added, producing edges (a list of n directed [parent, child] pairs). Return the edge that can be removed so the result is a rooted tree with exactly one root. If multiple answers exist, return the one that appears last in edges.",
    inputFormat: "A list edges of n directed [u, v] pairs.",
    outputFormat: "A single [u, v] edge to remove.",
    constraints: [
      "3 <= n <= 1000",
      "edges.length == n",
      "Each edge is a directed pair; exactly one extra edge is present.",
    ],
    examples: [
      {
        input: "edges = [[1,2],[1,3],[2,3]]",
        output: "[2,3]",
        explanation: "Node 3 has two parents; removing the later edge [2,3] fixes it.",
      },
      {
        input: "edges = [[1,2],[2,3],[3,4],[4,1],[1,5]]",
        output: "[4,1]",
        explanation: "No node has two parents, but there is a cycle; remove the cycle-closing edge.",
      },
    ],
    approach: [
      "Two faults are possible: a node with two parents, and/or a cycle.",
      "Scan for a node with two incoming edges; record the two candidate edges (cand1 earlier, cand2 later).",
      "Run union-find over the edges, skipping cand2 if it exists; a union that closes a cycle flags the culprit.",
      "Combine the cases: no two-parent node -> return the cycle edge; two-parent with a cycle -> return cand1; otherwise return cand2.",
    ],
    solutionSteps: [
      "Detect a child with two parents; if found, remember edges cand1 (first) and cand2 (second).",
      "Union-find every edge except cand2; if adding an edge unites already-connected nodes, that edge forms a cycle.",
      "If no two-parent node exists, the cycle edge is the answer.",
      "If a two-parent node exists and a cycle was found, return cand1; else return cand2.",
    ],
    code: {
      python: `def find_redundant_directed_connection(edges: list[list[int]]) -> list[int]:
    n = len(edges)
    parent_of = [0] * (n + 1)
    cand1 = cand2 = None
    for u, v in edges:
        if parent_of[v] != 0:
            cand1 = [parent_of[v], v]
            cand2 = [u, v]
        else:
            parent_of[v] = u

    uf = list(range(n + 1))

    def find(x):
        while uf[x] != x:
            uf[x] = uf[uf[x]]
            x = uf[x]
        return x

    for u, v in edges:
        if cand2 and [u, v] == cand2:
            continue
        ru, rv = find(u), find(v)
        if ru == rv:
            return cand1 if cand1 else [u, v]
        uf[rv] = ru
    return cand2
`,
      java: `class Solution {
    int[] uf;
    public int[] findRedundantDirectedConnection(int[][] edges) {
        int n = edges.length;
        int[] parentOf = new int[n + 1];
        int[] cand1 = null, cand2 = null;
        for (int[] e : edges) {
            if (parentOf[e[1]] != 0) {
                cand1 = new int[]{parentOf[e[1]], e[1]};
                cand2 = new int[]{e[0], e[1]};
            } else parentOf[e[1]] = e[0];
        }
        uf = new int[n + 1];
        for (int i = 0; i <= n; i++) uf[i] = i;
        for (int[] e : edges) {
            if (cand2 != null && e[0] == cand2[0] && e[1] == cand2[1]) continue;
            int ru = find(e[0]), rv = find(e[1]);
            if (ru == rv) return cand1 != null ? cand1 : e;
            uf[rv] = ru;
        }
        return cand2;
    }
    private int find(int x) {
        while (uf[x] != x) { uf[x] = uf[uf[x]]; x = uf[x]; }
        return x;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
    vector<int> uf;
    int find(int x) {
        while (uf[x] != x) { uf[x] = uf[uf[x]]; x = uf[x]; }
        return x;
    }
public:
    vector<int> findRedundantDirectedConnection(vector<vector<int>>& edges) {
        int n = edges.size();
        vector<int> parentOf(n + 1, 0), cand1, cand2;
        for (auto& e : edges) {
            if (parentOf[e[1]] != 0) {
                cand1 = {parentOf[e[1]], e[1]};
                cand2 = {e[0], e[1]};
            } else parentOf[e[1]] = e[0];
        }
        uf.resize(n + 1);
        for (int i = 0; i <= n; i++) uf[i] = i;
        for (auto& e : edges) {
            if (!cand2.empty() && e[0] == cand2[0] && e[1] == cand2[1]) continue;
            int ru = find(e[0]), rv = find(e[1]);
            if (ru == rv) return cand1.empty() ? e : cand1;
            uf[rv] = ru;
        }
        return cand2;
    }
};
`,
    },
    complexity: { time: "O(n α(n))", space: "O(n)" },
    pitfalls: [
      "Handling only the cycle case and ignoring the two-parent case (or vice versa).",
      "Skipping the wrong candidate during union-find (skip cand2, the later edge).",
      "Returning cand2 when a cycle proves cand1 is the real culprit.",
    ],
    edgeCases: [
      "A pure cycle with no two-parent node.",
      "A two-parent node with no cycle.",
      "Both faults coinciding at one node.",
    ],
    whyItMatters:
      "Directed redundancy detection blends union-find with parent bookkeeping — the same reasoning validates and repairs hierarchical metadata graphs.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 411 — pure_dsa · graphs · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "remove-aligned-markers-max",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "graphs",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Maximum Markers Removable That Share a Row or Column",
    framing:
      "Markers sit on a grid. You may remove a marker if another marker shares its row or column. Remove as many as possible; report the maximum number of removals.",
    statement:
      "Given n markers as stones where stones[i] = [row, col], a marker can be removed if it shares a row or column with another not-yet-removed marker. Return the largest number of markers that can be removed.",
    inputFormat: "A list stones of [row, col] coordinates.",
    outputFormat: "An integer: the maximum number of removable markers.",
    constraints: [
      "1 <= stones.length <= 1000",
      "0 <= row, col <= 10^4",
      "No two markers share the same cell.",
    ],
    examples: [
      {
        input: "stones = [[0,0],[0,1],[1,0],[1,2],[2,1],[2,2]]",
        output: "5",
        explanation: "All six markers are connected; you can remove all but one, leaving 5.",
      },
      {
        input: "stones = [[0,0],[0,2],[1,1],[2,0],[2,2]]",
        output: "3",
        explanation: "Two connected components leave two markers behind, so 5 - 2 = 3 removals.",
      },
    ],
    approach: [
      "Markers in one row/column-connected component can be reduced to a single leftover marker.",
      "So the answer is total markers minus the number of connected components.",
      "Union markers that share a row or column using union-find over rows and columns as distinct labels.",
      "Count distinct roots among occupied labels to get the component count.",
    ],
    solutionSteps: [
      "Map each row r to id r and each column c to id (c + 10001) to keep namespaces disjoint.",
      "Union the row id and column id of every marker.",
      "Count distinct roots over all labels that were touched.",
      "Return stones.length minus that component count.",
    ],
    code: {
      python: `def remove_stones(stones: list[list[int]]) -> int:
    parent = {}

    def find(x):
        parent.setdefault(x, x)
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        parent[find(a)] = find(b)

    for r, c in stones:
        union(r, c + 10001)
    roots = {find(r) for r, _ in stones}
    return len(stones) - len(roots)
`,
      java: `import java.util.*;

class Solution {
    Map<Integer, Integer> parent = new HashMap<>();
    public int removeStones(int[][] stones) {
        for (int[] s : stones) union(s[0], s[1] + 10001);
        Set<Integer> roots = new HashSet<>();
        for (int[] s : stones) roots.add(find(s[0]));
        return stones.length - roots.size();
    }
    private int find(int x) {
        parent.putIfAbsent(x, x);
        while (parent.get(x) != x) {
            parent.put(x, parent.get(parent.get(x)));
            x = parent.get(x);
        }
        return x;
    }
    private void union(int a, int b) { parent.put(find(a), find(b)); }
}
`,
      cpp: `#include <vector>
#include <unordered_map>
#include <unordered_set>
using namespace std;

class Solution {
    unordered_map<int,int> parent;
    int find(int x) {
        if (!parent.count(x)) parent[x] = x;
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }
    void uni(int a, int b) { parent[find(a)] = find(b); }
public:
    int removeStones(vector<vector<int>>& stones) {
        for (auto& s : stones) uni(s[0], s[1] + 10001);
        unordered_set<int> roots;
        for (auto& s : stones) roots.insert(find(s[0]));
        return stones.size() - roots.size();
    }
};
`,
    },
    complexity: { time: "O(n α(n))", space: "O(n)" },
    pitfalls: [
      "Overlapping row and column id ranges so a row collides with a column.",
      "Counting components over labels rather than over the markers' roots.",
      "Trying to simulate removals greedily instead of using the component insight.",
    ],
    edgeCases: [
      "A single marker (0 removals).",
      "All markers in one row (n - 1 removals).",
      "All markers isolated (0 removals).",
    ],
    whyItMatters:
      "Reducing 'how many can collapse' to total-minus-components is a recurring union-find reframing for dependency or alias coalescing.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 412 — pure_dsa · graphs · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "equality-constraints-consistency",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer"],
    title: "Are the Equality and Inequality Constraints Satisfiable",
    framing:
      "A config validator receives constraints like 'a == b' and 'c != d' over single-letter variables. Decide whether some assignment of values satisfies all of them simultaneously.",
    statement:
      "Given an array equations of strings each of length 4 in the form 'x==y' or 'x!=y' (x, y lowercase letters), return true if there exists an assignment of integers to variables that satisfies every equation, and false otherwise.",
    inputFormat: "An array equations of 4-character constraint strings.",
    outputFormat: "A boolean: whether all constraints can be satisfied.",
    constraints: [
      "1 <= equations.length <= 500",
      "Each equation has the exact form a==b or a!=b.",
      "Variable names are single lowercase letters.",
    ],
    examples: [
      {
        input: 'equations = ["a==b","b!=a"]',
        output: "false",
        explanation: "a==b forces equality, but b!=a forbids it.",
      },
      {
        input: 'equations = ["b==a","a==b"]',
        output: "true",
        explanation: "Both demand a and b be equal — consistent.",
      },
    ],
    approach: [
      "First union all variables joined by '==' so equal variables share a component.",
      "Then check every '!=' constraint: if its two variables are already in the same component, it is violated.",
      "Process equalities before inequalities so all merges are complete.",
      "Return false on the first violated inequality, else true.",
    ],
    solutionSteps: [
      "Create a union-find over the 26 letters.",
      "Pass 1: for each '==' equation, union the two letters.",
      "Pass 2: for each '!=' equation, if find(x) == find(y) return false.",
      "Return true if no inequality is violated.",
    ],
    code: {
      python: `def equations_possible(equations: list[str]) -> bool:
    parent = list(range(26))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for eq in equations:
        if eq[1] == "=":
            parent[find(ord(eq[0]) - 97)] = find(ord(eq[3]) - 97)
    for eq in equations:
        if eq[1] == "!":
            if find(ord(eq[0]) - 97) == find(ord(eq[3]) - 97):
                return False
    return True
`,
      java: `class Solution {
    int[] parent = new int[26];
    public boolean equationsPossible(String[] equations) {
        for (int i = 0; i < 26; i++) parent[i] = i;
        for (String eq : equations)
            if (eq.charAt(1) == '=')
                parent[find(eq.charAt(0) - 'a')] = find(eq.charAt(3) - 'a');
        for (String eq : equations)
            if (eq.charAt(1) == '!' && find(eq.charAt(0) - 'a') == find(eq.charAt(3) - 'a'))
                return false;
        return true;
    }
    private int find(int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }
}
`,
      cpp: `#include <vector>
#include <string>
using namespace std;

class Solution {
    int parent[26];
    int find(int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }
public:
    bool equationsPossible(vector<string>& equations) {
        for (int i = 0; i < 26; i++) parent[i] = i;
        for (auto& eq : equations)
            if (eq[1] == '=') parent[find(eq[0] - 'a')] = find(eq[3] - 'a');
        for (auto& eq : equations)
            if (eq[1] == '!' && find(eq[0] - 'a') == find(eq[3] - 'a')) return false;
        return true;
    }
};
`,
    },
    complexity: { time: "O(n α(26))", space: "O(1)" },
    pitfalls: [
      "Processing inequalities before all equalities are merged.",
      "Misreading the operator — check position 1 for '=' vs '!'.",
      "Treating x!=x as satisfiable; a variable always equals itself.",
    ],
    edgeCases: [
      "A self-inequality like 'a!=a' (always false).",
      "Only equalities (always satisfiable).",
      "Disjoint variable groups.",
    ],
    whyItMatters:
      "Equality/inequality satisfiability via union-find is the kernel of type unification and constraint validation in compilers and config systems.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 413 — pure_dsa · graphs · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "smallest-string-after-swaps",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Lexicographically Smallest String After Allowed Swaps",
    framing:
      "Certain index pairs of a string may be swapped any number of times. Using those swaps freely, produce the lexicographically smallest possible string.",
    statement:
      "Given a string s and a list pairs of index pairs [a, b] (0-indexed) that may be swapped any number of times, return the lexicographically smallest string obtainable. Swaps are transitive: any indices connected through pairs can be freely rearranged among themselves.",
    inputFormat: "A string s and a list pairs of [a, b] swappable index pairs.",
    outputFormat: "The lexicographically smallest reachable string.",
    constraints: [
      "1 <= s.length <= 10^5",
      "0 <= pairs.length <= 10^5",
      "s contains only lowercase letters.",
    ],
    examples: [
      {
        input: 's = "dcab", pairs = [[0,3],[1,2]]',
        output: '"bacd"',
        explanation: "Swap indices {0,3} and {1,2} independently to sort each group.",
      },
      {
        input: 's = "dcab", pairs = [[0,3],[1,2],[0,2]]',
        output: '"abcd"',
        explanation: "Indices 0,1,2,3 form one group, so the whole string sorts.",
      },
    ],
    approach: [
      "Indices connected by swaps form components within which any permutation is achievable.",
      "Union all paired indices.",
      "For each component, gather its characters and sort them.",
      "Place the sorted characters back into the component's indices in ascending index order.",
    ],
    solutionSteps: [
      "Union every pair with a union-find over indices.",
      "Group indices by their root.",
      "For each group, sort the indices and sort the characters at those indices.",
      "Assign the smallest character to the smallest index, and so on.",
    ],
    code: {
      python: `def smallest_string_with_swaps(s: str, pairs: list[list[int]]) -> str:
    n = len(s)
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for a, b in pairs:
        parent[find(a)] = find(b)

    from collections import defaultdict
    groups = defaultdict(list)
    for i in range(n):
        groups[find(i)].append(i)

    res = list(s)
    for idxs in groups.values():
        chars = sorted(res[i] for i in idxs)
        for i, ch in zip(sorted(idxs), chars):
            res[i] = ch
    return "".join(res)
`,
      java: `import java.util.*;

class Solution {
    int[] parent;
    public String smallestStringWithSwaps(String s, List<List<Integer>> pairs) {
        int n = s.length();
        parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        for (List<Integer> p : pairs) parent[find(p.get(0))] = find(p.get(1));
        Map<Integer, List<Integer>> groups = new HashMap<>();
        for (int i = 0; i < n; i++) groups.computeIfAbsent(find(i), k -> new ArrayList<>()).add(i);
        char[] res = s.toCharArray();
        for (List<Integer> idxs : groups.values()) {
            char[] chars = new char[idxs.size()];
            for (int i = 0; i < idxs.size(); i++) chars[i] = res[idxs.get(i)];
            Arrays.sort(chars);
            for (int i = 0; i < idxs.size(); i++) res[idxs.get(i)] = chars[i];
        }
        return new String(res);
    }
    private int find(int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }
}
`,
      cpp: `#include <vector>
#include <string>
#include <unordered_map>
#include <algorithm>
using namespace std;

class Solution {
    vector<int> parent;
    int find(int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }
public:
    string smallestStringWithSwaps(string s, vector<vector<int>>& pairs) {
        int n = s.size();
        parent.resize(n);
        for (int i = 0; i < n; i++) parent[i] = i;
        for (auto& p : pairs) parent[find(p[0])] = find(p[1]);
        unordered_map<int, vector<int>> groups;
        for (int i = 0; i < n; i++) groups[find(i)].push_back(i);
        for (auto& [root, idxs] : groups) {
            string chars;
            for (int i : idxs) chars += s[i];
            sort(chars.begin(), chars.end());
            for (int k = 0; k < (int)idxs.size(); k++) s[idxs[k]] = chars[k];
        }
        return s;
    }
};
`,
    },
    complexity: { time: "O(n log n)", space: "O(n)" },
    pitfalls: [
      "Sorting all characters globally instead of per component.",
      "Not keeping the component indices sorted before placing characters.",
      "Repeatedly performing individual swaps — far too slow.",
    ],
    edgeCases: [
      "No pairs (string returned unchanged).",
      "All indices in one component (full sort).",
      "Duplicate characters within a component.",
    ],
    whyItMatters:
      "Free-permutation-within-a-component is a powerful union-find idiom for optimization under transitive swap rights.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 414 — pure_dsa · graphs · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "rank-normalize-matrix",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Assign Ranks Preserving Row and Column Order",
    framing:
      "Normalize a metric matrix into ranks: the smallest distinct value is rank 1, and ranks must respect ordering within each row and each column while keeping equal values that are connected at the same rank.",
    statement:
      "Given an m x n matrix, return a matrix answer where answer[i][j] is the rank of matrix[i][j]. Rank is at least 1; if two elements are in the same row or column, the smaller gets the lower rank and equal elements connected through shared rows/columns get the same rank; ranks should be as small as possible.",
    inputFormat: "An m x n integer matrix.",
    outputFormat: "An m x n integer matrix of ranks.",
    constraints: [
      "1 <= m, n <= 500",
      "-10^9 <= matrix[i][j] <= 10^9",
      "Equal values may appear anywhere.",
    ],
    examples: [
      {
        input: "matrix = [[1,2],[3,4]]",
        output: "[[1,2],[2,3]]",
        explanation: "Ranks increase along rows and columns; the 2 and 3 tie at rank 2.",
      },
      {
        input: "matrix = [[7,7],[7,7]]",
        output: "[[1,1],[1,1]]",
        explanation: "All equal and connected, so they share rank 1.",
      },
    ],
    approach: [
      "Process values in ascending order so a cell's rank depends only on already-ranked smaller cells.",
      "For each value, union cells sharing a row or column (equal connected cells must tie).",
      "A group's rank is one more than the max rank already used in any of its rows or columns.",
      "Apply that rank to every cell in the group and update per-row and per-column running maxima.",
    ],
    solutionSteps: [
      "Bucket cells by value.",
      "For each value ascending, build a fresh union-find keyed by ('r', row) and ('c', col); union each cell's row and column labels.",
      "Per group root, compute the rank as max(rowRank, colRank over its cells) + 1.",
      "Write the rank and bump rowRank[i] and colRank[j] for every assigned cell.",
    ],
    code: {
      python: `from collections import defaultdict

def matrix_rank_transform(matrix: list[list[int]]) -> list[list[int]]:
    m, n = len(matrix), len(matrix[0])
    cells = defaultdict(list)
    for i in range(m):
        for j in range(n):
            cells[matrix[i][j]].append((i, j))
    row_rank = [0] * m
    col_rank = [0] * n
    answer = [[0] * n for _ in range(m)]
    for val in sorted(cells):
        parent = {}

        def find(x):
            parent.setdefault(x, x)
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        for i, j in cells[val]:
            parent[find(("r", i))] = find(("c", j))
        group_rank = {}
        for i, j in cells[val]:
            root = find(("r", i))
            group_rank[root] = max(group_rank.get(root, 0), row_rank[i], col_rank[j])
        for i, j in cells[val]:
            root = find(("r", i))
            r = group_rank[root] + 1
            answer[i][j] = r
            row_rank[i] = max(row_rank[i], r)
            col_rank[j] = max(col_rank[j], r)
    return answer
`,
      java: `import java.util.*;

class Solution {
    Map<Integer, Integer> parent;
    public int[][] matrixRankTransform(int[][] matrix) {
        int m = matrix.length, n = matrix[0].length;
        TreeMap<Integer, List<int[]>> cells = new TreeMap<>();
        for (int i = 0; i < m; i++)
            for (int j = 0; j < n; j++)
                cells.computeIfAbsent(matrix[i][j], k -> new ArrayList<>()).add(new int[]{i, j});
        int[] rowRank = new int[m], colRank = new int[n];
        int[][] answer = new int[m][n];
        for (List<int[]> group : cells.values()) {
            parent = new HashMap<>();
            for (int[] c : group) union(c[0], ~c[1]); // rows as i, cols as ~j
            Map<Integer, Integer> groupRank = new HashMap<>();
            for (int[] c : group) {
                int root = find(c[0]);
                groupRank.merge(root, Math.max(rowRank[c[0]], colRank[c[1]]), Math::max);
            }
            for (int[] c : group) {
                int r = groupRank.get(find(c[0])) + 1;
                answer[c[0]][c[1]] = r;
                rowRank[c[0]] = Math.max(rowRank[c[0]], r);
                colRank[c[1]] = Math.max(colRank[c[1]], r);
            }
        }
        return answer;
    }
    private int find(int x) {
        parent.putIfAbsent(x, x);
        while (parent.get(x) != x) { parent.put(x, parent.get(parent.get(x))); x = parent.get(x); }
        return x;
    }
    private void union(int a, int b) { parent.put(find(a), find(b)); }
}
`,
      cpp: `#include <vector>
#include <map>
#include <unordered_map>
#include <algorithm>
using namespace std;

class Solution {
    unordered_map<int,int> parent;
    int find(int x) {
        if (!parent.count(x)) parent[x] = x;
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }
    void uni(int a, int b) { parent[find(a)] = find(b); }
public:
    vector<vector<int>> matrixRankTransform(vector<vector<int>>& matrix) {
        int m = matrix.size(), n = matrix[0].size();
        map<int, vector<pair<int,int>>> cells;
        for (int i = 0; i < m; i++)
            for (int j = 0; j < n; j++)
                cells[matrix[i][j]].push_back({i, j});
        vector<int> rowRank(m, 0), colRank(n, 0);
        vector<vector<int>> answer(m, vector<int>(n, 0));
        for (auto& [val, group] : cells) {
            parent.clear();
            for (auto& [i, j] : group) uni(i, ~j); // rows i, cols ~j
            unordered_map<int,int> groupRank;
            for (auto& [i, j] : group) {
                int root = find(i);
                groupRank[root] = max(groupRank.count(root) ? groupRank[root] : 0,
                                      max(rowRank[i], colRank[j]));
            }
            for (auto& [i, j] : group) {
                int r = groupRank[find(i)] + 1;
                answer[i][j] = r;
                rowRank[i] = max(rowRank[i], r);
                colRank[j] = max(colRank[j], r);
            }
        }
        return answer;
    }
};
`,
    },
    complexity: { time: "O(m*n*log(m*n) * α)", space: "O(m*n)" },
    pitfalls: [
      "Failing to tie equal values connected across shared rows/columns.",
      "Mixing row and column labels into one id space without disjoint encoding.",
      "Updating row/column maxima before assigning the whole group, corrupting ties.",
    ],
    edgeCases: [
      "An all-equal matrix (every cell rank 1).",
      "A single row or single column.",
      "Negative values and large magnitudes.",
    ],
    whyItMatters:
      "Order-preserving rank normalization with equality grouping underlies leaderboard scaling and feature quantile encoding.",
    estimatedMinutes: 50,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 415 — pure_dsa · graphs · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-cable-moves-connect",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "data_engineer"],
    title: "Fewest Cable Moves to Connect Every Machine",
    framing:
      "Machines are linked by network cables. You may unplug any cable and replug it between two machines. Find the minimum number of moves to make the whole fleet connected, or report it is impossible.",
    statement:
      "There are n machines (0..n-1) and a list connections where connections[i] = [a, b] is a cable between a and b. You may remove any cable and place it between any two disconnected machines. Return the minimum number of moves to connect all machines, or -1 if it cannot be done.",
    inputFormat: "An integer n and a connections list of [a, b] cables.",
    outputFormat: "An integer: the minimum moves, or -1.",
    constraints: [
      "1 <= n <= 10^5",
      "1 <= connections.length <= min(n*(n-1)/2, 10^5)",
      "No duplicate cables or self-loops.",
    ],
    examples: [
      {
        input: "n = 4, connections = [[0,1],[0,2],[1,2]]",
        output: "1",
        explanation: "Three cables among {0,1,2}; move one redundant cable to reach 3.",
      },
      {
        input: "n = 6, connections = [[0,1],[0,2],[0,3],[1,2],[1,3]]",
        output: "2",
        explanation: "Two spare cables connect the remaining two isolated machines.",
      },
    ],
    approach: [
      "To connect n nodes you need at least n-1 cables; if fewer exist, return -1.",
      "Each redundant cable (one joining already-connected machines) can be relocated.",
      "The number of moves needed equals components - 1.",
      "Union-find yields the component count directly; spare cables are always sufficient when total cables >= n-1.",
    ],
    solutionSteps: [
      "If connections.length < n - 1, return -1.",
      "Union every cable's endpoints.",
      "Count the distinct components.",
      "Return components - 1.",
    ],
    code: {
      python: `def make_connected(n: int, connections: list[list[int]]) -> int:
    if len(connections) < n - 1:
        return -1
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    components = n
    for a, b in connections:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb
            components -= 1
    return components - 1
`,
      java: `class Solution {
    int[] parent;
    public int makeConnected(int n, int[][] connections) {
        if (connections.length < n - 1) return -1;
        parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        int components = n;
        for (int[] c : connections) {
            int ra = find(c[0]), rb = find(c[1]);
            if (ra != rb) { parent[ra] = rb; components--; }
        }
        return components - 1;
    }
    private int find(int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
    vector<int> parent;
    int find(int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }
public:
    int makeConnected(int n, vector<vector<int>>& connections) {
        if ((int)connections.size() < n - 1) return -1;
        parent.resize(n);
        for (int i = 0; i < n; i++) parent[i] = i;
        int components = n;
        for (auto& c : connections) {
            int ra = find(c[0]), rb = find(c[1]);
            if (ra != rb) { parent[ra] = rb; components--; }
        }
        return components - 1;
    }
};
`,
    },
    complexity: { time: "O(n + m α(n))", space: "O(n)" },
    pitfalls: [
      "Forgetting the feasibility check: fewer than n-1 cables can never connect n nodes.",
      "Counting redundant cables instead of components - 1 (they coincide only when cables suffice).",
      "Off-by-one in the components-to-moves conversion.",
    ],
    edgeCases: [
      "Already fully connected (0 moves).",
      "Too few cables (-1).",
      "n = 1 (0 moves).",
    ],
    whyItMatters:
      "Counting components and spare edges is the canonical way to reason about minimum rewiring in network and cluster topology repair.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 416 — pure_dsa · graphs · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "farthest-cell-from-coverage",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "platform_engineer"],
    title: "Most Remote Cell From Any Covered Region",
    framing:
      "On a grid, some cells host coverage (value 1) and the rest are gaps (value 0). Find the gap cell whose Manhattan distance to the nearest coverage cell is the largest; report that distance.",
    statement:
      "Given an n x n grid of 0s (water) and 1s (land), find a water cell whose distance to the nearest land cell is maximized, and return that distance using Manhattan distance. If no land or no water exists, return -1.",
    inputFormat: "An n x n integer grid of 0s and 1s.",
    outputFormat: "An integer: the maximum nearest-land distance, or -1.",
    constraints: [
      "1 <= n <= 100",
      "grid[i][j] is 0 or 1.",
      "Distance is |r1 - r2| + |c1 - c2|.",
    ],
    examples: [
      {
        input: "grid = [[1,0,1],[0,0,0],[1,0,1]]",
        output: "2",
        explanation: "The center cell is distance 2 from the nearest land.",
      },
      {
        input: "grid = [[1,0,0],[0,0,0],[0,0,0]]",
        output: "4",
        explanation: "The far corner is 4 steps from the single land cell.",
      },
    ],
    approach: [
      "Run a multi-source BFS seeded with every land cell at distance 0.",
      "BFS expands outward in distance layers, so the last water cell reached has the maximum distance.",
      "Track the deepest layer that produces a newly visited water cell.",
      "Return -1 if the grid is all land or all water.",
    ],
    solutionSteps: [
      "Enqueue all land cells; mark them visited.",
      "BFS level by level over 4-neighbors, recording the distance when first reaching a water cell.",
      "Keep the maximum distance assigned to any water cell.",
      "Return that maximum, or -1 if no expansion happened.",
    ],
    code: {
      python: `from collections import deque

def max_distance(grid: list[list[int]]) -> int:
    n = len(grid)
    q = deque()
    for i in range(n):
        for j in range(n):
            if grid[i][j] == 1:
                q.append((i, j))
    if not q or len(q) == n * n:
        return -1
    dist = -1
    while q:
        dist += 1
        for _ in range(len(q)):
            i, j = q.popleft()
            for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ni, nj = i + di, j + dj
                if 0 <= ni < n and 0 <= nj < n and grid[ni][nj] == 0:
                    grid[ni][nj] = 1
                    q.append((ni, nj))
    return dist
`,
      java: `import java.util.*;

class Solution {
    public int maxDistance(int[][] grid) {
        int n = grid.length;
        Deque<int[]> q = new ArrayDeque<>();
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                if (grid[i][j] == 1) q.add(new int[]{i, j});
        if (q.isEmpty() || q.size() == n * n) return -1;
        int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};
        int dist = -1;
        while (!q.isEmpty()) {
            dist++;
            int size = q.size();
            for (int k = 0; k < size; k++) {
                int[] cur = q.poll();
                for (int[] d : dirs) {
                    int ni = cur[0] + d[0], nj = cur[1] + d[1];
                    if (ni >= 0 && ni < n && nj >= 0 && nj < n && grid[ni][nj] == 0) {
                        grid[ni][nj] = 1;
                        q.add(new int[]{ni, nj});
                    }
                }
            }
        }
        return dist;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
using namespace std;

class Solution {
public:
    int maxDistance(vector<vector<int>>& grid) {
        int n = grid.size();
        queue<pair<int,int>> q;
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                if (grid[i][j] == 1) q.push({i, j});
        if (q.empty() || (int)q.size() == n * n) return -1;
        int dirs[4][2] = {{1,0},{-1,0},{0,1},{0,-1}};
        int dist = -1;
        while (!q.empty()) {
            dist++;
            int size = q.size();
            for (int k = 0; k < size; k++) {
                auto [i, j] = q.front(); q.pop();
                for (auto& d : dirs) {
                    int ni = i + d[0], nj = j + d[1];
                    if (ni >= 0 && ni < n && nj >= 0 && nj < n && grid[ni][nj] == 0) {
                        grid[ni][nj] = 1;
                        q.push({ni, nj});
                    }
                }
            }
        }
        return dist;
    }
};
`,
    },
    complexity: { time: "O(n^2)", space: "O(n^2)" },
    pitfalls: [
      "Single-source BFS from one land cell instead of all land cells at once.",
      "Returning -1 incorrectly when only the trivial all-land/all-water cases should.",
      "Marking water cells visited too late, causing re-enqueues.",
    ],
    edgeCases: [
      "All water or all land -> -1.",
      "A single land cell in a corner.",
      "A grid fully surrounded so distances stay small.",
    ],
    whyItMatters:
      "Multi-source BFS computes nearest-facility distances in one sweep — the basis for coverage gap and signal dead-zone analysis.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 417 — pure_dsa · graphs · medium · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "distance-to-nearest-source",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "graphs",
    difficulty: "medium",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Distance From Each Cell to the Nearest Zero",
    framing:
      "Given a grid of readings, replace each cell with its distance to the nearest baseline cell (value 0). Baseline cells stay 0; everything else reports how many steps away the closest baseline is.",
    statement:
      "Given an m x n binary matrix mat, return a matrix where each cell holds the distance to the nearest cell containing 0, measured in 4-directional steps.",
    inputFormat: "An m x n binary matrix mat.",
    outputFormat: "An m x n matrix of nearest-zero distances.",
    constraints: [
      "1 <= m, n <= 10^4 with m*n <= 10^4",
      "mat[i][j] is 0 or 1.",
      "At least one 0 is present.",
    ],
    examples: [
      {
        input: "mat = [[0,0,0],[0,1,0],[0,0,0]]",
        output: "[[0,0,0],[0,1,0],[0,0,0]]",
        explanation: "The lone 1 is one step from a 0.",
      },
      {
        input: "mat = [[0,0,0],[0,1,0],[1,1,1]]",
        output: "[[0,0,0],[0,1,0],[1,2,1]]",
        explanation: "Each 1 reports its shortest hop to a 0.",
      },
    ],
    approach: [
      "Seed a multi-source BFS from every 0 cell simultaneously, all at distance 0.",
      "Set every 1 cell to a sentinel (unvisited) initially.",
      "Expand outward; the first time a cell is reached gives its nearest-zero distance.",
      "Because BFS explores in distance order, each cell is finalized once.",
    ],
    solutionSteps: [
      "Initialize the answer with 0 for zero cells and -1 for one cells; enqueue all zero cells.",
      "Pop a cell; for each unvisited neighbor set its distance to current + 1 and enqueue.",
      "Continue until the queue empties.",
      "Return the filled distance matrix.",
    ],
    code: {
      python: `from collections import deque

def update_matrix(mat: list[list[int]]) -> list[list[int]]:
    m, n = len(mat), len(mat[0])
    dist = [[-1] * n for _ in range(m)]
    q = deque()
    for i in range(m):
        for j in range(n):
            if mat[i][j] == 0:
                dist[i][j] = 0
                q.append((i, j))
    while q:
        i, j = q.popleft()
        for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ni, nj = i + di, j + dj
            if 0 <= ni < m and 0 <= nj < n and dist[ni][nj] == -1:
                dist[ni][nj] = dist[i][j] + 1
                q.append((ni, nj))
    return dist
`,
      java: `import java.util.*;

class Solution {
    public int[][] updateMatrix(int[][] mat) {
        int m = mat.length, n = mat[0].length;
        int[][] dist = new int[m][n];
        for (int[] row : dist) Arrays.fill(row, -1);
        Deque<int[]> q = new ArrayDeque<>();
        for (int i = 0; i < m; i++)
            for (int j = 0; j < n; j++)
                if (mat[i][j] == 0) { dist[i][j] = 0; q.add(new int[]{i, j}); }
        int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};
        while (!q.isEmpty()) {
            int[] c = q.poll();
            for (int[] d : dirs) {
                int ni = c[0] + d[0], nj = c[1] + d[1];
                if (ni >= 0 && ni < m && nj >= 0 && nj < n && dist[ni][nj] == -1) {
                    dist[ni][nj] = dist[c[0]][c[1]] + 1;
                    q.add(new int[]{ni, nj});
                }
            }
        }
        return dist;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
using namespace std;

class Solution {
public:
    vector<vector<int>> updateMatrix(vector<vector<int>>& mat) {
        int m = mat.size(), n = mat[0].size();
        vector<vector<int>> dist(m, vector<int>(n, -1));
        queue<pair<int,int>> q;
        for (int i = 0; i < m; i++)
            for (int j = 0; j < n; j++)
                if (mat[i][j] == 0) { dist[i][j] = 0; q.push({i, j}); }
        int dirs[4][2] = {{1,0},{-1,0},{0,1},{0,-1}};
        while (!q.empty()) {
            auto [i, j] = q.front(); q.pop();
            for (auto& d : dirs) {
                int ni = i + d[0], nj = j + d[1];
                if (ni >= 0 && ni < m && nj >= 0 && nj < n && dist[ni][nj] == -1) {
                    dist[ni][nj] = dist[i][j] + 1;
                    q.push({ni, nj});
                }
            }
        }
        return dist;
    }
};
`,
    },
    complexity: { time: "O(m*n)", space: "O(m*n)" },
    pitfalls: [
      "Running BFS separately from each 1 cell — quadratic and unnecessary.",
      "Forgetting to seed all 0 cells before expanding.",
      "Using a visited flag distinct from the distance, risking double assignment.",
    ],
    edgeCases: [
      "All zeros (result all zeros).",
      "A single zero in a large grid.",
      "A 1 x n strip.",
    ],
    whyItMatters:
      "Nearest-baseline distance via multi-source BFS is the workhorse for proximity maps, erosion, and influence fields over grids.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 418 — pure_dsa · graphs · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-cuts-split-cluster",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "data_engineer"],
    title: "Minimum Cells to Remove to Disconnect a Cluster",
    framing:
      "A cluster of active cells (value 1) forms a single connected island on a grid. Removing a cell deactivates it. Find the minimum number of cell removals to break the island into two or more pieces (or eliminate it entirely).",
    statement:
      "Given an m x n binary grid where 1 is land and 0 is water, the grid is 'connected' if it has exactly one island. In one day you may change a single 1 to 0. Return the minimum number of days to make the grid disconnected (zero or more than one island).",
    inputFormat: "An m x n binary grid.",
    outputFormat: "An integer: the minimum number of removals (0, 1, or 2).",
    constraints: [
      "1 <= m, n <= 30",
      "grid[i][j] is 0 or 1.",
      "The answer never exceeds 2.",
    ],
    examples: [
      {
        input: "grid = [[0,1,1,0],[0,1,1,0],[0,0,0,0]]",
        output: "2",
        explanation: "No single removal disconnects this 2x2 block, so 2 days are needed.",
      },
      {
        input: "grid = [[1,1]]",
        output: "2",
        explanation: "Both cells must go to leave fewer than one island.",
      },
    ],
    approach: [
      "By a planar-graph argument the answer is always 0, 1, or 2.",
      "If the grid is already disconnected (not exactly one island), the answer is 0.",
      "Try removing each land cell once; if any single removal disconnects it, the answer is 1.",
      "Otherwise the answer is 2.",
    ],
    solutionSteps: [
      "Write a helper that counts islands via DFS/flood fill; 'connected' means exactly one.",
      "If not connected initially, return 0.",
      "For each land cell, temporarily zero it and re-check connectivity; restore it. Return 1 on the first success.",
      "If none works, return 2.",
    ],
    code: {
      python: `def min_days_to_disconnect(grid: list[list[int]]) -> int:
    m, n = len(grid), len(grid[0])

    def count_islands() -> int:
        seen = [[False] * n for _ in range(m)]
        islands = 0

        def dfs(i, j):
            stack = [(i, j)]
            seen[i][j] = True
            while stack:
                x, y = stack.pop()
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < m and 0 <= ny < n and grid[nx][ny] == 1 and not seen[nx][ny]:
                        seen[nx][ny] = True
                        stack.append((nx, ny))

        for i in range(m):
            for j in range(n):
                if grid[i][j] == 1 and not seen[i][j]:
                    islands += 1
                    dfs(i, j)
        return islands

    if count_islands() != 1:
        return 0
    for i in range(m):
        for j in range(n):
            if grid[i][j] == 1:
                grid[i][j] = 0
                if count_islands() != 1:
                    grid[i][j] = 1
                    return 1
                grid[i][j] = 1
    return 2
`,
      java: `class Solution {
    int m, n;
    public int minDays(int[][] grid) {
        m = grid.length; n = grid[0].length;
        if (countIslands(grid) != 1) return 0;
        for (int i = 0; i < m; i++)
            for (int j = 0; j < n; j++)
                if (grid[i][j] == 1) {
                    grid[i][j] = 0;
                    if (countIslands(grid) != 1) { grid[i][j] = 1; return 1; }
                    grid[i][j] = 1;
                }
        return 2;
    }
    private int countIslands(int[][] grid) {
        boolean[][] seen = new boolean[m][n];
        int islands = 0;
        for (int i = 0; i < m; i++)
            for (int j = 0; j < n; j++)
                if (grid[i][j] == 1 && !seen[i][j]) { islands++; dfs(grid, seen, i, j); }
        return islands;
    }
    private void dfs(int[][] grid, boolean[][] seen, int i, int j) {
        if (i < 0 || i >= m || j < 0 || j >= n || grid[i][j] == 0 || seen[i][j]) return;
        seen[i][j] = true;
        dfs(grid, seen, i + 1, j); dfs(grid, seen, i - 1, j);
        dfs(grid, seen, i, j + 1); dfs(grid, seen, i, j - 1);
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
    int m, n;
    void dfs(vector<vector<int>>& grid, vector<vector<bool>>& seen, int i, int j) {
        if (i < 0 || i >= m || j < 0 || j >= n || grid[i][j] == 0 || seen[i][j]) return;
        seen[i][j] = true;
        dfs(grid, seen, i + 1, j); dfs(grid, seen, i - 1, j);
        dfs(grid, seen, i, j + 1); dfs(grid, seen, i, j - 1);
    }
    int countIslands(vector<vector<int>>& grid) {
        vector<vector<bool>> seen(m, vector<bool>(n, false));
        int islands = 0;
        for (int i = 0; i < m; i++)
            for (int j = 0; j < n; j++)
                if (grid[i][j] == 1 && !seen[i][j]) { islands++; dfs(grid, seen, i, j); }
        return islands;
    }
public:
    int minDays(vector<vector<int>>& grid) {
        m = grid.size(); n = grid[0].size();
        if (countIslands(grid) != 1) return 0;
        for (int i = 0; i < m; i++)
            for (int j = 0; j < n; j++)
                if (grid[i][j] == 1) {
                    grid[i][j] = 0;
                    if (countIslands(grid) != 1) { grid[i][j] = 1; return 1; }
                    grid[i][j] = 1;
                }
        return 2;
    }
};
`,
    },
    complexity: { time: "O((m*n)^2)", space: "O(m*n)" },
    pitfalls: [
      "Not recognizing the answer is bounded by 2 and over-searching.",
      "Treating zero islands as still connected; 'connected' means exactly one.",
      "Forgetting to restore a cell after a trial removal.",
    ],
    edgeCases: [
      "Already disconnected -> 0.",
      "A single land cell -> needs 2 (removing it leaves zero islands).",
      "A thin land bridge that one removal severs -> 1.",
    ],
    whyItMatters:
      "The 0/1/2 connectivity-robustness bound is a neat planar-graph result that mirrors articulation-point reasoning in resilience analysis.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 419 — pure_dsa · graphs · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "alternating-edge-shortest-path",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "platform_engineer"],
    title: "Shortest Paths Alternating Between Two Link Types",
    framing:
      "A network has two link types (say primary and backup), modeled as red and blue edges. A valid route must alternate link types at every hop. Find the shortest alternating route length from node 0 to every node.",
    statement:
      "You are given an integer n and two directed edge lists redEdges and blueEdges over nodes 0..n-1. Return an array answer where answer[i] is the length of the shortest path from node 0 to node i whose edge colors strictly alternate (red, blue, red, ...), or -1 if no such path exists.",
    inputFormat: "An integer n, a redEdges list, and a blueEdges list of [from, to] pairs.",
    outputFormat: "An array of n shortest alternating-path lengths.",
    constraints: [
      "1 <= n <= 100",
      "0 <= redEdges.length, blueEdges.length <= 400",
      "Parallel edges and self-loops are allowed.",
    ],
    examples: [
      {
        input: "n = 3, redEdges = [[0,1],[1,2]], blueEdges = []",
        output: "[0,1,-1]",
        explanation: "0->1 is red; reaching 2 would need a blue edge after red, but none exists.",
      },
      {
        input: "n = 3, redEdges = [[0,1]], blueEdges = [[2,1]]",
        output: "[0,1,-1]",
        explanation: "Only node 1 is reachable with an alternating path.",
      },
    ],
    approach: [
      "Model state as (node, last-color-used) and BFS over these 2n states.",
      "From a node reached via red, you may only take blue edges next, and vice versa; the start may take either.",
      "BFS guarantees the first time a (node, color) state is reached is its shortest length.",
      "answer[i] is the minimum step count over its red-arrival and blue-arrival states.",
    ],
    solutionSteps: [
      "Build red and blue adjacency lists.",
      "Seed BFS with (0, red) and (0, blue) at distance 0; mark both visited.",
      "Pop (node, color); traverse edges of the opposite color, enqueueing unvisited states at distance+1.",
      "For each node take the min over its two color states (or -1).",
    ],
    code: {
      python: `from collections import deque

def shortest_alternating_paths(n: int, red_edges: list[list[int]], blue_edges: list[list[int]]) -> list[int]:
    red = [[] for _ in range(n)]
    blue = [[] for _ in range(n)]
    for u, v in red_edges:
        red[u].append(v)
    for u, v in blue_edges:
        blue[u].append(v)
    INF = float("inf")
    # dist[node][0] arrived via red, dist[node][1] arrived via blue
    dist = [[INF, INF] for _ in range(n)]
    dist[0][0] = dist[0][1] = 0
    q = deque([(0, 0), (0, 1)])
    while q:
        node, color = q.popleft()
        nxt = blue if color == 0 else red
        ncolor = 1 - color
        for v in nxt[node]:
            if dist[v][ncolor] == INF:
                dist[v][ncolor] = dist[node][color] + 1
                q.append((v, ncolor))
    return [min(a, b) if min(a, b) != INF else -1 for a, b in dist]
`,
      java: `import java.util.*;

class Solution {
    public int[] shortestAlternatingPaths(int n, int[][] redEdges, int[][] blueEdges) {
        List<Integer>[] red = new List[n], blue = new List[n];
        for (int i = 0; i < n; i++) { red[i] = new ArrayList<>(); blue[i] = new ArrayList<>(); }
        for (int[] e : redEdges) red[e[0]].add(e[1]);
        for (int[] e : blueEdges) blue[e[0]].add(e[1]);
        int[][] dist = new int[n][2];
        for (int[] d : dist) Arrays.fill(d, Integer.MAX_VALUE);
        dist[0][0] = dist[0][1] = 0;
        Deque<int[]> q = new ArrayDeque<>();
        q.add(new int[]{0, 0});
        q.add(new int[]{0, 1});
        while (!q.isEmpty()) {
            int[] cur = q.poll();
            int node = cur[0], color = cur[1], ncolor = 1 - color;
            List<Integer> nxt = color == 0 ? blue[node] : red[node];
            for (int v : nxt) {
                if (dist[v][ncolor] == Integer.MAX_VALUE) {
                    dist[v][ncolor] = dist[node][color] + 1;
                    q.add(new int[]{v, ncolor});
                }
            }
        }
        int[] ans = new int[n];
        for (int i = 0; i < n; i++) {
            int best = Math.min(dist[i][0], dist[i][1]);
            ans[i] = best == Integer.MAX_VALUE ? -1 : best;
        }
        return ans;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
#include <climits>
#include <algorithm>
using namespace std;

class Solution {
public:
    vector<int> shortestAlternatingPaths(int n, vector<vector<int>>& redEdges, vector<vector<int>>& blueEdges) {
        vector<vector<int>> red(n), blue(n);
        for (auto& e : redEdges) red[e[0]].push_back(e[1]);
        for (auto& e : blueEdges) blue[e[0]].push_back(e[1]);
        vector<array<int,2>> dist(n, {INT_MAX, INT_MAX});
        dist[0] = {0, 0};
        queue<pair<int,int>> q;
        q.push({0, 0});
        q.push({0, 1});
        while (!q.empty()) {
            auto [node, color] = q.front(); q.pop();
            int ncolor = 1 - color;
            auto& nxt = color == 0 ? blue[node] : red[node];
            for (int v : nxt) {
                if (dist[v][ncolor] == INT_MAX) {
                    dist[v][ncolor] = dist[node][color] + 1;
                    q.push({v, ncolor});
                }
            }
        }
        vector<int> ans(n);
        for (int i = 0; i < n; i++) {
            int best = min(dist[i][0], dist[i][1]);
            ans[i] = best == INT_MAX ? -1 : best;
        }
        return ans;
    }
};
`,
    },
    complexity: { time: "O(n + E)", space: "O(n + E)" },
    pitfalls: [
      "Forgetting the start node can begin with either color.",
      "Collapsing the color dimension and re-walking states already settled.",
      "Following same-color edges instead of strictly alternating.",
    ],
    edgeCases: [
      "Self-loops of one color that cannot alternate.",
      "Nodes reachable by only one color parity.",
      "Parallel red and blue edges between the same nodes.",
    ],
    whyItMatters:
      "Layered BFS over (node, mode) states is the standard trick for constrained shortest paths, such as alternating transport modes or toggling link tiers.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 420 — pure_dsa · graphs · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-reachable-subdivided",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "platform_engineer"],
    title: "Reachable Waypoints in a Subdivided Network Within a Budget",
    framing:
      "Each network link is subdivided into a chain of intermediate waypoints. Starting from node 0 with a movement budget, count how many nodes and intermediate waypoints you can reach.",
    statement:
      "An undirected graph has n nodes (0..n-1). Each edge [u, v, cnt] is subdivided into cnt new intermediate nodes (so the edge becomes a path of cnt+1 sub-edges). Given maxMoves, return how many original nodes and subdivided nodes are reachable from node 0 using at most maxMoves moves (each sub-edge is one move).",
    inputFormat: "An edges list of [u, v, cnt], an integer maxMoves, and an integer n.",
    outputFormat: "An integer: the count of reachable nodes (original plus subdivided).",
    constraints: [
      "0 <= edges.length <= min(n*(n-1)/2, 10^4)",
      "0 <= cnt <= 10^4, 0 <= maxMoves <= 10^9, 1 <= n <= 3000",
      "There are no parallel edges or self-loops in the original graph.",
    ],
    examples: [
      {
        input: "edges = [[0,1,10],[0,2,1],[1,2,2]], maxMoves = 6, n = 3",
        output: "13",
        explanation: "All 3 original nodes plus 10 subdivided nodes are reachable within 6 moves.",
      },
      {
        input: "edges = [[0,1,4],[1,2,6],[0,2,8],[1,3,1]], maxMoves = 10, n = 4",
        output: "23",
        explanation: "The four originals plus reachable subdivisions sum to 23.",
      },
    ],
    approach: [
      "Run Dijkstra over the original n nodes using cnt+1 as edge weights to get min moves to each original node.",
      "An original node is reachable iff its distance <= maxMoves.",
      "For each edge, count subdivided nodes reachable from each endpoint: min(cnt, maxMoves - dist[endpoint]) when positive.",
      "Cap the two endpoints' contributions so they do not double-count the same subdivided nodes (sum is at most cnt).",
    ],
    solutionSteps: [
      "Build adjacency with weights cnt+1 and run Dijkstra from node 0.",
      "Count original nodes with dist <= maxMoves.",
      "For each edge [u, v, cnt], let a = max(0, maxMoves - dist[u]), b = max(0, maxMoves - dist[v]); add min(a + b, cnt).",
      "Sum and return.",
    ],
    code: {
      python: `import heapq

def reachable_nodes(edges: list[list[int]], max_moves: int, n: int) -> int:
    adj = [[] for _ in range(n)]
    for u, v, cnt in edges:
        adj[u].append((v, cnt + 1))
        adj[v].append((u, cnt + 1))
    dist = [float("inf")] * n
    dist[0] = 0
    heap = [(0, 0)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue
        for v, w in adj[u]:
            if d + w < dist[v]:
                dist[v] = d + w
                heapq.heappush(heap, (dist[v], v))
    reached = sum(1 for d in dist if d <= max_moves)
    for u, v, cnt in edges:
        a = max(0, max_moves - dist[u]) if dist[u] != float("inf") else 0
        b = max(0, max_moves - dist[v]) if dist[v] != float("inf") else 0
        reached += min(a + b, cnt)
    return reached
`,
      java: `import java.util.*;

class Solution {
    public int reachableNodes(int[][] edges, int maxMoves, int n) {
        List<int[]>[] adj = new List[n];
        for (int i = 0; i < n; i++) adj[i] = new ArrayList<>();
        for (int[] e : edges) {
            adj[e[0]].add(new int[]{e[1], e[2] + 1});
            adj[e[1]].add(new int[]{e[0], e[2] + 1});
        }
        long[] dist = new long[n];
        Arrays.fill(dist, Long.MAX_VALUE);
        dist[0] = 0;
        PriorityQueue<long[]> pq = new PriorityQueue<>((a, b) -> Long.compare(a[0], b[0]));
        pq.add(new long[]{0, 0});
        while (!pq.isEmpty()) {
            long[] top = pq.poll();
            long d = top[0]; int u = (int) top[1];
            if (d > dist[u]) continue;
            for (int[] e : adj[u]) {
                if (d + e[1] < dist[e[0]]) {
                    dist[e[0]] = d + e[1];
                    pq.add(new long[]{dist[e[0]], e[0]});
                }
            }
        }
        int reached = 0;
        for (long d : dist) if (d <= maxMoves) reached++;
        for (int[] e : edges) {
            long a = dist[e[0]] == Long.MAX_VALUE ? 0 : Math.max(0, maxMoves - dist[e[0]]);
            long b = dist[e[1]] == Long.MAX_VALUE ? 0 : Math.max(0, maxMoves - dist[e[1]]);
            reached += (int) Math.min(a + b, e[2]);
        }
        return reached;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
#include <climits>
#include <algorithm>
using namespace std;

class Solution {
public:
    int reachableNodes(vector<vector<int>>& edges, int maxMoves, int n) {
        vector<vector<pair<int,int>>> adj(n);
        for (auto& e : edges) {
            adj[e[0]].push_back({e[1], e[2] + 1});
            adj[e[1]].push_back({e[0], e[2] + 1});
        }
        vector<long long> dist(n, LLONG_MAX);
        dist[0] = 0;
        priority_queue<pair<long long,int>, vector<pair<long long,int>>, greater<>> pq;
        pq.push({0, 0});
        while (!pq.empty()) {
            auto [d, u] = pq.top(); pq.pop();
            if (d > dist[u]) continue;
            for (auto& [v, w] : adj[u]) {
                if (d + w < dist[v]) {
                    dist[v] = d + w;
                    pq.push({dist[v], v});
                }
            }
        }
        int reached = 0;
        for (long long d : dist) if (d <= maxMoves) reached++;
        for (auto& e : edges) {
            long long a = dist[e[0]] == LLONG_MAX ? 0 : max(0LL, (long long)maxMoves - dist[e[0]]);
            long long b = dist[e[1]] == LLONG_MAX ? 0 : max(0LL, (long long)maxMoves - dist[e[1]]);
            reached += (int)min(a + b, (long long)e[2]);
        }
        return reached;
    }
};
`,
    },
    complexity: { time: "O(E log V)", space: "O(V + E)" },
    pitfalls: [
      "Letting the two endpoints' subdivided counts exceed cnt (double counting).",
      "Materializing all subdivided nodes — far too many to store.",
      "Using 32-bit arithmetic for distances that can reach ~10^8.",
    ],
    edgeCases: [
      "maxMoves = 0 (only node 0 reachable).",
      "An edge whose endpoints are both unreachable contributes 0.",
      "cnt = 0 edges behave like ordinary unit edges.",
    ],
    whyItMatters:
      "Combining Dijkstra with a closed-form count over edge interiors avoids expanding an enormous implicit graph — a key scaling technique.",
    estimatedMinutes: 50,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 421 — pure_dsa · trees · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "lowest-common-manager",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Lowest Common Manager of Two Employees",
    framing:
      "An org chart is a binary tree. Given two employees, find their lowest common manager — the deepest node that has both employees somewhere in its subtree.",
    statement:
      "Given the root of a binary tree and two distinct nodes p and q present in the tree, return their lowest common ancestor (LCA): the deepest node that is an ancestor of both p and q (a node is an ancestor of itself).",
    inputFormat: "A binary tree root and two node references p and q.",
    outputFormat: "The LCA node.",
    constraints: [
      "2 <= number of nodes <= 10^5",
      "All node values are unique.",
      "p and q both exist in the tree.",
    ],
    examples: [
      {
        input: "root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1",
        output: "3",
        explanation: "5 and 1 sit in different subtrees of 3.",
      },
      {
        input: "root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 4",
        output: "5",
        explanation: "4 lies in 5's subtree, so 5 is its own-and-ancestor LCA.",
      },
    ],
    approach: [
      "Recurse: the LCA is found where p and q split into different subtrees.",
      "If the current node is null or equals p or q, return it.",
      "Recurse left and right; if both sides return non-null, the current node is the LCA.",
      "Otherwise propagate whichever side is non-null upward.",
    ],
    solutionSteps: [
      "Base case: return null if node is null, or the node if it equals p or q.",
      "Compute left = LCA(node.left), right = LCA(node.right).",
      "If both are non-null, return node.",
      "Else return the non-null child result.",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def lowest_common_ancestor(root: TreeNode, p: TreeNode, q: TreeNode) -> TreeNode:
    if root is None or root is p or root is q:
        return root
    left = lowest_common_ancestor(root.left, p, q)
    right = lowest_common_ancestor(root.right, p, q)
    if left and right:
        return root
    return left if left else right
`,
      java: `class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}

class Solution {
    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        if (root == null || root == p || root == q) return root;
        TreeNode left = lowestCommonAncestor(root.left, p, q);
        TreeNode right = lowestCommonAncestor(root.right, p, q);
        if (left != null && right != null) return root;
        return left != null ? left : right;
    }
}
`,
      cpp: `struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

class Solution {
public:
    TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {
        if (root == nullptr || root == p || root == q) return root;
        TreeNode* left = lowestCommonAncestor(root->left, p, q);
        TreeNode* right = lowestCommonAncestor(root->right, p, q);
        if (left && right) return root;
        return left ? left : right;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(h)" },
    pitfalls: [
      "Comparing values instead of node identity when duplicates could exist.",
      "Returning early before exploring both subtrees.",
      "Assuming p is always above q; either can be the ancestor.",
    ],
    edgeCases: [
      "One node is an ancestor of the other.",
      "p and q are siblings under the root.",
      "A skewed (linked-list-like) tree.",
    ],
    whyItMatters:
      "The split-point recursion is the canonical LCA algorithm and the foundation for ancestor queries, range trees, and hierarchy navigation.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 422 — pure_dsa · trees · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "rebuild-tree-from-traversals",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Reconstruct a Tree From Preorder and Inorder Logs",
    framing:
      "Two traversal logs of a binary tree survived — a preorder log and an inorder log. Rebuild the exact tree structure they came from.",
    statement:
      "Given two integer arrays preorder and inorder representing the preorder and inorder traversals of a binary tree with unique values, construct and return the binary tree.",
    inputFormat: "Two arrays preorder and inorder of the same length.",
    outputFormat: "The root of the reconstructed binary tree.",
    constraints: [
      "1 <= preorder.length <= 3000",
      "inorder is a permutation of preorder.",
      "All values are unique.",
    ],
    examples: [
      {
        input: "preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]",
        output: "[3,9,20,null,null,15,7]",
        explanation: "3 is the root; 9 is its left subtree; 20 with children 15,7 is its right.",
      },
      {
        input: "preorder = [-1], inorder = [-1]",
        output: "[-1]",
        explanation: "A single-node tree.",
      },
    ],
    approach: [
      "The first preorder element is always the current root.",
      "Its position in inorder splits inorder into left and right subtrees.",
      "Recurse using a moving preorder index and inorder boundaries.",
      "A value-to-index map on inorder makes the split O(1).",
    ],
    solutionSteps: [
      "Map each inorder value to its index.",
      "Maintain a global preorder pointer starting at 0.",
      "build(left, right): take root = preorder[ptr++], find its inorder index mid, recurse build(left, mid-1) then build(mid+1, right).",
      "Return the root from build(0, n-1).",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(preorder: list[int], inorder: list[int]) -> TreeNode:
    idx = {v: i for i, v in enumerate(inorder)}
    pre_ptr = 0

    def build(left: int, right: int) -> TreeNode:
        nonlocal pre_ptr
        if left > right:
            return None
        root_val = preorder[pre_ptr]
        pre_ptr += 1
        root = TreeNode(root_val)
        mid = idx[root_val]
        root.left = build(left, mid - 1)
        root.right = build(mid + 1, right)
        return root

    return build(0, len(inorder) - 1)
`,
      java: `import java.util.*;

class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}

class Solution {
    int prePtr = 0;
    Map<Integer, Integer> idx = new HashMap<>();
    int[] preorder;
    public TreeNode buildTree(int[] preorder, int[] inorder) {
        this.preorder = preorder;
        for (int i = 0; i < inorder.length; i++) idx.put(inorder[i], i);
        return build(0, inorder.length - 1);
    }
    private TreeNode build(int left, int right) {
        if (left > right) return null;
        int rootVal = preorder[prePtr++];
        TreeNode root = new TreeNode(rootVal);
        int mid = idx.get(rootVal);
        root.left = build(left, mid - 1);
        root.right = build(mid + 1, right);
        return root;
    }
}
`,
      cpp: `#include <vector>
#include <unordered_map>
using namespace std;

struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

class Solution {
    int prePtr = 0;
    unordered_map<int,int> idx;
    vector<int>* pre;
    TreeNode* build(int left, int right) {
        if (left > right) return nullptr;
        int rootVal = (*pre)[prePtr++];
        TreeNode* root = new TreeNode(rootVal);
        int mid = idx[rootVal];
        root->left = build(left, mid - 1);
        root->right = build(mid + 1, right);
        return root;
    }
public:
    TreeNode* buildTree(vector<int>& preorder, vector<int>& inorder) {
        pre = &preorder;
        for (int i = 0; i < (int)inorder.size(); i++) idx[inorder[i]] = i;
        return build(0, inorder.size() - 1);
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Searching inorder linearly for each root, degrading to O(n^2).",
      "Recursing right before left and desynchronizing the preorder pointer.",
      "Off-by-one errors in the inorder split boundaries.",
    ],
    edgeCases: [
      "A single node.",
      "A fully left- or right-skewed tree.",
      "Negative values handled by the index map.",
    ],
    whyItMatters:
      "Traversal-driven reconstruction tests pointer discipline and is the basis for deserializing trees from compact encodings.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 423 — pure_dsa · trees · medium · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-paths-target-sum",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "trees",
    difficulty: "medium",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Count Downward Paths Summing to a Target",
    framing:
      "In a tree of signed metric deltas, count how many downward paths (parent toward child, not necessarily starting at the root) sum to a target value.",
    statement:
      "Given the root of a binary tree and an integer targetSum, return the number of paths where the sum of node values equals targetSum. Paths must go downward (parent to child) but need not start at the root or end at a leaf.",
    inputFormat: "A binary tree root and an integer targetSum.",
    outputFormat: "An integer: the count of qualifying downward paths.",
    constraints: [
      "0 <= number of nodes <= 1000",
      "-10^9 <= node values, targetSum <= 10^9",
      "Path sums fit in 64-bit integers.",
    ],
    examples: [
      {
        input: "root = [10,5,-3,3,2,null,11,3,-2,null,1], targetSum = 8",
        output: "3",
        explanation: "Three downward paths sum to 8.",
      },
      {
        input: "root = [5,4,8,11,null,13,4,7,2,null,null,5,1], targetSum = 22",
        output: "3",
        explanation: "Three distinct downward paths reach 22.",
      },
    ],
    approach: [
      "Use prefix sums along the root-to-current path, like subarray-sum-equals-k on a tree.",
      "Maintain a hashmap of prefix-sum frequencies seen on the current path.",
      "At each node, the number of valid paths ending here is the count of (currentPrefix - targetSum).",
      "Add the node's prefix, recurse, then backtrack by decrementing it.",
    ],
    solutionSteps: [
      "Initialize a prefix-count map with {0: 1}.",
      "DFS carrying the running prefix; add freq[prefix - targetSum] to the answer.",
      "Increment freq[prefix]; recurse into both children.",
      "Decrement freq[prefix] before returning to undo the path entry.",
    ],
    code: {
      python: `from collections import defaultdict

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def path_sum(root: TreeNode, target_sum: int) -> int:
    freq = defaultdict(int)
    freq[0] = 1
    self_count = [0]

    def dfs(node: TreeNode, prefix: int) -> None:
        if node is None:
            return
        prefix += node.val
        self_count[0] += freq[prefix - target_sum]
        freq[prefix] += 1
        dfs(node.left, prefix)
        dfs(node.right, prefix)
        freq[prefix] -= 1

    dfs(root, 0)
    return self_count[0]
`,
      java: `import java.util.*;

class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}

class Solution {
    Map<Long, Integer> freq = new HashMap<>();
    int count = 0;
    long target;
    public int pathSum(TreeNode root, int targetSum) {
        target = targetSum;
        freq.put(0L, 1);
        dfs(root, 0L);
        return count;
    }
    private void dfs(TreeNode node, long prefix) {
        if (node == null) return;
        prefix += node.val;
        count += freq.getOrDefault(prefix - target, 0);
        freq.merge(prefix, 1, Integer::sum);
        dfs(node.left, prefix);
        dfs(node.right, prefix);
        freq.merge(prefix, -1, Integer::sum);
    }
}
`,
      cpp: `#include <unordered_map>
using namespace std;

struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

class Solution {
    unordered_map<long long,int> freq;
    int count = 0;
    long long target;
    void dfs(TreeNode* node, long long prefix) {
        if (!node) return;
        prefix += node->val;
        auto it = freq.find(prefix - target);
        if (it != freq.end()) count += it->second;
        freq[prefix]++;
        dfs(node->left, prefix);
        dfs(node->right, prefix);
        freq[prefix]--;
    }
public:
    int pathSum(TreeNode* root, int targetSum) {
        target = targetSum;
        freq[0] = 1;
        dfs(root, 0);
        return count;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Forgetting to backtrack the prefix count, leaking sums across sibling subtrees.",
      "Using 32-bit sums that overflow with large values.",
      "Seeding the map without {0: 1}, missing paths that start at the root.",
    ],
    edgeCases: [
      "An empty tree -> 0.",
      "Negative values producing multiple overlapping paths.",
      "A single node equal to the target.",
    ],
    whyItMatters:
      "Prefix-sum-on-a-path generalizes the array prefix-sum trick to trees, a frequently reused interview pattern.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 424 — pure_dsa · trees · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-loot-tree-no-adjacent",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Maximum Value With No Two Adjacent Tree Nodes",
    framing:
      "Each node of a tree carries a value, but selecting a node forbids selecting its direct parent or children. Maximize the total value of the chosen nodes.",
    statement:
      "Given the root of a binary tree where each node holds a non-negative value, return the maximum sum of values you can collect such that no two chosen nodes are directly connected (parent-child).",
    inputFormat: "A binary tree root with integer node values.",
    outputFormat: "An integer: the maximum non-adjacent sum.",
    constraints: [
      "1 <= number of nodes <= 10^4",
      "0 <= node value <= 10^4",
      "The tree may be unbalanced.",
    ],
    examples: [
      {
        input: "root = [3,2,3,null,3,null,1]",
        output: "7",
        explanation: "Pick the root (3) and the two grandchildren (3 + 1) for 7.",
      },
      {
        input: "root = [3,4,5,1,3,null,1]",
        output: "9",
        explanation: "Pick the children 4 and 5 for 9.",
      },
    ],
    approach: [
      "For each node compute two values: max sum including this node, and excluding it.",
      "Including a node forbids including its children, so it sums the children's exclude values.",
      "Excluding a node lets each child contribute its own max(include, exclude).",
      "The answer is max(include, exclude) at the root.",
    ],
    solutionSteps: [
      "DFS returning a pair (rob, skip) for each node.",
      "rob = node.val + left.skip + right.skip.",
      "skip = max(left.rob, left.skip) + max(right.rob, right.skip).",
      "Return max of the root's pair.",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def rob(root: TreeNode) -> int:
    def dfs(node: TreeNode) -> tuple[int, int]:
        if node is None:
            return (0, 0)
        lr, ls = dfs(node.left)
        rr, rs = dfs(node.right)
        rob_here = node.val + ls + rs
        skip_here = max(lr, ls) + max(rr, rs)
        return (rob_here, skip_here)

    return max(dfs(root))
`,
      java: `class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}

class Solution {
    public int rob(TreeNode root) {
        int[] res = dfs(root);
        return Math.max(res[0], res[1]);
    }
    private int[] dfs(TreeNode node) {
        if (node == null) return new int[]{0, 0};
        int[] l = dfs(node.left), r = dfs(node.right);
        int robHere = node.val + l[1] + r[1];
        int skipHere = Math.max(l[0], l[1]) + Math.max(r[0], r[1]);
        return new int[]{robHere, skipHere};
    }
}
`,
      cpp: `#include <algorithm>
#include <utility>
using namespace std;

struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

class Solution {
    pair<int,int> dfs(TreeNode* node) {
        if (!node) return {0, 0};
        auto [lr, ls] = dfs(node->left);
        auto [rr, rs] = dfs(node->right);
        int robHere = node->val + ls + rs;
        int skipHere = max(lr, ls) + max(rr, rs);
        return {robHere, skipHere};
    }
public:
    int rob(TreeNode* root) {
        auto [r, s] = dfs(root);
        return max(r, s);
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(h)" },
    pitfalls: [
      "Memoizing on node value instead of returning both states, causing recomputation or wrong results.",
      "Adding children's rob value when the parent is robbed (violates adjacency).",
      "Forgetting that skipping a node still allows skipping its children.",
    ],
    edgeCases: [
      "A single node (return its value).",
      "A path-shaped tree (reduces to linear house robber).",
      "All-zero values.",
    ],
    whyItMatters:
      "Tree DP returning multiple states per node is the standard generalization of linear DP to hierarchies — used in independent-set and resource-conflict problems.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 425 — pure_dsa · trees · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "nodes-within-k-hops",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "platform_engineer"],
    title: "All Nodes Exactly K Edges From a Target",
    framing:
      "Given a target node in a binary tree, list every node exactly k edges away — including nodes reachable by going up through ancestors and back down other branches.",
    statement:
      "Given the root of a binary tree, a target node, and an integer k, return the values of all nodes that are at distance k from the target (distance counts edges in either direction). The order of the output does not matter.",
    inputFormat: "A binary tree root, a target node reference, and an integer k.",
    outputFormat: "A list of node values at distance exactly k.",
    constraints: [
      "1 <= number of nodes <= 500",
      "0 <= k <= 1000",
      "All node values are unique; target exists in the tree.",
    ],
    examples: [
      {
        input: "root = [3,5,1,6,2,0,8,null,null,7,4], target = 5, k = 2",
        output: "[7,4,1]",
        explanation: "Nodes 7 and 4 are two below 5; node 1 is two away via the root.",
      },
      {
        input: "root = [1], target = 1, k = 3",
        output: "[]",
        explanation: "No node is 3 edges from the only node.",
      },
    ],
    approach: [
      "Add parent pointers by recording each node's parent during a first DFS.",
      "Then BFS from the target through left, right, and parent edges.",
      "Stop expanding once the BFS reaches depth k; those nodes are the answer.",
      "Track visited nodes to avoid walking back.",
    ],
    solutionSteps: [
      "DFS to populate a node->parent map.",
      "BFS from target with a visited set; expand neighbors (left, right, parent).",
      "After k levels, every node currently in the queue is at distance k.",
      "Collect and return their values.",
    ],
    code: {
      python: `from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def distance_k(root: TreeNode, target: TreeNode, k: int) -> list[int]:
    parent = {}

    def set_parents(node, par):
        if node:
            parent[node] = par
            set_parents(node.left, node)
            set_parents(node.right, node)

    set_parents(root, None)
    visited = {target}
    q = deque([target])
    dist = 0
    while q and dist < k:
        for _ in range(len(q)):
            node = q.popleft()
            for nei in (node.left, node.right, parent[node]):
                if nei and nei not in visited:
                    visited.add(nei)
                    q.append(nei)
        dist += 1
    return [node.val for node in q]
`,
      java: `import java.util.*;

class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}

class Solution {
    Map<TreeNode, TreeNode> parent = new HashMap<>();
    public List<Integer> distanceK(TreeNode root, TreeNode target, int k) {
        setParents(root, null);
        Set<TreeNode> visited = new HashSet<>();
        visited.add(target);
        Deque<TreeNode> q = new ArrayDeque<>();
        q.add(target);
        int dist = 0;
        while (!q.isEmpty() && dist < k) {
            int size = q.size();
            for (int i = 0; i < size; i++) {
                TreeNode node = q.poll();
                for (TreeNode nei : new TreeNode[]{node.left, node.right, parent.get(node)}) {
                    if (nei != null && visited.add(nei)) q.add(nei);
                }
            }
            dist++;
        }
        List<Integer> ans = new ArrayList<>();
        for (TreeNode node : q) ans.add(node.val);
        return ans;
    }
    private void setParents(TreeNode node, TreeNode par) {
        if (node == null) return;
        parent.put(node, par);
        setParents(node.left, node);
        setParents(node.right, node);
    }
}
`,
      cpp: `#include <vector>
#include <queue>
#include <unordered_map>
#include <unordered_set>
using namespace std;

struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

class Solution {
    unordered_map<TreeNode*, TreeNode*> parent;
    void setParents(TreeNode* node, TreeNode* par) {
        if (!node) return;
        parent[node] = par;
        setParents(node->left, node);
        setParents(node->right, node);
    }
public:
    vector<int> distanceK(TreeNode* root, TreeNode* target, int k) {
        setParents(root, nullptr);
        unordered_set<TreeNode*> visited{target};
        queue<TreeNode*> q;
        q.push(target);
        int dist = 0;
        while (!q.empty() && dist < k) {
            int size = q.size();
            for (int i = 0; i < size; i++) {
                TreeNode* node = q.front(); q.pop();
                for (TreeNode* nei : {node->left, node->right, parent[node]}) {
                    if (nei && !visited.count(nei)) { visited.insert(nei); q.push(nei); }
                }
            }
            dist++;
        }
        vector<int> ans;
        while (!q.empty()) { ans.push_back(q.front()->val); q.pop(); }
        return ans;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Forgetting the upward (parent) direction, missing nodes above the target.",
      "Revisiting the node you came from and bouncing back and forth.",
      "Returning nodes at distance < k by not stopping exactly at level k.",
    ],
    edgeCases: [
      "k = 0 returns just the target.",
      "k larger than the tree's reach returns empty.",
      "Target at the root (only downward expansion).",
    ],
    whyItMatters:
      "Turning a tree into an undirected graph with parent links to run BFS is a versatile technique for radius and blast-radius queries.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 426 — pure_dsa · trees · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "prune-tree-into-forest",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "software_engineer"],
    title: "Delete Nodes and Return the Resulting Forest",
    framing:
      "Decommissioning certain nodes in a tree splits it into a forest. Delete every node whose id is in a removal set and return the roots of all remaining trees.",
    statement:
      "Given the root of a binary tree with distinct values and a list to_delete of values to remove, delete those nodes. The result is a forest of disjoint trees; return their roots in any order.",
    inputFormat: "A binary tree root and a list to_delete of values.",
    outputFormat: "A list of remaining tree roots.",
    constraints: [
      "1 <= number of nodes <= 1000",
      "Each node has a distinct value in [1, 1000].",
      "to_delete contains distinct values.",
    ],
    examples: [
      {
        input: "root = [1,2,3,4,5,6,7], to_delete = [3,5]",
        output: "[[1,2,null,4],[6],[7]]",
        explanation: "Deleting 3 and 5 leaves three trees rooted at 1, 6, and 7.",
      },
      {
        input: "root = [1,2,4,null,3], to_delete = [3]",
        output: "[[1,2,4]]",
        explanation: "Deleting leaf 3 leaves one tree.",
      },
    ],
    approach: [
      "DFS post-order while passing down whether the current node's parent still exists.",
      "A node becomes a new root if its parent was deleted and the node itself survives.",
      "When a node is deleted, its surviving children become potential new roots.",
      "Return the collected roots, including the original root if not deleted.",
    ],
    solutionSteps: [
      "Put to_delete into a set.",
      "DFS(node, isRoot): if node is null return null.",
      "deleted = node.val in set; if !deleted and isRoot, add node to results.",
      "node.left = DFS(node.left, deleted); node.right = DFS(node.right, deleted); return null if deleted else node.",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def del_nodes(root: TreeNode, to_delete: list[int]) -> list[TreeNode]:
    targets = set(to_delete)
    forest = []

    def dfs(node: TreeNode, is_root: bool) -> TreeNode:
        if node is None:
            return None
        deleted = node.val in targets
        if not deleted and is_root:
            forest.append(node)
        node.left = dfs(node.left, deleted)
        node.right = dfs(node.right, deleted)
        return None if deleted else node

    dfs(root, True)
    return forest
`,
      java: `import java.util.*;

class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}

class Solution {
    Set<Integer> targets = new HashSet<>();
    List<TreeNode> forest = new ArrayList<>();
    public List<TreeNode> delNodes(TreeNode root, int[] to_delete) {
        for (int v : to_delete) targets.add(v);
        dfs(root, true);
        return forest;
    }
    private TreeNode dfs(TreeNode node, boolean isRoot) {
        if (node == null) return null;
        boolean deleted = targets.contains(node.val);
        if (!deleted && isRoot) forest.add(node);
        node.left = dfs(node.left, deleted);
        node.right = dfs(node.right, deleted);
        return deleted ? null : node;
    }
}
`,
      cpp: `#include <vector>
#include <unordered_set>
using namespace std;

struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

class Solution {
    unordered_set<int> targets;
    vector<TreeNode*> forest;
    TreeNode* dfs(TreeNode* node, bool isRoot) {
        if (!node) return nullptr;
        bool deleted = targets.count(node->val);
        if (!deleted && isRoot) forest.push_back(node);
        node->left = dfs(node->left, deleted);
        node->right = dfs(node->right, deleted);
        return deleted ? nullptr : node;
    }
public:
    vector<TreeNode*> delNodes(TreeNode* root, vector<int>& to_delete) {
        for (int v : to_delete) targets.insert(v);
        dfs(root, true);
        return forest;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Adding a surviving child as a new root before confirming its parent was deleted.",
      "Forgetting to null out a deleted child link, leaving dangling references.",
      "Not treating the original root as a candidate root.",
    ],
    edgeCases: [
      "Deleting the root.",
      "Deleting all nodes (empty forest).",
      "to_delete containing values absent from the tree.",
    ],
    whyItMatters:
      "Post-order rewiring with a root-status flag is the model for partitioning a hierarchy after removing internal nodes.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 427 — pure_dsa · trees · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "kth-smallest-pricing-node",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer"],
    title: "Kth Smallest Value in a Pricing BST",
    framing:
      "Price tiers are stored in a binary search tree. Find the k-th lowest price without flattening the whole tree.",
    statement:
      "Given the root of a binary search tree and an integer k, return the k-th smallest value (1-indexed) among all node values.",
    inputFormat: "A BST root and an integer k.",
    outputFormat: "An integer: the k-th smallest value.",
    constraints: [
      "1 <= k <= number of nodes <= 10^4",
      "0 <= node value <= 10^9",
      "The tree satisfies the BST property.",
    ],
    examples: [
      {
        input: "root = [3,1,4,null,2], k = 1",
        output: "1",
        explanation: "The smallest value is 1.",
      },
      {
        input: "root = [5,3,6,2,4,null,null,1], k = 3",
        output: "3",
        explanation: "In-order order is 1,2,3,4,5,6; the third is 3.",
      },
    ],
    approach: [
      "An in-order traversal of a BST visits values in ascending order.",
      "Walk in-order and count; the k-th visited node is the answer.",
      "An iterative stack-based in-order lets you stop early once k nodes are seen.",
      "No need to materialize the entire sorted list.",
    ],
    solutionSteps: [
      "Push left spine onto a stack from the root.",
      "Pop a node, decrement k; if k hits 0 return its value.",
      "Push the left spine of the popped node's right child.",
      "Continue until k is exhausted.",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def kth_smallest(root: TreeNode, k: int) -> int:
    stack = []
    node = root
    while stack or node:
        while node:
            stack.append(node)
            node = node.left
        node = stack.pop()
        k -= 1
        if k == 0:
            return node.val
        node = node.right
    return -1
`,
      java: `import java.util.*;

class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}

class Solution {
    public int kthSmallest(TreeNode root, int k) {
        Deque<TreeNode> stack = new ArrayDeque<>();
        TreeNode node = root;
        while (!stack.isEmpty() || node != null) {
            while (node != null) { stack.push(node); node = node.left; }
            node = stack.pop();
            if (--k == 0) return node.val;
            node = node.right;
        }
        return -1;
    }
}
`,
      cpp: `#include <stack>
using namespace std;

struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

class Solution {
public:
    int kthSmallest(TreeNode* root, int k) {
        stack<TreeNode*> st;
        TreeNode* node = root;
        while (!st.empty() || node) {
            while (node) { st.push(node); node = node->left; }
            node = st.top(); st.pop();
            if (--k == 0) return node->val;
            node = node->right;
        }
        return -1;
    }
};
`,
    },
    complexity: { time: "O(h + k)", space: "O(h)" },
    pitfalls: [
      "Traversing in pre-order or post-order, which is not sorted.",
      "Collecting all values then indexing — wasteful when k is small.",
      "Decrementing k at the wrong point and returning a neighbor.",
    ],
    edgeCases: [
      "k = 1 (the minimum).",
      "k equal to the node count (the maximum).",
      "A skewed BST behaving like a sorted list.",
    ],
    whyItMatters:
      "Iterative in-order with early termination is the canonical BST order-statistic query, extensible to augmented subtree-size indexing.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 428 — pure_dsa · trees · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "longest-same-label-path",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Longest Path of Equal-Valued Nodes",
    framing:
      "Find the longest path in a tree along which every node shares the same value (label). The path may bend through a node, joining one branch to another.",
    statement:
      "Given the root of a binary tree, return the length of the longest path where all nodes have the same value. The length is the number of edges on the path; the path need not pass through the root.",
    inputFormat: "A binary tree root with integer node values.",
    outputFormat: "An integer: the longest equal-value path length in edges.",
    constraints: [
      "0 <= number of nodes <= 10^4",
      "-1000 <= node value <= 1000",
      "Tree depth fits the recursion stack.",
    ],
    examples: [
      {
        input: "root = [5,4,5,1,1,null,5]",
        output: "2",
        explanation: "The path 5 -> 5 -> 5 through the root has length 2.",
      },
      {
        input: "root = [1,4,5,4,4,null,5]",
        output: "2",
        explanation: "The path 4 -> 4 -> 4 has length 2.",
      },
    ],
    approach: [
      "DFS returns the longest equal-value arm extending downward from each node.",
      "A child arm contributes only if the child shares the node's value.",
      "At each node, the best bent path is left arm + right arm (both matching).",
      "Track a global maximum of these bent lengths.",
    ],
    solutionSteps: [
      "DFS(node) returns the longest matching downward arm from node.",
      "Compute left and right arm lengths from children; zero them out if values differ.",
      "Update the global answer with leftArm + rightArm.",
      "Return 1 + max(leftArm, rightArm) to the parent.",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def longest_univalue_path(root: TreeNode) -> int:
    best = [0]

    def dfs(node: TreeNode) -> int:
        if node is None:
            return 0
        left = dfs(node.left)
        right = dfs(node.right)
        left_arm = left + 1 if node.left and node.left.val == node.val else 0
        right_arm = right + 1 if node.right and node.right.val == node.val else 0
        best[0] = max(best[0], left_arm + right_arm)
        return max(left_arm, right_arm)

    dfs(root)
    return best[0]
`,
      java: `class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}

class Solution {
    int best = 0;
    public int longestUnivaluePath(TreeNode root) {
        dfs(root);
        return best;
    }
    private int dfs(TreeNode node) {
        if (node == null) return 0;
        int left = dfs(node.left), right = dfs(node.right);
        int leftArm = (node.left != null && node.left.val == node.val) ? left + 1 : 0;
        int rightArm = (node.right != null && node.right.val == node.val) ? right + 1 : 0;
        best = Math.max(best, leftArm + rightArm);
        return Math.max(leftArm, rightArm);
    }
}
`,
      cpp: `#include <algorithm>
using namespace std;

struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

class Solution {
    int best = 0;
    int dfs(TreeNode* node) {
        if (!node) return 0;
        int left = dfs(node->left), right = dfs(node->right);
        int leftArm = (node->left && node->left->val == node->val) ? left + 1 : 0;
        int rightArm = (node->right && node->right->val == node->val) ? right + 1 : 0;
        best = max(best, leftArm + rightArm);
        return max(leftArm, rightArm);
    }
public:
    int longestUnivaluePath(TreeNode* root) {
        dfs(root);
        return best;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(h)" },
    pitfalls: [
      "Returning the bent length to the parent instead of a single arm.",
      "Counting nodes rather than edges (off by one).",
      "Adding a child arm without checking the value match.",
    ],
    edgeCases: [
      "An empty tree -> 0.",
      "All nodes equal (the diameter).",
      "All nodes distinct -> 0.",
    ],
    whyItMatters:
      "The 'return one arm, combine two at the node' pattern is the diameter template adapted with a constraint — a reusable tree-DP shape.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 429 — pure_dsa · trees · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-ancestor-descendant-gap",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Largest Value Gap Between a Node and an Ancestor",
    framing:
      "Across a tree of metric values, find the maximum absolute difference between any node and one of its ancestors.",
    statement:
      "Given the root of a binary tree, return the maximum value v for which there exist nodes a (an ancestor) and b (a descendant) with v = |a.val - b.val|.",
    inputFormat: "A binary tree root with integer node values.",
    outputFormat: "An integer: the maximum ancestor-descendant absolute difference.",
    constraints: [
      "2 <= number of nodes <= 5000",
      "0 <= node value <= 10^5",
      "The tree has at least one ancestor-descendant pair.",
    ],
    examples: [
      {
        input: "root = [8,3,10,1,6,null,14,null,null,4,7,13]",
        output: "7",
        explanation: "|8 - 1| = 7 is the largest gap along a root-to-leaf chain.",
      },
      {
        input: "root = [1,null,2,null,0,3]",
        output: "3",
        explanation: "|3 - 0| and |3 - 0| paths give a maximum gap of 3.",
      },
    ],
    approach: [
      "Carry the min and max values seen on the path from the root to the current node.",
      "At each node the best gap involving it and an ancestor is max(|node - pathMin|, |node - pathMax|).",
      "Update the min/max as you descend and recurse.",
      "Equivalently, return max - min once a leaf is reached.",
    ],
    solutionSteps: [
      "DFS(node, curMin, curMax).",
      "On a null node, return curMax - curMin.",
      "Update curMin and curMax with node.val, then recurse into both children.",
      "Return the larger of the two child results.",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def max_ancestor_diff(root: TreeNode) -> int:
    def dfs(node: TreeNode, cur_min: int, cur_max: int) -> int:
        if node is None:
            return cur_max - cur_min
        cur_min = min(cur_min, node.val)
        cur_max = max(cur_max, node.val)
        left = dfs(node.left, cur_min, cur_max)
        right = dfs(node.right, cur_min, cur_max)
        return max(left, right)

    return dfs(root, root.val, root.val)
`,
      java: `class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}

class Solution {
    public int maxAncestorDiff(TreeNode root) {
        return dfs(root, root.val, root.val);
    }
    private int dfs(TreeNode node, int curMin, int curMax) {
        if (node == null) return curMax - curMin;
        curMin = Math.min(curMin, node.val);
        curMax = Math.max(curMax, node.val);
        return Math.max(dfs(node.left, curMin, curMax), dfs(node.right, curMin, curMax));
    }
}
`,
      cpp: `#include <algorithm>
using namespace std;

struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

class Solution {
    int dfs(TreeNode* node, int curMin, int curMax) {
        if (!node) return curMax - curMin;
        curMin = min(curMin, node->val);
        curMax = max(curMax, node->val);
        return max(dfs(node->left, curMin, curMax), dfs(node->right, curMin, curMax));
    }
public:
    int maxAncestorDiff(TreeNode* root) {
        return dfs(root, root->val, root->val);
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(h)" },
    pitfalls: [
      "Comparing across unrelated nodes rather than ancestor-descendant pairs.",
      "Initializing min/max to sentinels instead of the root value.",
      "Updating the global answer only at leaves but forgetting interior contributions (the leaf return naturally captures them).",
    ],
    edgeCases: [
      "A two-node tree.",
      "Monotonic increasing path (gap is the endpoints).",
      "Equal values along a path (gap 0 there).",
    ],
    whyItMatters:
      "Threading path-aggregates (running min/max) down a recursion is a clean alternative to maintaining explicit ancestor stacks.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 430 — pure_dsa · binary_search · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "longest-rising-subsequence",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "binary_search",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Longest Strictly Increasing Metric Subsequence",
    framing:
      "From a stream of metric readings, find the length of the longest strictly increasing subsequence — the longest run of improving values that need not be contiguous.",
    statement:
      "Given an integer array nums, return the length of the longest strictly increasing subsequence.",
    inputFormat: "An integer array nums.",
    outputFormat: "An integer: the length of the longest increasing subsequence.",
    constraints: [
      "1 <= nums.length <= 2500",
      "-10^4 <= nums[i] <= 10^4",
      "The subsequence need not be contiguous.",
    ],
    examples: [
      {
        input: "nums = [10,9,2,5,3,7,101,18]",
        output: "4",
        explanation: "[2,3,7,18] (or [2,3,7,101]) has length 4.",
      },
      {
        input: "nums = [7,7,7,7,7]",
        output: "1",
        explanation: "Strictly increasing, so only a single 7 counts.",
      },
    ],
    approach: [
      "Maintain tails[i] = the smallest possible tail of an increasing subsequence of length i+1.",
      "For each value, binary-search the first tail >= value and replace it (or append if larger than all).",
      "tails stays sorted, so the search is O(log n).",
      "The length of tails is the answer.",
    ],
    solutionSteps: [
      "Initialize an empty tails array.",
      "For each num, use lower_bound to find its insertion point in tails.",
      "If at the end, append; otherwise overwrite that position.",
      "Return tails.length.",
    ],
    code: {
      python: `from bisect import bisect_left

def length_of_lis(nums: list[int]) -> int:
    tails = []
    for num in nums:
        pos = bisect_left(tails, num)
        if pos == len(tails):
            tails.append(num)
        else:
            tails[pos] = num
    return len(tails)
`,
      java: `class Solution {
    public int lengthOfLIS(int[] nums) {
        int[] tails = new int[nums.length];
        int size = 0;
        for (int num : nums) {
            int lo = 0, hi = size;
            while (lo < hi) {
                int mid = (lo + hi) >>> 1;
                if (tails[mid] < num) lo = mid + 1;
                else hi = mid;
            }
            tails[lo] = num;
            if (lo == size) size++;
        }
        return size;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int lengthOfLIS(vector<int>& nums) {
        vector<int> tails;
        for (int num : nums) {
            auto it = lower_bound(tails.begin(), tails.end(), num);
            if (it == tails.end()) tails.push_back(num);
            else *it = num;
        }
        return tails.size();
    }
};
`,
    },
    complexity: { time: "O(n log n)", space: "O(n)" },
    pitfalls: [
      "Using upper_bound, which would allow equal values and compute the longest non-decreasing subsequence.",
      "Treating tails as the actual subsequence — it is not, only its length is meaningful.",
      "Falling back to the O(n^2) DP when n is large.",
    ],
    edgeCases: [
      "A strictly decreasing array -> 1.",
      "An already sorted array -> n.",
      "All equal elements -> 1.",
    ],
    whyItMatters:
      "Patience-sorting LIS is a foundational O(n log n) technique that reappears in box stacking, scheduling, and diff algorithms.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 431 — pure_dsa · dp_1d · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-longest-rising-runs",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Number of Longest Increasing Subsequences",
    framing:
      "Beyond the length of the longest increasing run of readings, count how many distinct longest increasing subsequences exist.",
    statement:
      "Given an integer array nums, return the number of longest strictly increasing subsequences. Two subsequences are different if they pick different index sets.",
    inputFormat: "An integer array nums.",
    outputFormat: "An integer: the count of longest increasing subsequences.",
    constraints: [
      "1 <= nums.length <= 2000",
      "-10^6 <= nums[i] <= 10^6",
      "The answer fits in a 32-bit integer.",
    ],
    examples: [
      {
        input: "nums = [1,3,5,4,7]",
        output: "2",
        explanation: "Both [1,3,4,7] and [1,3,5,7] have the maximum length 4.",
      },
      {
        input: "nums = [2,2,2,2,2]",
        output: "5",
        explanation: "The longest length is 1, achieved by each of the five elements.",
      },
    ],
    approach: [
      "Track two arrays: length[i] = LIS length ending at i, and count[i] = number of such LIS.",
      "For j < i with nums[j] < nums[i]: if length[j] + 1 > length[i], reset length and count; if equal, add count[j].",
      "The answer sums count[i] over all i achieving the global max length.",
      "This is the O(n^2) DP that also yields counts.",
    ],
    solutionSteps: [
      "Initialize length and count to 1 for every index.",
      "For each i, scan all j < i; extend or tie as above.",
      "Find the maximum length over all indices.",
      "Sum count[i] where length[i] equals that maximum.",
    ],
    code: {
      python: `def find_number_of_lis(nums: list[int]) -> int:
    n = len(nums)
    if n == 0:
        return 0
    length = [1] * n
    count = [1] * n
    for i in range(n):
        for j in range(i):
            if nums[j] < nums[i]:
                if length[j] + 1 > length[i]:
                    length[i] = length[j] + 1
                    count[i] = count[j]
                elif length[j] + 1 == length[i]:
                    count[i] += count[j]
    longest = max(length)
    return sum(c for l, c in zip(length, count) if l == longest)
`,
      java: `class Solution {
    public int findNumberOfLIS(int[] nums) {
        int n = nums.length;
        int[] length = new int[n], count = new int[n];
        java.util.Arrays.fill(length, 1);
        java.util.Arrays.fill(count, 1);
        int longest = 0;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < i; j++) {
                if (nums[j] < nums[i]) {
                    if (length[j] + 1 > length[i]) {
                        length[i] = length[j] + 1;
                        count[i] = count[j];
                    } else if (length[j] + 1 == length[i]) {
                        count[i] += count[j];
                    }
                }
            }
            longest = Math.max(longest, length[i]);
        }
        int total = 0;
        for (int i = 0; i < n; i++) if (length[i] == longest) total += count[i];
        return total;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int findNumberOfLIS(vector<int>& nums) {
        int n = nums.size();
        vector<int> length(n, 1), count(n, 1);
        int longest = 0;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < i; j++) {
                if (nums[j] < nums[i]) {
                    if (length[j] + 1 > length[i]) {
                        length[i] = length[j] + 1;
                        count[i] = count[j];
                    } else if (length[j] + 1 == length[i]) {
                        count[i] += count[j];
                    }
                }
            }
            longest = max(longest, length[i]);
        }
        int total = 0;
        for (int i = 0; i < n; i++) if (length[i] == longest) total += count[i];
        return total;
    }
};
`,
    },
    complexity: { time: "O(n^2)", space: "O(n)" },
    pitfalls: [
      "Overwriting count[i] when a strictly longer chain is found but forgetting to reset, or adding when you should reset.",
      "Summing counts over indices that do not reach the global max length.",
      "Mixing strict and non-strict comparisons.",
    ],
    edgeCases: [
      "All equal values (count equals n).",
      "A strictly increasing array (count 1).",
      "A single element.",
    ],
    whyItMatters:
      "Augmenting a DP with a parallel count array is the standard way to enumerate, not just measure, optimal structures.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 432 — pure_dsa · dp_1d · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "trade-with-cooldown-profit",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer"],
    title: "Maximum Profit With a One-Day Cooldown",
    framing:
      "You may buy and sell a single asset repeatedly, but after each sale you must sit out one day before buying again. Maximize total profit over a price series.",
    statement:
      "Given an array prices where prices[i] is the price on day i, return the maximum profit. You may complete as many transactions as you like (buy then sell), but you cannot buy on the day immediately after a sell, and you cannot hold more than one unit at a time.",
    inputFormat: "An integer array prices.",
    outputFormat: "An integer: the maximum achievable profit.",
    constraints: [
      "1 <= prices.length <= 5000",
      "0 <= prices[i] <= 1000",
      "One unit held at a time.",
    ],
    examples: [
      {
        input: "prices = [1,2,3,0,2]",
        output: "3",
        explanation: "buy 1, sell 3 (profit 2), cooldown, buy 0, sell 2 (profit 1) -> 3.",
      },
      {
        input: "prices = [1]",
        output: "0",
        explanation: "No transaction is possible.",
      },
    ],
    approach: [
      "Track three states per day: hold (own a unit), sold (just sold today), rest (idle, free to buy).",
      "hold = max(prev hold, prev rest - price): keep holding or buy after a rest.",
      "sold = prev hold + price: sell what you held.",
      "rest = max(prev rest, prev sold): stay idle or finish a cooldown.",
    ],
    solutionSteps: [
      "Initialize hold = -infinity, sold = 0, rest = 0.",
      "For each price, compute new states from the previous ones in the right order.",
      "Use temporaries so each update reads the prior day's values.",
      "Return max(sold, rest) at the end.",
    ],
    code: {
      python: `def max_profit(prices: list[int]) -> int:
    hold = float("-inf")
    sold = 0
    rest = 0
    for price in prices:
        prev_sold = sold
        sold = hold + price
        hold = max(hold, rest - price)
        rest = max(rest, prev_sold)
    return max(sold, rest)
`,
      java: `class Solution {
    public int maxProfit(int[] prices) {
        int hold = Integer.MIN_VALUE, sold = 0, rest = 0;
        for (int price : prices) {
            int prevSold = sold;
            sold = hold + price;
            hold = Math.max(hold, rest - price);
            rest = Math.max(rest, prevSold);
        }
        return Math.max(sold, rest);
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
#include <climits>
using namespace std;

class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int hold = INT_MIN, sold = 0, rest = 0;
        for (int price : prices) {
            int prevSold = sold;
            sold = hold + price;
            hold = max(hold, rest - price);
            rest = max(rest, prevSold);
        }
        return max(sold, rest);
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Updating states out of order so a same-day update leaks into another.",
      "Allowing a buy on the day right after a sell (skipping the cooldown).",
      "Starting hold at 0 instead of -infinity, implying a free initial position.",
    ],
    edgeCases: [
      "A single day (0 profit).",
      "Monotonically decreasing prices (0 profit).",
      "Flat prices (0 profit).",
    ],
    whyItMatters:
      "State-machine DP cleanly encodes trading rules with constraints — the same shape models any 'action with refractory period' process.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 433 — pure_dsa · dp_1d · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-circular-window-sum",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer"],
    title: "Maximum Subarray Sum on a Circular Buffer",
    framing:
      "Readings are stored in a circular ring buffer, so a contiguous window may wrap from the end back to the start. Find the maximum sum of any non-empty contiguous window.",
    statement:
      "Given a circular integer array nums, return the maximum possible sum of a non-empty subarray. A circular subarray may wrap from the end to the beginning, but no element is used more than once.",
    inputFormat: "An integer array nums interpreted circularly.",
    outputFormat: "An integer: the maximum circular subarray sum.",
    constraints: [
      "1 <= nums.length <= 3*10^4",
      "-3*10^4 <= nums[i] <= 3*10^4",
      "The subarray must be non-empty.",
    ],
    examples: [
      {
        input: "nums = [1,-2,3,-2]",
        output: "3",
        explanation: "The best window is [3].",
      },
      {
        input: "nums = [5,-3,5]",
        output: "10",
        explanation: "Wrapping window [5,5] sums to 10.",
      },
    ],
    approach: [
      "The answer is either a non-wrapping max subarray (standard Kadane) or a wrapping one.",
      "A wrapping max equals total sum minus the minimum subarray (Kadane for the minimum).",
      "Take max(maxKadane, total - minKadane).",
      "Guard the all-negative case: if maxKadane < 0, the wrapping formula degenerates, so return maxKadane.",
    ],
    solutionSteps: [
      "Run Kadane to get the maximum subarray sum and the minimum subarray sum, plus the total.",
      "Compute candidate = total - minSum for the wrapping case.",
      "If maxSum < 0 (all negatives), return maxSum.",
      "Otherwise return max(maxSum, candidate).",
    ],
    code: {
      python: `def max_subarray_sum_circular(nums: list[int]) -> int:
    total = 0
    cur_max = best_max = nums[0]
    cur_min = best_min = nums[0]
    for i, num in enumerate(nums):
        total += num
        if i == 0:
            continue
        cur_max = max(num, cur_max + num)
        best_max = max(best_max, cur_max)
        cur_min = min(num, cur_min + num)
        best_min = min(best_min, cur_min)
    if best_max < 0:
        return best_max
    return max(best_max, total - best_min)
`,
      java: `class Solution {
    public int maxSubarraySumCircular(int[] nums) {
        int total = nums[0];
        int curMax = nums[0], bestMax = nums[0];
        int curMin = nums[0], bestMin = nums[0];
        for (int i = 1; i < nums.length; i++) {
            int num = nums[i];
            total += num;
            curMax = Math.max(num, curMax + num);
            bestMax = Math.max(bestMax, curMax);
            curMin = Math.min(num, curMin + num);
            bestMin = Math.min(bestMin, curMin);
        }
        if (bestMax < 0) return bestMax;
        return Math.max(bestMax, total - bestMin);
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int maxSubarraySumCircular(vector<int>& nums) {
        int total = nums[0];
        int curMax = nums[0], bestMax = nums[0];
        int curMin = nums[0], bestMin = nums[0];
        for (int i = 1; i < (int)nums.size(); i++) {
            int num = nums[i];
            total += num;
            curMax = max(num, curMax + num);
            bestMax = max(bestMax, curMax);
            curMin = min(num, curMin + num);
            bestMin = min(bestMin, curMin);
        }
        if (bestMax < 0) return bestMax;
        return max(bestMax, total - bestMin);
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Returning total - minSum when all numbers are negative (it would yield an empty subarray).",
      "Double counting elements when the wrap and non-wrap windows overlap.",
      "Initializing the running sums incorrectly on the first element.",
    ],
    edgeCases: [
      "All negative numbers (answer is the largest single element).",
      "A single element.",
      "No wrap needed (standard Kadane wins).",
    ],
    whyItMatters:
      "The 'total minus minimum' trick for circular structures is a clever complement to Kadane, applicable to ring buffers and cyclic schedules.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 434 — pure_dsa · dp_1d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-loot-circular-street",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Maximum Non-Adjacent Sum on a Circular Street",
    framing:
      "Houses are arranged in a circle, so the first and last are adjacent. You cannot pick two adjacent houses. Maximize the total value collected.",
    statement:
      "Given an integer array nums where nums[i] is the value at house i and houses form a circle (house 0 is adjacent to house n-1), return the maximum sum obtainable without choosing two adjacent houses.",
    inputFormat: "An integer array nums of house values arranged circularly.",
    outputFormat: "An integer: the maximum non-adjacent circular sum.",
    constraints: [
      "1 <= nums.length <= 100",
      "0 <= nums[i] <= 1000",
      "Houses 0 and n-1 are adjacent.",
    ],
    examples: [
      {
        input: "nums = [2,3,2]",
        output: "3",
        explanation: "You cannot take both house 0 and house 2; the best single choice is 3.",
      },
      {
        input: "nums = [1,2,3,1]",
        output: "4",
        explanation: "Take houses 0 and 2 (1 + 3 = 4).",
      },
    ],
    approach: [
      "The circular constraint means house 0 and house n-1 cannot both be chosen.",
      "Solve two linear house-robber subproblems: indices [0..n-2] and [1..n-1].",
      "Each linear case uses the standard take/skip rolling DP.",
      "Return the larger of the two results; handle n == 1 directly.",
    ],
    solutionSteps: [
      "If there is one house, return its value.",
      "Define rob_linear(lo, hi) computing the linear max non-adjacent sum.",
      "Compute rob_linear(0, n-2) and rob_linear(1, n-1).",
      "Return the maximum of the two.",
    ],
    code: {
      python: `def rob(nums: list[int]) -> int:
    n = len(nums)
    if n == 1:
        return nums[0]

    def rob_linear(lo: int, hi: int) -> int:
        take, skip = 0, 0
        for i in range(lo, hi + 1):
            take, skip = skip + nums[i], max(take, skip)
        return max(take, skip)

    return max(rob_linear(0, n - 2), rob_linear(1, n - 1))
`,
      java: `class Solution {
    public int rob(int[] nums) {
        int n = nums.length;
        if (n == 1) return nums[0];
        return Math.max(robLinear(nums, 0, n - 2), robLinear(nums, 1, n - 1));
    }
    private int robLinear(int[] nums, int lo, int hi) {
        int take = 0, skip = 0;
        for (int i = lo; i <= hi; i++) {
            int newTake = skip + nums[i];
            skip = Math.max(take, skip);
            take = newTake;
        }
        return Math.max(take, skip);
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
    int robLinear(vector<int>& nums, int lo, int hi) {
        int take = 0, skip = 0;
        for (int i = lo; i <= hi; i++) {
            int newTake = skip + nums[i];
            skip = max(take, skip);
            take = newTake;
        }
        return max(take, skip);
    }
public:
    int rob(vector<int>& nums) {
        int n = nums.size();
        if (n == 1) return nums[0];
        return max(robLinear(nums, 0, n - 2), robLinear(nums, 1, n - 1));
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Forgetting the n == 1 base case (both ranges would be empty or invalid).",
      "Including both endpoints in one pass, violating the circular adjacency.",
      "Mixing up take/skip update order so the new take reads the updated skip.",
    ],
    edgeCases: [
      "A single house.",
      "Two houses (pick the larger).",
      "All equal values.",
    ],
    whyItMatters:
      "Splitting a circular constraint into two linear cases is a broadly reusable reduction for ring-structured optimization.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 435 — pure_dsa · dp_1d · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-product-partition",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "dp_1d",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Break an Integer to Maximize the Product of Its Parts",
    framing:
      "Split a capacity n into a sum of at least two positive integers so that the product of those parts is as large as possible.",
    statement:
      "Given an integer n, break it into the sum of k positive integers with k >= 2, and maximize the product of those integers. Return the maximum product obtainable.",
    inputFormat: "A single integer n.",
    outputFormat: "An integer: the maximum product of the parts.",
    constraints: [
      "2 <= n <= 58",
      "At least two parts are required.",
      "Parts are positive integers.",
    ],
    examples: [
      {
        input: "n = 2",
        output: "1",
        explanation: "2 = 1 + 1, product 1.",
      },
      {
        input: "n = 10",
        output: "36",
        explanation: "10 = 3 + 3 + 4, product 36.",
      },
    ],
    approach: [
      "DP: dp[i] = the maximum product obtainable from breaking i (forcing at least one cut).",
      "For each i, try a first part j from 1..i-1; the rest is either j alone (i-j) or further broken dp[i-j].",
      "dp[i] = max over j of j * max(i - j, dp[i - j]).",
      "Return dp[n].",
    ],
    solutionSteps: [
      "Initialize dp[2] = 1.",
      "For i from 3 to n, iterate j from 1 to i-1 and update dp[i].",
      "Use max(i - j, dp[i - j]) to decide whether to break the remainder further.",
      "Return dp[n].",
    ],
    code: {
      python: `def integer_break(n: int) -> int:
    dp = [0] * (n + 1)
    dp[1] = 1
    for i in range(2, n + 1):
        for j in range(1, i):
            dp[i] = max(dp[i], j * max(i - j, dp[i - j]))
    return dp[n]
`,
      java: `class Solution {
    public int integerBreak(int n) {
        int[] dp = new int[n + 1];
        dp[1] = 1;
        for (int i = 2; i <= n; i++)
            for (int j = 1; j < i; j++)
                dp[i] = Math.max(dp[i], j * Math.max(i - j, dp[i - j]));
        return dp[n];
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int integerBreak(int n) {
        vector<int> dp(n + 1, 0);
        dp[1] = 1;
        for (int i = 2; i <= n; i++)
            for (int j = 1; j < i; j++)
                dp[i] = max(dp[i], j * max(i - j, dp[i - j]));
        return dp[n];
    }
};
`,
    },
    complexity: { time: "O(n^2)", space: "O(n)" },
    pitfalls: [
      "Forgetting that n itself must be broken (dp[n] should not equal n).",
      "Omitting the max(i - j, dp[i - j]) choice and always breaking the remainder.",
      "Off-by-one in the dp base cases.",
    ],
    edgeCases: [
      "n = 2 -> 1.",
      "n = 3 -> 2 (1 + 2).",
      "Larger n favoring factors of 3.",
    ],
    whyItMatters:
      "This classic DP (with a known 'prefer 3s' greedy) illustrates building optima from subproblem optima — and the math behind it.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 436 — pure_dsa · dp_1d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-cost-paint-walls",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "platform_engineer"],
    title: "Cheapest Way to Paint Every Wall With a Paid and a Free Painter",
    framing:
      "A paid painter charges a cost and takes a set time per wall; a free painter is free but takes one unit of time per wall and may work only while the paid painter is busy. Paint all walls at minimum total cost.",
    statement:
      "Given arrays cost and time of length n where painting wall i with the paid painter costs cost[i] and takes time[i] units, and a free painter paints any wall in 1 unit but can only be used while the paid painter is occupied, return the minimum total cost to paint all n walls.",
    inputFormat: "Two arrays cost and time of equal length n.",
    outputFormat: "An integer: the minimum total cost.",
    constraints: [
      "1 <= n <= 500",
      "1 <= cost[i] <= 10^6, 1 <= time[i] <= 500",
      "The free painter needs the paid painter to be busy.",
    ],
    examples: [
      {
        input: "cost = [1,2,3,2], time = [1,2,3,2]",
        output: "3",
        explanation: "Pay for walls 0 and 1 (cost 3, time 3); the free painter covers the other two.",
      },
      {
        input: "cost = [2,3,4,2], time = [1,1,1,1]",
        output: "4",
        explanation: "Pay for walls 0 and 3 (cost 4); the free painter handles two walls in the 2 time units.",
      },
    ],
    approach: [
      "Each paid wall contributes time[i] units during which the free painter can paint that many other walls; effectively a paid wall 'covers' time[i] + 1 walls.",
      "Reframe as: choose a subset S of paid walls so that sum(time[i] + 1 for i in S) >= n, minimizing sum(cost).",
      "DP over a remaining-walls counter capped at n: dp[j] = min cost to still need j walls covered.",
      "Process each wall as an item that reduces the remaining count by time[i] + 1 (clamped) at price cost[i].",
    ],
    solutionSteps: [
      "Let dp[j] be the min cost so that j walls still need covering; dp[0] = 0, others infinity.",
      "For each wall, update j from n down to 0: dp[j] = min(dp[j], dp[max(0, j - (time[i] + 1))] + cost[i]).",
      "After processing all walls, dp[n] is the answer.",
      "The clamp ensures a single wall can over-cover the remaining count.",
    ],
    code: {
      python: `def paint_walls(cost: list[int], time: list[int]) -> int:
    n = len(cost)
    INF = float("inf")
    dp = [INF] * (n + 1)
    dp[0] = 0
    for c, t in zip(cost, time):
        cover = t + 1
        for j in range(n, 0, -1):
            prev = max(0, j - cover)
            if dp[prev] + c < dp[j]:
                dp[j] = dp[prev] + c
    return dp[n]
`,
      java: `class Solution {
    public int paintWalls(int[] cost, int[] time) {
        int n = cost.length;
        long INF = Long.MAX_VALUE / 2;
        long[] dp = new long[n + 1];
        java.util.Arrays.fill(dp, INF);
        dp[0] = 0;
        for (int i = 0; i < n; i++) {
            int cover = time[i] + 1;
            for (int j = n; j >= 1; j--) {
                int prev = Math.max(0, j - cover);
                dp[j] = Math.min(dp[j], dp[prev] + cost[i]);
            }
        }
        return (int) dp[n];
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int paintWalls(vector<int>& cost, vector<int>& time) {
        int n = cost.size();
        const long long INF = 1e18;
        vector<long long> dp(n + 1, INF);
        dp[0] = 0;
        for (int i = 0; i < n; i++) {
            int cover = time[i] + 1;
            for (int j = n; j >= 1; j--) {
                int prev = max(0, j - cover);
                dp[j] = min(dp[j], dp[prev] + cost[i]);
            }
        }
        return (int) dp[n];
    }
};
`,
    },
    complexity: { time: "O(n^2)", space: "O(n)" },
    pitfalls: [
      "Not clamping j - (time[i] + 1) at 0, missing over-coverage by a single wall.",
      "Treating it as plain knapsack on time without the '+1' for the paid wall itself.",
      "Integer overflow when summing large costs.",
    ],
    edgeCases: [
      "n = 1 (must pay for the only wall).",
      "All time[i] large (one paid wall covers everything).",
      "Uniform costs.",
    ],
    whyItMatters:
      "Recasting a scheduling constraint as a coverage knapsack is a powerful modeling step that turns an opaque problem into a familiar DP.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 437 — pure_dsa · dp_1d · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-score-no-conflict-team",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Highest-Scoring Team Without Age-Score Conflicts",
    framing:
      "Build a team to maximize total score. A conflict arises if a younger member has a strictly higher score than an older one, so the chosen members must be conflict-free.",
    statement:
      "Given arrays scores and ages of the same length, choose a subset of players maximizing the sum of scores such that no chosen player is both younger and strictly higher-scoring than another chosen player. Return the maximum total score.",
    inputFormat: "Two arrays scores and ages of equal length n.",
    outputFormat: "An integer: the maximum conflict-free team score.",
    constraints: [
      "1 <= n <= 1000",
      "1 <= scores[i] <= 10^6, 1 <= ages[i] <= 1000",
      "Ties in age or score do not cause conflicts.",
    ],
    examples: [
      {
        input: "scores = [1,3,5,10,15], ages = [1,2,3,4,5]",
        output: "34",
        explanation: "All players are conflict-free; the whole team sums to 34.",
      },
      {
        input: "scores = [4,5,6,5], ages = [2,1,2,1]",
        output: "16",
        explanation: "Choose the two age-1 players (5+5) and the age-2 player with score 6: 16.",
      },
    ],
    approach: [
      "Sort players by age, then by score; after sorting, a valid team is a non-decreasing-score subsequence.",
      "This reduces to a maximum-sum increasing (non-decreasing) subsequence.",
      "dp[i] = best score of a conflict-free team ending with player i.",
      "dp[i] = scores[i] + max(dp[j]) over j < i with scores[j] <= scores[i].",
    ],
    solutionSteps: [
      "Pair (age, score) and sort ascending by age then score.",
      "For each i, set dp[i] = scores[i], then add the best dp[j] for j < i with scores[j] <= scores[i].",
      "Track the global maximum dp value.",
      "Return that maximum.",
    ],
    code: {
      python: `def best_team_score(scores: list[int], ages: list[int]) -> int:
    players = sorted(zip(ages, scores))
    n = len(players)
    dp = [0] * n
    best = 0
    for i in range(n):
        si = players[i][1]
        dp[i] = si
        for j in range(i):
            if players[j][1] <= si:
                dp[i] = max(dp[i], dp[j] + si)
        best = max(best, dp[i])
    return best
`,
      java: `import java.util.*;

class Solution {
    public int bestTeamScore(int[] scores, int[] ages) {
        int n = scores.length;
        int[][] players = new int[n][2];
        for (int i = 0; i < n; i++) { players[i][0] = ages[i]; players[i][1] = scores[i]; }
        Arrays.sort(players, (a, b) -> a[0] != b[0] ? a[0] - b[0] : a[1] - b[1]);
        int[] dp = new int[n];
        int best = 0;
        for (int i = 0; i < n; i++) {
            int si = players[i][1];
            dp[i] = si;
            for (int j = 0; j < i; j++)
                if (players[j][1] <= si) dp[i] = Math.max(dp[i], dp[j] + si);
            best = Math.max(best, dp[i]);
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
    int bestTeamScore(vector<int>& scores, vector<int>& ages) {
        int n = scores.size();
        vector<pair<int,int>> players(n);
        for (int i = 0; i < n; i++) players[i] = {ages[i], scores[i]};
        sort(players.begin(), players.end());
        vector<int> dp(n, 0);
        int best = 0;
        for (int i = 0; i < n; i++) {
            int si = players[i].second;
            dp[i] = si;
            for (int j = 0; j < i; j++)
                if (players[j].second <= si) dp[i] = max(dp[i], dp[j] + si);
            best = max(best, dp[i]);
        }
        return best;
    }
};
`,
    },
    complexity: { time: "O(n^2)", space: "O(n)" },
    pitfalls: [
      "Sorting by score only and mishandling equal ages.",
      "Using strict < for the score comparison, wrongly excluding equal-score teammates.",
      "Forgetting to seed dp[i] with the player's own score.",
    ],
    edgeCases: [
      "Equal ages with differing scores.",
      "All identical players.",
      "A single player.",
    ],
    whyItMatters:
      "Sorting to linearize a 2-D constraint into a max-sum subsequence is a recurring trick for conflict-free selection problems.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 438 — pure_dsa · dp_1d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-height-shelf-arrangement",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "frontend_engineer"],
    title: "Arrange Items on Shelves to Minimize Total Height",
    framing:
      "Place items in order onto a sequence of fixed-width shelves. Each shelf holds a prefix of the remaining items up to a width limit; the shelf's height is its tallest item. Minimize the stacked height of all shelves.",
    statement:
      "Given books where books[i] = [thickness, height] that must be placed left to right, and a shelf width shelfWidth, each shelf holds a contiguous run of books whose total thickness <= shelfWidth and takes height equal to the tallest book on it. Return the minimum possible total height of the bookcase.",
    inputFormat: "A list books of [thickness, height] and an integer shelfWidth.",
    outputFormat: "An integer: the minimum total bookcase height.",
    constraints: [
      "1 <= books.length <= 1000",
      "1 <= thickness[i] <= shelfWidth <= 1000",
      "1 <= height[i] <= 1000",
    ],
    examples: [
      {
        input: "books = [[1,1],[2,3],[2,3],[1,1],[1,1],[1,1],[1,2]], shelfWidth = 4",
        output: "6",
        explanation: "An optimal shelving yields total height 6.",
      },
      {
        input: "books = [[1,3],[2,4],[3,2]], shelfWidth = 6",
        output: "4",
        explanation: "All three fit on one shelf of height 4.",
      },
    ],
    approach: [
      "dp[i] = minimum height to place the first i books.",
      "For each i, extend a shelf backward over books j..i while their thickness fits shelfWidth.",
      "Track the running max height of that shelf; dp[i] = min(dp[j-1] + shelfMaxHeight).",
      "Return dp[n].",
    ],
    solutionSteps: [
      "Initialize dp[0] = 0 and dp[i] = infinity otherwise.",
      "For i from 1 to n, walk j from i down while accumulated thickness <= shelfWidth.",
      "Maintain the maximum height among books j..i; update dp[i] = min(dp[i], dp[j-1] + maxH).",
      "Return dp[n].",
    ],
    code: {
      python: `def min_height_shelves(books: list[list[int]], shelf_width: int) -> int:
    n = len(books)
    INF = float("inf")
    dp = [0] + [INF] * n
    for i in range(1, n + 1):
        width = 0
        max_h = 0
        j = i
        while j >= 1:
            width += books[j - 1][0]
            if width > shelf_width:
                break
            max_h = max(max_h, books[j - 1][1])
            dp[i] = min(dp[i], dp[j - 1] + max_h)
            j -= 1
    return dp[n]
`,
      java: `class Solution {
    public int minHeightShelves(int[][] books, int shelfWidth) {
        int n = books.length;
        int[] dp = new int[n + 1];
        java.util.Arrays.fill(dp, Integer.MAX_VALUE);
        dp[0] = 0;
        for (int i = 1; i <= n; i++) {
            int width = 0, maxH = 0;
            for (int j = i; j >= 1; j--) {
                width += books[j - 1][0];
                if (width > shelfWidth) break;
                maxH = Math.max(maxH, books[j - 1][1]);
                dp[i] = Math.min(dp[i], dp[j - 1] + maxH);
            }
        }
        return dp[n];
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
#include <climits>
using namespace std;

class Solution {
public:
    int minHeightShelves(vector<vector<int>>& books, int shelfWidth) {
        int n = books.size();
        vector<int> dp(n + 1, INT_MAX);
        dp[0] = 0;
        for (int i = 1; i <= n; i++) {
            int width = 0, maxH = 0;
            for (int j = i; j >= 1; j--) {
                width += books[j - 1][0];
                if (width > shelfWidth) break;
                maxH = max(maxH, books[j - 1][1]);
                dp[i] = min(dp[i], dp[j - 1] + maxH);
            }
        }
        return dp[n];
    }
};
`,
    },
    complexity: { time: "O(n^2)", space: "O(n)" },
    pitfalls: [
      "Reordering books — they must be placed in the given sequence.",
      "Forgetting to break when the accumulated thickness exceeds the shelf width.",
      "Resetting the running max height incorrectly between j iterations.",
    ],
    edgeCases: [
      "A single book.",
      "Every book filling a shelf alone (thickness equals width).",
      "All books fitting on one shelf.",
    ],
    whyItMatters:
      "Sequential partition DP with a per-segment cost models line-wrapping, pagination, and batch-formation under a capacity constraint.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 439 — pure_dsa · dp_1d · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-cost-travel-pass",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer"],
    title: "Cheapest Set of Travel Passes to Cover All Trip Days",
    framing:
      "You must travel on certain days of the year. Passes come in 1-day, 7-day, and 30-day durations at fixed prices. Choose passes to cover every travel day at minimum total cost.",
    statement:
      "Given a sorted array days of the days you will travel (1..365) and an array costs = [c1, c7, c30] for 1-day, 7-day, and 30-day passes, return the minimum cost to cover all travel days. A k-day pass bought on day d covers days d..d+k-1.",
    inputFormat: "A sorted array days and a length-3 array costs.",
    outputFormat: "An integer: the minimum total pass cost.",
    constraints: [
      "1 <= days.length <= 365",
      "1 <= days[i] <= 365 and strictly increasing",
      "1 <= costs[i] <= 1000",
    ],
    examples: [
      {
        input: "days = [1,4,6,7,8,20], costs = [2,7,15]",
        output: "11",
        explanation: "A 7-day pass covers days 1-7 (cost 7), plus single passes for 8 and 20 (2 + 2).",
      },
      {
        input: "days = [1,2,3,4,5,6,7,8,9,10,30,31], costs = [2,7,15]",
        output: "17",
        explanation: "A 30-day pass on day 1 (15) covers all but nothing extra; plus a 1-day for day 31 (2).",
      },
    ],
    approach: [
      "Let dp[d] be the minimum cost to cover all travel days up to and including day d.",
      "On non-travel days dp[d] = dp[d-1]; on travel days take the cheapest of three options.",
      "dp[d] = min(dp[d-1] + c1, dp[d-7] + c7, dp[d-30] + c30) with negative indices clamped to 0.",
      "Return dp at the last travel day.",
    ],
    solutionSteps: [
      "Mark travel days in a boolean set up to the max day.",
      "Iterate d from 1 to maxDay; if d is not a travel day, dp[d] = dp[d-1].",
      "Otherwise dp[d] = min over the three pass durations using clamped lookbacks.",
      "Return dp[maxDay].",
    ],
    code: {
      python: `def mincost_tickets(days: list[int], costs: list[int]) -> int:
    travel = set(days)
    max_day = days[-1]
    dp = [0] * (max_day + 1)
    for d in range(1, max_day + 1):
        if d not in travel:
            dp[d] = dp[d - 1]
        else:
            dp[d] = min(
                dp[d - 1] + costs[0],
                dp[max(0, d - 7)] + costs[1],
                dp[max(0, d - 30)] + costs[2],
            )
    return dp[max_day]
`,
      java: `class Solution {
    public int mincostTickets(int[] days, int[] costs) {
        int maxDay = days[days.length - 1];
        boolean[] travel = new boolean[maxDay + 1];
        for (int d : days) travel[d] = true;
        int[] dp = new int[maxDay + 1];
        for (int d = 1; d <= maxDay; d++) {
            if (!travel[d]) { dp[d] = dp[d - 1]; continue; }
            dp[d] = Math.min(dp[d - 1] + costs[0],
                    Math.min(dp[Math.max(0, d - 7)] + costs[1],
                             dp[Math.max(0, d - 30)] + costs[2]));
        }
        return dp[maxDay];
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int mincostTickets(vector<int>& days, vector<int>& costs) {
        int maxDay = days.back();
        vector<bool> travel(maxDay + 1, false);
        for (int d : days) travel[d] = true;
        vector<int> dp(maxDay + 1, 0);
        for (int d = 1; d <= maxDay; d++) {
            if (!travel[d]) { dp[d] = dp[d - 1]; continue; }
            dp[d] = min({dp[d - 1] + costs[0],
                         dp[max(0, d - 7)] + costs[1],
                         dp[max(0, d - 30)] + costs[2]});
        }
        return dp[maxDay];
    }
};
`,
    },
    complexity: { time: "O(maxDay)", space: "O(maxDay)" },
    pitfalls: [
      "Negative indices when d < 7 or d < 30 — clamp to 0.",
      "Recomputing only over travel days but mismatching the lookback windows.",
      "Assuming a 7-day pass covers 7 travel days rather than 7 calendar days.",
    ],
    edgeCases: [
      "A single travel day.",
      "Travel days densely packed (30-day pass wins).",
      "Sparse travel days (single passes win).",
    ],
    whyItMatters:
      "Calendar-coverage DP models subscription/pass optimization and windowed licensing decisions directly.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 440 — pure_dsa · dp_2d · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-uncrossed-matches",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Maximum Non-Crossing Matches Between Two Sequences",
    framing:
      "Two ordered lists of identifiers are placed in parallel rows. Draw connecting lines between equal identifiers so that no two lines cross. Maximize the number of lines drawn.",
    statement:
      "Given two integer arrays nums1 and nums2, draw lines connecting equal values nums1[i] == nums2[j] such that the lines do not intersect (connections must preserve order). Return the maximum number of such non-crossing connecting lines.",
    inputFormat: "Two integer arrays nums1 and nums2.",
    outputFormat: "An integer: the maximum number of uncrossed lines.",
    constraints: [
      "1 <= nums1.length, nums2.length <= 500",
      "1 <= values <= 2000",
      "Values may repeat.",
    ],
    examples: [
      {
        input: "nums1 = [1,4,2], nums2 = [1,2,4]",
        output: "2",
        explanation: "Connect the two 1s and the two 4s without crossing (the 2s would cross).",
      },
      {
        input: "nums1 = [2,5,1,2,5], nums2 = [10,5,2,1,5,2]",
        output: "3",
        explanation: "Three non-crossing matches are possible.",
      },
    ],
    approach: [
      "Non-crossing matches preserving order are exactly a longest common subsequence.",
      "dp[i][j] = max lines using the first i of nums1 and first j of nums2.",
      "If nums1[i-1] == nums2[j-1], dp[i][j] = dp[i-1][j-1] + 1.",
      "Otherwise dp[i][j] = max(dp[i-1][j], dp[i][j-1]).",
    ],
    solutionSteps: [
      "Allocate a (m+1) x (n+1) DP grid initialized to 0.",
      "Fill it row by row using the LCS recurrence.",
      "Match diagonally on equality, else take the better of dropping one element.",
      "Return dp[m][n].",
    ],
    code: {
      python: `def max_uncrossed_lines(nums1: list[int], nums2: list[int]) -> int:
    m, n = len(nums1), len(nums2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if nums1[i - 1] == nums2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]
`,
      java: `class Solution {
    public int maxUncrossedLines(int[] nums1, int[] nums2) {
        int m = nums1.length, n = nums2.length;
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 1; i <= m; i++)
            for (int j = 1; j <= n; j++)
                dp[i][j] = nums1[i - 1] == nums2[j - 1]
                    ? dp[i - 1][j - 1] + 1
                    : Math.max(dp[i - 1][j], dp[i][j - 1]);
        return dp[m][n];
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int maxUncrossedLines(vector<int>& nums1, vector<int>& nums2) {
        int m = nums1.size(), n = nums2.size();
        vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
        for (int i = 1; i <= m; i++)
            for (int j = 1; j <= n; j++)
                dp[i][j] = nums1[i - 1] == nums2[j - 1]
                    ? dp[i - 1][j - 1] + 1
                    : max(dp[i - 1][j], dp[i][j - 1]);
        return dp[m][n];
    }
};
`,
    },
    complexity: { time: "O(m*n)", space: "O(m*n)" },
    pitfalls: [
      "Greedily matching the first equal pair rather than computing the LCS.",
      "Confusing this with longest common substring (which requires contiguity).",
      "Indexing the arrays with the DP indices without the -1 offset.",
    ],
    edgeCases: [
      "No common values -> 0.",
      "Identical arrays -> the array length.",
      "Repeated values forcing order-aware matching.",
    ],
    whyItMatters:
      "Recognizing a geometric non-crossing constraint as LCS shows how disparate problems collapse onto a single DP recurrence.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 441 — ai_applied · dp_1d · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-valid-token-sequences",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 13,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "data_engineer"],
    title: "Count Valid Token Sequences Under Transition Rules",
    framing:
      "A constrained decoder emits one of five token classes per step, and each class restricts which class may follow it. Count how many distinct length-n sequences obey all transition rules.",
    statement:
      "There are five token classes labelled a, e, i, o, u. The successor rules are: a -> e; e -> a or i; i -> any class except i; o -> i or u; u -> a. Given an integer n, return the number of valid length-n strings, modulo 1e9+7.",
    inputFormat: "A single integer n.",
    outputFormat: "An integer: the count of valid sequences modulo 1e9+7.",
    constraints: [
      "1 <= n <= 2*10^4",
      "Counts are taken modulo 1e9+7.",
      "Each position holds exactly one of the five classes.",
    ],
    examples: [
      {
        input: "n = 1",
        output: "5",
        explanation: "Any single class is valid.",
      },
      {
        input: "n = 2",
        output: "10",
        explanation: "Ten ordered pairs satisfy the successor rules.",
      },
    ],
    approach: [
      "Let dp[c] be the number of valid sequences ending in class c at the current length.",
      "Transition by accumulating, for each class, the counts of all predecessors that may precede it.",
      "Invert the successor rules to predecessor rules for clean accumulation.",
      "Sum the five counts after n steps.",
    ],
    solutionSteps: [
      "Initialize dp = [1,1,1,1,1] for length 1 (order a,e,i,o,u).",
      "For each additional length, compute next[c] = sum of dp over classes allowed to precede c, mod MOD.",
      "The predecessor sets follow from inverting the rules (e.g. a is preceded by e, i, u).",
      "Return the sum of dp modulo MOD.",
    ],
    code: {
      python: `def count_vowel_permutation(n: int) -> int:
    MOD = 10**9 + 7
    # order: a, e, i, o, u
    a = e = i = o = u = 1
    for _ in range(n - 1):
        a, e, i, o, u = (
            (e + i + u) % MOD,   # a follows e, i, u
            (a + i) % MOD,       # e follows a, i
            (e + o) % MOD,       # i follows e, o
            i % MOD,             # o follows i
            (i + o) % MOD,       # u follows i, o
        )
    return (a + e + i + o + u) % MOD
`,
      java: `class Solution {
    public int countVowelPermutation(int n) {
        long MOD = 1000000007L;
        long a = 1, e = 1, i = 1, o = 1, u = 1;
        for (int step = 1; step < n; step++) {
            long na = (e + i + u) % MOD;
            long ne = (a + i) % MOD;
            long ni = (e + o) % MOD;
            long no = i % MOD;
            long nu = (i + o) % MOD;
            a = na; e = ne; i = ni; o = no; u = nu;
        }
        return (int) ((a + e + i + o + u) % MOD);
    }
}
`,
      cpp: `class Solution {
public:
    int countVowelPermutation(int n) {
        const long long MOD = 1000000007LL;
        long long a = 1, e = 1, i = 1, o = 1, u = 1;
        for (int step = 1; step < n; step++) {
            long long na = (e + i + u) % MOD;
            long long ne = (a + i) % MOD;
            long long ni = (e + o) % MOD;
            long long no = i % MOD;
            long long nu = (i + o) % MOD;
            a = na; e = ne; i = ni; o = no; u = nu;
        }
        return (int) ((a + e + i + o + u) % MOD);
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Using successor rules where predecessor rules are needed for the accumulation.",
      "Updating the five counts in place without temporaries, corrupting the step.",
      "Forgetting the modulus and overflowing.",
    ],
    edgeCases: [
      "n = 1 -> 5.",
      "Large n stressing the modular arithmetic.",
      "Verifying the inverted rule for class i (any except i).",
    ],
    whyItMatters:
      "Transition-rule counting is exactly how constrained decoders and finite-state grammars bound their output space.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 442 — ai_applied · dp_2d · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "agent-stays-on-grid-probability",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 13,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "data_engineer"],
    title: "Probability an Agent Remains on the Board After K Moves",
    framing:
      "A reinforcement-learning agent moves like a knight on an n x n board, choosing each of 8 moves uniformly at random. Starting from a cell, compute the probability it is still on the board after exactly k moves.",
    statement:
      "On an n x n board, an agent starts at (row, column) and makes exactly k moves. Each move is one of the 8 knight moves chosen uniformly at random, even if it would leave the board (after which the agent stops). Return the probability the agent remains on the board after k moves.",
    inputFormat: "Integers n, k, row, and column.",
    outputFormat: "A floating-point probability.",
    constraints: [
      "1 <= n <= 25",
      "0 <= k <= 100",
      "0 <= row, column < n",
    ],
    examples: [
      {
        input: "n = 3, k = 2, row = 0, column = 0",
        output: "0.06250",
        explanation: "After two moves the survival probability is 0.0625.",
      },
      {
        input: "n = 1, k = 0, row = 0, column = 0",
        output: "1.00000",
        explanation: "With no moves the agent is trivially on the board.",
      },
    ],
    approach: [
      "dp[r][c] holds the probability of being on the board at (r, c) after the current number of moves.",
      "Each move distributes probability to 8 targets, each weighted by 1/8.",
      "Iterate k times, rolling a fresh grid from the previous one.",
      "Sum all probabilities in the final grid.",
    ],
    solutionSteps: [
      "Initialize dp with 1.0 at the start cell.",
      "For each of k steps, build next where next[nr][nc] += dp[r][c] / 8 for every on-board knight target.",
      "Replace dp with next.",
      "Return the sum over dp.",
    ],
    code: {
      python: `def knight_probability(n: int, k: int, row: int, column: int) -> float:
    moves = [(2, 1), (2, -1), (-2, 1), (-2, -1), (1, 2), (1, -2), (-1, 2), (-1, -2)]
    dp = [[0.0] * n for _ in range(n)]
    dp[row][column] = 1.0
    for _ in range(k):
        nxt = [[0.0] * n for _ in range(n)]
        for r in range(n):
            for c in range(n):
                if dp[r][c] == 0.0:
                    continue
                for dr, dc in moves:
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < n and 0 <= nc < n:
                        nxt[nr][nc] += dp[r][c] / 8.0
        dp = nxt
    return sum(sum(row) for row in dp)
`,
      java: `class Solution {
    public double knightProbability(int n, int k, int row, int column) {
        int[][] moves = {{2,1},{2,-1},{-2,1},{-2,-1},{1,2},{1,-2},{-1,2},{-1,-2}};
        double[][] dp = new double[n][n];
        dp[row][column] = 1.0;
        for (int step = 0; step < k; step++) {
            double[][] nxt = new double[n][n];
            for (int r = 0; r < n; r++)
                for (int c = 0; c < n; c++) {
                    if (dp[r][c] == 0.0) continue;
                    for (int[] m : moves) {
                        int nr = r + m[0], nc = c + m[1];
                        if (nr >= 0 && nr < n && nc >= 0 && nc < n)
                            nxt[nr][nc] += dp[r][c] / 8.0;
                    }
                }
            dp = nxt;
        }
        double total = 0.0;
        for (double[] r : dp) for (double v : r) total += v;
        return total;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    double knightProbability(int n, int k, int row, int column) {
        int moves[8][2] = {{2,1},{2,-1},{-2,1},{-2,-1},{1,2},{1,-2},{-1,2},{-1,-2}};
        vector<vector<double>> dp(n, vector<double>(n, 0.0));
        dp[row][column] = 1.0;
        for (int step = 0; step < k; step++) {
            vector<vector<double>> nxt(n, vector<double>(n, 0.0));
            for (int r = 0; r < n; r++)
                for (int c = 0; c < n; c++) {
                    if (dp[r][c] == 0.0) continue;
                    for (auto& m : moves) {
                        int nr = r + m[0], nc = c + m[1];
                        if (nr >= 0 && nr < n && nc >= 0 && nc < n)
                            nxt[nr][nc] += dp[r][c] / 8.0;
                    }
                }
            dp = nxt;
        }
        double total = 0.0;
        for (auto& r : dp) for (double v : r) total += v;
        return total;
    }
};
`,
    },
    complexity: { time: "O(k * n^2 * 8)", space: "O(n^2)" },
    pitfalls: [
      "Stopping the move set early or omitting some of the 8 knight offsets.",
      "Dividing by the number of on-board moves instead of always 8.",
      "Mutating dp in place during a step instead of rolling a fresh grid.",
    ],
    edgeCases: [
      "k = 0 (probability 1).",
      "n = 1 with k > 0 (probability 0 unless k = 0).",
      "Start near a corner with few legal moves.",
    ],
    whyItMatters:
      "Forward probability propagation on a grid is the discrete analogue of a Markov transition step, central to random-walk and policy-evaluation reasoning.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 443 — ai_applied · dp_1d · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-valid-training-logs",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 13,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "backend_engineer"],
    title: "Count Acceptable Daily-Status Logs of Length N",
    framing:
      "Each day a training job logs Present, Late, or Aborted. A log is acceptable only if it records fewer than 2 Aborted days total and never 3 or more consecutive Late days. Count acceptable length-n logs.",
    statement:
      "Each record is one of 'P', 'L', or 'A'. A length-n record string is rewardable if it contains fewer than 2 'A' in total and does not contain 3 or more consecutive 'L'. Given n, return the number of rewardable strings, modulo 1e9+7.",
    inputFormat: "A single integer n.",
    outputFormat: "An integer: the count of valid records modulo 1e9+7.",
    constraints: [
      "1 <= n <= 10^5",
      "Counts are taken modulo 1e9+7.",
      "Each day is one of P, L, A.",
    ],
    examples: [
      {
        input: "n = 2",
        output: "8",
        explanation: "Of 9 length-2 strings, only 'AA' is invalid, leaving 8.",
      },
      {
        input: "n = 1",
        output: "3",
        explanation: "P, L, and A are all valid.",
      },
    ],
    approach: [
      "Track DP states keyed by (number of A so far in {0,1}, trailing L count in {0,1,2}).",
      "Each day appends P (resets trailing L), L (increments trailing L, capped at 2), or A (increments A count).",
      "Transitions that would reach 2 A's or 3 trailing L's are dropped.",
      "Sum all reachable states after n days.",
    ],
    solutionSteps: [
      "Represent dp[a][l] = number of valid prefixes with a absences and l trailing lates.",
      "Start with dp[0][0] = 1.",
      "For each day, fold P, L, A transitions into a fresh dp under the constraints.",
      "Return the total over all six states modulo MOD.",
    ],
    code: {
      python: `def checking_record(n: int) -> int:
    MOD = 10**9 + 7
    # dp[a][l]: a in {0,1} absences, l in {0,1,2} trailing lates
    dp = [[0, 0, 0], [0, 0, 0]]
    dp[0][0] = 1
    for _ in range(n):
        ndp = [[0, 0, 0], [0, 0, 0]]
        for a in range(2):
            for l in range(3):
                cur = dp[a][l]
                if cur == 0:
                    continue
                # append P -> trailing lates reset
                ndp[a][0] = (ndp[a][0] + cur) % MOD
                # append A -> only if no prior A
                if a == 0:
                    ndp[1][0] = (ndp[1][0] + cur) % MOD
                # append L -> only if fewer than 2 trailing
                if l < 2:
                    ndp[a][l + 1] = (ndp[a][l + 1] + cur) % MOD
        dp = ndp
    total = 0
    for a in range(2):
        for l in range(3):
            total = (total + dp[a][l]) % MOD
    return total
`,
      java: `class Solution {
    public int checkRecord(int n) {
        long MOD = 1000000007L;
        long[][] dp = new long[2][3];
        dp[0][0] = 1;
        for (int day = 0; day < n; day++) {
            long[][] ndp = new long[2][3];
            for (int a = 0; a < 2; a++)
                for (int l = 0; l < 3; l++) {
                    long cur = dp[a][l];
                    if (cur == 0) continue;
                    ndp[a][0] = (ndp[a][0] + cur) % MOD;
                    if (a == 0) ndp[1][0] = (ndp[1][0] + cur) % MOD;
                    if (l < 2) ndp[a][l + 1] = (ndp[a][l + 1] + cur) % MOD;
                }
            dp = ndp;
        }
        long total = 0;
        for (int a = 0; a < 2; a++)
            for (int l = 0; l < 3; l++) total = (total + dp[a][l]) % MOD;
        return (int) total;
    }
}
`,
      cpp: `class Solution {
public:
    int checkRecord(int n) {
        const long long MOD = 1000000007LL;
        long long dp[2][3] = {{0,0,0},{0,0,0}};
        dp[0][0] = 1;
        for (int day = 0; day < n; day++) {
            long long ndp[2][3] = {{0,0,0},{0,0,0}};
            for (int a = 0; a < 2; a++)
                for (int l = 0; l < 3; l++) {
                    long long cur = dp[a][l];
                    if (cur == 0) continue;
                    ndp[a][0] = (ndp[a][0] + cur) % MOD;
                    if (a == 0) ndp[1][0] = (ndp[1][0] + cur) % MOD;
                    if (l < 2) ndp[a][l + 1] = (ndp[a][l + 1] + cur) % MOD;
                }
            for (int a = 0; a < 2; a++)
                for (int l = 0; l < 3; l++) dp[a][l] = ndp[a][l];
        }
        long long total = 0;
        for (int a = 0; a < 2; a++)
            for (int l = 0; l < 3; l++) total = (total + dp[a][l]) % MOD;
        return (int) total;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Allowing the trailing-L count to reach 3 instead of capping transitions at 2.",
      "Permitting a second A.",
      "Not resetting the trailing-L count when appending P or A.",
    ],
    edgeCases: [
      "n = 1 -> 3.",
      "Large n where only modular arithmetic keeps numbers bounded.",
      "Verifying P and A both reset the late streak.",
    ],
    whyItMatters:
      "Small finite-state DP counts constrained sequences efficiently — the same shape validates log formats and regex-like grammar counts.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 444 — ai_applied · dp_2d · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-embedding-alignment-score",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 13,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "data_engineer"],
    title: "Maximum Dot Product of Two Aligned Subsequences",
    framing:
      "Two sequences of signed embedding coordinates are given. Pick an equal-length, order-preserving subsequence from each and align them so the sum of paired products (the dot product) is maximized. At least one pair must be chosen.",
    statement:
      "Given two integer arrays nums1 and nums2, choose non-empty subsequences of equal length from each (preserving order) and return the maximum dot product of the chosen aligned subsequences.",
    inputFormat: "Two integer arrays nums1 and nums2.",
    outputFormat: "An integer: the maximum achievable dot product.",
    constraints: [
      "1 <= nums1.length, nums2.length <= 500",
      "-1000 <= values <= 1000",
      "At least one pair must be selected.",
    ],
    examples: [
      {
        input: "nums1 = [2,1,-2,5], nums2 = [3,0,-6]",
        output: "18",
        explanation: "Pair 2 with 3 and -2 with -6: 6 + 12 = 18.",
      },
      {
        input: "nums1 = [-1,-1], nums2 = [1,1]",
        output: "-1",
        explanation: "Every product is negative; the best single pair is -1.",
      },
    ],
    approach: [
      "dp[i][j] = best dot product using prefixes nums1[..i] and nums2[..j] with at least one pair so far.",
      "Option 1: pair nums1[i]*nums2[j], optionally extending the best previous (clamped at 0).",
      "Option 2 and 3: skip nums1[i] or skip nums2[j].",
      "Take the maximum; handle the all-pairs-negative case naturally by not forcing extension.",
    ],
    solutionSteps: [
      "Let dp be (m+1) x (n+1) with -infinity guards for empty prefixes.",
      "dp[i][j] = max(nums1[i-1]*nums2[j-1] + max(dp[i-1][j-1], 0), dp[i-1][j], dp[i][j-1]).",
      "The max(.., 0) lets a single best pair stand alone.",
      "Return dp[m][n].",
    ],
    code: {
      python: `def max_dot_product(nums1: list[int], nums2: list[int]) -> int:
    m, n = len(nums1), len(nums2)
    NEG = float("-inf")
    dp = [[NEG] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            product = nums1[i - 1] * nums2[j - 1]
            best_prev = dp[i - 1][j - 1]
            take = product + (best_prev if best_prev > 0 else 0)
            dp[i][j] = max(take, dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]
`,
      java: `class Solution {
    public int maxDotProduct(int[] nums1, int[] nums2) {
        int m = nums1.length, n = nums2.length;
        int NEG = Integer.MIN_VALUE / 2;
        int[][] dp = new int[m + 1][n + 1];
        for (int[] row : dp) java.util.Arrays.fill(row, NEG);
        for (int i = 1; i <= m; i++)
            for (int j = 1; j <= n; j++) {
                int product = nums1[i - 1] * nums2[j - 1];
                int bestPrev = Math.max(dp[i - 1][j - 1], 0);
                int take = product + bestPrev;
                dp[i][j] = Math.max(take, Math.max(dp[i - 1][j], dp[i][j - 1]));
            }
        return dp[m][n];
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
#include <climits>
using namespace std;

class Solution {
public:
    int maxDotProduct(vector<int>& nums1, vector<int>& nums2) {
        int m = nums1.size(), n = nums2.size();
        int NEG = INT_MIN / 2;
        vector<vector<int>> dp(m + 1, vector<int>(n + 1, NEG));
        for (int i = 1; i <= m; i++)
            for (int j = 1; j <= n; j++) {
                int product = nums1[i - 1] * nums2[j - 1];
                int bestPrev = max(dp[i - 1][j - 1], 0);
                int take = product + bestPrev;
                dp[i][j] = max({take, dp[i - 1][j], dp[i][j - 1]});
            }
        return dp[m][n];
    }
};
`,
    },
    complexity: { time: "O(m*n)", space: "O(m*n)" },
    pitfalls: [
      "Forcing at least one pair incorrectly so the all-negative case returns 0.",
      "Forgetting the max(prev, 0) clamp that lets a single strong pair stand alone.",
      "Using a -infinity that overflows when added to a product.",
    ],
    edgeCases: [
      "All products negative (return the least negative single pair).",
      "Single-element arrays.",
      "Mixed signs maximizing positive alignment.",
    ],
    whyItMatters:
      "Alignment DP that maximizes a paired score is the discrete cousin of sequence-similarity scoring used across retrieval and matching.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 445 — ai_applied · dp_2d · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-bounded-repeat-generations",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 13,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "data_engineer"],
    title: "Count Generations With Per-Symbol Repeat Caps",
    framing:
      "A sampler draws n symbols from a 6-way categorical distribution, but each symbol class may not repeat more than a per-class limit consecutively. Count how many distinct length-n generations satisfy all caps.",
    statement:
      "A die has faces 1..6. Given n rolls and an array rollMax where rollMax[i] is the maximum number of times face i+1 may appear consecutively, return the number of distinct roll sequences of length n, modulo 1e9+7.",
    inputFormat: "An integer n and an array rollMax of length 6.",
    outputFormat: "An integer: the count of valid sequences modulo 1e9+7.",
    constraints: [
      "1 <= n <= 5000",
      "1 <= rollMax[i] <= 15",
      "There are exactly 6 faces.",
    ],
    examples: [
      {
        input: "n = 2, rollMax = [1,1,2,2,2,3]",
        output: "34",
        explanation: "Of 36 sequences, the two with a repeated face 1 or face 2 are excluded.",
      },
      {
        input: "n = 3, rollMax = [1,1,1,2,2,3]",
        output: "181",
        explanation: "Counting all length-3 sequences honoring the caps gives 181.",
      },
    ],
    approach: [
      "State: dp[face][run] = number of valid sequences ending with `run` consecutive copies of `face`.",
      "Appending the same face extends the run (allowed while run < rollMax[face]).",
      "Appending a different face resets that face's run to 1.",
      "Sum all states after n rolls.",
    ],
    solutionSteps: [
      "Initialize dp[f][1] = 1 for each face after the first roll.",
      "For each subsequent roll, for every (face, run) distribute counts: same face -> run+1 if within cap; other faces -> run 1.",
      "Use a fresh dp each step under the modulus.",
      "Return the sum over all (face, run) states.",
    ],
    code: {
      python: `def dice_roll_simulation(n: int, roll_max: list[int]) -> int:
    MOD = 10**9 + 7
    # dp[f][r]: sequences ending with r consecutive copies of face f, r is 1-indexed
    dp = [[0] * 16 for _ in range(6)]
    for f in range(6):
        dp[f][1] = 1
    for _ in range(n - 1):
        ndp = [[0] * 16 for _ in range(6)]
        for f in range(6):
            total_f = sum(dp[f][1:roll_max[f] + 1]) % MOD
            for g in range(6):
                if g == f:
                    # extend the same face's run
                    for r in range(1, roll_max[f]):
                        ndp[f][r + 1] = (ndp[f][r + 1] + dp[f][r]) % MOD
                else:
                    # start a fresh run of face g after some face f
                    ndp[g][1] = (ndp[g][1] + total_f) % MOD
        dp = ndp
    ans = 0
    for f in range(6):
        ans = (ans + sum(dp[f][1:roll_max[f] + 1])) % MOD
    return ans
`,
      java: `class Solution {
    public int dieSimulator(int n, int[] rollMax) {
        long MOD = 1000000007L;
        long[][] dp = new long[6][16];
        for (int f = 0; f < 6; f++) dp[f][1] = 1;
        for (int step = 1; step < n; step++) {
            long[][] ndp = new long[6][16];
            for (int f = 0; f < 6; f++) {
                long totalF = 0;
                for (int r = 1; r <= rollMax[f]; r++) totalF = (totalF + dp[f][r]) % MOD;
                for (int g = 0; g < 6; g++) {
                    if (g == f) {
                        for (int r = 1; r < rollMax[f]; r++)
                            ndp[f][r + 1] = (ndp[f][r + 1] + dp[f][r]) % MOD;
                    } else {
                        ndp[g][1] = (ndp[g][1] + totalF) % MOD;
                    }
                }
            }
            dp = ndp;
        }
        long ans = 0;
        for (int f = 0; f < 6; f++)
            for (int r = 1; r <= rollMax[f]; r++) ans = (ans + dp[f][r]) % MOD;
        return (int) ans;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int dieSimulator(int n, vector<int>& rollMax) {
        const long long MOD = 1000000007LL;
        vector<vector<long long>> dp(6, vector<long long>(16, 0));
        for (int f = 0; f < 6; f++) dp[f][1] = 1;
        for (int step = 1; step < n; step++) {
            vector<vector<long long>> ndp(6, vector<long long>(16, 0));
            for (int f = 0; f < 6; f++) {
                long long totalF = 0;
                for (int r = 1; r <= rollMax[f]; r++) totalF = (totalF + dp[f][r]) % MOD;
                for (int g = 0; g < 6; g++) {
                    if (g == f) {
                        for (int r = 1; r < rollMax[f]; r++)
                            ndp[f][r + 1] = (ndp[f][r + 1] + dp[f][r]) % MOD;
                    } else {
                        ndp[g][1] = (ndp[g][1] + totalF) % MOD;
                    }
                }
            }
            dp = ndp;
        }
        long long ans = 0;
        for (int f = 0; f < 6; f++)
            for (int r = 1; r <= rollMax[f]; r++) ans = (ans + dp[f][r]) % MOD;
        return (int) ans;
    }
};
`,
    },
    complexity: { time: "O(n * 6 * maxRoll)", space: "O(6 * maxRoll)" },
    pitfalls: [
      "Letting a run exceed its cap by extending when run == rollMax.",
      "Double counting by adding the same face to both the extend and reset branches.",
      "Forgetting the modulus on the per-face totals.",
    ],
    edgeCases: [
      "n = 1 (six sequences).",
      "All rollMax = 1 (no repeats allowed).",
      "Large caps that never bind.",
    ],
    whyItMatters:
      "Per-symbol consecutive-repeat caps mirror repetition penalties in sampling; the (symbol, run-length) state is the same machinery.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 446 — indian_domain · dp_1d · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-notes-settle-amount",
    version: 1,
    status: "pending_review",
    bucket: "indian_domain",
    batchNo: 13,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer"],
    title: "Fewest Currency Notes to Settle an Exact Amount",
    framing:
      "A payouts service settles an exact rupee amount using available note denominations (unlimited supply of each). Find the minimum number of notes needed, or report that the amount cannot be settled exactly.",
    statement:
      "Given an array denominations of distinct positive note values (unlimited supply each) and an integer amount in rupees, return the minimum number of notes summing exactly to amount, or -1 if it cannot be made.",
    inputFormat: "An array denominations and an integer amount.",
    outputFormat: "An integer: the minimum number of notes, or -1.",
    constraints: [
      "1 <= denominations.length <= 12",
      "1 <= denominations[i] <= 2000 (e.g. 1, 2, 5, 10, 20, 50, 100, 200, 500)",
      "0 <= amount <= 10^4",
    ],
    examples: [
      {
        input: "denominations = [1,2,5], amount = 11",
        output: "3",
        explanation: "5 + 5 + 1 uses three notes.",
      },
      {
        input: "denominations = [2], amount = 3",
        output: "-1",
        explanation: "An odd amount cannot be made from 2-rupee notes.",
      },
    ],
    approach: [
      "Unbounded-knapsack DP: dp[x] = the fewest notes to make amount x.",
      "dp[0] = 0; dp[x] = 1 + min over denominations d <= x of dp[x - d].",
      "Use a sentinel (amount + 1) for unreachable sums.",
      "Return dp[amount] or -1 if it stays at the sentinel.",
    ],
    solutionSteps: [
      "Initialize dp of size amount+1 with a large sentinel; dp[0] = 0.",
      "For each x from 1 to amount, try every denomination d <= x.",
      "Set dp[x] = min(dp[x], dp[x - d] + 1).",
      "Return dp[amount] if reachable, else -1.",
    ],
    code: {
      python: `def min_notes(denominations: list[int], amount: int) -> int:
    INF = amount + 1
    dp = [0] + [INF] * amount
    for x in range(1, amount + 1):
        for d in denominations:
            if d <= x and dp[x - d] + 1 < dp[x]:
                dp[x] = dp[x - d] + 1
    return dp[amount] if dp[amount] != INF else -1
`,
      java: `class Solution {
    public int minNotes(int[] denominations, int amount) {
        int INF = amount + 1;
        int[] dp = new int[amount + 1];
        java.util.Arrays.fill(dp, INF);
        dp[0] = 0;
        for (int x = 1; x <= amount; x++)
            for (int d : denominations)
                if (d <= x) dp[x] = Math.min(dp[x], dp[x - d] + 1);
        return dp[amount] == INF ? -1 : dp[amount];
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int minNotes(vector<int>& denominations, int amount) {
        int INF = amount + 1;
        vector<int> dp(amount + 1, INF);
        dp[0] = 0;
        for (int x = 1; x <= amount; x++)
            for (int d : denominations)
                if (d <= x) dp[x] = min(dp[x], dp[x - d] + 1);
        return dp[amount] == INF ? -1 : dp[amount];
    }
};
`,
    },
    complexity: { time: "O(amount * denominations.length)", space: "O(amount)" },
    pitfalls: [
      "Greedily taking the largest note, which fails for non-canonical denomination sets.",
      "Returning 0 instead of -1 for an unreachable amount.",
      "Off-by-one with the sentinel comparison.",
    ],
    edgeCases: [
      "amount = 0 -> 0 notes.",
      "An amount unreachable from the given denominations -> -1.",
      "A single denomination of 1 (always reachable).",
    ],
    whyItMatters:
      "Exact minimum-notes settlement is a real payouts/ATM concern where greedy fails on non-standard denomination sets, so DP is required.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 447 — indian_domain · arrays_hashing · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "irctc-seat-capacity-feasible",
    version: 1,
    status: "pending_review",
    bucket: "indian_domain",
    batchNo: 13,
    pattern: "arrays_hashing",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer"],
    title: "Can a Coach Seat Every Booking Along the Route",
    framing:
      "A train coach has a fixed seat capacity. Bookings each board at one station and alight at another along a linear route. Decide whether the coach can honour every booking without ever exceeding capacity.",
    statement:
      "Given capacity seats and a list bookings where bookings[i] = [numPassengers, from, to] (passengers board at station from and leave at station to, 0-indexed stations along a line), return true if it is possible to carry all passengers without the onboard count exceeding capacity at any point, else false.",
    inputFormat: "A list bookings of [numPassengers, from, to] and an integer capacity.",
    outputFormat: "A boolean: whether all bookings fit within capacity.",
    constraints: [
      "1 <= bookings.length <= 1000",
      "1 <= numPassengers <= 100, 0 <= from < to <= 1000",
      "1 <= capacity <= 10^5",
    ],
    examples: [
      {
        input: "bookings = [[2,1,5],[3,3,7]], capacity = 4",
        output: "false",
        explanation: "Between stations 3 and 5 the coach holds 5 passengers, over capacity 4.",
      },
      {
        input: "bookings = [[2,1,5],[3,5,7]], capacity = 4",
        output: "true",
        explanation: "The first booking alights at 5 exactly as the second boards.",
      },
    ],
    approach: [
      "Use a difference array over stations: +passengers at `from`, -passengers at `to`.",
      "A passenger leaving at station `to` frees the seat at that station, so the decrement lands at `to`.",
      "Prefix-sum the difference array to get the onboard count at each station.",
      "If any running total exceeds capacity, return false.",
    ],
    solutionSteps: [
      "Allocate a diff array sized to the maximum station + 1.",
      "For each booking add passengers at from and subtract at to.",
      "Sweep stations accumulating a running onboard count.",
      "Return false if the count ever exceeds capacity, else true.",
    ],
    code: {
      python: `def can_seat_all(bookings: list[list[int]], capacity: int) -> bool:
    max_station = max(to for _, _, to in bookings)
    diff = [0] * (max_station + 2)
    for passengers, frm, to in bookings:
        diff[frm] += passengers
        diff[to] -= passengers
    onboard = 0
    for delta in diff:
        onboard += delta
        if onboard > capacity:
            return False
    return True
`,
      java: `class Solution {
    public boolean canSeatAll(int[][] bookings, int capacity) {
        int maxStation = 0;
        for (int[] b : bookings) maxStation = Math.max(maxStation, b[2]);
        int[] diff = new int[maxStation + 2];
        for (int[] b : bookings) {
            diff[b[1]] += b[0];
            diff[b[2]] -= b[0];
        }
        int onboard = 0;
        for (int delta : diff) {
            onboard += delta;
            if (onboard > capacity) return false;
        }
        return true;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    bool canSeatAll(vector<vector<int>>& bookings, int capacity) {
        int maxStation = 0;
        for (auto& b : bookings) maxStation = max(maxStation, b[2]);
        vector<int> diff(maxStation + 2, 0);
        for (auto& b : bookings) {
            diff[b[1]] += b[0];
            diff[b[2]] -= b[0];
        }
        int onboard = 0;
        for (int delta : diff) {
            onboard += delta;
            if (onboard > capacity) return false;
        }
        return true;
    }
};
`,
    },
    complexity: { time: "O(bookings + maxStation)", space: "O(maxStation)" },
    pitfalls: [
      "Decrementing at to+1 instead of to — the seat frees exactly at the alighting station.",
      "Re-scanning all bookings per station (O(n*stations)) instead of a difference array.",
      "Sizing the difference array too small for the largest station.",
    ],
    edgeCases: [
      "Back-to-back bookings sharing a station boundary.",
      "A single booking exceeding capacity outright.",
      "All bookings on disjoint segments.",
    ],
    whyItMatters:
      "The difference-array sweep is the standard linear technique for interval load feasibility — coach seating, bandwidth, and rate-limit checks alike.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 448 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "predict-game-winner",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Can the First Player Force a Win Taking From Either End",
    framing:
      "Two players alternately take a value from either end of a row of scores, each playing optimally to maximize their own total. Determine whether the first player can guarantee at least a tie.",
    statement:
      "Given an integer array nums, two players take turns picking a number from either end, adding it to their score. Both play optimally. Return true if player 1 can end with a score >= player 2's, else false.",
    inputFormat: "An integer array nums.",
    outputFormat: "A boolean: whether player 1 is guaranteed not to lose.",
    constraints: [
      "1 <= nums.length <= 20",
      "0 <= nums[i] <= 10^7",
      "Both players play optimally.",
    ],
    examples: [
      {
        input: "nums = [1,5,2]",
        output: "false",
        explanation: "Player 1 cannot guarantee a non-losing result against optimal play.",
      },
      {
        input: "nums = [1,5,233,7]",
        output: "true",
        explanation: "Player 1 can secure 234 versus 12.",
      },
    ],
    approach: [
      "Let dp[i][j] be the best score difference (current player minus opponent) achievable on nums[i..j].",
      "The current player picks an end and subtracts the opponent's optimal result on the rest.",
      "dp[i][j] = max(nums[i] - dp[i+1][j], nums[j] - dp[i][j-1]).",
      "Player 1 does not lose iff dp[0][n-1] >= 0.",
    ],
    solutionSteps: [
      "Base case dp[i][i] = nums[i].",
      "Fill by increasing interval length using the recurrence.",
      "Compute dp[0][n-1].",
      "Return whether it is non-negative.",
    ],
    code: {
      python: `def predict_the_winner(nums: list[int]) -> bool:
    n = len(nums)
    dp = [[0] * n for _ in range(n)]
    for i in range(n):
        dp[i][i] = nums[i]
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            dp[i][j] = max(nums[i] - dp[i + 1][j], nums[j] - dp[i][j - 1])
    return dp[0][n - 1] >= 0
`,
      java: `class Solution {
    public boolean predictTheWinner(int[] nums) {
        int n = nums.length;
        long[][] dp = new long[n][n];
        for (int i = 0; i < n; i++) dp[i][i] = nums[i];
        for (int len = 2; len <= n; len++)
            for (int i = 0; i + len - 1 < n; i++) {
                int j = i + len - 1;
                dp[i][j] = Math.max(nums[i] - dp[i + 1][j], nums[j] - dp[i][j - 1]);
            }
        return dp[0][n - 1] >= 0;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    bool predictTheWinner(vector<int>& nums) {
        int n = nums.size();
        vector<vector<long long>> dp(n, vector<long long>(n, 0));
        for (int i = 0; i < n; i++) dp[i][i] = nums[i];
        for (int len = 2; len <= n; len++)
            for (int i = 0; i + len - 1 < n; i++) {
                int j = i + len - 1;
                dp[i][j] = max((long long)nums[i] - dp[i + 1][j],
                               (long long)nums[j] - dp[i][j - 1]);
            }
        return dp[0][n - 1] >= 0;
    }
};
`,
    },
    complexity: { time: "O(n^2)", space: "O(n^2)" },
    pitfalls: [
      "Maximizing only player 1's score instead of the score difference.",
      "Filling the DP in the wrong order so dp[i+1][j] is not yet computed.",
      "Using a strict > test; a tie (>= 0) counts as not losing.",
    ],
    edgeCases: [
      "A single element (player 1 wins).",
      "Two elements (pick the larger).",
      "All equal values.",
    ],
    whyItMatters:
      "Minimax as a score-difference interval DP is the cornerstone of optimal two-player game analysis.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 449 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "stone-game-pick-piles",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Maximize Stones Taken With a Growing Move Window",
    framing:
      "Two players alternately take stones from the front of a row of piles. On each turn a player may take the next X piles where 1 <= X <= 2M, and M grows to max(M, X). Both play optimally; report the first player's best total.",
    statement:
      "Given an array piles where piles[i] is the stone count of pile i, players alternate turns starting with player 1. On a turn with current M, the active player takes the first X remaining piles for any 1 <= X <= 2M, then M becomes max(M, X). Both maximize their own stones. Return the maximum stones player 1 can collect.",
    inputFormat: "An integer array piles.",
    outputFormat: "An integer: the maximum stones for player 1.",
    constraints: [
      "1 <= piles.length <= 100",
      "1 <= piles[i] <= 10^4",
      "Both players play optimally.",
    ],
    examples: [
      {
        input: "piles = [2,7,9,4,4]",
        output: "10",
        explanation: "Optimal play lets player 1 collect 10 stones.",
      },
      {
        input: "piles = [1,2,3,4,5,100]",
        output: "104",
        explanation: "Player 1 can secure 104 by controlling the window growth.",
      },
    ],
    approach: [
      "Use suffix sums so the stones from index i onward are known in O(1).",
      "dp[i][m] = the maximum stones the active player can get from piles[i..] with parameter M = m.",
      "Try X from 1 to 2m: active gets suffix[i] - dp[i+X][max(m, X)] (opponent's optimal on the rest).",
      "Memoize over (i, m).",
    ],
    solutionSteps: [
      "Precompute suffix sums of piles.",
      "Define dp(i, m): if i + 2m >= n, take everything (suffix[i]).",
      "Otherwise maximize over X of suffix[i] - dp(i + X, max(m, X)).",
      "Return dp(0, 1).",
    ],
    code: {
      python: `from functools import lru_cache

def stone_game_ii(piles: list[int]) -> int:
    n = len(piles)
    suffix = [0] * (n + 1)
    for i in range(n - 1, -1, -1):
        suffix[i] = suffix[i + 1] + piles[i]

    @lru_cache(maxsize=None)
    def dp(i: int, m: int) -> int:
        if i >= n:
            return 0
        if i + 2 * m >= n:
            return suffix[i]
        best = 0
        for x in range(1, 2 * m + 1):
            best = max(best, suffix[i] - dp(i + x, max(m, x)))
        return best

    return dp(0, 1)
`,
      java: `class Solution {
    int[] suffix;
    Integer[][] memo;
    int n;
    public int stoneGameII(int[] piles) {
        n = piles.length;
        suffix = new int[n + 1];
        for (int i = n - 1; i >= 0; i--) suffix[i] = suffix[i + 1] + piles[i];
        memo = new Integer[n + 1][n + 1];
        return dp(0, 1);
    }
    private int dp(int i, int m) {
        if (i >= n) return 0;
        if (i + 2 * m >= n) return suffix[i];
        if (memo[i][m] != null) return memo[i][m];
        int best = 0;
        for (int x = 1; x <= 2 * m; x++)
            best = Math.max(best, suffix[i] - dp(i + x, Math.max(m, x)));
        return memo[i][m] = best;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
    vector<int> suffix;
    vector<vector<int>> memo;
    int n;
    int dp(int i, int m) {
        if (i >= n) return 0;
        if (i + 2 * m >= n) return suffix[i];
        if (memo[i][m] != -1) return memo[i][m];
        int best = 0;
        for (int x = 1; x <= 2 * m; x++)
            best = max(best, suffix[i] - dp(i + x, max(m, x)));
        return memo[i][m] = best;
    }
public:
    int stoneGameII(vector<int>& piles) {
        n = piles.size();
        suffix.assign(n + 1, 0);
        for (int i = n - 1; i >= 0; i--) suffix[i] = suffix[i + 1] + piles[i];
        memo.assign(n + 1, vector<int>(n + 1, -1));
        return dp(0, 1);
    }
};
`,
    },
    complexity: { time: "O(n^3)", space: "O(n^2)" },
    pitfalls: [
      "Forgetting to update M to max(M, X) for the next turn.",
      "Letting X exceed the number of remaining piles.",
      "Not memoizing, leading to exponential blowup.",
    ],
    edgeCases: [
      "A single pile (player 1 takes it).",
      "When 2M already covers all remaining piles.",
      "Large early piles tempting an immediate large grab.",
    ],
    whyItMatters:
      "Suffix-sum plus minimax memoization handles games with state-dependent move budgets, a step up from fixed-move game DP.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 450 — pure_dsa · dp_2d · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-delete-cost-align",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 13,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Minimum Deletion Cost to Make Two Strings Equal",
    framing:
      "Two text streams must be reduced to a common string by deleting characters. Each deleted character costs its ASCII value. Find the minimum total deletion cost to make the two equal.",
    statement:
      "Given two strings s1 and s2, return the lowest ASCII sum of deleted characters needed to make the two strings equal (deleting characters from either string).",
    inputFormat: "Two lowercase strings s1 and s2.",
    outputFormat: "An integer: the minimum total ASCII deletion cost.",
    constraints: [
      "1 <= s1.length, s2.length <= 1000",
      "s1 and s2 contain only lowercase English letters.",
      "Cost of deleting a character equals its ASCII value.",
    ],
    examples: [
      {
        input: 's1 = "sea", s2 = "eat"',
        output: "231",
        explanation: "Delete 's' (115) from sea and 't' (116) from eat: 115 + 116 = 231.",
      },
      {
        input: 's1 = "delete", s2 = "leet"',
        output: "403",
        explanation: "Deleting the right characters totals 403 in ASCII cost.",
      },
    ],
    approach: [
      "dp[i][j] = minimum deletion cost to make s1[..i] and s2[..j] equal.",
      "If characters match, no deletion: dp[i][j] = dp[i-1][j-1].",
      "Otherwise delete one: dp[i][j] = min(dp[i-1][j] + ascii(s1[i-1]), dp[i][j-1] + ascii(s2[j-1])).",
      "Base rows/columns accumulate the cost of deleting a whole prefix.",
    ],
    solutionSteps: [
      "Fill dp[0][j] and dp[i][0] with prefix ASCII sums (deleting everything).",
      "For each i, j apply the match/no-match recurrence.",
      "Return dp[m][n].",
      "All costs use the characters' ASCII values.",
    ],
    code: {
      python: `def minimum_delete_sum(s1: str, s2: str) -> int:
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        dp[i][0] = dp[i - 1][0] + ord(s1[i - 1])
    for j in range(1, n + 1):
        dp[0][j] = dp[0][j - 1] + ord(s2[j - 1])
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i - 1] == s2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = min(dp[i - 1][j] + ord(s1[i - 1]),
                               dp[i][j - 1] + ord(s2[j - 1]))
    return dp[m][n]
`,
      java: `class Solution {
    public int minimumDeleteSum(String s1, String s2) {
        int m = s1.length(), n = s2.length();
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 1; i <= m; i++) dp[i][0] = dp[i - 1][0] + s1.charAt(i - 1);
        for (int j = 1; j <= n; j++) dp[0][j] = dp[0][j - 1] + s2.charAt(j - 1);
        for (int i = 1; i <= m; i++)
            for (int j = 1; j <= n; j++) {
                if (s1.charAt(i - 1) == s2.charAt(j - 1)) dp[i][j] = dp[i - 1][j - 1];
                else dp[i][j] = Math.min(dp[i - 1][j] + s1.charAt(i - 1),
                                         dp[i][j - 1] + s2.charAt(j - 1));
            }
        return dp[m][n];
    }
}
`,
      cpp: `#include <string>
#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int minimumDeleteSum(string s1, string s2) {
        int m = s1.size(), n = s2.size();
        vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
        for (int i = 1; i <= m; i++) dp[i][0] = dp[i - 1][0] + s1[i - 1];
        for (int j = 1; j <= n; j++) dp[0][j] = dp[0][j - 1] + s2[j - 1];
        for (int i = 1; i <= m; i++)
            for (int j = 1; j <= n; j++) {
                if (s1[i - 1] == s2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
                else dp[i][j] = min(dp[i - 1][j] + s1[i - 1], dp[i][j - 1] + s2[j - 1]);
            }
        return dp[m][n];
    }
};
`,
    },
    complexity: { time: "O(m*n)", space: "O(m*n)" },
    pitfalls: [
      "Counting deletions rather than summing ASCII costs.",
      "Forgetting to initialize the base row and column with prefix costs.",
      "Deleting from only one string when the cheaper option deletes from the other.",
    ],
    edgeCases: [
      "Identical strings (cost 0).",
      "Disjoint alphabets (delete everything from both).",
      "One string a subsequence of the other.",
    ],
    whyItMatters:
      "Weighted edit-distance variants like this generalize LCS to cost-aware alignment, used in diffing and reconciliation.",
    estimatedMinutes: 35,
  },

] as const;
