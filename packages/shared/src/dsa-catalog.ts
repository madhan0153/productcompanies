// Hand-curated DSA problem catalog for the Interview Lab daily dispatch.
//
// Static, in-code data (no DB seed needed). Each problem is linked to the
// NeetCode / LeetCode source so the user can solve on their preferred
// platform. Tags drive personalisation:
//   - `pattern`   what algorithmic pattern this problem teaches
//   - `companies` which of the 18 approved companies ask similar problems
//   - `difficulty` standard easy/medium/hard
//
// To add a problem: append an entry below. Keep the slug stable — it's
// what we persist in interview_daily_dispatch.
//
// Source attribution: problems and ordering inspired by NeetCode patterns
// list (https://neetcode.io, MIT) and Sean Prashad's leetcode-patterns
// (https://github.com/seanprashad/leetcode-patterns, MIT). We link out to
// LeetCode; no problem statements are reproduced here.

export type DsaPattern =
  | "arrays_hashing"
  | "two_pointers"
  | "sliding_window"
  | "stack_queue"
  | "binary_search"
  | "linked_list"
  | "trees"
  | "tries"
  | "heap_priority_queue"
  | "backtracking"
  | "graphs"
  | "dp_1d"
  | "dp_2d"
  | "greedy"
  | "intervals"
  | "math_geometry"
  | "bit_manipulation";

export type DsaDifficulty = "easy" | "medium" | "hard";

export interface DsaProblem {
  /** Stable identifier persisted in interview_daily_dispatch.problem_slug. */
  slug: string;
  title: string;
  pattern: DsaPattern;
  difficulty: DsaDifficulty;
  /** LeetCode problem number when applicable; null for problems that live
   *  elsewhere (e.g. neetcode-only "X Sum" follow-ups). */
  leetcode_id: number | null;
  /** LeetCode (or other) canonical URL. */
  url: string;
  /** Approved companies (subset of crawler-meta) commonly asking this
   *  pattern or this exact problem. */
  companies: string[];
}

