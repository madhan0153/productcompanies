import {
  DSA_CATALOG,
  DSA_PATTERNS_DISPLAY,
  type DsaPattern,
  type DsaProblem,
} from "./dsa-catalog";

export type DsaCodeLang = "typescript" | "python" | "java";

export const DSA_CODE_LANGS: readonly DsaCodeLang[] = ["typescript", "python", "java"] as const;

export const DSA_CODE_LANG_LABEL: Record<DsaCodeLang, string> = {
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
};

export interface DsaLearningGuide {
  prompt: string;
  examples: string[];
  approach: string[];
  solution: string[];
  /** Legacy single-language code; kept for problems that only ship TS. */
  code?: string;
  /** Multi-language canonical solutions (TS / Py / Java). Optional per
   *  problem; the detail page tabs only what is present. */
  codeByLang?: Partial<Record<DsaCodeLang, string>>;
  complexity: string;
  whyItMatters: string;
  pitfalls: string[];
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
  { pattern: "arrays_hashing",      label: "Arrays & Hashing",        order: 1,  focus: "Fast lookup, frequency maps, de-duplication" },
  { pattern: "two_pointers",        label: "Two Pointers",            order: 2,  focus: "Sorted arrays, pair search, in-place scans" },
  { pattern: "sliding_window",      label: "Sliding Window",          order: 3,  focus: "Contiguous subarrays and substrings" },
  { pattern: "stack_queue",         label: "Stack / Queue",           order: 4,  focus: "Matching, monotonic stacks, BFS order" },
  { pattern: "binary_search",       label: "Binary Search",           order: 5,  focus: "Search spaces and monotonic decisions" },
  { pattern: "linked_list",         label: "Linked List",             order: 6,  focus: "Pointer movement and mutation safety" },
  { pattern: "trees",               label: "Trees",                   order: 7,  focus: "DFS, BFS, recursion boundaries" },
  { pattern: "heap_priority_queue", label: "Heap / Priority Queue",   order: 8,  focus: "Top-k, streaming order, merge patterns" },
  { pattern: "graphs",              label: "Graphs",                  order: 9,  focus: "Visited sets, traversal, shortest reachability" },
  { pattern: "backtracking",        label: "Backtracking",            order: 10, focus: "Choice trees, undo steps, pruning" },
  { pattern: "dp_1d",               label: "Dynamic Programming 1D",  order: 11, focus: "State transitions over one index" },
  { pattern: "dp_2d",               label: "Dynamic Programming 2D",  order: 12, focus: "Grid/string state transitions" },
  { pattern: "greedy",              label: "Greedy",                  order: 13, focus: "Local choice with proof intuition" },
  { pattern: "intervals",           label: "Intervals",               order: 14, focus: "Sorting, overlap decisions, merging" },
  { pattern: "tries",               label: "Tries",                   order: 15, focus: "Prefix search and dictionary traversal" },
  { pattern: "bit_manipulation",    label: "Bit Manipulation",        order: 16, focus: "XOR, masks, compact state" },
  { pattern: "math_geometry",       label: "Math / Geometry",         order: 17, focus: "Formulae, coordinates, invariants" },
] as const;

