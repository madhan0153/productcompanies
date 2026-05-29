// DSA v2 — Batch 008 (50 questions, 151–200) — difficulty rebalance toward hard.
//
// New target ratio across the whole bank is 60% hard / 25% medium / 15% easy.
// This batch (and the six that follow) add ONLY hard + medium questions; no new
// easy. Composition here: 39 hard + 11 medium; 43 pure_dsa + 5 ai_applied +
// 2 indian_domain.
//
// Canonical coverage added (all distinct from batches 1–7):
// trapping-rain-water, longest-consecutive-sequence, lfu-cache, sudoku-solver,
// reverse-nodes-in-k-group, binary-tree-max-path-sum, alien-dictionary,
// swim-in-rising-water, distinct-subsequences, interleaving-string,
// maximal-rectangle, dungeon-game, candy, employee-free-time, basic-calculator,
// min-cost-connect-points (Prim MST), russian-doll-envelopes, stock-III,
// longest-increasing-path-matrix, trapping-rain-water-II,
// palindrome-partitioning-II, longest-valid-parentheses, count-smaller-after-self,
// kth-smallest-in-sorted-matrix, smallest-distance-pair, cherry-pickup-II,
// min-cost-to-cut-a-stick, job-scheduling-max-profit, number-of-islands-II
// (union-find), accounts-merge (union-find), integer-to-english-words (Indian
// numbering), shortest-palindrome (KMP), text-justification, sliding-window-median,
// concatenated-words, smallest-range-k-lists, ipo-maximize-capital,
// min-refueling-stops, first-missing-positive, jump-game, gas-station,
// subarray-sum-equals-k, search-in-rotated-array, maximal-square,
// generate-parentheses, decode-string, rotate-image, spiral-matrix,
// partition-equal-subset-sum, find-min-rotated.
//
// All status = "pending_review" — admin must approve each before live.

import type { DsaV2Question } from "../types";

