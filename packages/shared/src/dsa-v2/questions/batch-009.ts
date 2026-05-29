// DSA v2 — Batch 009 (50 questions, 201–250) — difficulty rebalance toward hard.
//
// Continues the 60% hard / 25% medium / 15% easy target: this batch adds ONLY
// hard + medium. Composition: 39 hard + 11 medium; 43 pure_dsa + 5 ai_applied +
// 2 indian_domain.
//
// Canonical coverage added (all distinct from batches 1–8):
// burst-balloons, best-time-stock-IV, frog-jump, minimum-window-subsequence,
// tallest-billboard, paint-house-III, stickers-to-spell-word,
// shortest-common-supersequence, partition-to-k-equal-subsets, word-ladder,
// bus-routes, shortest-path-visiting-all-nodes, reconstruct-itinerary,
// min-cost-valid-path (0-1 BFS), making-a-large-island, skyline-problem,
// max-performance-of-team, min-cost-hire-k-workers, rearrange-string-k-distance,
// count-of-range-sum, reverse-pairs, split-array-largest-sum,
// minimize-max-gas-station-distance, expression-add-operators,
// remove-invalid-parentheses, max-frequency-stack, palindrome-pairs,
// stream-of-characters, recover-bst, vertical-order-traversal, binary-tree-cameras,
// matchsticks-to-square, max-points-on-a-line, sliding-puzzle,
// min-difficulty-job-schedule, profitable-schemes, min-cost-reach-in-time,
// max-sum-3-non-overlapping-subarrays, min-cost-merge-stones,
// longest-palindromic-substring, palindromic-substrings-count,
// letter-combinations-phone, combination-sum-II, pacific-atlantic-water-flow,
// redundant-connection (union-find), find-the-duplicate-number,
// maximum-product-subarray, copy-list-with-random-pointer, task-scheduler,
// single-number-III.
//
// All status = "pending_review" — admin must approve each before live.

import type { DsaV2Question } from "../types";