const GUIDE_OVERRIDES: Record<string, Partial<DsaLearningGuide>> = {
  "two-sum": {
    prompt: "Given an integer array and a target, return the two indices whose values add up to the target.",
    examples: ["nums = [2, 7, 11, 15], target = 9 -> [0, 1]", "nums = [3, 2, 4], target = 6 -> [1, 2]"],
    approach: [
      "Scan the array once from left to right.",
      "For each value, compute the complement: target - value.",
      "If the complement was seen earlier, return the stored index and current index.",
      "Otherwise store the current value with its index in a hash map.",
    ],
    solution: [
      "Use a map from number to index.",
      "Check before inserting the current number so the same element is never reused.",
      "Return as soon as a pair is found.",
    ],
    codeByLang: {
      typescript: `function twoSum(nums: number[], target: number): number[] {
  const seen = new Map<number, number>();

  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i]!;
    const j = seen.get(need);
    if (j !== undefined) return [j, i];
    seen.set(nums[i]!, i);
  }

  return [];
}`,
      python: `def two_sum(nums: list[int], target: int) -> list[int]:
    seen: dict[int, int] = {}

    for i, value in enumerate(nums):
        need = target - value
        if need in seen:
            return [seen[need], i]
        seen[value] = i

    return []`,
      java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();

        for (int i = 0; i < nums.length; i++) {
            int need = target - nums[i];
            if (seen.containsKey(need)) {
                return new int[] { seen.get(need), i };
            }
            seen.put(nums[i], i);
        }

        return new int[0];
    }
}`,
    },
    complexity: "Time O(n), space O(n).",
    pitfalls: ["Do not sort if the question asks for original indices.", "Check complement before insert to avoid reusing one element."],
    similarSlugs: ["valid-anagram", "top-k-frequent-elements", "longest-consecutive-sequence"],
    estimatedMinutes: 18,
  },
  "valid-anagram": {
    prompt: "Given two strings, decide whether one can be rearranged to form the other.",
    examples: ["s = 'anagram', t = 'nagaram' -> true", "s = 'rat', t = 'car' -> false"],
    approach: [
      "If lengths differ, return false immediately.",
      "Count characters in the first string.",
      "Subtract counts using the second string.",
      "If any count goes negative or remains positive, the strings are not anagrams.",
    ],
    solution: ["Use a frequency map or fixed-size array.", "One pass adds counts; one pass subtracts counts.", "All final counts must be zero."],
    codeByLang: {
      typescript: `function isAnagram(s: string, t: string): boolean {
  if (s.length !== t.length) return false;
  const counts = new Map<string, number>();

  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  for (const ch of t) {
    const next = (counts.get(ch) ?? 0) - 1;
    if (next < 0) return false;
    counts.set(ch, next);
  }

  return true;
}`,
      python: `def is_anagram(s: str, t: str) -> bool:
    if len(s) != len(t):
        return False

    counts: dict[str, int] = {}
    for ch in s:
        counts[ch] = counts.get(ch, 0) + 1
    for ch in t:
        if counts.get(ch, 0) == 0:
            return False
        counts[ch] -= 1

    return True`,
      java: `class Solution {
    public boolean isAnagram(String s, String t) {
        if (s.length() != t.length()) return false;
        Map<Character, Integer> counts = new HashMap<>();

        for (char ch : s.toCharArray()) {
            counts.merge(ch, 1, Integer::sum);
        }
        for (char ch : t.toCharArray()) {
            int next = counts.getOrDefault(ch, 0) - 1;
            if (next < 0) return false;
            counts.put(ch, next);
        }

        return true;
    }
}`,
    },
    complexity: "Time O(n), space O(k) where k is unique characters.",
    pitfalls: ["Length check saves work.", "Unicode assumptions matter; use a map unless lowercase English is guaranteed."],
    similarSlugs: ["group-anagrams", "two-sum"],
    estimatedMinutes: 15,
  },
  "best-time-buy-sell-stock": {
    prompt: "Given daily prices, find the maximum profit from one buy followed by one sell.",
    examples: ["prices = [7, 1, 5, 3, 6, 4] -> 5", "prices = [7, 6, 4, 3, 1] -> 0"],
    approach: [
      "Track the cheapest price seen so far.",
      "For each day, treat today as the sell day and compute profit.",
      "Update the best profit.",
      "Then update the minimum price if today is cheaper.",
    ],
    solution: ["One pass is enough because sell must happen after buy.", "The best buy for any day is the minimum price before that day."],
    codeByLang: {
      typescript: `function maxProfit(prices: number[]): number {
  let minPrice = Infinity;
  let best = 0;

  for (const price of prices) {
    best = Math.max(best, price - minPrice);
    minPrice = Math.min(minPrice, price);
  }

  return best;
}`,
      python: `def max_profit(prices: list[int]) -> int:
    min_price = float("inf")
    best = 0

    for price in prices:
        best = max(best, price - min_price)
        min_price = min(min_price, price)

    return best`,
      java: `class Solution {
    public int maxProfit(int[] prices) {
        int minPrice = Integer.MAX_VALUE;
        int best = 0;

        for (int price : prices) {
            best = Math.max(best, price - minPrice);
            minPrice = Math.min(minPrice, price);
        }

        return best;
    }
}`,
    },
    complexity: "Time O(n), space O(1).",
    pitfalls: ["Do not allow selling before buying.", "Return 0 when no profitable trade exists."],
    similarSlugs: ["longest-substring-without-repeating", "minimum-window-substring"],
    estimatedMinutes: 16,
  },
  "valid-parentheses": {
    prompt: "Given a bracket string, decide whether every opening bracket is closed in the correct order.",
    examples: ["s = '()[]{}' -> true", "s = '(]' -> false"],
    approach: [
      "Push opening brackets onto a stack.",
      "When a closing bracket appears, pop the most recent opener.",
      "The popped opener must match the closer.",
      "At the end, the stack must be empty.",
    ],
    solution: ["Use stack order because the most recent opener closes first.", "A mismatch or empty pop means invalid."],
    codeByLang: {
      typescript: `function isValid(s: string): boolean {
  const stack: string[] = [];
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

  for (const ch of s) {
    if (ch === "(" || ch === "[" || ch === "{") stack.push(ch);
    else if (stack.pop() !== pairs[ch]) return false;
  }

  return stack.length === 0;
}`,
      python: `def is_valid(s: str) -> bool:
    stack: list[str] = []
    pairs = {")": "(", "]": "[", "}": "{"}

    for ch in s:
        if ch in "([{":
            stack.append(ch)
        else:
            if not stack or stack.pop() != pairs[ch]:
                return False

    return not stack`,
      java: `class Solution {
    public boolean isValid(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        Map<Character, Character> pairs = Map.of(')', '(', ']', '[', '}', '{');

        for (char ch : s.toCharArray()) {
            if (ch == '(' || ch == '[' || ch == '{') {
                stack.push(ch);
            } else if (stack.isEmpty() || stack.pop() != pairs.get(ch)) {
                return false;
            }
        }

        return stack.isEmpty();
    }
}`,
    },
    complexity: "Time O(n), space O(n).",
    pitfalls: ["A leftover opener at the end is invalid.", "A closer with an empty stack is invalid."],
    similarSlugs: ["daily-temperatures", "car-fleet"],
    estimatedMinutes: 15,
  },
  "reverse-linked-list": {
    prompt: "Given the head of a singly linked list, reverse the list and return the new head.",
    examples: ["1 -> 2 -> 3 -> null becomes 3 -> 2 -> 1 -> null"],
    approach: [
      "Keep two pointers: previous and current.",
      "Save current.next before changing it.",
      "Point current.next to previous.",
      "Move previous and current forward until current is null.",
    ],
    solution: ["Iteratively reverse one edge at a time.", "The previous pointer is the new head after the loop."],
    codeByLang: {
      typescript: `class ListNode { val = 0; next: ListNode | null = null; }

function reverseList(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null;
  let curr = head;

  while (curr !== null) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }

  return prev;
}`,
      python: `class ListNode:
    def __init__(self, val: int = 0, nxt: "ListNode | None" = None):
        self.val = val
        self.next = nxt


