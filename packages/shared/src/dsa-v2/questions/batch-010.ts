// DSA v2 — Batch 10 (questions 251–300).
//
// 50 questions, 251–300. Difficulty mix: 39 hard + 11 medium.
// Bucket mix: 43 pure_dsa + 5 ai_applied + 2 indian_domain.
// All status pending_review. No duplicate canonical problems across the bank.
//
// Canonical coverage (distinct from batches 1–9):
//   251 Maximal Rectangle · 252 Word Ladder II · 253 Scramble String ·
//   254 Number of Atoms · 255 Remove Boxes · 256 Strange Printer ·
//   257 Max Sum of Rectangle No Larger Than K · 258 Longest Duplicate Substring ·
//   259 Count Different Palindromic Subsequences · 260 Tallest Billboard ·
//   261 Paint House III · 262 Bus Routes · 263 Shortest Path in Grid with
//   Obstacle Elimination · 264 Cut Off Trees for Golf Event ·
//   265 Substring with Concatenation of All Words · 266 24 Game ·
//   267 Create Maximum Number · 268 My Calendar III · 269 Falling Squares ·
//   270 Data Stream as Disjoint Intervals · 271 Minimum Taps to Open to Water
//   a Garden · 272 Constrained Subsequence Sum · 273 Maximum Number of Events
//   That Can Be Attended II · 274 Number of Music Playlists · 275 Minimum
//   Falling Path Sum II · 276 Maximum Students Taking Exam · 277 Parallel
//   Courses II · 278 Maximum AND Sum of Array · 279 Smallest Sufficient Team ·
//   280 Number of Ways to Wear Different Hats · 281 Allocate Mailboxes ·
//   282 Stone Game V · 283 Super Egg Drop · 284 Freedom Trail · 285 Minimum
//   Insertion Steps to Make a String Palindrome · 286 Count Subarrays With
//   Fixed Bounds · 287 Subarrays with K Different Integers · 288 Minimum Number
//   of K Consecutive Bit Flips · 289 Shortest Subarray with Sum at Least K ·
//   290 Jump Game II · 291 Find All Anagrams in a String · 292 Shortest Bridge ·
//   293 Knight Dialer · 294 Count Square Submatrices with All Ones ·
//   295 Remove Duplicate Letters · 296 Grumpy Bookstore Owner · 297 Count
//   Number of Nice Subarrays · 298 Out of Boundary Paths · 299 Longest
//   Arithmetic Subsequence · 300 Partition Labels.

import type { DsaV2Question } from "../types";