export const DSA_CATALOG: readonly DsaProblem[] = [
  // ── Arrays & Hashing ────────────────────────────────────────────────────
  {
    slug: "two-sum",
    title: "Two Sum",
    pattern: "arrays_hashing",
    difficulty: "easy",
    leetcode_id: 1,
    url: "https://leetcode.com/problems/two-sum/",
    companies: ["google", "microsoft", "amazon", "razorpay", "flipkart"],
  },
  {
    slug: "valid-anagram",
    title: "Valid Anagram",
    pattern: "arrays_hashing",
    difficulty: "easy",
    leetcode_id: 242,
    url: "https://leetcode.com/problems/valid-anagram/",
    companies: ["google", "microsoft", "amazon"],
  },
  {
    slug: "group-anagrams",
    title: "Group Anagrams",
    pattern: "arrays_hashing",
    difficulty: "medium",
    leetcode_id: 49,
    url: "https://leetcode.com/problems/group-anagrams/",
    companies: ["google", "microsoft", "amazon", "meta"],
  },
  {
    slug: "top-k-frequent-elements",
    title: "Top K Frequent Elements",
    pattern: "arrays_hashing",
    difficulty: "medium",
    leetcode_id: 347,
    url: "https://leetcode.com/problems/top-k-frequent-elements/",
    companies: ["google", "meta", "amazon", "flipkart"],
  },
  {
    slug: "product-of-array-except-self",
    title: "Product of Array Except Self",
    pattern: "arrays_hashing",
    difficulty: "medium",
    leetcode_id: 238,
    url: "https://leetcode.com/problems/product-of-array-except-self/",
    companies: ["microsoft", "amazon", "meta", "apple"],
  },
  {
    slug: "longest-consecutive-sequence",
    title: "Longest Consecutive Sequence",
    pattern: "arrays_hashing",
    difficulty: "medium",
    leetcode_id: 128,
    url: "https://leetcode.com/problems/longest-consecutive-sequence/",
    companies: ["google", "amazon", "razorpay"],
  },

  // ── Two pointers ────────────────────────────────────────────────────────
  {
    slug: "valid-palindrome",
    title: "Valid Palindrome",
    pattern: "two_pointers",
    difficulty: "easy",
    leetcode_id: 125,
    url: "https://leetcode.com/problems/valid-palindrome/",
    companies: ["microsoft", "amazon", "meta"],
  },
  {
    slug: "3sum",
    title: "3Sum",
    pattern: "two_pointers",
    difficulty: "medium",
    leetcode_id: 15,
    url: "https://leetcode.com/problems/3sum/",
    companies: ["google", "amazon", "meta", "apple"],
  },
  {
    slug: "container-with-most-water",
    title: "Container With Most Water",
    pattern: "two_pointers",
    difficulty: "medium",
    leetcode_id: 11,
    url: "https://leetcode.com/problems/container-with-most-water/",
    companies: ["amazon", "meta", "microsoft"],
  },

  // ── Sliding window ──────────────────────────────────────────────────────
  {
    slug: "best-time-buy-sell-stock",
    title: "Best Time to Buy and Sell Stock",
    pattern: "sliding_window",
    difficulty: "easy",
    leetcode_id: 121,
    url: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/",
    companies: ["amazon", "microsoft", "razorpay", "phonepe"],
  },
  {
    slug: "longest-substring-without-repeating",
    title: "Longest Substring Without Repeating Characters",
    pattern: "sliding_window",
    difficulty: "medium",
    leetcode_id: 3,
    url: "https://leetcode.com/problems/longest-substring-without-repeating-characters/",
    companies: ["google", "amazon", "meta", "microsoft", "swiggy"],
  },
  {
    slug: "longest-repeating-character-replacement",
    title: "Longest Repeating Character Replacement",
    pattern: "sliding_window",
    difficulty: "medium",
    leetcode_id: 424,
    url: "https://leetcode.com/problems/longest-repeating-character-replacement/",
    companies: ["google", "meta"],
  },
  {
    slug: "minimum-window-substring",
    title: "Minimum Window Substring",
    pattern: "sliding_window",
    difficulty: "hard",
    leetcode_id: 76,
    url: "https://leetcode.com/problems/minimum-window-substring/",
    companies: ["google", "amazon", "meta"],
  },

  // ── Stack ───────────────────────────────────────────────────────────────
  {
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    pattern: "stack_queue",
    difficulty: "easy",
    leetcode_id: 20,
    url: "https://leetcode.com/problems/valid-parentheses/",
    companies: ["microsoft", "amazon", "google", "atlassian"],
  },
  {
    slug: "daily-temperatures",
    title: "Daily Temperatures",
    pattern: "stack_queue",
    difficulty: "medium",
    leetcode_id: 739,
    url: "https://leetcode.com/problems/daily-temperatures/",
    companies: ["amazon", "google"],
  },
  {
    slug: "car-fleet",
    title: "Car Fleet",
    pattern: "stack_queue",
    difficulty: "medium",
    leetcode_id: 853,
    url: "https://leetcode.com/problems/car-fleet/",
    companies: ["google"],
  },

  // ── Binary search ───────────────────────────────────────────────────────
  {
    slug: "search-rotated-sorted-array",
    title: "Search in Rotated Sorted Array",
    pattern: "binary_search",
    difficulty: "medium",
    leetcode_id: 33,
    url: "https://leetcode.com/problems/search-in-rotated-sorted-array/",
    companies: ["amazon", "google", "meta"],
  },
  {
    slug: "find-min-rotated-sorted-array",
    title: "Find Minimum in Rotated Sorted Array",
    pattern: "binary_search",
    difficulty: "medium",
    leetcode_id: 153,
    url: "https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/",
    companies: ["amazon", "microsoft"],
  },
  {
    slug: "koko-eating-bananas",
    title: "Koko Eating Bananas",
    pattern: "binary_search",
    difficulty: "medium",
    leetcode_id: 875,
    url: "https://leetcode.com/problems/koko-eating-bananas/",
    companies: ["google", "amazon"],
  },

  // ── Linked list ─────────────────────────────────────────────────────────
  {
    slug: "reverse-linked-list",
    title: "Reverse Linked List",
    pattern: "linked_list",
    difficulty: "easy",
    leetcode_id: 206,
    url: "https://leetcode.com/problems/reverse-linked-list/",
    companies: ["microsoft", "amazon", "google", "atlassian"],
  },
  {
    slug: "merge-two-sorted-lists",
    title: "Merge Two Sorted Lists",
    pattern: "linked_list",
    difficulty: "easy",
    leetcode_id: 21,
    url: "https://leetcode.com/problems/merge-two-sorted-lists/",
    companies: ["amazon", "google", "microsoft"],
  },
  {
    slug: "linked-list-cycle",
    title: "Linked List Cycle",
    pattern: "linked_list",
    difficulty: "easy",
    leetcode_id: 141,
    url: "https://leetcode.com/problems/linked-list-cycle/",
    companies: ["amazon", "microsoft", "meta"],
  },
  {
    slug: "reorder-list",
    title: "Reorder List",
    pattern: "linked_list",
    difficulty: "medium",
    leetcode_id: 143,
    url: "https://leetcode.com/problems/reorder-list/",
    companies: ["meta", "google"],
  },
  {
    slug: "merge-k-sorted-lists",
    title: "Merge K Sorted Lists",
    pattern: "heap_priority_queue",
    difficulty: "hard",
    leetcode_id: 23,
    url: "https://leetcode.com/problems/merge-k-sorted-lists/",
    companies: ["amazon", "google", "meta"],
  },

  // ── Trees ───────────────────────────────────────────────────────────────
  {
    slug: "invert-binary-tree",
    title: "Invert Binary Tree",
    pattern: "trees",
    difficulty: "easy",
    leetcode_id: 226,
    url: "https://leetcode.com/problems/invert-binary-tree/",
    companies: ["google", "amazon", "meta"],
  },
  {
    slug: "maximum-depth-binary-tree",
    title: "Maximum Depth of Binary Tree",
    pattern: "trees",
    difficulty: "easy",
    leetcode_id: 104,
    url: "https://leetcode.com/problems/maximum-depth-of-binary-tree/",
    companies: ["amazon", "microsoft", "google"],
  },
  {
    slug: "validate-bst",
    title: "Validate Binary Search Tree",
    pattern: "trees",
    difficulty: "medium",
    leetcode_id: 98,
    url: "https://leetcode.com/problems/validate-binary-search-tree/",
    companies: ["microsoft", "amazon", "meta", "google"],
  },
  {
    slug: "lowest-common-ancestor-bst",
    title: "Lowest Common Ancestor of a BST",
    pattern: "trees",
    difficulty: "medium",
    leetcode_id: 235,
    url: "https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/",
    companies: ["amazon", "meta", "microsoft"],
  },
  {
    slug: "binary-tree-level-order-traversal",
    title: "Binary Tree Level Order Traversal",
    pattern: "trees",
    difficulty: "medium",
    leetcode_id: 102,
    url: "https://leetcode.com/problems/binary-tree-level-order-traversal/",
    companies: ["amazon", "microsoft", "google"],
  },
  {
    slug: "serialize-deserialize-binary-tree",
    title: "Serialize and Deserialize Binary Tree",
    pattern: "trees",
    difficulty: "hard",
    leetcode_id: 297,
    url: "https://leetcode.com/problems/serialize-and-deserialize-binary-tree/",
    companies: ["amazon", "google", "meta"],
  },

  // ── Tries ───────────────────────────────────────────────────────────────
  {
    slug: "implement-trie",
    title: "Implement Trie (Prefix Tree)",
    pattern: "tries",
    difficulty: "medium",
    leetcode_id: 208,
    url: "https://leetcode.com/problems/implement-trie-prefix-tree/",
    companies: ["amazon", "google", "microsoft"],
  },

  // ── Heaps ───────────────────────────────────────────────────────────────
  {
    slug: "kth-largest-element-stream",
    title: "Kth Largest Element in a Stream",
    pattern: "heap_priority_queue",
    difficulty: "easy",
    leetcode_id: 703,
    url: "https://leetcode.com/problems/kth-largest-element-in-a-stream/",
    companies: ["amazon", "meta"],
  },
  {
    slug: "find-median-data-stream",
    title: "Find Median from Data Stream",
    pattern: "heap_priority_queue",
    difficulty: "hard",
    leetcode_id: 295,
    url: "https://leetcode.com/problems/find-median-from-data-stream/",
    companies: ["amazon", "google", "meta"],
  },

  // ── Backtracking ────────────────────────────────────────────────────────
  {
    slug: "subsets",
    title: "Subsets",
    pattern: "backtracking",
    difficulty: "medium",
    leetcode_id: 78,
    url: "https://leetcode.com/problems/subsets/",
    companies: ["amazon", "meta"],
  },
  {
    slug: "permutations",
    title: "Permutations",
    pattern: "backtracking",
    difficulty: "medium",
    leetcode_id: 46,
    url: "https://leetcode.com/problems/permutations/",
    companies: ["amazon", "meta", "google"],
  },
  {
    slug: "word-search",
    title: "Word Search",
    pattern: "backtracking",
    difficulty: "medium",
    leetcode_id: 79,
    url: "https://leetcode.com/problems/word-search/",
    companies: ["amazon", "microsoft", "meta"],
  },

  // ── Graphs ──────────────────────────────────────────────────────────────
  {
    slug: "number-of-islands",
    title: "Number of Islands",
    pattern: "graphs",
    difficulty: "medium",
    leetcode_id: 200,
    url: "https://leetcode.com/problems/number-of-islands/",
    companies: ["amazon", "google", "meta", "microsoft"],
  },
  {
    slug: "clone-graph",
    title: "Clone Graph",
    pattern: "graphs",
    difficulty: "medium",
    leetcode_id: 133,
    url: "https://leetcode.com/problems/clone-graph/",
    companies: ["meta", "google"],
  },
  {
    slug: "rotting-oranges",
    title: "Rotting Oranges",
    pattern: "graphs",
    difficulty: "medium",
    leetcode_id: 994,
    url: "https://leetcode.com/problems/rotting-oranges/",
    companies: ["amazon", "google"],
  },
  {
    slug: "course-schedule",
    title: "Course Schedule",
    pattern: "graphs",
    difficulty: "medium",
    leetcode_id: 207,
    url: "https://leetcode.com/problems/course-schedule/",
    companies: ["amazon", "meta", "google"],
  },
  {
    slug: "word-ladder",
    title: "Word Ladder",
    pattern: "graphs",
    difficulty: "hard",
    leetcode_id: 127,
    url: "https://leetcode.com/problems/word-ladder/",
    companies: ["amazon", "google", "meta"],
  },

  // ── DP 1D ───────────────────────────────────────────────────────────────
  {
    slug: "climbing-stairs",
    title: "Climbing Stairs",
    pattern: "dp_1d",
    difficulty: "easy",
    leetcode_id: 70,
    url: "https://leetcode.com/problems/climbing-stairs/",
    companies: ["amazon", "microsoft", "google"],
  },
  {
    slug: "house-robber",
    title: "House Robber",
    pattern: "dp_1d",
    difficulty: "medium",
    leetcode_id: 198,
    url: "https://leetcode.com/problems/house-robber/",
    companies: ["amazon", "microsoft"],
  },
  {
    slug: "longest-increasing-subsequence",
    title: "Longest Increasing Subsequence",
    pattern: "dp_1d",
    difficulty: "medium",
    leetcode_id: 300,
    url: "https://leetcode.com/problems/longest-increasing-subsequence/",
    companies: ["google", "meta", "amazon"],
  },
  {
    slug: "coin-change",
    title: "Coin Change",
    pattern: "dp_1d",
    difficulty: "medium",
    leetcode_id: 322,
    url: "https://leetcode.com/problems/coin-change/",
    companies: ["amazon", "google", "razorpay"],
  },

  // ── DP 2D ───────────────────────────────────────────────────────────────
  {
    slug: "unique-paths",
    title: "Unique Paths",
    pattern: "dp_2d",
    difficulty: "medium",
    leetcode_id: 62,
    url: "https://leetcode.com/problems/unique-paths/",
    companies: ["amazon", "google"],
  },
  {
    slug: "longest-common-subsequence",
    title: "Longest Common Subsequence",
    pattern: "dp_2d",
    difficulty: "medium",
    leetcode_id: 1143,
    url: "https://leetcode.com/problems/longest-common-subsequence/",
    companies: ["amazon", "google", "meta"],
  },
  {
    slug: "edit-distance",
    title: "Edit Distance",
    pattern: "dp_2d",
    difficulty: "hard",
    leetcode_id: 72,
    url: "https://leetcode.com/problems/edit-distance/",
    companies: ["amazon", "google"],
  },

  // ── Greedy ──────────────────────────────────────────────────────────────
  {
    slug: "jump-game",
    title: "Jump Game",
    pattern: "greedy",
    difficulty: "medium",
    leetcode_id: 55,
    url: "https://leetcode.com/problems/jump-game/",
    companies: ["amazon", "microsoft"],
  },
  {
    slug: "gas-station",
    title: "Gas Station",
    pattern: "greedy",
    difficulty: "medium",
    leetcode_id: 134,
    url: "https://leetcode.com/problems/gas-station/",
    companies: ["amazon", "google"],
  },

  // ── Intervals ───────────────────────────────────────────────────────────
  {
    slug: "merge-intervals",
    title: "Merge Intervals",
    pattern: "intervals",
    difficulty: "medium",
    leetcode_id: 56,
    url: "https://leetcode.com/problems/merge-intervals/",
    companies: ["amazon", "google", "meta", "microsoft"],
  },
  {
    slug: "insert-interval",
    title: "Insert Interval",
    pattern: "intervals",
    difficulty: "medium",
    leetcode_id: 57,
    url: "https://leetcode.com/problems/insert-interval/",
    companies: ["google", "amazon"],
  },
  {
    slug: "non-overlapping-intervals",
    title: "Non-overlapping Intervals",
    pattern: "intervals",
    difficulty: "medium",
    leetcode_id: 435,
    url: "https://leetcode.com/problems/non-overlapping-intervals/",
    companies: ["amazon", "google"],
  },

  // ── Bit manipulation ───────────────────────────────────────────────────
  {
    slug: "number-of-1-bits",
    title: "Number of 1 Bits",
    pattern: "bit_manipulation",
    difficulty: "easy",
    leetcode_id: 191,
    url: "https://leetcode.com/problems/number-of-1-bits/",
    companies: ["amazon", "apple"],
  },
  {
    slug: "missing-number",
    title: "Missing Number",
    pattern: "bit_manipulation",
    difficulty: "easy",
    leetcode_id: 268,
    url: "https://leetcode.com/problems/missing-number/",
    companies: ["amazon", "microsoft"],
  },
] as const;