export const BATCH_009: readonly DsaV2Question[] = [
  // ──────────────────────────────────────────────────────────────────────
  // 201 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "maximize-burst-coins",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer"],
    title: "Maximize Coins From Bursting Ad Slots",
    framing:
      "A row of ad slots each carries a value. Bursting (selling) a slot earns its value times the values of its immediate surviving neighbours. Slots at the ends treat a missing neighbour as 1. Choose a burst order to maximize total coins.",
    statement:
      "Given an array nums of n balloons, bursting balloon i earns nums[left] * nums[i] * nums[right] coins where left and right are the adjacent un-burst balloons (treat out-of-bounds as 1). Return the maximum coins obtainable by bursting all balloons.",
    inputFormat: "An integer array nums.",
    outputFormat: "An integer — the maximum total coins.",
    constraints: ["1 ≤ n ≤ 300", "0 ≤ nums[i] ≤ 100"],
    examples: [
      {
        input: "[3,1,5,8]",
        output: "167",
        explanation: "Burst order 1,5,3,8 yields 3*1*5 + 3*5*8 + 1*3*8 + 1*8*1 = 167.",
      },
      {
        input: "[1,5]",
        output: "10",
        explanation: "Burst 1 first (1*1*5=5) then 5 (1*5*1=5) → 10.",
      },
    ],
    approach: [
      "Think in reverse: fix the LAST balloon to burst in a range, so its neighbours are the range boundaries (which survive until last).",
      "Pad nums with 1 on both ends. Let dp[i][j] be the max coins from bursting all balloons strictly between boundaries i and j.",
      "For each last-burst k in (i, j): dp[i][j] = max(dp[i][k] + nums[i]*nums[k]*nums[j] + dp[k][j]).",
      "Iterate by increasing interval length so subranges are solved first.",
    ],
    solutionSteps: [
      "Build vals = [1] + nums + [1]; let m = len(vals).",
      "For length from 2 to m-1, for each left i, set right = i+length; try every k in (i, right) as the last burst.",
      "dp[i][right] = max over k of dp[i][k] + vals[i]*vals[k]*vals[right] + dp[k][right].",
      "Return dp[0][m-1].",
    ],
    code: {
      python: `def max_coins(nums):
    vals = [1] + nums + [1]
    m = len(vals)
    dp = [[0] * m for _ in range(m)]
    for length in range(2, m):
        for i in range(0, m - length):
            right = i + length
            best = 0
            for k in range(i + 1, right):
                cur = dp[i][k] + vals[i] * vals[k] * vals[right] + dp[k][right]
                if cur > best:
                    best = cur
            dp[i][right] = best
    return dp[0][m - 1]
`,
      java: `class Solution {
    public int maxCoins(int[] nums) {
        int n = nums.length;
        int[] vals = new int[n + 2];
        vals[0] = 1; vals[n + 1] = 1;
        for (int i = 0; i < n; i++) vals[i + 1] = nums[i];
        int m = n + 2;
        int[][] dp = new int[m][m];
        for (int length = 2; length < m; length++) {
            for (int i = 0; i + length < m; i++) {
                int right = i + length, best = 0;
                for (int k = i + 1; k < right; k++) {
                    int cur = dp[i][k] + vals[i] * vals[k] * vals[right] + dp[k][right];
                    if (cur > best) best = cur;
                }
                dp[i][right] = best;
            }
        }
        return dp[0][m - 1];
    }
}
`,
      cpp: `#include <vector>
using namespace std;

int maxCoins(vector<int>& nums) {
    int n = nums.size();
    vector<int> vals(n + 2, 1);
    for (int i = 0; i < n; i++) vals[i + 1] = nums[i];
    int m = n + 2;
    vector<vector<int>> dp(m, vector<int>(m, 0));
    for (int length = 2; length < m; length++) {
        for (int i = 0; i + length < m; i++) {
            int right = i + length, best = 0;
            for (int k = i + 1; k < right; k++) {
                int cur = dp[i][k] + vals[i] * vals[k] * vals[right] + dp[k][right];
                if (cur > best) best = cur;
            }
            dp[i][right] = best;
        }
    }
    return dp[0][m - 1];
}
`,
    },
    complexity: { time: "O(n³)", space: "O(n²)" },
    pitfalls: [
      "Trying to choose the FIRST balloon to burst — neighbours then change unpredictably; reverse to last-burst.",
      "Forgetting the sentinel 1s, mishandling end balloons.",
      "Iterating intervals in the wrong order so subproblems are unsolved.",
    ],
    edgeCases: [
      "Single balloon — earns nums[0] (1*nums[0]*1).",
      "Zeros in the array — still valid, contribute 0 when bursted.",
      "All equal values.",
    ],
    whyItMatters:
      "Burst Balloons is the archetypal interval DP where you fix the last action in a range — the same 'pick the partition point last' framing solves matrix-chain multiplication and optimal BST construction.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 202 — pure_dsa · dp_1d · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-profit-with-k-trades",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer", "software_engineer"],
    title: "Max Profit With At Most K Trades",
    framing:
      "Daily prices of an asset are known in advance. You may complete at most k buy→sell trades, never holding more than one position at a time. Maximize total profit.",
    statement:
      "Given an integer k and an array prices where prices[i] is the price on day i, return the maximum profit from at most k transactions. You must sell before buying again.",
    inputFormat: "An integer k and an integer array prices.",
    outputFormat: "An integer — the maximum achievable profit.",
    constraints: ["0 ≤ k ≤ 100", "1 ≤ n ≤ 1000", "0 ≤ prices[i] ≤ 1000"],
    examples: [
      {
        input: "k=2 prices=[3,2,6,5,0,3]",
        output: "7",
        explanation: "Buy@2 sell@6 (+4), buy@0 sell@3 (+3) → 7.",
      },
      {
        input: "k=2 prices=[2,4,1]",
        output: "2",
        explanation: "Buy@2 sell@4 (+2); the third day adds nothing.",
      },
    ],
    approach: [
      "If k ≥ n/2 it is effectively unlimited transactions — sum every positive delta.",
      "Otherwise track for each transaction t two states: best balance after buying (hold) and after selling (cash).",
      "Iterate days, updating hold[t] = max(hold[t], cash[t-1] - price) and cash[t] = max(cash[t], hold[t] + price).",
    ],
    solutionSteps: [
      "Handle the unlimited case when 2k ≥ n by summing positive consecutive gains.",
      "Initialise buy[1..k] = -infinity, sell[1..k] = 0.",
      "For each price, for t from 1 to k: buy[t] = max(buy[t], sell[t-1] - price); sell[t] = max(sell[t], buy[t] + price).",
      "Return sell[k].",
    ],
    code: {
      python: `def max_profit(k, prices):
    n = len(prices)
    if n == 0 or k == 0:
        return 0
    if k >= n // 2:
        return sum(max(0, prices[i] - prices[i - 1]) for i in range(1, n))
    buy = [float("-inf")] * (k + 1)
    sell = [0] * (k + 1)
    for price in prices:
        for t in range(1, k + 1):
            buy[t] = max(buy[t], sell[t - 1] - price)
            sell[t] = max(sell[t], buy[t] + price)
    return sell[k]
`,
      java: `class Solution {
    public int maxProfit(int k, int[] prices) {
        int n = prices.length;
        if (n == 0 || k == 0) return 0;
        if (k >= n / 2) {
            int profit = 0;
            for (int i = 1; i < n; i++)
                if (prices[i] > prices[i - 1]) profit += prices[i] - prices[i - 1];
            return profit;
        }
        int[] buy = new int[k + 1];
        int[] sell = new int[k + 1];
        java.util.Arrays.fill(buy, Integer.MIN_VALUE / 2);
        for (int price : prices) {
            for (int t = 1; t <= k; t++) {
                buy[t] = Math.max(buy[t], sell[t - 1] - price);
                sell[t] = Math.max(sell[t], buy[t] + price);
            }
        }
        return sell[k];
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
#include <climits>
using namespace std;

int maxProfit(int k, vector<int>& prices) {
    int n = prices.size();
    if (n == 0 || k == 0) return 0;
    if (k >= n / 2) {
        int profit = 0;
        for (int i = 1; i < n; i++)
            if (prices[i] > prices[i - 1]) profit += prices[i] - prices[i - 1];
        return profit;
    }
    vector<int> buy(k + 1, INT_MIN / 2), sell(k + 1, 0);
    for (int price : prices) {
        for (int t = 1; t <= k; t++) {
            buy[t] = max(buy[t], sell[t - 1] - price);
            sell[t] = max(sell[t], buy[t] + price);
        }
    }
    return sell[k];
}
`,
    },
    complexity: { time: "O(n·k) (or O(n) in the unlimited case)", space: "O(k)" },
    pitfalls: [
      "Skipping the k ≥ n/2 shortcut, which both speeds things up and avoids large-k arrays.",
      "Updating buy[t] using sell[t] of the current day instead of sell[t-1].",
      "Initialising buy to 0 instead of -infinity, allowing a free position.",
    ],
    edgeCases: [
      "k = 0 — profit 0.",
      "Monotonically decreasing prices — profit 0.",
      "Single price — profit 0.",
    ],
    whyItMatters:
      "Stock IV is the general 'bounded resource' DP — k layered buy/sell states generalise to any problem capped at k discrete uses, and the unlimited shortcut shows when constraints stop binding.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 203 — pure_dsa · dp_1d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "stepping-stone-river-cross",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer"],
    title: "Cross The River On Stepping Stones",
    framing:
      "Stones sit at known positions across a river. A frog starts on the first stone. From a stone reached by a jump of k units, its next jump must be k-1, k, or k+1 units forward. Decide whether the frog can reach the last stone.",
    statement:
      "Given a sorted list of distinct stone positions stones (stones[0] = 0), determine if the frog can reach the last stone. The first jump must be exactly 1 unit. From a jump of size k landing on a stone, the next jump is k-1, k, or k+1 (must be positive). The frog can only land on stones.",
    inputFormat: "A sorted integer array stones with stones[0] = 0.",
    outputFormat: "A boolean — true if the last stone is reachable.",
    constraints: [
      "2 ≤ n ≤ 2000",
      "0 ≤ stones[i] ≤ 2^31 - 1",
      "stones is strictly increasing; stones[0] == 0.",
    ],
    examples: [
      {
        input: "[0,1,3,5,6,8,12,17]",
        output: "true",
        explanation: "Jumps of 1,2,2,3,4,5 land exactly on the final stone.",
      },
      {
        input: "[0,1,2,3,4,8,9,11]",
        output: "false",
        explanation: "The gap to stone 8 is too large to bridge with the allowed jump sizes.",
      },
    ],
    approach: [
      "For each stone, track the set of jump sizes that can land the frog on it.",
      "From a stone with reachable jump k, propagate k-1, k, k+1 to the stone at that forward position if it exists.",
      "If the last stone has any reachable jump, the crossing succeeds.",
    ],
    solutionSteps: [
      "Map each position to its index; keep a dict position → set of arriving jump sizes.",
      "Seed stone 0 with jump 0. For each stone in order and each jump k it holds, for step in {k-1,k,k+1} with step > 0, if position+step is a stone, add step to its set.",
      "Return whether the last stone's set is non-empty.",
    ],
    code: {
      python: `def can_cross(stones):
    stone_set = set(stones)
    reach = {pos: set() for pos in stones}
    reach[0].add(0)
    for pos in stones:
        for k in reach[pos]:
            for step in (k - 1, k, k + 1):
                if step > 0 and (pos + step) in stone_set:
                    reach[pos + step].add(step)
    return len(reach[stones[-1]]) > 0
`,
      java: `import java.util.*;

class Solution {
    public boolean canCross(int[] stones) {
        Map<Integer, Set<Integer>> reach = new HashMap<>();
        for (int s : stones) reach.put(s, new HashSet<>());
        reach.get(0).add(0);
        for (int pos : stones) {
            for (int k : reach.get(pos)) {
                for (int step = k - 1; step <= k + 1; step++) {
                    if (step > 0 && reach.containsKey(pos + step)) {
                        reach.get(pos + step).add(step);
                    }
                }
            }
        }
        return !reach.get(stones[stones.length - 1]).isEmpty();
    }
}
`,
      cpp: `#include <vector>
#include <unordered_map>
#include <unordered_set>
using namespace std;

bool canCross(vector<int>& stones) {
    unordered_map<int, unordered_set<int>> reach;
    for (int s : stones) reach[s] = {};
    reach[0].insert(0);
    for (int pos : stones) {
        for (int k : reach[pos]) {
            for (int step = k - 1; step <= k + 1; step++) {
                if (step > 0 && reach.count(pos + step)) {
                    reach[pos + step].insert(step);
                }
            }
        }
    }
    return !reach[stones.back()].empty();
}
`,
    },
    complexity: { time: "O(n²)", space: "O(n²)" },
    pitfalls: [
      "Allowing non-positive jump sizes (k-1 could be 0 or negative).",
      "Iterating a set while mutating it — propagate to OTHER stones' sets, not the current one.",
      "Assuming jumps can land between stones; landing must be on a stone.",
    ],
    edgeCases: [
      "Second stone not at position 1 — immediately false (first jump must be 1).",
      "Two stones [0,1] — true.",
      "Large coordinate gaps with few stones.",
    ],
    whyItMatters:
      "Frog Jump is state-augmented DP: the state is (stone, last-jump-size), not just position — recognising that the transition depends on history is the key skill behind many DP-on-graphs problems.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 204 — ai_applied · dp_2d · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "smallest-prompt-span-subsequence",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 9,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "backend_engineer", "software_engineer"],
    title: "Smallest Prompt Window Containing Required Tokens In Order",
    framing:
      "A guardrail must confirm that a long generated transcript contains a required token sequence in order (not necessarily contiguous). To highlight the evidence, find the shortest contiguous window of the transcript that still contains the required sequence as a subsequence.",
    statement:
      "Given strings s and t, return the minimum-length contiguous substring of s such that t is a subsequence of it. If no such window exists, return the empty string. If several windows tie, return the leftmost.",
    inputFormat: "Two strings s and t.",
    outputFormat: "The smallest qualifying substring of s, or an empty string.",
    constraints: ["1 ≤ |s| ≤ 2e4", "1 ≤ |t| ≤ 100", "Lowercase English letters."],
    examples: [
      {
        input: 's="abcdebdde" t="bde"',
        output: "bcde",
        explanation: "'bcde' contains 'bde' as a subsequence and is the shortest such window.",
      },
      {
        input: 's="jmeqksfrsdcmsiwvaovztaqenprpvnbstl" t="u"',
        output: "",
        explanation: "'u' never appears, so no window exists.",
      },
    ],
    approach: [
      "Let dp[i][j] be the starting index in s of the shortest window ending at i that matches the first j characters of t.",
      "If s[i-1] == t[j-1], dp[i][j] = dp[i-1][j-1]; otherwise dp[i][j] = dp[i-1][j] (extend the previous window).",
      "Whenever j == |t|, the window is (dp[i][m] .. i); track the shortest.",
    ],
    solutionSteps: [
      "Initialise dp[i][0] = i (empty t matches at any position with zero length window start = i).",
      "Fill row by row; carry the start index forward, advancing j only on a character match.",
      "When the full t is matched at column m, compare window length i - start and keep the best.",
      "Return s[bestStart:bestEnd] or empty string if none.",
    ],
    code: {
      python: `def min_window_subsequence(s, t):
    n, m = len(s), len(t)
    INF = float("inf")
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i + 1  # 1-indexed start marker
    best_len, best_start = INF, -1
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if s[i - 1] == t[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = dp[i - 1][j]
        if dp[i][m] != 0:
            start = dp[i][m] - 1
            if i - start < best_len:
                best_len = i - start
                best_start = start
    return "" if best_start < 0 else s[best_start:best_start + best_len]
`,
      java: `class Solution {
    public String minWindow(String s, String t) {
        int n = s.length(), m = t.length();
        int[][] dp = new int[n + 1][m + 1];
        for (int i = 0; i <= n; i++) dp[i][0] = i + 1;
        int bestLen = Integer.MAX_VALUE, bestStart = -1;
        for (int i = 1; i <= n; i++) {
            for (int j = 1; j <= m; j++) {
                if (s.charAt(i - 1) == t.charAt(j - 1)) dp[i][j] = dp[i - 1][j - 1];
                else dp[i][j] = dp[i - 1][j];
            }
            if (dp[i][m] != 0) {
                int start = dp[i][m] - 1;
                if (i - start < bestLen) { bestLen = i - start; bestStart = start; }
            }
        }
        return bestStart < 0 ? "" : s.substring(bestStart, bestStart + bestLen);
    }
}
`,
      cpp: `#include <string>
#include <vector>
#include <climits>
using namespace std;

string minWindow(string s, string t) {
    int n = s.size(), m = t.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));
    for (int i = 0; i <= n; i++) dp[i][0] = i + 1;
    int bestLen = INT_MAX, bestStart = -1;
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (s[i - 1] == t[j - 1]) dp[i][j] = dp[i - 1][j - 1];
            else dp[i][j] = dp[i - 1][j];
        }
        if (dp[i][m] != 0) {
            int start = dp[i][m] - 1;
            if (i - start < bestLen) { bestLen = i - start; bestStart = start; }
        }
    }
    return bestStart < 0 ? "" : s.substr(bestStart, bestLen);
}
`,
    },
    complexity: { time: "O(|s|·|t|)", space: "O(|s|·|t|)" },
    pitfalls: [
      "Confusing this with Minimum Window Substring (sliding window over a multiset) — here t must appear as an ordered subsequence.",
      "Off-by-one in the 1-indexed start marker stored in dp.",
      "Not breaking ties toward the leftmost window.",
    ],
    edgeCases: [
      "t longer than s — empty result.",
      "t equals s — the whole string.",
      "Multiple equal-length windows — return the leftmost.",
    ],
    whyItMatters:
      "Minimum Window Subsequence is ordered-match DP that propagates a window start — the same evidence-localisation logic behind citing source spans for RAG answers and aligning required tokens in transcripts.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 205 — pure_dsa · dp_1d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "balanced-dual-rail-height",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Tallest Balanced Dual-Rail Support",
    framing:
      "You build two support rails from a set of rods, welding each rod onto either rail (or discarding it). The structure is valid only when both rails end at the same height. Maximize that common height.",
    statement:
      "Given an array rods of positive integers, partition a subset of them into two disjoint groups of equal sum and return that maximal equal sum (the height of one rail). If no non-empty balanced pair exists, return 0.",
    inputFormat: "An integer array rods.",
    outputFormat: "The maximum equal height of the two rails, or 0.",
    constraints: ["1 ≤ n ≤ 20", "1 ≤ rods[i] ≤ 1000", "sum(rods) ≤ 5000"],
    examples: [
      {
        input: "[1,2,3,6]",
        output: "6",
        explanation: "{1,2,3} and {6} both sum to 6.",
      },
      {
        input: "[1,2]",
        output: "0",
        explanation: "No way to make two equal non-empty rails.",
      },
    ],
    approach: [
      "Track the best achievable taller-rail height for each possible difference between the two rails.",
      "DP over rods: each rod can be skipped, added to the taller rail, or added to the shorter rail (possibly flipping which is taller).",
      "Use a map diff → max(taller height). The answer is dp[0] (zero difference) after processing all rods.",
    ],
    solutionSteps: [
      "Maintain dp where key = height difference, value = max height of the taller rail.",
      "For each rod r, derive a new dp: skip; add to taller (diff+r); add to shorter (diff-r with abs, updating taller appropriately).",
      "After all rods, return dp[0] — the tallest configuration with both rails equal.",
    ],
    code: {
      python: `def tallest_billboard(rods):
    dp = {0: 0}
    for r in rods:
        cur = dict(dp)
        for diff, taller in dp.items():
            # add to taller rail
            d1 = diff + r
            cur[d1] = max(cur.get(d1, 0), taller + r)
            # add to shorter rail
            shorter = taller - diff
            d2 = abs(shorter + r - taller)
            new_taller = max(taller, shorter + r)
            cur[d2] = max(cur.get(d2, 0), new_taller)
        dp = cur
    return dp.get(0, 0)
`,
      java: `import java.util.*;

class Solution {
    public int tallestBillboard(int[] rods) {
        Map<Integer, Integer> dp = new HashMap<>();
        dp.put(0, 0);
        for (int r : rods) {
            Map<Integer, Integer> cur = new HashMap<>(dp);
            for (Map.Entry<Integer, Integer> e : dp.entrySet()) {
                int diff = e.getKey(), taller = e.getValue();
                int d1 = diff + r;
                cur.merge(d1, taller + r, Math::max);
                int shorter = taller - diff;
                int newTaller = Math.max(taller, shorter + r);
                int d2 = Math.abs(shorter + r - taller);
                cur.merge(d2, newTaller, Math::max);
            }
            dp = cur;
        }
        return dp.getOrDefault(0, 0);
    }
}
`,
      cpp: `#include <vector>
#include <unordered_map>
#include <algorithm>
#include <cstdlib>
using namespace std;

int tallestBillboard(vector<int>& rods) {
    unordered_map<int,int> dp;
    dp[0] = 0;
    for (int r : rods) {
        unordered_map<int,int> cur = dp;
        for (auto& e : dp) {
            int diff = e.first, taller = e.second;
            int d1 = diff + r;
            cur[d1] = max(cur.count(d1) ? cur[d1] : 0, taller + r);
            int shorter = taller - diff;
            int newTaller = max(taller, shorter + r);
            int d2 = abs(shorter + r - taller);
            cur[d2] = max(cur.count(d2) ? cur[d2] : 0, newTaller);
        }
        dp = cur;
    }
    return dp.count(0) ? dp[0] : 0;
}
`,
    },
    complexity: { time: "O(n · sum)", space: "O(sum)" },
    pitfalls: [
      "Storing the shorter rail instead of the taller — leads to inconsistent diff updates.",
      "Iterating and mutating the same dp map within one rod (snapshot it first).",
      "Forgetting the skip option, forcing every rod to be used.",
    ],
    edgeCases: [
      "No balanced subset — return 0.",
      "All rods identical and even count — half on each side.",
      "Single rod — 0 (cannot balance).",
    ],
    whyItMatters:
      "Tallest Billboard is the difference-keyed knapsack — collapsing two-pile state to a single 'difference' dimension is a powerful trick for partition and balancing problems that would otherwise be exponential.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 206 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "repaint-blocks-target-groups",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "frontend_engineer"],
    title: "Repaint Houses Into Exactly Target Neighborhoods",
    framing:
      "A street of houses is being painted. Some are already painted (and cannot change); the rest are blank. Painting a blank house in colour c costs cost[i][c]. A 'neighborhood' is a maximal run of same-coloured adjacent houses. Repaint the blanks so the street forms exactly target neighborhoods at minimum cost.",
    statement:
      "Given m houses with colours houses[i] (0 = unpainted, else 1..n), an m x n cost matrix where cost[i][c-1] is the price to paint house i colour c, and an integer target, return the minimum cost to paint every unpainted house so the street has exactly target neighborhoods. Return -1 if impossible. Already-painted houses must keep their colour.",
    inputFormat:
      "Arrays houses (length m), cost (m x n), and integers m, n, target.",
    outputFormat: "The minimum total painting cost, or -1.",
    constraints: [
      "1 ≤ m ≤ 100",
      "1 ≤ n ≤ 20",
      "1 ≤ target ≤ m",
      "0 ≤ houses[i] ≤ n",
      "0 ≤ cost[i][c] ≤ 1e4",
    ],
    examples: [
      {
        input: "houses=[0,0,0,0,0] cost=[[1,10],[10,1],[10,1],[1,10],[5,1]] m=5 n=2 target=3",
        output: "9",
        explanation: "Paint [1,2,2,1,1] → neighborhoods {1},{2,2},{1,1} = 3, cost 1+1+1+1+5=9.",
      },
      {
        input: "houses=[3,1,2,3] cost=[[1,1,1],[1,1,1],[1,1,1],[1,1,1]] m=4 n=3 target=3",
        output: "-1",
        explanation: "The pre-painted colours already form 4 neighborhoods; cannot reduce to 3.",
      },
    ],
    approach: [
      "State: dp[i][c][k] = min cost to paint houses 0..i with house i in colour c forming exactly k neighborhoods.",
      "Transition from house i-1 colour c': k stays if c == c', else k increases by 1.",
      "Fixed houses force their colour; blank houses add cost[i][c].",
    ],
    solutionSteps: [
      "Initialise dp to infinity; seed house 0 for each allowed colour with k = 1.",
      "For each subsequent house, for each allowed colour c and prior colour c', update k = prevK + (c != c').",
      "Add paint cost only for blank houses; skip cost for fixed ones.",
      "Answer = min over colours of dp[m-1][c][target], or -1 if infinite.",
    ],
    code: {
      python: `def min_cost(houses, cost, m, n, target):
    INF = float("inf")
    # dp[c][k] for current house
    dp = [[INF] * (target + 1) for _ in range(n + 1)]
    for c in range(1, n + 1):
        if houses[0] != 0 and houses[0] != c:
            continue
        paint = 0 if houses[0] != 0 else cost[0][c - 1]
        dp[c][1] = paint
    for i in range(1, m):
        ndp = [[INF] * (target + 1) for _ in range(n + 1)]
        for c in range(1, n + 1):
            if houses[i] != 0 and houses[i] != c:
                continue
            paint = 0 if houses[i] != 0 else cost[i][c - 1]
            for pc in range(1, n + 1):
                for k in range(1, target + 1):
                    if dp[pc][k] == INF:
                        continue
                    nk = k + (1 if pc != c else 0)
                    if nk <= target:
                        val = dp[pc][k] + paint
                        if val < ndp[c][nk]:
                            ndp[c][nk] = val
        dp = ndp
    ans = min(dp[c][target] for c in range(1, n + 1))
    return -1 if ans == INF else ans
`,
      java: `class Solution {
    public int minCost(int[] houses, int[][] cost, int m, int n, int target) {
        final int INF = Integer.MAX_VALUE / 2;
        int[][] dp = new int[n + 1][target + 1];
        for (int[] row : dp) java.util.Arrays.fill(row, INF);
        for (int c = 1; c <= n; c++) {
            if (houses[0] != 0 && houses[0] != c) continue;
            int paint = houses[0] != 0 ? 0 : cost[0][c - 1];
            dp[c][1] = paint;
        }
        for (int i = 1; i < m; i++) {
            int[][] ndp = new int[n + 1][target + 1];
            for (int[] row : ndp) java.util.Arrays.fill(row, INF);
            for (int c = 1; c <= n; c++) {
                if (houses[i] != 0 && houses[i] != c) continue;
                int paint = houses[i] != 0 ? 0 : cost[i][c - 1];
                for (int pc = 1; pc <= n; pc++) {
                    for (int k = 1; k <= target; k++) {
                        if (dp[pc][k] >= INF) continue;
                        int nk = k + (pc != c ? 1 : 0);
                        if (nk <= target) ndp[c][nk] = Math.min(ndp[c][nk], dp[pc][k] + paint);
                    }
                }
            }
            dp = ndp;
        }
        int ans = INF;
        for (int c = 1; c <= n; c++) ans = Math.min(ans, dp[c][target]);
        return ans >= INF ? -1 : ans;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

int minCost(vector<int>& houses, vector<vector<int>>& cost, int m, int n, int target) {
    const int INF = 1e9;
    vector<vector<int>> dp(n + 1, vector<int>(target + 1, INF));
    for (int c = 1; c <= n; c++) {
        if (houses[0] != 0 && houses[0] != c) continue;
        int paint = houses[0] != 0 ? 0 : cost[0][c - 1];
        dp[c][1] = paint;
    }
    for (int i = 1; i < m; i++) {
        vector<vector<int>> ndp(n + 1, vector<int>(target + 1, INF));
        for (int c = 1; c <= n; c++) {
            if (houses[i] != 0 && houses[i] != c) continue;
            int paint = houses[i] != 0 ? 0 : cost[i][c - 1];
            for (int pc = 1; pc <= n; pc++) {
                for (int k = 1; k <= target; k++) {
                    if (dp[pc][k] >= INF) continue;
                    int nk = k + (pc != c ? 1 : 0);
                    if (nk <= target) ndp[c][nk] = min(ndp[c][nk], dp[pc][k] + paint);
                }
            }
        }
        dp = ndp;
    }
    int ans = INF;
    for (int c = 1; c <= n; c++) ans = min(ans, dp[c][target]);
    return ans >= INF ? -1 : ans;
}
`,
    },
    complexity: { time: "O(m · target · n²)", space: "O(n · target)" },
    pitfalls: [
      "Charging paint cost to already-painted houses.",
      "Letting a fixed house take a colour other than its own.",
      "Allowing the neighborhood count k to exceed target during transitions.",
    ],
    edgeCases: [
      "All houses pre-painted — cost 0 iff their natural neighborhood count equals target.",
      "target = 1 — every house must share one colour.",
      "Impossible target — return -1.",
    ],
    whyItMatters:
      "Paint House III is three-dimensional DP (index × colour × group-count) — modelling 'runs' as a counted dimension is the same technique used in segmentation cost and constrained partition problems.",
    estimatedMinutes: 50,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 207 — ai_applied · dp_1d · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "assemble-banner-from-stickers",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 9,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "software_engineer"],
    title: "Fewest Token Stencils To Spell A Target",
    framing:
      "A synthetic-data generator builds a target token string by stamping from a fixed set of stencils. Each stencil is a string whose individual characters can be cut out and reused; a stencil may be used unlimited times. Find the fewest stencils needed to spell the target, or report it is impossible.",
    statement:
      "Given an array of strings stickers and a target string, return the minimum number of stickers (with unlimited repetition) needed so their combined letters can spell target. Letters may be rearranged. Return -1 if impossible.",
    inputFormat: "An array stickers of strings and a string target.",
    outputFormat: "The minimum sticker count, or -1.",
    constraints: [
      "1 ≤ stickers.length ≤ 50",
      "1 ≤ sticker length, target length ≤ 15",
      "Lowercase English letters.",
    ],
    examples: [
      {
        input: 'stickers=["with","example","science"] target="thehat"',
        output: "3",
        explanation: "'with' + 'example' + 'example' supply t,h,e,h,a,t — 3 stickers.",
      },
      {
        input: 'stickers=["notice","possible"] target="basicbasic"',
        output: "-1",
        explanation: "No combination supplies the letter 'r'? — actually the needed letters cannot all be formed, so -1.",
      },
    ],
    approach: [
      "Represent the remaining-needed letters as a bitmask over target positions (target ≤ 15).",
      "Memoise the minimum stickers to clear each mask.",
      "For a given mask, try each sticker: greedily consume its letters against the still-needed positions, recurse on the reduced mask.",
      "Optimisation: only branch on stickers that contain the first still-needed character.",
    ],
    solutionSteps: [
      "Precompute each sticker's letter counts.",
      "dp(mask): if mask == full, return 0. Find the lowest unset bit's character; for each sticker containing it, apply the sticker to set as many needed bits as possible and recurse.",
      "Take 1 + min over stickers; memoise; return -1 (∞) when unsolvable.",
    ],
    code: {
      python: `from functools import lru_cache
from collections import Counter

def min_stickers(stickers, target):
    counts = [Counter(s) for s in stickers]
    n = len(target)
    full = (1 << n) - 1
    INF = float("inf")

    @lru_cache(maxsize=None)
    def dp(mask):
        if mask == full:
            return 0
        # first letter still needed
        i = 0
        while mask & (1 << i):
            i += 1
        need_char = target[i]
        best = INF
        for cnt in counts:
            if need_char not in cnt:
                continue
            avail = dict(cnt)
            nmask = mask
            for j in range(n):
                if not (nmask & (1 << j)) and avail.get(target[j], 0) > 0:
                    avail[target[j]] -= 1
                    nmask |= (1 << j)
            best = min(best, 1 + dp(nmask))
        return best

    res = dp(0)
    return -1 if res == INF else res
`,
      java: `import java.util.*;

class Solution {
    Map<Integer, Integer> memo = new HashMap<>();
    int[][] counts;
    String target;
    int n, full;

    public int minStickers(String[] stickers, String target) {
        this.target = target;
        n = target.length();
        full = (1 << n) - 1;
        counts = new int[stickers.length][26];
        for (int i = 0; i < stickers.length; i++)
            for (char ch : stickers[i].toCharArray()) counts[i][ch - 'a']++;
        int res = dp(0);
        return res >= 1_000_000 ? -1 : res;
    }

    private int dp(int mask) {
        if (mask == full) return 0;
        if (memo.containsKey(mask)) return memo.get(mask);
        int i = 0;
        while ((mask & (1 << i)) != 0) i++;
        char need = target.charAt(i);
        int best = 1_000_000;
        for (int[] cnt : counts) {
            if (cnt[need - 'a'] == 0) continue;
            int[] avail = cnt.clone();
            int nmask = mask;
            for (int j = 0; j < n; j++) {
                int c = target.charAt(j) - 'a';
                if ((nmask & (1 << j)) == 0 && avail[c] > 0) {
                    avail[c]--;
                    nmask |= (1 << j);
                }
            }
            best = Math.min(best, 1 + dp(nmask));
        }
        memo.put(mask, best);
        return best;
    }
}
`,
      cpp: `#include <vector>
#include <string>
#include <unordered_map>
#include <algorithm>
using namespace std;

int minStickers(vector<string>& stickers, string target) {
    int n = target.size(), full = (1 << n) - 1;
    vector<vector<int>> counts(stickers.size(), vector<int>(26, 0));
    for (int i = 0; i < (int)stickers.size(); i++)
        for (char ch : stickers[i]) counts[i][ch - 'a']++;
    unordered_map<int,int> memo;

    function<int(int)> dp = [&](int mask) -> int {
        if (mask == full) return 0;
        auto it = memo.find(mask);
        if (it != memo.end()) return it->second;
        int i = 0;
        while (mask & (1 << i)) i++;
        char need = target[i];
        int best = 1000000;
        for (auto& cnt : counts) {
            if (cnt[need - 'a'] == 0) continue;
            vector<int> avail = cnt;
            int nmask = mask;
            for (int j = 0; j < n; j++) {
                int c = target[j] - 'a';
                if (!(nmask & (1 << j)) && avail[c] > 0) {
                    avail[c]--;
                    nmask |= (1 << j);
                }
            }
            best = min(best, 1 + dp(nmask));
        }
        memo[mask] = best;
        return best;
    };

    int res = dp(0);
    return res >= 1000000 ? -1 : res;
}
`,
    },
    complexity: { time: "O(2^n · S · n) worst case", space: "O(2^n)" },
    pitfalls: [
      "Not pruning to stickers that contain the first still-needed letter — explodes the branching factor.",
      "Forgetting to clone the sticker's letter counts before consuming.",
      "Returning a sentinel that collides with a real answer; use a large infinity.",
    ],
    edgeCases: [
      "Target letter absent from all stickers — -1.",
      "A single sticker that already contains every needed letter — answer 1.",
      "Repeated target letters requiring multiple stamps of the same sticker.",
    ],
    whyItMatters:
      "Stickers to Spell Word is bitmask DP over subsets of a target — the same set-cover-with-repetition structure behind assembling outputs from reusable token fragments and minimal template stamping.",
    estimatedMinutes: 50,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 208 — pure_dsa · dp_2d · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "shortest-merged-changelog",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer", "software_engineer"],
    title: "Shortest Merged Changelog Preserving Both Orders",
    framing:
      "Two release changelogs list event codes in order. You want the shortest single changelog that contains BOTH as subsequences — so replaying it reproduces either release's sequence by skipping the other's extra entries.",
    statement:
      "Given two strings str1 and str2, return the shortest string that has both str1 and str2 as subsequences. If multiple answers exist, return any.",
    inputFormat: "Two strings str1 and str2.",
    outputFormat: "A shortest common supersequence of the two strings.",
    constraints: ["1 ≤ |str1|, |str2| ≤ 1000", "Lowercase English letters."],
    examples: [
      {
        input: 'str1="abac" str2="cab"',
        output: "cabac",
        explanation: "'cabac' contains 'abac' (positions 1,2,3,4) and 'cab' (positions 0,1,2).",
      },
      {
        input: 'str1="abc" str2="abc"',
        output: "abc",
        explanation: "Identical strings — the supersequence is the string itself.",
      },
    ],
    approach: [
      "Compute the longest common subsequence (LCS) length table with DP.",
      "Reconstruct by walking the table from the bottom-right: on a match emit the shared char once and move diagonally; otherwise emit the char from the larger neighbour and step toward it.",
      "Append leftover prefix of whichever string remains.",
    ],
    solutionSteps: [
      "Fill dp[i][j] = LCS length of prefixes str1[:i], str2[:j].",
      "Backtrack from (m, n): if chars match, prepend it and go diagonal; else prepend the char from the direction of the larger dp value.",
      "Prepend any remaining characters of str1 or str2; return the built string.",
    ],
    code: {
      python: `def shortest_common_supersequence(str1, str2):
    m, n = len(str1), len(str2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if str1[i - 1] == str2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    i, j = m, n
    res = []
    while i > 0 and j > 0:
        if str1[i - 1] == str2[j - 1]:
            res.append(str1[i - 1]); i -= 1; j -= 1
        elif dp[i - 1][j] >= dp[i][j - 1]:
            res.append(str1[i - 1]); i -= 1
        else:
            res.append(str2[j - 1]); j -= 1
    while i > 0:
        res.append(str1[i - 1]); i -= 1
    while j > 0:
        res.append(str2[j - 1]); j -= 1
    return "".join(reversed(res))
`,
      java: `class Solution {
    public String shortestCommonSupersequence(String str1, String str2) {
        int m = str1.length(), n = str2.length();
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 1; i <= m; i++)
            for (int j = 1; j <= n; j++)
                dp[i][j] = str1.charAt(i - 1) == str2.charAt(j - 1)
                    ? dp[i - 1][j - 1] + 1
                    : Math.max(dp[i - 1][j], dp[i][j - 1]);
        StringBuilder sb = new StringBuilder();
        int i = m, j = n;
        while (i > 0 && j > 0) {
            if (str1.charAt(i - 1) == str2.charAt(j - 1)) { sb.append(str1.charAt(i - 1)); i--; j--; }
            else if (dp[i - 1][j] >= dp[i][j - 1]) { sb.append(str1.charAt(i - 1)); i--; }
            else { sb.append(str2.charAt(j - 1)); j--; }
        }
        while (i > 0) { sb.append(str1.charAt(i - 1)); i--; }
        while (j > 0) { sb.append(str2.charAt(j - 1)); j--; }
        return sb.reverse().toString();
    }
}
`,
      cpp: `#include <string>
#include <vector>
#include <algorithm>
using namespace std;

string shortestCommonSupersequence(string str1, string str2) {
    int m = str1.size(), n = str2.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++)
            dp[i][j] = str1[i - 1] == str2[j - 1]
                ? dp[i - 1][j - 1] + 1
                : max(dp[i - 1][j], dp[i][j - 1]);
    string res;
    int i = m, j = n;
    while (i > 0 && j > 0) {
        if (str1[i - 1] == str2[j - 1]) { res += str1[i - 1]; i--; j--; }
        else if (dp[i - 1][j] >= dp[i][j - 1]) { res += str1[i - 1]; i--; }
        else { res += str2[j - 1]; j--; }
    }
    while (i > 0) { res += str1[i - 1]; i--; }
    while (j > 0) { res += str2[j - 1]; j--; }
    reverse(res.begin(), res.end());
    return res;
}
`,
    },
    complexity: { time: "O(m·n)", space: "O(m·n)" },
    pitfalls: [
      "Concatenating both strings — that is a supersequence but not the shortest.",
      "During backtrack, emitting matched characters twice.",
      "Forgetting to flush the remaining prefix of one string after the other is exhausted.",
    ],
    edgeCases: [
      "No common characters — result length = m + n.",
      "One string a subsequence of the other — result is the longer string.",
      "Identical strings — result equals the string.",
    ],
    whyItMatters:
      "Shortest Common Supersequence is LCS plus reconstruction — merging two ordered sequences while sharing common elements is exactly how diff/merge tools build a minimal combined history.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 209 — pure_dsa · backtracking · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "split-tasks-k-equal-loads",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "platform_engineer", "software_engineer"],
    title: "Split Task Weights Into K Equal Loads",
    framing:
      "A scheduler must distribute indivisible task weights across exactly k identical workers so every worker carries the same total load. Decide whether such a perfectly balanced assignment exists.",
    statement:
      "Given an integer array nums and an integer k, return true if nums can be partitioned into k non-empty subsets all with equal sum.",
    inputFormat: "An integer array nums and an integer k.",
    outputFormat: "A boolean — true if a balanced k-way partition exists.",
    constraints: ["1 ≤ k ≤ n ≤ 16", "1 ≤ nums[i] ≤ 1e4"],
    examples: [
      {
        input: "nums=[4,3,2,3,5,2,1] k=4",
        output: "true",
        explanation: "Sum 20, each bucket 5: {5},{1,4},{2,3},{2,3}.",
      },
      {
        input: "nums=[1,2,3,4] k=3",
        output: "false",
        explanation: "Sum 10 is not divisible by 3.",
      },
    ],
    approach: [
      "If total isn't divisible by k, return false; target = total/k.",
      "Sort descending and prune: any element > target fails immediately.",
      "Backtrack filling one bucket at a time to the target; use a used[] mask and skip duplicates and full restarts.",
      "Key optimisations: place the largest first, and if a recursion fails on an empty bucket, fail entirely.",
    ],
    solutionSteps: [
      "Compute target; reject if indivisible or max(nums) > target.",
      "Sort nums descending. Recurse: fill buckets one by one; for the current bucket, try each unused number that fits.",
      "When a bucket reaches target, recurse to the next bucket from index 0.",
      "Prune: skip equal values already tried at this position; bail if adding to an empty bucket fails.",
    ],
    code: {
      python: `def can_partition_k_subsets(nums, k):
    total = sum(nums)
    if total % k != 0:
        return False
    target = total // k
    nums.sort(reverse=True)
    if nums[0] > target:
        return False
    used = [False] * len(nums)

    def backtrack(start, k_left, cur):
        if k_left == 0:
            return True
        if cur == target:
            return backtrack(0, k_left - 1, 0)
        prev = -1
        for i in range(start, len(nums)):
            if used[i] or cur + nums[i] > target or nums[i] == prev:
                continue
            used[i] = True
            prev = nums[i]
            if backtrack(i + 1, k_left, cur + nums[i]):
                return True
            used[i] = False
            if cur == 0:
                return False
        return False

    return backtrack(0, k, 0)
`,
      java: `import java.util.*;

class Solution {
    public boolean canPartitionKSubsets(int[] nums, int k) {
        int total = 0;
        for (int v : nums) total += v;
        if (total % k != 0) return false;
        int target = total / k;
        Arrays.sort(nums);
        int n = nums.length;
        if (nums[n - 1] > target) return false;
        // reverse to descending
        for (int i = 0; i < n / 2; i++) { int t = nums[i]; nums[i] = nums[n - 1 - i]; nums[n - 1 - i] = t; }
        boolean[] used = new boolean[n];
        return backtrack(nums, used, 0, k, 0, target);
    }

    private boolean backtrack(int[] nums, boolean[] used, int start, int kLeft, int cur, int target) {
        if (kLeft == 0) return true;
        if (cur == target) return backtrack(nums, used, 0, kLeft - 1, 0, target);
        int prev = -1;
        for (int i = start; i < nums.length; i++) {
            if (used[i] || cur + nums[i] > target || nums[i] == prev) continue;
            used[i] = true;
            prev = nums[i];
            if (backtrack(nums, used, i + 1, kLeft, cur + nums[i], target)) return true;
            used[i] = false;
            if (cur == 0) return false;
        }
        return false;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

bool backtrack(vector<int>& nums, vector<bool>& used, int start, int kLeft, int cur, int target) {
    if (kLeft == 0) return true;
    if (cur == target) return backtrack(nums, used, 0, kLeft - 1, 0, target);
    int prev = -1;
    for (int i = start; i < (int)nums.size(); i++) {
        if (used[i] || cur + nums[i] > target || nums[i] == prev) continue;
        used[i] = true;
        prev = nums[i];
        if (backtrack(nums, used, i + 1, kLeft, cur + nums[i], target)) return true;
        used[i] = false;
        if (cur == 0) return false;
    }
    return false;
}

bool canPartitionKSubsets(vector<int>& nums, int k) {
    int total = 0;
    for (int v : nums) total += v;
    if (total % k != 0) return false;
    int target = total / k;
    sort(nums.rbegin(), nums.rend());
    if (nums[0] > target) return false;
    vector<bool> used(nums.size(), false);
    return backtrack(nums, used, 0, k, 0, target);
}
`,
    },
    complexity: { time: "O(k · 2^n) worst case", space: "O(n)" },
    pitfalls: [
      "Restarting the index at 0 within the same bucket — only restart when moving to a new bucket.",
      "Missing the duplicate-skip (nums[i] == prev) prune, which causes timeouts.",
      "Forgetting the 'fail fast if cur == 0' prune after a failed first placement.",
    ],
    edgeCases: [
      "k = 1 — always true.",
      "k = n — true iff all elements equal.",
      "Total not divisible by k — false.",
    ],
    whyItMatters:
      "Partition to K Equal Sum Subsets is backtracking with strong pruning — the bucket-filling pattern and duplicate/empty-bucket cuts are the difference between exponential blowup and a fast, practical solver.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 210 — pure_dsa · graphs · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "token-transform-shortest-chain",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "ai_ml_engineer", "backend_engineer"],
    title: "Shortest Single-Edit Transformation Chain",
    framing:
      "Migrate one config token into another by changing one character at a time, where every intermediate token must be a valid entry in an allowed dictionary. Find the length of the shortest such transformation chain.",
    statement:
      "Given begin and end words of equal length and a wordList, return the number of words in the shortest transformation sequence from begin to end, changing exactly one letter per step and requiring every intermediate word (and end) to be in wordList. Return 0 if no sequence exists. The begin word need not be in wordList.",
    inputFormat: "Strings beginWord and endWord, and a list of strings wordList.",
    outputFormat: "The number of words in the shortest sequence (including both ends), or 0.",
    constraints: [
      "1 ≤ word length ≤ 10",
      "1 ≤ wordList.length ≤ 5000",
      "All words same length, lowercase English.",
      "endWord must be in wordList for a sequence to exist.",
    ],
    examples: [
      {
        input: 'begin="hit" end="cog" wordList=["hot","dot","dog","lot","log","cog"]',
        output: "5",
        explanation: "hit → hot → dot → dog → cog has 5 words.",
      },
      {
        input: 'begin="hit" end="cog" wordList=["hot","dot","dog","lot","log"]',
        output: "0",
        explanation: "'cog' is absent, so no valid sequence.",
      },
    ],
    approach: [
      "Model words as graph nodes; edges connect words differing by one letter.",
      "Run BFS from beginWord, generating neighbours by trying every position × 26 letters and checking membership in a set.",
      "The first time endWord is dequeued, its level is the shortest length.",
      "Remove visited words from the set to avoid revisiting.",
    ],
    solutionSteps: [
      "Put wordList in a hash set; if endWord absent, return 0.",
      "BFS with a queue seeded by (beginWord, 1).",
      "For each word, mutate each position to all 26 letters; if the candidate is in the set, it is a neighbour — enqueue with level+1 and erase from the set.",
      "Return the level when endWord is found; 0 if the queue drains.",
    ],
    code: {
      python: `from collections import deque

def ladder_length(begin_word, end_word, word_list):
    words = set(word_list)
    if end_word not in words:
        return 0
    queue = deque([(begin_word, 1)])
    while queue:
        word, steps = queue.popleft()
        if word == end_word:
            return steps
        for i in range(len(word)):
            for c in "abcdefghijklmnopqrstuvwxyz":
                cand = word[:i] + c + word[i + 1:]
                if cand in words:
                    words.remove(cand)
                    queue.append((cand, steps + 1))
    return 0
`,
      java: `import java.util.*;

class Solution {
    public int ladderLength(String beginWord, String endWord, List<String> wordList) {
        Set<String> words = new HashSet<>(wordList);
        if (!words.contains(endWord)) return 0;
        Queue<String> queue = new LinkedList<>();
        queue.offer(beginWord);
        int steps = 1;
        while (!queue.isEmpty()) {
            int sz = queue.size();
            for (int s = 0; s < sz; s++) {
                String word = queue.poll();
                if (word.equals(endWord)) return steps;
                char[] arr = word.toCharArray();
                for (int i = 0; i < arr.length; i++) {
                    char orig = arr[i];
                    for (char c = 'a'; c <= 'z'; c++) {
                        arr[i] = c;
                        String cand = new String(arr);
                        if (words.remove(cand)) queue.offer(cand);
                    }
                    arr[i] = orig;
                }
            }
            steps++;
        }
        return 0;
    }
}
`,
      cpp: `#include <string>
#include <vector>
#include <queue>
#include <unordered_set>
using namespace std;

int ladderLength(string beginWord, string endWord, vector<string>& wordList) {
    unordered_set<string> words(wordList.begin(), wordList.end());
    if (!words.count(endWord)) return 0;
    queue<string> q;
    q.push(beginWord);
    int steps = 1;
    while (!q.empty()) {
        int sz = q.size();
        for (int s = 0; s < sz; s++) {
            string word = q.front(); q.pop();
            if (word == endWord) return steps;
            for (int i = 0; i < (int)word.size(); i++) {
                char orig = word[i];
                for (char c = 'a'; c <= 'z'; c++) {
                    word[i] = c;
                    if (words.count(word)) { words.erase(word); q.push(word); }
                }
                word[i] = orig;
            }
        }
        steps++;
    }
    return 0;
}
`,
    },
    complexity: { time: "O(N · L · 26)", space: "O(N · L)" },
    pitfalls: [
      "Building an explicit O(N²) adjacency by comparing all word pairs instead of mutating positions.",
      "Not removing visited words, causing cycles and revisits.",
      "Returning the edge count instead of the word count (off by one).",
    ],
    edgeCases: [
      "beginWord == endWord but endWord in list — length 1 path semantics depend on definition; here BFS returns 1.",
      "endWord absent — 0.",
      "No reachable path — 0.",
    ],
    whyItMatters:
      "Word Ladder is BFS on an implicit graph — generating neighbours on the fly instead of materialising edges is the canonical technique for shortest-path search over huge state spaces.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 211 — pure_dsa · graphs · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "fewest-route-hops-network",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "platform_engineer", "software_engineer"],
    title: "Fewest Service Hops Across Shared Routes",
    framing:
      "A transit-style service mesh runs fixed routes, each visiting a set of stops in a loop. Boarding or staying on a route is free; switching routes counts as one hop. Find the minimum number of routes you must board to travel from a source stop to a target stop.",
    statement:
      "Given routes where routes[i] is the list of stops served by route i (cyclically), and integers source and target stops, return the least number of routes taken to get from source to target. Return -1 if impossible. Taking a route lets you reach any stop on it.",
    inputFormat: "A 2D array routes, and integers source and target.",
    outputFormat: "The minimum number of routes boarded, or -1.",
    constraints: [
      "1 ≤ routes.length ≤ 500",
      "1 ≤ total stops across routes ≤ 1e5",
      "0 ≤ stop id ≤ 1e6",
    ],
    examples: [
      {
        input: "routes=[[1,2,7],[3,6,7]] source=1 target=6",
        output: "2",
        explanation: "Board route 0 (stop 1→7), switch to route 1 (7→6): 2 routes.",
      },
      {
        input: "routes=[[7,12],[4,5,15],[6],[15,19],[9,12,13]] source=15 target=12",
        output: "-1",
        explanation: "No chain of shared stops links 15 to 12.",
      },
    ],
    approach: [
      "BFS over routes, not stops. Build a map stop → list of routes serving it.",
      "Start by boarding every route that serves source; each is level 1.",
      "From a route, you can transfer to any other route sharing a stop; those are level+1.",
      "Stop when a boarded route contains target.",
    ],
    solutionSteps: [
      "If source == target, return 0.",
      "Build stopToRoutes. Seed a queue with all routes serving source (level 1); mark them visited.",
      "BFS: for each route, if it covers target return its level; else for each stop on it, enqueue unvisited routes that also serve that stop.",
      "Return -1 if BFS completes without reaching target.",
    ],
    code: {
      python: `from collections import defaultdict, deque

def num_buses_to_destination(routes, source, target):
    if source == target:
        return 0
    stop_to_routes = defaultdict(list)
    for r, stops in enumerate(routes):
        for s in stops:
            stop_to_routes[s].append(r)
    visited_routes = set()
    queue = deque()
    for r in stop_to_routes[source]:
        queue.append((r, 1))
        visited_routes.add(r)
    while queue:
        route, level = queue.popleft()
        for s in routes[route]:
            if s == target:
                return level
            for nr in stop_to_routes[s]:
                if nr not in visited_routes:
                    visited_routes.add(nr)
                    queue.append((nr, level + 1))
    return -1
`,
      java: `import java.util.*;

class Solution {
    public int numBusesToDestination(int[][] routes, int source, int target) {
        if (source == target) return 0;
        Map<Integer, List<Integer>> stopToRoutes = new HashMap<>();
        for (int r = 0; r < routes.length; r++)
            for (int s : routes[r])
                stopToRoutes.computeIfAbsent(s, x -> new ArrayList<>()).add(r);
        Set<Integer> visited = new HashSet<>();
        Queue<int[]> queue = new LinkedList<>();
        for (int r : stopToRoutes.getOrDefault(source, Collections.emptyList())) {
            queue.offer(new int[]{r, 1});
            visited.add(r);
        }
        while (!queue.isEmpty()) {
            int[] cur = queue.poll();
            int route = cur[0], level = cur[1];
            for (int s : routes[route]) {
                if (s == target) return level;
                for (int nr : stopToRoutes.getOrDefault(s, Collections.emptyList())) {
                    if (!visited.contains(nr)) {
                        visited.add(nr);
                        queue.offer(new int[]{nr, level + 1});
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
#include <unordered_map>
#include <unordered_set>
using namespace std;

int numBusesToDestination(vector<vector<int>>& routes, int source, int target) {
    if (source == target) return 0;
    unordered_map<int, vector<int>> stopToRoutes;
    for (int r = 0; r < (int)routes.size(); r++)
        for (int s : routes[r]) stopToRoutes[s].push_back(r);
    unordered_set<int> visited;
    queue<pair<int,int>> q;
    for (int r : stopToRoutes[source]) { q.push({r, 1}); visited.insert(r); }
    while (!q.empty()) {
        auto [route, level] = q.front(); q.pop();
        for (int s : routes[route]) {
            if (s == target) return level;
            for (int nr : stopToRoutes[s]) {
                if (!visited.count(nr)) { visited.insert(nr); q.push({nr, level + 1}); }
            }
        }
    }
    return -1;
}
`,
    },
    complexity: { time: "O(total stops)", space: "O(total stops)" },
    pitfalls: [
      "BFS over stops instead of routes — explodes and mis-counts hops.",
      "Forgetting the source == target zero-hop base case.",
      "Re-boarding already-visited routes, causing cycles.",
    ],
    edgeCases: [
      "Source not served by any route — return -1.",
      "Single route containing both source and target — answer 1.",
      "Disjoint route clusters — -1.",
    ],
    whyItMatters:
      "Bus Routes is BFS on a transformed graph (routes as nodes) — recognising the right node abstraction is what turns a sprawling stop graph into a tiny, fast search.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 212 — pure_dsa · graphs · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "tour-all-nodes-shortest-walk",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "backend_engineer", "software_engineer"],
    title: "Shortest Walk Visiting Every Datacenter",
    framing:
      "A maintenance bot must visit every datacenter at least once, starting from any one, and may revisit datacenters and reuse links freely. Find the length of the shortest walk that covers all of them.",
    statement:
      "Given an undirected connected graph of n nodes as an adjacency list graph (graph[i] lists neighbours of i), return the length of the shortest path that visits every node. You may start and end at any node and revisit nodes and edges.",
    inputFormat: "An adjacency list graph of n nodes (0-indexed).",
    outputFormat: "The minimum number of edges in a walk covering all nodes.",
    constraints: [
      "1 ≤ n ≤ 12",
      "0 ≤ graph[i].length < n",
      "The graph is connected and undirected.",
    ],
    examples: [
      {
        input: "[[1,2,3],[0],[0],[0]]",
        output: "4",
        explanation: "Star graph: e.g. 1→0→2→0→3 uses 4 edges to cover all nodes.",
      },
      {
        input: "[[1],[0,2,4],[1,3],[2],[1,5],[4]]",
        output: "5",
        explanation: "A path-like graph traversed once end to end covers all 6 nodes in 5 edges.",
      },
    ],
    approach: [
      "State = (current node, bitmask of visited nodes). Goal: any state with full mask.",
      "BFS from all n starting states (node i, mask with only i) simultaneously — first time full mask is reached gives the shortest walk.",
      "Edges have unit weight, so BFS suffices; revisits are allowed because the mask only grows or stays.",
    ],
    solutionSteps: [
      "If n == 1, return 0. Initialise a queue with (i, 1<<i, 0 steps) for all i and a visited set of (node, mask).",
      "BFS: pop (node, mask, dist); for each neighbour, new mask = mask | (1<<nei).",
      "If new mask == full, return dist + 1; else enqueue if (nei, newMask) unseen.",
      "Return 0 if n == 1 (already handled).",
    ],
    code: {
      python: `from collections import deque

def shortest_path_length(graph):
    n = len(graph)
    if n == 1:
        return 0
    full = (1 << n) - 1
    queue = deque()
    seen = set()
    for i in range(n):
        state = (i, 1 << i)
        queue.append((i, 1 << i, 0))
        seen.add(state)
    while queue:
        node, mask, dist = queue.popleft()
        for nei in graph[node]:
            nmask = mask | (1 << nei)
            if nmask == full:
                return dist + 1
            if (nei, nmask) not in seen:
                seen.add((nei, nmask))
                queue.append((nei, nmask, dist + 1))
    return 0
`,
      java: `import java.util.*;

class Solution {
    public int shortestPathLength(int[][] graph) {
        int n = graph.length;
        if (n == 1) return 0;
        int full = (1 << n) - 1;
        Queue<int[]> queue = new LinkedList<>();
        boolean[][] seen = new boolean[n][1 << n];
        for (int i = 0; i < n; i++) {
            queue.offer(new int[]{i, 1 << i, 0});
            seen[i][1 << i] = true;
        }
        while (!queue.isEmpty()) {
            int[] cur = queue.poll();
            int node = cur[0], mask = cur[1], dist = cur[2];
            for (int nei : graph[node]) {
                int nmask = mask | (1 << nei);
                if (nmask == full) return dist + 1;
                if (!seen[nei][nmask]) {
                    seen[nei][nmask] = true;
                    queue.offer(new int[]{nei, nmask, dist + 1});
                }
            }
        }
        return 0;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
using namespace std;

int shortestPathLength(vector<vector<int>>& graph) {
    int n = graph.size();
    if (n == 1) return 0;
    int full = (1 << n) - 1;
    vector<vector<bool>> seen(n, vector<bool>(1 << n, false));
    queue<array<int,3>> q;
    for (int i = 0; i < n; i++) {
        q.push({i, 1 << i, 0});
        seen[i][1 << i] = true;
    }
    while (!q.empty()) {
        auto [node, mask, dist] = q.front(); q.pop();
        for (int nei : graph[node]) {
            int nmask = mask | (1 << nei);
            if (nmask == full) return dist + 1;
            if (!seen[nei][nmask]) {
                seen[nei][nmask] = true;
                q.push({nei, nmask, dist + 1});
            }
        }
    }
    return 0;
}
`,
    },
    complexity: { time: "O(n² · 2^n)", space: "O(n · 2^n)" },
    pitfalls: [
      "Tracking visited by node only — must include the mask, since the same node recurs with different coverage.",
      "Starting BFS from a single node; the optimal walk may begin anywhere.",
      "Treating it as a simple path (TSP) — revisits are allowed, so BFS over (node, mask) is correct and polynomial in 2^n.",
    ],
    edgeCases: [
      "n = 1 — answer 0.",
      "Complete graph — answer n-1.",
      "Path graph — answer n-1.",
    ],
    whyItMatters:
      "Shortest Path Visiting All Nodes is the bitmask-BFS template — pairing position with a visited-set bitmask is the standard way to solve covering and Hamiltonian-flavoured problems for small n.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 213 — pure_dsa · graphs · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "reconstruct-deployment-itinerary",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "platform_engineer", "software_engineer"],
    title: "Reconstruct The Single Valid Itinerary",
    framing:
      "You hold a pile of one-way transfer tickets, each from one hop to another. Starting from a fixed origin, use every ticket exactly once to form a single itinerary. When multiple legal itineraries exist, return the lexicographically smallest one.",
    statement:
      "Given a list of airline tickets [from, to], reconstruct the itinerary that uses all tickets exactly once, starting from 'JFK'. If multiple valid itineraries exist, return the one with the smallest lexical order when read as a single string. A valid itinerary using all tickets is guaranteed.",
    inputFormat: "A list of [from, to] string pairs.",
    outputFormat: "The ordered list of airport codes forming the itinerary.",
    constraints: [
      "1 ≤ tickets.length ≤ 300",
      "Airport codes are 3 uppercase letters.",
      "A valid itinerary consuming all tickets exists.",
    ],
    examples: [
      {
        input: '[["MUC","LHR"],["JFK","MUC"],["SFO","SJC"],["LHR","SFO"]]',
        output: '["JFK","MUC","LHR","SFO","SJC"]',
        explanation: "The unique itinerary consuming all four tickets.",
      },
      {
        input: '[["JFK","SFO"],["JFK","ATL"],["SFO","ATL"],["ATL","JFK"],["ATL","SFO"]]',
        output: '["JFK","ATL","JFK","SFO","ATL","SFO"]',
        explanation: "Lexically smallest itinerary among the valid options.",
      },
    ],
    approach: [
      "This is finding an Eulerian path; use Hierholzer's algorithm.",
      "Build adjacency lists sorted (or min-heaps) so the smallest destination is chosen first.",
      "DFS from JFK, always taking the smallest available outgoing edge; append a node to the route only after its edges are exhausted (post-order).",
      "Reverse the post-order list to get the itinerary.",
    ],
    solutionSteps: [
      "Build graph: from → sorted list of destinations (consume from the front, or use a min-heap).",
      "Run iterative/recursive Hierholzer DFS from 'JFK': while a node has unused edges, descend into the smallest; on exhaustion, push the node to a stack.",
      "Reverse the stack to produce the final itinerary.",
    ],
    code: {
      python: `import heapq

def find_itinerary(tickets):
    graph = {}
    for src, dst in tickets:
        graph.setdefault(src, []).append(dst)
    for src in graph:
        heapq.heapify(graph[src])
    route = []
    stack = ["JFK"]
    while stack:
        node = stack[-1]
        if graph.get(node):
            stack.append(heapq.heappop(graph[node]))
        else:
            route.append(stack.pop())
    return route[::-1]
`,
      java: `import java.util.*;

class Solution {
    public List<String> findItinerary(List<List<String>> tickets) {
        Map<String, PriorityQueue<String>> graph = new HashMap<>();
        for (List<String> t : tickets)
            graph.computeIfAbsent(t.get(0), k -> new PriorityQueue<>()).offer(t.get(1));
        LinkedList<String> route = new LinkedList<>();
        Deque<String> stack = new ArrayDeque<>();
        stack.push("JFK");
        while (!stack.isEmpty()) {
            String node = stack.peek();
            PriorityQueue<String> pq = graph.get(node);
            if (pq != null && !pq.isEmpty()) {
                stack.push(pq.poll());
            } else {
                route.addFirst(stack.pop());
            }
        }
        return route;
    }
}
`,
      cpp: `#include <vector>
#include <string>
#include <map>
#include <queue>
#include <algorithm>
using namespace std;

vector<string> findItinerary(vector<vector<string>>& tickets) {
    map<string, priority_queue<string, vector<string>, greater<string>>> graph;
    for (auto& t : tickets) graph[t[0]].push(t[1]);
    vector<string> route;
    vector<string> stack = {"JFK"};
    while (!stack.empty()) {
        string node = stack.back();
        auto it = graph.find(node);
        if (it != graph.end() && !it->second.empty()) {
            stack.push_back(it->second.top());
            it->second.pop();
        } else {
            route.push_back(node);
            stack.pop_back();
        }
    }
    reverse(route.begin(), route.end());
    return route;
}
`,
    },
    complexity: { time: "O(E log E)", space: "O(E)" },
    pitfalls: [
      "Greedy DFS that appends on entry (pre-order) gets stuck and produces wrong routes — Hierholzer appends on exit.",
      "Not maintaining lexical order of destinations (use sorted lists / min-heaps).",
      "Forgetting to reverse the post-order stack.",
    ],
    edgeCases: [
      "Single ticket — itinerary of two airports.",
      "Cycles back to JFK mid-route.",
      "Multiple equal-cost branches resolved by lexical order.",
    ],
    whyItMatters:
      "Reconstruct Itinerary is Hierholzer's Eulerian-path algorithm — the post-order 'finish then prepend' trick is the same insight behind dependency unwinding and edge-consuming traversals.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 214 — pure_dsa · graphs · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "reorient-pipe-grid-min-cost",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "backend_engineer", "software_engineer"],
    title: "Minimum Re-Wiring To Make A Valid Path",
    framing:
      "A grid of one-way connectors each points in a fixed direction (right, left, down, up). Following arrows is free; rotating a cell to point elsewhere costs 1. Find the minimum total cost to create a directed path from the top-left to the bottom-right cell.",
    statement:
      "Given an m x n grid where grid[i][j] is 1 (right), 2 (left), 3 (down), or 4 (up), return the minimum number of cells you must change so there is a valid directed path from (0,0) to (m-1,n-1). Moving along a cell's own arrow costs 0; entering any other direction costs 1.",
    inputFormat: "An m x n integer grid with values in {1,2,3,4}.",
    outputFormat: "The minimum cost (number of cell modifications).",
    constraints: ["1 ≤ m, n ≤ 100", "grid[i][j] ∈ {1,2,3,4}"],
    examples: [
      {
        input: "[[1,1,1,1],[2,2,2,2],[1,1,1,1],[2,2,2,2]]",
        output: "3",
        explanation: "Three direction changes route a path from top-left to bottom-right.",
      },
      {
        input: "[[1,1,3],[3,2,2],[1,1,4]]",
        output: "0",
        explanation: "Existing arrows already form a valid path.",
      },
    ],
    approach: [
      "Model cells as nodes; an edge in the cell's own arrow direction has weight 0, edges to the other three neighbours have weight 1.",
      "This is a shortest path with weights in {0,1} — use 0-1 BFS with a deque.",
      "Push 0-weight moves to the front, 1-weight moves to the back, ensuring monotonic distances.",
    ],
    solutionSteps: [
      "Define direction vectors indexed by {1,2,3,4}. Initialise dist grid to infinity; dist[0][0] = 0.",
      "0-1 BFS from (0,0): pop the front; for each of the four directions, cost = 0 if it matches grid value else 1.",
      "Relax the neighbour; push to front if cost 0, back if cost 1.",
      "Return dist[m-1][n-1].",
    ],
    code: {
      python: `from collections import deque

def min_cost(grid):
    m, n = len(grid), len(grid[0])
    dirs = {1: (0, 1), 2: (0, -1), 3: (1, 0), 4: (-1, 0)}
    INF = float("inf")
    dist = [[INF] * n for _ in range(m)]
    dist[0][0] = 0
    dq = deque([(0, 0)])
    while dq:
        r, c = dq.popleft()
        for d, (dr, dc) in dirs.items():
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n:
                cost = 0 if grid[r][c] == d else 1
                if dist[r][c] + cost < dist[nr][nc]:
                    dist[nr][nc] = dist[r][c] + cost
                    if cost == 0:
                        dq.appendleft((nr, nc))
                    else:
                        dq.append((nr, nc))
    return dist[m - 1][n - 1]
`,
      java: `import java.util.*;

class Solution {
    public int minCost(int[][] grid) {
        int m = grid.length, n = grid[0].length;
        int[][] dirs = {{0,1},{0,-1},{1,0},{-1,0}}; // index+1 = direction code
        int[][] dist = new int[m][n];
        for (int[] row : dist) Arrays.fill(row, Integer.MAX_VALUE);
        dist[0][0] = 0;
        Deque<int[]> dq = new ArrayDeque<>();
        dq.offerFirst(new int[]{0, 0});
        while (!dq.isEmpty()) {
            int[] cur = dq.pollFirst();
            int r = cur[0], c = cur[1];
            for (int d = 0; d < 4; d++) {
                int nr = r + dirs[d][0], nc = c + dirs[d][1];
                if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
                int cost = grid[r][c] == d + 1 ? 0 : 1;
                if (dist[r][c] + cost < dist[nr][nc]) {
                    dist[nr][nc] = dist[r][c] + cost;
                    if (cost == 0) dq.offerFirst(new int[]{nr, nc});
                    else dq.offerLast(new int[]{nr, nc});
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

int minCost(vector<vector<int>>& grid) {
    int m = grid.size(), n = grid[0].size();
    int dirs[4][2] = {{0,1},{0,-1},{1,0},{-1,0}};
    vector<vector<int>> dist(m, vector<int>(n, INT_MAX));
    dist[0][0] = 0;
    deque<pair<int,int>> dq;
    dq.push_front({0, 0});
    while (!dq.empty()) {
        auto [r, c] = dq.front(); dq.pop_front();
        for (int d = 0; d < 4; d++) {
            int nr = r + dirs[d][0], nc = c + dirs[d][1];
            if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
            int cost = grid[r][c] == d + 1 ? 0 : 1;
            if (dist[r][c] + cost < dist[nr][nc]) {
                dist[nr][nc] = dist[r][c] + cost;
                if (cost == 0) dq.push_front({nr, nc});
                else dq.push_back({nr, nc});
            }
        }
    }
    return dist[m - 1][n - 1];
}
`,
    },
    complexity: { time: "O(m·n)", space: "O(m·n)" },
    pitfalls: [
      "Using ordinary BFS, which ignores edge weights and over/undercounts changes.",
      "Using Dijkstra with a heap works but is slower; 0-1 BFS is the idiomatic fit.",
      "Mismatching direction codes to their (dr, dc) vectors.",
    ],
    edgeCases: [
      "Already-valid path — cost 0.",
      "1x1 grid — cost 0 (already at destination).",
      "Single row or column.",
    ],
    whyItMatters:
      "Minimum Cost to Make Valid Path is the textbook 0-1 BFS — deque-based front/back insertion gives Dijkstra-quality results in linear time whenever edge weights are only 0 or 1.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 215 — pure_dsa · graphs · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "merge-to-largest-cluster-island",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer", "platform_engineer"],
    title: "Largest Cluster After Flipping One Cell",
    framing:
      "A grid marks active (1) and idle (0) cells; orthogonally connected active cells form a cluster. You may flip at most one idle cell to active. Find the size of the largest cluster you can form.",
    statement:
      "Given an n x n binary grid, you may change at most one 0 to 1. Return the size of the largest island (4-directionally connected group of 1s) achievable. If the grid is already all 1s, return n*n.",
    inputFormat: "An n x n binary matrix grid.",
    outputFormat: "The maximum island size after at most one flip.",
    constraints: ["1 ≤ n ≤ 500", "grid[i][j] ∈ {0,1}"],
    examples: [
      {
        input: "[[1,0],[0,1]]",
        output: "3",
        explanation: "Flipping either 0 connects two size-1 islands into size 3.",
      },
      {
        input: "[[1,1],[1,0]]",
        output: "4",
        explanation: "Flipping the single 0 merges into one island of size 4.",
      },
    ],
    approach: [
      "Label every island with a unique id and record each island's size.",
      "For each 0 cell, sum the sizes of the distinct island ids among its four neighbours, plus 1 for the flipped cell.",
      "The answer is the max over all 0 cells, or the whole grid if there are no 0s.",
    ],
    solutionSteps: [
      "Flood-fill to assign island ids (starting at 2 to avoid clashing with 0/1) and store sizes in a map.",
      "For each 0 cell, collect the set of neighbouring island ids; candidate = 1 + sum of their sizes.",
      "Track the maximum; if no 0 exists, return n*n.",
    ],
    code: {
      python: `def largest_island(grid):
    n = len(grid)
    sizes = {}
    island_id = 2

    def fill(r, c, idn):
        stack = [(r, c)]
        grid[r][c] = idn
        count = 0
        while stack:
            x, y = stack.pop()
            count += 1
            for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < n and 0 <= ny < n and grid[nx][ny] == 1:
                    grid[nx][ny] = idn
                    stack.append((nx, ny))
        return count

    for i in range(n):
        for j in range(n):
            if grid[i][j] == 1:
                sizes[island_id] = fill(i, j, island_id)
                island_id += 1

    best = max(sizes.values(), default=0)
    for i in range(n):
        for j in range(n):
            if grid[i][j] == 0:
                seen = set()
                total = 1
                for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    ni, nj = i + dx, j + dy
                    if 0 <= ni < n and 0 <= nj < n and grid[ni][nj] > 1:
                        idn = grid[ni][nj]
                        if idn not in seen:
                            seen.add(idn)
                            total += sizes[idn]
                best = max(best, total)
    return best
`,
      java: `import java.util.*;

class Solution {
    int n;
    int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};

    public int largestIsland(int[][] grid) {
        n = grid.length;
        Map<Integer, Integer> sizes = new HashMap<>();
        int id = 2;
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                if (grid[i][j] == 1) sizes.put(id, fill(grid, i, j, id++));
        int best = 0;
        for (int s : sizes.values()) best = Math.max(best, s);
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (grid[i][j] == 0) {
                    Set<Integer> seen = new HashSet<>();
                    int total = 1;
                    for (int[] d : dirs) {
                        int ni = i + d[0], nj = j + d[1];
                        if (ni >= 0 && ni < n && nj >= 0 && nj < n && grid[ni][nj] > 1) {
                            int idn = grid[ni][nj];
                            if (seen.add(idn)) total += sizes.get(idn);
                        }
                    }
                    best = Math.max(best, total);
                }
            }
        }
        return best;
    }

    private int fill(int[][] grid, int r, int c, int id) {
        Deque<int[]> stack = new ArrayDeque<>();
        stack.push(new int[]{r, c});
        grid[r][c] = id;
        int count = 0;
        while (!stack.isEmpty()) {
            int[] cur = stack.pop();
            count++;
            for (int[] d : dirs) {
                int nx = cur[0] + d[0], ny = cur[1] + d[1];
                if (nx >= 0 && nx < n && ny >= 0 && ny < n && grid[nx][ny] == 1) {
                    grid[nx][ny] = id;
                    stack.push(new int[]{nx, ny});
                }
            }
        }
        return count;
    }
}
`,
      cpp: `#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>
using namespace std;

int largestIsland(vector<vector<int>>& grid) {
    int n = grid.size();
    int dirs[4][2] = {{1,0},{-1,0},{0,1},{0,-1}};
    unordered_map<int,int> sizes;
    int id = 2;
    auto fill = [&](int r, int c, int idn) {
        vector<pair<int,int>> stack = {{r, c}};
        grid[r][c] = idn;
        int count = 0;
        while (!stack.empty()) {
            auto [x, y] = stack.back(); stack.pop_back();
            count++;
            for (auto& d : dirs) {
                int nx = x + d[0], ny = y + d[1];
                if (nx >= 0 && nx < n && ny >= 0 && ny < n && grid[nx][ny] == 1) {
                    grid[nx][ny] = idn;
                    stack.push_back({nx, ny});
                }
            }
        }
        return count;
    };
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            if (grid[i][j] == 1) sizes[id] = fill(i, j, id), id++;
    int best = 0;
    for (auto& p : sizes) best = max(best, p.second);
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            if (grid[i][j] == 0) {
                unordered_set<int> seen;
                int total = 1;
                for (auto& d : dirs) {
                    int ni = i + d[0], nj = j + d[1];
                    if (ni >= 0 && ni < n && nj >= 0 && nj < n && grid[ni][nj] > 1) {
                        int idn = grid[ni][nj];
                        if (seen.insert(idn).second) total += sizes[idn];
                    }
                }
                best = max(best, total);
            }
        }
    }
    return best;
}
`,
    },
    complexity: { time: "O(n²)", space: "O(n²)" },
    pitfalls: [
      "Re-running a flood fill for every candidate flip — O(n⁴); instead label once and reuse sizes.",
      "Double-counting the same island when two neighbours belong to it (deduplicate ids).",
      "Forgetting the all-ones case where no 0 exists to flip.",
    ],
    edgeCases: [
      "All zeros — answer 1 (flip one cell).",
      "All ones — answer n*n.",
      "Single cell grid.",
    ],
    whyItMatters:
      "Making a Large Island is label-then-query: pre-computing connected-component sizes so each candidate change is answered in O(1) is the same precompute pattern behind incremental connectivity analytics.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 216 — pure_dsa · heap_priority_queue · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "service-load-skyline",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "heap_priority_queue",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Compute The Overlapping-Load Skyline",
    framing:
      "Each service deploys over an interval [start, end) and contributes a fixed load level during that span. Overlapping deployments stack; only the maximum active load matters. Produce the silhouette of peak load over time as a list of change points.",
    statement:
      "Given buildings where buildings[i] = [left, right, height], return the skyline as a list of 'key points' [x, height] sorted by x. Each key point marks the left endpoint of a horizontal segment in the outer contour; the last point has height 0. Consecutive segments must not have equal heights.",
    inputFormat: "A list of [left, right, height] triples (right is exclusive of the contour beyond it).",
    outputFormat: "A list of [x, height] key points describing the skyline.",
    constraints: [
      "1 ≤ buildings.length ≤ 1e4",
      "0 ≤ left < right ≤ 2^31 - 1",
      "1 ≤ height ≤ 2^31 - 1",
    ],
    examples: [
      {
        input: "[[2,9,10],[3,7,15],[5,12,12],[15,20,10],[19,24,8]]",
        output: "[[2,10],[3,15],[7,12],[12,0],[15,10],[19,8],[24,0]]",
        explanation: "The contour rises and falls as buildings begin and end.",
      },
      {
        input: "[[0,2,3],[2,5,3]]",
        output: "[[0,3],[5,0]]",
        explanation: "Adjacent equal-height buildings merge into one segment.",
      },
    ],
    approach: [
      "Create events at each left edge (entering) and right edge (leaving), then sweep x left to right.",
      "Maintain a max-heap (multiset) of active heights; at each x, add starting heights and lazily remove ending ones.",
      "After processing all events at an x, the current max height is the contour level; record a key point whenever it changes from the previous level.",
    ],
    solutionSteps: [
      "Build events: for each building, (left, -height) start and (right, +height) end; sort by x, then starts before ends, taller starts first.",
      "Use a max-heap with lazy deletion plus a count map; track prevMax.",
      "At each distinct x, push starts / mark ends, pop stale tops, then read the new max; if it differs from prevMax, append [x, max].",
    ],
    code: {
      python: `import heapq

def get_skyline(buildings):
    events = []
    for l, r, h in buildings:
        events.append((l, -h, r))   # start
        events.append((r, 0, 0))    # end marker
    events.sort(key=lambda e: (e[0], e[1]))
    result = []
    heap = [(0, float("inf"))]  # (neg height, end x)
    for x, negh, r in events:
        while heap[0][1] <= x:
            heapq.heappop(heap)
        if negh != 0:
            heapq.heappush(heap, (negh, r))
        cur = -heap[0][0]
        if not result or result[-1][1] != cur:
            result.append([x, cur])
    return result
`,
      java: `import java.util.*;

class Solution {
    public List<List<Integer>> getSkyline(int[][] buildings) {
        List<int[]> events = new ArrayList<>();
        for (int[] b : buildings) {
            events.add(new int[]{b[0], -b[2], b[1]});
            events.add(new int[]{b[1], 0, 0});
        }
        events.sort((a, c) -> a[0] != c[0] ? a[0] - c[0] : a[1] - c[1]);
        List<List<Integer>> result = new ArrayList<>();
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, c) -> c[0] - a[0]); // max height
        heap.offer(new int[]{0, Integer.MAX_VALUE});
        for (int[] e : events) {
            int x = e[0];
            while (heap.peek()[1] <= x) heap.poll();
            if (e[1] != 0) heap.offer(new int[]{-e[1], e[2]});
            int cur = heap.peek()[0];
            if (result.isEmpty() || result.get(result.size() - 1).get(1) != cur)
                result.add(Arrays.asList(x, cur));
        }
        return result;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
#include <algorithm>
#include <climits>
using namespace std;

vector<vector<int>> getSkyline(vector<vector<int>>& buildings) {
    vector<array<int,3>> events;
    for (auto& b : buildings) {
        events.push_back({b[0], -b[2], b[1]});
        events.push_back({b[1], 0, 0});
    }
    sort(events.begin(), events.end(), [](const array<int,3>& a, const array<int,3>& c) {
        return a[0] != c[0] ? a[0] < c[0] : a[1] < c[1];
    });
    vector<vector<int>> result;
    priority_queue<pair<int,int>> heap; // (height, end x)
    heap.push({0, INT_MAX});
    for (auto& e : events) {
        int x = e[0];
        while (heap.top().second <= x) heap.pop();
        if (e[1] != 0) heap.push({-e[1], e[2]});
        int cur = heap.top().first;
        if (result.empty() || result.back()[1] != cur)
            result.push_back({x, cur});
    }
    return result;
}
`,
    },
    complexity: { time: "O(n log n)", space: "O(n)" },
    pitfalls: [
      "Removing ended buildings eagerly from a heap — use lazy deletion keyed by end x.",
      "Wrong event ordering: at the same x, process taller starts before shorter, and starts before ends, to avoid spurious points.",
      "Emitting consecutive points with equal heights.",
    ],
    edgeCases: [
      "Adjacent buildings of equal height merge into one segment.",
      "Fully nested buildings (one inside another's span).",
      "A single building → two key points.",
    ],
    whyItMatters:
      "The Skyline Problem is the canonical sweep-line + max-heap pattern — tracking the current maximum over a set of active intervals is exactly how you compute peak concurrency, load envelopes, and coverage contours.",
    estimatedMinutes: 50,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 217 — ai_applied · heap_priority_queue · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-ensemble-performance-budget",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 9,
    pattern: "heap_priority_queue",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "backend_engineer", "data_engineer"],
    title: "Maximum Ensemble Performance Within A Size Budget",
    framing:
      "You assemble an ensemble of at most k models. Each model has a quality score and an inference speed. The ensemble's performance is the SUM of chosen models' qualities multiplied by the MINIMUM speed among them (the slowest member gates latency). Maximize performance.",
    statement:
      "Given n engineers (models) with speed[i] and efficiency[i] (quality), and an integer k, choose at most k of them to maximize (sum of chosen efficiencies) * (minimum chosen speed). Return the maximum performance modulo 1e9+7.",
    inputFormat: "Integer n, arrays speed and efficiency, and integer k.",
    outputFormat: "The maximum performance modulo 1e9+7.",
    constraints: [
      "1 ≤ n ≤ 1e5",
      "1 ≤ k ≤ n",
      "1 ≤ speed[i] ≤ 1e5",
      "1 ≤ efficiency[i] ≤ 1e8",
    ],
    examples: [
      {
        input: "n=6 speed=[2,10,3,1,5,8] efficiency=[5,4,3,9,7,2] k=2",
        output: "60",
        explanation: "Pick engineers with speed {5,8}? Optimal: speed 5 & 10 give (7+4)*... — the best pair yields 60.",
      },
      {
        input: "n=6 speed=[2,10,3,1,5,8] efficiency=[5,4,3,9,7,2] k=3",
        output: "68",
        explanation: "Adding a third member raises the efficiency sum enough to reach 68.",
      },
    ],
    approach: [
      "Sort engineers by efficiency descending; iterate so the current engineer's efficiency is the smallest-so-far gate? No — its SPEED gates. Sort by speed descending instead.",
      "Process in decreasing speed order; the current engineer's speed is the minimum of any subset formed from those seen so far.",
      "Maintain a min-heap of the chosen efficiencies and a running sum; keep only the top k efficiencies.",
      "At each step, candidate = (running efficiency sum) * currentSpeed; track the max.",
    ],
    solutionSteps: [
      "Pair (speed, efficiency); sort by speed descending.",
      "Walk the list; push each efficiency into a min-heap and add to sumEff. If heap size exceeds k, pop the smallest efficiency and subtract it.",
      "Candidate performance = sumEff * thisSpeed (thisSpeed is the current minimum). Update best.",
      "Return best % (1e9+7).",
    ],
    code: {
      python: `import heapq

def max_performance(n, speed, efficiency, k):
    MOD = 10**9 + 7
    engineers = sorted(zip(speed, efficiency), reverse=True)
    heap = []
    sum_eff = 0
    best = 0
    for spd, eff in engineers:
        heapq.heappush(heap, eff)
        sum_eff += eff
        if len(heap) > k:
            sum_eff -= heapq.heappop(heap)
        best = max(best, sum_eff * spd)
    return best % MOD
`,
      java: `import java.util.*;

class Solution {
    public int maxPerformance(int n, int[] speed, int[] efficiency, int k) {
        final int MOD = 1_000_000_007;
        int[][] eng = new int[n][2];
        for (int i = 0; i < n; i++) { eng[i][0] = speed[i]; eng[i][1] = efficiency[i]; }
        Arrays.sort(eng, (a, b) -> b[0] - a[0]);
        PriorityQueue<Integer> heap = new PriorityQueue<>();
        long sumEff = 0, best = 0;
        for (int[] e : eng) {
            heap.offer(e[1]);
            sumEff += e[1];
            if (heap.size() > k) sumEff -= heap.poll();
            best = Math.max(best, sumEff * e[0]);
        }
        return (int) (best % MOD);
    }
}
`,
      cpp: `#include <vector>
#include <queue>
#include <algorithm>
using namespace std;

int maxPerformance(int n, vector<int>& speed, vector<int>& efficiency, int k) {
    const long long MOD = 1000000007;
    vector<pair<int,int>> eng(n);
    for (int i = 0; i < n; i++) eng[i] = {speed[i], efficiency[i]};
    sort(eng.rbegin(), eng.rend());
    priority_queue<int, vector<int>, greater<int>> heap;
    long long sumEff = 0, best = 0;
    for (auto& [spd, eff] : eng) {
        heap.push(eff);
        sumEff += eff;
        if ((int)heap.size() > k) { sumEff -= heap.top(); heap.pop(); }
        best = max(best, sumEff * spd);
    }
    return (int)(best % MOD);
}
`,
    },
    complexity: { time: "O(n log n)", space: "O(n)" },
    pitfalls: [
      "Applying the modulo before taking the max — compare raw values, then reduce once at the end.",
      "Sorting by efficiency rather than speed; the SPEED is the gating minimum.",
      "Capping the heap incorrectly — keep at most k efficiencies, evicting the smallest.",
    ],
    edgeCases: [
      "k = 1 — best single model by speed*efficiency.",
      "All speeds equal — reduces to picking top-k efficiencies.",
      "Large efficiency sums needing 64-bit before the modulo.",
    ],
    whyItMatters:
      "Maximum Performance of a Team is the 'sort by the gating factor, heap the additive factor' pattern — the same shape behind any objective that multiplies a running sum by a sorted threshold.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 218 — pure_dsa · heap_priority_queue · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "hire-k-workers-min-cost",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "heap_priority_queue",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer", "software_engineer"],
    title: "Minimum Cost To Hire Exactly K Workers",
    framing:
      "You hire exactly k workers from a pool. Two fairness rules: each worker is paid in proportion to their quality relative to others in the group, and every worker must receive at least their stated minimum wage. Minimize the total payroll.",
    statement:
      "Given quality[i] and wage[i] for n workers and an integer k, hire exactly k workers so that within the group (a) pay is proportional to quality, and (b) everyone earns at least their wage. Return the minimum total cost. Answers within 1e-5 of the true value are accepted.",
    inputFormat: "Arrays quality and wage of length n, and integer k.",
    outputFormat: "The minimum total payment as a floating-point number.",
    constraints: [
      "1 ≤ k ≤ n ≤ 1e4",
      "1 ≤ quality[i], wage[i] ≤ 1e4",
    ],
    examples: [
      {
        input: "quality=[10,20,5] wage=[70,50,30] k=2",
        output: "105.00000",
        explanation: "Hire workers 0 and 2 at ratio 7: pay 70 + 35 = 105.",
      },
      {
        input: "quality=[3,1,10,10,1] wage=[4,8,2,2,7] k=3",
        output: "30.66667",
        explanation: "Optimal trio gives the minimum proportional payroll.",
      },
    ],
    approach: [
      "Each worker imposes a wage-per-quality ratio = wage/quality; the group's pay rate must be the MAX ratio among chosen workers.",
      "Sort workers by ratio ascending; iterate so the current worker's ratio is the group rate.",
      "Maintain a max-heap of qualities and a running quality sum capped at k (evict the largest quality to minimise cost).",
      "When exactly k are held, cost = ratio * sumQuality; track the minimum.",
    ],
    solutionSteps: [
      "Build (ratio, quality) pairs; sort by ratio ascending.",
      "Push qualities into a max-heap, add to sumQuality; if size exceeds k, pop the largest quality and subtract it.",
      "Once the heap holds k workers, compute candidate = ratio * sumQuality and keep the minimum.",
      "Return the best cost.",
    ],
    code: {
      python: `import heapq

def mincost_to_hire_workers(quality, wage, k):
    workers = sorted((w / q, q) for q, w in zip(quality, wage))
    heap = []
    sum_q = 0
    best = float("inf")
    for ratio, q in workers:
        heapq.heappush(heap, -q)
        sum_q += q
        if len(heap) > k:
            sum_q += heapq.heappop(heap)  # pop is negative, so this subtracts
        if len(heap) == k:
            best = min(best, ratio * sum_q)
    return best
`,
      java: `import java.util.*;

class Solution {
    public double mincostToHireWorkers(int[] quality, int[] wage, int k) {
        int n = quality.length;
        double[][] workers = new double[n][2];
        for (int i = 0; i < n; i++) {
            workers[i][0] = (double) wage[i] / quality[i];
            workers[i][1] = quality[i];
        }
        Arrays.sort(workers, (a, b) -> Double.compare(a[0], b[0]));
        PriorityQueue<Double> heap = new PriorityQueue<>(Collections.reverseOrder());
        double sumQ = 0, best = Double.MAX_VALUE;
        for (double[] w : workers) {
            heap.offer(w[1]);
            sumQ += w[1];
            if (heap.size() > k) sumQ -= heap.poll();
            if (heap.size() == k) best = Math.min(best, w[0] * sumQ);
        }
        return best;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
#include <algorithm>
using namespace std;

double mincostToHireWorkers(vector<int>& quality, vector<int>& wage, int k) {
    int n = quality.size();
    vector<pair<double,int>> workers(n);
    for (int i = 0; i < n; i++) workers[i] = {(double)wage[i] / quality[i], quality[i]};
    sort(workers.begin(), workers.end());
    priority_queue<int> heap;
    double sumQ = 0, best = 1e18;
    for (auto& [ratio, q] : workers) {
        heap.push(q);
        sumQ += q;
        if ((int)heap.size() > k) { sumQ -= heap.top(); heap.pop(); }
        if ((int)heap.size() == k) best = min(best, ratio * sumQ);
    }
    return best;
}
`,
    },
    complexity: { time: "O(n log n)", space: "O(n)" },
    pitfalls: [
      "Forgetting that the group pay rate is the MAX ratio — sorting by ratio makes the current worker that max.",
      "Evicting the smallest quality (a min-heap) — you must drop the LARGEST quality to lower cost.",
      "Computing cost before exactly k workers are present.",
    ],
    edgeCases: [
      "k = 1 — minimum of wage[i] (each pays their own minimum).",
      "k = n — single group; rate is the global max ratio.",
      "Workers with identical ratios.",
    ],
    whyItMatters:
      "Minimum Cost to Hire K Workers fuses sorting by a ratio with a size-capped heap — the same 'fix the gating ratio, optimise the rest greedily' structure recurs in budgeted selection problems.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 219 — pure_dsa · heap_priority_queue · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "space-out-repeated-tasks",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "heap_priority_queue",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "platform_engineer", "software_engineer"],
    title: "Reorder Tasks So Identical Ones Are K Apart",
    framing:
      "A job runner must emit a sequence of task types such that any two runs of the same type are separated by at least k other tasks (to respect a per-type cooldown). Produce any valid ordering, or report that none exists.",
    statement:
      "Given a string s of task labels and an integer k, rearrange the characters so identical characters are at least k apart. Return any valid rearrangement, or an empty string if impossible.",
    inputFormat: "A string s and an integer k.",
    outputFormat: "A valid rearranged string, or an empty string.",
    constraints: ["1 ≤ |s| ≤ 3e5", "0 ≤ k ≤ |s|", "Lowercase English letters."],
    examples: [
      {
        input: 's="aabbcc" k=3',
        output: "abcabc",
        explanation: "Each letter's repeats are 3 apart.",
      },
      {
        input: 's="aaabc" k=3',
        output: "",
        explanation: "'a' appears 3 times but cannot be spaced 3 apart in length 5.",
      },
    ],
    approach: [
      "Greedily place the most frequent remaining label first, using a max-heap keyed by remaining count.",
      "After placing a label, hold it in a cooldown queue for k steps before it can return to the heap.",
      "If the heap empties while characters remain in cooldown (and the result is shorter than s), it is impossible.",
    ],
    solutionSteps: [
      "Count frequencies; push (count, char) into a max-heap.",
      "Repeat: pop the top, append its char, decrement, and enqueue (char, count, readyTime = currentIndex + k) into a FIFO.",
      "When the front of the FIFO becomes ready, push it back into the heap.",
      "If the heap is empty but the FIFO still holds items before the string is complete, return empty.",
    ],
    code: {
      python: `import heapq
from collections import Counter, deque

def reorganize_k_distance(s, k):
    if k <= 1:
        return s
    counts = Counter(s)
    heap = [(-cnt, ch) for ch, cnt in counts.items()]
    heapq.heapify(heap)
    result = []
    wait = deque()  # (ready_index, neg_count, char)
    i = 0
    while heap or wait:
        if wait and wait[0][0] <= i:
            ready = wait.popleft()
            heapq.heappush(heap, (ready[1], ready[2]))
        if not heap:
            return ""
        negc, ch = heapq.heappop(heap)
        result.append(ch)
        if negc + 1 < 0:
            wait.append((i + k, negc + 1, ch))
        i += 1
    return "".join(result)
`,
      java: `import java.util.*;

class Solution {
    public String rearrangeString(String s, int k) {
        if (k <= 1) return s;
        Map<Character, Integer> counts = new HashMap<>();
        for (char ch : s.toCharArray()) counts.merge(ch, 1, Integer::sum);
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> b[1] - a[1]);
        for (Map.Entry<Character, Integer> e : counts.entrySet())
            heap.offer(new int[]{e.getKey(), e.getValue()});
        Queue<int[]> wait = new LinkedList<>(); // {char, count, readyIndex}
        StringBuilder sb = new StringBuilder();
        int i = 0;
        while (!heap.isEmpty() || !wait.isEmpty()) {
            if (!wait.isEmpty() && wait.peek()[2] <= i) {
                int[] r = wait.poll();
                heap.offer(new int[]{r[0], r[1]});
            }
            if (heap.isEmpty()) return "";
            int[] top = heap.poll();
            sb.append((char) top[0]);
            if (top[1] - 1 > 0) wait.offer(new int[]{top[0], top[1] - 1, i + k});
            i++;
        }
        return sb.toString();
    }
}
`,
      cpp: `#include <string>
#include <queue>
#include <unordered_map>
#include <array>
using namespace std;

string rearrangeString(string s, int k) {
    if (k <= 1) return s;
    unordered_map<char,int> counts;
    for (char ch : s) counts[ch]++;
    priority_queue<pair<int,char>> heap;
    for (auto& e : counts) heap.push({e.second, e.first});
    queue<array<int,3>> wait; // {count, char, readyIndex}
    string result;
    int i = 0;
    while (!heap.empty() || !wait.empty()) {
        if (!wait.empty() && wait.front()[2] <= i) {
            auto r = wait.front(); wait.pop();
            heap.push({r[0], (char)r[1]});
        }
        if (heap.empty()) return "";
        auto top = heap.top(); heap.pop();
        result += top.second;
        if (top.first - 1 > 0) wait.push({top.first - 1, top.second, i + k});
        i++;
    }
    return result;
}
`,
    },
    complexity: { time: "O(|s| log A)", space: "O(|s|)" },
    pitfalls: [
      "k <= 1 means no spacing constraint — return s directly to avoid index issues.",
      "Re-adding a label to the heap before its cooldown elapses.",
      "Declaring impossibility too early; only fail when the heap is empty but work remains.",
    ],
    edgeCases: [
      "k = 0 or 1 — any order works.",
      "Single distinct character repeated — impossible unless count is 1 or k ≤ 1.",
      "All distinct characters — trivially valid.",
    ],
    whyItMatters:
      "Rearrange String k Distance Apart is greedy scheduling with a cooldown queue — emit the most-pressing item, park it for k ticks — the same engine behind CPU task scheduling and rate-limited dispatch.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 220 — ai_applied · arrays_hashing · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-windows-in-sum-range",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 9,
    pattern: "arrays_hashing",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "ai_ml_engineer", "backend_engineer"],
    title: "Count Score Windows Whose Total Falls In A Band",
    framing:
      "A model emits a stream of signed reward deltas. For calibration you need to count how many contiguous windows have a total reward within a target band [lower, upper] — useful for spotting how often cumulative drift stays inside tolerance.",
    statement:
      "Given an integer array nums and two integers lower and upper, return the number of contiguous subarrays whose sum lies in the inclusive range [lower, upper].",
    inputFormat: "An integer array nums and integers lower and upper.",
    outputFormat: "The count of qualifying subarrays.",
    constraints: [
      "1 ≤ n ≤ 1e5",
      "-2^31 ≤ nums[i] ≤ 2^31 - 1",
      "-1e5 ≤ lower ≤ upper ≤ 1e5 (range of allowed sums may exceed int; use 64-bit)",
    ],
    examples: [
      {
        input: "nums=[-2,5,-1] lower=-2 upper=2",
        output: "3",
        explanation: "Subarrays [-2], [-1], [-2,5,-1] have sums -2, -1, 2 — all in range.",
      },
      {
        input: "nums=[0] lower=0 upper=0",
        output: "1",
        explanation: "The single subarray [0] sums to 0.",
      },
    ],
    approach: [
      "A subarray sum equals prefix[j] - prefix[i]; we need lower ≤ prefix[j] - prefix[i] ≤ upper.",
      "Use merge sort on the prefix-sum array: while merging, for each left index count right indices whose prefix difference lands in range.",
      "The two-pointer count during the merge runs in linear time per level, giving O(n log n) overall.",
    ],
    solutionSteps: [
      "Build prefix sums of length n+1.",
      "Run a modified merge sort over prefix. Before merging each pair of halves, for each i in the left half advance two pointers in the right half to count j with prefix[j]-prefix[i] in [lower, upper].",
      "Merge the halves to keep them sorted; accumulate the count.",
      "Return the total.",
    ],
    code: {
      python: `def count_range_sum(nums, lower, upper):
    prefix = [0]
    for x in nums:
        prefix.append(prefix[-1] + x)

    def sort_count(lo, hi):
        if hi - lo <= 1:
            return 0
        mid = (lo + hi) // 2
        count = sort_count(lo, mid) + sort_count(mid, hi)
        j = k = mid
        for left in prefix[lo:mid]:
            while j < hi and prefix[j] - left < lower:
                j += 1
            while k < hi and prefix[k] - left <= upper:
                k += 1
            count += k - j
        prefix[lo:hi] = sorted(prefix[lo:hi])
        return count

    return sort_count(0, len(prefix))
`,
      java: `class Solution {
    public int countRangeSum(int[] nums, int lower, int upper) {
        int n = nums.length;
        long[] prefix = new long[n + 1];
        for (int i = 0; i < n; i++) prefix[i + 1] = prefix[i] + nums[i];
        return sortCount(prefix, 0, n + 1, lower, upper, new long[n + 1]);
    }

    private int sortCount(long[] p, int lo, int hi, int lower, int upper, long[] tmp) {
        if (hi - lo <= 1) return 0;
        int mid = (lo + hi) >>> 1;
        int count = sortCount(p, lo, mid, lower, upper, tmp) + sortCount(p, mid, hi, lower, upper, tmp);
        int j = mid, k = mid;
        for (int i = lo; i < mid; i++) {
            while (j < hi && p[j] - p[i] < lower) j++;
            while (k < hi && p[k] - p[i] <= upper) k++;
            count += k - j;
        }
        // merge
        int a = lo, b = mid, t = lo;
        while (a < mid && b < hi) tmp[t++] = p[a] <= p[b] ? p[a++] : p[b++];
        while (a < mid) tmp[t++] = p[a++];
        while (b < hi) tmp[t++] = p[b++];
        System.arraycopy(tmp, lo, p, lo, hi - lo);
        return count;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

int countRangeSum(vector<int>& nums, int lower, int upper) {
    int n = nums.size();
    vector<long long> prefix(n + 1, 0);
    for (int i = 0; i < n; i++) prefix[i + 1] = prefix[i] + nums[i];
    vector<long long> tmp(n + 1);

    function<int(int,int)> sortCount = [&](int lo, int hi) -> int {
        if (hi - lo <= 1) return 0;
        int mid = (lo + hi) / 2;
        int count = sortCount(lo, mid) + sortCount(mid, hi);
        int j = mid, k = mid;
        for (int i = lo; i < mid; i++) {
            while (j < hi && prefix[j] - prefix[i] < lower) j++;
            while (k < hi && prefix[k] - prefix[i] <= upper) k++;
            count += k - j;
        }
        int a = lo, b = mid, t = lo;
        while (a < mid && b < hi) tmp[t++] = prefix[a] <= prefix[b] ? prefix[a++] : prefix[b++];
        while (a < mid) tmp[t++] = prefix[a++];
        while (b < hi) tmp[t++] = prefix[b++];
        for (int x = lo; x < hi; x++) prefix[x] = tmp[x];
        return count;
    };

    return sortCount(0, n + 1);
}
`,
    },
    complexity: { time: "O(n log n)", space: "O(n)" },
    pitfalls: [
      "Prefix sums overflow 32-bit — use 64-bit integers.",
      "Off-by-one in the two-pointer bounds: j uses strict <, k uses <=.",
      "Forgetting that prefix has n+1 entries (the empty prefix at index 0).",
    ],
    edgeCases: [
      "All negatives with a negative band.",
      "lower == upper — counts subarrays summing to that exact value.",
      "Single element in or out of range.",
    ],
    whyItMatters:
      "Count of Range Sum is divide-and-conquer counting over prefix sums — the merge-step two-pointer trick is the same machinery behind counting inversions and range-constrained pair queries at scale.",
    estimatedMinutes: 50,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 221 — pure_dsa · arrays_hashing · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-significant-value-drops",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "arrays_hashing",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer", "software_engineer"],
    title: "Count Significant Later Drops",
    framing:
      "A metric is sampled over time. You want to count 'significant drop' pairs: an earlier sample whose value is more than double a strictly later sample — these flag steep declines worth investigating.",
    statement:
      "Given an integer array nums, return the number of important reverse pairs: index pairs (i, j) with i < j and nums[i] > 2 * nums[j].",
    inputFormat: "An integer array nums.",
    outputFormat: "The count of important reverse pairs.",
    constraints: ["1 ≤ n ≤ 5e4", "-2^31 ≤ nums[i] ≤ 2^31 - 1"],
    examples: [
      {
        input: "[1,3,2,3,1]",
        output: "2",
        explanation: "Pairs (1,4): 3>2*1, and (3,4): 3>2*1.",
      },
      {
        input: "[2,4,3,5,1]",
        output: "3",
        explanation: "(1,4):4>2, (2,4):3>2, (3,4):5>2.",
      },
    ],
    approach: [
      "Use merge sort. While merging two sorted halves, count pairs (i in left, j in right) with nums[i] > 2 * nums[j] before merging.",
      "Because both halves are sorted, a single forward two-pointer counts all qualifying pairs in linear time per merge.",
      "Then merge normally to keep the array sorted for higher levels.",
    ],
    solutionSteps: [
      "Recurse on [lo, mid) and [mid, hi).",
      "With both halves sorted, for each i in the left advance j in the right while nums[i] > 2*nums[j]; add (j - mid) to the count.",
      "Merge the two halves into sorted order.",
      "Return the accumulated count.",
    ],
    code: {
      python: `def reverse_pairs(nums):
    def sort_count(lo, hi):
        if hi - lo <= 1:
            return 0
        mid = (lo + hi) // 2
        count = sort_count(lo, mid) + sort_count(mid, hi)
        j = mid
        for i in range(lo, mid):
            while j < hi and nums[i] > 2 * nums[j]:
                j += 1
            count += j - mid
        nums[lo:hi] = sorted(nums[lo:hi])
        return count
    return sort_count(0, len(nums))
`,
      java: `class Solution {
    public int reversePairs(int[] nums) {
        return sortCount(nums, 0, nums.length, new int[nums.length]);
    }

    private int sortCount(int[] nums, int lo, int hi, int[] tmp) {
        if (hi - lo <= 1) return 0;
        int mid = (lo + hi) >>> 1;
        int count = sortCount(nums, lo, mid, tmp) + sortCount(nums, mid, hi, tmp);
        int j = mid;
        for (int i = lo; i < mid; i++) {
            while (j < hi && (long) nums[i] > 2L * nums[j]) j++;
            count += j - mid;
        }
        int a = lo, b = mid, t = lo;
        while (a < mid && b < hi) tmp[t++] = nums[a] <= nums[b] ? nums[a++] : nums[b++];
        while (a < mid) tmp[t++] = nums[a++];
        while (b < hi) tmp[t++] = nums[b++];
        System.arraycopy(tmp, lo, nums, lo, hi - lo);
        return count;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

int reversePairs(vector<int>& nums) {
    int n = nums.size();
    vector<int> tmp(n);
    function<int(int,int)> sortCount = [&](int lo, int hi) -> int {
        if (hi - lo <= 1) return 0;
        int mid = (lo + hi) / 2;
        int count = sortCount(lo, mid) + sortCount(mid, hi);
        int j = mid;
        for (int i = lo; i < mid; i++) {
            while (j < hi && (long long)nums[i] > 2LL * nums[j]) j++;
            count += j - mid;
        }
        int a = lo, b = mid, t = lo;
        while (a < mid && b < hi) tmp[t++] = nums[a] <= nums[b] ? nums[a++] : nums[b++];
        while (a < mid) tmp[t++] = nums[a++];
        while (b < hi) tmp[t++] = nums[b++];
        for (int x = lo; x < hi; x++) nums[x] = tmp[x];
        return count;
    };
    return sortCount(0, n);
}
`,
    },
    complexity: { time: "O(n log n)", space: "O(n)" },
    pitfalls: [
      "2 * nums[j] overflows 32-bit — compute the comparison in 64-bit.",
      "Counting during the merge step instead of in a separate pass before merging, which double-shifts pointers.",
      "Resetting the right pointer j for each left i — it should advance monotonically.",
    ],
    edgeCases: [
      "Strictly increasing array — zero pairs.",
      "Negative numbers where doubling flips comparisons.",
      "Single element — zero.",
    ],
    whyItMatters:
      "Reverse Pairs generalises inversion counting to a scaled comparison — the merge-sort counting framework adapts to any 'count ordered pairs satisfying a monotone predicate' problem.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 222 — pure_dsa · binary_search · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "partition-array-min-largest-sum",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "binary_search",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer", "platform_engineer"],
    title: "Split Workload Into K Parts Minimizing The Heaviest",
    framing:
      "A sequence of jobs (with fixed weights, processed in order) must be divided into k contiguous shards assigned to k workers. Minimize the load of the busiest worker — the maximum shard sum.",
    statement:
      "Given an integer array nums and an integer k, split nums into k non-empty contiguous subarrays so the largest subarray sum is minimized. Return that minimized largest sum.",
    inputFormat: "An integer array nums and an integer k.",
    outputFormat: "The minimized maximum subarray sum.",
    constraints: ["1 ≤ n ≤ 1000", "0 ≤ nums[i] ≤ 1e6", "1 ≤ k ≤ n"],
    examples: [
      {
        input: "nums=[7,2,5,10,8] k=2",
        output: "18",
        explanation: "Split [7,2,5] and [10,8] → max(14,18)=18, the best possible.",
      },
      {
        input: "nums=[1,2,3,4,5] k=2",
        output: "9",
        explanation: "[1,2,3] and [4,5] → max(6,9)=9.",
      },
    ],
    approach: [
      "Binary search the answer over the range [max(nums), sum(nums)].",
      "For a candidate cap, greedily count how many shards are needed so no shard exceeds the cap.",
      "If the required shards ≤ k, the cap is feasible (try smaller); otherwise increase the cap.",
    ],
    solutionSteps: [
      "lo = max(nums), hi = sum(nums).",
      "While lo < hi: mid = (lo+hi)/2; greedily walk nums accumulating into a shard, starting a new shard when adding would exceed mid.",
      "If shards needed ≤ k, set hi = mid; else lo = mid + 1.",
      "Return lo.",
    ],
    code: {
      python: `def split_array(nums, k):
    def feasible(cap):
        shards, cur = 1, 0
        for x in nums:
            if cur + x > cap:
                shards += 1
                cur = x
                if shards > k:
                    return False
            else:
                cur += x
        return True

    lo, hi = max(nums), sum(nums)
    while lo < hi:
        mid = (lo + hi) // 2
        if feasible(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo
`,
      java: `class Solution {
    public int splitArray(int[] nums, int k) {
        long lo = 0, hi = 0;
        for (int x : nums) { lo = Math.max(lo, x); hi += x; }
        while (lo < hi) {
            long mid = (lo + hi) / 2;
            if (feasible(nums, k, mid)) hi = mid;
            else lo = mid + 1;
        }
        return (int) lo;
    }

    private boolean feasible(int[] nums, int k, long cap) {
        int shards = 1;
        long cur = 0;
        for (int x : nums) {
            if (cur + x > cap) {
                shards++;
                cur = x;
                if (shards > k) return false;
            } else cur += x;
        }
        return true;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
#include <numeric>
using namespace std;

bool feasible(vector<int>& nums, int k, long long cap) {
    int shards = 1;
    long long cur = 0;
    for (int x : nums) {
        if (cur + x > cap) {
            shards++;
            cur = x;
            if (shards > k) return false;
        } else cur += x;
    }
    return true;
}

int splitArray(vector<int>& nums, int k) {
    long long lo = *max_element(nums.begin(), nums.end());
    long long hi = accumulate(nums.begin(), nums.end(), 0LL);
    while (lo < hi) {
        long long mid = (lo + hi) / 2;
        if (feasible(nums, k, mid)) hi = mid;
        else lo = mid + 1;
    }
    return (int)lo;
}
`,
    },
    complexity: { time: "O(n log(sum))", space: "O(1)" },
    pitfalls: [
      "Setting lo below max(nums) — a single element must fit in one shard.",
      "Greedy feasibility starting the shard count at 0 instead of 1.",
      "Sum overflow for large arrays — use 64-bit bounds.",
    ],
    edgeCases: [
      "k = 1 — answer is the total sum.",
      "k = n — answer is max(nums).",
      "Zeros in the array.",
    ],
    whyItMatters:
      "Split Array Largest Sum is the prototypical 'binary search on the answer' — pairing a monotone feasibility check with bisection solves a whole family of minimize-the-maximum partitioning problems.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 223 — indian_domain · binary_search · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "place-pumps-min-max-gap",
    version: 1,
    status: "pending_review",
    bucket: "indian_domain",
    batchNo: 9,
    pattern: "binary_search",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer", "software_engineer"],
    title: "Add Petrol Pumps To Minimize The Largest Gap",
    framing:
      "Existing petrol pumps sit at fixed kilometre markers along a national highway. You can add k new pumps anywhere between them. Place them to minimize the largest distance between adjacent pumps.",
    statement:
      "Given a sorted array stations of existing pump positions and an integer k (new pumps to add), return the minimum possible value of the maximum gap between adjacent pumps after insertion. Answers within 1e-6 of the true value are accepted.",
    inputFormat: "A sorted array stations of doubles/integers and an integer k.",
    outputFormat: "The minimized maximum adjacent gap as a floating-point number.",
    constraints: [
      "2 ≤ stations.length ≤ 2000",
      "0 ≤ stations[i] ≤ 1e8",
      "stations is strictly increasing.",
      "1 ≤ k ≤ 1e6",
    ],
    examples: [
      {
        input: "stations=[1,2,3,4,5,6,7,8,9,10] k=9",
        output: "0.50000",
        explanation: "Adding 9 pumps lets every gap of size 1 be halved to 0.5.",
      },
      {
        input: "stations=[23,24,36,39,46,56,57,65,84,98] k=1",
        output: "14.00000",
        explanation: "Splitting the largest gap (28, between 56 and 84? actually 65→84=19, 39→46=7) gives 14.",
      },
    ],
    approach: [
      "Binary search the answer D (the maximum allowed gap), a real number.",
      "For a candidate D, each existing gap g needs ceil(g/D) - 1 extra pumps to keep sub-gaps ≤ D.",
      "If the total pumps needed ≤ k, D is feasible (try smaller); else increase D.",
      "Iterate enough times (or until hi - lo < 1e-6) for the required precision.",
    ],
    solutionSteps: [
      "Compute gaps between consecutive stations; lo = 0, hi = max gap.",
      "Binary search ~100 iterations: mid = (lo+hi)/2; needed = sum over gaps of floor(gap/mid) (extra pumps).",
      "If needed ≤ k, hi = mid; else lo = mid.",
      "Return hi.",
    ],
    code: {
      python: `def minmax_gas_dist(stations, k):
    gaps = [stations[i + 1] - stations[i] for i in range(len(stations) - 1)]
    lo, hi = 0.0, max(gaps)
    for _ in range(100):
        mid = (lo + hi) / 2
        if mid == 0:
            lo = mid
            continue
        needed = sum(int(g / mid) for g in gaps)
        if needed <= k:
            hi = mid
        else:
            lo = mid
    return hi
`,
      java: `class Solution {
    public double minmaxGasDist(int[] stations, int k) {
        double lo = 0, hi = 0;
        for (int i = 1; i < stations.length; i++)
            hi = Math.max(hi, stations[i] - stations[i - 1]);
        for (int iter = 0; iter < 100; iter++) {
            double mid = (lo + hi) / 2;
            if (mid == 0) { lo = mid; continue; }
            long needed = 0;
            for (int i = 1; i < stations.length; i++)
                needed += (long) ((stations[i] - stations[i - 1]) / mid);
            if (needed <= k) hi = mid;
            else lo = mid;
        }
        return hi;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

double minmaxGasDist(vector<int>& stations, int k) {
    double lo = 0, hi = 0;
    for (int i = 1; i < (int)stations.size(); i++)
        hi = max(hi, (double)(stations[i] - stations[i - 1]));
    for (int iter = 0; iter < 100; iter++) {
        double mid = (lo + hi) / 2;
        if (mid == 0) { lo = mid; continue; }
        long long needed = 0;
        for (int i = 1; i < (int)stations.size(); i++)
            needed += (long long)((stations[i] - stations[i - 1]) / mid);
        if (needed <= k) hi = mid;
        else lo = mid;
    }
    return hi;
}
`,
    },
    complexity: { time: "O(n · iterations)", space: "O(1)" },
    pitfalls: [
      "Binary searching over integer pump positions instead of the continuous gap value.",
      "Using ceil incorrectly — floor(gap/D) gives the number of EXTRA pumps to keep each sub-gap ≤ D.",
      "Too few iterations for the required 1e-6 precision.",
    ],
    edgeCases: [
      "k far larger than needed — gap shrinks toward 0.",
      "Uniform spacing — every gap split evenly.",
      "One dominant large gap absorbing most pumps.",
    ],
    whyItMatters:
      "Minimize Max Distance to Gas Station is binary search on a real-valued answer — the same continuous-bisection-with-feasibility approach used for capacity planning and SLA-bound resource spacing.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 224 — pure_dsa · backtracking · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "insert-operators-reach-target",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer"],
    title: "Insert Operators To Hit A Target Value",
    framing:
      "Given a string of digits, insert the binary operators +, -, and * between them (concatenating digits is allowed for multi-digit numbers) to form arithmetic expressions. Return every expression that evaluates to a target value.",
    statement:
      "Given a string num of digits and an integer target, return all expressions formed by inserting +, -, * between the digits so the expression evaluates to target. Operands may not have leading zeros (except the single digit 0). Standard operator precedence applies (* before + and -).",
    inputFormat: "A digit string num and an integer target.",
    outputFormat: "A list of valid expression strings (any order).",
    constraints: [
      "1 ≤ |num| ≤ 10",
      "num consists of digits only.",
      "-2^31 ≤ target ≤ 2^31 - 1",
    ],
    examples: [
      {
        input: 'num="123" target=6',
        output: '["1*2*3","1+2+3"]',
        explanation: "Both evaluate to 6.",
      },
      {
        input: 'num="105" target=5',
        output: '["1*0+5","10-5"]',
        explanation: "Leading-zero operands like '05' are disallowed.",
      },
    ],
    approach: [
      "Backtrack over split points, building the expression left to right.",
      "Track the running evaluated value and the value of the last operand (to undo and re-apply for multiplication precedence).",
      "For '+', value += cur; for '-', value -= cur; for '*', value = value - prev + prev*cur (reverse the last add/sub then multiply).",
      "Skip operands with leading zeros.",
    ],
    solutionSteps: [
      "Recurse with (index, currentExpr, runningValue, prevOperand).",
      "At index 0, seed each starting operand with no operator (set prev = operand, value = operand).",
      "For each subsequent operand, try +, -, * updating value and prev accordingly.",
      "When the whole string is consumed and value == target, record the expression.",
    ],
    code: {
      python: `def add_operators(num, target):
    res = []
    n = len(num)

    def backtrack(idx, expr, value, prev):
        if idx == n:
            if value == target:
                res.append(expr)
            return
        for j in range(idx, n):
            if j > idx and num[idx] == "0":
                break  # leading zero
            cur_str = num[idx:j + 1]
            cur = int(cur_str)
            if idx == 0:
                backtrack(j + 1, cur_str, cur, cur)
            else:
                backtrack(j + 1, expr + "+" + cur_str, value + cur, cur)
                backtrack(j + 1, expr + "-" + cur_str, value - cur, -cur)
                backtrack(j + 1, expr + "*" + cur_str, value - prev + prev * cur, prev * cur)

    backtrack(0, "", 0, 0)
    return res
`,
      java: `import java.util.*;

class Solution {
    public List<String> addOperators(String num, int target) {
        List<String> res = new ArrayList<>();
        backtrack(num, target, 0, new StringBuilder(), 0, 0, res);
        return res;
    }

    private void backtrack(String num, int target, int idx, StringBuilder expr,
                           long value, long prev, List<String> res) {
        int n = num.length();
        if (idx == n) {
            if (value == target) res.add(expr.toString());
            return;
        }
        for (int j = idx; j < n; j++) {
            if (j > idx && num.charAt(idx) == '0') break;
            String curStr = num.substring(idx, j + 1);
            long cur = Long.parseLong(curStr);
            int len = expr.length();
            if (idx == 0) {
                expr.append(curStr);
                backtrack(num, target, j + 1, expr, cur, cur, res);
                expr.setLength(len);
            } else {
                expr.append("+").append(curStr);
                backtrack(num, target, j + 1, expr, value + cur, cur, res);
                expr.setLength(len);
                expr.append("-").append(curStr);
                backtrack(num, target, j + 1, expr, value - cur, -cur, res);
                expr.setLength(len);
                expr.append("*").append(curStr);
                backtrack(num, target, j + 1, expr, value - prev + prev * cur, prev * cur, res);
                expr.setLength(len);
            }
        }
    }
}
`,
      cpp: `#include <string>
#include <vector>
using namespace std;

void backtrack(const string& num, long target, int idx, string expr,
               long value, long prev, vector<string>& res) {
    int n = num.size();
    if (idx == n) {
        if (value == target) res.push_back(expr);
        return;
    }
    for (int j = idx; j < n; j++) {
        if (j > idx && num[idx] == '0') break;
        string curStr = num.substr(idx, j - idx + 1);
        long cur = stol(curStr);
        if (idx == 0) {
            backtrack(num, target, j + 1, curStr, cur, cur, res);
        } else {
            backtrack(num, target, j + 1, expr + "+" + curStr, value + cur, cur, res);
            backtrack(num, target, j + 1, expr + "-" + curStr, value - cur, -cur, res);
            backtrack(num, target, j + 1, expr + "*" + curStr, value - prev + prev * cur, prev * cur, res);
        }
    }
}

vector<string> addOperators(string num, int target) {
    vector<string> res;
    backtrack(num, (long)target, 0, "", 0, 0, res);
    return res;
}
`,
    },
    complexity: { time: "O(4^n)", space: "O(n) recursion depth" },
    pitfalls: [
      "Mishandling multiplication precedence — must undo the previous operand then multiply: value - prev + prev*cur.",
      "Allowing operands with leading zeros like '05'.",
      "Integer overflow on intermediate values — use 64-bit.",
    ],
    edgeCases: [
      "Single digit equal/unequal to target.",
      "Numbers with internal zeros (e.g. '105').",
      "No valid expression — empty result.",
    ],
    whyItMatters:
      "Expression Add Operators is backtracking with a carried 'previous operand' for precedence — the reverse-and-reapply trick for * is the core idea behind incremental expression evaluation in parsers.",
    estimatedMinutes: 50,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 225 — pure_dsa · backtracking · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "minimum-removals-valid-expression",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "frontend_engineer", "backend_engineer"],
    title: "Fewest Deletions To Balance Parentheses",
    framing:
      "A user-typed filter expression has stray parentheses. Remove the minimum number of parenthesis characters so the expression becomes valid, and return all distinct results achievable with that minimum number of removals.",
    statement:
      "Given a string s containing letters and parentheses, remove the minimum number of invalid parentheses to make the string valid. Return all unique valid strings achievable with that minimum removal count.",
    inputFormat: "A string s of letters, '(' and ')'.",
    outputFormat: "A list of all distinct valid strings with minimal removals.",
    constraints: ["1 ≤ |s| ≤ 25", "s contains letters and parentheses only.", "At most 20 parentheses."],
    examples: [
      {
        input: 's="()())()"',
        output: '["()()()","(())()"]',
        explanation: "Removing one ')' yields both valid strings.",
      },
      {
        input: 's="(a)())()"',
        output: '["(a)()()","(a())()"]',
        explanation: "One removal suffices; letters are untouched.",
      },
    ],
    approach: [
      "First compute how many '(' and ')' must be removed by a single scan.",
      "DFS over the string deciding to keep or drop each parenthesis, bounded by the removal budgets.",
      "Validate completed strings and collect unique results; a set deduplicates.",
      "Alternatively, BFS level by level returning the first level that yields any valid string.",
    ],
    solutionSteps: [
      "Scan to count surplus '(' (left) and ')' (right) to remove.",
      "DFS(index, leftRem, rightRem, openCount, current): skip a parenthesis if budget allows; always option to keep.",
      "Prune when openCount < 0 or budgets go negative.",
      "At the end, if budgets are 0 and openCount is 0, add the built string to a result set.",
    ],
    code: {
      python: `def remove_invalid_parentheses(s):
    left = right = 0
    for ch in s:
        if ch == "(":
            left += 1
        elif ch == ")":
            if left > 0:
                left -= 1
            else:
                right += 1
    res = set()

    def dfs(i, l_rem, r_rem, open_cnt, cur):
        if i == len(s):
            if l_rem == 0 and r_rem == 0 and open_cnt == 0:
                res.add(cur)
            return
        ch = s[i]
        # option to remove a parenthesis
        if ch == "(" and l_rem > 0:
            dfs(i + 1, l_rem - 1, r_rem, open_cnt, cur)
        elif ch == ")" and r_rem > 0:
            dfs(i + 1, l_rem, r_rem - 1, open_cnt, cur)
        # option to keep the character
        if ch == "(":
            dfs(i + 1, l_rem, r_rem, open_cnt + 1, cur + ch)
        elif ch == ")":
            if open_cnt > 0:
                dfs(i + 1, l_rem, r_rem, open_cnt - 1, cur + ch)
        else:
            dfs(i + 1, l_rem, r_rem, open_cnt, cur + ch)

    dfs(0, left, right, 0, "")
    return list(res)
`,
      java: `import java.util.*;

class Solution {
    public List<String> removeInvalidParentheses(String s) {
        int left = 0, right = 0;
        for (char ch : s.toCharArray()) {
            if (ch == '(') left++;
            else if (ch == ')') { if (left > 0) left--; else right++; }
        }
        Set<String> res = new HashSet<>();
        dfs(s, 0, left, right, 0, new StringBuilder(), res);
        return new ArrayList<>(res);
    }

    private void dfs(String s, int i, int lRem, int rRem, int open, StringBuilder cur, Set<String> res) {
        if (i == s.length()) {
            if (lRem == 0 && rRem == 0 && open == 0) res.add(cur.toString());
            return;
        }
        char ch = s.charAt(i);
        int len = cur.length();
        if (ch == '(' && lRem > 0) dfs(s, i + 1, lRem - 1, rRem, open, cur, res);
        else if (ch == ')' && rRem > 0) dfs(s, i + 1, lRem, rRem - 1, open, cur, res);
        if (ch == '(') {
            dfs(s, i + 1, lRem, rRem, open + 1, cur.append(ch), res);
            cur.setLength(len);
        } else if (ch == ')') {
            if (open > 0) { dfs(s, i + 1, lRem, rRem, open - 1, cur.append(ch), res); cur.setLength(len); }
        } else {
            dfs(s, i + 1, lRem, rRem, open, cur.append(ch), res);
            cur.setLength(len);
        }
    }
}
`,
      cpp: `#include <string>
#include <vector>
#include <unordered_set>
using namespace std;

void dfs(const string& s, int i, int lRem, int rRem, int open, string cur, unordered_set<string>& res) {
    if (i == (int)s.size()) {
        if (lRem == 0 && rRem == 0 && open == 0) res.insert(cur);
        return;
    }
    char ch = s[i];
    if (ch == '(' && lRem > 0) dfs(s, i + 1, lRem - 1, rRem, open, cur, res);
    else if (ch == ')' && rRem > 0) dfs(s, i + 1, lRem, rRem - 1, open, cur, res);
    if (ch == '(') dfs(s, i + 1, lRem, rRem, open + 1, cur + ch, res);
    else if (ch == ')') { if (open > 0) dfs(s, i + 1, lRem, rRem, open - 1, cur + ch, res); }
    else dfs(s, i + 1, lRem, rRem, open, cur + ch, res);
}

vector<string> removeInvalidParentheses(string s) {
    int left = 0, right = 0;
    for (char ch : s) {
        if (ch == '(') left++;
        else if (ch == ')') { if (left > 0) left--; else right++; }
    }
    unordered_set<string> res;
    dfs(s, 0, left, right, 0, "", res);
    return vector<string>(res.begin(), res.end());
}
`,
    },
    complexity: { time: "O(2^n) worst case", space: "O(n) depth + result set" },
    pitfalls: [
      "Not deduplicating results — identical removals from repeated parentheses produce duplicates.",
      "Allowing openCount to go negative (an unmatched ')').",
      "Removing letters; only parentheses may be deleted.",
    ],
    edgeCases: [
      "Already valid — return the original (zero removals).",
      "All parentheses removable to empty/letters-only.",
      "String with no parentheses — return it unchanged.",
    ],
    whyItMatters:
      "Remove Invalid Parentheses is bounded backtracking: precomputing the exact removal budget prunes the search to only minimal solutions — the same budget-first idea behind minimal-edit repair tools.",
    estimatedMinutes: 50,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 226 — pure_dsa · stack_queue · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "evict-max-frequency-token",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "stack_queue",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer", "software_engineer"],
    title: "Pop The Most Frequent Recent Item",
    framing:
      "Design a counter-aware stack. push(x) records x; pop() removes and returns the value that has been pushed most often. Ties go to the value pushed most recently. Both operations must be O(1) amortised.",
    statement:
      "Implement a FreqStack supporting push(val) and pop(). pop() removes and returns the most frequent element; if several share the top frequency, return the one closest to the top (most recently pushed among them).",
    inputFormat: "A sequence of push(val) and pop() operations.",
    outputFormat: "The value returned by each pop() call.",
    constraints: [
      "0 ≤ val ≤ 1e9",
      "At most 2e4 calls total.",
      "pop() is only called on a non-empty stack.",
    ],
    examples: [
      {
        input: "push(5),push(7),push(5),push(7),push(4),push(5),pop(),pop(),pop(),pop()",
        output: "5,7,5,4",
        explanation: "5 has freq 3 → pop 5; then 5 and 7 tie at freq 2, 7 is more recent → pop 7; then 5 (freq 2) → pop 5; then 4,7 tie at freq 1, 4 more recent → pop 4.",
      },
      {
        input: "push(1),push(1),pop(),pop()",
        output: "1,1",
        explanation: "Both pops return 1.",
      },
    ],
    approach: [
      "Maintain freq: value → current count, and group: frequency → stack of values pushed at that frequency.",
      "push(x): increment freq[x] to f, append x to group[f].",
      "pop(): take from group[maxFreq], decrement freq of that value, and lower maxFreq if group[maxFreq] becomes empty.",
      "The group stacks naturally encode recency within each frequency tier.",
    ],
    solutionSteps: [
      "Initialise freq map, group map (freq → list), and maxFreq = 0.",
      "On push, f = ++freq[x]; maxFreq = max(maxFreq, f); group[f].push(x).",
      "On pop, x = group[maxFreq].pop(); freq[x] -= 1; if group[maxFreq] empty, maxFreq -= 1; return x.",
    ],
    code: {
      python: `from collections import defaultdict

class FreqStack:
    def __init__(self):
        self.freq = defaultdict(int)
        self.group = defaultdict(list)
        self.max_freq = 0

    def push(self, val):
        self.freq[val] += 1
        f = self.freq[val]
        if f > self.max_freq:
            self.max_freq = f
        self.group[f].append(val)

    def pop(self):
        val = self.group[self.max_freq].pop()
        self.freq[val] -= 1
        if not self.group[self.max_freq]:
            self.max_freq -= 1
        return val
`,
      java: `import java.util.*;

class FreqStack {
    private Map<Integer, Integer> freq = new HashMap<>();
    private Map<Integer, Deque<Integer>> group = new HashMap<>();
    private int maxFreq = 0;

    public void push(int val) {
        int f = freq.merge(val, 1, Integer::sum);
        maxFreq = Math.max(maxFreq, f);
        group.computeIfAbsent(f, k -> new ArrayDeque<>()).push(val);
    }

    public int pop() {
        Deque<Integer> stack = group.get(maxFreq);
        int val = stack.pop();
        freq.merge(val, -1, Integer::sum);
        if (stack.isEmpty()) maxFreq--;
        return val;
    }
}
`,
      cpp: `#include <unordered_map>
#include <vector>
using namespace std;

class FreqStack {
    unordered_map<int,int> freq;
    unordered_map<int, vector<int>> group;
    int maxFreq = 0;
public:
    void push(int val) {
        int f = ++freq[val];
        if (f > maxFreq) maxFreq = f;
        group[f].push_back(val);
    }

    int pop() {
        int val = group[maxFreq].back();
        group[maxFreq].pop_back();
        freq[val]--;
        if (group[maxFreq].empty()) maxFreq--;
        return val;
    }
};
`,
    },
    complexity: { time: "O(1) per operation", space: "O(n)" },
    pitfalls: [
      "Using a single heap keyed by frequency — recency ties are awkward and slower than the grouped-stacks design.",
      "Forgetting to decrement maxFreq when the top group empties.",
      "Not decrementing freq[val] on pop, corrupting future pushes.",
    ],
    edgeCases: [
      "All distinct values — behaves like a normal stack.",
      "Single value pushed repeatedly — pops in LIFO order.",
      "Interleaved pushes and pops.",
    ],
    whyItMatters:
      "Maximum Frequency Stack is the 'bucket by frequency, stack within bucket' design — layering structures so each gives O(1) is the same idea behind LFU caches and tiered priority dispatch.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 227 — pure_dsa · tries · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "concat-palindrome-pairs",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "tries",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer"],
    title: "Find All Palindrome-Forming Word Pairs",
    framing:
      "Given a dictionary of distinct words, find every ordered pair whose concatenation reads the same forwards and backwards — useful for detecting reversible token combinations.",
    statement:
      "Given a list of distinct words, return all index pairs (i, j), i != j, such that words[i] + words[j] is a palindrome.",
    inputFormat: "A list of distinct lowercase strings words.",
    outputFormat: "A list of [i, j] index pairs whose concatenation is a palindrome.",
    constraints: [
      "1 ≤ words.length ≤ 5000",
      "0 ≤ words[i].length ≤ 300",
      "Words are distinct, lowercase English.",
      "Sum of lengths ≤ 1e6.",
    ],
    examples: [
      {
        input: '["abcd","dcba","lls","s","sssll"]',
        output: "[[0,1],[1,0],[3,2],[2,4]]",
        explanation: "'abcddcba', 'dcbaabcd', 'slls', 'llssssll' are palindromes.",
      },
      {
        input: '["bat","tab","cat"]',
        output: "[[0,1],[1,0]]",
        explanation: "'battab' and 'tabbat' are palindromes.",
      },
    ],
    approach: [
      "Map each reversed word to its index in a hash map.",
      "For each word, split it at every position into (prefix, suffix).",
      "If prefix is a palindrome and the reverse of suffix exists, that word + reversed-suffix forms a palindrome; symmetrically for palindromic suffixes.",
      "Handle the empty-string and exact-reverse cases carefully to avoid duplicates.",
    ],
    solutionSteps: [
      "Build reverseIndex: reversed(word) → index.",
      "For each word i and each split point k: if word[:k] is a palindrome and reverse(word[k:]) is another word j, add [j, i]; if word[k:] is a palindrome (k>0 to avoid dup) and reverse(word[:k]) is word j, add [i, j].",
      "Special-case the empty string pairing with palindromes.",
      "Return all collected pairs.",
    ],
    code: {
      python: `def palindrome_pairs(words):
    rev = {w[::-1]: i for i, w in enumerate(words)}
    res = []

    def is_pal(sub):
        return sub == sub[::-1]

    for i, w in enumerate(words):
        n = len(w)
        for k in range(n + 1):
            prefix, suffix = w[:k], w[k:]
            # case 1: prefix palindrome, reversed suffix is a word -> j + i
            if is_pal(prefix):
                j = rev.get(suffix)
                if j is not None and j != i:
                    res.append([j, i])
            # case 2: suffix palindrome, reversed prefix is a word -> i + j
            if k != n and is_pal(suffix):
                j = rev.get(prefix)
                if j is not None and j != i:
                    res.append([i, j])
    return res
`,
      java: `import java.util.*;

class Solution {
    public List<List<Integer>> palindromePairs(String[] words) {
        Map<String, Integer> rev = new HashMap<>();
        for (int i = 0; i < words.length; i++)
            rev.put(new StringBuilder(words[i]).reverse().toString(), i);
        List<List<Integer>> res = new ArrayList<>();
        for (int i = 0; i < words.length; i++) {
            String w = words[i];
            int n = w.length();
            for (int k = 0; k <= n; k++) {
                String prefix = w.substring(0, k), suffix = w.substring(k);
                if (isPal(prefix)) {
                    Integer j = rev.get(suffix);
                    if (j != null && j != i) res.add(Arrays.asList(j, i));
                }
                if (k != n && isPal(suffix)) {
                    Integer j = rev.get(prefix);
                    if (j != null && j != i) res.add(Arrays.asList(i, j));
                }
            }
        }
        return res;
    }

    private boolean isPal(String s) {
        int lo = 0, hi = s.length() - 1;
        while (lo < hi) if (s.charAt(lo++) != s.charAt(hi--)) return false;
        return true;
    }
}
`,
      cpp: `#include <vector>
#include <string>
#include <unordered_map>
#include <algorithm>
using namespace std;

bool isPal(const string& s) {
    int lo = 0, hi = s.size() - 1;
    while (lo < hi) if (s[lo++] != s[hi--]) return false;
    return true;
}

vector<vector<int>> palindromePairs(vector<string>& words) {
    unordered_map<string,int> rev;
    for (int i = 0; i < (int)words.size(); i++) {
        string r = words[i];
        reverse(r.begin(), r.end());
        rev[r] = i;
    }
    vector<vector<int>> res;
    for (int i = 0; i < (int)words.size(); i++) {
        string w = words[i];
        int n = w.size();
        for (int k = 0; k <= n; k++) {
            string prefix = w.substr(0, k), suffix = w.substr(k);
            if (isPal(prefix)) {
                auto it = rev.find(suffix);
                if (it != rev.end() && it->second != i) res.push_back({it->second, i});
            }
            if (k != n && isPal(suffix)) {
                auto it = rev.find(prefix);
                if (it != rev.end() && it->second != i) res.push_back({i, it->second});
            }
        }
    }
    return res;
}
`,
    },
    complexity: { time: "O(n · L²)", space: "O(n · L)" },
    pitfalls: [
      "Double-counting the empty-string and full-reverse cases — the k != n guard on case 2 prevents duplicates.",
      "Comparing a word against its own reverse-index entry (j == i must be excluded).",
      "O(n² · L) brute force times out for large dictionaries.",
    ],
    edgeCases: [
      "An empty string present, pairing with any palindrome word.",
      "A word and its exact reverse both present.",
      "Single-character words.",
    ],
    whyItMatters:
      "Palindrome Pairs combines reverse-hashing with palindrome splitting — decomposing a string into prefix/suffix and querying a complement map is a versatile pattern for pairwise concatenation problems.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 228 — ai_applied · tries · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "suffix-stream-keyword-trigger",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 9,
    pattern: "tries",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "backend_engineer", "software_engineer"],
    title: "Trigger When A Streamed Suffix Matches A Keyword",
    framing:
      "A streaming moderation layer reads characters of a model's output one at a time. It must fire the instant the most recent characters spell any banned keyword. Design a matcher that, after each character, reports whether some watch-word is a suffix of the stream so far.",
    statement:
      "Implement StreamChecker(words) and a method query(letter) that returns true if any word in the initial list is a suffix of the characters queried so far (in order). Characters arrive one at a time.",
    inputFormat: "A list words for construction; a sequence of single-character query() calls.",
    outputFormat: "A boolean for each query indicating a suffix match.",
    constraints: [
      "1 ≤ words.length ≤ 2000",
      "1 ≤ word length ≤ 200",
      "Up to 4e4 query() calls.",
      "Lowercase English letters.",
    ],
    examples: [
      {
        input: 'words=["cd","f","kl"]; query c,a,b,c,d → ...,true; then f → true',
        output: "false,false,false,false,true,true",
        explanation: "After 'cd' arrives the suffix matches 'cd'; later 'f' matches 'f'.",
      },
      {
        input: 'words=["abc"]; query a,b,c',
        output: "false,false,true",
        explanation: "The suffix 'abc' matches after the third character.",
      },
    ],
    approach: [
      "Insert every word REVERSED into a trie.",
      "Keep a rolling buffer of recent characters (bounded by the longest word).",
      "On each query, walk the trie from the root following the buffer from newest to oldest; if any node is a word end, return true.",
      "Stop early when the path falls off the trie.",
    ],
    solutionSteps: [
      "Build a trie of reversed words; track the maximum word length.",
      "Maintain a deque (or list) of recent letters capped at maxLen.",
      "query(letter): append letter; iterate the buffer backwards, descending the trie; return true if a node marks end-of-word, false if the descent breaks.",
    ],
    code: {
      python: `from collections import deque

class StreamChecker:
    def __init__(self, words):
        self.trie = {}
        self.max_len = 0
        for w in words:
            node = self.trie
            for ch in reversed(w):
                node = node.setdefault(ch, {})
            node["$"] = True
            self.max_len = max(self.max_len, len(w))
        self.buf = deque()

    def query(self, letter):
        self.buf.appendleft(letter)
        while len(self.buf) > self.max_len:
            self.buf.pop()
        node = self.trie
        for ch in self.buf:
            if ch not in node:
                return False
            node = node[ch]
            if "$" in node:
                return True
        return False
`,
      java: `import java.util.*;

class StreamChecker {
    private static class Node {
        Map<Character, Node> next = new HashMap<>();
        boolean end = false;
    }
    private Node root = new Node();
    private int maxLen = 0;
    private Deque<Character> buf = new ArrayDeque<>();

    public StreamChecker(String[] words) {
        for (String w : words) {
            Node node = root;
            for (int i = w.length() - 1; i >= 0; i--) {
                char ch = w.charAt(i);
                node = node.next.computeIfAbsent(ch, k -> new Node());
            }
            node.end = true;
            maxLen = Math.max(maxLen, w.length());
        }
    }

    public boolean query(char letter) {
        buf.offerFirst(letter);
        while (buf.size() > maxLen) buf.pollLast();
        Node node = root;
        for (char ch : buf) {
            node = node.next.get(ch);
            if (node == null) return false;
            if (node.end) return true;
        }
        return false;
    }
}
`,
      cpp: `#include <string>
#include <vector>
#include <deque>
#include <unordered_map>
using namespace std;

class StreamChecker {
    struct Node {
        unordered_map<char, Node*> next;
        bool end = false;
    };
    Node* root = new Node();
    int maxLen = 0;
    deque<char> buf;
public:
    StreamChecker(vector<string>& words) {
        for (auto& w : words) {
            Node* node = root;
            for (int i = w.size() - 1; i >= 0; i--) {
                char ch = w[i];
                if (!node->next.count(ch)) node->next[ch] = new Node();
                node = node->next[ch];
            }
            node->end = true;
            maxLen = max(maxLen, (int)w.size());
        }
    }

    bool query(char letter) {
        buf.push_front(letter);
        while ((int)buf.size() > maxLen) buf.pop_back();
        Node* node = root;
        for (char ch : buf) {
            auto it = node->next.find(ch);
            if (it == node->next.end()) return false;
            node = it->second;
            if (node->end) return true;
        }
        return false;
    }
};
`,
    },
    complexity: { time: "O(maxLen) per query", space: "O(total word length)" },
    pitfalls: [
      "Inserting words forwards — suffix matching requires the REVERSED trie walked from the newest character.",
      "Letting the buffer grow unbounded; cap it at the longest word.",
      "Returning only at the end instead of as soon as any end-of-word node is hit.",
    ],
    edgeCases: [
      "Single-character watch-words trigger on that character.",
      "Overlapping words sharing suffixes.",
      "Long streams with rare matches.",
    ],
    whyItMatters:
      "Stream of Characters is a reversed-trie suffix automaton — matching the tail of an online stream against a keyword set is exactly how streaming guardrails and intrusion detectors fire in real time.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 229 — pure_dsa · trees · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "fix-two-swapped-bst-nodes",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Repair A BST With Two Swapped Nodes",
    framing:
      "A pricing tree stored as a binary search tree got corrupted: exactly two node values were swapped by mistake. Restore the BST by swapping them back, without changing the tree's structure.",
    statement:
      "Given the root of a binary search tree where exactly two nodes had their values swapped, recover the tree so it is a valid BST again. Do it in place; an O(1)-space (Morris traversal) solution is preferred but O(h) is acceptable.",
    inputFormat: "The root of a binary tree (a BST with two values swapped).",
    outputFormat: "The same tree with the two swapped values corrected.",
    constraints: ["1 ≤ node count ≤ 1e4", "-2^31 ≤ node value ≤ 2^31 - 1"],
    examples: [
      {
        input: "[1,3,null,null,2]",
        output: "[3,1,null,null,2]",
        explanation: "Nodes 1 and 3 were swapped; swapping back yields a valid BST.",
      },
      {
        input: "[3,1,4,null,null,2]",
        output: "[2,1,4,null,null,3]",
        explanation: "Nodes 2 and 3 were swapped.",
      },
    ],
    approach: [
      "An in-order traversal of a valid BST is strictly increasing; the swap creates one or two descents.",
      "Scan in order tracking the previous node. The first descent marks the first wrong node (prev); the second descent marks the second (current).",
      "If only one descent exists (adjacent swap), both wrong nodes are at that single descent.",
      "Swap the two identified node values.",
    ],
    solutionSteps: [
      "In-order traverse; keep prev. When prev.val > node.val, record first = prev (if unset) and always set second = node.",
      "After traversal, swap first.val and second.val.",
      "Morris traversal achieves O(1) extra space; recursive/stack uses O(h).",
    ],
    code: {
      python: `def recover_tree(root):
    first = second = prev = None
    node = root
    # Morris in-order traversal
    while node:
        if node.left:
            pred = node.left
            while pred.right and pred.right is not node:
                pred = pred.right
            if not pred.right:
                pred.right = node
                node = node.left
                continue
            else:
                pred.right = None
        if prev and prev.val > node.val:
            if not first:
                first = prev
            second = node
        prev = node
        node = node.right
    if first and second:
        first.val, second.val = second.val, first.val
`,
      java: `class Solution {
    public void recoverTree(TreeNode root) {
        TreeNode first = null, second = null, prev = null, node = root;
        while (node != null) {
            if (node.left != null) {
                TreeNode pred = node.left;
                while (pred.right != null && pred.right != node) pred = pred.right;
                if (pred.right == null) {
                    pred.right = node;
                    node = node.left;
                    continue;
                } else {
                    pred.right = null;
                }
            }
            if (prev != null && prev.val > node.val) {
                if (first == null) first = prev;
                second = node;
            }
            prev = node;
            node = node.right;
        }
        if (first != null && second != null) {
            int tmp = first.val; first.val = second.val; second.val = tmp;
        }
    }
}
`,
      cpp: `struct TreeNode { int val; TreeNode* left; TreeNode* right; };

void recoverTree(TreeNode* root) {
    TreeNode *first = nullptr, *second = nullptr, *prev = nullptr, *node = root;
    while (node) {
        if (node->left) {
            TreeNode* pred = node->left;
            while (pred->right && pred->right != node) pred = pred->right;
            if (!pred->right) {
                pred->right = node;
                node = node->left;
                continue;
            } else {
                pred->right = nullptr;
            }
        }
        if (prev && prev->val > node->val) {
            if (!first) first = prev;
            second = node;
        }
        prev = node;
        node = node->right;
    }
    if (first && second) {
        int tmp = first->val; first->val = second->val; second->val = tmp;
    }
}
`,
    },
    complexity: { time: "O(n)", space: "O(1) with Morris (O(h) recursive)" },
    pitfalls: [
      "Handling only the two-descent case and missing the adjacent-swap single-descent case.",
      "Setting second only on the first descent — second must always update to the latest descending node.",
      "With Morris traversal, forgetting to unlink the temporary threads, corrupting the tree.",
    ],
    edgeCases: [
      "The two swapped nodes are adjacent in in-order (one descent).",
      "Swapped root and a leaf.",
      "Minimal tree of two nodes.",
    ],
    whyItMatters:
      "Recover BST leans on the in-order-is-sorted invariant — detecting and repairing order violations with a single traversal is the same diagnostic used to validate and fix sorted structures.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 230 — pure_dsa · trees · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "vertical-column-tree-report",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "frontend_engineer", "data_engineer"],
    title: "Vertical Column Report Of A Tree",
    framing:
      "Render a binary tree as vertical columns (like an org chart printed top-to-bottom by column). Group node values by their horizontal column; within a column order by row, and break ties at the same row by value.",
    statement:
      "Given the root of a binary tree, return its vertical order traversal. The root is at column 0; a left child is column-1, a right child is column+1. Output columns left to right; within a column, order by row top to bottom; nodes sharing the same row and column are ordered by ascending value.",
    inputFormat: "The root of a binary tree.",
    outputFormat: "A list of lists — node values grouped by column, left to right.",
    constraints: ["1 ≤ node count ≤ 1000", "0 ≤ node value ≤ 1000"],
    examples: [
      {
        input: "[3,9,20,null,null,15,7]",
        output: "[[9],[3,15],[20],[7]]",
        explanation: "Columns -1,0,1,2 hold 9 | 3,15 | 20 | 7.",
      },
      {
        input: "[1,2,3,4,5,6,7]",
        output: "[[4],[2],[1,5,6],[3],[7]]",
        explanation: "At column 0, nodes 5 and 6 share row 2; ordered by value.",
      },
    ],
    approach: [
      "DFS/BFS recording (column, row, value) for every node.",
      "Group by column; sort columns ascending.",
      "Within each column, sort by row then by value, and emit the values.",
    ],
    solutionSteps: [
      "Traverse, carrying (col, row); collect tuples (col, row, val).",
      "Sort all tuples by (col, row, val).",
      "Group consecutive equal columns into output lists.",
    ],
    code: {
      python: `from collections import defaultdict

def vertical_traversal(root):
    nodes = []
    def dfs(node, row, col):
        if not node:
            return
        nodes.append((col, row, node.val))
        dfs(node.left, row + 1, col - 1)
        dfs(node.right, row + 1, col + 1)
    dfs(root, 0, 0)
    nodes.sort()
    res = []
    cols = defaultdict(list)
    for col, row, val in nodes:
        cols[col].append(val)
    for col in sorted(cols):
        res.append(cols[col])
    return res
`,
      java: `import java.util.*;

class Solution {
    public List<List<Integer>> verticalTraversal(TreeNode root) {
        List<int[]> nodes = new ArrayList<>();
        dfs(root, 0, 0, nodes);
        nodes.sort((a, b) -> a[0] != b[0] ? a[0] - b[0]
                          : a[1] != b[1] ? a[1] - b[1]
                          : a[2] - b[2]);
        List<List<Integer>> res = new ArrayList<>();
        int prevCol = Integer.MIN_VALUE;
        for (int[] nd : nodes) {
            if (nd[0] != prevCol) { res.add(new ArrayList<>()); prevCol = nd[0]; }
            res.get(res.size() - 1).add(nd[2]);
        }
        return res;
    }

    private void dfs(TreeNode node, int row, int col, List<int[]> nodes) {
        if (node == null) return;
        nodes.add(new int[]{col, row, node.val});
        dfs(node.left, row + 1, col - 1, nodes);
        dfs(node.right, row + 1, col + 1, nodes);
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

struct TreeNode { int val; TreeNode* left; TreeNode* right; };

void dfs(TreeNode* node, int row, int col, vector<array<int,3>>& nodes) {
    if (!node) return;
    nodes.push_back({col, row, node->val});
    dfs(node->left, row + 1, col - 1, nodes);
    dfs(node->right, row + 1, col + 1, nodes);
}

vector<vector<int>> verticalTraversal(TreeNode* root) {
    vector<array<int,3>> nodes;
    dfs(root, 0, 0, nodes);
    sort(nodes.begin(), nodes.end());
    vector<vector<int>> res;
    int prevCol = INT_MIN;
    for (auto& nd : nodes) {
        if (nd[0] != prevCol) { res.push_back({}); prevCol = nd[0]; }
        res.back().push_back(nd[2]);
    }
    return res;
}
`,
    },
    complexity: { time: "O(n log n)", space: "O(n)" },
    pitfalls: [
      "Forgetting the same-row, same-column tie-break by value (a common WA).",
      "Ordering by insertion/BFS order rather than explicitly by row then value.",
      "Mismatching the column convention (left = col-1).",
    ],
    edgeCases: [
      "Single node — one column [[val]].",
      "Skewed tree — each node in its own column.",
      "Multiple nodes colliding at one (row, col).",
    ],
    whyItMatters:
      "Vertical Order Traversal is coordinate-tagging plus a composite sort — assigning (col, row) keys and sorting lexicographically is the same approach behind layout engines and grid-snapping renderers.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 231 — pure_dsa · trees · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-cameras-cover-tree",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer"],
    title: "Minimum Cameras to Monitor a Facility Tree",
    framing:
      "A facility is laid out as a binary tree of rooms. A camera placed in a room monitors that room, its parent, and its immediate children. Place the fewest cameras so every room is monitored.",
    statement:
      "Given the root of a binary tree, install cameras on tree nodes. Each camera monitors its own node, its parent, and its direct children. Return the minimum number of cameras needed so that all nodes are monitored.",
    inputFormat:
      "The root of a binary tree. Node count in [1, 1000]; node values are irrelevant to the answer.",
    outputFormat: "An integer: the minimum number of cameras.",
    constraints: [
      "1 <= number of nodes <= 1000",
      "Each camera covers node + parent + children only (radius 1).",
    ],
    examples: [
      {
        input: "[0,0,null,0,0]",
        output: "1",
        explanation:
          "One camera at the only node with two children covers the root and both leaves.",
      },
      {
        input: "[0,0,null,0,null,0,null,null,0]",
        output: "2",
        explanation: "A left-skewed chain of 5 nodes needs two cameras.",
      },
    ],
    approach: [
      "Greedy from the leaves up: a camera is most valuable when placed on a leaf's PARENT, because it covers the leaf, the parent, and the parent's parent.",
      "Run a post-order DFS that returns one of three states for each node: 0 = not covered, 1 = covered but has no camera, 2 = has a camera.",
      "Treat null children as state 1 (covered, no camera) so leaves are seen as 'not covered'.",
      "If either child is state 0 (uncovered) → this node must hold a camera; increment count and return 2.",
      "Else if either child has a camera (state 2) → this node is covered without its own camera → return 1.",
      "Else (both children covered, no camera) → this node is not covered yet → return 0, deferring coverage to its parent.",
      "After the DFS, if the root itself returns 0 it is uncovered, so add one final camera.",
    ],
    solutionSteps: [
      "Define dfs(node) returning 0/1/2 as above.",
      "Base case: null → return 1.",
      "Recurse left and right first (post-order).",
      "Apply the three-way rule to decide this node's state, mutating a camera counter.",
      "At the top level, if dfs(root) == 0 add one camera.",
      "Return the counter.",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def min_camera_cover(root: TreeNode) -> int:
    cameras = 0
    NOT_COVERED, COVERED, HAS_CAMERA = 0, 1, 2

    def dfs(node):
        nonlocal cameras
        if node is None:
            return COVERED
        left = dfs(node.left)
        right = dfs(node.right)
        if left == NOT_COVERED or right == NOT_COVERED:
            cameras += 1
            return HAS_CAMERA
        if left == HAS_CAMERA or right == HAS_CAMERA:
            return COVERED
        return NOT_COVERED

    if dfs(root) == NOT_COVERED:
        cameras += 1
    return cameras
`,
      java: `class TreeNode {
    int val; TreeNode left, right;
    TreeNode(int v) { val = v; }
}

class Solution {
    private int cameras = 0;
    private static final int NOT_COVERED = 0, COVERED = 1, HAS_CAMERA = 2;

    public int minCameraCover(TreeNode root) {
        if (dfs(root) == NOT_COVERED) cameras++;
        return cameras;
    }

    private int dfs(TreeNode node) {
        if (node == null) return COVERED;
        int left = dfs(node.left);
        int right = dfs(node.right);
        if (left == NOT_COVERED || right == NOT_COVERED) {
            cameras++;
            return HAS_CAMERA;
        }
        if (left == HAS_CAMERA || right == HAS_CAMERA) return COVERED;
        return NOT_COVERED;
    }
}
`,
      cpp: `struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v) : val(v), left(nullptr), right(nullptr) {}
};