export const BATCH_010: readonly DsaV2Question[] = [
  // ──────────────────────────────────────────────────────────────────────
  // 251 — pure_dsa · stack_queue · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "maximal-uptime-rectangle",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "stack_queue",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Largest All-Healthy Rectangle in a Status Grid",
    framing:
      "A monitoring dashboard renders a grid where each cell is 1 (healthy) or 0 (degraded). Find the area of the largest axis-aligned rectangle containing only healthy cells.",
    statement:
      "Given a rows x cols binary matrix filled with 0s and 1s, find the largest rectangle containing only 1s and return its area.",
    inputFormat:
      "A 2D matrix of characters '0'/'1' (or integers 0/1), with rows in [1, 200] and cols in [1, 200].",
    outputFormat: "An integer: the maximum all-ones rectangle area.",
    constraints: [
      "rows == matrix.length, cols == matrix[0].length",
      "1 <= rows, cols <= 200",
      "matrix[i][j] is '0' or '1'.",
    ],
    examples: [
      {
        input: 'matrix = [["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]]',
        output: "6",
        explanation: "The 2x3 block of 1s in the lower-middle has area 6.",
      },
      {
        input: 'matrix = [["0"]]',
        output: "0",
        explanation: "No healthy cell.",
      },
    ],
    approach: [
      "Reduce to 'Largest Rectangle in Histogram' applied row by row.",
      "Maintain a heights array: for each column, heights[c] is the number of consecutive 1s ending at the current row (reset to 0 on a 0).",
      "After updating heights for a row, compute the largest rectangle in that histogram using a monotonic increasing stack.",
      "For each bar popped because a shorter bar arrived, the popped bar's height spans from the new boundary to the previous stack top — area = height * width.",
      "Track the global maximum across all rows.",
    ],
    solutionSteps: [
      "Initialize heights[cols] to 0.",
      "For each row: heights[c] = matrix[r][c]=='1' ? heights[c]+1 : 0.",
      "Run largestRectangleInHistogram(heights) with a stack of indices, using a sentinel 0 at the end.",
      "Update the answer with each row's best.",
      "Return the global maximum.",
    ],
    code: {
      python: `def maximal_rectangle(matrix: list[list[str]]) -> int:
    if not matrix or not matrix[0]:
        return 0
    cols = len(matrix[0])
    heights = [0] * cols
    best = 0

    def largest_in_histogram(h: list[int]) -> int:
        stack = []  # indices of increasing bars
        area = 0
        for i in range(len(h) + 1):
            cur = h[i] if i < len(h) else 0
            while stack and h[stack[-1]] >= cur:
                top = stack.pop()
                width = i if not stack else i - stack[-1] - 1
                area = max(area, h[top] * width)
            stack.append(i)
        return area

    for row in matrix:
        for c in range(cols):
            heights[c] = heights[c] + 1 if row[c] == "1" else 0
        best = max(best, largest_in_histogram(heights))
    return best
`,
      java: `import java.util.*;

class Solution {
    public int maximalRectangle(char[][] matrix) {
        if (matrix.length == 0 || matrix[0].length == 0) return 0;
        int cols = matrix[0].length;
        int[] heights = new int[cols];
        int best = 0;
        for (char[] row : matrix) {
            for (int c = 0; c < cols; c++)
                heights[c] = row[c] == '1' ? heights[c] + 1 : 0;
            best = Math.max(best, largestInHistogram(heights));
        }
        return best;
    }

    private int largestInHistogram(int[] h) {
        Deque<Integer> stack = new ArrayDeque<>();
        int area = 0;
        for (int i = 0; i <= h.length; i++) {
            int cur = i < h.length ? h[i] : 0;
            while (!stack.isEmpty() && h[stack.peek()] >= cur) {
                int top = stack.pop();
                int width = stack.isEmpty() ? i : i - stack.peek() - 1;
                area = Math.max(area, h[top] * width);
            }
            stack.push(i);
        }
        return area;
    }
}
`,
      cpp: `#include <vector>
#include <stack>
#include <algorithm>
using namespace std;

class Solution {
    int largestInHistogram(vector<int>& h) {
        stack<int> st;
        int area = 0, n = h.size();
        for (int i = 0; i <= n; i++) {
            int cur = i < n ? h[i] : 0;
            while (!st.empty() && h[st.top()] >= cur) {
                int top = st.top(); st.pop();
                int width = st.empty() ? i : i - st.top() - 1;
                area = max(area, h[top] * width);
            }
            st.push(i);
        }
        return area;
    }
public:
    int maximalRectangle(vector<vector<char>>& matrix) {
        if (matrix.empty() || matrix[0].empty()) return 0;
        int cols = matrix[0].size();
        vector<int> heights(cols, 0);
        int best = 0;
        for (auto& row : matrix) {
            for (int c = 0; c < cols; c++)
                heights[c] = row[c] == '1' ? heights[c] + 1 : 0;
            best = max(best, largestInHistogram(heights));
        }
        return best;
    }
};
`,
    },
    complexity: { time: "O(rows * cols)", space: "O(cols)" },
    pitfalls: [
      "Recomputing each histogram from scratch instead of carrying heights row to row.",
      "Width miscalculation when the stack empties — width should span to the current index.",
      "Forgetting the trailing sentinel that flushes the stack at row end.",
    ],
    edgeCases: [
      "All zeros — area 0.",
      "All ones — full rows*cols area.",
      "Single row reduces to a pure histogram.",
    ],
    whyItMatters:
      "Maximal Rectangle layers histogram-stack reasoning over a prefix-height transform — the canonical 2D-to-1D reduction behind heatmap region detection and contiguous-resource allocation.",
    estimatedMinutes: 42,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 252 — pure_dsa · graphs · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "word-ladder-all-shortest-chains",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "All Shortest Token Transformation Chains",
    framing:
      "A token can mutate one character at a time, but every intermediate token must exist in an approved vocabulary. Enumerate every shortest mutation chain from a begin token to an end token.",
    statement:
      "Given two words beginWord and endWord and a dictionary wordList, return all the shortest transformation sequences from beginWord to endWord. Each adjacent pair of words differs by exactly one letter, and every intermediate word must be in wordList. Return an empty list if no such sequence exists. beginWord need not be in wordList.",
    inputFormat:
      "Strings beginWord and endWord of equal length, and a list wordList of words.",
    outputFormat: "A list of transformation sequences (each a list of words).",
    constraints: [
      "1 <= beginWord.length <= 7",
      "endWord.length == beginWord.length",
      "1 <= wordList.length <= 500",
      "All words are lowercase and the same length.",
    ],
    examples: [
      {
        input: 'beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log","cog"]',
        output: '[["hit","hot","dot","dog","cog"],["hit","hot","lot","log","cog"]]',
        explanation: "Two distinct shortest chains of length 5.",
      },
      {
        input: 'beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log"]',
        output: "[]",
        explanation: "endWord 'cog' is absent, so no sequence exists.",
      },
    ],
    approach: [
      "Two-phase: a BFS that builds a layered graph (predecessors), then a DFS/backtrack that reconstructs all shortest paths.",
      "BFS level by level from beginWord; for each word generate all one-letter neighbors present in the unused dictionary.",
      "Record parents[child] = set of words from which child was first reached at the current level; only link within the same BFS layer to keep paths shortest.",
      "Stop expanding once endWord is found at a layer; do not process deeper layers.",
      "Backtrack from endWord through parents to assemble every shortest sequence, reversing at the end.",
    ],
    solutionSteps: [
      "Put wordList into a set; if endWord absent return [].",
      "BFS by layers: track current frontier; compute next-layer words and parents map; remove visited words after each full layer to avoid cross-layer links.",
      "If endWord enters a layer, mark found and finish after that layer.",
      "DFS from endWord up the parents map building paths; reverse and collect.",
      "Return all collected sequences.",
    ],
    code: {
      python: `from collections import defaultdict

def find_ladders(beginWord: str, endWord: str, wordList: list[str]) -> list[list[str]]:
    words = set(wordList)
    if endWord not in words:
        return []
    parents = defaultdict(set)
    level = {beginWord}
    found = False
    while level and not found:
        next_level = defaultdict(set)
        for word in level:
            for i in range(len(word)):
                for c in "abcdefghijklmnopqrstuvwxyz":
                    cand = word[:i] + c + word[i + 1:]
                    if cand in words and cand not in level:
                        next_level[cand].add(word)
        # remove this layer's discovered words so deeper layers can't relink
        for w in next_level:
            words.discard(w)
        for child, pars in next_level.items():
            parents[child] |= pars
            if child == endWord:
                found = True
        level = set(next_level.keys())

    res = []
    if not found:
        return res

    def backtrack(word: str, path: list[str]) -> None:
        if word == beginWord:
            res.append([beginWord] + path[::-1])
            return
        for p in parents[word]:
            backtrack(p, path + [word])

    backtrack(endWord, [])
    return res
`,
      java: `import java.util.*;

class Solution {
    public List<List<String>> findLadders(String beginWord, String endWord, List<String> wordList) {
        Set<String> words = new HashSet<>(wordList);
        List<List<String>> res = new ArrayList<>();
        if (!words.contains(endWord)) return res;
        Map<String, Set<String>> parents = new HashMap<>();
        Set<String> level = new HashSet<>();
        level.add(beginWord);
        boolean found = false;
        while (!level.isEmpty() && !found) {
            Map<String, Set<String>> next = new HashMap<>();
            for (String word : level) {
                char[] arr = word.toCharArray();
                for (int i = 0; i < arr.length; i++) {
                    char old = arr[i];
                    for (char c = 'a'; c <= 'z'; c++) {
                        arr[i] = c;
                        String cand = new String(arr);
                        if (words.contains(cand) && !level.contains(cand)) {
                            next.computeIfAbsent(cand, k -> new HashSet<>()).add(word);
                        }
                    }
                    arr[i] = old;
                }
            }
            words.removeAll(next.keySet());
            for (Map.Entry<String, Set<String>> e : next.entrySet()) {
                parents.computeIfAbsent(e.getKey(), k -> new HashSet<>()).addAll(e.getValue());
                if (e.getKey().equals(endWord)) found = true;
            }
            level = next.keySet();
        }
        if (found) {
            LinkedList<String> path = new LinkedList<>();
            path.add(endWord);
            backtrack(endWord, beginWord, parents, path, res);
        }
        return res;
    }

    private void backtrack(String word, String begin, Map<String, Set<String>> parents,
                           LinkedList<String> path, List<List<String>> res) {
        if (word.equals(begin)) {
            res.add(new ArrayList<>(path));
            return;
        }
        for (String p : parents.getOrDefault(word, Collections.emptySet())) {
            path.addFirst(p);
            backtrack(p, begin, parents, path, res);
            path.removeFirst();
        }
    }
}
`,
      cpp: `#include <vector>
#include <string>
#include <unordered_set>
#include <unordered_map>
using namespace std;

class Solution {
    void backtrack(const string& word, const string& begin,
                   unordered_map<string, vector<string>>& parents,
                   vector<string>& path, vector<vector<string>>& res) {
        if (word == begin) {
            vector<string> p(path.rbegin(), path.rend());
            res.push_back(p);
            return;
        }
        for (auto& par : parents[word]) {
            path.push_back(par);
            backtrack(par, begin, parents, path, res);
            path.pop_back();
        }
    }
public:
    vector<vector<string>> findLadders(string beginWord, string endWord, vector<string>& wordList) {
        unordered_set<string> words(wordList.begin(), wordList.end());
        vector<vector<string>> res;
        if (!words.count(endWord)) return res;
        unordered_map<string, vector<string>> parents;
        unordered_set<string> level{beginWord};
        bool found = false;
        while (!level.empty() && !found) {
            unordered_map<string, vector<string>> next;
            for (auto word : level) {
                string cur = word;
                for (int i = 0; i < (int)cur.size(); i++) {
                    char old = cur[i];
                    for (char c = 'a'; c <= 'z'; c++) {
                        cur[i] = c;
                        if (words.count(cur) && !level.count(cur))
                            next[cur].push_back(word);
                    }
                    cur[i] = old;
                }
            }
            for (auto& kv : next) words.erase(kv.first);
            unordered_set<string> nlevel;
            for (auto& kv : next) {
                for (auto& p : kv.second) parents[kv.first].push_back(p);
                if (kv.first == endWord) found = true;
                nlevel.insert(kv.first);
            }
            level = nlevel;
        }
        if (found) {
            vector<string> path{endWord};
            backtrack(endWord, beginWord, parents, path, res);
        }
        return res;
    }
};
`,
    },
    complexity: { time: "O(N * L * 26) BFS + paths", space: "O(N * L)" },
    pitfalls: [
      "Removing words during a layer instead of after it, which severs valid same-layer parents.",
      "Continuing BFS past the layer where endWord appears, yielding non-shortest chains.",
      "Forgetting beginWord may not be in the dictionary.",
    ],
    edgeCases: [
      "endWord missing — [].",
      "beginWord one step from endWord.",
      "Multiple equally short chains.",
    ],
    whyItMatters:
      "Word Ladder II combines layered BFS with parent-tracked backtracking to enumerate ALL shortest paths — the same construct behind shortest-edit explanation and multi-route navigation that must surface every optimal option.",
    estimatedMinutes: 48,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 253 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "scramble-token-tree-match",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Is One Token a Scramble of Another",
    framing:
      "A token can be recursively scrambled: split it into two non-empty parts and optionally swap them, then recurse into each part. Decide whether one token is a scramble of another.",
    statement:
      "We can scramble a string s by recursively partitioning it into two non-empty substrings and optionally swapping them, applying the same process to each part. Given two strings s1 and s2 of the same length, return true if s2 is a scramble of s1.",
    inputFormat:
      "Two strings s1 and s2 of equal length in [1, 30], lowercase letters.",
    outputFormat: "A boolean: whether s2 is a scramble of s1.",
    constraints: [
      "s1.length == s2.length",
      "1 <= s1.length <= 30",
      "s1 and s2 consist of lowercase English letters.",
    ],
    examples: [
      {
        input: 's1 = "great", s2 = "rgeat"',
        output: "true",
        explanation: "Swap 'gr' and 'eat' subtrees appropriately to reach rgeat.",
      },
      {
        input: 's1 = "abcde", s2 = "caebd"',
        output: "false",
        explanation: "No sequence of recursive swaps yields caebd.",
      },
    ],
    approach: [
      "Recursive divide-and-conquer with memoization keyed by (s1 substring, s2 substring).",
      "Base cases: equal strings → true; differing character multisets → false (a quick prune).",
      "For each split point k in [1, n-1], try two scenarios: no swap — s1[:k] matches s2[:k] AND s1[k:] matches s2[k:]; with swap — s1[:k] matches s2[n-k:] AND s1[k:] matches s2[:n-k].",
      "Recurse on the substrings; memoize results to avoid exponential recomputation.",
      "Return true if any split satisfies either scenario.",
    ],
    solutionSteps: [
      "Define solve(a, b) with memo over (a, b).",
      "If a == b return true; if sorted(a) != sorted(b) return false.",
      "Loop k from 1 to len-1; check no-swap and swap recursions.",
      "Memoize and return the disjunction.",
    ],
    code: {
      python: `from functools import lru_cache

def is_scramble(s1: str, s2: str) -> bool:
    @lru_cache(maxsize=None)
    def solve(a: str, b: str) -> bool:
        if a == b:
            return True
        if sorted(a) != sorted(b):
            return False
        n = len(a)
        for k in range(1, n):
            # no swap
            if solve(a[:k], b[:k]) and solve(a[k:], b[k:]):
                return True
            # swap
            if solve(a[:k], b[n - k:]) and solve(a[k:], b[:n - k]):
                return True
        return False

    return solve(s1, s2)
`,
      java: `import java.util.*;

class Solution {
    private Map<String, Boolean> memo = new HashMap<>();

    public boolean isScramble(String s1, String s2) {
        if (s1.equals(s2)) return true;
        String key = s1 + "#" + s2;
        if (memo.containsKey(key)) return memo.get(key);
        if (!sortedEqual(s1, s2)) { memo.put(key, false); return false; }
        int n = s1.length();
        for (int k = 1; k < n; k++) {
            if (isScramble(s1.substring(0, k), s2.substring(0, k))
                && isScramble(s1.substring(k), s2.substring(k))) {
                memo.put(key, true); return true;
            }
            if (isScramble(s1.substring(0, k), s2.substring(n - k))
                && isScramble(s1.substring(k), s2.substring(0, n - k))) {
                memo.put(key, true); return true;
            }
        }
        memo.put(key, false);
        return false;
    }

    private boolean sortedEqual(String a, String b) {
        int[] cnt = new int[26];
        for (int i = 0; i < a.length(); i++) { cnt[a.charAt(i) - 'a']++; cnt[b.charAt(i) - 'a']--; }
        for (int c : cnt) if (c != 0) return false;
        return true;
    }
}
`,
      cpp: `#include <string>
#include <unordered_map>
using namespace std;

class Solution {
    unordered_map<string, bool> memo;
    bool sortedEqual(const string& a, const string& b) {
        int cnt[26] = {0};
        for (int i = 0; i < (int)a.size(); i++) { cnt[a[i]-'a']++; cnt[b[i]-'a']--; }
        for (int c : cnt) if (c) return false;
        return true;
    }
public:
    bool isScramble(string s1, string s2) {
        if (s1 == s2) return true;
        string key = s1 + "#" + s2;
        auto it = memo.find(key);
        if (it != memo.end()) return it->second;
        if (!sortedEqual(s1, s2)) return memo[key] = false;
        int n = s1.size();
        for (int k = 1; k < n; k++) {
            if (isScramble(s1.substr(0, k), s2.substr(0, k))
                && isScramble(s1.substr(k), s2.substr(k)))
                return memo[key] = true;
            if (isScramble(s1.substr(0, k), s2.substr(n - k))
                && isScramble(s1.substr(k), s2.substr(0, n - k)))
                return memo[key] = true;
        }
        return memo[key] = false;
    }
};
`,
    },
    complexity: { time: "O(n^4) with memoization", space: "O(n^3) distinct states" },
    pitfalls: [
      "Skipping the character-multiset prune, causing severe blowup.",
      "Mixing up the swap indices (s2[n-k:] vs s2[:n-k]).",
      "Not memoizing, which makes the recursion exponential.",
    ],
    edgeCases: [
      "Identical strings — true.",
      "Single character — equal iff same char.",
      "Anagrams that still cannot be reached by recursive swaps.",
    ],
    whyItMatters:
      "Scramble String is the archetypal interval recursion with a swap dimension — its split-and-optionally-swap structure mirrors recursive tree-equivalence checks and parser reordering proofs.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 254 — pure_dsa · stack_queue · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "parse-molecule-atom-counts",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "stack_queue",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Count Atoms in a Chemical Formula",
    framing:
      "A parser must expand a chemical formula with nested parentheses and multipliers into a sorted count of each element — a clean stress test for recursive-descent or stack-based parsing.",
    statement:
      "Given a string formula representing a chemical formula, return the count of each atom. The formula contains element names (an uppercase letter optionally followed by lowercase letters), optional counts, and parenthesized groups with optional multipliers. Output the elements in sorted order, each followed by its count if greater than 1, concatenated with no spaces.",
    inputFormat:
      "A string formula of length [1, 1000] that is a valid chemical formula.",
    outputFormat:
      "A string: element names in alphabetical order, each followed by its total count if > 1.",
    constraints: [
      "1 <= formula.length <= 1000",
      "Element names start with an uppercase letter, optionally followed by lowercase letters.",
      "All counts are positive integers (absent means 1).",
    ],
    examples: [
      {
        input: 'formula = "H2O"',
        output: '"H2O"',
        explanation: "2 H atoms and 1 O atom.",
      },
      {
        input: 'formula = "K4(ON(SO3)2)2"',
        output: '"K4N2O14S4"',
        explanation: "Nested multipliers expand and sum per element.",
      },
    ],
    approach: [
      "Use a stack of count maps. The top map accumulates atoms for the current parenthesis depth.",
      "Scan left to right: on an element, parse its name and optional count, add to the top map.",
      "On '(' push a new empty map; on ')' parse the trailing multiplier, pop the group map, multiply every count, and merge into the new top.",
      "After scanning, the bottom map holds totals.",
      "Sort element names and build the output string, omitting counts equal to 1.",
    ],
    solutionSteps: [
      "Initialize a stack with one empty Counter.",
      "Parse tokens: element + optional number → add; '(' → push; ')' + number → pop, scale, merge.",
      "Helper to read a multi-digit number (default 1).",
      "Sort keys; format name + (count if > 1).",
      "Return the joined string.",
    ],
    code: {
      python: `from collections import Counter

def count_of_atoms(formula: str) -> str:
    n = len(formula)
    i = 0
    stack = [Counter()]

    def read_number() -> int:
        nonlocal i
        start = i
        while i < n and formula[i].isdigit():
            i += 1
        return int(formula[start:i]) if i > start else 1

    while i < n:
        ch = formula[i]
        if ch == "(":
            stack.append(Counter())
            i += 1
        elif ch == ")":
            i += 1
            mult = read_number()
            top = stack.pop()
            for el, cnt in top.items():
                stack[-1][el] += cnt * mult
        else:
            # element: uppercase then optional lowercase
            start = i
            i += 1
            while i < n and formula[i].islower():
                i += 1
            element = formula[start:i]
            cnt = read_number()
            stack[-1][element] += cnt

    totals = stack[0]
    res = []
    for el in sorted(totals):
        res.append(el)
        if totals[el] > 1:
            res.append(str(totals[el]))
    return "".join(res)
`,
      java: `import java.util.*;

class Solution {
    private int i = 0;
    private String f;

    public String countOfAtoms(String formula) {
        f = formula;
        int n = f.length();
        Deque<Map<String, Integer>> stack = new ArrayDeque<>();
        stack.push(new HashMap<>());
        while (i < n) {
            char ch = f.charAt(i);
            if (ch == '(') {
                stack.push(new HashMap<>());
                i++;
            } else if (ch == ')') {
                i++;
                int mult = readNumber();
                Map<String, Integer> top = stack.pop();
                Map<String, Integer> cur = stack.peek();
                for (Map.Entry<String, Integer> e : top.entrySet())
                    cur.merge(e.getKey(), e.getValue() * mult, Integer::sum);
            } else {
                int start = i++;
                while (i < n && Character.isLowerCase(f.charAt(i))) i++;
                String element = f.substring(start, i);
                int cnt = readNumber();
                stack.peek().merge(element, cnt, Integer::sum);
            }
        }
        Map<String, Integer> totals = stack.peek();
        StringBuilder sb = new StringBuilder();
        for (String el : new TreeSet<>(totals.keySet())) {
            sb.append(el);
            if (totals.get(el) > 1) sb.append(totals.get(el));
        }
        return sb.toString();
    }

    private int readNumber() {
        int start = i;
        while (i < f.length() && Character.isDigit(f.charAt(i))) i++;
        return i > start ? Integer.parseInt(f.substring(start, i)) : 1;
    }
}
`,
      cpp: `#include <string>
#include <map>
#include <vector>
#include <cctype>
using namespace std;

class Solution {
    int i = 0;
    string f;
    int readNumber() {
        int start = i;
        while (i < (int)f.size() && isdigit(f[i])) i++;
        return i > start ? stoi(f.substr(start, i - start)) : 1;
    }
public:
    string countOfAtoms(string formula) {
        f = formula;
        int n = f.size();
        vector<map<string,long long>> stack(1);
        while (i < n) {
            char ch = f[i];
            if (ch == '(') { stack.push_back({}); i++; }
            else if (ch == ')') {
                i++;
                long long mult = readNumber();
                auto top = stack.back(); stack.pop_back();
                for (auto& kv : top) stack.back()[kv.first] += kv.second * mult;
            } else {
                int start = i++;
                while (i < n && islower(f[i])) i++;
                string element = f.substr(start, i - start);
                long long cnt = readNumber();
                stack.back()[element] += cnt;
            }
        }
        string res;
        for (auto& kv : stack[0]) {
            res += kv.first;
            if (kv.second > 1) res += to_string(kv.second);
        }
        return res;
    }
};
`,
    },
    complexity: { time: "O(n log k) for sort over k elements", space: "O(n)" },
    pitfalls: [
      "Treating a missing count as 0 instead of 1.",
      "Not multiplying the entire popped group by the post-paren multiplier.",
      "Mis-parsing multi-character element names like 'Mg' or multi-digit counts.",
    ],
    edgeCases: [
      "Single element with no count.",
      "Deeply nested parentheses.",
      "Multiplier applied to a group containing repeated elements.",
    ],
    whyItMatters:
      "Number of Atoms is a compact recursive-descent / stack-of-scopes parsing exercise — the same nested-scope accumulation that powers expression interpreters and config-template expansion.",
    estimatedMinutes: 42,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 255 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "remove-boxes-max-points",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Remove Colored Boxes for Maximum Points",
    framing:
      "A conveyor holds colored boxes in a row. Removing a contiguous run of k same-colored boxes scores k*k points and closes the gap. Maximize total points by choosing the removal order.",
    statement:
      "Given an array boxes where boxes[i] is the color of the i-th box, repeatedly remove a contiguous group of boxes of the same color. Removing a group of k boxes earns k*k points. Return the maximum points obtainable by removing all boxes in some order.",
    inputFormat:
      "An integer array boxes of length [1, 100] with color values in [1, 100].",
    outputFormat: "An integer: the maximum total points.",
    constraints: [
      "1 <= boxes.length <= 100",
      "1 <= boxes[i] <= 100",
    ],
    examples: [
      {
        input: "boxes = [1,3,2,2,2,3,4,3,1]",
        output: "23",
        explanation: "Optimal removals achieve 23 points.",
      },
      {
        input: "boxes = [1,1,1]",
        output: "9",
        explanation: "Remove all three at once: 3*3 = 9.",
      },
    ],
    approach: [
      "Define dp[i][j][k] = max points to clear boxes[i..j] given that k extra boxes equal in color to boxes[i] are already attached to the left of index i.",
      "Option A: remove boxes[i] together with its k attached companions immediately — gain (k+1)*(k+1) + dp[i+1][j][0].",
      "Option B: defer — find some m in (i, j] with boxes[m]==boxes[i], first clear the middle dp[i+1][m-1][0], then merge box i's group with box m, giving dp[m][j][k+1].",
      "Take the maximum over option A and all valid m.",
      "Memoize over (i, j, k).",
    ],
    solutionSteps: [
      "Recurse solve(i, j, k); base: i > j → 0.",
      "Compress leading equal boxes into k (optional optimization).",
      "best = (k+1)^2 + solve(i+1, j, 0).",
      "For each m in (i, j] with boxes[m]==boxes[i]: best = max(best, solve(i+1, m-1, 0) + solve(m, j, k+1)).",
      "Memoize and return best; answer is solve(0, n-1, 0).",
    ],
    code: {
      python: `from functools import lru_cache

def remove_boxes(boxes: list[int]) -> int:
    n = len(boxes)

    @lru_cache(maxsize=None)
    def solve(i: int, j: int, k: int) -> int:
        if i > j:
            return 0
        # group leading equal boxes to reduce states
        while i < j and boxes[i + 1] == boxes[i]:
            i += 1
            k += 1
        best = (k + 1) * (k + 1) + solve(i + 1, j, 0)
        for m in range(i + 1, j + 1):
            if boxes[m] == boxes[i]:
                best = max(best, solve(i + 1, m - 1, 0) + solve(m, j, k + 1))
        return best

    return solve(0, n - 1, 0)
`,
      java: `class Solution {
    private int[][][] memo;
    private int[] boxes;

    public int removeBoxes(int[] boxes) {
        this.boxes = boxes;
        int n = boxes.length;
        memo = new int[n][n][n];
        return solve(0, n - 1, 0);
    }

    private int solve(int i, int j, int k) {
        if (i > j) return 0;
        if (memo[i][j][k] != 0) return memo[i][j][k];
        int i0 = i, k0 = k;
        while (i < j && boxes[i + 1] == boxes[i]) { i++; k++; }
        int best = (k + 1) * (k + 1) + solve(i + 1, j, 0);
        for (int m = i + 1; m <= j; m++) {
            if (boxes[m] == boxes[i]) {
                best = Math.max(best, solve(i + 1, m - 1, 0) + solve(m, j, k + 1));
            }
        }
        memo[i0][j][k0] = best;
        return best;
    }
}
`,
      cpp: `#include <vector>
#include <cstring>
#include <algorithm>
using namespace std;

class Solution {
    int memo[100][100][100];
    vector<int> boxes;
    int solve(int i, int j, int k) {
        if (i > j) return 0;
        if (memo[i][j][k]) return memo[i][j][k];
        int i0 = i, k0 = k;
        while (i < j && boxes[i + 1] == boxes[i]) { i++; k++; }
        int best = (k + 1) * (k + 1) + solve(i + 1, j, 0);
        for (int m = i + 1; m <= j; m++)
            if (boxes[m] == boxes[i])
                best = max(best, solve(i + 1, m - 1, 0) + solve(m, j, k + 1));
        return memo[i0][j][k0] = best;
    }
public:
    int removeBoxes(vector<int>& b) {
        boxes = b;
        memset(memo, 0, sizeof(memo));
        return solve(0, b.size() - 1, 0);
    }
};
`,
    },
    complexity: { time: "O(n^4)", space: "O(n^3)" },
    pitfalls: [
      "Omitting the third dimension k — the attached-count is essential because removing later can be more valuable.",
      "Caching under the compressed (i, k) but reading with the original indices, or vice versa.",
      "Using 0 as both 'uncomputed' and a legitimate score (scores here are always positive, so it is safe, but be deliberate).",
    ],
    edgeCases: [
      "All same color — n*n.",
      "All distinct — n points.",
      "Single box — 1.",
    ],
    whyItMatters:
      "Remove Boxes is a famous 3D interval DP where the extra dimension encodes deferred merges — the canonical example that some interval problems need state beyond the interval itself.",
    estimatedMinutes: 50,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 256 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "strange-printer-min-turns",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Fewest Printer Passes to Render a Banner",
    framing:
      "A peculiar printer prints one contiguous run of a single character per pass, and a later pass can overwrite part of an earlier run. Find the minimum number of passes to produce a target string.",
    statement:
      "There is a strange printer that can only print a sequence of the same character each turn, and can print new characters over existing ones starting and ending at any position. Given a string s, return the minimum number of turns the printer needs to print it.",
    inputFormat:
      "A string s of length [1, 100], lowercase English letters.",
    outputFormat: "An integer: the minimum number of printing turns.",
    constraints: [
      "1 <= s.length <= 100",
      "s consists of lowercase English letters.",
    ],
    examples: [
      {
        input: 's = "aaabbb"',
        output: "2",
        explanation: "Print 'aaa' then 'bbb'.",
      },
      {
        input: 's = "aba"',
        output: "2",
        explanation: "Print 'aaa', then overwrite the middle with 'b'.",
      },
    ],
    approach: [
      "Interval DP: dp[i][j] = minimum turns to print substring s[i..j].",
      "Base: a single character costs 1 turn.",
      "Default: dp[i][j] = dp[i][j-1] + 1 (print s[j] as its own turn).",
      "Improvement: if some k in [i, j-1] has s[k] == s[j], we can extend the run that printed s[k] to also cover s[j], saving a turn: dp[i][j] = min(dp[i][j], dp[i][k] + dp[k+1][j-1]).",
      "Fill by increasing interval length; answer is dp[0][n-1].",
    ],
    solutionSteps: [
      "Initialize dp[i][i] = 1.",
      "For length L from 2..n, for each i with j = i+L-1: set dp[i][j] = dp[i][j-1] + 1.",
      "For k in [i, j-1]: if s[k]==s[j], dp[i][j] = min(dp[i][j], dp[i][k] + (dp[k+1][j-1] if k+1<=j-1 else 0)).",
      "Return dp[0][n-1].",
    ],
    code: {
      python: `def strange_printer(s: str) -> int:
    n = len(s)
    if n == 0:
        return 0
    dp = [[0] * n for _ in range(n)]
    for i in range(n):
        dp[i][i] = 1
    for length in range(2, n + 1):
        for i in range(0, n - length + 1):
            j = i + length - 1
            dp[i][j] = dp[i][j - 1] + 1
            for k in range(i, j):
                if s[k] == s[j]:
                    mid = dp[k + 1][j - 1] if k + 1 <= j - 1 else 0
                    dp[i][j] = min(dp[i][j], dp[i][k] + mid)
    return dp[0][n - 1]
`,
      java: `class Solution {
    public int strangePrinter(String s) {
        int n = s.length();
        if (n == 0) return 0;
        int[][] dp = new int[n][n];
        for (int i = 0; i < n; i++) dp[i][i] = 1;
        for (int length = 2; length <= n; length++) {
            for (int i = 0; i + length - 1 < n; i++) {
                int j = i + length - 1;
                dp[i][j] = dp[i][j - 1] + 1;
                for (int k = i; k < j; k++) {
                    if (s.charAt(k) == s.charAt(j)) {
                        int mid = (k + 1 <= j - 1) ? dp[k + 1][j - 1] : 0;
                        dp[i][j] = Math.min(dp[i][j], dp[i][k] + mid);
                    }
                }
            }
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
    int strangePrinter(string s) {
        int n = s.size();
        if (n == 0) return 0;
        vector<vector<int>> dp(n, vector<int>(n, 0));
        for (int i = 0; i < n; i++) dp[i][i] = 1;
        for (int length = 2; length <= n; length++) {
            for (int i = 0; i + length - 1 < n; i++) {
                int j = i + length - 1;
                dp[i][j] = dp[i][j - 1] + 1;
                for (int k = i; k < j; k++) {
                    if (s[k] == s[j]) {
                        int mid = (k + 1 <= j - 1) ? dp[k + 1][j - 1] : 0;
                        dp[i][j] = min(dp[i][j], dp[i][k] + mid);
                    }
                }
            }
        }
        return dp[0][n - 1];
    }
};
`,
    },
    complexity: { time: "O(n^3)", space: "O(n^2)" },
    pitfalls: [
      "Not collapsing the saved turn when s[k]==s[j] — the core insight.",
      "Index error when k+1 > j-1 (empty middle interval).",
      "Failing to compress adjacent duplicates first (optional but reduces constant factor).",
    ],
    edgeCases: [
      "All identical — 1 turn.",
      "All distinct — n turns.",
      "Palindrome with repeated outer characters.",
    ],
    whyItMatters:
      "Strange Printer is an interval DP whose overwrite-merge transition mirrors layered rendering and diff-paint minimization — recognizing when a later operation can absorb an earlier one.",
    estimatedMinutes: 42,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 257 — pure_dsa · dp_2d · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-submatrix-sum-under-k",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "software_engineer"],
    title: "Largest Submatrix Sum Not Exceeding K",
    framing:
      "A revenue grid records contribution per cell. Subject to a budget K, find the maximum total of any axis-aligned submatrix whose sum does not exceed K.",
    statement:
      "Given an m x n matrix and an integer k, return the maximum sum of a rectangle in the matrix such that its sum is no larger than k. It is guaranteed that there will be a rectangle with a sum no larger than k.",
    inputFormat:
      "An m x n integer matrix and an integer k. Values may be negative.",
    outputFormat: "An integer: the maximum submatrix sum that is <= k.",
    constraints: [
      "1 <= m, n <= 100",
      "-100 <= matrix[i][j] <= 100",
      "-10^5 <= k <= 10^5",
    ],
    examples: [
      {
        input: "matrix = [[1,0,1],[0,-2,3]], k = 2",
        output: "2",
        explanation: "The rectangle [[0,1],[-2,3]] sums to 2, the largest <= 2.",
      },
      {
        input: "matrix = [[2,2,-1]], k = 3",
        output: "3",
        explanation: "Columns 0..1 sum to 4 (>3); column 0 sums to 2; the [2,2,-1] prefix-pair giving 3 is best.",
      },
    ],
    approach: [
      "Fix a pair of columns (left, right) and compress each row into a running sum across those columns, giving a 1D array.",
      "On that 1D array, find the maximum subarray sum not exceeding k — the 1D analog.",
      "For the 1D step, iterate prefix sums and keep a sorted set of earlier prefixes; for current prefix P, the best subarray ending here with sum <= k needs the smallest earlier prefix >= P - k (use a sorted-set lower_bound).",
      "Iterate the narrower dimension as the outer column loop for efficiency.",
      "Track the global best; early-exit if a subarray exactly equals k.",
    ],
    solutionSteps: [
      "Loop left column; reset row-sum accumulator; loop right column adding matrix[*][right].",
      "For the compressed array, run the prefix-sum + ordered-set procedure to get max sum <= k.",
      "Update the global answer.",
      "Return the best found.",
    ],
    code: {
      python: `import bisect

def max_sum_submatrix(matrix: list[list[int]], k: int) -> int:
    m, n = len(matrix), len(matrix[0])
    best = float("-inf")
    # iterate over the smaller dimension as columns for efficiency
    for left in range(n):
        row_sum = [0] * m
        for right in range(left, n):
            for r in range(m):
                row_sum[r] += matrix[r][right]
            # max subarray sum <= k over row_sum
            prefixes = [0]
            prefix = 0
            for val in row_sum:
                prefix += val
                # need smallest prefix_j >= prefix - k
                idx = bisect.bisect_left(prefixes, prefix - k)
                if idx < len(prefixes):
                    best = max(best, prefix - prefixes[idx])
                bisect.insort(prefixes, prefix)
            if best == k:
                return k
    return best
`,
      java: `import java.util.*;

class Solution {
    public int maxSumSubmatrix(int[][] matrix, int k) {
        int m = matrix.length, n = matrix[0].length;
        int best = Integer.MIN_VALUE;
        for (int left = 0; left < n; left++) {
            int[] rowSum = new int[m];
            for (int right = left; right < n; right++) {
                for (int r = 0; r < m; r++) rowSum[r] += matrix[r][right];
                TreeSet<Integer> prefixes = new TreeSet<>();
                prefixes.add(0);
                int prefix = 0;
                for (int val : rowSum) {
                    prefix += val;
                    Integer ceil = prefixes.ceiling(prefix - k);
                    if (ceil != null) best = Math.max(best, prefix - ceil);
                    prefixes.add(prefix);
                }
                if (best == k) return k;
            }
        }
        return best;
    }
}
`,
      cpp: `#include <vector>
#include <set>
#include <algorithm>
#include <climits>
using namespace std;

class Solution {
public:
    int maxSumSubmatrix(vector<vector<int>>& matrix, int k) {
        int m = matrix.size(), n = matrix[0].size();
        int best = INT_MIN;
        for (int left = 0; left < n; left++) {
            vector<int> rowSum(m, 0);
            for (int right = left; right < n; right++) {
                for (int r = 0; r < m; r++) rowSum[r] += matrix[r][right];
                set<int> prefixes{0};
                int prefix = 0;
                for (int val : rowSum) {
                    prefix += val;
                    auto it = prefixes.lower_bound(prefix - k);
                    if (it != prefixes.end()) best = max(best, prefix - *it);
                    prefixes.insert(prefix);
                }
                if (best == k) return k;
            }
        }
        return best;
    }
};
`,
    },
    complexity: { time: "O(min(m,n)^2 * max(m,n) * log(max(m,n)))", space: "O(max(m,n))" },
    pitfalls: [
      "Searching for prefix <= P-k instead of the smallest prefix >= P-k (the inequality direction is the crux).",
      "Forgetting to seed the ordered set with 0 for subarrays starting at index 0.",
      "Not handling negatives — a plain Kadane fails the <= k constraint.",
    ],
    edgeCases: [
      "Single cell.",
      "All negative values with k negative.",
      "A subarray exactly equal to k (early exit).",
    ],
    whyItMatters:
      "This fuses the column-compression rectangle trick with an ordered-set 'max subarray <= k' search — a powerful template for budget-constrained 2D aggregation over signed data.",
    estimatedMinutes: 48,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 258 — ai_applied · binary_search · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "dedupe-corpus-longest-repeat",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 10,
    pattern: "binary_search",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "data_engineer", "software_engineer"],
    title: "Longest Repeated Span in a Training Corpus",
    framing:
      "Before fine-tuning, you deduplicate a concatenated text corpus. Find the longest substring that appears at least twice (occurrences may overlap) so you can flag and trim redundant spans.",
    statement:
      "Given a string s, find the longest substring that occurs at least twice within s. The two occurrences may overlap. Return any one such longest duplicated substring, or an empty string if no character repeats.",
    inputFormat:
      "A string s of length [1, 3*10^4], lowercase English letters.",
    outputFormat: "A string: a longest substring appearing at least twice (or \"\").",
    constraints: [
      "2 <= s.length <= 3 * 10^4",
      "s consists of lowercase English letters.",
    ],
    examples: [
      {
        input: 's = "banana"',
        output: '"ana"',
        explanation: "'ana' occurs at indices 1 and 3 (overlapping).",
      },
      {
        input: 's = "abcd"',
        output: '""',
        explanation: "No repeated substring.",
      },
    ],
    approach: [
      "Binary search the answer length L: if a duplicated substring of length L exists, one of length L-1 trivially does too (monotonic).",
      "For a candidate L, slide a window of length L and hash each substring with a polynomial rolling hash (Rabin-Karp) over a large modulus.",
      "Store seen hashes in a set; on a collision, record the start index (optionally verify to guard against hash collisions).",
      "If any duplicate of length L is found, search higher; otherwise search lower.",
      "Return the substring at the best recorded start.",
    ],
    solutionSteps: [
      "Precompute base powers and prefix hashes, or compute rolling hashes inline per L.",
      "check(L): rolling-hash all windows of length L; return a start index if a hash repeats, else -1.",
      "Binary search L in [1, n-1] keeping the last successful start.",
      "Return s[start:start+bestLen].",
    ],
    code: {
      python: `def longest_dup_substring(s: str) -> str:
    n = len(s)
    nums = [ord(c) - ord("a") for c in s]
    base = 26
    mod = (1 << 61) - 1

    def check(L: int) -> int:
        if L == 0:
            return 0
        h = 0
        for i in range(L):
            h = (h * base + nums[i]) % mod
        power = pow(base, L, mod)
        seen = {h: [0]}
        for i in range(1, n - L + 1):
            h = (h * base - nums[i - 1] * power + nums[i + L - 1]) % mod
            if h in seen:
                # verify to avoid rare collisions
                for j in seen[h]:
                    if s[j:j + L] == s[i:i + L]:
                        return i
                seen[h].append(i)
            else:
                seen[h] = [i]
        return -1

    lo, hi = 1, n - 1
    start, best_len = 0, 0
    while lo <= hi:
        mid = (lo + hi) // 2
        pos = check(mid)
        if pos != -1:
            start, best_len = pos, mid
            lo = mid + 1
        else:
            hi = mid - 1
    return s[start:start + best_len]
`,
      java: `import java.util.*;

class Solution {
    public String longestDupSubstring(String s) {
        int n = s.length();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = s.charAt(i) - 'a';
        long base = 26, mod = (1L << 61) - 1;
        int lo = 1, hi = n - 1, start = 0, bestLen = 0;
        while (lo <= hi) {
            int mid = (lo + hi) / 2;
            int pos = check(s, nums, mid, base, mod);
            if (pos != -1) { start = pos; bestLen = mid; lo = mid + 1; }
            else hi = mid - 1;
        }
        return s.substring(start, start + bestLen);
    }

    private int check(String s, int[] nums, int L, long base, long mod) {
        if (L == 0) return 0;
        long h = 0, power = 1;
        for (int i = 0; i < L; i++) h = (h * base + nums[i]) % mod;
        for (int i = 0; i < L; i++) power = power * base % mod;
        Map<Long, List<Integer>> seen = new HashMap<>();
        seen.put(h, new ArrayList<>(List.of(0)));
        for (int i = 1; i + L <= s.length(); i++) {
            h = ((h * base - nums[i - 1] * power % mod + nums[i + L - 1]) % mod + mod) % mod;
            if (seen.containsKey(h)) {
                for (int j : seen.get(h))
                    if (s.regionMatches(j, s, i, L)) return i;
                seen.get(h).add(i);
            } else {
                seen.put(h, new ArrayList<>(List.of(i)));
            }
        }
        return -1;
    }
}
`,
      cpp: `#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

class Solution {
    int check(const string& s, const vector<long long>& nums, int L,
              long long base, long long mod) {
        if (L == 0) return 0;
        int n = s.size();
        long long h = 0, power = 1;
        for (int i = 0; i < L; i++) h = (h * base + nums[i]) % mod;
        for (int i = 0; i < L; i++) power = power * base % mod;
        unordered_map<long long, vector<int>> seen;
        seen[h].push_back(0);
        for (int i = 1; i + L <= n; i++) {
            h = ((h * base - nums[i - 1] * power % mod + nums[i + L - 1]) % mod + mod) % mod;
            auto it = seen.find(h);
            if (it != seen.end()) {
                for (int j : it->second)
                    if (s.compare(j, L, s, i, L) == 0) return i;
                it->second.push_back(i);
            } else {
                seen[h].push_back(i);
            }
        }
        return -1;
    }
public:
    string longestDupSubstring(string s) {
        int n = s.size();
        vector<long long> nums(n);
        for (int i = 0; i < n; i++) nums[i] = s[i] - 'a';
        long long base = 26, mod = (1LL << 61) - 1;
        int lo = 1, hi = n - 1, start = 0, bestLen = 0;
        while (lo <= hi) {
            int mid = (lo + hi) / 2;
            int pos = check(s, nums, mid, base, mod);
            if (pos != -1) { start = pos; bestLen = mid; lo = mid + 1; }
            else hi = mid - 1;
        }
        return s.substr(start, bestLen);
    }
};
`,
    },
    complexity: { time: "O(n log n) average (rolling hash per binary-search step)", space: "O(n)" },
    pitfalls: [
      "Skipping verification on a hash hit — rare collisions produce wrong answers without it.",
      "Negative modulo when subtracting the leaving character; normalize back into [0, mod).",
      "Using a small modulus that invites frequent collisions.",
    ],
    edgeCases: [
      "No repeats — return empty string.",
      "Entire string repeats with overlap (e.g. 'aaaa').",
      "Two equal halves.",
    ],
    whyItMatters:
      "Corpus dedup leans on binary-search-on-answer plus Rabin-Karp rolling hashes — exactly how large-scale data pipelines detect near-duplicate spans before training without quadratic comparison.",
    estimatedMinutes: 48,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 259 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-distinct-palindrome-subsequences",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Count Distinct Palindromic Subsequences",
    framing:
      "Given a sequence drawn from a tiny alphabet, count how many DISTINCT non-empty palindromic subsequences it contains — distinctness is by content, not by index positions.",
    statement:
      "Given a string s consisting only of the characters 'a', 'b', 'c', and 'd', return the number of distinct non-empty palindromic subsequences of s. Since the answer may be very large, return it modulo 1e9 + 7.",
    inputFormat:
      "A string s of length [1, 1000] over the alphabet {a, b, c, d}.",
    outputFormat: "An integer: the count of distinct palindromic subsequences mod 1e9+7.",
    constraints: [
      "1 <= s.length <= 1000",
      "s[i] is one of 'a', 'b', 'c', 'd'.",
    ],
    examples: [
      {
        input: 's = "bccb"',
        output: "6",
        explanation: "Distinct palindromic subsequences: b, c, bb, cc, bcb, bccb.",
      },
      {
        input: 's = "abcdabcdabcdabcdabcdabcdabcdabcddcbadcbadcbadcbadcbadcbadcbadcba"',
        output: "104860361",
        explanation: "Large count reduced modulo 1e9+7.",
      },
    ],
    approach: [
      "Interval DP: dp[i][j] = number of distinct palindromic subsequences within s[i..j].",
      "If s[i] != s[j], dp[i][j] = dp[i+1][j] + dp[i][j-1] - dp[i+1][j-1] (inclusion-exclusion).",
      "If s[i] == s[j] = c, every palindrome of s[i+1..j-1] can be wrapped by c; also count single 'c' and 'cc'. Find the leftmost low and rightmost high inside (i, j) equal to c.",
      "If no inner c: dp[i][j] = 2*dp[i+1][j-1] + 2 (add 'c' and 'cc').",
      "If one inner c: dp[i][j] = 2*dp[i+1][j-1] + 1. If two or more: dp[i][j] = 2*dp[i+1][j-1] - dp[low+1][high-1] (subtract double-counted inner region).",
      "Take results modulo 1e9+7, adding mod before subtraction to stay non-negative.",
    ],
    solutionSteps: [
      "n = len; dp = n x n; dp[i][i] = 1.",
      "Fill by increasing length using the case analysis on s[i] vs s[j].",
      "For the equal case, scan inward for the first/last matching character.",
      "Keep everything modulo 1e9+7 with +mod guards.",
      "Return dp[0][n-1].",
    ],
    code: {
      python: `def count_palindromic_subsequences(s: str) -> int:
    MOD = 1_000_000_007
    n = len(s)
    dp = [[0] * n for _ in range(n)]
    for i in range(n):
        dp[i][i] = 1
    for length in range(2, n + 1):
        for i in range(0, n - length + 1):
            j = i + length - 1
            if s[i] != s[j]:
                dp[i][j] = (dp[i + 1][j] + dp[i][j - 1] - dp[i + 1][j - 1]) % MOD
            else:
                low, high = i + 1, j - 1
                while low <= high and s[low] != s[i]:
                    low += 1
                while low <= high and s[high] != s[i]:
                    high -= 1
                if low > high:
                    dp[i][j] = (2 * dp[i + 1][j - 1] + 2) % MOD
                elif low == high:
                    dp[i][j] = (2 * dp[i + 1][j - 1] + 1) % MOD
                else:
                    dp[i][j] = (2 * dp[i + 1][j - 1] - dp[low + 1][high - 1]) % MOD
            dp[i][j] = (dp[i][j] + MOD) % MOD
    return dp[0][n - 1]
`,
      java: `class Solution {
    public int countPalindromicSubsequences(String s) {
        final int MOD = 1_000_000_007;
        int n = s.length();
        long[][] dp = new long[n][n];
        for (int i = 0; i < n; i++) dp[i][i] = 1;
        for (int length = 2; length <= n; length++) {
            for (int i = 0; i + length - 1 < n; i++) {
                int j = i + length - 1;
                if (s.charAt(i) != s.charAt(j)) {
                    dp[i][j] = dp[i + 1][j] + dp[i][j - 1] - dp[i + 1][j - 1];
                } else {
                    int low = i + 1, high = j - 1;
                    while (low <= high && s.charAt(low) != s.charAt(i)) low++;
                    while (low <= high && s.charAt(high) != s.charAt(i)) high--;
                    if (low > high) dp[i][j] = 2 * dp[i + 1][j - 1] + 2;
                    else if (low == high) dp[i][j] = 2 * dp[i + 1][j - 1] + 1;
                    else dp[i][j] = 2 * dp[i + 1][j - 1] - dp[low + 1][high - 1];
                }
                dp[i][j] = ((dp[i][j] % MOD) + MOD) % MOD;
            }
        }
        return (int) dp[0][n - 1];
    }
}
`,
      cpp: `#include <string>
#include <vector>
using namespace std;

class Solution {
public:
    int countPalindromicSubsequences(string s) {
        const long long MOD = 1'000'000'007;
        int n = s.size();
        vector<vector<long long>> dp(n, vector<long long>(n, 0));
        for (int i = 0; i < n; i++) dp[i][i] = 1;
        for (int length = 2; length <= n; length++) {
            for (int i = 0; i + length - 1 < n; i++) {
                int j = i + length - 1;
                if (s[i] != s[j]) {
                    dp[i][j] = dp[i + 1][j] + dp[i][j - 1] - dp[i + 1][j - 1];
                } else {
                    int low = i + 1, high = j - 1;
                    while (low <= high && s[low] != s[i]) low++;
                    while (low <= high && s[high] != s[i]) high--;
                    if (low > high) dp[i][j] = 2 * dp[i + 1][j - 1] + 2;
                    else if (low == high) dp[i][j] = 2 * dp[i + 1][j - 1] + 1;
                    else dp[i][j] = 2 * dp[i + 1][j - 1] - dp[low + 1][high - 1];
                }
                dp[i][j] = ((dp[i][j] % MOD) + MOD) % MOD;
            }
        }
        return (int) dp[0][n - 1];
    }
};
`,
    },
    complexity: { time: "O(n^2) with O(n) inner scan worst case → O(n^2) amortized to O(n^2)", space: "O(n^2)" },
    pitfalls: [
      "Forgetting inclusion-exclusion subtraction in the unequal case, double counting the inner interval.",
      "Negative results after the subtraction — always add MOD before the final mod.",
      "Mishandling the three sub-cases (zero/one/two inner matching characters).",
    ],
    edgeCases: [
      "Single character — 1.",
      "All identical characters.",
      "No repeated pairs — equals the number of distinct single characters plus combinations.",
    ],
    whyItMatters:
      "Counting DISTINCT palindromic subsequences is a subtle inclusion-exclusion interval DP — the kind of careful overlap accounting needed whenever distinctness (not position) defines the count.",
    estimatedMinutes: 50,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 260 — pure_dsa · dp_1d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "tallest-dual-tower-rig",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Tallest Equal-Height Dual Support Towers",
    framing:
      "You have steel rods of given lengths and want to build two support towers of EQUAL height using a subset of the rods (each rod assigned to at most one tower). Maximize that common height.",
    statement:
      "Given an array rods of rod lengths, you want to build two towers of equal height by welding rods together. Each rod can go to tower A, tower B, or be unused. Return the largest possible equal height of the two towers, or 0 if it is impossible to build any non-zero equal pair.",
    inputFormat:
      "An integer array rods of length [1, 20]; each length in [1, 1000]; sum of lengths <= 5000.",
    outputFormat: "An integer: the maximum equal tower height (0 if none).",
    constraints: [
      "1 <= rods.length <= 20",
      "1 <= rods[i] <= 1000",
      "sum(rods) <= 5000",
    ],
    examples: [
      {
        input: "rods = [1,2,3,6]",
        output: "6",
        explanation: "{1,2,3} and {6} both reach height 6.",
      },
      {
        input: "rods = [1,2]",
        output: "0",
        explanation: "No equal-height split is possible.",
      },
    ],
    approach: [
      "Track, for each achievable difference d = heightA - heightB, the maximum value of the taller tower's height (or equivalently the max of the shorter when balanced).",
      "dp is a map: key = difference (A - B), value = max height of the taller side reachable with that difference.",
      "For each rod r, every state d can branch: skip; add r to A (new diff d+r); add r to B (new diff d-r).",
      "When adding to the shorter side, the new taller height may stay or grow; carefully update the stored max taller height for the resulting difference.",
      "The answer is dp[0] — the maximum height when both towers are equal.",
    ],
    solutionSteps: [
      "Initialize dp = {0: 0}.",
      "For each rod r: build a new map from the old; for each (d, taller): consider d+r and d-r transitions, updating the best taller height.",
      "Use the formulation dp[d] = max height of the taller tower for difference d (d >= 0 by symmetry, or store signed and fold).",
      "Return dp[0].",
    ],
    code: {
      python: `def tallest_billboard(rods: list[int]) -> int:
    # dp[diff] = max height of the taller support for that A-B difference (diff >= 0)
    dp = {0: 0}
    for r in rods:
        cur = dict(dp)
        for diff, taller in dp.items():
            shorter = taller - diff
            # add r to the taller side
            nd = diff + r
            cur[nd] = max(cur.get(nd, 0), taller + r)
            # add r to the shorter side
            nd2 = abs(shorter + r - taller)
            new_taller = max(taller, shorter + r)
            cur[nd2] = max(cur.get(nd2, 0), new_taller)
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
                int shorter = taller - diff;
                int nd = diff + r;
                cur.merge(nd, taller + r, Math::max);
                int nd2 = Math.abs(shorter + r - taller);
                int newTaller = Math.max(taller, shorter + r);
                cur.merge(nd2, newTaller, Math::max);
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

class Solution {
public:
    int tallestBillboard(vector<int>& rods) {
        unordered_map<int,int> dp;
        dp[0] = 0;
        for (int r : rods) {
            unordered_map<int,int> cur = dp;
            for (auto& e : dp) {
                int diff = e.first, taller = e.second;
                int shorter = taller - diff;
                int nd = diff + r;
                cur[nd] = max(cur.count(nd) ? cur[nd] : 0, taller + r);
                int nd2 = abs(shorter + r - taller);
                int newTaller = max(taller, shorter + r);
                cur[nd2] = max(cur.count(nd2) ? cur[nd2] : 0, newTaller);
            }
            dp = cur;
        }
        return dp.count(0) ? dp[0] : 0;
    }
};
`,
    },
    complexity: { time: "O(n * sum)", space: "O(sum)" },
    pitfalls: [
      "Storing the difference without tracking the max taller height, losing the value to return.",
      "Iterating over dp while mutating it — work on a copy per rod.",
      "Mishandling the case where adding to the shorter side overtakes the taller side (recompute which is taller).",
    ],
    edgeCases: [
      "No equal split possible — return 0.",
      "A single rod — return 0 (can't split into two equal non-empty towers from one rod).",
      "Two equal rods — height equals one rod.",
    ],
    whyItMatters:
      "Tallest Billboard reframes subset-sum as a difference-keyed DP that remembers the best reachable height per imbalance — a meet-in-the-difference idea reused in balanced-partition and load-equalization problems.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 261 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "paint-zones-k-neighborhoods",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Paint Zones Into Exactly K Neighborhoods",
    framing:
      "A row of zones must be painted; some are already painted and cannot change. A 'neighborhood' is a maximal run of same-colored adjacent zones. Paint the rest at minimum cost so the row forms exactly target neighborhoods.",
    statement:
      "There is a row of m houses; houses[i] is the color of house i (0 = unpainted). Painting house i with color j costs cost[i][j-1]. A neighborhood is a maximal group of adjacent houses with the same color. Return the minimum total cost to paint all unpainted houses so that there are exactly target neighborhoods, or -1 if impossible.",
    inputFormat:
      "Arrays houses (length m, values 0..n), cost (m x n), integers m, n, target.",
    outputFormat: "An integer: minimum painting cost, or -1.",
    constraints: [
      "1 <= m <= 100, 1 <= n <= 20, 1 <= target <= m",
      "0 <= houses[i] <= n (0 means unpainted)",
      "1 <= cost[i][j] <= 10^4",
    ],
    examples: [
      {
        input: "houses = [0,0,0,0,0], cost = [[1,10],[10,1],[10,1],[1,10],[5,1]], m = 5, n = 2, target = 3",
        output: "9",
        explanation: "Paint [1,2,2,1,1] → neighborhoods {1},{2,2},{1,1} = 3, cost 9.",
      },
      {
        input: "houses = [3,1,2,3], cost = [[1,1,1],[1,1,1],[1,1,1],[1,1,1]], m = 4, n = 3, target = 3",
        output: "-1",
        explanation: "Pre-painted houses already form 4 neighborhoods; cannot reduce to 3.",
      },
    ],
    approach: [
      "DP over (house index i, color c of house i, number of neighborhoods g formed so far).",
      "dp[i][c][g] = min cost to paint houses 0..i with house i colored c and g neighborhoods total.",
      "Transition from house i-1 colored c': if c' == c the neighborhood count stays g; otherwise it increments to g.",
      "If house i is pre-painted, c is forced and no cost is added; else iterate all colors with the painting cost.",
      "Answer = min over colors of dp[m-1][c][target]; -1 if infinite.",
    ],
    solutionSteps: [
      "Initialize dp with infinity; seed house 0 (forced color or all colors with cost) at g = 1.",
      "For i from 1..m-1, for each color c (forced or all), for each previous color c', update g based on whether c == c'.",
      "Skip transitions that would exceed target.",
      "Return the min at the last house with g == target, or -1.",
    ],
    code: {
      python: `def min_cost(houses: list[int], cost: list[list[int]], m: int, n: int, target: int) -> int:
    INF = float("inf")
    # dp[c][g] for current house: color c (1-indexed), g neighborhoods
    dp = [[INF] * (target + 1) for _ in range(n + 1)]
    if houses[0] == 0:
        for c in range(1, n + 1):
            dp[c][1] = cost[0][c - 1]
    else:
        dp[houses[0]][1] = 0
    for i in range(1, m):
        ndp = [[INF] * (target + 1) for _ in range(n + 1)]
        colors = [houses[i]] if houses[i] != 0 else range(1, n + 1)
        for c in colors:
            add = 0 if houses[i] != 0 else cost[i][c - 1]
            for pc in range(1, n + 1):
                for g in range(1, target + 1):
                    if dp[pc][g] == INF:
                        continue
                    ng = g if pc == c else g + 1
                    if ng > target:
                        continue
                    if dp[pc][g] + add < ndp[c][ng]:
                        ndp[c][ng] = dp[pc][g] + add
        dp = ndp
    ans = min(dp[c][target] for c in range(1, n + 1))
    return -1 if ans == INF else ans
`,
      java: `class Solution {
    public int minCost(int[] houses, int[][] cost, int m, int n, int target) {
        final int INF = Integer.MAX_VALUE / 2;
        int[][] dp = new int[n + 1][target + 1];
        for (int[] row : dp) java.util.Arrays.fill(row, INF);
        if (houses[0] == 0) {
            for (int c = 1; c <= n; c++) dp[c][1] = cost[0][c - 1];
        } else {
            dp[houses[0]][1] = 0;
        }
        for (int i = 1; i < m; i++) {
            int[][] ndp = new int[n + 1][target + 1];
            for (int[] row : ndp) java.util.Arrays.fill(row, INF);
            int lo = houses[i] == 0 ? 1 : houses[i];
            int hi = houses[i] == 0 ? n : houses[i];
            for (int c = lo; c <= hi; c++) {
                int add = houses[i] == 0 ? cost[i][c - 1] : 0;
                for (int pc = 1; pc <= n; pc++) {
                    for (int g = 1; g <= target; g++) {
                        if (dp[pc][g] >= INF) continue;
                        int ng = pc == c ? g : g + 1;
                        if (ng > target) continue;
                        ndp[c][ng] = Math.min(ndp[c][ng], dp[pc][g] + add);
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
#include <climits>
using namespace std;

class Solution {
public:
    int minCost(vector<int>& houses, vector<vector<int>>& cost, int m, int n, int target) {
        const int INF = INT_MAX / 2;
        vector<vector<int>> dp(n + 1, vector<int>(target + 1, INF));
        if (houses[0] == 0)
            for (int c = 1; c <= n; c++) dp[c][1] = cost[0][c - 1];
        else
            dp[houses[0]][1] = 0;
        for (int i = 1; i < m; i++) {
            vector<vector<int>> ndp(n + 1, vector<int>(target + 1, INF));
            int lo = houses[i] == 0 ? 1 : houses[i];
            int hi = houses[i] == 0 ? n : houses[i];
            for (int c = lo; c <= hi; c++) {
                int add = houses[i] == 0 ? cost[i][c - 1] : 0;
                for (int pc = 1; pc <= n; pc++)
                    for (int g = 1; g <= target; g++) {
                        if (dp[pc][g] >= INF) continue;
                        int ng = pc == c ? g : g + 1;
                        if (ng > target) continue;
                        ndp[c][ng] = min(ndp[c][ng], dp[pc][g] + add);
                    }
            }
            dp = ndp;
        }
        int ans = INF;
        for (int c = 1; c <= n; c++) ans = min(ans, dp[c][target]);
        return ans >= INF ? -1 : ans;
    }
};
`,
    },
    complexity: { time: "O(m * n^2 * target)", space: "O(n * target)" },
    pitfalls: [
      "Charging cost for a pre-painted house, or allowing its color to change.",
      "Letting the neighborhood count exceed target before pruning.",
      "Initializing the first house with g = 0 instead of g = 1.",
    ],
    edgeCases: [
      "All houses pre-painted — cost 0 if neighborhoods already equal target, else -1.",
      "target == 1 — all houses one color.",
      "target == m — every house a distinct neighborhood.",
    ],
    whyItMatters:
      "Paint House III is a three-dimensional DP that tracks a structural invariant (neighborhood count) alongside position and color — the pattern for segment-count-constrained optimization over a sequence.",
    estimatedMinutes: 48,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 262 — pure_dsa · graphs · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "bus-routes-fewest-transfers",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Fewest Bus Transfers to Reach a Stop",
    framing:
      "Each bus route is a fixed loop of stops. You may board and ride any route, transferring between routes only at shared stops. Find the minimum number of buses to ride from a source stop to a target stop.",
    statement:
      "You are given an array routes where routes[i] is the list of stops the i-th bus visits repeatedly. Starting at the bus stop source, you want to reach target. Return the least number of buses you must take, or -1 if impossible. You may walk between routes only by being at a shared stop.",
    inputFormat:
      "An array routes (each a list of stop ids), and integers source and target.",
    outputFormat: "An integer: minimum number of buses, or -1.",
    constraints: [
      "1 <= routes.length <= 500",
      "Sum of all stops across routes <= 10^5",
      "0 <= source, target < 10^6",
    ],
    examples: [
      {
        input: "routes = [[1,2,7],[3,6,7]], source = 1, target = 6",
        output: "2",
        explanation: "Take bus 0 (1→7), transfer at 7, take bus 1 (7→6).",
      },
      {
        input: "routes = [[7,12],[4,5,15],[6],[15,19],[9,12,13]], source = 15, target = 12",
        output: "-1",
        explanation: "No sequence of buses connects 15 to 12.",
      },
    ],
    approach: [
      "BFS over BUSES (routes), not individual stops — the cost is the number of buses taken.",
      "Build stopToRoutes: a map from each stop to the routes that serve it.",
      "Start BFS by enqueuing every route serving the source; level = 1 bus.",
      "From a route, you can reach any stop on it; from those stops, transfer to any other unvisited route serving them, incrementing the bus count.",
      "If any route in the current level contains target, return the level; mark routes visited to avoid cycles.",
    ],
    solutionSteps: [
      "If source == target return 0.",
      "Build stopToRoutes; convert each route to a set for O(1) membership.",
      "BFS queue seeded with all routes serving source, buses = 1, visited routes marked.",
      "For each route, if it contains target return buses; else for each stop on it, enqueue unvisited routes sharing that stop.",
      "Return -1 if exhausted.",
    ],
    code: {
      python: `from collections import defaultdict, deque

def num_buses_to_destination(routes: list[list[int]], source: int, target: int) -> int:
    if source == target:
        return 0
    stop_to_routes = defaultdict(list)
    for i, route in enumerate(routes):
        for stop in route:
            stop_to_routes[stop].append(i)
    route_sets = [set(r) for r in routes]
    visited_routes = set()
    q = deque()
    for r in stop_to_routes[source]:
        q.append((r, 1))
        visited_routes.add(r)
    while q:
        route_id, buses = q.popleft()
        if target in route_sets[route_id]:
            return buses
        for stop in route_sets[route_id]:
            for nxt in stop_to_routes[stop]:
                if nxt not in visited_routes:
                    visited_routes.add(nxt)
                    q.append((nxt, buses + 1))
    return -1
`,
      java: `import java.util.*;

class Solution {
    public int numBusesToDestination(int[][] routes, int source, int target) {
        if (source == target) return 0;
        Map<Integer, List<Integer>> stopToRoutes = new HashMap<>();
        for (int i = 0; i < routes.length; i++)
            for (int stop : routes[i])
                stopToRoutes.computeIfAbsent(stop, k -> new ArrayList<>()).add(i);
        Set<Integer> visited = new HashSet<>();
        Queue<int[]> q = new LinkedList<>();
        for (int r : stopToRoutes.getOrDefault(source, List.of())) {
            q.add(new int[]{r, 1});
            visited.add(r);
        }
        while (!q.isEmpty()) {
            int[] cur = q.poll();
            int routeId = cur[0], buses = cur[1];
            for (int stop : routes[routeId]) {
                if (stop == target) return buses;
                for (int nxt : stopToRoutes.getOrDefault(stop, List.of())) {
                    if (!visited.contains(nxt)) {
                        visited.add(nxt);
                        q.add(new int[]{nxt, buses + 1});
                    }
                }
            }
        }
        return -1;
    }
}
`,
      cpp: `#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <queue>
using namespace std;

class Solution {
public:
    int numBusesToDestination(vector<vector<int>>& routes, int source, int target) {
        if (source == target) return 0;
        unordered_map<int, vector<int>> stopToRoutes;
        for (int i = 0; i < (int)routes.size(); i++)
            for (int stop : routes[i]) stopToRoutes[stop].push_back(i);
        unordered_set<int> visited;
        queue<pair<int,int>> q;
        for (int r : stopToRoutes[source]) { q.push({r, 1}); visited.insert(r); }
        while (!q.empty()) {
            auto [routeId, buses] = q.front(); q.pop();
            for (int stop : routes[routeId]) {
                if (stop == target) return buses;
                for (int nxt : stopToRoutes[stop])
                    if (!visited.count(nxt)) { visited.insert(nxt); q.push({nxt, buses + 1}); }
            }
        }
        return -1;
    }
};
`,
    },
    complexity: { time: "O(sum of stops)", space: "O(sum of stops)" },
    pitfalls: [
      "BFS over stops instead of routes — inflates the state space and miscounts transfers.",
      "Forgetting the source == target zero-bus shortcut.",
      "Not marking routes visited, causing infinite loops on shared stops.",
    ],
    edgeCases: [
      "source already equals target — 0.",
      "Disconnected target — -1.",
      "Single route containing both source and target — 1.",
    ],
    whyItMatters:
      "Bus Routes shows that the right BFS node is sometimes the higher-level object (a route) not the obvious one (a stop) — a modeling lesson for transfer-minimizing routing and layered connectivity.",
    estimatedMinutes: 42,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 263 — pure_dsa · graphs · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "grid-path-k-obstacle-removals",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Shortest Grid Path Removing At Most K Obstacles",
    framing:
      "A robot crosses a warehouse grid from the top-left to the bottom-right. Some cells hold obstacles. The robot may clear at most k obstacles. Find the shortest path length.",
    statement:
      "Given an m x n grid where each cell is 0 (empty) or 1 (obstacle), and an integer k, return the minimum number of steps to walk from (0,0) to (m-1,n-1), being allowed to eliminate at most k obstacles along the way. Moves are up/down/left/right. Return -1 if no such path exists.",
    inputFormat:
      "An m x n binary grid and an integer k.",
    outputFormat: "An integer: minimum steps, or -1.",
    constraints: [
      "1 <= m, n <= 40",
      "1 <= k <= m * n",
      "grid[i][j] is 0 or 1; grid[0][0] == grid[m-1][n-1] == 0.",
    ],
    examples: [
      {
        input: "grid = [[0,0,0],[1,1,0],[0,0,0],[0,1,1],[0,0,0]], k = 1",
        output: "6",
        explanation: "Removing one obstacle yields a 6-step path.",
      },
      {
        input: "grid = [[0,1,1],[1,1,1],[1,0,0]], k = 1",
        output: "-1",
        explanation: "Even with one removal there is no route.",
      },
    ],
    approach: [
      "BFS where the state is (row, col, remaining eliminations). The first time we reach the destination is the shortest step count (uniform edge cost).",
      "Track visited[r][c] = the maximum remaining-k seen at that cell; only revisit if we arrive with strictly more budget (which could unlock new paths).",
      "Start at (0,0) with budget k; entering an obstacle cell costs one elimination.",
      "Standard 4-directional expansion; prune moves that would drop budget below 0.",
      "Return the BFS depth on reaching (m-1,n-1), else -1.",
    ],
    solutionSteps: [
      "If k >= m+n-2, the Manhattan path is unobstructable → return m+n-2 (optional shortcut).",
      "BFS queue of (r, c, remaining); visited grid stores best remaining per cell.",
      "On each move, new remaining = remaining - grid[nr][nc]; enqueue if >= 0 and improves the cell's best.",
      "Return steps at destination, else -1.",
    ],
    code: {
      python: `from collections import deque

def shortest_path(grid: list[list[int]], k: int) -> int:
    m, n = len(grid), len(grid[0])
    if k >= m + n - 2:
        return m + n - 2
    best = [[-1] * n for _ in range(m)]
    best[0][0] = k
    q = deque([(0, 0, k, 0)])  # row, col, remaining, steps
    while q:
        r, c, rem, steps = q.popleft()
        if r == m - 1 and c == n - 1:
            return steps
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n:
                nrem = rem - grid[nr][nc]
                if nrem > best[nr][nc]:
                    best[nr][nc] = nrem
                    q.append((nr, nc, nrem, steps + 1))
    return -1
`,
      java: `import java.util.*;

class Solution {
    public int shortestPath(int[][] grid, int k) {
        int m = grid.length, n = grid[0].length;
        if (k >= m + n - 2) return m + n - 2;
        int[][] best = new int[m][n];
        for (int[] row : best) Arrays.fill(row, -1);
        best[0][0] = k;
        int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};
        Queue<int[]> q = new LinkedList<>();
        q.add(new int[]{0, 0, k, 0});
        while (!q.isEmpty()) {
            int[] cur = q.poll();
            int r = cur[0], c = cur[1], rem = cur[2], steps = cur[3];
            if (r == m - 1 && c == n - 1) return steps;
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr >= 0 && nr < m && nc >= 0 && nc < n) {
                    int nrem = rem - grid[nr][nc];
                    if (nrem > best[nr][nc]) {
                        best[nr][nc] = nrem;
                        q.add(new int[]{nr, nc, nrem, steps + 1});
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
using namespace std;

class Solution {
public:
    int shortestPath(vector<vector<int>>& grid, int k) {
        int m = grid.size(), n = grid[0].size();
        if (k >= m + n - 2) return m + n - 2;
        vector<vector<int>> best(m, vector<int>(n, -1));
        best[0][0] = k;
        int dirs[4][2] = {{1,0},{-1,0},{0,1},{0,-1}};
        queue<array<int,4>> q;
        q.push({0, 0, k, 0});
        while (!q.empty()) {
            auto [r, c, rem, steps] = q.front(); q.pop();
            if (r == m - 1 && c == n - 1) return steps;
            for (auto& d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr >= 0 && nr < m && nc >= 0 && nc < n) {
                    int nrem = rem - grid[nr][nc];
                    if (nrem > best[nr][nc]) {
                        best[nr][nc] = nrem;
                        q.push({nr, nc, nrem, steps + 1});
                    }
                }
            }
        }
        return -1;
    }
};
`,
    },
    complexity: { time: "O(m * n * k)", space: "O(m * n)" },
    pitfalls: [
      "Using a plain boolean visited grid — you must remember the best remaining budget per cell.",
      "Revisiting with equal-or-lower budget, which never helps and risks blowup.",
      "Forgetting that the start/end are guaranteed empty but intermediate obstacles cost budget.",
    ],
    edgeCases: [
      "k large enough for the direct Manhattan path.",
      "1x1 grid — 0 steps.",
      "Fully walled target — -1.",
    ],
    whyItMatters:
      "Adding a resource dimension (remaining eliminations) to BFS state is the canonical way to handle budgeted shortest paths — used in fuel-limited routing and constrained pathfinding.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 264 — pure_dsa · graphs · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "clear-forest-min-steps",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Clear Obstacles in Height Order, Minimum Walk",
    framing:
      "A field grid has impassable cells (0), walkable ground (1), and trees of distinct heights (>1). Starting at the top-left, you must cut all trees in strictly increasing height order, walking the fewest total steps.",
    statement:
      "Given an m x n grid where 0 = cannot walk, 1 = walkable, and any value > 1 = a tree of that height, you start at (0,0) and must cut all trees in order of increasing height. After cutting a tree its cell becomes 1. Return the minimum total steps to cut all trees, or -1 if impossible. Steps move between adjacent walkable cells.",
    inputFormat:
      "An m x n integer grid (list of lists).",
    outputFormat: "An integer: total minimum steps, or -1.",
    constraints: [
      "1 <= m, n <= 50",
      "0 <= grid[i][j] <= 10^9",
      "Tree heights are distinct; (0,0) is walkable or a tree.",
    ],
    examples: [
      {
        input: "grid = [[1,2,3],[0,0,4],[7,6,5]]",
        output: "6",
        explanation: "Cut heights 2,3,4,5,6,7 in order; total walk is 6 steps.",
      },
      {
        input: "grid = [[1,2,3],[0,0,0],[7,6,5]]",
        output: "-1",
        explanation: "The lower band is walled off; trees are unreachable in order.",
      },
    ],
    approach: [
      "Collect all tree cells and sort them by height ascending — that fixes the visiting order.",
      "Walk from the start to the first tree, then from each tree to the next, accumulating shortest distances.",
      "Each leg is a BFS shortest path on the grid treating 0 as a wall (cut trees become 1, but cells stay walkable regardless of height for traversal).",
      "If any leg's BFS cannot reach the next target, return -1.",
      "Sum all legs for the answer.",
    ],
    solutionSteps: [
      "Gather (height, r, c) for cells > 1; sort by height.",
      "Set current = (0,0); total = 0.",
      "For each target tree in order: d = bfs(grid, current, target); if d < 0 return -1; total += d; current = target.",
      "Return total.",
    ],
    code: {
      python: `from collections import deque

def cut_off_tree(grid: list[list[int]]) -> int:
    m, n = len(grid), len(grid[0])
    trees = sorted((grid[r][c], r, c) for r in range(m) for c in range(n) if grid[r][c] > 1)

    def bfs(sr: int, sc: int, tr: int, tc: int) -> int:
        if sr == tr and sc == tc:
            return 0
        seen = [[False] * n for _ in range(m)]
        seen[sr][sc] = True
        q = deque([(sr, sc, 0)])
        while q:
            r, c, d = q.popleft()
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nr, nc = r + dr, c + dc
                if 0 <= nr < m and 0 <= nc < n and not seen[nr][nc] and grid[nr][nc] != 0:
                    if nr == tr and nc == tc:
                        return d + 1
                    seen[nr][nc] = True
                    q.append((nr, nc, d + 1))
        return -1

    total = 0
    cr, cc = 0, 0
    for _, tr, tc in trees:
        d = bfs(cr, cc, tr, tc)
        if d < 0:
            return -1
        total += d
        cr, cc = tr, tc
    return total
`,
      java: `import java.util.*;

class Solution {
    private int m, n;

    public int cutOffTree(List<List<Integer>> forest) {
        m = forest.size(); n = forest.get(0).size();
        int[][] grid = new int[m][n];
        List<int[]> trees = new ArrayList<>();
        for (int r = 0; r < m; r++)
            for (int c = 0; c < n; c++) {
                grid[r][c] = forest.get(r).get(c);
                if (grid[r][c] > 1) trees.add(new int[]{grid[r][c], r, c});
            }
        trees.sort((a, b) -> Integer.compare(a[0], b[0]));
        int total = 0, cr = 0, cc = 0;
        for (int[] t : trees) {
            int d = bfs(grid, cr, cc, t[1], t[2]);
            if (d < 0) return -1;
            total += d; cr = t[1]; cc = t[2];
        }
        return total;
    }

    private int bfs(int[][] grid, int sr, int sc, int tr, int tc) {
        if (sr == tr && sc == tc) return 0;
        boolean[][] seen = new boolean[m][n];
        seen[sr][sc] = true;
        int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};
        Queue<int[]> q = new LinkedList<>();
        q.add(new int[]{sr, sc, 0});
        while (!q.isEmpty()) {
            int[] cur = q.poll();
            for (int[] d : dirs) {
                int nr = cur[0] + d[0], nc = cur[1] + d[1];
                if (nr >= 0 && nr < m && nc >= 0 && nc < n && !seen[nr][nc] && grid[nr][nc] != 0) {
                    if (nr == tr && nc == tc) return cur[2] + 1;
                    seen[nr][nc] = true;
                    q.add(new int[]{nr, nc, cur[2] + 1});
                }
            }
        }
        return -1;
    }
}
`,
      cpp: `#include <vector>
#include <queue>
#include <algorithm>
using namespace std;

class Solution {
    int m, n;
    int bfs(vector<vector<int>>& grid, int sr, int sc, int tr, int tc) {
        if (sr == tr && sc == tc) return 0;
        vector<vector<bool>> seen(m, vector<bool>(n, false));
        seen[sr][sc] = true;
        int dirs[4][2] = {{1,0},{-1,0},{0,1},{0,-1}};
        queue<array<int,3>> q;
        q.push({sr, sc, 0});
        while (!q.empty()) {
            auto [r, c, d] = q.front(); q.pop();
            for (auto& dd : dirs) {
                int nr = r + dd[0], nc = c + dd[1];
                if (nr >= 0 && nr < m && nc >= 0 && nc < n && !seen[nr][nc] && grid[nr][nc] != 0) {
                    if (nr == tr && nc == tc) return d + 1;
                    seen[nr][nc] = true;
                    q.push({nr, nc, d + 1});
                }
            }
        }
        return -1;
    }
public:
    int cutOffTree(vector<vector<int>>& forest) {
        m = forest.size(); n = forest[0].size();
        vector<array<int,3>> trees;
        for (int r = 0; r < m; r++)
            for (int c = 0; c < n; c++)
                if (forest[r][c] > 1) trees.push_back({forest[r][c], r, c});
        sort(trees.begin(), trees.end());
        int total = 0, cr = 0, cc = 0;
        for (auto& t : trees) {
            int d = bfs(forest, cr, cc, t[1], t[2]);
            if (d < 0) return -1;
            total += d; cr = t[1]; cc = t[2];
        }
        return total;
    }
};
`,
    },
    complexity: { time: "O(T * m * n) for T trees", space: "O(m * n)" },
    pitfalls: [
      "Visiting trees out of height order — the order is mandatory.",
      "Treating tree cells as walls; they are walkable (you walk onto them to cut).",
      "Not returning -1 the moment a leg is unreachable.",
    ],
    edgeCases: [
      "No trees — 0 steps.",
      "Start cell is itself a tree (still must cut others in order).",
      "A tree fully walled off — -1.",
    ],
    whyItMatters:
      "Cut Off Trees decomposes a single objective into a fixed sequence of shortest-path legs — the same 'ordered waypoints, BFS each leg' decomposition behind pick-path and tour optimization with forced order.",
    estimatedMinutes: 44,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 265 — pure_dsa · sliding_window · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "substring-concat-all-keywords",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "sliding_window",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Find Substrings Concatenating All Keywords",
    framing:
      "Given a long log line and a set of equal-length keywords, find every start index where some permutation of all keywords appears as one uninterrupted concatenation.",
    statement:
      "You are given a string s and an array words of strings that are all the same length. Return the starting indices of all substrings in s that are a concatenation of every word in words exactly once, in any order, with no characters in between.",
    inputFormat:
      "A string s and an array words of equal-length strings.",
    outputFormat: "A list of starting indices (any order).",
    constraints: [
      "1 <= s.length <= 10^4",
      "1 <= words.length <= 5000",
      "1 <= words[i].length <= 30; all words have the same length.",
    ],
    examples: [
      {
        input: 's = "barfoothefoobarman", words = ["foo","bar"]',
        output: "[0,9]",
        explanation: "'barfoo' at 0 and 'foobar' at 9 each use both words once.",
      },
      {
        input: 's = "wordgoodgoodgoodbestword", words = ["word","good","best","word"]',
        output: "[]",
        explanation: "No window contains all four words (word appears twice required).",
      },
    ],
    approach: [
      "Let wordLen = length of each word, count = number of words, windowLen = wordLen * count.",
      "Run wordLen separate sliding windows, one per residue of the start index mod wordLen, so each window advances word by word.",
      "Within an offset, maintain a hashmap of word counts in the current window; expand by adding the next word.",
      "If a word is not needed (not in the target multiset), reset the window past it. If a word appears too many times, shrink from the left until its count is valid.",
      "When the window holds exactly count words, record the start index.",
    ],
    solutionSteps: [
      "Build need = multiset of words. If words or s too short, return [].",
      "For offset in [0, wordLen): slide a window in word-sized steps tracking seen counts and the number of matched words.",
      "Add the incoming word; while over-count, remove from the left; record index when matched == count.",
      "Reset window on a foreign word.",
      "Return all recorded indices.",
    ],
    code: {
      python: `from collections import Counter

def find_substring(s: str, words: list[str]) -> list[int]:
    if not s or not words:
        return []
    word_len = len(words[0])
    count = len(words)
    window = word_len * count
    n = len(s)
    if window > n:
        return []
    need = Counter(words)
    res = []
    for offset in range(word_len):
        left = offset
        seen = Counter()
        matched = 0
        right = offset
        while right + word_len <= n:
            w = s[right:right + word_len]
            right += word_len
            if w in need:
                seen[w] += 1
                matched += 1
                while seen[w] > need[w]:
                    lw = s[left:left + word_len]
                    seen[lw] -= 1
                    matched -= 1
                    left += word_len
                if matched == count:
                    res.append(left)
                    lw = s[left:left + word_len]
                    seen[lw] -= 1
                    matched -= 1
                    left += word_len
            else:
                seen.clear()
                matched = 0
                left = right
    return res
`,
      java: `import java.util.*;

class Solution {
    public List<Integer> findSubstring(String s, String[] words) {
        List<Integer> res = new ArrayList<>();
        if (s == null || s.isEmpty() || words.length == 0) return res;
        int wordLen = words[0].length(), count = words.length;
        int window = wordLen * count, n = s.length();
        if (window > n) return res;
        Map<String, Integer> need = new HashMap<>();
        for (String w : words) need.merge(w, 1, Integer::sum);
        for (int offset = 0; offset < wordLen; offset++) {
            int left = offset, matched = 0;
            Map<String, Integer> seen = new HashMap<>();
            for (int right = offset; right + wordLen <= n; right += wordLen) {
                String w = s.substring(right, right + wordLen);
                if (need.containsKey(w)) {
                    seen.merge(w, 1, Integer::sum);
                    matched++;
                    while (seen.get(w) > need.get(w)) {
                        String lw = s.substring(left, left + wordLen);
                        seen.merge(lw, -1, Integer::sum);
                        matched--;
                        left += wordLen;
                    }
                    if (matched == count) {
                        res.add(left);
                        String lw = s.substring(left, left + wordLen);
                        seen.merge(lw, -1, Integer::sum);
                        matched--;
                        left += wordLen;
                    }
                } else {
                    seen.clear();
                    matched = 0;
                    left = right + wordLen;
                }
            }
        }
        return res;
    }
}
`,
      cpp: `#include <vector>
#include <string>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> findSubstring(string s, vector<string>& words) {
        vector<int> res;
        if (s.empty() || words.empty()) return res;
        int wordLen = words[0].size(), count = words.size();
        int window = wordLen * count, n = s.size();
        if (window > n) return res;
        unordered_map<string,int> need;
        for (auto& w : words) need[w]++;
        for (int offset = 0; offset < wordLen; offset++) {
            int left = offset, matched = 0;
            unordered_map<string,int> seen;
            for (int right = offset; right + wordLen <= n; right += wordLen) {
                string w = s.substr(right, wordLen);
                if (need.count(w)) {
                    seen[w]++;
                    matched++;
                    while (seen[w] > need[w]) {
                        string lw = s.substr(left, wordLen);
                        seen[lw]--;
                        matched--;
                        left += wordLen;
                    }
                    if (matched == count) {
                        res.push_back(left);
                        string lw = s.substr(left, wordLen);
                        seen[lw]--;
                        matched--;
                        left += wordLen;
                    }
                } else {
                    seen.clear();
                    matched = 0;
                    left = right + wordLen;
                }
            }
        }
        return res;
    }
};
`,
    },
    complexity: { time: "O(n * wordLen)", space: "O(words * wordLen)" },
    pitfalls: [
      "Re-scanning every index from scratch (O(n * window)) instead of word-aligned sliding windows.",
      "Forgetting to slide left by one word after a full match to find overlapping starts.",
      "Resetting the window incorrectly when encountering a non-target word.",
    ],
    edgeCases: [
      "Duplicate words requiring exact multiplicities.",
      "words total length exceeds s — [].",
      "Single word — all of its occurrences.",
    ],
    whyItMatters:
      "Concatenation of all words is a word-granular sliding window with multiset matching — the same fixed-token-window scanning used in tokenized log search and template-block detection.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 266 — pure_dsa · backtracking · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "reach-target-twentyfour-game",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Reach 24 From Four Cards",
    framing:
      "Four drawn cards each show a digit 1–9. Using +, -, *, / and any parenthesization, decide whether they can be combined to make exactly 24 — the classic card game.",
    statement:
      "Given an array of 4 integers in the range 1..9, determine if you can reach the value 24 by combining all four using +, -, *, / and parentheses. Each number is used exactly once; division is real (not integer) division. Return true if 24 is achievable, false otherwise.",
    inputFormat: "An array cards of exactly 4 integers, each between 1 and 9.",
    outputFormat: "A boolean: true if 24 is reachable.",
    constraints: [
      "cards.length == 4",
      "1 <= cards[i] <= 9",
      "Division is floating-point; compare to 24 within a small epsilon.",
    ],
    examples: [
      {
        input: "cards = [4,1,8,7]",
        output: "true",
        explanation: "(8 - 4) * (7 - 1) = 24.",
      },
      {
        input: "cards = [1,2,1,2]",
        output: "false",
        explanation: "No combination of these four reaches 24.",
      },
    ],
    approach: [
      "At each step pick any two of the current numbers and replace them with the result of one operation, reducing the multiset size by one.",
      "Recurse on the new list of size n-1 until a single number remains, then check if it is within epsilon of 24.",
      "Try all ordered pairs because subtraction and division are non-commutative; include both a-b and b-a, a/b and b/a.",
      "Guard division by near-zero values.",
      "Use a small epsilon (1e-6) for the final comparison since division introduces floating error.",
    ],
    solutionSteps: [
      "Base case: one number left → return abs(x - 24) < 1e-6.",
      "For every pair (i, j), build the remaining list plus each candidate combination.",
      "Recurse; if any branch returns true, propagate true.",
      "Return false if no branch works.",
    ],
    code: {
      python: `def judge_point24(cards: list[int]) -> bool:
    def solve(nums: list[float]) -> bool:
        if len(nums) == 1:
            return abs(nums[0] - 24) < 1e-6
        n = len(nums)
        for i in range(n):
            for j in range(n):
                if i == j:
                    continue
                rest = [nums[k] for k in range(n) if k != i and k != j]
                a, b = nums[i], nums[j]
                cands = [a + b, a - b, a * b]
                if abs(b) > 1e-6:
                    cands.append(a / b)
                for c in cands:
                    if solve(rest + [c]):
                        return True
        return False

    return solve([float(x) for x in cards])`,
      java: `import java.util.*;

class Solution {
    public boolean judgePoint24(int[] cards) {
        List<Double> nums = new ArrayList<>();
        for (int c : cards) nums.add((double) c);
        return solve(nums);
    }

    private boolean solve(List<Double> nums) {
        int n = nums.size();
        if (n == 1) return Math.abs(nums.get(0) - 24) < 1e-6;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (i == j) continue;
                List<Double> rest = new ArrayList<>();
                for (int k = 0; k < n; k++)
                    if (k != i && k != j) rest.add(nums.get(k));
                double a = nums.get(i), b = nums.get(j);
                double[] cands = (Math.abs(b) > 1e-6)
                    ? new double[]{a + b, a - b, a * b, a / b}
                    : new double[]{a + b, a - b, a * b};
                for (double c : cands) {
                    rest.add(c);
                    if (solve(rest)) return true;
                    rest.remove(rest.size() - 1);
                }
            }
        }
        return false;
    }
}`,
      cpp: `#include <vector>
#include <cmath>
using namespace std;

class Solution {
public:
    bool judgePoint24(vector<int>& cards) {
        vector<double> nums(cards.begin(), cards.end());
        return solve(nums);
    }

private:
    bool solve(vector<double>& nums) {
        int n = nums.size();
        if (n == 1) return fabs(nums[0] - 24) < 1e-6;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (i == j) continue;
                vector<double> rest;
                for (int k = 0; k < n; k++)
                    if (k != i && k != j) rest.push_back(nums[k]);
                double a = nums[i], b = nums[j];
                vector<double> cands = {a + b, a - b, a * b};
                if (fabs(b) > 1e-6) cands.push_back(a / b);
                for (double c : cands) {
                    rest.push_back(c);
                    if (solve(rest)) return true;
                    rest.pop_back();
                }
            }
        }
        return false;
    }
};`,
    },
    complexity: { time: "O(1) — bounded by the fixed 4-card search space", space: "O(1)" },
    pitfalls: [
      "Only trying a-b and a/b, missing the reversed b-a and b/a operands.",
      "Using exact equality with 24 instead of an epsilon, failing valid float results.",
      "Dividing by a zero-valued intermediate.",
    ],
    edgeCases: [
      "Numbers that need division to reach 24, e.g. [3,3,8,8] → 8/(3-8/3).",
      "All identical low cards that cannot reach 24.",
      "Order-sensitive subtraction producing negatives mid-computation.",
    ],
    whyItMatters:
      "Exhaustively combining operands with a shrinking multiset is the model for expression-search and small constraint-satisfaction problems where every pairing and operator must be explored.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 267 — pure_dsa · greedy · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "largest-merged-dispatch-number",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "greedy",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer"],
    title: "Largest Number From Two Dispatch Queues",
    framing:
      "Two ordered queues of single digits feed a dispatch tag. You must pick exactly k digits across both queues, preserving each queue's relative order, to form the largest possible number.",
    statement:
      "Given two integer arrays nums1 and nums2 representing digits (0–9) of two numbers and an integer k, create the maximum number of length k from digits of the two arrays. The relative order of digits taken from the same array must be preserved. Return an array of the k digits of the maximum number.",
    inputFormat:
      "Two digit arrays nums1, nums2 and an integer k with k <= len(nums1) + len(nums2).",
    outputFormat: "An array of k digits representing the maximum number.",
    constraints: [
      "0 <= nums1.length, nums2.length <= 500",
      "0 <= nums1[i], nums2[i] <= 9",
      "1 <= k <= nums1.length + nums2.length",
    ],
    examples: [
      {
        input: "nums1 = [3,4,6,5], nums2 = [9,1,2,5,8,3], k = 5",
        output: "[9,8,6,5,3]",
        explanation: "Take 6,5 from the first and 9,8,3 from the second, merged greedily.",
      },
      {
        input: "nums1 = [6,7], nums2 = [6,0,4], k = 5",
        output: "[6,7,6,0,4]",
        explanation: "All digits used; merged to maximize.",
      },
    ],
    approach: [
      "Split k into i digits from nums1 and k-i from nums2 for every feasible i.",
      "From a single array, pick the maximum subsequence of a given length using a monotonic stack (drop smaller leading digits while room remains).",
      "Merge two maximum subsequences into the largest sequence, comparing remaining suffixes lexicographically to break ties correctly.",
      "Track the best merged result across all splits.",
    ],
    solutionSteps: [
      "maxSub(arr, t): monotonic-stack pick of the largest length-t subsequence.",
      "merge(a, b): repeatedly take from whichever array has the lexicographically larger remaining suffix.",
      "For i in [max(0, k-len2) .. min(k, len1)]: candidate = merge(maxSub(nums1,i), maxSub(nums2,k-i)).",
      "Return the lexicographically largest candidate.",
    ],
    code: {
      python: `def max_number(nums1: list[int], nums2: list[int], k: int) -> list[int]:
    def max_sub(arr: list[int], t: int) -> list[int]:
        drop = len(arr) - t
        stack: list[int] = []
        for x in arr:
            while drop and stack and stack[-1] < x:
                stack.pop()
                drop -= 1
            stack.append(x)
        return stack[:t]

    def merge(a: list[int], b: list[int]) -> list[int]:
        res = []
        while a or b:
            bigger = a if a > b else b
            res.append(bigger[0])
            bigger.pop(0)
        return res

    best: list[int] = []
    for i in range(max(0, k - len(nums2)), min(k, len(nums1)) + 1):
        cand = merge(max_sub(nums1, i), max_sub(nums2, k - i))
        if cand > best:
            best = cand
    return best`,
      java: `import java.util.*;

class Solution {
    public int[] maxNumber(int[] nums1, int[] nums2, int k) {
        int[] best = new int[k];
        for (int i = Math.max(0, k - nums2.length); i <= Math.min(k, nums1.length); i++) {
            int[] cand = merge(maxSub(nums1, i), maxSub(nums2, k - i));
            if (greater(cand, 0, best, 0)) best = cand;
        }
        return best;
    }

    private int[] maxSub(int[] arr, int t) {
        int[] stack = new int[t];
        int top = -1, drop = arr.length - t;
        for (int x : arr) {
            while (top >= 0 && stack[top] < x && drop > 0) { top--; drop--; }
            if (top + 1 < t) stack[++top] = x;
            else drop--;
        }
        return stack;
    }

    private int[] merge(int[] a, int[] b) {
        int[] res = new int[a.length + b.length];
        int i = 0, j = 0, r = 0;
        while (i < a.length || j < b.length) {
            if (greater(a, i, b, j)) res[r++] = a[i++];
            else res[r++] = b[j++];
        }
        return res;
    }

    private boolean greater(int[] a, int i, int[] b, int j) {
        while (i < a.length && j < b.length && a[i] == b[j]) { i++; j++; }
        return j == b.length || (i < a.length && a[i] > b[j]);
    }
}`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    vector<int> maxNumber(vector<int>& nums1, vector<int>& nums2, int k) {
        vector<int> best;
        int n1 = nums1.size(), n2 = nums2.size();
        for (int i = max(0, k - n2); i <= min(k, n1); i++) {
            vector<int> cand = merge(maxSub(nums1, i), maxSub(nums2, k - i));
            if (cand > best) best = cand;
        }
        return best;
    }

private:
    vector<int> maxSub(vector<int>& arr, int t) {
        vector<int> stack;
        int drop = (int)arr.size() - t;
        for (int x : arr) {
            while (drop && !stack.empty() && stack.back() < x) { stack.pop_back(); drop--; }
            stack.push_back(x);
        }
        stack.resize(t);
        return stack;
    }

    vector<int> merge(vector<int> a, vector<int> b) {
        vector<int> res;
        while (!a.empty() || !b.empty()) {
            vector<int>& bigger = (a > b) ? a : b;
            res.push_back(bigger.front());
            bigger.erase(bigger.begin());
        }
        return res;
    }
};`,
    },
    complexity: { time: "O(k * (m + n + k))", space: "O(m + n)" },
    pitfalls: [
      "Comparing only the front digit during merge instead of the full remaining suffix on ties.",
      "Wrong split bounds for i, skipping feasible distributions.",
      "Off-by-one in the monotonic stack when the array is shorter than t.",
    ],
    edgeCases: [
      "One array empty — pick entirely from the other.",
      "k equals total length — use every digit.",
      "Repeated equal digits forcing the suffix tie-break.",
    ],
    whyItMatters:
      "Combining a greedy single-source max subsequence with a tie-aware merge is the canonical pattern for assembling an optimal ordered output from multiple ordered streams.",
    estimatedMinutes: 50,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 268 — pure_dsa · intervals · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "booking-max-concurrent-overlap",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "intervals",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer"],
    title: "Maximum Concurrent Bookings After Each Reservation",
    framing:
      "A reservation service accepts half-open time bookings one at a time. After each new booking it must report the maximum number of bookings that overlap at any instant — the peak concurrency.",
    statement:
      "Implement a class that supports book(start, end) for half-open intervals [start, end). After each call, return the largest integer k such that there exist k bookings all overlapping at some single point in time. All bookings are retained.",
    inputFormat:
      "A sequence of book(start, end) calls with 0 <= start < end.",
    outputFormat:
      "For each book call, an integer: the current maximum overlap (k-booking) across all bookings made so far.",
    constraints: [
      "0 <= start < end <= 10^9",
      "At most 400 book calls.",
      "Half-open intervals: touching endpoints do not overlap.",
    ],
    examples: [
      {
        input: "book(10,20), book(50,60), book(10,40), book(5,15), book(5,10), book(25,55)",
        output: "1, 1, 2, 3, 3, 3",
        explanation: "The third and fourth bookings stack overlaps to 2 then 3 at instants near 10–15.",
      },
      {
        input: "book(24,40), book(40,50)",
        output: "1, 1",
        explanation: "Half-open intervals that touch at 40 do not overlap.",
      },
    ],
    approach: [
      "Maintain a sweep-line delta map keyed by time: +1 at each start, -1 at each end.",
      "On every booking, add its two deltas, then sweep all keys in sorted order accumulating a running count.",
      "The maximum running count across the sweep is the current answer.",
      "An ordered map (TreeMap / std::map / sorted dict) keeps keys sorted so each sweep is linear in the number of distinct boundaries.",
    ],
    solutionSteps: [
      "delta[start] += 1; delta[end] -= 1.",
      "Iterate keys in ascending order, maintaining cur += delta[key].",
      "Track and return max(cur) over the sweep.",
    ],
    code: {
      python: `from sortedcontainers import SortedDict

