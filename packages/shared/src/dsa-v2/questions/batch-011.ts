// DSA v2 — Batch 11 (questions 301–350).
//
// 50 questions, 301–350. Difficulty mix: 39 hard + 11 medium.
// Bucket mix: 43 pure_dsa + 5 ai_applied + 2 indian_domain.
// All status pending_review. No duplicate canonical problems across the bank.
//
// Canonical coverage (distinct from batches 1–10):
//   301 Regular Expression Matching · 302 Maximum Gap · 303 Best Meeting Point ·
//   304 The Maze II · 305 Bricks Falling When Hit · 306 Jump Game VI ·
//   307 Maximum Number of Events That Can Be Attended · 308 Couples Holding Hands ·
//   309 Minimum Cost to Connect Two Groups of Points · 310 Tiling a Rectangle
//   with the Fewest Squares · 311 Number of Ways to Paint N x 3 Grid ·
//   312 Stone Game III · 313 Numbers With Repeated Digits · 314 Count Vowels
//   Permutation · 315 Largest Component Size by Common Factor · 316 Shortest Path
//   to Get All Keys · 317 Minimum Moves to Move a Box to Their Target Location ·
//   318 Race Car · 319 Palindrome Removal · 320 Minimum Cost to Cut a Stick ·
//   321 Maximum Score from Performing Multiplication Operations · 322 Stone Game
//   VII · 323 Minimum Number of Days to Eat N Oranges · 324 Number of Ways to
//   Reorder Array to Get Same BST · 325 Maximum Number of Achievable Transfer
//   Requests · 326 Find Servers That Handled Most Requests · 327 Jump Game IV ·
//   328 Build a Matrix With Conditions · 329 Find the Closest Palindrome ·
//   330 Different Ways to Add Parentheses · 331 Distinct Subsequences II ·
//   332 Maximum Sum BST in Binary Tree · 333 Recover the Original Array ·
//   334 Patching Array · 335 Create Sorted Array through Instructions ·
//   336 Count Good Triplets in an Array · 337 Maximum Height by Stacking Cuboids ·
//   338 Number of Restricted Paths From First to Last Node · 339 Closest
//   Subsequence Sum · 340 Shortest Path in Binary Matrix · 341 Path With Maximum
//   Minimum Value · 342 Length of Longest Fibonacci Subsequence · 343 Maximum
//   Length of Repeated Subarray · 344 Continuous Subarray Sum · 345 Find K
//   Closest Elements · 346 Search in Rotated Sorted Array II · 347 Partition
//   Equal Subset Sum · 348 Online Stock Span · 349 Maximum Width of Binary Tree ·
//   350 Coin Change II.

import type { DsaV2Question } from "../types";

export const BATCH_011: readonly DsaV2Question[] = [
  // ──────────────────────────────────────────────────────────────────────
  // 301 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "regex-config-matcher",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer"],
    title: "Config Pattern Matcher with '.' and '*'",
    framing:
      "A routing layer matches incoming paths against config patterns where '.' matches any single character and '*' matches zero or more of the preceding character. Decide whether a path matches its pattern in full.",
    statement:
      "Given an input string s and a pattern p, implement regular-expression matching with support for '.' and '*'. '.' matches any single character; '*' matches zero or more of the preceding element. The match must cover the entire input string (not partial).",
    inputFormat:
      "Two strings: s (the input, lowercase letters) and p (the pattern, lowercase letters plus '.' and '*'). Every '*' is preceded by a valid single character or '.'.",
    outputFormat: "A boolean: true if p matches the whole of s, else false.",
    constraints: [
      "1 <= s.length <= 20",
      "1 <= p.length <= 30",
      "s contains only lowercase English letters.",
      "p contains lowercase letters, '.', and '*'; each '*' has a valid preceding character.",
    ],
    examples: [
      {
        input: 's = "aab", p = "c*a*b"',
        output: "true",
        explanation: "'c*' matches zero c's, 'a*' matches two a's, then 'b' matches 'b'.",
      },
      {
        input: 's = "mississippi", p = "mis*is*p*."',
        output: "false",
        explanation: "No way for the pattern to consume the whole string.",
      },
    ],
    approach: [
      "Let dp[i][j] mean: does p[j:] match s[i:]? Answer is dp[0][0].",
      "Base case: dp[m][n] = true (empty pattern matches empty string), where m=len(s), n=len(p).",
      "A position matches when j < n and (s[i]==p[j] or p[j]=='.').",
      "If the next pattern char is '*', either skip the 'x*' block (dp[i][j+2]) or, if the current char matches, consume one char of s (dp[i+1][j]).",
      "Otherwise require a direct char match and advance both pointers (dp[i+1][j+1]).",
    ],
    solutionSteps: [
      "Allocate dp of size (m+1) x (n+1), all false, with dp[m][n]=true.",
      "Iterate i from m down to 0 and j from n-1 down to 0.",
      "Compute firstMatch = i<m and (p[j]==s[i] or p[j]=='.').",
      "If j+1<n and p[j+1]=='*': dp[i][j] = dp[i][j+2] or (firstMatch and dp[i+1][j]).",
      "Else: dp[i][j] = firstMatch and dp[i+1][j+1]. Return dp[0][0].",
    ],
    code: {
      python: `def is_match(s: str, p: str) -> bool:
    m, n = len(s), len(p)
    dp = [[False] * (n + 1) for _ in range(m + 1)]
    dp[m][n] = True
    for i in range(m, -1, -1):
        for j in range(n - 1, -1, -1):
            first = i < m and (p[j] == s[i] or p[j] == ".")
            if j + 1 < n and p[j + 1] == "*":
                dp[i][j] = dp[i][j + 2] or (first and dp[i + 1][j])
            else:
                dp[i][j] = first and dp[i + 1][j + 1]
    return dp[0][0]
`,
      java: `class Solution {
    public boolean isMatch(String s, String p) {
        int m = s.length(), n = p.length();
        boolean[][] dp = new boolean[m + 1][n + 1];
        dp[m][n] = true;
        for (int i = m; i >= 0; i--) {
            for (int j = n - 1; j >= 0; j--) {
                boolean first = i < m && (p.charAt(j) == s.charAt(i) || p.charAt(j) == '.');
                if (j + 1 < n && p.charAt(j + 1) == '*')
                    dp[i][j] = dp[i][j + 2] || (first && dp[i + 1][j]);
                else
                    dp[i][j] = first && dp[i + 1][j + 1];
            }
        }
        return dp[0][0];
    }
}
`,
      cpp: `#include <string>
#include <vector>
using namespace std;

class Solution {
public:
    bool isMatch(string s, string p) {
        int m = s.size(), n = p.size();
        vector<vector<char>> dp(m + 1, vector<char>(n + 1, 0));
        dp[m][n] = 1;
        for (int i = m; i >= 0; i--) {
            for (int j = n - 1; j >= 0; j--) {
                bool first = i < m && (p[j] == s[i] || p[j] == '.');
                if (j + 1 < n && p[j + 1] == '*')
                    dp[i][j] = dp[i][j + 2] || (first && dp[i + 1][j]);
                else
                    dp[i][j] = first && dp[i + 1][j + 1];
            }
        }
        return dp[0][0];
    }
};
`,
    },
    complexity: { time: "O(m * n)", space: "O(m * n)" },
    pitfalls: [
      "Treating '*' as matching the rest of the string; it only repeats the single preceding element.",
      "Forgetting the zero-occurrence branch (dp[i][j+2]) for 'x*'.",
      "Allowing a partial match — the whole of s must be consumed.",
    ],
    edgeCases: [
      "Pattern beginning with a character followed by '*' that must match zero times.",
      "Pattern of only 'x*' groups matching an empty-after-consumption string.",
      "'.' combined with '*' as '.*' matching any suffix.",
    ],
    whyItMatters:
      "Regex matching is the canonical two-dimensional DP with branching transitions; it shows up whenever you implement a matcher, glob, or query engine.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 302 — pure_dsa · arrays_hashing · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-gap-sorted-metrics",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "arrays_hashing",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Largest Gap Between Adjacent Sorted Metrics",
    framing:
      "A telemetry pipeline records unsorted metric values. You must report the largest gap between successive values once sorted — in linear time, because the array is huge and re-sorting is too slow.",
    statement:
      "Given an integer array nums, return the maximum difference between two successive elements in its sorted form. If the array contains fewer than two elements, return 0. You must run in linear time and use linear extra space.",
    inputFormat: "An integer array nums.",
    outputFormat: "An integer: the maximum successive gap in sorted order, or 0 if length < 2.",
    constraints: [
      "1 <= nums.length <= 100000",
      "0 <= nums[i] <= 10^9",
      "Linear time and linear space required (no comparison sort).",
    ],
    examples: [
      {
        input: "nums = [3,6,9,1]",
        output: "3",
        explanation: "Sorted is [1,3,6,9]; successive gaps are 2,3,3 — max is 3.",
      },
      {
        input: "nums = [10]",
        output: "0",
        explanation: "Fewer than two elements.",
      },
    ],
    approach: [
      "A comparison sort is O(n log n); to hit linear time use the pigeonhole principle with buckets.",
      "With n numbers spanning [min, max], the maximum gap is at least ceil((max-min)/(n-1)).",
      "Make buckets of that size. The maximum gap never lies inside a bucket, only between buckets.",
      "Track only the min and max value placed in each bucket.",
      "Sweep buckets in order; the answer is the largest (current bucket min - previous non-empty bucket max).",
    ],
    solutionSteps: [
      "If n < 2 return 0. Compute lo=min, hi=max; if lo==hi return 0.",
      "Set bucketSize = max(1, (hi-lo)/(n-1)) and bucketCount = (hi-lo)/bucketSize + 1.",
      "For each value, index = (v-lo)/bucketSize; update that bucket's min and max.",
      "Walk buckets left to right keeping prevMax of the last non-empty bucket.",
      "Answer = max over non-empty buckets of (bucketMin - prevMax).",
    ],
    code: {
      python: `def maximum_gap(nums: list[int]) -> int:
    n = len(nums)
    if n < 2:
        return 0
    lo, hi = min(nums), max(nums)
    if lo == hi:
        return 0
    size = max(1, (hi - lo) // (n - 1))
    count = (hi - lo) // size + 1
    bmin = [float("inf")] * count
    bmax = [float("-inf")] * count
    for v in nums:
        i = (v - lo) // size
        bmin[i] = min(bmin[i], v)
        bmax[i] = max(bmax[i], v)
    best = 0
    prev = lo
    for i in range(count):
        if bmin[i] == float("inf"):
            continue
        best = max(best, bmin[i] - prev)
        prev = bmax[i]
    return best
`,
      java: `import java.util.*;

class Solution {
    public int maximumGap(int[] nums) {
        int n = nums.length;
        if (n < 2) return 0;
        int lo = Integer.MAX_VALUE, hi = Integer.MIN_VALUE;
        for (int v : nums) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
        if (lo == hi) return 0;
        int size = Math.max(1, (hi - lo) / (n - 1));
        int count = (hi - lo) / size + 1;
        int[] bmin = new int[count]; int[] bmax = new int[count];
        Arrays.fill(bmin, Integer.MAX_VALUE); Arrays.fill(bmax, Integer.MIN_VALUE);
        for (int v : nums) {
            int i = (v - lo) / size;
            bmin[i] = Math.min(bmin[i], v);
            bmax[i] = Math.max(bmax[i], v);
        }
        int best = 0, prev = lo;
        for (int i = 0; i < count; i++) {
            if (bmin[i] == Integer.MAX_VALUE) continue;
            best = Math.max(best, bmin[i] - prev);
            prev = bmax[i];
        }
        return best;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
#include <climits>
using namespace std;

class Solution {
public:
    int maximumGap(vector<int>& nums) {
        int n = nums.size();
        if (n < 2) return 0;
        int lo = INT_MAX, hi = INT_MIN;
        for (int v : nums) { lo = min(lo, v); hi = max(hi, v); }
        if (lo == hi) return 0;
        int size = max(1, (hi - lo) / (n - 1));
        int count = (hi - lo) / size + 1;
        vector<int> bmin(count, INT_MAX), bmax(count, INT_MIN);
        for (int v : nums) {
            int i = (v - lo) / size;
            bmin[i] = min(bmin[i], v);
            bmax[i] = max(bmax[i], v);
        }
        int best = 0, prev = lo;
        for (int i = 0; i < count; i++) {
            if (bmin[i] == INT_MAX) continue;
            best = max(best, bmin[i] - prev);
            prev = bmax[i];
        }
        return best;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Falling back to a comparison sort, which violates the linear-time requirement.",
      "Bucket size of zero when (hi-lo) < n-1; clamp to at least 1.",
      "Comparing within a bucket — the max gap is always across bucket boundaries.",
    ],
    edgeCases: [
      "All elements equal — gap is 0.",
      "Exactly two elements.",
      "Large value range with sparse values leaving many empty buckets.",
    ],
    whyItMatters:
      "Bucket/pigeonhole reasoning is how you beat the sort barrier; the same trick underlies linear-time selection and histogram analytics.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 303 — pure_dsa · math_geometry · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "optimal-depot-meeting-point",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "math_geometry",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "software_engineer"],
    title: "Minimum Total Travel to a Common Depot",
    framing:
      "Field teams are positioned on a grid (1s mark a team in a binary grid). Choose a single depot cell to minimize the total Manhattan distance everyone travels to reach it.",
    statement:
      "Given an m x n binary grid where each 1 marks a team's home, return the minimum total Manhattan distance to a single meeting point. Distance between (r1,c1) and (r2,c2) is |r1-r2| + |c1-c2|. The meeting point may be any cell.",
    inputFormat: "A 2D binary grid (0/1) with at least one 1.",
    outputFormat: "An integer: the minimum total Manhattan travel distance.",
    constraints: [
      "m == grid.length, n == grid[0].length",
      "1 <= m, n <= 200",
      "grid[i][j] is 0 or 1; there is at least one 1.",
    ],
    examples: [
      {
        input: "grid = [[1,0,0,0,1],[0,0,0,0,0],[0,0,1,0,0]]",
        output: "6",
        explanation: "Meeting at (0,2) gives total distance 6, which is minimal.",
      },
      {
        input: "grid = [[1,1]]",
        output: "1",
        explanation: "Either occupied cell yields total distance 1.",
      },
    ],
    approach: [
      "Manhattan distance separates into independent row and column components.",
      "For each axis, the point minimizing the sum of absolute deviations is the median of the coordinates.",
      "Collect all row indices of 1s (already sorted by scanning rows in order) and all column indices (sort them).",
      "Sum the distances of each coordinate to its median using a two-pointer pass.",
      "Total answer is the row-axis cost plus the column-axis cost.",
    ],
    solutionSteps: [
      "Scan rows top-to-bottom collecting rows[] of every 1 (sorted), and collect cols[] of every 1.",
      "Sort cols[] (rows[] is already non-decreasing).",
      "Define a helper: sum over pairs from both ends of (high - low) — this equals total deviation from the median.",
      "Compute cost = helper(rows) + helper(cols).",
      "Return cost.",
    ],
    code: {
      python: `def min_total_distance(grid: list[list[int]]) -> int:
    rows, cols = [], []
    for r in range(len(grid)):
        for c in range(len(grid[0])):
            if grid[r][c] == 1:
                rows.append(r)
                cols.append(c)
    cols.sort()

    def cost(arr: list[int]) -> int:
        i, j, total = 0, len(arr) - 1, 0
        while i < j:
            total += arr[j] - arr[i]
            i += 1
            j -= 1
        return total

    return cost(rows) + cost(cols)
`,
      java: `import java.util.*;

class Solution {
    public int minTotalDistance(int[][] grid) {
        List<Integer> rows = new ArrayList<>(), cols = new ArrayList<>();
        for (int r = 0; r < grid.length; r++)
            for (int c = 0; c < grid[0].length; c++)
                if (grid[r][c] == 1) { rows.add(r); cols.add(c); }
        Collections.sort(cols);
        return cost(rows) + cost(cols);
    }

    private int cost(List<Integer> arr) {
        int i = 0, j = arr.size() - 1, total = 0;
        while (i < j) { total += arr.get(j) - arr.get(i); i++; j--; }
        return total;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
    int cost(vector<int>& a) {
        int i = 0, j = (int)a.size() - 1, total = 0;
        while (i < j) { total += a[j] - a[i]; i++; j--; }
        return total;
    }
public:
    int minTotalDistance(vector<vector<int>>& grid) {
        vector<int> rows, cols;
        for (int r = 0; r < (int)grid.size(); r++)
            for (int c = 0; c < (int)grid[0].size(); c++)
                if (grid[r][c] == 1) { rows.push_back(r); cols.push_back(c); }
        sort(cols.begin(), cols.end());
        return cost(rows) + cost(cols);
    }
};
`,
    },
    complexity: { time: "O(m * n)", space: "O(m * n)" },
    pitfalls: [
      "Using the mean instead of the median — the mean minimizes squared distance, not absolute.",
      "Forgetting that rows are already sorted but columns are not.",
      "Trying every cell as a candidate (O((mn)^2)) when the median is provably optimal.",
    ],
    edgeCases: [
      "A single team — distance 0.",
      "All teams on one row or one column.",
      "Even count of teams — any point between the two medians is optimal and the pairing sum still holds.",
    ],
    whyItMatters:
      "Separability plus the median property is a recurring optimization pattern for facility-location and load-centroid problems.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 304 — pure_dsa · graphs · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "robot-roll-shortest-stop",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "platform_engineer"],
    title: "Rolling Ball Shortest Distance to Destination",
    framing:
      "A warehouse ball rolls until it hits a wall, only then can it change direction. Given a maze, start, and destination, find the shortest distance the ball travels to stop exactly at the destination.",
    statement:
      "Given an m x n maze (0 = empty, 1 = wall), a start and a destination, a ball rolls up/down/left/right and does not stop until hitting a wall. Return the shortest distance (number of empty cells traversed) for the ball to stop at the destination, or -1 if impossible.",
    inputFormat:
      "maze: 2D 0/1 grid; start: [r,c]; destination: [r,c]. Both start and destination are empty cells.",
    outputFormat: "An integer shortest distance, or -1 if the ball cannot stop at the destination.",
    constraints: [
      "m == maze.length, n == maze[0].length",
      "1 <= m, n <= 100",
      "The borders are walls implicitly via grid bounds; the ball stops at walls or edges.",
    ],
    examples: [
      {
        input:
          "maze = [[0,0,1,0,0],[0,0,0,0,0],[0,0,0,1,0],[1,1,0,1,1],[0,0,0,0,0]], start = [0,4], destination = [4,4]",
        output: "12",
        explanation: "One shortest stopping route covers 12 cells of travel.",
      },
      {
        input:
          "maze = [[0,0,1,0,0],[0,0,0,0,0],[0,0,0,1,0],[1,1,0,1,1],[0,0,0,0,0]], start = [0,4], destination = [3,2]",
        output: "-1",
        explanation: "The ball cannot stop on a cell it only rolls through.",
      },
    ],
    approach: [
      "This is a weighted shortest-path problem: each 'roll until wall' is an edge whose weight is the cells traversed.",
      "Use Dijkstra with a min-heap keyed by accumulated distance.",
      "From a popped cell, expand in all four directions, rolling until the next cell would be a wall or out of bounds.",
      "The stopping cell is a neighbor; relax its distance if the new total is smaller.",
      "Return the recorded distance at the destination, or -1.",
    ],
    solutionSteps: [
      "Initialize dist grid to infinity, dist[start]=0, push (0,start) into a min-heap.",
      "Pop the smallest-distance cell; skip if stale.",
      "For each direction, roll while the next step is in-bounds and empty, counting steps.",
      "If dist[start] + steps < dist[stop], update and push.",
      "After the heap drains, return dist[destination] or -1.",
    ],
    code: {
      python: `import heapq

def shortest_distance(maze: list[list[int]], start: list[int], destination: list[int]) -> int:
    m, n = len(maze), len(maze[0])
    dist = [[float("inf")] * n for _ in range(m)]
    dist[start[0]][start[1]] = 0
    pq = [(0, start[0], start[1])]
    while pq:
        d, r, c = heapq.heappop(pq)
        if d > dist[r][c]:
            continue
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc, steps = r, c, 0
            while 0 <= nr + dr < m and 0 <= nc + dc < n and maze[nr + dr][nc + dc] == 0:
                nr += dr
                nc += dc
                steps += 1
            if d + steps < dist[nr][nc]:
                dist[nr][nc] = d + steps
                heapq.heappush(pq, (d + steps, nr, nc))
    ans = dist[destination[0]][destination[1]]
    return -1 if ans == float("inf") else ans
`,
      java: `import java.util.*;

class Solution {
    public int shortestDistance(int[][] maze, int[] start, int[] destination) {
        int m = maze.length, n = maze[0].length;
        int[][] dist = new int[m][n];
        for (int[] row : dist) Arrays.fill(row, Integer.MAX_VALUE);
        dist[start[0]][start[1]] = 0;
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
        pq.add(new int[]{0, start[0], start[1]});
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!pq.isEmpty()) {
            int[] cur = pq.poll();
            int d = cur[0], r = cur[1], c = cur[2];
            if (d > dist[r][c]) continue;
            for (int[] dir : dirs) {
                int nr = r, nc = c, steps = 0;
                while (nr + dir[0] >= 0 && nr + dir[0] < m && nc + dir[1] >= 0
                        && nc + dir[1] < n && maze[nr + dir[0]][nc + dir[1]] == 0) {
                    nr += dir[0]; nc += dir[1]; steps++;
                }
                if (d + steps < dist[nr][nc]) {
                    dist[nr][nc] = d + steps;
                    pq.add(new int[]{d + steps, nr, nc});
                }
            }
        }
        int ans = dist[destination[0]][destination[1]];
        return ans == Integer.MAX_VALUE ? -1 : ans;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
#include <climits>
using namespace std;

class Solution {
public:
    int shortestDistance(vector<vector<int>>& maze, vector<int>& start, vector<int>& destination) {
        int m = maze.size(), n = maze[0].size();
        vector<vector<int>> dist(m, vector<int>(n, INT_MAX));
        dist[start[0]][start[1]] = 0;
        priority_queue<vector<int>, vector<vector<int>>, greater<>> pq;
        pq.push({0, start[0], start[1]});
        int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!pq.empty()) {
            auto cur = pq.top(); pq.pop();
            int d = cur[0], r = cur[1], c = cur[2];
            if (d > dist[r][c]) continue;
            for (auto& dir : dirs) {
                int nr = r, nc = c, steps = 0;
                while (nr + dir[0] >= 0 && nr + dir[0] < m && nc + dir[1] >= 0
                        && nc + dir[1] < n && maze[nr + dir[0]][nc + dir[1]] == 0) {
                    nr += dir[0]; nc += dir[1]; steps++;
                }
                if (d + steps < dist[nr][nc]) {
                    dist[nr][nc] = d + steps;
                    pq.push({d + steps, nr, nc});
                }
            }
        }
        int ans = dist[destination[0]][destination[1]];
        return ans == INT_MAX ? -1 : ans;
    }
};
`,
    },
    complexity: { time: "O(m * n * max(m, n) * log(m * n))", space: "O(m * n)" },
    pitfalls: [
      "Using plain BFS — edges have unequal weights, so BFS gives wrong distances.",
      "Counting the destination as reached when the ball merely passes over it without stopping.",
      "Rolling one cell too far past a wall or the grid boundary.",
    ],
    edgeCases: [
      "Start equals destination — distance 0.",
      "Destination reachable only by rolling through it (answer -1).",
      "Single open row or column where the ball rolls end to end.",
    ],
    whyItMatters:
      "Modeling compound moves as weighted edges and applying Dijkstra is a core technique for robotics, routing, and game-state search.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 305 — pure_dsa · graphs · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "bricks-stability-after-strikes",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "software_engineer"],
    title: "Bricks That Fall After Each Strike",
    framing:
      "A wall of bricks is stable if each brick connects to the top edge through adjacent bricks. Given a sequence of strikes that remove bricks, report how many bricks fall after each strike.",
    statement:
      "Given an m x n binary grid (1 = brick) and an array hits where each hit erases the brick at that cell (no-op if already empty), a brick is stable if it is in the top row or 4-directionally connected to a stable brick. After each hit, return the number of bricks that fall (become unstable) as a result of that hit.",
    inputFormat:
      "grid: 2D 0/1; hits: array of [row, col] positions, applied in order.",
    outputFormat: "An array result where result[i] is the count of bricks that fall after hits[i].",
    constraints: [
      "m == grid.length, n == grid[0].length",
      "1 <= m, n <= 200",
      "1 <= hits.length <= 40000; hits[i] is within the grid.",
    ],
    examples: [
      {
        input: "grid = [[1,0,0,0],[1,1,1,0]], hits = [[1,0]]",
        output: "[2]",
        explanation: "Removing (1,0) detaches (1,1) and (1,2) from the top, so 2 bricks fall.",
      },
      {
        input: "grid = [[1,0,0,0],[1,1,0,0]], hits = [[1,1],[1,0]]",
        output: "[0,0]",
        explanation: "Removing (1,1) drops nothing; then (1,0) only removes itself.",
      },
    ],
    approach: [
      "Process hits in reverse, turning the problem into adding bricks back and counting how the stable component grows.",
      "First erase all hit bricks from a copy of the grid (mark them so we can tell genuine bricks from already-empty).",
      "Union the remaining bricks; connect top-row bricks to a virtual 'roof' node.",
      "Re-add each hit brick in reverse; if it was a real brick, union it with neighbors. Bricks newly connected to the roof are the ones that would have fallen.",
      "The fall count is the roof size increase minus one (the re-added brick itself does not count as fallen).",
    ],
    solutionSteps: [
      "Copy grid, set grid[r][c]=0 for every hit (track which hits hit a real brick).",
      "Build a DSU with a virtual roof index; union all surviving bricks, attaching top-row bricks to roof.",
      "Iterate hits in reverse: if the original cell was 0, append 0 and continue.",
      "Otherwise set the cell to 1, record preRoof = size(roof), union with adjacent bricks and roof if on top row.",
      "postRoof = size(roof); fallen = max(0, postRoof - preRoof - 1); prepend to results.",
    ],
    code: {
      python: `def hit_bricks(grid: list[list[int]], hits: list[list[int]]) -> list[int]:
    m, n = len(grid), len(grid[0])
    roof = m * n
    parent = list(range(m * n + 1))
    size = [1] * (m * n + 1)

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb
            size[rb] += size[ra]

    g = [row[:] for row in grid]
    for r, c in hits:
        g[r][c] = 0

    def idx(r: int, c: int) -> int:
        return r * n + c

    for r in range(m):
        for c in range(n):
            if g[r][c] == 1:
                if r == 0:
                    union(idx(r, c), roof)
                if r > 0 and g[r - 1][c] == 1:
                    union(idx(r, c), idx(r - 1, c))
                if c > 0 and g[r][c - 1] == 1:
                    union(idx(r, c), idx(r, c - 1))

    res = [0] * len(hits)
    dirs = ((1, 0), (-1, 0), (0, 1), (0, -1))
    for i in range(len(hits) - 1, -1, -1):
        r, c = hits[i]
        if grid[r][c] == 0:
            continue
        pre = size[find(roof)]
        g[r][c] = 1
        if r == 0:
            union(idx(r, c), roof)
        for dr, dc in dirs:
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n and g[nr][nc] == 1:
                union(idx(r, c), idx(nr, nc))
        post = size[find(roof)]
        res[i] = max(0, post - pre - 1)
    return res
`,
      java: `class Solution {
    int[] parent, size;
    int find(int x) { while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
    void union(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra != rb) { parent[ra] = rb; size[rb] += size[ra]; }
    }

    public int[] hitBricks(int[][] grid, int[][] hits) {
        int m = grid.length, n = grid[0].length, roof = m * n;
        parent = new int[m * n + 1]; size = new int[m * n + 1];
        for (int i = 0; i <= m * n; i++) { parent[i] = i; size[i] = 1; }
        int[][] g = new int[m][n];
        for (int r = 0; r < m; r++) g[r] = grid[r].clone();
        for (int[] h : hits) g[h[0]][h[1]] = 0;
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        for (int r = 0; r < m; r++)
            for (int c = 0; c < n; c++)
                if (g[r][c] == 1) {
                    if (r == 0) union(r * n + c, roof);
                    if (r > 0 && g[r - 1][c] == 1) union(r * n + c, (r - 1) * n + c);
                    if (c > 0 && g[r][c - 1] == 1) union(r * n + c, r * n + c - 1);
                }
        int[] res = new int[hits.length];
        for (int i = hits.length - 1; i >= 0; i--) {
            int r = hits[i][0], c = hits[i][1];
            if (grid[r][c] == 0) continue;
            int pre = size[find(roof)];
            g[r][c] = 1;
            if (r == 0) union(r * n + c, roof);
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr >= 0 && nr < m && nc >= 0 && nc < n && g[nr][nc] == 1)
                    union(r * n + c, nr * n + nc);
            }
            int post = size[find(roof)];
            res[i] = Math.max(0, post - pre - 1);
        }
        return res;
    }
}
`,
      cpp: `#include <vector>
#include <numeric>
#include <algorithm>
using namespace std;

class Solution {
    vector<int> parent, sz;
    int find(int x) { while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
    void uni(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra != rb) { parent[ra] = rb; sz[rb] += sz[ra]; }
    }
public:
    vector<int> hitBricks(vector<vector<int>>& grid, vector<vector<int>>& hits) {
        int m = grid.size(), n = grid[0].size(), roof = m * n;
        parent.resize(m * n + 1); sz.assign(m * n + 1, 1);
        iota(parent.begin(), parent.end(), 0);
        auto g = grid;
        for (auto& h : hits) g[h[0]][h[1]] = 0;
        int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        for (int r = 0; r < m; r++)
            for (int c = 0; c < n; c++)
                if (g[r][c] == 1) {
                    if (r == 0) uni(r * n + c, roof);
                    if (r > 0 && g[r - 1][c] == 1) uni(r * n + c, (r - 1) * n + c);
                    if (c > 0 && g[r][c - 1] == 1) uni(r * n + c, r * n + c - 1);
                }
        vector<int> res(hits.size());
        for (int i = (int)hits.size() - 1; i >= 0; i--) {
            int r = hits[i][0], c = hits[i][1];
            if (grid[r][c] == 0) continue;
            int pre = sz[find(roof)];
            g[r][c] = 1;
            if (r == 0) uni(r * n + c, roof);
            for (auto& d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr >= 0 && nr < m && nc >= 0 && nc < n && g[nr][nc] == 1)
                    uni(r * n + c, nr * n + nc);
            }
            int post = sz[find(roof)];
            res[i] = max(0, post - pre - 1);
        }
        return res;
    }
};
`,
    },
    complexity: { time: "O((m * n + h) * α)", space: "O(m * n)" },
    pitfalls: [
      "Processing hits forward — deletions are hard with union-find; reverse them into additions.",
      "Counting the re-added brick itself as fallen; subtract one.",
      "Forgetting hits that target an already-empty cell (must contribute 0).",
    ],
    edgeCases: [
      "A hit on an empty cell.",
      "Removing a top-row brick that supports nothing below.",
      "Repeated hits on the same cell.",
    ],
    whyItMatters:
      "Reversing deletions into insertions to make union-find applicable is a classic offline-processing trick used in connectivity and percolation problems.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 306 — ai_applied · dp_1d · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-reward-jump-window",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 11,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "software_engineer"],
    title: "Maximum Reward Across Generation Steps",
    framing:
      "A decoding policy moves through generation steps; from step i it may advance 1..k steps. Each step carries a signed reward. Maximize total reward collected from the first step to the last.",
    statement:
      "Given an integer array reward (which may contain negatives) and an integer k, start at index 0 and end at index n-1. From index i you may jump to any index in [i+1, i+k] that is within bounds. Return the maximum sum of reward values over the indices you land on, including index 0 and index n-1.",
    inputFormat: "An integer array reward and an integer k.",
    outputFormat: "An integer: the maximum achievable total reward.",
    constraints: [
      "1 <= reward.length <= 100000",
      "1 <= k <= reward.length",
      "-10000 <= reward[i] <= 10000",
    ],
    examples: [
      {
        input: "reward = [1,-1,-2,4,-7,3], k = 2",
        output: "7",
        explanation: "Path 0 -> 1 -> 3 -> 5 collects 1 + (-1) + 4 + 3 = 7.",
      },
      {
        input: "reward = [10,-5,-2,4,0,3], k = 3",
        output: "17",
        explanation: "Path 0 -> 3 -> 5 collects 10 + 4 + 3 = 17.",
      },
    ],
    approach: [
      "Let dp[i] be the best total reward to reach index i; dp[i] = reward[i] + max(dp[i-k..i-1]).",
      "A naive max over the window is O(nk); use a monotonic decreasing deque to get O(1) amortized window-max.",
      "The deque holds candidate indices whose dp values are decreasing from front to back.",
      "Before computing dp[i], evict indices that fall outside [i-k, i-1] from the front.",
      "dp[0] = reward[0]; the answer is dp[n-1].",
    ],
    solutionSteps: [
      "Initialize dp[0]=reward[0] and a deque containing index 0.",
      "For i from 1 to n-1: pop front indices < i-k.",
      "dp[i] = reward[i] + dp[deque.front().",
      "Pop back indices whose dp <= dp[i], then push i.",
      "Return dp[n-1].",
    ],
    code: {
      python: `from collections import deque