export const DSA_PATTERNS_DISPLAY: Record<DsaPattern, string> = {
  arrays_hashing:      "Arrays & Hashing",
  two_pointers:        "Two Pointers",
  sliding_window:      "Sliding Window",
  stack_queue:         "Stack / Queue",
  binary_search:       "Binary Search",
  linked_list:         "Linked List",
  trees:               "Trees",
  tries:               "Tries",
  heap_priority_queue: "Heap / Priority Queue",
  backtracking:        "Backtracking",
  graphs:              "Graphs",
  dp_1d:               "Dynamic Programming · 1D",
  dp_2d:               "Dynamic Programming · 2D",
  greedy:              "Greedy",
  intervals:           "Intervals",
  math_geometry:       "Math / Geometry",
  bit_manipulation:    "Bit Manipulation",
};

export function getDsaProblemBySlug(slug: string): DsaProblem | undefined {
  return DSA_CATALOG.find((p) => p.slug === slug);
}

/**
 * Pick the next problem for a user given their gap areas and history.
 *
 * Strategy (deterministic):
 *   1. Score each problem by:
 *      +3 if its pattern is in the candidate's weak-pattern list
 *      +2 if its companies list includes the candidate's target companies
 *      -10 if the user has solved this slug in the last `recencyDays` days
 *   2. Tie-break by lowest current difficulty until the user has solved >=5
 *      problems, then prefer medium over easy.
 *   3. If multiple still tie, choose by alphabetical slug order — keeps
 *      "today's pick" stable across page refreshes within the same day.
 */
export function pickNextDsaProblem(input: {
  weakPatterns: DsaPattern[];
  targetCompanies: string[];
  recentSlugs: Set<string>;
  solvedCount: number;
}): DsaProblem | null {
  const weakSet = new Set(input.weakPatterns);
  const companySet = new Set(input.targetCompanies);
  const candidates = DSA_CATALOG.map((p) => {
    let score = 0;
    if (weakSet.has(p.pattern)) score += 3;
    if (p.companies.some((c) => companySet.has(c))) score += 2;
    if (input.recentSlugs.has(p.slug)) score -= 10;
    if (input.solvedCount >= 5 && p.difficulty === "medium") score += 1;
    if (input.solvedCount >= 15 && p.difficulty === "hard") score += 1;
    if (input.solvedCount < 5 && p.difficulty === "easy") score += 2;
    return { problem: p, score };
  });
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.problem.slug.localeCompare(b.problem.slug);
  });
  const top = candidates[0];
  if (!top || top.score <= -10) return null;
  return top.problem;
}