class MyCalendarThree:
    def __init__(self) -> None:
        self.delta = SortedDict()

    def book(self, start: int, end: int) -> int:
        self.delta[start] = self.delta.get(start, 0) + 1
        self.delta[end] = self.delta.get(end, 0) - 1
        cur = best = 0
        for v in self.delta.values():
            cur += v
            best = max(best, cur)
        return best`,
      java: `import java.util.*;

class MyCalendarThree {
    private final TreeMap<Integer, Integer> delta = new TreeMap<>();

    public MyCalendarThree() {}

    public int book(int start, int end) {
        delta.merge(start, 1, Integer::sum);
        delta.merge(end, -1, Integer::sum);
        int cur = 0, best = 0;
        for (int v : delta.values()) {
            cur += v;
            best = Math.max(best, cur);
        }
        return best;
    }
}`,
      cpp: `#include <map>
#include <algorithm>
using namespace std;

class MyCalendarThree {
    map<int,int> delta;
public:
    MyCalendarThree() {}

    int book(int start, int end) {
        delta[start]++;
        delta[end]--;
        int cur = 0, best = 0;
        for (auto& [t, d] : delta) {
            cur += d;
            best = max(best, cur);
        }
        return best;
    }
};`,
    },
    complexity: { time: "O(n) per book over n distinct boundaries", space: "O(n)" },
    pitfalls: [
      "Decrementing at end inclusive, double-counting bookings that merely touch.",
      "Forgetting the running max can occur mid-sweep, not only at the new interval's edges.",
      "Using an unordered map and sweeping out of time order.",
    ],
    edgeCases: [
      "Two intervals sharing an endpoint — no overlap increase.",
      "Identical intervals booked repeatedly — overlap grows each time.",
      "A single booking — answer 1.",
    ],
    whyItMatters:
      "A delta sweep over an ordered map is the workhorse for peak-concurrency questions: max simultaneous meetings, server connections, or seat reservations.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 269 — pure_dsa · intervals · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "falling-block-stack-heights",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "intervals",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Tallest Stack After Each Falling Block",
    framing:
      "Square blocks drop one by one onto a number line. Each lands on top of whatever it overlaps. After every drop, report the current height of the tallest stack anywhere.",
    statement:
      "Given positions[i] = [left_i, sideLength_i], the i-th square occupies [left_i, left_i + sideLength_i) and falls down until it rests on the floor or on top of an earlier square it overlaps. After each square lands, record the maximum height of any stack so far. Return the list of these running maxima.",
    inputFormat:
      "An array positions of [left, sideLength] pairs in drop order.",
    outputFormat:
      "An array where the i-th entry is the tallest stack height after the i-th square lands.",
    constraints: [
      "1 <= positions.length <= 1000",
      "1 <= left_i <= 10^8",
      "1 <= sideLength_i <= 10^6",
      "Squares are half-open horizontally: [left, left + side).",
    ],
    examples: [
      {
        input: "positions = [[1,2],[2,3],[6,1]]",
        output: "[2,5,5]",
        explanation: "First square rests at height 2; second overlaps it, landing on top → 5; third is isolated at height 1.",
      },
      {
        input: "positions = [[100,100],[200,100]]",
        output: "[100,100]",
        explanation: "Touching at x=200 does not overlap; both sit on the floor.",
      },
    ],
    approach: [
      "Keep a list of placed segments, each as (left, right, height) where right is exclusive.",
      "For a new square spanning [l, r), its base is the max height among all stored segments that horizontally overlap [l, r).",
      "Its top height = base + sideLength; add the new segment.",
      "Maintain a running global maximum and append it after each drop.",
      "Overlap test uses half-open intervals: segments overlap when l < seg.right and seg.left < r.",
    ],
    solutionSteps: [
      "For each [left, side]: r = left + side.",
      "base = max(height of every stored segment overlapping [left, r), default 0).",
      "top = base + side; append (left, r, top) to the segment list.",
      "global = max(global, top); push global to the answer.",
    ],
    code: {
      python: `def falling_squares(positions: list[list[int]]) -> list[int]:
    segments: list[tuple[int, int, int]] = []  # (left, right, height)
    res = []
    best = 0
    for left, side in positions:
        right = left + side
        base = 0
        for sl, sr, h in segments:
            if left < sr and sl < right:
                base = max(base, h)
        top = base + side
        segments.append((left, right, top))
        best = max(best, top)
        res.append(best)
    return res`,
      java: `import java.util.*;