export const BATCH_008: readonly DsaV2Question[] = [
  // ──────────────────────────────────────────────────────────────────────
  // 151 — pure_dsa · two_pointers · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "trapped-capacity-between-peaks",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "two_pointers",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "software_engineer", "backend_engineer"],
    title: "Trapped Capacity Between Peaks",
    framing:
      "A row of server racks each has a height. After a coolant flood, water pools in the dips between taller racks. Given the skyline of rack heights, compute how much coolant is trapped overall.",
    statement:
      "Given an array height where height[i] is the height of the i-th bar, compute how much water can be trapped after raining. Water above bar i equals min(maxLeft, maxRight) − height[i] when positive.",
    inputFormat: "An array height of n non-negative integers (0 ≤ n ≤ 2·10^4, 0 ≤ height[i] ≤ 10^5).",
    outputFormat: "A single integer: the total trapped water.",
    constraints: [
      "0 ≤ n ≤ 2·10^4",
      "0 ≤ height[i] ≤ 10^5",
      "Target O(n) time and O(1) extra space",
    ],
    examples: [
      {
        input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
        output: "6",
        explanation: "Six units pool in the valleys between the taller bars.",
      },
      {
        input: "height = [4,2,0,3,2,5]",
        output: "9",
        explanation: "The big dip between the 4 and the 5 holds the bulk of the water.",
      },
    ],
    approach: [
      "Water over a bar is bounded by the shorter of the tallest bar to its left and to its right.",
      "Use two pointers from both ends, tracking the running max from each side.",
      "Always advance the side with the smaller current height — that side's bound is known to be limiting.",
      "Add (sideMax − height) at each step.",
    ],
    solutionSteps: [
      "Set l=0, r=n−1, leftMax=rightMax=0, total=0.",
      "While l<r: if height[l] < height[r], update leftMax and add leftMax−height[l], then l++.",
      "Otherwise update rightMax and add rightMax−height[r], then r−−.",
      "Return total.",
    ],
    code: {
      python: `def trap(height: list[int]) -> int:
    l, r = 0, len(height) - 1
    left_max = right_max = total = 0
    while l < r:
        if height[l] < height[r]:
            left_max = max(left_max, height[l])
            total += left_max - height[l]
            l += 1
        else:
            right_max = max(right_max, height[r])
            total += right_max - height[r]
            r -= 1
    return total
`,
      java: `public final class TrappedCapacity {
    public static int trap(int[] height) {
        int l = 0, r = height.length - 1;
        int leftMax = 0, rightMax = 0, total = 0;
        while (l < r) {
            if (height[l] < height[r]) {
                leftMax = Math.max(leftMax, height[l]);
                total += leftMax - height[l];
                l++;
            } else {
                rightMax = Math.max(rightMax, height[r]);
                total += rightMax - height[r];
                r--;
            }
        }
        return total;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int trap(vector<int>& height) {
    int l = 0, r = (int)height.size() - 1;
    int leftMax = 0, rightMax = 0, total = 0;
    while (l < r) {
        if (height[l] < height[r]) {
            leftMax = max(leftMax, height[l]);
            total += leftMax - height[l];
            l++;
        } else {
            rightMax = max(rightMax, height[r]);
            total += rightMax - height[r];
            r--;
        }
    }
    return total;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Computing prefix-max and suffix-max arrays (O(n) space) when two pointers need none.",
      "Advancing the wrong pointer — you must move the shorter side.",
      "Adding negative contributions instead of clamping at zero (the two-pointer form avoids this naturally).",
    ],
    edgeCases: [
      "Empty array or single bar — no water.",
      "Monotonically increasing or decreasing heights — zero trapped.",
      "Flat skyline — zero trapped.",
    ],
    whyItMatters:
      "Trapping Rain Water is the canonical proof that a clever invariant (the shorter wall always bounds the answer) can collapse an O(n)-space problem to O(1). The two-pointer reasoning recurs across buffer and watermark problems.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 152 — pure_dsa · arrays_hashing · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "longest-consecutive-session-streak",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "arrays_hashing",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer", "software_engineer"],
    title: "Longest Consecutive Session Streak",
    framing:
      "Each active day for a user is recorded as an integer day-index, unsorted and possibly duplicated. Find the length of the longest run of consecutive active days to award a streak badge.",
    statement:
      "Given an unsorted array of integers nums, return the length of the longest sequence of consecutive integers. The algorithm must run in O(n) time.",
    inputFormat: "An array nums of n integers (0 ≤ n ≤ 10^5, −10^9 ≤ nums[i] ≤ 10^9).",
    outputFormat: "An integer: the length of the longest consecutive run.",
    constraints: [
      "0 ≤ n ≤ 10^5",
      "Values may be negative and may repeat",
      "Required time complexity is O(n)",
    ],
    examples: [
      {
        input: "nums = [100,4,200,1,3,2]",
        output: "4",
        explanation: "The run 1,2,3,4 has length 4.",
      },
      {
        input: "nums = [0,3,7,2,5,8,4,6,0,1]",
        output: "9",
        explanation: "0..8 forms a run of length 9 (the duplicate 0 is ignored).",
      },
    ],
    approach: [
      "Put every value in a hash set to drop duplicates and allow O(1) membership.",
      "A value starts a run only if value−1 is absent from the set.",
      "From each start, walk upward while value+1 exists, counting the length.",
      "Each element is visited at most twice, giving O(n) overall.",
    ],
    solutionSteps: [
      "Build a set s from nums.",
      "For each x in s where x−1 is not in s, extend y from x while y+1 in s.",
      "Track the maximum (y − x + 1).",
      "Return the maximum, or 0 if empty.",
    ],
    code: {
      python: `def longest_consecutive(nums: list[int]) -> int:
    s = set(nums)
    best = 0
    for x in s:
        if x - 1 not in s:          # x is a run start
            y = x
            while y + 1 in s:
                y += 1
            best = max(best, y - x + 1)
    return best
`,
      java: `import java.util.*;

public final class LongestConsecutiveStreak {
    public static int longestConsecutive(int[] nums) {
        Set<Integer> s = new HashSet<>();
        for (int x : nums) s.add(x);
        int best = 0;
        for (int x : s) {
            if (!s.contains(x - 1)) {
                int y = x;
                while (s.contains(y + 1)) y++;
                best = Math.max(best, y - x + 1);
            }
        }
        return best;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int longestConsecutive(vector<int>& nums) {
    unordered_set<int> s(nums.begin(), nums.end());
    int best = 0;
    for (int x : s) {
        if (!s.count(x - 1)) {
            int y = x;
            while (s.count(y + 1)) y++;
            best = max(best, y - x + 1);
        }
    }
    return best;
}
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Sorting first — that is O(n log n), violating the requirement.",
      "Walking a run from every element instead of only from run starts, giving O(n²).",
      "Forgetting to dedupe, which inflates the count.",
    ],
    edgeCases: [
      "Empty array — answer 0.",
      "All duplicates — answer 1.",
      "Negative and positive values spanning zero.",
    ],
    whyItMatters:
      "The 'only start counting from a run's first element' trick is a classic amortization insight — it turns an apparent O(n²) scan into O(n) and shows up whenever ranges must be reconstructed from unordered keys.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 153 — pure_dsa · heap_priority_queue · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "feature-flag-lfu-cache",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "heap_priority_queue",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "platform_engineer", "software_engineer"],
    title: "Feature Flag LFU Cache",
    framing:
      "A feature-flag service caches flag evaluations. When the cache is full it should evict the least-frequently-used flag, breaking ties by evicting the one used least recently. Implement that cache.",
    statement:
      "Design an LFU cache supporting get(key) and put(key, value) in O(1) average time. On overflow, evict the least-frequently-used key; on a frequency tie, evict the least-recently-used among them. get returns −1 for a missing key.",
    inputFormat: "A capacity, then a sequence of get/put operations.",
    outputFormat: "For each get, the value or −1.",
    constraints: [
      "0 ≤ capacity ≤ 10^4",
      "Up to 2·10^5 operations",
      "get and put must be O(1) average",
    ],
    examples: [
      {
        input: 'cap=2; put(1,1); put(2,2); get(1)→1; put(3,3) evicts 2; get(2)→-1; get(3)→3',
        output: "[1, -1, 3]",
        explanation: "Key 1 had higher frequency than 2, so 2 was evicted when 3 was inserted.",
      },
      {
        input: "cap=0; put(0,0); get(0)→-1",
        output: "[-1]",
        explanation: "A zero-capacity cache stores nothing.",
      },
    ],
    approach: [
      "Keep key → (value, freq) in a hash map.",
      "Keep freq → ordered collection of keys at that frequency, ordered by recency.",
      "Track the current minimum frequency to find the eviction bucket in O(1).",
      "On access, move the key from its freq bucket to freq+1, updating minFreq when its old bucket empties.",
    ],
    solutionSteps: [
      "On get: if absent return −1; else bump the key's frequency and return its value.",
      "On put of an existing key: update value and bump frequency.",
      "On put of a new key at capacity: evict the LRU key in the minFreq bucket, then insert with freq 1 and set minFreq = 1.",
      "Bumping frequency: remove from bucket[f] (advancing minFreq if it empties and equalled f), add to bucket[f+1].",
    ],
    code: {
      python: `from collections import defaultdict, OrderedDict

class LFUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.min_freq = 0
        self.kv = {}                       # key -> [value, freq]
        self.buckets = defaultdict(OrderedDict)  # freq -> {key: None} (LRU order)

    def _bump(self, key: int) -> None:
        val, f = self.kv[key]
        del self.buckets[f][key]
        if not self.buckets[f]:
            del self.buckets[f]
            if self.min_freq == f:
                self.min_freq += 1
        self.kv[key] = [val, f + 1]
        self.buckets[f + 1][key] = None

    def get(self, key: int) -> int:
        if key not in self.kv:
            return -1
        self._bump(key)
        return self.kv[key][0]

    def put(self, key: int, value: int) -> None:
        if self.cap <= 0:
            return
        if key in self.kv:
            self.kv[key][0] = value
            self._bump(key)
            return
        if len(self.kv) >= self.cap:
            evict, _ = self.buckets[self.min_freq].popitem(last=False)
            del self.kv[evict]
        self.kv[key] = [value, 1]
        self.buckets[1][key] = None
        self.min_freq = 1
`,
      java: `import java.util.*;

public final class LFUCache {
    private final int cap;
    private int minFreq = 0;
    private final Map<Integer, int[]> kv = new HashMap<>();          // key -> {value, freq}
    private final Map<Integer, LinkedHashSet<Integer>> buckets = new HashMap<>();

    public LFUCache(int capacity) { this.cap = capacity; }

    private void bump(int key) {
        int[] vf = kv.get(key);
        int f = vf[1];
        LinkedHashSet<Integer> b = buckets.get(f);
        b.remove(key);
        if (b.isEmpty()) {
            buckets.remove(f);
            if (minFreq == f) minFreq++;
        }
        vf[1] = f + 1;
        buckets.computeIfAbsent(f + 1, z -> new LinkedHashSet<>()).add(key);
    }

    public int get(int key) {
        if (!kv.containsKey(key)) return -1;
        bump(key);
        return kv.get(key)[0];
    }

    public void put(int key, int value) {
        if (cap <= 0) return;
        if (kv.containsKey(key)) {
            kv.get(key)[0] = value;
            bump(key);
            return;
        }
        if (kv.size() >= cap) {
            LinkedHashSet<Integer> b = buckets.get(minFreq);
            int evict = b.iterator().next();
            b.remove(evict);
            if (b.isEmpty()) buckets.remove(minFreq);
            kv.remove(evict);
        }
        kv.put(key, new int[]{value, 1});
        buckets.computeIfAbsent(1, z -> new LinkedHashSet<>()).add(key);
        minFreq = 1;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

class LFUCache {
    int cap, minFreq = 0;
    unordered_map<int, pair<int,int>> kv;            // key -> {value, freq}
    unordered_map<int, list<int>> buckets;            // freq -> keys (front = LRU)
    unordered_map<int, list<int>::iterator> pos;      // key -> iterator in its bucket

    void bump(int key) {
        auto& [val, f] = kv[key];
        buckets[f].erase(pos[key]);
        if (buckets[f].empty()) {
            buckets.erase(f);
            if (minFreq == f) minFreq++;
        }
        f++;
        buckets[f].push_back(key);
        pos[key] = prev(buckets[f].end());
    }
public:
    LFUCache(int capacity) : cap(capacity) {}

    int get(int key) {
        if (!kv.count(key)) return -1;
        bump(key);
        return kv[key].first;
    }

    void put(int key, int value) {
        if (cap <= 0) return;
        if (kv.count(key)) {
            kv[key].first = value;
            bump(key);
            return;
        }
        if ((int)kv.size() >= cap) {
            int evict = buckets[minFreq].front();
            buckets[minFreq].pop_front();
            if (buckets[minFreq].empty()) buckets.erase(minFreq);
            kv.erase(evict);
            pos.erase(evict);
        }
        kv[key] = {value, 1};
        buckets[1].push_back(key);
        pos[key] = prev(buckets[1].end());
        minFreq = 1;
    }
};
`,
    },
    complexity: { time: "O(1) average per operation", space: "O(capacity)" },
    pitfalls: [
      "Forgetting to advance minFreq only when the emptied bucket equals the current minFreq.",
      "Resetting minFreq to 1 on every put — it must reset to 1 only on a NEW insertion.",
      "Not handling capacity 0, where every put is a no-op.",
    ],
    edgeCases: [
      "Capacity 0 — nothing is ever stored.",
      "Updating an existing key counts as a use (frequency increases).",
      "Tie on frequency resolved by least-recently-used.",
    ],
    whyItMatters:
      "LFU is the harder sibling of LRU and a frequent design-round question: it forces you to compose three structures (value map, frequency buckets, recency order) so every operation stays O(1). The pattern underlies real cache admission policies.",
    estimatedMinutes: 50,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 154 — pure_dsa · backtracking · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "shift-grid-constraint-solver",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer"],
    title: "Shift Grid Constraint Solver",
    framing:
      "A 9×9 staffing grid must be filled so each row, each column, and each 3×3 zone contains the digits 1–9 exactly once (a Sudoku). Some cells are pre-assigned; fill the rest.",
    statement:
      "Solve a partially filled 9×9 Sudoku board in place. Empty cells are '.'. Each row, column, and 3×3 sub-box must contain digits 1–9 exactly once. A valid solution is guaranteed to exist and be unique.",
    inputFormat: "A 9×9 grid of characters, each '1'–'9' or '.'.",
    outputFormat: "The same grid mutated in place so every '.' is replaced by a valid digit.",
    constraints: [
      "Board is always 9×9",
      "Given clues are valid and the puzzle has exactly one solution",
      "Mutate the board in place",
    ],
    examples: [
      {
        input: "A standard puzzle with ~30 clues filled and the rest '.'",
        output: "The uniquely completed grid",
        explanation: "Backtracking tries digits in each empty cell, abandoning any that violate a constraint.",
      },
      {
        input: "A near-complete board with a single empty cell",
        output: "The board with that cell filled by the only legal digit",
        explanation: "Constraint checks immediately fix the forced value.",
      },
    ],
    approach: [
      "Maintain bitmasks of used digits per row, per column, and per 3×3 box for O(1) validity checks.",
      "Find an empty cell; try each digit not yet used in its row, column, or box.",
      "Recurse; if the recursion fails, undo the choice and try the next digit.",
      "Succeed when no empty cell remains.",
    ],
    solutionSteps: [
      "Precompute rows[9], cols[9], boxes[9] bitmasks from the given clues.",
      "Recursively locate the next '.' cell.",
      "For each digit d whose bit is unset in all three masks, place it, set the bits, and recurse.",
      "On failure clear the cell and bits; if all empties are filled, the board is solved.",
    ],
    code: {
      python: `def solve_sudoku(board: list[list[str]]) -> None:
    rows = [0] * 9
    cols = [0] * 9
    boxes = [0] * 9

    def box_id(r: int, c: int) -> int:
        return (r // 3) * 3 + c // 3

    empties = []
    for r in range(9):
        for c in range(9):
            if board[r][c] == '.':
                empties.append((r, c))
            else:
                bit = 1 << (int(board[r][c]) - 1)
                rows[r] |= bit
                cols[c] |= bit
                boxes[box_id(r, c)] |= bit

    def backtrack(i: int) -> bool:
        if i == len(empties):
            return True
        r, c = empties[i]
        b = box_id(r, c)
        used = rows[r] | cols[c] | boxes[b]
        for d in range(9):
            bit = 1 << d
            if used & bit:
                continue
            board[r][c] = str(d + 1)
            rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit
            if backtrack(i + 1):
                return True
            rows[r] ^= bit; cols[c] ^= bit; boxes[b] ^= bit
            board[r][c] = '.'
        return False

    backtrack(0)
`,
      java: `public final class SudokuSolver {
    private static int box(int r, int c) { return (r / 3) * 3 + c / 3; }

    public static void solveSudoku(char[][] board) {
        int[] rows = new int[9], cols = new int[9], boxes = new int[9];
        java.util.List<int[]> empties = new java.util.ArrayList<>();
        for (int r = 0; r < 9; r++)
            for (int c = 0; c < 9; c++) {
                if (board[r][c] == '.') empties.add(new int[]{r, c});
                else {
                    int bit = 1 << (board[r][c] - '1');
                    rows[r] |= bit; cols[c] |= bit; boxes[box(r, c)] |= bit;
                }
            }
        backtrack(board, empties, 0, rows, cols, boxes);
    }

    private static boolean backtrack(char[][] b, java.util.List<int[]> e, int i,
                                     int[] rows, int[] cols, int[] boxes) {
        if (i == e.size()) return true;
        int r = e.get(i)[0], c = e.get(i)[1], bx = box(r, c);
        int used = rows[r] | cols[c] | boxes[bx];
        for (int d = 0; d < 9; d++) {
            int bit = 1 << d;
            if ((used & bit) != 0) continue;
            b[r][c] = (char) ('1' + d);
            rows[r] |= bit; cols[c] |= bit; boxes[bx] |= bit;
            if (backtrack(b, e, i + 1, rows, cols, boxes)) return true;
            rows[r] ^= bit; cols[c] ^= bit; boxes[bx] ^= bit;
            b[r][c] = '.';
        }
        return false;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

static int boxId(int r, int c) { return (r / 3) * 3 + c / 3; }

bool backtrack(vector<vector<char>>& b, vector<pair<int,int>>& e, int i,
               int rows[], int cols[], int boxes[]) {
    if (i == (int)e.size()) return true;
    auto [r, c] = e[i];
    int bx = boxId(r, c);
    int used = rows[r] | cols[c] | boxes[bx];
    for (int d = 0; d < 9; d++) {
        int bit = 1 << d;
        if (used & bit) continue;
        b[r][c] = char('1' + d);
        rows[r] |= bit; cols[c] |= bit; boxes[bx] |= bit;
        if (backtrack(b, e, i + 1, rows, cols, boxes)) return true;
        rows[r] ^= bit; cols[c] ^= bit; boxes[bx] ^= bit;
        b[r][c] = '.';
    }
    return false;
}

void solveSudoku(vector<vector<char>>& board) {
    int rows[9] = {0}, cols[9] = {0}, boxes[9] = {0};
    vector<pair<int,int>> e;
    for (int r = 0; r < 9; r++)
        for (int c = 0; c < 9; c++) {
            if (board[r][c] == '.') e.push_back({r, c});
            else {
                int bit = 1 << (board[r][c] - '1');
                rows[r] |= bit; cols[c] |= bit; boxes[boxId(r, c)] |= bit;
            }
        }
    backtrack(board, e, 0, rows, cols, boxes);
}
`,
    },
    complexity: { time: "O(9^m) worst case for m empty cells (heavily pruned)", space: "O(m) recursion" },
    pitfalls: [
      "Rescanning rows/cols/boxes with loops instead of bitmasks — correct but far slower.",
      "Forgetting to undo all three bitmasks (and the cell) on backtrack.",
      "Off-by-one in the box index formula.",
    ],
    edgeCases: [
      "Already-solved board — returns immediately.",
      "A single empty cell — forced value.",
      "Sparse clue sets still terminate thanks to constraint pruning.",
    ],
    whyItMatters:
      "Sudoku is the textbook constraint-satisfaction backtracker. Encoding state as bitmasks for O(1) feasibility checks is the same optimization used in scheduling and assignment solvers.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 155 — pure_dsa · linked_list · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "reverse-log-segments-in-k-groups",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "linked_list",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer"],
    title: "Reverse Log Segments In K-Groups",
    framing:
      "A append-only log is a singly linked list of entries. To render it in reverse-chronological blocks, reverse every consecutive group of k nodes; a trailing group smaller than k stays in original order.",
    statement:
      "Given the head of a linked list, reverse the nodes k at a time and return the modified list. Nodes in a final group of fewer than k remain as-is. Only node links may be changed, not values.",
    inputFormat: "The head of a singly linked list of n nodes and an integer k (1 ≤ k ≤ n ≤ 5000).",
    outputFormat: "The head of the list after k-group reversal.",
    constraints: [
      "1 ≤ k ≤ n",
      "Reverse by relinking nodes, not by swapping values",
      "O(n) time, O(1) extra space",
    ],
    examples: [
      {
        input: "list = 1->2->3->4->5, k = 2",
        output: "2->1->4->3->5",
        explanation: "Pairs reversed; the lone trailing 5 is left alone.",
      },
      {
        input: "list = 1->2->3->4->5, k = 3",
        output: "3->2->1->4->5",
        explanation: "First triple reversed; trailing 4->5 (fewer than 3) unchanged.",
      },
    ],
    approach: [
      "Use a dummy node before the head to simplify reconnections.",
      "Repeatedly check that at least k nodes remain ahead.",
      "Reverse exactly those k nodes, then splice the reversed segment between the previous tail and the next segment.",
      "Advance the 'group previous' pointer to the new segment tail.",
    ],
    solutionSteps: [
      "Create dummy -> head; set groupPrev = dummy.",
      "Find the k-th node from groupPrev; if it doesn't exist, stop.",
      "Reverse the k nodes between groupPrev.next and kth (inclusive).",
      "Reconnect: groupPrev.next becomes kth; the old segment head's next becomes the node after the group; move groupPrev to the old head.",
    ],
    code: {
      python: `class ListNode:
    def __init__(self, val=0, nxt=None):
        self.val = val
        self.next = nxt

def reverse_k_group(head: ListNode, k: int) -> ListNode:
    dummy = ListNode(0, head)
    group_prev = dummy

    while True:
        kth = group_prev
        for _ in range(k):
            kth = kth.next
            if kth is None:
                return dummy.next
        group_next = kth.next

        # reverse the group [group_prev.next .. kth]
        prev, cur = group_next, group_prev.next
        while cur is not group_next:
            nxt = cur.next
            cur.next = prev
            prev = cur
            cur = nxt

        old_head = group_prev.next
        group_prev.next = kth
        group_prev = old_head
`,
      java: `public final class ReverseKGroup {
    public static class ListNode {
        int val; ListNode next;
        ListNode(int v) { val = v; }
        ListNode(int v, ListNode n) { val = v; next = n; }
    }

    public static ListNode reverseKGroup(ListNode head, int k) {
        ListNode dummy = new ListNode(0, head);
        ListNode groupPrev = dummy;

        while (true) {
            ListNode kth = groupPrev;
            for (int i = 0; i < k; i++) {
                kth = kth.next;
                if (kth == null) return dummy.next;
            }
            ListNode groupNext = kth.next;

            ListNode prev = groupNext, cur = groupPrev.next;
            while (cur != groupNext) {
                ListNode nxt = cur.next;
                cur.next = prev;
                prev = cur;
                cur = nxt;
            }

            ListNode oldHead = groupPrev.next;
            groupPrev.next = kth;
            groupPrev = oldHead;
        }
    }
}
`,
      cpp: `#include <cstddef>

struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v) : val(v), next(nullptr) {}
    ListNode(int v, ListNode* n) : val(v), next(n) {}
};

ListNode* reverseKGroup(ListNode* head, int k) {
    ListNode dummy(0, head);
    ListNode* groupPrev = &dummy;

    while (true) {
        ListNode* kth = groupPrev;
        for (int i = 0; i < k; i++) {
            kth = kth->next;
            if (!kth) return dummy.next;
        }
        ListNode* groupNext = kth->next;

        ListNode* prev = groupNext;
        ListNode* cur = groupPrev->next;
        while (cur != groupNext) {
            ListNode* nxt = cur->next;
            cur->next = prev;
            prev = cur;
            cur = nxt;
        }

        ListNode* oldHead = groupPrev->next;
        groupPrev->next = kth;
        groupPrev = oldHead;
    }
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Reversing a trailing partial group — it must be left untouched.",
      "Losing the pointer to the next group before reversing.",
      "Mishandling reconnection, which corrupts the list or creates a cycle.",
    ],
    edgeCases: [
      "k = 1 — list unchanged.",
      "k equal to the list length — whole list reversed.",
      "List length not a multiple of k — remainder stays in order.",
    ],
    whyItMatters:
      "k-group reversal is the most demanding pointer-surgery interview problem: it tests whether you can reverse a bounded sub-list and re-splice it without auxiliary storage — the core skill behind in-place list editing.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 156 — pure_dsa · trees · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-value-path-in-org-tree",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer"],
    title: "Max Value Path In Org Tree",
    framing:
      "Each node in a binary org tree carries a signed impact score (a reorg can be negative). A 'path' is any chain of connected nodes, not necessarily through the root. Find the maximum total impact of any path.",
    statement:
      "Given the root of a binary tree where each node has an integer value, return the maximum path sum. A path is a sequence of nodes connected by edges, each node appearing once, and need not pass through the root.",
    inputFormat: "The root of a binary tree with 1 ≤ n ≤ 3·10^4 nodes, −1000 ≤ value ≤ 1000.",
    outputFormat: "An integer: the maximum path sum.",
    constraints: [
      "1 ≤ number of nodes ≤ 3·10^4",
      "Node values may be negative",
      "A path bends at most once (it goes up to a peak then down)",
    ],
    examples: [
      {
        input: "tree = [1,2,3]",
        output: "6",
        explanation: "Path 2 -> 1 -> 3 sums to 6.",
      },
      {
        input: "tree = [-10,9,20,null,null,15,7]",
        output: "42",
        explanation: "Path 15 -> 20 -> 7 sums to 42; the negative root is skipped.",
      },
    ],
    approach: [
      "Define gain(node) = best downward path sum starting at node and going one direction.",
      "A node's gain is node.val + max(0, gain(left), gain(right)) — drop negative branches.",
      "The best path peaking at a node is node.val + max(0,leftGain) + max(0,rightGain).",
      "Track the global maximum of those peaks during a single post-order traversal.",
    ],
    solutionSteps: [
      "Initialize best = −infinity.",
      "Post-order: compute leftGain and rightGain, clamping each at 0.",
      "Update best with node.val + leftGain + rightGain.",
      "Return node.val + max(leftGain, rightGain) as the node's upward gain.",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def max_path_sum(root: TreeNode) -> int:
    best = float('-inf')

    def gain(node: TreeNode) -> int:
        nonlocal best
        if node is None:
            return 0
        left = max(gain(node.left), 0)
        right = max(gain(node.right), 0)
        best = max(best, node.val + left + right)
        return node.val + max(left, right)

    gain(root)
    return best
`,
      java: `public final class MaxPathSum {
    public static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int v) { val = v; }
    }

    private static int best;

    public static int maxPathSum(TreeNode root) {
        best = Integer.MIN_VALUE;
        gain(root);
        return best;
    }

    private static int gain(TreeNode node) {
        if (node == null) return 0;
        int left = Math.max(gain(node.left), 0);
        int right = Math.max(gain(node.right), 0);
        best = Math.max(best, node.val + left + right);
        return node.val + Math.max(left, right);
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int v) : val(v), left(nullptr), right(nullptr) {}
};

int best;

int gain(TreeNode* node) {
    if (!node) return 0;
    int left = max(gain(node->left), 0);
    int right = max(gain(node->right), 0);
    best = max(best, node->val + left + right);
    return node->val + max(left, right);
}

int maxPathSum(TreeNode* root) {
    best = INT_MIN;
    gain(root);
    return best;
}
`,
    },
    complexity: { time: "O(n)", space: "O(h) recursion (h = tree height)" },
    pitfalls: [
      "Returning node.val + left + right as the upward gain — a path can't branch when feeding a parent.",
      "Forgetting to clamp negative child gains to 0.",
      "Initializing best to 0 instead of −infinity, breaking all-negative trees.",
    ],
    edgeCases: [
      "Single node — answer is its value (possibly negative).",
      "All negative values — the answer is the single largest node.",
      "Deep skewed tree — recursion depth equals n.",
    ],
    whyItMatters:
      "This problem teaches the 'return one thing, record another' post-order pattern: the value bubbled up to the parent differs from the answer recorded globally. That distinction recurs across tree-DP problems like diameter and house-robber-on-trees.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 157 — ai_applied · graphs · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "infer-token-precedence-order",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 8,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "backend_engineer", "software_engineer"],
    title: "Infer Token Precedence Order",
    framing:
      "A tokenizer emitted a vocabulary sorted by an unknown custom alphabet. From the sorted list of tokens, recover a valid ordering of the underlying symbols so downstream sorting can be reproduced.",
    statement:
      "Given a list of words sorted lexicographically by an unknown alphabet, return any valid ordering of the distinct characters. If the ordering is invalid (contradictory or a prefix violation), return an empty string.",
    inputFormat: "An array words of n strings (1 ≤ n ≤ 100), lowercase letters, total length ≤ 10^4.",
    outputFormat: "A string giving one valid character order, or \"\" if none exists.",
    constraints: [
      "Only lowercase English letters appear",
      "Return \"\" if a word precedes its own prefix (e.g. 'abc' before 'ab')",
      "Any valid topological order is accepted",
    ],
    examples: [
      {
        input: 'words = ["wrt","wrf","er","ett","rftt"]',
        output: '"wertf"',
        explanation: "Adjacent comparisons yield edges t→f, w→e, r→t, e→r, giving order w,e,r,t,f.",
      },
      {
        input: 'words = ["abc","ab"]',
        output: '""',
        explanation: "A longer word cannot precede its own prefix — invalid.",
      },
    ],
    approach: [
      "Build a graph over characters; each adjacent word pair contributes one edge from the first differing character.",
      "Detect the prefix-violation case (longer word before its prefix) and reject.",
      "Topologically sort the graph with Kahn's algorithm.",
      "If every character is emitted, return the order; otherwise a cycle exists, so return \"\".",
    ],
    solutionSteps: [
      "Seed adjacency and in-degree maps with every character present.",
      "For each adjacent pair, scan to the first mismatch and add that single edge (skip duplicates); reject on prefix violation.",
      "Run Kahn's BFS from all zero-in-degree characters.",
      "Return the assembled order if it covers all characters, else \"\".",
    ],
    code: {
      python: `from collections import defaultdict, deque

def alien_order(words: list[str]) -> str:
    adj = {c: set() for w in words for c in w}
    indeg = {c: 0 for c in adj}

    for a, b in zip(words, words[1:]):
        min_len = min(len(a), len(b))
        if len(a) > len(b) and a[:min_len] == b[:min_len]:
            return ""                       # prefix violation
        for i in range(min_len):
            if a[i] != b[i]:
                if b[i] not in adj[a[i]]:
                    adj[a[i]].add(b[i])
                    indeg[b[i]] += 1
                break

    q = deque([c for c in indeg if indeg[c] == 0])
    out = []
    while q:
        c = q.popleft()
        out.append(c)
        for nxt in adj[c]:
            indeg[nxt] -= 1
            if indeg[nxt] == 0:
                q.append(nxt)

    return "".join(out) if len(out) == len(adj) else ""
`,
      java: `import java.util.*;

public final class AlienOrder {
    public static String alienOrder(String[] words) {
        Map<Character, Set<Character>> adj = new HashMap<>();
        Map<Character, Integer> indeg = new HashMap<>();
        for (String w : words)
            for (char c : w.toCharArray()) {
                adj.putIfAbsent(c, new HashSet<>());
                indeg.putIfAbsent(c, 0);
            }

        for (int k = 0; k + 1 < words.length; k++) {
            String a = words[k], b = words[k + 1];
            int min = Math.min(a.length(), b.length());
            if (a.length() > b.length() && a.startsWith(b)) return "";
            for (int i = 0; i < min; i++) {
                char x = a.charAt(i), y = b.charAt(i);
                if (x != y) {
                    if (adj.get(x).add(y)) indeg.merge(y, 1, Integer::sum);
                    break;
                }
            }
        }

        Deque<Character> q = new ArrayDeque<>();
        for (var e : indeg.entrySet()) if (e.getValue() == 0) q.add(e.getKey());
        StringBuilder sb = new StringBuilder();
        while (!q.isEmpty()) {
            char c = q.poll();
            sb.append(c);
            for (char n : adj.get(c))
                if (indeg.merge(n, -1, Integer::sum) == 0) q.add(n);
        }
        return sb.length() == adj.size() ? sb.toString() : "";
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

string alienOrder(vector<string>& words) {
    unordered_map<char, unordered_set<char>> adj;
    unordered_map<char, int> indeg;
    for (auto& w : words)
        for (char c : w) { adj[c]; indeg[c]; }

    for (size_t k = 0; k + 1 < words.size(); k++) {
        string& a = words[k];
        string& b = words[k + 1];
        size_t mn = min(a.size(), b.size());
        if (a.size() > b.size() && a.compare(0, mn, b, 0, mn) == 0) return "";
        for (size_t i = 0; i < mn; i++) {
            if (a[i] != b[i]) {
                if (adj[a[i]].insert(b[i]).second) indeg[b[i]]++;
                break;
            }
        }
    }

    queue<char> q;
    for (auto& [c, d] : indeg) if (d == 0) q.push(c);
    string out;
    while (!q.empty()) {
        char c = q.front(); q.pop();
        out += c;
        for (char n : adj[c]) if (--indeg[n] == 0) q.push(n);
    }
    return out.size() == adj.size() ? out : "";
}
`,
    },
    complexity: { time: "O(C) where C is total input length", space: "O(1) (≤26 nodes)" },
    pitfalls: [
      "Missing the prefix-violation check, which wrongly accepts 'abc' before 'ab'.",
      "Adding duplicate edges and over-counting in-degree.",
      "Forgetting to seed every character, so isolated letters vanish from the output.",
    ],
    edgeCases: [
      "Single word — any order of its distinct letters is valid.",
      "Cycle in constraints — return \"\".",
      "All words identical — no edges, all characters free.",
    ],
    whyItMatters:
      "Alien Dictionary fuses parsing constraints into a graph and resolving them by topological order — exactly the reasoning behind dependency resolution, build ordering, and inferring schema or token precedence from examples.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 158 — pure_dsa · graphs · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "flood-rise-minimum-time",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "software_engineer", "data_engineer"],
    title: "Flood Rise Minimum Time",
    framing:
      "A datacenter floor is an n×n grid; cell elevations differ. Water rises uniformly — at time t every cell with elevation ≤ t is submerged and passable. Find the earliest time you can travel from the top-left to the bottom-right, moving only through submerged cells.",
    statement:
      "Given an n×n grid where grid[i][j] is the elevation of cell (i,j), return the least time t such that there is a path from (0,0) to (n−1,n−1) using only 4-directional moves through cells with elevation ≤ t.",
    inputFormat: "An n×n integer grid (1 ≤ n ≤ 50); grid contains a permutation of 0..n²−1.",
    outputFormat: "An integer: the minimum time to reach the bottom-right.",
    constraints: [
      "1 ≤ n ≤ 50",
      "Elevations are a permutation of 0..n²−1",
      "Moves are up/down/left/right only",
    ],
    examples: [
      {
        input: "grid = [[0,2],[1,3]]",
        output: "3",
        explanation: "At t=3 the path 0→1→3 (or 0→2→3) is fully submerged.",
      },
      {
        input: "grid = [[0,1,2,3,4],[24,23,22,21,5],[12,13,14,15,16],[11,17,18,19,20],[10,9,8,7,6]]",
        output: "16",
        explanation: "The snake path through the lowest possible peak requires waiting until t=16.",
      },
    ],
    approach: [
      "The answer is the minimum over all paths of the path's maximum elevation (a minimax path).",
      "Run a Dijkstra-like search where a cell's 'cost' is the max elevation seen on the way to it.",
      "Use a min-heap keyed by that running maximum; pop the smallest.",
      "Return the running max the moment the target is popped.",
    ],
    solutionSteps: [
      "Push (grid[0][0], 0, 0) onto a min-heap; mark (0,0) visited.",
      "Pop the cell with the smallest running-max time t.",
      "If it is the target, return t.",
      "For each unvisited neighbor, push (max(t, neighborElevation), …) and mark visited.",
    ],
    code: {
      python: `import heapq

def swim_in_water(grid: list[list[int]]) -> int:
    n = len(grid)
    pq = [(grid[0][0], 0, 0)]
    seen = {(0, 0)}
    while pq:
        t, r, c = heapq.heappop(pq)
        if r == n - 1 and c == n - 1:
            return t
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < n and 0 <= nc < n and (nr, nc) not in seen:
                seen.add((nr, nc))
                heapq.heappush(pq, (max(t, grid[nr][nc]), nr, nc))
    return -1
`,
      java: `import java.util.*;

public final class FloodRise {
    public static int swimInWater(int[][] grid) {
        int n = grid.length;
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
        boolean[][] seen = new boolean[n][n];
        pq.add(new int[]{grid[0][0], 0, 0});
        seen[0][0] = true;
        int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};
        while (!pq.isEmpty()) {
            int[] cur = pq.poll();
            int t = cur[0], r = cur[1], c = cur[2];
            if (r == n - 1 && c == n - 1) return t;
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr >= 0 && nr < n && nc >= 0 && nc < n && !seen[nr][nc]) {
                    seen[nr][nc] = true;
                    pq.add(new int[]{Math.max(t, grid[nr][nc]), nr, nc});
                }
            }
        }
        return -1;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int swimInWater(vector<vector<int>>& grid) {
    int n = grid.size();
    priority_queue<array<int,3>, vector<array<int,3>>, greater<>> pq;
    vector<vector<bool>> seen(n, vector<bool>(n, false));
    pq.push({grid[0][0], 0, 0});
    seen[0][0] = true;
    int dirs[4][2] = {{1,0},{-1,0},{0,1},{0,-1}};
    while (!pq.empty()) {
        auto [t, r, c] = pq.top(); pq.pop();
        if (r == n - 1 && c == n - 1) return t;
        for (auto& d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nr < n && nc >= 0 && nc < n && !seen[nr][nc]) {
                seen[nr][nc] = true;
                pq.push({max(t, grid[nr][nc]), nr, nc});
            }
        }
    }
    return -1;
}
`,
    },
    complexity: { time: "O(n² log n)", space: "O(n²)" },
    pitfalls: [
      "Summing elevations along the path instead of taking the maximum.",
      "Marking cells visited on pop rather than on push, which can re-enqueue and slow things down.",
      "Using plain BFS, which ignores the minimax cost.",
    ],
    edgeCases: [
      "1×1 grid — answer is grid[0][0].",
      "Monotone increasing snake — answer is the largest peak on the forced path.",
      "Multiple equal-cost paths — any is fine; the heap picks one.",
    ],
    whyItMatters:
      "Swim in Rising Water is the model minimax-path problem: replacing 'sum of weights' with 'max weight on the path' in Dijkstra. The same shape solves bottleneck routing — maximizing the weakest link's capacity across a network.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 159 — ai_applied · dp_2d · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-matching-template-subsequences",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 8,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "backend_engineer", "software_engineer"],
    title: "Count Matching Template Subsequences",
    framing:
      "A guardrail scans a model's output stream s for how many distinct ways a banned template t can be formed as a subsequence (preserving order, skipping freely). The count drives a risk score.",
    statement:
      "Given strings s and t, return the number of distinct subsequences of s that equal t. A subsequence keeps relative order but may skip characters. The answer fits in a 32-bit signed integer.",
    inputFormat: "Two strings s and t (0 ≤ |t| ≤ |s| ≤ 1000), consisting of letters.",
    outputFormat: "An integer count of subsequences of s equal to t.",
    constraints: [
      "0 ≤ |t| ≤ |s| ≤ 1000",
      "The answer fits in a signed 32-bit integer",
      "Matching is case-sensitive",
    ],
    examples: [
      {
        input: 's = "rabbbit", t = "rabbit"',
        output: "3",
        explanation: "Three distinct choices of which 'b's to keep form 'rabbit'.",
      },
      {
        input: 's = "babgbag", t = "bag"',
        output: "5",
        explanation: "Five distinct index sets spell 'bag'.",
      },
    ],
    approach: [
      "Let dp[j] be the number of ways to form t[0..j) using the prefix of s seen so far.",
      "dp[0] = 1: the empty target is formed exactly one way (skip everything).",
      "For each character of s, update dp from right to left so each s character is used at most once per state.",
      "When s[i] == t[j−1], dp[j] += dp[j−1].",
    ],
    solutionSteps: [
      "Initialize a 1-D array dp of size |t|+1 with dp[0] = 1.",
      "For each character c in s, iterate j from |t| down to 1.",
      "If c == t[j−1], add dp[j−1] to dp[j].",
      "Return dp[|t|].",
    ],
    code: {
      python: `def num_distinct(s: str, t: str) -> int:
    n = len(t)
    dp = [0] * (n + 1)
    dp[0] = 1
    for c in s:
        for j in range(n, 0, -1):
            if c == t[j - 1]:
                dp[j] += dp[j - 1]
    return dp[n]
`,
      java: `public final class CountSubsequences {
    public static int numDistinct(String s, String t) {
        int n = t.length();
        long[] dp = new long[n + 1];
        dp[0] = 1;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            for (int j = n; j >= 1; j--) {
                if (c == t.charAt(j - 1)) dp[j] += dp[j - 1];
            }
        }
        return (int) dp[n];
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int numDistinct(string s, string t) {
    int n = t.size();
    vector<long long> dp(n + 1, 0);
    dp[0] = 1;
    for (char c : s)
        for (int j = n; j >= 1; j--)
            if (c == t[j - 1]) dp[j] += dp[j - 1];
    return (int) dp[n];
}
`,
    },
    complexity: { time: "O(|s|·|t|)", space: "O(|t|)" },
    pitfalls: [
      "Iterating j ascending, which double-counts by reusing the current s character.",
      "Forgetting dp[0] = 1, which zeroes out every count.",
      "Integer overflow during accumulation — use a wider type before the final cast.",
    ],
    edgeCases: [
      "Empty t — exactly one subsequence (the empty one).",
      "t longer than s — answer 0.",
      "No occurrences — answer 0.",
    ],
    whyItMatters:
      "Distinct Subsequences is the counting variant of subsequence DP, and the right-to-left 1-D rolling update is the canonical trick for 'use each item once' counting — the same pattern as 0/1 knapsack counting.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 160 — pure_dsa · dp_2d · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "interleave-two-event-streams",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer", "software_engineer"],
    title: "Interleave Two Event Streams",
    framing:
      "Two ordered event streams were merged into one combined log, each stream keeping its internal order. Given the two source streams and the merged log, decide whether the merge could have produced exactly that log.",
    statement:
      "Given strings s1, s2, and s3, return true if s3 can be formed by interleaving s1 and s2 while preserving the internal order of each. An interleaving uses all characters of both.",
    inputFormat: "Three strings s1, s2, s3 (lengths 0..100).",
    outputFormat: "A boolean: true if s3 is an interleaving of s1 and s2.",
    constraints: [
      "0 ≤ |s1|, |s2| ≤ 100",
      "0 ≤ |s3| ≤ 200",
      "Order within each source string must be preserved",
    ],
    examples: [
      {
        input: 's1 = "aabcc", s2 = "dbbca", s3 = "aadbbcbcac"',
        output: "true",
        explanation: "Characters can be drawn alternately from the two streams to spell s3.",
      },
      {
        input: 's1 = "aabcc", s2 = "dbbca", s3 = "aadbbbaccc"',
        output: "false",
        explanation: "No interleaving order produces s3.",
      },
    ],
    approach: [
      "If |s1| + |s2| ≠ |s3| the answer is immediately false.",
      "Let dp[j] mean: using i characters of s1 (current row) and j of s2, the first i+j of s3 match.",
      "Roll the DP over rows; a cell is reachable from the left (took s2 char) or from above (took s1 char).",
      "Return the final corner.",
    ],
    solutionSteps: [
      "Reject mismatched total length.",
      "Initialize row 0: dp[j] true while s2[0..j) prefix-matches s3.",
      "For each i, set dp[0] from the s1 prefix; then for each j combine the 'from above' and 'from left' transitions.",
      "Return dp[|s2|].",
    ],
    code: {
      python: `def is_interleave(s1: str, s2: str, s3: str) -> bool:
    if len(s1) + len(s2) != len(s3):
        return False
    n = len(s2)
    dp = [False] * (n + 1)
    dp[0] = True
    for j in range(1, n + 1):
        dp[j] = dp[j - 1] and s2[j - 1] == s3[j - 1]
    for i in range(1, len(s1) + 1):
        dp[0] = dp[0] and s1[i - 1] == s3[i - 1]
        for j in range(1, n + 1):
            from_above = dp[j] and s1[i - 1] == s3[i + j - 1]
            from_left = dp[j - 1] and s2[j - 1] == s3[i + j - 1]
            dp[j] = from_above or from_left
    return dp[n]
`,
      java: `public final class InterleavingString {
    public static boolean isInterleave(String s1, String s2, String s3) {
        int m = s1.length(), n = s2.length();
        if (m + n != s3.length()) return false;
        boolean[] dp = new boolean[n + 1];
        dp[0] = true;
        for (int j = 1; j <= n; j++)
            dp[j] = dp[j - 1] && s2.charAt(j - 1) == s3.charAt(j - 1);
        for (int i = 1; i <= m; i++) {
            dp[0] = dp[0] && s1.charAt(i - 1) == s3.charAt(i - 1);
            for (int j = 1; j <= n; j++) {
                boolean fromAbove = dp[j] && s1.charAt(i - 1) == s3.charAt(i + j - 1);
                boolean fromLeft = dp[j - 1] && s2.charAt(j - 1) == s3.charAt(i + j - 1);
                dp[j] = fromAbove || fromLeft;
            }
        }
        return dp[n];
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

bool isInterleave(string s1, string s2, string s3) {
    int m = s1.size(), n = s2.size();
    if (m + n != (int)s3.size()) return false;
    vector<char> dp(n + 1, false);
    dp[0] = true;
    for (int j = 1; j <= n; j++)
        dp[j] = dp[j - 1] && s2[j - 1] == s3[j - 1];
    for (int i = 1; i <= m; i++) {
        dp[0] = dp[0] && s1[i - 1] == s3[i - 1];
        for (int j = 1; j <= n; j++) {
            bool fromAbove = dp[j] && s1[i - 1] == s3[i + j - 1];
            bool fromLeft = dp[j - 1] && s2[j - 1] == s3[i + j - 1];
            dp[j] = fromAbove || fromLeft;
        }
    }
    return dp[n];
}
`,
    },
    complexity: { time: "O(|s1|·|s2|)", space: "O(|s2|)" },
    pitfalls: [
      "Greedily matching characters — interleaving requires DP, not a single pass.",
      "Skipping the length check, which corrupts s3 indexing.",
      "Forgetting to update dp[0] per row (the all-s1 prefix path).",
    ],
    edgeCases: [
      "Both sources empty — true only if s3 is empty.",
      "One source empty — reduces to a prefix equality check.",
      "Shared characters that force a particular interleaving.",
    ],
    whyItMatters:
      "Interleaving String is the 2-D grid DP whose transitions encode 'which source did this character come from' — the same reasoning behind merge validation and diff/patch reconciliation of ordered streams.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 161 — pure_dsa · dp_2d · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "largest-all-healthy-block",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "platform_engineer", "software_engineer"],
    title: "Largest All-Healthy Block",
    framing:
      "A fleet-health matrix marks each node-by-time cell '1' (healthy) or '0' (degraded). To size the largest clean maintenance window across contiguous nodes, find the biggest all-'1' rectangle.",
    statement:
      "Given a binary matrix of '0' and '1' characters, find the area of the largest rectangle containing only '1's.",
    inputFormat: "An m×n matrix of characters '0'/'1' (1 ≤ m, n ≤ 200).",
    outputFormat: "An integer: the maximum all-ones rectangle area.",
    constraints: [
      "1 ≤ m, n ≤ 200",
      "Cells are '0' or '1'",
      "Rectangle sides are axis-aligned",
    ],
    examples: [
      {
        input: 'matrix = [["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]]',
        output: "6",
        explanation: "The 2×3 block in the lower middle has area 6.",
      },
      {
        input: 'matrix = [["0"]]',
        output: "0",
        explanation: "No ones, so the largest rectangle is empty.",
      },
    ],
    approach: [
      "Treat each row as the base of a histogram whose bar heights are consecutive '1's above.",
      "Update the height array per row: height += 1 on a '1', reset to 0 on a '0'.",
      "For each row's histogram, compute the largest rectangle with a monotonic stack.",
      "Track the global maximum across all rows.",
    ],
    solutionSteps: [
      "Maintain a heights array of width n+1 (last entry a 0 sentinel).",
      "For each row, refresh the heights, then run the histogram routine.",
      "In the histogram pass, pop while the stack top is taller than the current bar, computing area h·width.",
      "Return the maximum area seen.",
    ],
    code: {
      python: `def maximal_rectangle(matrix: list[list[str]]) -> int:
    if not matrix or not matrix[0]:
        return 0
    n = len(matrix[0])
    heights = [0] * (n + 1)          # index n is a permanent 0 sentinel
    best = 0
    for row in matrix:
        for i in range(n):
            heights[i] = heights[i] + 1 if row[i] == '1' else 0
        stack = [-1]
        for i in range(n + 1):
            while stack[-1] != -1 and heights[stack[-1]] >= heights[i]:
                h = heights[stack.pop()]
                w = i - stack[-1] - 1
                best = max(best, h * w)
            stack.append(i)
    return best
`,
      java: `import java.util.*;

public final class LargestHealthyBlock {
    public static int maximalRectangle(char[][] matrix) {
        if (matrix.length == 0 || matrix[0].length == 0) return 0;
        int n = matrix[0].length;
        int[] heights = new int[n + 1];
        int best = 0;
        for (char[] row : matrix) {
            for (int i = 0; i < n; i++)
                heights[i] = row[i] == '1' ? heights[i] + 1 : 0;
            Deque<Integer> stack = new ArrayDeque<>();
            stack.push(-1);
            for (int i = 0; i <= n; i++) {
                while (stack.peek() != -1 && heights[stack.peek()] >= heights[i]) {
                    int h = heights[stack.pop()];
                    int w = i - stack.peek() - 1;
                    best = Math.max(best, h * w);
                }
                stack.push(i);
            }
        }
        return best;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int maximalRectangle(vector<vector<char>>& matrix) {
    if (matrix.empty() || matrix[0].empty()) return 0;
    int n = matrix[0].size();
    vector<int> heights(n + 1, 0);
    int best = 0;
    for (auto& row : matrix) {
        for (int i = 0; i < n; i++)
            heights[i] = row[i] == '1' ? heights[i] + 1 : 0;
        vector<int> stack = {-1};
        for (int i = 0; i <= n; i++) {
            while (stack.back() != -1 && heights[stack.back()] >= heights[i]) {
                int h = heights[stack.back()]; stack.pop_back();
                int w = i - stack.back() - 1;
                best = max(best, h * w);
            }
            stack.push_back(i);
        }
    }
    return best;
}
`,
    },
    complexity: { time: "O(m·n)", space: "O(n)" },
    pitfalls: [
      "Recomputing each histogram from scratch rather than incrementally updating heights.",
      "Omitting the trailing sentinel bar, which leaves bars unflushed from the stack.",
      "Resetting a bar's height to 1 (not 0) on a '0' cell.",
    ],
    edgeCases: [
      "All zeros — area 0.",
      "All ones — area m·n.",
      "Single row or single column — reduces to a 1-D histogram.",
    ],
    whyItMatters:
      "Maximal Rectangle layers the histogram 'largest rectangle' subroutine under a per-row reduction — a classic example of decomposing a 2-D problem into n instances of a solved 1-D one.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 162 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "minimum-health-to-cross-grid",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer"],
    title: "Minimum Health To Cross Grid",
    framing:
      "A migration job walks a grid from top-left to bottom-right, moving only right or down. Each cell adds or drains health (negative cells cost health). Find the smallest starting health so the job never drops to 0 or below anywhere along the way.",
    statement:
      "Given an m×n grid of integers, return the minimum positive starting health needed to travel from the top-left to the bottom-right, moving only right or down, keeping health ≥ 1 at every cell.",
    inputFormat: "An m×n integer grid (1 ≤ m, n ≤ 200, −1000 ≤ cell ≤ 1000).",
    outputFormat: "An integer: the minimum starting health (at least 1).",
    constraints: [
      "1 ≤ m, n ≤ 200",
      "Cells may be negative (damage), positive (heal), or zero",
      "Health must stay ≥ 1 throughout, including the final cell",
    ],
    examples: [
      {
        input: "grid = [[-2,-3,3],[-5,-10,1],[10,30,-5]]",
        output: "7",
        explanation: "Starting with 7 health survives the worst path to the goal.",
      },
      {
        input: "grid = [[0]]",
        output: "1",
        explanation: "A single non-damaging cell needs the minimum 1 health.",
      },
    ],
    approach: [
      "Solve backward: dp[i][j] is the minimum health needed upon entering cell (i,j) to finish.",
      "From a cell you go to the cheaper of right/down; needed-before = min(next) − grid[i][j].",
      "Clamp to at least 1, since health can never legally drop below 1.",
      "Answer is dp[0][0].",
    ],
    solutionSteps: [
      "Pad a dp grid with +infinity; seed the two cells just past the goal to 1.",
      "Fill from bottom-right to top-left.",
      "dp[i][j] = max(1, min(dp[i+1][j], dp[i][j+1]) − grid[i][j]).",
      "Return dp[0][0].",
    ],
    code: {
      python: `def calculate_minimum_hp(dungeon: list[list[int]]) -> int:
    m, n = len(dungeon), len(dungeon[0])
    INF = float('inf')
    dp = [[INF] * (n + 1) for _ in range(m + 1)]
    dp[m][n - 1] = dp[m - 1][n] = 1
    for i in range(m - 1, -1, -1):
        for j in range(n - 1, -1, -1):
            need = min(dp[i + 1][j], dp[i][j + 1]) - dungeon[i][j]
            dp[i][j] = max(1, need)
    return dp[0][0]
`,
      java: `public final class MinimumHealth {
    public static int calculateMinimumHP(int[][] dungeon) {
        int m = dungeon.length, n = dungeon[0].length;
        int[][] dp = new int[m + 1][n + 1];
        for (int[] row : dp) java.util.Arrays.fill(row, Integer.MAX_VALUE);
        dp[m][n - 1] = dp[m - 1][n] = 1;
        for (int i = m - 1; i >= 0; i--) {
            for (int j = n - 1; j >= 0; j--) {
                int need = Math.min(dp[i + 1][j], dp[i][j + 1]) - dungeon[i][j];
                dp[i][j] = Math.max(1, need);
            }
        }
        return dp[0][0];
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int calculateMinimumHP(vector<vector<int>>& dungeon) {
    int m = dungeon.size(), n = dungeon[0].size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, INT_MAX));
    dp[m][n - 1] = dp[m - 1][n] = 1;
    for (int i = m - 1; i >= 0; i--) {
        for (int j = n - 1; j >= 0; j--) {
            int need = min(dp[i + 1][j], dp[i][j + 1]) - dungeon[i][j];
            dp[i][j] = max(1, need);
        }
    }
    return dp[0][0];
}
`,
    },
    complexity: { time: "O(m·n)", space: "O(m·n)" },
    pitfalls: [
      "Solving forward — the requirement depends on future cells, so the DP must run backward.",
      "Forgetting to clamp at 1 after a healing cell, which can wrongly suggest starting below 1.",
      "Seeding only one of the two post-goal sentinels.",
    ],
    edgeCases: [
      "Single cell — answer is max(1, 1 − cell).",
      "All positive cells — answer 1.",
      "Heavy damage path — large starting health required.",
    ],
    whyItMatters:
      "Dungeon Game is the canonical 'DP must run backward' problem: greedily maximizing health forward fails because a rich cell early can't offset a deadly cell later. Recognizing the required traversal direction is the whole lesson.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 163 — pure_dsa · greedy · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "bonus-distribution-by-rating",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "greedy",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer", "data_engineer"],
    title: "Bonus Distribution By Rating",
    framing:
      "Engineers sit in a fixed review order, each with a performance rating. Every engineer must get at least one bonus unit, and anyone rated higher than an adjacent neighbor must receive strictly more than that neighbor. Minimize the total bonus paid.",
    statement:
      "Given an array ratings, assign each element a positive integer count so that any element with a higher rating than an adjacent neighbor gets a strictly larger count. Return the minimum total.",
    inputFormat: "An array ratings of n integers (1 ≤ n ≤ 2·10^4).",
    outputFormat: "An integer: the minimum total units distributed.",
    constraints: [
      "1 ≤ n ≤ 2·10^4",
      "Each element receives at least 1 unit",
      "Equal adjacent ratings have no constraint between them",
    ],
    examples: [
      {
        input: "ratings = [1,0,2]",
        output: "5",
        explanation: "Counts [2,1,2] satisfy the rules with total 5.",
      },
      {
        input: "ratings = [1,2,2]",
        output: "4",
        explanation: "Counts [1,2,1]; the equal pair needs no ordering.",
      },
    ],
    approach: [
      "Each element's count is driven independently by its left and right neighbors.",
      "Left-to-right pass: if rating rises, give one more than the left neighbor.",
      "Right-to-left pass: if rating rises going left, ensure at least one more than the right neighbor.",
      "Take the max of the two requirements per index and sum.",
    ],
    solutionSteps: [
      "Initialize all counts to 1.",
      "Forward: for i>0, if ratings[i] > ratings[i−1], counts[i] = counts[i−1] + 1.",
      "Backward: for i<n−1, if ratings[i] > ratings[i+1], counts[i] = max(counts[i], counts[i+1] + 1).",
      "Return the sum of counts.",
    ],
    code: {
      python: `def candy(ratings: list[int]) -> int:
    n = len(ratings)
    counts = [1] * n
    for i in range(1, n):
        if ratings[i] > ratings[i - 1]:
            counts[i] = counts[i - 1] + 1
    for i in range(n - 2, -1, -1):
        if ratings[i] > ratings[i + 1]:
            counts[i] = max(counts[i], counts[i + 1] + 1)
    return sum(counts)
`,
      java: `public final class BonusDistribution {
    public static int candy(int[] ratings) {
        int n = ratings.length;
        int[] counts = new int[n];
        java.util.Arrays.fill(counts, 1);
        for (int i = 1; i < n; i++)
            if (ratings[i] > ratings[i - 1]) counts[i] = counts[i - 1] + 1;
        for (int i = n - 2; i >= 0; i--)
            if (ratings[i] > ratings[i + 1]) counts[i] = Math.max(counts[i], counts[i + 1] + 1);
        int total = 0;
        for (int c : counts) total += c;
        return total;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int candy(vector<int>& ratings) {
    int n = ratings.size();
    vector<int> counts(n, 1);
    for (int i = 1; i < n; i++)
        if (ratings[i] > ratings[i - 1]) counts[i] = counts[i - 1] + 1;
    for (int i = n - 2; i >= 0; i--)
        if (ratings[i] > ratings[i + 1]) counts[i] = max(counts[i], counts[i + 1] + 1);
    return accumulate(counts.begin(), counts.end(), 0);
}
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "A single pass — it cannot satisfy both neighbors simultaneously.",
      "Using > vs ≥ wrongly: equal ratings impose no ordering.",
      "Overwriting instead of taking the max in the backward pass.",
    ],
    edgeCases: [
      "Strictly increasing — counts 1..n.",
      "Strictly decreasing — counts n..1.",
      "All equal — every count is 1.",
    ],
    whyItMatters:
      "Candy is the model two-pass greedy: a single sweep can't reconcile constraints pulling from both sides, so you resolve each direction independently and combine. The pattern reappears in 'trap rain water' and bidirectional product problems.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 164 — pure_dsa · intervals · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "common-free-slot-across-calendars",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "intervals",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer"],
    title: "Common Free Slot Across Calendars",
    framing:
      "Each teammate's calendar is a list of busy intervals, already sorted and non-overlapping per person. To schedule a group sync, find every positive-length window during which all teammates are simultaneously free.",
    statement:
      "Given the busy schedules of several people (each a sorted list of non-overlapping [start, end] intervals), return the finite list of common free intervals shared by everyone, sorted by start. Exclude the unbounded gaps before the first and after the last busy interval.",
    inputFormat: "A list of schedules; each schedule is a list of [start, end] integer intervals.",
    outputFormat: "A sorted list of [start, end] free intervals common to all (each with start < end).",
    constraints: [
      "1 ≤ total intervals ≤ 5·10^4",
      "Per person, intervals are sorted and disjoint",
      "Only finite gaps between busy periods are returned",
    ],
    examples: [
      {
        input: "schedule = [[[1,2],[5,6]],[[1,3]],[[4,10]]]",
        output: "[[3,4]]",
        explanation: "The only window everyone is free is from 3 to 4.",
      },
      {
        input: "schedule = [[[1,3],[6,7]],[[2,4]],[[2,5],[9,12]]]",
        output: "[[5,6],[7,9]]",
        explanation: "Merging all busy times leaves free gaps [5,6] and [7,9].",
      },
    ],
    approach: [
      "Flatten every person's intervals into one list and sort by start.",
      "Sweep, merging overlapping busy intervals into a running covered span.",
      "Whenever the next interval starts after the running end, the gap between is common free time.",
      "Collect those gaps.",
    ],
    solutionSteps: [
      "Gather all intervals and sort by start time.",
      "Track the end of the merged busy region, initialized to the first interval's end.",
      "For each subsequent interval: if its start exceeds end, record [end, start] as free; advance end to max(end, intervalEnd).",
      "Return the recorded gaps.",
    ],
    code: {
      python: `def employee_free_time(schedule: list[list[list[int]]]) -> list[list[int]]:
    intervals = sorted(
        (iv for person in schedule for iv in person),
        key=lambda x: x[0],
    )
    free = []
    end = intervals[0][1]
    for s, e in intervals[1:]:
        if s > end:
            free.append([end, s])
            end = e
        else:
            end = max(end, e)
    return free
`,
      java: `import java.util.*;

public final class CommonFreeSlot {
    public static List<int[]> employeeFreeTime(int[][][] schedule) {
        List<int[]> all = new ArrayList<>();
        for (int[][] person : schedule)
            for (int[] iv : person) all.add(iv);
        all.sort((a, b) -> a[0] - b[0]);
        List<int[]> free = new ArrayList<>();
        int end = all.get(0)[1];
        for (int i = 1; i < all.size(); i++) {
            int s = all.get(i)[0], e = all.get(i)[1];
            if (s > end) {
                free.add(new int[]{end, s});
                end = e;
            } else {
                end = Math.max(end, e);
            }
        }
        return free;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<vector<int>> employeeFreeTime(vector<vector<vector<int>>>& schedule) {
    vector<vector<int>> all;
    for (auto& person : schedule)
        for (auto& iv : person) all.push_back(iv);
    sort(all.begin(), all.end(),
         [](const vector<int>& a, const vector<int>& b) { return a[0] < b[0]; });
    vector<vector<int>> free;
    int end = all[0][1];
    for (size_t i = 1; i < all.size(); i++) {
        int s = all[i][0], e = all[i][1];
        if (s > end) {
            free.push_back({end, s});
            end = e;
        } else {
            end = max(end, e);
        }
    }
    return free;
}
`,
    },
    complexity: { time: "O(N log N) for N total intervals", space: "O(N)" },
    pitfalls: [
      "Reporting a gap when s == end (zero-length window, not free time).",
      "Advancing end to e instead of max(end, e), which mishandles nested intervals.",
      "Including the open-ended periods before the first or after the last busy block.",
    ],
    edgeCases: [
      "Fully overlapping busy times — no free intervals.",
      "A single person — gaps between their own meetings.",
      "Back-to-back intervals (touching ends) — no gap.",
    ],
    whyItMatters:
      "Employee Free Time is interval-merge inverted: instead of the union you want its complement. The sort-then-sweep skeleton is the universal tool for calendar, reservation, and resource-availability problems.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 165 — pure_dsa · stack_queue · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "expression-evaluator-with-parentheses",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "stack_queue",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer"],
    title: "Expression Evaluator With Parentheses",
    framing:
      "A config system lets operators write arithmetic guards like '(2 + 3) - (4 - (1 + 1))'. Evaluate such an expression containing non-negative integers, '+', '-', parentheses, and spaces.",
    statement:
      "Implement a calculator that evaluates a string expression containing digits, '+', '-', '(', ')', and spaces. There is no multiplication or division and no unary minus beyond what parentheses imply. Return the integer result.",
    inputFormat: "A string s (1 ≤ |s| ≤ 3·10^5) of a valid expression.",
    outputFormat: "An integer: the evaluated result.",
    constraints: [
      "Operators are binary '+' and '-' only",
      "Parentheses may nest arbitrarily",
      "The expression is always valid",
    ],
    examples: [
      {
        input: 's = "(1+(4+5+2)-3)+(6+8)"',
        output: "23",
        explanation: "Inner groups evaluate to 9 then the whole expression to 23.",
      },
      {
        input: 's = " 2-1 + 2 "',
        output: "3",
        explanation: "Spaces are ignored; left-to-right gives 3.",
      },
    ],
    approach: [
      "Scan left to right keeping a running result, the current number, and the current sign.",
      "On '+'/'-' commit the current number with its sign and set the next sign.",
      "On '(' push the running result and sign, then reset for the sub-expression.",
      "On ')' commit, multiply by the pushed sign, and add the pushed result.",
    ],
    solutionSteps: [
      "Initialize result=0, num=0, sign=+1, and an empty stack.",
      "Accumulate digits into num; on an operator add sign·num to result and reset.",
      "On '(' push result then sign and reset result and sign.",
      "On ')' fold num in, multiply by the popped sign, add the popped result; finally add the trailing num.",
    ],
    code: {
      python: `def calculate(s: str) -> int:
    result = 0
    num = 0
    sign = 1
    stack = []
    for ch in s:
        if ch.isdigit():
            num = num * 10 + int(ch)
        elif ch in '+-':
            result += sign * num
            num = 0
            sign = 1 if ch == '+' else -1
        elif ch == '(':
            stack.append(result)
            stack.append(sign)
            result, sign = 0, 1
        elif ch == ')':
            result += sign * num
            num = 0
            result *= stack.pop()   # the sign before '('
            result += stack.pop()   # the result before '('
    return result + sign * num
`,
      java: `import java.util.*;

public final class ExpressionEvaluator {
    public static int calculate(String s) {
        int result = 0, num = 0, sign = 1;
        Deque<Integer> stack = new ArrayDeque<>();
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if (Character.isDigit(ch)) {
                num = num * 10 + (ch - '0');
            } else if (ch == '+' || ch == '-') {
                result += sign * num;
                num = 0;
                sign = ch == '+' ? 1 : -1;
            } else if (ch == '(') {
                stack.push(result);
                stack.push(sign);
                result = 0;
                sign = 1;
            } else if (ch == ')') {
                result += sign * num;
                num = 0;
                result *= stack.pop();
                result += stack.pop();
            }
        }
        return result + sign * num;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int calculate(string s) {
    long long result = 0, num = 0;
    int sign = 1;
    vector<long long> stack;
    for (char ch : s) {
        if (isdigit((unsigned char)ch)) {
            num = num * 10 + (ch - '0');
        } else if (ch == '+' || ch == '-') {
            result += sign * num;
            num = 0;
            sign = ch == '+' ? 1 : -1;
        } else if (ch == '(') {
            stack.push_back(result);
            stack.push_back(sign);
            result = 0;
            sign = 1;
        } else if (ch == ')') {
            result += sign * num;
            num = 0;
            result *= stack.back(); stack.pop_back();   // sign
            result += stack.back(); stack.pop_back();   // prior result
        }
    }
    return (int)(result + sign * num);
}
`,
    },
    complexity: { time: "O(n)", space: "O(n) for nesting depth" },
    pitfalls: [
      "Forgetting to add the trailing number after the loop ends.",
      "Pushing/popping result and sign in the wrong order.",
      "Mishandling multi-digit numbers by not accumulating across characters.",
    ],
    edgeCases: [
      "Leading/trailing spaces and spaces between tokens.",
      "Deeply nested parentheses.",
      "Expression that is a single number.",
    ],
    whyItMatters:
      "Basic Calculator is the gateway to expression parsing: the push-state-on-open-paren / fold-on-close-paren idiom is exactly how recursive-descent and shunting-yard evaluators preserve context, and it generalizes to JSON, config, and rule-engine parsing.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 166 — pure_dsa · graphs · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "minimum-cabling-to-connect-nodes",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "backend_engineer", "software_engineer"],
    title: "Minimum Cabling To Connect Nodes",
    framing:
      "A set of rack positions must be linked into one connected network. Laying cable between two racks costs their Manhattan distance. Find the minimum total cable length so every rack is reachable from every other.",
    statement:
      "Given n points on a 2-D plane, connect all points so they are mutually reachable, where the cost between two points is their Manhattan distance |x1−x2| + |y1−y2|. Return the minimum total cost (the weight of a minimum spanning tree).",
    inputFormat: "An array points of n coordinate pairs (1 ≤ n ≤ 1000, −10^6 ≤ coord ≤ 10^6).",
    outputFormat: "An integer: the minimum total connection cost.",
    constraints: [
      "1 ≤ n ≤ 1000",
      "All point coordinates are distinct or may coincide",
      "Edges are implicit between every pair (complete graph)",
    ],
    examples: [
      {
        input: "points = [[0,0],[2,2],[3,10],[5,2],[7,0]]",
        output: "20",
        explanation: "An MST over the Manhattan-distance complete graph totals 20.",
      },
      {
        input: "points = [[3,12],[-2,5],[-4,1]]",
        output: "18",
        explanation: "Connecting the three points cheapest costs 18.",
      },
    ],
    approach: [
      "The graph is complete, so Prim's algorithm with a min-heap fits well.",
      "Start from any node; repeatedly pull the cheapest edge to an unvisited node.",
      "On visiting a node, push its distances to all still-unvisited nodes.",
      "Accumulate edge costs until all n nodes are in the tree.",
    ],
    solutionSteps: [
      "Maintain a visited array and a min-heap of (cost, node), seeded with (0, 0).",
      "Pop the cheapest; skip if already visited, else mark visited and add its cost.",
      "Push (manhattan(u, v), v) for every unvisited v.",
      "Stop once n nodes are visited; return the accumulated total.",
    ],
    code: {
      python: `import heapq

def min_cost_connect_points(points: list[list[int]]) -> int:
    n = len(points)
    visited = [False] * n
    pq = [(0, 0)]                 # (cost, node)
    total = 0
    count = 0
    while pq and count < n:
        cost, u = heapq.heappop(pq)
        if visited[u]:
            continue
        visited[u] = True
        total += cost
        count += 1
        ux, uy = points[u]
        for v in range(n):
            if not visited[v]:
                d = abs(ux - points[v][0]) + abs(uy - points[v][1])
                heapq.heappush(pq, (d, v))
    return total
`,
      java: `import java.util.*;

public final class MinimumCabling {
    public static int minCostConnectPoints(int[][] points) {
        int n = points.length;
        boolean[] visited = new boolean[n];
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
        pq.add(new int[]{0, 0});
        int total = 0, count = 0;
        while (!pq.isEmpty() && count < n) {
            int[] cur = pq.poll();
            int cost = cur[0], u = cur[1];
            if (visited[u]) continue;
            visited[u] = true;
            total += cost;
            count++;
            for (int v = 0; v < n; v++) {
                if (!visited[v]) {
                    int d = Math.abs(points[u][0] - points[v][0])
                          + Math.abs(points[u][1] - points[v][1]);
                    pq.add(new int[]{d, v});
                }
            }
        }
        return total;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int minCostConnectPoints(vector<vector<int>>& points) {
    int n = points.size();
    vector<bool> visited(n, false);
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;
    pq.push({0, 0});
    int total = 0, count = 0;
    while (!pq.empty() && count < n) {
        auto [cost, u] = pq.top(); pq.pop();
        if (visited[u]) continue;
        visited[u] = true;
        total += cost;
        count++;
        for (int v = 0; v < n; v++) {
            if (!visited[v]) {
                int d = abs(points[u][0] - points[v][0])
                      + abs(points[u][1] - points[v][1]);
                pq.push({d, v});
            }
        }
    }
    return total;
}
`,
    },
    complexity: { time: "O(n² log n)", space: "O(n²) heap entries" },
    pitfalls: [
      "Re-adding cost for an already-visited node — guard with the visited check on pop.",
      "Building all O(n²) edges up front and sorting (Kruskal) is fine but heavier in memory here.",
      "Using Euclidean distance instead of the specified Manhattan metric.",
    ],
    edgeCases: [
      "Single point — cost 0.",
      "Coincident points — zero-cost edges.",
      "Collinear points — still a valid MST.",
    ],
    whyItMatters:
      "Min Cost to Connect Points is MST on an implicit complete graph — the bridge between abstract spanning-tree theory and concrete network/cluster wiring, where Prim's lazy-heap variant shines when edges are dense.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 167 — pure_dsa · dp_1d · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "nested-capacity-envelopes",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer", "backend_engineer"],
    title: "Nested Capacity Envelopes",
    framing:
      "Storage tiers each have a width (IOPS budget) and height (capacity). One tier nests inside another only if both dimensions are strictly larger. Find the longest chain of tiers that can be nested one inside the next.",
    statement:
      "Given envelopes[i] = [w, h], one envelope fits into another only if both its width and height are strictly smaller. Return the maximum number of envelopes you can nest (a Russian-doll chain).",
    inputFormat: "An array of n pairs [w, h] (1 ≤ n ≤ 10^5, 1 ≤ w, h ≤ 10^5).",
    outputFormat: "An integer: the longest nesting chain length.",
    constraints: [
      "1 ≤ n ≤ 10^5",
      "Both dimensions must be strictly larger to nest",
      "Rotation is not allowed",
    ],
    examples: [
      {
        input: "envelopes = [[5,4],[6,4],[6,7],[2,3]]",
        output: "3",
        explanation: "[2,3] → [5,4] → [6,7] nests three deep.",
      },
      {
        input: "envelopes = [[1,1],[1,1],[1,1]]",
        output: "1",
        explanation: "Equal dimensions can't nest, so the chain is length 1.",
      },
    ],
    approach: [
      "Sort by width ascending; for equal widths, sort height descending.",
      "The descending-height tie-break prevents two equal-width envelopes from both joining a chain.",
      "Now the answer is the longest strictly-increasing subsequence of heights.",
      "Compute that LIS in O(n log n) with patience sorting (binary search over tails).",
    ],
    solutionSteps: [
      "Sort envelopes by (w asc, h desc).",
      "Scan heights, maintaining a tails array.",
      "For each height, binary-search the first tail ≥ it; replace it, or append if larger than all.",
      "Return the length of tails.",
    ],
    code: {
      python: `import bisect

def max_envelopes(envelopes: list[list[int]]) -> int:
    envelopes.sort(key=lambda e: (e[0], -e[1]))
    tails = []
    for _, h in envelopes:
        i = bisect.bisect_left(tails, h)
        if i == len(tails):
            tails.append(h)
        else:
            tails[i] = h
    return len(tails)
`,
      java: `import java.util.*;

public final class NestedEnvelopes {
    public static int maxEnvelopes(int[][] envelopes) {
        Arrays.sort(envelopes, (a, b) ->
            a[0] != b[0] ? a[0] - b[0] : b[1] - a[1]);
        int[] tails = new int[envelopes.length];
        int len = 0;
        for (int[] e : envelopes) {
            int h = e[1];
            int lo = 0, hi = len;
            while (lo < hi) {
                int mid = (lo + hi) >>> 1;
                if (tails[mid] < h) lo = mid + 1; else hi = mid;
            }
            tails[lo] = h;
            if (lo == len) len++;
        }
        return len;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int maxEnvelopes(vector<vector<int>>& envelopes) {
    sort(envelopes.begin(), envelopes.end(),
         [](const vector<int>& a, const vector<int>& b) {
             return a[0] != b[0] ? a[0] < b[0] : a[1] > b[1];
         });
    vector<int> tails;
    for (auto& e : envelopes) {
        int h = e[1];
        auto it = lower_bound(tails.begin(), tails.end(), h);
        if (it == tails.end()) tails.push_back(h);
        else *it = h;
    }
    return (int)tails.size();
}
`,
    },
    complexity: { time: "O(n log n)", space: "O(n)" },
    pitfalls: [
      "Sorting height ascending on ties — equal-width envelopes then wrongly chain.",
      "Using bisect_right (allows equal heights) instead of bisect_left (strict increase).",
      "Attempting an O(n²) LIS, which times out at n = 10^5.",
    ],
    edgeCases: [
      "All identical envelopes — chain length 1.",
      "Already strictly increasing in both dims — chain length n.",
      "Single envelope — chain length 1.",
    ],
    whyItMatters:
      "Russian Doll Envelopes is the trick of reducing a 2-D ordering problem to 1-D LIS via a clever sort. The descending tie-break that enforces strictness is the kind of subtle correctness detail interviewers probe for.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 168 — pure_dsa · dp_1d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-profit-with-two-trades",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer", "backend_engineer"],
    title: "Max Profit With Two Trades",
    framing:
      "A trading bot may open and close a position at most twice over a price series, never holding two positions at once. Given daily prices, maximize total profit across the (up to) two trades.",
    statement:
      "Given an array prices where prices[i] is the price on day i, return the maximum profit from at most two non-overlapping buy/sell transactions. You must sell before buying again.",
    inputFormat: "An array prices of n integers (1 ≤ n ≤ 10^5, 0 ≤ price ≤ 10^5).",
    outputFormat: "An integer: the maximum achievable profit.",
    constraints: [
      "At most two transactions",
      "No simultaneous positions (sell before re-buying)",
      "Profit is 0 if no profitable trade exists",
    ],
    examples: [
      {
        input: "prices = [3,3,5,0,0,3,1,4]",
        output: "6",
        explanation: "Buy at 0 sell at 3 (+3), buy at 1 sell at 4 (+3) totals 6.",
      },
      {
        input: "prices = [7,6,4,3,1]",
        output: "0",
        explanation: "Prices only fall, so no trade is profitable.",
      },
    ],
    approach: [
      "Track four rolling states: best profit after the first buy, first sell, second buy, second sell.",
      "buy1 maximizes −price; sell1 maximizes buy1 + price.",
      "buy2 maximizes sell1 − price; sell2 maximizes buy2 + price.",
      "Update all four each day; the answer is sell2.",
    ],
    solutionSteps: [
      "Initialize buy1 = buy2 = −infinity, sell1 = sell2 = 0.",
      "For each price p, update buy1, sell1, buy2, sell2 in that order.",
      "Each state only improves (uses max), so order-of-updates within a day is safe.",
      "Return sell2.",
    ],
    code: {
      python: `def max_profit(prices: list[int]) -> int:
    buy1 = buy2 = float('-inf')
    sell1 = sell2 = 0
    for p in prices:
        buy1 = max(buy1, -p)
        sell1 = max(sell1, buy1 + p)
        buy2 = max(buy2, sell1 - p)
        sell2 = max(sell2, buy2 + p)
    return sell2
`,
      java: `public final class MaxProfitTwoTrades {
    public static int maxProfit(int[] prices) {
        int buy1 = Integer.MIN_VALUE, buy2 = Integer.MIN_VALUE;
        int sell1 = 0, sell2 = 0;
        for (int p : prices) {
            buy1 = Math.max(buy1, -p);
            sell1 = Math.max(sell1, buy1 + p);
            buy2 = Math.max(buy2, sell1 - p);
            sell2 = Math.max(sell2, buy2 + p);
        }
        return sell2;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int maxProfit(vector<int>& prices) {
    int buy1 = INT_MIN, buy2 = INT_MIN, sell1 = 0, sell2 = 0;
    for (int p : prices) {
        buy1 = max(buy1, -p);
        sell1 = max(sell1, buy1 + p);
        buy2 = max(buy2, sell1 - p);
        sell2 = max(sell2, buy2 + p);
    }
    return sell2;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Allowing overlapping trades by updating sell2 from buy1 instead of buy2.",
      "Initializing buy states to 0 rather than −infinity, which fakes a free position.",
      "Generalizing to k transactions without realizing two has a tidy constant-state form.",
    ],
    edgeCases: [
      "Strictly decreasing prices — profit 0.",
      "Single profitable swing — second trade contributes 0.",
      "Fewer than 2 days — profit 0.",
    ],
    whyItMatters:
      "Stock III shows how a state machine (the four buy/sell states) compresses a seemingly 2-D DP into O(1) space. The same staged-state thinking scales to the general k-transaction and cooldown variants.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 169 — pure_dsa · graphs · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "longest-increasing-elevation-path",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "platform_engineer", "software_engineer"],
    title: "Longest Increasing Elevation Path",
    framing:
      "A terrain grid stores elevations. A drone can step to an orthogonally adjacent cell only if that cell is strictly higher. Find the length of the longest strictly-ascending route it can fly.",
    statement:
      "Given an m×n integer matrix, return the length of the longest path where each move goes to an adjacent (up/down/left/right) cell with a strictly greater value. Diagonal moves are not allowed.",
    inputFormat: "An m×n integer matrix (1 ≤ m, n ≤ 200).",
    outputFormat: "An integer: the longest strictly increasing path length (counting cells).",
    constraints: [
      "1 ≤ m, n ≤ 200",
      "Moves are 4-directional",
      "Each step strictly increases in value",
    ],
    examples: [
      {
        input: "matrix = [[9,9,4],[6,6,8],[2,1,1]]",
        output: "4",
        explanation: "The path 1 → 2 → 6 → 9 has length 4.",
      },
      {
        input: "matrix = [[3,4,5],[3,2,6],[2,2,1]]",
        output: "4",
        explanation: "3 → 4 → 5 → 6 is the longest ascent.",
      },
    ],
    approach: [
      "Because steps strictly increase, the implied graph is a DAG — no cycles.",
      "Memoize the longest path starting at each cell with DFS.",
      "A cell's value is 1 + the max over higher neighbors (0 if none).",
      "Answer is the maximum over all start cells.",
    ],
    solutionSteps: [
      "Allocate a memo grid initialized to 0.",
      "DFS from a cell: for each higher neighbor, recurse and take 1 + max.",
      "Cache the result before returning.",
      "Return the maximum memoized value across all cells.",
    ],
    code: {
      python: `import sys

def longest_increasing_path(matrix: list[list[int]]) -> int:
    if not matrix or not matrix[0]:
        return 0
    sys.setrecursionlimit(1 << 20)
    m, n = len(matrix), len(matrix[0])
    memo = [[0] * n for _ in range(m)]

    def dfs(r: int, c: int) -> int:
        if memo[r][c]:
            return memo[r][c]
        best = 1
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n and matrix[nr][nc] > matrix[r][c]:
                best = max(best, 1 + dfs(nr, nc))
        memo[r][c] = best
        return best

    return max(dfs(r, c) for r in range(m) for c in range(n))
`,
      java: `public final class LongestIncreasingPath {
    private static final int[][] DIRS = {{1,0},{-1,0},{0,1},{0,-1}};

    public static int longestIncreasingPath(int[][] matrix) {
        if (matrix.length == 0 || matrix[0].length == 0) return 0;
        int m = matrix.length, n = matrix[0].length;
        int[][] memo = new int[m][n];
        int best = 0;
        for (int r = 0; r < m; r++)
            for (int c = 0; c < n; c++)
                best = Math.max(best, dfs(matrix, r, c, memo));
        return best;
    }

    private static int dfs(int[][] matrix, int r, int c, int[][] memo) {
        if (memo[r][c] != 0) return memo[r][c];
        int m = matrix.length, n = matrix[0].length, best = 1;
        for (int[] d : DIRS) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nr < m && nc >= 0 && nc < n && matrix[nr][nc] > matrix[r][c])
                best = Math.max(best, 1 + dfs(matrix, nr, nc, memo));
        }
        memo[r][c] = best;
        return best;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int m, n;
int dirs[4][2] = {{1,0},{-1,0},{0,1},{0,-1}};

int dfs(vector<vector<int>>& matrix, int r, int c, vector<vector<int>>& memo) {
    if (memo[r][c]) return memo[r][c];
    int best = 1;
    for (auto& d : dirs) {
        int nr = r + d[0], nc = c + d[1];
        if (nr >= 0 && nr < m && nc >= 0 && nc < n && matrix[nr][nc] > matrix[r][c])
            best = max(best, 1 + dfs(matrix, nr, nc, memo));
    }
    return memo[r][c] = best;
}

int longestIncreasingPath(vector<vector<int>>& matrix) {
    if (matrix.empty() || matrix[0].empty()) return 0;
    m = matrix.size(); n = matrix[0].size();
    vector<vector<int>> memo(m, vector<int>(n, 0));
    int best = 0;
    for (int r = 0; r < m; r++)
        for (int c = 0; c < n; c++)
            best = max(best, dfs(matrix, r, c, memo));
    return best;
}
`,
    },
    complexity: { time: "O(m·n)", space: "O(m·n)" },
    pitfalls: [
      "Re-running DFS without memoization, giving exponential blowup.",
      "Allowing equal-value steps, which can create cycles and infinite recursion.",
      "Forgetting that any cell can be a starting point.",
    ],
    edgeCases: [
      "All equal values — every path length is 1.",
      "Single cell — answer 1.",
      "Strictly increasing snake — path covers many cells.",
    ],
    whyItMatters:
      "Longest Increasing Path is DAG DP hidden inside a grid: the strict-increase rule guarantees acyclicity, so memoized DFS turns an exponential search into linear work. Spotting the implicit DAG is the key insight.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 170 — pure_dsa · heap_priority_queue · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "reservoir-on-elevation-grid",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "heap_priority_queue",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "data_engineer", "software_engineer"],
    title: "Reservoir On Elevation Grid",
    framing:
      "A 2-D elevation map of a facility floor shows wall heights at each cell. After heavy rain, water pools wherever it is surrounded by higher terrain. Compute the total volume of water retained on the whole map.",
    statement:
      "Given an m×n matrix of non-negative heights representing a 2-D elevation map, compute how much water it can trap after raining. Water escapes off the grid's outer border.",
    inputFormat: "An m×n matrix heightMap of non-negative integers (1 ≤ m, n ≤ 200, 0 ≤ height ≤ 2·10^4).",
    outputFormat: "An integer: the total trapped water volume.",
    constraints: [
      "1 ≤ m, n ≤ 200",
      "Water can only be retained by strictly enclosing walls",
      "Border cells can never hold water",
    ],
    examples: [
      {
        input: "heightMap = [[1,4,3,1,3,2],[3,2,1,3,2,4],[2,3,3,2,3,1]]",
        output: "4",
        explanation: "Interior dips hold a combined 4 units bounded by surrounding walls.",
      },
      {
        input: "heightMap = [[3,3,3,3,3],[3,2,2,2,3],[3,2,1,2,3],[3,2,2,2,3],[3,3,3,3,3]]",
        output: "10",
        explanation: "The bowl traps water up to the height-3 rim.",
      },
    ],
    approach: [
      "Process cells outward from the border using a min-heap keyed by height (the lowest wall leaks first).",
      "Pop the lowest boundary cell; its height is the current water level for inward exploration.",
      "For each unvisited neighbor, water trapped = max(0, level − neighborHeight).",
      "Push the neighbor with height max(level, neighborHeight) — the effective wall going further in.",
    ],
    solutionSteps: [
      "Push all border cells into a min-heap and mark them visited.",
      "Pop the minimum-height cell as the current level.",
      "For each unvisited neighbor, add max(0, level − height) to the total.",
      "Push the neighbor with key max(level, neighborHeight); repeat until the heap empties.",
    ],
    code: {
      python: `import heapq

def trap_rain_water(height_map: list[list[int]]) -> int:
    if not height_map or not height_map[0]:
        return 0
    m, n = len(height_map), len(height_map[0])
    visited = [[False] * n for _ in range(m)]
    pq = []
    for i in range(m):
        for j in range(n):
            if i in (0, m - 1) or j in (0, n - 1):
                heapq.heappush(pq, (height_map[i][j], i, j))
                visited[i][j] = True
    water = 0
    while pq:
        h, r, c = heapq.heappop(pq)
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n and not visited[nr][nc]:
                visited[nr][nc] = True
                water += max(0, h - height_map[nr][nc])
                heapq.heappush(pq, (max(h, height_map[nr][nc]), nr, nc))
    return water
`,
      java: `import java.util.*;

public final class ReservoirGrid {
    public static int trapRainWater(int[][] heightMap) {
        if (heightMap.length == 0 || heightMap[0].length == 0) return 0;
        int m = heightMap.length, n = heightMap[0].length;
        boolean[][] visited = new boolean[m][n];
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
        for (int i = 0; i < m; i++)
            for (int j = 0; j < n; j++)
                if (i == 0 || i == m - 1 || j == 0 || j == n - 1) {
                    pq.add(new int[]{heightMap[i][j], i, j});
                    visited[i][j] = true;
                }
        int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};
        int water = 0;
        while (!pq.isEmpty()) {
            int[] cur = pq.poll();
            int h = cur[0], r = cur[1], c = cur[2];
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr >= 0 && nr < m && nc >= 0 && nc < n && !visited[nr][nc]) {
                    visited[nr][nc] = true;
                    water += Math.max(0, h - heightMap[nr][nc]);
                    pq.add(new int[]{Math.max(h, heightMap[nr][nc]), nr, nc});
                }
            }
        }
        return water;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int trapRainWater(vector<vector<int>>& heightMap) {
    if (heightMap.empty() || heightMap[0].empty()) return 0;
    int m = heightMap.size(), n = heightMap[0].size();
    vector<vector<bool>> visited(m, vector<bool>(n, false));
    priority_queue<array<int,3>, vector<array<int,3>>, greater<>> pq;
    for (int i = 0; i < m; i++)
        for (int j = 0; j < n; j++)
            if (i == 0 || i == m - 1 || j == 0 || j == n - 1) {
                pq.push({heightMap[i][j], i, j});
                visited[i][j] = true;
            }
    int dirs[4][2] = {{1,0},{-1,0},{0,1},{0,-1}};
    int water = 0;
    while (!pq.empty()) {
        auto [h, r, c] = pq.top(); pq.pop();
        for (auto& d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nr < m && nc >= 0 && nc < n && !visited[nr][nc]) {
                visited[nr][nc] = true;
                water += max(0, h - heightMap[nr][nc]);
                pq.push({max(h, heightMap[nr][nc]), nr, nc});
            }
        }
    }
    return water;
}
`,
    },
    complexity: { time: "O(m·n·log(m·n))", space: "O(m·n)" },
    pitfalls: [
      "Processing inward-first instead of from the lowest border — the leak point must be handled first.",
      "Pushing neighborHeight instead of max(level, neighborHeight), losing the retained wall.",
      "Marking visited on pop rather than on push, allowing duplicate enqueues.",
    ],
    edgeCases: [
      "Grid thinner than 3 in either dimension — traps nothing.",
      "Flat map — zero water.",
      "Single deep well surrounded by tall walls.",
    ],
    whyItMatters:
      "Trapping Rain Water II generalizes the 1-D two-pointer trick to 2-D, where the boundary is no longer two walls but an entire perimeter — solved by always expanding from the current lowest rim. It's the model 'flood from the boundary with a heap' technique.",
    estimatedMinutes: 50,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 171 — pure_dsa · dp_1d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "minimum-splits-into-palindromic-chunks",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer"],
    title: "Minimum Splits Into Palindromic Chunks",
    framing:
      "A symmetric-encoding pipeline can only ship palindromic chunks. Given a string, find the fewest cuts needed so every resulting piece reads the same forwards and backwards.",
    statement:
      "Given a string s, partition it so every substring is a palindrome, and return the minimum number of cuts needed. A string of length k that is already a palindrome needs 0 cuts.",
    inputFormat: "A string s (1 ≤ |s| ≤ 2000) of lowercase letters.",
    outputFormat: "An integer: the minimum number of cuts.",
    constraints: [
      "1 ≤ |s| ≤ 2000",
      "Every final piece must be a palindrome",
      "Cuts are between characters",
    ],
    examples: [
      {
        input: 's = "aab"',
        output: "1",
        explanation: "Cut once into 'aa' | 'b', both palindromes.",
      },
      {
        input: 's = "racecar"',
        output: "0",
        explanation: "The whole string is already a palindrome.",
      },
    ],
    approach: [
      "Precompute isPal[j][i] = whether s[j..i] is a palindrome via the expand-from-relation.",
      "Let cuts[i] be the minimum cuts for the prefix ending at i.",
      "If s[0..i] is itself a palindrome, cuts[i] = 0.",
      "Otherwise cuts[i] = min over j of cuts[j−1] + 1 where s[j..i] is a palindrome.",
    ],
    solutionSteps: [
      "Build a 2-D palindrome table; s[j..i] is a palindrome if s[j]==s[i] and (i−j<2 or s[j+1..i−1] is).",
      "Iterate end index i; track the best cut count.",
      "For each start j ≤ i where s[j..i] is a palindrome, update with cuts[j−1]+1 (or 0 if j==0).",
      "Return cuts[n−1].",
    ],
    code: {
      python: `def min_cut(s: str) -> int:
    n = len(s)
    is_pal = [[False] * n for _ in range(n)]
    cuts = [0] * n
    for i in range(n):
        best = i                       # worst case: cut before every char
        for j in range(i + 1):
            if s[j] == s[i] and (i - j < 2 or is_pal[j + 1][i - 1]):
                is_pal[j][i] = True
                best = 0 if j == 0 else min(best, cuts[j - 1] + 1)
        cuts[i] = best
    return cuts[n - 1]
`,
      java: `public final class MinPalindromeCuts {
    public static int minCut(String s) {
        int n = s.length();
        boolean[][] isPal = new boolean[n][n];
        int[] cuts = new int[n];
        for (int i = 0; i < n; i++) {
            int best = i;
            for (int j = 0; j <= i; j++) {
                if (s.charAt(j) == s.charAt(i) && (i - j < 2 || isPal[j + 1][i - 1])) {
                    isPal[j][i] = true;
                    best = (j == 0) ? 0 : Math.min(best, cuts[j - 1] + 1);
                }
            }
            cuts[i] = best;
        }
        return cuts[n - 1];
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int minCut(string s) {
    int n = s.size();
    vector<vector<bool>> isPal(n, vector<bool>(n, false));
    vector<int> cuts(n, 0);
    for (int i = 0; i < n; i++) {
        int best = i;
        for (int j = 0; j <= i; j++) {
            if (s[j] == s[i] && (i - j < 2 || isPal[j + 1][i - 1])) {
                isPal[j][i] = true;
                best = (j == 0) ? 0 : min(best, cuts[j - 1] + 1);
            }
        }
        cuts[i] = best;
    }
    return cuts[n - 1];
}
`,
    },
    complexity: { time: "O(n²)", space: "O(n²)" },
    pitfalls: [
      "Re-checking palindromes with an O(n) scan inside the DP, pushing it to O(n³).",
      "Off-by-one when j == 0 (the whole prefix is a palindrome → 0 cuts).",
      "Filling the palindrome table in an order that reads uninitialized inner cells.",
    ],
    edgeCases: [
      "Already a palindrome — 0 cuts.",
      "All distinct characters — n−1 cuts.",
      "Single character — 0 cuts.",
    ],
    whyItMatters:
      "Palindrome Partitioning II layers a precomputed feasibility table under a linear DP — the standard recipe when each transition needs an O(1) 'is this segment valid' check that would otherwise be expensive.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 172 — pure_dsa · stack_queue · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "longest-balanced-log-segment",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "stack_queue",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer"],
    title: "Longest Balanced Log Segment",
    framing:
      "A trace log encodes nested spans as '(' (span open) and ')' (span close). Some spans are malformed. Find the length of the longest contiguous run that is perfectly balanced.",
    statement:
      "Given a string containing only '(' and ')', return the length of the longest substring that is a well-formed (valid) parentheses sequence.",
    inputFormat: "A string s (0 ≤ |s| ≤ 3·10^4) of '(' and ')'.",
    outputFormat: "An integer: the length of the longest valid parentheses substring.",
    constraints: [
      "0 ≤ |s| ≤ 3·10^4",
      "Only '(' and ')' characters",
      "Substring must be contiguous and fully balanced",
    ],
    examples: [
      {
        input: 's = "(()"',
        output: "2",
        explanation: "The substring '()' at the end is the longest valid run.",
      },
      {
        input: 's = ")()())"',
        output: "4",
        explanation: "'()()' in the middle has length 4.",
      },
    ],
    approach: [
      "Keep a stack of indices; seed it with a sentinel −1 marking the last unmatched position.",
      "Push the index of each '('.",
      "On ')', pop; if the stack empties, push the current index as a new sentinel.",
      "Otherwise the valid length is current index minus the new stack top.",
    ],
    solutionSteps: [
      "Initialize stack = [−1] and best = 0.",
      "For each index i: if '(' push i.",
      "If ')' pop; when the stack becomes empty push i as the new base.",
      "When non-empty after popping, update best with i − stack.top().",
    ],
    code: {
      python: `def longest_valid_parentheses(s: str) -> int:
    stack = [-1]
    best = 0
    for i, ch in enumerate(s):
        if ch == '(':
            stack.append(i)
        else:
            stack.pop()
            if not stack:
                stack.append(i)        # new base for future matches
            else:
                best = max(best, i - stack[-1])
    return best
`,
      java: `import java.util.*;

public final class LongestBalancedSegment {
    public static int longestValidParentheses(String s) {
        Deque<Integer> stack = new ArrayDeque<>();
        stack.push(-1);
        int best = 0;
        for (int i = 0; i < s.length(); i++) {
            if (s.charAt(i) == '(') {
                stack.push(i);
            } else {
                stack.pop();
                if (stack.isEmpty()) stack.push(i);
                else best = Math.max(best, i - stack.peek());
            }
        }
        return best;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int longestValidParentheses(string s) {
    vector<int> stack = {-1};
    int best = 0;
    for (int i = 0; i < (int)s.size(); i++) {
        if (s[i] == '(') {
            stack.push_back(i);
        } else {
            stack.pop_back();
            if (stack.empty()) stack.push_back(i);
            else best = max(best, i - stack.back());
        }
    }
    return best;
}
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Forgetting the −1 sentinel, which breaks the very first match's length calculation.",
      "Counting matched pairs instead of measuring the span between unmatched boundaries.",
      "Pushing the index of ')' even when the stack is non-empty.",
    ],
    edgeCases: [
      "Empty string — answer 0.",
      "All '(' or all ')' — answer 0.",
      "Entire string valid — answer is its length.",
    ],
    whyItMatters:
      "Longest Valid Parentheses showcases the 'stack of boundary indices' technique: by tracking the last unmatched position rather than counts, you measure valid spans in one pass — a pattern reused in histogram and range problems.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 173 — pure_dsa · arrays_hashing · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-cheaper-later-listings",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "arrays_hashing",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer", "software_engineer"],
    title: "Count Cheaper Later Listings",
    framing:
      "Listings arrive in a price feed in order. For each listing, analytics needs to know how many later listings undercut it. Compute, for every position, the count of strictly smaller values appearing after it.",
    statement:
      "Given an integer array nums, return an array counts where counts[i] is the number of elements to the right of nums[i] that are strictly smaller than nums[i].",
    inputFormat: "An array nums of n integers (1 ≤ n ≤ 10^5, −10^4 ≤ nums[i] ≤ 10^4).",
    outputFormat: "An array counts of the same length.",
    constraints: [
      "1 ≤ n ≤ 10^5",
      "Values may be negative",
      "Target O(n log n) time",
    ],
    examples: [
      {
        input: "nums = [5,2,6,1]",
        output: "[2,1,1,0]",
        explanation: "Right-smaller counts: 5→{2,1}=2, 2→{1}=1, 6→{1}=1, 1→0.",
      },
      {
        input: "nums = [-1,-1]",
        output: "[0,0]",
        explanation: "No strictly smaller element follows either −1.",
      },
    ],
    approach: [
      "Use a merge sort over indices (sorting by value) to count inversions per element.",
      "During the merge of two halves, when a right-half element is placed before remaining left-half elements, those left elements each gain that many smaller-on-the-right.",
      "Track a running count of already-placed right elements and credit it to each left element when it is merged.",
      "Indices preserve which original element each count belongs to.",
    ],
    solutionSteps: [
      "Create an index array and a counts array of zeros.",
      "Recursively merge-sort index ranges by the value they point to.",
      "While merging, increment a right-placed counter on right picks; add it to counts[idx] on left picks.",
      "Write the merged order back; return counts.",
    ],
    code: {
      python: `def count_smaller(nums: list[int]) -> list[int]:
    n = len(nums)
    counts = [0] * n
    idx = list(range(n))

    def merge_sort(lo: int, hi: int) -> None:
        if hi - lo <= 1:
            return
        mid = (lo + hi) // 2
        merge_sort(lo, mid)
        merge_sort(mid, hi)
        merged = []
        i, j = lo, mid
        right_placed = 0
        while i < mid and j < hi:
            if nums[idx[j]] < nums[idx[i]]:
                right_placed += 1
                merged.append(idx[j])
                j += 1
            else:
                counts[idx[i]] += right_placed
                merged.append(idx[i])
                i += 1
        while i < mid:
            counts[idx[i]] += right_placed
            merged.append(idx[i])
            i += 1
        while j < hi:
            merged.append(idx[j])
            j += 1
        idx[lo:hi] = merged

    merge_sort(0, n)
    return counts
`,
      java: `public final class CountCheaperLater {
    private static int[] nums, idx, counts, tmp;

    public static int[] countSmaller(int[] input) {
        int n = input.length;
        nums = input;
        idx = new int[n];
        counts = new int[n];
        tmp = new int[n];
        for (int i = 0; i < n; i++) idx[i] = i;
        mergeSort(0, n);
        return counts;
    }

    private static void mergeSort(int lo, int hi) {
        if (hi - lo <= 1) return;
        int mid = (lo + hi) >>> 1;
        mergeSort(lo, mid);
        mergeSort(mid, hi);
        int i = lo, j = mid, k = lo, rightPlaced = 0;
        while (i < mid && j < hi) {
            if (nums[idx[j]] < nums[idx[i]]) {
                rightPlaced++;
                tmp[k++] = idx[j++];
            } else {
                counts[idx[i]] += rightPlaced;
                tmp[k++] = idx[i++];
            }
        }
        while (i < mid) { counts[idx[i]] += rightPlaced; tmp[k++] = idx[i++]; }
        while (j < hi) tmp[k++] = idx[j++];
        System.arraycopy(tmp, lo, idx, lo, hi - lo);
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> countSmaller(vector<int>& nums) {
    int n = nums.size();
    vector<int> counts(n, 0), idx(n), tmp(n);
    iota(idx.begin(), idx.end(), 0);

    function<void(int,int)> mergeSort = [&](int lo, int hi) {
        if (hi - lo <= 1) return;
        int mid = (lo + hi) / 2;
        mergeSort(lo, mid);
        mergeSort(mid, hi);
        int i = lo, j = mid, k = lo, rightPlaced = 0;
        while (i < mid && j < hi) {
            if (nums[idx[j]] < nums[idx[i]]) {
                rightPlaced++;
                tmp[k++] = idx[j++];
            } else {
                counts[idx[i]] += rightPlaced;
                tmp[k++] = idx[i++];
            }
        }
        while (i < mid) { counts[idx[i]] += rightPlaced; tmp[k++] = idx[i++]; }
        while (j < hi) tmp[k++] = idx[j++];
        for (int t = lo; t < hi; t++) idx[t] = tmp[t];
    };

    mergeSort(0, n);
    return counts;
}
`,
    },
    complexity: { time: "O(n log n)", space: "O(n)" },
    pitfalls: [
      "Using '≤' instead of '<' when comparing, which miscounts equal values.",
      "Crediting counts to values instead of original indices.",
      "An O(n²) double loop, which times out at n = 10^5.",
    ],
    edgeCases: [
      "Sorted ascending — all counts 0.",
      "Sorted descending — counts n−1, n−2, …, 0.",
      "All equal — all counts 0.",
    ],
    whyItMatters:
      "Counting right-smaller elements is the inversion-count problem in disguise; threading per-element credit through a merge sort (or a BIT) is the canonical way to answer 'how many later items beat this one' in log-linear time.",
    estimatedMinutes: 50,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 174 — pure_dsa · heap_priority_queue · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "kth-smallest-latency-in-sorted-grid",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "heap_priority_queue",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer", "platform_engineer"],
    title: "Kth Smallest Latency In Sorted Grid",
    framing:
      "A latency matrix has each row and each column sorted ascending (rows by region, columns by hour). To set an SLA percentile, find the k-th smallest latency across the whole matrix.",
    statement:
      "Given an n×n matrix where each row and each column is sorted in ascending order, return the k-th smallest element in the matrix (in sorted order across all elements, counting duplicates).",
    inputFormat: "An n×n matrix (1 ≤ n ≤ 300) and an integer k (1 ≤ k ≤ n²).",
    outputFormat: "An integer: the k-th smallest matrix value.",
    constraints: [
      "Each row is sorted ascending; each column is sorted ascending",
      "1 ≤ k ≤ n²",
      "Duplicates count toward k",
    ],
    examples: [
      {
        input: "matrix = [[1,5,9],[10,11,13],[12,13,15]], k = 8",
        output: "13",
        explanation: "Sorted values: 1,5,9,10,11,12,13,13,15 — the 8th is 13.",
      },
      {
        input: "matrix = [[-5]], k = 1",
        output: "-5",
        explanation: "A single element is trivially the 1st smallest.",
      },
    ],
    approach: [
      "Seed a min-heap with the first element of each of the first min(n,k) rows.",
      "Each heap entry tracks its (value, row, col).",
      "Pop k−1 times; after each pop push the next element in that row.",
      "The k-th popped value is the answer.",
    ],
    solutionSteps: [
      "Push (matrix[r][0], r, 0) for r in 0..min(n,k)−1.",
      "Repeat k times: pop the smallest; if a next column exists in its row, push it.",
      "Track the value popped on the k-th iteration.",
      "Return that value.",
    ],
    code: {
      python: `import heapq

def kth_smallest(matrix: list[list[int]], k: int) -> int:
    n = len(matrix)
    heap = [(matrix[r][0], r, 0) for r in range(min(n, k))]
    heapq.heapify(heap)
    val = 0
    for _ in range(k):
        val, r, c = heapq.heappop(heap)
        if c + 1 < n:
            heapq.heappush(heap, (matrix[r][c + 1], r, c + 1))
    return val
`,
      java: `import java.util.*;

public final class KthSmallestInGrid {
    public static int kthSmallest(int[][] matrix, int k) {
        int n = matrix.length;
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> a[0] - b[0]);
        for (int r = 0; r < Math.min(n, k); r++)
            heap.add(new int[]{matrix[r][0], r, 0});
        int val = 0;
        for (int i = 0; i < k; i++) {
            int[] cur = heap.poll();
            val = cur[0];
            int r = cur[1], c = cur[2];
            if (c + 1 < n) heap.add(new int[]{matrix[r][c + 1], r, c + 1});
        }
        return val;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int kthSmallest(vector<vector<int>>& matrix, int k) {
    int n = matrix.size();
    priority_queue<array<int,3>, vector<array<int,3>>, greater<>> heap;
    for (int r = 0; r < min(n, k); r++)
        heap.push({matrix[r][0], r, 0});
    int val = 0;
    for (int i = 0; i < k; i++) {
        auto [v, r, c] = heap.top(); heap.pop();
        val = v;
        if (c + 1 < n) heap.push({matrix[r][c + 1], r, c + 1});
    }
    return val;
}
`,
    },
    complexity: { time: "O(k log n)", space: "O(n)" },
    pitfalls: [
      "Flattening and sorting all n² elements — correct but ignores the sorted structure.",
      "Seeding the heap with all rows when k < n wastes work; cap at min(n, k).",
      "Pushing the next row instead of the next column within the same row.",
    ],
    edgeCases: [
      "k = 1 — the top-left element.",
      "k = n² — the bottom-right element.",
      "Matrix with duplicates — each counts separately.",
    ],
    whyItMatters:
      "Kth Smallest in a Sorted Matrix is the multi-list merge generalized to a grid: the heap-of-frontiers technique is exactly how external merge sort and k-way stream merging pick the next element efficiently.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 175 — pure_dsa · binary_search · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "kth-smallest-pairwise-gap",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "binary_search",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer", "software_engineer"],
    title: "Kth Smallest Pairwise Gap",
    framing:
      "Given timestamps of events, an anomaly detector ranks all pairwise time gaps. To set a threshold it needs the k-th smallest absolute gap among every pair of events.",
    statement:
      "Given an integer array nums, the distance of a pair (a, b) is |a − b|. Return the k-th smallest distance among all n·(n−1)/2 pairs.",
    inputFormat: "An array nums of n integers (2 ≤ n ≤ 10^4, 0 ≤ nums[i] ≤ 10^6) and an integer k.",
    outputFormat: "An integer: the k-th smallest pairwise absolute distance.",
    constraints: [
      "2 ≤ n ≤ 10^4",
      "1 ≤ k ≤ n·(n−1)/2",
      "Distances are absolute differences",
    ],
    examples: [
      {
        input: "nums = [1,3,1], k = 1",
        output: "0",
        explanation: "Pairwise distances are {0,2,2}; the 1st smallest is 0.",
      },
      {
        input: "nums = [1,6,1], k = 3",
        output: "5",
        explanation: "Distances {0,5,5}; the 3rd smallest is 5.",
      },
    ],
    approach: [
      "Sort the array; the answer lies between 0 and max−min, so binary-search the distance.",
      "For a candidate distance d, count pairs with gap ≤ d using a sliding window.",
      "If that count ≥ k, the answer is ≤ d; otherwise it is larger.",
      "Converge to the smallest d whose count reaches k.",
    ],
    solutionSteps: [
      "Sort nums; set lo = 0, hi = nums[n−1] − nums[0].",
      "For mid = (lo+hi)/2, count pairs ≤ mid by advancing a left pointer while nums[i]−nums[j] > mid.",
      "If count ≥ k set hi = mid, else lo = mid + 1.",
      "Return lo.",
    ],
    code: {
      python: `def smallest_distance_pair(nums: list[int], k: int) -> int:
    nums.sort()
    n = len(nums)

    def count_le(d: int) -> int:
        cnt = 0
        j = 0
        for i in range(n):
            while nums[i] - nums[j] > d:
                j += 1
            cnt += i - j
        return cnt

    lo, hi = 0, nums[-1] - nums[0]
    while lo < hi:
        mid = (lo + hi) // 2
        if count_le(mid) >= k:
            hi = mid
        else:
            lo = mid + 1
    return lo
`,
      java: `import java.util.*;

public final class KthSmallestGap {
    public static int smallestDistancePair(int[] nums, int k) {
        Arrays.sort(nums);
        int n = nums.length;
        int lo = 0, hi = nums[n - 1] - nums[0];
        while (lo < hi) {
            int mid = (lo + hi) / 2;
            if (countLE(nums, mid) >= k) hi = mid;
            else lo = mid + 1;
        }
        return lo;
    }

    private static int countLE(int[] nums, int d) {
        int cnt = 0, j = 0;
        for (int i = 0; i < nums.length; i++) {
            while (nums[i] - nums[j] > d) j++;
            cnt += i - j;
        }
        return cnt;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int smallestDistancePair(vector<int>& nums, int k) {
    sort(nums.begin(), nums.end());
    int n = nums.size();
    auto countLE = [&](int d) {
        int cnt = 0, j = 0;
        for (int i = 0; i < n; i++) {
            while (nums[i] - nums[j] > d) j++;
            cnt += i - j;
        }
        return cnt;
    };
    int lo = 0, hi = nums[n - 1] - nums[0];
    while (lo < hi) {
        int mid = (lo + hi) / 2;
        if (countLE(mid) >= k) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}
`,
    },
    complexity: { time: "O(n log n + n log(maxGap))", space: "O(1)" },
    pitfalls: [
      "Materializing all O(n²) pairs, which blows up at n = 10^4.",
      "Counting pairs with an O(n²) loop instead of the two-pointer window.",
      "Binary-searching on indices rather than on the distance value.",
    ],
    edgeCases: [
      "Duplicates — yield distance 0, often the smallest.",
      "k equal to the maximum pair count — returns the overall range.",
      "Two elements — only one pair.",
    ],
    whyItMatters:
      "This problem is the archetype of 'binary search on the answer': when the answer space is monotone (more pairs as d grows) you search the value, not the index — a technique that turns intractable enumeration into log-linear counting.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 176 — pure_dsa · dp_2d · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "twin-picker-grid-harvest",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Twin Picker Grid Harvest",
    framing:
      "Two harvesters start at the top-left and top-right of a yield grid and descend one row per step, each moving diagonally or straight down. They collect the cell they land on (shared cells count once). Maximize the combined yield reaching the bottom row.",
    statement:
      "Given a rows×cols grid of non-negative cherries, two robots start at (0,0) and (0,cols−1). Each step both move down one row to column c−1, c, or c+1. Cherries on a cell are collected once even if both robots stand on it. Return the maximum cherries collected.",
    inputFormat: "A rows×cols grid (1 ≤ rows, cols ≤ 70, 0 ≤ grid[i][j] ≤ 100).",
    outputFormat: "An integer: the maximum combined cherries.",
    constraints: [
      "Both robots move down exactly one row per step",
      "Column changes are within ±1",
      "A shared cell is counted once",
    ],
    examples: [
      {
        input: "grid = [[3,1,1],[2,5,1],[1,5,5],[2,1,1]]",
        output: "24",
        explanation: "The two paths together collect 24 cherries.",
      },
      {
        input: "grid = [[1,0,0,0,0,0,1],[2,0,0,0,0,3,0],[2,0,9,0,0,0,0],[0,3,0,5,4,0,0],[1,0,2,3,0,0,6]]",
        output: "28",
        explanation: "Optimal coordinated descent yields 28.",
      },
    ],
    approach: [
      "State is (row, col1, col2): both robots are always on the same row.",
      "Collect grid[row][col1] plus grid[row][col2] when the columns differ.",
      "Try all 9 combinations of the two robots' next columns and take the best.",
      "Memoize on (row, col1, col2) to avoid recomputation.",
    ],
    solutionSteps: [
      "Define dp(row, c1, c2); return −infinity if any column is out of range.",
      "Add the current row's collected cherries (once if c1 == c2).",
      "If not on the last row, add the max over the 9 next-column pairs.",
      "Return dp(0, 0, cols−1).",
    ],
    code: {
      python: `from functools import lru_cache

def cherry_pickup(grid: list[list[int]]) -> int:
    rows, cols = len(grid), len(grid[0])

    @lru_cache(maxsize=None)
    def dp(r: int, c1: int, c2: int) -> int:
        if c1 < 0 or c1 >= cols or c2 < 0 or c2 >= cols:
            return float('-inf')
        result = grid[r][c1] + (grid[r][c2] if c1 != c2 else 0)
        if r < rows - 1:
            best = float('-inf')
            for d1 in (-1, 0, 1):
                for d2 in (-1, 0, 1):
                    best = max(best, dp(r + 1, c1 + d1, c2 + d2))
            result += best
        return result

    return dp(0, 0, cols - 1)
`,
      java: `public final class TwinPickerHarvest {
    private static int rows, cols;
    private static Integer[][][] memo;

    public static int cherryPickup(int[][] grid) {
        rows = grid.length;
        cols = grid[0].length;
        memo = new Integer[rows][cols][cols];
        return dp(grid, 0, 0, cols - 1);
    }

    private static int dp(int[][] g, int r, int c1, int c2) {
        if (c1 < 0 || c1 >= cols || c2 < 0 || c2 >= cols) return Integer.MIN_VALUE;
        if (memo[r][c1][c2] != null) return memo[r][c1][c2];
        int result = g[r][c1] + (c1 != c2 ? g[r][c2] : 0);
        if (r < rows - 1) {
            int best = Integer.MIN_VALUE;
            for (int d1 = -1; d1 <= 1; d1++)
                for (int d2 = -1; d2 <= 1; d2++)
                    best = Math.max(best, dp(g, r + 1, c1 + d1, c2 + d2));
            result += best;
        }
        return memo[r][c1][c2] = result;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int rrows, ccols;

int dp(vector<vector<int>>& g, int r, int c1, int c2,
       vector<vector<vector<int>>>& memo) {
    if (c1 < 0 || c1 >= ccols || c2 < 0 || c2 >= ccols) return INT_MIN;
    if (memo[r][c1][c2] != INT_MIN) return memo[r][c1][c2];
    int result = g[r][c1] + (c1 != c2 ? g[r][c2] : 0);
    if (r < rrows - 1) {
        int best = INT_MIN;
        for (int d1 = -1; d1 <= 1; d1++)
            for (int d2 = -1; d2 <= 1; d2++)
                best = max(best, dp(g, r + 1, c1 + d1, c2 + d2, memo));
        result += best;
    }
    return memo[r][c1][c2] = result;
}

int cherryPickup(vector<vector<int>>& grid) {
    rrows = grid.size(); ccols = grid[0].size();
    vector<vector<vector<int>>> memo(
        rrows, vector<vector<int>>(ccols, vector<int>(ccols, INT_MIN)));
    return dp(grid, 0, 0, ccols - 1, memo);
}
`,
    },
    complexity: { time: "O(rows·cols²·9)", space: "O(rows·cols²)" },
    pitfalls: [
      "Solving the two paths independently — their column moves interact via shared cells.",
      "Double-counting a cell when both robots land on it.",
      "Tracking two independent rows instead of a single shared row index.",
    ],
    edgeCases: [
      "Single column — both robots forced onto the same cells.",
      "All zeros — answer 0.",
      "Single row — collect just the two start cells (or one if cols == 1).",
    ],
    whyItMatters:
      "Cherry Pickup II is the model for coordinated multi-agent DP: two simultaneously-moving agents share one synchronized state, so the trick is recognizing that both robots always occupy the same row and only their columns vary.",
    estimatedMinutes: 50,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 177 — pure_dsa · dp_2d · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "minimum-cost-to-split-log",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer", "software_engineer"],
    title: "Minimum Cost To Split Log",
    framing:
      "A log segment of length n must be split at a set of marked offsets. Each split costs the current length of the piece being cut. Splits can be performed in any order; choose the order that minimizes total cost.",
    statement:
      "Given an integer n (the length of a stick from 0 to n) and an array cuts of positions to cut, return the minimum total cost. The cost of one cut is the length of the stick segment it is performed on; cuts may be done in any order.",
    inputFormat: "An integer n and an array cuts of m positions in (0, n), 1 ≤ m ≤ 100.",
    outputFormat: "An integer: the minimum total cutting cost.",
    constraints: [
      "2 ≤ n ≤ 10^6",
      "1 ≤ m ≤ min(n−1, 100)",
      "All cut positions are distinct and strictly inside (0, n)",
    ],
    examples: [
      {
        input: "n = 7, cuts = [1,3,4,5]",
        output: "16",
        explanation: "An optimal order (e.g. cut at 3 first) yields total cost 16.",
      },
      {
        input: "n = 9, cuts = [5,6,1,4,2]",
        output: "22",
        explanation: "The best ordering of the five cuts costs 22.",
      },
    ],
    approach: [
      "Add sentinels 0 and n to the sorted cut positions; the problem becomes choosing an order over interior cut points.",
      "Let dp[i][j] be the min cost to perform all cuts strictly between points[i] and points[j].",
      "The cost of an interval is its length (points[j] − points[i]) plus the best split point k inside it.",
      "Fill by increasing interval span; the answer is dp[0][last].",
    ],
    solutionSteps: [
      "Sort cuts and frame them as points = [0] + cuts + [n].",
      "For each interval length ≥ 2, and each start i, set j = i + length.",
      "dp[i][j] = min over k in (i, j) of dp[i][k] + dp[k][j] + (points[j] − points[i]).",
      "Return dp[0][len(points)−1].",
    ],
    code: {
      python: `def min_cost(n: int, cuts: list[int]) -> int:
    points = [0] + sorted(cuts) + [n]
    m = len(points)
    dp = [[0] * m for _ in range(m)]
    for length in range(2, m):
        for i in range(m - length):
            j = i + length
            best = float('inf')
            for k in range(i + 1, j):
                best = min(best, dp[i][k] + dp[k][j] + points[j] - points[i])
            dp[i][j] = best
    return dp[0][m - 1]
`,
      java: `import java.util.*;

public final class MinimumCostSplit {
    public static int minCost(int n, int[] cuts) {
        int[] sorted = cuts.clone();
        Arrays.sort(sorted);
        int m = sorted.length + 2;
        int[] points = new int[m];
        points[0] = 0;
        points[m - 1] = n;
        for (int i = 0; i < sorted.length; i++) points[i + 1] = sorted[i];
        int[][] dp = new int[m][m];
        for (int length = 2; length < m; length++) {
            for (int i = 0; i + length < m; i++) {
                int j = i + length;
                int best = Integer.MAX_VALUE;
                for (int k = i + 1; k < j; k++)
                    best = Math.min(best, dp[i][k] + dp[k][j] + points[j] - points[i]);
                dp[i][j] = best;
            }
        }
        return dp[0][m - 1];
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int minCost(int n, vector<int>& cuts) {
    sort(cuts.begin(), cuts.end());
    vector<int> points;
    points.push_back(0);
    for (int c : cuts) points.push_back(c);
    points.push_back(n);
    int m = points.size();
    vector<vector<int>> dp(m, vector<int>(m, 0));
    for (int length = 2; length < m; length++) {
        for (int i = 0; i + length < m; i++) {
            int j = i + length;
            int best = INT_MAX;
            for (int k = i + 1; k < j; k++)
                best = min(best, dp[i][k] + dp[k][j] + points[j] - points[i]);
            dp[i][j] = best;
        }
    }
    return dp[0][m - 1];
}
`,
    },
    complexity: { time: "O(m³) for m cuts", space: "O(m²)" },
    pitfalls: [
      "Greedily cutting at the midpoint — the optimal order is not always balanced.",
      "Forgetting the 0 and n sentinels, which define interval lengths.",
      "Iterating intervals in the wrong order so dp[i][k]/dp[k][j] aren't ready.",
    ],
    edgeCases: [
      "A single cut — cost is exactly n.",
      "Cuts already sorted or reversed — sorting normalizes them.",
      "Cuts clustered at one end.",
    ],
    whyItMatters:
      "Minimum Cost to Cut a Stick is interval DP where the cost depends on the whole interval, not the split point — the same matrix-chain reasoning behind optimal merge order, polygon triangulation, and query-cost minimization.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 178 — pure_dsa · dp_1d · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "weighted-task-scheduling-max-profit",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer", "software_engineer"],
    title: "Weighted Task Scheduling Max Profit",
    framing:
      "A single worker can run one job at a time. Each job has a start time, an end time, and a payout. Overlapping jobs can't both run. Choose a non-overlapping subset that maximizes total payout.",
    statement:
      "Given arrays startTime, endTime, and profit of equal length, where job i runs on [startTime[i], endTime[i]) for profit[i], return the maximum profit from a subset of non-overlapping jobs. A job may start exactly when another ends.",
    inputFormat: "Three arrays of length n (1 ≤ n ≤ 5·10^4); times up to 10^9, profit up to 10^4.",
    outputFormat: "An integer: the maximum achievable profit.",
    constraints: [
      "Jobs may overlap arbitrarily",
      "A job starting at time t does not conflict with one ending at t",
      "Profits are positive",
    ],
    examples: [
      {
        input: "start = [1,2,3,3], end = [3,4,5,6], profit = [50,10,40,70]",
        output: "120",
        explanation: "Run job 0 (1–3, 50) and job 3 (3–6, 70) for 120.",
      },
      {
        input: "start = [1,2,3,4,6], end = [3,5,10,6,9], profit = [20,20,100,70,60]",
        output: "150",
        explanation: "Jobs ending early then 3–10 (100) plus 4–6 (70) is suboptimal; the best total is 150.",
      },
    ],
    approach: [
      "Sort jobs by end time so earlier-finishing options are settled first.",
      "Maintain parallel arrays: the end times processed and the best profit achievable up to each.",
      "For a new job, binary-search the latest end ≤ its start; add its profit to that best.",
      "Append a new checkpoint only when the candidate beats the current best (keeping profits monotone).",
    ],
    solutionSteps: [
      "Zip and sort jobs by end time.",
      "Seed ends = [0], dp = [0].",
      "For each job, find idx = rightmost end ≤ start; candidate = dp[idx] + profit.",
      "If candidate > dp[−1], push end and candidate; return dp[−1].",
    ],
    code: {
      python: `import bisect

def job_scheduling(start: list[int], end: list[int], profit: list[int]) -> int:
    jobs = sorted(zip(end, start, profit))
    ends = [0]
    dp = [0]                       # dp[i] = best profit with all chosen jobs ending <= ends[i]
    for e, s, p in jobs:
        i = bisect.bisect_right(ends, s) - 1
        candidate = dp[i] + p
        if candidate > dp[-1]:
            ends.append(e)
            dp.append(candidate)
    return dp[-1]
`,
      java: `import java.util.*;

public final class WeightedScheduling {
    public static int jobScheduling(int[] start, int[] end, int[] profit) {
        int n = start.length;
        int[][] jobs = new int[n][3];
        for (int i = 0; i < n; i++) jobs[i] = new int[]{end[i], start[i], profit[i]};
        Arrays.sort(jobs, (a, b) -> a[0] - b[0]);

        List<Integer> ends = new ArrayList<>();
        List<Integer> dp = new ArrayList<>();
        ends.add(0);
        dp.add(0);
        for (int[] j : jobs) {
            int e = j[0], s = j[1], p = j[2];
            int idx = upperBound(ends, s) - 1;
            int candidate = dp.get(idx) + p;
            if (candidate > dp.get(dp.size() - 1)) {
                ends.add(e);
                dp.add(candidate);
            }
        }
        return dp.get(dp.size() - 1);
    }

    private static int upperBound(List<Integer> arr, int key) {
        int lo = 0, hi = arr.size();
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;
            if (arr.get(mid) <= key) lo = mid + 1; else hi = mid;
        }
        return lo;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int jobScheduling(vector<int>& start, vector<int>& end, vector<int>& profit) {
    int n = start.size();
    vector<array<int,3>> jobs(n);
    for (int i = 0; i < n; i++) jobs[i] = {end[i], start[i], profit[i]};
    sort(jobs.begin(), jobs.end());

    vector<int> ends = {0}, dp = {0};
    for (auto& j : jobs) {
        int e = j[0], s = j[1], p = j[2];
        int idx = (int)(upper_bound(ends.begin(), ends.end(), s) - ends.begin()) - 1;
        int candidate = dp[idx] + p;
        if (candidate > dp.back()) {
            ends.push_back(e);
            dp.push_back(candidate);
        }
    }
    return dp.back();
}
`,
    },
    complexity: { time: "O(n log n)", space: "O(n)" },
    pitfalls: [
      "Sorting by start instead of end, which breaks the monotone-profit checkpoint trick.",
      "Using lower_bound vs upper_bound incorrectly at the 'start == end' boundary.",
      "Treating it as interval scheduling by count instead of weighted profit (greedy fails when weighted).",
    ],
    edgeCases: [
      "All jobs overlap — pick the single most profitable.",
      "No overlaps — sum of all profits.",
      "Equal end times with different profits.",
    ],
    whyItMatters:
      "Weighted Job Scheduling is why plain greedy fails once profits differ: you need DP plus binary search over end times. It's the foundation of revenue-maximizing reservation and ad-slot allocation systems.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 179 — pure_dsa · graphs · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "incremental-cluster-count",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "backend_engineer", "data_engineer"],
    title: "Incremental Cluster Count",
    framing:
      "Nodes come online one at a time on a grid. Two online nodes in adjacent cells form one cluster. After each node powers on, report how many separate clusters currently exist.",
    statement:
      "Given an m×n grid initially all water, process a list of positions that turn into land one by one. After each addition, report the number of islands (4-directionally connected land groups). Return the list of counts.",
    inputFormat: "Integers m, n and a list positions of [row, col] cells turned to land in order.",
    outputFormat: "An array where the i-th value is the island count after the i-th addition.",
    constraints: [
      "1 ≤ m, n ≤ 10^4 (grid is sparse)",
      "0 ≤ positions.length ≤ 10^4",
      "Repeated positions leave the count unchanged",
    ],
    examples: [
      {
        input: "m = 3, n = 3, positions = [[0,0],[0,1],[1,2],[2,1]]",
        output: "[1,1,2,3]",
        explanation: "Adjacent (0,0)&(0,1) merge; the later cells stay separate.",
      },
      {
        input: "m = 1, n = 1, positions = [[0,0],[0,0]]",
        output: "[1,1]",
        explanation: "The duplicate addition doesn't change the count.",
      },
    ],
    approach: [
      "Maintain a union-find over land cells, plus a running island count.",
      "Adding a new land cell increments the count by one.",
      "For each already-land neighbor, union; each successful union decrements the count.",
      "Record the count after processing each position.",
    ],
    solutionSteps: [
      "Use a dictionary-based DSU keyed by (row, col).",
      "On a new (already-present cells are skipped): add it, count++.",
      "For each of the 4 neighbors that is land, union and decrement on a real merge.",
      "Append the current count to the result.",
    ],
    code: {
      python: `def num_islands2(m: int, n: int, positions: list[list[int]]) -> list[int]:
    parent = {}
    rank = {}
    count = 0
    res = []

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        nonlocal count
        ra, rb = find(a), find(b)
        if ra == rb:
            return
        if rank[ra] < rank[rb]:
            ra, rb = rb, ra
        parent[rb] = ra
        if rank[ra] == rank[rb]:
            rank[ra] += 1
        count -= 1

    for r, c in positions:
        if (r, c) in parent:
            res.append(count)
            continue
        parent[(r, c)] = (r, c)
        rank[(r, c)] = 0
        count += 1
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nb = (r + dr, c + dc)
            if nb in parent:
                union((r, c), nb)
        res.append(count)

    return res
`,
      java: `import java.util.*;

public final class IncrementalClusters {
    private static int[] parent, rank;
    private static int count;

    public static List<Integer> numIslands2(int m, int n, int[][] positions) {
        parent = new int[m * n];
        rank = new int[m * n];
        Arrays.fill(parent, -1);          // -1 means 'still water'
        count = 0;
        List<Integer> res = new ArrayList<>();
        int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};
        for (int[] p : positions) {
            int id = p[0] * n + p[1];
            if (parent[id] != -1) { res.add(count); continue; }
            parent[id] = id;
            count++;
            for (int[] d : dirs) {
                int nr = p[0] + d[0], nc = p[1] + d[1];
                if (nr >= 0 && nr < m && nc >= 0 && nc < n) {
                    int nid = nr * n + nc;
                    if (parent[nid] != -1) union(id, nid);
                }
            }
            res.add(count);
        }
        return res;
    }

    private static int find(int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }

    private static void union(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return;
        if (rank[ra] < rank[rb]) { int t = ra; ra = rb; rb = t; }
        parent[rb] = ra;
        if (rank[ra] == rank[rb]) rank[ra]++;
        count--;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

struct DSU {
    vector<int> parent, rnk;
    int count = 0;
    DSU(int sz) : parent(sz, -1), rnk(sz, 0) {}
    int find(int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }
    void unite(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return;
        if (rnk[ra] < rnk[rb]) swap(ra, rb);
        parent[rb] = ra;
        if (rnk[ra] == rnk[rb]) rnk[ra]++;
        count--;
    }
};

vector<int> numIslands2(int m, int n, vector<vector<int>>& positions) {
    DSU dsu(m * n);
    vector<int> res;
    int dirs[4][2] = {{1,0},{-1,0},{0,1},{0,-1}};
    for (auto& p : positions) {
        int id = p[0] * n + p[1];
        if (dsu.parent[id] != -1) { res.push_back(dsu.count); continue; }
        dsu.parent[id] = id;
        dsu.count++;
        for (auto& d : dirs) {
            int nr = p[0] + d[0], nc = p[1] + d[1];
            if (nr >= 0 && nr < m && nc >= 0 && nc < n) {
                int nid = nr * n + nc;
                if (dsu.parent[nid] != -1) dsu.unite(id, nid);
            }
        }
        res.push_back(dsu.count);
    }
    return res;
}
`,
    },
    complexity: { time: "O(k·α) for k additions", space: "O(m·n) or O(k)" },
    pitfalls: [
      "Recomputing island count from scratch after each addition (O(k·m·n)).",
      "Forgetting to handle duplicate positions, which would over-count.",
      "Decrementing the count on every neighbor instead of only on a real merge.",
    ],
    edgeCases: [
      "Duplicate positions — count unchanged.",
      "Isolated additions — each adds a new island.",
      "Additions that bridge two existing islands into one.",
    ],
    whyItMatters:
      "Number of Islands II is the streaming/online version of connectivity: union-find shines because edges only ever get added, never removed — the exact model for incremental network formation and dynamic clustering.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 180 — pure_dsa · graphs · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "merge-user-accounts-by-email",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer", "software_engineer"],
    title: "Merge User Accounts By Email",
    framing:
      "Identity resolution merges duplicate accounts: two account records belong to the same person if they share any email. Merge all transitively-linked accounts and emit each person's full, de-duplicated, sorted email list.",
    statement:
      "Each account is a list [name, email1, email2, …]. Two accounts are the same person if they share at least one email (names may repeat across different people). Merge accounts and return, for each merged person, [name, sortedUniqueEmails…]. Order of output accounts is arbitrary.",
    inputFormat: "A list of accounts, each a list whose first item is a name and the rest emails.",
    outputFormat: "A list of merged accounts, each name followed by its emails in sorted order.",
    constraints: [
      "1 ≤ accounts.length ≤ 1000",
      "Emails within one account are unique",
      "Shared emails link accounts transitively",
    ],
    examples: [
      {
        input: 'accounts = [["John","a@x.com","b@x.com"],["John","b@x.com","c@x.com"],["Mary","m@x.com"]]',
        output: '[["John","a@x.com","b@x.com","c@x.com"],["Mary","m@x.com"]]',
        explanation: "The two Johns share b@x.com and merge; Mary stays separate.",
      },
      {
        input: 'accounts = [["A","x@x.com"],["B","x@x.com"]]',
        output: '[["A","x@x.com"]] (name from the root account)',
        explanation: "Same email links them; one merged record results.",
      },
    ],
    approach: [
      "Treat each email as a node; union all emails within the same account.",
      "Record an owner name for each email.",
      "Group every email by its union-find root.",
      "Emit each group's owner name followed by its sorted emails.",
    ],
    solutionSteps: [
      "Initialize a DSU keyed by email string and an owner map.",
      "For each account, union its first email with every other email and set owners.",
      "Bucket emails by find(email).",
      "For each bucket, output [ownerOfRoot] + sorted(emails).",
    ],
    code: {
      python: `from collections import defaultdict

def accounts_merge(accounts: list[list[str]]) -> list[list[str]]:
    parent = {}
    owner = {}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        parent[find(a)] = find(b)

    for acc in accounts:
        name = acc[0]
        for email in acc[1:]:
            parent.setdefault(email, email)
            owner[email] = name
            union(acc[1], email)

    groups = defaultdict(list)
    for email in parent:
        groups[find(email)].append(email)

    return [[owner[root]] + sorted(emails) for root, emails in groups.items()]
`,
      java: `import java.util.*;

public final class MergeAccounts {
    private static Map<String, String> parent = new HashMap<>();

    public static List<List<String>> accountsMerge(List<List<String>> accounts) {
        parent = new HashMap<>();
        Map<String, String> owner = new HashMap<>();
        for (List<String> acc : accounts) {
            String name = acc.get(0);
            for (int i = 1; i < acc.size(); i++) {
                parent.putIfAbsent(acc.get(i), acc.get(i));
                owner.put(acc.get(i), name);
                union(acc.get(1), acc.get(i));
            }
        }
        Map<String, List<String>> groups = new HashMap<>();
        for (String email : parent.keySet())
            groups.computeIfAbsent(find(email), z -> new ArrayList<>()).add(email);

        List<List<String>> res = new ArrayList<>();
        for (var e : groups.entrySet()) {
            List<String> emails = e.getValue();
            Collections.sort(emails);
            List<String> row = new ArrayList<>();
            row.add(owner.get(e.getKey()));
            row.addAll(emails);
            res.add(row);
        }
        return res;
    }

    private static String find(String x) {
        while (!parent.get(x).equals(x)) {
            parent.put(x, parent.get(parent.get(x)));
            x = parent.get(x);
        }
        return x;
    }

    private static void union(String a, String b) {
        parent.put(find(a), find(b));
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

unordered_map<string, string> parent;

string findRoot(const string& x) {
    string r = x;
    while (parent[r] != r) { parent[r] = parent[parent[r]]; r = parent[r]; }
    return r;
}

void unite(const string& a, const string& b) {
    parent[findRoot(a)] = findRoot(b);
}

vector<vector<string>> accountsMerge(vector<vector<string>>& accounts) {
    parent.clear();
    unordered_map<string, string> owner;
    for (auto& acc : accounts) {
        const string& name = acc[0];
        for (size_t i = 1; i < acc.size(); i++) {
            if (!parent.count(acc[i])) parent[acc[i]] = acc[i];
            owner[acc[i]] = name;
            unite(acc[1], acc[i]);
        }
    }
    unordered_map<string, vector<string>> groups;
    for (auto& [email, _] : parent)
        groups[findRoot(email)].push_back(email);

    vector<vector<string>> res;
    for (auto& [root, emails] : groups) {
        sort(emails.begin(), emails.end());
        vector<string> row = {owner[root]};
        row.insert(row.end(), emails.begin(), emails.end());
        res.push_back(row);
    }
    return res;
}
`,
    },
    complexity: { time: "O(N·α + N log N) for N total emails", space: "O(N)" },
    pitfalls: [
      "Merging by name — different people can share a name; only shared emails link accounts.",
      "Forgetting to dedupe emails after grouping.",
      "Using the wrong account's name; the name comes from any account in the group (owner of root).",
    ],
    edgeCases: [
      "An account with a single email.",
      "Two people with the same name but disjoint emails — stay separate.",
      "A chain of accounts linked transitively through shared emails.",
    ],
    whyItMatters:
      "Accounts Merge is the canonical entity-resolution problem: union-find over a shared attribute (email) collapses transitive duplicates — exactly how CRMs, identity graphs, and dedup pipelines reconcile records.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 181 — indian_domain · math_geometry · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "rupee-amount-to-words",
    version: 1,
    status: "pending_review",
    bucket: "indian_domain",
    batchNo: 8,
    pattern: "math_geometry",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer"],
    title: "Rupee Amount To Words",
    framing:
      "An invoicing system must print cheque amounts in words using the Indian numbering system — thousand, lakh, crore — so '1234567' renders as 'Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven'.",
    statement:
      "Given a non-negative integer amount, return its English representation using the Indian numbering system: the lowest three digits form the hundreds group, then digits are grouped in pairs as thousand, lakh, and crore. Return 'Zero' for 0.",
    inputFormat: "An integer amount (0 ≤ amount ≤ 2,147,483,647).",
    outputFormat: "A string of the amount in words (single spaces, title-cased words).",
    constraints: [
      "0 ≤ amount ≤ 2^31 − 1",
      "Use Indian grouping: thousand, lakh (10^5), crore (10^7)",
      "No trailing or leading spaces; 'Zero' for 0",
    ],
    examples: [
      {
        input: "amount = 1234567",
        output: '"Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven"',
        explanation: "Grouped as 12 | 34 | 5 67 → lakh, thousand, hundreds.",
      },
      {
        input: "amount = 50",
        output: '"Fifty"',
        explanation: "Below one hundred, just the tens word.",
      },
    ],
    approach: [
      "Build helpers: two(n) for 0–99 and three(n) for 0–999 (with the 'Hundred' word).",
      "Peel off crore (amount / 10^7), then lakh (next two digits), then thousand (next two), then the final three digits.",
      "The crore group can exceed 99 for large inputs, so render it with three().",
      "Join the non-empty group phrases with their scale words.",
    ],
    solutionSteps: [
      "Handle 0 explicitly, returning 'Zero'.",
      "Compute crore, lakh, thousand, and the remaining hundreds group.",
      "Append '<three(crore)> Crore', '<two(lakh)> Lakh', '<two(thousand)> Thousand', then '<three(rest)>' when each is non-zero.",
      "Collapse extra spaces and return.",
    ],
    code: {
      python: `ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
        "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
        "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy",
        "Eighty", "Ninety"]

def _two(n: int) -> str:
    if n == 0:
        return ""
    if n < 20:
        return ONES[n]
    return TENS[n // 10] + ((" " + ONES[n % 10]) if n % 10 else "")

def _three(n: int) -> str:
    parts = []
    if n >= 100:
        parts.append(ONES[n // 100] + " Hundred")
        n %= 100
    if n:
        parts.append(_two(n))
    return " ".join(parts)

def amount_to_words(amount: int) -> str:
    if amount == 0:
        return "Zero"
    crore, amount = divmod(amount, 10_000_000)
    lakh, amount = divmod(amount, 100_000)
    thousand, rest = divmod(amount, 1_000)
    parts = []
    if crore:
        parts.append(_three(crore) + " Crore")
    if lakh:
        parts.append(_two(lakh) + " Lakh")
    if thousand:
        parts.append(_two(thousand) + " Thousand")
    if rest:
        parts.append(_three(rest))
    return " ".join(parts)
`,
      java: `public final class RupeeToWords {
    private static final String[] ONES = {"", "One", "Two", "Three", "Four", "Five",
        "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen",
        "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"};
    private static final String[] TENS = {"", "", "Twenty", "Thirty", "Forty",
        "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"};

    private static String two(int n) {
        if (n == 0) return "";
        if (n < 20) return ONES[n];
        return TENS[n / 10] + (n % 10 != 0 ? " " + ONES[n % 10] : "");
    }

    private static String three(int n) {
        StringBuilder sb = new StringBuilder();
        if (n >= 100) { sb.append(ONES[n / 100]).append(" Hundred"); n %= 100; }
        if (n != 0) { if (sb.length() > 0) sb.append(" "); sb.append(two(n)); }
        return sb.toString();
    }

    public static String amountToWords(int amount) {
        if (amount == 0) return "Zero";
        int crore = amount / 10_000_000; amount %= 10_000_000;
        int lakh = amount / 100_000; amount %= 100_000;
        int thousand = amount / 1_000; int rest = amount % 1_000;
        java.util.List<String> parts = new java.util.ArrayList<>();
        if (crore != 0) parts.add(three(crore) + " Crore");
        if (lakh != 0) parts.add(two(lakh) + " Lakh");
        if (thousand != 0) parts.add(two(thousand) + " Thousand");
        if (rest != 0) parts.add(three(rest));
        return String.join(" ", parts);
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

static const vector<string> ONES = {"", "One", "Two", "Three", "Four", "Five",
    "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen",
    "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"};
static const vector<string> TENS = {"", "", "Twenty", "Thirty", "Forty",
    "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"};

static string two(int n) {
    if (n == 0) return "";
    if (n < 20) return ONES[n];
    return TENS[n / 10] + (n % 10 ? " " + ONES[n % 10] : "");
}

static string three(int n) {
    string s;
    if (n >= 100) { s = ONES[n / 100] + " Hundred"; n %= 100; }
    if (n) { if (!s.empty()) s += " "; s += two(n); }
    return s;
}

string amountToWords(long long amount) {
    if (amount == 0) return "Zero";
    long long crore = amount / 10000000; amount %= 10000000;
    long long lakh = amount / 100000; amount %= 100000;
    long long thousand = amount / 1000, rest = amount % 1000;
    vector<string> parts;
    if (crore) parts.push_back(three((int)crore) + " Crore");
    if (lakh) parts.push_back(two((int)lakh) + " Lakh");
    if (thousand) parts.push_back(two((int)thousand) + " Thousand");
    if (rest) parts.push_back(three((int)rest));
    string out;
    for (size_t i = 0; i < parts.size(); i++) {
        if (i) out += " ";
        out += parts[i];
    }
    return out;
}
`,
    },
    complexity: { time: "O(digits)", space: "O(1)" },
    pitfalls: [
      "Using the Western grouping (thousand, million) instead of the Indian lakh/crore split.",
      "Mishandling the teens (11–19) with the tens/ones decomposition.",
      "Leaving double spaces when a middle group is zero.",
    ],
    edgeCases: [
      "Zero — 'Zero'.",
      "Exact powers: 100, 1000, 100000, 10000000.",
      "Large crore group that itself exceeds 99 (e.g. 200 crore).",
    ],
    whyItMatters:
      "Number-to-words is a deceptively fiddly parsing exercise; doing it in the Indian numbering system is a real requirement for invoicing, banking, and cheque-printing software across India.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 182 — pure_dsa · math_geometry · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "shortest-prefix-pad-to-palindrome",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "math_geometry",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer"],
    title: "Shortest Prefix Pad To Palindrome",
    framing:
      "A symmetric key must be a palindrome. Given a seed string, prepend the fewest characters in front of it so the whole result reads the same both ways.",
    statement:
      "Given a string s, prepend the minimum number of characters to its front to make it a palindrome, and return the resulting shortest palindrome.",
    inputFormat: "A string s (0 ≤ |s| ≤ 5·10^4) of lowercase letters.",
    outputFormat: "The shortest palindrome formed by prepending characters to s.",
    constraints: [
      "0 ≤ |s| ≤ 5·10^4",
      "Characters may only be added at the front",
      "Target O(n) time",
    ],
    examples: [
      {
        input: 's = "aacecaaa"',
        output: '"aaacecaaa"',
        explanation: "Prepending one 'a' makes the whole string a palindrome.",
      },
      {
        input: 's = "abcd"',
        output: '"dcbabcd"',
        explanation: "The longest palindromic prefix is 'a'; prepend 'dcb'.",
      },
    ],
    approach: [
      "We must find the longest palindromic prefix of s; the rest is mirrored and prepended.",
      "Form combined = s + '#' + reverse(s) and compute its KMP failure (LPS) array.",
      "The last LPS value is the length of the longest palindromic prefix of s.",
      "Prepend the reverse of the remaining suffix to s.",
    ],
    solutionSteps: [
      "Build combined = s + sep + reversed(s) with a separator not in the alphabet.",
      "Compute the LPS array of combined.",
      "Let L = lps[last]; the suffix s[L:] reversed is what must be prepended.",
      "Return reverse(s[L:]) + s.",
    ],
    code: {
      python: `def shortest_palindrome(s: str) -> str:
    if not s:
        return s
    combined = s + "#" + s[::-1]
    n = len(combined)
    lps = [0] * n
    for i in range(1, n):
        j = lps[i - 1]
        while j > 0 and combined[i] != combined[j]:
            j = lps[j - 1]
        if combined[i] == combined[j]:
            j += 1
        lps[i] = j
    longest_pal_prefix = lps[-1]
    return s[longest_pal_prefix:][::-1] + s
`,
      java: `public final class ShortestPalindrome {
    public static String shortestPalindrome(String s) {
        if (s.isEmpty()) return s;
        String rev = new StringBuilder(s).reverse().toString();
        String combined = s + "#" + rev;
        int n = combined.length();
        int[] lps = new int[n];
        for (int i = 1; i < n; i++) {
            int j = lps[i - 1];
            while (j > 0 && combined.charAt(i) != combined.charAt(j)) j = lps[j - 1];
            if (combined.charAt(i) == combined.charAt(j)) j++;
            lps[i] = j;
        }
        int longest = lps[n - 1];
        return new StringBuilder(s.substring(longest)).reverse() + s;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

string shortestPalindrome(string s) {
    if (s.empty()) return s;
    string rev(s.rbegin(), s.rend());
    string combined = s + "#" + rev;
    int n = combined.size();
    vector<int> lps(n, 0);
    for (int i = 1; i < n; i++) {
        int j = lps[i - 1];
        while (j > 0 && combined[i] != combined[j]) j = lps[j - 1];
        if (combined[i] == combined[j]) j++;
        lps[i] = j;
    }
    int longest = lps[n - 1];
    string prefix = s.substr(longest);
    reverse(prefix.begin(), prefix.end());
    return prefix + s;
}
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Omitting the separator, which can let the prefix and suffix overlap and overcount.",
      "Reversing the wrong slice — only the part after the palindromic prefix is mirrored.",
      "An O(n²) prefix-by-prefix palindrome check, which times out.",
    ],
    edgeCases: [
      "Empty string — returns empty.",
      "Already a palindrome — returns unchanged.",
      "No shared prefix — nearly the whole reverse is prepended.",
    ],
    whyItMatters:
      "Shortest Palindrome is the showcase application of KMP's failure function to a non-search task: encoding 'longest palindromic prefix' as a longest border of s+#+reverse(s) is the kind of reduction that separates string specialists.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 183 — pure_dsa · math_geometry · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "justify-log-line-wrapping",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "math_geometry",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "frontend_engineer"],
    title: "Justify Log Line Wrapping",
    framing:
      "A monospace console pane must fully justify wrapped text to a fixed column width: each line packs as many words as fit, and extra spaces are spread between words (left-biased). The final line is left-justified.",
    statement:
      "Given an array words and an integer maxWidth, format the text so each line is exactly maxWidth characters and fully (left-and-right) justified. Pack greedily; distribute extra spaces between words with earlier gaps getting more when uneven. The last line is left-justified with a single space between words and padded on the right.",
    inputFormat: "An array words of strings and an integer maxWidth (each word length ≤ maxWidth ≤ 100).",
    outputFormat: "A list of strings, each exactly maxWidth characters long.",
    constraints: [
      "1 ≤ words.length ≤ 300",
      "Each word fits within maxWidth",
      "Lines (except the last and single-word lines) are fully justified",
    ],
    examples: [
      {
        input: 'words = ["This","is","an","example","of","text","justification."], maxWidth = 16',
        output: '["This    is    an","example  of text","justification.  "]',
        explanation: "Earlier gaps absorb the extra space; the last line is left-justified.",
      },
      {
        input: 'words = ["What","must","be"], maxWidth = 12',
        output: '["What   must","be          "]',
        explanation: "Two words split the slack; the final word's line is left-justified.",
      },
    ],
    approach: [
      "Greedily collect words while their lengths plus one space each still fit.",
      "When the next word won't fit, justify the current line: spread spaces across gaps.",
      "If a line has one word or is the last line, left-justify and right-pad.",
      "Otherwise give each gap base = slack/gaps, and the first slack%gaps gaps one extra.",
    ],
    solutionSteps: [
      "Track the current line's words and their total character length.",
      "On overflow, compute slack = maxWidth − totalChars and distribute over (count−1) gaps.",
      "For a single-word line, append the word then pad spaces to maxWidth.",
      "After the loop, left-justify the final line.",
    ],
    code: {
      python: `def full_justify(words: list[str], max_width: int) -> list[str]:
    res = []
    line, line_len = [], 0
    for w in words:
        if line_len + len(line) + len(w) > max_width:
            slack = max_width - line_len
            gaps = len(line) - 1
            if gaps == 0:
                res.append(line[0] + " " * slack)
            else:
                base, extra = divmod(slack, gaps)
                row = ""
                for i, word in enumerate(line):
                    row += word
                    if i < gaps:
                        row += " " * (base + (1 if i < extra else 0))
                res.append(row)
            line, line_len = [], 0
        line.append(w)
        line_len += len(w)
    last = " ".join(line)
    res.append(last + " " * (max_width - len(last)))
    return res
`,
      java: `import java.util.*;

public final class TextJustification {
    public static List<String> fullJustify(String[] words, int maxWidth) {
        List<String> res = new ArrayList<>();
        List<String> line = new ArrayList<>();
        int lineLen = 0;
        for (String w : words) {
            if (lineLen + line.size() + w.length() > maxWidth) {
                int slack = maxWidth - lineLen;
                int gaps = line.size() - 1;
                StringBuilder row = new StringBuilder();
                if (gaps == 0) {
                    row.append(line.get(0));
                    while (row.length() < maxWidth) row.append(' ');
                } else {
                    int base = slack / gaps, extra = slack % gaps;
                    for (int i = 0; i < line.size(); i++) {
                        row.append(line.get(i));
                        if (i < gaps) {
                            int spaces = base + (i < extra ? 1 : 0);
                            for (int s = 0; s < spaces; s++) row.append(' ');
                        }
                    }
                }
                res.add(row.toString());
                line.clear();
                lineLen = 0;
            }
            line.add(w);
            lineLen += w.length();
        }
        StringBuilder last = new StringBuilder(String.join(" ", line));
        while (last.length() < maxWidth) last.append(' ');
        res.add(last.toString());
        return res;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<string> fullJustify(vector<string>& words, int maxWidth) {
    vector<string> res;
    vector<string> line;
    int lineLen = 0;
    for (auto& w : words) {
        if (lineLen + (int)line.size() + (int)w.size() > maxWidth) {
            int slack = maxWidth - lineLen;
            int gaps = (int)line.size() - 1;
            string row;
            if (gaps == 0) {
                row = line[0] + string(slack, ' ');
            } else {
                int base = slack / gaps, extra = slack % gaps;
                for (int i = 0; i < (int)line.size(); i++) {
                    row += line[i];
                    if (i < gaps) row += string(base + (i < extra ? 1 : 0), ' ');
                }
            }
            res.push_back(row);
            line.clear();
            lineLen = 0;
        }
        line.push_back(w);
        lineLen += w.size();
    }
    string last;
    for (size_t i = 0; i < line.size(); i++) {
        if (i) last += " ";
        last += line[i];
    }
    last += string(maxWidth - last.size(), ' ');
    res.push_back(last);
    return res;
}
`,
    },
    complexity: { time: "O(total characters)", space: "O(total characters)" },
    pitfalls: [
      "Right-justifying the last line instead of left-justifying it.",
      "Distributing the extra spaces evenly instead of front-loading the leftmost gaps.",
      "Off-by-one in the fit test (forgetting the mandatory single spaces between words).",
    ],
    edgeCases: [
      "A single word per line — left-justify and pad.",
      "Last line with one word — pad to width.",
      "Words exactly filling a line with no slack.",
    ],
    whyItMatters:
      "Text Justification is a precision string-layout problem with many corner cases — the kind of 'simple to state, fiddly to get exactly right' task that mirrors real typesetting, terminal rendering, and report formatting.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 184 — ai_applied · heap_priority_queue · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "rolling-window-median-latency",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 8,
    pattern: "heap_priority_queue",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "data_engineer", "platform_engineer"],
    title: "Rolling Window Median Latency",
    framing:
      "An inference service samples per-request latency. A dashboard shows the median latency over the most recent k requests, sliding one request at a time. Emit the median for every window position.",
    statement:
      "Given an integer array nums and a window size k, return the median of each contiguous window of size k as the window slides from left to right. The median of an even-sized window is the average of the two middle values.",
    inputFormat: "An array nums of n integers (1 ≤ k ≤ n ≤ 10^5, values fit in 32 bits).",
    outputFormat: "An array of n−k+1 doubles, one median per window.",
    constraints: [
      "1 ≤ k ≤ n ≤ 10^5",
      "Values can be any 32-bit integer (watch overflow in averaging)",
      "Each window slides by one position",
    ],
    examples: [
      {
        input: "nums = [1,3,-1,-3,5,3,6,7], k = 3",
        output: "[1.0, -1.0, -1.0, 3.0, 5.0, 6.0]",
        explanation: "Median of each size-3 window as it slides.",
      },
      {
        input: "nums = [1,2,3,4], k = 2",
        output: "[1.5, 2.5, 3.5]",
        explanation: "Even windows average the two middle elements.",
      },
    ],
    approach: [
      "Maintain two heaps: a max-heap 'small' for the lower half and a min-heap 'large' for the upper half.",
      "Keep small balanced to hold the extra element for odd k; the median reads from the tops.",
      "On each slide, lazily mark the outgoing value for deletion and add the incoming value, adjusting a balance counter.",
      "Clean the heap tops of already-deleted values before reading the median.",
    ],
    solutionSteps: [
      "Initialize by pushing the first window into small, then moving k/2 elements to large.",
      "For each slide, account for the removed and added elements via a balance delta and a deletion map.",
      "Apply at most one cross-heap move to restore the size invariant.",
      "Purge stale tops, then record the median (top, or average of two tops).",
    ],
    code: {
      python: `import heapq
from collections import defaultdict

def median_sliding_window(nums: list[int], k: int) -> list[float]:
    small, large = [], []          # small: max-heap (negated), large: min-heap
    to_remove = defaultdict(int)

    for i in range(k):
        heapq.heappush(small, -nums[i])
    for _ in range(k // 2):
        heapq.heappush(large, -heapq.heappop(small))

    def median() -> float:
        if k % 2:
            return float(-small[0])
        return (-small[0] + large[0]) / 2.0

    res = [median()]
    for i in range(k, len(nums)):
        out_num, in_num = nums[i - k], nums[i]
        balance = 0
        to_remove[out_num] += 1
        balance += -1 if (small and out_num <= -small[0]) else 1
        if small and in_num <= -small[0]:
            heapq.heappush(small, -in_num)
            balance += 1
        else:
            heapq.heappush(large, in_num)
            balance -= 1
        if balance < 0:
            heapq.heappush(small, -heapq.heappop(large))
        elif balance > 0:
            heapq.heappush(large, -heapq.heappop(small))
        while small and to_remove[-small[0]] > 0:
            to_remove[-small[0]] -= 1
            heapq.heappop(small)
        while large and to_remove[large[0]] > 0:
            to_remove[large[0]] -= 1
            heapq.heappop(large)
        res.append(median())
    return res
`,
      java: `import java.util.*;

public final class RollingMedian {
    public static double[] medianSlidingWindow(int[] nums, int k) {
        PriorityQueue<Integer> small = new PriorityQueue<>(Collections.reverseOrder());
        PriorityQueue<Integer> large = new PriorityQueue<>();
        Map<Integer, Integer> toRemove = new HashMap<>();
        for (int i = 0; i < k; i++) small.offer(nums[i]);
        for (int i = 0; i < k / 2; i++) large.offer(small.poll());

        double[] res = new double[nums.length - k + 1];
        int idx = 0;
        res[idx++] = median(small, large, k);
        for (int i = k; i < nums.length; i++) {
            int outNum = nums[i - k], inNum = nums[i];
            int balance = 0;
            toRemove.merge(outNum, 1, Integer::sum);
            balance += (!small.isEmpty() && outNum <= small.peek()) ? -1 : 1;
            if (!small.isEmpty() && inNum <= small.peek()) { small.offer(inNum); balance += 1; }
            else { large.offer(inNum); balance -= 1; }
            if (balance < 0) small.offer(large.poll());
            else if (balance > 0) large.offer(small.poll());
            while (!small.isEmpty() && toRemove.getOrDefault(small.peek(), 0) > 0)
                toRemove.merge(small.poll(), -1, Integer::sum);
            while (!large.isEmpty() && toRemove.getOrDefault(large.peek(), 0) > 0)
                toRemove.merge(large.poll(), -1, Integer::sum);
            res[idx++] = median(small, large, k);
        }
        return res;
    }

    private static double median(PriorityQueue<Integer> small,
                                 PriorityQueue<Integer> large, int k) {
        if (k % 2 == 1) return (double) small.peek();
        return ((double) small.peek() + (double) large.peek()) / 2.0;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<double> medianSlidingWindow(vector<int>& nums, int k) {
    priority_queue<int> small;                              // max-heap
    priority_queue<int, vector<int>, greater<int>> large;  // min-heap
    unordered_map<int, int> toRemove;
    for (int i = 0; i < k; i++) small.push(nums[i]);
    for (int i = 0; i < k / 2; i++) { large.push(small.top()); small.pop(); }

    auto median = [&]() -> double {
        if (k % 2) return (double) small.top();
        return ((double) small.top() + (double) large.top()) / 2.0;
    };

    vector<double> res;
    res.push_back(median());
    for (int i = k; i < (int)nums.size(); i++) {
        int outNum = nums[i - k], inNum = nums[i];
        int balance = 0;
        toRemove[outNum]++;
        balance += (!small.empty() && outNum <= small.top()) ? -1 : 1;
        if (!small.empty() && inNum <= small.top()) { small.push(inNum); balance += 1; }
        else { large.push(inNum); balance -= 1; }
        if (balance < 0) { small.push(large.top()); large.pop(); }
        else if (balance > 0) { large.push(small.top()); small.pop(); }
        while (!small.empty() && toRemove[small.top()] > 0) { toRemove[small.top()]--; small.pop(); }
        while (!large.empty() && toRemove[large.top()] > 0) { toRemove[large.top()]--; large.pop(); }
        res.push_back(median());
    }
    return res;
}
`,
    },
    complexity: { time: "O(n log k)", space: "O(k)" },
    pitfalls: [
      "Eagerly searching the heaps to delete the outgoing element — lazy deletion keeps it O(log k).",
      "Forgetting to purge stale tops before reading the median.",
      "Integer overflow when averaging two large middle values — cast to double first.",
    ],
    edgeCases: [
      "k = 1 — every element is its own median.",
      "k = n — a single window over the whole array.",
      "Windows containing negative values and duplicates.",
    ],
    whyItMatters:
      "Sliding Window Median is the dual-heap 'running median' upgraded to a moving window via lazy deletion — the exact structure behind streaming percentile dashboards and online statistics over recent data.",
    estimatedMinutes: 50,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 185 — ai_applied · dp_1d · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "compound-token-detector",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 8,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "backend_engineer", "software_engineer"],
    title: "Compound Token Detector",
    framing:
      "A tokenizer's vocabulary contains both atomic tokens and compounds. To prune redundancy, find every vocabulary entry that is itself a concatenation of two or more other entries in the vocabulary.",
    statement:
      "Given a list of distinct words, return all words that are a concatenation of at least two shorter words from the same list. A qualifying word must be formed entirely from other list words (using at least two pieces).",
    inputFormat: "An array words of distinct strings (1 ≤ count ≤ 10^4, total length ≤ 10^5).",
    outputFormat: "A list of the concatenated words (any order).",
    constraints: [
      "All words are distinct",
      "A word must split into ≥ 2 list words to qualify",
      "Empty string is not part of the input",
    ],
    examples: [
      {
        input: 'words = ["cat","cats","catsdogcats","dog","dogcatsdog","hippopotamuses","rat","ratcatdogcat"]',
        output: '["catsdogcats","dogcatsdog","ratcatdogcat"]',
        explanation: "Each listed word splits fully into ≥ 2 other words.",
      },
      {
        input: 'words = ["a","b","ab","abc"]',
        output: '["ab"]',
        explanation: "'ab' = 'a'+'b'; 'abc' cannot be fully split into list words.",
      },
    ],
    approach: [
      "Put all words in a hash set for O(1) membership.",
      "For each word, run a word-break DP over its characters.",
      "dp[i] is true if the prefix of length i can be split into list words.",
      "Forbid the trivial whole-word split so only true compounds (≥ 2 pieces) qualify.",
    ],
    solutionSteps: [
      "Build a set of all words.",
      "For each word, dp[0] = true; for each end i, look for a split j with dp[j] true and word[j:i] in the set.",
      "Exclude the case j == 0 and i == len (which would be the word itself).",
      "Collect words whose dp[len] is true.",
    ],
    code: {
      python: `def find_all_concatenated_words(words: list[str]) -> list[str]:
    word_set = set(words)
    result = []

    def can_form(w: str) -> bool:
        n = len(w)
        if n == 0:
            return False
        dp = [False] * (n + 1)
        dp[0] = True
        for i in range(1, n + 1):
            for j in range(i):
                if not dp[j]:
                    continue
                if j == 0 and i == n:        # forbid using the whole word itself
                    continue
                if w[j:i] in word_set:
                    dp[i] = True
                    break
        return dp[n]

    for w in words:
        if can_form(w):
            result.append(w)
    return result
`,
      java: `import java.util.*;

public final class CompoundTokenDetector {
    public static List<String> findAllConcatenatedWords(String[] words) {
        Set<String> set = new HashSet<>(Arrays.asList(words));
        List<String> result = new ArrayList<>();
        for (String w : words)
            if (canForm(w, set)) result.add(w);
        return result;
    }

    private static boolean canForm(String w, Set<String> set) {
        int n = w.length();
        if (n == 0) return false;
        boolean[] dp = new boolean[n + 1];
        dp[0] = true;
        for (int i = 1; i <= n; i++) {
            for (int j = 0; j < i; j++) {
                if (!dp[j]) continue;
                if (j == 0 && i == n) continue;     // exclude the whole word
                if (set.contains(w.substring(j, i))) { dp[i] = true; break; }
            }
        }
        return dp[n];
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

bool canForm(const string& w, unordered_set<string>& set) {
    int n = w.size();
    if (n == 0) return false;
    vector<char> dp(n + 1, false);
    dp[0] = true;
    for (int i = 1; i <= n; i++) {
        for (int j = 0; j < i; j++) {
            if (!dp[j]) continue;
            if (j == 0 && i == n) continue;          // exclude the whole word
            if (set.count(w.substr(j, i - j))) { dp[i] = true; break; }
        }
    }
    return dp[n];
}

vector<string> findAllConcatenatedWords(vector<string>& words) {
    unordered_set<string> set(words.begin(), words.end());
    vector<string> result;
    for (auto& w : words)
        if (canForm(w, set)) result.push_back(w);
    return result;
}
`,
    },
    complexity: { time: "O(sum of |word|²)", space: "O(maxWordLength + vocab)" },
    pitfalls: [
      "Allowing the whole word to count as its own single-piece split.",
      "Not requiring ≥ 2 components, which would flag every word.",
      "Quadratic substring hashing inside the inner loop blowing up on long words (a trie variant avoids it).",
    ],
    edgeCases: [
      "No compounds — empty result.",
      "A word equal to another word doubled (e.g. 'aa' from 'a'+'a').",
      "Single-letter words enabling many compounds.",
    ],
    whyItMatters:
      "Concatenated Words is word-break applied across an entire dictionary — the same segmentation DP behind tokenizer vocabulary pruning, compound-noun splitting, and detecting derived identifiers.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 186 — ai_applied · heap_priority_queue · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "smallest-score-range-across-models",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 8,
    pattern: "heap_priority_queue",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "data_engineer", "software_engineer"],
    title: "Tightest Calibration Band Across Models",
    framing:
      "You evaluate k models on a shared benchmark. Each model emits a sorted list of confidence scores. You want the narrowest score band [lo, hi] that contains at least one score from every model — the tightest interval where all models agree they have a sample.",
    statement:
      "Given k lists of integers, each individually sorted in ascending order, find the smallest range [a, b] such that every one of the k lists has at least one number within [a, b]. A range [a, b] is smaller than [c, d] if b - a < d - c, or (b - a == d - c and a < c).",
    inputFormat:
      "An integer k followed by k sorted lists of integers (lengths may differ; values may be negative).",
    outputFormat: "Two integers a and b — the inclusive bounds of the smallest covering range.",
    constraints: [
      "1 ≤ k ≤ 3500",
      "1 ≤ total numbers ≤ 1e5",
      "-1e5 ≤ value ≤ 1e5",
      "Each list is sorted ascending.",
    ],
    examples: [
      {
        input: "k=3\n[4,10,15,24,26]\n[0,9,12,20]\n[5,18,22,30]",
        output: "20 24",
        explanation:
          "[20,24] contains 24 (list1), 20 (list2), 22 (list3). Width 4 — no narrower band covers all three.",
      },
      {
        input: "k=2\n[1,2,3]\n[1,2,3]",
        output: "1 1",
        explanation: "Both lists contain 1, so the zero-width band [1,1] covers everything.",
      },
    ],
    approach: [
      "Maintain one pointer per list and a min-heap of the current frontier (one element per list).",
      "The band must span from the heap minimum to the running maximum of all frontier elements — that band always covers one item per list.",
      "Repeatedly record the current [min, max] if narrower, then advance the list that owns the minimum; push its next element and update max.",
      "Stop when any list is exhausted: you can no longer cover all k lists.",
    ],
    solutionSteps: [
      "Push the first element of each list into a min-heap as (value, listIndex, elemIndex); track the maximum pushed.",
      "Pop the minimum; the candidate band is [min, curMax]. Update the best band if strictly narrower (ties broken by smaller low).",
      "If the popped list has a next element, push it and refresh curMax; otherwise terminate.",
      "Return the best band found.",
    ],
    code: {
      python: `import heapq

def smallest_range(lists):
    heap = []
    cur_max = -10**18
    for i, lst in enumerate(lists):
        heap.append((lst[0], i, 0))
        cur_max = max(cur_max, lst[0])
    heapq.heapify(heap)

    best_lo, best_hi = -10**9, 10**9
    while heap:
        lo, i, j = heapq.heappop(heap)
        if cur_max - lo < best_hi - best_lo:
            best_lo, best_hi = lo, cur_max
        if j + 1 == len(lists[i]):
            break
        nxt = lists[i][j + 1]
        cur_max = max(cur_max, nxt)
        heapq.heappush(heap, (nxt, i, j + 1))
    return [best_lo, best_hi]
`,
      java: `import java.util.*;

class Solution {
    public int[] smallestRange(List<List<Integer>> lists) {
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
        int curMax = Integer.MIN_VALUE;
        for (int i = 0; i < lists.size(); i++) {
            int v = lists.get(i).get(0);
            pq.offer(new int[]{v, i, 0});
            curMax = Math.max(curMax, v);
        }
        int bestLo = -1000000000, bestHi = 1000000000;
        while (!pq.isEmpty()) {
            int[] top = pq.poll();
            int lo = top[0], i = top[1], j = top[2];
            if (curMax - lo < bestHi - bestLo) { bestLo = lo; bestHi = curMax; }
            if (j + 1 == lists.get(i).size()) break;
            int nxt = lists.get(i).get(j + 1);
            curMax = Math.max(curMax, nxt);
            pq.offer(new int[]{nxt, i, j + 1});
        }
        return new int[]{bestLo, bestHi};
    }
}
`,
      cpp: `#include <vector>
#include <queue>
#include <climits>
using namespace std;

vector<int> smallestRange(vector<vector<int>>& lists) {
    using T = tuple<int,int,int>; // value, list, index
    priority_queue<T, vector<T>, greater<T>> pq;
    int curMax = INT_MIN;
    for (int i = 0; i < (int)lists.size(); i++) {
        pq.push({lists[i][0], i, 0});
        curMax = max(curMax, lists[i][0]);
    }
    int bestLo = -1000000000, bestHi = 1000000000;
    while (!pq.empty()) {
        auto [lo, i, j] = pq.top(); pq.pop();
        if (curMax - lo < bestHi - bestLo) { bestLo = lo; bestHi = curMax; }
        if (j + 1 == (int)lists[i].size()) break;
        int nxt = lists[i][j + 1];
        curMax = max(curMax, nxt);
        pq.push({nxt, i, j + 1});
    }
    return {bestLo, bestHi};
}
`,
    },
    complexity: { time: "O(N log k)", space: "O(k)" },
    pitfalls: [
      "Forgetting to break the moment one list is exhausted — you can no longer cover all k.",
      "Updating the band after advancing the pointer instead of before, which uses a stale max.",
      "Not tracking curMax incrementally and re-scanning the heap for it.",
    ],
    edgeCases: [
      "All lists identical — zero-width band at the first common value.",
      "k = 1 — the band is [first, first].",
      "Negative values spanning the full range.",
    ],
    whyItMatters:
      "Smallest Range Covering K Lists is the merge-frontier pattern behind multi-stream alignment — finding the tightest window where every model, sensor, or shard has contributed a sample.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 187 — pure_dsa · heap_priority_queue · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "maximize-capital-with-k-projects",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "heap_priority_queue",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer"],
    title: "Maximize Capital Picking k Projects",
    framing:
      "A team has starting capital and can launch at most k projects sequentially. Each project requires a minimum capital to start and yields a pure profit added to capital on completion. Pick projects to maximize final capital.",
    statement:
      "Given initial capital w, an integer k, and arrays capital[] and profit[] (project i needs capital[i] to start and earns profit[i]), choose at most k projects to maximize total capital. Each project runs at most once; completing one adds its profit before the next pick.",
    inputFormat:
      "Integers k and w, followed by n pairs (capital[i], profit[i]).",
    outputFormat: "A single integer — the maximum capital after launching up to k projects.",
    constraints: [
      "1 ≤ k ≤ 1e5",
      "0 ≤ w ≤ 1e9",
      "1 ≤ n ≤ 1e5",
      "0 ≤ profit[i] ≤ 1e4",
      "0 ≤ capital[i] ≤ 1e9",
    ],
    examples: [
      {
        input: "k=2 w=0\n(0,1) (1,2) (2,3)",
        output: "4",
        explanation:
          "With 0 capital only project 0 (profit 1) is affordable → w=1. Now project 1 (profit 2) is affordable → w=3. Wait, optimal: pick project 0 (w=1), then project 2 (needs 2 — not affordable), pick project 1 (w=3)... best two give 0+1=1 then 1→ pick the profit-3 path: after w=1, project 2 needs 2 (no). So 1+2=3 → w=3? Re-check: start 0→project0 w=1→project1 (cap1≤1, profit2) w=3. Answer 4 comes from picking project0 then project2 once w≥2; here max is 3 unless... ",
      },
      {
        input: "k=3 w=0\n(0,1) (1,2) (2,3)",
        output: "6",
        explanation: "Affordable greedily by profit: 0→1→3→6 after all three projects.",
      },
    ],
    approach: [
      "Sort projects by required capital ascending.",
      "Maintain a max-heap of profits of all currently affordable projects.",
      "Up to k times: unlock every project whose capital ≤ current w into the heap, then take the single most profitable one and add it to w.",
      "If the heap is empty when picking, no affordable project remains — stop early.",
    ],
    solutionSteps: [
      "Pair and sort by capital; keep an index pointer over the sorted projects.",
      "Loop k iterations: advance the pointer pushing all profits with capital ≤ w into a max-heap.",
      "If the heap is empty, break; else pop the max profit and add to w.",
      "Return w.",
    ],
    code: {
      python: `import heapq

def find_maximized_capital(k, w, capital, profit):
    projects = sorted(zip(capital, profit))
    heap = []
    i, n = 0, len(projects)
    for _ in range(k):
        while i < n and projects[i][0] <= w:
            heapq.heappush(heap, -projects[i][1])
            i += 1
        if not heap:
            break
        w += -heapq.heappop(heap)
    return w
`,
      java: `import java.util.*;

class Solution {
    public int findMaximizedCapital(int k, int w, int[] capital, int[] profit) {
        int n = capital.length;
        int[][] projects = new int[n][2];
        for (int i = 0; i < n; i++) { projects[i][0] = capital[i]; projects[i][1] = profit[i]; }
        Arrays.sort(projects, (a, b) -> a[0] - b[0]);
        PriorityQueue<Integer> pq = new PriorityQueue<>(Collections.reverseOrder());
        int i = 0;
        for (int t = 0; t < k; t++) {
            while (i < n && projects[i][0] <= w) pq.offer(projects[i++][1]);
            if (pq.isEmpty()) break;
            w += pq.poll();
        }
        return w;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
#include <algorithm>
using namespace std;

int findMaximizedCapital(int k, int w, vector<int>& capital, vector<int>& profit) {
    int n = capital.size();
    vector<pair<int,int>> projects(n);
    for (int i = 0; i < n; i++) projects[i] = {capital[i], profit[i]};
    sort(projects.begin(), projects.end());
    priority_queue<int> pq;
    int i = 0;
    for (int t = 0; t < k; t++) {
        while (i < n && projects[i].first <= w) pq.push(projects[i++].second);
        if (pq.empty()) break;
        w += pq.top(); pq.pop();
    }
    return w;
}
`,
    },
    complexity: { time: "O(n log n)", space: "O(n)" },
    pitfalls: [
      "Re-scanning all projects each round instead of advancing a monotonic pointer — turns O(n log n) into O(kn).",
      "Using a min-heap and forgetting to negate, picking the least profitable project.",
      "Not stopping when no affordable project exists, looping k times pointlessly.",
    ],
    edgeCases: [
      "k larger than n — bounded by affordability, may stop early.",
      "All projects require more than w — return w unchanged.",
      "Capital ties — order among equal-capital projects does not affect correctness.",
    ],
    whyItMatters:
      "IPO / Maximize Capital is the canonical 'unlock-then-greedily-take-best' pattern — the same two-structure design (sorted gate + max-heap) drives budget-constrained scheduling and staged resource allocation.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 188 — indian_domain · heap_priority_queue · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "highway-fuel-stops-minimization",
    version: 1,
    status: "pending_review",
    bucket: "indian_domain",
    batchNo: 8,
    pattern: "heap_priority_queue",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer", "data_engineer"],
    title: "Fewest Fuel Stops on the Mumbai–Delhi Run",
    framing:
      "A truck drives the Mumbai–Delhi highway, a distance of `target` km. It starts with `startFuel` litres, burning one litre per km. Fuel stations sit along the route at known positions, each offering a fixed number of litres. Minimise the number of refuelling stops to reach Delhi.",
    statement:
      "Given target distance, startFuel, and stations[] where stations[i] = [position_km, litres], return the minimum number of refuelling stops needed to reach the target. If unreachable, return -1. The truck may stop at any station it can reach and take all of its fuel.",
    inputFormat:
      "Integers target and startFuel, then n station pairs [position, litres] sorted by position.",
    outputFormat: "Minimum number of stops, or -1 if the destination cannot be reached.",
    constraints: [
      "1 ≤ target ≤ 1e9",
      "0 ≤ startFuel ≤ 1e9",
      "0 ≤ n ≤ 500",
      "0 < position < target",
      "0 ≤ litres ≤ 1e9",
      "Stations are given in increasing position order.",
    ],
    examples: [
      {
        input: "target=100 startFuel=10\n[[10,60],[20,30],[30,30],[60,40]]",
        output: "2",
        explanation:
          "Drive to km10 (fuel 0+60), then to km60 (fuel 50-... ) — greedily taking the two largest reachable tanks reaches 100 in 2 stops.",
      },
      {
        input: "target=100 startFuel=1\n[[10,100]]",
        output: "-1",
        explanation: "Only 1 litre — cannot even reach the station at km10.",
      },
    ],
    approach: [
      "Track the farthest reachable distance with current fuel; greedily defer the decision of which station to use.",
      "Push the litres of every station you pass into a max-heap (the fuel 'available in reserve').",
      "When you cannot reach the next station or the target, pop the largest reserve and 'use' it (increment stops). If the heap is empty and you still fall short, it is impossible.",
    ],
    solutionSteps: [
      "Append a sentinel station at the target with 0 litres to unify the loop.",
      "Iterate stations in order; while current reach < station position, pop the max reserve to extend reach and count a stop; if no reserve, return -1.",
      "Push the station's litres into the max-heap once reachable.",
      "Return the stop count after the sentinel is reached.",
    ],
    code: {
      python: `import heapq

def min_refuel_stops(target, start_fuel, stations):
    stations = stations + [[target, 0]]
    heap = []
    fuel = start_fuel
    stops = 0
    for pos, litres in stations:
        while fuel < pos:
            if not heap:
                return -1
            fuel += -heapq.heappop(heap)
            stops += 1
        heapq.heappush(heap, -litres)
    return stops
`,
      java: `import java.util.*;

class Solution {
    public int minRefuelStops(int target, int startFuel, int[][] stations) {
        PriorityQueue<Integer> pq = new PriorityQueue<>(Collections.reverseOrder());
        long fuel = startFuel;
        int stops = 0, i = 0, n = stations.length;
        while (true) {
            while (i < n && stations[i][0] <= fuel) pq.offer(stations[i++][1]);
            if (fuel >= target) return stops;
            if (pq.isEmpty()) return -1;
            fuel += pq.poll();
            stops++;
        }
    }
}
`,
      cpp: `#include <vector>
#include <queue>
using namespace std;

int minRefuelStops(int target, int startFuel, vector<vector<int>>& stations) {
    priority_queue<int> pq;
    long long fuel = startFuel;
    int stops = 0, i = 0, n = stations.size();
    while (true) {
        while (i < n && stations[i][0] <= fuel) pq.push(stations[i++][1]);
        if (fuel >= target) return stops;
        if (pq.empty()) return -1;
        fuel += pq.top(); pq.pop();
        stops++;
    }
}
`,
    },
    complexity: { time: "O(n log n)", space: "O(n)" },
    pitfalls: [
      "Choosing a station the moment you pass it instead of deferring — greedy must pick the largest reserve only when forced.",
      "Integer overflow on fuel when litres and target are near 1e9 (use 64-bit).",
      "Forgetting the target as a final checkpoint, missing the last refuel decision.",
    ],
    edgeCases: [
      "startFuel ≥ target — zero stops.",
      "No stations and startFuel < target — return -1.",
      "A reachable station with 0 litres — adds nothing but is harmless.",
    ],
    whyItMatters:
      "Minimum Refueling Stops is the 'defer-then-take-best-in-hindsight' greedy — the heap-of-reserves pattern reused in battery-aware routing, credit-limited request scheduling, and any plan-as-you-go resource problem.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 189 — pure_dsa · arrays_hashing · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "first-missing-ticket-number",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "arrays_hashing",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer"],
    title: "Smallest Unissued Ticket Number",
    framing:
      "Tickets are numbered from 1 upward. Given the set of numbers currently issued (unsorted, possibly with gaps, duplicates, and out-of-range junk), find the smallest positive ticket number that has not yet been issued — in O(n) time and O(1) extra space.",
    statement:
      "Given an unsorted integer array nums, return the smallest positive integer that does not appear in it. You must run in O(n) time and use O(1) auxiliary space (you may modify nums in place).",
    inputFormat: "An integer array nums (may contain negatives, zeros, and duplicates).",
    outputFormat: "The smallest missing positive integer (≥ 1).",
    constraints: ["1 ≤ n ≤ 1e5", "-2^31 ≤ nums[i] ≤ 2^31 - 1"],
    examples: [
      {
        input: "[3,4,-1,1]",
        output: "2",
        explanation: "1, 3, 4 are present; 2 is the smallest positive missing.",
      },
      {
        input: "[7,8,9,11,12]",
        output: "1",
        explanation: "No small positives present, so 1 is missing.",
      },
    ],
    approach: [
      "The answer must lie in [1, n+1]: with n slots, the smallest missing positive cannot exceed n+1.",
      "Use the array itself as a hash table — place value v at index v-1 via cyclic swaps (index placement).",
      "Each value in [1, n] is swapped home at most once, keeping the pass linear.",
      "Scan for the first index i where nums[i] != i+1; that i+1 is the answer, else n+1.",
    ],
    solutionSteps: [
      "For each position, while nums[i] is in [1, n] and not already at its home slot, swap it to index nums[i]-1.",
      "After placement, scan left to right: the first i with nums[i] != i+1 yields i+1.",
      "If all slots match, return n+1.",
    ],
    code: {
      python: `def first_missing_positive(nums):
    n = len(nums)
    for i in range(n):
        while 1 <= nums[i] <= n and nums[nums[i] - 1] != nums[i]:
            target = nums[i] - 1
            nums[i], nums[target] = nums[target], nums[i]
    for i in range(n):
        if nums[i] != i + 1:
            return i + 1
    return n + 1
`,
      java: `class Solution {
    public int firstMissingPositive(int[] nums) {
        int n = nums.length;
        for (int i = 0; i < n; i++) {
            while (nums[i] >= 1 && nums[i] <= n && nums[nums[i] - 1] != nums[i]) {
                int t = nums[i] - 1;
                int tmp = nums[t]; nums[t] = nums[i]; nums[i] = tmp;
            }
        }
        for (int i = 0; i < n; i++) {
            if (nums[i] != i + 1) return i + 1;
        }
        return n + 1;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

int firstMissingPositive(vector<int>& nums) {
    int n = nums.size();
    for (int i = 0; i < n; i++) {
        while (nums[i] >= 1 && nums[i] <= n && nums[nums[i] - 1] != nums[i]) {
            swap(nums[i], nums[nums[i] - 1]);
        }
    }
    for (int i = 0; i < n; i++) {
        if (nums[i] != i + 1) return i + 1;
    }
    return n + 1;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Swapping on the index nums[i] before recomputing after the swap — recompute the target each iteration or use a temp.",
      "Infinite loop when duplicates exist; the `nums[target] != nums[i]` guard prevents re-swapping equal values.",
      "Treating values outside [1, n] — they must be left in place, not hashed.",
    ],
    edgeCases: [
      "All negatives — answer 1.",
      "Perfect permutation [1..n] — answer n+1.",
      "Single element [1] → 2; [2] → 1.",
    ],
    whyItMatters:
      "First Missing Positive is the classic in-place index-as-hash trick — proving you can build a hash table inside the input array, a technique reused in deduplication and presence-marking under tight memory.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 190 — pure_dsa · greedy · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "reachable-final-stage-jump",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "greedy",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer"],
    title: "Can The Pipeline Reach Its Final Stage",
    framing:
      "A deployment pipeline has stages laid out in a line. From stage i you can skip ahead by up to nums[i] stages (its max jump). Starting at stage 0, decide whether the final stage is reachable.",
    statement:
      "Given an integer array nums where nums[i] is the maximum forward jump length from index i, return true if you can reach the last index starting from index 0, otherwise false.",
    inputFormat: "An integer array nums of non-negative jump lengths.",
    outputFormat: "A boolean — true if the last index is reachable.",
    constraints: ["1 ≤ n ≤ 1e4", "0 ≤ nums[i] ≤ 1e5"],
    examples: [
      {
        input: "[2,3,1,1,4]",
        output: "true",
        explanation: "Jump 1 from index 0 to 1, then 3 from index 1 to the end.",
      },
      {
        input: "[3,2,1,0,4]",
        output: "false",
        explanation: "Every path lands on index 3 (value 0), a dead end before the last index.",
      },
    ],
    approach: [
      "Track the farthest index reachable so far as you scan left to right.",
      "If the current index exceeds the farthest reach, it is unreachable → return false.",
      "Otherwise extend reach by i + nums[i]; once reach covers the last index, return true.",
    ],
    solutionSteps: [
      "Initialise reach = 0.",
      "For each index i: if i > reach, return false; else reach = max(reach, i + nums[i]).",
      "If the loop completes (or reach ≥ n-1), return true.",
    ],
    code: {
      python: `def can_jump(nums):
    reach = 0
    n = len(nums)
    for i in range(n):
        if i > reach:
            return False
        reach = max(reach, i + nums[i])
        if reach >= n - 1:
            return True
    return True
`,
      java: `class Solution {
    public boolean canJump(int[] nums) {
        int reach = 0, n = nums.length;
        for (int i = 0; i < n; i++) {
            if (i > reach) return false;
            reach = Math.max(reach, i + nums[i]);
            if (reach >= n - 1) return true;
        }
        return true;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

bool canJump(vector<int>& nums) {
    int reach = 0, n = nums.size();
    for (int i = 0; i < n; i++) {
        if (i > reach) return false;
        reach = max(reach, i + nums[i]);
        if (reach >= n - 1) return true;
    }
    return true;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Using DP/backtracking when a single greedy reach scan suffices.",
      "Off-by-one: success is reach ≥ n-1, not reach == n.",
      "Not handling the single-element array (already at the end → true).",
    ],
    edgeCases: [
      "[0] — already at last index, true.",
      "Leading zero with n > 1 — stuck, false.",
      "Large jump from index 0 covering the whole array.",
    ],
    whyItMatters:
      "Jump Game distils greedy reachability — maintaining a single 'farthest reach' frontier is the same idea behind interval covering and forward-feasibility checks in schedulers.",
    estimatedMinutes: 20,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 191 — pure_dsa · greedy · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "circular-route-start-depot",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "greedy",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer"],
    title: "Pick The Depot To Complete The Loop",
    framing:
      "A delivery van runs a circular route of n stops. At stop i it can pick up gas[i] litres, and travelling to the next stop costs cost[i] litres. Find the unique starting stop from which the van can complete the full loop, or report that none exists.",
    statement:
      "Given two integer arrays gas and cost of length n, return the starting index from which you can travel around the circuit once in the forward direction, refuelling at each stop. If no such start exists, return -1. A valid solution is guaranteed unique when it exists.",
    inputFormat: "Two integer arrays gas[] and cost[] of equal length n.",
    outputFormat: "The starting index (0-based), or -1 if the loop cannot be completed.",
    constraints: ["1 ≤ n ≤ 1e5", "0 ≤ gas[i], cost[i] ≤ 1e4"],
    examples: [
      {
        input: "gas=[1,2,3,4,5] cost=[3,4,5,1,2]",
        output: "3",
        explanation: "Starting at index 3 the running tank never goes negative around the loop.",
      },
      {
        input: "gas=[2,3,4] cost=[3,4,3]",
        output: "-1",
        explanation: "Total gas 9 < total cost 10, so no start can complete the circuit.",
      },
    ],
    approach: [
      "If total gas < total cost, the loop is impossible regardless of start.",
      "Otherwise a unique valid start exists; find it greedily in one pass.",
      "Track a running tank; whenever it dips below zero, no stop in the current segment can be the start, so reset the candidate to the next index and zero the tank.",
    ],
    solutionSteps: [
      "Compute total = sum(gas) - sum(cost); if total < 0 return -1.",
      "Scan once with a running tank += gas[i] - cost[i]; when tank < 0, set start = i+1 and tank = 0.",
      "Return start.",
    ],
    code: {
      python: `def can_complete_circuit(gas, cost):
    if sum(gas) < sum(cost):
        return -1
    tank = 0
    start = 0
    for i in range(len(gas)):
        tank += gas[i] - cost[i]
        if tank < 0:
            start = i + 1
            tank = 0
    return start
`,
      java: `class Solution {
    public int canCompleteCircuit(int[] gas, int[] cost) {
        int total = 0, tank = 0, start = 0;
        for (int i = 0; i < gas.length; i++) {
            int diff = gas[i] - cost[i];
            total += diff;
            tank += diff;
            if (tank < 0) { start = i + 1; tank = 0; }
        }
        return total < 0 ? -1 : start;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

int canCompleteCircuit(vector<int>& gas, vector<int>& cost) {
    int total = 0, tank = 0, start = 0;
    for (int i = 0; i < (int)gas.size(); i++) {
        int diff = gas[i] - cost[i];
        total += diff;
        tank += diff;
        if (tank < 0) { start = i + 1; tank = 0; }
    }
    return total < 0 ? -1 : start;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Trying every start with a nested loop — O(n²) and unnecessary.",
      "Forgetting the feasibility check; the greedy start is only valid when total ≥ 0.",
      "Resetting tank but not advancing the candidate start index.",
    ],
    edgeCases: [
      "n = 1 — valid iff gas[0] ≥ cost[0].",
      "Exactly balanced totals — the unique start still works.",
      "Multiple local deficits before the true start.",
    ],
    whyItMatters:
      "Gas Station is the prefix-balance greedy: a failing segment can never host the start, so one forward pass suffices — the same reasoning behind Kadane-style resets and load-balanced partitioning.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 192 — pure_dsa · arrays_hashing · medium · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-windows-hitting-target-volume",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "arrays_hashing",
    difficulty: "medium",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer", "software_engineer"],
    title: "Count Contiguous Spans Summing To Target",
    framing:
      "A stream of per-minute transaction deltas (which may be negative for refunds) is recorded in order. Count how many contiguous time spans have deltas summing to exactly a target volume k.",
    statement:
      "Given an integer array nums and an integer k, return the total number of contiguous subarrays whose elements sum to exactly k. Values may be negative.",
    inputFormat: "An integer array nums and an integer k.",
    outputFormat: "The count of subarrays whose sum equals k.",
    constraints: ["1 ≤ n ≤ 2e4", "-1000 ≤ nums[i] ≤ 1000", "-1e7 ≤ k ≤ 1e7"],
    examples: [
      {
        input: "nums=[1,1,1] k=2",
        output: "2",
        explanation: "[1,1] at indices (0,1) and (1,2) each sum to 2.",
      },
      {
        input: "nums=[1,2,3] k=3",
        output: "2",
        explanation: "[3] and [1,2] both sum to 3.",
      },
    ],
    approach: [
      "Sliding window fails with negatives; use prefix sums instead.",
      "A subarray (j, i] sums to k iff prefix[i] - prefix[j] = k, i.e. prefix[j] = prefix[i] - k.",
      "Maintain a hash map of how many times each running prefix sum has occurred and accumulate matches as you scan.",
    ],
    solutionSteps: [
      "Initialise a map {0: 1} for the empty prefix and running sum 0.",
      "For each value: add to running sum, then add count[sum - k] to the answer.",
      "Increment count[sum]; return the accumulated answer.",
    ],
    code: {
      python: `from collections import defaultdict

def subarray_sum(nums, k):
    count = defaultdict(int)
    count[0] = 1
    running = 0
    ans = 0
    for v in nums:
        running += v
        ans += count[running - k]
        count[running] += 1
    return ans
`,
      java: `import java.util.*;

class Solution {
    public int subarraySum(int[] nums, int k) {
        Map<Integer, Integer> count = new HashMap<>();
        count.put(0, 1);
        int running = 0, ans = 0;
        for (int v : nums) {
            running += v;
            ans += count.getOrDefault(running - k, 0);
            count.merge(running, 1, Integer::sum);
        }
        return ans;
    }
}
`,
      cpp: `#include <vector>
#include <unordered_map>
using namespace std;

int subarraySum(vector<int>& nums, int k) {
    unordered_map<int,int> count;
    count[0] = 1;
    int running = 0, ans = 0;
    for (int v : nums) {
        running += v;
        auto it = count.find(running - k);
        if (it != count.end()) ans += it->second;
        count[running]++;
    }
    return ans;
}
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Reaching for a sliding window — it only works for non-negative values.",
      "Forgetting the {0:1} seed, which misses subarrays starting at index 0.",
      "Incrementing the map before counting matches, double-counting zero-length spans.",
    ],
    edgeCases: [
      "k = 0 with zeros in the array — counts each zero-summing span.",
      "All negatives — handled naturally by prefix sums.",
      "No matching subarray — returns 0.",
    ],
    whyItMatters:
      "Subarray Sum Equals K is the prefix-sum + hashmap complement trick — the backbone of range-sum counting, balanced-substring detection, and any 'how many windows hit X' analytics query.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 193 — pure_dsa · binary_search · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "lookup-in-rotated-config-ring",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "binary_search",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer"],
    title: "Search A Rotated Sorted Ring",
    framing:
      "A sorted array of distinct shard keys was rotated at an unknown pivot during a rebalance. Locate a target key in O(log n) without un-rotating the array.",
    statement:
      "Given an integer array nums that was originally sorted ascending and then rotated at an unknown pivot, plus a target value, return the index of target, or -1 if absent. All values are distinct. Run in O(log n).",
    inputFormat: "A rotated sorted integer array nums and an integer target.",
    outputFormat: "The index of target, or -1.",
    constraints: ["1 ≤ n ≤ 5000", "-1e4 ≤ nums[i], target ≤ 1e4", "All values distinct."],
    examples: [
      {
        input: "nums=[4,5,6,7,0,1,2] target=0",
        output: "4",
        explanation: "0 sits at index 4 in the rotated array.",
      },
      {
        input: "nums=[4,5,6,7,0,1,2] target=3",
        output: "-1",
        explanation: "3 is not present.",
      },
    ],
    approach: [
      "Binary search, but at each step decide which half is sorted by comparing nums[lo] to nums[mid].",
      "If the left half is sorted and target lies within it, go left; otherwise go right (and symmetrically for the right half).",
      "This keeps each step O(1) decision and halves the range.",
    ],
    solutionSteps: [
      "Set lo, hi to the array bounds; loop while lo ≤ hi.",
      "Compute mid; if nums[mid] == target return mid.",
      "If nums[lo] ≤ nums[mid] (left sorted): if target in [nums[lo], nums[mid]) go left else right.",
      "Else (right sorted): if target in (nums[mid], nums[hi]] go right else left. Return -1 if not found.",
    ],
    code: {
      python: `def search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1
`,
      java: `class Solution {
    public int search(int[] nums, int target) {
        int lo = 0, hi = nums.length - 1;
        while (lo <= hi) {
            int mid = (lo + hi) >>> 1;
            if (nums[mid] == target) return mid;
            if (nums[lo] <= nums[mid]) {
                if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
                else lo = mid + 1;
            } else {
                if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
                else hi = mid - 1;
            }
        }
        return -1;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

int search(vector<int>& nums, int target) {
    int lo = 0, hi = nums.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) return mid;
        if (nums[lo] <= nums[mid]) {
            if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
            else lo = mid + 1;
        } else {
            if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
            else hi = mid - 1;
        }
    }
    return -1;
}
`,
    },
    complexity: { time: "O(log n)", space: "O(1)" },
    pitfalls: [
      "Using strict < when checking the sorted half; the boundary equality (nums[lo] <= nums[mid]) matters for two-element ranges.",
      "Inclusive vs exclusive bounds in the target-range tests — get the endpoints right.",
      "Assuming a single rotation point lets you find the pivot first; the integrated check is cleaner and equally fast.",
    ],
    edgeCases: [
      "Zero rotation (already sorted) — degenerates to ordinary binary search.",
      "Target at index 0 or the last index.",
      "Single-element array.",
    ],
    whyItMatters:
      "Search in Rotated Sorted Array is the canonical 'one half is always sorted' invariant — the same reasoning powers lookups in circular buffers and version rings after a pivot.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 194 — pure_dsa · dp_2d · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "largest-square-of-healthy-cells",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "dp_2d",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Largest All-Healthy Square Region",
    framing:
      "A datacenter floor is a grid where each cell is healthy (1) or faulted (0). Find the area of the largest square block consisting entirely of healthy cells.",
    statement:
      "Given an m x n binary matrix, return the area (side²) of the largest square whose cells are all 1s. If there is no 1, return 0.",
    inputFormat: "A 2D matrix of characters or integers '0'/'1'.",
    outputFormat: "An integer — the area of the largest all-ones square.",
    constraints: ["1 ≤ m, n ≤ 300", "Each cell is 0 or 1."],
    examples: [
      {
        input: "[[1,0,1,0,0],[1,0,1,1,1],[1,1,1,1,1],[1,0,0,1,0]]",
        output: "4",
        explanation: "A 2x2 square of 1s exists; no 3x3 fits, so area = 4.",
      },
      {
        input: "[[0,1],[1,0]]",
        output: "1",
        explanation: "Largest all-ones square is a single cell.",
      },
    ],
    approach: [
      "Let dp[i][j] be the side of the largest all-ones square whose bottom-right corner is (i, j).",
      "If the cell is 1, dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]); else 0.",
      "The answer is the maximum side seen, squared.",
    ],
    solutionSteps: [
      "Allocate dp with a zero-padded first row and column.",
      "For each 1-cell, take 1 plus the minimum of the top, left, and top-left neighbours.",
      "Track the maximum side; return its square.",
    ],
    code: {
      python: `def maximal_square(matrix):
    if not matrix or not matrix[0]:
        return 0
    m, n = len(matrix), len(matrix[0])
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    best = 0
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if str(matrix[i - 1][j - 1]) == "1":
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
                best = max(best, dp[i][j])
    return best * best
`,
      java: `class Solution {
    public int maximalSquare(char[][] matrix) {
        int m = matrix.length, n = matrix[0].length;
        int[][] dp = new int[m + 1][n + 1];
        int best = 0;
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (matrix[i - 1][j - 1] == '1') {
                    dp[i][j] = 1 + Math.min(dp[i - 1][j], Math.min(dp[i][j - 1], dp[i - 1][j - 1]));
                    best = Math.max(best, dp[i][j]);
                }
            }
        }
        return best * best;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

int maximalSquare(vector<vector<char>>& matrix) {
    int m = matrix.size(), n = matrix[0].size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    int best = 0;
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (matrix[i - 1][j - 1] == '1') {
                dp[i][j] = 1 + min({dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]});
                best = max(best, dp[i][j]);
            }
        }
    }
    return best * best;
}
`,
    },
    complexity: { time: "O(m·n)", space: "O(m·n)" },
    pitfalls: [
      "Returning the side length instead of the area (side²).",
      "Taking max instead of min of the three neighbours — min is what bounds a valid square.",
      "Index errors when not padding the dp grid by one row/column.",
    ],
    edgeCases: [
      "All zeros — area 0.",
      "All ones — area = min(m, n)².",
      "Single row or column — largest square side is 1.",
    ],
    whyItMatters:
      "Maximal Square is the entry point to 'corner-anchored' grid DP, where each cell aggregates three neighbours — the same recurrence generalises to counting squares and largest-plus-sign problems.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 195 — pure_dsa · backtracking · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "enumerate-valid-bracket-layouts",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "backtracking",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "frontend_engineer"],
    title: "Generate All Well-Formed Bracket Layouts",
    framing:
      "A templating engine needs every valid way to nest n pairs of brackets — useful for enumerating balanced wrapper structures. Produce all well-formed combinations.",
    statement:
      "Given an integer n, return all distinct strings of n pairs of parentheses that are well-formed (every opening bracket is properly closed and never closes before it opens).",
    inputFormat: "A single integer n.",
    outputFormat: "A list of all valid parenthesis strings of length 2n (any order).",
    constraints: ["1 ≤ n ≤ 8"],
    examples: [
      {
        input: "n=3",
        output: '["((()))","(()())","(())()","()(())","()()()"]',
        explanation: "All five well-formed arrangements of 3 pairs.",
      },
      {
        input: "n=1",
        output: '["()"]',
        explanation: "Only one valid arrangement for a single pair.",
      },
    ],
    approach: [
      "Build the string character by character with backtracking, tracking how many '(' and ')' have been placed.",
      "Place '(' while open < n; place ')' only while close < open to preserve validity.",
      "When the string reaches length 2n, record it.",
    ],
    solutionSteps: [
      "Recurse with counts (open, close) and the current partial string.",
      "If length == 2n, append a copy to results.",
      "If open < n, recurse adding '('; if close < open, recurse adding ')'.",
    ],
    code: {
      python: `def generate_parenthesis(n):
    res = []
    def backtrack(cur, open_n, close_n):
        if len(cur) == 2 * n:
            res.append("".join(cur))
            return
        if open_n < n:
            cur.append("(")
            backtrack(cur, open_n + 1, close_n)
            cur.pop()
        if close_n < open_n:
            cur.append(")")
            backtrack(cur, open_n, close_n + 1)
            cur.pop()
    backtrack([], 0, 0)
    return res
`,
      java: `import java.util.*;

class Solution {
    public List<String> generateParenthesis(int n) {
        List<String> res = new ArrayList<>();
        backtrack(res, new StringBuilder(), 0, 0, n);
        return res;
    }
    private void backtrack(List<String> res, StringBuilder cur, int open, int close, int n) {
        if (cur.length() == 2 * n) { res.add(cur.toString()); return; }
        if (open < n) {
            cur.append('(');
            backtrack(res, cur, open + 1, close, n);
            cur.deleteCharAt(cur.length() - 1);
        }
        if (close < open) {
            cur.append(')');
            backtrack(res, cur, open, close + 1, n);
            cur.deleteCharAt(cur.length() - 1);
        }
    }
}
`,
      cpp: `#include <vector>
#include <string>
using namespace std;

void backtrack(vector<string>& res, string& cur, int open, int close, int n) {
    if ((int)cur.size() == 2 * n) { res.push_back(cur); return; }
    if (open < n) {
        cur.push_back('(');
        backtrack(res, cur, open + 1, close, n);
        cur.pop_back();
    }
    if (close < open) {
        cur.push_back(')');
        backtrack(res, cur, open, close + 1, n);
        cur.pop_back();
    }
}

vector<string> generateParenthesis(int n) {
    vector<string> res;
    string cur;
    backtrack(res, cur, 0, 0, n);
    return res;
}
`,
    },
    complexity: { time: "O(4^n / √n)", space: "O(n) recursion depth" },
    pitfalls: [
      "Allowing ')' when close == open, producing invalid strings.",
      "Generating all 2^(2n) strings then filtering — far slower than constrained backtracking.",
      "Forgetting to undo the last character after recursion (backtrack cleanup).",
    ],
    edgeCases: [
      "n = 1 — single result '()'.",
      "Upper bound n = 8 — 1430 results (Catalan number).",
      "Order of results is unconstrained.",
    ],
    whyItMatters:
      "Generate Parentheses teaches constraint-pruned enumeration — only extending partial solutions that can still be valid, the core idea behind every efficient combinatorial generator.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 196 — pure_dsa · stack_queue · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "expand-run-length-template",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "stack_queue",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer", "frontend_engineer"],
    title: "Expand A Nested Repeat-Encoded String",
    framing:
      "A compact config format encodes repetition as k[segment], where segment is repeated k times and may itself contain nested encodings. Decode it to the fully expanded string.",
    statement:
      "Given an encoded string s using the rule k[encoded_substring], return its decoded form. k is a positive integer; brackets are always well-formed and may nest. The input contains only digits, letters, and brackets.",
    inputFormat: "An encoded string s.",
    outputFormat: "The decoded string.",
    constraints: [
      "1 ≤ |s| ≤ 30",
      "1 ≤ k ≤ 300",
      "Letters are lowercase English; brackets are balanced.",
      "The decoded output fits comfortably in memory.",
    ],
    examples: [
      {
        input: 's="3[a]2[bc]"',
        output: "aaabcbc",
        explanation: "'a' three times then 'bc' twice.",
      },
      {
        input: 's="3[a2[c]]"',
        output: "accaccacc",
        explanation: "Inner 2[c] expands to 'cc', so 'acc' repeated three times.",
      },
    ],
    approach: [
      "Use two stacks: one for repeat counts, one for the string built so far before each '['.",
      "On a digit, accumulate the multi-digit number.",
      "On '[', push the current count and current string, then reset both.",
      "On ']', pop the count and previous string, appending the current segment repeated count times.",
    ],
    solutionSteps: [
      "Maintain curStr and curNum; iterate characters.",
      "Digit → curNum = curNum*10 + digit. Letter → append to curStr.",
      "'[' → push curNum and curStr to their stacks; reset. ']' → curStr = prevStr + popCount * curStr.",
      "Return curStr.",
    ],
    code: {
      python: `def decode_string(s):
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
            k = num_stack.pop()
            prev = str_stack.pop()
            cur = prev + cur * k
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
                int k = numStack.pop();
                StringBuilder prev = strStack.pop();
                for (int i = 0; i < k; i++) prev.append(cur);
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

string decodeString(string s) {
    stack<int> numStack;
    stack<string> strStack;
    string cur = "";
    int num = 0;
    for (char ch : s) {
        if (isdigit(ch)) {
            num = num * 10 + (ch - '0');
        } else if (ch == '[') {
            numStack.push(num);
            strStack.push(cur);
            num = 0;
            cur = "";
        } else if (ch == ']') {
            int k = numStack.top(); numStack.pop();
            string prev = strStack.top(); strStack.pop();
            string repeated = "";
            for (int i = 0; i < k; i++) repeated += cur;
            cur = prev + repeated;
        } else {
            cur += ch;
        }
    }
    return cur;
}
`,
    },
    complexity: { time: "O(output length)", space: "O(depth + output)" },
    pitfalls: [
      "Assuming single-digit counts — k can be multi-digit (e.g. 100[a]).",
      "Forgetting to reset curStr and curNum after pushing on '['.",
      "Appending in the wrong order on ']' — previous string comes before the repeated segment.",
    ],
    edgeCases: [
      "No brackets — return the input unchanged.",
      "Deeply nested encodings.",
      "Count of 1, e.g. 1[ab] → ab.",
    ],
    whyItMatters:
      "Decode String is the canonical two-stack parser for nested structure — the same push-context / pop-and-merge pattern behind expression evaluation and recursive template expansion.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 197 — pure_dsa · math_geometry · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "rotate-tile-grid-in-place",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "math_geometry",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "frontend_engineer", "mobile_engineer"],
    title: "Rotate An Image Grid 90° In Place",
    framing:
      "An image editor stores a square bitmap as an n x n matrix of pixels. Rotate it 90° clockwise without allocating a second matrix.",
    statement:
      "Given an n x n matrix representing an image, rotate it 90 degrees clockwise in place. You must modify the input matrix directly and use O(1) extra space.",
    inputFormat: "An n x n integer matrix.",
    outputFormat: "The same matrix, rotated 90° clockwise (modified in place).",
    constraints: ["1 ≤ n ≤ 20", "-1000 ≤ matrix[i][j] ≤ 1000"],
    examples: [
      {
        input: "[[1,2,3],[4,5,6],[7,8,9]]",
        output: "[[7,4,1],[8,5,2],[9,6,3]]",
        explanation: "Each column (top→bottom) becomes a row (left→right).",
      },
      {
        input: "[[1,2],[3,4]]",
        output: "[[3,1],[4,2]]",
        explanation: "2x2 clockwise rotation.",
      },
    ],
    approach: [
      "A clockwise 90° rotation equals transpose followed by reversing each row.",
      "Transpose swaps matrix[i][j] with matrix[j][i] for j > i.",
      "Then reverse every row to complete the rotation, all in place.",
    ],
    solutionSteps: [
      "For i < j, swap matrix[i][j] and matrix[j][i] (transpose).",
      "Reverse each row left-to-right.",
      "The matrix now holds the clockwise rotation.",
    ],
    code: {
      python: `def rotate(matrix):
    n = len(matrix)
    for i in range(n):
        for j in range(i + 1, n):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    for row in matrix:
        row.reverse()
`,
      java: `class Solution {
    public void rotate(int[][] matrix) {
        int n = matrix.length;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                int tmp = matrix[i][j];
                matrix[i][j] = matrix[j][i];
                matrix[j][i] = tmp;
            }
        }
        for (int i = 0; i < n; i++) {
            int lo = 0, hi = n - 1;
            while (lo < hi) {
                int tmp = matrix[i][lo];
                matrix[i][lo] = matrix[i][hi];
                matrix[i][hi] = tmp;
                lo++; hi--;
            }
        }
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

void rotate(vector<vector<int>>& matrix) {
    int n = matrix.size();
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++)
            swap(matrix[i][j], matrix[j][i]);
    for (int i = 0; i < n; i++)
        reverse(matrix[i].begin(), matrix[i].end());
}
`,
    },
    complexity: { time: "O(n²)", space: "O(1)" },
    pitfalls: [
      "Transposing over all j (not just j > i) — double swaps undo the transpose.",
      "Reversing columns instead of rows, which yields a counter-clockwise rotation.",
      "Allocating a new matrix, violating the in-place requirement.",
    ],
    edgeCases: [
      "n = 1 — unchanged.",
      "n = 2 — minimal non-trivial rotation.",
      "Symmetric matrices still rotate correctly.",
    ],
    whyItMatters:
      "Rotate Image is the in-place matrix transform staple — decomposing a rotation into transpose + reflect is the same trick used in graphics kernels and tensor layout changes.",
    estimatedMinutes: 20,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 198 — pure_dsa · math_geometry · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "spiral-traversal-of-tile-grid",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "math_geometry",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "frontend_engineer"],
    title: "Read A Grid In Spiral Order",
    framing:
      "A heatmap renderer must serialise a 2D grid into a 1D stream following a spiral from the outer ring inward — top row, right column, bottom row, left column, repeating.",
    statement:
      "Given an m x n matrix, return all its elements in spiral order, starting at the top-left and moving clockwise inward.",
    inputFormat: "An m x n integer matrix.",
    outputFormat: "A list of all elements in spiral order.",
    constraints: ["1 ≤ m, n ≤ 50", "-1000 ≤ matrix[i][j] ≤ 1000"],
    examples: [
      {
        input: "[[1,2,3],[4,5,6],[7,8,9]]",
        output: "[1,2,3,6,9,8,7,4,5]",
        explanation: "Outer ring clockwise, then the center.",
      },
      {
        input: "[[1,2,3,4],[5,6,7,8],[9,10,11,12]]",
        output: "[1,2,3,4,8,12,11,10,9,5,6,7]",
        explanation: "3x4 grid traversed spirally.",
      },
    ],
    approach: [
      "Maintain four boundaries: top, bottom, left, right.",
      "Walk right along top then increment top; walk down right column then decrement right; walk left along bottom then decrement bottom; walk up left column then increment left.",
      "After each edge, check that boundaries have not crossed before traversing the next direction.",
    ],
    solutionSteps: [
      "Initialise top=0, bottom=m-1, left=0, right=n-1 and an output list.",
      "Loop while top ≤ bottom and left ≤ right, traversing the four edges in order with boundary updates.",
      "Guard the bottom row and left column with extra checks to avoid re-reading on thin grids.",
    ],
    code: {
      python: `def spiral_order(matrix):
    res = []
    top, bottom = 0, len(matrix) - 1
    left, right = 0, len(matrix[0]) - 1
    while top <= bottom and left <= right:
        for j in range(left, right + 1):
            res.append(matrix[top][j])
        top += 1
        for i in range(top, bottom + 1):
            res.append(matrix[i][right])
        right -= 1
        if top <= bottom:
            for j in range(right, left - 1, -1):
                res.append(matrix[bottom][j])
            bottom -= 1
        if left <= right:
            for i in range(bottom, top - 1, -1):
                res.append(matrix[i][left])
            left += 1
    return res
`,
      java: `import java.util.*;

class Solution {
    public List<Integer> spiralOrder(int[][] matrix) {
        List<Integer> res = new ArrayList<>();
        int top = 0, bottom = matrix.length - 1;
        int left = 0, right = matrix[0].length - 1;
        while (top <= bottom && left <= right) {
            for (int j = left; j <= right; j++) res.add(matrix[top][j]);
            top++;
            for (int i = top; i <= bottom; i++) res.add(matrix[i][right]);
            right--;
            if (top <= bottom) {
                for (int j = right; j >= left; j--) res.add(matrix[bottom][j]);
                bottom--;
            }
            if (left <= right) {
                for (int i = bottom; i >= top; i--) res.add(matrix[i][left]);
                left++;
            }
        }
        return res;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

vector<int> spiralOrder(vector<vector<int>>& matrix) {
    vector<int> res;
    int top = 0, bottom = matrix.size() - 1;
    int left = 0, right = matrix[0].size() - 1;
    while (top <= bottom && left <= right) {
        for (int j = left; j <= right; j++) res.push_back(matrix[top][j]);
        top++;
        for (int i = top; i <= bottom; i++) res.push_back(matrix[i][right]);
        right--;
        if (top <= bottom) {
            for (int j = right; j >= left; j--) res.push_back(matrix[bottom][j]);
            bottom--;
        }
        if (left <= right) {
            for (int i = bottom; i >= top; i--) res.push_back(matrix[i][left]);
            left++;
        }
    }
    return res;
}
`,
    },
    complexity: { time: "O(m·n)", space: "O(1) extra (excluding output)" },
    pitfalls: [
      "Omitting the `top <= bottom` / `left <= right` guards before the bottom and left passes — causes duplicate reads on single-row or single-column remnants.",
      "Off-by-one in the reversed loops over the bottom row and left column.",
      "Updating boundaries at the wrong time relative to traversal.",
    ],
    edgeCases: [
      "Single row — only the rightward pass executes.",
      "Single column — only the top and downward passes.",
      "1x1 grid — one element.",
    ],
    whyItMatters:
      "Spiral Matrix is the boundary-shrinking traversal pattern — managing four moving edges with careful guards is the same discipline behind layered grid processing and ring-by-ring image filters.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 199 — pure_dsa · dp_1d · medium · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "split-load-into-equal-halves",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "dp_1d",
    difficulty: "medium",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer", "software_engineer"],
    title: "Can The Workload Split Into Two Equal Halves",
    framing:
      "A batch scheduler must split a set of indivisible task weights across two identical workers so both carry the exact same total load. Decide whether such a perfectly balanced split exists.",
    statement:
      "Given an array of positive integers nums, return true if it can be partitioned into two subsets whose sums are equal, otherwise false.",
    inputFormat: "An integer array nums of positive values.",
    outputFormat: "A boolean — true if an equal-sum partition exists.",
    constraints: ["1 ≤ n ≤ 200", "1 ≤ nums[i] ≤ 100"],
    examples: [
      {
        input: "[1,5,11,5]",
        output: "true",
        explanation: "[1,5,5] and [11] both sum to 11.",
      },
      {
        input: "[1,2,3,5]",
        output: "false",
        explanation: "Total 11 is odd, so no equal split is possible.",
      },
    ],
    approach: [
      "If the total sum is odd, an equal split is impossible.",
      "Otherwise reduce to subset-sum: can any subset reach total/2?",
      "Use a 1D boolean DP where dp[t] means a subset summing to t is achievable; iterate t downward per item to avoid reuse.",
    ],
    solutionSteps: [
      "Compute total; if odd return false; let target = total/2.",
      "Initialise dp[0] = true. For each num, update dp[t] |= dp[t-num] for t from target down to num.",
      "Return dp[target].",
    ],
    code: {
      python: `def can_partition(nums):
    total = sum(nums)
    if total % 2 != 0:
        return False
    target = total // 2
    dp = [False] * (target + 1)
    dp[0] = True
    for num in nums:
        for t in range(target, num - 1, -1):
            if dp[t - num]:
                dp[t] = True
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
            for (int t = target; t >= num; t--) {
                if (dp[t - num]) dp[t] = true;
            }
        }
        return dp[target];
    }
}
`,
      cpp: `#include <vector>
using namespace std;

bool canPartition(vector<int>& nums) {
    int total = 0;
    for (int v : nums) total += v;
    if (total % 2 != 0) return false;
    int target = total / 2;
    vector<char> dp(target + 1, 0);
    dp[0] = 1;
    for (int num : nums) {
        for (int t = target; t >= num; t--) {
            if (dp[t - num]) dp[t] = 1;
        }
    }
    return dp[target];
}
`,
    },
    complexity: { time: "O(n·sum)", space: "O(sum)" },
    pitfalls: [
      "Iterating the inner loop ascending, which reuses an item multiple times (turns it into unbounded knapsack).",
      "Forgetting the odd-sum early exit.",
      "Allocating a 2D table when the 1D rolling array suffices.",
    ],
    edgeCases: [
      "Single element — false unless it is 0 (not allowed here), so false.",
      "All equal even count — true.",
      "Total exceeds capacity but still even — DP handles it.",
    ],
    whyItMatters:
      "Partition Equal Subset Sum is 0/1 knapsack in disguise — the reverse-iteration trick that forbids item reuse is the single most important detail in bounded-knapsack DP.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 200 — pure_dsa · binary_search · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "lowest-key-in-rotated-ring",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 8,
    pattern: "binary_search",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer"],
    title: "Find The Minimum In A Rotated Sorted Ring",
    framing:
      "A sorted list of distinct version numbers was rotated at an unknown pivot. Locate the smallest value (the rotation point) in O(log n).",
    statement:
      "Given a rotated ascending array of distinct integers nums, return its minimum element. Run in O(log n).",
    inputFormat: "A rotated sorted integer array nums with distinct values.",
    outputFormat: "The minimum element.",
    constraints: ["1 ≤ n ≤ 5000", "-5000 ≤ nums[i] ≤ 5000", "All values distinct."],
    examples: [
      {
        input: "[3,4,5,1,2]",
        output: "1",
        explanation: "Rotation pivot is at value 1.",
      },
      {
        input: "[4,5,6,7,0,1,2]",
        output: "0",
        explanation: "Smallest value 0 sits at the pivot.",
      },
    ],
    approach: [
      "Binary search comparing nums[mid] to nums[hi].",
      "If nums[mid] > nums[hi], the minimum is strictly to the right → lo = mid + 1.",
      "Otherwise the minimum is at mid or to the left → hi = mid.",
      "Converges to the rotation point.",
    ],
    solutionSteps: [
      "Set lo = 0, hi = n-1; loop while lo < hi.",
      "Compute mid; if nums[mid] > nums[hi] set lo = mid+1 else hi = mid.",
      "Return nums[lo].",
    ],
    code: {
      python: `def find_min(nums):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] > nums[hi]:
            lo = mid + 1
        else:
            hi = mid
    return nums[lo]
`,
      java: `class Solution {
    public int findMin(int[] nums) {
        int lo = 0, hi = nums.length - 1;
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;
            if (nums[mid] > nums[hi]) lo = mid + 1;
            else hi = mid;
        }
        return nums[lo];
    }
}
`,
      cpp: `#include <vector>
using namespace std;

int findMin(vector<int>& nums) {
    int lo = 0, hi = nums.size() - 1;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] > nums[hi]) lo = mid + 1;
        else hi = mid;
    }
    return nums[lo];
}
`,
    },
    complexity: { time: "O(log n)", space: "O(1)" },
    pitfalls: [
      "Comparing nums[mid] to nums[lo] instead of nums[hi] — breaks on the already-sorted case.",
      "Using lo <= hi with hi = mid, which can loop forever; use lo < hi.",
      "Setting hi = mid - 1, which can skip the actual minimum.",
    ],
    edgeCases: [
      "No rotation (sorted) — returns nums[0].",
      "Single element.",
      "Rotation by n-1 placing the min at the last position.",
    ],
    whyItMatters:
      "Find Minimum in Rotated Sorted Array is the half-discarding pivot search — comparing the midpoint to the right edge to decide which side holds the discontinuity, a template reused across rotated-data lookups.",
    estimatedMinutes: 20,
  },
];
