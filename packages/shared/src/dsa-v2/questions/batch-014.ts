// DSA v2 — Batch 14 (questions 451–500).
//
// 50 questions, 451–500. Difficulty mix: 39 hard + 11 medium.
// Bucket mix: 43 pure_dsa + 5 ai_applied + 2 indian_domain.
// All status pending_review. No duplicate canonical problems across the bank.
//
// Canonical coverage (distinct from batches 1–13):
//   451 Keys and Rooms · 452 All Paths From Source to Target · 453 Graph Valid
//   Tree · 454 Loud and Rich · 455 Minimum Number of Vertices to Reach All
//   Nodes · 456 Find the Town Judge · 457 Possible Bipartition · 458 Course
//   Schedule IV · 459 Parallel Courses · 460 Binary Tree Right Side View · 461
//   Binary Tree Zigzag Level Order Traversal · 462 Flatten Binary Tree to Linked
//   List · 463 Populating Next Right Pointers II · 464 Sum Root to Leaf Numbers ·
//   465 Path Sum II · 466 Count Complete Tree Nodes · 467 Binary Tree Pruning ·
//   468 Longest ZigZag Path in a Binary Tree · 469 Maximum Average Subtree · 470
//   Decode String · 471 Basic Calculator II · 472 Longest Palindromic
//   Subsequence · 473 Different Ways to Add Parentheses · 474 Arithmetic Slices ·
//   475 Perfect Squares · 476 Paint Fence · 477 Maximum Length of Pair Chain ·
//   478 Permutations II · 479 Subsets II · 480 Combination Sum II · 481 Restore
//   IP Addresses · 482 N-Queens II · 483 Beautiful Arrangement · 484 Generalized
//   Abbreviation · 485 Sum of Two Integers · 486 Gray Code · 487 Bitwise AND of
//   Numbers Range · 488 Total Hamming Distance · 489 UTF-8 Validation · 490 Find
//   K Pairs with Smallest Sums · 491 Kth Largest Element in a Stream · 492
//   Reorganize String · 493 Minimum Number of Arrows to Burst Balloons · 494
//   Find and Replace Pattern · 495 Word Pattern · 496 Repeated DNA Sequences ·
//   497 Combination Sum IV · 498 Number of Ways to Stay in the Same Place After
//   Some Steps · 499 Maximum Earnings From Taxi · 500 Jump Game VII.

import type { DsaV2Question } from "../types";

export const BATCH_014: readonly DsaV2Question[] = [
  // ──────────────────────────────────────────────────────────────────────
  // 451 — pure_dsa · graphs · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "unlock-all-rooms-reachable",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "graphs",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "platform_engineer"],
    title: "Can Every Room Be Unlocked From Room Zero",
    framing:
      "Each room holds keys to other rooms. Starting in room 0 (unlocked), decide whether you can collect keys to open and visit every room.",
    statement:
      "There are n rooms labelled 0..n-1, all locked except room 0. rooms[i] is the list of keys (room numbers) found in room i. Starting in room 0, return true if you can visit every room, else false.",
    inputFormat: "A list rooms where rooms[i] holds the keys available in room i.",
    outputFormat: "A boolean: whether all rooms are reachable.",
    constraints: [
      "2 <= n <= 1000",
      "0 <= total keys <= 3000",
      "Keys are room indices, possibly with duplicates.",
    ],
    examples: [
      {
        input: "rooms = [[1],[2],[3],[]]",
        output: "true",
        explanation: "0 -> 1 -> 2 -> 3 visits every room.",
      },
      {
        input: "rooms = [[1,3],[3,0,1],[2],[0]]",
        output: "false",
        explanation: "Room 2 holds the only key to itself, so it is never reachable.",
      },
    ],
    approach: [
      "This is plain reachability from node 0 in a directed graph.",
      "DFS or BFS from room 0, collecting keys (edges) as you go.",
      "Mark rooms visited to avoid cycles.",
      "All rooms are reachable iff the visited count equals n.",
    ],
    solutionSteps: [
      "Initialize a visited set with room 0 and a stack containing 0.",
      "Pop a room; for each key, if that room is unvisited, mark and push it.",
      "Continue until the stack empties.",
      "Return whether visited.size == n.",
    ],
    code: {
      python: `def can_visit_all_rooms(rooms: list[list[int]]) -> bool:
    visited = {0}
    stack = [0]
    while stack:
        room = stack.pop()
        for key in rooms[room]:
            if key not in visited:
                visited.add(key)
                stack.append(key)
    return len(visited) == len(rooms)
`,
      java: `import java.util.*;

class Solution {
    public boolean canVisitAllRooms(List<List<Integer>> rooms) {
        Set<Integer> visited = new HashSet<>();
        visited.add(0);
        Deque<Integer> stack = new ArrayDeque<>();
        stack.push(0);
        while (!stack.isEmpty()) {
            int room = stack.pop();
            for (int key : rooms.get(room)) {
                if (visited.add(key)) stack.push(key);
            }
        }
        return visited.size() == rooms.size();
    }
}
`,
      cpp: `#include <vector>
#include <unordered_set>
using namespace std;

class Solution {
public:
    bool canVisitAllRooms(vector<vector<int>>& rooms) {
        unordered_set<int> visited{0};
        vector<int> stack{0};
        while (!stack.empty()) {
            int room = stack.back(); stack.pop_back();
            for (int key : rooms[room]) {
                if (!visited.count(key)) { visited.insert(key); stack.push_back(key); }
            }
        }
        return (int)visited.size() == (int)rooms.size();
    }
};
`,
    },
    complexity: { time: "O(n + keys)", space: "O(n)" },
    pitfalls: [
      "Re-adding already-visited rooms and looping forever.",
      "Counting keys instead of distinct visited rooms.",
      "Forgetting room 0 starts unlocked and visited.",
    ],
    edgeCases: [
      "A self-key in an otherwise unreachable room.",
      "All rooms reachable in a chain.",
      "Duplicate keys.",
    ],
    whyItMatters:
      "Reachability from a source is the most basic graph traversal and underpins dependency-closure and capability-propagation checks.",
    estimatedMinutes: 20,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 452 — pure_dsa · graphs · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "enumerate-all-dag-paths",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "List Every Path From Source to Sink in a DAG",
    framing:
      "A directed acyclic workflow graph runs from stage 0 to the final stage n-1. Enumerate every distinct path from start to finish.",
    statement:
      "Given a directed acyclic graph of n nodes as graph where graph[i] lists the out-neighbors of node i, return all paths from node 0 to node n-1. Each path is the sequence of node indices visited.",
    inputFormat: "An adjacency list graph of out-edges for a DAG.",
    outputFormat: "A list of all source-to-sink paths.",
    constraints: [
      "2 <= n <= 15",
      "graph is a DAG; node n-1 may be a sink.",
      "The number of paths can be exponential in n.",
    ],
    examples: [
      {
        input: "graph = [[1,2],[3],[3],[]]",
        output: "[[0,1,3],[0,2,3]]",
        explanation: "Two distinct paths reach node 3.",
      },
      {
        input: "graph = [[4,3,1],[3,2,4],[3],[4],[]]",
        output: "[[0,4],[0,3,4],[0,1,3,4],[0,1,2,3,4],[0,1,4]]",
        explanation: "All five source-to-sink paths are listed.",
      },
    ],
    approach: [
      "Backtracking DFS from node 0, extending the current path.",
      "When the path reaches node n-1, record a copy.",
      "Because the graph is acyclic, no visited set is needed.",
      "Undo the last node on return to explore siblings.",
    ],
    solutionSteps: [
      "Maintain a path list seeded with node 0.",
      "DFS(node): if node == n-1, append a copy of path to results.",
      "Otherwise, for each neighbor, push it, recurse, then pop.",
      "Return all collected paths.",
    ],
    code: {
      python: `def all_paths_source_target(graph: list[list[int]]) -> list[list[int]]:
    target = len(graph) - 1
    result = []
    path = [0]

    def dfs(node: int) -> None:
        if node == target:
            result.append(path[:])
            return
        for nei in graph[node]:
            path.append(nei)
            dfs(nei)
            path.pop()

    dfs(0)
    return result
`,
      java: `import java.util.*;

class Solution {
    public List<List<Integer>> allPathsSourceTarget(int[][] graph) {
        List<List<Integer>> result = new ArrayList<>();
        List<Integer> path = new ArrayList<>();
        path.add(0);
        dfs(graph, 0, path, result);
        return result;
    }
    private void dfs(int[][] graph, int node, List<Integer> path, List<List<Integer>> result) {
        if (node == graph.length - 1) {
            result.add(new ArrayList<>(path));
            return;
        }
        for (int nei : graph[node]) {
            path.add(nei);
            dfs(graph, nei, path, result);
            path.remove(path.size() - 1);
        }
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
    void dfs(vector<vector<int>>& graph, int node, vector<int>& path, vector<vector<int>>& result) {
        if (node == (int)graph.size() - 1) {
            result.push_back(path);
            return;
        }
        for (int nei : graph[node]) {
            path.push_back(nei);
            dfs(graph, nei, path, result);
            path.pop_back();
        }
    }
public:
    vector<vector<int>> allPathsSourceTarget(vector<vector<int>>& graph) {
        vector<vector<int>> result;
        vector<int> path{0};
        dfs(graph, 0, path, result);
        return result;
    }
};
`,
    },
    complexity: { time: "O(2^n * n)", space: "O(n)" },
    pitfalls: [
      "Appending the path reference instead of a copy, so later mutations corrupt results.",
      "Adding a visited set unnecessarily, which can suppress valid distinct paths in a DAG.",
      "Forgetting to backtrack (pop) after recursion.",
    ],
    edgeCases: [
      "A single edge 0 -> n-1.",
      "A node with no outgoing edges that is not the target (dead end).",
      "Exponentially many paths.",
    ],
    whyItMatters:
      "Path enumeration via backtracking is the foundation for listing workflows, call chains, and dependency routes.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 453 — pure_dsa · graphs · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "validate-network-is-tree",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "software_engineer"],
    title: "Is the Undirected Network Exactly a Tree",
    framing:
      "Validate that a set of bidirectional links over n nodes forms a tree: fully connected with no cycles.",
    statement:
      "Given n nodes labelled 0..n-1 and a list edges of undirected connections, return true if the edges form a valid tree (connected and acyclic), and false otherwise.",
    inputFormat: "An integer n and a list edges of undirected [a, b] pairs.",
    outputFormat: "A boolean: whether the graph is a tree.",
    constraints: [
      "1 <= n <= 2000",
      "0 <= edges.length <= 5000",
      "No self-loops or duplicate edges.",
    ],
    examples: [
      {
        input: "n = 5, edges = [[0,1],[0,2],[0,3],[1,4]]",
        output: "true",
        explanation: "Four edges connect five nodes with no cycle — a tree.",
      },
      {
        input: "n = 5, edges = [[0,1],[1,2],[2,3],[1,3],[1,4]]",
        output: "false",
        explanation: "Edges 1-2-3-1 form a cycle.",
      },
    ],
    approach: [
      "A tree on n nodes has exactly n-1 edges and is connected.",
      "First reject if edges.length != n - 1.",
      "Then union the edges; a union of already-connected nodes means a cycle.",
      "If no cycle appears, the edge count guarantees connectivity.",
    ],
    solutionSteps: [
      "If edges.length != n - 1, return false.",
      "Initialize union-find over n nodes.",
      "For each edge, if the endpoints already share a root, return false; else union them.",
      "Return true.",
    ],
    code: {
      python: `def valid_tree(n: int, edges: list[list[int]]) -> bool:
    if len(edges) != n - 1:
        return False
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for a, b in edges:
        ra, rb = find(a), find(b)
        if ra == rb:
            return False
        parent[ra] = rb
    return True
`,
      java: `class Solution {
    int[] parent;
    public boolean validTree(int n, int[][] edges) {
        if (edges.length != n - 1) return false;
        parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        for (int[] e : edges) {
            int ra = find(e[0]), rb = find(e[1]);
            if (ra == rb) return false;
            parent[ra] = rb;
        }
        return true;
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
    bool validTree(int n, vector<vector<int>>& edges) {
        if ((int)edges.size() != n - 1) return false;
        parent.resize(n);
        for (int i = 0; i < n; i++) parent[i] = i;
        for (auto& e : edges) {
            int ra = find(e[0]), rb = find(e[1]);
            if (ra == rb) return false;
            parent[ra] = rb;
        }
        return true;
    }
};
`,
    },
    complexity: { time: "O(n + m α(n))", space: "O(n)" },
    pitfalls: [
      "Checking only acyclicity or only connectivity, not both.",
      "Forgetting the quick n-1 edge-count rejection.",
      "Treating directed semantics; edges here are undirected.",
    ],
    edgeCases: [
      "A single node with no edges (valid tree).",
      "Disconnected components with too few edges.",
      "A cycle with the exact n-1 edge count is impossible, but a forest with n-1 edges and a cycle is caught by union-find.",
    ],
    whyItMatters:
      "The 'n-1 edges + no cycle' characterization of trees is a fundamental invariant for validating spanning structures and hierarchies.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 454 — pure_dsa · graphs · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "quietest-richer-person",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Quietest Person Among All Who Are At Least As Rich",
    framing:
      "Given partial 'richer than' relations and a quietness score per person, for each person find the quietest individual among everyone known to be at least as rich as them (including themselves).",
    statement:
      "There are n people (0..n-1). richer[i] = [a, b] means person a is richer than person b. quiet[i] is the quietness of person i (all quiet values distinct). Return an array answer where answer[x] is the index of the least-quiet (smallest quiet value) person among all people who are definitely at least as rich as x (x included).",
    inputFormat: "A list richer of [a, b] richer-than pairs and an array quiet.",
    outputFormat: "An array answer of person indices.",
    constraints: [
      "1 <= n <= 500",
      "0 <= richer.length <= n*(n-1)/2",
      "The richer relation is a DAG; quiet is a permutation of 0..n-1.",
    ],
    examples: [
      {
        input: "richer = [[1,0],[2,1],[3,1],[3,7],[4,3],[5,3],[6,3]], quiet = [3,2,5,4,6,1,7,0]",
        output: "[5,5,2,5,4,5,6,7]",
        explanation: "For person 0, the quietest richer-or-equal person is index 5.",
      },
      {
        input: "richer = [], quiet = [0]",
        output: "[0]",
        explanation: "A single person answers themselves.",
      },
    ],
    approach: [
      "Build a graph richer -> poorer reversed so an edge points from a person to someone richer than them.",
      "answer[x] is the quietest reachable node from x along 'richer' edges.",
      "Use memoized DFS: answer[x] starts as x, then takes the quieter of itself and answer of each richer neighbor.",
      "Memoization avoids recomputing shared ancestors.",
    ],
    solutionSteps: [
      "For each [a, b], add edge b -> a (b can reach the richer a).",
      "DFS(x): if answer[x] set, return it; initialize answer[x] = x.",
      "For each richer neighbor y, recurse; if quiet[answer[y]] < quiet[answer[x]], adopt it.",
      "Run DFS for every person and return answer.",
    ],
    code: {
      python: `def loud_and_rich(richer: list[list[int]], quiet: list[int]) -> list[int]:
    n = len(quiet)
    graph = [[] for _ in range(n)]
    for a, b in richer:
        graph[b].append(a)  # b can reach richer person a
    answer = [-1] * n

    def dfs(x: int) -> int:
        if answer[x] != -1:
            return answer[x]
        answer[x] = x
        for y in graph[x]:
            cand = dfs(y)
            if quiet[cand] < quiet[answer[x]]:
                answer[x] = cand
        return answer[x]

    for i in range(n):
        dfs(i)
    return answer
`,
      java: `import java.util.*;

class Solution {
    List<Integer>[] graph;
    int[] answer, quiet;
    public int[] loudAndRich(int[][] richer, int[] quiet) {
        int n = quiet.length;
        this.quiet = quiet;
        graph = new List[n];
        for (int i = 0; i < n; i++) graph[i] = new ArrayList<>();
        for (int[] r : richer) graph[r[1]].add(r[0]);
        answer = new int[n];
        Arrays.fill(answer, -1);
        for (int i = 0; i < n; i++) dfs(i);
        return answer;
    }
    private int dfs(int x) {
        if (answer[x] != -1) return answer[x];
        answer[x] = x;
        for (int y : graph[x]) {
            int cand = dfs(y);
            if (quiet[cand] < quiet[answer[x]]) answer[x] = cand;
        }
        return answer[x];
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
    vector<vector<int>> graph;
    vector<int> answer, quietRef;
    int dfs(int x) {
        if (answer[x] != -1) return answer[x];
        answer[x] = x;
        for (int y : graph[x]) {
            int cand = dfs(y);
            if (quietRef[cand] < quietRef[answer[x]]) answer[x] = cand;
        }
        return answer[x];
    }
public:
    vector<int> loudAndRich(vector<vector<int>>& richer, vector<int>& quiet) {
        int n = quiet.size();
        quietRef = quiet;
        graph.assign(n, {});
        for (auto& r : richer) graph[r[1]].push_back(r[0]);
        answer.assign(n, -1);
        for (int i = 0; i < n; i++) dfs(i);
        return answer;
    }
};
`,
    },
    complexity: { time: "O(n + E)", space: "O(n + E)" },
    pitfalls: [
      "Pointing edges the wrong way (poorer instead of richer).",
      "Skipping memoization, causing exponential repeated work.",
      "Comparing indices instead of their quiet values.",
    ],
    edgeCases: [
      "No richer relations (each answers themselves).",
      "A long richer chain.",
      "A person richer than many others.",
    ],
    whyItMatters:
      "Memoized DFS that propagates an extremum along a DAG is a recurring pattern for dominance and reachability-aggregate queries.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 455 — pure_dsa · graphs · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-sources-cover-dag",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "data_engineer"],
    title: "Smallest Set of Entry Nodes Reaching the Whole DAG",
    framing:
      "From which minimal set of entry services can a message, by following directed dependencies, eventually reach every service in a DAG?",
    statement:
      "Given a directed acyclic graph of n nodes (0..n-1) and its directed edges, return the smallest set of vertices from which all nodes in the graph are reachable. It is guaranteed a unique minimal solution exists.",
    inputFormat: "An integer n and an edges list of directed [from, to] pairs.",
    outputFormat: "A list of the entry vertices (any order).",
    constraints: [
      "2 <= n <= 10^5",
      "1 <= edges.length <= min(2*10^5, n*(n-1)/2)",
      "The graph is a DAG.",
    ],
    examples: [
      {
        input: "n = 6, edges = [[0,1],[0,2],[2,5],[3,4],[4,2]]",
        output: "[0,3]",
        explanation: "Nodes 0 and 3 (the only ones with no incoming edges) reach everything.",
      },
      {
        input: "n = 5, edges = [[0,1],[2,1],[3,1],[1,4],[2,4]]",
        output: "[0,2,3]",
        explanation: "The three nodes with no in-edges form the answer.",
      },
    ],
    approach: [
      "A node with an incoming edge is reachable from some other node, so it need not be an entry.",
      "A node with no incoming edges cannot be reached from anywhere else, so it must be an entry.",
      "In a DAG, the set of zero-in-degree nodes reaches all nodes and is minimal.",
      "Collect all nodes whose in-degree is zero.",
    ],
    solutionSteps: [
      "Mark every node that appears as a destination in some edge.",
      "Any unmarked node has in-degree zero.",
      "Collect those unmarked nodes.",
      "Return them as the answer.",
    ],
    code: {
      python: `def find_smallest_set_of_vertices(n: int, edges: list[list[int]]) -> list[int]:
    has_incoming = [False] * n
    for _, to in edges:
        has_incoming[to] = True
    return [i for i in range(n) if not has_incoming[i]]
`,
      java: `import java.util.*;

class Solution {
    public List<Integer> findSmallestSetOfVertices(int n, List<List<Integer>> edges) {
        boolean[] hasIncoming = new boolean[n];
        for (List<Integer> e : edges) hasIncoming[e.get(1)] = true;
        List<Integer> ans = new ArrayList<>();
        for (int i = 0; i < n; i++) if (!hasIncoming[i]) ans.add(i);
        return ans;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    vector<int> findSmallestSetOfVertices(int n, vector<vector<int>>& edges) {
        vector<bool> hasIncoming(n, false);
        for (auto& e : edges) hasIncoming[e[1]] = true;
        vector<int> ans;
        for (int i = 0; i < n; i++) if (!hasIncoming[i]) ans.push_back(i);
        return ans;
    }
};
`,
    },
    complexity: { time: "O(n + E)", space: "O(n)" },
    pitfalls: [
      "Overcomplicating with traversal when an in-degree scan suffices.",
      "Including reachable (in-degree > 0) nodes in the set.",
      "Assuming the graph might have cycles; the DAG guarantee is essential.",
    ],
    edgeCases: [
      "A single source reaching all nodes.",
      "Disconnected DAG components each contributing a source.",
      "Nodes with no edges at all (isolated sources).",
    ],
    whyItMatters:
      "Recognizing that zero-in-degree nodes are exactly the minimal cover in a DAG is a crisp structural insight for root-cause and provenance analysis.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 456 — pure_dsa · graphs · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "identify-trust-anchor",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "graphs",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer"],
    title: "Find the Universally Trusted Authority",
    framing:
      "Among n participants, an authority is trusted by everyone else but trusts no one. Given the trust relations, identify the authority, or report there is none.",
    statement:
      "In a town of n people (1..n), the judge trusts nobody, everybody (except the judge) trusts the judge, and exactly one person fits this. Given trust where trust[i] = [a, b] means a trusts b, return the judge's label, or -1 if no judge exists.",
    inputFormat: "An integer n and a list trust of [a, b] directed trust pairs.",
    outputFormat: "An integer: the judge's label, or -1.",
    constraints: [
      "1 <= n <= 1000",
      "0 <= trust.length <= 10^4",
      "All trust pairs are unique; a != b.",
    ],
    examples: [
      {
        input: "n = 3, trust = [[1,3],[2,3]]",
        output: "3",
        explanation: "Person 3 is trusted by 1 and 2 and trusts no one.",
      },
      {
        input: "n = 3, trust = [[1,3],[2,3],[3,1]]",
        output: "-1",
        explanation: "Person 3 trusts person 1, so cannot be the judge.",
      },
    ],
    approach: [
      "Track a net trust score per person: +1 when trusted, -1 when they trust someone.",
      "The judge has score exactly n-1: trusted by all others, trusts nobody.",
      "Compute the scores in one pass over the trust list.",
      "Return the unique person with score n-1, else -1.",
    ],
    solutionSteps: [
      "Initialize a score array of size n+1 to zero.",
      "For each [a, b], decrement score[a] and increment score[b].",
      "Scan for a person whose score equals n-1.",
      "Return that person or -1.",
    ],
    code: {
      python: `def find_judge(n: int, trust: list[list[int]]) -> int:
    score = [0] * (n + 1)
    for a, b in trust:
        score[a] -= 1
        score[b] += 1
    for person in range(1, n + 1):
        if score[person] == n - 1:
            return person
    return -1
`,
      java: `class Solution {
    public int findJudge(int n, int[][] trust) {
        int[] score = new int[n + 1];
        for (int[] t : trust) { score[t[0]]--; score[t[1]]++; }
        for (int person = 1; person <= n; person++)
            if (score[person] == n - 1) return person;
        return -1;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int findJudge(int n, vector<vector<int>>& trust) {
        vector<int> score(n + 1, 0);
        for (auto& t : trust) { score[t[0]]--; score[t[1]]++; }
        for (int person = 1; person <= n; person++)
            if (score[person] == n - 1) return person;
        return -1;
    }
};
`,
    },
    complexity: { time: "O(n + trust)", space: "O(n)" },
    pitfalls: [
      "Forgetting the judge must also trust nobody (the -1 per outgoing edge handles this).",
      "Off-by-one with 1-indexed people.",
      "Returning the first person with high in-degree without subtracting out-degree.",
    ],
    edgeCases: [
      "n = 1 with no trust (the single person is the judge).",
      "Someone trusted by all but who also trusts someone (-1).",
      "No trust edges at all.",
    ],
    whyItMatters:
      "The in-degree-minus-out-degree trick identifies a universal sink — a pattern for finding authorities, celebrities, and central nodes.",
    estimatedMinutes: 20,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 457 — pure_dsa · graphs · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "split-two-groups-dislikes",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Partition People Into Two Groups Respecting Dislikes",
    framing:
      "Some pairs of people dislike each other and must not share a group. Decide whether everyone can be split into exactly two groups with no disliking pair together.",
    statement:
      "Given n people (1..n) and a list dislikes where dislikes[i] = [a, b] means a and b cannot be in the same group, return true if it is possible to split everyone into two groups, else false.",
    inputFormat: "An integer n and a dislikes list of [a, b] pairs.",
    outputFormat: "A boolean: whether a valid 2-grouping exists.",
    constraints: [
      "1 <= n <= 2000",
      "0 <= dislikes.length <= 10^4",
      "No duplicate or self dislike pairs.",
    ],
    examples: [
      {
        input: "n = 4, dislikes = [[1,2],[1,3],[2,4]]",
        output: "true",
        explanation: "Group {1,4} and {2,3} satisfy all dislikes.",
      },
      {
        input: "n = 3, dislikes = [[1,2],[1,3],[2,3]]",
        output: "false",
        explanation: "A triangle of mutual dislikes cannot be 2-colored.",
      },
    ],
    approach: [
      "Model dislikes as edges; a valid split is a 2-coloring (bipartite check).",
      "Color each uncolored component with BFS/DFS, alternating colors across edges.",
      "A same-color edge means an odd cycle, so it is impossible.",
      "Return true only if every component colors cleanly.",
    ],
    solutionSteps: [
      "Build an adjacency list from dislikes.",
      "For each uncolored person, BFS assigning alternating colors.",
      "If a neighbor already shares the current color, return false.",
      "Return true after coloring all components.",
    ],
    code: {
      python: `from collections import deque

def possible_bipartition(n: int, dislikes: list[list[int]]) -> bool:
    adj = [[] for _ in range(n + 1)]
    for a, b in dislikes:
        adj[a].append(b)
        adj[b].append(a)
    color = [0] * (n + 1)
    for start in range(1, n + 1):
        if color[start] != 0:
            continue
        color[start] = 1
        q = deque([start])
        while q:
            u = q.popleft()
            for v in adj[u]:
                if color[v] == 0:
                    color[v] = -color[u]
                    q.append(v)
                elif color[v] == color[u]:
                    return False
    return True
`,
      java: `import java.util.*;

class Solution {
    public boolean possibleBipartition(int n, int[][] dislikes) {
        List<Integer>[] adj = new List[n + 1];
        for (int i = 1; i <= n; i++) adj[i] = new ArrayList<>();
        for (int[] d : dislikes) { adj[d[0]].add(d[1]); adj[d[1]].add(d[0]); }
        int[] color = new int[n + 1];
        for (int start = 1; start <= n; start++) {
            if (color[start] != 0) continue;
            color[start] = 1;
            Deque<Integer> q = new ArrayDeque<>();
            q.add(start);
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int v : adj[u]) {
                    if (color[v] == 0) { color[v] = -color[u]; q.add(v); }
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
    bool possibleBipartition(int n, vector<vector<int>>& dislikes) {
        vector<vector<int>> adj(n + 1);
        for (auto& d : dislikes) { adj[d[0]].push_back(d[1]); adj[d[1]].push_back(d[0]); }
        vector<int> color(n + 1, 0);
        for (int start = 1; start <= n; start++) {
            if (color[start] != 0) continue;
            color[start] = 1;
            queue<int> q;
            q.push(start);
            while (!q.empty()) {
                int u = q.front(); q.pop();
                for (int v : adj[u]) {
                    if (color[v] == 0) { color[v] = -color[u]; q.push(v); }
                    else if (color[v] == color[u]) return false;
                }
            }
        }
        return true;
    }
};
`,
    },
    complexity: { time: "O(n + E)", space: "O(n + E)" },
    pitfalls: [
      "Only checking the component containing person 1.",
      "Confusing dislikes (must differ) with likes (must match).",
      "Not handling disconnected people who can join either group.",
    ],
    edgeCases: [
      "No dislikes (always possible).",
      "An odd cycle (impossible).",
      "Multiple independent components.",
    ],
    whyItMatters:
      "Two-group partition under conflict constraints is bipartite checking, recurring in scheduling, register allocation, and team assignment.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 458 — pure_dsa · graphs · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "prerequisite-reachability-queries",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "data_engineer"],
    title: "Answer Whether One Stage Is a Prerequisite of Another",
    framing:
      "Given direct prerequisite relations between build stages, answer many queries of the form 'is stage u a (possibly indirect) prerequisite of stage v?'",
    statement:
      "There are numCourses courses (0..numCourses-1) with prerequisites where prerequisites[i] = [a, b] means a must be taken before b. For each query [u, v], return true if u is a prerequisite of v (directly or transitively). Return a boolean list aligned with queries.",
    inputFormat: "An integer numCourses, a prerequisites list, and a queries list of [u, v].",
    outputFormat: "A list of booleans, one per query.",
    constraints: [
      "2 <= numCourses <= 100",
      "0 <= prerequisites.length <= n*(n-1)/2",
      "The prerequisite graph is a DAG.",
    ],
    examples: [
      {
        input: "numCourses = 3, prerequisites = [[0,1],[1,2]], queries = [[0,2],[2,0]]",
        output: "[true,false]",
        explanation: "0 -> 1 -> 2 makes 0 a prerequisite of 2, but not vice versa.",
      },
      {
        input: "numCourses = 2, prerequisites = [], queries = [[1,0],[0,1]]",
        output: "[false,false]",
        explanation: "With no prerequisites, neither reaches the other.",
      },
    ],
    approach: [
      "Compute the transitive closure of the DAG; reachable[u][v] is true if u reaches v.",
      "With n <= 100, Floyd-Warshall-style closure in O(n^3) is comfortable.",
      "Initialize reachable from direct edges, then propagate through intermediates.",
      "Each query is an O(1) lookup.",
    ],
    solutionSteps: [
      "Build a boolean n x n matrix seeded with direct prerequisites.",
      "For each intermediate k, set reachable[i][j] |= reachable[i][k] && reachable[k][j].",
      "Answer each query [u, v] with reachable[u][v].",
      "Return the list of answers.",
    ],
    code: {
      python: `def check_if_prerequisite(num_courses: int, prerequisites: list[list[int]], queries: list[list[int]]) -> list[bool]:
    reach = [[False] * num_courses for _ in range(num_courses)]
    for a, b in prerequisites:
        reach[a][b] = True
    for k in range(num_courses):
        for i in range(num_courses):
            if reach[i][k]:
                for j in range(num_courses):
                    if reach[k][j]:
                        reach[i][j] = True
    return [reach[u][v] for u, v in queries]
`,
      java: `import java.util.*;

class Solution {
    public List<Boolean> checkIfPrerequisite(int numCourses, int[][] prerequisites, int[][] queries) {
        boolean[][] reach = new boolean[numCourses][numCourses];
        for (int[] p : prerequisites) reach[p[0]][p[1]] = true;
        for (int k = 0; k < numCourses; k++)
            for (int i = 0; i < numCourses; i++)
                if (reach[i][k])
                    for (int j = 0; j < numCourses; j++)
                        if (reach[k][j]) reach[i][j] = true;
        List<Boolean> ans = new ArrayList<>();
        for (int[] q : queries) ans.add(reach[q[0]][q[1]]);
        return ans;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    vector<bool> checkIfPrerequisite(int numCourses, vector<vector<int>>& prerequisites, vector<vector<int>>& queries) {
        vector<vector<bool>> reach(numCourses, vector<bool>(numCourses, false));
        for (auto& p : prerequisites) reach[p[0]][p[1]] = true;
        for (int k = 0; k < numCourses; k++)
            for (int i = 0; i < numCourses; i++)
                if (reach[i][k])
                    for (int j = 0; j < numCourses; j++)
                        if (reach[k][j]) reach[i][j] = true;
        vector<bool> ans;
        for (auto& q : queries) ans.push_back(reach[q[0]][q[1]]);
        return ans;
    }
};
`,
    },
    complexity: { time: "O(n^3 + Q)", space: "O(n^2)" },
    pitfalls: [
      "Recomputing reachability per query (too slow with many queries).",
      "Ordering the Floyd-Warshall loops so the intermediate k is not outermost.",
      "Treating the relation as symmetric; prerequisites are directed.",
    ],
    edgeCases: [
      "No prerequisites (all queries false).",
      "A long prerequisite chain.",
      "Self-query u == v (false unless a self-loop, which a DAG forbids).",
    ],
    whyItMatters:
      "Transitive closure precomputation turns repeated reachability questions into constant-time lookups — vital for dependency and access-control queries.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 459 — pure_dsa · graphs · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-terms-finish-courses",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "backend_engineer"],
    title: "Minimum Semesters to Finish All Courses",
    framing:
      "Courses have prerequisite relations and unlimited parallelism per term. Find the fewest terms to complete all courses, or report it is impossible due to a cycle.",
    statement:
      "There are n courses (1..n). relations[i] = [a, b] means a must be completed before b. In each semester you may take any number of courses whose prerequisites are all done. Return the minimum number of semesters to complete all courses, or -1 if impossible.",
    inputFormat: "An integer n and a relations list of [a, b] prerequisite pairs.",
    outputFormat: "An integer: the minimum semesters, or -1.",
    constraints: [
      "1 <= n <= 5000",
      "1 <= relations.length <= 5000",
      "No duplicate relations.",
    ],
    examples: [
      {
        input: "n = 3, relations = [[1,3],[2,3]]",
        output: "2",
        explanation: "Take 1 and 2 in semester 1, then 3 in semester 2.",
      },
      {
        input: "n = 3, relations = [[1,2],[2,3],[3,1]]",
        output: "-1",
        explanation: "A cycle makes completion impossible.",
      },
    ],
    approach: [
      "Topological layering with Kahn's algorithm: each BFS layer is one semester.",
      "Start with all zero-in-degree courses; process them as semester 1.",
      "Decrement successors' in-degrees; newly freed courses form the next layer.",
      "If all courses are processed, the layer count is the answer; otherwise a cycle exists -> -1.",
    ],
    solutionSteps: [
      "Build adjacency and in-degree arrays.",
      "Enqueue all in-degree-zero courses; semesters = 0.",
      "Process the queue level by level, incrementing semesters per layer and counting completed courses.",
      "Return semesters if all courses finished, else -1.",
    ],
    code: {
      python: `from collections import deque

def minimum_semesters(n: int, relations: list[list[int]]) -> int:
    adj = [[] for _ in range(n + 1)]
    indeg = [0] * (n + 1)
    for a, b in relations:
        adj[a].append(b)
        indeg[b] += 1
    q = deque(i for i in range(1, n + 1) if indeg[i] == 0)
    semesters = 0
    studied = 0
    while q:
        semesters += 1
        for _ in range(len(q)):
            course = q.popleft()
            studied += 1
            for nxt in adj[course]:
                indeg[nxt] -= 1
                if indeg[nxt] == 0:
                    q.append(nxt)
    return semesters if studied == n else -1
`,
      java: `import java.util.*;

class Solution {
    public int minimumSemesters(int n, int[][] relations) {
        List<Integer>[] adj = new List[n + 1];
        for (int i = 1; i <= n; i++) adj[i] = new ArrayList<>();
        int[] indeg = new int[n + 1];
        for (int[] r : relations) { adj[r[0]].add(r[1]); indeg[r[1]]++; }
        Deque<Integer> q = new ArrayDeque<>();
        for (int i = 1; i <= n; i++) if (indeg[i] == 0) q.add(i);
        int semesters = 0, studied = 0;
        while (!q.isEmpty()) {
            semesters++;
            int size = q.size();
            for (int i = 0; i < size; i++) {
                int course = q.poll();
                studied++;
                for (int nxt : adj[course])
                    if (--indeg[nxt] == 0) q.add(nxt);
            }
        }
        return studied == n ? semesters : -1;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
using namespace std;

class Solution {
public:
    int minimumSemesters(int n, vector<vector<int>>& relations) {
        vector<vector<int>> adj(n + 1);
        vector<int> indeg(n + 1, 0);
        for (auto& r : relations) { adj[r[0]].push_back(r[1]); indeg[r[1]]++; }
        queue<int> q;
        for (int i = 1; i <= n; i++) if (indeg[i] == 0) q.push(i);
        int semesters = 0, studied = 0;
        while (!q.empty()) {
            semesters++;
            int size = q.size();
            for (int i = 0; i < size; i++) {
                int course = q.front(); q.pop();
                studied++;
                for (int nxt : adj[course])
                    if (--indeg[nxt] == 0) q.push(nxt);
            }
        }
        return studied == n ? semesters : -1;
    }
};
`,
    },
    complexity: { time: "O(n + E)", space: "O(n + E)" },
    pitfalls: [
      "Counting nodes instead of BFS layers for the semester total.",
      "Failing to detect cycles via the processed-course count.",
      "Processing the queue without snapshotting its size per layer.",
    ],
    edgeCases: [
      "No relations (one semester).",
      "A linear chain (n semesters).",
      "A cycle (-1).",
    ],
    whyItMatters:
      "Layered topological sort computes the critical-path length under unlimited parallelism — the model for build, deploy, and curriculum scheduling.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 460 — pure_dsa · trees · medium · frontend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "rightmost-node-per-level",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "trees",
    difficulty: "medium",
    primaryRole: "frontend_engineer",
    roles: ["frontend_engineer", "software_engineer"],
    title: "What You See From the Right of a Tree",
    framing:
      "Looking at a binary tree from the right side, you see exactly one node per depth — the rightmost. Return those visible node values top to bottom.",
    statement:
      "Given the root of a binary tree, return the values of the nodes you can see ordered from top to bottom when looking at the tree from the right side.",
    inputFormat: "A binary tree root.",
    outputFormat: "A list of the rightmost node values per level.",
    constraints: [
      "0 <= number of nodes <= 100",
      "-100 <= node value <= 100",
      "The tree may be unbalanced.",
    ],
    examples: [
      {
        input: "root = [1,2,3,null,5,null,4]",
        output: "[1,3,4]",
        explanation: "Levels show 1, then 3, then 4 from the right.",
      },
      {
        input: "root = [1,null,3]",
        output: "[1,3]",
        explanation: "Each level's rightmost node is visible.",
      },
    ],
    approach: [
      "BFS level by level; the last node dequeued in each level is the rightmost.",
      "Record that last value for every level.",
      "Alternatively, DFS visiting right before left and recording the first node seen at each depth.",
      "Both yield the same right-side view.",
    ],
    solutionSteps: [
      "Run a level-order BFS with a queue.",
      "For each level, iterate over its current size; capture the value of the last node.",
      "Append that value to the result.",
      "Return the result after all levels.",
    ],
    code: {
      python: `from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def right_side_view(root: TreeNode) -> list[int]:
    if root is None:
        return []
    result = []
    q = deque([root])
    while q:
        size = len(q)
        for i in range(size):
            node = q.popleft()
            if i == size - 1:
                result.append(node.val)
            if node.left:
                q.append(node.left)
            if node.right:
                q.append(node.right)
    return result
`,
      java: `import java.util.*;

class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}

class Solution {
    public List<Integer> rightSideView(TreeNode root) {
        List<Integer> result = new ArrayList<>();
        if (root == null) return result;
        Deque<TreeNode> q = new ArrayDeque<>();
        q.add(root);
        while (!q.isEmpty()) {
            int size = q.size();
            for (int i = 0; i < size; i++) {
                TreeNode node = q.poll();
                if (i == size - 1) result.add(node.val);
                if (node.left != null) q.add(node.left);
                if (node.right != null) q.add(node.right);
            }
        }
        return result;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
using namespace std;

struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

class Solution {
public:
    vector<int> rightSideView(TreeNode* root) {
        vector<int> result;
        if (!root) return result;
        queue<TreeNode*> q;
        q.push(root);
        while (!q.empty()) {
            int size = q.size();
            for (int i = 0; i < size; i++) {
                TreeNode* node = q.front(); q.pop();
                if (i == size - 1) result.push_back(node->val);
                if (node->left) q.push(node->left);
                if (node->right) q.push(node->right);
            }
        }
        return result;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Assuming the right child is always the rightmost — a missing right child exposes a left one.",
      "Recording the first node per level instead of the last in BFS.",
      "Forgetting the empty-tree case.",
    ],
    edgeCases: [
      "A left-only tree (each left node is visible).",
      "A single node.",
      "An empty tree -> [].",
    ],
    whyItMatters:
      "Level-order traversal with per-level aggregation is the basis for tree silhouettes, widths, and layer summaries.",
    estimatedMinutes: 20,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 461 — pure_dsa · trees · hard · frontend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "zigzag-level-readout",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "frontend_engineer",
    roles: ["frontend_engineer", "software_engineer"],
    title: "Zigzag Level-Order Traversal",
    framing:
      "Render a tree level by level, but alternate the reading direction each level: left-to-right, then right-to-left, and so on.",
    statement:
      "Given the root of a binary tree, return its zigzag level-order traversal: the first level left-to-right, the next right-to-left, alternating thereafter.",
    inputFormat: "A binary tree root.",
    outputFormat: "A list of levels, each a list of values in the appropriate direction.",
    constraints: [
      "0 <= number of nodes <= 2000",
      "-100 <= node value <= 100",
      "Levels alternate direction starting left-to-right.",
    ],
    examples: [
      {
        input: "root = [3,9,20,null,null,15,7]",
        output: "[[3],[20,9],[15,7]]",
        explanation: "Level 1 left-to-right, level 2 right-to-left, level 3 left-to-right.",
      },
      {
        input: "root = [1]",
        output: "[[1]]",
        explanation: "A single level.",
      },
    ],
    approach: [
      "Standard level-order BFS collecting each level's values.",
      "Track a direction flag toggled each level.",
      "When the direction is right-to-left, reverse the level before appending (or insert at the front).",
      "Return the assembled levels.",
    ],
    solutionSteps: [
      "BFS with a queue, processing one level at a time.",
      "Collect the level's values left-to-right.",
      "If the level index is odd, reverse it.",
      "Append and flip the direction flag.",
    ],
    code: {
      python: `from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def zigzag_level_order(root: TreeNode) -> list[list[int]]:
    if root is None:
        return []
    result = []
    q = deque([root])
    left_to_right = True
    while q:
        level = []
        for _ in range(len(q)):
            node = q.popleft()
            level.append(node.val)
            if node.left:
                q.append(node.left)
            if node.right:
                q.append(node.right)
        result.append(level if left_to_right else level[::-1])
        left_to_right = not left_to_right
    return result
`,
      java: `import java.util.*;

class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}