class Solution {
    public List<Integer> fallingSquares(int[][] positions) {
        List<int[]> segs = new ArrayList<>(); // {left, right, height}
        List<Integer> res = new ArrayList<>();
        int best = 0;
        for (int[] p : positions) {
            int left = p[0], right = p[0] + p[1], base = 0;
            for (int[] s : segs)
                if (left < s[1] && s[0] < right) base = Math.max(base, s[2]);
            int top = base + p[1];
            segs.add(new int[]{left, right, top});
            best = Math.max(best, top);
            res.add(best);
        }
        return res;
    }
}`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    vector<int> fallingSquares(vector<vector<int>>& positions) {
        vector<array<int,3>> segs; // {left, right, height}
        vector<int> res;
        int best = 0;
        for (auto& p : positions) {
            int left = p[0], right = p[0] + p[1], base = 0;
            for (auto& s : segs)
                if (left < s[1] && s[0] < right) base = max(base, s[2]);
            int top = base + p[1];
            segs.push_back({left, right, top});
            best = max(best, top);
            res.push_back(best);
        }
        return res;
    }
};`,
    },
    complexity: { time: "O(n^2)", space: "O(n)" },
    pitfalls: [
      "Treating intervals as closed and stacking squares that merely touch at an edge.",
      "Resetting the running maximum instead of carrying it forward.",
      "Adding only the side length without the overlapping base height.",
    ],
    edgeCases: [
      "Squares that touch exactly at a boundary — no stacking.",
      "A square fully containing several earlier ones — base is the tallest of them.",
      "A single drop — its own height.",
    ],
    whyItMatters:
      "Resolving the resting height of a new interval against all overlapping placed intervals models layered layout, range-max stacking, and is the brute-force seed for coordinate-compressed segment-tree solutions.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 270 — pure_dsa · intervals · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "stream-disjoint-interval-merge",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "intervals",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer"],
    title: "Summarize a Number Stream as Disjoint Ranges",
    framing:
      "Integers arrive one at a time on a stream. At any moment the monitor must summarize everything seen as a minimal sorted list of disjoint, merged ranges.",
    statement:
      "Implement a structure with addNum(value) to record an integer and getIntervals() to return the seen numbers as a sorted list of disjoint inclusive intervals [start, end], merged so that consecutive integers collapse into one interval. Duplicate values have no effect.",
    inputFormat:
      "A sequence of addNum(value) and getIntervals() calls.",
    outputFormat:
      "Each getIntervals() returns the current minimal sorted list of disjoint [start, end] pairs.",
    constraints: [
      "0 <= value <= 10^4 per addNum",
      "At most 3 * 10^4 addNum and getIntervals calls combined.",
      "Intervals are inclusive and must be maximally merged.",
    ],
    examples: [
      {
        input: "addNum(1), addNum(3), getIntervals(), addNum(7), addNum(2), getIntervals(), addNum(6), getIntervals()",
        output: "[[1,1],[3,3]]; [[1,3],[7,7]]; [[1,3],[6,7]]",
        explanation: "Adding 2 bridges 1 and 3 into [1,3]; adding 6 extends 7 into [6,7].",
      },
      {
        input: "addNum(5), addNum(5), getIntervals()",
        output: "[[5,5]]",
        explanation: "Duplicate 5 leaves a single point interval.",
      },
    ],
    approach: [
      "Store interval starts in an ordered map keyed by start, value = end.",
      "On addNum(v), skip if v already lies inside an interval (the floor interval covers it).",
      "Otherwise check the interval ending at v-1 (left neighbor) and starting at v+1 (right neighbor) to merge.",
      "Combine the left, the point v, and the right into one interval, deleting the merged neighbors.",
      "getIntervals walks the ordered map in key order.",
    ],
    solutionSteps: [
      "Find floor (largest start <= v); if its end >= v, v is covered → return.",
      "leftMergeable = exists interval with end == v-1; rightMergeable = exists interval with start == v+1.",
      "Compute new [start, end] spanning left neighbor's start (or v) to right neighbor's end (or v).",
      "Erase merged neighbors and insert the new interval.",
    ],
    code: {
      python: `from sortedcontainers import SortedDict

class SummaryRanges:
    def __init__(self) -> None:
        self.starts = SortedDict()  # start -> end

    def addNum(self, value: int) -> None:
        s = self.starts
        idx = s.bisect_right(value) - 1
        if idx >= 0:
            st = s.keys()[idx]
            if s[st] >= value:
                return  # already covered

        new_start, new_end = value, value
        # merge left neighbor ending at value - 1
        if idx >= 0:
            st = s.keys()[idx]
            if s[st] == value - 1:
                new_start = st
                del s[st]
        # merge right neighbor starting at value + 1
        if value + 1 in s:
            new_end = s[value + 1]
            del s[value + 1]
        s[new_start] = max(new_end, s.get(new_start, new_end))

    def getIntervals(self) -> list[list[int]]:
        return [[st, en] for st, en in self.starts.items()]`,
      java: `import java.util.*;

class SummaryRanges {
    private final TreeMap<Integer, Integer> starts = new TreeMap<>(); // start -> end

    public SummaryRanges() {}

    public void addNum(int value) {
        Map.Entry<Integer, Integer> floor = starts.floorEntry(value);
        if (floor != null && floor.getValue() >= value) return; // covered

        int newStart = value, newEnd = value;
        if (floor != null && floor.getValue() == value - 1) {
            newStart = floor.getKey();
            starts.remove(floor.getKey());
        }
        Integer rightEnd = starts.get(value + 1);
        if (rightEnd != null) {
            newEnd = rightEnd;
            starts.remove(value + 1);
        }
        starts.put(newStart, Math.max(newEnd, starts.getOrDefault(newStart, newEnd)));
    }

    public int[][] getIntervals() {
        int[][] res = new int[starts.size()][2];
        int i = 0;
        for (Map.Entry<Integer, Integer> e : starts.entrySet())
            res[i++] = new int[]{e.getKey(), e.getValue()};
        return res;
    }
}`,
      cpp: `#include <map>
#include <vector>
using namespace std;

class SummaryRanges {
    map<int,int> starts; // start -> end
public:
    SummaryRanges() {}

    void addNum(int value) {
        auto it = starts.upper_bound(value);
        if (it != starts.begin()) {
            auto floor = prev(it);
            if (floor->second >= value) return; // covered
        }
        int newStart = value, newEnd = value;
        if (it != starts.begin()) {
            auto floor = prev(it);
            if (floor->second == value - 1) {
                newStart = floor->first;
                starts.erase(floor);
            }
        }
        auto r = starts.find(value + 1);
        if (r != starts.end()) {
            newEnd = r->second;
            starts.erase(r);
        }
        int cur = starts.count(newStart) ? starts[newStart] : newEnd;
        starts[newStart] = max(newEnd, cur);
    }

    vector<vector<int>> getIntervals() {
        vector<vector<int>> res;
        for (auto& [s, e] : starts) res.push_back({s, e});
        return res;
    }
};`,
    },
    complexity: { time: "O(log n) per addNum, O(n) per getIntervals", space: "O(n)" },
    pitfalls: [
      "Missing the duplicate/covered check, inserting redundant point intervals.",
      "Merging only one neighbor when both the left and right should collapse into one range.",
      "Using a hash map and re-sorting on every getIntervals.",
    ],
    edgeCases: [
      "Value bridging two existing intervals into one.",
      "Repeated identical values.",
      "Values arriving in fully reverse order.",
    ],
    whyItMatters:
      "Maintaining merged disjoint intervals under streaming inserts is the core of seen-range tracking, byte-range download bookkeeping, and sparse-set summarization.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 271 — pure_dsa · dp_1d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-taps-to-irrigate-field",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Fewest Sprinklers to Cover the Field",
    framing:
      "A linear field stretches from 0 to n. Each sprinkler at position i wets a radius around it. Open the fewest sprinklers so the whole field is watered end to end.",
    statement:
      "There are n+1 sprinklers at positions 0..n. Sprinkler i has range ranges[i], covering the closed segment [i - ranges[i], i + ranges[i]]. Return the minimum number of sprinklers to open so that every point in [0, n] is covered, or -1 if it is impossible. A sprinkler with range 0 covers nothing.",
    inputFormat:
      "An integer n and an array ranges of length n+1 with ranges[i] >= 0.",
    outputFormat: "The minimum number of sprinklers, or -1 if impossible.",
    constraints: [
      "1 <= n <= 10^4",
      "ranges.length == n + 1",
      "0 <= ranges[i] <= 100",
    ],
    examples: [
      {
        input: "n = 5, ranges = [3,4,1,1,0,0]",
        output: "1",
        explanation: "Sprinkler at index 1 covers [-3,5], spanning the whole field.",
      },
      {
        input: "n = 3, ranges = [0,0,0,0]",
        output: "-1",
        explanation: "No sprinkler covers any width; the field cannot be watered.",
      },
    ],
    approach: [
      "Convert each sprinkler into an interval [max(0, i-r), i+r] and reduce to the classic 'minimum number of intervals to cover [0, n]'.",
      "Build maxReach[L] = farthest right coverage starting at or before each left point: for each interval, maxReach[left] = max(maxReach[left], right).",
      "Greedily sweep left to right like Jump Game II: track the current reachable end and the best next end while inside the current segment.",
      "Each time you exhaust the current end, increment the tap count and jump to the best reachable end; if it did not advance, return -1.",
    ],
    solutionSteps: [
      "maxReach = array of size n+1, zero; for i: l = max(0, i-r), maxReach[l] = max(maxReach[l], i+r).",
      "taps = 0, curEnd = 0, nextEnd = 0, i = 0.",
      "While curEnd < n: extend nextEnd over indices up to curEnd; if nextEnd <= curEnd return -1; taps++; curEnd = nextEnd.",
      "Return taps.",
    ],
    code: {
      python: `def min_taps(n: int, ranges: list[int]) -> int:
    max_reach = [0] * (n + 1)
    for i, r in enumerate(ranges):
        if r == 0:
            continue
        l = max(0, i - r)
        max_reach[l] = max(max_reach[l], i + r)

    taps = 0
    cur_end = next_end = i = 0
    while cur_end < n:
        while i <= cur_end:
            next_end = max(next_end, max_reach[i])
            i += 1
        if next_end <= cur_end:
            return -1
        taps += 1
        cur_end = next_end
    return taps`,
      java: `class Solution {
    public int minTaps(int n, int[] ranges) {
        int[] maxReach = new int[n + 1];
        for (int i = 0; i < ranges.length; i++) {
            if (ranges[i] == 0) continue;
            int l = Math.max(0, i - ranges[i]);
            maxReach[l] = Math.max(maxReach[l], i + ranges[i]);
        }
        int taps = 0, curEnd = 0, nextEnd = 0, i = 0;
        while (curEnd < n) {
            while (i <= curEnd) {
                nextEnd = Math.max(nextEnd, maxReach[i]);
                i++;
            }
            if (nextEnd <= curEnd) return -1;
            taps++;
            curEnd = nextEnd;
        }
        return taps;
    }
}`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int minTaps(int n, vector<int>& ranges) {
        vector<int> maxReach(n + 1, 0);
        for (int i = 0; i < (int)ranges.size(); i++) {
            if (ranges[i] == 0) continue;
            int l = max(0, i - ranges[i]);
            maxReach[l] = max(maxReach[l], i + ranges[i]);
        }
        int taps = 0, curEnd = 0, nextEnd = 0, i = 0;
        while (curEnd < n) {
            while (i <= curEnd) {
                nextEnd = max(nextEnd, maxReach[i]);
                i++;
            }
            if (nextEnd <= curEnd) return -1;
            taps++;
            curEnd = nextEnd;
        }
        return taps;
    }
};`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Clamping the right end but forgetting to clamp the left to 0.",
      "Returning -1 too early when the next reach merely equals the current end without progress check.",
      "Treating range-0 sprinklers as covering a single point.",
    ],
    edgeCases: [
      "A single sprinkler spanning the entire field.",
      "A gap with no interval reaching past it — impossible.",
      "n = 1 with adequate coverage at index 0.",
    ],
    whyItMatters:
      "Reducing coverage to maxReach + a greedy Jump-Game sweep is the optimal template for minimum-interval-cover problems like video stitching and resource-window coverage.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 272 — ai_applied · dp_1d · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "reward-subsequence-span-cap",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 10,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "software_engineer"],
    title: "Max Reward Trajectory With Bounded Step Gap",
    framing:
      "A reinforcement-learning rollout has per-step rewards. You select an increasing subsequence of steps where consecutive picks are at most k apart, maximizing total reward — modeling a policy that may skip but not stall.",
    statement:
      "Given an integer array rewards and an integer k, choose a non-empty subsequence such that for every pair of consecutive chosen indices i < j we have j - i <= k. Maximize the sum of chosen rewards. Return that maximum. Rewards may be negative; a single element is a valid subsequence.",
    inputFormat:
      "An integer array rewards and an integer k (the maximum index gap).",
    outputFormat: "An integer: the maximum achievable subsequence sum.",
    constraints: [
      "1 <= rewards.length <= 10^5",
      "-10^4 <= rewards[i] <= 10^4",
      "1 <= k <= rewards.length",
    ],
    examples: [
      {
        input: "rewards = [10,2,-10,5,20], k = 2",
        output: "37",
        explanation: "Pick indices 0,1,3,4 (gaps <= 2): 10 + 2 + 5 + 20 = 37.",
      },
      {
        input: "rewards = [-1,-2,-3], k = 1",
        output: "-1",
        explanation: "All negative; the best is the single largest element -1.",
      },
    ],
    approach: [
      "Define dp[i] = best subsequence sum ending exactly at i. dp[i] = rewards[i] + max(0, max(dp[i-k..i-1])).",
      "The window-maximum of dp over the last k entries is needed each step; a monotonic deque maintains it in amortized O(1).",
      "Add rewards[i] to the best prior dp in the window (or 0 if all are negative — start fresh at i).",
      "The answer is the maximum dp value over all i.",
    ],
    solutionSteps: [
      "Maintain a deque of indices with decreasing dp values; its front is the window max.",
      "For each i: pop front indices older than i-k; dp[i] = rewards[i] + max(0, dp[front]).",
      "Pop back while dp[back] <= dp[i], then push i.",
      "Track the global maximum dp.",
    ],
    code: {
      python: `from collections import deque

def constrained_subset_sum(rewards: list[int], k: int) -> int:
    n = len(rewards)
    dp = [0] * n
    dq = deque()  # indices, dp decreasing
    best = float("-inf")
    for i in range(n):
        while dq and dq[0] < i - k:
            dq.popleft()
        prior = dp[dq[0]] if dq else 0
        dp[i] = rewards[i] + max(0, prior)
        best = max(best, dp[i])
        while dq and dp[dq[-1]] <= dp[i]:
            dq.pop()
        dq.append(i)
    return best`,
      java: `import java.util.*;

class Solution {
    public int constrainedSubsetSum(int[] rewards, int k) {
        int n = rewards.length;
        int[] dp = new int[n];
        Deque<Integer> dq = new ArrayDeque<>();
        int best = Integer.MIN_VALUE;
        for (int i = 0; i < n; i++) {
            while (!dq.isEmpty() && dq.peekFirst() < i - k) dq.pollFirst();
            int prior = dq.isEmpty() ? 0 : dp[dq.peekFirst()];
            dp[i] = rewards[i] + Math.max(0, prior);
            best = Math.max(best, dp[i]);
            while (!dq.isEmpty() && dp[dq.peekLast()] <= dp[i]) dq.pollLast();
            dq.addLast(i);
        }
        return best;
    }
}`,
      cpp: `#include <vector>
#include <deque>
#include <algorithm>
#include <climits>
using namespace std;

class Solution {
public:
    int constrainedSubsetSum(vector<int>& rewards, int k) {
        int n = rewards.size();
        vector<int> dp(n);
        deque<int> dq;
        int best = INT_MIN;
        for (int i = 0; i < n; i++) {
            while (!dq.empty() && dq.front() < i - k) dq.pop_front();
            int prior = dq.empty() ? 0 : dp[dq.front()];
            dp[i] = rewards[i] + max(0, prior);
            best = max(best, dp[i]);
            while (!dq.empty() && dp[dq.back()] <= dp[i]) dq.pop_back();
            dq.push_back(i);
        }
        return best;
    }
};`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Allowing dp to take a negative prior instead of resetting to start a fresh subsequence (the max(0, ...) guard).",
      "Forgetting to evict deque indices older than i-k.",
      "Initializing the answer to 0, breaking all-negative inputs.",
    ],
    edgeCases: [
      "All negative rewards — answer is the single max element.",
      "k equal to n — no gap restriction.",
      "Single-element array.",
    ],
    whyItMatters:
      "A monotonic-deque windowed DP is the standard way to add a 'no stalling longer than k' constraint to sequence optimization — common in trajectory scoring and rate-limited reward accumulation.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 273 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "attend-weighted-events-k-cap",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Maximum Value Attending at Most K Events",
    framing:
      "Each event has a fixed day range and a value. You can attend at most k events, never two that overlap on any day. Maximize total value attended.",
    statement:
      "Given events where events[i] = [start, end, value] (inclusive days) and an integer k, attend at most k non-overlapping events to maximize the sum of their values. Two events overlap if they share any day, including touching endpoints. Return the maximum value.",
    inputFormat:
      "An array events of [start, end, value] and an integer k.",
    outputFormat: "An integer: the maximum total value of at most k non-overlapping events.",
    constraints: [
      "1 <= k <= events.length <= 10^6 (test sizes here up to a few thousand)",
      "1 <= start <= end <= 10^9",
      "1 <= value <= 10^6",
    ],
    examples: [
      {
        input: "events = [[1,2,4],[3,4,3],[2,3,1]], k = 2",
        output: "7",
        explanation: "Attend [1,2,4] then [3,4,3] (non-overlapping) for 4 + 3 = 7.",
      },
      {
        input: "events = [[1,1,1],[2,2,2],[3,3,3],[4,4,4]], k = 3",
        output: "9",
        explanation: "Pick the three highest non-overlapping single-day events: 4+3+2 = 9.",
      },
    ],
    approach: [
      "Sort events by start day.",
      "dp[i][j] = best value considering events from index i onward having attended j events.",
      "For event i, either skip it (dp[i+1][j]) or take it: value + dp[next][j-1] where next is the first event starting after event i's end (binary search).",
      "Binary search over sorted start days makes the 'next non-overlapping' lookup O(log n).",
      "Memoize on (i, j).",
    ],
    solutionSteps: [
      "Sort events by start; extract starts[] for binary search.",
      "next(i) = lower_bound(starts, events[i].end + 1).",
      "dp(i, j): if i == n or j == 0 → 0; else max(dp(i+1, j), value_i + dp(next(i), j-1)).",
      "Return dp(0, k).",
    ],
    code: {
      python: `from bisect import bisect_left