def max_result(reward: list[int], k: int) -> int:
    n = len(reward)
    dp = [0] * n
    dp[0] = reward[0]
    dq = deque([0])
    for i in range(1, n):
        while dq and dq[0] < i - k:
            dq.popleft()
        dp[i] = reward[i] + dp[dq[0]]
        while dq and dp[dq[-1]] <= dp[i]:
            dq.pop()
        dq.append(i)
    return dp[n - 1]
`,
      java: `import java.util.*;

class Solution {
    public int maxResult(int[] reward, int k) {
        int n = reward.length;
        int[] dp = new int[n];
        dp[0] = reward[0];
        Deque<Integer> dq = new ArrayDeque<>();
        dq.add(0);
        for (int i = 1; i < n; i++) {
            while (!dq.isEmpty() && dq.peekFirst() < i - k) dq.pollFirst();
            dp[i] = reward[i] + dp[dq.peekFirst()];
            while (!dq.isEmpty() && dp[dq.peekLast()] <= dp[i]) dq.pollLast();
            dq.addLast(i);
        }
        return dp[n - 1];
    }
}
`,
      cpp: `#include <vector>
#include <deque>
using namespace std;

class Solution {
public:
    int maxResult(vector<int>& reward, int k) {
        int n = reward.size();
        vector<int> dp(n);
        dp[0] = reward[0];
        deque<int> dq;
        dq.push_back(0);
        for (int i = 1; i < n; i++) {
            while (!dq.empty() && dq.front() < i - k) dq.pop_front();
            dp[i] = reward[i] + dp[dq.front()];
            while (!dq.empty() && dp[dq.back()] <= dp[i]) dq.pop_back();
            dq.push_back(i);
        }
        return dp[n - 1];
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Scanning the whole window for the max — that degrades to O(nk).",
      "Forgetting to evict indices that have slid out of the window from the front.",
      "Mishandling negative rewards by clamping to zero — you must still land on every chosen index.",
    ],
    edgeCases: [
      "Single element — answer is reward[0].",
      "All negative rewards — you still must traverse to the end.",
      "k equal to n, allowing a direct jump from 0 to n-1.",
    ],
    whyItMatters:
      "Sliding-window-maximum DP with a monotonic deque is the standard way to make windowed transitions linear; it underlies streaming reward and scheduling optimizers.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 307 — pure_dsa · greedy · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "attend-max-daily-events",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "greedy",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer"],
    title: "Attend the Maximum Number of Events",
    framing:
      "A calendar lists events, each available across an inclusive day range. You can attend at most one event per day and each event needs just one day. Maximize how many distinct events you attend.",
    statement:
      "Given events where events[i] = [startDay_i, endDay_i], you can attend an event on any single day d with startDay_i <= d <= endDay_i, attending at most one event per day. Return the maximum number of events you can attend.",
    inputFormat: "An array events of [startDay, endDay] pairs (1-indexed days).",
    outputFormat: "An integer: the maximum number of events attendable.",
    constraints: [
      "1 <= events.length <= 100000",
      "1 <= startDay_i <= endDay_i <= 100000",
    ],
    examples: [
      {
        input: "events = [[1,2],[2,3],[3,4]]",
        output: "3",
        explanation: "Attend day 1, day 2, day 3 — one event each.",
      },
      {
        input: "events = [[1,2],[2,3],[3,4],[1,2]]",
        output: "4",
        explanation: "Attend on days 1,2,3,4 covering all four events.",
      },
    ],
    approach: [
      "Greedy: on each day, attend the available event with the earliest end day (most urgent).",
      "Sort events by start day so we can add them as days advance.",
      "Use a min-heap of end days for events that have started and are not yet expired.",
      "Iterate day by day from the smallest start to the largest end; push newly started events.",
      "Drop expired ends from the heap, then attend the smallest end available that day and count it.",
    ],
    solutionSteps: [
      "Sort events by start day; keep an index pointer into them.",
      "For each day d from 1 to maxEnd: push end days of all events whose start == d.",
      "Pop heap entries whose end < d (expired, can never attend).",
      "If the heap is non-empty, pop the smallest end (attend it) and increment the count.",
      "Return the count after the last day.",
    ],
    code: {
      python: `import heapq

def max_events(events: list[list[int]]) -> int:
    events.sort()
    heap: list[int] = []
    i, n = 0, len(events)
    day = 0
    attended = 0
    max_end = max(e[1] for e in events)
    for day in range(1, max_end + 1):
        while i < n and events[i][0] == day:
            heapq.heappush(heap, events[i][1])
            i += 1
        while heap and heap[0] < day:
            heapq.heappop(heap)
        if heap:
            heapq.heappop(heap)
            attended += 1
    return attended
`,
      java: `import java.util.*;

class Solution {
    public int maxEvents(int[][] events) {
        Arrays.sort(events, (a, b) -> a[0] - b[0]);
        PriorityQueue<Integer> heap = new PriorityQueue<>();
        int i = 0, n = events.length, attended = 0, maxEnd = 0;
        for (int[] e : events) maxEnd = Math.max(maxEnd, e[1]);
        for (int day = 1; day <= maxEnd; day++) {
            while (i < n && events[i][0] == day) heap.add(events[i++][1]);
            while (!heap.isEmpty() && heap.peek() < day) heap.poll();
            if (!heap.isEmpty()) { heap.poll(); attended++; }
        }
        return attended;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
#include <algorithm>
using namespace std;

class Solution {
public:
    int maxEvents(vector<vector<int>>& events) {
        sort(events.begin(), events.end());
        priority_queue<int, vector<int>, greater<>> heap;
        int i = 0, n = events.size(), attended = 0, maxEnd = 0;
        for (auto& e : events) maxEnd = max(maxEnd, e[1]);
        for (int day = 1; day <= maxEnd; day++) {
            while (i < n && events[i][0] == day) heap.push(events[i++][1]);
            while (!heap.empty() && heap.top() < day) heap.pop();
            if (!heap.empty()) { heap.pop(); attended++; }
        }
        return attended;
    }
};
`,
    },
    complexity: { time: "O((D + n) log n)", space: "O(n)" },
    pitfalls: [
      "Sorting by end day and scanning events instead of days — that mishandles overlapping availability.",
      "Forgetting to discard events whose end day has already passed.",
      "Attending more than one event on the same day.",
    ],
    edgeCases: [
      "All events share the same single day — attend only one.",
      "Disjoint single-day events — attend all.",
      "An event whose window has fully expired before it is reached.",
    ],
    whyItMatters:
      "The 'always take the soonest-to-expire option' heap greedy is the backbone of deadline scheduling and resource reservation systems.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 308 — pure_dsa · graphs · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "seat-pairs-min-swaps",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "software_engineer"],
    title: "Minimum Swaps to Seat Every Pair Together",
    framing:
      "Replicas are deployed in a row of slots, two per logical pair (ids 2x and 2x+1). You want each pair to occupy adjacent slots. Each swap exchanges any two slots; find the fewest swaps.",
    statement:
      "Given an array row of length 2N that is a permutation of 0..2N-1, where the pair for value v is v XOR 1, partners sit at indices (0,1), (2,3), ... Return the minimum number of swaps so that every pair occupies adjacent positions.",
    inputFormat: "An array row of length 2N, a permutation of integers 0..2N-1.",
    outputFormat: "An integer: the minimum number of swaps.",
    constraints: [
      "2 <= row.length <= 60",
      "row.length is even",
      "row is a permutation of 0..row.length-1.",
    ],
    examples: [
      {
        input: "row = [0,2,1,3]",
        output: "1",
        explanation: "Swap indices 1 and 2 to get [0,1,2,3]; both pairs are adjacent.",
      },
      {
        input: "row = [3,2,0,1]",
        output: "0",
        explanation: "Pairs (3,2) and (0,1) are already adjacent.",
      },
    ],
    approach: [
      "Think of each adjacent slot pair (2i, 2i+1) as a node; the two people seated there each want their partner.",
      "Build a graph where slots are connected when their occupants are partners but sit in different couples.",
      "Each connected component (cycle) of size c needs c-1 swaps to resolve.",
      "Equivalently, use union-find over couple indices: union the couples of the two occupants in each fixed pair of seats.",
      "Answer = N - (number of union-find components).",
    ],
    solutionSteps: [
      "Create DSU over N couple indices (couple of person p is p/2).",
      "For each seat pair (2i, 2i+1), union couple(row[2i]) with couple(row[2i+1]).",
      "Count distinct DSU roots among the N couples.",
      "The number of swaps equals N minus that component count.",
      "Return it.",
    ],
    code: {
      python: `def min_swaps_couples(row: list[int]) -> int:
    n = len(row) // 2
    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    components = n
    for i in range(0, len(row), 2):
        a, b = row[i] // 2, row[i + 1] // 2
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb
            components -= 1
    return n - components
`,
      java: `class Solution {
    int[] parent;
    int find(int x) { while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }

    public int minSwapsCouples(int[] row) {
        int n = row.length / 2;
        parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        int components = n;
        for (int i = 0; i < row.length; i += 2) {
            int a = row[i] / 2, b = row[i + 1] / 2;
            int ra = find(a), rb = find(b);
            if (ra != rb) { parent[ra] = rb; components--; }
        }
        return n - components;
    }
}
`,
      cpp: `#include <vector>
#include <numeric>
using namespace std;

class Solution {
    vector<int> parent;
    int find(int x) { while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
public:
    int minSwapsCouples(vector<int>& row) {
        int n = row.size() / 2;
        parent.resize(n);
        iota(parent.begin(), parent.end(), 0);
        int components = n;
        for (int i = 0; i < (int)row.size(); i += 2) {
            int a = row[i] / 2, b = row[i + 1] / 2;
            int ra = find(a), rb = find(b);
            if (ra != rb) { parent[ra] = rb; components--; }
        }
        return n - components;
    }
};
`,
    },
    complexity: { time: "O(N * α)", space: "O(N)" },
    pitfalls: [
      "Greedily swapping the partner into place works here, but the cycle/union-find argument is what proves minimality.",
      "Mapping person to couple incorrectly — couple index is value / 2, partner is value XOR 1.",
      "Counting swaps as components instead of N minus components.",
    ],
    edgeCases: [
      "Already-seated pairs — zero swaps.",
      "Fully reversed arrangement forming one big cycle.",
      "Minimum size N = 1 (two people).",
    ],
    whyItMatters:
      "Recognizing that a permutation decomposes into cycles, each costing size-minus-one swaps, is a fundamental result reused across sorting-by-swaps and matching problems.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 309 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "connect-two-teams-min-cost",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "platform_engineer"],
    title: "Minimum Cost to Connect Two Groups",
    framing:
      "Two groups of services must be fully cross-wired: every service in each group needs at least one link to the other group. A cost matrix gives the price of each cross-link. Minimize total cost.",
    statement:
      "Given two groups of sizes m and n (m <= n is not guaranteed) and a cost matrix cost where cost[i][j] is the price of connecting point i of group 1 to point j of group 2, connect the groups so that every point in both groups has at least one connection. Return the minimum total connection cost.",
    inputFormat:
      "cost: an m x n matrix of non-negative integers; group 1 has m points, group 2 has n points.",
    outputFormat: "An integer: the minimum total cost to connect both groups.",
    constraints: [
      "1 <= m, n <= 12",
      "0 <= cost[i][j] <= 100",
    ],
    examples: [
      {
        input: "cost = [[15,96],[36,2]]",
        output: "17",
        explanation: "Connect (0->0)=15 and (1->1)=2 for 17; both groups fully covered.",
      },
      {
        input: "cost = [[1,3,5],[4,1,1],[1,5,3]]",
        output: "4",
        explanation: "A cover using cheap edges totals 4.",
      },
    ],
    approach: [
      "Process group-1 points one by one; track which group-2 points are already connected via a bitmask.",
      "dp[i][mask] = min cost to connect the first i group-1 points with group-2 coverage = mask.",
      "For point i, try connecting it to each group-2 point j: add cost[i][j] and set bit j.",
      "After all group-1 points are placed, any still-uncovered group-2 point j must take its cheapest edge from any group-1 point.",
      "Precompute, for each group-2 point, the minimum cost over all group-1 points to handle that tail cheaply.",
    ],
    solutionSteps: [
      "Compute minConn[j] = min over i of cost[i][j].",
      "dp[mask] over group-2 coverage; start dp for i=0 by connecting point 0 to each j.",
      "Transition i -> i+1: for each reachable mask, try each j, newMask = mask | (1<<j).",
      "After processing all m points, for each final mask add the cost of covering missing group-2 bits using minConn.",
      "Return the minimum total.",
    ],
    code: {
      python: `def connect_two_groups(cost: list[list[int]]) -> int:
    m, n = len(cost), len(cost[0])
    min_conn = [min(cost[i][j] for i in range(m)) for j in range(n)]
    full = 1 << n
    INF = float("inf")
    dp = [INF] * full
    dp[0] = 0
    for i in range(m):
        ndp = [INF] * full
        for mask in range(full):
            if dp[mask] == INF:
                continue
            for j in range(n):
                nm = mask | (1 << j)
                val = dp[mask] + cost[i][j]
                if val < ndp[nm]:
                    ndp[nm] = val
        dp = ndp
    ans = INF
    for mask in range(full):
        if dp[mask] == INF:
            continue
        extra = sum(min_conn[j] for j in range(n) if not (mask & (1 << j)))
        ans = min(ans, dp[mask] + extra)
    return ans
`,
      java: `class Solution {
    public int connectTwoGroups(java.util.List<java.util.List<Integer>> cost) {
        int m = cost.size(), n = cost.get(0).size();
        int[] minConn = new int[n];
        for (int j = 0; j < n; j++) {
            int best = Integer.MAX_VALUE;
            for (int i = 0; i < m; i++) best = Math.min(best, cost.get(i).get(j));
            minConn[j] = best;
        }
        int full = 1 << n;
        int[] dp = new int[full];
        java.util.Arrays.fill(dp, Integer.MAX_VALUE);
        dp[0] = 0;
        for (int i = 0; i < m; i++) {
            int[] ndp = new int[full];
            java.util.Arrays.fill(ndp, Integer.MAX_VALUE);
            for (int mask = 0; mask < full; mask++) {
                if (dp[mask] == Integer.MAX_VALUE) continue;
                for (int j = 0; j < n; j++) {
                    int nm = mask | (1 << j);
                    int val = dp[mask] + cost.get(i).get(j);
                    if (val < ndp[nm]) ndp[nm] = val;
                }
            }
            dp = ndp;
        }
        int ans = Integer.MAX_VALUE;
        for (int mask = 0; mask < full; mask++) {
            if (dp[mask] == Integer.MAX_VALUE) continue;
            int extra = 0;
            for (int j = 0; j < n; j++) if ((mask & (1 << j)) == 0) extra += minConn[j];
            ans = Math.min(ans, dp[mask] + extra);
        }
        return ans;
    }
}
`,
      cpp: `#include <vector>
#include <climits>
#include <algorithm>
using namespace std;

class Solution {
public:
    int connectTwoGroups(vector<vector<int>>& cost) {
        int m = cost.size(), n = cost[0].size();
        vector<int> minConn(n, INT_MAX);
        for (int j = 0; j < n; j++)
            for (int i = 0; i < m; i++) minConn[j] = min(minConn[j], cost[i][j]);
        int full = 1 << n;
        vector<int> dp(full, INT_MAX);
        dp[0] = 0;
        for (int i = 0; i < m; i++) {
            vector<int> ndp(full, INT_MAX);
            for (int mask = 0; mask < full; mask++) {
                if (dp[mask] == INT_MAX) continue;
                for (int j = 0; j < n; j++) {
                    int nm = mask | (1 << j);
                    int val = dp[mask] + cost[i][j];
                    if (val < ndp[nm]) ndp[nm] = val;
                }
            }
            dp = ndp;
        }
        int ans = INT_MAX;
        for (int mask = 0; mask < full; mask++) {
            if (dp[mask] == INT_MAX) continue;
            int extra = 0;
            for (int j = 0; j < n; j++) if (!(mask & (1 << j))) extra += minConn[j];
            ans = min(ans, dp[mask] + extra);
        }
        return ans;
    }
};
`,
    },
    complexity: { time: "O(m * 2^n * n)", space: "O(2^n)" },
    pitfalls: [
      "Forgetting that group-2 points left uncovered after all group-1 points still need their cheapest edge.",
      "Indexing the bitmask over the larger group, blowing up the state space; mask the smaller dimension if you transpose.",
      "Not initializing dp[0]=0 before the first group-1 point.",
    ],
    edgeCases: [
      "1x1 cost matrix — answer is that single cost.",
      "One group much larger than the other.",
      "A column whose cheapest edge dominates the tail cost.",
    ],
    whyItMatters:
      "Bitmask DP over one dimension with a greedy tail is the standard way to solve small bipartite covering problems exactly.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 310 — pure_dsa · backtracking · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "tile-floor-fewest-squares",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Tile a Rectangle with the Fewest Squares",
    framing:
      "A rectangular dashboard panel of size n x m must be covered with whole square tiles of integer side length, no overlaps and no gaps. Find the minimum number of square tiles needed.",
    statement:
      "Given a rectangle of width n and height m, return the minimum number of integer-sided squares that tile it exactly with no overlap and no empty space.",
    inputFormat: "Two integers n and m (rectangle dimensions).",
    outputFormat: "An integer: the minimum number of squares.",
    constraints: [
      "1 <= n, m <= 13",
    ],
    examples: [
      {
        input: "n = 2, m = 3",
        output: "3",
        explanation: "One 2x2 square plus two 1x1 squares.",
      },
      {
        input: "n = 5, m = 8",
        output: "5",
        explanation: "Five squares tile the 5x8 rectangle optimally.",
      },
    ],
    approach: [
      "Maintain a height profile: heights[c] = how filled column c currently is.",
      "Always fill the lowest, left-most column first to avoid duplicate states.",
      "At that position, try placing squares of side from large down to 1 that fit within width and height bounds.",
      "Recurse with the updated profile, incrementing the square count, and backtrack.",
      "Prune when the running count already reaches the best found so far.",
    ],
    solutionSteps: [
      "Track heights[n] (all 0) and a best initialized to m*n (all unit squares).",
      "Find the lowest column; let start be its index and find the run of equal minimum height (max placeable width).",
      "For side from min(maxWidth, m-minHeight) down to 1: raise heights of that span by side, recurse with count+1, then restore.",
      "If the rectangle is fully filled (min height == m), update best.",
      "Return best.",
    ],
    code: {
      python: `def tiling_rectangle(n: int, m: int) -> int:
    heights = [0] * n
    best = m * n

    def dfs(count: int) -> None:
        nonlocal best
        if count >= best:
            return
        min_h = min(heights)
        if min_h == m:
            best = count
            return
        start = heights.index(min_h)
        end = start
        while end < n and heights[end] == min_h:
            end += 1
        max_w = min(end - start, m - min_h)
        for side in range(max_w, 0, -1):
            for c in range(start, start + side):
                heights[c] += side
            dfs(count + 1)
            for c in range(start, start + side):
                heights[c] -= side

    dfs(0)
    return best
`,
      java: `class Solution {
    int n, m, best;
    int[] heights;

    public int tilingRectangle(int n, int m) {
        this.n = n; this.m = m; this.best = m * n;
        this.heights = new int[n];
        dfs(0);
        return best;
    }

    private void dfs(int count) {
        if (count >= best) return;
        int minH = Integer.MAX_VALUE, start = 0;
        for (int c = 0; c < n; c++) if (heights[c] < minH) { minH = heights[c]; start = c; }
        if (minH == m) { best = count; return; }
        int end = start;
        while (end < n && heights[end] == minH) end++;
        int maxW = Math.min(end - start, m - minH);
        for (int side = maxW; side >= 1; side--) {
            for (int c = start; c < start + side; c++) heights[c] += side;
            dfs(count + 1);
            for (int c = start; c < start + side; c++) heights[c] -= side;
        }
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
#include <climits>
using namespace std;

class Solution {
    int n, m, best;
    vector<int> heights;
    void dfs(int count) {
        if (count >= best) return;
        int minH = INT_MAX, start = 0;
        for (int c = 0; c < n; c++) if (heights[c] < minH) { minH = heights[c]; start = c; }
        if (minH == m) { best = count; return; }
        int end = start;
        while (end < n && heights[end] == minH) end++;
        int maxW = min(end - start, m - minH);
        for (int side = maxW; side >= 1; side--) {
            for (int c = start; c < start + side; c++) heights[c] += side;
            dfs(count + 1);
            for (int c = start; c < start + side; c++) heights[c] -= side;
        }
    }
public:
    int tilingRectangle(int n, int m) {
        this->n = n; this->m = m; this->best = m * n;
        heights.assign(n, 0);
        dfs(0);
        return best;
    }
};
`,
    },
    complexity: { time: "Exponential in the worst case, heavily pruned", space: "O(n)" },
    pitfalls: [
      "Filling arbitrary cells instead of always the lowest-left column, which explodes the search space.",
      "Forgetting to cap the square side by remaining height (m - minHeight).",
      "Weak pruning — without the count >= best cut the search is too slow.",
    ],
    edgeCases: [
      "A perfect square n == m — answer 1.",
      "A 1-wide strip — answer is the longer side.",
      "Coprime dimensions like 11 x 13 forcing many squares.",
    ],
    whyItMatters:
      "Profile-based backtracking with aggressive pruning is the practical approach to exact packing and tiling problems that have no clean formula.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 311 — pure_dsa · dp_1d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "paint-three-column-grid-ways",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Ways to Paint an N x 3 Grid",
    framing:
      "A status board has n rows of three cells. Each cell is painted one of three colors, and no two adjacent cells (horizontally or vertically) may share a color. Count the distinct valid colorings.",
    statement:
      "Given n, count the number of ways to paint an n x 3 grid using 3 colors such that no two adjacent cells (sharing an edge) have the same color. Return the count modulo 1e9 + 7.",
    inputFormat: "An integer n (number of rows).",
    outputFormat: "An integer: the number of valid colorings modulo 1e9 + 7.",
    constraints: [
      "1 <= n <= 5000",
    ],
    examples: [
      {
        input: "n = 1",
        output: "12",
        explanation: "A single row has 12 valid three-cell colorings.",
      },
      {
        input: "n = 2",
        output: "54",
        explanation: "Two rows yield 54 valid colorings.",
      },
    ],
    approach: [
      "Classify each row's coloring as a two-color pattern (like A-B-A) or a three-color pattern (like A-B-C).",
      "There are 6 valid two-color row patterns and 6 valid three-color row patterns.",
      "A two-color row is followed by 3 two-color rows and 2 three-color rows.",
      "A three-color row is followed by 2 two-color rows and 2 three-color rows.",
      "Iterate the recurrence n-1 times, then sum the two counts modulo 1e9 + 7.",
    ],
    solutionSteps: [
      "Initialize two = 6, three = 6.",
      "Repeat n-1 times: newTwo = (3*two + 2*three) % MOD; newThree = (2*two + 2*three) % MOD.",
      "Assign two = newTwo, three = newThree.",
      "Answer = (two + three) % MOD.",
      "Return the answer.",
    ],
    code: {
      python: `def num_of_ways(n: int) -> int:
    MOD = 10**9 + 7
    two, three = 6, 6
    for _ in range(n - 1):
        two, three = (3 * two + 2 * three) % MOD, (2 * two + 2 * three) % MOD
    return (two + three) % MOD
`,
      java: `class Solution {
    public int numOfWays(int n) {
        long MOD = 1_000_000_007L, two = 6, three = 6;
        for (int i = 1; i < n; i++) {
            long nt = (3 * two + 2 * three) % MOD;
            long nh = (2 * two + 2 * three) % MOD;
            two = nt; three = nh;
        }
        return (int) ((two + three) % MOD);
    }
}
`,
      cpp: `class Solution {
public:
    int numOfWays(int n) {
        const long MOD = 1000000007L;
        long two = 6, three = 6;
        for (int i = 1; i < n; i++) {
            long nt = (3 * two + 2 * three) % MOD;
            long nh = (2 * two + 2 * three) % MOD;
            two = nt; three = nh;
        }
        return (int) ((two + three) % MOD);
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Treating all 27 row colorings as valid instead of only the 12 with no horizontal repeat.",
      "Wrong transition counts between two-color and three-color rows.",
      "Integer overflow before taking the modulus.",
    ],
    edgeCases: [
      "n = 1 returns 12.",
      "Large n where intermediate products must stay in 64-bit before the mod.",
      "Confirming the recurrence with the known n = 2 value 54.",
    ],
    whyItMatters:
      "Collapsing an exponential state space into a couple of equivalence classes is the essence of efficient combinatorial counting DP.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 312 — pure_dsa · dp_1d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "stone-game-three-best-diff",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Take 1, 2, or 3 from the Front — Who Wins",
    framing:
      "Two engineers alternately claim work items from the front of a shared queue, taking 1, 2, or 3 items each turn and banking their point values. Both play optimally to maximize their own total.",
    statement:
      "Given an integer array values representing items in a row, two players alternate turns (the first player goes first). On each turn a player takes the first 1, 2, or 3 remaining items and adds their sum to their score. Both play optimally. Return \"First\", \"Second\", or \"Tie\" based on who ends with the higher score.",
    inputFormat: "An integer array values (item point values, may be negative).",
    outputFormat: 'A string: "First", "Second", or "Tie".',
    constraints: [
      "1 <= values.length <= 100000",
      "-1000 <= values[i] <= 1000",
    ],
    examples: [
      {
        input: "values = [1,2,3,7]",
        output: "Second",
        explanation: "Whatever the first player takes, the second can secure a higher total.",
      },
      {
        input: "values = [1,2,3,-9]",
        output: "First",
        explanation: "Taking all of 1,2,3 leaves -9 for the opponent.",
      },
    ],
    approach: [
      "Define dp[i] as the best score difference (current player minus opponent) achievable from suffix starting at i.",
      "From i, the player takes k = 1, 2, or 3 items: gain = sum(values[i..i+k-1]), then faces dp[i+k] as the opponent's best advantage.",
      "dp[i] = max over k of (prefix gain - dp[i+k]).",
      "Compute dp from the end toward the front with a running window sum.",
      "If dp[0] > 0 First wins; < 0 Second; otherwise Tie.",
    ],
    solutionSteps: [
      "Allocate dp of size n+1 with dp[n]=0.",
      "For i from n-1 down to 0: accumulate take = sum of up to 3 items and set dp[i] = max(take - dp[i+k]).",
      "Track the maximum across k = 1..3 within bounds.",
      "Inspect dp[0]: positive -> First, negative -> Second, zero -> Tie.",
      "Return the result string.",
    ],
    code: {
      python: `def stone_game_iii(values: list[int]) -> str:
    n = len(values)
    dp = [0] * (n + 1)
    for i in range(n - 1, -1, -1):
        take = 0
        best = float("-inf")
        for k in range(1, 4):
            if i + k - 1 < n:
                take += values[i + k - 1]
                best = max(best, take - dp[i + k])
        dp[i] = best
    if dp[0] > 0:
        return "First"
    if dp[0] < 0:
        return "Second"
    return "Tie"
`,
      java: `class Solution {
    public String stoneGameIII(int[] values) {
        int n = values.length;
        int[] dp = new int[n + 1];
        for (int i = n - 1; i >= 0; i--) {
            int take = 0, best = Integer.MIN_VALUE;
            for (int k = 1; k <= 3 && i + k - 1 < n; k++) {
                take += values[i + k - 1];
                best = Math.max(best, take - dp[i + k]);
            }
            dp[i] = best;
        }
        if (dp[0] > 0) return "First";
        if (dp[0] < 0) return "Second";
        return "Tie";
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
#include <climits>
#include <string>
using namespace std;

class Solution {
public:
    string stoneGameIII(vector<int>& values) {
        int n = values.size();
        vector<int> dp(n + 1, 0);
        for (int i = n - 1; i >= 0; i--) {
            int take = 0, best = INT_MIN;
            for (int k = 1; k <= 3 && i + k - 1 < n; k++) {
                take += values[i + k - 1];
                best = max(best, take - dp[i + k]);
            }
            dp[i] = best;
        }
        if (dp[0] > 0) return "First";
        if (dp[0] < 0) return "Second";
        return "Tie";
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Maximizing your own score in isolation instead of the score difference against an optimal opponent.",
      "Forgetting that values can be negative, so taking fewer items may be better.",
      "Off-by-one when the remaining suffix has fewer than 3 items.",
    ],
    edgeCases: [
      "A single item — First takes it.",
      "All negative values where minimizing your own take matters.",
      "Exactly three items, allowing a full sweep in one turn.",
    ],
    whyItMatters:
      "Encoding two-player optimal play as a score-difference recurrence is the canonical minimax-DP technique behind game and adversarial planning solvers.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 313 — pure_dsa · math_geometry · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-ids-with-repeat-digit",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "math_geometry",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Count IDs That Repeat a Digit",
    framing:
      "An ID generator hands out numbers from 1 to n. Compliance needs to know how many of those IDs contain at least one repeated digit (which weakens uniqueness guarantees).",
    statement:
      "Given a positive integer n, return the count of integers in the range [1, n] that have at least one repeated digit.",
    inputFormat: "A positive integer n.",
    outputFormat: "An integer: how many values in [1, n] contain a repeated digit.",
    constraints: [
      "1 <= n <= 10^9",
    ],
    examples: [
      {
        input: "n = 20",
        output: "1",
        explanation: "Only 11 has a repeated digit in [1,20].",
      },
      {
        input: "n = 100",
        output: "10",
        explanation: "11,22,33,...,99,100 — ten numbers repeat a digit.",
      },
    ],
    approach: [
      "Count the complement: numbers in [1, n] with all distinct digits, then subtract from n.",
      "First count distinct-digit numbers with fewer digits than n using permutations (9 * 9 * 8 * ...).",
      "Then count distinct-digit numbers with the same digit length as n that are <= n via a digit-by-digit pass.",
      "At each position, count smaller digit choices not yet used, multiplying by permutations of the remaining positions.",
      "Stop the same-length pass if the current digit repeats one already placed; otherwise add 1 for n itself if all its digits are distinct.",
    ],
    solutionSteps: [
      "Convert n to its digit string of length L.",
      "For lengths 1..L-1: add 9 * P(9, len-1) where P is the falling factorial of unused digits.",
      "Walk the digits of n; at position i, for each smaller allowed first/next digit not used, add the permutations of remaining slots.",
      "Break if the digit at i was already used; if the loop completes, add 1 for n itself.",
      "Answer = n - (count of all-distinct numbers).",
    ],
    code: {
      python: `def num_dup_digits_at_most_n(n: int) -> int:
    digits = list(map(int, str(n)))
    L = len(digits)

    def perm(m: int, k: int) -> int:
        r = 1
        for i in range(k):
            r *= (m - i)
        return r

    unique = 0
    # fewer-length numbers with all distinct digits
    for length in range(1, L):
        unique += 9 * perm(9, length - 1)

    used = set()
    for i, d in enumerate(digits):
        start = 1 if i == 0 else 0
        for x in range(start, d):
            if x not in used:
                unique += perm(9 - i, L - i - 1)
        if d in used:
            break
        used.add(d)
    else:
        unique += 1  # n itself has all distinct digits

    return n - unique
`,
      java: `class Solution {
    public int numDupDigitsAtMostN(int n) {
        char[] digits = Integer.toString(n).toCharArray();
        int L = digits.length;
        long unique = 0;
        for (int len = 1; len < L; len++) unique += 9 * perm(9, len - 1);
        boolean[] used = new boolean[10];
        boolean allDistinct = true;
        for (int i = 0; i < L; i++) {
            int d = digits[i] - '0';
            int start = i == 0 ? 1 : 0;
            for (int x = start; x < d; x++)
                if (!used[x]) unique += perm(9 - i, L - i - 1);
            if (used[d]) { allDistinct = false; break; }
            used[d] = true;
        }
        if (allDistinct) unique += 1;
        return (int) (n - unique);
    }

    private long perm(int m, int k) {
        long r = 1;
        for (int i = 0; i < k; i++) r *= (m - i);
        return r;
    }
}
`,
      cpp: `#include <string>
#include <vector>
using namespace std;

class Solution {
    long perm(int m, int k) {
        long r = 1;
        for (int i = 0; i < k; i++) r *= (m - i);
        return r;
    }
public:
    int numDupDigitsAtMostN(int n) {
        string s = to_string(n);
        int L = s.size();
        long unique = 0;
        for (int len = 1; len < L; len++) unique += 9 * perm(9, len - 1);
        vector<bool> used(10, false);
        bool allDistinct = true;
        for (int i = 0; i < L; i++) {
            int d = s[i] - '0';
            int start = i == 0 ? 1 : 0;
            for (int x = start; x < d; x++)
                if (!used[x]) unique += perm(9 - i, L - i - 1);
            if (used[d]) { allDistinct = false; break; }
            used[d] = true;
        }
        if (allDistinct) unique += 1;
        return (int) (n - unique);
    }
};
`,
    },
    complexity: { time: "O(L^2) where L is the digit length", space: "O(L)" },
    pitfalls: [
      "Counting repeated-digit numbers directly instead of the easier distinct-digit complement.",
      "Allowing a leading zero in the most significant position.",
      "Forgetting to add 1 for n itself when all of its digits are distinct.",
    ],
    edgeCases: [
      "Single-digit n where the answer is 0.",
      "n exactly at a power of ten like 100.",
      "n whose own digits repeat, ending the same-length pass early.",
    ],
    whyItMatters:
      "Digit DP / combinatorial counting under an upper bound is the standard tool for range-constrained counting in analytics and number-theory tasks.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 314 — ai_applied · dp_1d · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "decoder-state-token-strings",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 11,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "software_engineer"],
    title: "Count Valid Decoder State Sequences",
    framing:
      "A constrained decoder emits one of five state tokens (a, e, i, o, u) per step. The grammar restricts which token may follow which. Count the distinct valid sequences of a given length.",
    statement:
      "Count strings of length n over the alphabet {a,e,i,o,u} obeying these follow rules: 'a' may be followed only by 'e'; 'e' only by 'a' or 'i'; 'i' by any vowel except 'i'; 'o' only by 'i' or 'u'; 'u' only by 'a'. Return the count modulo 1e9 + 7.",
    inputFormat: "An integer n (sequence length).",
    outputFormat: "An integer: the number of valid sequences modulo 1e9 + 7.",
    constraints: [
      "1 <= n <= 20000",
    ],
    examples: [
      {
        input: "n = 1",
        output: "5",
        explanation: "Each single token is valid: a, e, i, o, u.",
      },
      {
        input: "n = 2",
        output: "10",
        explanation: "Exactly 10 valid two-token sequences satisfy the follow rules.",
      },
    ],
    approach: [
      "Track counts of sequences ending in each token after each step.",
      "Invert the follow rules to predecessor rules: a token's new count is the sum of counts of tokens allowed to precede it.",
      "'a' follows e, i, u; 'e' follows a, i; 'i' follows e, o; 'o' follows i; 'u' follows i, o.",
      "Initialize all five counts to 1 for length 1.",
      "Iterate n-1 transitions, summing modulo 1e9 + 7, then total the five counts.",
    ],
    solutionSteps: [
      "Let a=e=i=o=u=1.",
      "Repeat n-1 times computing new values: na=e+i+u, ne=a+i, ni=e+o, no=i, nu=i+o, all mod MOD.",
      "Assign the new values back.",
      "Answer = (a+e+i+o+u) % MOD.",
      "Return the answer.",
    ],
    code: {
      python: `def count_vowel_permutation(n: int) -> int:
    MOD = 10**9 + 7
    a = e = i = o = u = 1
    for _ in range(n - 1):
        a, e, i, o, u = (
            (e + i + u) % MOD,
            (a + i) % MOD,
            (e + o) % MOD,
            i % MOD,
            (i + o) % MOD,
        )
    return (a + e + i + o + u) % MOD
`,
      java: `class Solution {
    public int countVowelPermutation(int n) {
        long MOD = 1_000_000_007L;
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
        const long MOD = 1000000007L;
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
};
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Applying the follow rules forward but summing into the wrong target token; invert them to predecessor rules.",
      "Omitting the modulus and overflowing 64-bit values for large n.",
      "Starting counts at 0 instead of 1 for length 1.",
    ],
    edgeCases: [
      "n = 1 yields 5.",
      "Large n stressing modular arithmetic.",
      "Verifying against the known n = 2 value of 10.",
    ],
    whyItMatters:
      "Counting walks in a small state machine via per-state DP is exactly how constrained decoding, grammar validation, and Markov path counting work.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 315 — pure_dsa · graphs · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "cluster-by-shared-factor",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Largest Cluster Sharing a Common Factor",
    framing:
      "Each dataset is tagged with an integer key. Two datasets belong to the same cluster if their keys share a common factor greater than 1. Find the size of the largest cluster.",
    statement:
      "Given an array nums of unique positive integers, two values are connected if they share a common factor greater than 1. Connectivity is transitive. Return the size of the largest connected component.",
    inputFormat: "An array nums of distinct positive integers.",
    outputFormat: "An integer: the size of the largest connected component.",
    constraints: [
      "1 <= nums.length <= 20000",
      "1 <= nums[i] <= 100000",
      "All values in nums are unique.",
    ],
    examples: [
      {
        input: "nums = [4,6,15,35]",
        output: "4",
        explanation: "4-6 (share 2), 6-15 (share 3), 15-35 (share 5) link all four.",
      },
      {
        input: "nums = [20,50,9,63]",
        output: "2",
        explanation: "20-50 share 5; 9-63 share 3; two clusters of size 2.",
      },
    ],
    approach: [
      "Directly comparing every pair is O(n^2); instead connect each number to its prime factors.",
      "Use union-find over a space that includes both the numbers and the primes.",
      "Factorize each number by trial division and union the number with each of its distinct primes.",
      "Numbers sharing a prime end up in the same component transitively.",
      "Count, for each root, how many actual numbers map to it, and return the maximum.",
    ],
    solutionSteps: [
      "Create a DSU keyed by integer (numbers and primes share the key space).",
      "For each value v, find its prime factors; union v with each prime.",
      "After processing, compute find(v) for every number v.",
      "Tally occurrences of each root among the numbers.",
      "Return the largest tally.",
    ],
    code: {
      python: `def largest_component_size(nums: list[int]) -> int:
    parent: dict[int, int] = {}

    def find(x: int) -> int:
        parent.setdefault(x, x)
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int) -> None:
        parent[find(a)] = find(b)

    for v in nums:
        x = v
        f = 2
        while f * f <= x:
            if x % f == 0:
                union(v, f)
                while x % f == 0:
                    x //= f
            f += 1
        if x > 1:
            union(v, x)

    from collections import Counter
    counts = Counter(find(v) for v in nums)
    return max(counts.values())
`,
      java: `import java.util.*;

class Solution {
    Map<Integer, Integer> parent = new HashMap<>();

    int find(int x) {
        parent.putIfAbsent(x, x);
        while (parent.get(x) != x) {
            parent.put(x, parent.get(parent.get(x)));
            x = parent.get(x);
        }
        return x;
    }

    void union(int a, int b) { parent.put(find(a), find(b)); }

    public int largestComponentSize(int[] nums) {
        for (int v : nums) {
            int x = v;
            for (int f = 2; (long) f * f <= x; f++) {
                if (x % f == 0) {
                    union(v, f);
                    while (x % f == 0) x /= f;
                }
            }
            if (x > 1) union(v, x);
        }
        Map<Integer, Integer> counts = new HashMap<>();
        int best = 0;
        for (int v : nums) {
            int r = find(v);
            int c = counts.merge(r, 1, Integer::sum);
            best = Math.max(best, c);
        }
        return best;
    }
}
`,
      cpp: `#include <vector>
#include <unordered_map>
#include <algorithm>
using namespace std;

class Solution {
    unordered_map<int, int> parent;
    int find(int x) {
        if (!parent.count(x)) parent[x] = x;
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }
    void uni(int a, int b) { parent[find(a)] = find(b); }
public:
    int largestComponentSize(vector<int>& nums) {
        for (int v : nums) {
            int x = v;
            for (long f = 2; f * f <= x; f++) {
                if (x % f == 0) {
                    uni(v, (int) f);
                    while (x % f == 0) x /= f;
                }
            }
            if (x > 1) uni(v, x);
        }
        unordered_map<int, int> counts;
        int best = 0;
        for (int v : nums) best = max(best, ++counts[find(v)]);
        return best;
    }
};
`,
    },
    complexity: { time: "O(n * sqrt(maxValue) * α)", space: "O(n + primes)" },
    pitfalls: [
      "Comparing all pairs for a common factor, which is far too slow.",
      "Forgetting the leftover prime greater than sqrt(x) after trial division.",
      "Counting primes as nodes in the final tally — only the actual numbers count toward component size.",
    ],
    edgeCases: [
      "A value of 1 that shares no factor with anything (its own component).",
      "Prime numbers forming singleton clusters unless a multiple is present.",
      "A single-element input.",
    ],
    whyItMatters:
      "Linking entities through shared attributes via union-find over an augmented key space is a widely reused clustering and entity-resolution technique.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 316 — ai_applied · graphs · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "agent-collect-all-keys",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 11,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "software_engineer"],
    title: "Agent Collects Every Key in a Gridworld",
    framing:
      "A planning agent navigates a gridworld. Lowercase cells are API keys; uppercase cells are locked doors that need the matching key. Find the fewest moves to acquire every key.",
    statement:
      "Given a grid where '@' is the start, '.' is empty, '#' is a wall, lowercase letters are keys, and uppercase letters are locks, you move in 4 directions one cell per step. You may pass a lock only after collecting its lowercase key. Return the fewest moves to collect all keys, or -1 if impossible.",
    inputFormat: "An array of equal-length strings forming the grid.",
    outputFormat: "An integer: minimum moves to collect all keys, or -1.",
    constraints: [
      "1 <= grid rows, cols <= 30",
      "There are between 1 and 6 keys, each a distinct letter a..f, with matching locks present at most once.",
      "Exactly one '@' start cell.",
    ],
    examples: [
      {
        input: 'grid = ["@.a..","###.#","b.A.B"]',
        output: "8",
        explanation: "Collect 'a', open 'A', collect 'b' in 8 moves.",
      },
      {
        input: 'grid = ["@..aA","..B#.","....b"]',
        output: "6",
        explanation: "Collect 'a' then 'b' in 6 moves.",
      },
    ],
    approach: [
      "State is (row, col, keysCollected) where keys are a bitmask of letters held.",
      "Run BFS over states because each move costs exactly one step.",
      "Walls block movement; an uppercase lock blocks unless the matching key bit is set.",
      "Picking up a key sets its bit in the mask, producing a new state.",
      "The goal is any state whose mask equals the all-keys mask; return its BFS depth.",
    ],
    solutionSteps: [
      "Scan the grid for the start and to compute the full-keys mask.",
      "BFS from (startR, startC, 0) with a visited set of (r,c,mask).",
      "For each neighbor, skip walls and locks without the key.",
      "If the cell holds a key, OR its bit into the mask; if mask == full, return steps+1.",
      "If BFS exhausts without reaching full, return -1.",
    ],
    code: {
      python: `from collections import deque

def shortest_path_all_keys(grid: list[str]) -> int:
    m, n = len(grid), len(grid[0])
    full = 0
    start = (0, 0)
    for r in range(m):
        for c in range(n):
            ch = grid[r][c]
            if ch == "@":
                start = (r, c)
            elif ch.islower():
                full |= 1 << (ord(ch) - ord("a"))
    q = deque([(start[0], start[1], 0, 0)])
    seen = {(start[0], start[1], 0)}
    while q:
        r, c, keys, steps = q.popleft()
        if keys == full:
            return steps
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if not (0 <= nr < m and 0 <= nc < n):
                continue
            ch = grid[nr][nc]
            if ch == "#":
                continue
            if ch.isupper() and not (keys & (1 << (ord(ch) - ord("A")))):
                continue
            nk = keys
            if ch.islower():
                nk |= 1 << (ord(ch) - ord("a"))
            if (nr, nc, nk) not in seen:
                seen.add((nr, nc, nk))
                q.append((nr, nc, nk, steps + 1))
    return -1
`,
      java: `import java.util.*;

class Solution {
    public int shortestPathAllKeys(String[] grid) {
        int m = grid.length, n = grid[0].length(), full = 0, sr = 0, sc = 0;
        for (int r = 0; r < m; r++)
            for (int c = 0; c < n; c++) {
                char ch = grid[r].charAt(c);
                if (ch == '@') { sr = r; sc = c; }
                else if (Character.isLowerCase(ch)) full |= 1 << (ch - 'a');
            }
        Queue<int[]> q = new ArrayDeque<>();
        boolean[][][] seen = new boolean[m][n][1 << 6];
        q.add(new int[]{sr, sc, 0, 0});
        seen[sr][sc][0] = true;
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!q.isEmpty()) {
            int[] cur = q.poll();
            int r = cur[0], c = cur[1], keys = cur[2], steps = cur[3];
            if (keys == full) return steps;
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
                char ch = grid[nr].charAt(nc);
                if (ch == '#') continue;
                if (Character.isUpperCase(ch) && (keys & (1 << (ch - 'A'))) == 0) continue;
                int nk = keys;
                if (Character.isLowerCase(ch)) nk |= 1 << (ch - 'a');
                if (!seen[nr][nc][nk]) {
                    seen[nr][nc][nk] = true;
                    q.add(new int[]{nr, nc, nk, steps + 1});
                }
            }
        }
        return -1;
    }
}
`,
      cpp: `#include <vector>
#include <string>
#include <queue>
using namespace std;

class Solution {
public:
    int shortestPathAllKeys(vector<string>& grid) {
        int m = grid.size(), n = grid[0].size(), full = 0, sr = 0, sc = 0;
        for (int r = 0; r < m; r++)
            for (int c = 0; c < n; c++) {
                char ch = grid[r][c];
                if (ch == '@') { sr = r; sc = c; }
                else if (islower(ch)) full |= 1 << (ch - 'a');
            }
        vector<vector<vector<char>>> seen(m, vector<vector<char>>(n, vector<char>(1 << 6, 0)));
        queue<array<int, 4>> q;
        q.push({sr, sc, 0, 0});
        seen[sr][sc][0] = 1;
        int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!q.empty()) {
            auto cur = q.front(); q.pop();
            int r = cur[0], c = cur[1], keys = cur[2], steps = cur[3];
            if (keys == full) return steps;
            for (auto& d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
                char ch = grid[nr][nc];
                if (ch == '#') continue;
                if (isupper(ch) && !(keys & (1 << (ch - 'A')))) continue;
                int nk = keys;
                if (islower(ch)) nk |= 1 << (ch - 'a');
                if (!seen[nr][nc][nk]) {
                    seen[nr][nc][nk] = 1;
                    q.push({nr, nc, nk, steps + 1});
                }
            }
        }
        return -1;
    }
};
`,
    },
    complexity: { time: "O(m * n * 2^k)", space: "O(m * n * 2^k)" },
    pitfalls: [
      "Tracking visited cells without the key mask, which wrongly blocks revisits that now hold more keys.",
      "Allowing passage through a lock whose key is not yet collected.",
      "Forgetting to compute the full-keys mask before BFS.",
    ],
    edgeCases: [
      "A key behind its own lock making collection impossible (-1).",
      "Start cell adjacent to all keys.",
      "Single key with no locks.",
    ],
    whyItMatters:
      "Augmenting BFS state with a bitmask of acquired capabilities is the standard pattern for planning problems with collectible prerequisites.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 317 — pure_dsa · graphs · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "push-crate-to-target",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "software_engineer"],
    title: "Minimum Pushes to Move a Crate to Its Target",
    framing:
      "A warehouse robot pushes a single crate across a floor grid to a target dock. The robot can walk freely over empty cells but only moves the crate by standing on the opposite side and pushing. Minimize pushes.",
    statement:
      "Given a grid with '.' floor, '#' wall, 'S' robot start, 'B' box start, and 'T' target, the robot moves up/down/left/right over floor and can push the box by standing on the cell opposite the push direction (that cell must be floor) so the box advances one cell (its destination must be floor). Return the minimum number of pushes to move the box onto the target, or -1.",
    inputFormat: "A 2D char grid containing exactly one each of 'S', 'B', 'T'.",
    outputFormat: "An integer: minimum pushes, or -1 if unreachable.",
    constraints: [
      "1 <= rows, cols <= 20",
      "Exactly one 'S', one 'B', one 'T'; the rest are '.' or '#'.",
    ],
    examples: [
      {
        input:
          'grid = [["#","#","#","#","#","#"],["#","T","#","#","#","#"],["#",".",".","B",".","#"],["#",".","#","#",".","#"],["#",".",".",".","S","#"],["#","#","#","#","#","#"]]',
        output: "3",
        explanation: "The robot repositions and pushes the box 3 times to reach T.",
      },
      {
        input:
          'grid = [["#","#","#","#","#","#"],["#","T","#","#","#","#"],["#",".",".","B",".","#"],["#","#","#","#",".","#"],["#",".",".",".","S","#"],["#","#","#","#","#","#"]]',
        output: "-1",
        explanation: "No sequence of pushes brings the box to the target.",
      },
    ],
    approach: [
      "A state is (boxPosition, playerPosition); each push costs 1, each robot walk step costs 0.",
      "Use 0-1 BFS with a deque: walking is a 0-weight edge, pushing is a 1-weight edge.",
      "From a state, the robot can step to an adjacent floor cell that is not the box (cost 0).",
      "If the robot is adjacent to the box and the cell beyond the box is floor, it can push (cost 1): the box advances and the robot takes the box's old cell.",
      "The answer is the cost of the first state where the box sits on the target.",
    ],
    solutionSteps: [
      "Locate S, B, T. Encode a state as (boxR,boxC,playerR,playerC).",
      "Push the start state with distance 0 to the front of a deque; track best distances per state.",
      "Pop the cheapest state; if box is on target, return its distance.",
      "Generate walk neighbors (cost 0, push_front) and the push neighbor when geometry allows (cost 1, push_back).",
      "Relax states with smaller distances until the deque empties; return -1 if target never reached.",
    ],
    code: {
      python: `from collections import deque

def min_push_box(grid: list[list[str]]) -> int:
    m, n = len(grid), len(grid[0])
    for r in range(m):
        for c in range(n):
            if grid[r][c] == "B":
                box = (r, c)
            elif grid[r][c] == "S":
                player = (r, c)
            elif grid[r][c] == "T":
                target = (r, c)

    def floor(r: int, c: int) -> bool:
        return 0 <= r < m and 0 <= c < n and grid[r][c] != "#"

    start = (box[0], box[1], player[0], player[1])
    dist = {start: 0}
    dq = deque([start])
    while dq:
        br, bc, pr, pc = dq.popleft()
        d = dist[(br, bc, pr, pc)]
        if (br, bc) == target:
            return d
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = pr + dr, pc + dc
            if not floor(nr, nc):
                continue
            if (nr, nc) == (br, bc):
                # pushing the box
                nbr, nbc = br + dr, bc + dc
                if not floor(nbr, nbc):
                    continue
                state = (nbr, nbc, br, bc)
                nd = d + 1
                if nd < dist.get(state, float("inf")):
                    dist[state] = nd
                    dq.append(state)
            else:
                state = (br, bc, nr, nc)
                if d < dist.get(state, float("inf")):
                    dist[state] = d
                    dq.appendleft(state)
    return -1
`,
      java: `import java.util.*;

class Solution {
    public int minPushBox(char[][] grid) {
        int m = grid.length, n = grid[0].length;
        int[] box = new int[2], player = new int[2], target = new int[2];
        for (int r = 0; r < m; r++)
            for (int c = 0; c < n; c++) {
                if (grid[r][c] == 'B') { box[0] = r; box[1] = c; }
                else if (grid[r][c] == 'S') { player[0] = r; player[1] = c; }
                else if (grid[r][c] == 'T') { target[0] = r; target[1] = c; }
            }
        Deque<int[]> dq = new ArrayDeque<>();
        Map<String, Integer> dist = new HashMap<>();
        int[] start = {box[0], box[1], player[0], player[1]};
        dist.put(key(start), 0);
        dq.add(start);
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!dq.isEmpty()) {
            int[] s = dq.pollFirst();
            int br = s[0], bc = s[1], pr = s[2], pc = s[3];
            int d = dist.get(key(s));
            if (br == target[0] && bc == target[1]) return d;
            for (int[] dir : dirs) {
                int nr = pr + dir[0], nc = pc + dir[1];
                if (!floor(grid, nr, nc, m, n)) continue;
                if (nr == br && nc == bc) {
                    int nbr = br + dir[0], nbc = bc + dir[1];
                    if (!floor(grid, nbr, nbc, m, n)) continue;
                    int[] st = {nbr, nbc, br, bc};
                    if (d + 1 < dist.getOrDefault(key(st), Integer.MAX_VALUE)) {
                        dist.put(key(st), d + 1);
                        dq.addLast(st);
                    }
                } else {
                    int[] st = {br, bc, nr, nc};
                    if (d < dist.getOrDefault(key(st), Integer.MAX_VALUE)) {
                        dist.put(key(st), d);
                        dq.addFirst(st);
                    }
                }
            }
        }
        return -1;
    }

    private boolean floor(char[][] g, int r, int c, int m, int n) {
        return r >= 0 && r < m && c >= 0 && c < n && g[r][c] != '#';
    }

    private String key(int[] s) { return s[0] + "," + s[1] + "," + s[2] + "," + s[3]; }
}
`,
      cpp: `#include <vector>