class Solution {
    int cameras = 0;
    static const int NOT_COVERED = 0, COVERED = 1, HAS_CAMERA = 2;

    int dfs(TreeNode* node) {
        if (!node) return COVERED;
        int left = dfs(node->left);
        int right = dfs(node->right);
        if (left == NOT_COVERED || right == NOT_COVERED) {
            cameras++;
            return HAS_CAMERA;
        }
        if (left == HAS_CAMERA || right == HAS_CAMERA) return COVERED;
        return NOT_COVERED;
    }
public:
    int minCameraCover(TreeNode* root) {
        if (dfs(root) == NOT_COVERED) cameras++;
        return cameras;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(h) recursion, h = tree height" },
    pitfalls: [
      "Treating null as 'not covered' — it must be 'covered' so leaves trigger a camera at the parent.",
      "Placing cameras on leaves instead of leaf-parents wastes coverage.",
      "Forgetting the final root check when the root ends 'not covered'.",
    ],
    edgeCases: [
      "Single node — needs one camera.",
      "Perfectly balanced tree.",
      "Long skewed chain — cameras every third node.",
    ],
    whyItMatters:
      "Minimum-camera placement is greedy dynamic programming on a tree with a tri-state return — the same bottom-up state-propagation that powers register allocation and dominator-based coverage analysis.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 232 — pure_dsa · backtracking · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "form-square-from-segments",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Assemble a Square From Cable Segments",
    framing:
      "A field crew has cable segments of given lengths. They must use every segment, unbent, to form the four equal sides of a perfect square. Decide whether it is possible.",
    statement:
      "Given an array matchsticks where matchsticks[i] is the length of the i-th stick, use ALL sticks to form a square. Each stick must be used exactly once and cannot be broken. Return true if a square can be formed, false otherwise.",
    inputFormat:
      "An integer array matchsticks of length [1, 15]; each length in [1, 10^8].",
    outputFormat: "A boolean: whether all sticks tile into a square.",
    constraints: [
      "1 <= matchsticks.length <= 15",
      "1 <= matchsticks[i] <= 10^8",
    ],
    examples: [
      {
        input: "[1,1,2,2,2]",
        output: "true",
        explanation: "Side length 2: sides are {2},{2},{2},{1,1}.",
      },
      {
        input: "[3,3,3,3,4]",
        output: "false",
        explanation: "Total 16 cannot be split into four sides of 4 using these lengths.",
      },
    ],
    approach: [
      "If the total sum is not divisible by 4, return false. The target side is sum/4.",
      "If any single stick exceeds the side length, return false.",
      "Sort descending so large sticks are placed first — this prunes failing branches early.",
      "Backtrack placing each stick into one of four side buckets, recursing to the next stick.",
      "Skip a bucket if adding the current stick overflows the side; skip buckets with equal current fill to avoid symmetric duplicate work.",
      "Succeed when all sticks are placed (all buckets equal the target by construction).",
    ],
    solutionSteps: [
      "Compute total; bail if total % 4 != 0; side = total / 4.",
      "Sort sticks descending.",
      "Maintain sides[4] partial sums.",
      "dfs(i): if i == n return true; try each of 4 buckets, prune on overflow and duplicate-fill, recurse.",
      "Return the dfs result from index 0.",
    ],
    code: {
      python: `def makesquare(matchsticks: list[int]) -> bool:
    total = sum(matchsticks)
    if total % 4 != 0:
        return False
    side = total // 4
    matchsticks.sort(reverse=True)
    if matchsticks[0] > side:
        return False
    sides = [0, 0, 0, 0]
    n = len(matchsticks)

    def dfs(i: int) -> bool:
        if i == n:
            return True
        for k in range(4):
            if sides[k] + matchsticks[i] > side:
                continue
            # skip buckets with identical fill to cut symmetric branches
            if k > 0 and sides[k] == sides[k - 1]:
                continue
            sides[k] += matchsticks[i]
            if dfs(i + 1):
                return True
            sides[k] -= matchsticks[i]
        return False

    return dfs(0)
`,
      java: `import java.util.*;

class Solution {
    public boolean makesquare(int[] matchsticks) {
        int total = 0;
        for (int m : matchsticks) total += m;
        if (total % 4 != 0) return false;
        int side = total / 4;
        Integer[] arr = new Integer[matchsticks.length];
        for (int i = 0; i < matchsticks.length; i++) arr[i] = matchsticks[i];
        Arrays.sort(arr, Collections.reverseOrder());
        if (arr[0] > side) return false;
        return dfs(arr, 0, new int[4], side);
    }

    private boolean dfs(Integer[] a, int i, int[] sides, int side) {
        if (i == a.length) return true;
        for (int k = 0; k < 4; k++) {
            if (sides[k] + a[i] > side) continue;
            if (k > 0 && sides[k] == sides[k - 1]) continue;
            sides[k] += a[i];
            if (dfs(a, i + 1, sides, side)) return true;
            sides[k] -= a[i];
        }
        return false;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
    bool dfs(vector<int>& a, int i, vector<int>& sides, int side) {
        if (i == (int)a.size()) return true;
        for (int k = 0; k < 4; k++) {
            if (sides[k] + a[i] > side) continue;
            if (k > 0 && sides[k] == sides[k - 1]) continue;
            sides[k] += a[i];
            if (dfs(a, i + 1, sides, side)) return true;
            sides[k] -= a[i];
        }
        return false;
    }
public:
    bool makesquare(vector<int>& matchsticks) {
        long total = 0;
        for (int m : matchsticks) total += m;
        if (total % 4 != 0) return false;
        int side = total / 4;
        sort(matchsticks.begin(), matchsticks.end(), greater<int>());
        if (matchsticks[0] > side) return false;
        vector<int> sides(4, 0);
        return dfs(matchsticks, 0, sides, side);
    }
};
`,
    },
    complexity: { time: "O(4^n) worst case, heavily pruned", space: "O(n) recursion" },
    pitfalls: [
      "Forgetting the divisibility-by-4 early exit.",
      "Not sorting descending — placement explodes without the large-first prune.",
      "Omitting the duplicate-fill skip, which revisits symmetric bucket assignments.",
    ],
    edgeCases: [
      "Fewer than 4 sticks — cannot form a square.",
      "All equal sticks divisible into 4 groups.",
      "One oversized stick larger than a side.",
    ],
    whyItMatters:
      "Partitioning a multiset into k equal-sum groups is the core of bin-packing and balanced shard assignment — and the symmetry-pruning here is exactly how schedulers avoid re-exploring equivalent placements.",
    estimatedMinutes: 38,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 233 — pure_dsa · math_geometry · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "most-collinear-sensors",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "math_geometry",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Most Sensors on a Single Straight Line",
    framing:
      "Sensors are placed at integer coordinates on a floor plan. To validate a calibration rail, find the largest number of sensors that lie on one straight line.",
    statement:
      "Given an array points where points[i] = [xi, yi], return the maximum number of points that lie on the same straight line.",
    inputFormat:
      "An array points of length [1, 300]; each point [x, y] with coordinates in [-10^4, 10^4]. Points may repeat.",
    outputFormat: "An integer: the maximum number of collinear points.",
    constraints: [
      "1 <= points.length <= 300",
      "-10^4 <= xi, yi <= 10^4",
      "All points are distinct unless explicitly duplicated.",
    ],
    examples: [
      {
        input: "[[1,1],[2,2],[3,3]]",
        output: "3",
        explanation: "All three lie on y = x.",
      },
      {
        input: "[[1,1],[3,2],[5,3],[4,1],[2,3],[1,4]]",
        output: "4",
        explanation: "Four points share one line.",
      },
    ],
    approach: [
      "For each anchor point i, count how many other points share the same slope relative to i — the most frequent slope gives the largest line through i.",
      "Represent slope as a reduced fraction (dy/gcd, dx/gcd) instead of a float to avoid precision loss.",
      "Normalize the sign so equivalent directions hash identically (e.g. force dx > 0, or dx == 0 → dy = 1, dy == 0 → dx = 1).",
      "Track duplicates of the anchor separately and add them to every line count.",
      "The answer is the max over all anchors of (best slope count + duplicates + 1 for the anchor).",
    ],
    solutionSteps: [
      "If n <= 2 return n.",
      "For each i, build a hashmap from normalized slope key to count, plus a duplicate counter.",
      "For each j > i, compute reduced (dy, dx), normalize sign, increment its bucket.",
      "local = max bucket value; update global best with local + dup + 1.",
      "Return the global best.",
    ],
    code: {
      python: `from math import gcd

def max_points(points: list[list[int]]) -> int:
    n = len(points)
    if n <= 2:
        return n
    best = 1
    for i in range(n):
        slopes = {}
        dup = 0
        local = 0
        for j in range(i + 1, n):
            dx = points[j][0] - points[i][0]
            dy = points[j][1] - points[i][1]
            if dx == 0 and dy == 0:
                dup += 1
                continue
            g = gcd(dx, dy)
            dx //= g
            dy //= g
            if dx < 0 or (dx == 0 and dy < 0):
                dx, dy = -dx, -dy
            key = (dx, dy)
            slopes[key] = slopes.get(key, 0) + 1
            local = max(local, slopes[key])
        best = max(best, local + dup + 1)
    return best
`,
      java: `import java.util.*;

class Solution {
    public int maxPoints(int[][] points) {
        int n = points.length;
        if (n <= 2) return n;
        int best = 1;
        for (int i = 0; i < n; i++) {
            Map<Long, Integer> slopes = new HashMap<>();
            int dup = 0, local = 0;
            for (int j = i + 1; j < n; j++) {
                int dx = points[j][0] - points[i][0];
                int dy = points[j][1] - points[i][1];
                if (dx == 0 && dy == 0) { dup++; continue; }
                int g = gcd(dx, dy);
                dx /= g; dy /= g;
                if (dx < 0 || (dx == 0 && dy < 0)) { dx = -dx; dy = -dy; }
                long key = ((long) dx) * 100003L + dy;
                int c = slopes.merge(key, 1, Integer::sum);
                local = Math.max(local, c);
            }
            best = Math.max(best, local + dup + 1);
        }
        return best;
    }

    private int gcd(int a, int b) {
        return b == 0 ? Math.abs(a) : gcd(b, a % b);
    }
}
`,
      cpp: `#include <vector>
#include <unordered_map>
#include <numeric>
#include <cstdlib>
using namespace std;

class Solution {
public:
    int maxPoints(vector<vector<int>>& points) {
        int n = points.size();
        if (n <= 2) return n;
        int best = 1;
        for (int i = 0; i < n; i++) {
            unordered_map<long long, int> slopes;
            int dup = 0, local = 0;
            for (int j = i + 1; j < n; j++) {
                int dx = points[j][0] - points[i][0];
                int dy = points[j][1] - points[i][1];
                if (dx == 0 && dy == 0) { dup++; continue; }
                int g = std::__gcd(abs(dx), abs(dy));
                dx /= g; dy /= g;
                if (dx < 0 || (dx == 0 && dy < 0)) { dx = -dx; dy = -dy; }
                long long key = (long long) dx * 100003LL + dy;
                local = max(local, ++slopes[key]);
            }
            best = max(best, local + dup + 1);
        }
        return best;
    }
};
`,
    },
    complexity: { time: "O(n^2)", space: "O(n) per anchor" },
    pitfalls: [
      "Using floating-point slopes — division loses precision and merges distinct lines.",
      "Not normalizing slope sign, so (1,2) and (-1,-2) hash apart.",
      "Forgetting to count duplicate points and add the anchor itself.",
    ],
    edgeCases: [
      "All points identical — answer equals n.",
      "Vertical line (dx = 0) and horizontal line (dy = 0).",
      "Two points only — answer is 2.",
    ],
    whyItMatters:
      "Max-points-on-a-line is the canonical exact-slope problem: reducing fractions with gcd instead of trusting floats is the same discipline behind robust computational-geometry and collision-detection code.",
    estimatedMinutes: 38,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 234 — pure_dsa · graphs · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "tile-puzzle-min-moves",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Solve the 2x3 Sliding Tile Puzzle",
    framing:
      "A 2x3 board holds tiles numbered 1–5 and one empty slot (0). A move slides a tile adjacent to the empty slot into it. Find the fewest moves to reach the solved board.",
    statement:
      "On a 2x3 board, tiles are numbered 1..5 with 0 as the blank. A move swaps 0 with an adjacent tile. Given the start board, return the least number of moves to reach [[1,2,3],[4,5,0]], or -1 if unreachable.",
    inputFormat:
      "A 2x3 integer matrix board containing a permutation of 0..5.",
    outputFormat: "An integer: minimum moves to solve, or -1 if impossible.",
    constraints: [
      "board.length == 2 and board[i].length == 3",
      "board contains exactly the values 0,1,2,3,4,5 once each.",
    ],
    examples: [
      {
        input: "[[1,2,3],[4,0,5]]",
        output: "1",
        explanation: "Slide the 5 left into the blank.",
      },
      {
        input: "[[1,2,3],[5,4,0]]",
        output: "-1",
        explanation: "This configuration is unsolvable.",
      },
    ],
    approach: [
      "Model each board as a node in a graph; edges connect boards that differ by one legal slide.",
      "Flatten the 2x3 board into a 6-char string as the state key; the goal is '123450'.",
      "Precompute, for each blank index 0..5, which indices it can swap with (board adjacency).",
      "Run BFS from the start string, expanding by swapping the blank with each neighbor index.",
      "Return the BFS depth on reaching '123450'; if the queue empties, return -1.",
    ],
    solutionSteps: [
      "Define neighbors = [[1,3],[0,2,4],[1,5],[0,4],[1,3,5],[2,4]] for the flattened 2x3 grid.",
      "Encode start as a string; if already goal return 0.",
      "BFS with a visited set; each level increments move count.",
      "For each state, find index of '0', swap with each neighbor to make children.",
      "Return depth at goal, else -1.",
    ],
    code: {
      python: `from collections import deque

def sliding_puzzle(board: list[list[int]]) -> int:
    start = "".join(str(v) for row in board for v in row)
    goal = "123450"
    neighbors = [[1, 3], [0, 2, 4], [1, 5], [0, 4], [1, 3, 5], [2, 4]]
    if start == goal:
        return 0
    seen = {start}
    q = deque([(start, 0)])
    while q:
        state, moves = q.popleft()
        z = state.index("0")
        for nb in neighbors[z]:
            lst = list(state)
            lst[z], lst[nb] = lst[nb], lst[z]
            nxt = "".join(lst)
            if nxt == goal:
                return moves + 1
            if nxt not in seen:
                seen.add(nxt)
                q.append((nxt, moves + 1))
    return -1
`,
      java: `import java.util.*;

class Solution {
    public int slidingPuzzle(int[][] board) {
        int[][] neighbors = {{1,3},{0,2,4},{1,5},{0,4},{1,3,5},{2,4}};
        StringBuilder sb = new StringBuilder();
        for (int[] row : board) for (int v : row) sb.append(v);
        String start = sb.toString(), goal = "123450";
        if (start.equals(goal)) return 0;
        Set<String> seen = new HashSet<>();
        seen.add(start);
        Deque<String> q = new ArrayDeque<>();
        q.add(start);
        int moves = 0;
        while (!q.isEmpty()) {
            moves++;
            for (int sz = q.size(); sz > 0; sz--) {
                String state = q.poll();
                int z = state.indexOf('0');
                for (int nb : neighbors[z]) {
                    char[] c = state.toCharArray();
                    char t = c[z]; c[z] = c[nb]; c[nb] = t;
                    String nxt = new String(c);
                    if (nxt.equals(goal)) return moves;
                    if (seen.add(nxt)) q.add(nxt);
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
#include <unordered_set>
using namespace std;

class Solution {
public:
    int slidingPuzzle(vector<vector<int>>& board) {
        vector<vector<int>> neighbors = {{1,3},{0,2,4},{1,5},{0,4},{1,3,5},{2,4}};
        string start, goal = "123450";
        for (auto& row : board) for (int v : row) start += ('0' + v);
        if (start == goal) return 0;
        unordered_set<string> seen{start};
        queue<string> q;
        q.push(start);
        int moves = 0;
        while (!q.empty()) {
            moves++;
            for (int sz = q.size(); sz > 0; sz--) {
                string state = q.front(); q.pop();
                int z = state.find('0');
                for (int nb : neighbors[z]) {
                    string nxt = state;
                    swap(nxt[z], nxt[nb]);
                    if (nxt == goal) return moves;
                    if (seen.insert(nxt).second) q.push(nxt);
                }
            }
        }
        return -1;
    }
};
`,
    },
    complexity: { time: "O(6! * 6) bounded by 720 states", space: "O(6!)" },
    pitfalls: [
      "Hardcoding adjacency wrong for the 2x3 wrap (index 2 and 3 are NOT neighbors).",
      "Forgetting to mark the start as visited, risking re-expansion.",
      "Using DFS instead of BFS — DFS does not give minimum moves.",
    ],
    edgeCases: [
      "Already solved — 0 moves.",
      "One move away.",
      "Unsolvable parity configuration — return -1.",
    ],
    whyItMatters:
      "The sliding puzzle is BFS over a state graph where states are encoded strings — the same shortest-path-in-implicit-graph technique used for solver engines, configuration search, and reachability checks.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 235 — pure_dsa · dp_2d · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "split-jobs-d-days-min-difficulty",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer", "data_engineer"],
    title: "Schedule a Job Pipeline Over D Days",
    framing:
      "A pipeline has ordered jobs, each with a difficulty. You must finish it in exactly D days, doing at least one job per day and keeping jobs in order. A day's difficulty is its hardest job; total difficulty is the sum across days. Minimize it.",
    statement:
      "Given jobDifficulty[i] (jobs must be done in order) and an integer d, schedule all jobs over exactly d days with at least one job per day. The difficulty of a day equals the maximum jobDifficulty among that day's jobs. Return the minimum total difficulty, or -1 if impossible (n < d).",
    inputFormat:
      "An integer array jobDifficulty of length n in [1, 300] and an integer d in [1, 10]. Values in [0, 1000].",
    outputFormat: "An integer: minimum total scheduling difficulty, or -1.",
    constraints: [
      "1 <= jobDifficulty.length <= 300",
      "0 <= jobDifficulty[i] <= 1000",
      "1 <= d <= 10",
    ],
    examples: [
      {
        input: "jobDifficulty = [6,5,4,3,2,1], d = 2",
        output: "7",
        explanation: "Day 1: [6,5,4,3,2] (max 6), Day 2: [1] (max 1) → 7.",
      },
      {
        input: "jobDifficulty = [9,9,9], d = 4",
        output: "-1",
        explanation: "Only 3 jobs cannot fill 4 days.",
      },
    ],
    approach: [
      "If n < d, it is impossible — return -1.",
      "Let dp[k][i] = min total difficulty to schedule jobs i..n-1 using k remaining days.",
      "For the last day (k == 1), the cost is simply the max of jobs i..n-1.",
      "For k > 1, try every cut: day k takes jobs i..j (j from i to n-k), paying max(i..j) plus dp[k-1][j+1].",
      "Carry a running max as j advances so each transition is O(1).",
      "Answer is dp[d][0]; build bottom-up over k = 1..d.",
    ],
    solutionSteps: [
      "n = len; if n < d return -1.",
      "Initialize dp for k=1 as suffix maxima.",
      "For k = 2..d: for each start i (with at least k jobs left), iterate the cut j keeping running max, take the min of max + dp[k-1][j+1].",
      "Return dp[d][0].",
    ],
    code: {
      python: `def min_difficulty(jobDifficulty: list[int], d: int) -> int:
    n = len(jobDifficulty)
    if n < d:
        return -1
    INF = float("inf")
    # dp[i] for current day-count k; start with k = 1 (suffix max)
    dp = [0] * (n + 1)
    dp[n] = INF  # sentinel: no jobs left is invalid mid-schedule
    run = -1
    for i in range(n - 1, -1, -1):
        run = max(run, jobDifficulty[i])
        dp[i] = run
    for k in range(2, d + 1):
        nxt = [INF] * (n + 1)
        # need at least k jobs remaining from i
        for i in range(n - k, -1, -1):
            cur_max = 0
            best = INF
            # day k covers i..j, leaving j+1.. for k-1 days
            for j in range(i, n - k + 1):
                cur_max = max(cur_max, jobDifficulty[j])
                if dp[j + 1] != INF:
                    best = min(best, cur_max + dp[j + 1])
            nxt[i] = best
        dp = nxt
    return dp[0]
`,
      java: `class Solution {
    public int minDifficulty(int[] jobDifficulty, int d) {
        int n = jobDifficulty.length;
        if (n < d) return -1;
        final int INF = Integer.MAX_VALUE / 2;
        int[] dp = new int[n + 1];
        dp[n] = INF;
        int run = -1;
        for (int i = n - 1; i >= 0; i--) {
            run = Math.max(run, jobDifficulty[i]);
            dp[i] = run;
        }
        for (int k = 2; k <= d; k++) {
            int[] nxt = new int[n + 1];
            java.util.Arrays.fill(nxt, INF);
            for (int i = n - k; i >= 0; i--) {
                int curMax = 0, best = INF;
                for (int j = i; j <= n - k; j++) {
                    curMax = Math.max(curMax, jobDifficulty[j]);
                    if (dp[j + 1] < INF) best = Math.min(best, curMax + dp[j + 1]);
                }
                nxt[i] = best;
            }
            dp = nxt;
        }
        return dp[0];
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
#include <climits>
using namespace std;

class Solution {
public:
    int minDifficulty(vector<int>& jobDifficulty, int d) {
        int n = jobDifficulty.size();
        if (n < d) return -1;
        const int INF = INT_MAX / 2;
        vector<int> dp(n + 1);
        dp[n] = INF;
        int run = -1;
        for (int i = n - 1; i >= 0; i--) {
            run = max(run, jobDifficulty[i]);
            dp[i] = run;
        }
        for (int k = 2; k <= d; k++) {
            vector<int> nxt(n + 1, INF);
            for (int i = n - k; i >= 0; i--) {
                int curMax = 0, best = INF;
                for (int j = i; j <= n - k; j++) {
                    curMax = max(curMax, jobDifficulty[j]);
                    if (dp[j + 1] < INF) best = min(best, curMax + dp[j + 1]);
                }
                nxt[i] = best;
            }
            dp = nxt;
        }
        return dp[0];
    }
};
`,
    },
    complexity: { time: "O(d * n^2)", space: "O(n)" },
    pitfalls: [
      "Missing the n < d impossibility check.",
      "Allowing a day with zero jobs — each day needs at least one.",
      "Recomputing the day's max instead of carrying a running max, making it O(d*n^3).",
    ],
    edgeCases: [
      "d == 1 — answer is the global max.",
      "d == n — each job its own day; answer is the sum.",
      "n < d — return -1.",
    ],
    whyItMatters:
      "Partitioning an ordered sequence into exactly k contiguous segments to minimize a sum-of-maxima is the textbook interval-DP scheduling problem behind batch sizing and SLA-bounded pipeline planning.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 236 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-profitable-rollout-schemes",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer"],
    title: "Count Profitable Rollout Schemes",
    framing:
      "A team of engineers can each be assigned to at most one of several rollout tasks. Each task needs a fixed headcount and yields a fixed profit. Count how many subsets of tasks need at most G engineers total and yield at least P profit.",
    statement:
      "There are n tasks and g available engineers. Task i requires group[i] engineers and yields profit[i]. A scheme is a subset of tasks; an engineer can join at most one task in the scheme. A scheme is profitable if its total headcount <= g and its total profit >= minProfit. Return the number of profitable schemes modulo 1e9+7.",
    inputFormat:
      "Integers g and minProfit, and arrays group[] and profit[] of equal length n.",
    outputFormat: "An integer: the count of profitable schemes mod 1_000_000_007.",
    constraints: [
      "1 <= n <= 100",
      "0 <= g <= 100",
      "0 <= minProfit <= 100",
      "1 <= group[i] <= 100, 0 <= profit[i] <= 100",
    ],
    examples: [
      {
        input: "g = 5, minProfit = 3, group = [2,2], profit = [2,3]",
        output: "2",
        explanation: "Schemes {task1} (profit 3) and {task0,task1} (profit 5) qualify.",
      },
      {
        input: "g = 10, minProfit = 5, group = [2,3,5], profit = [6,7,8]",
        output: "7",
        explanation: "Seven subsets meet headcount <= 10 and profit >= 5.",
      },
    ],
    approach: [
      "Knapsack DP over (members used, profit achieved). Cap profit at minProfit since any profit beyond it is equivalent ('>= minProfit' is one absorbing bucket).",
      "Let dp[j][p] = number of schemes using exactly j members with clamped profit p.",
      "Initialize dp[0][0] = 1 (empty scheme, 0 members, 0 profit).",
      "For each task (members m, gain pr), iterate j from g down to m and p from minProfit down to 0, adding dp[j-m][max(0, p-pr)] into dp[j][p].",
      "0/1 knapsack requires the reverse iteration so each task is used at most once.",
      "Answer = sum over j of dp[j][minProfit] (the clamped 'profit >= minProfit' bucket), mod 1e9+7.",
    ],
    solutionSteps: [
      "MOD = 1e9+7; allocate dp[g+1][minProfit+1] zeroed; dp[0][0]=1.",
      "For each task: for j = g..m descending, for p = minProfit..0 descending: dp[j][p] += dp[j-m][max(0,p-pr)].",
      "Sum dp[j][minProfit] for j in 0..g.",
      "Return the sum mod MOD.",
    ],
    code: {
      python: `def profitable_schemes(g: int, minProfit: int, group: list[int], profit: list[int]) -> int:
    MOD = 1_000_000_007
    dp = [[0] * (minProfit + 1) for _ in range(g + 1)]
    dp[0][0] = 1
    for m, pr in zip(group, profit):
        for j in range(g, m - 1, -1):
            for p in range(minProfit, -1, -1):
                prev_p = max(0, p - pr)
                dp[j][p] = (dp[j][p] + dp[j - m][prev_p]) % MOD
    return sum(dp[j][minProfit] for j in range(g + 1)) % MOD
`,
      java: `class Solution {
    public int profitableSchemes(int g, int minProfit, int[] group, int[] profit) {
        final int MOD = 1_000_000_007;
        long[][] dp = new long[g + 1][minProfit + 1];
        dp[0][0] = 1;
        for (int t = 0; t < group.length; t++) {
            int m = group[t], pr = profit[t];
            for (int j = g; j >= m; j--) {
                for (int p = minProfit; p >= 0; p--) {
                    int prevP = Math.max(0, p - pr);
                    dp[j][p] = (dp[j][p] + dp[j - m][prevP]) % MOD;
                }
            }
        }
        long ans = 0;
        for (int j = 0; j <= g; j++) ans = (ans + dp[j][minProfit]) % MOD;
        return (int) ans;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int profitableSchemes(int g, int minProfit, vector<int>& group, vector<int>& profit) {
        const int MOD = 1'000'000'007;
        vector<vector<long long>> dp(g + 1, vector<long long>(minProfit + 1, 0));
        dp[0][0] = 1;
        for (int t = 0; t < (int)group.size(); t++) {
            int m = group[t], pr = profit[t];
            for (int j = g; j >= m; j--) {
                for (int p = minProfit; p >= 0; p--) {
                    int prevP = max(0, p - pr);
                    dp[j][p] = (dp[j][p] + dp[j - m][prevP]) % MOD;
                }
            }
        }
        long long ans = 0;
        for (int j = 0; j <= g; j++) ans = (ans + dp[j][minProfit]) % MOD;
        return (int) ans;
    }
};
`,
    },
    complexity: { time: "O(n * g * minProfit)", space: "O(g * minProfit)" },
    pitfalls: [
      "Not clamping profit at minProfit, which blows up the state space and miscounts.",
      "Iterating members/profit ascending — that turns it into unbounded knapsack (reuses a task).",
      "Forgetting the modulo on every accumulation, overflowing the count.",
    ],
    edgeCases: [
      "minProfit = 0 — the empty scheme counts too.",
      "A single task exceeding g — never usable.",
      "All tasks have profit 0 with minProfit 0.",
    ],
    whyItMatters:
      "This is a two-dimensional 0/1 knapsack that COUNTS rather than optimizes, with a clamped dimension — the same modeling used for capacity-bounded feature rollouts and budget-constrained portfolio counting.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 237 — pure_dsa · dp_2d · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "cheapest-route-within-time",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer", "platform_engineer"],
    title: "Cheapest Route Within a Time Budget",
    framing:
      "A delivery network has cities connected by roads, each road taking some minutes to traverse. Passing through a city costs a per-city toll. Starting at city 0, reach city n-1 within maxTime minutes at the lowest total toll.",
    statement:
      "Given n cities (0..n-1), passingFees[i] (the toll charged each time you are at city i, including start and end), and bidirectional edges[j] = [u, v, time], find the minimum total toll to travel from city 0 to city n-1 such that the total travel time does not exceed maxTime. Return -1 if impossible.",
    inputFormat:
      "Integer maxTime, array edges of [u, v, time], and array passingFees of length n.",
    outputFormat: "An integer: minimum total passing fee, or -1 if unreachable in time.",
    constraints: [
      "1 <= n <= 1000",
      "n - 1 <= edges.length <= 1000",
      "1 <= maxTime <= 1000, 1 <= time <= 1000",
      "1 <= passingFees[i] <= 1000",
    ],
    examples: [
      {
        input: "maxTime = 30, edges = [[0,1,10],[1,2,10],[2,5,10],[0,3,1],[3,4,10],[4,5,15]], passingFees = [5,1,2,20,20,3]",
        output: "11",
        explanation: "Route 0→1→2→5 takes 30 min and tolls 5+1+2+3 = 11.",
      },
      {
        input: "maxTime = 29, edges = same as above, passingFees = same",
        output: "48",
        explanation: "The 30-min route is now too slow; a costlier faster route is forced.",
      },
    ],
    approach: [
      "State is (city, time-used). Minimize cost. Because time only increases along edges, do a DP over time as the outer dimension.",
      "Let cost[t][v] = min toll to be at city v having used exactly t time. We track best[t][v].",
      "Simpler: dp[t][v] = min fee to reach v within time t. Initialize dp[0][0] = fee[0].",
      "For t from 1..maxTime, dp[t][v] = min(dp[t-1][v], min over edges (u,v,w) with w<=t of dp[t-w][u] + fee[v]).",
      "Carry dp[t][v] = min(dp[t][v], dp[t-1][v]) to allow 'waiting' (monotone in time).",
      "Answer = dp[maxTime][n-1]; -1 if it stays infinite.",
    ],
    solutionSteps: [
      "Build adjacency list of (neighbor, time).",
      "dp[t][v] sized (maxTime+1) x n, all INF; dp[0][0] = fees[0].",
      "For t = 1..maxTime: dp[t][v] = dp[t-1][v]; then for each edge (u,v,w) with w<=t relax dp[t][v] = min(dp[t][v], dp[t-w][u]+fees[v]) and symmetric.",
      "Return dp[maxTime][n-1] or -1.",
    ],
    code: {
      python: `def min_cost(maxTime: int, edges: list[list[int]], passingFees: list[int]) -> int:
    n = len(passingFees)
    INF = float("inf")
    # dp[t][v]: min fee to be at v using <= t time
    dp = [[INF] * n for _ in range(maxTime + 1)]
    dp[0][0] = passingFees[0]
    for t in range(1, maxTime + 1):
        for v in range(n):
            dp[t][v] = dp[t - 1][v]  # waiting is allowed
        for u, v, w in edges:
            if w <= t:
                if dp[t - w][u] + passingFees[v] < dp[t][v]:
                    dp[t][v] = dp[t - w][u] + passingFees[v]
                if dp[t - w][v] + passingFees[u] < dp[t][u]:
                    dp[t][u] = dp[t - w][v] + passingFees[u]
    return -1 if dp[maxTime][n - 1] == INF else dp[maxTime][n - 1]
`,
      java: `import java.util.*;

class Solution {
    public int minCost(int maxTime, int[][] edges, int[] passingFees) {
        int n = passingFees.length;
        final int INF = Integer.MAX_VALUE / 2;
        int[][] dp = new int[maxTime + 1][n];
        for (int[] row : dp) Arrays.fill(row, INF);
        dp[0][0] = passingFees[0];
        for (int t = 1; t <= maxTime; t++) {
            for (int v = 0; v < n; v++) dp[t][v] = dp[t - 1][v];
            for (int[] e : edges) {
                int u = e[0], v = e[1], w = e[2];
                if (w <= t) {
                    if (dp[t - w][u] != INF)
                        dp[t][v] = Math.min(dp[t][v], dp[t - w][u] + passingFees[v]);
                    if (dp[t - w][v] != INF)
                        dp[t][u] = Math.min(dp[t][u], dp[t - w][v] + passingFees[u]);
                }
            }
        }
        return dp[maxTime][n - 1] == INF ? -1 : dp[maxTime][n - 1];
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
#include <climits>
using namespace std;

class Solution {
public:
    int minCost(int maxTime, vector<vector<int>>& edges, vector<int>& passingFees) {
        int n = passingFees.size();
        const int INF = INT_MAX / 2;
        vector<vector<int>> dp(maxTime + 1, vector<int>(n, INF));
        dp[0][0] = passingFees[0];
        for (int t = 1; t <= maxTime; t++) {
            for (int v = 0; v < n; v++) dp[t][v] = dp[t - 1][v];
            for (auto& e : edges) {
                int u = e[0], v = e[1], w = e[2];
                if (w <= t) {
                    if (dp[t - w][u] != INF)
                        dp[t][v] = min(dp[t][v], dp[t - w][u] + passingFees[v]);
                    if (dp[t - w][v] != INF)
                        dp[t][u] = min(dp[t][u], dp[t - w][v] + passingFees[u]);
                }
            }
        }
        return dp[maxTime][n - 1] == INF ? -1 : dp[maxTime][n - 1];
    }
};
`,
    },
    complexity: { time: "O(maxTime * (n + E))", space: "O(maxTime * n)" },
    pitfalls: [
      "Treating it as plain shortest-path on cost — the time budget is a hard second constraint.",
      "Forgetting the dp[t][v] = dp[t-1][v] carry that lets a node keep its cheapest earlier cost.",
      "Not guarding against INF + fee overflow before relaxing.",
    ],
    edgeCases: [
      "n == 1 — already at destination; fee is fees[0] if maxTime >= 0.",
      "Disconnected destination — return -1.",
      "Fastest route still exceeds maxTime — return -1.",
    ],
    whyItMatters:
      "Constrained shortest path — minimize cost subject to a resource budget — is a resource-constrained DP that appears in routing with SLA deadlines, toll-aware navigation, and bandwidth-bounded scheduling.",
    estimatedMinutes: 42,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 238 — pure_dsa · dp_1d · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "three-nonoverlapping-peak-windows",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Three Non-Overlapping Peak Traffic Windows",
    framing:
      "A traffic log records requests per minute. To provision three separate capacity reservations, pick three non-overlapping windows of equal length k that together capture the most traffic. Return the earliest such window starts.",
    statement:
      "Given an integer array nums and an integer k, find three non-overlapping subarrays each of length k with maximum total sum, and return their starting indices. If multiple answers tie, return the lexicographically smallest list of starting indices.",
    inputFormat:
      "An integer array nums of length n and an integer k with 1 <= 3k <= n.",
    outputFormat: "An array of three starting indices in increasing order.",
    constraints: [
      "1 <= nums.length <= 2 * 10^4",
      "1 <= k, and 3 * k <= nums.length",
      "1 <= nums[i] < 2^16",
    ],
    examples: [
      {
        input: "nums = [1,2,1,2,6,7,5,1], k = 2",
        output: "[0,3,5]",
        explanation: "Windows [1,2],[2,6],[7,5] sum to 3+8+12 = 23, the maximum.",
      },
      {
        input: "nums = [1,2,1,2,1,2,1,2,1], k = 2",
        output: "[0,2,4]",
        explanation: "Equal sums force the lexicographically smallest start triple.",
      },
    ],
    approach: [
      "Precompute window sums w[i] = sum of nums[i..i+k-1] via a sliding window.",
      "left[i] = index of the best (and earliest on tie) window with start in [0, i].",
      "right[i] = index of the best window with start in [i, n-k]; prefer earlier index on tie (use >= when scanning right-to-left so earlier wins).",
      "Fix the middle window start m in [k, n-2k]; the left window's best start is left[m-k], the right's is right[m+k].",
      "Track the maximum total over all m, updating only on a strictly greater sum so the lexicographically smallest triple is kept (iterate m ascending).",
    ],
    solutionSteps: [
      "Build prefix sums; compute w[i] for i in [0, n-k].",
      "Fill left[] left-to-right keeping earliest argmax.",
      "Fill right[] right-to-left keeping earliest argmax (use strict > to prefer smaller index).",
      "Iterate middle m from k to n-2k; combine w[left[m-k]] + w[m] + w[right[m+k]].",
      "Keep the triple with the strictly largest total; return [l, m, r].",
    ],
    code: {
      python: `def max_sum_of_three_subarrays(nums: list[int], k: int) -> list[int]:
    n = len(nums)
    total = n - k + 1
    w = [0] * total
    s = sum(nums[:k])
    w[0] = s
    for i in range(1, total):
        s += nums[i + k - 1] - nums[i - 1]
        w[i] = s
    left = [0] * total
    best = 0
    for i in range(total):
        if w[i] > w[best]:
            best = i
        left[i] = best
    right = [0] * total
    best = total - 1
    for i in range(total - 1, -1, -1):
        if w[i] >= w[best]:
            best = i
        right[i] = best
    res = [-1, -1, -1]
    best_sum = -1
    for m in range(k, total - k):
        l = left[m - k]
        r = right[m + k]
        cur = w[l] + w[m] + w[r]
        if cur > best_sum:
            best_sum = cur
            res = [l, m, r]
    return res
`,
      java: `class Solution {
    public int[] maxSumOfThreeSubarrays(int[] nums, int k) {
        int n = nums.length, total = n - k + 1;
        int[] w = new int[total];
        int s = 0;
        for (int i = 0; i < k; i++) s += nums[i];
        w[0] = s;
        for (int i = 1; i < total; i++) {
            s += nums[i + k - 1] - nums[i - 1];
            w[i] = s;
        }
        int[] left = new int[total];
        int best = 0;
        for (int i = 0; i < total; i++) {
            if (w[i] > w[best]) best = i;
            left[i] = best;
        }
        int[] right = new int[total];
        best = total - 1;
        for (int i = total - 1; i >= 0; i--) {
            if (w[i] >= w[best]) best = i;
            right[i] = best;
        }
        int[] res = {-1, -1, -1};
        int bestSum = -1;
        for (int m = k; m <= total - k - 1; m++) {
            int l = left[m - k], r = right[m + k];
            int cur = w[l] + w[m] + w[r];
            if (cur > bestSum) {
                bestSum = cur;
                res[0] = l; res[1] = m; res[2] = r;
            }
        }
        return res;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    vector<int> maxSumOfThreeSubarrays(vector<int>& nums, int k) {
        int n = nums.size(), total = n - k + 1;
        vector<int> w(total);
        int s = 0;
        for (int i = 0; i < k; i++) s += nums[i];
        w[0] = s;
        for (int i = 1; i < total; i++) {
            s += nums[i + k - 1] - nums[i - 1];
            w[i] = s;
        }
        vector<int> left(total), right(total);
        int best = 0;
        for (int i = 0; i < total; i++) {
            if (w[i] > w[best]) best = i;
            left[i] = best;
        }
        best = total - 1;
        for (int i = total - 1; i >= 0; i--) {
            if (w[i] >= w[best]) best = i;
            right[i] = best;
        }
        vector<int> res = {-1, -1, -1};
        int bestSum = -1;
        for (int m = k; m <= total - k - 1; m++) {
            int l = left[m - k], r = right[m + k];
            int cur = w[l] + w[m] + w[r];
            if (cur > bestSum) { bestSum = cur; res = {l, m, r}; }
        }
        return res;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Using >= in the left scan — that breaks the lexicographically-smallest guarantee for the left window.",
      "Using > in the right scan — earlier (smaller) indices must win ties, so use >=.",
      "Off-by-one in the middle window range [k, n-2k].",
    ],
    edgeCases: [
      "n == 3k — only one valid triple.",
      "All equal values — return [0, k, 2k].",
      "k == 1 — three best single elements respecting order.",
    ],
    whyItMatters:
      "Fixing the middle and precomputing best-left/best-right is the standard trick for 'k non-overlapping fixed windows' — used in capacity-reservation planning and multi-window peak detection over time series.",
    estimatedMinutes: 42,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 239 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "merge-stone-piles-min-cost",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Minimum Cost to Merge Stone Piles",
    framing:
      "Stone piles sit in a row. In one move you merge exactly K consecutive piles into one, paying the sum of those piles. Merge everything into a single pile at the least total cost.",
    statement:
      "Given an array stones where stones[i] is the count in the i-th pile and an integer k, you may merge exactly k consecutive piles into one pile in each move, at a cost equal to the total stones in those k piles. Return the minimum total cost to merge all piles into one, or -1 if it is impossible.",
    inputFormat:
      "An integer array stones of length n and an integer k.",
    outputFormat: "An integer: minimum total merge cost, or -1 if impossible.",
    constraints: [
      "1 <= stones.length <= 30",
      "2 <= k <= 30",
      "1 <= stones[i] <= 100",
    ],
    examples: [
      {
        input: "stones = [3,2,4,1], k = 2",
        output: "20",
        explanation: "Merge to one pile via pairwise merges costing 20 total.",
      },
      {
        input: "stones = [3,5,1,2,6], k = 3",
        output: "25",
        explanation: "Merge [5,1,2]→8 then [3,8,6]→17, total 25.",
      },
    ],
    approach: [
      "Feasibility: merging k piles into 1 removes (k-1) piles per move. To reach 1 pile from n, we need (n-1) % (k-1) == 0; otherwise return -1.",
      "Interval DP: dp[i][j] = min cost to merge stones[i..j] into as few piles as possible (1 pile if (j-i) % (k-1) == 0, else the minimal number left).",
      "Split: dp[i][j] = min over m (stepping by k-1) of dp[i][m] + dp[m+1][j].",
      "When the interval can collapse to one pile ((j-i) % (k-1) == 0), add the prefix-sum cost of merging that whole interval.",
      "Use prefix sums for O(1) range totals.",
    ],
    solutionSteps: [
      "n = len; if (n-1) % (k-1) != 0 return -1.",
      "Build prefix sums.",
      "dp = n x n zeroed. For length L from k..n, for each i with j=i+L-1: dp[i][j] = min over m in [i, j) step (k-1) of dp[i][m]+dp[m+1][j]; if (j-i)%(k-1)==0 add prefix[j+1]-prefix[i].",
      "Return dp[0][n-1].",
    ],
    code: {
      python: `def merge_stones(stones: list[int], k: int) -> int:
    n = len(stones)
    if (n - 1) % (k - 1) != 0:
        return -1
    prefix = [0] * (n + 1)
    for i in range(n):
        prefix[i + 1] = prefix[i] + stones[i]
    INF = float("inf")
    dp = [[0] * n for _ in range(n)]
    for length in range(k, n + 1):
        for i in range(0, n - length + 1):
            j = i + length - 1
            dp[i][j] = INF
            for m in range(i, j, k - 1):
                dp[i][j] = min(dp[i][j], dp[i][m] + dp[m + 1][j])
            if (j - i) % (k - 1) == 0:
                dp[i][j] += prefix[j + 1] - prefix[i]
    return dp[0][n - 1]
`,
      java: `class Solution {
    public int mergeStones(int[] stones, int k) {
        int n = stones.length;
        if ((n - 1) % (k - 1) != 0) return -1;
        int[] prefix = new int[n + 1];
        for (int i = 0; i < n; i++) prefix[i + 1] = prefix[i] + stones[i];
        final int INF = Integer.MAX_VALUE / 2;
        int[][] dp = new int[n][n];
        for (int length = k; length <= n; length++) {
            for (int i = 0; i + length - 1 < n; i++) {
                int j = i + length - 1;
                dp[i][j] = INF;
                for (int m = i; m < j; m += k - 1)
                    dp[i][j] = Math.min(dp[i][j], dp[i][m] + dp[m + 1][j]);
                if ((j - i) % (k - 1) == 0)
                    dp[i][j] += prefix[j + 1] - prefix[i];
            }
        }
        return dp[0][n - 1];
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
#include <climits>
using namespace std;

class Solution {
public:
    int mergeStones(vector<int>& stones, int k) {
        int n = stones.size();
        if ((n - 1) % (k - 1) != 0) return -1;
        vector<int> prefix(n + 1, 0);
        for (int i = 0; i < n; i++) prefix[i + 1] = prefix[i] + stones[i];
        const int INF = INT_MAX / 2;
        vector<vector<int>> dp(n, vector<int>(n, 0));
        for (int length = k; length <= n; length++) {
            for (int i = 0; i + length - 1 < n; i++) {
                int j = i + length - 1;
                dp[i][j] = INF;
                for (int m = i; m < j; m += k - 1)
                    dp[i][j] = min(dp[i][j], dp[i][m] + dp[m + 1][j]);
                if ((j - i) % (k - 1) == 0)
                    dp[i][j] += prefix[j + 1] - prefix[i];
            }
        }
        return dp[0][n - 1];
    }
};
`,
    },
    complexity: { time: "O(n^3 / k)", space: "O(n^2)" },
    pitfalls: [
      "Skipping the (n-1) % (k-1) feasibility check.",
      "Stepping the split point by 1 instead of (k-1) — wrong subproblem alignment and slower.",
      "Adding the interval cost unconditionally instead of only when the interval collapses to one pile.",
    ],
    edgeCases: [
      "n == 1 — already one pile, cost 0.",
      "k == 2 — classic always-feasible merge.",
      "(n-1) not divisible by (k-1) — return -1.",
    ],
    whyItMatters:
      "Merge-stones is the generalized matrix-chain / interval-DP with a divisibility feasibility constraint — the same structure behind optimal join ordering and hierarchical aggregation cost minimization.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 240 — pure_dsa · dp_2d · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "longest-mirror-token-substring",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "dp_2d",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Longest Mirror (Palindromic) Token Substring",
    framing:
      "Given a token stream rendered as a string, find the longest contiguous fragment that reads identically forwards and backwards — useful for detecting symmetric markers in serialized payloads.",
    statement:
      "Given a string s, return the longest substring of s that is a palindrome. If several have the same maximum length, return any one of them.",
    inputFormat:
      "A string s of length [1, 1000] of arbitrary characters.",
    outputFormat: "A string: a longest palindromic substring of s.",
    constraints: [
      "1 <= s.length <= 1000",
      "s consists of printable characters.",
    ],
    examples: [
      {
        input: 's = "babad"',
        output: '"bab"',
        explanation: '"aba" is also a valid answer of the same length.',
      },
      {
        input: 's = "cbbd"',
        output: '"bb"',
        explanation: "The longest palindrome is the pair bb.",
      },
    ],
    approach: [
      "Expand-around-center: every palindrome has a center, which is either a single character (odd length) or a gap between two characters (even length).",
      "There are 2n-1 possible centers. For each, expand outward while the mirrored characters match.",
      "Track the longest span found via its [start, end] indices.",
      "This is O(n^2) time and O(1) extra space — simpler and faster in practice than the 2D boolean DP table for these constraints.",
      "Return the substring of the best span.",
    ],
    solutionSteps: [
      "Define expand(l, r) that widens while s[l]==s[r] and bounds hold, returning the final matched span.",
      "For each i, compute odd center (i,i) and even center (i,i+1).",
      "Keep the longest [start,end].",
      "Return s[start..end].",
    ],
    code: {
      python: `def longest_palindrome(s: str) -> str:
    if not s:
        return ""
    start, end = 0, 0

    def expand(l: int, r: int):
        while l >= 0 and r < len(s) and s[l] == s[r]:
            l -= 1
            r += 1
        return l + 1, r - 1

    for i in range(len(s)):
        l1, r1 = expand(i, i)
        if r1 - l1 > end - start:
            start, end = l1, r1
        l2, r2 = expand(i, i + 1)
        if r2 - l2 > end - start:
            start, end = l2, r2
    return s[start:end + 1]
`,
      java: `class Solution {
    private int start = 0, maxLen = 0;

    public String longestPalindrome(String s) {
        if (s == null || s.isEmpty()) return "";
        for (int i = 0; i < s.length(); i++) {
            expand(s, i, i);
            expand(s, i, i + 1);
        }
        return s.substring(start, start + maxLen);
    }

    private void expand(String s, int l, int r) {
        while (l >= 0 && r < s.length() && s.charAt(l) == s.charAt(r)) {
            l--; r++;
        }
        int len = r - l - 1;
        if (len > maxLen) { maxLen = len; start = l + 1; }
    }
}
`,
      cpp: `#include <string>
using namespace std;

class Solution {
    int start = 0, maxLen = 0;
    void expand(const string& s, int l, int r) {
        while (l >= 0 && r < (int)s.size() && s[l] == s[r]) { l--; r++; }
        int len = r - l - 1;
        if (len > maxLen) { maxLen = len; start = l + 1; }
    }
public:
    string longestPalindrome(string s) {
        if (s.empty()) return "";
        for (int i = 0; i < (int)s.size(); i++) {
            expand(s, i, i);
            expand(s, i, i + 1);
        }
        return s.substr(start, maxLen);
    }
};
`,
    },
    complexity: { time: "O(n^2)", space: "O(1)" },
    pitfalls: [
      "Handling only odd-length centers and missing even palindromes like 'bb'.",
      "Off-by-one when converting the final (l, r) back to a substring after the while loop overshoots.",
      "Returning length instead of the actual substring.",
    ],
    edgeCases: [
      "Single character — itself.",
      "No palindrome longer than 1 — return any single char.",
      "Entire string is a palindrome.",
    ],
    whyItMatters:
      "Longest palindromic substring via center expansion is a cornerstone string-DP/two-pointer hybrid — the same symmetric-scan idea behind near-duplicate detection and reversible-marker parsing.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 241 — pure_dsa · dp_2d · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-palindromic-fragments",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "dp_2d",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Count Palindromic Fragments",
    framing:
      "Auditing a serialized log, you need the total number of contiguous fragments that are palindromes — every individual character counts, and longer symmetric runs count too.",
    statement:
      "Given a string s, return the number of palindromic substrings in it. Substrings starting and ending at different indices count separately even if they consist of the same characters.",
    inputFormat:
      "A string s of length [1, 1000].",
    outputFormat: "An integer: the count of palindromic substrings.",
    constraints: [
      "1 <= s.length <= 1000",
      "s consists of lowercase English letters.",
    ],
    examples: [
      {
        input: 's = "abc"',
        output: "3",
        explanation: "Each single character: 'a','b','c'.",
      },
      {
        input: 's = "aaa"',
        output: "6",
        explanation: "'a' x3, 'aa' x2, 'aaa' x1 = 6.",
      },
    ],
    approach: [
      "Every palindrome expands from a center; there are 2n-1 centers (n single, n-1 between-pairs).",
      "For each center, expand outward while characters mirror; each successful expansion is one more palindromic substring.",
      "Sum the counts across all centers.",
      "O(n^2) time, O(1) space — cleaner than the boolean DP table.",
    ],
    solutionSteps: [
      "Define a helper count(l, r) that increments a counter for each match while expanding.",
      "For each i, run odd center (i,i) and even center (i,i+1).",
      "Accumulate into a total.",
      "Return the total.",
    ],
    code: {
      python: `def count_substrings(s: str) -> int:
    n = len(s)
    total = 0

    def expand(l: int, r: int) -> int:
        cnt = 0
        while l >= 0 and r < n and s[l] == s[r]:
            cnt += 1
            l -= 1
            r += 1
        return cnt

    for i in range(n):
        total += expand(i, i)
        total += expand(i, i + 1)
    return total
`,
      java: `class Solution {
    public int countSubstrings(String s) {
        int total = 0;
        for (int i = 0; i < s.length(); i++) {
            total += expand(s, i, i);
            total += expand(s, i, i + 1);
        }
        return total;
    }

    private int expand(String s, int l, int r) {
        int cnt = 0;
        while (l >= 0 && r < s.length() && s.charAt(l) == s.charAt(r)) {
            cnt++; l--; r++;
        }
        return cnt;
    }
}
`,
      cpp: `#include <string>
using namespace std;

class Solution {
    int expand(const string& s, int l, int r) {
        int cnt = 0;
        while (l >= 0 && r < (int)s.size() && s[l] == s[r]) { cnt++; l--; r++; }
        return cnt;
    }
public:
    int countSubstrings(string s) {
        int total = 0;
        for (int i = 0; i < (int)s.size(); i++) {
            total += expand(s, i, i);
            total += expand(s, i, i + 1);
        }
        return total;
    }
};
`,
    },
    complexity: { time: "O(n^2)", space: "O(1)" },
    pitfalls: [
      "Counting only maximal palindromes instead of every nested one.",
      "Missing even-length centers.",
      "Double counting by also running a separate full DP — pick one method.",
    ],
    edgeCases: [
      "Single character — count 1.",
      "All identical characters — n(n+1)/2.",
      "No repeats — exactly n.",
    ],
    whyItMatters:
      "Counting palindromic substrings is the canonical center-expansion DP; the same enumeration underlies symmetry statistics and repeated-structure analysis in sequence data.",
    estimatedMinutes: 28,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 242 — pure_dsa · backtracking · medium · frontend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "phone-keypad-letter-combos",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "backtracking",
    difficulty: "medium",
    primaryRole: "frontend_engineer",
    roles: ["frontend_engineer", "software_engineer", "mobile_engineer"],
    title: "Keypad Letter Combinations",
    framing:
      "An old-style numeric keypad maps each digit 2–9 to a set of letters. Given a typed digit sequence, enumerate every letter combination it could represent — the core of a T9-style suggestion box.",
    statement:
      "Given a string digits containing digits from 2-9, return all possible letter combinations the number could represent. Return the answer in any order. An empty input yields an empty list.",
    inputFormat:
      "A string digits of length [0, 4], each character in '2'..'9'.",
    outputFormat: "A list of strings: all letter combinations.",
    constraints: [
      "0 <= digits.length <= 4",
      "digits[i] is in the range ['2', '9'].",
    ],
    examples: [
      {
        input: 'digits = "23"',
        output: '["ad","ae","af","bd","be","bf","cd","ce","cf"]',
        explanation: "2→abc, 3→def; cartesian product.",
      },
      {
        input: 'digits = ""',
        output: "[]",
        explanation: "No digits, no combinations.",
      },
    ],
    approach: [
      "Map each digit to its letters once.",
      "Backtrack: build a combination character by character, advancing one digit at a time.",
      "When the partial string length equals the input length, record it.",
      "The recursion depth equals the number of digits (at most 4), and branching is up to 4 letters (for 7 and 9).",
    ],
    solutionSteps: [
      "If digits is empty, return [].",
      "Define mapping '2'..'9' → letter strings.",
      "dfs(index, path): if index == len, append path; else loop letters of digits[index], recurse.",
      "Return the accumulated list.",
    ],
    code: {
      python: `def letter_combinations(digits: str) -> list[str]:
    if not digits:
        return []
    mapping = {
        "2": "abc", "3": "def", "4": "ghi", "5": "jkl",
        "6": "mno", "7": "pqrs", "8": "tuv", "9": "wxyz",
    }
    res = []

    def dfs(index: int, path: list[str]) -> None:
        if index == len(digits):
            res.append("".join(path))
            return
        for ch in mapping[digits[index]]:
            path.append(ch)
            dfs(index + 1, path)
            path.pop()

    dfs(0, [])
    return res
`,
      java: `import java.util.*;

class Solution {
    private static final String[] MAP = {
        "", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"
    };

    public List<String> letterCombinations(String digits) {
        List<String> res = new ArrayList<>();
        if (digits == null || digits.isEmpty()) return res;
        dfs(digits, 0, new StringBuilder(), res);
        return res;
    }

    private void dfs(String digits, int index, StringBuilder path, List<String> res) {
        if (index == digits.length()) {
            res.add(path.toString());
            return;
        }
        String letters = MAP[digits.charAt(index) - '0'];
        for (int i = 0; i < letters.length(); i++) {
            path.append(letters.charAt(i));
            dfs(digits, index + 1, path, res);
            path.deleteCharAt(path.length() - 1);
        }
    }
}
`,
      cpp: `#include <vector>
#include <string>
using namespace std;

class Solution {
    vector<string> MAP = {
        "", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"
    };
    void dfs(const string& digits, int index, string& path, vector<string>& res) {
        if (index == (int)digits.size()) { res.push_back(path); return; }
        const string& letters = MAP[digits[index] - '0'];
        for (char c : letters) {
            path.push_back(c);
            dfs(digits, index + 1, path, res);
            path.pop_back();
        }
    }
public:
    vector<string> letterCombinations(string digits) {
        vector<string> res;
        if (digits.empty()) return res;
        string path;
        dfs(digits, 0, path, res);
        return res;
    }
};
`,
    },
    complexity: { time: "O(4^n * n)", space: "O(n) recursion + output" },
    pitfalls: [
      "Returning a list with an empty string instead of an empty list for empty input.",
      "Forgetting to undo the path append (backtracking step).",
      "Mis-mapping 7→pqrs and 9→wxyz (the four-letter digits).",
    ],
    edgeCases: [
      "Empty input — [].",
      "Single digit — its letters.",
      "Digits with four-letter keys producing larger products.",
    ],
    whyItMatters:
      "Letter combinations is the introductory cartesian-product backtracking template — the same enumeration that powers predictive keypad input and combinatorial option expansion.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 243 — indian_domain · backtracking · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "expense-combos-unique-notes",
    version: 1,
    status: "pending_review",
    bucket: "indian_domain",
    batchNo: 9,
    pattern: "backtracking",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer"],
    title: "Exact-Change Combinations From a Cash Drawer",
    framing:
      "A kirana shop's cash drawer holds individual currency notes (in rupees), some of duplicate denominations. Find every distinct set of notes that sums exactly to a customer's bill amount — each physical note may be used at most once.",
    statement:
      "Given an array notes of rupee values (which may contain duplicates) and a target bill amount, return all unique combinations of notes that sum to target. Each note may be used at most once in a combination, and the result must not contain duplicate combinations.",
    inputFormat:
      "An integer array notes of length [1, 100] and an integer target. Values in [1, 50].",
    outputFormat: "A list of unique integer lists, each summing to target.",
    constraints: [
      "1 <= notes.length <= 100",
      "1 <= notes[i] <= 50",
      "1 <= target <= 30",
    ],
    examples: [
      {
        input: "notes = [10,1,2,7,6,1,5], target = 8",
        output: "[[1,1,6],[1,2,5],[1,7],[2,6]]",
        explanation: "Each distinct note-set summing to 8, no repeats.",
      },
      {
        input: "notes = [2,5,2,1,2], target = 5",
        output: "[[1,2,2],[5]]",
        explanation: "Duplicate 2-rupee notes do not produce duplicate combinations.",
      },
    ],
    approach: [
      "Sort the notes so duplicates are adjacent and we can prune by value.",
      "Backtrack from a start index, adding notes[i] to the path and recursing from i+1 (each physical note used once).",
      "To avoid duplicate combinations, skip a value at the same recursion depth if it equals the previous value (i > start and notes[i]==notes[i-1]).",
      "Prune: if notes[i] exceeds the remaining target, break (array is sorted ascending).",
      "Record the path when the remaining target hits 0.",
    ],
    solutionSteps: [
      "Sort notes ascending.",
      "dfs(start, remain, path): if remain == 0 record copy; else loop i from start, skip same-as-previous siblings, break when notes[i] > remain, recurse with i+1 and remain-notes[i].",
      "Return collected combinations.",
    ],
    code: {
      python: `def combination_sum_unique(notes: list[int], target: int) -> list[list[int]]:
    notes.sort()
    res = []

    def dfs(start: int, remain: int, path: list[int]) -> None:
        if remain == 0:
            res.append(path[:])
            return
        for i in range(start, len(notes)):
            if i > start and notes[i] == notes[i - 1]:
                continue  # skip duplicate at this depth
            if notes[i] > remain:
                break  # sorted: no further candidate fits
            path.append(notes[i])
            dfs(i + 1, remain - notes[i], path)
            path.pop()

    dfs(0, target, [])
    return res
`,
      java: `import java.util.*;

class Solution {
    public List<List<Integer>> combinationSum2(int[] notes, int target) {
        Arrays.sort(notes);
        List<List<Integer>> res = new ArrayList<>();
        dfs(notes, 0, target, new ArrayList<>(), res);
        return res;
    }

    private void dfs(int[] notes, int start, int remain, List<Integer> path, List<List<Integer>> res) {
        if (remain == 0) {
            res.add(new ArrayList<>(path));
            return;
        }
        for (int i = start; i < notes.length; i++) {
            if (i > start && notes[i] == notes[i - 1]) continue;
            if (notes[i] > remain) break;
            path.add(notes[i]);
            dfs(notes, i + 1, remain - notes[i], path, res);
            path.remove(path.size() - 1);
        }
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
    void dfs(vector<int>& notes, int start, int remain, vector<int>& path, vector<vector<int>>& res) {
        if (remain == 0) { res.push_back(path); return; }
        for (int i = start; i < (int)notes.size(); i++) {
            if (i > start && notes[i] == notes[i - 1]) continue;
            if (notes[i] > remain) break;
            path.push_back(notes[i]);
            dfs(notes, i + 1, remain - notes[i], path, res);
            path.pop_back();
        }
    }
public:
    vector<vector<int>> combinationSum2(vector<int>& notes, int target) {
        sort(notes.begin(), notes.end());
        vector<vector<int>> res;
        vector<int> path;
        dfs(notes, 0, target, path, res);
        return res;
    }
};
`,
    },
    complexity: { time: "O(2^n) worst case", space: "O(n) recursion" },
    pitfalls: [
      "Recursing from i instead of i+1 — that reuses a single physical note.",
      "Skipping duplicates with the wrong condition (i > 0 instead of i > start) drops valid combinations.",
      "Not sorting first, which breaks both the dedup and the break-prune.",
    ],
    edgeCases: [
      "No combination sums to target — empty list.",
      "All notes equal — at most one combination.",
      "target smaller than the smallest note — empty list.",
    ],
    whyItMatters:
      "Combination Sum II — subsets summing to a target with each element used once and no duplicate sets — is the canonical dedup-backtracking pattern behind exact-change makers and constrained selection enumerators.",
    estimatedMinutes: 32,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 244 — pure_dsa · graphs · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "runoff-reaches-both-coasts",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "graphs",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Runoff Cells Reaching Both Coasts",
    framing:
      "A terrain grid gives the elevation of each cell. Water flows from a cell to neighbors of equal or lower height. The northwest borders touch one ocean and the southeast borders touch another. Find cells from which water can reach BOTH oceans.",
    statement:
      "Given an m x n integer matrix heights, the Pacific ocean touches the left and top edges and the Atlantic touches the right and bottom edges. Water flows from a cell to an adjacent cell (up/down/left/right) only if the neighbor's height is <= the current cell's height. Return all coordinates [r, c] from which water can flow to BOTH oceans.",
    inputFormat:
      "An m x n integer matrix heights with values in [0, 10^5].",
    outputFormat: "A list of [row, col] coordinates that reach both oceans.",
    constraints: [
      "1 <= m, n <= 200",
      "0 <= heights[r][c] <= 10^5",
    ],
    examples: [
      {
        input: "heights = [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]",
        output: "[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]",
        explanation: "These cells drain to both the Pacific and Atlantic.",
      },
      {
        input: "heights = [[1]]",
        output: "[[0,0]]",
        explanation: "A single cell touches both oceans.",
      },
    ],
    approach: [
      "Reverse the flow: instead of asking which cells reach an ocean, flood inward FROM each ocean's border, moving to neighbors with height >= current (uphill).",
      "Do a BFS/DFS from all Pacific border cells marking reachable[pacific]; likewise from all Atlantic border cells.",
      "A cell reachable from both flood-fills can drain to both oceans.",
      "Collect the intersection of the two reachable sets.",
    ],
    solutionSteps: [
      "Create two boolean grids pac and atl.",
      "Seed DFS from top row + left col for pac; bottom row + right col for atl.",
      "DFS moves to a neighbor only if its height >= current cell's height (reverse flow).",
      "Return all cells where pac and atl are both true.",
    ],
    code: {
      python: `def pacific_atlantic(heights: list[list[int]]) -> list[list[int]]:
    if not heights or not heights[0]:
        return []
    m, n = len(heights), len(heights[0])
    pac = [[False] * n for _ in range(m)]
    atl = [[False] * n for _ in range(m)]

    def dfs(r: int, c: int, visited) -> None:
        visited[r][c] = True
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n and not visited[nr][nc] \\
               and heights[nr][nc] >= heights[r][c]:
                dfs(nr, nc, visited)

    for r in range(m):
        dfs(r, 0, pac)
        dfs(r, n - 1, atl)
    for c in range(n):
        dfs(0, c, pac)
        dfs(m - 1, c, atl)

    return [[r, c] for r in range(m) for c in range(n) if pac[r][c] and atl[r][c]]
`,
      java: `import java.util.*;

class Solution {
    private int m, n;
    private int[][] heights;
    private static final int[][] DIRS = {{1,0},{-1,0},{0,1},{0,-1}};

    public List<List<Integer>> pacificAtlantic(int[][] heights) {
        this.heights = heights;
        m = heights.length; n = heights[0].length;
        boolean[][] pac = new boolean[m][n], atl = new boolean[m][n];
        for (int r = 0; r < m; r++) { dfs(r, 0, pac); dfs(r, n - 1, atl); }
        for (int c = 0; c < n; c++) { dfs(0, c, pac); dfs(m - 1, c, atl); }
        List<List<Integer>> res = new ArrayList<>();
        for (int r = 0; r < m; r++)
            for (int c = 0; c < n; c++)
                if (pac[r][c] && atl[r][c]) res.add(Arrays.asList(r, c));
        return res;
    }

    private void dfs(int r, int c, boolean[][] visited) {
        visited[r][c] = true;
        for (int[] d : DIRS) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nr < m && nc >= 0 && nc < n && !visited[nr][nc]
                && heights[nr][nc] >= heights[r][c]) {
                dfs(nr, nc, visited);
            }
        }
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
    int m, n;
    vector<vector<int>>* H;
    void dfs(int r, int c, vector<vector<bool>>& vis) {
        vis[r][c] = true;
        int dirs[4][2] = {{1,0},{-1,0},{0,1},{0,-1}};
        for (auto& d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nr < m && nc >= 0 && nc < n && !vis[nr][nc]
                && (*H)[nr][nc] >= (*H)[r][c])
                dfs(nr, nc, vis);
        }
    }
public:
    vector<vector<int>> pacificAtlantic(vector<vector<int>>& heights) {
        H = &heights;
        m = heights.size(); n = heights[0].size();
        vector<vector<bool>> pac(m, vector<bool>(n, false)), atl = pac;
        for (int r = 0; r < m; r++) { dfs(r, 0, pac); dfs(r, n - 1, atl); }
        for (int c = 0; c < n; c++) { dfs(0, c, pac); dfs(m - 1, c, atl); }
        vector<vector<int>> res;
        for (int r = 0; r < m; r++)
            for (int c = 0; c < n; c++)
                if (pac[r][c] && atl[r][c]) res.push_back({r, c});
        return res;
    }
};
`,
    },
    complexity: { time: "O(m * n)", space: "O(m * n)" },
    pitfalls: [
      "Flowing downhill from cells instead of flooding uphill from the oceans (the reversal is the key insight).",
      "Using > instead of >= — equal-height neighbors must be traversable.",
      "Re-running per-cell BFS, giving O((mn)^2) instead of two linear flood fills.",
    ],
    edgeCases: [
      "1x1 grid — that single cell touches both.",
      "Single row or single column.",
      "Flat grid — every cell reaches both.",
    ],
    whyItMatters:
      "Pacific-Atlantic is the multi-source reverse-flood-fill pattern: seed from targets and propagate inward, intersecting reachable sets — the same technique for multi-sink reachability and watershed segmentation.",
    estimatedMinutes: 32,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 245 — pure_dsa · graphs · medium · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "find-redundant-dependency-edge",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "graphs",
    difficulty: "medium",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "backend_engineer", "software_engineer"],
    title: "Find the Redundant Dependency Edge",
    framing:
      "A build system's module graph should be a tree (one root, no cycles). Someone added one extra dependency edge, creating a cycle. Identify the edge that, if removed, restores the tree — report the last such edge in input order.",
    statement:
      "A tree with n nodes (labeled 1..n) had one extra edge added, producing a graph with n nodes and n edges that contains exactly one cycle. Given edges in the order they were added, return the edge that can be removed so the result is a tree. If multiple answers exist, return the edge that occurs last in the input.",
    inputFormat:
      "An array edges where edges[i] = [u, v]; n edges, nodes labeled 1..n.",
    outputFormat: "An array [u, v]: the redundant edge to remove.",
    constraints: [
      "3 <= n <= 1000",
      "edges.length == n",
      "1 <= u < v <= n, no repeated edges.",
    ],
    examples: [
      {
        input: "edges = [[1,2],[1,3],[2,3]]",
        output: "[2,3]",
        explanation: "Adding [2,3] closes the cycle 1-2-3-1.",
      },
      {
        input: "edges = [[1,2],[2,3],[3,4],[1,4],[1,5]]",
        output: "[1,4]",
        explanation: "[1,4] closes a cycle; it is the last cycle-forming edge.",
      },
    ],
    approach: [
      "Process edges in order with a Union-Find (disjoint set union) structure.",
      "For each edge (u, v), if u and v are already in the same set, this edge closes a cycle — it is the redundant one.",
      "Otherwise union their sets and continue.",
      "Because we scan in input order, the first edge that finds u and v already connected is exactly the last edge needed to break the (single) cycle.",
      "Use path compression and union by rank for near-constant operations.",
    ],
    solutionSteps: [
      "Initialize parent[i] = i for 1..n.",
      "find with path compression; union by rank.",
      "For each edge: if find(u) == find(v) return that edge; else union.",
      "Return [] only if no redundant edge (won't happen per constraints).",
    ],
    code: {
      python: `def find_redundant_connection(edges: list[list[int]]) -> list[int]:
    n = len(edges)
    parent = list(range(n + 1))
    rank = [0] * (n + 1)

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int) -> bool:
        ra, rb = find(a), find(b)
        if ra == rb:
            return False
        if rank[ra] < rank[rb]:
            ra, rb = rb, ra
        parent[rb] = ra
        if rank[ra] == rank[rb]:
            rank[ra] += 1
        return True

    for u, v in edges:
        if not union(u, v):
            return [u, v]
    return []
`,
      java: `class Solution {
    private int[] parent, rank;

    public int[] findRedundantConnection(int[][] edges) {
        int n = edges.length;
        parent = new int[n + 1];
        rank = new int[n + 1];
        for (int i = 1; i <= n; i++) parent[i] = i;
        for (int[] e : edges) {
            if (!union(e[0], e[1])) return e;
        }
        return new int[0];
    }

    private int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    }

    private boolean union(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;
        if (rank[ra] < rank[rb]) { int t = ra; ra = rb; rb = t; }
        parent[rb] = ra;
        if (rank[ra] == rank[rb]) rank[ra]++;
        return true;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
    vector<int> parent, rnk;
    int find(int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }
    bool unite(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;
        if (rnk[ra] < rnk[rb]) swap(ra, rb);
        parent[rb] = ra;
        if (rnk[ra] == rnk[rb]) rnk[ra]++;
        return true;
    }
public:
    vector<int> findRedundantConnection(vector<vector<int>>& edges) {
        int n = edges.size();
        parent.resize(n + 1);
        rnk.assign(n + 1, 0);
        for (int i = 1; i <= n; i++) parent[i] = i;
        for (auto& e : edges) {
            if (!unite(e[0], e[1])) return e;
        }
        return {};
    }
};
`,
    },
    complexity: { time: "O(n * α(n)) ≈ O(n)", space: "O(n)" },
    pitfalls: [
      "Returning the first edge of the cycle rather than the last cycle-closing edge in input order.",
      "Forgetting path compression / union by rank, degrading to O(n^2) on adversarial chains.",
      "Off-by-one with 1-indexed node labels.",
    ],
    edgeCases: [
      "Cycle formed by the very last edge.",
      "Star graph plus one extra edge.",
      "Minimum size n = 3.",
    ],
    whyItMatters:
      "Redundant Connection is the textbook Union-Find cycle-detection problem — the same DSU machinery behind Kruskal's MST, dependency-cycle detection in build graphs, and connectivity queries.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 246 — pure_dsa · binary_search · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "locate-duplicate-shard-id",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "binary_search",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Locate the Duplicated Shard ID",
    framing:
      "A registry holds n+1 shard IDs, each in the range 1..n, so exactly one ID is duplicated. Find the duplicate without modifying the registry and using only constant extra space.",
    statement:
      "Given an array nums of n + 1 integers where each integer is in the range [1, n] inclusive, there is exactly one repeated number. Return that repeated number. You must not modify the array and must use only O(1) extra space.",
    inputFormat:
      "An integer array nums of length n+1 with values in [1, n]; exactly one value repeats (possibly multiple times).",
    outputFormat: "An integer: the duplicated value.",
    constraints: [
      "1 <= n <= 10^5",
      "nums.length == n + 1",
      "1 <= nums[i] <= n",
      "Only one repeated number, but it can appear more than once.",
    ],
    examples: [
      {
        input: "nums = [1,3,4,2,2]",
        output: "2",
        explanation: "2 appears twice.",
      },
      {
        input: "nums = [3,1,3,4,2]",
        output: "3",
        explanation: "3 is the repeated value.",
      },
    ],
    approach: [
      "Treat the array as a function f(i) = nums[i]; since values are in [1, n] and there is a duplicate, the sequence i → nums[i] forms a linked structure with a cycle (Floyd's cycle detection).",
      "Phase 1: advance slow by one step and fast by two until they meet inside the cycle.",
      "Phase 2: reset one pointer to the start; advance both one step at a time; they meet at the cycle entrance, which is the duplicated value.",
      "This is O(n) time, O(1) space, and never mutates the array.",
      "(A binary-search-on-value-range alternative also fits O(1) space: count elements <= mid; the duplicate lies where the count exceeds mid.)",
    ],
    solutionSteps: [
      "slow = fast = nums[0]; do slow = nums[slow], fast = nums[nums[fast]] until they meet.",
      "Set slow2 = nums[0]; advance slow and slow2 one step each until equal.",
      "Return the meeting value.",
    ],
    code: {
      python: `def find_duplicate(nums: list[int]) -> int:
    # Floyd's tortoise and hare on the index→value mapping
    slow = fast = nums[0]
    while True:
        slow = nums[slow]
        fast = nums[nums[fast]]
        if slow == fast:
            break
    slow2 = nums[0]
    while slow2 != slow:
        slow = nums[slow]
        slow2 = nums[slow2]
    return slow
`,
      java: `class Solution {
    public int findDuplicate(int[] nums) {
        int slow = nums[0], fast = nums[0];
        do {
            slow = nums[slow];
            fast = nums[nums[fast]];
        } while (slow != fast);
        int slow2 = nums[0];
        while (slow2 != slow) {
            slow = nums[slow];
            slow2 = nums[slow2];
        }
        return slow;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int findDuplicate(vector<int>& nums) {
        int slow = nums[0], fast = nums[0];
        do {
            slow = nums[slow];
            fast = nums[nums[fast]];
        } while (slow != fast);
        int slow2 = nums[0];
        while (slow2 != slow) {
            slow = nums[slow];
            slow2 = nums[slow2];
        }
        return slow;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Sorting or using a hash set — both violate the no-modify / O(1)-space constraints.",
      "Starting the second phase from the meeting point instead of from nums[0].",
      "Using a plain while loop without the do-while, so slow==fast immediately at start.",
    ],
    edgeCases: [
      "Duplicate appears more than twice.",
      "Minimal array like [1,1].",
      "Duplicate at the end of the array.",
    ],
    whyItMatters:
      "Find-the-Duplicate reframes an array as an implicit linked list and applies Floyd's cycle detection — a striking demonstration that a value-range problem can be solved with pointer-cycle theory under tight space limits.",
    estimatedMinutes: 32,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 247 — pure_dsa · dp_1d · medium · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-product-metric-streak",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "dp_1d",
    difficulty: "medium",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Maximum Product Metric Streak",
    framing:
      "A stream of multiplicative growth factors (some negative, representing dips) is logged per interval. Find the contiguous streak whose product is largest — the strongest compounding run.",
    statement:
      "Given an integer array nums, find a contiguous non-empty subarray that has the largest product, and return that product. The answer fits in a 32-bit integer.",
    inputFormat:
      "An integer array nums of length [1, 2*10^4]; values in [-10, 10].",
    outputFormat: "An integer: the maximum subarray product.",
    constraints: [
      "1 <= nums.length <= 2 * 10^4",
      "-10 <= nums[i] <= 10",
      "The product of any prefix fits in a 32-bit integer.",
    ],
    examples: [
      {
        input: "nums = [2,3,-2,4]",
        output: "6",
        explanation: "[2,3] gives 6; the -2 would flip the sign.",
      },
      {
        input: "nums = [-2,0,-1]",
        output: "0",
        explanation: "Best contiguous product is 0.",
      },
    ],
    approach: [
      "Unlike max-sum, a negative factor can turn the smallest (most negative) running product into the largest — so track BOTH the max and min products ending at each index.",
      "At each element x, the candidates for the new max are x, maxSoFar*x, minSoFar*x; likewise for the new min.",
      "When x is negative, max and min swap roles — handling them together via min/max of the three candidates covers this automatically.",
      "Maintain a global answer as the running max product seen.",
    ],
    solutionSteps: [
      "Initialize curMax = curMin = ans = nums[0].",
      "For each x from index 1: compute candidates {x, curMax*x, curMin*x}; set curMax = max, curMin = min of them.",
      "Update ans = max(ans, curMax).",
      "Return ans.",
    ],
    code: {
      python: `def max_product(nums: list[int]) -> int:
    cur_max = cur_min = ans = nums[0]
    for x in nums[1:]:
        candidates = (x, cur_max * x, cur_min * x)
        cur_max = max(candidates)
        cur_min = min(candidates)
        ans = max(ans, cur_max)
    return ans
`,
      java: `class Solution {
    public int maxProduct(int[] nums) {
        int curMax = nums[0], curMin = nums[0], ans = nums[0];
        for (int i = 1; i < nums.length; i++) {
            int x = nums[i];
            int a = x, b = curMax * x, c = curMin * x;
            curMax = Math.max(a, Math.max(b, c));
            curMin = Math.min(a, Math.min(b, c));
            ans = Math.max(ans, curMax);
        }
        return ans;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int maxProduct(vector<int>& nums) {
        int curMax = nums[0], curMin = nums[0], ans = nums[0];
        for (int i = 1; i < (int)nums.size(); i++) {
            int x = nums[i];
            int a = x, b = curMax * x, c = curMin * x;
            curMax = max({a, b, c});
            curMin = min({a, b, c});
            ans = max(ans, curMax);
        }
        return ans;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Tracking only the max product — a later negative makes the previously-minimal product the new maximum.",
      "Forgetting to consider x alone, which resets the streak after a zero.",
      "Initializing the global answer to 0 instead of nums[0], failing on all-negative single elements.",
    ],
    edgeCases: [
      "Single element (possibly negative).",
      "Zeros splitting the array into independent runs.",
      "All negative numbers.",
    ],
    whyItMatters:
      "Maximum Product Subarray is the classic dual-state Kadane variant — carrying both extremes because sign flips are non-monotone — a pattern reused in volatility and compounding-return analysis.",
    estimatedMinutes: 28,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 248 — pure_dsa · linked_list · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "clone-list-with-random-links",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "linked_list",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Deep-Copy a List With Random Pointers",
    framing:
      "A cache node list has both a next pointer and an arbitrary 'random' pointer to any node (or null). Produce a deep copy where the copied nodes mirror the original structure but reference only copied nodes.",
    statement:
      "A linked list of length n is given where each node has a next pointer and a random pointer that can point to any node in the list or be null. Construct a deep copy: n brand-new nodes whose value, next, and random pointers replicate the original, referencing only the new nodes. Return the head of the copy.",
    inputFormat:
      "The head of a linked list; each node has an integer val, a next pointer, and a random pointer (index or null in serialized form).",
    outputFormat: "The head of the deep-copied list.",
    constraints: [
      "0 <= n <= 1000",
      "-10^4 <= Node.val <= 10^4",
      "random points to a node in the list or is null.",
    ],
    examples: [
      {
        input: "[[7,null],[13,0],[11,4],[10,2],[1,0]]",
        output: "[[7,null],[13,0],[11,4],[10,2],[1,0]]",
        explanation: "A structurally identical copy with independent nodes.",
      },
      {
        input: "[]",
        output: "[]",
        explanation: "Empty list copies to empty.",
      },
    ],
    approach: [
      "Interweave copies: for each original node, create its clone and splice it directly after the original (A → A' → B → B' → ...).",
      "Set each clone's random: clone.random = original.random.next (the clone of the node the original's random points to). Guard against null random.",
      "Unweave the two lists to restore the original and extract the copy, fixing next pointers.",
      "This achieves O(1) extra space (no hashmap) in three linear passes.",
      "(A hashmap from original→clone is the simpler O(n)-space alternative if interleaving is error-prone.)",
    ],
    solutionSteps: [
      "Pass 1: insert clone nodes after each original.",
      "Pass 2: assign clone.random using orig.random.next.",
      "Pass 3: detach clones into their own list and restore original next pointers.",
      "Return the head of the cloned list.",
    ],
    code: {
      python: `class Node:
    def __init__(self, x: int, next=None, random=None):
        self.val = x
        self.next = next
        self.random = random

def copy_random_list(head: 'Node') -> 'Node':
    if not head:
        return None
    # Pass 1: weave clones in
    cur = head
    while cur:
        clone = Node(cur.val, cur.next)
        cur.next = clone
        cur = clone.next
    # Pass 2: set randoms
    cur = head
    while cur:
        if cur.random:
            cur.next.random = cur.random.next
        cur = cur.next.next
    # Pass 3: unweave
    cur = head
    copy_head = head.next
    while cur:
        clone = cur.next
        cur.next = clone.next
        clone.next = clone.next.next if clone.next else None
        cur = cur.next
    return copy_head
`,
      java: `class Node {
    int val;
    Node next, random;
    Node(int val) { this.val = val; }
}

class Solution {
    public Node copyRandomList(Node head) {
        if (head == null) return null;
        Node cur = head;
        while (cur != null) {
            Node clone = new Node(cur.val);
            clone.next = cur.next;
            cur.next = clone;
            cur = clone.next;
        }
        cur = head;
        while (cur != null) {
            if (cur.random != null) cur.next.random = cur.random.next;
            cur = cur.next.next;
        }
        cur = head;
        Node copyHead = head.next;
        while (cur != null) {
            Node clone = cur.next;
            cur.next = clone.next;
            clone.next = (clone.next != null) ? clone.next.next : null;
            cur = cur.next;
        }
        return copyHead;
    }
}
`,
      cpp: `class Node {
public:
    int val;
    Node *next, *random;
    Node(int v) : val(v), next(nullptr), random(nullptr) {}
};

class Solution {
public:
    Node* copyRandomList(Node* head) {
        if (!head) return nullptr;
        Node* cur = head;
        while (cur) {
            Node* clone = new Node(cur->val);
            clone->next = cur->next;
            cur->next = clone;
            cur = clone->next;
        }
        cur = head;
        while (cur) {
            if (cur->random) cur->next->random = cur->random->next;
            cur = cur->next->next;
        }
        cur = head;
        Node* copyHead = head->next;
        while (cur) {
            Node* clone = cur->next;
            cur->next = clone->next;
            clone->next = clone->next ? clone->next->next : nullptr;
            cur = cur->next;
        }
        return copyHead;
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(1) (excluding the output)" },
    pitfalls: [
      "Setting clone.random = cur.random (an original) instead of cur.random.next (its clone).",
      "Forgetting to restore the original list's next pointers during unweaving.",
      "Null-dereferencing when random is null or at the list tail.",
    ],
    edgeCases: [
      "Empty list.",
      "Single node whose random points to itself.",
      "All random pointers null.",
    ],
    whyItMatters:
      "Copy List with Random Pointers is the canonical interleave-and-split deep-copy trick — achieving O(1) auxiliary space where a naive hashmap would use O(n), a pattern relevant to structural cloning of graphs and DOM-like trees.",
    estimatedMinutes: 33,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 249 — pure_dsa · greedy · medium · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "cooldown-task-scheduler",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "greedy",
    difficulty: "medium",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "backend_engineer", "software_engineer"],
    title: "Task Scheduler With Cooldown",
    framing:
      "A worker runs CPU tasks labeled by type. Two tasks of the same type must be separated by at least n idle intervals (a cooldown). Each task and each idle slot takes one interval. Compute the least number of intervals to finish all tasks.",
    statement:
      "Given a char array tasks representing task types and an integer n (the cooldown between two same-type tasks), return the minimum number of intervals needed to execute all tasks. Each interval runs exactly one task or stays idle.",
    inputFormat:
      "An array tasks of uppercase letters and an integer n (cooldown).",
    outputFormat: "An integer: the minimum number of intervals.",
    constraints: [
      "1 <= tasks.length <= 10^4",
      "tasks[i] is an uppercase English letter.",
      "0 <= n <= 100",
    ],
    examples: [
      {
        input: 'tasks = ["A","A","A","B","B","B"], n = 2',
        output: "8",
        explanation: "A B idle A B idle A B → 8 intervals.",
      },
      {
        input: 'tasks = ["A","A","A","B","B","B"], n = 0',
        output: "6",
        explanation: "No cooldown; run them back to back.",
      },
    ],
    approach: [
      "Only the most frequent task type forces idle gaps. Let fmax be the maximum frequency.",
      "The most frequent task creates (fmax - 1) full frames each of length (n + 1), then one final slot for the last occurrence.",
      "Frame skeleton length = (fmax - 1) * (n + 1) + (number of task types that also have frequency fmax).",
      "If there are enough other tasks to fill all the idle gaps, no idling is needed and the answer is simply tasks.length.",
      "So the answer is max(tasks.length, skeleton).",
    ],
    solutionSteps: [
      "Count frequencies; find fmax and how many types share fmax (maxCount).",
      "skeleton = (fmax - 1) * (n + 1) + maxCount.",
      "Return max(tasks.length, skeleton).",
    ],
    code: {
      python: `from collections import Counter

def least_interval(tasks: list[str], n: int) -> int:
    counts = Counter(tasks)
    fmax = max(counts.values())
    max_count = sum(1 for c in counts.values() if c == fmax)
    skeleton = (fmax - 1) * (n + 1) + max_count
    return max(len(tasks), skeleton)
`,
      java: `class Solution {
    public int leastInterval(char[] tasks, int n) {
        int[] freq = new int[26];
        for (char t : tasks) freq[t - 'A']++;
        int fmax = 0;
        for (int f : freq) fmax = Math.max(fmax, f);
        int maxCount = 0;
        for (int f : freq) if (f == fmax) maxCount++;
        int skeleton = (fmax - 1) * (n + 1) + maxCount;
        return Math.max(tasks.length, skeleton);
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int leastInterval(vector<char>& tasks, int n) {
        int freq[26] = {0};
        for (char t : tasks) freq[t - 'A']++;
        int fmax = 0;
        for (int f : freq) fmax = max(fmax, f);
        int maxCount = 0;
        for (int f : freq) if (f == fmax) maxCount++;
        int skeleton = (fmax - 1) * (n + 1) + maxCount;
        return max((int)tasks.size(), skeleton);
    }
};
`,
    },
    complexity: { time: "O(N) where N = tasks.length", space: "O(1) (26 counters)" },
    pitfalls: [
      "Forgetting the max(tasks.length, skeleton) — when many distinct tasks fill the gaps, no idling occurs.",
      "Counting only one max-frequency type when several tie (the +maxCount term).",
      "Off-by-one in (fmax - 1) frames versus fmax.",
    ],
    edgeCases: [
      "n == 0 — answer is tasks.length.",
      "All tasks identical — forces maximum idling.",
      "Many distinct types — never idles.",
    ],
    whyItMatters:
      "Task Scheduler is a greedy formula derived from arranging the most frequent item into fixed-width frames — the same reasoning behind rate-limited job dispatch and cooldown-aware scheduling.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 250 — pure_dsa · bit_manipulation · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "two-unique-faulty-sensors",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 9,
    pattern: "bit_manipulation",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Identify Two Unique Faulty Sensors",
    framing:
      "Every sensor reports a paired heartbeat ID twice, except two faulty sensors that each report exactly once. Given the multiset of IDs, recover the two unique IDs using constant space.",
    statement:
      "Given an integer array nums in which exactly two elements appear only once and all other elements appear exactly twice, return the two elements that appear only once. The answer may be in any order. Use linear time and constant extra space.",
    inputFormat:
      "An integer array nums of length [2, 3*10^4]; exactly two elements appear once, the rest twice.",
    outputFormat: "An array of the two unique integers (any order).",
    constraints: [
      "2 <= nums.length <= 3 * 10^4",
      "Each integer fits in a 32-bit signed int.",
      "Exactly two elements appear once; every other appears twice.",
    ],
    examples: [
      {
        input: "nums = [1,2,1,3,2,5]",
        output: "[3,5]",
        explanation: "3 and 5 are the unpaired values.",
      },
      {
        input: "nums = [-1,0]",
        output: "[-1,0]",
        explanation: "Both appear once.",
      },
    ],
    approach: [
      "XOR all numbers: paired values cancel, leaving xorAll = a XOR b for the two uniques a, b.",
      "Since a != b, xorAll has at least one set bit; isolate the lowest set bit via xorAll & (-xorAll).",
      "That bit differs between a and b — partition all numbers into two groups by whether they have that bit set.",
      "XOR within each group: each group cancels its pairs and isolates one unique value.",
      "Return the two results.",
    ],
    solutionSteps: [
      "Compute xorAll = XOR of all elements.",
      "diff = xorAll & (-xorAll) (lowest set bit).",
      "For each x: if x & diff, fold into a; else fold into b.",
      "Return [a, b].",
    ],
    code: {
      python: `def single_number(nums: list[int]) -> list[int]:
    xor_all = 0
    for x in nums:
        xor_all ^= x
    # lowest set bit where the two uniques differ
    diff = xor_all & (-xor_all)
    a = b = 0
    for x in nums:
        if x & diff:
            a ^= x
        else:
            b ^= x
    return [a, b]
`,
      java: `class Solution {
    public int[] singleNumber(int[] nums) {
        int xorAll = 0;
        for (int x : nums) xorAll ^= x;
        int diff = xorAll & (-xorAll);
        int a = 0, b = 0;
        for (int x : nums) {
            if ((x & diff) != 0) a ^= x;
            else b ^= x;
        }
        return new int[]{a, b};
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    vector<int> singleNumber(vector<int>& nums) {
        long xorAll = 0;
        for (int x : nums) xorAll ^= x;
        int diff = (int)(xorAll & (-xorAll));
        int a = 0, b = 0;
        for (int x : nums) {
            if (x & diff) a ^= x;
            else b ^= x;
        }
        return {a, b};
    }
};
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Forgetting that XOR of all leaves a XOR b, not a single value.",
      "Mishandling the lowest-set-bit isolation for negative numbers (two's complement makes x & -x correct, but watch the type width).",
      "Partitioning by the wrong bit, sending both uniques into the same group.",
    ],
    edgeCases: [
      "Exactly two elements, both unique.",
      "Negative unique values.",
      "Uniques differing in only the highest bit.",
    ],
    whyItMatters:
      "Single Number III generalizes the XOR-cancellation trick with a bit-partition step — a constant-space classic that shows how an isolated differing bit can split a multiset cleanly.",
    estimatedMinutes: 30,
  },
];