from functools import lru_cache

def max_value(events: list[list[int]], k: int) -> int:
    events.sort()
    starts = [e[0] for e in events]
    n = len(events)

    @lru_cache(maxsize=None)
    def dp(i: int, j: int) -> int:
        if i == n or j == 0:
            return 0
        nxt = bisect_left(starts, events[i][1] + 1)
        take = events[i][2] + dp(nxt, j - 1)
        skip = dp(i + 1, j)
        return max(take, skip)

    return dp(0, k)`,
      java: `import java.util.*;

class Solution {
    private int[][] events;
    private int[] starts;
    private Integer[][] memo;
    private int n;

    public int maxValue(int[][] events, int k) {
        Arrays.sort(events, (a, b) -> a[0] - b[0]);
        this.events = events;
        this.n = events.length;
        this.starts = new int[n];
        for (int i = 0; i < n; i++) starts[i] = events[i][0];
        this.memo = new Integer[n][k + 1];
        return dp(0, k);
    }

    private int dp(int i, int j) {
        if (i == n || j == 0) return 0;
        if (memo[i][j] != null) return memo[i][j];
        int nxt = lowerBound(events[i][1] + 1);
        int take = events[i][2] + dp(nxt, j - 1);
        int skip = dp(i + 1, j);
        return memo[i][j] = Math.max(take, skip);
    }

    private int lowerBound(int key) {
        int lo = 0, hi = n;
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;
            if (starts[mid] < key) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    }
}`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
    vector<vector<int>> events;
    vector<int> starts;
    vector<vector<int>> memo;
    int n;

    int dp(int i, int j) {
        if (i == n || j == 0) return 0;
        if (memo[i][j] != -1) return memo[i][j];
        int nxt = lower_bound(starts.begin(), starts.end(), events[i][1] + 1) - starts.begin();
        int take = events[i][2] + dp(nxt, j - 1);
        int skip = dp(i + 1, j);
        return memo[i][j] = max(take, skip);
    }

public:
    int maxValue(vector<vector<int>>& ev, int k) {
        sort(ev.begin(), ev.end());
        events = ev;
        n = ev.size();
        starts.resize(n);
        for (int i = 0; i < n; i++) starts[i] = ev[i][0];
        memo.assign(n, vector<int>(k + 1, -1));
        return dp(0, k);
    }
};`,
    },
    complexity: { time: "O(n * k * log n)", space: "O(n * k)" },
    pitfalls: [
      "Searching for end instead of end+1, allowing touching events to be attended together.",
      "Forgetting the j == 0 base case, attending more than k events.",
      "Not sorting by start before binary searching the start array.",
    ],
    edgeCases: [
      "k larger than the number of non-overlapping events possible.",
      "All events overlapping — only one can be attended.",
      "Single event.",
    ],
    whyItMatters:
      "Weighted interval scheduling with a count cap combines binary-searched next-compatible lookup with a two-dimensional DP — the basis of constrained booking and ad-slot allocation.",
    estimatedMinutes: 50,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 274 — ai_applied · dp_2d · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "recommendation-playlist-count",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 10,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "backend_engineer"],
    title: "Count Valid Recommendation Playlists",
    framing:
      "A recommender assembles a playlist of fixed length from a catalog. Every track in the catalog must appear, and a track may repeat only after at least k other tracks have played since its last appearance. Count the distinct ordered playlists.",
    statement:
      "Given n unique tracks, build playlists of length goal such that every track is used at least once and any track repeat happens only after at least k other tracks have played in between. Return the number of possible playlists modulo 1e9+7.",
    inputFormat:
      "Three integers n (catalog size), goal (playlist length), and k (repeat cooldown).",
    outputFormat: "An integer: the count of valid playlists modulo 1e9+7.",
    constraints: [
      "0 <= k < n <= 100",
      "n <= goal <= 100",
      "Answer is taken modulo 1_000_000_007.",
    ],
    examples: [
      {
        input: "n = 3, goal = 3, k = 1",
        output: "6",
        explanation: "All 3! orderings of three distinct tracks are valid.",
      },
      {
        input: "n = 2, goal = 3, k = 1",
        output: "2",
        explanation: "[1,2,1] and [2,1,2] are the only valid playlists.",
      },
    ],
    approach: [
      "dp[i][j] = number of length-i playlists using exactly j distinct tracks.",
      "Add a brand-new track: there are (n - (j-1)) unused tracks, so dp[i][j] += dp[i-1][j-1] * (n - j + 1).",
      "Replay an already-used track: only tracks used more than k positions ago are allowed, giving (j - k) choices, so dp[i][j] += dp[i-1][j] * max(0, j - k).",
      "Answer is dp[goal][n], all arithmetic modulo 1e9+7.",
    ],
    solutionSteps: [
      "Initialize dp[0][0] = 1.",
      "For i in 1..goal, for j in 1..min(i, n): combine the new-track and replay transitions.",
      "Take everything mod 1e9+7.",
      "Return dp[goal][n].",
    ],
    code: {
      python: `def num_music_playlists(n: int, goal: int, k: int) -> int:
    MOD = 1_000_000_007
    dp = [[0] * (n + 1) for _ in range(goal + 1)]
    dp[0][0] = 1
    for i in range(1, goal + 1):
        for j in range(1, min(i, n) + 1):
            dp[i][j] = dp[i - 1][j - 1] * (n - j + 1) % MOD
            if j > k:
                dp[i][j] = (dp[i][j] + dp[i - 1][j] * (j - k)) % MOD
    return dp[goal][n]`,
      java: `class Solution {
    public int numMusicPlaylists(int n, int goal, int k) {
        long MOD = 1_000_000_007L;
        long[][] dp = new long[goal + 1][n + 1];
        dp[0][0] = 1;
        for (int i = 1; i <= goal; i++) {
            for (int j = 1; j <= Math.min(i, n); j++) {
                dp[i][j] = dp[i - 1][j - 1] * (n - j + 1) % MOD;
                if (j > k)
                    dp[i][j] = (dp[i][j] + dp[i - 1][j] * (j - k)) % MOD;
            }
        }
        return (int) dp[goal][n];
    }
}`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int numMusicPlaylists(int n, int goal, int k) {
        const long MOD = 1000000007L;
        vector<vector<long>> dp(goal + 1, vector<long>(n + 1, 0));
        dp[0][0] = 1;
        for (int i = 1; i <= goal; i++) {
            for (int j = 1; j <= min(i, n); j++) {
                dp[i][j] = dp[i - 1][j - 1] * (n - j + 1) % MOD;
                if (j > k)
                    dp[i][j] = (dp[i][j] + dp[i - 1][j] * (j - k)) % MOD;
            }
        }
        return (int) dp[goal][n];
    }
};`,
    },
    complexity: { time: "O(goal * n)", space: "O(goal * n)" },
    pitfalls: [
      "Allowing replays when j <= k, where no track is old enough to repeat.",
      "Using (j) instead of (j - k) replay choices.",
      "Forgetting the modulus on intermediate products, overflowing 32-bit ints.",
    ],
    edgeCases: [
      "k = 0 — replays allowed immediately, j choices.",
      "goal == n — every track exactly once, answer n!.",
      "n = 1 only valid when k = 0.",
    ],
    whyItMatters:
      "Counting sequences under a 'no reuse within k' cooldown via a two-axis (length, distinct-used) DP underlies recommendation diversity, cache-eviction counting, and constrained scheduling enumeration.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 275 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-falling-path-distinct-columns",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Minimum Falling Path With No Repeated Column",
    framing:
      "A drone descends an n x n cost grid one row per step. It may not land in the same column on two consecutive rows. Minimize the total cost of a full top-to-bottom descent.",
    statement:
      "Given an n x n integer matrix, choose one cell from each row such that no two cells in adjacent rows are in the same column, minimizing the sum of chosen cells. Return that minimum sum.",
    inputFormat: "An n x n integer matrix.",
    outputFormat: "An integer: the minimum non-zero-shift falling path sum.",
    constraints: [
      "1 <= n <= 200",
      "-99 <= matrix[i][j] <= 99",
      "Adjacent-row picks must be in different columns.",
    ],
    examples: [
      {
        input: "matrix = [[1,2,3],[4,5,6],[7,8,9]]",
        output: "13",
        explanation: "1 (row0) + 5 (row1) + 7 (row2) = 13, with all columns differing between adjacent rows.",
      },
      {
        input: "matrix = [[7]]",
        output: "7",
        explanation: "Single cell.",
      },
    ],
    approach: [
      "For each row, the best previous-row value to add to a cell in column c is the minimum of the previous row excluding column c.",
      "Naively that is O(n) per cell; instead precompute the smallest and second-smallest values (with their columns) of the previous row.",
      "If a cell is in the column holding the previous minimum, use the second minimum; otherwise use the minimum.",
      "Roll forward row by row; the answer is the minimum of the final row.",
    ],
    solutionSteps: [
      "Initialize prev = first row.",
      "For each subsequent row: find (min1, idx1, min2) of prev.",
      "cur[c] = matrix[r][c] + (min1 if c != idx1 else min2).",
      "prev = cur; return min(prev).",
    ],
    code: {
      python: `def min_falling_path_sum(matrix: list[list[int]]) -> int:
    n = len(matrix)
    prev = matrix[0][:]
    for r in range(1, n):
        min1 = min2 = float("inf")
        idx1 = -1
        for c, v in enumerate(prev):
            if v < min1:
                min2, min1, idx1 = min1, v, c
            elif v < min2:
                min2 = v
        cur = []
        for c in range(n):
            add = min1 if c != idx1 else min2
            cur.append(matrix[r][c] + add)
        prev = cur
    return min(prev)`,
      java: `class Solution {
    public int minFallingPathSum(int[][] matrix) {
        int n = matrix.length;
        int[] prev = matrix[0].clone();
        for (int r = 1; r < n; r++) {
            int min1 = Integer.MAX_VALUE, min2 = Integer.MAX_VALUE, idx1 = -1;
            for (int c = 0; c < n; c++) {
                int v = prev[c];
                if (v < min1) { min2 = min1; min1 = v; idx1 = c; }
                else if (v < min2) { min2 = v; }
            }
            int[] cur = new int[n];
            for (int c = 0; c < n; c++) {
                int add = (c != idx1) ? min1 : min2;
                cur[c] = matrix[r][c] + add;
            }
            prev = cur;
        }
        int best = Integer.MAX_VALUE;
        for (int v : prev) best = Math.min(best, v);
        return best;
    }
}`,
      cpp: `#include <vector>
#include <algorithm>
#include <climits>
using namespace std;

class Solution {
public:
    int minFallingPathSum(vector<vector<int>>& matrix) {
        int n = matrix.size();
        vector<int> prev = matrix[0];
        for (int r = 1; r < n; r++) {
            int min1 = INT_MAX, min2 = INT_MAX, idx1 = -1;
            for (int c = 0; c < n; c++) {
                int v = prev[c];
                if (v < min1) { min2 = min1; min1 = v; idx1 = c; }
                else if (v < min2) { min2 = v; }
            }
            vector<int> cur(n);
            for (int c = 0; c < n; c++) {
                int add = (c != idx1) ? min1 : min2;
                cur[c] = matrix[r][c] + add;
            }
            prev = cur;
        }
        return *min_element(prev.begin(), prev.end());
    }
};`,
    },
    complexity: { time: "O(n^2)", space: "O(n)" },
    pitfalls: [
      "Recomputing the row minimum excluding a column with an inner loop, making it O(n^3).",
      "Mishandling ties when the two smallest share a value but different columns.",
      "Forgetting n = 1 where the answer is the single cell.",
    ],
    edgeCases: [
      "Single row or single column (n=1).",
      "Negative values pulling the path below zero.",
      "Multiple equal minima in a row.",
    ],
    whyItMatters:
      "Tracking the two smallest values to enforce a 'not the same column' constraint turns an O(n^3) DP into O(n^2) — a classic optimization reused in assignment and dependency-avoiding path problems.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 276 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "seat-students-exam-grid",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Seat the Most Students Without Cheating",
    framing:
      "An exam hall is a grid of good and broken seats. A student can copy from the seat directly left, right, and the four diagonal neighbors. Seat as many students as possible so no one can copy.",
    statement:
      "Given an m x n grid where '.' is a usable seat and '#' is broken, place students so that no student sits to the immediate left or right of another, nor on either upper-left or upper-right diagonal of another. Return the maximum number of students that can be seated.",
    inputFormat:
      "An m x n character grid (each cell '.' or '#').",
    outputFormat: "An integer: the maximum number of seated students.",
    constraints: [
      "1 <= m <= 8",
      "1 <= n <= 8",
      "Each cell is '.' (good) or '#' (broken).",
    ],
    examples: [
      {
        input: 'seats = [[".","#","."],["#",".","#"],[".","#","."]]',
        output: "4",
        explanation: "The four corners can all be seated without any left/right/diagonal conflict.",
      },
      {
        input: 'seats = [[".","."],[".","."]]',
        output: "2",
        explanation: "Seat the two diagonal cells; same-row adjacency and upper diagonals are avoided.",
      },
    ],
    approach: [
      "Represent each row's seating as a bitmask; precompute which masks are valid for that row (only good seats, no two adjacent bits).",
      "A row mask is compatible with the previous row mask if no bit conflicts on the upper-left ((prev << 1) & cur) or upper-right ((prev >> 1) & cur).",
      "dp[r][mask] = max students seating row r with that mask given the best compatible previous-row state.",
      "Iterate rows, for each valid current mask take the best dp over compatible previous masks plus popcount(mask).",
      "Answer is the maximum dp value in the last processed row.",
    ],
    solutionSteps: [
      "For each row build seatBits where '#' positions are forbidden.",
      "Enumerate masks 0..2^n-1; valid if (mask & ~seatBits)==0 and no adjacent bits ((mask & (mask<<1))==0).",
      "Transition: cur valid with prev if (cur & (prev<<1))==0 and (cur & (prev>>1))==0.",
      "dp[mask] = popcount(mask) + max over compatible prev dp.",
    ],
    code: {
      python: `def max_students(seats: list[list[str]]) -> int:
    m, n = len(seats), len(seats[0])
    good = []
    for row in seats:
        bits = 0
        for j, ch in enumerate(row):
            if ch == ".":
                bits |= (1 << j)
        good.append(bits)

    full = 1 << n
    valid_masks = [mask for mask in range(full) if mask & (mask << 1) == 0]
    prev = {0: 0}
    for r in range(m):
        cur = {}
        for mask in valid_masks:
            if mask & ~good[r]:
                continue
            best = -1
            for pmask, pcnt in prev.items():
                if mask & (pmask << 1) or mask & (pmask >> 1):
                    continue
                best = max(best, pcnt)
            if best >= 0:
                cur[mask] = best + bin(mask).count("1")
        prev = cur if cur else {0: 0}
    return max(prev.values())`,
      java: `import java.util.*;