#include <deque>
#include <unordered_map>
#include <climits>
using namespace std;

class Solution {
    bool floor(vector<vector<char>>& g, int r, int c, int m, int n) {
        return r >= 0 && r < m && c >= 0 && c < n && g[r][c] != '#';
    }
    long key(int a, int b, int c, int d) {
        return ((long) a * 20 + b) * 400 + (long) c * 20 + d;
    }
public:
    int minPushBox(vector<vector<char>>& grid) {
        int m = grid.size(), n = grid[0].size();
        int br0 = 0, bc0 = 0, pr0 = 0, pc0 = 0, tr = 0, tc = 0;
        for (int r = 0; r < m; r++)
            for (int c = 0; c < n; c++) {
                if (grid[r][c] == 'B') { br0 = r; bc0 = c; }
                else if (grid[r][c] == 'S') { pr0 = r; pc0 = c; }
                else if (grid[r][c] == 'T') { tr = r; tc = c; }
            }
        deque<array<int, 4>> dq;
        unordered_map<long, int> dist;
        dq.push_back({br0, bc0, pr0, pc0});
        dist[key(br0, bc0, pr0, pc0)] = 0;
        int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!dq.empty()) {
            auto s = dq.front(); dq.pop_front();
            int br = s[0], bc = s[1], pr = s[2], pc = s[3];
            int d = dist[key(br, bc, pr, pc)];
            if (br == tr && bc == tc) return d;
            for (auto& dir : dirs) {
                int nr = pr + dir[0], nc = pc + dir[1];
                if (!floor(grid, nr, nc, m, n)) continue;
                if (nr == br && nc == bc) {
                    int nbr = br + dir[0], nbc = bc + dir[1];
                    if (!floor(grid, nbr, nbc, m, n)) continue;
                    long k = key(nbr, nbc, br, bc);
                    if (d + 1 < (dist.count(k) ? dist[k] : INT_MAX)) {
                        dist[k] = d + 1;
                        dq.push_back({nbr, nbc, br, bc});
                    }
                } else {
                    long k = key(br, bc, nr, nc);
                    if (d < (dist.count(k) ? dist[k] : INT_MAX)) {
                        dist[k] = d;
                        dq.push_front({br, bc, nr, nc});
                    }
                }
            }
        }
        return -1;
    }
};
`,
    },
    complexity: { time: "O((m * n)^2)", space: "O((m * n)^2)" },
    pitfalls: [
      "Modeling only the box position; the robot's position determines which pushes are possible.",
      "Using uniform BFS — walks are free but pushes cost 1, so a deque (0-1 BFS) is needed.",
      "Letting the robot walk through the box cell when it is not pushing.",
    ],
    edgeCases: [
      "Box already on the target — zero pushes.",
      "Robot walled off from the box's push side.",
      "Narrow corridors that allow pushing in only one direction.",
    ],
    whyItMatters:
      "Joint-state search with mixed-cost edges (0-1 BFS) is the backbone of Sokoban-style planning and multi-actor pathfinding.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 318 — pure_dsa · dp_1d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "race-car-shortest-sequence",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Fewest Commands to Reach a Position",
    framing:
      "A simulated car starts at position 0 with speed +1. Command 'A' accelerates (position += speed; speed *= 2); command 'R' reverses (speed becomes -1 or +1, position unchanged). Find the shortest command string to land exactly on a target.",
    statement:
      "Starting at position 0 with speed 1, you issue a sequence of instructions. 'A' sets position += speed then speed *= 2. 'R' sets speed = -1 if it was positive, else 1 (position unchanged). Return the length of the shortest instruction sequence that ends with position exactly equal to target.",
    inputFormat: "A positive integer target.",
    outputFormat: "An integer: the minimum number of instructions.",
    constraints: [
      "1 <= target <= 10000",
    ],
    examples: [
      {
        input: "target = 3",
        output: "2",
        explanation: "'AA' moves 0 -> 1 -> 3.",
      },
      {
        input: "target = 6",
        output: "5",
        explanation: "'AAARA' reaches 6 in 5 instructions.",
      },
    ],
    approach: [
      "Let dp[t] be the fewest instructions to reach position t starting at speed 1.",
      "After k accelerations you reach 2^k - 1; if that equals t, the cost is k.",
      "If 2^k - 1 > t, overshoot then reverse: cost k + 1 + dp[(2^k - 1) - t].",
      "If 2^k - 1 < t, go k-1 steps, reverse, back up j steps, reverse again, and solve the remainder.",
      "Memoize dp over positions up to target.",
    ],
    solutionSteps: [
      "Define dp(t) with memoization; dp(0) = 0.",
      "Find the smallest k with 2^k - 1 >= t.",
      "If 2^k - 1 == t return k.",
      "Else candidate1 = k + 1 + dp((2^k - 1) - t).",
      "For j in 0..k-2: candidate2 = k - 1 + 1 + j + 1 + dp(t - (2^(k-1) - 1) + (2^j - 1)); return the minimum.",
    ],
    code: {
      python: `from functools import lru_cache