def reverse_list(head: ListNode | None) -> ListNode | None:
    prev: ListNode | None = None
    curr = head

    while curr is not None:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt

    return prev`,
      java: `class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode prev = null;
        ListNode curr = head;

        while (curr != null) {
            ListNode next = curr.next;
            curr.next = prev;
            prev = curr;
            curr = next;
        }

        return prev;
    }
}`,
    },
    complexity: "Time O(n), space O(1).",
    pitfalls: ["Save next before rewiring.", "Return previous, not current, after the loop."],
    similarSlugs: ["merge-two-sorted-lists", "linked-list-cycle", "reorder-list"],
    estimatedMinutes: 20,
  },
  "number-of-islands": {
    prompt: "Given a grid of land and water, count connected land components using four-directional adjacency.",
    examples: ["A block of connected land cells counts as one island, even if it has many cells."],
    approach: [
      "Scan every cell in the grid.",
      "When unvisited land is found, count one island.",
      "Run DFS or BFS from that cell to mark the full island visited.",
      "Continue scanning for the next unvisited land cell.",
    ],
    solution: ["Use DFS/BFS flood fill.", "Visited can be a set or in-place marking if mutation is allowed."],
    codeByLang: {
      typescript: `function numIslands(grid: string[][]): number {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  let count = 0;

  const dfs = (r: number, c: number) => {
    if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r]![c] !== "1") return;
    grid[r]![c] = "0";
    dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1);
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r]![c] === "1") {
        count++;
        dfs(r, c);
      }
    }
  }

  return count;
}`,
      python: `def num_islands(grid: list[list[str]]) -> int:
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])
    count = 0

    def dfs(r: int, c: int) -> None:
        if r < 0 or c < 0 or r >= rows or c >= cols or grid[r][c] != "1":
            return
        grid[r][c] = "0"
        dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1)

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1":
                count += 1
                dfs(r, c)

    return count`,
      java: `class Solution {
    public int numIslands(char[][] grid) {
        int rows = grid.length;
        int cols = grid[0].length;
        int count = 0;

        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] == '1') {
                    count++;
                    dfs(grid, r, c, rows, cols);
                }
            }
        }

        return count;
    }

    private void dfs(char[][] grid, int r, int c, int rows, int cols) {
        if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] != '1') return;
        grid[r][c] = '0';
        dfs(grid, r + 1, c, rows, cols);
        dfs(grid, r - 1, c, rows, cols);
        dfs(grid, r, c + 1, rows, cols);
        dfs(grid, r, c - 1, rows, cols);
    }
}`,
    },
    complexity: "Time O(rows * cols), space O(rows * cols) worst-case recursion.",
    pitfalls: ["Mark visited immediately to avoid loops.", "Use only four directions unless diagonals are explicitly allowed."],
    similarSlugs: ["rotting-oranges", "clone-graph", "course-schedule"],
    estimatedMinutes: 28,
  },
  "merge-intervals": {
    prompt: "Given intervals, merge all overlapping ranges and return the compact list.",
    examples: ["[[1,3], [2,6], [8,10]] -> [[1,6], [8,10]]"],
    approach: [
      "Sort intervals by start time.",
      "Keep a result list with the last merged interval.",
      "If the next interval overlaps, extend the last end.",
      "Otherwise append it as a new disjoint interval.",
    ],
    solution: ["Sorting creates local adjacency, so only the previous merged interval matters."],
    codeByLang: {
      typescript: `function merge(intervals: number[][]): number[][] {
  intervals.sort((a, b) => a[0]! - b[0]!);
  const merged: number[][] = [];

  for (const current of intervals) {
    const last = merged[merged.length - 1];
    if (!last || current[0]! > last[1]!) merged.push([...current]);
    else last[1] = Math.max(last[1]!, current[1]!);
  }

  return merged;
}`,
      python: `def merge(intervals: list[list[int]]) -> list[list[int]]:
    intervals.sort(key=lambda pair: pair[0])
    merged: list[list[int]] = []

    for current in intervals:
        if not merged or current[0] > merged[-1][1]:
            merged.append(list(current))
        else:
            merged[-1][1] = max(merged[-1][1], current[1])

    return merged`,
      java: `class Solution {
    public int[][] merge(int[][] intervals) {
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> merged = new ArrayList<>();

        for (int[] current : intervals) {
            if (merged.isEmpty() || current[0] > merged.get(merged.size() - 1)[1]) {
                merged.add(new int[] { current[0], current[1] });
            } else {
                merged.get(merged.size() - 1)[1] = Math.max(
                    merged.get(merged.size() - 1)[1], current[1]
                );
            }
        }

        return merged.toArray(new int[0][]);
    }
}`,
    },
    complexity: "Time O(n log n), space O(n) for output.",
    pitfalls: ["Sort first.", "Touching intervals may count as overlap depending on inclusive boundaries; LeetCode uses inclusive ranges."],
    similarSlugs: ["insert-interval", "non-overlapping-intervals"],
    estimatedMinutes: 22,
  },
};

export function getDsaLearningGuide(problem: DsaProblem): DsaLearningGuide {
  const pattern = patternGuide(problem.pattern);
  const override = GUIDE_OVERRIDES[problem.slug] ?? {};
  return {
    prompt: override.prompt ?? `${problem.title}: solve the core ${DSA_PATTERNS_DISPLAY[problem.pattern]} interview version without brute force.`,
    examples: override.examples ?? pattern.examples,
    approach: override.approach ?? pattern.approach,
    solution: override.solution ?? pattern.solution,
    code: override.code ?? override.codeByLang?.typescript,
    codeByLang: override.codeByLang,
    complexity: override.complexity ?? pattern.complexity,
    whyItMatters: override.whyItMatters ?? pattern.whyItMatters,
    pitfalls: override.pitfalls ?? pattern.pitfalls,
    similarSlugs: override.similarSlugs ?? defaultSimilar(problem),
    estimatedMinutes: override.estimatedMinutes ?? defaultMinutes(problem.difficulty),
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

function patternGuide(pattern: DsaPattern): Omit<DsaLearningGuide, "similarSlugs" | "estimatedMinutes"> {
  const label = DSA_PATTERNS_DISPLAY[pattern];
  switch (pattern) {
    case "arrays_hashing":
      return baseGuide(label, "Use a hash map or set so repeated lookup work becomes constant-time.", "Time usually O(n), space O(n).");
    case "two_pointers":
      return baseGuide(label, "Move two indices with a clear invariant instead of checking every pair.", "Time usually O(n), space O(1).");
    case "sliding_window":
      return baseGuide(label, "Maintain a valid contiguous window and update the answer as the window grows or shrinks.", "Time usually O(n), space depends on tracked state.");
    case "stack_queue":
      return baseGuide(label, "Use stack order for nested/recent items or queue order for level-by-level processing.", "Time usually O(n), space O(n).");
    case "binary_search":
      return baseGuide(label, "Find a monotonic condition, keep low/high inclusive, and shrink the search space safely.", "Time O(log n), space O(1).");
    case "linked_list":
      return baseGuide(label, "Move pointers deliberately; save the next node before mutating links.", "Time O(n), space O(1) for iterative solutions.");
    case "trees":
      return baseGuide(label, "Choose DFS for path/local subtree logic or BFS for level-order logic.", "Time O(n), space O(h) DFS or O(width) BFS.");
    case "graphs":
      return baseGuide(label, "Build the traversal state, mark visited early, and explore each reachable node once.", "Time O(V + E), space O(V).");
    case "dp_1d":
    case "dp_2d":
      return baseGuide(label, "Define the state, write the transition, choose base cases, then fill in dependency order.", "Time and space depend on state count.");
    case "heap_priority_queue":
      return baseGuide(label, "Keep only the highest-priority candidates in a heap instead of sorting everything repeatedly.", "Time often O(n log k), space O(k).");
    case "intervals":
      return baseGuide(label, "Sort by start/end time, then make one local decision per interval.", "Time O(n log n), space O(n) for output.");
    default:
      return baseGuide(label, "Name the invariant first, then choose the smallest data structure that preserves it.", "Time and space depend on the chosen invariant.");
  }
}

function baseGuide(label: string, coreIdea: string, complexity: string): Omit<DsaLearningGuide, "similarSlugs" | "estimatedMinutes"> {
  return {
    prompt: `Solve this ${label} problem by identifying the invariant and avoiding brute force.`,
    examples: ["Work through one tiny example by hand before writing the final logic."],
    approach: [
      `Recognize the pattern: ${label}.`,
      coreIdea,
      "State what each variable means before updating it.",
      "Test the smallest edge case and one normal case.",
    ],
    solution: [
      "Start with the clean invariant.",
      "Apply the data structure that enforces it.",
      "Return the accumulated answer after one disciplined pass or traversal.",
    ],
    complexity,
    whyItMatters: `${label} is a repeated product-company interview pattern because it tests whether you can turn a brute-force idea into a predictable invariant.`,
    pitfalls: ["Do not start with code; first name the invariant.", "Check empty input, one-element input, and duplicate values."],
  };
}

function defaultSimilar(problem: DsaProblem): string[] {
  return [
    ...new Set(
      DSA_CATALOG_BY_PATTERN[problem.pattern]
        ?.filter((p) => p.slug !== problem.slug)
        .slice(0, 3)
        .map((p) => p.slug) ?? [],
    ),
  ];
}

function defaultMinutes(difficulty: DsaProblem["difficulty"]): number {
  if (difficulty === "easy") return 20;
  if (difficulty === "medium") return 35;
  return 50;
}

// ── Spaced repetition (SM-2-lite) ───────────────────────────────────────────
// Three confidence buckets keep the UX simple. The scheduler is intentionally
// boring: confidence + repetitions -> a day offset on a fixed curve. We avoid
// SM-2's full ease-factor math because a beginner DSA learner does not need
// 5-decimal precision, and the simpler curve is easier to debug.

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
  // Day offsets indexed by repetitions - 1 (clamped to last bucket).
  got_it:   [3, 7, 14, 21, 30],
  review:   [2, 4, 8, 14, 21],
  confused: [1, 2, 4, 7, 14],
};

export interface DsaReviewSchedule {
  /** Day-offset to add to today to produce the next-review date. */
  nextOffsetDays: number;
  /** Updated repetition count (current + 1, capped). */
  nextRepetitions: number;
}

/**
 * Pure scheduling function. Caller adds nextOffsetDays to today's date and
 * writes the result + nextRepetitions back to dsa_user_progress.
 */
export function planDsaReview(input: {
  confidence: DsaConfidence;
  currentRepetitions: number;
}): DsaReviewSchedule {
  const curve = REVIEW_CURVE[input.confidence];
  const reps = Math.max(1, Math.min(input.currentRepetitions, curve.length));
  const nextRepetitions = Math.min(reps + 1, curve.length);
  // Read curve at index (reps - 1) so a fresh problem (reps = 1) uses curve[0].
  const offset = curve[reps - 1] ?? curve[curve.length - 1]!;
  return { nextOffsetDays: offset, nextRepetitions };
}