class Solution {
    public int maxStudents(char[][] seats) {
        int m = seats.length, n = seats[0].length, full = 1 << n;
        int[] good = new int[m];
        for (int i = 0; i < m; i++)
            for (int j = 0; j < n; j++)
                if (seats[i][j] == '.') good[i] |= (1 << j);

        int[] prev = new int[full];
        Arrays.fill(prev, -1);
        prev[0] = 0;
        for (int r = 0; r < m; r++) {
            int[] cur = new int[full];
            Arrays.fill(cur, -1);
            for (int mask = 0; mask < full; mask++) {
                if ((mask & (mask << 1)) != 0) continue;
                if ((mask & ~good[r]) != 0) continue;
                for (int pmask = 0; pmask < full; pmask++) {
                    if (prev[pmask] < 0) continue;
                    if ((mask & (pmask << 1)) != 0 || (mask & (pmask >> 1)) != 0) continue;
                    cur[mask] = Math.max(cur[mask], prev[pmask] + Integer.bitCount(mask));
                }
            }
            boolean any = false;
            for (int v : cur) if (v >= 0) { any = true; break; }
            if (any) prev = cur;
        }
        int best = 0;
        for (int v : prev) best = Math.max(best, v);
        return best;
    }
}`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int maxStudents(vector<vector<char>>& seats) {
        int m = seats.size(), n = seats[0].size(), full = 1 << n;
        vector<int> good(m, 0);
        for (int i = 0; i < m; i++)
            for (int j = 0; j < n; j++)
                if (seats[i][j] == '.') good[i] |= (1 << j);

        vector<int> prev(full, -1);
        prev[0] = 0;
        for (int r = 0; r < m; r++) {
            vector<int> cur(full, -1);
            for (int mask = 0; mask < full; mask++) {
                if (mask & (mask << 1)) continue;
                if (mask & ~good[r]) continue;
                for (int pmask = 0; pmask < full; pmask++) {
                    if (prev[pmask] < 0) continue;
                    if ((mask & (pmask << 1)) || (mask & (pmask >> 1))) continue;
                    cur[mask] = max(cur[mask], prev[pmask] + __builtin_popcount(mask));
                }
            }
            bool any = false;
            for (int v : cur) if (v >= 0) { any = true; break; }
            if (any) prev = cur;
        }
        return *max_element(prev.begin(), prev.end());
    }
};`,
    },
    complexity: { time: "O(m * 4^n)", space: "O(2^n)" },
    pitfalls: [
      "Checking vertical neighbors — copying is only left/right and the two upper diagonals, never straight up/down.",
      "Allowing students on broken seats by skipping the good-seat mask filter.",
      "Resetting dp when a row has no valid placement instead of carrying an empty-row state.",
    ],
    edgeCases: [
      "A row fully broken — contributes zero but must not block later rows.",
      "Single row — just the max independent set within that row.",
      "All seats good — checkerboard-like optimum.",
    ],
    whyItMatters:
      "Row-by-row bitmask DP with inter-row compatibility is the standard approach for grid placement under adjacency/diagonal constraints — broken-seat seating, tiling, and conflict-free assignment.",
    estimatedMinutes: 55,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 277 — pure_dsa · bit_manipulation · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "schedule-courses-min-semesters-k",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "bit_manipulation",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Fewest Semesters With a Per-Term Course Cap",
    framing:
      "A degree has prerequisite dependencies between courses. Each semester you may take at most k courses, all of whose prerequisites were completed earlier. Find the fewest semesters to finish.",
    statement:
      "Given n courses labeled 1..n, a list of prerequisite pairs relations where [a, b] means a must be taken before b, and an integer k limiting courses per semester, return the minimum number of semesters to complete all courses. It is guaranteed the prerequisites form a DAG.",
    inputFormat:
      "Integers n and k, and a list of [prev, next] prerequisite pairs.",
    outputFormat: "An integer: the minimum number of semesters.",
    constraints: [
      "1 <= n <= 15",
      "1 <= k <= n",
      "relations form a valid DAG (no cycles).",
    ],
    examples: [
      {
        input: "n = 4, relations = [[2,1],[3,1],[1,4]], k = 2",
        output: "3",
        explanation: "Semester 1: {2,3}; semester 2: {1}; semester 3: {4}.",
      },
      {
        input: "n = 5, relations = [[2,1],[3,1],[4,1],[1,5]], k = 2",
        output: "4",
        explanation: "Three prerequisites of 1 across two semesters, then 1, then 5.",
      },
    ],
    approach: [
      "Encode the completed set of courses as a bitmask over n bits; prereq[c] = mask of courses that must precede c.",
      "dp[mask] = minimum semesters to reach the completed set mask.",
      "From a state, the courses currently takeable are those not yet done whose prereq mask is a subset of mask.",
      "If at most k are takeable, take them all; otherwise enumerate every k-subset of the takeable set as one semester's choice.",
      "BFS/DP over masks; answer is dp at the full mask.",
    ],
    solutionSteps: [
      "Build prereq[c] from relations (0-indexed bits).",
      "dp size 2^n init to infinity, dp[0]=0.",
      "For each reachable mask, compute available = courses with prereq subset of mask and not in mask.",
      "If popcount(available) <= k, next = mask|available; else iterate submasks of available with popcount==k.",
      "Relax dp[next] = dp[mask]+1; return dp[full].",
    ],
    code: {
      python: `def min_number_of_semesters(n: int, relations: list[list[int]], k: int) -> int:
    prereq = [0] * n
    for a, b in relations:
        prereq[b - 1] |= (1 << (a - 1))

    full = (1 << n) - 1
    INF = float("inf")
    dp = [INF] * (1 << n)
    dp[0] = 0
    for mask in range(1 << n):
        if dp[mask] == INF:
            continue
        available = 0
        for c in range(n):
            if not (mask & (1 << c)) and (prereq[c] & mask) == prereq[c]:
                available |= (1 << c)
        if bin(available).count("1") <= k:
            nxt = mask | available
            dp[nxt] = min(dp[nxt], dp[mask] + 1)
        else:
            sub = available
            while sub:
                if bin(sub).count("1") == k:
                    nxt = mask | sub
                    dp[nxt] = min(dp[nxt], dp[mask] + 1)
                sub = (sub - 1) & available
    return dp[full]`,
      java: `import java.util.*;

class Solution {
    public int minNumberOfSemesters(int n, int[][] relations, int k) {
        int[] prereq = new int[n];
        for (int[] r : relations) prereq[r[1] - 1] |= (1 << (r[0] - 1));
        int full = (1 << n) - 1;
        int[] dp = new int[1 << n];
        Arrays.fill(dp, Integer.MAX_VALUE);
        dp[0] = 0;
        for (int mask = 0; mask < (1 << n); mask++) {
            if (dp[mask] == Integer.MAX_VALUE) continue;
            int available = 0;
            for (int c = 0; c < n; c++)
                if ((mask & (1 << c)) == 0 && (prereq[c] & mask) == prereq[c])
                    available |= (1 << c);
            if (Integer.bitCount(available) <= k) {
                int nxt = mask | available;
                dp[nxt] = Math.min(dp[nxt], dp[mask] + 1);
            } else {
                for (int sub = available; sub > 0; sub = (sub - 1) & available)
                    if (Integer.bitCount(sub) == k) {
                        int nxt = mask | sub;
                        dp[nxt] = Math.min(dp[nxt], dp[mask] + 1);
                    }
            }
        }
        return dp[full];
    }
}`,
      cpp: `#include <vector>
#include <algorithm>
#include <climits>
using namespace std;

class Solution {
public:
    int minNumberOfSemesters(int n, vector<vector<int>>& relations, int k) {
        vector<int> prereq(n, 0);
        for (auto& r : relations) prereq[r[1] - 1] |= (1 << (r[0] - 1));
        int full = (1 << n) - 1;
        vector<int> dp(1 << n, INT_MAX);
        dp[0] = 0;
        for (int mask = 0; mask < (1 << n); mask++) {
            if (dp[mask] == INT_MAX) continue;
            int available = 0;
            for (int c = 0; c < n; c++)
                if (!(mask & (1 << c)) && (prereq[c] & mask) == prereq[c])
                    available |= (1 << c);
            if (__builtin_popcount(available) <= k) {
                int nxt = mask | available;
                dp[nxt] = min(dp[nxt], dp[mask] + 1);
            } else {
                for (int sub = available; sub > 0; sub = (sub - 1) & available)
                    if (__builtin_popcount(sub) == k) {
                        int nxt = mask | sub;
                        dp[nxt] = min(dp[nxt], dp[mask] + 1);
                    }
            }
        }
        return dp[full];
    }
};`,
    },
    complexity: { time: "O(3^n) over mask/submask enumeration", space: "O(2^n)" },
    pitfalls: [
      "Greedily taking the k 'deepest' courses — a greedy choice is not optimal; you must enumerate k-subsets.",
      "Including courses whose prerequisites are not all in the completed mask.",
      "Forgetting the fast path when fewer than k courses are available.",
    ],
    edgeCases: [
      "No prerequisites — answer is ceil(n / k).",
      "A long dependency chain forcing one course per semester.",
      "k >= n with independent courses — one semester.",
    ],
    whyItMatters:
      "Subset DP with submask enumeration under a per-step cardinality cap is the canonical model for batched dependency scheduling — CI stages, build pipelines, and curriculum planning.",
    estimatedMinutes: 55,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 278 — pure_dsa · bit_manipulation · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-and-sum-slot-assignment",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "bit_manipulation",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Maximize Total AND Across Limited Slots",
    framing:
      "Each number must be dropped into one of numSlots slots, and every slot holds at most two numbers. The score of a slot is the bitwise AND of the slot index with each number it holds; maximize the summed score.",
    statement:
      "Given an integer array nums and an integer numSlots (slots numbered 1..numSlots), place every number into some slot with at most two numbers per slot. The contribution of placing value v into slot i is (v AND i). Return the maximum possible sum of all contributions.",
    inputFormat:
      "An integer array nums and an integer numSlots with 2 * numSlots >= nums.length.",
    outputFormat: "An integer: the maximum total AND-sum.",
    constraints: [
      "1 <= numSlots <= 9",
      "1 <= nums.length <= 2 * numSlots",
      "1 <= nums[i] <= 15",
    ],
    examples: [
      {
        input: "nums = [1,2,3,4,5,6], numSlots = 3",
        output: "9",
        explanation: "An optimal assignment pairs numbers into slots 1,2,3 to total 9.",
      },
      {
        input: "nums = [1,3,10,4,7,1], numSlots = 9",
        output: "24",
        explanation: "Spread across high-index slots to maximize shared set bits.",
      },
    ],
    approach: [
      "Encode slot capacities in base-3: each of numSlots slots can hold 0, 1, or 2 numbers, so a ternary mask tracks remaining capacity usage.",
      "Process numbers one at a time using the count of placed numbers (derived from mask) as the index into nums.",
      "dp[mask] = best AND-sum achievable given the slot-occupancy state mask.",
      "Transition: for the next number, try each slot whose used-count < 2, add (num AND slot) and bump that slot's ternary digit.",
      "Memoize over mask.",
    ],
    solutionSteps: [
      "powers[i] = 3^i for slot i; full state space 3^numSlots.",
      "placed = sum of ternary digits of mask = index of the next number.",
      "If placed == len(nums) return 0.",
      "For each slot with digit < 2: best = max(best, (nums[placed] & (slot+1)) + dp(mask + powers[slot])).",
    ],
    code: {
      python: `from functools import lru_cache

def maximum_and_sum(nums: list[int], num_slots: int) -> int:
    powers = [3 ** i for i in range(num_slots)]

    @lru_cache(maxsize=None)
    def dp(mask: int) -> int:
        placed = 0
        m = mask
        for _ in range(num_slots):
            placed += m % 3
            m //= 3
        if placed == len(nums):
            return 0
        v = nums[placed]
        best = 0
        for slot in range(num_slots):
            if (mask // powers[slot]) % 3 < 2:
                gain = (v & (slot + 1)) + dp(mask + powers[slot])
                best = max(best, gain)
        return best

    return dp(0)`,
      java: `import java.util.*;

class Solution {
    private int[] powers;
    private int[] nums;
    private int numSlots;
    private Map<Integer, Integer> memo = new HashMap<>();

    public int maximumANDSum(int[] nums, int numSlots) {
        this.nums = nums;
        this.numSlots = numSlots;
        powers = new int[numSlots];
        powers[0] = 1;
        for (int i = 1; i < numSlots; i++) powers[i] = powers[i - 1] * 3;
        return dp(0);
    }

    private int dp(int mask) {
        if (memo.containsKey(mask)) return memo.get(mask);
        int placed = 0, m = mask;
        for (int i = 0; i < numSlots; i++) { placed += m % 3; m /= 3; }
        if (placed == nums.length) return 0;
        int v = nums[placed], best = 0;
        for (int slot = 0; slot < numSlots; slot++) {
            if ((mask / powers[slot]) % 3 < 2) {
                int gain = (v & (slot + 1)) + dp(mask + powers[slot]);
                best = Math.max(best, gain);
            }
        }
        memo.put(mask, best);
        return best;
    }
}`,
      cpp: `#include <vector>
#include <unordered_map>
#include <algorithm>
using namespace std;

class Solution {
    vector<int> powers, nums;
    int numSlots;
    unordered_map<int,int> memo;

    int dp(int mask) {
        auto it = memo.find(mask);
        if (it != memo.end()) return it->second;
        int placed = 0, m = mask;
        for (int i = 0; i < numSlots; i++) { placed += m % 3; m /= 3; }
        if (placed == (int)nums.size()) return 0;
        int v = nums[placed], best = 0;
        for (int slot = 0; slot < numSlots; slot++) {
            if ((mask / powers[slot]) % 3 < 2) {
                int gain = (v & (slot + 1)) + dp(mask + powers[slot]);
                best = max(best, gain);
            }
        }
        return memo[mask] = best;
    }

public:
    int maximumANDSum(vector<int>& nums_, int numSlots_) {
        nums = nums_;
        numSlots = numSlots_;
        powers.assign(numSlots, 1);
        for (int i = 1; i < numSlots; i++) powers[i] = powers[i - 1] * 3;
        return dp(0);
    }
};`,
    },
    complexity: { time: "O(3^numSlots * numSlots)", space: "O(3^numSlots)" },
    pitfalls: [
      "Using a binary mask (one bit per slot) — slots hold up to two numbers, so a ternary state is required.",
      "ANDing with the slot's 0-based index instead of its 1-based number.",
      "Recomputing the placed count incorrectly, indexing the wrong number.",
    ],
    edgeCases: [
      "Fewer numbers than 2 * numSlots — some slots stay empty.",
      "All numbers equal — distribute to high-index slots.",
      "numSlots = 1 (limited capacity) with up to two numbers.",
    ],
    whyItMatters:
      "A base-3 occupancy mask generalizes bitmask DP to bounded-capacity assignment, the pattern behind two-per-bucket packing and limited-replica placement.",
    estimatedMinutes: 50,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 279 — pure_dsa · bit_manipulation · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "smallest-team-cover-skills",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "bit_manipulation",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer"],
    title: "Smallest Team Covering All Required Skills",
    framing:
      "You have a list of required skills and a pool of people, each with some subset of those skills. Assemble the smallest team whose combined skills cover every requirement.",
    statement:
      "Given an array req_skills of distinct required skills and an array people where people[i] is the list of skills person i has, return the indices of any smallest team (sufficient team) such that the union of the team's skills equals all of req_skills. Any valid minimum-size team is accepted.",
    inputFormat:
      "An array req_skills of skill names and an array people of skill-name lists.",
    outputFormat:
      "An array of person indices forming a smallest sufficient team.",
    constraints: [
      "1 <= req_skills.length <= 16",
      "1 <= people.length <= 60",
      "A sufficient team is guaranteed to exist.",
    ],
    examples: [
      {
        input: 'req_skills = ["java","nodejs","reactjs"], people = [["java"],["nodejs"],["nodejs","reactjs"]]',
        output: "[0,2]",
        explanation: "Person 0 covers java; person 2 covers nodejs+reactjs.",
      },
      {
        input: 'req_skills = ["algorithms","math","java","reactjs","csharp","aws"], people = [["algorithms","math","java"],["algorithms","math","reactjs"],["java","csharp","aws"],["reactjs","csharp"],["csharp","math"],["aws","java"]]',
        output: "[1,2]",
        explanation: "Persons 1 and 2 together cover all six skills.",
      },
    ],
    approach: [
      "Index each required skill to a bit; convert each person to a skill bitmask.",
      "dp[mask] = a smallest team (list of indices) whose union equals mask.",
      "Start from dp[0] = []; for each state and each person, the new mask is mask | personMask.",
      "If the new team is smaller than the best recorded for that new mask, store it.",
      "Answer is dp[full].",
    ],
    solutionSteps: [
      "skillBit = {skill: index}; build personMask[i].",
      "dp = array of size 2^k, dp[0] = [], others undefined.",
      "For each mask with a known team, for each person: nm = mask | personMask[i]; if dp[nm] undefined or longer than dp[mask]+1, set dp[nm] = dp[mask] + [i].",
      "Return dp[(1<<k)-1].",
    ],
    code: {
      python: `def smallest_sufficient_team(req_skills: list[str], people: list[list[str]]) -> list[int]:
    k = len(req_skills)
    skill_bit = {s: i for i, s in enumerate(req_skills)}
    person_mask = []
    for p in people:
        m = 0
        for s in p:
            if s in skill_bit:
                m |= (1 << skill_bit[s])
        person_mask.append(m)

    full = (1 << k) - 1
    dp: list[list[int] | None] = [None] * (1 << k)
    dp[0] = []
    for mask in range(1 << k):
        if dp[mask] is None:
            continue
        for i, pm in enumerate(person_mask):
            nm = mask | pm
            if nm == mask:
                continue
            if dp[nm] is None or len(dp[nm]) > len(dp[mask]) + 1:
                dp[nm] = dp[mask] + [i]
    return dp[full] or []`,
      java: `import java.util.*;

class Solution {
    public int[] smallestSufficientTeam(String[] reqSkills, List<List<String>> people) {
        int k = reqSkills.length;
        Map<String, Integer> bit = new HashMap<>();
        for (int i = 0; i < k; i++) bit.put(reqSkills[i], i);
        int full = (1 << k) - 1;

        List<Integer>[] dp = new List[1 << k];
        dp[0] = new ArrayList<>();
        for (int mask = 0; mask < (1 << k); mask++) {
            if (dp[mask] == null) continue;
            for (int i = 0; i < people.size(); i++) {
                int pm = 0;
                for (String s : people.get(i))
                    if (bit.containsKey(s)) pm |= (1 << bit.get(s));
                int nm = mask | pm;
                if (nm == mask) continue;
                if (dp[nm] == null || dp[nm].size() > dp[mask].size() + 1) {
                    List<Integer> team = new ArrayList<>(dp[mask]);
                    team.add(i);
                    dp[nm] = team;
                }
            }
        }
        List<Integer> res = dp[full];
        int[] out = new int[res.size()];
        for (int i = 0; i < out.length; i++) out[i] = res.get(i);
        return out;
    }
}`,
      cpp: `#include <vector>
#include <string>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> smallestSufficientTeam(vector<string>& reqSkills, vector<vector<string>>& people) {
        int k = reqSkills.size();
        unordered_map<string,int> bit;
        for (int i = 0; i < k; i++) bit[reqSkills[i]] = i;
        int full = (1 << k) - 1;

        vector<vector<int>> dp(1 << k);
        vector<bool> seen(1 << k, false);
        seen[0] = true;
        for (int mask = 0; mask < (1 << k); mask++) {
            if (!seen[mask]) continue;
            for (int i = 0; i < (int)people.size(); i++) {
                int pm = 0;
                for (auto& s : people[i])
                    if (bit.count(s)) pm |= (1 << bit[s]);
                int nm = mask | pm;
                if (nm == mask) continue;
                if (!seen[nm] || dp[nm].size() > dp[mask].size() + 1) {
                    dp[nm] = dp[mask];
                    dp[nm].push_back(i);
                    seen[nm] = true;
                }
            }
        }
        return dp[full];
    }
};`,
    },
    complexity: { time: "O(2^k * people)", space: "O(2^k * k)" },
    pitfalls: [
      "Storing only team sizes and being unable to reconstruct the indices.",
      "Skipping the nm == mask check, wasting work when a person adds nothing.",
      "Comparing teams by mask popcount instead of by member count.",
    ],
    edgeCases: [
      "One person already covers every skill — team of size 1.",
      "People with skills outside req_skills — ignored bits.",
      "Several distinct minimum teams — any is acceptable.",
    ],
    whyItMatters:
      "Set-cover over a skill bitmask is the textbook minimum-team formation, reused for feature coverage, sensor placement, and dependency satisfaction with the fewest components.",
    estimatedMinutes: 50,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 280 — pure_dsa · bit_manipulation · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "assign-hats-distinct-ways",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "bit_manipulation",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Ways to Assign Distinct Hats to People",
    framing:
      "Each person lists the hats they are willing to wear, drawn from 40 hat types. Count the ways to give every person a distinct hat so no two people share the same hat.",
    statement:
      "There are 40 different hat types numbered 1..40. Given hats where hats[i] is the list of hat types person i likes, return the number of ways to assign hats so that each person wears one hat they like and no two people wear the same hat. Return the count modulo 1e9+7.",
    inputFormat:
      "An array hats of length n where hats[i] is a list of liked hat numbers (1..40).",
    outputFormat: "An integer: the number of valid assignments modulo 1e9+7.",
    constraints: [
      "1 <= n <= 10",
      "1 <= hats[i].length <= 40",
      "1 <= hat number <= 40; lists contain no duplicates.",
    ],
    examples: [
      {
        input: "hats = [[3,4],[4,5],[5]]",
        output: "1",
        explanation: "Person 0→3, person 1→4, person 2→5 is the only valid assignment.",
      },
      {
        input: "hats = [[3,5,1],[3,5]]",
        output: "4",
        explanation: "Four distinct ways to give the two people different liked hats.",
      },
    ],
    approach: [
      "Iterate over hats (up to 40) rather than people, since people are few (<= 10); the people-assigned set fits in a 2^n bitmask.",
      "Invert the map: for each hat, list which people like it.",
      "dp[mask] = ways to satisfy exactly the people in mask using hats processed so far.",
      "For each hat, either skip it or assign it to one currently-unassigned person who likes it.",
      "Answer is dp[(1<<n)-1] after all hats; arithmetic modulo 1e9+7.",
    ],
    solutionSteps: [
      "Build hatToPeople[h] = list of person indices liking hat h.",
      "dp = array size 2^n, dp[0] = 1.",
      "For each hat h: new dp where for each mask, also add assignment of h to any person p (liking h) not in mask: ndp[mask | (1<<p)] += dp[mask].",
      "Return dp[full].",
    ],
    code: {
      python: `def number_ways(hats: list[list[int]]) -> int:
    MOD = 1_000_000_007
    n = len(hats)
    hat_to_people: list[list[int]] = [[] for _ in range(41)]
    for p, likes in enumerate(hats):
        for h in likes:
            hat_to_people[h].append(p)

    full = (1 << n) - 1
    dp = [0] * (1 << n)
    dp[0] = 1
    for h in range(1, 41):
        ndp = dp[:]  # option: this hat unused
        for mask in range(1 << n):
            if dp[mask] == 0:
                continue
            for p in hat_to_people[h]:
                if not (mask & (1 << p)):
                    nm = mask | (1 << p)
                    ndp[nm] = (ndp[nm] + dp[mask]) % MOD
        dp = ndp
    return dp[full]`,
      java: `import java.util.*;

class Solution {
    public int numberWays(List<List<Integer>> hats) {
        long MOD = 1_000_000_007L;
        int n = hats.size(), full = (1 << n) - 1;
        List<List<Integer>> hatToPeople = new ArrayList<>();
        for (int h = 0; h <= 40; h++) hatToPeople.add(new ArrayList<>());
        for (int p = 0; p < n; p++)
            for (int h : hats.get(p)) hatToPeople.get(h).add(p);

        long[] dp = new long[1 << n];
        dp[0] = 1;
        for (int h = 1; h <= 40; h++) {
            long[] ndp = dp.clone();
            for (int mask = 0; mask < (1 << n); mask++) {
                if (dp[mask] == 0) continue;
                for (int p : hatToPeople.get(h)) {
                    if ((mask & (1 << p)) == 0) {
                        int nm = mask | (1 << p);
                        ndp[nm] = (ndp[nm] + dp[mask]) % MOD;
                    }
                }
            }
            dp = ndp;
        }
        return (int) dp[full];
    }
}`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int numberWays(vector<vector<int>>& hats) {
        const long MOD = 1000000007L;
        int n = hats.size(), full = (1 << n) - 1;
        vector<vector<int>> hatToPeople(41);
        for (int p = 0; p < n; p++)
            for (int h : hats[p]) hatToPeople[h].push_back(p);

        vector<long> dp(1 << n, 0);
        dp[0] = 1;
        for (int h = 1; h <= 40; h++) {
            vector<long> ndp = dp;
            for (int mask = 0; mask < (1 << n); mask++) {
                if (dp[mask] == 0) continue;
                for (int p : hatToPeople[h]) {
                    if (!(mask & (1 << p))) {
                        int nm = mask | (1 << p);
                        ndp[nm] = (ndp[nm] + dp[mask]) % MOD;
                    }
                }
            }
            dp = ndp;
        }
        return (int) dp[full];
    }
};`,
    },
    complexity: { time: "O(40 * 2^n * n)", space: "O(2^n)" },
    pitfalls: [
      "Iterating over people and masking hats (up to 2^40) instead of iterating hats and masking people.",
      "Assigning the same hat to two people within one hat's transition.",
      "Dropping the modulus and overflowing.",
    ],
    edgeCases: [
      "A person whose only liked hat is taken by everyone — zero ways.",
      "Single person — count equals number of liked hats.",
      "All people like disjoint hats — product of choices.",
    ],
    whyItMatters:
      "Choosing the small side (people) for the bitmask while sweeping the large side (hats) is the key insight for counting perfect-matching-style assignments under per-resource exclusivity.",
    estimatedMinutes: 50,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 281 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "place-mailboxes-min-distance",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Place K Mailboxes to Minimize Total Walk",
    framing:
      "Houses sit along a straight road at given positions. You install exactly k mailboxes anywhere on the road; each house walks to its nearest mailbox. Minimize the summed walking distance.",
    statement:
      "Given an array houses of distinct integer positions and an integer k, place k mailboxes (at any integer position) to minimize the total distance from each house to its nearest mailbox. Return that minimum total distance.",
    inputFormat:
      "An integer array houses and an integer k (1 <= k <= houses.length).",
    outputFormat: "An integer: the minimum total walking distance.",
    constraints: [
      "1 <= houses.length <= 100",
      "1 <= houses[i] <= 10^4",
      "1 <= k <= houses.length",
    ],
    examples: [
      {
        input: "houses = [1,4,8,10,20], k = 3",
        output: "5",
        explanation: "Mailboxes at 4, 9, 20: distances 3 + 0 + 1 + 1 + 0 = 5.",
      },
      {
        input: "houses = [2,3,5,12,18], k = 2",
        output: "9",
        explanation: "Best split groups {2,3,5} and {12,18} with medians, total 9.",
      },
    ],
    approach: [
      "Sort houses. For any contiguous group, the optimal single mailbox sits at the group's median, and the cost is the sum of distances to that median.",
      "Precompute cost[i][j] = minimal distance for houses i..j served by one mailbox (sum to the median).",
      "dp[i][m] = minimal total distance covering the first i houses with m mailboxes.",
      "Transition: dp[i][m] = min over split point p of dp[p][m-1] + cost[p][i-1].",
      "Answer is dp[n][k].",
    ],
    solutionSteps: [
      "Sort houses; build cost[i][j] using the median (sum |house - median|).",
      "dp[0][0] = 0, rest infinity.",
      "For each m and each end i, minimize over previous boundary p.",
      "Return dp[n][k].",
    ],
    code: {
      python: `def min_distance(houses: list[int], k: int) -> int:
    houses.sort()
    n = len(houses)
    cost = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i, n):
            mid = houses[(i + j) // 2]
            cost[i][j] = sum(abs(houses[t] - mid) for t in range(i, j + 1))

    INF = float("inf")
    dp = [[INF] * (k + 1) for _ in range(n + 1)]
    dp[0][0] = 0
    for i in range(1, n + 1):
        for m in range(1, min(i, k) + 1):
            for p in range(m - 1, i):
                if dp[p][m - 1] < INF:
                    dp[i][m] = min(dp[i][m], dp[p][m - 1] + cost[p][i - 1])
    return dp[n][k]`,
      java: `import java.util.*;

class Solution {
    public int minDistance(int[] houses, int k) {
        Arrays.sort(houses);
        int n = houses.length;
        int[][] cost = new int[n][n];
        for (int i = 0; i < n; i++)
            for (int j = i; j < n; j++) {
                int mid = houses[(i + j) / 2], c = 0;
                for (int t = i; t <= j; t++) c += Math.abs(houses[t] - mid);
                cost[i][j] = c;
            }
        int INF = Integer.MAX_VALUE / 2;
        int[][] dp = new int[n + 1][k + 1];
        for (int[] row : dp) Arrays.fill(row, INF);
        dp[0][0] = 0;
        for (int i = 1; i <= n; i++)
            for (int m = 1; m <= Math.min(i, k); m++)
                for (int p = m - 1; p < i; p++)
                    if (dp[p][m - 1] < INF)
                        dp[i][m] = Math.min(dp[i][m], dp[p][m - 1] + cost[p][i - 1]);
        return dp[n][k];
    }
}`,
      cpp: `#include <vector>
#include <algorithm>
#include <cmath>
using namespace std;

class Solution {
public:
    int minDistance(vector<int>& houses, int k) {
        sort(houses.begin(), houses.end());
        int n = houses.size();
        vector<vector<int>> cost(n, vector<int>(n, 0));
        for (int i = 0; i < n; i++)
            for (int j = i; j < n; j++) {
                int mid = houses[(i + j) / 2], c = 0;
                for (int t = i; t <= j; t++) c += abs(houses[t] - mid);
                cost[i][j] = c;
            }
        const int INF = 1e9;
        vector<vector<int>> dp(n + 1, vector<int>(k + 1, INF));
        dp[0][0] = 0;
        for (int i = 1; i <= n; i++)
            for (int m = 1; m <= min(i, k); m++)
                for (int p = m - 1; p < i; p++)
                    if (dp[p][m - 1] < INF)
                        dp[i][m] = min(dp[i][m], dp[p][m - 1] + cost[p][i - 1]);
        return dp[n][k];
    }
};`,
    },
    complexity: { time: "O(n^3 + n^2 * k)", space: "O(n^2)" },
    pitfalls: [
      "Forgetting to sort houses before computing contiguous-group costs.",
      "Using the mean instead of the median to minimize absolute distance.",
      "Off-by-one between 1-indexed dp boundaries and 0-indexed cost ranges.",
    ],
    edgeCases: [
      "k equals the number of houses — zero distance.",
      "All houses at consecutive positions.",
      "k = 1 — single median over all houses.",
    ],
    whyItMatters:
      "Partition DP where each segment's cost is a median-minimized 1-D facility placement is the canonical k-medians-on-a-line problem, underlying clustering and depot siting.",
    estimatedMinutes: 50,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 282 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "stone-game-pick-prefix",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Split-and-Keep Stones for Maximum Score",
    framing:
      "A row of stone values is repeatedly split into a left and right part. The smaller-sum part is kept and added to your score, and you continue on that kept part. Maximize your total score.",
    statement:
      "Given an integer array stoneValue, repeatedly: divide the current row into two non-empty contiguous halves. If the two halves have different sums, the smaller sum is added to your score and you keep that smaller half; if equal, you choose which half to keep and add its sum. The game ends when only one stone remains. Return the maximum total score.",
    inputFormat: "An integer array stoneValue.",
    outputFormat: "An integer: the maximum achievable total score.",
    constraints: [
      "1 <= stoneValue.length <= 500",
      "1 <= stoneValue[i] <= 10^6",
      "A single stone yields no further score.",
    ],
    examples: [
      {
        input: "stoneValue = [6,2,3,4,5,5]",
        output: "18",
        explanation: "Optimal sequence of splits accumulates 18 over the rounds.",
      },
      {
        input: "stoneValue = [7,7,7,7,7,7,7]",
        output: "28",
        explanation: "Equal-sum splits let you keep the favorable half repeatedly.",
      },
    ],
    approach: [
      "Use prefix sums for O(1) range sums.",
      "dp[i][j] = maximum score obtainable from the subarray stones[i..j].",
      "For each split position p, left = sum(i..p), right = sum(p+1..j).",
      "If left < right: gain left, recurse left. If right < left: gain right, recurse right. If equal: take max of either side.",
      "Memoize over (i, j).",
    ],
    solutionSteps: [
      "Build prefix sums; range(i,j) = pre[j+1]-pre[i].",
      "dp(i,j): if i==j return 0.",
      "For each p in i..j-1, compute left/right sums and the corresponding recursive add.",
      "Return the maximum over all splits.",
    ],
    code: {
      python: `from functools import lru_cache

def stone_game_v(stone_value: list[int]) -> int:
    n = len(stone_value)
    pre = [0] * (n + 1)
    for i, v in enumerate(stone_value):
        pre[i + 1] = pre[i] + v

    def rng(i: int, j: int) -> int:
        return pre[j + 1] - pre[i]

    @lru_cache(maxsize=None)
    def dp(i: int, j: int) -> int:
        if i == j:
            return 0
        best = 0
        for p in range(i, j):
            left = rng(i, p)
            right = rng(p + 1, j)
            if left < right:
                best = max(best, left + dp(i, p))
            elif right < left:
                best = max(best, right + dp(p + 1, j))
            else:
                best = max(best, left + max(dp(i, p), dp(p + 1, j)))
        return best

    return dp(0, n - 1)`,
      java: `class Solution {
    private int[] pre;
    private Integer[][] memo;

    public int stoneGameV(int[] stoneValue) {
        int n = stoneValue.length;
        pre = new int[n + 1];
        for (int i = 0; i < n; i++) pre[i + 1] = pre[i] + stoneValue[i];
        memo = new Integer[n][n];
        return dp(0, n - 1);
    }

    private int rng(int i, int j) { return pre[j + 1] - pre[i]; }

    private int dp(int i, int j) {
        if (i == j) return 0;
        if (memo[i][j] != null) return memo[i][j];
        int best = 0;
        for (int p = i; p < j; p++) {
            int left = rng(i, p), right = rng(p + 1, j);
            if (left < right) best = Math.max(best, left + dp(i, p));
            else if (right < left) best = Math.max(best, right + dp(p + 1, j));
            else best = Math.max(best, left + Math.max(dp(i, p), dp(p + 1, j)));
        }
        return memo[i][j] = best;
    }
}`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
    vector<int> pre;
    vector<vector<int>> memo;

    int rng(int i, int j) { return pre[j + 1] - pre[i]; }

    int dp(int i, int j) {
        if (i == j) return 0;
        if (memo[i][j] != -1) return memo[i][j];
        int best = 0;
        for (int p = i; p < j; p++) {
            int left = rng(i, p), right = rng(p + 1, j);
            if (left < right) best = max(best, left + dp(i, p));
            else if (right < left) best = max(best, right + dp(p + 1, j));
            else best = max(best, left + max(dp(i, p), dp(p + 1, j)));
        }
        return memo[i][j] = best;
    }

public:
    int stoneGameV(vector<int>& stoneValue) {
        int n = stoneValue.size();
        pre.assign(n + 1, 0);
        for (int i = 0; i < n; i++) pre[i + 1] = pre[i] + stoneValue[i];
        memo.assign(n, vector<int>(n, -1));
        return dp(0, n - 1);
    }
};`,
    },
    complexity: { time: "O(n^3)", space: "O(n^2)" },
    pitfalls: [
      "Adding the larger half's sum — you always keep and score the smaller (or chosen-equal) half.",
      "Recursing into the discarded half.",
      "Recomputing range sums without prefix sums, blowing the time bound.",
    ],
    edgeCases: [
      "Single stone — score 0.",
      "All equal values, enabling free choice on every split.",
      "Strictly increasing values forcing left-keeps.",
    ],
    whyItMatters:
      "Interval DP over every split with prefix-sum range queries is the recurring frame for optimal partition games and merge/segmentation cost optimization.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 283 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "super-egg-drop-min-trials",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Minimum Drops to Find the Critical Floor",
    framing:
      "You have k identical eggs and a building of n floors. There is a threshold floor above which eggs break; you want to find it using the fewest worst-case drops, reusing eggs that survive.",
    statement:
      "Given k eggs and n floors, find the minimum number of drops needed in the worst case to determine the highest floor f (0 <= f <= n) from which an egg does not break. An egg that breaks cannot be reused; one that survives can. Return that minimum worst-case number of drops.",
    inputFormat: "Two integers k (eggs) and n (floors).",
    outputFormat: "An integer: the minimum number of moves in the worst case.",
    constraints: [
      "1 <= k <= 100",
      "1 <= n <= 10^4",
      "Worst-case (adversarial) outcome of each drop.",
    ],
    examples: [
      {
        input: "k = 1, n = 2",
        output: "2",
        explanation: "With one egg you must try floors bottom-up: worst case 2 drops.",
      },
      {
        input: "k = 2, n = 6",
        output: "3",
        explanation: "Two eggs over six floors need 3 drops in the worst case.",
      },
    ],
    approach: [
      "Flip the question: dp[m][e] = the maximum number of floors distinguishable with m moves and e eggs.",
      "Recurrence: dp[m][e] = dp[m-1][e-1] (egg breaks, search below) + dp[m-1][e] (egg survives, search above) + 1 (current floor).",
      "Increase m until dp[m][k] >= n, then m is the answer.",
      "This is O(k * answer) and the answer grows only logarithmically with n for k >= 2.",
    ],
    solutionSteps: [
      "Initialize dp array over eggs, all zero, moves m = 0.",
      "Each iteration m++: for e from k down to 1, dp[e] = dp[e] + dp[e-1] + 1.",
      "Stop when dp[k] >= n.",
      "Return m.",
    ],
    code: {
      python: `def super_egg_drop(k: int, n: int) -> int:
    dp = [0] * (k + 1)  # dp[e] = floors solvable with current m and e eggs
    m = 0
    while dp[k] < n:
        m += 1
        for e in range(k, 0, -1):
            dp[e] = dp[e] + dp[e - 1] + 1
    return m`,
      java: `class Solution {
    public int superEggDrop(int k, int n) {
        int[] dp = new int[k + 1];
        int m = 0;
        while (dp[k] < n) {
            m++;
            for (int e = k; e >= 1; e--)
                dp[e] = dp[e] + dp[e - 1] + 1;
        }
        return m;
    }
}`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int superEggDrop(int k, int n) {
        vector<int> dp(k + 1, 0);
        int m = 0;
        while (dp[k] < n) {
            m++;
            for (int e = k; e >= 1; e--)
                dp[e] = dp[e] + dp[e - 1] + 1;
        }
        return m;
    }
};`,
    },
    complexity: { time: "O(k * log n)", space: "O(k)" },
    pitfalls: [
      "Using the naive O(k * n^2) floor-by-floor DP that times out for large n.",
      "Iterating eggs ascending and overwriting dp[e-1] before it is used.",
      "Forgetting the +1 for testing the current floor.",
    ],
    edgeCases: [
      "k = 1 — must scan linearly, answer n.",
      "n = 1 — one drop.",
      "k very large — behaves like binary search, ceil(log2(n+1)).",
    ],
    whyItMatters:
      "Reframing 'minimize worst-case trials' as 'maximize coverage per move' is a powerful DP inversion, reused in optimal testing strategies and adversarial search bounds.",
    estimatedMinutes: 50,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 284 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "freedom-dial-min-rotation",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Fewest Steps to Spell a Word on a Ring Dial",
    framing:
      "A circular dial has letters around its rim and a fixed pointer at 12 o'clock. To spell a key word, you rotate letters under the pointer and press; minimize total rotations plus presses.",
    statement:
      "Given a string ring (letters arranged clockwise on a dial, pointer initially at index 0) and a string key, return the minimum number of steps to spell key. Each step is either a one-position clockwise/counterclockwise rotation of the ring, or a press of the button. To spell a character, the matching ring letter must be at the pointer (index 0 position relative to rotation), then pressed (1 step).",
    inputFormat:
      "Two strings ring and key consisting of lowercase letters.",
    outputFormat: "An integer: the minimum total steps (rotations + presses).",
    constraints: [
      "1 <= ring.length, key.length <= 100",
      "ring and key contain only lowercase letters.",
      "key is guaranteed spellable from ring's letters.",
    ],
    examples: [
      {
        input: 'ring = "godding", key = "gd"',
        output: "4",
        explanation: "Rotate to \\'g\\' (press), then rotate to a \\'d\\' and press; total 4 steps.",
      },
      {
        input: 'ring = "godding", key = "godding"',
        output: "13",
        explanation: "Spelling the whole ring word back costs 13 steps.",
      },
    ],
    approach: [
      "Map each letter to all of its positions on the ring.",
      "dp[i][p] = minimum steps to spell key[i:] given the pointer currently at ring position p.",
      "For key[i], try every position q where ring[q] == key[i]; rotation cost is the minimum of clockwise and counterclockwise distance between p and q, plus 1 for the press.",
      "Recurse to dp[i+1][q]; take the minimum.",
      "Answer is dp[0][0].",
    ],
    solutionSteps: [
      "Group positions by character.",
      "dp(i, p): if i == len(key) return 0.",
      "For each q in positions[key[i]]: step = min(|p-q|, ringLen - |p-q|) + 1 + dp(i+1, q).",
      "Return the minimum; memoize on (i, p).",
    ],
    code: {
      python: `from functools import lru_cache

def find_rotate_steps(ring: str, key: str) -> int:
    n = len(ring)
    pos: dict[str, list[int]] = {}
    for i, ch in enumerate(ring):
        pos.setdefault(ch, []).append(i)

    @lru_cache(maxsize=None)
    def dp(i: int, p: int) -> int:
        if i == len(key):
            return 0
        best = float("inf")
        for q in pos[key[i]]:
            diff = abs(p - q)
            rot = min(diff, n - diff)
            best = min(best, rot + 1 + dp(i + 1, q))
        return best

    return dp(0, 0)`,
      java: `import java.util.*;

class Solution {
    private String ring, key;
    private List<Integer>[] pos;
    private Integer[][] memo;

    public int findRotateSteps(String ring, String key) {
        this.ring = ring;
        this.key = key;
        int n = ring.length();
        pos = new List[26];
        for (int i = 0; i < 26; i++) pos[i] = new ArrayList<>();
        for (int i = 0; i < n; i++) pos[ring.charAt(i) - 'a'].add(i);
        memo = new Integer[key.length()][n];
        return dp(0, 0);
    }

    private int dp(int i, int p) {
        if (i == key.length()) return 0;
        if (memo[i][p] != null) return memo[i][p];
        int n = ring.length(), best = Integer.MAX_VALUE;
        for (int q : pos[key.charAt(i) - 'a']) {
            int diff = Math.abs(p - q);
            int rot = Math.min(diff, n - diff);
            best = Math.min(best, rot + 1 + dp(i + 1, q));
        }
        return memo[i][p] = best;
    }
}`,
      cpp: `#include <string>
#include <vector>
#include <algorithm>
#include <climits>
using namespace std;

class Solution {
    string ring, key;
    vector<vector<int>> pos;
    vector<vector<int>> memo;

    int dp(int i, int p) {
        if (i == (int)key.size()) return 0;
        if (memo[i][p] != -1) return memo[i][p];
        int n = ring.size(), best = INT_MAX;
        for (int q : pos[key[i] - 'a']) {
            int diff = abs(p - q);
            int rot = min(diff, n - diff);
            best = min(best, rot + 1 + dp(i + 1, q));
        }
        return memo[i][p] = best;
    }

public:
    int findRotateSteps(string ring, string key) {
        this->ring = ring;
        this->key = key;
        int n = ring.size();
        pos.assign(26, {});
        for (int i = 0; i < n; i++) pos[ring[i] - 'a'].push_back(i);
        memo.assign(key.size(), vector<int>(n, -1));
        return dp(0, 0);
    }
};`,
    },
    complexity: { time: "O(key * ring^2)", space: "O(key * ring)" },
    pitfalls: [
      "Computing only clockwise distance, missing the shorter counterclockwise rotation.",
      "Forgetting the +1 press per character.",
      "Greedily choosing the nearest matching letter, which is not globally optimal.",
    ],
    edgeCases: [
      "Repeated letters offering multiple rotation choices.",
      "Single-letter ring — only rotations of length 0.",
      "key longer than ring with repeats.",
    ],
    whyItMatters:
      "Minimizing circular rotation across a sequence of targets with positional state is the model for dial/seek-cost optimization on rotational media and cyclic menus.",
    estimatedMinutes: 50,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 285 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-insertions-make-palindrome",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Fewest Insertions to Make a String a Palindrome",
    framing:
      "You may insert characters anywhere in a string. Find the minimum insertions so the whole string reads the same forwards and backwards.",
    statement:
      "Given a string s, return the minimum number of characters you must insert (at any positions) to make s a palindrome.",
    inputFormat: "A string s of lowercase English letters.",
    outputFormat: "An integer: the minimum number of insertions.",
    constraints: [
      "1 <= s.length <= 500",
      "s consists of lowercase English letters.",
    ],
    examples: [
      {
        input: 's = "leetcode"',
        output: "5",
        explanation: "Five insertions, e.g. into \\'leetcodocteel\\', make it a palindrome.",
      },
      {
        input: 's = "mbadm"',
        output: "2",
        explanation: '"mbadm" → "mbdadbm" with two insertions.',
      },
    ],
    approach: [
      "The answer equals s.length minus the length of the longest palindromic subsequence (LPS).",
      "Equivalently, compute it directly with interval DP: dp[i][j] = min insertions to make s[i..j] a palindrome.",
      "If s[i] == s[j], dp[i][j] = dp[i+1][j-1]; otherwise 1 + min(dp[i+1][j], dp[i][j-1]).",
      "Fill by increasing substring length; answer is dp[0][n-1].",
    ],
    solutionSteps: [
      "Initialize dp[i][i] = 0.",
      "For length L from 2..n, for each i with j = i+L-1: apply the recurrence.",
      "Return dp[0][n-1].",
    ],
    code: {
      python: `def min_insertions(s: str) -> int:
    n = len(s)
    dp = [[0] * n for _ in range(n)]
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            if s[i] == s[j]:
                dp[i][j] = dp[i + 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i + 1][j], dp[i][j - 1])
    return dp[0][n - 1]`,
      java: `class Solution {
    public int minInsertions(String s) {
        int n = s.length();
        int[][] dp = new int[n][n];
        for (int length = 2; length <= n; length++) {
            for (int i = 0; i + length - 1 < n; i++) {
                int j = i + length - 1;
                if (s.charAt(i) == s.charAt(j))
                    dp[i][j] = dp[i + 1][j - 1];
                else
                    dp[i][j] = 1 + Math.min(dp[i + 1][j], dp[i][j - 1]);
            }
        }
        return dp[0][n - 1];
    }
}`,
      cpp: `#include <string>