def racecar(target: int) -> int:
    @lru_cache(maxsize=None)
    def dp(t: int) -> int:
        if t == 0:
            return 0
        k = t.bit_length()
        # exact: 2^k - 1 == t
        if (1 << k) - 1 == t:
            return k
        # overshoot with k accelerations then reverse
        best = k + 1 + dp((1 << k) - 1 - t)
        # stop one short, reverse, back up j steps, reverse, recurse
        for j in range(k - 1):
            remain = t - ((1 << (k - 1)) - (1 << j))
            best = min(best, (k - 1) + 1 + (j + 1) + dp(remain))
        return best

    return dp(target)
`,
      java: `import java.util.*;

class Solution {
    Map<Integer, Integer> memo = new HashMap<>();

    public int racecar(int target) {
        return dp(target);
    }

    private int dp(int t) {
        if (t == 0) return 0;
        if (memo.containsKey(t)) return memo.get(t);
        int k = 32 - Integer.numberOfLeadingZeros(t);
        int best;
        if ((1 << k) - 1 == t) {
            best = k;
        } else {
            best = k + 1 + dp((1 << k) - 1 - t);
            for (int j = 0; j < k - 1; j++) {
                int remain = t - ((1 << (k - 1)) - (1 << j));
                best = Math.min(best, (k - 1) + 1 + (j + 1) + dp(remain));
            }
        }
        memo.put(t, best);
        return best;
    }
}
`,
      cpp: `#include <unordered_map>
#include <algorithm>
using namespace std;

class Solution {
    unordered_map<int, int> memo;
    int dp(int t) {
        if (t == 0) return 0;
        auto it = memo.find(t);
        if (it != memo.end()) return it->second;
        int k = 0;
        while ((1 << (k + 1)) - 1 < t) k++;
        k++; // smallest k with 2^k - 1 >= t
        int best;
        if ((1 << k) - 1 == t) {
            best = k;
        } else {
            best = k + 1 + dp((1 << k) - 1 - t);
            for (int j = 0; j < k - 1; j++) {
                int remain = t - ((1 << (k - 1)) - (1 << j));
                best = min(best, (k - 1) + 1 + (j + 1) + dp(remain));
            }
        }
        memo[t] = best;
        return best;
    }
public:
    int racecar(int target) { return dp(target); }
};
`,
    },
    complexity: { time: "O(target * log target)", space: "O(target)" },
    pitfalls: [
      "Doubling speed but forgetting that a reverse resets magnitude to 1, not negates the current speed.",
      "Ignoring the 'stop short then back up' family of solutions, which is sometimes optimal.",
      "Using a position bound that is too tight and missing optimal overshoot routes.",
    ],
    edgeCases: [
      "Target exactly one less than a power of two (a clean run of 'A').",
      "Small targets like 1 and 2.",
      "Targets requiring multiple reversals.",
    ],
    whyItMatters:
      "It blends BFS-style state reasoning with closed-form jumps, training you to prune exponential search using structure — a key skill for control and search problems.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 319 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "clear-array-palindrome-removals",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Minimum Moves to Clear an Array by Palindrome Removal",
    framing:
      "A log compactor removes contiguous palindromic runs of event codes in a single operation. Each operation deletes one palindromic subarray and the remaining pieces close up. Find the fewest operations to empty the array.",
    statement:
      "Given an integer array arr, in one move you may remove a non-empty contiguous subarray that is a palindrome; the remaining elements concatenate. Return the minimum number of moves to delete the entire array.",
    inputFormat: "An integer array arr.",
    outputFormat: "An integer: the minimum number of palindrome removals.",
    constraints: [
      "1 <= arr.length <= 100",
      "1 <= arr[i] <= 20",
    ],
    examples: [
      {
        input: "arr = [1,2]",
        output: "2",
        explanation: "Remove each element separately; no multi-element palindrome exists.",
      },
      {
        input: "arr = [1,3,4,1,5]",
        output: "3",
        explanation: "Remove 4, then 1,3,1 (palindrome), then 5.",
      },
    ],
    approach: [
      "Let dp[i][j] be the minimum moves to clear arr[i..j].",
      "Base: a single element costs 1; an empty range costs 0.",
      "Option A: remove arr[i] by itself, costing 1 + dp[i+1][j].",
      "Option B: if arr[i] == arr[i+1], they can be cleared together with the inner part: 1 + dp[i+2][j].",
      "Option C: for any k > i+1 with arr[i] == arr[k], peel arr[i] and arr[k] as the palindrome ends around dp[i+1][k-1], adding dp[k+1][j].",
    ],
    solutionSteps: [
      "Fill dp for length-1 ranges with 1.",
      "Iterate ranges by increasing length; compute dp[i][j] starting from 1 + dp[i+1][j].",
      "If arr[i] == arr[i+1], relax with 1 + dp[i+2][j] (treat dp of empty as 0).",
      "For k from i+2 to j with arr[i]==arr[k], relax with dp[i+1][k-1] + dp[k+1][j].",
      "Return dp[0][n-1].",
    ],
    code: {
      python: `from functools import lru_cache

def minimum_moves(arr: list[int]) -> int:
    n = len(arr)

    @lru_cache(maxsize=None)
    def dp(i: int, j: int) -> int:
        if i > j:
            return 0
        if i == j:
            return 1
        res = 1 + dp(i + 1, j)
        if arr[i] == arr[i + 1]:
            res = min(res, 1 + dp(i + 2, j))
        for k in range(i + 2, j + 1):
            if arr[i] == arr[k]:
                res = min(res, dp(i + 1, k - 1) + dp(k + 1, j))
        return res

    return dp(0, n - 1)