class Solution {
    public List<List<Integer>> zigzagLevelOrder(TreeNode root) {
        List<List<Integer>> result = new ArrayList<>();
        if (root == null) return result;
        Deque<TreeNode> q = new ArrayDeque<>();
        q.add(root);
        boolean leftToRight = true;
        while (!q.isEmpty()) {
            int size = q.size();
            LinkedList<Integer> level = new LinkedList<>();
            for (int i = 0; i < size; i++) {
                TreeNode node = q.poll();
                if (leftToRight) level.addLast(node.val);
                else level.addFirst(node.val);
                if (node.left != null) q.add(node.left);
                if (node.right != null) q.add(node.right);
            }
            result.add(level);
            leftToRight = !leftToRight;
        }
        return result;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
#include <algorithm>
using namespace std;

struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

class Solution {
public:
    vector<vector<int>> zigzagLevelOrder(TreeNode* root) {
        vector<vector<int>> result;
        if (!root) return result;
        queue<TreeNode*> q;
        q.push(root);
        bool leftToRight = true;
        while (!q.empty()) {
            int size = q.size();
            vector<int> level;
            for (int i = 0; i < size; i++) {
                TreeNode* node = q.front(); q.pop();
                level.push_back(node->val);
                if (node->left) q.push(node->left);
                if (node->right) q.push(node->right);
            }
            if (!leftToRight) reverse(level.begin(), level.end());
            result.push_back(level);
            leftToRight = !leftToRight;
        }
        return result;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Reversing the queue order itself instead of just the output level.",
      "Forgetting to alternate the direction each level.",
      "Mishandling the empty-tree case.",
    ],
    edgeCases: [
      "A single node.",
      "A perfectly balanced tree.",
      "A skewed tree (one node per level).",
    ],
    whyItMatters:
      "Direction-alternating level order shows how to layer presentation logic on top of a standard BFS without changing traversal correctness.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 462 — pure_dsa · trees · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "flatten-tree-to-list",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "platform_engineer"],
    title: "Flatten a Binary Tree Into a Right-Skewed List",
    framing:
      "Collapse a binary tree in place into a 'linked list' that follows preorder: every node's left child becomes null and its right child points to the next preorder node.",
    statement:
      "Given the root of a binary tree, flatten it in place into a linked list following preorder traversal. Each node's left pointer must be null and its right pointer must point to the next node in preorder.",
    inputFormat: "A binary tree root.",
    outputFormat: "The same tree mutated into a right-leaning list (no return needed; mutation in place).",
    constraints: [
      "0 <= number of nodes <= 2000",
      "-100 <= node value <= 100",
      "The flatten must be done in place.",
    ],
    examples: [
      {
        input: "root = [1,2,5,3,4,null,6]",
        output: "[1,null,2,null,3,null,4,null,5,null,6]",
        explanation: "Preorder 1,2,3,4,5,6 becomes a right-only chain.",
      },
      {
        input: "root = []",
        output: "[]",
        explanation: "An empty tree stays empty.",
      },
    ],
    approach: [
      "Use the Morris-like rewiring: for each node with a left child, find the left subtree's rightmost node.",
      "Attach the current right subtree to that rightmost node.",
      "Move the left subtree to the right and null the left pointer.",
      "Advance to the new right child and repeat.",
    ],
    solutionSteps: [
      "Start at the root with a moving pointer cur.",
      "While cur is non-null: if it has a left child, find the predecessor (rightmost of the left subtree).",
      "Point the predecessor's right at cur.right, set cur.right = cur.left, cur.left = null.",
      "Advance cur to cur.right.",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def flatten(root: TreeNode) -> None:
    cur = root
    while cur:
        if cur.left:
            pred = cur.left
            while pred.right:
                pred = pred.right
            pred.right = cur.right
            cur.right = cur.left
            cur.left = None
        cur = cur.right
`,
      java: `class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}

class Solution {
    public void flatten(TreeNode root) {
        TreeNode cur = root;
        while (cur != null) {
            if (cur.left != null) {
                TreeNode pred = cur.left;
                while (pred.right != null) pred = pred.right;
                pred.right = cur.right;
                cur.right = cur.left;
                cur.left = null;
            }
            cur = cur.right;
        }
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
    void flatten(TreeNode* root) {
        TreeNode* cur = root;
        while (cur) {
            if (cur->left) {
                TreeNode* pred = cur->left;
                while (pred->right) pred = pred->right;
                pred->right = cur->right;
                cur->right = cur->left;
                cur->left = nullptr;
            }
            cur = cur->right;
        }
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Losing the original right subtree before reattaching it to the predecessor.",
      "Forgetting to null the left pointer after moving the subtree.",
      "Recursing with O(h) stack when an O(1) in-place rewiring is expected.",
    ],
    edgeCases: [
      "An empty tree.",
      "A left-only tree.",
      "A right-only tree (already flat).",
    ],
    whyItMatters:
      "In-place pointer rewiring with predecessor finding is the Morris-traversal idea, key to O(1)-space tree manipulation.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 463 — pure_dsa · trees · hard · frontend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "wire-next-right-pointers",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "frontend_engineer",
    roles: ["frontend_engineer", "software_engineer"],
    title: "Connect Each Node to Its Right Neighbor",
    framing:
      "In a possibly imperfect binary tree, wire every node's next pointer to the node immediately to its right on the same level, using only constant extra space.",
    statement:
      "Given the root of a binary tree where each node has an additional next pointer (initially null), set each next pointer to the next node on the same level, or null if there is none. The tree is not necessarily perfect. Use O(1) extra space (aside from the implicit recursion-free traversal).",
    inputFormat: "A binary tree root with nodes carrying left, right, and next pointers.",
    outputFormat: "The same tree with next pointers populated.",
    constraints: [
      "0 <= number of nodes <= 6000",
      "-100 <= node value <= 100",
      "Use constant extra space.",
    ],
    examples: [
      {
        input: "root = [1,2,3,4,5,null,7]",
        output: "[1,#,2,3,#,4,5,7,#]",
        explanation: "Each level is threaded left-to-right with next pointers; # marks level ends.",
      },
      {
        input: "root = []",
        output: "[]",
        explanation: "Nothing to connect.",
      },
    ],
    approach: [
      "Process the tree level by level using the already-established next pointers of the current level.",
      "Maintain a dummy head for the next level and a tail pointer as you sweep the current level.",
      "For each node, append its existing children to the next level via the tail.",
      "Move down to the dummy's next once the current level is exhausted.",
    ],
    solutionSteps: [
      "Set cur to the root.",
      "For each level, use a dummy node; walk cur via next, attaching children to dummy through a tail pointer.",
      "After the level, set cur to dummy.next and reset dummy.",
      "Stop when there is no next level.",
    ],
    code: {
      python: `class Node:
    def __init__(self, val=0, left=None, right=None, next=None):
        self.val = val
        self.left = left
        self.right = right
        self.next = next

def connect(root: Node) -> Node:
    cur = root
    while cur:
        dummy = Node(0)
        tail = dummy
        node = cur
        while node:
            if node.left:
                tail.next = node.left
                tail = tail.next
            if node.right:
                tail.next = node.right
                tail = tail.next
            node = node.next
        cur = dummy.next
    return root
`,
      java: `class Node {
    int val;
    Node left, right, next;
    Node(int val) { this.val = val; }
}

class Solution {
    public Node connect(Node root) {
        Node cur = root;
        while (cur != null) {
            Node dummy = new Node(0);
            Node tail = dummy;
            Node node = cur;
            while (node != null) {
                if (node.left != null) { tail.next = node.left; tail = tail.next; }
                if (node.right != null) { tail.next = node.right; tail = tail.next; }
                node = node.next;
            }
            cur = dummy.next;
        }
        return root;
    }
}
`,
      cpp: `class Node {
public:
    int val;
    Node *left, *right, *next;
    Node(int x) : val(x), left(nullptr), right(nullptr), next(nullptr) {}
};

class Solution {
public:
    Node* connect(Node* root) {
        Node* cur = root;
        while (cur) {
            Node dummy(0);
            Node* tail = &dummy;
            Node* node = cur;
            while (node) {
                if (node->left) { tail->next = node->left; tail = tail->next; }
                if (node->right) { tail->next = node->right; tail = tail->next; }
                node = node->next;
            }
            cur = dummy.next;
        }
        return root;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Assuming a perfect tree and skipping the dummy/tail bookkeeping.",
      "Advancing to a child that may be null when threading the next level.",
      "Using a queue (O(n) space) when O(1) is required.",
    ],
    edgeCases: [
      "An empty tree.",
      "A tree with missing children scattered across levels.",
      "A single node.",
    ],
    whyItMatters:
      "Threading levels with a dummy-and-tail builder achieves O(1)-space level linking — a classic pointer-discipline exercise.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 464 — pure_dsa · trees · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "sum-root-leaf-numbers",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "trees",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Sum of All Root-to-Leaf Numbers",
    framing:
      "Each root-to-leaf path spells a number by concatenating digits (0-9) along the way. Sum the numbers formed by every root-to-leaf path.",
    statement:
      "Given the root of a binary tree where every node holds a single digit 0-9, each root-to-leaf path encodes a number. Return the total sum of all such numbers.",
    inputFormat: "A binary tree root with single-digit node values.",
    outputFormat: "An integer: the sum over all root-to-leaf numbers.",
    constraints: [
      "1 <= number of nodes <= 1000",
      "0 <= node value <= 9",
      "The total sum fits in a 32-bit integer.",
    ],
    examples: [
      {
        input: "root = [1,2,3]",
        output: "25",
        explanation: "Paths form 12 and 13; 12 + 13 = 25.",
      },
      {
        input: "root = [4,9,0,5,1]",
        output: "1026",
        explanation: "495 + 491 + 40 = 1026.",
      },
    ],
    approach: [
      "DFS carrying the number formed so far along the path.",
      "At each node, update current = current * 10 + node.val.",
      "At a leaf, add current to the running total.",
      "Sum contributions from both subtrees.",
    ],
    solutionSteps: [
      "DFS(node, current).",
      "If node is null, return 0.",
      "Update current; if it is a leaf, return current.",
      "Otherwise return DFS(left) + DFS(right).",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def sum_numbers(root: TreeNode) -> int:
    def dfs(node: TreeNode, current: int) -> int:
        if node is None:
            return 0
        current = current * 10 + node.val
        if node.left is None and node.right is None:
            return current
        return dfs(node.left, current) + dfs(node.right, current)

    return dfs(root, 0)
`,
      java: `class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}

class Solution {
    public int sumNumbers(TreeNode root) {
        return dfs(root, 0);
    }
    private int dfs(TreeNode node, int current) {
        if (node == null) return 0;
        current = current * 10 + node.val;
        if (node.left == null && node.right == null) return current;
        return dfs(node.left, current) + dfs(node.right, current);
    }
}
`,
      cpp: `struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

class Solution {
    int dfs(TreeNode* node, int current) {
        if (!node) return 0;
        current = current * 10 + node->val;
        if (!node->left && !node->right) return current;
        return dfs(node->left, current) + dfs(node->right, current);
    }
public:
    int sumNumbers(TreeNode* root) {
        return dfs(root, 0);
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(h)" },
    pitfalls: [
      "Adding interior-node partial numbers instead of only leaf totals.",
      "Treating a node with one child as a leaf.",
      "Building strings and parsing instead of accumulating numerically.",
    ],
    edgeCases: [
      "A single node (the number is its digit).",
      "Paths with leading zeros (still valid numbers).",
      "A skewed tree forming one long number.",
    ],
    whyItMatters:
      "Carrying an accumulator down a DFS path is the standard way to compute path-encoded values in trees.",
    estimatedMinutes: 20,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 465 — pure_dsa · trees · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "all-root-leaf-target-paths",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "All Root-to-Leaf Paths Summing to a Target",
    framing:
      "Enumerate every root-to-leaf path whose node values add up to a target total.",
    statement:
      "Given the root of a binary tree and an integer targetSum, return all root-to-leaf paths where the sum of the node values equals targetSum. Each path is the list of node values from root to leaf.",
    inputFormat: "A binary tree root and an integer targetSum.",
    outputFormat: "A list of qualifying root-to-leaf value paths.",
    constraints: [
      "0 <= number of nodes <= 5000",
      "-1000 <= node value, targetSum <= 1000",
      "A path must end at a leaf.",
    ],
    examples: [
      {
        input: "root = [5,4,8,11,null,13,4,7,2,null,null,5,1], targetSum = 22",
        output: "[[5,4,11,2],[5,8,4,5]]",
        explanation: "Two root-to-leaf paths sum to 22.",
      },
      {
        input: "root = [1,2,3], targetSum = 5",
        output: "[]",
        explanation: "No root-to-leaf path sums to 5.",
      },
    ],
    approach: [
      "Backtracking DFS maintaining the current path and remaining target.",
      "Subtract the node's value as you descend.",
      "At a leaf, if the remaining target is zero, record a copy of the path.",
      "Pop the node on the way back up to explore siblings.",
    ],
    solutionSteps: [
      "DFS(node, remaining, path).",
      "Append node.val; subtract from remaining.",
      "If it is a leaf and remaining == 0, save a copy of path.",
      "Recurse into children, then pop node.val.",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def path_sum(root: TreeNode, target_sum: int) -> list[list[int]]:
    result = []
    path = []

    def dfs(node: TreeNode, remaining: int) -> None:
        if node is None:
            return
        path.append(node.val)
        remaining -= node.val
        if node.left is None and node.right is None and remaining == 0:
            result.append(path[:])
        else:
            dfs(node.left, remaining)
            dfs(node.right, remaining)
        path.pop()

    dfs(root, target_sum)
    return result
`,
      java: `import java.util.*;

class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}

class Solution {
    public List<List<Integer>> pathSum(TreeNode root, int targetSum) {
        List<List<Integer>> result = new ArrayList<>();
        dfs(root, targetSum, new ArrayList<>(), result);
        return result;
    }
    private void dfs(TreeNode node, int remaining, List<Integer> path, List<List<Integer>> result) {
        if (node == null) return;
        path.add(node.val);
        remaining -= node.val;
        if (node.left == null && node.right == null && remaining == 0) {
            result.add(new ArrayList<>(path));
        } else {
            dfs(node.left, remaining, path, result);
            dfs(node.right, remaining, path, result);
        }
        path.remove(path.size() - 1);
    }
}
`,
      cpp: `#include <vector>
using namespace std;

struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

class Solution {
    void dfs(TreeNode* node, int remaining, vector<int>& path, vector<vector<int>>& result) {
        if (!node) return;
        path.push_back(node->val);
        remaining -= node->val;
        if (!node->left && !node->right && remaining == 0) {
            result.push_back(path);
        } else {
            dfs(node->left, remaining, path, result);
            dfs(node->right, remaining, path, result);
        }
        path.pop_back();
    }
public:
    vector<vector<int>> pathSum(TreeNode* root, int targetSum) {
        vector<vector<int>> result;
        vector<int> path;
        dfs(root, targetSum, path, result);
        return result;
    }
};
`,
    },
    complexity: { time: "O(n^2)", space: "O(h)" },
    pitfalls: [
      "Checking the sum at interior nodes rather than only at leaves.",
      "Storing the path by reference, so later pops corrupt saved results.",
      "Forgetting to backtrack the path after recursion.",
    ],
    edgeCases: [
      "An empty tree -> [].",
      "Negative values requiring full traversal.",
      "Multiple paths sharing a prefix.",
    ],
    whyItMatters:
      "Backtracking with a running path and target is the canonical enumeration pattern for constrained root-to-leaf searches.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 466 — pure_dsa · trees · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-complete-tree-nodes",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "trees",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Count Nodes in a Complete Binary Tree Faster Than O(n)",
    framing:
      "Count the nodes of a complete binary tree, exploiting completeness to beat a full traversal.",
    statement:
      "Given the root of a complete binary tree, return the number of nodes. A complete tree has every level full except possibly the last, which is filled left to right. Aim for better than O(n).",
    inputFormat: "A complete binary tree root.",
    outputFormat: "An integer: the node count.",
    constraints: [
      "0 <= number of nodes <= 5*10^4",
      "The tree is complete.",
      "Target complexity is O(log^2 n).",
    ],
    examples: [
      {
        input: "root = [1,2,3,4,5,6]",
        output: "6",
        explanation: "Six nodes total.",
      },
      {
        input: "root = []",
        output: "0",
        explanation: "An empty tree.",
      },
    ],
    approach: [
      "Measure the left height (always going left) and right height (always going right).",
      "If they are equal, the subtree is perfect: it has 2^height - 1 nodes.",
      "Otherwise recurse on both children and add 1.",
      "Each recursion costs O(log n) height computations, giving O(log^2 n) overall.",
    ],
    solutionSteps: [
      "Compute leftHeight by descending left pointers, rightHeight by descending right pointers.",
      "If equal, return (1 << height) - 1.",
      "Else return 1 + countNodes(left) + countNodes(right).",
      "Base case: a null node returns 0.",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def count_nodes(root: TreeNode) -> int:
    if root is None:
        return 0
    left_h = right_h = 0
    node = root
    while node:
        left_h += 1
        node = node.left
    node = root
    while node:
        right_h += 1
        node = node.right
    if left_h == right_h:
        return (1 << left_h) - 1
    return 1 + count_nodes(root.left) + count_nodes(root.right)
`,
      java: `class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}

class Solution {
    public int countNodes(TreeNode root) {
        if (root == null) return 0;
        int leftH = 0, rightH = 0;
        for (TreeNode node = root; node != null; node = node.left) leftH++;
        for (TreeNode node = root; node != null; node = node.right) rightH++;
        if (leftH == rightH) return (1 << leftH) - 1;
        return 1 + countNodes(root.left) + countNodes(root.right);
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
    int countNodes(TreeNode* root) {
        if (!root) return 0;
        int leftH = 0, rightH = 0;
        for (TreeNode* node = root; node; node = node->left) leftH++;
        for (TreeNode* node = root; node; node = node->right) rightH++;
        if (leftH == rightH) return (1 << leftH) - 1;
        return 1 + countNodes(root->left) + countNodes(root->right);
    }
};
`,
    },
    complexity: { time: "O(log^2 n)", space: "O(log n)" },
    pitfalls: [
      "Falling back to a full O(n) traversal and ignoring completeness.",
      "Shifting 1 by the wrong height (off-by-one in the perfect-tree formula).",
      "Not handling the empty tree.",
    ],
    edgeCases: [
      "An empty tree -> 0.",
      "A perfect tree (single height computation suffices).",
      "A last level partially filled.",
    ],
    whyItMatters:
      "Exploiting the perfect-subtree shortcut shows how structural guarantees turn linear work into logarithmic work.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 467 — pure_dsa · trees · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "prune-zero-subtrees",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "software_engineer"],
    title: "Prune Subtrees That Contain No One",
    framing:
      "In a binary tree of 0/1 flags, remove every subtree that does not contain a single 1. Return the pruned tree.",
    statement:
      "Given the root of a binary tree where each node's value is 0 or 1, prune the tree: remove every subtree not containing a 1. Return the resulting root (possibly null).",
    inputFormat: "A binary tree root with 0/1 node values.",
    outputFormat: "The pruned tree root.",
    constraints: [
      "1 <= number of nodes <= 200",
      "node value is 0 or 1.",
      "Pruning is recursive: a node is removed if its whole subtree is zeros.",
    ],
    examples: [
      {
        input: "root = [1,null,0,0,1]",
        output: "[1,null,0,null,1]",
        explanation: "The all-zero subtree is removed; the branch with a 1 stays.",
      },
      {
        input: "root = [1,0,1,0,0,0,1]",
        output: "[1,null,1,null,1]",
        explanation: "Every all-zero subtree is pruned.",
      },
    ],
    approach: [
      "Post-order recursion: prune children first, then decide about the current node.",
      "After pruning, if both children are null and the node's value is 0, return null (prune it).",
      "Otherwise keep the node with its pruned children.",
      "The recursion naturally cascades pruning upward.",
    ],
    solutionSteps: [
      "Recurse to prune the left and right subtrees, reassigning them.",
      "If left and right are both null and node.val == 0, return null.",
      "Otherwise return the node.",
      "Return the pruned root.",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def prune_tree(root: TreeNode) -> TreeNode:
    if root is None:
        return None
    root.left = prune_tree(root.left)
    root.right = prune_tree(root.right)
    if root.left is None and root.right is None and root.val == 0:
        return None
    return root
`,
      java: `class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}

class Solution {
    public TreeNode pruneTree(TreeNode root) {
        if (root == null) return null;
        root.left = pruneTree(root.left);
        root.right = pruneTree(root.right);
        if (root.left == null && root.right == null && root.val == 0) return null;
        return root;
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
    TreeNode* pruneTree(TreeNode* root) {
        if (!root) return nullptr;
        root->left = pruneTree(root->left);
        root->right = pruneTree(root->right);
        if (!root->left && !root->right && root->val == 0) return nullptr;
        return root;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(h)" },
    pitfalls: [
      "Pruning before recursing (pre-order), missing cascaded removals.",
      "Checking only the node's value and ignoring whether children survived.",
      "Forgetting to reassign the recursively pruned children.",
    ],
    edgeCases: [
      "An all-zero tree (prunes to null).",
      "A single node with value 1 (kept).",
      "A single node with value 0 (pruned to null).",
    ],
    whyItMatters:
      "Post-order subtree pruning based on an aggregate property models dead-branch elimination in decision trees and config trees.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 468 — pure_dsa · trees · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "longest-zigzag-tree-path",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Longest Alternating-Direction Path in a Tree",
    framing:
      "A zigzag path moves down a tree, alternating left and right at each step. Find the length (in edges) of the longest such zigzag path.",
    statement:
      "Given the root of a binary tree, a zigzag path starts at any node, picks a direction (left or right), moves to that child, then alternates direction at each subsequent step. Return the length of the longest zigzag path, counted in edges.",
    inputFormat: "A binary tree root.",
    outputFormat: "An integer: the longest zigzag path length in edges.",
    constraints: [
      "1 <= number of nodes <= 5*10^4",
      "-100 <= node value <= 100",
      "A single node has zigzag length 0.",
    ],
    examples: [
      {
        input: "root = [1,null,1,1,1,null,null,1,1,null,1,null,null,null,1]",
        output: "3",
        explanation: "The longest alternating path traverses 3 edges.",
      },
      {
        input: "root = [1,1,1,null,1,null,null,1,1,null,1]",
        output: "4",
        explanation: "An alternating chain of 4 edges exists.",
      },
    ],
    approach: [
      "DFS returning two values per node: the longest zigzag continuing as a left-step and as a right-step.",
      "Going left from a node extends the child's right-step chain by one.",
      "Going right extends the child's left-step chain by one.",
      "Track a global maximum over all computed chain lengths.",
    ],
    solutionSteps: [
      "DFS(node) returns (leftLen, rightLen) for paths leaving the node leftward and rightward.",
      "leftLen = 1 + (left child's rightLen) if a left child exists, else 0.",
      "rightLen = 1 + (right child's leftLen) if a right child exists, else 0.",
      "Update the answer with max(leftLen, rightLen) at each node.",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def longest_zigzag(root: TreeNode) -> int:
    best = [0]

    def dfs(node: TreeNode) -> tuple[int, int]:
        if node is None:
            return (-1, -1)  # -1 so a present child contributes +1 -> 0 edges baseline
        l_left, l_right = dfs(node.left)
        r_left, r_right = dfs(node.right)
        go_left = l_right + 1
        go_right = r_left + 1
        best[0] = max(best[0], go_left, go_right)
        return (go_left, go_right)

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
    public int longestZigZag(TreeNode root) {
        dfs(root);
        return best;
    }
    // returns {goLeft, goRight}
    private int[] dfs(TreeNode node) {
        if (node == null) return new int[]{-1, -1};
        int[] left = dfs(node.left);
        int[] right = dfs(node.right);
        int goLeft = left[1] + 1;
        int goRight = right[0] + 1;
        best = Math.max(best, Math.max(goLeft, goRight));
        return new int[]{goLeft, goRight};
    }
}
`,
      cpp: `#include <algorithm>
#include <array>
using namespace std;

struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

class Solution {
    int best = 0;
    array<int,2> dfs(TreeNode* node) {
        if (!node) return {-1, -1};
        auto left = dfs(node->left);
        auto right = dfs(node->right);
        int goLeft = left[1] + 1;
        int goRight = right[0] + 1;
        best = max(best, max(goLeft, goRight));
        return {goLeft, goRight};
    }
public:
    int longestZigZag(TreeNode* root) {
        dfs(root);
        return best;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(h)" },
    pitfalls: [
      "Mixing up which child extends the left-step versus right-step chain.",
      "Counting nodes rather than edges (the -1 base handles the offset).",
      "Returning a single value instead of both directional chains.",
    ],
    edgeCases: [
      "A single node -> 0.",
      "A straight (non-alternating) chain -> 1.",
      "A perfectly alternating path.",
    ],
    whyItMatters:
      "Returning multiple directional states per node generalizes tree DP to direction-dependent path constraints.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 469 — pure_dsa · trees · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-average-subtree",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Subtree With the Maximum Average Value",
    framing:
      "Across all subtrees of a binary tree, find the largest average node value (a single node counts as its own subtree).",
    statement:
      "Given the root of a binary tree, return the maximum average value over all subtrees. A subtree consists of a node and all of its descendants; the average is the sum of its values divided by its node count.",
    inputFormat: "A binary tree root with integer node values.",
    outputFormat: "A floating-point number: the maximum subtree average.",
    constraints: [
      "1 <= number of nodes <= 10^4",
      "0 <= node value <= 10^5",
      "Answers within 1e-5 are accepted.",
    ],
    examples: [
      {
        input: "root = [5,6,1]",
        output: "6.00000",
        explanation: "The single node 6 has the highest average.",
      },
      {
        input: "root = [0,null,1]",
        output: "1.00000",
        explanation: "The subtree rooted at 1 averages 1.",
      },
    ],
    approach: [
      "Post-order DFS returning (sum, count) for each subtree.",
      "Combine children's sums and counts with the current node.",
      "Compute the subtree average and update a global maximum.",
      "Return the global maximum after the traversal.",
    ],
    solutionSteps: [
      "DFS(node) returns (sum, count); a null node returns (0, 0).",
      "sum = node.val + leftSum + rightSum; count = 1 + leftCount + rightCount.",
      "Update best = max(best, sum / count).",
      "Return (sum, count); the answer is best.",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def maximum_average_subtree(root: TreeNode) -> float:
    best = [0.0]

    def dfs(node: TreeNode) -> tuple[int, int]:
        if node is None:
            return (0, 0)
        ls, lc = dfs(node.left)
        rs, rc = dfs(node.right)
        total = node.val + ls + rs
        count = 1 + lc + rc
        best[0] = max(best[0], total / count)
        return (total, count)

    dfs(root)
    return best[0]
`,
      java: `class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}

class Solution {
    double best = 0.0;
    public double maximumAverageSubtree(TreeNode root) {
        dfs(root);
        return best;
    }
    // returns {sum, count}
    private int[] dfs(TreeNode node) {
        if (node == null) return new int[]{0, 0};
        int[] left = dfs(node.left);
        int[] right = dfs(node.right);
        int total = node.val + left[0] + right[0];
        int count = 1 + left[1] + right[1];
        best = Math.max(best, (double) total / count);
        return new int[]{total, count};
    }
}
`,
      cpp: `#include <algorithm>
#include <array>
using namespace std;

struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

class Solution {
    double best = 0.0;
    array<long long,2> dfs(TreeNode* node) {
        if (!node) return {0, 0};
        auto left = dfs(node->left);
        auto right = dfs(node->right);
        long long total = node->val + left[0] + right[0];
        long long count = 1 + left[1] + right[1];
        best = max(best, (double) total / count);
        return {total, count};
    }
public:
    double maximumAverageSubtree(TreeNode* root) {
        dfs(root);
        return best;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(h)" },
    pitfalls: [
      "Computing averages with integer division and truncating.",
      "Forgetting that a single node is itself a valid subtree.",
      "Returning only the sum and recomputing counts separately.",
    ],
    edgeCases: [
      "A single node.",
      "A subtree whose average beats the whole tree's.",
      "All equal values.",
    ],
    whyItMatters:
      "Returning aggregate tuples from a post-order DFS is the universal pattern for subtree statistics.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 470 — pure_dsa · stack_queue · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "expand-nested-encoded-string",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "stack_queue",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Expand a Run-Length Encoded String With Nesting",
    framing:
      "A compact template uses the form k[token] to mean 'repeat token k times', and templates may nest. Expand the template into its full string.",
    statement:
      "Given an encoded string s following the rule k[encoded_string] meaning the bracketed content repeats k times (with arbitrary nesting), return the decoded string. The input is always valid; k is a positive integer; original content has no digits.",
    inputFormat: "An encoded string s.",
    outputFormat: "The fully expanded string.",
    constraints: [
      "1 <= s.length <= 30",
      "Brackets are balanced and the encoding is well-formed.",
      "1 <= k <= 300; expanded length stays manageable.",
    ],
    examples: [
      {
        input: 's = "3[a]2[bc]"',
        output: '"aaabcbc"',
        explanation: "a repeats 3 times, bc repeats twice.",
      },
      {
        input: 's = "3[a2[c]]"',
        output: '"accaccacc"',
        explanation: "Inner 2[c] -> cc, then 3[acc].",
      },
    ],
    approach: [
      "Use two stacks: one for repeat counts, one for the string built before each open bracket.",
      "Accumulate digits into the current number; on '[', push the count and the current string, then reset.",
      "On ']', pop the count and previous string, append the repeated current string.",
      "Plain characters extend the current string.",
    ],
    solutionSteps: [
      "Maintain curString and curNum, plus a numStack and a strStack.",
      "For a digit, build curNum; for '[', push curNum and curString then reset both.",
      "For ']', pop a count and a previous string; set curString = prev + curString * count.",
      "Otherwise append the character; return curString at the end.",
    ],
    code: {
      python: `def decode_string(s: str) -> str:
    num_stack = []
    str_stack = []
    cur = ""
    num = 0
    for ch in s:
        if ch.isdigit():
            num = num * 10 + int(ch)
        elif ch == "[":
            num_stack.append(num)
            str_stack.append(cur)
            num = 0
            cur = ""
        elif ch == "]":
            count = num_stack.pop()
            prev = str_stack.pop()
            cur = prev + cur * count
        else:
            cur += ch
    return cur
`,
      java: `import java.util.*;

class Solution {
    public String decodeString(String s) {
        Deque<Integer> numStack = new ArrayDeque<>();
        Deque<StringBuilder> strStack = new ArrayDeque<>();
        StringBuilder cur = new StringBuilder();
        int num = 0;
        for (char ch : s.toCharArray()) {
            if (Character.isDigit(ch)) {
                num = num * 10 + (ch - '0');
            } else if (ch == '[') {
                numStack.push(num);
                strStack.push(cur);
                num = 0;
                cur = new StringBuilder();
            } else if (ch == ']') {
                int count = numStack.pop();
                StringBuilder prev = strStack.pop();
                for (int i = 0; i < count; i++) prev.append(cur);
                cur = prev;
            } else {
                cur.append(ch);
            }
        }
        return cur.toString();
    }
}
`,
      cpp: `#include <string>
#include <stack>
using namespace std;

class Solution {
public:
    string decodeString(string s) {
        stack<int> numStack;
        stack<string> strStack;
        string cur;
        int num = 0;
        for (char ch : s) {
            if (isdigit(ch)) {
                num = num * 10 + (ch - '0');
            } else if (ch == '[') {
                numStack.push(num);
                strStack.push(cur);
                num = 0;
                cur.clear();
            } else if (ch == ']') {
                int count = numStack.top(); numStack.pop();
                string prev = strStack.top(); strStack.pop();
                string repeated;
                for (int i = 0; i < count; i++) repeated += cur;
                cur = prev + repeated;
            } else {
                cur += ch;
            }
        }
        return cur;
    }
};
`,
    },
    complexity: { time: "O(output length)", space: "O(depth + output)" },
    pitfalls: [
      "Handling multi-digit counts by overwriting rather than accumulating num.",
      "Resetting curString or curNum at the wrong time around brackets.",
      "Trying to use regex for arbitrarily nested structure.",
    ],
    edgeCases: [
      "No brackets (plain string).",
      "Deeply nested encodings.",
      "Multi-digit repeat counts.",
    ],
    whyItMatters:
      "Two-stack expansion is the canonical way to evaluate nested bracket grammars without recursion overhead.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 471 — pure_dsa · stack_queue · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "evaluate-arithmetic-expression",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "stack_queue",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer"],
    title: "Evaluate an Expression With Precedence but No Parentheses",
    framing:
      "Evaluate a basic arithmetic expression containing non-negative integers and +, -, *, / operators with standard precedence (no parentheses). Division truncates toward zero.",
    statement:
      "Given a string s representing a valid arithmetic expression with non-negative integers and the operators +, -, *, / (and spaces), evaluate it and return the integer result. Multiplication and division bind tighter than addition and subtraction; integer division truncates toward zero.",
    inputFormat: "An expression string s.",
    outputFormat: "An integer: the evaluated result.",
    constraints: [
      "1 <= s.length <= 3*10^5",
      "Operands are non-negative integers within 32-bit range.",
      "The expression is always valid.",
    ],
    examples: [
      {
        input: 's = "3+2*2"',
        output: "7",
        explanation: "2*2 = 4, then 3 + 4 = 7.",
      },
      {
        input: 's = " 3/2 "',
        output: "1",
        explanation: "Integer division truncates 1.5 to 1.",
      },
    ],
    approach: [
      "Scan left to right, tracking the last operator seen and the current number.",
      "Use a stack: on + push the number, on - push its negation.",
      "On * or /, pop the top, combine with the current number, and push the result.",
      "The answer is the sum of the stack.",
    ],
    solutionSteps: [
      "Initialize lastOp = '+', num = 0, and an empty stack.",
      "On a digit, build num; on an operator or end of string, apply lastOp.",
      "For * and /, modify the stack top; for + and -, push num (or -num).",
      "Update lastOp and reset num; finally sum the stack.",
    ],
    code: {
      python: `def calculate(s: str) -> int:
    stack = []
    num = 0
    last_op = "+"
    s = s + "+"  # sentinel to flush the final number
    for ch in s:
        if ch.isdigit():
            num = num * 10 + int(ch)
        elif ch in "+-*/":
            if last_op == "+":
                stack.append(num)
            elif last_op == "-":
                stack.append(-num)
            elif last_op == "*":
                stack.append(stack.pop() * num)
            else:  # division truncating toward zero
                stack.append(int(stack.pop() / num))
            last_op = ch
            num = 0
    return sum(stack)
`,
      java: `import java.util.*;

class Solution {
    public int calculate(String s) {
        Deque<Integer> stack = new ArrayDeque<>();
        int num = 0;
        char lastOp = '+';
        for (int i = 0; i <= s.length(); i++) {
            char ch = i < s.length() ? s.charAt(i) : '+';
            if (ch == ' ') continue;
            if (Character.isDigit(ch)) {
                num = num * 10 + (ch - '0');
            } else {
                if (lastOp == '+') stack.push(num);
                else if (lastOp == '-') stack.push(-num);
                else if (lastOp == '*') stack.push(stack.pop() * num);
                else stack.push(stack.pop() / num);
                lastOp = ch;
                num = 0;
            }
        }
        int sum = 0;
        for (int v : stack) sum += v;
        return sum;
    }
}
`,
      cpp: `#include <string>
#include <vector>
using namespace std;

class Solution {
public:
    int calculate(string s) {
        vector<int> stack;
        long num = 0;
        char lastOp = '+';
        for (int i = 0; i <= (int)s.size(); i++) {
            char ch = i < (int)s.size() ? s[i] : '+';
            if (ch == ' ') continue;
            if (isdigit(ch)) {
                num = num * 10 + (ch - '0');
            } else {
                if (lastOp == '+') stack.push_back(num);
                else if (lastOp == '-') stack.push_back(-num);
                else if (lastOp == '*') { stack.back() = stack.back() * num; }
                else { stack.back() = stack.back() / num; }
                lastOp = ch;
                num = 0;
            }
        }
        int sum = 0;
        for (int v : stack) sum += v;
        return sum;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Applying the current operator instead of the previous one to the number.",
      "Using floor division for negative intermediate results instead of truncation toward zero.",
      "Forgetting a sentinel to flush the final operand.",
    ],
    edgeCases: [
      "Leading/trailing spaces.",
      "Division producing truncation.",
      "A single number with no operators.",
    ],
    whyItMatters:
      "Stack-based precedence evaluation is the core of expression interpreters and spreadsheet/formula engines.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 472 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "longest-palindromic-subsequence",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Longest Palindromic Subsequence",
    framing:
      "Find the length of the longest subsequence of a string that reads the same forwards and backwards (characters need not be contiguous).",
    statement:
      "Given a string s, return the length of the longest palindromic subsequence in s.",
    inputFormat: "A string s of lowercase letters.",
    outputFormat: "An integer: the length of the longest palindromic subsequence.",
    constraints: [
      "1 <= s.length <= 1000",
      "s consists of lowercase English letters.",
      "The subsequence need not be contiguous.",
    ],
    examples: [
      {
        input: 's = "bbbab"',
        output: "4",
        explanation: "'bbbb' is the longest palindromic subsequence.",
      },
      {
        input: 's = "cbbd"',
        output: "2",
        explanation: "'bb' has length 2.",
      },
    ],
    approach: [
      "dp[i][j] = length of the longest palindromic subsequence in s[i..j].",
      "If s[i] == s[j], dp[i][j] = dp[i+1][j-1] + 2.",
      "Otherwise dp[i][j] = max(dp[i+1][j], dp[i][j-1]).",
      "Fill by increasing substring length; the answer is dp[0][n-1].",
    ],
    solutionSteps: [
      "Initialize dp[i][i] = 1 for all i.",
      "Iterate lengths from 2 to n, and starts i with j = i + length - 1.",
      "Apply the match/mismatch recurrence.",
      "Return dp[0][n-1].",
    ],
    code: {
      python: `def longest_palindrome_subseq(s: str) -> int:
    n = len(s)
    dp = [[0] * n for _ in range(n)]
    for i in range(n):
        dp[i][i] = 1
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            if s[i] == s[j]:
                dp[i][j] = (dp[i + 1][j - 1] if length > 2 else 0) + 2
            else:
                dp[i][j] = max(dp[i + 1][j], dp[i][j - 1])
    return dp[0][n - 1]
`,
      java: `class Solution {
    public int longestPalindromeSubseq(String s) {
        int n = s.length();
        int[][] dp = new int[n][n];
        for (int i = 0; i < n; i++) dp[i][i] = 1;
        for (int len = 2; len <= n; len++)
            for (int i = 0; i + len - 1 < n; i++) {
                int j = i + len - 1;
                if (s.charAt(i) == s.charAt(j))
                    dp[i][j] = (len > 2 ? dp[i + 1][j - 1] : 0) + 2;
                else
                    dp[i][j] = Math.max(dp[i + 1][j], dp[i][j - 1]);
            }
        return dp[0][n - 1];
    }
}
`,
      cpp: `#include <string>
#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int longestPalindromeSubseq(string s) {
        int n = s.size();
        vector<vector<int>> dp(n, vector<int>(n, 0));
        for (int i = 0; i < n; i++) dp[i][i] = 1;
        for (int len = 2; len <= n; len++)
            for (int i = 0; i + len - 1 < n; i++) {
                int j = i + len - 1;
                if (s[i] == s[j]) dp[i][j] = (len > 2 ? dp[i + 1][j - 1] : 0) + 2;
                else dp[i][j] = max(dp[i + 1][j], dp[i][j - 1]);
            }
        return dp[0][n - 1];
    }
};
`,
    },
    complexity: { time: "O(n^2)", space: "O(n^2)" },
    pitfalls: [
      "Confusing subsequence with substring (the latter requires contiguity).",
      "Mishandling the length-2 base case for the inner dp.",
      "Iterating intervals in an order where dp[i+1][j-1] is not ready.",
    ],
    edgeCases: [
      "A single character (length 1).",
      "An already-palindromic string (the whole length).",
      "All distinct characters (length 1).",
    ],
    whyItMatters:
      "This interval DP equals the LCS of a string with its reverse, a connection that recurs across alignment problems.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 473 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "all-expression-results",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "All Results From Different Operator Groupings",
    framing:
      "Given an arithmetic expression of numbers and +, -, * operators, compute every possible result obtainable by inserting parentheses in different ways.",
    statement:
      "Given a string expression of numbers and operators (+, -, *), return all possible results from grouping the numbers and operators differently. The results may be returned in any order.",
    inputFormat: "An expression string of integers and the operators +, -, *.",
    outputFormat: "A list of all distinct grouping results (duplicates allowed).",
    constraints: [
      "1 <= expression.length <= 20",
      "Operands are small non-negative integers.",
      "The number of results stays bounded (Catalan-scale).",
    ],
    examples: [
      {
        input: 'expression = "2-1-1"',
        output: "[0,2]",
        explanation: "(2-1)-1 = 0 and 2-(1-1) = 2.",
      },
      {
        input: 'expression = "2*3-4*5"',
        output: "[-34,-14,-10,-10,10]",
        explanation: "Different groupings yield these five values.",
      },
    ],
    approach: [
      "Divide and conquer at each operator: recursively evaluate the left and right substrings.",
      "Combine every left result with every right result using that operator.",
      "A substring with no operator is a single number (a base case).",
      "Memoize on the substring to reuse overlapping subproblems.",
    ],
    solutionSteps: [
      "If the substring is purely numeric, return [its integer value].",
      "For each operator position, recurse on left and right parts.",
      "Combine the two result lists with the operator.",
      "Collect and return all combinations (with memoization on the substring).",
    ],
    code: {
      python: `from functools import lru_cache

def diff_ways_to_compute(expression: str) -> list[int]:
    @lru_cache(maxsize=None)
    def compute(expr: str) -> tuple[int, ...]:
        if expr.isdigit():
            return (int(expr),)
        results = []
        for i, ch in enumerate(expr):
            if ch in "+-*":
                left = compute(expr[:i])
                right = compute(expr[i + 1:])
                for a in left:
                    for b in right:
                        if ch == "+":
                            results.append(a + b)
                        elif ch == "-":
                            results.append(a - b)
                        else:
                            results.append(a * b)
        return tuple(results)

    return list(compute(expression))
`,
      java: `import java.util.*;

class Solution {
    Map<String, List<Integer>> memo = new HashMap<>();
    public List<Integer> diffWaysToCompute(String expression) {
        if (memo.containsKey(expression)) return memo.get(expression);
        List<Integer> results = new ArrayList<>();
        boolean hasOp = false;
        for (int i = 0; i < expression.length(); i++) {
            char ch = expression.charAt(i);
            if (ch == '+' || ch == '-' || ch == '*') {
                hasOp = true;
                List<Integer> left = diffWaysToCompute(expression.substring(0, i));
                List<Integer> right = diffWaysToCompute(expression.substring(i + 1));
                for (int a : left)
                    for (int b : right) {
                        if (ch == '+') results.add(a + b);
                        else if (ch == '-') results.add(a - b);
                        else results.add(a * b);
                    }
            }
        }
        if (!hasOp) results.add(Integer.parseInt(expression));
        memo.put(expression, results);
        return results;
    }
}
`,
      cpp: `#include <string>
#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
    unordered_map<string, vector<int>> memo;
public:
    vector<int> diffWaysToCompute(string expression) {
        if (memo.count(expression)) return memo[expression];
        vector<int> results;
        bool hasOp = false;
        for (int i = 0; i < (int)expression.size(); i++) {
            char ch = expression[i];
            if (ch == '+' || ch == '-' || ch == '*') {
                hasOp = true;
                auto left = diffWaysToCompute(expression.substr(0, i));
                auto right = diffWaysToCompute(expression.substr(i + 1));
                for (int a : left)
                    for (int b : right) {
                        if (ch == '+') results.push_back(a + b);
                        else if (ch == '-') results.push_back(a - b);
                        else results.push_back(a * b);
                    }
            }
        }
        if (!hasOp) results.push_back(stoi(expression));
        memo[expression] = results;
        return results;
    }
};
`,
    },
    complexity: { time: "O(Catalan(n))", space: "O(Catalan(n))" },
    pitfalls: [
      "Treating a multi-digit number as an operator boundary.",
      "Missing the base case for an operator-free substring.",
      "Skipping memoization, recomputing identical substrings exponentially.",
    ],
    edgeCases: [
      "A single number (one result).",
      "Only one operator (two operands).",
      "Repeated subexpressions benefiting from memoization.",
    ],
    whyItMatters:
      "Divide-and-conquer over operator splits is the template for parenthesization, matrix-chain, and parse-tree enumeration.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 474 — pure_dsa · dp_1d · medium · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-arithmetic-runs",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "dp_1d",
    difficulty: "medium",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Count Contiguous Arithmetic Subarrays",
    framing:
      "Count the number of contiguous subarrays (length >= 3) of a reading series that form an arithmetic progression — equal consecutive differences.",
    statement:
      "Given an integer array nums, return the number of arithmetic subarrays. A subarray is arithmetic if it has at least 3 elements and the difference between consecutive elements is constant.",
    inputFormat: "An integer array nums.",
    outputFormat: "An integer: the count of arithmetic subarrays.",
    constraints: [
      "1 <= nums.length <= 5000",
      "-1000 <= nums[i] <= 1000",
      "Subarrays must be contiguous and length >= 3.",
    ],
    examples: [
      {
        input: "nums = [1,2,3,4]",
        output: "3",
        explanation: "[1,2,3], [2,3,4], and [1,2,3,4] are arithmetic.",
      },
      {
        input: "nums = [1,3,5,7,9]",
        output: "6",
        explanation: "Several overlapping arithmetic runs contribute 6.",
      },
    ],
    approach: [
      "Track cur, the count of arithmetic subarrays ending at the current index.",
      "If nums[i] - nums[i-1] equals the previous difference, cur increases by 1; else cur resets to 0.",
      "Add cur to the running total at each step.",
      "This counts every qualifying subarray exactly once.",
    ],
    solutionSteps: [
      "Initialize total = 0 and cur = 0.",
      "From i = 2, compare nums[i]-nums[i-1] with nums[i-1]-nums[i-2].",
      "If equal, cur += 1, else cur = 0; add cur to total.",
      "Return total.",
    ],
    code: {
      python: `def number_of_arithmetic_slices(nums: list[int]) -> int:
    total = 0
    cur = 0
    for i in range(2, len(nums)):
        if nums[i] - nums[i - 1] == nums[i - 1] - nums[i - 2]:
            cur += 1
            total += cur
        else:
            cur = 0
    return total
`,
      java: `class Solution {
    public int numberOfArithmeticSlices(int[] nums) {
        int total = 0, cur = 0;
        for (int i = 2; i < nums.length; i++) {
            if (nums[i] - nums[i - 1] == nums[i - 1] - nums[i - 2]) {
                cur++;
                total += cur;
            } else {
                cur = 0;
            }
        }
        return total;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int numberOfArithmeticSlices(vector<int>& nums) {
        int total = 0, cur = 0;
        for (int i = 2; i < (int)nums.size(); i++) {
            if (nums[i] - nums[i - 1] == nums[i - 1] - nums[i - 2]) {
                cur++;
                total += cur;
            } else {
                cur = 0;
            }
        }
        return total;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Counting length-2 subarrays, which do not qualify.",
      "Resetting cur but forgetting it is per-ending-index.",
      "Recomputing all subarrays in O(n^2) when O(n) suffices.",
    ],
    edgeCases: [
      "Fewer than 3 elements -> 0.",
      "A fully arithmetic array.",
      "No three-in-a-row arithmetic run.",
    ],
    whyItMatters:
      "The 'count runs ending here' DP is a compact O(1)-space pattern for tallying maximal-structure subarrays.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 475 — pure_dsa · dp_1d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "fewest-squares-sum",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Fewest Perfect Squares Summing to N",
    framing:
      "Express a target n as a sum of perfect squares (1, 4, 9, 16, ...) using as few terms as possible.",
    statement:
      "Given an integer n, return the least number of perfect-square numbers that sum to n.",
    inputFormat: "A single integer n.",
    outputFormat: "An integer: the minimum count of perfect squares.",
    constraints: [
      "1 <= n <= 10^4",
      "Squares may be reused.",
      "Every n has a solution (1 is a perfect square).",
    ],
    examples: [
      {
        input: "n = 12",
        output: "3",
        explanation: "12 = 4 + 4 + 4.",
      },
      {
        input: "n = 13",
        output: "2",
        explanation: "13 = 4 + 9.",
      },
    ],
    approach: [
      "Unbounded-knapsack DP: dp[x] = fewest squares summing to x.",
      "dp[0] = 0; dp[x] = 1 + min over squares s <= x of dp[x - s].",
      "Iterate x from 1 to n, trying each square j*j <= x.",
      "Return dp[n].",
    ],
    solutionSteps: [
      "Initialize dp[0] = 0 and dp[x] = infinity otherwise.",
      "For each x, loop j while j*j <= x, updating dp[x] = min(dp[x], dp[x - j*j] + 1).",
      "Return dp[n].",
      "The Lagrange four-square theorem bounds the answer at 4, but DP is clean and general.",
    ],
    code: {
      python: `def num_squares(n: int) -> int:
    dp = [0] + [float("inf")] * n
    for x in range(1, n + 1):
        j = 1
        while j * j <= x:
            if dp[x - j * j] + 1 < dp[x]:
                dp[x] = dp[x - j * j] + 1
            j += 1
    return dp[n]
`,
      java: `class Solution {
    public int numSquares(int n) {
        int[] dp = new int[n + 1];
        java.util.Arrays.fill(dp, Integer.MAX_VALUE);
        dp[0] = 0;
        for (int x = 1; x <= n; x++)
            for (int j = 1; j * j <= x; j++)
                dp[x] = Math.min(dp[x], dp[x - j * j] + 1);
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
    int numSquares(int n) {
        vector<int> dp(n + 1, INT_MAX);
        dp[0] = 0;
        for (int x = 1; x <= n; x++)
            for (int j = 1; j * j <= x; j++)
                dp[x] = min(dp[x], dp[x - j * j] + 1);
        return dp[n];
    }
};
`,
    },
    complexity: { time: "O(n * sqrt(n))", space: "O(n)" },
    pitfalls: [
      "Greedily subtracting the largest square, which is not always optimal.",
      "Including 0 as a square term.",
      "Off-by-one with the dp sentinel comparison.",
    ],
    edgeCases: [
      "n a perfect square (answer 1).",
      "n = 1 (answer 1).",
      "Numbers requiring four squares.",
    ],
    whyItMatters:
      "Minimum-coins-style DP over a derived item set (perfect squares) reinforces the unbounded-knapsack template.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 476 — pure_dsa · dp_1d · medium · frontend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-fence-paintings",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "dp_1d",
    difficulty: "medium",
    primaryRole: "frontend_engineer",
    roles: ["frontend_engineer", "software_engineer"],
    title: "Ways to Paint a Fence Without Three in a Row",
    framing:
      "Paint a row of fence posts using k colors so that no three consecutive posts share the same color. Count the distinct colorings.",
    statement:
      "Given n posts and k colors, return the number of ways to paint the fence such that at most two adjacent posts have the same color.",
    inputFormat: "Two integers n (posts) and k (colors).",
    outputFormat: "An integer: the number of valid colorings.",
    constraints: [
      "1 <= n <= 50",
      "1 <= k <= 100",
      "No three consecutive posts may share a color.",
    ],
    examples: [
      {
        input: "n = 3, k = 2",
        output: "6",
        explanation: "Of 8 colorings, the two all-same ones are invalid, leaving 6.",
      },
      {
        input: "n = 1, k = 1",
        output: "1",
        explanation: "One post, one color.",
      },
    ],
    approach: [
      "Track `same` (last two posts share a color) and `diff` (last two differ).",
      "Next post differing from the previous: (same + diff) * (k - 1).",
      "Next post same as the previous: only allowed if the prior two differed, contributing diff.",
      "Total ways = same + diff after n posts.",
    ],
    solutionSteps: [
      "Base: with 1 post, total = k; set up the two-post case for same and diff.",
      "Iterate from post 3 to n updating same and diff with the recurrences.",
      "Use temporaries so each step reads the prior values.",
      "Return same + diff (handle n = 1 directly).",
    ],
    code: {
      python: `def num_ways(n: int, k: int) -> int:
    if n == 0:
        return 0
    if n == 1:
        return k
    same = k          # two posts, same color
    diff = k * (k - 1)  # two posts, different colors
    for _ in range(3, n + 1):
        new_diff = (same + diff) * (k - 1)
        new_same = diff
        same, diff = new_same, new_diff
    return same + diff
`,
      java: `class Solution {
    public int numWays(int n, int k) {
        if (n == 0) return 0;
        if (n == 1) return k;
        long same = k;
        long diff = (long) k * (k - 1);
        for (int i = 3; i <= n; i++) {
            long newDiff = (same + diff) * (k - 1);
            long newSame = diff;
            same = newSame;
            diff = newDiff;
        }
        return (int) (same + diff);
    }
}
`,
      cpp: `class Solution {
public:
    int numWays(int n, int k) {
        if (n == 0) return 0;
        if (n == 1) return k;
        long long same = k;
        long long diff = (long long) k * (k - 1);
        for (int i = 3; i <= n; i++) {
            long long newDiff = (same + diff) * (k - 1);
            long long newSame = diff;
            same = newSame;
            diff = newDiff;
        }
        return (int)(same + diff);
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Allowing three in a row by letting `same` chain into another `same`.",
      "Forgetting the n = 1 base case.",
      "Integer overflow for larger k without 64-bit accumulation.",
    ],
    edgeCases: [
      "n = 1 (k ways).",
      "k = 1 with n >= 3 (zero valid colorings beyond two posts).",
      "Large k.",
    ],
    whyItMatters:
      "Splitting state into 'same as previous' vs 'different' is a clean two-state DP reused in run-length and adjacency-constrained counting.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 477 — pure_dsa · greedy · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "longest-pair-chain",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "greedy",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Longest Chain of Non-Overlapping Pairs",
    framing:
      "Given pairs [a, b] with a < b, a pair [c, d] can follow [a, b] only if b < c. Find the length of the longest chain you can form.",
    statement:
      "Given an array pairs where pairs[i] = [left, right] and left < right, a pair p2 can follow p1 if p1.right < p2.left. Return the length of the longest chain that can be formed; pairs may be used in any order.",
    inputFormat: "A list pairs of [left, right] with left < right.",
    outputFormat: "An integer: the longest chain length.",
    constraints: [
      "1 <= pairs.length <= 1000",
      "-1000 <= left < right <= 1000",
      "Each pair may be used at most once.",
    ],
    examples: [
      {
        input: "pairs = [[1,2],[2,3],[3,4]]",
        output: "2",
        explanation: "[1,2] -> [3,4] is the longest chain.",
      },
      {
        input: "pairs = [[1,2],[7,8],[4,5]]",
        output: "3",
        explanation: "[1,2] -> [4,5] -> [7,8] chains all three.",
      },
    ],
    approach: [
      "This is interval scheduling: sort pairs by their right endpoint.",
      "Greedily extend the chain whenever the next pair's left exceeds the current chain end.",
      "Each accepted pair sets a new chain end.",
      "The count of accepted pairs is the answer.",
    ],
    solutionSteps: [
      "Sort pairs ascending by the second element.",
      "Track curEnd = -infinity and a counter.",
      "For each pair, if pair.left > curEnd, accept it: increment the counter and set curEnd = pair.right.",
      "Return the counter.",
    ],
    code: {
      python: `def find_longest_chain(pairs: list[list[int]]) -> int:
    pairs.sort(key=lambda p: p[1])
    cur_end = float("-inf")
    count = 0
    for left, right in pairs:
        if left > cur_end:
            count += 1
            cur_end = right
    return count
`,
      java: `import java.util.*;

class Solution {
    public int findLongestChain(int[][] pairs) {
        Arrays.sort(pairs, (a, b) -> a[1] - b[1]);
        int curEnd = Integer.MIN_VALUE, count = 0;
        for (int[] p : pairs) {
            if (p[0] > curEnd) {
                count++;
                curEnd = p[1];
            }
        }
        return count;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
#include <climits>
using namespace std;

class Solution {
public:
    int findLongestChain(vector<vector<int>>& pairs) {
        sort(pairs.begin(), pairs.end(), [](const vector<int>& a, const vector<int>& b) {
            return a[1] < b[1];
        });
        int curEnd = INT_MIN, count = 0;
        for (auto& p : pairs) {
            if (p[0] > curEnd) {
                count++;
                curEnd = p[1];
            }
        }
        return count;
    }
};
`,
    },
    complexity: { time: "O(n log n)", space: "O(1)" },
    pitfalls: [
      "Sorting by the left endpoint, which breaks the greedy optimality.",
      "Using >= instead of > for the non-overlap condition.",
      "Falling back to an O(n^2) DP unnecessarily.",
    ],
    edgeCases: [
      "A single pair.",
      "All pairs overlapping (chain length 1).",
      "Already-sorted disjoint pairs.",
    ],
    whyItMatters:
      "Earliest-finishing-first greedy is the optimal strategy for interval scheduling — chaining, room booking, and job sequencing.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 478 — pure_dsa · backtracking · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "unique-arrangements-with-dupes",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "All Distinct Permutations of a Multiset",
    framing:
      "Generate every distinct ordering of a collection that may contain duplicate values, without emitting the same ordering twice.",
    statement:
      "Given a collection of numbers nums that might contain duplicates, return all unique permutations in any order.",
    inputFormat: "An integer array nums, possibly with duplicates.",
    outputFormat: "A list of all unique permutations.",
    constraints: [
      "1 <= nums.length <= 8",
      "-10 <= nums[i] <= 10",
      "Duplicates are possible.",
    ],
    examples: [
      {
        input: "nums = [1,1,2]",
        output: "[[1,1,2],[1,2,1],[2,1,1]]",
        explanation: "The duplicate 1s collapse symmetric permutations.",
      },
      {
        input: "nums = [1,2,3]",
        output: "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]",
        explanation: "With no duplicates, all 6 permutations appear.",
      },
    ],
    approach: [
      "Sort nums so equal values are adjacent.",
      "Backtrack, choosing an unused element for each position.",
      "Skip a value if it equals the previous value and the previous one is unused at this level (prevents duplicate branches).",
      "Record a permutation when its length equals nums.length.",
    ],
    solutionSteps: [
      "Sort nums and keep a used[] flag array.",
      "At each position, iterate candidates; skip used ones.",
      "Skip nums[i] when nums[i] == nums[i-1] and used[i-1] is false.",
      "Choose, recurse, then unchoose to backtrack.",
    ],
    code: {
      python: `def permute_unique(nums: list[int]) -> list[list[int]]:
    nums.sort()
    n = len(nums)
    used = [False] * n
    result = []
    path = []

    def backtrack() -> None:
        if len(path) == n:
            result.append(path[:])
            return
        for i in range(n):
            if used[i]:
                continue
            if i > 0 and nums[i] == nums[i - 1] and not used[i - 1]:
                continue
            used[i] = True
            path.append(nums[i])
            backtrack()
            path.pop()
            used[i] = False

    backtrack()
    return result
`,
      java: `import java.util.*;

class Solution {
    public List<List<Integer>> permuteUnique(int[] nums) {
        Arrays.sort(nums);
        List<List<Integer>> result = new ArrayList<>();
        boolean[] used = new boolean[nums.length];
        backtrack(nums, used, new ArrayList<>(), result);
        return result;
    }
    private void backtrack(int[] nums, boolean[] used, List<Integer> path, List<List<Integer>> result) {
        if (path.size() == nums.length) {
            result.add(new ArrayList<>(path));
            return;
        }
        for (int i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            if (i > 0 && nums[i] == nums[i - 1] && !used[i - 1]) continue;
            used[i] = true;
            path.add(nums[i]);
            backtrack(nums, used, path, result);
            path.remove(path.size() - 1);
            used[i] = false;
        }
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
    void backtrack(vector<int>& nums, vector<bool>& used, vector<int>& path, vector<vector<int>>& result) {
        if (path.size() == nums.size()) {
            result.push_back(path);
            return;
        }
        for (int i = 0; i < (int)nums.size(); i++) {
            if (used[i]) continue;
            if (i > 0 && nums[i] == nums[i - 1] && !used[i - 1]) continue;
            used[i] = true;
            path.push_back(nums[i]);
            backtrack(nums, used, path, result);
            path.pop_back();
            used[i] = false;
        }
    }
public:
    vector<vector<int>> permuteUnique(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        vector<vector<int>> result;
        vector<bool> used(nums.size(), false);
        vector<int> path;
        backtrack(nums, used, path, result);
        return result;
    }
};
`,
    },
    complexity: { time: "O(n * n!)", space: "O(n)" },
    pitfalls: [
      "Forgetting to sort, so the duplicate-skip rule cannot trigger.",
      "Using the wrong skip condition (used[i-1] true vs false) and dropping valid permutations.",
      "Storing the path by reference into the results.",
    ],
    edgeCases: [
      "All identical elements (one permutation).",
      "All distinct elements (n! permutations).",
      "A single element.",
    ],
    whyItMatters:
      "The 'skip duplicate siblings' rule is the canonical way to enumerate distinct arrangements of a multiset.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 479 — pure_dsa · backtracking · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "unique-subsets-with-dupes",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "backtracking",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "All Distinct Subsets of a Multiset",
    framing:
      "Enumerate every distinct subset (the power set) of a collection that may contain duplicates, without repeating any subset.",
    statement:
      "Given an integer array nums that may contain duplicates, return all possible subsets (the power set) without duplicate subsets, in any order.",
    inputFormat: "An integer array nums, possibly with duplicates.",
    outputFormat: "A list of all unique subsets.",
    constraints: [
      "1 <= nums.length <= 10",
      "-10 <= nums[i] <= 10",
      "Duplicates are possible.",
    ],
    examples: [
      {
        input: "nums = [1,2,2]",
        output: "[[],[1],[1,2],[1,2,2],[2],[2,2]]",
        explanation: "Duplicate 2s do not produce duplicate subsets.",
      },
      {
        input: "nums = [0]",
        output: "[[],[0]]",
        explanation: "Two subsets for a single element.",
      },
    ],
    approach: [
      "Sort nums so duplicates are adjacent.",
      "Backtrack over start indices, adding the current path as a subset at each call.",
      "At each level, skip a value equal to the previous candidate within the same loop iteration.",
      "This prevents generating the same subset twice.",
    ],
    solutionSteps: [
      "Sort nums; define backtrack(start) that records the current path.",
      "Loop i from start; skip if i > start and nums[i] == nums[i-1].",
      "Choose nums[i], recurse with start = i+1, then unchoose.",
      "Collect every recorded path.",
    ],
    code: {
      python: `def subsets_with_dup(nums: list[int]) -> list[list[int]]:
    nums.sort()
    result = []
    path = []

    def backtrack(start: int) -> None:
        result.append(path[:])
        for i in range(start, len(nums)):
            if i > start and nums[i] == nums[i - 1]:
                continue
            path.append(nums[i])
            backtrack(i + 1)
            path.pop()

    backtrack(0)
    return result
`,
      java: `import java.util.*;

class Solution {
    public List<List<Integer>> subsetsWithDup(int[] nums) {
        Arrays.sort(nums);
        List<List<Integer>> result = new ArrayList<>();
        backtrack(nums, 0, new ArrayList<>(), result);
        return result;
    }
    private void backtrack(int[] nums, int start, List<Integer> path, List<List<Integer>> result) {
        result.add(new ArrayList<>(path));
        for (int i = start; i < nums.length; i++) {
            if (i > start && nums[i] == nums[i - 1]) continue;
            path.add(nums[i]);
            backtrack(nums, i + 1, path, result);
            path.remove(path.size() - 1);
        }
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
    void backtrack(vector<int>& nums, int start, vector<int>& path, vector<vector<int>>& result) {
        result.push_back(path);
        for (int i = start; i < (int)nums.size(); i++) {
            if (i > start && nums[i] == nums[i - 1]) continue;
            path.push_back(nums[i]);
            backtrack(nums, i + 1, path, result);
            path.pop_back();
        }
    }
public:
    vector<vector<int>> subsetsWithDup(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        vector<vector<int>> result;
        vector<int> path;
        backtrack(nums, 0, path, result);
        return result;
    }
};
`,
    },
    complexity: { time: "O(n * 2^n)", space: "O(n)" },
    pitfalls: [
      "Using i > 0 instead of i > start, wrongly skipping legitimate subsets.",
      "Forgetting to sort, breaking the duplicate-skip logic.",
      "Recording subsets only at leaves rather than at every node.",
    ],
    edgeCases: [
      "All identical elements.",
      "All distinct elements (full power set).",
      "A single element.",
    ],
    whyItMatters:
      "Subset enumeration with the i > start duplicate guard is the standard power-set-of-a-multiset technique.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 480 — pure_dsa · backtracking · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "combos-each-used-once",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer"],
    title: "Combination Sum Where Each Number Is Used Once",
    framing:
      "From a list of candidate values (with possible duplicates), find all unique combinations that sum to a target, using each list element at most once.",
    statement:
      "Given a collection candidates (which may contain duplicates) and a target, return all unique combinations where the chosen numbers sum to target. Each number in candidates may be used at most once in a combination; the solution set must not contain duplicate combinations.",
    inputFormat: "An array candidates and an integer target.",
    outputFormat: "A list of all unique combinations summing to target.",
    constraints: [
      "1 <= candidates.length <= 100",
      "1 <= candidates[i] <= 50, 1 <= target <= 30",
      "Duplicates are possible.",
    ],
    examples: [
      {
        input: "candidates = [10,1,2,7,6,1,5], target = 8",
        output: "[[1,1,6],[1,2,5],[1,7],[2,6]]",
        explanation: "Four unique combinations sum to 8.",
      },
      {
        input: "candidates = [2,5,2,1,2], target = 5",
        output: "[[1,2,2],[5]]",
        explanation: "Two unique combinations sum to 5.",
      },
    ],
    approach: [
      "Sort candidates so duplicates are adjacent and pruning is possible.",
      "Backtrack from a start index, never reusing the same index.",
      "Skip a candidate equal to the previous one at the same recursion level to avoid duplicate combinations.",
      "Prune when the current candidate exceeds the remaining target.",
    ],
    solutionSteps: [
      "Sort candidates; define backtrack(start, remaining).",
      "If remaining == 0, record the path.",
      "Loop i from start; skip duplicates (i > start and equal), break if candidates[i] > remaining.",
      "Choose candidates[i], recurse with start = i+1 and remaining - candidates[i], then unchoose.",
    ],
    code: {
      python: `def combination_sum2(candidates: list[int], target: int) -> list[list[int]]:
    candidates.sort()
    result = []
    path = []

    def backtrack(start: int, remaining: int) -> None:
        if remaining == 0:
            result.append(path[:])
            return
        for i in range(start, len(candidates)):
            if i > start and candidates[i] == candidates[i - 1]:
                continue
            if candidates[i] > remaining:
                break
            path.append(candidates[i])
            backtrack(i + 1, remaining - candidates[i])
            path.pop()

    backtrack(0, target)
    return result
`,
      java: `import java.util.*;

class Solution {
    public List<List<Integer>> combinationSum2(int[] candidates, int target) {
        Arrays.sort(candidates);
        List<List<Integer>> result = new ArrayList<>();
        backtrack(candidates, 0, target, new ArrayList<>(), result);
        return result;
    }
    private void backtrack(int[] cand, int start, int remaining, List<Integer> path, List<List<Integer>> result) {
        if (remaining == 0) {
            result.add(new ArrayList<>(path));
            return;
        }
        for (int i = start; i < cand.length; i++) {
            if (i > start && cand[i] == cand[i - 1]) continue;
            if (cand[i] > remaining) break;
            path.add(cand[i]);
            backtrack(cand, i + 1, remaining - cand[i], path, result);
            path.remove(path.size() - 1);
        }
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
    void backtrack(vector<int>& cand, int start, int remaining, vector<int>& path, vector<vector<int>>& result) {
        if (remaining == 0) {
            result.push_back(path);
            return;
        }
        for (int i = start; i < (int)cand.size(); i++) {
            if (i > start && cand[i] == cand[i - 1]) continue;
            if (cand[i] > remaining) break;
            path.push_back(cand[i]);
            backtrack(cand, i + 1, remaining - cand[i], path, result);
            path.pop_back();
        }
    }
public:
    vector<vector<int>> combinationSum2(vector<int>& candidates, int target) {
        sort(candidates.begin(), candidates.end());
        vector<vector<int>> result;
        vector<int> path;
        backtrack(candidates, 0, target, path, result);
        return result;
    }
};
`,
    },
    complexity: { time: "O(2^n)", space: "O(n)" },
    pitfalls: [
      "Reusing the same index (start = i instead of i + 1).",
      "Skipping duplicates with i > 0 rather than i > start.",
      "Not breaking early when sorted candidates exceed the remaining target.",
    ],
    edgeCases: [
      "No combination reaches the target.",
      "Duplicates forming the same sum in different positions.",
      "A single candidate equal to the target.",
    ],
    whyItMatters:
      "Use-once combination enumeration with duplicate pruning is a staple constraint-satisfaction backtracking pattern.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 481 — pure_dsa · backtracking · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "valid-ip-segmentations",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "platform_engineer"],
    title: "All Valid IPv4 Addresses From a Digit String",
    framing:
      "Given a string of digits, insert three dots to form every possible valid IPv4 address. Each of the four parts must be 0-255 with no leading zeros.",
    statement:
      "Given a string s containing only digits, return all possible valid IPv4 addresses formed by inserting dots into s. A valid part is between 0 and 255 inclusive and cannot have leading zeros (except the single digit 0). You may not reorder or remove digits.",
    inputFormat: "A digit string s.",
    outputFormat: "A list of all valid IPv4 address strings.",
    constraints: [
      "1 <= s.length <= 20",
      "s consists of digits only.",
      "Exactly four parts separated by dots.",
    ],
    examples: [
      {
        input: 's = "25525511135"',
        output: '["255.255.11.135","255.255.111.35"]',
        explanation: "Two valid segmentations exist.",
      },
      {
        input: 's = "0000"',
        output: '["0.0.0.0"]',
        explanation: "Each part is a single zero.",
      },
    ],
    approach: [
      "Backtrack over four segments, each taking 1 to 3 digits.",
      "Validate each segment: value <= 255 and no leading zero unless it is exactly '0'.",
      "When four segments are chosen and the whole string is consumed, record the address.",
      "Prune impossible lengths early.",
    ],
    solutionSteps: [
      "backtrack(start, partsSoFar, currentParts).",
      "If partsSoFar == 4 and start == n, join parts with dots and record.",
      "Try segment lengths 1..3 from start; validate each.",
      "Recurse with start advanced and the part appended, then backtrack.",
    ],
    code: {
      python: `def restore_ip_addresses(s: str) -> list[str]:
    n = len(s)
    result = []
    parts = []

    def valid(seg: str) -> bool:
        if len(seg) > 1 and seg[0] == "0":
            return False
        return int(seg) <= 255

    def backtrack(start: int) -> None:
        if len(parts) == 4:
            if start == n:
                result.append(".".join(parts))
            return
        for length in range(1, 4):
            if start + length > n:
                break
            seg = s[start:start + length]
            if valid(seg):
                parts.append(seg)
                backtrack(start + length)
                parts.pop()

    backtrack(0)
    return result
`,
      java: `import java.util.*;

class Solution {
    public List<String> restoreIpAddresses(String s) {
        List<String> result = new ArrayList<>();
        backtrack(s, 0, new ArrayList<>(), result);
        return result;
    }
    private void backtrack(String s, int start, List<String> parts, List<String> result) {
        if (parts.size() == 4) {
            if (start == s.length()) result.add(String.join(".", parts));
            return;
        }
        for (int len = 1; len <= 3 && start + len <= s.length(); len++) {
            String seg = s.substring(start, start + len);
            if (valid(seg)) {
                parts.add(seg);
                backtrack(s, start + len, parts, result);
                parts.remove(parts.size() - 1);
            }
        }
    }
    private boolean valid(String seg) {
        if (seg.length() > 1 && seg.charAt(0) == '0') return false;
        return Integer.parseInt(seg) <= 255;
    }
}
`,
      cpp: `#include <string>
#include <vector>
using namespace std;

class Solution {
    bool valid(const string& seg) {
        if (seg.size() > 1 && seg[0] == '0') return false;
        return stoi(seg) <= 255;
    }
    void backtrack(const string& s, int start, vector<string>& parts, vector<string>& result) {
        if ((int)parts.size() == 4) {
            if (start == (int)s.size()) {
                string ip = parts[0] + "." + parts[1] + "." + parts[2] + "." + parts[3];
                result.push_back(ip);
            }
            return;
        }
        for (int len = 1; len <= 3 && start + len <= (int)s.size(); len++) {
            string seg = s.substr(start, len);
            if (valid(seg)) {
                parts.push_back(seg);
                backtrack(s, start + len, parts, result);
                parts.pop_back();
            }
        }
    }
public:
    vector<string> restoreIpAddresses(string s) {
        vector<string> result, parts;
        backtrack(s, 0, parts, result);
        return result;
    }
};
`,
    },
    complexity: { time: "O(1) (bounded by 3^4 splits)", space: "O(1)" },
    pitfalls: [
      "Allowing leading zeros like '01' or '00'.",
      "Permitting segments above 255.",
      "Recording an address before consuming the entire string.",
    ],
    edgeCases: [
      "A string too short or too long to form four 1-3 digit parts.",
      "All zeros.",
      "Maximal segments like 255.255.255.255.",
    ],
    whyItMatters:
      "Bounded segmentation with validity checks models structured-string parsing and tokenization with format rules.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 482 — pure_dsa · backtracking · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-queen-placements",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Count Conflict-Free Queen Placements",
    framing:
      "Count the number of ways to place n non-attacking queens on an n x n board (no two share a row, column, or diagonal).",
    statement:
      "Given an integer n, return the number of distinct solutions to the n-queens puzzle: placements of n queens on an n x n chessboard so that no two attack each other.",
    inputFormat: "A single integer n.",
    outputFormat: "An integer: the number of distinct solutions.",
    constraints: [
      "1 <= n <= 9",
      "Queens attack along rows, columns, and both diagonals.",
      "Only the count is required, not the boards.",
    ],
    examples: [
      {
        input: "n = 4",
        output: "2",
        explanation: "Two distinct non-attacking placements exist.",
      },
      {
        input: "n = 1",
        output: "1",
        explanation: "A single queen on a 1x1 board.",
      },
    ],
    approach: [
      "Place one queen per row, tracking occupied columns and both diagonals with bitmasks or sets.",
      "A column and the two diagonals (row+col, row-col) must all be free.",
      "Recurse to the next row; when all rows are placed, increment the count.",
      "Backtrack by freeing the column and diagonals.",
    ],
    solutionSteps: [
      "Maintain sets cols, diag1 (row+col), diag2 (row-col).",
      "For each column in the current row, skip if any set is occupied.",
      "Mark, recurse to row+1, then unmark.",
      "When row == n, add 1 to the count.",
    ],
    code: {
      python: `def total_n_queens(n: int) -> int:
    cols = set()
    diag1 = set()
    diag2 = set()
    count = [0]

    def backtrack(row: int) -> None:
        if row == n:
            count[0] += 1
            return
        for col in range(n):
            if col in cols or (row + col) in diag1 or (row - col) in diag2:
                continue
            cols.add(col)
            diag1.add(row + col)
            diag2.add(row - col)
            backtrack(row + 1)
            cols.remove(col)
            diag1.remove(row + col)
            diag2.remove(row - col)

    backtrack(0)
    return count[0]
`,
      java: `import java.util.*;

class Solution {
    int count = 0;
    public int totalNQueens(int n) {
        backtrack(0, n, new boolean[n], new boolean[2 * n], new boolean[2 * n]);
        return count;
    }
    private void backtrack(int row, int n, boolean[] cols, boolean[] diag1, boolean[] diag2) {
        if (row == n) { count++; return; }
        for (int col = 0; col < n; col++) {
            int d1 = row + col, d2 = row - col + n;
            if (cols[col] || diag1[d1] || diag2[d2]) continue;
            cols[col] = diag1[d1] = diag2[d2] = true;
            backtrack(row + 1, n, cols, diag1, diag2);
            cols[col] = diag1[d1] = diag2[d2] = false;
        }
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
    int count = 0;
    void backtrack(int row, int n, vector<bool>& cols, vector<bool>& diag1, vector<bool>& diag2) {
        if (row == n) { count++; return; }
        for (int col = 0; col < n; col++) {
            int d1 = row + col, d2 = row - col + n;
            if (cols[col] || diag1[d1] || diag2[d2]) continue;
            cols[col] = diag1[d1] = diag2[d2] = true;
            backtrack(row + 1, n, cols, diag1, diag2);
            cols[col] = diag1[d1] = diag2[d2] = false;
        }
    }
public:
    int totalNQueens(int n) {
        vector<bool> cols(n, false), diag1(2 * n, false), diag2(2 * n, false);
        backtrack(0, n, cols, diag1, diag2);
        return count;
    }
};
`,
    },
    complexity: { time: "O(n!)", space: "O(n)" },
    pitfalls: [
      "Computing diagonal indices incorrectly (offsetting row-col to stay non-negative).",
      "Forgetting to unmark all three constraints on backtrack.",
      "Trying to enumerate full boards when only the count is needed.",
    ],
    edgeCases: [
      "n = 1 (one solution).",
      "n = 2 or 3 (zero solutions).",
      "Larger n with many solutions.",
    ],
    whyItMatters:
      "Constraint propagation with diagonal bookkeeping is the archetypal backtracking-with-pruning exercise.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 483 — pure_dsa · backtracking · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-beautiful-arrangements",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Count Arrangements Where Position Divides Value",
    framing:
      "Count permutations of 1..n such that at every position i (1-indexed), either the value is divisible by i or i is divisible by the value.",
    statement:
      "Given an integer n, consider permutations of the numbers 1..n. A permutation perm is 'beautiful' if for every 1 <= i <= n, perm[i] is divisible by i or i is divisible by perm[i]. Return the number of beautiful arrangements.",
    inputFormat: "A single integer n.",
    outputFormat: "An integer: the count of beautiful arrangements.",
    constraints: [
      "1 <= n <= 15",
      "Positions are 1-indexed.",
      "Each value 1..n is used exactly once.",
    ],
    examples: [
      {
        input: "n = 2",
        output: "2",
        explanation: "[1,2] and [2,1] both satisfy the divisibility rule.",
      },
      {
        input: "n = 1",
        output: "1",
        explanation: "The single arrangement is trivially beautiful.",
      },
    ],
    approach: [
      "Backtrack position by position (1..n), trying each unused value.",
      "Place a value only if it is divisible by the position or vice versa.",
      "Count a completed assignment when all positions are filled.",
      "Filling positions in order with the divisibility filter prunes heavily.",
    ],
    solutionSteps: [
      "Track used[] for values; define backtrack(pos).",
      "If pos > n, increment the count.",
      "For each unused value v with v % pos == 0 or pos % v == 0, mark and recurse(pos+1), then unmark.",
      "Return the count.",
    ],
    code: {
      python: `def count_arrangement(n: int) -> int:
    used = [False] * (n + 1)
    count = [0]

    def backtrack(pos: int) -> None:
        if pos > n:
            count[0] += 1
            return
        for v in range(1, n + 1):
            if not used[v] and (v % pos == 0 or pos % v == 0):
                used[v] = True
                backtrack(pos + 1)
                used[v] = False

    backtrack(1)
    return count[0]
`,
      java: `class Solution {
    int count = 0;
    public int countArrangement(int n) {
        backtrack(1, n, new boolean[n + 1]);
        return count;
    }
    private void backtrack(int pos, int n, boolean[] used) {
        if (pos > n) { count++; return; }
        for (int v = 1; v <= n; v++) {
            if (!used[v] && (v % pos == 0 || pos % v == 0)) {
                used[v] = true;
                backtrack(pos + 1, n, used);
                used[v] = false;
            }
        }
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
    int count = 0;
    void backtrack(int pos, int n, vector<bool>& used) {
        if (pos > n) { count++; return; }
        for (int v = 1; v <= n; v++) {
            if (!used[v] && (v % pos == 0 || pos % v == 0)) {
                used[v] = true;
                backtrack(pos + 1, n, used);
                used[v] = false;
            }
        }
    }
public:
    int countArrangement(int n) {
        vector<bool> used(n + 1, false);
        backtrack(1, n, used);
        return count;
    }
};
`,
    },
    complexity: { time: "O(k) where k is the number of valid partial placements", space: "O(n)" },
    pitfalls: [
      "Indexing positions from 0 and breaking the divisibility relation.",
      "Forgetting to unmark a value after recursion.",
      "Iterating positions over values instead of values over positions (either works, but be consistent).",
    ],
    edgeCases: [
      "n = 1 (one arrangement).",
      "Small n where few placements survive pruning.",
      "Larger n stressing the search tree.",
    ],
    whyItMatters:
      "Divisibility-constrained permutation counting is a clean demonstration of pruning a factorial search space.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 484 — pure_dsa · backtracking · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "all-word-abbreviations",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Generate Every Generalized Abbreviation of a Word",
    framing:
      "A generalized abbreviation replaces any set of non-overlapping substrings with their lengths. Generate every distinct abbreviation of a given word.",
    statement:
      "Given a string word, a generalized abbreviation replaces any number of non-adjacent, non-overlapping substrings with the count of characters replaced (adjacent replaced runs merge into one number). Return all distinct generalized abbreviations in any order.",
    inputFormat: "A string word.",
    outputFormat: "A list of all generalized abbreviations.",
    constraints: [
      "0 <= word.length <= 15",
      "word consists of lowercase letters.",
      "There are exactly 2^word.length abbreviations.",
    ],
    examples: [
      {
        input: 'word = "word"',
        output: '["4","3d","2r1","2rd","1o2","1o1d","1or1","1ord","w3","w2d","w1r1","w1rd","wo2","wo1d","wor1","word"]',
        explanation: "Each character is either kept or abstracted into a count.",
      },
      {
        input: 'word = "a"',
        output: '["1","a"]',
        explanation: "Keep the letter or abbreviate it as 1.",
      },
    ],
    approach: [
      "Backtrack over each position deciding to keep the character or abstract it into a count.",
      "Carry a running count of consecutive abstracted characters.",
      "When keeping a character, flush any pending count first.",
      "At the end of the word, flush a trailing count and record the abbreviation.",
    ],
    solutionSteps: [
      "backtrack(pos, count, current).",
      "If pos == n, append current + (count if count > 0 else '').",
      "Branch 1: abstract word[pos] -> backtrack(pos+1, count+1, current).",
      "Branch 2: keep word[pos] -> flush count, append the char, backtrack(pos+1, 0, ...).",
    ],
    code: {
      python: `def generate_abbreviations(word: str) -> list[str]:
    n = len(word)
    result = []

    def backtrack(pos: int, count: int, current: str) -> None:
        if pos == n:
            result.append(current + (str(count) if count > 0 else ""))
            return
        # abstract this character into the running count
        backtrack(pos + 1, count + 1, current)
        # keep this character, flushing the pending count first
        flushed = current + (str(count) if count > 0 else "") + word[pos]
        backtrack(pos + 1, 0, flushed)

    backtrack(0, 0, "")
    return result
`,
      java: `import java.util.*;

class Solution {
    public List<String> generateAbbreviations(String word) {
        List<String> result = new ArrayList<>();
        backtrack(word, 0, 0, new StringBuilder(), result);
        return result;
    }
    private void backtrack(String word, int pos, int count, StringBuilder current, List<String> result) {
        int len = current.length();
        if (pos == word.length()) {
            result.add(current.toString() + (count > 0 ? count : ""));
            return;
        }
        // abstract
        backtrack(word, pos + 1, count + 1, current, result);
        // keep, flushing the count
        if (count > 0) current.append(count);
        current.append(word.charAt(pos));
        backtrack(word, pos + 1, 0, current, result);
        current.setLength(len);
    }
}
`,
      cpp: `#include <string>
#include <vector>
using namespace std;

class Solution {
    void backtrack(const string& word, int pos, int count, string current, vector<string>& result) {
        if (pos == (int)word.size()) {
            result.push_back(current + (count > 0 ? to_string(count) : ""));
            return;
        }
        // abstract
        backtrack(word, pos + 1, count + 1, current, result);
        // keep, flushing the count
        string kept = current + (count > 0 ? to_string(count) : "") + word[pos];
        backtrack(word, pos + 1, 0, kept, result);
    }
public:
    vector<string> generateAbbreviations(string word) {
        vector<string> result;
        backtrack(word, 0, 0, "", result);
        return result;
    }
};
`,
    },
    complexity: { time: "O(2^n * n)", space: "O(n)" },
    pitfalls: [
      "Forgetting to flush the pending count before appending a kept character.",
      "Emitting a count of 0 as the literal '0'.",
      "Not restoring the builder length when backtracking (Java/C++ in-place variants).",
    ],
    edgeCases: [
      "An empty word -> [\"\"].",
      "A single character.",
      "A fully abstracted word (the length as a number).",
    ],
    whyItMatters:
      "Keep-or-abstract binary branching with a deferred counter is a clean template for generating encodings and masks.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 485 — pure_dsa · bit_manipulation · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "add-without-plus",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "bit_manipulation",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "platform_engineer"],
    title: "Add Two Integers Without Using + or -",
    framing:
      "Implement integer addition using only bitwise operations — the way an ALU does it — without the + or - operators.",
    statement:
      "Given two integers a and b, return their sum a + b without using the operators + or -. Inputs may be negative; assume 32-bit two's-complement semantics.",
    inputFormat: "Two integers a and b.",
    outputFormat: "An integer: a + b.",
    constraints: [
      "-1000 <= a, b <= 1000",
      "No + or - operators allowed.",
      "32-bit two's-complement arithmetic.",
    ],
    examples: [
      {
        input: "a = 1, b = 2",
        output: "3",
        explanation: "Bitwise addition yields 3.",
      },
      {
        input: "a = 2, b = -3",
        output: "-1",
        explanation: "Two's-complement carry propagation gives -1.",
      },
    ],
    approach: [
      "XOR adds bits without carry; AND then left-shift computes the carry.",
      "Repeat: sum-without-carry = a ^ b, carry = (a & b) << 1, until the carry is zero.",
      "Mask to 32 bits to emulate fixed-width wraparound (needed in languages with big integers).",
      "Reinterpret the final value as a signed 32-bit integer.",
    ],
    solutionSteps: [
      "While b != 0: compute carry = (a & b) << 1, then a = a ^ b, then b = carry (all masked to 32 bits).",
      "When the carry is zero, a holds the result bits.",
      "If a exceeds the signed 32-bit max, convert it to its negative two's-complement value.",
      "Return a.",
    ],
    code: {
      python: `def get_sum(a: int, b: int) -> int:
    mask = 0xFFFFFFFF
    while b & mask:
        carry = ((a & b) << 1) & mask
        a = (a ^ b) & mask
        b = carry
    a &= mask
    # reinterpret as signed 32-bit
    return a if a <= 0x7FFFFFFF else ~(a ^ mask)
`,
      java: `class Solution {
    public int getSum(int a, int b) {
        while (b != 0) {
            int carry = (a & b) << 1;
            a = a ^ b;
            b = carry;
        }
        return a;
    }
}
`,
      cpp: `class Solution {
public:
    int getSum(int a, int b) {
        while (b != 0) {
            unsigned int carry = (unsigned int)(a & b) << 1;
            a = a ^ b;
            b = (int) carry;
        }
        return a;
    }
};
`,
    },
    complexity: { time: "O(1) (at most 32 iterations)", space: "O(1)" },
    pitfalls: [
      "In Python, not masking to 32 bits, so the carry loop never terminates for negatives.",
      "Forgetting to reinterpret the masked result as signed.",
      "Shifting the carry before computing the partial sum.",
    ],
    edgeCases: [
      "One operand zero.",
      "Opposite signs producing a carry chain.",
      "Both negative numbers.",
    ],
    whyItMatters:
      "Bitwise addition reveals how hardware adds numbers and cements understanding of XOR/carry decomposition.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 486 — pure_dsa · bit_manipulation · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "generate-gray-code",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "bit_manipulation",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "platform_engineer"],
    title: "Generate an N-Bit Gray Code Sequence",
    framing:
      "Produce a sequence of all 2^n n-bit numbers where consecutive entries (and the first and last) differ in exactly one bit.",
    statement:
      "Given an integer n, return any valid n-bit Gray code sequence: a permutation of 0..2^n - 1 starting at 0 where every pair of adjacent integers (including the last and first) differs in exactly one bit.",
    inputFormat: "A single integer n.",
    outputFormat: "A list of 2^n integers forming a Gray code sequence.",
    constraints: [
      "1 <= n <= 16",
      "The sequence must start at 0.",
      "Adjacent values differ in exactly one bit.",
    ],
    examples: [
      {
        input: "n = 2",
        output: "[0,1,3,2]",
        explanation: "00 -> 01 -> 11 -> 10, each a single-bit change.",
      },
      {
        input: "n = 1",
        output: "[0,1]",
        explanation: "0 and 1 differ in one bit.",
      },
    ],
    approach: [
      "Use the direct formula: the i-th Gray code is i ^ (i >> 1).",
      "Iterate i from 0 to 2^n - 1 and emit i ^ (i >> 1).",
      "This guarantees the single-bit-change property by construction.",
      "No recursion or reflection needed.",
    ],
    solutionSteps: [
      "Compute total = 1 << n.",
      "For each i in [0, total), append i ^ (i >> 1).",
      "Return the list.",
      "The sequence starts at 0 and wraps with a single-bit difference.",
    ],
    code: {
      python: `def gray_code(n: int) -> list[int]:
    return [i ^ (i >> 1) for i in range(1 << n)]
`,
      java: `import java.util.*;

class Solution {
    public List<Integer> grayCode(int n) {
        List<Integer> result = new ArrayList<>();
        int total = 1 << n;
        for (int i = 0; i < total; i++) result.add(i ^ (i >> 1));
        return result;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    vector<int> grayCode(int n) {
        vector<int> result;
        int total = 1 << n;
        for (int i = 0; i < total; i++) result.push_back(i ^ (i >> 1));
        return result;
    }
};
`,
    },
    complexity: { time: "O(2^n)", space: "O(2^n)" },
    pitfalls: [
      "Building the sequence by reflection but mishandling the wraparound bit difference.",
      "Starting at a value other than 0.",
      "Off-by-one in the total count (2^n entries).",
    ],
    edgeCases: [
      "n = 1 -> [0, 1].",
      "Larger n producing 2^n entries.",
      "Verifying the cyclic single-bit property.",
    ],
    whyItMatters:
      "The i ^ (i >> 1) identity is an elegant closed form behind error-resistant encodings and Karnaugh-map ordering.",
    estimatedMinutes: 20,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 487 — pure_dsa · bit_manipulation · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "range-bitwise-and",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "bit_manipulation",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Bitwise AND of All Numbers in a Range",
    framing:
      "Compute the bitwise AND of every integer in the inclusive range [left, right] without iterating through all of them.",
    statement:
      "Given two integers left and right that represent the range [left, right], return the bitwise AND of all numbers in this range, inclusive.",
    inputFormat: "Two integers left and right with left <= right.",
    outputFormat: "An integer: the bitwise AND across the range.",
    constraints: [
      "0 <= left <= right <= 2^31 - 1",
      "The range can be enormous.",
      "Iterating element by element is too slow.",
    ],
    examples: [
      {
        input: "left = 5, right = 7",
        output: "4",
        explanation: "5 & 6 & 7 = 4.",
      },
      {
        input: "left = 1, right = 2147483647",
        output: "0",
        explanation: "The full range ANDs to 0.",
      },
    ],
    approach: [
      "The result is the common binary prefix of left and right; lower bits cancel across the range.",
      "Right-shift both numbers until they are equal, counting the shifts.",
      "Left-shift the common value back by that count.",
      "This isolates the shared high-order prefix.",
    ],
    solutionSteps: [
      "Initialize a shift counter to 0.",
      "While left != right, shift both right by one and increment the counter.",
      "Once equal, shift the common value left by the counter.",
      "Return that value.",
    ],
    code: {
      python: `def range_bitwise_and(left: int, right: int) -> int:
    shift = 0
    while left < right:
        left >>= 1
        right >>= 1
        shift += 1
    return left << shift
`,
      java: `class Solution {
    public int rangeBitwiseAnd(int left, int right) {
        int shift = 0;
        while (left < right) {
            left >>= 1;
            right >>= 1;
            shift++;
        }
        return left << shift;
    }
}
`,
      cpp: `class Solution {
public:
    int rangeBitwiseAnd(int left, int right) {
        int shift = 0;
        while (left < right) {
            left >>= 1;
            right >>= 1;
            shift++;
        }
        return left << shift;
    }
};
`,
    },
    complexity: { time: "O(log(max))", space: "O(1)" },
    pitfalls: [
      "Iterating the whole range, which times out for large spans.",
      "Forgetting to shift the common prefix back to its original position.",
      "Off-by-one in the shift count.",
    ],
    edgeCases: [
      "left == right (the number itself).",
      "A range spanning a power-of-two boundary (result 0).",
      "left = 0 (result 0).",
    ],
    whyItMatters:
      "Recognizing the answer as the common bit prefix turns a huge iteration into a logarithmic computation — a sharp bit-trick.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 488 — pure_dsa · bit_manipulation · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "total-bit-differences",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "bit_manipulation",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Sum of Pairwise Bit Differences Across an Array",
    framing:
      "Sum the Hamming distance over every pair of numbers in an array — the total count of differing bit positions across all pairs.",
    statement:
      "Given an integer array nums, return the sum of Hamming distances between all pairs of the numbers. The Hamming distance between two numbers is the count of bit positions where they differ.",
    inputFormat: "An integer array nums.",
    outputFormat: "An integer: the total pairwise Hamming distance.",
    constraints: [
      "1 <= nums.length <= 10^4",
      "0 <= nums[i] < 2^30",
      "The answer fits in a 64-bit integer.",
    ],
    examples: [
      {
        input: "nums = [4,14,2]",
        output: "6",
        explanation: "Pairwise distances 2 + 2 + 2 sum to 6.",
      },
      {
        input: "nums = [4,14,4]",
        output: "4",
        explanation: "Only the pairs involving 14 differ.",
      },
    ],
    approach: [
      "Process each of the 30 bit positions independently.",
      "If c numbers have a 1 at a bit, the rest (n - c) have a 0; they form c * (n - c) differing pairs.",
      "Sum c * (n - c) over all bit positions.",
      "This avoids the O(n^2) pairwise comparison.",
    ],
    solutionSteps: [
      "For each bit b in 0..29, count how many numbers have that bit set.",
      "Add ones * (n - ones) to the total.",
      "Repeat for all bits.",
      "Return the accumulated total.",
    ],
    code: {
      python: `def total_hamming_distance(nums: list[int]) -> int:
    n = len(nums)
    total = 0
    for b in range(30):
        ones = sum((num >> b) & 1 for num in nums)
        total += ones * (n - ones)
    return total
`,
      java: `class Solution {
    public int totalHammingDistance(int[] nums) {
        int n = nums.length;
        long total = 0;
        for (int b = 0; b < 30; b++) {
            int ones = 0;
            for (int num : nums) ones += (num >> b) & 1;
            total += (long) ones * (n - ones);
        }
        return (int) total;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int totalHammingDistance(vector<int>& nums) {
        int n = nums.size();
        long long total = 0;
        for (int b = 0; b < 30; b++) {
            int ones = 0;
            for (int num : nums) ones += (num >> b) & 1;
            total += (long long) ones * (n - ones);
        }
        return (int) total;
    }
};
`,
    },
    complexity: { time: "O(30 * n)", space: "O(1)" },
    pitfalls: [
      "Computing all pairs directly in O(n^2) and timing out.",
      "Overflowing 32-bit accumulation for large counts.",
      "Iterating too few or too many bit positions.",
    ],
    edgeCases: [
      "A single element (0).",
      "All equal elements (0).",
      "Numbers using the high bit (bit 29).",
    ],
    whyItMatters:
      "Decomposing a pairwise aggregate into independent per-bit contributions is a powerful counting reframe.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 489 — pure_dsa · bit_manipulation · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "validate-utf8-encoding",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "bit_manipulation",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer"],
    title: "Validate a UTF-8 Byte Stream",
    framing:
      "Given a sequence of integers representing bytes, decide whether they form a valid UTF-8 encoding according to the leading-bit rules.",
    statement:
      "Given an array data of integers where only the least-significant 8 bits of each integer are meaningful (one byte each), return true if it is a valid UTF-8 encoding. A character is 1-4 bytes: a 1-byte char starts with 0; an n-byte char (2<=n<=4) starts with n leading 1s then a 0, and each continuation byte starts with 10.",
    inputFormat: "An array data of byte values (only the low 8 bits matter).",
    outputFormat: "A boolean: whether data is valid UTF-8.",
    constraints: [
      "1 <= data.length <= 2*10^4",
      "0 <= data[i] <= 255 in the low 8 bits.",
      "Characters span 1 to 4 bytes.",
    ],
    examples: [
      {
        input: "data = [197,130,1]",
        output: "true",
        explanation: "11000101 10000010 forms a 2-byte char; 00000001 is a 1-byte char.",
      },
      {
        input: "data = [235,140,4]",
        output: "false",
        explanation: "A 3-byte lead expects two continuation bytes, but the third is invalid.",
      },
    ],
    approach: [
      "Walk the bytes, determining the expected continuation count from each leading byte.",
      "Count leading 1s of a start byte: 0 -> 1-byte char, 2/3/4 -> that many bytes total.",
      "Each following byte must match the 10xxxxxx continuation pattern.",
      "Reject invalid leads (a single leading 1, or more than 4) and premature ends.",
    ],
    solutionSteps: [
      "Maintain a counter of remaining continuation bytes, initially 0.",
      "For each byte: if the counter is 0, determine the char length from leading 1s; reject lengths of 1 or >4.",
      "If the counter is > 0, the byte must start with 10; otherwise reject; decrement the counter.",
      "Return true only if the counter ends at 0.",
    ],
    code: {
      python: `def valid_utf8(data: list[int]) -> bool:
    remaining = 0
    for byte in data:
        byte &= 0xFF
        if remaining == 0:
            if byte >> 7 == 0:
                remaining = 0
            elif byte >> 5 == 0b110:
                remaining = 1
            elif byte >> 4 == 0b1110:
                remaining = 2
            elif byte >> 3 == 0b11110:
                remaining = 3
            else:
                return False
        else:
            if byte >> 6 != 0b10:
                return False
            remaining -= 1
    return remaining == 0
`,
      java: `class Solution {
    public boolean validUtf8(int[] data) {
        int remaining = 0;
        for (int raw : data) {
            int b = raw & 0xFF;
            if (remaining == 0) {
                if (b >> 7 == 0) remaining = 0;
                else if (b >> 5 == 0b110) remaining = 1;
                else if (b >> 4 == 0b1110) remaining = 2;
                else if (b >> 3 == 0b11110) remaining = 3;
                else return false;
            } else {
                if (b >> 6 != 0b10) return false;
                remaining--;
            }
        }
        return remaining == 0;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    bool validUtf8(vector<int>& data) {
        int remaining = 0;
        for (int raw : data) {
            int b = raw & 0xFF;
            if (remaining == 0) {
                if ((b >> 7) == 0) remaining = 0;
                else if ((b >> 5) == 0b110) remaining = 1;
                else if ((b >> 4) == 0b1110) remaining = 2;
                else if ((b >> 3) == 0b11110) remaining = 3;
                else return false;
            } else {
                if ((b >> 6) != 0b10) return false;
                remaining--;
            }
        }
        return remaining == 0;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Treating a lone leading-1 byte (10xxxxxx) as a valid start.",
      "Allowing char lengths above 4.",
      "Not masking to the low 8 bits before inspecting.",
    ],
    edgeCases: [
      "A stream ending mid-character (remaining > 0).",
      "All 1-byte ASCII.",
      "Maximal 4-byte characters.",
    ],
    whyItMatters:
      "Bit-pattern validation of a byte stream models real protocol/encoding parsers where leading bits dictate structure.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 490 — pure_dsa · heap_priority_queue · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "k-smallest-pair-sums",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "heap_priority_queue",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer"],
    title: "K Pairs With the Smallest Sums From Two Sorted Arrays",
    framing:
      "Given two sorted arrays, find the k pairs (one element from each) with the smallest combined sums.",
    statement:
      "Given two sorted integer arrays nums1 and nums2 and an integer k, return the k pairs (u, v) with u from nums1 and v from nums2 that have the smallest sums u + v. Return any k smallest pairs.",
    inputFormat: "Two sorted arrays nums1 and nums2 and an integer k.",
    outputFormat: "A list of up to k pairs [u, v].",
    constraints: [
      "1 <= nums1.length, nums2.length <= 10^5",
      "-10^9 <= values <= 10^9; both arrays sorted ascending",
      "1 <= k <= 10^4",
    ],
    examples: [
      {
        input: "nums1 = [1,7,11], nums2 = [2,4,6], k = 3",
        output: "[[1,2],[1,4],[1,6]]",
        explanation: "The three smallest sums all pair with 1.",
      },
      {
        input: "nums1 = [1,2], nums2 = [3], k = 3",
        output: "[[1,3],[2,3]]",
        explanation: "Only two pairs exist.",
      },
    ],
    approach: [
      "Use a min-heap seeded with pairs (nums1[i] + nums2[0], i, 0) for the first few i.",
      "Pop the smallest; its 'next' candidate is (i, j+1) within the same nums1 row.",
      "Push that successor, maintaining the heap invariant.",
      "Repeat k times to collect the smallest pairs.",
    ],
    solutionSteps: [
      "Push (nums1[i] + nums2[0], i, 0) for i up to min(k, len(nums1)).",
      "Pop the minimum, record the pair, and push (i, j+1) if it exists.",
      "Continue until k pairs are collected or the heap empties.",
      "Return the collected pairs.",
    ],
    code: {
      python: `import heapq

def k_smallest_pairs(nums1: list[int], nums2: list[int], k: int) -> list[list[int]]:
    if not nums1 or not nums2:
        return []
    heap = []
    for i in range(min(k, len(nums1))):
        heapq.heappush(heap, (nums1[i] + nums2[0], i, 0))
    result = []
    while heap and len(result) < k:
        _, i, j = heapq.heappop(heap)
        result.append([nums1[i], nums2[j]])
        if j + 1 < len(nums2):
            heapq.heappush(heap, (nums1[i] + nums2[j + 1], i, j + 1))
    return result
`,
      java: `import java.util.*;

class Solution {
    public List<List<Integer>> kSmallestPairs(int[] nums1, int[] nums2, int k) {
        List<List<Integer>> result = new ArrayList<>();
        if (nums1.length == 0 || nums2.length == 0) return result;
        PriorityQueue<long[]> pq = new PriorityQueue<>((a, b) -> Long.compare(a[0], b[0]));
        for (int i = 0; i < Math.min(k, nums1.length); i++)
            pq.add(new long[]{(long) nums1[i] + nums2[0], i, 0});
        while (!pq.isEmpty() && result.size() < k) {
            long[] top = pq.poll();
            int i = (int) top[1], j = (int) top[2];
            result.add(Arrays.asList(nums1[i], nums2[j]));
            if (j + 1 < nums2.length)
                pq.add(new long[]{(long) nums1[i] + nums2[j + 1], i, j + 1});
        }
        return result;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
using namespace std;

class Solution {
public:
    vector<vector<int>> kSmallestPairs(vector<int>& nums1, vector<int>& nums2, int k) {
        vector<vector<int>> result;
        if (nums1.empty() || nums2.empty()) return result;
        priority_queue<tuple<long long,int,int>, vector<tuple<long long,int,int>>, greater<>> pq;
        for (int i = 0; i < min((int)k, (int)nums1.size()); i++)
            pq.push({(long long)nums1[i] + nums2[0], i, 0});
        while (!pq.empty() && (int)result.size() < k) {
            auto [sum, i, j] = pq.top(); pq.pop();
            result.push_back({nums1[i], nums2[j]});
            if (j + 1 < (int)nums2.size())
                pq.push({(long long)nums1[i] + nums2[j + 1], i, j + 1});
        }
        return result;
    }
};
`,
    },
    complexity: { time: "O(k log k)", space: "O(k)" },
    pitfalls: [
      "Generating all pairs first, which is O(m*n) and wasteful.",
      "Pushing successors in both dimensions, causing duplicates.",
      "Integer overflow when summing large values.",
    ],
    edgeCases: [
      "k larger than the number of pairs.",
      "An empty input array.",
      "Negative values.",
    ],
    whyItMatters:
      "Heap-based k-way merging over an implicit sorted grid is the standard tool for top-k retrieval from combined sources.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 491 — pure_dsa · heap_priority_queue · medium · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "kth-largest-live-stream",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "heap_priority_queue",
    difficulty: "medium",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer"],
    title: "Maintain the Kth Largest Value in a Live Stream",
    framing:
      "Support a stream of incoming numbers and, after each insertion, report the k-th largest value seen so far.",
    statement:
      "Design a class that, initialized with an integer k and an initial array nums, supports an add(val) operation that inserts val into the stream and returns the k-th largest element seen so far.",
    inputFormat: "An integer k, an initial array nums, then a sequence of add(val) calls.",
    outputFormat: "Each add returns the current k-th largest value.",
    constraints: [
      "1 <= k <= 10^4",
      "0 <= nums.length <= 10^4",
      "There are at least k elements present whenever a result is requested.",
    ],
    examples: [
      {
        input: "k = 3, nums = [4,5,8,2]; add(3); add(5); add(10); add(9); add(4)",
        output: "[4,5,5,8,8]",
        explanation: "Each add returns the running 3rd largest.",
      },
      {
        input: "k = 1, nums = []; add(-3); add(-2); add(-4)",
        output: "[-3,-2,-2]",
        explanation: "With k=1 it tracks the running maximum.",
      },
    ],
    approach: [
      "Keep a min-heap of size k holding the k largest elements seen.",
      "On add, push the value; if the heap exceeds k, pop the smallest.",
      "The heap's minimum is exactly the k-th largest.",
      "Seed the heap with the initial nums.",
    ],
    solutionSteps: [
      "In the constructor, push all initial nums, trimming to size k.",
      "On add(val): push val; if size > k, pop the smallest.",
      "Return the heap's top (its minimum).",
      "Each add is O(log k).",
    ],
    code: {
      python: `import heapq

class KthLargest:
    def __init__(self, k: int, nums: list[int]):
        self.k = k
        self.heap = []
        for num in nums:
            self.add(num)

    def add(self, val: int) -> int:
        heapq.heappush(self.heap, val)
        if len(self.heap) > self.k:
            heapq.heappop(self.heap)
        return self.heap[0]
`,
      java: `import java.util.*;

class KthLargest {
    private final int k;
    private final PriorityQueue<Integer> heap;
    public KthLargest(int k, int[] nums) {
        this.k = k;
        heap = new PriorityQueue<>();
        for (int num : nums) add(num);
    }
    public int add(int val) {
        heap.offer(val);
        if (heap.size() > k) heap.poll();
        return heap.peek();
    }
}
`,
      cpp: `#include <vector>
#include <queue>
using namespace std;

class KthLargest {
    int k;
    priority_queue<int, vector<int>, greater<int>> heap;
public:
    KthLargest(int k, vector<int>& nums) : k(k) {
        for (int num : nums) add(num);
    }
    int add(int val) {
        heap.push(val);
        if ((int)heap.size() > k) heap.pop();
        return heap.top();
    }
};
`,
    },
    complexity: { time: "O(log k) per add", space: "O(k)" },
    pitfalls: [
      "Using a max-heap and scanning for the k-th element each time.",
      "Letting the heap grow beyond k.",
      "Returning the heap's max instead of its min.",
    ],
    edgeCases: [
      "Initial nums shorter than k.",
      "k = 1 (running maximum).",
      "Duplicate values.",
    ],
    whyItMatters:
      "A bounded min-heap for the k-th largest is the canonical streaming order-statistic structure.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 492 — pure_dsa · heap_priority_queue · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "space-out-identical-chars",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "heap_priority_queue",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Rearrange a String So No Two Adjacent Chars Match",
    framing:
      "Reorder the characters of a string so that no two adjacent characters are the same, or report that it is impossible.",
    statement:
      "Given a string s, rearrange its characters so that no two adjacent characters are identical. Return any valid rearrangement, or an empty string if none exists.",
    inputFormat: "A string s of lowercase letters.",
    outputFormat: "A rearranged string, or an empty string if impossible.",
    constraints: [
      "1 <= s.length <= 500",
      "s consists of lowercase English letters.",
      "Return any one valid answer.",
    ],
    examples: [
      {
        input: 's = "aab"',
        output: '"aba"',
        explanation: "The two a's are separated by b.",
      },
      {
        input: 's = "aaab"',
        output: '""',
        explanation: "Too many a's to separate.",
      },
    ],
    approach: [
      "Count character frequencies; if any frequency exceeds (n+1)/2, it is impossible.",
      "Use a max-heap by frequency to always place the most frequent remaining character.",
      "Hold the just-placed character aside for one step so it is not placed adjacently.",
      "Re-add it after placing the next character.",
    ],
    solutionSteps: [
      "Build a frequency map and a max-heap of (count, char).",
      "Pop the top char, append it, and stash it with count-1 as the 'previous'.",
      "Before the next pop, if the previous still has count > 0, push it back.",
      "If the heap empties while a previous remains, return empty; else return the result.",
    ],
    code: {
      python: `import heapq
from collections import Counter

def reorganize_string(s: str) -> str:
    counts = Counter(s)
    n = len(s)
    if max(counts.values()) > (n + 1) // 2:
        return ""
    heap = [(-c, ch) for ch, c in counts.items()]
    heapq.heapify(heap)
    result = []
    prev = None  # (count, char) waiting to be reinserted
    while heap:
        neg_c, ch = heapq.heappop(heap)
        result.append(ch)
        if prev and prev[0] < 0:
            heapq.heappush(heap, prev)
        prev = (neg_c + 1, ch)
    return "".join(result) if len(result) == n else ""
`,
      java: `import java.util.*;

class Solution {
    public String reorganizeString(String s) {
        int[] counts = new int[26];
        for (char ch : s.toCharArray()) counts[ch - 'a']++;
        int n = s.length();
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> b[1] - a[1]);
        for (int i = 0; i < 26; i++) {
            if (counts[i] > (n + 1) / 2) return "";
            if (counts[i] > 0) pq.add(new int[]{i, counts[i]});
        }
        StringBuilder sb = new StringBuilder();
        int[] prev = null;
        while (!pq.isEmpty()) {
            int[] cur = pq.poll();
            sb.append((char) ('a' + cur[0]));
            cur[1]--;
            if (prev != null && prev[1] > 0) pq.add(prev);
            prev = cur;
        }
        return sb.length() == n ? sb.toString() : "";
    }
}
`,
      cpp: `#include <string>
#include <queue>
#include <vector>
using namespace std;

class Solution {
public:
    string reorganizeString(string s) {
        vector<int> counts(26, 0);
        for (char ch : s) counts[ch - 'a']++;
        int n = s.size();
        priority_queue<pair<int,int>> pq; // (count, char)
        for (int i = 0; i < 26; i++) {
            if (counts[i] > (n + 1) / 2) return "";
            if (counts[i] > 0) pq.push({counts[i], i});
        }
        string result;
        pair<int,int> prev = {-1, -1};
        while (!pq.empty()) {
            auto [cnt, ch] = pq.top(); pq.pop();
            result += (char)('a' + ch);
            if (prev.first > 0) pq.push(prev);
            prev = {cnt - 1, ch};
        }
        return (int)result.size() == n ? result : "";
    }
};
`,
    },
    complexity: { time: "O(n log 26)", space: "O(26)" },
    pitfalls: [
      "Reinserting the previous character too early, allowing adjacency.",
      "Missing the feasibility check (max frequency > (n+1)/2).",
      "Reinserting a previous with zero remaining count.",
    ],
    edgeCases: [
      "A single character.",
      "Exactly (n+1)/2 of one character.",
      "An impossible distribution.",
    ],
    whyItMatters:
      "Greedy most-frequent-first placement with a one-step cooldown is the model for task scheduling and load spreading.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 493 — pure_dsa · greedy · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-arrows-burst-intervals",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 14,
    pattern: "greedy",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Fewest Shots to Burst All Overlapping Intervals",
    framing:
      "Balloons span horizontal intervals; a single vertical arrow at position x bursts every balloon whose interval covers x. Find the minimum number of arrows to burst them all.",
    statement:
      "Given points where points[i] = [start, end] is the horizontal span of a balloon, an arrow shot at x bursts a balloon if start <= x <= end. Return the minimum number of arrows required to burst all balloons.",
    inputFormat: "A list points of [start, end] intervals.",
    outputFormat: "An integer: the minimum number of arrows.",
    constraints: [
      "1 <= points.length <= 10^5",
      "-2^31 <= start <= end <= 2^31 - 1",
      "Endpoints are inclusive.",
    ],
    examples: [
      {
        input: "points = [[10,16],[2,8],[1,6],[7,12]]",
        output: "2",
        explanation: "One arrow at 6 bursts [1,6] and [2,8]; another at 11 bursts the rest.",
      },
      {
        input: "points = [[1,2],[3,4],[5,6],[7,8]]",
        output: "4",
        explanation: "No intervals overlap, so each needs its own arrow.",
      },
    ],
    approach: [
      "Sort intervals by their end coordinate.",
      "Shoot an arrow at the end of the first interval; it bursts all intervals overlapping that point.",
      "Skip every interval whose start is <= the arrow position.",
      "When an interval starts after the arrow, shoot a new arrow at its end.",
    ],
    solutionSteps: [
      "Sort points by end ascending.",
      "Initialize arrows = 1 and arrowPos = points[0].end.",
      "For each subsequent interval, if its start > arrowPos, increment arrows and set arrowPos to its end.",
      "Return arrows.",
    ],
    code: {
      python: `def find_min_arrow_shots(points: list[list[int]]) -> int:
    if not points:
        return 0
    points.sort(key=lambda p: p[1])
    arrows = 1
    arrow_pos = points[0][1]
    for start, end in points[1:]:
        if start > arrow_pos:
            arrows += 1
            arrow_pos = end
    return arrows
`,
      java: `import java.util.*;

class Solution {
    public int findMinArrowShots(int[][] points) {
        if (points.length == 0) return 0;
        Arrays.sort(points, (a, b) -> Integer.compare(a[1], b[1]));
        int arrows = 1;
        long arrowPos = points[0][1];
        for (int[] p : points) {
            if (p[0] > arrowPos) {
                arrows++;
                arrowPos = p[1];
            }
        }
        return arrows;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int findMinArrowShots(vector<vector<int>>& points) {
        if (points.empty()) return 0;
        sort(points.begin(), points.end(), [](const vector<int>& a, const vector<int>& b) {
            return a[1] < b[1];
        });
        int arrows = 1;
        long long arrowPos = points[0][1];
        for (auto& p : points) {
            if (p[0] > arrowPos) {
                arrows++;
                arrowPos = p[1];
            }
        }
        return arrows;
    }
};
`,
    },
    complexity: { time: "O(n log n)", space: "O(1)" },
    pitfalls: [
      "Sorting by start instead of end, breaking the greedy correctness.",
      "Using >= when comparing start to the arrow position (endpoints are inclusive).",
      "Integer overflow when comparing extreme endpoints — widen to 64-bit.",
    ],
    edgeCases: [
      "All intervals overlapping (one arrow).",
      "No overlaps (one arrow each).",
      "Touching intervals sharing an endpoint (one arrow).",
    ],
    whyItMatters:
      "Minimum-arrows is the classic minimum-interval-point-cover, dual to interval scheduling and used in resource consolidation.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 494 — ai_applied · arrays_hashing · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "match-tokens-to-pattern",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 14,
    pattern: "arrays_hashing",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "software_engineer"],
    title: "Which Token Strings Match a Structural Pattern",
    framing:
      "A pattern describes a token-shape via placeholder letters; a token string matches if there is a one-to-one renaming of letters to characters that reproduces it. Return every token string that matches.",
    statement:
      "Given a list of strings words and a string pattern of the same length, return the words that match the pattern. A word matches if there is a bijection between letters in pattern and characters in the word that maps pattern to the word.",
    inputFormat: "A list words and a string pattern.",
    outputFormat: "A list of the matching words.",
    constraints: [
      "1 <= words.length <= 50, 1 <= pattern.length <= 20",
      "All words have the same length as pattern.",
      "Words and pattern are lowercase letters.",
    ],
    examples: [
      {
        input: 'words = ["abc","deq","mee","aqq","dkd","ccc"], pattern = "abb"',
        output: '["mee","aqq"]',
        explanation: "mee and aqq both follow the a-b-b shape with a bijection.",
      },
      {
        input: 'words = ["a","b","c"], pattern = "a"',
        output: '["a","b","c"]',
        explanation: "Any single character matches a length-1 pattern.",
      },
    ],
    approach: [
      "Normalize both the pattern and each word to a canonical form (first-occurrence indices).",
      "A word matches iff its normalized form equals the pattern's normalized form.",
      "Normalization assigns each new character the next integer id as it first appears.",
      "Compare canonical forms for equality.",
    ],
    solutionSteps: [
      "Write normalize(s) returning a list of first-seen indices per character.",
      "Compute the pattern's canonical form once.",
      "For each word, compare its canonical form against the pattern's.",
      "Collect matching words.",
    ],
    code: {
      python: `def find_and_replace_pattern(words: list[str], pattern: str) -> list[str]:
    def normalize(s: str) -> list[int]:
        mapping = {}
        form = []
        for ch in s:
            if ch not in mapping:
                mapping[ch] = len(mapping)
            form.append(mapping[ch])
        return form

    target = normalize(pattern)
    return [w for w in words if normalize(w) == target]
`,
      java: `import java.util.*;

class Solution {
    public List<String> findAndReplacePattern(String[] words, String pattern) {
        List<Integer> target = normalize(pattern);
        List<String> result = new ArrayList<>();
        for (String w : words)
            if (normalize(w).equals(target)) result.add(w);
        return result;
    }
    private List<Integer> normalize(String s) {
        Map<Character, Integer> mapping = new HashMap<>();
        List<Integer> form = new ArrayList<>();
        for (char ch : s.toCharArray()) {
            mapping.putIfAbsent(ch, mapping.size());
            form.add(mapping.get(ch));
        }
        return form;
    }
}
`,
      cpp: `#include <string>
#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
    vector<int> normalize(const string& s) {
        unordered_map<char,int> mapping;
        vector<int> form;
        for (char ch : s) {
            if (!mapping.count(ch)) mapping[ch] = mapping.size();
            form.push_back(mapping[ch]);
        }
        return form;
    }
public:
    vector<string> findAndReplacePattern(vector<string>& words, string pattern) {
        vector<int> target = normalize(pattern);
        vector<string> result;
        for (auto& w : words)
            if (normalize(w) == target) result.push_back(w);
        return result;
    }
};
`,
    },
    complexity: { time: "O(words * len)", space: "O(len)" },
    pitfalls: [
      "Checking only a one-way mapping, allowing two pattern letters to map to one character.",
      "Forgetting that the bijection must hold in both directions (canonical form handles this).",
      "Assuming words may differ in length from the pattern.",
    ],
    edgeCases: [
      "Length-1 pattern (everything matches).",
      "A pattern with all distinct letters.",
      "A pattern with all identical letters.",
    ],
    whyItMatters:
      "Canonical-form matching for structural equivalence underlies template detection and pattern-based token routing.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 495 — ai_applied · arrays_hashing · medium · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "prompt-pattern-bijection",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 14,
    pattern: "arrays_hashing",
    difficulty: "medium",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "software_engineer"],
    title: "Does a Prompt Template Follow a Token Pattern",
    framing:
      "A pattern of placeholder letters should correspond one-to-one with a sequence of tokens (words). Decide whether the token sequence follows the pattern under a consistent bijection.",
    statement:
      "Given a pattern string and a string s of space-separated words, return true if s follows the pattern: there is a bijection between letters in pattern and words in s such that the i-th letter maps to the i-th word consistently.",
    inputFormat: "A string pattern and a space-separated string s.",
    outputFormat: "A boolean: whether s follows the pattern.",
    constraints: [
      "1 <= pattern.length <= 300",
      "1 <= s.length <= 3000",
      "pattern is lowercase letters; s is lowercase words separated by single spaces.",
    ],
    examples: [
      {
        input: 'pattern = "abba", s = "dog cat cat dog"',
        output: "true",
        explanation: "a<->dog, b<->cat is a consistent bijection.",
      },
      {
        input: 'pattern = "abba", s = "dog cat cat fish"',
        output: "false",
        explanation: "a maps to both dog and fish, breaking the bijection.",
      },
    ],
    approach: [
      "Split s into words; the counts must match the pattern length.",
      "Maintain two maps: letter->word and word->letter.",
      "For each pair, enforce consistency in both directions.",
      "Any conflict means false; otherwise true.",
    ],
    solutionSteps: [
      "Split s; if the word count differs from pattern length, return false.",
      "Iterate pairs (letter, word).",
      "If either mapping exists and disagrees, return false; otherwise record both.",
      "Return true after all pairs.",
    ],
    code: {
      python: `def word_pattern(pattern: str, s: str) -> bool:
    words = s.split()
    if len(pattern) != len(words):
        return False
    char_to_word = {}
    word_to_char = {}
    for ch, word in zip(pattern, words):
        if ch in char_to_word and char_to_word[ch] != word:
            return False
        if word in word_to_char and word_to_char[word] != ch:
            return False
        char_to_word[ch] = word
        word_to_char[word] = ch
    return True
`,
      java: `import java.util.*;

class Solution {
    public boolean wordPattern(String pattern, String s) {
        String[] words = s.split(" ");
        if (pattern.length() != words.length) return false;
        Map<Character, String> charToWord = new HashMap<>();
        Map<String, Character> wordToChar = new HashMap<>();
        for (int i = 0; i < words.length; i++) {
            char ch = pattern.charAt(i);
            String word = words[i];
            if (charToWord.containsKey(ch) && !charToWord.get(ch).equals(word)) return false;
            if (wordToChar.containsKey(word) && wordToChar.get(word) != ch) return false;
            charToWord.put(ch, word);
            wordToChar.put(word, ch);
        }
        return true;
    }
}
`,
      cpp: `#include <string>
#include <sstream>
#include <unordered_map>
using namespace std;

class Solution {
public:
    bool wordPattern(string pattern, string s) {
        istringstream iss(s);
        vector<string> words;
        string w;
        while (iss >> w) words.push_back(w);
        if (pattern.size() != words.size()) return false;
        unordered_map<char, string> charToWord;
        unordered_map<string, char> wordToChar;
        for (int i = 0; i < (int)words.size(); i++) {
            char ch = pattern[i];
            if (charToWord.count(ch) && charToWord[ch] != words[i]) return false;
            if (wordToChar.count(words[i]) && wordToChar[words[i]] != ch) return false;
            charToWord[ch] = words[i];
            wordToChar[words[i]] = ch;
        }
        return true;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Maintaining only one direction of the mapping.",
      "Forgetting to check that the word count equals the pattern length.",
      "Splitting on multiple spaces incorrectly.",
    ],
    edgeCases: [
      "Different counts of letters and words.",
      "Repeated words mapping to different letters.",
      "Single-letter pattern.",
    ],
    whyItMatters:
      "Bidirectional bijection checking is the essence of consistent variable binding in templating and unification.",
    estimatedMinutes: 20,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 496 — ai_applied · sliding_window · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "repeated-token-windows",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 14,
    pattern: "sliding_window",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "data_engineer"],
    title: "Find Length-10 Token Windows That Repeat",
    framing:
      "Scanning a long sequence over a 4-symbol alphabet, find all length-10 contiguous windows that appear more than once.",
    statement:
      "Given a string s consisting of characters from a small fixed alphabet (e.g. A, C, G, T), return all 10-character-long substrings that occur more than once in s. You may return the answer in any order.",
    inputFormat: "A string s.",
    outputFormat: "A list of the repeated 10-length substrings.",
    constraints: [
      "1 <= s.length <= 10^5",
      "s consists of characters A, C, G, T.",
      "Return each repeated substring once.",
    ],
    examples: [
      {
        input: 's = "AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT"',
        output: '["AAAAACCCCC","CCCCCAAAAA"]',
        explanation: "Both 10-length windows appear at least twice.",
      },
      {
        input: 's = "AAAAAAAAAAAAA"',
        output: '["AAAAAAAAAA"]',
        explanation: "The all-A window repeats.",
      },
    ],
    approach: [
      "Slide a fixed length-10 window across the string.",
      "Track seen windows in a hash set and repeated ones in another set.",
      "When a window is seen a second time, record it.",
      "Use a set for the output to deduplicate.",
    ],
    solutionSteps: [
      "If s is shorter than 10, return empty.",
      "For each start index i in [0, n-10], take the substring s[i:i+10].",
      "If it is already in seen, add it to the repeated set; otherwise add it to seen.",
      "Return the repeated set as a list.",
    ],
    code: {
      python: `def find_repeated_dna_sequences(s: str) -> list[str]:
    seen = set()
    repeated = set()
    for i in range(len(s) - 9):
        window = s[i:i + 10]
        if window in seen:
            repeated.add(window)
        else:
            seen.add(window)
    return list(repeated)
`,
      java: `import java.util.*;

class Solution {
    public List<String> findRepeatedDnaSequences(String s) {
        Set<String> seen = new HashSet<>();
        Set<String> repeated = new HashSet<>();
        for (int i = 0; i + 10 <= s.length(); i++) {
            String window = s.substring(i, i + 10);
            if (!seen.add(window)) repeated.add(window);
        }
        return new ArrayList<>(repeated);
    }
}
`,
      cpp: `#include <string>
#include <vector>
#include <unordered_set>
using namespace std;

class Solution {
public:
    vector<string> findRepeatedDnaSequences(string s) {
        unordered_set<string> seen, repeated;
        for (int i = 0; i + 10 <= (int)s.size(); i++) {
            string window = s.substr(i, 10);
            if (seen.count(window)) repeated.insert(window);
            else seen.insert(window);
        }
        return vector<string>(repeated.begin(), repeated.end());
    }
};
`,
    },
    complexity: { time: "O(n * 10)", space: "O(n)" },
    pitfalls: [
      "Off-by-one in the window's last valid start index.",
      "Adding a window to the output multiple times instead of using a set.",
      "Iterating past the end of the string.",
    ],
    edgeCases: [
      "A string shorter than 10 (empty result).",
      "No repeats.",
      "Highly repetitive input.",
    ],
    whyItMatters:
      "Fixed-window hashing is the basic building block for k-mer counting, deduplication, and rolling-hash search.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 497 — ai_applied · dp_1d · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-sequence-builds-to-length",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 14,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "data_engineer"],
    title: "Count Ordered Ways to Reach a Target Budget",
    framing:
      "A generator appends one chunk at a time, each chunk drawn from a set of allowed sizes, until the total length hits a target. Count the number of distinct ordered build sequences that reach the target exactly.",
    statement:
      "Given an array of distinct positive integers nums and a target integer, return the number of possible combinations (ordered sequences) that sum to target. Different orderings count as different combinations.",
    inputFormat: "An array nums of distinct positive integers and an integer target.",
    outputFormat: "An integer: the number of ordered sequences summing to target.",
    constraints: [
      "1 <= nums.length <= 200",
      "1 <= nums[i] <= 1000, all distinct",
      "1 <= target <= 1000; the answer fits in a 32-bit integer.",
    ],
    examples: [
      {
        input: "nums = [1,2,3], target = 4",
        output: "7",
        explanation: "Ordered sequences: (1,1,1,1),(1,1,2),(1,2,1),(2,1,1),(2,2),(1,3),(3,1).",
      },
      {
        input: "nums = [9], target = 3",
        output: "0",
        explanation: "No sequence of 9s sums to 3.",
      },
    ],
    approach: [
      "dp[t] = number of ordered sequences summing to t.",
      "Order the loops so the target is outermost and nums inner — this counts orderings.",
      "dp[t] += dp[t - num] for each num <= t.",
      "Return dp[target].",
    ],
    solutionSteps: [
      "Initialize dp[0] = 1 (one empty sequence).",
      "For each t from 1 to target, sum dp[t - num] over all num <= t.",
      "This treats sequences as ordered because t is the outer loop.",
      "Return dp[target].",
    ],
    code: {
      python: `def combination_sum4(nums: list[int], target: int) -> int:
    dp = [0] * (target + 1)
    dp[0] = 1
    for t in range(1, target + 1):
        for num in nums:
            if num <= t:
                dp[t] += dp[t - num]
    return dp[target]
`,
      java: `class Solution {
    public int combinationSum4(int[] nums, int target) {
        int[] dp = new int[target + 1];
        dp[0] = 1;
        for (int t = 1; t <= target; t++)
            for (int num : nums)
                if (num <= t) dp[t] += dp[t - num];
        return dp[target];
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int combinationSum4(vector<int>& nums, int target) {
        vector<unsigned int> dp(target + 1, 0);
        dp[0] = 1;
        for (int t = 1; t <= target; t++)
            for (int num : nums)
                if (num <= t) dp[t] += dp[t - num];
        return dp[target];
    }
};
`,
    },
    complexity: { time: "O(target * nums.length)", space: "O(target)" },
    pitfalls: [
      "Putting nums in the outer loop, which counts unordered combinations instead of ordered ones.",
      "Integer overflow for large counts — guard or use unsigned/long.",
      "Forgetting dp[0] = 1 as the base case.",
    ],
    edgeCases: [
      "target unreachable (0).",
      "A single number dividing the target.",
      "Small numbers producing many orderings.",
    ],
    whyItMatters:
      "The loop-order distinction between ordered and unordered counting is a subtle, frequently tested DP insight.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 498 — ai_applied · dp_1d · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "agent-return-to-start-ways",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 14,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "data_engineer"],
    title: "Ways an Agent Returns to Start After K Steps",
    framing:
      "An agent on a 1-D track of fixed length starts at index 0 and, each step, moves left, moves right, or stays. Count the distinct step sequences that return it to index 0 after exactly k steps without leaving the track.",
    statement:
      "You start at index 0 of an array of length arrLen. In each of steps moves you may go left, right, or stay, never leaving the array bounds. Return the number of ways to be back at index 0 after exactly steps moves, modulo 1e9+7.",
    inputFormat: "Integers steps and arrLen.",
    outputFormat: "An integer: the count of returning sequences modulo 1e9+7.",
    constraints: [
      "1 <= steps <= 500",
      "1 <= arrLen <= 10^6",
      "Counts are taken modulo 1e9+7.",
    ],
    examples: [
      {
        input: "steps = 3, arrLen = 2",
        output: "4",
        explanation: "Four step sequences return to index 0.",
      },
      {
        input: "steps = 2, arrLen = 4",
        output: "2",
        explanation: "Either stay-stay or right-left.",
      },
    ],
    approach: [
      "Reachable positions are bounded by min(arrLen, steps/2 + 1), since the agent must return.",
      "dp[p] = number of ways to be at position p after the current number of steps.",
      "Each step, new dp[p] = dp[p] + dp[p-1] + dp[p+1] within bounds.",
      "Answer is dp[0] after all steps.",
    ],
    solutionSteps: [
      "Cap the width to maxPos = min(arrLen - 1, steps // 2).",
      "Initialize dp[0] = 1.",
      "For each step, roll a new array combining stay, left, and right contributions modulo MOD.",
      "Return dp[0].",
    ],
    code: {
      python: `def num_ways(steps: int, arr_len: int) -> int:
    MOD = 10**9 + 7
    max_pos = min(arr_len - 1, steps // 2)
    dp = [0] * (max_pos + 1)
    dp[0] = 1
    for _ in range(steps):
        ndp = [0] * (max_pos + 1)
        for p in range(max_pos + 1):
            total = dp[p]
            if p > 0:
                total += dp[p - 1]
            if p < max_pos:
                total += dp[p + 1]
            ndp[p] = total % MOD
        dp = ndp
    return dp[0]
`,
      java: `class Solution {
    public int numWays(int steps, int arrLen) {
        long MOD = 1000000007L;
        int maxPos = Math.min(arrLen - 1, steps / 2);
        long[] dp = new long[maxPos + 1];
        dp[0] = 1;
        for (int s = 0; s < steps; s++) {
            long[] ndp = new long[maxPos + 1];
            for (int p = 0; p <= maxPos; p++) {
                long total = dp[p];
                if (p > 0) total += dp[p - 1];
                if (p < maxPos) total += dp[p + 1];
                ndp[p] = total % MOD;
            }
            dp = ndp;
        }
        return (int) dp[0];
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int numWays(int steps, int arrLen) {
        const long long MOD = 1000000007LL;
        int maxPos = min(arrLen - 1, steps / 2);
        vector<long long> dp(maxPos + 1, 0);
        dp[0] = 1;
        for (int s = 0; s < steps; s++) {
            vector<long long> ndp(maxPos + 1, 0);
            for (int p = 0; p <= maxPos; p++) {
                long long total = dp[p];
                if (p > 0) total += dp[p - 1];
                if (p < maxPos) total += dp[p + 1];
                ndp[p] = total % MOD;
            }
            dp = ndp;
        }
        return (int) dp[0];
    }
};
`,
    },
    complexity: { time: "O(steps * min(arrLen, steps))", space: "O(min(arrLen, steps))" },
    pitfalls: [
      "Allocating an array of size arrLen (up to 10^6) instead of capping by steps/2.",
      "Going out of bounds at position 0 or maxPos.",
      "Dropping the modulus and overflowing.",
    ],
    edgeCases: [
      "arrLen = 1 (only 'stay' is allowed).",
      "steps smaller than needed to wander far.",
      "Large arrLen capped by the step budget.",
    ],
    whyItMatters:
      "Bounded-walk return counting is a discrete random-walk problem with a crucial reachable-range pruning insight.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 499 — indian_domain · dp_1d · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-earnings-ride-dispatch",
    version: 1,
    status: "pending_review",
    bucket: "indian_domain",
    batchNo: 14,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer"],
    title: "Maximize a Cab Driver's Earnings Along a One-Way Route",
    framing:
      "A cab drives east through n numbered points in a metro corridor. Each ride request starts at one point, ends at a later point, and pays the fare plus a tip in rupees. The cab can carry one rider at a time and only moves east. Maximize total earnings.",
    statement:
      "There are n points (1..n) along a one-way road heading east. rides[i] = [start, end, tip] means a passenger goes from start to end (start < end) paying (end - start) + tip rupees. You drive east picking up non-overlapping rides (a ride ending at x lets you start another at x). Return the maximum rupees you can earn.",
    inputFormat: "An integer n and a rides list of [start, end, tip].",
    outputFormat: "An integer: the maximum total earnings in rupees.",
    constraints: [
      "1 <= n <= 10^5",
      "1 <= rides.length <= 3*10^4",
      "1 <= start < end <= n, 1 <= tip <= 10^5.",
    ],
    examples: [
      {
        input: "n = 5, rides = [[2,5,4],[1,5,1]]",
        output: "7",
        explanation: "Taking [2,5,4] earns (5-2)+4 = 7, better than [1,5,1]'s 5.",
      },
      {
        input: "n = 20, rides = [[1,6,1],[3,10,2],[10,12,3],[11,12,2],[12,15,2],[13,18,1]]",
        output: "20",
        explanation: "An optimal chain of compatible rides totals 20 rupees.",
      },
    ],
    approach: [
      "Group rides by their start point.",
      "dp[i] = maximum earnings achievable having reached point i.",
      "At each point, either skip it (carry dp[i] to dp[i+1]) or take a ride starting here: dp[end] = max(dp[end], dp[i] + value).",
      "value = (end - start) + tip; the answer is dp[n].",
    ],
    solutionSteps: [
      "Bucket rides by start index.",
      "Initialize dp of size n+1 to 0; iterate i from 1 to n.",
      "Propagate dp[i] to dp[i+1]; for each ride at i, relax dp[end] with dp[i] + value.",
      "Return dp[n].",
    ],
    code: {
      python: `def max_taxi_earnings(n: int, rides: list[list[int]]) -> int:
    by_start = [[] for _ in range(n + 1)]
    for start, end, tip in rides:
        by_start[start].append((end, end - start + tip))
    dp = [0] * (n + 1)
    for i in range(1, n + 1):
        if i + 1 <= n:
            dp[i + 1] = max(dp[i + 1], dp[i])
        for end, value in by_start[i]:
            dp[end] = max(dp[end], dp[i] + value)
    return dp[n]
`,
      java: `import java.util.*;

class Solution {
    public long maxTaxiEarnings(int n, int[][] rides) {
        List<long[]>[] byStart = new List[n + 1];
        for (int i = 0; i <= n; i++) byStart[i] = new ArrayList<>();
        for (int[] r : rides) byStart[r[0]].add(new long[]{r[1], r[1] - r[0] + r[2]});
        long[] dp = new long[n + 1];
        for (int i = 1; i <= n; i++) {
            if (i + 1 <= n) dp[i + 1] = Math.max(dp[i + 1], dp[i]);
            for (long[] ride : byStart[i]) {
                int end = (int) ride[0];
                dp[end] = Math.max(dp[end], dp[i] + ride[1]);
            }
        }
        return dp[n];
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    long long maxTaxiEarnings(int n, vector<vector<int>>& rides) {
        vector<vector<pair<int,long long>>> byStart(n + 1);
        for (auto& r : rides)
            byStart[r[0]].push_back({r[1], (long long)(r[1] - r[0]) + r[2]});
        vector<long long> dp(n + 1, 0);
        for (int i = 1; i <= n; i++) {
            if (i + 1 <= n) dp[i + 1] = max(dp[i + 1], dp[i]);
            for (auto& [end, value] : byStart[i])
                dp[end] = max(dp[end], dp[i] + value);
        }
        return dp[n];
    }
};
`,
    },
    complexity: { time: "O(n + rides)", space: "O(n + rides)" },
    pitfalls: [
      "Sorting rides and doing an O(rides^2) DP when a point-indexed sweep is O(n + rides).",
      "Forgetting to carry dp[i] forward when no ride starts at i.",
      "Overflowing 32-bit earnings — use 64-bit accumulation.",
    ],
    edgeCases: [
      "No rides (0 earnings).",
      "Overlapping rides forcing a choice.",
      "A single long ride spanning the corridor.",
    ],
    whyItMatters:
      "Point-indexed interval DP is the efficient backbone for one-way dispatch and weighted-interval scheduling in ride-hailing.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 500 — indian_domain · dp_1d · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "fastag-reach-last-booth",
    version: 1,
    status: "pending_review",
    bucket: "indian_domain",
    batchNo: 14,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "platform_engineer"],
    title: "Can a Vehicle Reach the Last Toll Booth With Bounded Hops",
    framing:
      "Along a highway, toll booths are either open ('0') or closed ('1'). From an open booth a FASTag vehicle may advance by any distance between a minimum and maximum jump, but can only land on an open booth. Decide whether it can reach the final booth from the first.",
    statement:
      "Given a 0-indexed binary string s where '0' is an open booth and '1' is closed, starting at index 0 (guaranteed open), you may move from index i to index j if minJump <= j - i <= maxJump and s[j] == '0'. Return true if you can reach index s.length - 1.",
    inputFormat: "A binary string s and integers minJump and maxJump.",
    outputFormat: "A boolean: whether the last booth is reachable.",
    constraints: [
      "2 <= s.length <= 10^5",
      "1 <= minJump <= maxJump < s.length",
      "s[0] == '0'.",
    ],
    examples: [
      {
        input: 's = "011010", minJump = 2, maxJump = 3',
        output: "true",
        explanation: "0 -> 3 -> 5 reaches the last open booth.",
      },
      {
        input: 's = "01101110", minJump = 2, maxJump = 3',
        output: "false",
        explanation: "No valid hop sequence reaches the end.",
      },
    ],
    approach: [
      "dp[i] is true if booth i is reachable; dp[0] = true.",
      "Booth i is reachable if it is open and some reachable booth lies in [i-maxJump, i-minJump].",
      "Maintain a sliding count of reachable booths in that window via a prefix-sum of dp.",
      "Answer is dp[n-1].",
    ],
    solutionSteps: [
      "Initialize dp[0] = true and a running prefix count `reach` of reachable booths.",
      "For each i from minJump to n-1, add dp[i-minJump] to the window and subtract dp[i-maxJump-1] when it leaves.",
      "dp[i] is true if s[i] == '0' and the window count is positive.",
      "Return dp[n-1].",
    ],
    code: {
      python: `def can_reach(s: str, min_jump: int, max_jump: int) -> bool:
    n = len(s)
    dp = [False] * n
    dp[0] = True
    window = 0  # count of reachable booths in [i-max_jump, i-min_jump]
    for i in range(1, n):
        if i >= min_jump:
            window += 1 if dp[i - min_jump] else 0
        if i > max_jump:
            window -= 1 if dp[i - max_jump - 1] else 0
        if s[i] == "0" and window > 0:
            dp[i] = True
    return dp[n - 1]
`,
      java: `class Solution {
    public boolean canReach(String s, int minJump, int maxJump) {
        int n = s.length();
        boolean[] dp = new boolean[n];
        dp[0] = true;
        int window = 0;
        for (int i = 1; i < n; i++) {
            if (i >= minJump) window += dp[i - minJump] ? 1 : 0;
            if (i > maxJump) window -= dp[i - maxJump - 1] ? 1 : 0;
            if (s.charAt(i) == '0' && window > 0) dp[i] = true;
        }
        return dp[n - 1];
    }
}
`,
      cpp: `#include <string>
#include <vector>
using namespace std;

class Solution {
public:
    bool canReach(string s, int minJump, int maxJump) {
        int n = s.size();
        vector<bool> dp(n, false);
        dp[0] = true;
        int window = 0;
        for (int i = 1; i < n; i++) {
            if (i >= minJump) window += dp[i - minJump] ? 1 : 0;
            if (i > maxJump) window -= dp[i - maxJump - 1] ? 1 : 0;
            if (s[i] == '0' && window > 0) dp[i] = true;
        }
        return dp[n - 1];
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Recomputing the reachable window from scratch each step (O(n*maxJump)).",
      "Off-by-one when adding the entering index (i-minJump) or removing the leaving one (i-maxJump-1).",
      "Allowing a landing on a closed booth ('1').",
    ],
    edgeCases: [
      "The last booth closed (unreachable).",
      "minJump == maxJump (fixed stride).",
      "A long run of closed booths blocking progress.",
    ],
    whyItMatters:
      "Sliding-window reachability DP turns a bounded-jump feasibility question from quadratic to linear — key for corridor and toll-network routing.",
    estimatedMinutes: 40,
  },

] as const;