#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int minInsertions(string s) {
        int n = s.size();
        vector<vector<int>> dp(n, vector<int>(n, 0));
        for (int length = 2; length <= n; length++) {
            for (int i = 0; i + length - 1 < n; i++) {
                int j = i + length - 1;
                if (s[i] == s[j])
                    dp[i][j] = dp[i + 1][j - 1];
                else
                    dp[i][j] = 1 + min(dp[i + 1][j], dp[i][j - 1]);
            }
        }
        return dp[0][n - 1];
    }
};`,
    },
    complexity: { time: "O(n^2)", space: "O(n^2)" },
    pitfalls: [
      "Iterating i/j in the wrong order so dp[i+1][j-1] is not yet computed.",
      "Adding 2 instead of 1 per mismatch — each insertion fixes one side.",
      "Confusing this with edit distance or palindrome partitioning.",
    ],
    edgeCases: [
      "Already a palindrome — zero insertions.",
      "All distinct characters — n-1 insertions.",
      "Single character.",
    ],
    whyItMatters:
      "Interval DP equal to length minus longest palindromic subsequence is a core string-DP identity, applied in sequence repair, diff minimization, and symmetric-encoding problems.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 286 — pure_dsa · sliding_window · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-subarrays-min-max-bounds",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "sliding_window",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Count Subarrays Whose Min and Max Hit Fixed Bounds",
    framing:
      "An anomaly window is valid only if its readings stay within [minK, maxK] and actually touch both ends. Count how many contiguous windows qualify.",
    statement:
      "Given an integer array nums and two integers minK and maxK, count the number of contiguous subarrays where the minimum equals minK and the maximum equals maxK. Such a subarray must contain at least one minK, at least one maxK, and no value outside [minK, maxK].",
    inputFormat: "An integer array nums and integers minK, maxK.",
    outputFormat: "A long integer: the count of fixed-bound subarrays.",
    constraints: [
      "1 <= nums.length <= 10^5",
      "1 <= nums[i], minK, maxK <= 10^6",
      "The count may exceed 32-bit range; use 64-bit.",
    ],
    examples: [
      {
        input: "nums = [1,3,5,2,7,5], minK = 1, maxK = 5",
        output: "2",
        explanation: "[1,3,5] and [1,3,5,2] both have min 1 and max 5 with no out-of-range value.",
      },
      {
        input: "nums = [1,1,1,1], minK = 1, maxK = 1",
        output: "10",
        explanation: "Every one of the 10 subarrays has min and max equal to 1.",
      },
    ],
    approach: [
      "Track three positions while scanning: the last index of a value outside [minK, maxK] (badIdx), the last index where value == minK (lastMin), and the last index where value == maxK (lastMax).",
      "For each right end i, valid subarrays ending at i start at any index in (badIdx, min(lastMin, lastMax)].",
      "That count is max(0, min(lastMin, lastMax) - badIdx).",
      "Sum across all i.",
    ],
    solutionSteps: [
      "Initialize badIdx = lastMin = lastMax = -1, total = 0.",
      "For each i: if nums[i] out of range, badIdx = i; if == minK, lastMin = i; if == maxK, lastMax = i.",
      "total += max(0, min(lastMin, lastMax) - badIdx).",
      "Return total.",
    ],
    code: {
      python: `def count_subarrays(nums: list[int], min_k: int, max_k: int) -> int:
    total = 0
    bad = last_min = last_max = -1
    for i, v in enumerate(nums):
        if v < min_k or v > max_k:
            bad = i
        if v == min_k:
            last_min = i
        if v == max_k:
            last_max = i
        total += max(0, min(last_min, last_max) - bad)
    return total`,
      java: `class Solution {
    public long countSubarrays(int[] nums, int minK, int maxK) {
        long total = 0;
        int bad = -1, lastMin = -1, lastMax = -1;
        for (int i = 0; i < nums.length; i++) {
            int v = nums[i];
            if (v < minK || v > maxK) bad = i;
            if (v == minK) lastMin = i;
            if (v == maxK) lastMax = i;
            total += Math.max(0, Math.min(lastMin, lastMax) - bad);
        }
        return total;
    }
}`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    long long countSubarrays(vector<int>& nums, int minK, int maxK) {
        long long total = 0;
        int bad = -1, lastMin = -1, lastMax = -1;
        for (int i = 0; i < (int)nums.size(); i++) {
            int v = nums[i];
            if (v < minK || v > maxK) bad = i;
            if (v == minK) lastMin = i;
            if (v == maxK) lastMax = i;
            total += max(0, min(lastMin, lastMax) - bad);
        }
        return total;
    }
};`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Using int accumulation and overflowing on large inputs.",
      "Not resetting the valid start when an out-of-range value appears.",
      "Handling minK == maxK as a special case rather than letting both conditions trigger.",
    ],
    edgeCases: [
      "minK == maxK — every value must equal that single bound.",
      "No element equals one of the bounds — count 0.",
      "Out-of-range values splitting the array into segments.",
    ],
    whyItMatters:
      "Counting windows by tracking the last blocking index and the last qualifying indices is a single-pass technique for 'valid range that touches both extremes', used in SLA-band and tolerance-window analytics.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 287 — ai_applied · sliding_window · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "context-window-k-distinct-tokens",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 10,
    pattern: "sliding_window",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "data_engineer"],
    title: "Count Context Spans With Exactly K Distinct Tokens",
    framing:
      "A tokenizer emits a stream of token ids. To audit diversity, count how many contiguous spans contain exactly k distinct token ids — a building block for windowed vocabulary metrics.",
    statement:
      "Given an integer array tokens and an integer k, count the number of contiguous subarrays that contain exactly k distinct values. Return that count.",
    inputFormat: "An integer array tokens and an integer k.",
    outputFormat: "An integer: the count of subarrays with exactly k distinct values.",
    constraints: [
      "1 <= tokens.length <= 2 * 10^4",
      "1 <= tokens[i] <= tokens.length",
      "1 <= k <= tokens.length",
    ],
    examples: [
      {
        input: "tokens = [1,2,1,2,3], k = 2",
        output: "7",
        explanation: "Seven subarrays contain exactly two distinct token ids.",
      },
      {
        input: "tokens = [1,2,1,3,4], k = 3",
        output: "3",
        explanation: "[1,2,1,3], [2,1,3], [1,3,4] each have exactly three distinct ids.",
      },
    ],
    approach: [
      "exactly(k) = atMost(k) - atMost(k-1).",
      "atMost(m): a standard variable sliding window counting subarrays with at most m distinct values.",
      "In atMost, expand right, add to a frequency map; while distinct count exceeds m, shrink left.",
      "Each step adds (right - left + 1) subarrays ending at right.",
    ],
    solutionSteps: [
      "Define atMost(m): two-pointer window, freq map, count distinct; accumulate window length.",
      "Return atMost(k) - atMost(k-1).",
    ],
    code: {
      python: `from collections import defaultdict

def subarrays_with_k_distinct(tokens: list[int], k: int) -> int:
    def at_most(m: int) -> int:
        freq = defaultdict(int)
        left = distinct = total = 0
        for right, t in enumerate(tokens):
            if freq[t] == 0:
                distinct += 1
            freq[t] += 1
            while distinct > m:
                freq[tokens[left]] -= 1
                if freq[tokens[left]] == 0:
                    distinct -= 1
                left += 1
            total += right - left + 1
        return total

    return at_most(k) - at_most(k - 1)`,
      java: `import java.util.*;

class Solution {
    public int subarraysWithKDistinct(int[] tokens, int k) {
        return atMost(tokens, k) - atMost(tokens, k - 1);
    }

    private int atMost(int[] tokens, int m) {
        if (m < 0) return 0;
        Map<Integer, Integer> freq = new HashMap<>();
        int left = 0, distinct = 0, total = 0;
        for (int right = 0; right < tokens.length; right++) {
            int t = tokens[right];
            if (freq.merge(t, 1, Integer::sum) == 1) distinct++;
            while (distinct > m) {
                int lt = tokens[left++];
                if (freq.merge(lt, -1, Integer::sum) == 0) distinct--;
            }
            total += right - left + 1;
        }
        return total;
    }
}`,
      cpp: `#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
    int atMost(vector<int>& tokens, int m) {
        if (m < 0) return 0;
        unordered_map<int,int> freq;
        int left = 0, distinct = 0, total = 0;
        for (int right = 0; right < (int)tokens.size(); right++) {
            if (++freq[tokens[right]] == 1) distinct++;
            while (distinct > m) {
                if (--freq[tokens[left]] == 0) distinct--;
                left++;
            }
            total += right - left + 1;
        }
        return total;
    }
public:
    int subarraysWithKDistinct(vector<int>& tokens, int k) {
        return atMost(tokens, k) - atMost(tokens, k - 1);
    }
};`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Trying to count 'exactly k' with a single window — it does not telescope cleanly; use the atMost difference.",
      "Decrementing distinct only when frequency reaches zero, not on every removal.",
      "Failing to guard atMost(-1) = 0 when k = 0 edge arises.",
    ],
    edgeCases: [
      "k = 1 — count of constant-value runs' subarrays.",
      "k larger than total distinct — count 0.",
      "All identical tokens.",
    ],
    whyItMatters:
      "The atMost(k) - atMost(k-1) trick converts an awkward 'exactly k' constraint into two monotone windows — the standard pattern for distinct-count and diversity windowing in tokenized data.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 288 — pure_dsa · greedy · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-flips-k-window-ones",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "greedy",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Minimum K-Length Flips to Clear All Zeros",
    framing:
      "A bit array must become all ones. Each operation flips a contiguous block of exactly k bits. Find the fewest flips, or report it is impossible.",
    statement:
      "Given a binary array nums and an integer k, in one move you choose a contiguous subarray of length exactly k and flip every bit (0↔1). Return the minimum number of moves to make every element 1, or -1 if it cannot be done.",
    inputFormat: "A binary array nums and an integer k.",
    outputFormat: "An integer: the minimum number of k-length flips, or -1.",
    constraints: [
      "1 <= k <= nums.length <= 10^5",
      "nums[i] is 0 or 1.",
    ],
    examples: [
      {
        input: "nums = [0,1,0], k = 1",
        output: "2",
        explanation: "Flip index 0 and index 2 individually.",
      },
      {
        input: "nums = [1,1,0], k = 2",
        output: "-1",
        explanation: "No length-2 flip can fix index 2 without breaking earlier bits.",
      },
    ],
    approach: [
      "Sweep left to right; the leftmost remaining 0 must be fixed by a flip starting exactly at it.",
      "Track the number of active flips affecting the current index using a difference array / running parity.",
      "The effective value at i is nums[i] XOR (active flips parity). If effective is 0, start a new flip at i — but only if i + k <= n.",
      "If a 0 needs flipping but a length-k window cannot start there, return -1.",
      "Decrement the active count as flips expire (their window end passes).",
    ],
    solutionSteps: [
      "diff array of size n+1; flipped = 0; moves = 0.",
      "For i in 0..n-1: flipped += diff[i] (parity of active flips).",
      "If (nums[i] + flipped) % 2 == 0: need flip; if i + k > n return -1; moves++; flipped++; diff[i+k] -= 1.",
      "Return moves.",
    ],
    code: {
      python: `def min_k_bit_flips(nums: list[int], k: int) -> int:
    n = len(nums)
    diff = [0] * (n + 1)
    flipped = 0
    moves = 0
    for i in range(n):
        flipped += diff[i]
        if (nums[i] + flipped) % 2 == 0:
            if i + k > n:
                return -1
            moves += 1
            flipped += 1
            diff[i + k] -= 1
    return moves`,
      java: `class Solution {
    public int minKBitFlips(int[] nums, int k) {
        int n = nums.length;
        int[] diff = new int[n + 1];
        int flipped = 0, moves = 0;
        for (int i = 0; i < n; i++) {
            flipped += diff[i];
            if ((nums[i] + flipped) % 2 == 0) {
                if (i + k > n) return -1;
                moves++;
                flipped++;
                diff[i + k] -= 1;
            }
        }
        return moves;
    }
}`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int minKBitFlips(vector<int>& nums, int k) {
        int n = nums.size();
        vector<int> diff(n + 1, 0);
        int flipped = 0, moves = 0;
        for (int i = 0; i < n; i++) {
            flipped += diff[i];
            if ((nums[i] + flipped) % 2 == 0) {
                if (i + k > n) return -1;
                moves++;
                flipped++;
                diff[i + k] -= 1;
            }
        }
        return moves;
    }
};`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Re-flipping ranges naively (O(n*k)) instead of tracking flip parity with a difference array.",
      "Forgetting to expire a flip's effect at index i+k.",
      "Allowing a flip to start when fewer than k elements remain.",
    ],
    edgeCases: [
      "k = 1 — answer is the number of zeros.",
      "k = n — at most one flip; valid only if all bits are equal.",
      "Already all ones — zero moves.",
    ],
    whyItMatters:
      "Greedy leftmost-fix with a difference-array parity sweep is the canonical O(n) approach to range-flip and range-toggle problems where naive reflipping is too slow.",
    estimatedMinutes: 45,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 289 — pure_dsa · sliding_window · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "shortest-window-sum-at-least-k",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "sliding_window",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer"],
    title: "Shortest Subarray With Sum at Least K",
    framing:
      "Throughput readings may be negative (corrections) or positive. Find the shortest contiguous window whose total reaches a target k — a tight burst detector that tolerates dips.",
    statement:
      "Given an integer array nums (which may contain negative values) and an integer k, return the length of the shortest non-empty contiguous subarray with a sum of at least k. If no such subarray exists, return -1.",
    inputFormat: "An integer array nums and an integer k.",
    outputFormat: "An integer: the shortest qualifying length, or -1.",
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^5 <= nums[i] <= 10^5",
      "1 <= k <= 10^9",
    ],
    examples: [
      {
        input: "nums = [2,-1,2], k = 3",
        output: "3",
        explanation: "The whole array sums to 3; no shorter window reaches 3.",
      },
      {
        input: "nums = [1,2], k = 4",
        output: "-1",
        explanation: "The maximum sum is 3, below 4.",
      },
    ],
    approach: [
      "Build prefix sums pre[0..n]; a window (i, j] has sum pre[j] - pre[i].",
      "We seek the smallest j - i with pre[j] - pre[i] >= k.",
      "Maintain a monotonic increasing deque of prefix indices.",
      "For each j: while pre[j] - pre[deque.front] >= k, record j - front and pop front (it can never give a shorter valid window later).",
      "While pre[deque.back] >= pre[j], pop back (smaller prefixes are strictly better start points). Push j.",
    ],
    solutionSteps: [
      "Compute prefix sums of length n+1.",
      "Deque of indices into pre, increasing pre values.",
      "For j in 0..n: pop front while pre[j]-pre[front] >= k, updating the answer; pop back while pre[back] >= pre[j]; push j.",
      "Return the best length or -1.",
    ],
    code: {
      python: `from collections import deque

def shortest_subarray(nums: list[int], k: int) -> int:
    n = len(nums)
    pre = [0] * (n + 1)
    for i, v in enumerate(nums):
        pre[i + 1] = pre[i] + v

    dq = deque()
    best = n + 1
    for j in range(n + 1):
        while dq and pre[j] - pre[dq[0]] >= k:
            best = min(best, j - dq.popleft())
        while dq and pre[dq[-1]] >= pre[j]:
            dq.pop()
        dq.append(j)
    return best if best <= n else -1`,
      java: `import java.util.*;

class Solution {
    public int shortestSubarray(int[] nums, int k) {
        int n = nums.length;
        long[] pre = new long[n + 1];
        for (int i = 0; i < n; i++) pre[i + 1] = pre[i] + nums[i];
        Deque<Integer> dq = new ArrayDeque<>();
        int best = n + 1;
        for (int j = 0; j <= n; j++) {
            while (!dq.isEmpty() && pre[j] - pre[dq.peekFirst()] >= k)
                best = Math.min(best, j - dq.pollFirst());
            while (!dq.isEmpty() && pre[dq.peekLast()] >= pre[j])
                dq.pollLast();
            dq.addLast(j);
        }
        return best <= n ? best : -1;
    }
}`,
      cpp: `#include <vector>
#include <deque>
#include <algorithm>
using namespace std;