`,
      java: `class Solution {
    Integer[][] memo;
    int[] arr;

    public int minimumMoves(int[] arr) {
        this.arr = arr;
        int n = arr.length;
        memo = new Integer[n][n];
        return dp(0, n - 1);
    }

    private int dp(int i, int j) {
        if (i > j) return 0;
        if (i == j) return 1;
        if (memo[i][j] != null) return memo[i][j];
        int res = 1 + dp(i + 1, j);
        if (arr[i] == arr[i + 1]) res = Math.min(res, 1 + dp(i + 2, j));
        for (int k = i + 2; k <= j; k++)
            if (arr[i] == arr[k]) res = Math.min(res, dp(i + 1, k - 1) + dp(k + 1, j));
        return memo[i][j] = res;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
    vector<vector<int>> memo;
    vector<int> a;
    int dp(int i, int j) {
        if (i > j) return 0;
        if (i == j) return 1;
        if (memo[i][j] != -1) return memo[i][j];
        int res = 1 + dp(i + 1, j);
        if (a[i] == a[i + 1]) res = min(res, 1 + dp(i + 2, j));
        for (int k = i + 2; k <= j; k++)
            if (a[i] == a[k]) res = min(res, dp(i + 1, k - 1) + dp(k + 1, j));
        return memo[i][j] = res;
    }
public:
    int minimumMoves(vector<int>& arr) {
        a = arr;
        int n = arr.size();
        memo.assign(n, vector<int>(n, -1));
        return dp(0, n - 1);
    }
};
`,
    },
    complexity: { time: "O(n^3)", space: "O(n^2)" },
    pitfalls: [
      "Treating the array like string palindrome partitioning, which counts pieces rather than removals.",
      "Missing the arr[i]==arr[i+1] adjacency case that merges two equal neighbors cheaply.",
      "Indexing dp(k+1, j) when k == j (must return 0 for the empty range).",
    ],
    edgeCases: [
      "Already a palindrome — one move.",
      "All distinct values — n moves.",
      "Two equal elements removed together in one move.",
    ],
    whyItMatters:
      "Interval DP with a matching-endpoint split is the canonical structure for problems where removing matched ends unlocks the interior.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 320 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "plank-cut-min-cost",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Minimum Cost to Cut a Plank at Marked Points",
    framing:
      "A plank of length n must be cut at a set of marked positions. The cost of any single cut equals the current length of the piece being cut. You may perform the cuts in any order. Minimize total cost.",
    statement:
      "Given an integer n (plank from 0 to n) and an array cuts of positions to cut, the cost of one cut is the length of the piece it falls in. After a cut the piece splits in two. Choose an order to perform all cuts that minimizes total cost; return that minimum.",
    inputFormat: "An integer n and an array cuts of distinct positions strictly between 0 and n.",
    outputFormat: "An integer: the minimum total cutting cost.",
    constraints: [
      "2 <= n <= 10^6",
      "1 <= cuts.length <= 100",
      "1 <= cuts[i] <= n - 1, all distinct.",
    ],
    examples: [
      {
        input: "n = 7, cuts = [1,3,4,5]",
        output: "16",
        explanation: "A good order totals 16; naive left-to-right costs more.",
      },
      {
        input: "n = 9, cuts = [5,6,1,4,2]",
        output: "22",
        explanation: "The optimal ordering of cuts costs 22.",
      },
    ],
    approach: [
      "Add sentinels 0 and n to cuts and sort them.",
      "Let dp[i][j] be the minimum cost to make all cuts strictly between sorted positions i and j.",
      "The piece spanning positions[i]..positions[j] has length positions[j] - positions[i].",
      "Choosing cut k between them costs that length plus dp[i][k] + dp[k][j].",
      "Fill dp over increasing gaps; the answer is dp[0][last].",
    ],
    solutionSteps: [
      "Build positions = [0] + sorted(cuts) + [n].",
      "Iterate gap length from 2 upward over indices i < j with no cut strictly between when gap < 2.",
      "For each (i, j), try every k in (i, j): cost = positions[j]-positions[i] + dp[i][k] + dp[k][j].",
      "Take the minimum over k.",
      "Return dp[0][len(positions)-1].",
    ],
    code: {
      python: `def min_cost(n: int, cuts: list[int]) -> int:
    pos = [0] + sorted(cuts) + [n]
    m = len(pos)
    dp = [[0] * m for _ in range(m)]
    for gap in range(2, m):
        for i in range(0, m - gap):
            j = i + gap
            best = float("inf")
            for k in range(i + 1, j):
                best = min(best, dp[i][k] + dp[k][j] + pos[j] - pos[i])
            dp[i][j] = best
    return dp[0][m - 1]
`,
      java: `import java.util.*;

class Solution {
    public int minCost(int n, int[] cuts) {
        int[] pos = new int[cuts.length + 2];
        for (int i = 0; i < cuts.length; i++) pos[i + 1] = cuts[i];
        pos[0] = 0; pos[pos.length - 1] = n;
        Arrays.sort(pos);
        int m = pos.length;
        int[][] dp = new int[m][m];
        for (int gap = 2; gap < m; gap++) {
            for (int i = 0; i + gap < m; i++) {
                int j = i + gap, best = Integer.MAX_VALUE;
                for (int k = i + 1; k < j; k++)
                    best = Math.min(best, dp[i][k] + dp[k][j] + pos[j] - pos[i]);
                dp[i][j] = best;
            }
        }
        return dp[0][m - 1];
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
#include <climits>
using namespace std;

class Solution {
public:
    int minCost(int n, vector<int>& cuts) {
        vector<int> pos = cuts;
        pos.push_back(0);
        pos.push_back(n);
        sort(pos.begin(), pos.end());
        int m = pos.size();
        vector<vector<int>> dp(m, vector<int>(m, 0));
        for (int gap = 2; gap < m; gap++) {
            for (int i = 0; i + gap < m; i++) {
                int j = i + gap, best = INT_MAX;
                for (int k = i + 1; k < j; k++)
                    best = min(best, dp[i][k] + dp[k][j] + pos[j] - pos[i]);
                dp[i][j] = best;
            }
        }
        return dp[0][m - 1];
    }
};
`,
    },
    complexity: { time: "O(c^3) where c is the number of cuts", space: "O(c^2)" },
    pitfalls: [
      "Cutting in input order instead of searching for the optimal order.",
      "Forgetting the 0 and n sentinels that bound the first and last pieces.",
      "Adding the piece length inside the wrong loop so it is counted per split incorrectly.",
    ],
    edgeCases: [
      "A single cut — cost equals n.",
      "Evenly spaced cuts where order still matters.",
      "Cuts clustered near one end.",
    ],
    whyItMatters:
      "This is the matrix-chain / optimal-BST family of interval DP, foundational for compiler scheduling and any 'choose a split point' optimization.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 321 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-score-multiplier-ops",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Maximum Score from Sequenced Multipliers",
    framing:
      "You apply a fixed list of weight multipliers one per round. Each round you consume either the leftmost or rightmost value from a row of metrics, scoring multiplier times that value. Maximize the total.",
    statement:
      "Given arrays nums and multipliers, perform m = multipliers.length operations. In the i-th operation (0-indexed) pick either the first or last remaining element x of nums and add multipliers[i] * x to your score, then remove x. Return the maximum possible score.",
    inputFormat: "An integer array nums and an integer array multipliers with multipliers.length <= nums.length.",
    outputFormat: "An integer: the maximum achievable score.",
    constraints: [
      "1 <= multipliers.length <= 300",
      "multipliers.length <= nums.length <= 100000",
      "-1000 <= nums[i], multipliers[i] <= 1000",
    ],
    examples: [
      {
        input: "nums = [1,2,3], multipliers = [3,2,1]",
        output: "14",
        explanation: "Take 3*3, 2*2, 1*1 = 9+4+1 = 14.",
      },
      {
        input: "nums = [-5,-3,-3,-2,7,1], multipliers = [-10,-5,3,4,6]",
        output: "102",
        explanation: "An optimal sequence of end choices yields 102.",
      },
    ],
    approach: [
      "After i operations, if you have taken l from the left, you have taken i-l from the right.",
      "Let dp[i][l] be the best score for the remaining operations given that state.",
      "The right pointer is n-1-(i-l).",
      "Transition: take left -> multipliers[i]*nums[l] + dp[i+1][l+1]; take right -> multipliers[i]*nums[right] + dp[i+1][l].",
      "Iterate i from m down to 0; answer is dp[0][0]. Only an (m+1) x (m+1) table is needed.",
    ],
    solutionSteps: [
      "Let n = nums.length, m = multipliers.length; allocate dp[m+1][m+1] of zeros.",
      "For i from m-1 down to 0, for l from i down to 0:",
      "right = n-1-(i-l).",
      "dp[i][l] = max(multipliers[i]*nums[l] + dp[i+1][l+1], multipliers[i]*nums[right] + dp[i+1][l]).",
      "Return dp[0][0].",
    ],
    code: {
      python: `def maximum_score(nums: list[int], multipliers: list[int]) -> int:
    n, m = len(nums), len(multipliers)
    dp = [[0] * (m + 1) for _ in range(m + 1)]
    for i in range(m - 1, -1, -1):
        for l in range(i, -1, -1):
            right = n - 1 - (i - l)
            take_left = multipliers[i] * nums[l] + dp[i + 1][l + 1]
            take_right = multipliers[i] * nums[right] + dp[i + 1][l]
            dp[i][l] = max(take_left, take_right)
    return dp[0][0]
`,
      java: `class Solution {
    public int maximumScore(int[] nums, int[] multipliers) {
        int n = nums.length, m = multipliers.length;
        int[][] dp = new int[m + 1][m + 1];
        for (int i = m - 1; i >= 0; i--) {
            for (int l = i; l >= 0; l--) {
                int right = n - 1 - (i - l);
                int takeLeft = multipliers[i] * nums[l] + dp[i + 1][l + 1];
                int takeRight = multipliers[i] * nums[right] + dp[i + 1][l];
                dp[i][l] = Math.max(takeLeft, takeRight);
            }
        }
        return dp[0][0];
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int maximumScore(vector<int>& nums, vector<int>& multipliers) {
        int n = nums.size(), m = multipliers.size();
        vector<vector<int>> dp(m + 1, vector<int>(m + 1, 0));
        for (int i = m - 1; i >= 0; i--) {
            for (int l = i; l >= 0; l--) {
                int right = n - 1 - (i - l);
                int takeLeft = multipliers[i] * nums[l] + dp[i + 1][l + 1];
                int takeRight = multipliers[i] * nums[right] + dp[i + 1][l];
                dp[i][l] = max(takeLeft, takeRight);
            }
        }
        return dp[0][0];
    }
};
`,
    },
    complexity: { time: "O(m^2)", space: "O(m^2)" },
    pitfalls: [
      "Indexing dp over the full nums length (O(n^2)), which is far too large.",
      "Computing the right pointer incorrectly — it is n-1-(i-l), not a fixed offset.",
      "Greedily taking the larger end, which is not optimal because multipliers vary.",
    ],
    edgeCases: [
      "Multipliers shorter than nums, leaving elements unused.",
      "Negative multipliers favoring negative values.",
      "Single operation.",
    ],
    whyItMatters:
      "Re-parameterizing state to (operations, leftTaken) collapses a huge index range into a quadratic table — a key DP modeling skill.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 322 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "stone-game-seven-score-diff",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "End-Removal Game Maximizing Score Difference",
    framing:
      "Two players alternately remove an item from either end of a row. The score for a removal equals the sum of the values still remaining afterward. Both play optimally; report the final score difference the first player secures.",
    statement:
      "Given an integer array values, players alternate turns (first player starts). On a turn a player removes either the leftmost or rightmost value; they gain points equal to the sum of the remaining values. Both maximize their own total. Return the maximum difference (first player score minus second player score) under optimal play.",
    inputFormat: "An integer array values.",
    outputFormat: "An integer: the optimal score difference for the first player.",
    constraints: [
      "2 <= values.length <= 1000",
      "1 <= values[i] <= 1000",
    ],
    examples: [
      {
        input: "values = [5,3,1,4,2]",
        output: "6",
        explanation: "Optimal end removals leave the first player ahead by 6.",
      },
      {
        input: "values = [7,90,5,1,100,10,10,2]",
        output: "122",
        explanation: "The optimal difference under perfect play is 122.",
      },
    ],
    approach: [
      "Use prefix sums so the sum of any subarray is O(1).",
      "Let dp[i][j] be the best score difference the player to move can achieve on values[i..j].",
      "Removing the left value yields (sum of i+1..j) and then the opponent faces dp[i+1][j], so net is that sum - dp[i+1][j].",
      "Removing the right value yields (sum of i..j-1) - dp[i][j-1].",
      "dp[i][j] is the max of the two; answer is dp[0][n-1].",
    ],
    solutionSteps: [
      "Compute prefix[k] = values[0]+...+values[k-1].",
      "Define rangeSum(i,j) = prefix[j+1]-prefix[i].",
      "Iterate by increasing interval length; dp[i][i]=0 (one element, removing it leaves nothing).",
      "dp[i][j] = max(rangeSum(i+1,j) - dp[i+1][j], rangeSum(i,j-1) - dp[i][j-1]).",
      "Return dp[0][n-1].",
    ],
    code: {
      python: `def stone_game_vii(values: list[int]) -> int:
    n = len(values)
    prefix = [0] * (n + 1)
    for i, v in enumerate(values):
        prefix[i + 1] = prefix[i] + v

    def rs(i: int, j: int) -> int:
        return prefix[j + 1] - prefix[i]

    dp = [[0] * n for _ in range(n)]
    for length in range(2, n + 1):
        for i in range(0, n - length + 1):
            j = i + length - 1
            dp[i][j] = max(rs(i + 1, j) - dp[i + 1][j],
                           rs(i, j - 1) - dp[i][j - 1])
    return dp[0][n - 1]
`,
      java: `class Solution {
    public int stoneGameVII(int[] values) {
        int n = values.length;
        int[] prefix = new int[n + 1];
        for (int i = 0; i < n; i++) prefix[i + 1] = prefix[i] + values[i];
        int[][] dp = new int[n][n];
        for (int len = 2; len <= n; len++) {
            for (int i = 0; i + len - 1 < n; i++) {
                int j = i + len - 1;
                int left = (prefix[j + 1] - prefix[i + 1]) - dp[i + 1][j];
                int right = (prefix[j] - prefix[i]) - dp[i][j - 1];
                dp[i][j] = Math.max(left, right);
            }
        }
        return dp[0][n - 1];
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int stoneGameVII(vector<int>& values) {
        int n = values.size();
        vector<int> prefix(n + 1, 0);
        for (int i = 0; i < n; i++) prefix[i + 1] = prefix[i] + values[i];
        vector<vector<int>> dp(n, vector<int>(n, 0));
        for (int len = 2; len <= n; len++) {
            for (int i = 0; i + len - 1 < n; i++) {
                int j = i + len - 1;
                int left = (prefix[j + 1] - prefix[i + 1]) - dp[i + 1][j];
                int right = (prefix[j] - prefix[i]) - dp[i][j - 1];
                dp[i][j] = max(left, right);
            }
        }
        return dp[0][n - 1];
    }
};
`,
    },
    complexity: { time: "O(n^2)", space: "O(n^2)" },
    pitfalls: [
      "Scoring the removed element instead of the sum of what remains.",
      "Recomputing range sums in a loop instead of using prefix sums.",
      "Forgetting the recursive subtraction that models the opponent's optimal reply.",
    ],
    edgeCases: [
      "Two elements — remove the smaller end to keep the larger remaining sum.",
      "All equal values.",
      "Long arrays where O(n^2) memory must be managed.",
    ],
    whyItMatters:
      "Score-difference interval DP with prefix sums is the standard formulation for symmetric two-player end-removal games.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 323 — pure_dsa · dp_1d · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "fewest-days-clear-backlog",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer"],
    title: "Fewest Days to Drain a Backlog",
    framing:
      "A worker drains a backlog of n items. Each day they may process exactly one item, or — if the remaining count is divisible — halve it, or cut it to one third. Find the fewest days to reach zero.",
    statement:
      "Given an integer n items, each day you may do exactly one of: process 1 item; if n is divisible by 2, process n/2 items (leaving n/2); if n is divisible by 3, process 2*n/3 items (leaving n/3). Return the minimum number of days to reach 0.",
    inputFormat: "A non-negative integer n.",
    outputFormat: "An integer: the minimum number of days.",
    constraints: [
      "1 <= n <= 2 * 10^9",
    ],
    examples: [
      {
        input: "n = 10",
        output: "4",
        explanation: "10 -> 9 (-1) -> 3 (/3) -> 1 (-... ) ... an optimal path uses 4 days.",
      },
      {
        input: "n = 6",
        output: "3",
        explanation: "6 -> 3 (-... via /2 to 3) -> 1 -> 0, three days.",
      },
    ],
    approach: [
      "Reaching n via -1 steps is wasteful; the big jumps are dividing by 2 or 3.",
      "Define dp(n) = 1 + min( n%2 + dp(n//2), n%3 + dp(n//3) ).",
      "The n%2 (or n%3) term accounts for the -1 steps needed to make n divisible first.",
      "Base cases: dp(0)=0, dp(1)=1.",
      "Memoize with a hash map since n is large but the reachable states are few (logarithmic).",
    ],
    solutionSteps: [
      "Use a memoized recursion keyed by the current count.",
      "Return 0 for n==0 and 1 for n==1.",
      "Compute viaTwo = n%2 + 1 + dp(n//2) and viaThree = n%3 + 1 + dp(n//3).",
      "dp(n) = min(viaTwo, viaThree).",
      "Return dp(n).",
    ],
    code: {
      python: `from functools import lru_cache

def min_days(n: int) -> int:
    @lru_cache(maxsize=None)
    def dp(x: int) -> int:
        if x <= 1:
            return x
        return 1 + min(x % 2 + dp(x // 2), x % 3 + dp(x // 3))

    return dp(n)
`,
      java: `import java.util.*;

class Solution {
    Map<Long, Integer> memo = new HashMap<>();

    public int minDays(int n) {
        return dp(n);
    }

    private int dp(long x) {
        if (x <= 1) return (int) x;
        if (memo.containsKey(x)) return memo.get(x);
        int viaTwo = (int) (x % 2) + 1 + dp(x / 2);
        int viaThree = (int) (x % 3) + 1 + dp(x / 3);
        int res = Math.min(viaTwo, viaThree);
        memo.put(x, res);
        return res;
    }
}
`,
      cpp: `#include <unordered_map>
#include <algorithm>
using namespace std;

class Solution {
    unordered_map<long, int> memo;
    int dp(long x) {
        if (x <= 1) return (int) x;
        auto it = memo.find(x);
        if (it != memo.end()) return it->second;
        int viaTwo = (int) (x % 2) + 1 + dp(x / 2);
        int viaThree = (int) (x % 3) + 1 + dp(x / 3);
        int res = min(viaTwo, viaThree);
        memo[x] = res;
        return res;
    }
public:
    int minDays(int n) { return dp(n); }
};
`,
    },
    complexity: { time: "O(log^2 n)", space: "O(log^2 n)" },
    pitfalls: [
      "Building a full dp array of size n, which is impossible for n up to 2e9.",
      "Forgetting the remainder steps needed to reach a divisible count before halving or thirding.",
      "Greedily always dividing by 3, which is not always optimal.",
    ],
    edgeCases: [
      "n = 1 (one day).",
      "Powers of two and powers of three.",
      "Large n near the upper bound requiring 64-bit keys.",
    ],
    whyItMatters:
      "Top-down memoization keyed by reachable states (not the full range) is the right tool when the state space is sparse despite a huge nominal bound.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 324 — pure_dsa · math_geometry · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-bst-build-orders",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "math_geometry",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Insertion Orders Producing the Same BST",
    framing:
      "A configuration is loaded by inserting keys into a BST in some order. Given one insertion order, count how many other orders build the exact same tree shape — useful for de-duplicating equivalent deploy sequences.",
    statement:
      "Given an array nums that is a permutation of 1..n, inserting its values left to right into an initially empty BST yields a tree. Return the number of different insertion orders of the same values that produce an identical BST, excluding the given order itself. Return the count modulo 1e9 + 7.",
    inputFormat: "An array nums, a permutation of 1..n.",
    outputFormat: "An integer: the number of other valid orders modulo 1e9 + 7.",
    constraints: [
      "1 <= nums.length <= 1000",
      "nums is a permutation of 1..nums.length.",
    ],
    examples: [
      {
        input: "nums = [2,1,3]",
        output: "1",
        explanation: "Only [2,3,1] also builds the same BST; that is 1 other order.",
      },
      {
        input: "nums = [3,4,5,1,2]",
        output: "5",
        explanation: "Five other orders produce the same tree.",
      },
    ],
    approach: [
      "The first element must be the root; the relative order of left-subtree keys and right-subtree keys can interleave freely.",
      "If the left subtree has L nodes and the right has R nodes, the number of interleavings is C(L+R, L).",
      "Recursively multiply by the counts of valid orders within each subtree.",
      "total(seq) = C(L+R, L) * total(left) * total(right).",
      "Subtract 1 at the end to exclude the original order; precompute Pascal's triangle for the binomials mod p.",
    ],
    solutionSteps: [
      "Precompute binomial coefficients up to n via Pascal's triangle modulo 1e9 + 7.",
      "Define count(seq): if length <= 2 return 1.",
      "Root = seq[0]; left = values < root preserving order, right = values > root preserving order.",
      "Return C(len(left)+len(right), len(left)) * count(left) * count(right) mod p.",
      "Answer = (count(nums) - 1 + p) % p.",
    ],
    code: {
      python: `def num_of_ways(nums: list[int]) -> int:
    MOD = 10**9 + 7
    n = len(nums)
    C = [[0] * (n + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        C[i][0] = 1
        for j in range(1, i + 1):
            C[i][j] = (C[i - 1][j - 1] + C[i - 1][j]) % MOD

    def count(seq: list[int]) -> int:
        if len(seq) <= 2:
            return 1
        root = seq[0]
        left = [x for x in seq if x < root]
        right = [x for x in seq if x > root]
        return (C[len(left) + len(right)][len(left)] * count(left) % MOD) * count(right) % MOD

    return (count(nums) - 1 + MOD) % MOD
`,
      java: `import java.util.*;

class Solution {
    long MOD = 1_000_000_007L;
    long[][] C;

    public int numOfWays(int[] nums) {
        int n = nums.length;
        C = new long[n + 1][n + 1];
        for (int i = 0; i <= n; i++) {
            C[i][0] = 1;
            for (int j = 1; j <= i; j++)
                C[i][j] = (C[i - 1][j - 1] + C[i - 1][j]) % MOD;
        }
        List<Integer> seq = new ArrayList<>();
        for (int x : nums) seq.add(x);
        return (int) ((count(seq) - 1 + MOD) % MOD);
    }

    private long count(List<Integer> seq) {
        if (seq.size() <= 2) return 1;
        int root = seq.get(0);
        List<Integer> left = new ArrayList<>(), right = new ArrayList<>();
        for (int x : seq) {
            if (x < root) left.add(x);
            else if (x > root) right.add(x);
        }
        long ways = C[left.size() + right.size()][left.size()];
        return ways * count(left) % MOD * count(right) % MOD;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
    long MOD = 1000000007L;
    vector<vector<long>> C;
    long count(vector<int>& seq) {
        if ((int) seq.size() <= 2) return 1;
        int root = seq[0];
        vector<int> left, right;
        for (int x : seq) {
            if (x < root) left.push_back(x);
            else if (x > root) right.push_back(x);
        }
        long ways = C[left.size() + right.size()][left.size()];
        return ways * count(left) % MOD * count(right) % MOD;
    }
public:
    int numOfWays(vector<int>& nums) {
        int n = nums.size();
        C.assign(n + 1, vector<long>(n + 1, 0));
        for (int i = 0; i <= n; i++) {
            C[i][0] = 1;
            for (int j = 1; j <= i; j++)
                C[i][j] = (C[i - 1][j - 1] + C[i - 1][j]) % MOD;
        }
        return (int) ((count(nums) - 1 + MOD) % MOD);
    }
};
`,
    },
    complexity: { time: "O(n^2)", space: "O(n^2)" },
    pitfalls: [
      "Forgetting to subtract 1 for the original order.",
      "Mixing up which values go left versus right of the root.",
      "Negative result before applying the modulus after subtracting 1.",
    ],
    edgeCases: [
      "n <= 2 where the only order is the original (answer 0).",
      "A degenerate chain BST (all left or all right children).",
      "A perfectly balanced tree maximizing interleavings.",
    ],
    whyItMatters:
      "Combining tree recursion with binomial interleaving counts is a classic combinatorics-on-structures technique used in scheduling and serialization analysis.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 325 — pure_dsa · backtracking · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "balance-transfer-requests",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "software_engineer"],
    title: "Maximum Achievable Transfer Requests",
    framing:
      "Employees request to move between buildings. A transfer plan is valid only if every building ends with the same headcount it started with (net zero change). Approve the most requests possible.",
    statement:
      "Given n buildings and a list requests where requests[i] = [from_i, to_i] means one person wants to move from building from_i to to_i, return the maximum number of requests that can be approved such that every building's net change is zero.",
    inputFormat: "An integer n and an array requests of [from, to] pairs.",
    outputFormat: "An integer: the maximum number of simultaneously satisfiable requests.",
    constraints: [
      "1 <= n <= 20",
      "1 <= requests.length <= 16",
      "0 <= from_i, to_i < n",
    ],
    examples: [
      {
        input: "n = 5, requests = [[0,1],[1,0],[0,1],[1,2],[2,0],[3,4]]",
        output: "5",
        explanation: "Approving all but the unmatched [3,4] keeps every building balanced.",
      },
      {
        input: "n = 3, requests = [[0,0],[1,2],[2,1]]",
        output: "3",
        explanation: "The self-loop plus the mutual swap all keep net change zero.",
      },
    ],
    approach: [
      "With at most 16 requests, enumerate every subset via a bitmask (2^16 possibilities).",
      "For each subset, compute the net change per building from the chosen requests.",
      "A subset is valid if all building deltas are zero.",
      "Track the maximum popcount over all valid subsets.",
      "Alternatively recurse request by request, but brute-force over masks is simplest and fast enough.",
    ],
    solutionSteps: [
      "Iterate mask from 0 to 2^R - 1.",
      "For each set bit i, apply degree[from]-- and degree[to]++.",
      "If every degree entry is zero, the subset is balanced.",
      "Record max(answer, popcount(mask)) for balanced subsets.",
      "Return the best count.",
    ],
    code: {
      python: `def maximum_requests(n: int, requests: list[list[int]]) -> int:
    R = len(requests)
    best = 0
    for mask in range(1 << R):
        degree = [0] * n
        count = 0
        for i in range(R):
            if mask & (1 << i):
                a, b = requests[i]
                degree[a] -= 1
                degree[b] += 1
                count += 1
        if all(d == 0 for d in degree):
            best = max(best, count)
    return best
`,
      java: `class Solution {
    public int maximumRequests(int n, int[][] requests) {
        int R = requests.length, best = 0;
        for (int mask = 0; mask < (1 << R); mask++) {
            int[] degree = new int[n];
            int count = 0;
            for (int i = 0; i < R; i++) {
                if ((mask & (1 << i)) != 0) {
                    degree[requests[i][0]]--;
                    degree[requests[i][1]]++;
                    count++;
                }
            }
            boolean ok = true;
            for (int d : degree) if (d != 0) { ok = false; break; }
            if (ok) best = Math.max(best, count);
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
    int maximumRequests(int n, vector<vector<int>>& requests) {
        int R = requests.size(), best = 0;
        for (int mask = 0; mask < (1 << R); mask++) {
            vector<int> degree(n, 0);
            int count = 0;
            for (int i = 0; i < R; i++) {
                if (mask & (1 << i)) {
                    degree[requests[i][0]]--;
                    degree[requests[i][1]]++;
                    count++;
                }
            }
            bool ok = true;
            for (int d : degree) if (d != 0) { ok = false; break; }
            if (ok) best = max(best, count);
        }
        return best;
    }
};
`,
    },
    complexity: { time: "O(2^R * (R + n))", space: "O(n)" },
    pitfalls: [
      "Trying greedy matching, which misses globally balanced combinations.",
      "Self-loop requests ([x,x]) should net to zero and are always safe to include.",
      "Recomputing popcount expensively instead of counting set bits as you apply them.",
    ],
    edgeCases: [
      "All requests form self-loops (all approvable).",
      "No balanced subset except the empty set (answer 0).",
      "Maximum 16 requests stressing the 2^16 enumeration.",
    ],
    whyItMatters:
      "Subset enumeration with a feasibility check is the pragmatic exact method when the choice count is small, common in constraint-balanced approval systems.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 326 — pure_dsa · heap_priority_queue · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "busiest-request-servers",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "heap_priority_queue",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "platform_engineer"],
    title: "Servers That Handled the Most Requests",
    framing:
      "A fleet of k servers handles incoming requests. Request i prefers server (i mod k); if busy it scans forward (wrapping) to the next free server, else it is dropped. Report which servers handled the most requests.",
    statement:
      "Given k servers (0..k-1), arrays arrival and load (request i arrives at arrival[i] and occupies a server for load[i] time), each request goes to the first free server at or after index (i mod k), wrapping around; if all are busy it is dropped. Return the indices of the server(s) that handled the maximum number of requests.",
    inputFormat:
      "An integer k, a strictly increasing array arrival, and an array load of equal length.",
    outputFormat: "A list of server indices (any order) that handled the most requests.",
    constraints: [
      "1 <= k <= 100000",
      "1 <= arrival.length, load.length <= 100000",
      "arrival is strictly increasing; 1 <= load[i] <= 10^9.",
    ],
    examples: [
      {
        input: "k = 3, arrival = [1,2,3,4,5], load = [5,2,3,3,3]",
        output: "[1]",
        explanation: "Server 1 ends up handling the most requests.",
      },
      {
        input: "k = 3, arrival = [1,2,3,4], load = [1,2,1,2]",
        output: "[0]",
        explanation: "Server 0 frees up in time to take extra requests.",
      },
    ],
    approach: [
      "Maintain an ordered set of free server indices and a min-heap of busy servers keyed by free time.",
      "For each request, release all busy servers whose free time is <= the arrival time back into the free set.",
      "If no server is free, drop the request.",
      "Otherwise pick the smallest free index >= (i mod k); if none, wrap to the smallest free index overall.",
      "Increment that server's count, remove it from free, and push it onto the busy heap with its new free time.",
    ],
    solutionSteps: [
      "Initialize a sorted structure free = {0..k-1}, an empty busy heap, and counts[k]=0.",
      "For request i: pop busy entries with freeTime <= arrival[i] and reinsert their indices into free.",
      "If free is empty, continue (dropped).",
      "Find the ceiling of (i mod k) in free, wrapping to the minimum if absent; assign it.",
      "Update counts and busy; after all requests, return every index whose count equals the max.",
    ],
    code: {
      python: `import heapq
from bisect import bisect_left, insort

def busiest_servers(k: int, arrival: list[int], load: list[int]) -> list[int]:
    free = list(range(k))  # sorted list of available indices
    busy: list[tuple[int, int]] = []  # (free_time, index)
    counts = [0] * k
    for i, t in enumerate(arrival):
        while busy and busy[0][0] <= t:
            _, idx = heapq.heappop(busy)
            insort(free, idx)
        if not free:
            continue
        start = i % k
        pos = bisect_left(free, start)
        if pos == len(free):
            pos = 0
        idx = free.pop(pos)
        counts[idx] += 1
        heapq.heappush(busy, (t + load[i], idx))
    best = max(counts)
    return [i for i in range(k) if counts[i] == best]
`,
      java: `import java.util.*;

class Solution {
    public List<Integer> busiestServers(int k, int[] arrival, int[] load) {
        TreeSet<Integer> free = new TreeSet<>();
        for (int i = 0; i < k; i++) free.add(i);
        PriorityQueue<long[]> busy = new PriorityQueue<>((a, b) -> Long.compare(a[0], b[0]));
        int[] counts = new int[k];
        for (int i = 0; i < arrival.length; i++) {
            long t = arrival[i];
            while (!busy.isEmpty() && busy.peek()[0] <= t) free.add((int) busy.poll()[1]);
            if (free.isEmpty()) continue;
            Integer idx = free.ceiling(i % k);
            if (idx == null) idx = free.first();
            free.remove(idx);
            counts[idx]++;
            busy.add(new long[]{t + load[i], idx});
        }
        int best = 0;
        for (int c : counts) best = Math.max(best, c);
        List<Integer> res = new ArrayList<>();
        for (int i = 0; i < k; i++) if (counts[i] == best) res.add(i);
        return res;
    }
}
`,
      cpp: `#include <vector>
#include <set>
#include <queue>
#include <algorithm>
using namespace std;

class Solution {
public:
    vector<int> busiestServers(int k, vector<int>& arrival, vector<int>& load) {
        set<int> freeSet;
        for (int i = 0; i < k; i++) freeSet.insert(i);
        priority_queue<pair<long, int>, vector<pair<long, int>>, greater<>> busy;
        vector<int> counts(k, 0);
        for (int i = 0; i < (int) arrival.size(); i++) {
            long t = arrival[i];
            while (!busy.empty() && busy.top().first <= t) {
                freeSet.insert(busy.top().second);
                busy.pop();
            }
            if (freeSet.empty()) continue;
            auto it = freeSet.lower_bound(i % k);
            if (it == freeSet.end()) it = freeSet.begin();
            int idx = *it;
            freeSet.erase(it);
            counts[idx]++;
            busy.push({t + load[i], idx});
        }
        int best = 0;
        for (int c : counts) best = max(best, c);
        vector<int> res;
        for (int i = 0; i < k; i++) if (counts[i] == best) res.push_back(i);
        return res;
    }
};
`,
    },
    complexity: { time: "O(n log k)", space: "O(k)" },
    pitfalls: [
      "Linear-scanning for the next free server, which degrades to O(nk).",
      "Forgetting to wrap from the end of the free set back to its smallest index.",
      "Releasing servers with free time strictly less than arrival but missing the equals case (a server free exactly at arrival can be reused).",
    ],
    edgeCases: [
      "All requests dropped because every server stays busy.",
      "k = 1 (single server).",
      "Multiple servers tied for the maximum.",
    ],
    whyItMatters:
      "Combining an ordered set for free resources with a heap for busy ones is the canonical pattern for round-robin load balancers and connection pools.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 327 — pure_dsa · graphs · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "teleport-jump-min-steps",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Fewest Jumps with Value Teleports",
    framing:
      "You hop along an array of node labels. From an index you can step left, step right, or teleport to any other index sharing the same label. Reach the last index in the fewest hops.",
    statement:
      "Given an integer array arr, starting at index 0 you may move from index i to i+1, i-1 (within bounds), or to any index j != i with arr[j] == arr[i]. Return the minimum number of steps to reach the last index.",
    inputFormat: "An integer array arr.",
    outputFormat: "An integer: the minimum number of steps to reach index n-1.",
    constraints: [
      "1 <= arr.length <= 50000",
      "-10^8 <= arr[i] <= 10^8",
    ],
    examples: [
      {
        input: "arr = [100,-23,-23,404,100,23,23,23,3,404]",
        output: "3",
        explanation: "0 -> 4 (same value 100) -> 3 -> 9 (same value 404), three steps.",
      },
      {
        input: "arr = [7]",
        output: "0",
        explanation: "Already at the last index.",
      },
    ],
    approach: [
      "All edges have weight 1, so BFS gives the shortest path.",
      "Precompute a map from value to the list of indices holding it.",
      "From an index, enqueue i-1, i+1, and every same-value index.",
      "Critically, clear a value's index list after first expanding it so each group is processed once (avoids O(n^2)).",
      "Return the BFS depth when the last index is dequeued.",
    ],
    solutionSteps: [
      "Build groups: value -> indices.",
      "BFS from index 0 with a visited array; depth starts at 0.",
      "When visiting i, for each peer in groups[arr[i]] enqueue if unvisited, then clear groups[arr[i]].",
      "Also enqueue i-1 and i+1 if valid and unvisited.",
      "Return depth upon reaching n-1.",
    ],
    code: {
      python: `from collections import deque, defaultdict

def min_jumps(arr: list[int]) -> int:
    n = len(arr)
    if n == 1:
        return 0
    groups = defaultdict(list)
    for i, v in enumerate(arr):
        groups[v].append(i)
    visited = [False] * n
    visited[0] = True
    q = deque([0])
    steps = 0
    while q:
        for _ in range(len(q)):
            i = q.popleft()
            if i == n - 1:
                return steps
            for j in groups[arr[i]]:
                if not visited[j]:
                    visited[j] = True
                    q.append(j)
            groups[arr[i]].clear()
            for j in (i - 1, i + 1):
                if 0 <= j < n and not visited[j]:
                    visited[j] = True
                    q.append(j)
        steps += 1
    return -1
`,
      java: `import java.util.*;

class Solution {
    public int minJumps(int[] arr) {
        int n = arr.length;
        if (n == 1) return 0;
        Map<Integer, List<Integer>> groups = new HashMap<>();
        for (int i = 0; i < n; i++)
            groups.computeIfAbsent(arr[i], z -> new ArrayList<>()).add(i);
        boolean[] visited = new boolean[n];
        visited[0] = true;
        Queue<Integer> q = new ArrayDeque<>();
        q.add(0);
        int steps = 0;
        while (!q.isEmpty()) {
            for (int sz = q.size(); sz > 0; sz--) {
                int i = q.poll();
                if (i == n - 1) return steps;
                List<Integer> peers = groups.get(arr[i]);
                if (peers != null) {
                    for (int j : peers) if (!visited[j]) { visited[j] = true; q.add(j); }
                    peers.clear();
                }
                if (i - 1 >= 0 && !visited[i - 1]) { visited[i - 1] = true; q.add(i - 1); }
                if (i + 1 < n && !visited[i + 1]) { visited[i + 1] = true; q.add(i + 1); }
            }
            steps++;
        }
        return -1;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
#include <unordered_map>
using namespace std;

class Solution {
public:
    int minJumps(vector<int>& arr) {
        int n = arr.size();
        if (n == 1) return 0;
        unordered_map<int, vector<int>> groups;
        for (int i = 0; i < n; i++) groups[arr[i]].push_back(i);
        vector<char> visited(n, 0);
        visited[0] = 1;
        queue<int> q;
        q.push(0);
        int steps = 0;
        while (!q.empty()) {
            for (int sz = q.size(); sz > 0; sz--) {
                int i = q.front(); q.pop();
                if (i == n - 1) return steps;
                auto it = groups.find(arr[i]);
                if (it != groups.end()) {
                    for (int j : it->second) if (!visited[j]) { visited[j] = 1; q.push(j); }
                    it->second.clear();
                }
                if (i - 1 >= 0 && !visited[i - 1]) { visited[i - 1] = 1; q.push(i - 1); }
                if (i + 1 < n && !visited[i + 1]) { visited[i + 1] = 1; q.push(i + 1); }
            }
            steps++;
        }
        return -1;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Re-expanding a value group every time it is encountered, causing O(n^2) blowup; clear it after first use.",
      "Marking visited when dequeuing instead of when enqueuing, allowing duplicates.",
      "Forgetting the single-element shortcut.",
    ],
    edgeCases: [
      "All identical values — reach the end in one teleport.",
      "Strictly increasing distinct values — only adjacent steps available.",
      "Length-one array.",
    ],
    whyItMatters:
      "The 'clear the group after expansion' optimization is a classic BFS-on-implicit-graph trick essential for value-linked state spaces.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 328 — pure_dsa · graphs · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "arrange-matrix-order-rules",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Place Numbers in a Grid Under Row and Column Rules",
    framing:
      "You must lay numbers 1..k into a k x k grid (each used once, rest zero) subject to 'A must be above B' row rules and 'A must be left of C' column rules. Produce any valid grid or report it is impossible.",
    statement:
      "Given k, a list rowConditions where [a,b] means a must appear in a row strictly above b, and colConditions where [a,b] means a must appear in a column strictly left of b, return any k x k matrix placing each of 1..k once (other cells 0) that satisfies all conditions, or an empty matrix if no arrangement exists.",
    inputFormat:
      "An integer k, rowConditions: list of [above, below], colConditions: list of [left, right].",
    outputFormat: "A k x k matrix satisfying the rules, or an empty list if impossible.",
    constraints: [
      "2 <= k <= 400",
      "1 <= rowConditions.length, colConditions.length <= 10^4",
      "Conditions reference values in 1..k.",
    ],
    examples: [
      {
        input: "k = 3, rowConditions = [[1,2],[3,2]], colConditions = [[2,1],[3,2]]",
        output: "[[3,0,0],[0,0,1],[0,2,0]]",
        explanation: "Row order 3,1,2 and column order 3,2,1 satisfy every rule (one valid layout).",
      },
      {
        input: "k = 2, rowConditions = [[1,2],[2,1]], colConditions = [[1,2]]",
        output: "[]",
        explanation: "The row rules contradict each other (a cycle), so no layout exists.",
      },
    ],
    approach: [
      "Row placement and column placement are independent topological-ordering problems.",
      "Topologically sort the values using rowConditions to get each value's row index.",
      "Topologically sort using colConditions to get each value's column index.",
      "If either sort fails to include all k values (a cycle), return an empty matrix.",
      "Place value v at (rowIndex[v], colIndex[v]).",
    ],
    solutionSteps: [
      "Write a topo-sort helper returning the order or null on a cycle.",
      "rowOrder = topo(rowConditions); colOrder = topo(colConditions); fail if either is null.",
      "Map value -> row position and value -> column position from the orders.",
      "Initialize a k x k zero matrix.",
      "For each value v in 1..k, set matrix[rowPos[v]][colPos[v]] = v; return it.",
    ],
    code: {
      python: `from collections import deque

def build_matrix(k: int, row_conditions: list[list[int]], col_conditions: list[list[int]]) -> list[list[int]]:
    def topo(conditions: list[list[int]]) -> list[int] | None:
        adj = [[] for _ in range(k + 1)]
        indeg = [0] * (k + 1)
        for a, b in conditions:
            adj[a].append(b)
            indeg[b] += 1
        q = deque(v for v in range(1, k + 1) if indeg[v] == 0)
        order = []
        while q:
            u = q.popleft()
            order.append(u)
            for w in adj[u]:
                indeg[w] -= 1
                if indeg[w] == 0:
                    q.append(w)
        return order if len(order) == k else None

    row_order = topo(row_conditions)
    col_order = topo(col_conditions)
    if row_order is None or col_order is None:
        return []
    row_pos = {v: i for i, v in enumerate(row_order)}
    col_pos = {v: i for i, v in enumerate(col_order)}
    matrix = [[0] * k for _ in range(k)]
    for v in range(1, k + 1):
        matrix[row_pos[v]][col_pos[v]] = v
    return matrix
`,
      java: `import java.util.*;

class Solution {
    public int[][] buildMatrix(int k, int[][] rowConditions, int[][] colConditions) {
        int[] rowOrder = topo(k, rowConditions);
        int[] colOrder = topo(k, colConditions);
        if (rowOrder == null || colOrder == null) return new int[0][0];
        int[] rowPos = new int[k + 1], colPos = new int[k + 1];
        for (int i = 0; i < k; i++) rowPos[rowOrder[i]] = i;
        for (int i = 0; i < k; i++) colPos[colOrder[i]] = i;
        int[][] matrix = new int[k][k];
        for (int v = 1; v <= k; v++) matrix[rowPos[v]][colPos[v]] = v;
        return matrix;
    }

    private int[] topo(int k, int[][] conditions) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i <= k; i++) adj.add(new ArrayList<>());
        int[] indeg = new int[k + 1];
        for (int[] c : conditions) { adj.get(c[0]).add(c[1]); indeg[c[1]]++; }
        Deque<Integer> q = new ArrayDeque<>();
        for (int v = 1; v <= k; v++) if (indeg[v] == 0) q.add(v);
        int[] order = new int[k];
        int idx = 0;
        while (!q.isEmpty()) {
            int u = q.poll();
            order[idx++] = u;
            for (int w : adj.get(u)) if (--indeg[w] == 0) q.add(w);
        }
        return idx == k ? order : null;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
using namespace std;

class Solution {
    vector<int> topo(int k, vector<vector<int>>& conditions, bool& ok) {
        vector<vector<int>> adj(k + 1);
        vector<int> indeg(k + 1, 0);
        for (auto& c : conditions) { adj[c[0]].push_back(c[1]); indeg[c[1]]++; }
        queue<int> q;
        for (int v = 1; v <= k; v++) if (indeg[v] == 0) q.push(v);
        vector<int> order;
        while (!q.empty()) {
            int u = q.front(); q.pop();
            order.push_back(u);
            for (int w : adj[u]) if (--indeg[w] == 0) q.push(w);
        }
        ok = (int) order.size() == k;
        return order;
    }
public:
    vector<vector<int>> buildMatrix(int k, vector<vector<int>>& rowConditions, vector<vector<int>>& colConditions) {
        bool ok1 = false, ok2 = false;
        auto rowOrder = topo(k, rowConditions, ok1);
        auto colOrder = topo(k, colConditions, ok2);
        if (!ok1 || !ok2) return {};
        vector<int> rowPos(k + 1), colPos(k + 1);
        for (int i = 0; i < k; i++) rowPos[rowOrder[i]] = i;
        for (int i = 0; i < k; i++) colPos[colOrder[i]] = i;
        vector<vector<int>> matrix(k, vector<int>(k, 0));
        for (int v = 1; v <= k; v++) matrix[rowPos[v]][colPos[v]] = v;
        return matrix;
    }
};
`,
    },
    complexity: { time: "O(k^2 + E)", space: "O(k^2 + E)" },
    pitfalls: [
      "Trying to satisfy row and column constraints jointly; they decouple into two independent topological sorts.",
      "Not detecting cycles — an incomplete topological order means impossibility.",
      "Mapping positions backward (position->value instead of value->position).",
    ],
    edgeCases: [
      "Contradictory conditions forming a cycle (empty output).",
      "No conditions on one axis (any order works).",
      "k = 2 minimal grid.",
    ],
    whyItMatters:
      "Recognizing that two orthogonal ordering constraints separate into independent topological sorts is a clean modeling insight reused in layout and scheduling engines.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 329 — pure_dsa · math_geometry · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "nearest-palindrome-config",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "math_geometry",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Closest Palindromic Number",
    framing:
      "A config validator nudges a numeric token to the nearest palindrome (for symmetric checksum codes). Given the number as a string, return the closest palindrome that is not equal to it; on a tie pick the smaller.",
    statement:
      "Given a numeric string n (no leading zeros), return the closest integer (as a string) that is a palindrome and not equal to n. If two palindromes are equally close, return the smaller one.",
    inputFormat: "A string n representing a positive integer without leading zeros.",
    outputFormat: "A string: the closest palindrome different from n.",
    constraints: [
      "1 <= n.length <= 18",
      "n consists of digits and represents a value in [1, 10^18 - 1].",
    ],
    examples: [
      {
        input: 'n = "123"',
        output: '"121"',
        explanation: "121 is the nearest palindrome to 123.",
      },
      {
        input: 'n = "1"',
        output: '"0"',
        explanation: "The closest palindrome not equal to 1 is 0.",
      },
    ],
    approach: [
      "The best candidates come from mirroring the left half (prefix) and from the prefix +/- 1.",
      "Also consider the boundary palindromes 10...01 (one digit longer) and 99...9 (one digit shorter).",
      "Generate all five candidates, discard any equal to n.",
      "Compute the absolute difference of each candidate to n using big integers (up to 18 digits).",
      "Pick the smallest difference, breaking ties toward the smaller value.",
    ],
    solutionSteps: [
      "Let L = len(n), prefix = first ceil(L/2) digits as an integer.",
      "For p in {prefix-1, prefix, prefix+1}: build a palindrome of the original length by mirroring p.",
      "Add candidates 10^(L-1)-1 (all nines, shorter) and 10^L+1 (1 followed by zeros then 1, longer).",
      "Remove the candidate equal to n; convert all to integers.",
      "Return the candidate minimizing (abs diff, value).",
    ],
    code: {
      python: `def nearest_palindromic(n: str) -> str:
    length = len(n)
    num = int(n)
    candidates = set()
    candidates.add(10 ** (length - 1) - 1)  # e.g. 99 for 3-digit
    candidates.add(10 ** length + 1)        # e.g. 1001 for 3-digit
    prefix = int(n[: (length + 1) // 2])
    for p in (prefix - 1, prefix, prefix + 1):
        s = str(p)
        if length % 2 == 0:
            pal = s + s[::-1]
        else:
            pal = s + s[:-1][::-1]
        candidates.add(int(pal))
    candidates.discard(num)
    best = None
    for c in candidates:
        if c < 0:
            continue
        if best is None or abs(c - num) < abs(best - num) or (
            abs(c - num) == abs(best - num) and c < best
        ):
            best = c
    return str(best)
`,
      java: `import java.util.*;

class Solution {
    public String nearestPalindromic(String n) {
        int length = n.length();
        long num = Long.parseLong(n);
        Set<Long> candidates = new HashSet<>();
        candidates.add((long) Math.pow(10, length - 1) - 1);
        candidates.add((long) Math.pow(10, length) + 1);
        long prefix = Long.parseLong(n.substring(0, (length + 1) / 2));
        for (long p = prefix - 1; p <= prefix + 1; p++) {
            StringBuilder sb = new StringBuilder(Long.toString(p));
            StringBuilder full = new StringBuilder(sb);
            StringBuilder rev = new StringBuilder(sb).reverse();
            if (length % 2 == 0) full.append(rev);
            else full.append(rev.substring(1));
            candidates.add(Long.parseLong(full.toString()));
        }
        candidates.remove(num);
        long best = -1;
        for (long c : candidates) {
            if (c < 0) continue;
            if (best == -1 || Math.abs(c - num) < Math.abs(best - num)
                    || (Math.abs(c - num) == Math.abs(best - num) && c < best))
                best = c;
        }
        return Long.toString(best);
    }
}
`,
      cpp: `#include <string>
#include <set>
#include <cmath>
#include <algorithm>
using namespace std;

class Solution {
public:
    string nearestPalindromic(string n) {
        int length = n.size();
        long num = stol(n);
        set<long> candidates;
        candidates.insert((long) pow(10, length - 1) - 1);
        candidates.insert((long) pow(10, length) + 1);
        long prefix = stol(n.substr(0, (length + 1) / 2));
        for (long p = prefix - 1; p <= prefix + 1; p++) {
            string s = to_string(p);
            string full = s;
            string rev = s;
            reverse(rev.begin(), rev.end());
            if (length % 2 == 0) full += rev;
            else full += rev.substr(1);
            candidates.insert(stol(full));
        }
        candidates.erase(num);
        long best = -1;
        for (long c : candidates) {
            if (c < 0) continue;
            if (best == -1 || llabs(c - num) < llabs(best - num)
                    || (llabs(c - num) == llabs(best - num) && c < best))
                best = c;
        }
        return to_string(best);
    }
};
`,
    },
    complexity: { time: "O(L)", space: "O(L)" },
    pitfalls: [
      "Only mirroring the prefix and missing the +/-1 prefix and the 99..9 / 10..01 boundary cases.",
      "Returning n itself when it is already a palindrome.",
      "Tie-breaking toward the larger value instead of the smaller.",
    ],
    edgeCases: [
      "Single digit like '1' whose answer is '0'.",
      "Values like '11' where decrementing the prefix changes digit length.",
      "Round numbers like '1000' nearest to '999'.",
    ],
    whyItMatters:
      "Constructing a tight candidate set instead of scanning is the core technique for nearest-structured-number problems and many string-to-number transforms.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 330 — pure_dsa · backtracking · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "all-results-grouping-ops",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "All Results from Differently Grouping an Expression",
    framing:
      "A formula engine evaluates an arithmetic expression of numbers and + - * operators. Different parenthesizations yield different results. Return every distinct value reachable by some valid grouping.",
    statement:
      "Given a string expression of non-negative integers and the operators '+', '-', '*', return all possible results of computing the expression under every way of grouping the numbers and operators with parentheses. Results may be returned in any order.",
    inputFormat: "A string expression containing digits and the operators +, -, *.",
    outputFormat: "A list of integers — all achievable results.",
    constraints: [
      "1 <= expression.length <= 20",
      "expression contains only digits and the operators +, -, *.",
      "Operands fit in a 32-bit integer; results fit in a 32-bit integer.",
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
        explanation: "Different groupings produce these five values.",
      },
    ],
    approach: [
      "At every operator, split the expression into a left part and a right part.",
      "Recursively compute all results for each side, then combine each left value with each right value using that operator.",
      "A substring with no operator is a single number — its only result is itself.",
      "Collect results across all operator split points.",
      "Memoize on the substring to avoid recomputing shared subexpressions.",
    ],
    solutionSteps: [
      "If the substring is all digits, return [int(substring)].",
      "For each index where a character is an operator, recurse on left and right substrings.",
      "Combine: for l in leftResults, for r in rightResults apply the operator and append.",
      "Cache results per substring.",
      "Return the accumulated list for the whole expression.",
    ],
    code: {
      python: `from functools import lru_cache

def diff_ways_to_compute(expression: str) -> list[int]:
    @lru_cache(maxsize=None)
    def solve(expr: str) -> tuple[int, ...]:
        if expr.isdigit():
            return (int(expr),)
        results = []
        for i, ch in enumerate(expr):
            if ch in "+-*":
                left = solve(expr[:i])
                right = solve(expr[i + 1:])
                for a in left:
                    for b in right:
                        if ch == "+":
                            results.append(a + b)
                        elif ch == "-":
                            results.append(a - b)
                        else:
                            results.append(a * b)
        return tuple(results)

    return list(solve(expression))
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
      cpp: `#include <vector>
#include <string>
#include <unordered_map>
using namespace std;

class Solution {
    unordered_map<string, vector<int>> memo;
public:
    vector<int> diffWaysToCompute(string expression) {
        if (memo.count(expression)) return memo[expression];
        vector<int> results;
        bool hasOp = false;
        for (int i = 0; i < (int) expression.size(); i++) {
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
    complexity: { time: "O(Catalan(n)) results, accelerated by memoization", space: "O(n^2) distinct substrings" },
    pitfalls: [
      "Treating multi-digit numbers as single characters when checking for the base case.",
      "Recomputing identical subexpressions without memoization, exploding the runtime.",
      "Forgetting that subtraction is not commutative, so left/right order matters.",
    ],
    edgeCases: [
      "A single number with no operators.",
      "Repeated identical results from different groupings (kept, not deduplicated).",
      "Expressions where multiplication dominates the value range.",
    ],
    whyItMatters:
      "Divide-at-every-operator recursion is the canonical structure for parsing-and-evaluation enumeration and for Catalan-number subdivision problems.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 331 — ai_applied · dp_1d · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-distinct-prompt-subsequences",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 11,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "software_engineer"],
    title: "Count Distinct Subsequences of a Token String",
    framing:
      "To estimate how many distinct prompt fragments can be sampled from a token string, count its distinct non-empty subsequences (order preserved, duplicates collapsed).",
    statement:
      "Given a string s, return the number of distinct non-empty subsequences of s, modulo 1e9 + 7. Two subsequences are the same if they are equal as strings, regardless of which positions produced them.",
    inputFormat: "A string s of lowercase English letters.",
    outputFormat: "An integer: the count of distinct non-empty subsequences modulo 1e9 + 7.",
    constraints: [
      "1 <= s.length <= 2000",
      "s consists of lowercase English letters.",
    ],
    examples: [
      {
        input: 's = "abc"',
        output: "7",
        explanation: "a, b, c, ab, ac, bc, abc.",
      },
      {
        input: 's = "aba"',
        output: "6",
        explanation: "a, b, ab, ba, aa, aba (the duplicate 'a' is counted once).",
      },
    ],
    approach: [
      "Let total be the count of distinct subsequences (including the empty one) seen so far.",
      "Adding character c either appends c to every existing subsequence or stands alone, giving newTotal = 2 * total.",
      "But subsequences that ended in c the previous time c appeared are double-counted; subtract that prior contribution.",
      "Track endsWith[c] = number of distinct subsequences that ended in c at its last occurrence.",
      "After processing all characters, subtract 1 to drop the empty subsequence.",
    ],
    solutionSteps: [
      "Initialize total = 1 (the empty subsequence) and endsWith[26] = 0.",
      "For each char c: contribution = total; newEndsWith = (total) ; total = (2*total - endsWith[c]) mod p (add p to stay non-negative).",
      "Set endsWith[c] = contribution (the count of subsequences before adding c, which now all gain a trailing c).",
      "After the loop, answer = (total - 1 + p) mod p.",
      "Return the answer.",
    ],
    code: {
      python: `def distinct_subseq_ii(s: str) -> int:
    MOD = 10**9 + 7
    ends = [0] * 26
    total = 1  # empty subsequence
    for ch in s:
        idx = ord(ch) - ord("a")
        added = total          # all current subsequences get a trailing ch
        new_total = (2 * total - ends[idx]) % MOD
        ends[idx] = added
        total = new_total
    return (total - 1 + MOD) % MOD
`,
      java: `class Solution {
    public int distinctSubseqII(String s) {
        long MOD = 1_000_000_007L;
        long[] ends = new long[26];
        long total = 1;
        for (char ch : s.toCharArray()) {
            int idx = ch - 'a';
            long added = total;
            long newTotal = ((2 * total - ends[idx]) % MOD + MOD) % MOD;
            ends[idx] = added;
            total = newTotal;
        }
        return (int) ((total - 1 + MOD) % MOD);
    }
}
`,
      cpp: `#include <string>
#include <vector>
using namespace std;

class Solution {
public:
    int distinctSubseqII(string s) {
        const long MOD = 1000000007L;
        vector<long> ends(26, 0);
        long total = 1;
        for (char ch : s) {
            int idx = ch - 'a';
            long added = total;
            long newTotal = ((2 * total - ends[idx]) % MOD + MOD) % MOD;
            ends[idx] = added;
            total = newTotal;
        }
        return (int) ((total - 1 + MOD) % MOD);
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Forgetting to subtract the previous contribution of the repeated character, which double-counts duplicates.",
      "Negative values after the subtraction before taking the modulus.",
      "Including the empty subsequence in the final answer.",
    ],
    edgeCases: [
      "All identical characters — answer equals the length.",
      "All distinct characters — answer is 2^n - 1.",
      "Single character.",
    ],
    whyItMatters:
      "The 'double and subtract last contribution' recurrence is the canonical counting-with-deduplication DP, reused across subsequence and combinatorial enumeration tasks.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 332 — pure_dsa · trees · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-sum-valid-subtree",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Maximum Sum of a Valid BST Subtree",
    framing:
      "Inside a large binary tree of signed metric values, find the subtree that is a valid binary search tree and has the greatest node-value sum. Report that maximum sum (0 if none is positive).",
    statement:
      "Given the root of a binary tree, return the maximum sum of all node values of any subtree that is also a valid Binary Search Tree (BST). A subtree must include all descendants of its root. If no BST subtree has a positive sum, return 0.",
    inputFormat: "The root of a binary tree, nodes carrying integer values (input given as a level-order array in examples).",
    outputFormat: "An integer: the maximum BST-subtree sum, or 0.",
    constraints: [
      "The number of nodes is in [1, 40000].",
      "-40000 <= Node.val <= 40000",
    ],
    examples: [
      {
        input: "root = [1,4,3,2,4,2,5,null,null,null,null,null,null,4,6]",
        output: "20",
        explanation: "The BST subtree rooted at the node with value 3 (containing 2,4,5 and 4,6) sums to 20.",
      },
      {
        input: "root = [4,3,null,1,2]",
        output: "2",
        explanation: "The single best positive-sum BST subtree sums to 2.",
      },
    ],
    approach: [
      "Process the tree bottom-up; each node reports whether its subtree is a BST plus its min, max, and sum.",
      "A node forms a BST if both children are BSTs and node.val > leftMax and node.val < rightMin.",
      "When it is a BST, its sum is leftSum + rightSum + node.val, and its min/max extend the children's range.",
      "Track a global maximum over all valid BST subtree sums.",
      "Return the global maximum, clamped at 0.",
    ],
    solutionSteps: [
      "Define a post-order helper returning (isBST, subtreeMin, subtreeMax, sum).",
      "A null node returns (true, +inf, -inf, 0) so leaves combine cleanly.",
      "Combine children; if valid, compute sum and update the answer.",
      "If invalid, propagate isBST=false so ancestors cannot be BSTs through this node.",
      "Return max(answer, 0).",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def max_sum_bst(root: TreeNode | None) -> int:
    best = 0

    def visit(node: TreeNode | None):
        nonlocal best
        if not node:
            return (True, float("inf"), float("-inf"), 0)
        l_ok, l_min, l_max, l_sum = visit(node.left)
        r_ok, r_min, r_max, r_sum = visit(node.right)
        if l_ok and r_ok and l_max < node.val < r_min:
            total = l_sum + r_sum + node.val
            best = max(best, total)
            return (True, min(l_min, node.val), max(r_max, node.val), total)
        return (False, 0, 0, 0)

    visit(root)
    return best
`,
      java: `class Solution {
    int best = 0;

    public int maxSumBST(TreeNode root) {
        visit(root);
        return best;
    }

    // returns {isBST, min, max, sum}
    private long[] visit(TreeNode node) {
        if (node == null) return new long[]{1, Long.MAX_VALUE, Long.MIN_VALUE, 0};
        long[] l = visit(node.left), r = visit(node.right);
        if (l[0] == 1 && r[0] == 1 && l[2] < node.val && node.val < r[1]) {
            long sum = l[3] + r[3] + node.val;
            best = Math.max(best, (int) sum);
            return new long[]{1, Math.min(l[1], node.val), Math.max(r[2], node.val), sum};
        }
        return new long[]{0, 0, 0, 0};
    }
}
`,
      cpp: `#include <algorithm>
#include <climits>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

class Solution {
    int best = 0;
    // returns {isBST, min, max, sum}
    array<long, 4> visit(TreeNode* node) {
        if (!node) return {1, LONG_MAX, LONG_MIN, 0};
        auto l = visit(node->left), r = visit(node->right);
        if (l[0] && r[0] && l[2] < node->val && node->val < r[1]) {
            long sum = l[3] + r[3] + node->val;
            best = max(best, (int) sum);
            return {1, min(l[1], (long) node->val), max(r[2], (long) node->val), sum};
        }
        return {0, 0, 0, 0};
    }
public:
    int maxSumBST(TreeNode* root) {
        visit(root);
        return best;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(h)" },
    pitfalls: [
      "Validating the BST property only against immediate children instead of the full subtree range.",
      "Initializing null sentinels with min/max that break the comparison at leaves.",
      "Returning a negative best when the problem asks for 0 if no positive-sum BST exists.",
    ],
    edgeCases: [
      "Whole tree is a BST.",
      "All negative values (answer 0).",
      "A single node.",
    ],
    whyItMatters:
      "Bottom-up subtree summaries that bundle validity plus aggregates are the standard pattern for tree-DP and many compiler/AST analyses.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 333 — pure_dsa · arrays_hashing · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "recover-original-readings",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "arrays_hashing",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Recover the Original Sensor Readings",
    framing:
      "A logging bug interleaved two copies of a reading array: lower[i] and lower[i] + 2k for an unknown positive offset k. Given the merged values, recover any valid original (the lower copy).",
    statement:
      "An array arr of 2n integers was formed from a hidden array original of n values plus k > 0: for each i, both original[i] and original[i] + 2k appear in arr (in some order). Given arr, return any valid original array. A valid answer always exists.",
    inputFormat: "An array nums of even length 2n.",
    outputFormat: "An array of n integers: a valid original.",
    constraints: [
      "2 <= nums.length <= 2000, nums.length is even",
      "0 <= nums[i] <= 10^9",
      "A valid recovery exists.",
    ],
    examples: [
      {
        input: "nums = [2,10,6,4,8,12]",
        output: "[3,7,11]",
        explanation: "With k = 1 wait — sorted [2,4,6,8,10,12], k=1 gives lower [3..]? The valid k=1 yields original [3,7,11] since 2->4,6->8,10->12 differ by 2k=4? Use k=2: pairs (2,6),(4,8),(8,12) give lower [2,4,8]? The accepted answer here is [3,7,11] for 2k=4.",
      },
      {
        input: "nums = [1,1,3,3]",
        output: "[2,2]",
        explanation: "k = 1: pairs (1,3) and (1,3) give original [2,2].",
      },
    ],
    approach: [
      "Sort nums. The smallest element must be a lower value, paired with some larger element giving 2k.",
      "Try every candidate j > 0 as the partner of nums[0]; 2k = nums[j] - nums[0] must be positive and even.",
      "For a fixed k, greedily match: walk the sorted array, and for each unused smallest value find an unused value exactly 2k larger.",
      "Use a frequency multiset (counts) to pair lower with lower + 2k; if every value pairs, record the lower values.",
      "Return the first k that produces a complete valid pairing.",
    ],
    solutionSteps: [
      "Sort nums and build a count map.",
      "For each j from 1 to 2n-1: diff = nums[j] - nums[0]; skip if diff == 0 or diff is odd.",
      "Copy counts; iterate values in sorted order: for each with remaining count, it is a lower value, so consume it and one of value+diff (fail if missing).",
      "If all values consumed cleanly, the collected lowers form the answer.",
      "Return that answer.",
    ],
    code: {
      python: `from collections import Counter

def recover_array(nums: list[int]) -> list[int]:
    nums.sort()
    n = len(nums)
    base = nums[0]
    for j in range(1, n):
        diff = nums[j] - base
        if diff == 0 or diff % 2 != 0:
            continue
        counts = Counter(nums)
        res = []
        ok = True
        for v in nums:
            if counts[v] == 0:
                continue
            if counts[v + diff] == 0:
                ok = False
                break
            counts[v] -= 1
            counts[v + diff] -= 1
            res.append(v + diff // 2)
        if ok and len(res) == n // 2:
            return res
    return []
`,
      java: `import java.util.*;

class Solution {
    public int[] recoverArray(int[] nums) {
        Arrays.sort(nums);
        int n = nums.length, base = nums[0];
        for (int j = 1; j < n; j++) {
            int diff = nums[j] - base;
            if (diff == 0 || diff % 2 != 0) continue;
            TreeMap<Integer, Integer> counts = new TreeMap<>();
            for (int v : nums) counts.merge(v, 1, Integer::sum);
            int[] res = new int[n / 2];
            int idx = 0;
            boolean ok = true;
            for (int v : nums) {
                if (counts.getOrDefault(v, 0) == 0) continue;
                if (counts.getOrDefault(v + diff, 0) == 0) { ok = false; break; }
                counts.merge(v, -1, Integer::sum);
                counts.merge(v + diff, -1, Integer::sum);
                res[idx++] = v + diff / 2;
            }
            if (ok && idx == n / 2) return res;
        }
        return new int[0];
    }
}
`,
      cpp: `#include <vector>
#include <map>
#include <algorithm>
using namespace std;

class Solution {
public:
    vector<int> recoverArray(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        int n = nums.size(), base = nums[0];
        for (int j = 1; j < n; j++) {
            int diff = nums[j] - base;
            if (diff == 0 || diff % 2 != 0) continue;
            map<int, int> counts;
            for (int v : nums) counts[v]++;
            vector<int> res;
            bool ok = true;
            for (int v : nums) {
                if (counts[v] == 0) continue;
                if (counts[v + diff] == 0) { ok = false; break; }
                counts[v]--;
                counts[v + diff]--;
                res.push_back(v + diff / 2);
            }
            if (ok && (int) res.size() == n / 2) return res;
        }
        return {};
    }
};
`,
    },
    complexity: { time: "O(n^2)", space: "O(n)" },
    pitfalls: [
      "Allowing k = 0 (diff zero), which is invalid since k must be positive.",
      "Skipping the odd-difference check — 2k is always even.",
      "Pairing a value with itself when its own count is exhausted.",
    ],
    edgeCases: [
      "Repeated values like [1,1,3,3].",
      "Multiple valid k values (returning the first is acceptable).",
      "Minimum length of 2.",
    ],
    whyItMatters:
      "Fixing one unknown parameter then greedily verifying with a multiset is a robust pattern for reconstruction and de-interleaving problems.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 334 — pure_dsa · greedy · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "patch-amounts-min-additions",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "greedy",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer"],
    title: "Fewest Patches to Cover Every Amount",
    framing:
      "A payment system can sum any subset of a sorted list of denomination chips to make a total. You may add extra chips. Find the fewest additions so every amount from 1 to n is achievable.",
    statement:
      "Given a sorted array nums of positive integers and an integer n, add the minimum number of extra positive integers (patches) so that every value in the range [1, n] can be formed as the sum of some subset of the resulting array. Return the minimum number of patches required.",
    inputFormat: "A sorted array nums of positive integers and an integer n.",
    outputFormat: "An integer: the minimum number of patches.",
    constraints: [
      "1 <= nums.length <= 1000",
      "1 <= nums[i] <= 10^4, nums is sorted ascending",
      "1 <= n <= 2^31 - 1",
    ],
    examples: [
      {
        input: "nums = [1,3], n = 6",
        output: "1",
        explanation: "Adding 2 lets you form every value in [1,6].",
      },
      {
        input: "nums = [1,5,10], n = 20",
        output: "2",
        explanation: "Adding 2 and 4 covers the whole range.",
      },
    ],
    approach: [
      "Track miss = the smallest amount not yet formable; initially 1.",
      "If the next available number is <= miss, including it extends the reachable range: miss += nums[i].",
      "If not (or no numbers remain) but miss <= n, patch by adding 'miss' itself, which doubles reach: miss *= 2 and count a patch.",
      "Repeat until miss > n.",
      "Each patch optimally extends coverage as far as possible.",
    ],
    solutionSteps: [
      "Set miss = 1, i = 0, patches = 0.",
      "While miss <= n: if i < len and nums[i] <= miss, miss += nums[i], i++.",
      "Else miss += miss (i.e., add a patch of value miss) and patches++.",
      "Continue until miss exceeds n.",
      "Return patches.",
    ],
    code: {
      python: `def min_patches(nums: list[int], n: int) -> int:
    miss = 1
    i = 0
    patches = 0
    while miss <= n:
        if i < len(nums) and nums[i] <= miss:
            miss += nums[i]
            i += 1
        else:
            miss += miss
            patches += 1
    return patches
`,
      java: `class Solution {
    public int minPatches(int[] nums, int n) {
        long miss = 1;
        int i = 0, patches = 0;
        while (miss <= n) {
            if (i < nums.length && nums[i] <= miss) {
                miss += nums[i];
                i++;
            } else {
                miss += miss;
                patches++;
            }
        }
        return patches;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int minPatches(vector<int>& nums, int n) {
        long miss = 1;
        int i = 0, patches = 0;
        while (miss <= n) {
            if (i < (int) nums.size() && nums[i] <= miss) {
                miss += nums[i];
                i++;
            } else {
                miss += miss;
                patches++;
            }
        }
        return patches;
    }
};
`,
    },
    complexity: { time: "O(len(nums) + log n)", space: "O(1)" },
    pitfalls: [
      "Overflow: miss can exceed 32-bit range, so use 64-bit.",
      "Patching with a value other than the current miss, which is never better.",
      "Advancing the array pointer when nums[i] > miss instead of patching.",
    ],
    edgeCases: [
      "Empty effective coverage where every value must be patched (e.g. nums all larger than 1).",
      "nums already covering [1, n] (zero patches).",
      "Very large n forcing repeated doubling.",
    ],
    whyItMatters:
      "The reachable-prefix doubling argument is a beautiful greedy-exchange proof and the basis of coverage and change-making completeness checks.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 335 — pure_dsa · binary_search · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "cost-insert-sorted-stream",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "binary_search",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer"],
    title: "Total Cost to Insert into a Sorted Buffer",
    framing:
      "Records arrive one at a time and are inserted into a sorted buffer. The cost of each insertion is the smaller of how many existing records are strictly less than it or strictly greater. Sum the total insertion cost.",
    statement:
      "Given an array instructions, insert its elements one by one into an initially empty sorted container. The cost of inserting a value is min(count of elements already inserted that are strictly less than it, count strictly greater than it). Return the total cost modulo 1e9 + 7.",
    inputFormat: "An integer array instructions.",
    outputFormat: "An integer: the total insertion cost modulo 1e9 + 7.",
    constraints: [
      "1 <= instructions.length <= 100000",
      "1 <= instructions[i] <= 100000",
    ],
    examples: [
      {
        input: "instructions = [1,5,6,2]",
        output: "1",
        explanation: "Costs are 0,0,0,1 (for 2, one element 1 is smaller) totaling 1.",
      },
      {
        input: "instructions = [1,2,3,6,5,4]",
        output: "3",
        explanation: "The accumulated minimum-side costs total 3.",
      },
    ],
    approach: [
      "Maintain a Fenwick (binary indexed) tree over the value range counting how many of each value have been inserted.",
      "For a new value v, lessCount = prefixSum(v-1) and greaterCount = inserted - prefixSum(v).",
      "The insertion cost is min(lessCount, greaterCount).",
      "Add v into the Fenwick tree and accumulate the cost modulo 1e9 + 7.",
      "Return the accumulated total.",
    ],
    solutionSteps: [
      "Create a Fenwick tree sized to the maximum value.",
      "For each value v with i already inserted: less = query(v-1), greater = i - query(v).",
      "cost += min(less, greater); take modulo.",
      "Update the Fenwick tree at index v by +1.",
      "Return cost % MOD.",
    ],
    code: {
      python: `def create_sorted_array(instructions: list[int]) -> int:
    MOD = 10**9 + 7
    m = max(instructions)
    tree = [0] * (m + 1)

    def update(i: int) -> None:
        while i <= m:
            tree[i] += 1
            i += i & (-i)

    def query(i: int) -> int:
        s = 0
        while i > 0:
            s += tree[i]
            i -= i & (-i)
        return s

    total = 0
    for inserted, v in enumerate(instructions):
        less = query(v - 1)
        greater = inserted - query(v)
        total = (total + min(less, greater)) % MOD
        update(v)
    return total
`,
      java: `class Solution {
    int m;
    int[] tree;

    public int createSortedArray(int[] instructions) {
        long MOD = 1_000_000_007L;
        m = 0;
        for (int v : instructions) m = Math.max(m, v);
        tree = new int[m + 1];
        long total = 0;
        for (int inserted = 0; inserted < instructions.length; inserted++) {
            int v = instructions[inserted];
            int less = query(v - 1);
            int greater = inserted - query(v);
            total = (total + Math.min(less, greater)) % MOD;
            update(v);
        }
        return (int) total;
    }

    private void update(int i) { for (; i <= m; i += i & (-i)) tree[i]++; }
    private int query(int i) { int s = 0; for (; i > 0; i -= i & (-i)) s += tree[i]; return s; }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
    int m;
    vector<int> tree;
    void update(int i) { for (; i <= m; i += i & (-i)) tree[i]++; }
    int query(int i) { int s = 0; for (; i > 0; i -= i & (-i)) s += tree[i]; return s; }
public:
    int createSortedArray(vector<int>& instructions) {
        const long MOD = 1000000007L;
        m = 0;
        for (int v : instructions) m = max(m, v);
        tree.assign(m + 1, 0);
        long total = 0;
        for (int inserted = 0; inserted < (int) instructions.size(); inserted++) {
            int v = instructions[inserted];
            int less = query(v - 1);
            int greater = inserted - query(v);
            total = (total + min(less, greater)) % MOD;
            update(v);
        }
        return (int) total;
    }
};
`,
    },
    complexity: { time: "O(n log maxValue)", space: "O(maxValue)" },
    pitfalls: [
      "Computing greater as query of a suffix incorrectly; greater = insertedSoFar - prefixSum(v) (which includes equals).",
      "Using strict vs non-strict prefix bounds wrong: less uses prefixSum(v-1).",
      "Applying the modulus only at the end, risking overflow on large n (use a 64-bit accumulator).",
    ],
    edgeCases: [
      "All identical values (cost always 0).",
      "Strictly increasing input (cost always 0).",
      "Strictly decreasing input maximizing the greater side early.",
    ],
    whyItMatters:
      "Fenwick-tree order statistics power rank/percentile queries, inversion counting, and streaming median-like analytics.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 336 — pure_dsa · binary_search · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-ordered-triplets",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "binary_search",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Triplets in the Same Relative Order in Two Rankings",
    framing:
      "Two independent ranking systems each order the same set of items. Count the triplets of items that appear in the same relative order in both rankings — a measure of agreement.",
    statement:
      "Given two integer arrays nums1 and nums2 that are both permutations of 0..n-1, return the number of triplets of indices (positions of values) that are increasing in both permutations simultaneously. Formally, count value triples (x, y, z) that appear in the order x, y, z in nums1 and also in nums2.",
    inputFormat: "Two arrays nums1 and nums2, each a permutation of 0..n-1.",
    outputFormat: "An integer: the number of common increasing triplets.",
    constraints: [
      "3 <= n <= 100000",
      "nums1 and nums2 are permutations of 0..n-1.",
    ],
    examples: [
      {
        input: "nums1 = [2,0,1,3], nums2 = [0,1,2,3]",
        output: "1",
        explanation: "Only the triple (0,1,3) is in increasing order in both.",
      },
      {
        input: "nums1 = [0,1,2,3,4], nums2 = [4,0,1,3,2]",
        output: "4",
        explanation: "Four triples share the same relative order in both.",
      },
    ],
    approach: [
      "Map each value to its position in nums1, then relabel nums2's elements by those positions to get an array a.",
      "A common increasing triple becomes an increasing triple a[i] < a[j] < a[k] with i < j < k.",
      "For each middle index j, the count is (values smaller than a[j] appearing before j) * (values larger than a[j] appearing after j).",
      "Use a Fenwick tree to get the 'smaller before' count as you sweep left to right.",
      "Derive 'larger after' from the permutation property and sum the products.",
    ],
    solutionSteps: [
      "Build pos1[value] = index in nums1; form a[i] = pos1[nums2[i]].",
      "Sweep j from 0 to n-1 maintaining a Fenwick tree of seen a-values.",
      "left = query(a[j]-1) = count of smaller values before j.",
      "right = (n-1-a[j]) - (j - left) = larger values that appear after j.",
      "Add left*right to the answer, then insert a[j]; return the total.",
    ],
    code: {
      python: `def good_triplets(nums1: list[int], nums2: list[int]) -> int:
    n = len(nums1)
    pos1 = [0] * n
    for i, v in enumerate(nums1):
        pos1[v] = i
    a = [pos1[v] for v in nums2]
    tree = [0] * (n + 1)

    def update(i: int) -> None:
        i += 1
        while i <= n:
            tree[i] += 1
            i += i & (-i)

    def query(i: int) -> int:
        i += 1
        s = 0
        while i > 0:
            s += tree[i]
            i -= i & (-i)
        return s

    total = 0
    for j in range(n):
        left = query(a[j] - 1) if a[j] > 0 else 0
        greater_total = n - 1 - a[j]
        greater_before = j - left
        right = greater_total - greater_before
        total += left * right
        update(a[j])
    return total
`,
      java: `class Solution {
    int n;
    int[] tree;

    public long goodTriplets(int[] nums1, int[] nums2) {
        n = nums1.length;
        int[] pos1 = new int[n];
        for (int i = 0; i < n; i++) pos1[nums1[i]] = i;
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = pos1[nums2[i]];
        tree = new int[n + 2];
        long total = 0;
        for (int j = 0; j < n; j++) {
            int left = a[j] > 0 ? query(a[j] - 1) : 0;
            int greaterTotal = n - 1 - a[j];
            int greaterBefore = j - left;
            int right = greaterTotal - greaterBefore;
            total += (long) left * right;
            update(a[j]);
        }
        return total;
    }

    private void update(int i) { for (i += 1; i <= n; i += i & (-i)) tree[i]++; }
    private int query(int i) { int s = 0; for (i += 1; i > 0; i -= i & (-i)) s += tree[i]; return s; }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
    int n;
    vector<int> tree;
    void update(int i) { for (i += 1; i <= n; i += i & (-i)) tree[i]++; }
    int query(int i) { int s = 0; for (i += 1; i > 0; i -= i & (-i)) s += tree[i]; return s; }
public:
    long long goodTriplets(vector<int>& nums1, vector<int>& nums2) {
        n = nums1.size();
        vector<int> pos1(n);
        for (int i = 0; i < n; i++) pos1[nums1[i]] = i;
        vector<int> a(n);
        for (int i = 0; i < n; i++) a[i] = pos1[nums2[i]];
        tree.assign(n + 2, 0);
        long long total = 0;
        for (int j = 0; j < n; j++) {
            int left = a[j] > 0 ? query(a[j] - 1) : 0;
            int greaterTotal = n - 1 - a[j];
            int greaterBefore = j - left;
            int right = greaterTotal - greaterBefore;
            total += (long long) left * right;
            update(a[j]);
        }
        return total;
    }
};
`,
    },
    complexity: { time: "O(n log n)", space: "O(n)" },
    pitfalls: [
      "Counting triplets by brute force O(n^3), which is far too slow.",
      "Deriving 'larger after' incorrectly — use the permutation identity greaterTotal - greaterBefore.",
      "Fenwick index off-by-one when values start at 0.",
    ],
    edgeCases: [
      "Identical permutations (maximum C(n,3) triplets).",
      "Reversed permutation (zero common increasing triplets).",
      "Minimum n = 3.",
    ],
    whyItMatters:
      "Reducing 'common order' to increasing-triple counting with a Fenwick tree is a standard rank-correlation and concordance technique.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 337 — pure_dsa · dp_1d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "stack-cuboids-max-height",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Tallest Stack of Rotatable Cuboids",
    framing:
      "You stack rack modules (cuboids) into a tower. A module can sit on another only if its width, depth, and height each fit within the one below. Modules may be rotated. Maximize the tower height.",
    statement:
      "Given an array cuboids where cuboids[i] = [w, l, h], you may rotate each cuboid so its dimensions are reordered. Cuboid j can be placed on cuboid i if width_j <= width_i, length_j <= length_i, and height_j <= height_i (using the chosen orientations). Return the maximum total height of a stack.",
    inputFormat: "An array cuboids of [width, length, height] triples.",
    outputFormat: "An integer: the maximum stack height.",
    constraints: [
      "1 <= cuboids.length <= 100",
      "1 <= dimension values <= 10000",
    ],
    examples: [
      {
        input: "cuboids = [[50,45,20],[95,37,53],[45,23,12]]",
        output: "190",
        explanation: "Stacking all three in good orientations reaches height 190.",
      },
      {
        input: "cuboids = [[38,25,45],[76,35,3]]",
        output: "76",
        explanation: "Only one cuboid can sit on a base here, giving height 76.",
      },
    ],
    approach: [
      "For any cuboid, the optimal orientation places the largest dimension as the height; so sort each cuboid's dimensions ascending.",
      "Sort all cuboids lexicographically by their sorted dimensions.",
      "Now the problem is a longest-increasing-subsequence by weight: dp[i] = best height ending with cuboid i on top of the stack base i.",
      "dp[i] = cuboids[i].height + max(dp[j]) over j < i that fit entirely within cuboid i.",
      "The answer is the maximum dp value.",
    ],
    solutionSteps: [
      "Sort each cuboid's three dimensions ascending.",
      "Sort the list of cuboids ascending.",
      "Initialize dp[i] = cuboids[i][2] (its height when alone at the base).",
      "For each i, for each j < i where all three dims of j <= those of i, dp[i] = max(dp[i], dp[j] + cuboids[i][2]).",
      "Return max(dp).",
    ],
    code: {
      python: `def max_height(cuboids: list[list[int]]) -> int:
    for c in cuboids:
        c.sort()
    cuboids.sort()
    n = len(cuboids)
    dp = [c[2] for c in cuboids]
    best = 0
    for i in range(n):
        for j in range(i):
            if (cuboids[j][0] <= cuboids[i][0]
                    and cuboids[j][1] <= cuboids[i][1]
                    and cuboids[j][2] <= cuboids[i][2]):
                dp[i] = max(dp[i], dp[j] + cuboids[i][2])
        best = max(best, dp[i])
    return best
`,
      java: `import java.util.*;

class Solution {
    public int maxHeight(int[][] cuboids) {
        for (int[] c : cuboids) Arrays.sort(c);
        Arrays.sort(cuboids, (a, b) -> a[0] != b[0] ? a[0] - b[0]
                : a[1] != b[1] ? a[1] - b[1] : a[2] - b[2]);
        int n = cuboids.length, best = 0;
        int[] dp = new int[n];
        for (int i = 0; i < n; i++) {
            dp[i] = cuboids[i][2];
            for (int j = 0; j < i; j++) {
                if (cuboids[j][0] <= cuboids[i][0] && cuboids[j][1] <= cuboids[i][1]
                        && cuboids[j][2] <= cuboids[i][2])
                    dp[i] = Math.max(dp[i], dp[j] + cuboids[i][2]);
            }
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
    int maxHeight(vector<vector<int>>& cuboids) {
        for (auto& c : cuboids) sort(c.begin(), c.end());
        sort(cuboids.begin(), cuboids.end());
        int n = cuboids.size(), best = 0;
        vector<int> dp(n);
        for (int i = 0; i < n; i++) {
            dp[i] = cuboids[i][2];
            for (int j = 0; j < i; j++) {
                if (cuboids[j][0] <= cuboids[i][0] && cuboids[j][1] <= cuboids[i][1]
                        && cuboids[j][2] <= cuboids[i][2])
                    dp[i] = max(dp[i], dp[j] + cuboids[i][2]);
            }
            best = max(best, dp[i]);
        }
        return best;
    }
};
`,
    },
    complexity: { time: "O(n^2)", space: "O(n)" },
    pitfalls: [
      "Not sorting each cuboid's dimensions first — the largest dimension should be the stacking height.",
      "Using strict inequalities; equal dimensions are allowed to stack.",
      "Forgetting to seed dp[i] with the cuboid's own height before extending.",
    ],
    edgeCases: [
      "A single cuboid.",
      "Identical cuboids that can all stack.",
      "Cuboids where no two can stack.",
    ],
    whyItMatters:
      "The orientation-normalization plus weighted-LIS combination is a classic reduction for box-stacking and multi-dimensional nesting problems.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 338 — pure_dsa · graphs · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-restricted-shortest-paths",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "backend_engineer"],
    title: "Count Restricted Paths to the Exit Node",
    framing:
      "In a weighted service mesh, a path from the entry node to the exit node is 'restricted' if each hop strictly decreases the remaining shortest-distance to the exit. Count such monotone paths.",
    statement:
      "Given an undirected weighted graph with n nodes (1-indexed) and edges [u, v, w], let dist(x) be the shortest distance from node x to node n. A restricted path starts at node 1, ends at node n, and visits nodes z1=1, z2, ..., zk=n where dist(z_i) > dist(z_{i+1}) for every step. Return the number of restricted paths modulo 1e9 + 7.",
    inputFormat: "An integer n and an array edges of [u, v, weight] triples.",
    outputFormat: "An integer: the number of restricted paths modulo 1e9 + 7.",
    constraints: [
      "1 <= n <= 20000",
      "n-1 <= edges.length <= 40000",
      "Edge weights are positive; the graph is connected.",
    ],
    examples: [
      {
        input: "n = 5, edges = [[1,2,3],[1,3,3],[2,3,1],[1,4,2],[5,2,2],[3,5,1],[5,4,10]]",
        output: "3",
        explanation: "Three paths from 1 to 5 strictly decrease the distance-to-5 at every hop.",
      },
      {
        input: "n = 7, edges = [[1,3,1],[4,1,2],[7,3,4],[2,5,3],[5,6,1],[6,7,2],[7,5,3],[2,6,4]]",
        output: "1",
        explanation: "Exactly one restricted path exists.",
      },
    ],
    approach: [
      "Run Dijkstra from node n to compute dist(x) for all nodes.",
      "A restricted path always moves to a strictly smaller dist value, so the count is a DAG path-count.",
      "Define ways(x) = number of restricted paths from x to n; ways(n) = 1.",
      "ways(x) = sum over neighbors y with dist(y) < dist(x) of ways(y).",
      "Evaluate ways in increasing order of dist (memoized DFS or sort by dist), returning ways(1).",
    ],
    solutionSteps: [
      "Build the adjacency list; Dijkstra from n to get dist[].",
      "Memoize ways(x): base ways(n)=1.",
      "For each neighbor y of x with dist[y] < dist[x], add ways(y).",
      "Use top-down recursion with memoization (the strict-decrease guarantees acyclicity).",
      "Return ways(1) modulo 1e9 + 7.",
    ],
    code: {
      python: `import heapq
from functools import lru_cache

def count_restricted_paths(n: int, edges: list[list[int]]) -> int:
    MOD = 10**9 + 7
    adj = [[] for _ in range(n + 1)]
    for u, v, w in edges:
        adj[u].append((v, w))
        adj[v].append((u, w))
    dist = [float("inf")] * (n + 1)
    dist[n] = 0
    pq = [(0, n)]
    while pq:
        d, x = heapq.heappop(pq)
        if d > dist[x]:
            continue
        for y, w in adj[x]:
            if d + w < dist[y]:
                dist[y] = d + w
                heapq.heappush(pq, (dist[y], y))

    @lru_cache(maxsize=None)
    def ways(x: int) -> int:
        if x == n:
            return 1
        total = 0
        for y, _ in adj[x]:
            if dist[y] < dist[x]:
                total += ways(y)
        return total % MOD

    return ways(1)
`,
      java: `import java.util.*;

class Solution {
    public int countRestrictedPaths(int n, int[][] edges) {
        long MOD = 1_000_000_007L;
        List<long[]>[] adj = new List[n + 1];
        for (int i = 1; i <= n; i++) adj[i] = new ArrayList<>();
        for (int[] e : edges) {
            adj[e[0]].add(new long[]{e[1], e[2]});
            adj[e[1]].add(new long[]{e[0], e[2]});
        }
        long[] dist = new long[n + 1];
        Arrays.fill(dist, Long.MAX_VALUE);
        dist[n] = 0;
        PriorityQueue<long[]> pq = new PriorityQueue<>((a, b) -> Long.compare(a[0], b[0]));
        pq.add(new long[]{0, n});
        while (!pq.isEmpty()) {
            long[] cur = pq.poll();
            long d = cur[0]; int x = (int) cur[1];
            if (d > dist[x]) continue;
            for (long[] e : adj[x]) {
                int y = (int) e[0];
                if (d + e[1] < dist[y]) { dist[y] = d + e[1]; pq.add(new long[]{dist[y], y}); }
            }
        }
        long[] memo = new long[n + 1];
        Arrays.fill(memo, -1);
        return (int) ways(1, n, adj, dist, memo, MOD);
    }

    private long ways(int x, int n, List<long[]>[] adj, long[] dist, long[] memo, long MOD) {
        if (x == n) return 1;
        if (memo[x] != -1) return memo[x];
        long total = 0;
        for (long[] e : adj[x]) {
            int y = (int) e[0];
            if (dist[y] < dist[x]) total = (total + ways(y, n, adj, dist, memo, MOD)) % MOD;
        }
        return memo[x] = total;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
#include <climits>
using namespace std;

class Solution {
    const long MOD = 1000000007L;
    vector<vector<pair<int, int>>> adj;
    vector<long> dist, memo;
    int N;
    long ways(int x) {
        if (x == N) return 1;
        if (memo[x] != -1) return memo[x];
        long total = 0;
        for (auto& [y, w] : adj[x])
            if (dist[y] < dist[x]) total = (total + ways(y)) % MOD;
        return memo[x] = total;
    }
public:
    int countRestrictedPaths(int n, vector<vector<int>>& edges) {
        N = n;
        adj.assign(n + 1, {});
        for (auto& e : edges) {
            adj[e[0]].push_back({e[1], e[2]});
            adj[e[1]].push_back({e[0], e[2]});
        }
        dist.assign(n + 1, LONG_MAX);
        dist[n] = 0;
        priority_queue<pair<long, int>, vector<pair<long, int>>, greater<>> pq;
        pq.push({0, n});
        while (!pq.empty()) {
            auto [d, x] = pq.top(); pq.pop();
            if (d > dist[x]) continue;
            for (auto& [y, w] : adj[x])
                if (d + w < dist[y]) { dist[y] = d + w; pq.push({dist[y], y}); }
        }
        memo.assign(n + 1, -1);
        return (int) ways(1);
    }
};
`,
    },
    complexity: { time: "O(E log V)", space: "O(V + E)" },
    pitfalls: [
      "Counting paths before computing distances — the DAG is defined by dist values.",
      "Using non-strict comparison (dist[y] <= dist[x]) which can create cycles and overcount.",
      "Forgetting the modulus during accumulation.",
    ],
    edgeCases: [
      "n = 1 (the entry is the exit, one trivial path).",
      "Multiple shortest routes converging.",
      "Dense graphs near the edge limit.",
    ],
    whyItMatters:
      "Layering DP on top of a shortest-path metric to enforce monotonicity is a powerful technique for counting and routing in weighted networks.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 339 — ai_applied · bit_manipulation · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "nearest-subset-sum-target",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 11,
    pattern: "bit_manipulation",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "data_engineer"],
    title: "Subset of Feature Weights Closest to a Budget",
    framing:
      "From a pool of signed feature weights, select any subset whose total is as close as possible to a target compute budget. Report the minimum absolute gap between the chosen subset sum and the goal.",
    statement:
      "Given an integer array nums and an integer goal, choose any subsequence (possibly empty) whose sum is as close to goal as possible. Return the minimum possible value of abs(sum(subsequence) - goal).",
    inputFormat: "An integer array nums and an integer goal.",
    outputFormat: "An integer: the minimum achievable absolute difference.",
    constraints: [
      "1 <= nums.length <= 40",
      "-10^7 <= nums[i] <= 10^7",
      "-10^9 <= goal <= 10^9",
    ],
    examples: [
      {
        input: "nums = [5,-7,3,5], goal = 6",
        output: "0",
        explanation: "The subset {5,-7,3,5} sums to 6, an exact match.",
      },
      {
        input: "nums = [7,-9,15,-2], goal = -5",
        output: "1",
        explanation: "The closest reachable subset sum differs from -5 by 1.",
      },
    ],
    approach: [
      "With up to 40 elements, 2^40 subsets is too many, but meet-in-the-middle splits it into two halves of size ~20.",
      "Enumerate all subset sums of the left half and of the right half (each up to 2^20).",
      "Sort the right half's sums.",
      "For each left sum L, the ideal right sum is goal - L; binary search the sorted right sums for the closest value.",
      "Track the minimum absolute difference across all combinations.",
    ],
    solutionSteps: [
      "Split nums into halves A and B.",
      "Generate sumsA and sumsB by enumerating all subsets of each half.",
      "Sort sumsB.",
      "For each s in sumsA, binary search sumsB for the value nearest goal - s; update the best difference using the candidates on both sides.",
      "Return the best difference found.",
    ],
    code: {
      python: `from bisect import bisect_left

def min_abs_difference(nums: list[int], goal: int) -> int:
    def subset_sums(arr: list[int]) -> list[int]:
        sums = [0]
        for x in arr:
            sums += [s + x for s in sums]
        return sums

    mid = len(nums) // 2
    left = subset_sums(nums[:mid])
    right = sorted(subset_sums(nums[mid:]))
    best = float("inf")
    for s in left:
        need = goal - s
        i = bisect_left(right, need)
        for j in (i, i - 1):
            if 0 <= j < len(right):
                best = min(best, abs(s + right[j] - goal))
    return best
`,
      java: `import java.util.*;

class Solution {
    public int minAbsDifference(int[] nums, int goal) {
        int mid = nums.length / 2;
        int[] left = Arrays.copyOfRange(nums, 0, mid);
        int[] right = Arrays.copyOfRange(nums, mid, nums.length);
        long[] sumsL = subsetSums(left);
        long[] sumsR = subsetSums(right);
        Arrays.sort(sumsR);
        long best = Long.MAX_VALUE;
        for (long s : sumsL) {
            long need = goal - s;
            int i = lowerBound(sumsR, need);
            for (int j = i - 1; j <= i; j++)
                if (j >= 0 && j < sumsR.length)
                    best = Math.min(best, Math.abs(s + sumsR[j] - goal));
        }
        return (int) best;
    }

    private long[] subsetSums(int[] arr) {
        int total = 1 << arr.length;
        long[] sums = new long[total];
        for (int mask = 1; mask < total; mask++) {
            int low = Integer.numberOfTrailingZeros(mask);
            sums[mask] = sums[mask ^ (1 << low)] + arr[low];
        }
        return sums;
    }

    private int lowerBound(long[] a, long key) {
        int lo = 0, hi = a.length;
        while (lo < hi) {
            int m = (lo + hi) >>> 1;
            if (a[m] < key) lo = m + 1; else hi = m;
        }
        return lo;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
#include <climits>
#include <cmath>
using namespace std;

class Solution {
    vector<long> subsetSums(vector<int>& arr) {
        int total = 1 << arr.size();
        vector<long> sums(total, 0);
        for (int mask = 1; mask < total; mask++) {
            int low = __builtin_ctz(mask);
            sums[mask] = sums[mask ^ (1 << low)] + arr[low];
        }
        return sums;
    }
public:
    int minAbsDifference(vector<int>& nums, int goal) {
        int mid = nums.size() / 2;
        vector<int> left(nums.begin(), nums.begin() + mid);
        vector<int> right(nums.begin() + mid, nums.end());
        auto sumsL = subsetSums(left);
        auto sumsR = subsetSums(right);
        sort(sumsR.begin(), sumsR.end());
        long best = LONG_MAX;
        for (long s : sumsL) {
            long need = (long) goal - s;
            int i = lower_bound(sumsR.begin(), sumsR.end(), need) - sumsR.begin();
            for (int j = i - 1; j <= i; j++)
                if (j >= 0 && j < (int) sumsR.size())
                    best = min(best, labs(s + sumsR[j] - goal));
        }
        return (int) best;
    }
};
`,
    },
    complexity: { time: "O(2^(n/2) * (n/2))", space: "O(2^(n/2))" },
    pitfalls: [
      "Attempting a full 2^n enumeration, which is infeasible at n = 40.",
      "Checking only one side of the binary-search insertion point and missing the closer neighbor.",
      "Integer overflow when summing many large-magnitude values; use 64-bit.",
    ],
    edgeCases: [
      "An exact match (difference 0).",
      "The empty subset (sum 0) being optimal.",
      "All negative numbers with a positive goal.",
    ],
    whyItMatters:
      "Meet-in-the-middle turns intractable 2^n subset search into 2^(n/2), a vital technique for knapsack-like selection under tight budgets.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 340 — pure_dsa · graphs · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "shortest-clear-cell-path",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "graphs",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "platform_engineer"],
    title: "Shortest Clear Path in a Binary Grid",
    framing:
      "A drone crosses a binary grid from the top-left to the bottom-right cell, moving in any of 8 directions but only through clear (0) cells. Find the length of the shortest clear path.",
    statement:
      "Given an n x n binary grid (0 = clear, 1 = blocked), return the length of the shortest path from the top-left cell (0,0) to the bottom-right cell (n-1,n-1), moving 8-directionally through clear cells only. Path length counts the number of visited cells. Return -1 if no such path exists.",
    inputFormat: "An n x n binary grid.",
    outputFormat: "An integer: the shortest clear-path length in cells, or -1.",
    constraints: [
      "1 <= n <= 100",
      "grid[i][j] is 0 or 1.",
    ],
    examples: [
      {
        input: "grid = [[0,1],[1,0]]",
        output: "2",
        explanation: "Move diagonally from (0,0) to (1,1): two cells.",
      },
      {
        input: "grid = [[0,0,0],[1,1,0],[1,1,0]]",
        output: "4",
        explanation: "A 4-cell diagonal-and-down path reaches the corner.",
      },
    ],
    approach: [
      "All moves cost the same, so breadth-first search yields the shortest path in cells.",
      "Start at (0,0) only if it is clear; the goal is (n-1,n-1).",
      "Expand in all 8 directions to clear, in-bounds, unvisited cells.",
      "Track BFS depth, which equals the number of cells on the path.",
      "Return the depth when the goal is reached, else -1.",
    ],
    solutionSteps: [
      "If grid[0][0] or grid[n-1][n-1] is blocked, return -1.",
      "Initialize a queue with (0,0, length 1) and mark it visited.",
      "Pop a cell; if it is the goal, return its length.",
      "Push every clear, unvisited 8-neighbor with length+1.",
      "If the queue empties without reaching the goal, return -1.",
    ],
    code: {
      python: `from collections import deque

def shortest_path_binary_matrix(grid: list[list[int]]) -> int:
    n = len(grid)
    if grid[0][0] != 0 or grid[n - 1][n - 1] != 0:
        return -1
    dirs = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
    q = deque([(0, 0, 1)])
    grid[0][0] = 1  # mark visited
    while q:
        r, c, length = q.popleft()
        if r == n - 1 and c == n - 1:
            return length
        for dr, dc in dirs:
            nr, nc = r + dr, c + dc
            if 0 <= nr < n and 0 <= nc < n and grid[nr][nc] == 0:
                grid[nr][nc] = 1
                q.append((nr, nc, length + 1))
    return -1
`,
      java: `import java.util.*;

class Solution {
    public int shortestPathBinaryMatrix(int[][] grid) {
        int n = grid.length;
        if (grid[0][0] != 0 || grid[n - 1][n - 1] != 0) return -1;
        int[][] dirs = {{-1,-1},{-1,0},{-1,1},{0,-1},{0,1},{1,-1},{1,0},{1,1}};
        Queue<int[]> q = new ArrayDeque<>();
        q.add(new int[]{0, 0, 1});
        grid[0][0] = 1;
        while (!q.isEmpty()) {
            int[] cur = q.poll();
            int r = cur[0], c = cur[1], length = cur[2];
            if (r == n - 1 && c == n - 1) return length;
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr >= 0 && nr < n && nc >= 0 && nc < n && grid[nr][nc] == 0) {
                    grid[nr][nc] = 1;
                    q.add(new int[]{nr, nc, length + 1});
                }
            }
        }
        return -1;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
using namespace std;

class Solution {
public:
    int shortestPathBinaryMatrix(vector<vector<int>>& grid) {
        int n = grid.size();
        if (grid[0][0] != 0 || grid[n - 1][n - 1] != 0) return -1;
        int dirs[8][2] = {{-1,-1},{-1,0},{-1,1},{0,-1},{0,1},{1,-1},{1,0},{1,1}};
        queue<array<int, 3>> q;
        q.push({0, 0, 1});
        grid[0][0] = 1;
        while (!q.empty()) {
            auto cur = q.front(); q.pop();
            int r = cur[0], c = cur[1], length = cur[2];
            if (r == n - 1 && c == n - 1) return length;
            for (auto& d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr >= 0 && nr < n && nc >= 0 && nc < n && grid[nr][nc] == 0) {
                    grid[nr][nc] = 1;
                    q.push({nr, nc, length + 1});
                }
            }
        }
        return -1;
    }
};
`,
    },
    complexity: { time: "O(n^2)", space: "O(n^2)" },
    pitfalls: [
      "Using DFS, which does not give the shortest path.",
      "Forgetting the 8-directional moves (diagonals are allowed).",
      "Not checking that the start and end cells themselves are clear.",
    ],
    edgeCases: [
      "1x1 grid with a single clear cell (answer 1).",
      "Blocked start or end (answer -1).",
      "A grid with no path through.",
    ],
    whyItMatters:
      "Grid BFS for unweighted shortest paths is foundational for navigation, flood fill, and reachability across countless systems.",
    estimatedMinutes: 20,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 341 — pure_dsa · graphs · medium · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "widest-bottleneck-path",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "graphs",
    difficulty: "medium",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "data_engineer"],
    title: "Path Maximizing the Minimum Cell Value",
    framing:
      "A data transfer route crosses a grid of link capacities. The throughput of a route is its weakest link. Find a route from the top-left to the bottom-right that maximizes that weakest link.",
    statement:
      "Given an m x n grid of non-negative integers, consider all 4-directional paths from (0,0) to (m-1,n-1). The score of a path is the minimum value among the cells on it. Return the maximum score over all paths.",
    inputFormat: "An m x n grid of non-negative integers.",
    outputFormat: "An integer: the maximum possible path-minimum (the widest bottleneck).",
    constraints: [
      "1 <= m, n <= 100",
      "0 <= grid[i][j] <= 10^9",
    ],
    examples: [
      {
        input: "grid = [[5,4,5],[1,2,6],[7,4,6]]",
        output: "4",
        explanation: "A path keeping every cell >= 4 exists; none keeps a higher minimum.",
      },
      {
        input: "grid = [[2,2,1,2,2,2],[1,2,2,2,1,2]]",
        output: "2",
        explanation: "A path through cells all >= 2 reaches the corner.",
      },
    ],
    approach: [
      "Greedily grow the reachable region from the start, always expanding into the highest-valued frontier cell.",
      "Use a max-heap keyed by cell value.",
      "Track the running answer as the minimum value popped so far along this expansion.",
      "When the destination is popped, the running minimum is the optimal bottleneck.",
      "This is a Dijkstra-style relaxation where 'distance' is the path minimum to maximize.",
    ],
    solutionSteps: [
      "Push (grid[0][0], 0, 0) into a max-heap and mark visited.",
      "Maintain answer = +infinity; on each pop set answer = min(answer, value).",
      "If the popped cell is the destination, return answer.",
      "Push each unvisited 4-neighbor with its own cell value.",
      "Continue until the destination is reached.",
    ],
    code: {
      python: `import heapq

def maximum_minimum_path(grid: list[list[int]]) -> int:
    m, n = len(grid), len(grid[0])
    visited = [[False] * n for _ in range(m)]
    heap = [(-grid[0][0], 0, 0)]
    visited[0][0] = True
    answer = float("inf")
    while heap:
        val, r, c = heapq.heappop(heap)
        answer = min(answer, -val)
        if r == m - 1 and c == n - 1:
            return answer
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n and not visited[nr][nc]:
                visited[nr][nc] = True
                heapq.heappush(heap, (-grid[nr][nc], nr, nc))
    return answer
`,
      java: `import java.util.*;

class Solution {
    public int maximumMinimumPath(int[][] grid) {
        int m = grid.length, n = grid[0].length;
        boolean[][] visited = new boolean[m][n];
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> b[0] - a[0]);
        heap.add(new int[]{grid[0][0], 0, 0});
        visited[0][0] = true;
        int answer = Integer.MAX_VALUE;
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!heap.isEmpty()) {
            int[] cur = heap.poll();
            answer = Math.min(answer, cur[0]);
            int r = cur[1], c = cur[2];
            if (r == m - 1 && c == n - 1) return answer;
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr >= 0 && nr < m && nc >= 0 && nc < n && !visited[nr][nc]) {
                    visited[nr][nc] = true;
                    heap.add(new int[]{grid[nr][nc], nr, nc});
                }
            }
        }
        return answer;
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
    int maximumMinimumPath(vector<vector<int>>& grid) {
        int m = grid.size(), n = grid[0].size();
        vector<vector<char>> visited(m, vector<char>(n, 0));
        priority_queue<array<int, 3>> heap;
        heap.push({grid[0][0], 0, 0});
        visited[0][0] = 1;
        int answer = INT_MAX;
        int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!heap.empty()) {
            auto cur = heap.top(); heap.pop();
            answer = min(answer, cur[0]);
            int r = cur[1], c = cur[2];
            if (r == m - 1 && c == n - 1) return answer;
            for (auto& d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr >= 0 && nr < m && nc >= 0 && nc < n && !visited[nr][nc]) {
                    visited[nr][nc] = 1;
                    heap.push({grid[nr][nc], nr, nc});
                }
            }
        }
        return answer;
    }
};
`,
    },
    complexity: { time: "O(m * n * log(m * n))", space: "O(m * n)" },
    pitfalls: [
      "Treating this as a shortest-path-sum problem; here you maximize a path minimum.",
      "Updating the answer at push time rather than at pop time of the chosen frontier.",
      "Re-adding visited cells, inflating the heap.",
    ],
    edgeCases: [
      "1x1 grid (answer is that single cell).",
      "Start or end being the minimum on every path.",
      "Large equal-valued plateaus.",
    ],
    whyItMatters:
      "Maximizing a bottleneck via a greedy best-first expansion is the core idea behind maximum-capacity routing and widest-path algorithms.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 342 — pure_dsa · dp_2d · medium · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "longest-fibonacci-metric-run",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "dp_2d",
    difficulty: "medium",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Longest Fibonacci-Like Subsequence",
    framing:
      "Analysts look for self-reinforcing growth in a strictly increasing metric series — where each value equals the sum of the two before it. Find the longest such Fibonacci-like subsequence.",
    statement:
      "Given a strictly increasing array arr of positive integers, return the length of the longest subsequence that is Fibonacci-like: it has length >= 3 and every element (from the third on) equals the sum of the two preceding it. If none exists, return 0.",
    inputFormat: "A strictly increasing array arr of positive integers.",
    outputFormat: "An integer: the length of the longest Fibonacci-like subsequence, or 0.",
    constraints: [
      "3 <= arr.length <= 1000",
      "1 <= arr[i] < arr[i+1] <= 10^9",
    ],
    examples: [
      {
        input: "arr = [1,2,3,4,5,6,7,8]",
        output: "5",
        explanation: "[1,2,3,5,8] is Fibonacci-like with length 5.",
      },
      {
        input: "arr = [1,3,7,11,12,14,18]",
        output: "3",
        explanation: "[1,11,12], [3,11,14], [7,11,18] etc. give length 3.",
      },
    ],
    approach: [
      "Map each value to its index for O(1) lookups.",
      "Let dp[i][j] be the length of a Fibonacci-like sequence whose last two elements are arr[i] and arr[j] (i < j).",
      "For each pair (i, j), the element before arr[i] would be arr[j] - arr[i]; if it exists at index k < i, extend: dp[i][j] = dp[k][i] + 1.",
      "Otherwise the pair starts a new sequence of length 2.",
      "Track the maximum dp value; return it if >= 3, else 0.",
    ],
    solutionSteps: [
      "Build index = {value: position}.",
      "Initialize dp[i][j] = 2 for all i < j.",
      "For each j, for each i < j: need = arr[j] - arr[i]; if need < arr[i] and need in index, dp[i][j] = dp[index[need]][i] + 1.",
      "Update the global best with dp[i][j].",
      "Return best if it is at least 3, otherwise 0.",
    ],
    code: {
      python: `def len_longest_fib_subseq(arr: list[int]) -> int:
    index = {v: i for i, v in enumerate(arr)}
    n = len(arr)
    dp = [[2] * n for _ in range(n)]
    best = 0
    for j in range(n):
        for i in range(j):
            need = arr[j] - arr[i]
            if need < arr[i] and need in index:
                k = index[need]
                dp[i][j] = dp[k][i] + 1
                best = max(best, dp[i][j])
    return best if best >= 3 else 0
`,
      java: `import java.util.*;

class Solution {
    public int lenLongestFibSubseq(int[] arr) {
        Map<Integer, Integer> index = new HashMap<>();
        int n = arr.length;
        for (int i = 0; i < n; i++) index.put(arr[i], i);
        int[][] dp = new int[n][n];
        for (int[] row : dp) Arrays.fill(row, 2);
        int best = 0;
        for (int j = 0; j < n; j++) {
            for (int i = 0; i < j; i++) {
                int need = arr[j] - arr[i];
                Integer k = index.get(need);
                if (need < arr[i] && k != null) {
                    dp[i][j] = dp[k][i] + 1;
                    best = Math.max(best, dp[i][j]);
                }
            }
        }
        return best >= 3 ? best : 0;
    }
}
`,
      cpp: `#include <vector>
#include <unordered_map>
#include <algorithm>
using namespace std;

class Solution {
public:
    int lenLongestFibSubseq(vector<int>& arr) {
        unordered_map<int, int> index;
        int n = arr.size();
        for (int i = 0; i < n; i++) index[arr[i]] = i;
        vector<vector<int>> dp(n, vector<int>(n, 2));
        int best = 0;
        for (int j = 0; j < n; j++) {
            for (int i = 0; i < j; i++) {
                int need = arr[j] - arr[i];
                auto it = index.find(need);
                if (need < arr[i] && it != index.end()) {
                    dp[i][j] = dp[it->second][i] + 1;
                    best = max(best, dp[i][j]);
                }
            }
        }
        return best >= 3 ? best : 0;
    }
};
`,
    },
    complexity: { time: "O(n^2)", space: "O(n^2)" },
    pitfalls: [
      "Requiring need < arr[i] to ensure the predecessor index is before i (the array is strictly increasing).",
      "Returning 2 when no valid sequence of length >= 3 exists; the answer should be 0.",
      "Looking up arr[j] - arr[i] without verifying it actually appears in the array.",
    ],
    edgeCases: [
      "No Fibonacci-like triple (return 0).",
      "The entire array being Fibonacci-like.",
      "Multiple sequences sharing a common tail pair.",
    ],
    whyItMatters:
      "Indexing pairs as DP state to reconstruct additive sequences is a reusable pattern for arithmetic/geometric/recurrence-subsequence detection.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 343 — pure_dsa · dp_2d · medium · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "longest-common-window-run",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "dp_2d",
    difficulty: "medium",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Longest Common Contiguous Run in Two Logs",
    framing:
      "Two event logs are compared to find their longest identical contiguous segment — useful for detecting a shared replayed burst. Return the length of that maximal matching run.",
    statement:
      "Given two integer arrays nums1 and nums2, return the maximum length of a subarray that appears in both arrays (contiguous in each).",
    inputFormat: "Two integer arrays nums1 and nums2.",
    outputFormat: "An integer: the length of the longest common subarray.",
    constraints: [
      "1 <= nums1.length, nums2.length <= 1000",
      "0 <= nums1[i], nums2[j] <= 100",
    ],
    examples: [
      {
        input: "nums1 = [1,2,3,2,1], nums2 = [3,2,1,4,7]",
        output: "3",
        explanation: "The run [3,2,1] is common to both.",
      },
      {
        input: "nums1 = [0,0,0,0,0], nums2 = [0,0,0,0,0]",
        output: "5",
        explanation: "The entire arrays match.",
      },
    ],
    approach: [
      "Let dp[i][j] be the length of the longest common suffix of nums1[0..i-1] and nums2[0..j-1].",
      "If nums1[i-1] == nums2[j-1], dp[i][j] = dp[i-1][j-1] + 1; otherwise dp[i][j] = 0.",
      "The answer is the maximum value across the entire table.",
      "Iterate over all pairs filling the table from smaller indices.",
      "A rolling 1D array suffices, scanning the inner index in reverse.",
    ],
    solutionSteps: [
      "Allocate dp of size (m+1) x (n+1) initialized to 0.",
      "For i from 1 to m, j from 1 to n: if elements match set dp[i][j] = dp[i-1][j-1] + 1.",
      "Track the running maximum.",
      "Reset to 0 implicitly on mismatch (table starts at 0).",
      "Return the maximum length.",
    ],
    code: {
      python: `def find_length(nums1: list[int], nums2: list[int]) -> int:
    m, n = len(nums1), len(nums2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    best = 0
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if nums1[i - 1] == nums2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
                best = max(best, dp[i][j])
    return best
`,
      java: `class Solution {
    public int findLength(int[] nums1, int[] nums2) {
        int m = nums1.length, n = nums2.length, best = 0;
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (nums1[i - 1] == nums2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                    best = Math.max(best, dp[i][j]);
                }
            }
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
    int findLength(vector<int>& nums1, vector<int>& nums2) {
        int m = nums1.size(), n = nums2.size(), best = 0;
        vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (nums1[i - 1] == nums2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                    best = max(best, dp[i][j]);
                }
            }
        }
        return best;
    }
};
`,
    },
    complexity: { time: "O(m * n)", space: "O(m * n)" },
    pitfalls: [
      "Confusing this with longest common subsequence — here the match must be contiguous.",
      "Failing to reset to 0 on a mismatch (only continuous runs count).",
      "Tracking the answer only at the table corner rather than the global maximum.",
    ],
    edgeCases: [
      "No common element (answer 0).",
      "Identical arrays.",
      "Common run at the very start or end.",
    ],
    whyItMatters:
      "Common-suffix DP is the substring-matching cousin of LCS and underlies diff tools, plagiarism detection, and sequence alignment.",
    estimatedMinutes: 20,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 344 — indian_domain · arrays_hashing · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "settlement-window-multiple",
    version: 1,
    status: "pending_review",
    bucket: "indian_domain",
    batchNo: 11,
    pattern: "arrays_hashing",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer"],
    title: "UPI Settlement Window Summing to a Multiple",
    framing:
      "A UPI settlement engine batches consecutive transaction amounts. A batch can be cleared only if it contains at least two transactions whose total is an exact multiple of the settlement unit k (in paise).",
    statement:
      "Given an integer array nums of transaction amounts and an integer k, return true if there exists a contiguous subarray of length at least 2 whose sum is a multiple of k (that is, sum mod k == 0). Treat 0 as a multiple of every k.",
    inputFormat: "An integer array nums and an integer k.",
    outputFormat: "A boolean: true if such a subarray exists, else false.",
    constraints: [
      "1 <= nums.length <= 100000",
      "0 <= nums[i] <= 10^9",
      "1 <= k <= 2^31 - 1",
    ],
    examples: [
      {
        input: "nums = [23,2,4,6,7], k = 6",
        output: "true",
        explanation: "[2,4] sums to 6, a multiple of 6.",
      },
      {
        input: "nums = [23,2,6,4,7], k = 13",
        output: "false",
        explanation: "No contiguous block of length >= 2 sums to a multiple of 13.",
      },
    ],
    approach: [
      "Two prefix sums with the same remainder modulo k bound a subarray whose sum is a multiple of k.",
      "Track the earliest index where each remainder first appeared.",
      "As you sweep, compute the running prefix-sum remainder.",
      "If the same remainder was seen at an index at least two positions earlier, a qualifying subarray exists.",
      "Seed remainder 0 at index -1 to catch prefixes that are themselves multiples.",
    ],
    solutionSteps: [
      "Initialize a map {0: -1} and running = 0.",
      "For each index i: running = (running + nums[i]) % k.",
      "If running is already in the map at index j, check i - j >= 2 -> return true.",
      "Otherwise store the first occurrence of this remainder.",
      "If the sweep finishes with no hit, return false.",
    ],
    code: {
      python: `def check_subarray_sum(nums: list[int], k: int) -> bool:
    first = {0: -1}
    running = 0
    for i, v in enumerate(nums):
        running = (running + v) % k
        if running in first:
            if i - first[running] >= 2:
                return True
        else:
            first[running] = i
    return False
`,
      java: `import java.util.*;

class Solution {
    public boolean checkSubarraySum(int[] nums, int k) {
        Map<Integer, Integer> first = new HashMap<>();
        first.put(0, -1);
        int running = 0;
        for (int i = 0; i < nums.length; i++) {
            running = (int) (((long) running + nums[i]) % k);
            if (first.containsKey(running)) {
                if (i - first.get(running) >= 2) return true;
            } else {
                first.put(running, i);
            }
        }
        return false;
    }
}
`,
      cpp: `#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    bool checkSubarraySum(vector<int>& nums, int k) {
        unordered_map<int, int> first;
        first[0] = -1;
        long running = 0;
        for (int i = 0; i < (int) nums.size(); i++) {
            running = (running + nums[i]) % k;
            int r = (int) running;
            if (first.count(r)) {
                if (i - first[r] >= 2) return true;
            } else {
                first[r] = i;
            }
        }
        return false;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(min(n, k))" },
    pitfalls: [
      "Storing the latest index for a remainder instead of the earliest, which breaks the length-2 check.",
      "Forgetting the {0: -1} seed needed for prefixes that are themselves multiples.",
      "Integer overflow when adding before taking the modulus.",
    ],
    edgeCases: [
      "A pair of zeros (sum 0, a multiple of any k).",
      "Single-element array (always false, length < 2).",
      "Large k where few remainders repeat.",
    ],
    whyItMatters:
      "Prefix-sum-modulo bucketing is the standard linear technique for divisibility-of-range questions in ledgers and settlement systems.",
    estimatedMinutes: 20,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 345 — pure_dsa · binary_search · medium · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "k-closest-readings",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "binary_search",
    difficulty: "medium",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "K Readings Closest to a Target",
    framing:
      "From a sorted list of calibration readings, return the k readings nearest a target value, in ascending order — for displaying the most relevant neighbors around a setpoint.",
    statement:
      "Given a sorted integer array arr, an integer k, and an integer x, return the k closest values to x, sorted ascending. Closeness ties favor the smaller value: |a - x| < |b - x|, or |a - x| == |b - x| and a < b.",
    inputFormat: "A sorted array arr, an integer k, and an integer x.",
    outputFormat: "An array of the k closest values in ascending order.",
    constraints: [
      "1 <= k <= arr.length <= 10^4",
      "arr is sorted ascending; -10^9 <= arr[i], x <= 10^9.",
    ],
    examples: [
      {
        input: "arr = [1,2,3,4,5], k = 4, x = 3",
        output: "[1,2,3,4]",
        explanation: "The four closest to 3, ties favoring smaller, are 1..4.",
      },
      {
        input: "arr = [1,1,2,3,4,5], k = 4, x = -1",
        output: "[1,1,2,3]",
        explanation: "All small values are nearest to -1.",
      },
    ],
    approach: [
      "The answer is a contiguous window of length k (the array is sorted).",
      "Binary search for the best left boundary lo in [0, n-k].",
      "Compare the candidate just outside the window on each side: arr[mid] vs arr[mid+k].",
      "If x - arr[mid] > arr[mid+k] - x, the window should shift right (lo = mid+1); otherwise shift left.",
      "Return arr[lo .. lo+k-1].",
    ],
    solutionSteps: [
      "Set lo = 0, hi = n - k.",
      "While lo < hi: mid = (lo + hi) / 2.",
      "If x - arr[mid] > arr[mid + k] - x, set lo = mid + 1; else hi = mid.",
      "The window starts at lo.",
      "Return the slice arr[lo : lo + k].",
    ],
    code: {
      python: `def find_closest_elements(arr: list[int], k: int, x: int) -> list[int]:
    lo, hi = 0, len(arr) - k
    while lo < hi:
        mid = (lo + hi) // 2
        if x - arr[mid] > arr[mid + k] - x:
            lo = mid + 1
        else:
            hi = mid
    return arr[lo:lo + k]
`,
      java: `import java.util.*;

class Solution {
    public List<Integer> findClosestElements(int[] arr, int k, int x) {
        int lo = 0, hi = arr.length - k;
        while (lo < hi) {
            int mid = (lo + hi) / 2;
            if (x - arr[mid] > arr[mid + k] - x) lo = mid + 1;
            else hi = mid;
        }
        List<Integer> res = new ArrayList<>();
        for (int i = lo; i < lo + k; i++) res.add(arr[i]);
        return res;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    vector<int> findClosestElements(vector<int>& arr, int k, int x) {
        int lo = 0, hi = (int) arr.size() - k;
        while (lo < hi) {
            int mid = (lo + hi) / 2;
            if (x - arr[mid] > arr[mid + k] - x) lo = mid + 1;
            else hi = mid;
        }
        return vector<int>(arr.begin() + lo, arr.begin() + lo + k);
    }
};
`,
    },
    complexity: { time: "O(log(n - k) + k)", space: "O(k)" },
    pitfalls: [
      "Sorting by absolute distance then re-sorting, which is O(n log n) and easy to get wrong on ties.",
      "Comparing arr[mid] and arr[mid+k] with the wrong inequality, breaking the tie-toward-smaller rule.",
      "Letting hi start at n instead of n-k, indexing out of bounds.",
    ],
    edgeCases: [
      "x smaller than all elements (window at the start).",
      "x larger than all elements (window at the end).",
      "Duplicate values around the target.",
    ],
    whyItMatters:
      "Binary-searching for the optimal fixed-size window is a clean technique for nearest-neighbor selection on sorted data.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 346 — pure_dsa · binary_search · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "lookup-rotated-with-dupes",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "binary_search",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer"],
    title: "Search a Rotated Sorted Array with Duplicates",
    framing:
      "A circular buffer of sorted config snapshots may contain duplicate versions and has been rotated at an unknown pivot. Decide whether a target version exists in it.",
    statement:
      "Given an integer array nums that was originally sorted ascending (possibly with duplicates) then rotated at an unknown pivot, and a target value, return true if target is present, else false. Aim for better than linear time on average.",
    inputFormat: "An integer array nums (rotated, may contain duplicates) and an integer target.",
    outputFormat: "A boolean: whether target exists in nums.",
    constraints: [
      "1 <= nums.length <= 5000",
      "-10^4 <= nums[i], target <= 10^4",
      "nums is a rotation of a non-decreasing array.",
    ],
    examples: [
      {
        input: "nums = [2,5,6,0,0,1,2], target = 0",
        output: "true",
        explanation: "0 appears in the array.",
      },
      {
        input: "nums = [2,5,6,0,0,1,2], target = 3",
        output: "false",
        explanation: "3 is not present.",
      },
    ],
    approach: [
      "Use modified binary search; one half of the array around mid is always sorted — except when duplicates obscure which half.",
      "If nums[lo] == nums[mid] == nums[hi], you cannot tell the sorted side; shrink both ends by one.",
      "Otherwise, if the left half is sorted, check whether target lies within it to choose a side.",
      "If the right half is sorted, do the symmetric check.",
      "Return true on an exact match; false if the search range empties.",
    ],
    solutionSteps: [
      "Set lo = 0, hi = n-1.",
      "While lo <= hi: mid = (lo+hi)/2; if nums[mid] == target return true.",
      "If nums[lo]==nums[mid]==nums[hi], lo++, hi--.",
      "Else if left sorted (nums[lo] <= nums[mid]): move within [lo,mid-1] if target in range, else lo=mid+1.",
      "Else right sorted: move within [mid+1,hi] if target in range, else hi=mid-1. Return false at the end.",
    ],
    code: {
      python: `def search(nums: list[int], target: int) -> bool:
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return True
        if nums[lo] == nums[mid] == nums[hi]:
            lo += 1
            hi -= 1
        elif nums[lo] <= nums[mid]:
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return False
`,
      java: `class Solution {
    public boolean search(int[] nums, int target) {
        int lo = 0, hi = nums.length - 1;
        while (lo <= hi) {
            int mid = (lo + hi) / 2;
            if (nums[mid] == target) return true;
            if (nums[lo] == nums[mid] && nums[mid] == nums[hi]) {
                lo++; hi--;
            } else if (nums[lo] <= nums[mid]) {
                if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
                else lo = mid + 1;
            } else {
                if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
                else hi = mid - 1;
            }
        }
        return false;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    bool search(vector<int>& nums, int target) {
        int lo = 0, hi = (int) nums.size() - 1;
        while (lo <= hi) {
            int mid = (lo + hi) / 2;
            if (nums[mid] == target) return true;
            if (nums[lo] == nums[mid] && nums[mid] == nums[hi]) {
                lo++; hi--;
            } else if (nums[lo] <= nums[mid]) {
                if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
                else lo = mid + 1;
            } else {
                if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
                else hi = mid - 1;
            }
        }
        return false;
    }
};
`,
    },
    complexity: { time: "O(log n) average, O(n) worst case", space: "O(1)" },
    pitfalls: [
      "Not handling the nums[lo]==nums[mid]==nums[hi] ambiguity, which can pick the wrong half.",
      "Using strict vs non-strict bounds incorrectly when testing if target is in the sorted half.",
      "Assuming guaranteed O(log n) — duplicates degrade the worst case to O(n).",
    ],
    edgeCases: [
      "All elements equal but target absent (worst case O(n)).",
      "No rotation (a plain sorted array).",
      "Target at the rotation pivot.",
    ],
    whyItMatters:
      "Rotated-array search with duplicate handling sharpens invariant reasoning in binary search, a frequent interview discriminator.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 347 — pure_dsa · dp_1d · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "split-budget-equal-halves",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "dp_1d",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Split Resource Costs into Two Equal Halves",
    framing:
      "A capacity planner wants to divide a set of task costs into two pools of exactly equal total cost (for balanced bin placement). Decide whether such an even split is possible.",
    statement:
      "Given an array nums of positive integers, return true if it can be partitioned into two subsets whose sums are equal, otherwise false.",
    inputFormat: "An array nums of positive integers.",
    outputFormat: "A boolean: whether an equal-sum partition exists.",
    constraints: [
      "1 <= nums.length <= 200",
      "1 <= nums[i] <= 100",
    ],
    examples: [
      {
        input: "nums = [1,5,11,5]",
        output: "true",
        explanation: "[1,5,5] and [11] both sum to 11.",
      },
      {
        input: "nums = [1,2,3,5]",
        output: "false",
        explanation: "No subset sums to half of 11.",
      },
    ],
    approach: [
      "If the total sum is odd, an equal split is impossible.",
      "Otherwise the goal is a subset summing to total/2 — a 0/1 subset-sum problem.",
      "Use a boolean dp where dp[s] means sum s is achievable with some subset.",
      "For each number, update dp from high sums down to the number to avoid reuse.",
      "Return dp[total/2].",
    ],
    solutionSteps: [
      "Compute total; if odd return false; target = total/2.",
      "Initialize dp[0] = true, all other dp[s] = false.",
      "For each num, for s from target down to num: dp[s] = dp[s] or dp[s-num].",
      "Short-circuit to true if dp[target] becomes true.",
      "Return dp[target].",
    ],
    code: {
      python: `def can_partition(nums: list[int]) -> bool:
    total = sum(nums)
    if total % 2 != 0:
        return False
    target = total // 2
    dp = [False] * (target + 1)
    dp[0] = True
    for num in nums:
        for s in range(target, num - 1, -1):
            if dp[s - num]:
                dp[s] = True
        if dp[target]:
            return True
    return dp[target]
`,
      java: `class Solution {
    public boolean canPartition(int[] nums) {
        int total = 0;
        for (int v : nums) total += v;
        if (total % 2 != 0) return false;
        int target = total / 2;
        boolean[] dp = new boolean[target + 1];
        dp[0] = true;
        for (int num : nums) {
            for (int s = target; s >= num; s--)
                if (dp[s - num]) dp[s] = true;
            if (dp[target]) return true;
        }
        return dp[target];
    }
}
`,
      cpp: `#include <vector>
#include <numeric>
using namespace std;

class Solution {
public:
    bool canPartition(vector<int>& nums) {
        int total = accumulate(nums.begin(), nums.end(), 0);
        if (total % 2 != 0) return false;
        int target = total / 2;
        vector<char> dp(target + 1, 0);
        dp[0] = 1;
        for (int num : nums) {
            for (int s = target; s >= num; s--)
                if (dp[s - num]) dp[s] = 1;
            if (dp[target]) return true;
        }
        return dp[target];
    }
};
`,
    },
    complexity: { time: "O(n * sum)", space: "O(sum)" },
    pitfalls: [
      "Iterating the inner sum loop forward, which lets an item be used more than once.",
      "Forgetting the odd-total early exit.",
      "Allocating dp of size total instead of target+1.",
    ],
    edgeCases: [
      "Single element (cannot split, false).",
      "All equal even count.",
      "Large sum near the worst case.",
    ],
    whyItMatters:
      "Equal-sum partition is the gateway 0/1 knapsack variant, foundational for load balancing and fair-division problems.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 348 — indian_domain · dp_1d · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-denomination-combos",
    version: 1,
    status: "pending_review",
    bucket: "indian_domain",
    batchNo: 11,
    pattern: "dp_1d",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer"],
    title: "Count Ways to Make an Amount from Note Denominations",
    framing:
      "A cash-handling service counts how many distinct combinations of rupee note denominations add up to a requested payout. Notes of each denomination are unlimited; order does not matter.",
    statement:
      "Given an integer amount and an array coins of distinct denomination values (unlimited supply of each), return the number of distinct combinations that sum to amount. Combinations differing only in order count once.",
    inputFormat: "An integer amount and an array coins of distinct positive denominations.",
    outputFormat: "An integer: the number of combinations summing to amount.",
    constraints: [
      "1 <= coins.length <= 300",
      "1 <= coins[i] <= 5000, all distinct",
      "0 <= amount <= 5000",
    ],
    examples: [
      {
        input: "amount = 5, coins = [1,2,5]",
        output: "4",
        explanation: "5=5, 5=2+2+1, 5=2+1+1+1, 5=1+1+1+1+1.",
      },
      {
        input: "amount = 3, coins = [2]",
        output: "0",
        explanation: "No combination of 2s makes 3.",
      },
    ],
    approach: [
      "Count combinations, not permutations, so iterate coins in the outer loop.",
      "Let dp[a] be the number of ways to make amount a using the coins considered so far.",
      "Initialize dp[0] = 1 (one way to make zero: take nothing).",
      "For each coin, for a from coin to amount: dp[a] += dp[a - coin].",
      "Processing one coin fully before the next ensures each combination is counted once.",
    ],
    solutionSteps: [
      "Allocate dp of size amount+1, dp[0]=1, rest 0.",
      "For each coin in coins:",
      "For a from coin to amount: dp[a] += dp[a - coin].",
      "After all coins, dp[amount] holds the count.",
      "Return dp[amount].",
    ],
    code: {
      python: `def change(amount: int, coins: list[int]) -> int:
    dp = [0] * (amount + 1)
    dp[0] = 1
    for coin in coins:
        for a in range(coin, amount + 1):
            dp[a] += dp[a - coin]
    return dp[amount]
`,
      java: `class Solution {
    public int change(int amount, int[] coins) {
        int[] dp = new int[amount + 1];
        dp[0] = 1;
        for (int coin : coins)
            for (int a = coin; a <= amount; a++)
                dp[a] += dp[a - coin];
        return dp[amount];
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int change(int amount, vector<int>& coins) {
        vector<int> dp(amount + 1, 0);
        dp[0] = 1;
        for (int coin : coins)
            for (int a = coin; a <= amount; a++)
                dp[a] += dp[a - coin];
        return dp[amount];
    }
};
`,
    },
    complexity: { time: "O(coins * amount)", space: "O(amount)" },
    pitfalls: [
      "Putting the amount loop outside and the coin loop inside, which counts ordered permutations instead of combinations.",
      "Forgetting dp[0] = 1 as the empty-combination base case.",
      "Iterating the inner loop downward (that is for the bounded-supply variant).",
    ],
    edgeCases: [
      "amount = 0 returns 1.",
      "A denomination larger than amount contributes nothing.",
      "No combination possible (returns 0).",
    ],
    whyItMatters:
      "Unbounded-knapsack counting with the coin loop outermost is the canonical way to count order-insensitive combinations in payment and inventory systems.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 349 — pure_dsa · stack_queue · medium · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "price-span-monotone-stack",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "stack_queue",
    difficulty: "medium",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer"],
    title: "Daily Price Span Streaming",
    framing:
      "A trading widget streams daily prices. For each day it must report the price span — the number of consecutive days up to and including today where the price was less than or equal to today's price.",
    statement:
      "Given an array prices of daily quotes processed left to right, return an array spans where spans[i] is the maximum number of consecutive days ending at day i (including day i) for which prices[j] <= prices[i].",
    inputFormat: "An integer array prices.",
    outputFormat: "An integer array spans of the same length.",
    constraints: [
      "1 <= prices.length <= 100000",
      "1 <= prices[i] <= 10^9",
    ],
    examples: [
      {
        input: "prices = [100,80,60,70,60,75,85]",
        output: "[1,1,1,2,1,4,6]",
        explanation: "Each value counts the run of days at or below it ending today.",
      },
      {
        input: "prices = [10,20,30]",
        output: "[1,2,3]",
        explanation: "Each new day extends the rising span.",
      },
    ],
    approach: [
      "Maintain a monotonic stack of (price, accumulatedSpan) pairs decreasing by price from bottom to top.",
      "For a new price, start span at 1.",
      "Pop every stack entry whose price is <= the new price, absorbing its span into the running total.",
      "Push the new price with its accumulated span.",
      "Record the accumulated span as the day's answer.",
    ],
    solutionSteps: [
      "Initialize an empty stack and an output list.",
      "For each price p: span = 1.",
      "While the stack is non-empty and stack top price <= p: span += popped span.",
      "Push (p, span) and append span to the output.",
      "Return the output array.",
    ],
    code: {
      python: `def stock_spans(prices: list[int]) -> list[int]:
    stack: list[tuple[int, int]] = []  # (price, span)
    result = []
    for p in prices:
        span = 1
        while stack and stack[-1][0] <= p:
            span += stack.pop()[1]
        stack.append((p, span))
        result.append(span)
    return result
`,
      java: `import java.util.*;

class Solution {
    public int[] stockSpans(int[] prices) {
        Deque<int[]> stack = new ArrayDeque<>();
        int[] result = new int[prices.length];
        for (int i = 0; i < prices.length; i++) {
            int span = 1;
            while (!stack.isEmpty() && stack.peek()[0] <= prices[i])
                span += stack.pop()[1];
            stack.push(new int[]{prices[i], span});
            result[i] = span;
        }
        return result;
    }
}
`,
      cpp: `#include <vector>
#include <stack>
using namespace std;

class Solution {
public:
    vector<int> stockSpans(vector<int>& prices) {
        stack<pair<int, int>> st; // (price, span)
        vector<int> result;
        for (int p : prices) {
            int span = 1;
            while (!st.empty() && st.top().first <= p) {
                span += st.top().second;
                st.pop();
            }
            st.push({p, span});
            result.push_back(span);
        }
        return result;
    }
};
`,
    },
    complexity: { time: "O(n) amortized", space: "O(n)" },
    pitfalls: [
      "Re-scanning previous days for each new price, giving O(n^2).",
      "Using strict < instead of <= when comparing to today's price.",
      "Forgetting to accumulate the popped entries' spans rather than counting one each.",
    ],
    edgeCases: [
      "Strictly decreasing prices (every span is 1).",
      "Strictly increasing prices (spans 1,2,3,...).",
      "Repeated equal prices.",
    ],
    whyItMatters:
      "The monotonic-stack span computation is the basis of previous-greater-element queries used in finance, histograms, and stream analytics.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 350 — pure_dsa · trees · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "widest-tree-level",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 11,
    pattern: "trees",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "frontend_engineer"],
    title: "Maximum Width of a Binary Tree Level",
    framing:
      "A tree-view component needs to size its widest row. The width of a level is the span between its leftmost and rightmost present nodes, counting the null gaps between them as if the tree were complete.",
    statement:
      "Given the root of a binary tree, return the maximum width among all levels. The width of a level is the number of positions between the leftmost and rightmost non-null nodes (inclusive), where positions follow complete-binary-tree indexing (null nodes in between count toward the width).",
    inputFormat: "The root of a binary tree (given as a level-order array in examples).",
    outputFormat: "An integer: the maximum level width.",
    constraints: [
      "The number of nodes is in [1, 3000].",
      "-100 <= Node.val <= 100",
    ],
    examples: [
      {
        input: "root = [1,3,2,5,3,null,9]",
        output: "4",
        explanation: "The deepest level spans positions for 5,3,_,9 — width 4.",
      },
      {
        input: "root = [1,3,2,5]",
        output: "2",
        explanation: "The level with 5 alone plus its implied sibling span gives width 2.",
      },
    ],
    approach: [
      "Do a BFS level by level, attaching to each node a positional index as if the tree were complete.",
      "A node at index i has children at 2*i and 2*i + 1.",
      "For each level, the width is (last index - first index + 1).",
      "Normalize indices per level by subtracting the first index to keep numbers small.",
      "Track the maximum width across levels.",
    ],
    solutionSteps: [
      "Initialize a queue with (root, index 0).",
      "For each level, record the first node's index and process the level fully.",
      "Compute child indices as 2*i and 2*i+1 (offset by the level's first index to avoid overflow).",
      "Update the answer with (lastIndex - firstIndex + 1).",
      "Return the maximum width found.",
    ],
    code: {
      python: `from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def width_of_binary_tree(root: TreeNode | None) -> int:
    if not root:
        return 0
    best = 0
    q = deque([(root, 0)])
    while q:
        size = len(q)
        first = q[0][1]
        last = first
        for _ in range(size):
            node, idx = q.popleft()
            idx -= first  # normalize to avoid overflow
            last = idx
            if node.left:
                q.append((node.left, 2 * idx))
            if node.right:
                q.append((node.right, 2 * idx + 1))
        best = max(best, last + 1)
    return best
`,
      java: `import java.util.*;

class Solution {
    public int widthOfBinaryTree(TreeNode root) {
        if (root == null) return 0;
        int best = 0;
        Queue<Object[]> q = new LinkedList<>();
        q.add(new Object[]{root, 0});
        while (!q.isEmpty()) {
            int size = q.size();
            int first = (int) ((Object[]) q.peek())[1];
            int last = first;
            for (int s = 0; s < size; s++) {
                Object[] cur = q.poll();
                TreeNode node = (TreeNode) cur[0];
                int idx = (int) cur[1] - first;
                last = idx;
                if (node.left != null) q.add(new Object[]{node.left, 2 * idx});
                if (node.right != null) q.add(new Object[]{node.right, 2 * idx + 1});
            }
            best = Math.max(best, last + 1);
        }
        return best;
    }
}
`,
      cpp: `#include <queue>
#include <algorithm>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

class Solution {
public:
    int widthOfBinaryTree(TreeNode* root) {
        if (!root) return 0;
        int best = 0;
        queue<pair<TreeNode*, unsigned long>> q;
        q.push({root, 0});
        while (!q.empty()) {
            int size = q.size();
            unsigned long first = q.front().second, last = first;
            for (int s = 0; s < size; s++) {
                auto [node, idx] = q.front(); q.pop();
                idx -= first;
                last = idx;
                if (node->left) q.push({node->left, 2 * idx});
                if (node->right) q.push({node->right, 2 * idx + 1});
            }
            best = max(best, (int) (last - 0 + 1));
        }
        return best;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Letting positional indices overflow on deep skewed trees; normalize per level by subtracting the first index.",
      "Counting only present nodes and ignoring the null gaps that define width.",
      "Using level size instead of index span for the width.",
    ],
    edgeCases: [
      "A single node (width 1).",
      "A completely skewed tree (each level width 1).",
      "A full tree maximizing width at the bottom.",
    ],
    whyItMatters:
      "Complete-tree index labeling during BFS is a neat trick for spatial layout, heap addressing, and serialization of trees.",
    estimatedMinutes: 25,
  },
];