class Solution {
public:
    int shortestSubarray(vector<int>& nums, int k) {
        int n = nums.size();
        vector<long long> pre(n + 1, 0);
        for (int i = 0; i < n; i++) pre[i + 1] = pre[i] + nums[i];
        deque<int> dq;
        int best = n + 1;
        for (int j = 0; j <= n; j++) {
            while (!dq.empty() && pre[j] - pre[dq.front()] >= k)
                best = min(best, j - dq.front()), dq.pop_front();
            while (!dq.empty() && pre[dq.back()] >= pre[j])
                dq.pop_back();
            dq.push_back(j);
        }
        return best <= n ? best : -1;
    }
};`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Using a plain two-pointer window — it fails with negative numbers because the sum is not monotonic.",
      "Popping the front conditionally without recording the length before popping.",
      "Overflowing prefix sums with 32-bit types.",
    ],
    edgeCases: [
      "Single element >= k — length 1.",
      "All negatives — return -1.",
      "Negative values between two large positives.",
    ],
    whyItMatters:
      "A monotonic-deque over prefix sums is the definitive way to handle shortest-window-sum with negatives, generalizing burst detection where naive windows break.",
    estimatedMinutes: 50,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 290 — pure_dsa · greedy · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "jump-game-min-hops",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "greedy",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Minimum Jumps to Reach the Last Index",
    framing:
      "Standing on the first cell of a row, each cell tells the maximum forward jump allowed from it. Reach the last cell in the fewest jumps.",
    statement:
      "Given an integer array nums where nums[i] is the maximum jump length from index i, return the minimum number of jumps to reach the last index starting from index 0. The test data guarantees the last index is reachable.",
    inputFormat: "An integer array nums of non-negative jump lengths.",
    outputFormat: "An integer: the minimum number of jumps.",
    constraints: [
      "1 <= nums.length <= 10^4",
      "0 <= nums[i] <= 1000",
      "The last index is always reachable.",
    ],
    examples: [
      {
        input: "nums = [2,3,1,1,4]",
        output: "2",
        explanation: "Jump 1 step to index 1, then 3 steps to the last index.",
      },
      {
        input: "nums = [2,3,0,1,4]",
        output: "2",
        explanation: "Index 0 → 1 → 4 in two jumps.",
      },
    ],
    approach: [
      "Greedy BFS-by-levels: treat each jump as expanding a frontier of reachable indices.",
      "Track curEnd (farthest reachable with the current jump count) and farthest (the best reach seen while scanning up to curEnd).",
      "When the scan index reaches curEnd, a new jump is required: increment jumps and set curEnd = farthest.",
      "Stop once curEnd covers the last index.",
    ],
    solutionSteps: [
      "jumps = 0, curEnd = 0, farthest = 0.",
      "For i from 0 to n-2: farthest = max(farthest, i + nums[i]).",
      "If i == curEnd: jumps++; curEnd = farthest.",
      "Return jumps.",
    ],
    code: {
      python: `def jump(nums: list[int]) -> int:
    jumps = 0
    cur_end = farthest = 0
    n = len(nums)
    for i in range(n - 1):
        farthest = max(farthest, i + nums[i])
        if i == cur_end:
            jumps += 1
            cur_end = farthest
    return jumps`,
      java: `class Solution {
    public int jump(int[] nums) {
        int jumps = 0, curEnd = 0, farthest = 0, n = nums.length;
        for (int i = 0; i < n - 1; i++) {
            farthest = Math.max(farthest, i + nums[i]);
            if (i == curEnd) {
                jumps++;
                curEnd = farthest;
            }
        }
        return jumps;
    }
}`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int jump(vector<int>& nums) {
        int jumps = 0, curEnd = 0, farthest = 0, n = nums.size();
        for (int i = 0; i < n - 1; i++) {
            farthest = max(farthest, i + nums[i]);
            if (i == curEnd) {
                jumps++;
                curEnd = farthest;
            }
        }
        return jumps;
    }
};`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Looping to n-1 inclusive and counting an extra jump when already at the end.",
      "Updating jumps on every index instead of only at the frontier boundary.",
      "Confusing this with reachability (Jump Game I) which only asks if the end is reachable.",
    ],
    edgeCases: [
      "Single element — zero jumps.",
      "Large first jump covering the whole array — one jump.",
      "Arrays with zeros that are stepped over by earlier reach.",
    ],
    whyItMatters:
      "Level-by-level greedy expansion of a reachable frontier is the optimal O(n) minimum-jumps method, mirroring unweighted BFS shortest paths on an implicit graph.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 291 — pure_dsa · sliding_window · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "find-all-anagram-starts",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "sliding_window",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Find All Anagram Start Indices",
    framing:
      "Scanning a long text for every place a short pattern appears in any letter order — the building block of fuzzy substring search.",
    statement:
      "Given two strings s and p, return all start indices of substrings in s that are anagrams of p. The output order does not matter.",
    inputFormat: "Two lowercase strings s and p.",
    outputFormat: "A list of start indices where an anagram of p begins.",
    constraints: [
      "1 <= s.length, p.length <= 3 * 10^4",
      "s and p contain only lowercase English letters.",
    ],
    examples: [
      {
        input: 's = "cbaebabacd", p = "abc"',
        output: "[0,6]",
        explanation: '"cba" at index 0 and "bac" at index 6 are anagrams of "abc".',
      },
      {
        input: 's = "abab", p = "ab"',
        output: "[0,1,2]",
        explanation: 'Every length-2 window is an anagram of "ab".',
      },
    ],
    approach: [
      "Maintain a fixed-width window of length len(p) over s with a 26-letter frequency count.",
      "Compare the window count to p's count; on a match, record the window's start index.",
      "Slide by adding the incoming character and removing the outgoing one, an O(1) update.",
      "Track how many letters currently have matching counts to make the comparison O(1) instead of O(26).",
    ],
    solutionSteps: [
      "Build need[] from p. If len(p) > len(s) return [].",
      "Add the first window; compare counts.",
      "Slide: increment right char, decrement left char, check equality of the two count arrays.",
      "Append matching start indices.",
    ],
    code: {
      python: `def find_anagrams(s: str, p: str) -> list[int]:
    if len(p) > len(s):
        return []
    need = [0] * 26
    window = [0] * 26
    for ch in p:
        need[ord(ch) - 97] += 1
    res = []
    m = len(p)
    for i, ch in enumerate(s):
        window[ord(ch) - 97] += 1
        if i >= m:
            window[ord(s[i - m]) - 97] -= 1
        if i >= m - 1 and window == need:
            res.append(i - m + 1)
    return res`,
      java: `import java.util.*;

class Solution {
    public List<Integer> findAnagrams(String s, String p) {
        List<Integer> res = new ArrayList<>();
        int m = p.length(), n = s.length();
        if (m > n) return res;
        int[] need = new int[26], window = new int[26];
        for (char c : p.toCharArray()) need[c - 'a']++;
        for (int i = 0; i < n; i++) {
            window[s.charAt(i) - 'a']++;
            if (i >= m) window[s.charAt(i - m) - 'a']--;
            if (i >= m - 1 && Arrays.equals(window, need)) res.add(i - m + 1);
        }
        return res;
    }
}`,
      cpp: `#include <string>
#include <vector>
using namespace std;

class Solution {
public:
    vector<int> findAnagrams(string s, string p) {
        vector<int> res;
        int m = p.size(), n = s.size();
        if (m > n) return res;
        vector<int> need(26, 0), window(26, 0);
        for (char c : p) need[c - 'a']++;
        for (int i = 0; i < n; i++) {
            window[s[i] - 'a']++;
            if (i >= m) window[s[i - m] - 'a']--;
            if (i >= m - 1 && window == need) res.push_back(i - m + 1);
        }
        return res;
    }
};`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Re-sorting each window (O(n * m log m)) instead of maintaining incremental counts.",
      "Off-by-one when removing the outgoing character before the window is full.",
      "Recording an index before the window reaches length m.",
    ],
    edgeCases: [
      "p longer than s — empty result.",
      "Entire s is one repeated letter.",
      "p and s identical length.",
    ],
    whyItMatters:
      "Fixed-width frequency windows are the standard anagram and permutation-substring search, foundational for plagiarism scanning and pattern matching over streams.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 292 — pure_dsa · graphs · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "shortest-bridge-between-clusters",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "graphs",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Shortest Bridge Between Two Islands",
    framing:
      "A grid map has exactly two land masses separated by water. Build the shortest causeway — the fewest water cells to flip — connecting them.",
    statement:
      "Given an n x n binary grid with exactly two islands (4-directionally connected groups of 1s), return the smallest number of 0s that must be flipped to 1 to connect the two islands into one.",
    inputFormat: "An n x n binary grid containing exactly two islands.",
    outputFormat: "An integer: the minimum number of water cells to flip.",
    constraints: [
      "2 <= n <= 100",
      "grid[i][j] is 0 or 1.",
      "Exactly two islands are present.",
    ],
    examples: [
      {
        input: "grid = [[0,1],[1,0]]",
        output: "1",
        explanation: "Flipping one water cell connects the two diagonal land cells.",
      },
      {
        input: "grid = [[0,1,0],[0,0,0],[0,0,1]]",
        output: "2",
        explanation: "Two water flips bridge the corner islands.",
      },
    ],
    approach: [
      "DFS/flood-fill the first island found, marking its cells and pushing them all into a BFS queue as level 0.",
      "Multi-source BFS outward from the entire first island through water cells.",
      "The first time BFS reaches a cell belonging to the second island, the number of expansion steps minus one is the bridge length.",
      "Marking visited cells prevents revisiting.",
    ],
    solutionSteps: [
      "Scan for the first 1; DFS to collect/mark island A's cells into the queue.",
      "BFS level by level over 4 directions, flipping/visiting water cells.",
      "When a neighbor is an unvisited 1 (island B), return the current distance.",
    ],
    code: {
      python: `from collections import deque

def shortest_bridge(grid: list[list[int]]) -> int:
    n = len(grid)
    q = deque()
    dirs = [(-1, 0), (1, 0), (0, -1), (0, 1)]

    def dfs(r: int, c: int) -> None:
        grid[r][c] = 2
        q.append((r, c))
        for dr, dc in dirs:
            nr, nc = r + dr, c + dc
            if 0 <= nr < n and 0 <= nc < n and grid[nr][nc] == 1:
                dfs(nr, nc)

    found = False
    for r in range(n):
        if found:
            break
        for c in range(n):
            if grid[r][c] == 1:
                dfs(r, c)
                found = True
                break

    steps = 0
    while q:
        for _ in range(len(q)):
            r, c = q.popleft()
            for dr, dc in dirs:
                nr, nc = r + dr, c + dc
                if 0 <= nr < n and 0 <= nc < n:
                    if grid[nr][nc] == 1:
                        return steps
                    if grid[nr][nc] == 0:
                        grid[nr][nc] = 2
                        q.append((nr, nc))
        steps += 1
    return -1`,
      java: `import java.util.*;

class Solution {
    private int n;
    private final int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};

    public int shortestBridge(int[][] grid) {
        n = grid.length;
        Deque<int[]> q = new ArrayDeque<>();
        boolean found = false;
        for (int r = 0; r < n && !found; r++)
            for (int c = 0; c < n && !found; c++)
                if (grid[r][c] == 1) { dfs(grid, r, c, q); found = true; }

        int steps = 0;
        while (!q.isEmpty()) {
            int sz = q.size();
            for (int i = 0; i < sz; i++) {
                int[] cell = q.poll();
                for (int[] d : dirs) {
                    int nr = cell[0] + d[0], nc = cell[1] + d[1];
                    if (nr < 0 || nc < 0 || nr >= n || nc >= n) continue;
                    if (grid[nr][nc] == 1) return steps;
                    if (grid[nr][nc] == 0) { grid[nr][nc] = 2; q.add(new int[]{nr, nc}); }
                }
            }
            steps++;
        }
        return -1;
    }

    private void dfs(int[][] grid, int r, int c, Deque<int[]> q) {
        grid[r][c] = 2;
        q.add(new int[]{r, c});
        for (int[] d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nc >= 0 && nr < n && nc < n && grid[nr][nc] == 1)
                dfs(grid, nr, nc, q);
        }
    }
}`,
      cpp: `#include <vector>
#include <queue>
using namespace std;

class Solution {
    int n;
    int dirs[4][2] = {{-1,0},{1,0},{0,-1},{0,1}};
    queue<pair<int,int>>* qp;
    vector<vector<int>>* gp;

    void dfs(int r, int c) {
        auto& grid = *gp;
        grid[r][c] = 2;
        qp->push({r, c});
        for (auto& d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nc >= 0 && nr < n && nc < n && grid[nr][nc] == 1)
                dfs(nr, nc);
        }
    }

public:
    int shortestBridge(vector<vector<int>>& grid) {
        n = grid.size();
        queue<pair<int,int>> q;
        qp = &q; gp = &grid;
        bool found = false;
        for (int r = 0; r < n && !found; r++)
            for (int c = 0; c < n && !found; c++)
                if (grid[r][c] == 1) { dfs(r, c); found = true; }

        int steps = 0;
        while (!q.empty()) {
            int sz = q.size();
            for (int i = 0; i < sz; i++) {
                auto [r, c] = q.front(); q.pop();
                for (auto& d : dirs) {
                    int nr = r + d[0], nc = c + d[1];
                    if (nr < 0 || nc < 0 || nr >= n || nc >= n) continue;
                    if (grid[nr][nc] == 1) return steps;
                    if (grid[nr][nc] == 0) { grid[nr][nc] = 2; q.push({nr, nc}); }
                }
            }
            steps++;
        }
        return -1;
    }
};`,
    },
    complexity: { time: "O(n^2)", space: "O(n^2)" },
    pitfalls: [
      "Starting BFS from a single cell rather than seeding the whole first island as level 0.",
      "Returning steps + 1 — the bridge length equals the number of water cells crossed, which is the current step count.",
      "Forgetting to mark water cells visited, causing requeueing.",
    ],
    edgeCases: [
      "Islands a single flip apart.",
      "Diagonally adjacent land needing one bridge cell.",
      "Large gap across the grid.",
    ],
    whyItMatters:
      "Flood-fill to identify a component then multi-source BFS to the nearest other component is the standard 'shortest connection between regions' technique in maps, segmentation, and clustering.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 293 — pure_dsa · dp_1d · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "knight-dialer-sequences",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "dp_1d",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Count Knight-Jump Phone Numbers",
    framing:
      "A chess knight hops across a phone keypad, dialing a digit at each landing. Count how many distinct n-digit numbers it can dial.",
    statement:
      "A knight on a standard phone keypad (digits 0-9 in the usual 3x4 layout with * and # corners unusable) starts on any numeric cell and makes n-1 valid knight moves, dialing the digit it lands on each time. Return the number of distinct n-digit sequences modulo 1e9+7.",
    inputFormat: "An integer n (the number of digits dialed).",
    outputFormat: "An integer: the count of distinct dialable numbers modulo 1e9+7.",
    constraints: [
      "1 <= n <= 5000",
      "Answer is taken modulo 1_000_000_007.",
    ],
    examples: [
      {
        input: "n = 1",
        output: "10",
        explanation: "Any of the ten digits is a valid 1-digit number.",
      },
      {
        input: "n = 2",
        output: "20",
        explanation: "Twenty valid two-digit sequences via single knight moves.",
      },
    ],
    approach: [
      "Precompute the knight-move adjacency for each keypad digit.",
      "dp[d] = number of sequences of the current length ending on digit d.",
      "Initialize dp[d] = 1 for all digits (length 1).",
      "For each additional digit, ndp[d] = sum of dp[prev] over all prev that can jump to d, taken modulo 1e9+7.",
      "Answer is the sum of dp after n-1 transitions.",
    ],
    solutionSteps: [
      "moves = adjacency list per digit.",
      "dp = [1]*10.",
      "Repeat n-1 times: ndp[d] = sum(dp[p] for p in moves[d]) % MOD; dp = ndp.",
      "Return sum(dp) % MOD.",
    ],
    code: {
      python: `def knight_dialer(n: int) -> int:
    MOD = 1_000_000_007
    moves = {
        0: [4, 6], 1: [6, 8], 2: [7, 9], 3: [4, 8], 4: [0, 3, 9],
        5: [], 6: [0, 1, 7], 7: [2, 6], 8: [1, 3], 9: [2, 4],
    }
    dp = [1] * 10
    for _ in range(n - 1):
        ndp = [0] * 10
        for d in range(10):
            for p in moves[d]:
                ndp[d] = (ndp[d] + dp[p]) % MOD
        dp = ndp
    return sum(dp) % MOD`,
      java: `class Solution {
    public int knightDialer(int n) {
        long MOD = 1_000_000_007L;
        int[][] moves = {
            {4,6},{6,8},{7,9},{4,8},{0,3,9},
            {},{0,1,7},{2,6},{1,3},{2,4}
        };
        long[] dp = new long[10];
        java.util.Arrays.fill(dp, 1);
        for (int step = 0; step < n - 1; step++) {
            long[] ndp = new long[10];
            for (int d = 0; d < 10; d++)
                for (int p : moves[d])
                    ndp[d] = (ndp[d] + dp[p]) % MOD;
            dp = ndp;
        }
        long sum = 0;
        for (long v : dp) sum = (sum + v) % MOD;
        return (int) sum;
    }
}`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int knightDialer(int n) {
        const long MOD = 1000000007L;
        vector<vector<int>> moves = {
            {4,6},{6,8},{7,9},{4,8},{0,3,9},
            {},{0,1,7},{2,6},{1,3},{2,4}
        };
        vector<long> dp(10, 1);
        for (int step = 0; step < n - 1; step++) {
            vector<long> ndp(10, 0);
            for (int d = 0; d < 10; d++)
                for (int p : moves[d])
                    ndp[d] = (ndp[d] + dp[p]) % MOD;
            dp = ndp;
        }
        long sum = 0;
        for (long v : dp) sum = (sum + v) % MOD;
        return (int) sum;
    }
};`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Getting the knight adjacency wrong, especially that 5 has no outgoing moves.",
      "Forgetting the modulus and overflowing for large n.",
      "Returning dp for a single digit instead of the summed total.",
    ],
    edgeCases: [
      "n = 1 — all 10 digits.",
      "Starting on 5 then needing more digits — contributes only at length 1.",
      "Large n where matrix exponentiation could further speed it up.",
    ],
    whyItMatters:
      "Counting walks of fixed length on a small graph via repeated transition application is the essence of path-counting DP, extendable to matrix exponentiation for huge lengths.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 294 — pure_dsa · dp_2d · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "count-square-submatrices",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "dp_2d",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Count All All-Ones Square Submatrices",
    framing:
      "In a binary occupancy grid, count every solid square block of any size — a tally used to score dense regions.",
    statement:
      "Given an m x n binary matrix, return the total number of square submatrices that are entirely filled with 1s, counting squares of every size.",
    inputFormat: "An m x n binary matrix.",
    outputFormat: "An integer: the total count of all-ones square submatrices.",
    constraints: [
      "1 <= m, n <= 300",
      "matrix[i][j] is 0 or 1.",
    ],
    examples: [
      {
        input: "matrix = [[0,1,1,1],[1,1,1,1],[0,1,1,1]]",
        output: "15",
        explanation: "10 unit squares + 4 of size 2 + 1 of size 3 (counting overlapping) = 15.",
      },
      {
        input: "matrix = [[1,0,1],[1,1,0],[1,1,0]]",
        output: "7",
        explanation: "Six 1x1 squares plus one 2x2 square.",
      },
    ],
    approach: [
      "dp[i][j] = the side length of the largest all-ones square whose bottom-right corner is (i, j).",
      "If matrix[i][j] == 1, dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]); else 0.",
      "Crucially, dp[i][j] also equals the number of all-ones squares ending exactly at (i, j) (one of each size 1..dp[i][j]).",
      "Summing all dp[i][j] yields the total count.",
    ],
    solutionSteps: [
      "Iterate cells; for the first row/column dp equals the cell value.",
      "Otherwise apply the min-of-three recurrence when the cell is 1.",
      "Accumulate every dp[i][j] into the answer.",
    ],
    code: {
      python: `def count_squares(matrix: list[list[int]]) -> int:
    m, n = len(matrix), len(matrix[0])
    dp = [[0] * n for _ in range(m)]
    total = 0
    for i in range(m):
        for j in range(n):
            if matrix[i][j] == 1:
                if i == 0 or j == 0:
                    dp[i][j] = 1
                else:
                    dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
                total += dp[i][j]
    return total`,
      java: `class Solution {
    public int countSquares(int[][] matrix) {
        int m = matrix.length, n = matrix[0].length, total = 0;
        int[][] dp = new int[m][n];
        for (int i = 0; i < m; i++)
            for (int j = 0; j < n; j++)
                if (matrix[i][j] == 1) {
                    dp[i][j] = (i == 0 || j == 0) ? 1
                        : 1 + Math.min(dp[i-1][j], Math.min(dp[i][j-1], dp[i-1][j-1]));
                    total += dp[i][j];
                }
        return total;
    }
}`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int countSquares(vector<vector<int>>& matrix) {
        int m = matrix.size(), n = matrix[0].size(), total = 0;
        vector<vector<int>> dp(m, vector<int>(n, 0));
        for (int i = 0; i < m; i++)
            for (int j = 0; j < n; j++)
                if (matrix[i][j] == 1) {
                    dp[i][j] = (i == 0 || j == 0) ? 1
                        : 1 + min({dp[i-1][j], dp[i][j-1], dp[i-1][j-1]});
                    total += dp[i][j];
                }
        return total;
    }
};`,
    },
    complexity: { time: "O(m * n)", space: "O(m * n)" },
    pitfalls: [
      "Counting only the largest square per corner instead of summing the side length (which counts all sizes).",
      "Mishandling the first row and column boundaries.",
      "Taking the min of only two neighbors, overcounting squares.",
    ],
    edgeCases: [
      "All zeros — count 0.",
      "All ones — sum of squares of nested sizes.",
      "Single row or column — count of 1s.",
    ],
    whyItMatters:
      "The maximal-square DP doubles as a square-counting DP because the corner side length equals the number of squares ending there — a neat identity used in dense-region scoring and image analysis.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 295 — pure_dsa · stack_queue · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "remove-duplicate-letters-smallest",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "stack_queue",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Smallest Subsequence With Each Letter Once",
    framing:
      "Compress a string so every distinct letter appears exactly once, choosing the lexicographically smallest possible result while preserving feasibility.",
    statement:
      "Given a string s, remove duplicate letters so that every letter appears exactly once and the result is the smallest in lexicographical order among all such unique-letter subsequences. Return that string.",
    inputFormat: "A string s of lowercase English letters.",
    outputFormat: "The lexicographically smallest unique-letter subsequence.",
    constraints: [
      "1 <= s.length <= 10^4",
      "s consists of lowercase English letters.",
    ],
    examples: [
      {
        input: 's = "bcabc"',
        output: '"abc"',
        explanation: "Each letter once, smallest order.",
      },
      {
        input: 's = "cbacdcbc"',
        output: '"acdb"',
        explanation: "Greedy monotonic stack yields the smallest valid arrangement.",
      },
    ],
    approach: [
      "Record the last occurrence index of each letter.",
      "Maintain a monotonic stack and an in-stack set.",
      "For each character not already in the stack, pop larger characters that still appear later (their last index > current index).",
      "Push the current character and mark it present.",
      "The stack, read bottom-to-top, is the answer.",
    ],
    solutionSteps: [
      "last[c] = final index of each letter.",
      "For i, c: skip if c in stack.",
      "While stack top > c and last[top] > i: pop and unmark.",
      "Push c, mark present; join the stack.",
    ],
    code: {
      python: `def remove_duplicate_letters(s: str) -> str:
    last = {c: i for i, c in enumerate(s)}
    stack: list[str] = []
    seen: set[str] = set()
    for i, c in enumerate(s):
        if c in seen:
            continue
        while stack and stack[-1] > c and last[stack[-1]] > i:
            seen.discard(stack.pop())
        stack.append(c)
        seen.add(c)
    return "".join(stack)`,
      java: `import java.util.*;

class Solution {
    public String removeDuplicateLetters(String s) {
        int[] last = new int[26];
        for (int i = 0; i < s.length(); i++) last[s.charAt(i) - 'a'] = i;
        boolean[] seen = new boolean[26];
        Deque<Character> stack = new ArrayDeque<>();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (seen[c - 'a']) continue;
            while (!stack.isEmpty() && stack.peekLast() > c
                   && last[stack.peekLast() - 'a'] > i) {
                seen[stack.pollLast() - 'a'] = false;
            }
            stack.addLast(c);
            seen[c - 'a'] = true;
        }
        StringBuilder sb = new StringBuilder();
        for (char c : stack) sb.append(c);
        return sb.toString();
    }
}`,
      cpp: `#include <string>
#include <vector>
using namespace std;

class Solution {
public:
    string removeDuplicateLetters(string s) {
        vector<int> last(26, 0);
        for (int i = 0; i < (int)s.size(); i++) last[s[i] - 'a'] = i;
        vector<bool> seen(26, false);
        string stack;
        for (int i = 0; i < (int)s.size(); i++) {
            char c = s[i];
            if (seen[c - 'a']) continue;
            while (!stack.empty() && stack.back() > c
                   && last[stack.back() - 'a'] > i) {
                seen[stack.back() - 'a'] = false;
                stack.pop_back();
            }
            stack.push_back(c);
            seen[c - 'a'] = true;
        }
        return stack;
    }
};`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Popping a letter that does not appear again later, making the result infeasible.",
      "Pushing a duplicate already present in the stack.",
      "Comparing characters incorrectly when deciding to pop.",
    ],
    edgeCases: [
      "Already all-distinct string — returned unchanged.",
      "All identical letters — single character.",
      "Decreasing then increasing letter runs.",
    ],
    whyItMatters:
      "A greedy monotonic stack guarded by last-occurrence feasibility is the canonical 'smallest subsequence under a constraint' pattern, reused in number-stripping and lexicographic optimization.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 296 — indian_domain · sliding_window · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "kirana-grumpy-owner-footfall",
    version: 1,
    status: "pending_review",
    bucket: "indian_domain",
    batchNo: 10,
    pattern: "sliding_window",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer"],
    title: "Kirana Owner's Calm Window for Maximum Happy Footfall",
    framing:
      "A busy Bengaluru kirana store owner turns grumpy during some minutes, losing those customers' goodwill. A one-time 'calm technique' keeps them composed for a fixed stretch of minutes. Choose the stretch that maximizes satisfied customers.",
    statement:
      "Given per-minute customer counts customers[i] and a binary array grumpy[i] (1 if the owner is grumpy that minute), customers are satisfied during a minute unless the owner is grumpy. A calm technique can suppress grumpiness for one contiguous block of exactly minutes consecutive minutes. Return the maximum number of satisfied customers achievable.",
    inputFormat:
      "Arrays customers and grumpy of equal length n, and an integer minutes.",
    outputFormat: "An integer: the maximum number of satisfied customers.",
    constraints: [
      "1 <= n <= 2 * 10^4",
      "0 <= customers[i] <= 1000",
      "grumpy[i] is 0 or 1; 1 <= minutes <= n",
    ],
    examples: [
      {
        input: "customers = [1,0,1,2,1,1,7,5], grumpy = [0,1,0,1,0,1,0,1], minutes = 3",
        output: "16",
        explanation: "Base satisfied = 1+1+1+7 = 10; the best 3-minute calm window recovers the last 6 grumpy customers for 16.",
      },
      {
        input: "customers = [1], grumpy = [0], minutes = 1",
        output: "1",
        explanation: "Already satisfied; the technique adds nothing.",
      },
    ],
    approach: [
      "Sum the always-satisfied customers (minutes where grumpy is 0).",
      "Slide a fixed window of width minutes over the grumpy minutes, summing the customers that would be recovered (grumpy == 1) within the window.",
      "Track the maximum recoverable amount across all window positions.",
      "Answer = base satisfied + best recoverable.",
    ],
    solutionSteps: [
      "base = sum(customers[i] where grumpy[i] == 0).",
      "Slide window of size minutes accumulating grumpy customers; maintain a running window sum.",
      "Track maxRecover = max window sum.",
      "Return base + maxRecover.",
    ],
    code: {
      python: `def max_satisfied(customers: list[int], grumpy: list[int], minutes: int) -> int:
    base = sum(c for c, g in zip(customers, grumpy) if g == 0)
    window = best = 0
    for i, c in enumerate(customers):
        if grumpy[i] == 1:
            window += c
        if i >= minutes:
            if grumpy[i - minutes] == 1:
                window -= customers[i - minutes]
        best = max(best, window)
    return base + best`,
      java: `class Solution {
    public int maxSatisfied(int[] customers, int[] grumpy, int minutes) {
        int base = 0;
        for (int i = 0; i < customers.length; i++)
            if (grumpy[i] == 0) base += customers[i];
        int window = 0, best = 0;
        for (int i = 0; i < customers.length; i++) {
            if (grumpy[i] == 1) window += customers[i];
            if (i >= minutes && grumpy[i - minutes] == 1)
                window -= customers[i - minutes];
            best = Math.max(best, window);
        }
        return base + best;
    }
}`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int maxSatisfied(vector<int>& customers, vector<int>& grumpy, int minutes) {
        int base = 0;
        for (int i = 0; i < (int)customers.size(); i++)
            if (grumpy[i] == 0) base += customers[i];
        int window = 0, best = 0;
        for (int i = 0; i < (int)customers.size(); i++) {
            if (grumpy[i] == 1) window += customers[i];
            if (i >= minutes && grumpy[i - minutes] == 1)
                window -= customers[i - minutes];
            best = max(best, window);
        }
        return base + best;
    }
};`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Adding non-grumpy minutes into the window recovery — they are already counted in the base.",
      "Forgetting to subtract the customer leaving the window when it slides past width minutes.",
      "Double counting base satisfied minutes inside the window.",
    ],
    edgeCases: [
      "Owner never grumpy — answer is the total.",
      "minutes equals n — recover everything grumpy.",
      "All minutes grumpy — recover only the window.",
    ],
    whyItMatters:
      "A fixed-width window measuring incremental gain on top of a fixed base is the standard 'one-time boost placement' optimization — promo windows, cache warm-ups, and staffing surges.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 297 — indian_domain · sliding_window · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "upi-nice-window-k-highvalue",
    version: 1,
    status: "pending_review",
    bucket: "indian_domain",
    batchNo: 10,
    pattern: "sliding_window",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer"],
    title: "Count UPI Spans With Exactly K High-Value Transfers",
    framing:
      "A UPI risk monitor flags spans of consecutive transactions that contain exactly k high-value (above-threshold) transfers. Count how many such spans occur in a day's stream.",
    statement:
      "Given an array amounts of UPI transaction amounts, a threshold value, and an integer k, a transaction is 'high-value' if its amount is strictly greater than threshold. Count the number of contiguous subarrays that contain exactly k high-value transactions. Return that count.",
    inputFormat:
      "An integer array amounts, an integer threshold, and an integer k.",
    outputFormat: "An integer: the number of subarrays with exactly k high-value transactions.",
    constraints: [
      "1 <= amounts.length <= 5 * 10^4",
      "1 <= amounts[i] <= 10^7",
      "0 <= k <= amounts.length",
    ],
    examples: [
      {
        input: "amounts = [1000,50000,2000,80000,300], threshold = 10000, k = 2",
        output: "6",
        explanation: "Two high-value transfers (50000, 80000); six spans contain exactly both.",
      },
      {
        input: "amounts = [200,300,400], threshold = 10000, k = 0",
        output: "6",
        explanation: "No high-value transfers; all 6 subarrays contain exactly zero.",
      },
    ],
    approach: [
      "Reduce each transaction to 1 (high-value) or 0 (not), turning the task into 'count subarrays with exactly k ones'.",
      "exactly(k) = atMost(k) - atMost(k-1), where atMost(m) counts subarrays with at most m high-value transfers.",
      "atMost uses a sliding window: expand right, and while the count of ones exceeds m, shrink from the left.",
      "Each right end contributes (right - left + 1) subarrays.",
    ],
    solutionSteps: [
      "Define atMost(m): if m < 0 return 0; slide window tracking the number of high-value transfers.",
      "Accumulate window length each step.",
      "Return atMost(k) - atMost(k-1).",
    ],
    code: {
      python: `def count_nice_upi(amounts: list[int], threshold: int, k: int) -> int:
    def at_most(m: int) -> int:
        if m < 0:
            return 0
        left = high = total = 0
        for right, a in enumerate(amounts):
            if a > threshold:
                high += 1
            while high > m:
                if amounts[left] > threshold:
                    high -= 1
                left += 1
            total += right - left + 1
        return total

    return at_most(k) - at_most(k - 1)`,
      java: `class Solution {
    public int countNiceUpi(int[] amounts, int threshold, int k) {
        return atMost(amounts, threshold, k) - atMost(amounts, threshold, k - 1);
    }

    private int atMost(int[] amounts, int threshold, int m) {
        if (m < 0) return 0;
        int left = 0, high = 0, total = 0;
        for (int right = 0; right < amounts.length; right++) {
            if (amounts[right] > threshold) high++;
            while (high > m) {
                if (amounts[left] > threshold) high--;
                left++;
            }
            total += right - left + 1;
        }
        return total;
    }
}`,
      cpp: `#include <vector>
using namespace std;

class Solution {
    int atMost(vector<int>& amounts, int threshold, int m) {
        if (m < 0) return 0;
        int left = 0, high = 0, total = 0;
        for (int right = 0; right < (int)amounts.size(); right++) {
            if (amounts[right] > threshold) high++;
            while (high > m) {
                if (amounts[left] > threshold) high--;
                left++;
            }
            total += right - left + 1;
        }
        return total;
    }
public:
    int countNiceUpi(vector<int>& amounts, int threshold, int k) {
        return atMost(amounts, threshold, k) - atMost(amounts, threshold, k - 1);
    }
};`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Trying to count 'exactly k' directly with one window instead of the atMost difference.",
      "Using >= threshold rather than strictly > for high-value.",
      "Not handling k = 0 via atMost(-1) = 0.",
    ],
    edgeCases: [
      "k = 0 — count spans of only low-value transfers.",
      "All transactions high-value.",
      "k greater than the number of high-value transfers — count 0.",
    ],
    whyItMatters:
      "Binarizing on a predicate then applying atMost(k) - atMost(k-1) is the reusable recipe for 'exactly k events' counting over transaction and event streams.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 298 — ai_applied · dp_2d · medium · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "agent-escape-boundary-paths",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 10,
    pattern: "dp_2d",
    difficulty: "medium",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "software_engineer"],
    title: "Count Ways an Agent Exits the Grid in N Moves",
    framing:
      "A grid-world agent starts at a cell and may step in four directions. Count how many distinct move sequences of at most maxMove steps carry it off the grid boundary — an episode-termination count.",
    statement:
      "Given an m x n grid and a ball starting at (startRow, startColumn), in one move the ball can go up, down, left, or right by one cell, including off the boundary. Return the number of distinct paths of at most maxMove moves that take the ball out of the grid, modulo 1e9+7.",
    inputFormat:
      "Integers m, n, maxMove, startRow, startColumn.",
    outputFormat: "An integer: the count of out-of-boundary paths modulo 1e9+7.",
    constraints: [
      "1 <= m, n <= 50",
      "0 <= maxMove <= 50",
      "0 <= startRow < m, 0 <= startColumn < n",
    ],
    examples: [
      {
        input: "m = 2, n = 2, maxMove = 2, startRow = 0, startColumn = 0",
        output: "6",
        explanation: "Six distinct paths of length at most 2 exit the 2x2 grid.",
      },
      {
        input: "m = 1, n = 3, maxMove = 3, startRow = 0, startColumn = 1",
        output: "12",
        explanation: "Twelve paths exit within three moves.",
      },
    ],
    approach: [
      "dp[r][c] = number of ways to be at cell (r, c) after the current number of moves.",
      "Each move, redistribute: a cell sends its count to its four neighbors; neighbors off the grid add to the exit count.",
      "Iterate maxMove times, accumulating exits, taking everything modulo 1e9+7.",
      "Use two layers (current and next) to avoid in-place interference.",
    ],
    solutionSteps: [
      "dp grid with dp[startRow][startCol] = 1; count = 0.",
      "Repeat maxMove times: for each cell with value v, push v to each of the 4 neighbors; if a neighbor is off-grid, add v to count, else ndp[nr][nc] += v.",
      "Swap dp = ndp each round, mod 1e9+7.",
      "Return count.",
    ],
    code: {
      python: `def find_paths(m: int, n: int, max_move: int, start_row: int, start_col: int) -> int:
    MOD = 1_000_000_007
    dp = [[0] * n for _ in range(m)]
    dp[start_row][start_col] = 1
    count = 0
    for _ in range(max_move):
        ndp = [[0] * n for _ in range(m)]
        for r in range(m):
            for c in range(n):
                v = dp[r][c]
                if v == 0:
                    continue
                for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < m and 0 <= nc < n:
                        ndp[nr][nc] = (ndp[nr][nc] + v) % MOD
                    else:
                        count = (count + v) % MOD
        dp = ndp
    return count`,
      java: `class Solution {
    public int findPaths(int m, int n, int maxMove, int startRow, int startColumn) {
        long MOD = 1_000_000_007L;
        long[][] dp = new long[m][n];
        dp[startRow][startColumn] = 1;
        long count = 0;
        int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};
        for (int move = 0; move < maxMove; move++) {
            long[][] ndp = new long[m][n];
            for (int r = 0; r < m; r++)
                for (int c = 0; c < n; c++) {
                    long v = dp[r][c];
                    if (v == 0) continue;
                    for (int[] d : dirs) {
                        int nr = r + d[0], nc = c + d[1];
                        if (nr >= 0 && nc >= 0 && nr < m && nc < n)
                            ndp[nr][nc] = (ndp[nr][nc] + v) % MOD;
                        else
                            count = (count + v) % MOD;
                    }
                }
            dp = ndp;
        }
        return (int) count;
    }
}`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int findPaths(int m, int n, int maxMove, int startRow, int startColumn) {
        const long MOD = 1000000007L;
        vector<vector<long>> dp(m, vector<long>(n, 0));
        dp[startRow][startColumn] = 1;
        long count = 0;
        int dirs[4][2] = {{-1,0},{1,0},{0,-1},{0,1}};
        for (int move = 0; move < maxMove; move++) {
            vector<vector<long>> ndp(m, vector<long>(n, 0));
            for (int r = 0; r < m; r++)
                for (int c = 0; c < n; c++) {
                    long v = dp[r][c];
                    if (v == 0) continue;
                    for (auto& d : dirs) {
                        int nr = r + d[0], nc = c + d[1];
                        if (nr >= 0 && nc >= 0 && nr < m && nc < n)
                            ndp[nr][nc] = (ndp[nr][nc] + v) % MOD;
                        else
                            count = (count + v) % MOD;
                    }
                }
            dp = ndp;
        }
        return (int) count;
    }
};`,
    },
    complexity: { time: "O(maxMove * m * n)", space: "O(m * n)" },
    pitfalls: [
      "Updating dp in place, letting a move's result feed back into the same move.",
      "Forgetting the modulus on both the grid counts and the exit count.",
      "Counting exits only at the end rather than at every move depth (paths of length < maxMove also count).",
    ],
    edgeCases: [
      "maxMove = 0 — no paths, count 0.",
      "Start adjacent to multiple boundaries.",
      "1xN grid where vertical moves always exit.",
    ],
    whyItMatters:
      "Forward-propagating path counts layer by layer is the model for bounded-horizon episode counting in grid-world RL and finite-step reachability enumeration.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 299 — pure_dsa · dp_1d · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "longest-arith-metric-subsequence",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "dp_1d",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer"],
    title: "Longest Arithmetic Subsequence",
    framing:
      "Find the longest run of values — not necessarily adjacent — that forms an arithmetic progression, the basis of trend-spotting in a metric series.",
    statement:
      "Given an integer array nums, return the length of the longest arithmetic subsequence: a subsequence (order preserved, gaps allowed) where the difference between consecutive elements is constant.",
    inputFormat: "An integer array nums.",
    outputFormat: "An integer: the length of the longest arithmetic subsequence.",
    constraints: [
      "1 <= nums.length <= 1000",
      "0 <= nums[i] <= 500",
    ],
    examples: [
      {
        input: "nums = [3,6,9,12]",
        output: "4",
        explanation: "The whole array is arithmetic with common difference 3.",
      },
      {
        input: "nums = [9,4,7,2,10]",
        output: "3",
        explanation: "[4,7,10] is an arithmetic subsequence of length 3.",
      },
    ],
    approach: [
      "dp[i] is a map from common difference d to the longest arithmetic subsequence ending at index i with that difference.",
      "For each pair j < i, let d = nums[i] - nums[j]; dp[i][d] = dp[j].get(d, 1) + 1.",
      "Track the global maximum length across all dp entries.",
      "The base case of a single element gives length 1.",
    ],
    solutionSteps: [
      "Initialize dp as a list of maps.",
      "For each i, for each j < i: d = nums[i]-nums[j]; dp[i][d] = max(dp[i].get(d,0), dp[j].get(d,1)+1).",
      "Update best with dp[i][d].",
      "Return best.",
    ],
    code: {
      python: `def longest_arith_seq_length(nums: list[int]) -> int:
    n = len(nums)
    dp: list[dict[int, int]] = [{} for _ in range(n)]
    best = 1
    for i in range(n):
        for j in range(i):
            d = nums[i] - nums[j]
            dp[i][d] = dp[j].get(d, 1) + 1
            best = max(best, dp[i][d])
    return best`,
      java: `import java.util.*;

class Solution {
    public int longestArithSeqLength(int[] nums) {
        int n = nums.length, best = 1;
        List<Map<Integer, Integer>> dp = new ArrayList<>();
        for (int i = 0; i < n; i++) dp.add(new HashMap<>());
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < i; j++) {
                int d = nums[i] - nums[j];
                int len = dp.get(j).getOrDefault(d, 1) + 1;
                dp.get(i).put(d, len);
                best = Math.max(best, len);
            }
        }
        return best;
    }
}`,
      cpp: `#include <vector>
#include <unordered_map>
#include <algorithm>
using namespace std;

class Solution {
public:
    int longestArithSeqLength(vector<int>& nums) {
        int n = nums.size(), best = 1;
        vector<unordered_map<int,int>> dp(n);
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < i; j++) {
                int d = nums[i] - nums[j];
                int len = (dp[j].count(d) ? dp[j][d] : 1) + 1;
                dp[i][d] = len;
                best = max(best, len);
            }
        }
        return best;
    }
};`,
    },
    complexity: { time: "O(n^2)", space: "O(n^2)" },
    pitfalls: [
      "Defaulting the previous length to 0 instead of 1 (the element at j itself counts).",
      "Using a single global difference map rather than one per ending index.",
      "Confusing subsequence (gaps allowed) with contiguous subarray.",
    ],
    edgeCases: [
      "All equal values — difference 0, length n.",
      "Strictly increasing distinct gaps — answer 2.",
      "Single element — length 1.",
    ],
    whyItMatters:
      "Per-index difference maps generalize longest-increasing-subsequence to arithmetic structure, the technique behind progression detection and regularity mining in series.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 300 — pure_dsa · greedy · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "partition-log-labels",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 10,
    pattern: "greedy",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer"],
    title: "Partition String Into Maximum Label-Disjoint Parts",
    framing:
      "Split a string into the most pieces possible so that no letter appears in more than one piece — a partitioning used to chunk logs by non-overlapping tag scopes.",
    statement:
      "Given a string s, partition it into as many contiguous parts as possible so that each letter appears in at most one part. Return a list of the sizes of these parts, in order.",
    inputFormat: "A string s of lowercase English letters.",
    outputFormat: "A list of integers: the length of each partition in order.",
    constraints: [
      "1 <= s.length <= 500",
      "s consists of lowercase English letters.",
    ],
    examples: [
      {
        input: 's = "ababcbacadefegdehijhklij"',
        output: "[9,7,8]",
        explanation: "The first part ends where the last a/b/c resolve; then d/e/f/g; then the rest.",
      },
      {
        input: 's = "eccbbbbdec"',
        output: "[10]",
        explanation: "All letters' spans overlap, forcing a single part.",
      },
    ],
    approach: [
      "Record the last occurrence index of every letter.",
      "Sweep left to right keeping the farthest last-occurrence among letters seen in the current part.",
      "When the scan index reaches that farthest index, the current part is complete; record its length and start a new part.",
      "This greedy boundary is correct because every letter inside the part must finish by that index.",
    ],
    solutionSteps: [
      "last[c] = last index of c.",
      "start = 0, end = 0; for i, c: end = max(end, last[c]).",
      "If i == end: append i - start + 1; start = i + 1.",
      "Return the sizes.",
    ],
    code: {
      python: `def partition_labels(s: str) -> list[int]:
    last = {c: i for i, c in enumerate(s)}
    res = []
    start = end = 0
    for i, c in enumerate(s):
        end = max(end, last[c])
        if i == end:
            res.append(i - start + 1)
            start = i + 1
    return res`,
      java: `import java.util.*;

class Solution {
    public List<Integer> partitionLabels(String s) {
        int[] last = new int[26];
        for (int i = 0; i < s.length(); i++) last[s.charAt(i) - 'a'] = i;
        List<Integer> res = new ArrayList<>();
        int start = 0, end = 0;
        for (int i = 0; i < s.length(); i++) {
            end = Math.max(end, last[s.charAt(i) - 'a']);
            if (i == end) {
                res.add(i - start + 1);
                start = i + 1;
            }
        }
        return res;
    }
}`,
      cpp: `#include <string>
#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    vector<int> partitionLabels(string s) {
        vector<int> last(26, 0);
        for (int i = 0; i < (int)s.size(); i++) last[s[i] - 'a'] = i;
        vector<int> res;
        int start = 0, end = 0;
        for (int i = 0; i < (int)s.size(); i++) {
            end = max(end, last[s[i] - 'a']);
            if (i == end) {
                res.push_back(i - start + 1);
                start = i + 1;
            }
        }
        return res;
    }
};`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Closing a part before reaching the farthest last-occurrence of an included letter.",
      "Resetting the start index incorrectly after a cut.",
      "Recomputing last-occurrence inside the loop instead of precomputing.",
    ],
    edgeCases: [
      "All distinct letters — each character its own part.",
      "A letter spanning the whole string — a single part.",
      "Single character.",
    ],
    whyItMatters:
      "Greedy interval-coverage by farthest-reach is the optimal partition method for label/scope segmentation — chunking logs, token streams, and resource lifetimes into disjoint spans.",
    estimatedMinutes: 25,
  },
];
