// DSA v2 — Batch 004 (25 questions).
//
// Broadens pattern coverage (first backtracking set, multi-source BFS,
// min-window, LCS, merge-k, bounded-hop shortest path) and lifts the hard
// count toward the 50/30/20 target.
// Composition: 21 pure_dsa + 3 ai_applied + 1 indian_domain.
// Difficulty mix: 11 easy / 9 medium / 5 hard.
//
// All status = "pending_review" — admin must approve each before live.

import type { DsaV2Question } from "../types";

export const BATCH_004: readonly DsaV2Question[] = [
  // ──────────────────────────────────────────────────────────────────────
  // 56 — pure_dsa · arrays_hashing · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "majority-flag-vote",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 4,
    pattern: "arrays_hashing",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer", "platform_engineer"],
    title: "Majority Flag Vote",
    framing:
      "A feature-flag service tallies votes from every running pod to decide a single rollout value. Exactly one value won an outright majority — it appears in more than half of the votes. Find it.",
    statement:
      "Given an array of integer votes where one value occurs more than ⌊n/2⌋ times, return that majority value.",
    inputFormat: "An array votes of length n (1 ≤ n ≤ 10^5), values in [-10^9, 10^9].",
    outputFormat: "A single integer — the majority value.",
    constraints: [
      "1 ≤ n ≤ 100,000",
      "A majority element is guaranteed to exist",
      "Aim for O(1) extra space",
    ],
    examples: [
      {
        input: "votes = [3, 3, 4, 3, 2, 3, 3]",
        output: "3",
        explanation: "3 appears 5 times out of 7, which is more than ⌊7/2⌋ = 3.",
      },
      {
        input: "votes = [9, 9, 9]",
        output: "9",
        explanation: "Single distinct value, trivially the majority.",
      },
    ],
    approach: [
      "A hash map of counts works in O(n) time and O(n) space.",
      "Boyer-Moore voting does it in O(1) space: keep a candidate and a counter.",
      "When the counter hits zero, adopt the current value as the new candidate.",
      "Because the majority value occupies > n/2 slots, it survives all cancellations.",
    ],
    solutionSteps: [
      "Initialise candidate = None, count = 0.",
      "For each vote: if count == 0, set candidate = vote.",
      "Increment count when vote == candidate, else decrement.",
      "The candidate left standing is the majority value.",
      "One pass, constant space.",
    ],
    code: {
      python: `def majority_vote(votes: list[int]) -> int:
    candidate = None
    count = 0
    for v in votes:
        if count == 0:
            candidate = v
        count += 1 if v == candidate else -1
    return candidate
`,
      java: `public final class MajorityFlagVote {
    public static int majorityVote(int[] votes) {
        Integer candidate = null;
        int count = 0;
        for (int v : votes) {
            if (count == 0) candidate = v;
            count += (v == candidate) ? 1 : -1;
        }
        return candidate;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int majorityVote(const vector<int>& votes) {
    long long candidate = 0;
    int count = 0;
    for (int v : votes) {
        if (count == 0) candidate = v;
        count += (v == candidate) ? 1 : -1;
    }
    return (int)candidate;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Forgetting to reset the candidate when count returns to zero.",
      "Assuming the survivor is always the majority even when no majority exists — that only holds because the problem guarantees one.",
    ],
    edgeCases: [
      "Single-element array — that element is the majority.",
      "All elements identical.",
      "Majority value clustered at the end of the array.",
    ],
    whyItMatters:
      "Boyer-Moore voting is the textbook example of trading a hash map for an O(1)-space invariant. Interviewers use it to see whether you can spot a counting trick beyond the obvious frequency map.",
    estimatedMinutes: 12,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 57 — pure_dsa · bit_manipulation · easy · devops_sre
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "lone-sensor-reading",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 4,
    pattern: "bit_manipulation",
    difficulty: "easy",
    primaryRole: "devops_sre",
    roles: ["devops_sre", "backend_engineer", "software_engineer"],
    title: "Lone Sensor Reading",
    framing:
      "Every sensor in a redundant rack reports its reading twice for fault tolerance — except one sensor whose duplicate packet was dropped. Given all received readings, identify the single un-paired reading using constant memory.",
    statement:
      "Given an array where every value appears exactly twice except for one value that appears once, return the single value.",
    inputFormat: "An array nums of length n (n odd, 1 ≤ n ≤ 10^5), values in [0, 10^9].",
    outputFormat: "A single integer — the value that appears once.",
    constraints: [
      "n is odd; exactly one value is un-paired",
      "Every other value appears exactly twice",
      "Use O(1) extra space",
    ],
    examples: [
      {
        input: "nums = [4, 1, 2, 1, 2]",
        output: "4",
        explanation: "1 and 2 each appear twice; 4 is the lone reading.",
      },
      {
        input: "nums = [7]",
        output: "7",
        explanation: "A single reading is trivially un-paired.",
      },
    ],
    approach: [
      "XOR is its own inverse: x ^ x == 0, and x ^ 0 == x.",
      "XOR-ing every value cancels each duplicated pair to zero.",
      "What remains is the single un-paired value.",
      "Order does not matter — XOR is commutative and associative.",
    ],
    solutionSteps: [
      "Initialise acc = 0.",
      "XOR acc with every element in the array.",
      "Paired values cancel; the lone value survives.",
      "Return acc.",
      "One pass, constant space.",
    ],
    code: {
      python: `def lone_reading(nums: list[int]) -> int:
    acc = 0
    for x in nums:
        acc ^= x
    return acc
`,
      java: `public final class LoneSensorReading {
    public static int loneReading(int[] nums) {
        int acc = 0;
        for (int x : nums) acc ^= x;
        return acc;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int loneReading(const vector<int>& nums) {
    int acc = 0;
    for (int x : nums) acc ^= x;
    return acc;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Reaching for a hash set when XOR solves it in constant space.",
      "Assuming the array is sorted — XOR does not require it.",
    ],
    edgeCases: [
      "Single element — returned directly.",
      "Lone value equal to zero — XOR still yields 0 correctly.",
      "Large values near 10^9 — fits in a 32-bit int.",
    ],
    whyItMatters:
      "The XOR-cancellation trick is a rite of passage. It signals you understand bitwise identities well enough to replace O(n) memory with an algebraic invariant.",
    estimatedMinutes: 12,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 58 — pure_dsa · two_pointers · easy · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "merge-sorted-leaderboards",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 4,
    pattern: "two_pointers",
    difficulty: "easy",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer", "software_engineer"],
    title: "Merge Sorted Leaderboards",
    framing:
      "Two regional leaderboards are each already sorted by score ascending. A global view needs them merged into one sorted list without re-sorting from scratch.",
    statement:
      "Given two arrays a and b, each sorted in non-decreasing order, return a single non-decreasing array containing all their elements.",
    inputFormat: "Arrays a (length m) and b (length n), 0 ≤ m, n ≤ 10^5, values in [-10^9, 10^9].",
    outputFormat: "A merged array of length m + n in non-decreasing order.",
    constraints: [
      "Both inputs are already sorted ascending",
      "0 ≤ m, n ≤ 100,000",
      "Do it in O(m + n) without a full re-sort",
    ],
    examples: [
      {
        input: "a = [1, 4, 7], b = [2, 3, 9]",
        output: "[1, 2, 3, 4, 7, 9]",
        explanation: "Two pointers advance through a and b, always emitting the smaller front element.",
      },
      {
        input: "a = [], b = [5]",
        output: "[5]",
        explanation: "One side empty — append the remainder of the other.",
      },
    ],
    approach: [
      "Keep an index into each array, both starting at 0.",
      "Compare the two front elements and emit the smaller, advancing that pointer.",
      "When one array is exhausted, append the rest of the other.",
      "Each element is visited exactly once.",
    ],
    solutionSteps: [
      "Initialise i = 0, j = 0 and an empty result list.",
      "While both i < m and j < n, append the smaller of a[i], b[j] and advance its pointer.",
      "Append any remaining tail of a, then of b.",
      "Return the result.",
      "Linear in the combined length.",
    ],
    code: {
      python: `def merge_sorted(a: list[int], b: list[int]) -> list[int]:
    i = j = 0
    out: list[int] = []
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i]); i += 1
        else:
            out.append(b[j]); j += 1
    out.extend(a[i:])
    out.extend(b[j:])
    return out
`,
      java: `import java.util.*;

public final class MergeSortedLeaderboards {
    public static int[] merge(int[] a, int[] b) {
        int[] out = new int[a.length + b.length];
        int i = 0, j = 0, k = 0;
        while (i < a.length && j < b.length)
            out[k++] = (a[i] <= b[j]) ? a[i++] : b[j++];
        while (i < a.length) out[k++] = a[i++];
        while (j < b.length) out[k++] = b[j++];
        return out;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> merge(const vector<int>& a, const vector<int>& b) {
    vector<int> out;
    out.reserve(a.size() + b.size());
    size_t i = 0, j = 0;
    while (i < a.size() && j < b.size())
        out.push_back(a[i] <= b[j] ? a[i++] : b[j++]);
    while (i < a.size()) out.push_back(a[i++]);
    while (j < b.size()) out.push_back(b[j++]);
    return out;
}
`,
    },
    complexity: { time: "O(m + n)", space: "O(m + n)" },
    pitfalls: [
      "Concatenating then sorting — that is O((m+n) log(m+n)) and wastes the pre-sorted property.",
      "Forgetting to drain the leftover tail of the longer array.",
    ],
    edgeCases: [
      "One or both arrays empty.",
      "Arrays with overlapping equal values — stable handling via <=.",
      "Very different lengths.",
    ],
    whyItMatters:
      "The merge step is the heart of merge sort and external sorting of data that does not fit in memory. Mastering the two-pointer merge underpins every divide-and-conquer sort.",
    estimatedMinutes: 13,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 59 — pure_dsa · arrays_hashing · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "duplicate-within-k-events",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 4,
    pattern: "arrays_hashing",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer", "data_engineer"],
    title: "Duplicate Within K Events",
    framing:
      "An event pipeline tolerates the same event ID reappearing, but a true duplicate within a short window of k events signals a retry storm worth flagging. Decide whether any value repeats within k positions of itself.",
    statement:
      "Given an array nums and an integer k, return true if there exist two indices i and j such that nums[i] == nums[j] and |i - j| ≤ k.",
    inputFormat: "An array nums of length n (1 ≤ n ≤ 10^5) and integer k (0 ≤ k ≤ n).",
    outputFormat: "A boolean — true if a near-duplicate exists within distance k.",
    constraints: [
      "1 ≤ n ≤ 100,000",
      "0 ≤ k ≤ n",
      "Values in [-10^9, 10^9]",
    ],
    examples: [
      {
        input: "nums = [1, 2, 3, 1], k = 3",
        output: "true",
        explanation: "The two 1s are at indices 0 and 3, a distance of 3 which is ≤ k.",
      },
      {
        input: "nums = [1, 2, 3, 1, 2], k = 1",
        output: "false",
        explanation: "Each repeated value is 3 apart, exceeding k = 1.",
      },
    ],
    approach: [
      "Maintain a sliding window of the last k indices as a hash set.",
      "Before adding the current value, check whether it is already in the set.",
      "Evict the element that falls out of the window (index i - k - 1).",
      "A hit inside the window means a near-duplicate exists.",
    ],
    solutionSteps: [
      "Create an empty set window.",
      "Iterate index i over nums.",
      "If nums[i] is in window, return true.",
      "Add nums[i]; if the set size exceeds k, remove nums[i - k].",
      "If the loop ends with no hit, return false.",
    ],
    code: {
      python: `def near_duplicate(nums: list[int], k: int) -> bool:
    window: set[int] = set()
    for i, x in enumerate(nums):
        if x in window:
            return True
        window.add(x)
        if len(window) > k:
            window.discard(nums[i - k])
    return False
`,
      java: `import java.util.*;

public final class DuplicateWithinKEvents {
    public static boolean nearDuplicate(int[] nums, int k) {
        Set<Integer> window = new HashSet<>();
        for (int i = 0; i < nums.length; i++) {
            if (window.contains(nums[i])) return true;
            window.add(nums[i]);
            if (window.size() > k) window.remove(nums[i - k]);
        }
        return false;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

bool nearDuplicate(const vector<int>& nums, int k) {
    unordered_set<int> window;
    for (int i = 0; i < (int)nums.size(); i++) {
        if (window.count(nums[i])) return true;
        window.insert(nums[i]);
        if ((int)window.size() > k) window.erase(nums[i - k]);
    }
    return false;
}
`,
    },
    complexity: { time: "O(n)", space: "O(min(n, k))" },
    pitfalls: [
      "Comparing all pairs in O(n·k) — fine for tiny k but quadratic in the worst case.",
      "Off-by-one when evicting: the element leaving the window is at index i - k, not i - k - 1, once the size already exceeds k.",
      "k = 0 should always return false — no two distinct indices are within distance 0.",
    ],
    edgeCases: [
      "k = 0 — never true.",
      "All identical values — true whenever k ≥ 1.",
      "No duplicates at all — false.",
    ],
    whyItMatters:
      "Sliding a bounded set is the simplest form of windowed deduplication, the same idea behind rate-limit and retry-storm detection in real pipelines.",
    estimatedMinutes: 14,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 60 — pure_dsa · sliding_window · easy · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-average-rating-window",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 4,
    pattern: "sliding_window",
    difficulty: "easy",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer", "software_engineer"],
    title: "Max Average Rating Window",
    framing:
      "A reviews dashboard surfaces the best stretch of k consecutive days by total rating. Because the window length is fixed, the highest total also gives the highest average — find that maximum window sum.",
    statement:
      "Given an array ratings and an integer k, return the maximum sum of any contiguous window of exactly k elements.",
    inputFormat: "An array ratings of length n (1 ≤ k ≤ n ≤ 10^5), values in [-10^4, 10^4].",
    outputFormat: "A single integer — the maximum window sum.",
    constraints: [
      "1 ≤ k ≤ n ≤ 100,000",
      "Values may be negative",
      "Window length is exactly k",
    ],
    examples: [
      {
        input: "ratings = [1, 12, -5, -6, 50, 3], k = 4",
        output: "51",
        explanation: "The window [12, -5, -6, 50] sums to 51, the largest among all length-4 windows.",
      },
      {
        input: "ratings = [5], k = 1",
        output: "5",
        explanation: "Only one window exists.",
      },
    ],
    approach: [
      "Compute the sum of the first k elements as the initial window.",
      "Slide the window one step at a time: add the entering element, subtract the leaving one.",
      "Track the running maximum across all window positions.",
      "Each element enters and leaves the window once — linear time.",
    ],
    solutionSteps: [
      "Sum ratings[0..k-1] into windowSum and set best = windowSum.",
      "For i from k to n-1: windowSum += ratings[i] - ratings[i-k].",
      "Update best = max(best, windowSum).",
      "Return best.",
      "O(n) time, O(1) space.",
    ],
    code: {
      python: `def max_window_sum(ratings: list[int], k: int) -> int:
    window = sum(ratings[:k])
    best = window
    for i in range(k, len(ratings)):
        window += ratings[i] - ratings[i - k]
        best = max(best, window)
    return best
`,
      java: `public final class MaxAverageRatingWindow {
    public static int maxWindowSum(int[] ratings, int k) {
        int window = 0;
        for (int i = 0; i < k; i++) window += ratings[i];
        int best = window;
        for (int i = k; i < ratings.length; i++) {
            window += ratings[i] - ratings[i - k];
            best = Math.max(best, window);
        }
        return best;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int maxWindowSum(const vector<int>& ratings, int k) {
    int window = 0;
    for (int i = 0; i < k; i++) window += ratings[i];
    int best = window;
    for (int i = k; i < (int)ratings.size(); i++) {
        window += ratings[i] - ratings[i - k];
        best = max(best, window);
    }
    return best;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Recomputing the window sum from scratch each step — that is O(n·k).",
      "Initialising best to 0 instead of the first window — breaks when all values are negative.",
    ],
    edgeCases: [
      "k equals n — a single window covering everything.",
      "All-negative ratings — best is the least-negative window.",
      "k = 1 — reduces to the maximum element.",
    ],
    whyItMatters:
      "Fixed-size sliding window with an incremental sum is the canonical O(n) optimisation over the naive recompute. It is the warm-up for every variable-window problem.",
    estimatedMinutes: 13,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 61 — pure_dsa · binary_search · easy · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "leaderboard-insert-rank",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 4,
    pattern: "binary_search",
    difficulty: "easy",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer", "data_engineer"],
    title: "Leaderboard Insert Rank",
    framing:
      "A leaderboard keeps scores sorted ascending. When a new score arrives, the UI needs the index where it would slot in so it can animate the row into place — without re-sorting the whole board.",
    statement:
      "Given a sorted array scores and a target value, return the index at which target should be inserted to keep the array sorted. If target already exists, return the index of its first occurrence.",
    inputFormat: "A sorted array scores of length n (0 ≤ n ≤ 10^5) and integer target.",
    outputFormat: "A single integer — the insertion index in [0, n].",
    constraints: [
      "scores is sorted in non-decreasing order",
      "0 ≤ n ≤ 100,000",
      "Values in [-10^9, 10^9]",
    ],
    examples: [
      {
        input: "scores = [1, 3, 5, 6], target = 5",
        output: "2",
        explanation: "5 is already present at index 2.",
      },
      {
        input: "scores = [1, 3, 5, 6], target = 2",
        output: "1",
        explanation: "2 belongs between 1 and 3, at index 1.",
      },
    ],
    approach: [
      "This is the lower-bound binary search: the first index whose value is ≥ target.",
      "Keep a half-open search range [lo, hi) starting as [0, n).",
      "Narrow by comparing the midpoint value with target.",
      "lo converges to the insertion index.",
    ],
    solutionSteps: [
      "Set lo = 0, hi = n.",
      "While lo < hi, mid = (lo + hi) / 2.",
      "If scores[mid] < target, set lo = mid + 1, else hi = mid.",
      "Return lo.",
      "O(log n) time.",
    ],
    code: {
      python: `def insert_rank(scores: list[int], target: int) -> int:
    lo, hi = 0, len(scores)
    while lo < hi:
        mid = (lo + hi) // 2
        if scores[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo
`,
      java: `public final class LeaderboardInsertRank {
    public static int insertRank(int[] scores, int target) {
        int lo = 0, hi = scores.length;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (scores[mid] < target) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int insertRank(const vector<int>& scores, int target) {
    int lo = 0, hi = (int)scores.size();
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (scores[mid] < target) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}
`,
    },
    complexity: { time: "O(log n)", space: "O(1)" },
    pitfalls: [
      "Using a closed range [lo, hi] and getting the termination condition wrong.",
      "Computing mid as (lo + hi) / 2 in languages where that can overflow — prefer lo + (hi - lo) / 2.",
      "Returning the first index strictly greater than target (upper bound) instead of ≥ (lower bound).",
    ],
    edgeCases: [
      "Empty array — insertion index 0.",
      "Target smaller than all elements — index 0.",
      "Target larger than all elements — index n.",
    ],
    whyItMatters:
      "Lower-bound binary search is the building block of ordered inserts, range queries, and the std::lower_bound / bisect functions every language ships. Getting the half-open invariant right is the skill being tested.",
    estimatedMinutes: 13,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 62 — pure_dsa · linked_list · easy · mobile_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "reverse-playlist-order",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 4,
    pattern: "linked_list",
    difficulty: "easy",
    primaryRole: "mobile_engineer",
    roles: ["mobile_engineer", "frontend_engineer", "software_engineer"],
    title: "Reverse Playlist Order",
    framing:
      "A music app stores the current playlist as a singly linked list of tracks. The user taps 'reverse order' — flip the list in place so the last track becomes the head.",
    statement:
      "Given the head of a singly linked list, reverse it and return the new head.",
    inputFormat: "The head of a list with n nodes (0 ≤ n ≤ 10^5); shown as the value sequence.",
    outputFormat: "The reversed value sequence.",
    constraints: [
      "0 ≤ n ≤ 100,000",
      "Reverse in place — O(1) extra space",
      "Node values fit in a 32-bit int",
    ],
    examples: [
      {
        input: "head = [1, 2, 3, 4, 5]",
        output: "[5, 4, 3, 2, 1]",
        explanation: "Each next pointer is flipped to point at the previous node.",
      },
      {
        input: "head = [1]",
        output: "[1]",
        explanation: "A single node reverses to itself.",
      },
    ],
    approach: [
      "Walk the list with three references: prev, curr, and the saved next.",
      "At each node, redirect curr.next to prev.",
      "Advance prev and curr forward one step.",
      "When curr becomes null, prev is the new head.",
    ],
    solutionSteps: [
      "Initialise prev = null, curr = head.",
      "While curr is not null: save nxt = curr.next.",
      "Set curr.next = prev; move prev = curr, curr = nxt.",
      "Return prev as the new head.",
      "One pass, constant extra space.",
    ],
    code: {
      python: `class ListNode:
    def __init__(self, val: int = 0, nxt: "ListNode | None" = None):
        self.val = val
        self.next = nxt

def reverse_list(head: ListNode | None) -> ListNode | None:
    prev = None
    curr = head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev
`,
      java: `public final class ReversePlaylistOrder {
    public static class ListNode {
        int val; ListNode next;
        ListNode(int val) { this.val = val; }
    }
    public static ListNode reverse(ListNode head) {
        ListNode prev = null, curr = head;
        while (curr != null) {
            ListNode nxt = curr.next;
            curr.next = prev;
            prev = curr;
            curr = nxt;
        }
        return prev;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v) : val(v), next(nullptr) {}
};

ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    ListNode* curr = head;
    while (curr) {
        ListNode* nxt = curr->next;
        curr->next = prev;
        prev = curr;
        curr = nxt;
    }
    return prev;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Losing the rest of the list by reassigning curr.next before saving curr.next.",
      "Returning head instead of prev — head is now the tail.",
      "Recursing without realising it costs O(n) stack space.",
    ],
    edgeCases: [
      "Empty list — return null.",
      "Single node — returns itself.",
      "Two nodes — pointers simply swap.",
    ],
    whyItMatters:
      "In-place list reversal is the most-asked linked-list manipulation. The three-pointer dance is a prerequisite for reversing sublists, k-group reversal, and palindrome checks.",
    estimatedMinutes: 14,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 63 — pure_dsa · trees · easy · frontend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "ui-layout-mirror-check",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 4,
    pattern: "trees",
    difficulty: "easy",
    primaryRole: "frontend_engineer",
    roles: ["frontend_engineer", "full_stack_engineer", "software_engineer"],
    title: "UI Layout Mirror Check",
    framing:
      "A design-system linter verifies that a component's layout tree is a perfect left-right mirror of itself — the visual hallmark of a balanced, symmetric card. Given the layout tree, decide whether it is mirror-symmetric.",
    statement:
      "Given the root of a binary tree, return true if it is a mirror image of itself around its centre.",
    inputFormat: "The root of a tree with n nodes (0 ≤ n ≤ 10^4), shown in level order with null for missing children.",
    outputFormat: "A boolean — true if the tree is symmetric.",
    constraints: [
      "0 ≤ n ≤ 10,000",
      "Node values fit in a 32-bit int",
      "An empty tree is symmetric",
    ],
    examples: [
      {
        input: "root = [1, 2, 2, 3, 4, 4, 3]",
        output: "true",
        explanation: "The left subtree is the mirror of the right subtree at every level.",
      },
      {
        input: "root = [1, 2, 2, null, 3, null, 3]",
        output: "false",
        explanation: "The dangling 3s sit on the same side, breaking the mirror.",
      },
    ],
    approach: [
      "Symmetry is a property of two subtrees being mirrors of each other.",
      "Compare the left subtree against the right subtree in mirrored order.",
      "Two nodes mirror when their values match and left↔right children mirror.",
      "Recurse, or use an explicit queue pairing mirrored nodes.",
    ],
    solutionSteps: [
      "If root is null, return true.",
      "Define mirror(a, b): both null → true; one null → false.",
      "Otherwise a.val == b.val AND mirror(a.left, b.right) AND mirror(a.right, b.left).",
      "Return mirror(root.left, root.right).",
      "Each node is visited once — O(n).",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val: int = 0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def is_symmetric(root: TreeNode | None) -> bool:
    def mirror(a, b):
        if a is None and b is None:
            return True
        if a is None or b is None:
            return False
        return a.val == b.val and mirror(a.left, b.right) and mirror(a.right, b.left)
    return root is None or mirror(root.left, root.right)
`,
      java: `public final class UiLayoutMirrorCheck {
    public static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
    }
    public static boolean isSymmetric(TreeNode root) {
        return root == null || mirror(root.left, root.right);
    }
    private static boolean mirror(TreeNode a, TreeNode b) {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;
        return a.val == b.val && mirror(a.left, b.right) && mirror(a.right, b.left);
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

bool mirror(TreeNode* a, TreeNode* b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a->val == b->val && mirror(a->left, b->right) && mirror(a->right, b->left);
}

bool isSymmetric(TreeNode* root) {
    return !root || mirror(root->left, root->right);
}
`,
    },
    complexity: { time: "O(n)", space: "O(h)" },
    pitfalls: [
      "Checking value equality only, forgetting structural shape via the null cases.",
      "Comparing left-with-left instead of the mirrored left-with-right.",
      "Confusing 'symmetric' with 'identical subtrees' — the children are crossed.",
    ],
    edgeCases: [
      "Empty tree — symmetric.",
      "Single node — symmetric.",
      "Same values but asymmetric structure — must return false.",
    ],
    whyItMatters:
      "Mirror comparison teaches paired tree recursion — advancing two pointers through a structure in opposite directions, the same shape as same-tree and subtree-match problems.",
    estimatedMinutes: 15,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 64 — pure_dsa · math_geometry · easy · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "retry-loop-detect",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 4,
    pattern: "math_geometry",
    difficulty: "easy",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer", "devops_sre"],
    title: "Retry Loop Detect",
    framing:
      "A toy backoff scheme repeatedly replaces a retry counter with the sum of the squares of its digits. Some starting counters eventually settle at 1 (the retry succeeds); others spin forever in a cycle. Decide which fate a given start meets.",
    statement:
      "Starting from a positive integer n, repeatedly replace it with the sum of the squares of its digits. Return true if the process reaches 1, false if it loops endlessly.",
    inputFormat: "A single integer n (1 ≤ n ≤ 2^31 - 1).",
    outputFormat: "A boolean — true if n reaches 1.",
    constraints: [
      "1 ≤ n ≤ 2^31 - 1",
      "The sequence either reaches 1 or enters a cycle",
      "Use O(1) extra space if possible",
    ],
    examples: [
      {
        input: "n = 19",
        output: "true",
        explanation: "1²+9²=82 → 8²+2²=68 → 6²+8²=100 → 1²+0²+0²=1.",
      },
      {
        input: "n = 2",
        output: "false",
        explanation: "2 → 4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4, which cycles without ever reaching 1.",
      },
    ],
    approach: [
      "The sequence is a linked list of numbers; reaching 1 vs. looping is cycle detection.",
      "Use Floyd's tortoise-and-hare: a slow pointer and a fast pointer over the transform.",
      "If they meet at 1, it terminates; if they meet elsewhere, there is a cycle.",
      "Alternatively, a hash set of seen values detects repetition in O(1)-bounded space (digit-square sums shrink quickly).",
    ],
    solutionSteps: [
      "Define next(x) = sum of squares of x's digits.",
      "Run slow = next(n) and fast = next(next(n)).",
      "Advance slow by one step and fast by two until they meet.",
      "Return true if the meeting value is 1, else false.",
      "Constant extra space.",
    ],
    code: {
      python: `def is_happy(n: int) -> bool:
    def nxt(x: int) -> int:
        total = 0
        while x:
            d = x % 10
            total += d * d
            x //= 10
        return total
    slow, fast = n, nxt(n)
    while fast != 1 and slow != fast:
        slow = nxt(slow)
        fast = nxt(nxt(fast))
    return fast == 1
`,
      java: `public final class RetryLoopDetect {
    private static int nxt(int x) {
        int total = 0;
        while (x > 0) { int d = x % 10; total += d * d; x /= 10; }
        return total;
    }
    public static boolean isHappy(int n) {
        int slow = n, fast = nxt(n);
        while (fast != 1 && slow != fast) {
            slow = nxt(slow);
            fast = nxt(nxt(fast));
        }
        return fast == 1;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int nxt(int x) {
    int total = 0;
    while (x > 0) { int d = x % 10; total += d * d; x /= 10; }
    return total;
}

bool isHappy(int n) {
    int slow = n, fast = nxt(n);
    while (fast != 1 && slow != fast) {
        slow = nxt(slow);
        fast = nxt(nxt(fast));
    }
    return fast == 1;
}
`,
    },
    complexity: { time: "O(log n) per step, bounded total", space: "O(1)" },
    pitfalls: [
      "Looping forever without any cycle guard — unhappy numbers never reach 1.",
      "Initialising slow and fast to the same value so the while loop exits immediately.",
      "Integer overflow is not a concern here because digit-square sums collapse below ~243 within one step for any 32-bit input.",
    ],
    edgeCases: [
      "n = 1 — already happy, returns true.",
      "n = 7 — happy (7→49→97→130→10→1).",
      "Single-digit unhappy values like 2.",
    ],
    whyItMatters:
      "It reframes a number-theory puzzle as cycle detection, showing that Floyd's algorithm applies to any deterministic state transition, not just linked lists.",
    estimatedMinutes: 14,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 65 — pure_dsa · arrays_hashing · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "single-trade-profit",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 4,
    pattern: "arrays_hashing",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer", "software_engineer"],
    title: "Single Trade Profit",
    framing:
      "A pricing dashboard plots an asset's daily close. A simulator offers one buy and one later sell — report the maximum profit a single round trip could have captured, or zero if prices only fell.",
    statement:
      "Given an array prices where prices[i] is the price on day i, return the maximum profit from buying on one day and selling on a later day. If no profit is possible, return 0.",
    inputFormat: "An array prices of length n (1 ≤ n ≤ 10^5), values in [0, 10^9].",
    outputFormat: "A single integer — the maximum achievable profit.",
    constraints: [
      "1 ≤ n ≤ 100,000",
      "Sell day must be strictly after buy day",
      "Return 0 if prices are non-increasing",
    ],
    examples: [
      {
        input: "prices = [7, 1, 5, 3, 6, 4]",
        output: "5",
        explanation: "Buy at 1 (day 1), sell at 6 (day 4): profit 5.",
      },
      {
        input: "prices = [7, 6, 4, 3, 1]",
        output: "0",
        explanation: "Prices only fall, so the best move is not to trade.",
      },
    ],
    approach: [
      "Track the minimum price seen so far as you scan left to right.",
      "At each day, the best sale today is price − minSoFar.",
      "Keep the running maximum of those differences.",
      "One pass — no need to test every pair.",
    ],
    solutionSteps: [
      "Initialise minPrice = prices[0], best = 0.",
      "For each price p: update best = max(best, p - minPrice).",
      "Then update minPrice = min(minPrice, p).",
      "Return best.",
      "O(n) time, O(1) space.",
    ],
    code: {
      python: `def max_profit(prices: list[int]) -> int:
    min_price = prices[0]
    best = 0
    for p in prices:
        best = max(best, p - min_price)
        min_price = min(min_price, p)
    return best
`,
      java: `public final class SingleTradeProfit {
    public static int maxProfit(int[] prices) {
        int minPrice = prices[0], best = 0;
        for (int p : prices) {
            best = Math.max(best, p - minPrice);
            minPrice = Math.min(minPrice, p);
        }
        return best;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int maxProfit(const vector<int>& prices) {
    int minPrice = prices[0], best = 0;
    for (int p : prices) {
        best = max(best, p - minPrice);
        minPrice = min(minPrice, p);
    }
    return best;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Comparing all pairs in O(n²).",
      "Updating minPrice before computing the profit for the current day, which would allow a same-day buy and sell.",
      "Returning a negative number instead of clamping to 0.",
    ],
    edgeCases: [
      "Single day — profit 0.",
      "Strictly increasing prices — profit is last minus first.",
      "Strictly decreasing prices — profit 0.",
    ],
    whyItMatters:
      "The 'best so far + current candidate' scan is the seed of dynamic programming. This problem is the gateway to the whole family of buy-sell-stock variants.",
    estimatedMinutes: 13,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 66 — pure_dsa · stack_queue · easy · frontend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "balanced-bracket-depth",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 4,
    pattern: "stack_queue",
    difficulty: "easy",
    primaryRole: "frontend_engineer",
    roles: ["frontend_engineer", "full_stack_engineer", "software_engineer"],
    title: "Balanced Bracket Depth",
    framing:
      "A formula editor colour-codes nested parentheses by depth. Given a valid expression string, report the deepest level of nesting so the renderer knows how many colours to cycle through.",
    statement:
      "Given a string s containing a valid parenthesisation (and other characters), return the maximum nesting depth of the parentheses.",
    inputFormat: "A string s of length n (1 ≤ n ≤ 10^5); parentheses in s are balanced.",
    outputFormat: "A single integer — the maximum nesting depth.",
    constraints: [
      "1 ≤ n ≤ 100,000",
      "Parentheses are guaranteed balanced",
      "Non-parenthesis characters are ignored",
    ],
    examples: [
      {
        input: 's = "(1+(2*3)+((8)/4))+1"',
        output: "3",
        explanation: "The innermost (8) sits three levels deep.",
      },
      {
        input: 's = "(1)+((2))+(((3)))"',
        output: "3",
        explanation: "The deepest group (((3))) reaches depth 3.",
      },
    ],
    approach: [
      "Because the input is balanced, a counter replaces an explicit stack.",
      "Increment on '(' and decrement on ')'.",
      "The maximum value the counter reaches is the answer.",
      "No need to store the stack contents — only its height matters.",
    ],
    solutionSteps: [
      "Initialise depth = 0, best = 0.",
      "Scan each character: on '(' do depth += 1 and best = max(best, depth).",
      "On ')' do depth -= 1.",
      "Ignore every other character.",
      "Return best.",
    ],
    code: {
      python: `def max_depth(s: str) -> int:
    depth = 0
    best = 0
    for c in s:
        if c == '(':
            depth += 1
            best = max(best, depth)
        elif c == ')':
            depth -= 1
    return best
`,
      java: `public final class BalancedBracketDepth {
    public static int maxDepth(String s) {
        int depth = 0, best = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '(') best = Math.max(best, ++depth);
            else if (c == ')') depth--;
        }
        return best;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int maxDepth(const string& s) {
    int depth = 0, best = 0;
    for (char c : s) {
        if (c == '(') best = max(best, ++depth);
        else if (c == ')') depth--;
    }
    return best;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Pushing onto a real stack when a counter suffices for balanced input.",
      "Updating best on ')' instead of '(' — the peak occurs right after an open.",
      "Not handling non-bracket characters, which must simply be skipped.",
    ],
    edgeCases: [
      "No parentheses at all — depth 0.",
      "A single (...) pair — depth 1.",
      "Deeply nested chain with no other characters.",
    ],
    whyItMatters:
      "Recognising when a counter can stand in for a stack is a classic space-optimisation insight, and depth tracking is the core of bracket-matching and expression-parsing problems.",
    estimatedMinutes: 12,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 67 — pure_dsa · arrays_hashing · medium · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "exclusive-metric-product",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 4,
    pattern: "arrays_hashing",
    difficulty: "medium",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer", "software_engineer"],
    title: "Exclusive Metric Product",
    framing:
      "A metrics service computes, for each sensor, the product of every other sensor's reading — a normalisation step. Division is banned because a single zero reading would blow it up, so compute each exclusive product directly.",
    statement:
      "Given an array nums, return an array out where out[i] is the product of all elements except nums[i], computed without using division.",
    inputFormat: "An array nums of length n (2 ≤ n ≤ 10^5); the full product fits in a 64-bit integer.",
    outputFormat: "An array out of length n.",
    constraints: [
      "2 ≤ n ≤ 100,000",
      "Division is not allowed",
      "Run in O(n) time",
    ],
    examples: [
      {
        input: "nums = [1, 2, 3, 4]",
        output: "[24, 12, 8, 6]",
        explanation: "out[0]=2·3·4=24, out[1]=1·3·4=12, out[2]=1·2·4=8, out[3]=1·2·3=6.",
      },
      {
        input: "nums = [2, 3]",
        output: "[3, 2]",
        explanation: "Each position holds the other element.",
      },
    ],
    approach: [
      "out[i] equals (product of everything to the left) × (product of everything to the right).",
      "First pass left-to-right fills out[i] with the running prefix product.",
      "Second pass right-to-left multiplies in the running suffix product.",
      "Two passes and an O(1) running accumulator avoid division entirely.",
    ],
    solutionSteps: [
      "Create out of length n; set out[0] = 1.",
      "Left pass: out[i] = out[i-1] * nums[i-1].",
      "Initialise suffix = 1; right pass i from n-1 down to 0: out[i] *= suffix; suffix *= nums[i].",
      "Return out.",
      "O(n) time, O(1) extra space beyond the output.",
    ],
    code: {
      python: `def product_except_self(nums: list[int]) -> list[int]:
    n = len(nums)
    out = [1] * n
    for i in range(1, n):
        out[i] = out[i - 1] * nums[i - 1]
    suffix = 1
    for i in range(n - 1, -1, -1):
        out[i] *= suffix
        suffix *= nums[i]
    return out
`,
      java: `public final class ExclusiveMetricProduct {
    public static long[] productExceptSelf(int[] nums) {
        int n = nums.length;
        long[] out = new long[n];
        out[0] = 1;
        for (int i = 1; i < n; i++) out[i] = out[i - 1] * nums[i - 1];
        long suffix = 1;
        for (int i = n - 1; i >= 0; i--) {
            out[i] *= suffix;
            suffix *= nums[i];
        }
        return out;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<long long> productExceptSelf(const vector<int>& nums) {
    int n = nums.size();
    vector<long long> out(n, 1);
    for (int i = 1; i < n; i++) out[i] = out[i - 1] * nums[i - 1];
    long long suffix = 1;
    for (int i = n - 1; i >= 0; i--) {
        out[i] *= suffix;
        suffix *= nums[i];
    }
    return out;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Dividing the total product by nums[i] — fails on zeros and is explicitly disallowed.",
      "Allocating separate prefix and suffix arrays when the output plus one scalar suffices.",
      "Integer overflow — accumulate in a 64-bit type.",
    ],
    edgeCases: [
      "A single zero — only its own position is non-zero.",
      "Two or more zeros — every output is zero.",
      "Two-element array.",
    ],
    whyItMatters:
      "Prefix/suffix accumulation is a reusable trick for range aggregates without recomputation, and the no-division constraint forces the elegant two-pass solution interviewers look for.",
    estimatedMinutes: 22,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 68 — pure_dsa · stack_queue · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "rolling-min-price-stack",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 4,
    pattern: "stack_queue",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer", "platform_engineer"],
    title: "Rolling Min Price Stack",
    framing:
      "A pricing engine keeps a stack of quoted prices and must answer 'what is the lowest price currently on the stack?' instantly after every push and pop. Design a stack with O(1) minimum lookup.",
    statement:
      "Design a stack supporting push(x), pop(), top(), and getMin() — the minimum element currently on the stack — each in O(1) time. Process a sequence of operations and return the outputs of the query operations in order.",
    inputFormat: "A list of operations, each one of: \"push v\", \"pop\", \"top\", \"getMin\" (1 ≤ count ≤ 10^5).",
    outputFormat: "A list of integers — the result of each top/getMin query, in order.",
    constraints: [
      "All four operations run in O(1)",
      "pop/top/getMin are only called on a non-empty stack",
      "Values fit in a 32-bit int",
    ],
    examples: [
      {
        input: 'ops = ["push -2", "push 0", "push -3", "getMin", "pop", "top", "getMin"]',
        output: "[-3, 0, -2]",
        explanation: "After pushing -2,0,-3 the min is -3; pop removes -3; top is 0; min is now -2.",
      },
      {
        input: 'ops = ["push 5", "getMin", "top"]',
        output: "[5, 5]",
        explanation: "A single element is both the top and the minimum.",
      },
    ],
    approach: [
      "Pair each value on the main stack with the minimum of the stack up to and including it.",
      "On push, the new running min is min(value, current min).",
      "getMin reads the running min stored at the top in O(1).",
      "pop discards both the value and its paired min together.",
    ],
    solutionSteps: [
      "Keep one stack of (value, minSoFar) tuples.",
      "push(x): minSoFar = x if empty else min(x, top.minSoFar); push (x, minSoFar).",
      "pop(): remove the top tuple.",
      "top(): return top.value; getMin(): return top.minSoFar.",
      "Every operation is O(1).",
    ],
    code: {
      python: `class MinStack:
    def __init__(self):
        self._stack: list[tuple[int, int]] = []

    def push(self, x: int) -> None:
        cur_min = x if not self._stack else min(x, self._stack[-1][1])
        self._stack.append((x, cur_min))

    def pop(self) -> None:
        self._stack.pop()

    def top(self) -> int:
        return self._stack[-1][0]

    def get_min(self) -> int:
        return self._stack[-1][1]

def run(ops: list[str]) -> list[int]:
    s = MinStack()
    out: list[int] = []
    for op in ops:
        if op.startswith("push"):
            s.push(int(op.split()[1]))
        elif op == "pop":
            s.pop()
        elif op == "top":
            out.append(s.top())
        else:
            out.append(s.get_min())
    return out
`,
      java: `import java.util.*;

public final class RollingMinPriceStack {
    private final Deque<int[]> stack = new ArrayDeque<>();
    public void push(int x) {
        int curMin = stack.isEmpty() ? x : Math.min(x, stack.peek()[1]);
        stack.push(new int[]{x, curMin});
    }
    public void pop() { stack.pop(); }
    public int top() { return stack.peek()[0]; }
    public int getMin() { return stack.peek()[1]; }

    public static List<Integer> run(String[] ops) {
        RollingMinPriceStack s = new RollingMinPriceStack();
        List<Integer> out = new ArrayList<>();
        for (String op : ops) {
            if (op.startsWith("push")) s.push(Integer.parseInt(op.split(" ")[1]));
            else if (op.equals("pop")) s.pop();
            else if (op.equals("top")) out.add(s.top());
            else out.add(s.getMin());
        }
        return out;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

struct MinStack {
    vector<pair<int,int>> st;  // (value, minSoFar)
    void push(int x) {
        int curMin = st.empty() ? x : min(x, st.back().second);
        st.push_back({x, curMin});
    }
    void pop() { st.pop_back(); }
    int top() { return st.back().first; }
    int getMin() { return st.back().second; }
};

vector<int> run(const vector<string>& ops) {
    MinStack s;
    vector<int> out;
    for (auto& op : ops) {
        if (op.rfind("push", 0) == 0) s.push(stoi(op.substr(5)));
        else if (op == "pop") s.pop();
        else if (op == "top") out.push_back(s.top());
        else out.push_back(s.getMin());
    }
    return out;
}
`,
    },
    complexity: { time: "O(1) per operation", space: "O(n)" },
    pitfalls: [
      "Scanning the stack on getMin — that is O(n), defeating the purpose.",
      "Keeping a single min variable that becomes stale after the minimum is popped.",
      "Forgetting to update the running min when a smaller value is pushed.",
    ],
    edgeCases: [
      "Single element — top and min coincide.",
      "Duplicate minimums — each carries its own paired min so pops stay correct.",
      "Strictly increasing pushes — min stays at the bottom value.",
    ],
    whyItMatters:
      "Augmenting a structure with a cached aggregate so a query stays O(1) is a core design technique — the same idea powers monotonic stacks and min/max queues.",
    estimatedMinutes: 22,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 69 — ai_applied · sliding_window · medium · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "k-distinct-topic-window",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 4,
    pattern: "sliding_window",
    difficulty: "medium",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "data_engineer", "backend_engineer"],
    title: "K-Distinct Topic Window",
    framing:
      "A topic classifier tags each message in a chat stream with a topic id. To find the longest coherent conversation segment, you want the longest contiguous run of messages that touches at most k distinct topics. The DSA underneath is a classic variable-size window — the topic tags are just the data.",
    statement:
      "Given an array topics of topic ids and an integer k, return the length of the longest contiguous subarray containing at most k distinct values.",
    inputFormat: "An array topics of length n (1 ≤ n ≤ 10^5) and integer k (1 ≤ k ≤ n).",
    outputFormat: "A single integer — the length of the longest qualifying window.",
    constraints: [
      "1 ≤ k ≤ n ≤ 100,000",
      "Topic ids in [0, 10^9]",
      "At most k distinct values inside the window",
    ],
    examples: [
      {
        input: "topics = [1, 2, 1, 2, 3], k = 2",
        output: "4",
        explanation: "[1, 2, 1, 2] uses 2 distinct topics; adding the 3 would make 3, so the run stops at length 4.",
      },
      {
        input: "topics = [1, 2, 3], k = 1",
        output: "1",
        explanation: "With only one distinct topic allowed, no two adjacent differing topics can coexist.",
      },
    ],
    approach: [
      "Grow a window to the right, tracking the count of each distinct topic in a hash map.",
      "When the map holds more than k distinct keys, shrink from the left until it holds k again.",
      "The window is always valid after shrinking, so record its length.",
      "Each index enters and leaves the window once — linear time.",
    ],
    solutionSteps: [
      "Initialise left = 0, a count map, and best = 0.",
      "For right in range(n): add topics[right] to the map.",
      "While the map has more than k keys: decrement topics[left], drop it at zero, left += 1.",
      "Update best = max(best, right - left + 1).",
      "Return best.",
    ],
    code: {
      python: `def longest_k_distinct(topics: list[int], k: int) -> int:
    from collections import defaultdict
    count: dict[int, int] = defaultdict(int)
    left = best = 0
    for right, t in enumerate(topics):
        count[t] += 1
        while len(count) > k:
            count[topics[left]] -= 1
            if count[topics[left]] == 0:
                del count[topics[left]]
            left += 1
        best = max(best, right - left + 1)
    return best
`,
      java: `import java.util.*;

public final class KDistinctTopicWindow {
    public static int longestKDistinct(int[] topics, int k) {
        Map<Integer, Integer> count = new HashMap<>();
        int left = 0, best = 0;
        for (int right = 0; right < topics.length; right++) {
            count.merge(topics[right], 1, Integer::sum);
            while (count.size() > k) {
                int t = topics[left++];
                if (count.merge(t, -1, Integer::sum) == 0) count.remove(t);
            }
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int longestKDistinct(const vector<int>& topics, int k) {
    unordered_map<int, int> count;
    int left = 0, best = 0;
    for (int right = 0; right < (int)topics.size(); right++) {
        count[topics[right]]++;
        while ((int)count.size() > k) {
            int t = topics[left++];
            if (--count[t] == 0) count.erase(t);
        }
        best = max(best, right - left + 1);
    }
    return best;
}
`,
    },
    complexity: { time: "O(n)", space: "O(k)" },
    pitfalls: [
      "Forgetting to erase a topic when its count reaches zero, so the map size stays inflated.",
      "Shrinking with an if instead of a while — multiple removals may be needed.",
      "Measuring window length before restoring validity.",
    ],
    edgeCases: [
      "k ≥ number of distinct topics — the whole array qualifies.",
      "k = 1 — longest run of a single repeated topic.",
      "All identical topics — answer is n.",
    ],
    whyItMatters:
      "At-most-k-distinct is the template for a whole class of variable-window problems (exactly-k follows by subtraction). The AI framing is incidental — the interviewer is testing the window invariant.",
    estimatedMinutes: 24,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 70 — pure_dsa · trees · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "org-broadcast-levels",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 4,
    pattern: "trees",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer", "full_stack_engineer"],
    title: "Org Broadcast Levels",
    framing:
      "A company-wide announcement cascades down the reporting tree: the CEO hears it first, then their direct reports, then the next level, and so on. Produce the list of employees grouped by the level at which they receive the message.",
    statement:
      "Given the root of a binary tree, return its level-order traversal: a list of lists where each inner list holds the node values at one depth, top to bottom.",
    inputFormat: "The root of a tree with n nodes (0 ≤ n ≤ 2·10^4), shown in level order with null for missing children.",
    outputFormat: "A list of lists of integers, one per level.",
    constraints: [
      "0 ≤ n ≤ 20,000",
      "Node values fit in a 32-bit int",
      "An empty tree yields an empty list",
    ],
    examples: [
      {
        input: "root = [3, 9, 20, null, null, 15, 7]",
        output: "[[3], [9, 20], [15, 7]]",
        explanation: "Depth 0 is [3], depth 1 is [9, 20], depth 2 is [15, 7].",
      },
      {
        input: "root = [1]",
        output: "[[1]]",
        explanation: "A single node forms one level.",
      },
    ],
    approach: [
      "Breadth-first search visits nodes level by level using a queue.",
      "Before processing a level, record the current queue size — that is how many nodes belong to this level.",
      "Dequeue exactly that many, collect their values, and enqueue their children.",
      "Repeat until the queue empties.",
    ],
    solutionSteps: [
      "If root is null, return [].",
      "Initialise a queue with root and an empty result list.",
      "While the queue is non-empty: let levelSize = queue length; collect that many dequeued values into a level list, enqueuing children as you go.",
      "Append the level list to the result.",
      "Return the result.",
    ],
    code: {
      python: `from collections import deque

class TreeNode:
    def __init__(self, val: int = 0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def level_order(root: TreeNode | None) -> list[list[int]]:
    if root is None:
        return []
    out: list[list[int]] = []
    q = deque([root])
    while q:
        level = []
        for _ in range(len(q)):
            node = q.popleft()
            level.append(node.val)
            if node.left:
                q.append(node.left)
            if node.right:
                q.append(node.right)
        out.append(level)
    return out
`,
      java: `import java.util.*;

public final class OrgBroadcastLevels {
    public static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
    }
    public static List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> out = new ArrayList<>();
        if (root == null) return out;
        Queue<TreeNode> q = new LinkedList<>();
        q.add(root);
        while (!q.isEmpty()) {
            int size = q.size();
            List<Integer> level = new ArrayList<>();
            for (int i = 0; i < size; i++) {
                TreeNode node = q.poll();
                level.add(node.val);
                if (node.left != null) q.add(node.left);
                if (node.right != null) q.add(node.right);
            }
            out.add(level);
        }
        return out;
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

vector<vector<int>> levelOrder(TreeNode* root) {
    vector<vector<int>> out;
    if (!root) return out;
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        int size = q.size();
        vector<int> level;
        for (int i = 0; i < size; i++) {
            TreeNode* node = q.front(); q.pop();
            level.push_back(node->val);
            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }
        out.push_back(level);
    }
    return out;
}
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Reading the queue size inside the inner loop after it has changed — snapshot it first.",
      "Enqueueing null children and then dereferencing them.",
      "Using DFS and trying to bucket by depth without tracking the level index carefully.",
    ],
    edgeCases: [
      "Empty tree — empty result.",
      "Skewed tree — each level has a single node.",
      "Perfect tree — level sizes double each step.",
    ],
    whyItMatters:
      "Level-order BFS with the 'snapshot the queue size' trick is the foundation for zigzag traversal, right-side view, and shortest-path-in-unweighted-graph problems.",
    estimatedMinutes: 20,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 71 — pure_dsa · graphs · medium · devops_sre
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "notification-spread-time",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 4,
    pattern: "graphs",
    difficulty: "medium",
    primaryRole: "devops_sre",
    roles: ["devops_sre", "backend_engineer", "platform_engineer"],
    title: "Notification Spread Time",
    framing:
      "Devices sit in a grid. Each minute, every device already holding a push notification forwards it to its idle four-directional neighbours. Some cells are empty (no device). Report how many minutes until every device has the notification, or -1 if some device can never be reached.",
    statement:
      "Given a grid where 0 = empty cell, 1 = idle device, 2 = device already notified, each minute any idle device adjacent (up/down/left/right) to a notified device becomes notified. Return the minutes until no idle device remains, or -1 if impossible.",
    inputFormat: "A grid of size r×c (1 ≤ r, c ≤ 300) with values in {0, 1, 2}.",
    outputFormat: "A single integer — minutes elapsed, or -1 if some device stays idle.",
    constraints: [
      "1 ≤ r, c ≤ 300",
      "Cells are 0, 1, or 2",
      "Spread is four-directional",
    ],
    examples: [
      {
        input: "grid = [[2,1,1],[1,1,0],[0,1,1]]",
        output: "4",
        explanation: "The notification radiates from the top-left; the bottom-right device is reached after 4 minutes.",
      },
      {
        input: "grid = [[2,1,1],[0,1,1],[1,0,1]]",
        output: "-1",
        explanation: "The device at the bottom-left is cut off by empty cells and never gets notified.",
      },
    ],
    approach: [
      "This is multi-source breadth-first search: all initially-notified cells start at time 0.",
      "Seed the queue with every '2' cell and count the idle '1' cells.",
      "Process the queue in waves; each wave is one minute and notifies neighbours.",
      "If any idle device remains after BFS, return -1.",
    ],
    solutionSteps: [
      "Enqueue every cell with value 2; tally the number of idle (1) cells.",
      "Run level-by-level BFS, incrementing minutes per wave that produces new notifications.",
      "Each newly notified neighbour decrements the idle tally and joins the queue.",
      "After BFS, return -1 if idle > 0, else the minute count.",
      "Every cell is enqueued at most once — O(r·c).",
    ],
    code: {
      python: `from collections import deque

def spread_time(grid: list[list[int]]) -> int:
    r, c = len(grid), len(grid[0])
    q = deque()
    idle = 0
    for i in range(r):
        for j in range(c):
            if grid[i][j] == 2:
                q.append((i, j))
            elif grid[i][j] == 1:
                idle += 1
    if idle == 0:
        return 0
    minutes = 0
    dirs = ((1, 0), (-1, 0), (0, 1), (0, -1))
    while q:
        minutes += 1
        for _ in range(len(q)):
            x, y = q.popleft()
            for dx, dy in dirs:
                nx, ny = x + dx, y + dy
                if 0 <= nx < r and 0 <= ny < c and grid[nx][ny] == 1:
                    grid[nx][ny] = 2
                    idle -= 1
                    q.append((nx, ny))
        if idle == 0:
            return minutes
    return -1
`,
      java: `import java.util.*;

public final class NotificationSpreadTime {
    public static int spreadTime(int[][] grid) {
        int r = grid.length, c = grid[0].length, idle = 0;
        Queue<int[]> q = new LinkedList<>();
        for (int i = 0; i < r; i++)
            for (int j = 0; j < c; j++) {
                if (grid[i][j] == 2) q.add(new int[]{i, j});
                else if (grid[i][j] == 1) idle++;
            }
        if (idle == 0) return 0;
        int minutes = 0;
        int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};
        while (!q.isEmpty()) {
            minutes++;
            int size = q.size();
            for (int s = 0; s < size; s++) {
                int[] cell = q.poll();
                for (int[] d : dirs) {
                    int nx = cell[0] + d[0], ny = cell[1] + d[1];
                    if (nx >= 0 && nx < r && ny >= 0 && ny < c && grid[nx][ny] == 1) {
                        grid[nx][ny] = 2;
                        idle--;
                        q.add(new int[]{nx, ny});
                    }
                }
            }
            if (idle == 0) return minutes;
        }
        return -1;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int spreadTime(vector<vector<int>>& grid) {
    int r = grid.size(), c = grid[0].size(), idle = 0;
    queue<pair<int,int>> q;
    for (int i = 0; i < r; i++)
        for (int j = 0; j < c; j++) {
            if (grid[i][j] == 2) q.push({i, j});
            else if (grid[i][j] == 1) idle++;
        }
    if (idle == 0) return 0;
    int minutes = 0;
    int dx[] = {1,-1,0,0}, dy[] = {0,0,1,-1};
    while (!q.empty()) {
        minutes++;
        int size = q.size();
        for (int s = 0; s < size; s++) {
            auto [x, y] = q.front(); q.pop();
            for (int k = 0; k < 4; k++) {
                int nx = x + dx[k], ny = y + dy[k];
                if (nx >= 0 && nx < r && ny >= 0 && ny < c && grid[nx][ny] == 1) {
                    grid[nx][ny] = 2;
                    idle--;
                    q.push({nx, ny});
                }
            }
        }
        if (idle == 0) return minutes;
    }
    return -1;
}
`,
    },
    complexity: { time: "O(r·c)", space: "O(r·c)" },
    pitfalls: [
      "Single-source BFS from one seed — all initial 2s must start simultaneously.",
      "Counting a minute for the initial wave; the first increment should correspond to the first spread.",
      "Forgetting the all-already-notified case, which should return 0.",
    ],
    edgeCases: [
      "No idle devices at the start — 0 minutes.",
      "An idle device fenced off by empty cells — return -1.",
      "Grid with no notified seed but idle devices present — -1.",
    ],
    whyItMatters:
      "Multi-source BFS computes shortest spreading time from many origins at once — the same model behind fire spread, infection simulation, and nearest-facility maps.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 72 — pure_dsa · backtracking · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "feature-toggle-subsets",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 4,
    pattern: "backtracking",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer", "platform_engineer"],
    title: "Feature Toggle Subsets",
    framing:
      "A release tool wants to enumerate every possible combination of independent feature toggles so QA can test each configuration. Given the distinct toggle ids, produce all subsets — the full power set.",
    statement:
      "Given an array of distinct integers, return all possible subsets (the power set). The solution set must not contain duplicate subsets; any order is accepted.",
    inputFormat: "An array nums of length n (0 ≤ n ≤ 16) of distinct integers.",
    outputFormat: "A list of all 2^n subsets, each a list of integers.",
    constraints: [
      "0 ≤ n ≤ 16",
      "All elements are distinct",
      "Output contains exactly 2^n subsets",
    ],
    examples: [
      {
        input: "nums = [1, 2, 3]",
        output: "[[], [1], [2], [1,2], [3], [1,3], [2,3], [1,2,3]]",
        explanation: "All 2^3 = 8 subsets, including the empty set.",
      },
      {
        input: "nums = [0]",
        output: "[[], [0]]",
        explanation: "Two subsets: empty and the singleton.",
      },
    ],
    approach: [
      "Backtrack with a start index: at each step, decide which later elements to include.",
      "Record the current partial subset at every node of the recursion tree.",
      "Iterating from a start index avoids generating the same subset in two orders.",
      "Alternatively, map each of the 2^n bitmasks to a subset.",
    ],
    solutionSteps: [
      "Define backtrack(start, path): append a copy of path to the result.",
      "For i from start to n-1: add nums[i], recurse with start = i+1, then remove nums[i].",
      "Begin with backtrack(0, []).",
      "Return the accumulated list.",
      "There are 2^n subsets, each costing O(n) to copy — O(n·2^n).",
    ],
    code: {
      python: `def subsets(nums: list[int]) -> list[list[int]]:
    out: list[list[int]] = []
    path: list[int] = []
    def backtrack(start: int) -> None:
        out.append(path[:])
        for i in range(start, len(nums)):
            path.append(nums[i])
            backtrack(i + 1)
            path.pop()
    backtrack(0)
    return out
`,
      java: `import java.util.*;

public final class FeatureToggleSubsets {
    public static List<List<Integer>> subsets(int[] nums) {
        List<List<Integer>> out = new ArrayList<>();
        backtrack(nums, 0, new ArrayList<>(), out);
        return out;
    }
    private static void backtrack(int[] nums, int start, List<Integer> path, List<List<Integer>> out) {
        out.add(new ArrayList<>(path));
        for (int i = start; i < nums.length; i++) {
            path.add(nums[i]);
            backtrack(nums, i + 1, path, out);
            path.remove(path.size() - 1);
        }
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

void backtrack(const vector<int>& nums, int start, vector<int>& path, vector<vector<int>>& out) {
    out.push_back(path);
    for (int i = start; i < (int)nums.size(); i++) {
        path.push_back(nums[i]);
        backtrack(nums, i + 1, path, out);
        path.pop_back();
    }
}

vector<vector<int>> subsets(const vector<int>& nums) {
    vector<vector<int>> out;
    vector<int> path;
    backtrack(nums, 0, path, out);
    return out;
}
`,
    },
    complexity: { time: "O(n·2^n)", space: "O(n) recursion depth" },
    pitfalls: [
      "Appending the path reference instead of a copy — later mutations corrupt stored subsets.",
      "Restarting the inner loop from 0 instead of start, producing duplicate subsets in different orders.",
      "Forgetting to record the empty subset.",
    ],
    edgeCases: [
      "Empty input — the only subset is the empty set.",
      "Single element — two subsets.",
      "Maximum n = 16 — 65,536 subsets, still tractable.",
    ],
    whyItMatters:
      "Subset generation is the canonical introduction to backtracking with a start index, the same skeleton reused for combinations, combination-sum, and palindrome partitioning.",
    estimatedMinutes: 22,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 73 — pure_dsa · backtracking · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "experiment-order-permutations",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 4,
    pattern: "backtracking",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer", "backend_engineer"],
    title: "Experiment Order Permutations",
    framing:
      "An A/B platform must counterbalance the order in which test arms are shown to remove ordering bias. Given the distinct arm ids, generate every possible ordering so each can be assigned to a cohort.",
    statement:
      "Given an array of distinct integers, return all possible orderings (permutations) of the elements. Any order of the permutations is accepted.",
    inputFormat: "An array nums of length n (1 ≤ n ≤ 8) of distinct integers.",
    outputFormat: "A list of all n! permutations, each a list of integers.",
    constraints: [
      "1 ≤ n ≤ 8",
      "All elements are distinct",
      "Output contains exactly n! permutations",
    ],
    examples: [
      {
        input: "nums = [1, 2, 3]",
        output: "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]",
        explanation: "All 3! = 6 orderings of three distinct arms.",
      },
      {
        input: "nums = [1]",
        output: "[[1]]",
        explanation: "A single element has one ordering.",
      },
    ],
    approach: [
      "Backtrack by choosing which unused element occupies the next position.",
      "Track which indices are already placed with a boolean used array.",
      "When the path length equals n, record a completed permutation.",
      "Undo each choice on the way back up to explore alternatives.",
    ],
    solutionSteps: [
      "Maintain a path and a used[] flag array.",
      "If path length == n, append a copy and return.",
      "For each index i not yet used: mark it, append nums[i], recurse, then unmark and pop.",
      "Start the recursion with an empty path.",
      "n! leaves, each O(n) to copy — O(n·n!).",
    ],
    code: {
      python: `def permutations(nums: list[int]) -> list[list[int]]:
    out: list[list[int]] = []
    path: list[int] = []
    used = [False] * len(nums)
    def backtrack() -> None:
        if len(path) == len(nums):
            out.append(path[:])
            return
        for i in range(len(nums)):
            if used[i]:
                continue
            used[i] = True
            path.append(nums[i])
            backtrack()
            path.pop()
            used[i] = False
    backtrack()
    return out
`,
      java: `import java.util.*;

public final class ExperimentOrderPermutations {
    public static List<List<Integer>> permute(int[] nums) {
        List<List<Integer>> out = new ArrayList<>();
        backtrack(nums, new boolean[nums.length], new ArrayList<>(), out);
        return out;
    }
    private static void backtrack(int[] nums, boolean[] used, List<Integer> path, List<List<Integer>> out) {
        if (path.size() == nums.length) {
            out.add(new ArrayList<>(path));
            return;
        }
        for (int i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            used[i] = true;
            path.add(nums[i]);
            backtrack(nums, used, path, out);
            path.remove(path.size() - 1);
            used[i] = false;
        }
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

void backtrack(const vector<int>& nums, vector<bool>& used, vector<int>& path, vector<vector<int>>& out) {
    if (path.size() == nums.size()) {
        out.push_back(path);
        return;
    }
    for (int i = 0; i < (int)nums.size(); i++) {
        if (used[i]) continue;
        used[i] = true;
        path.push_back(nums[i]);
        backtrack(nums, used, path, out);
        path.pop_back();
        used[i] = false;
    }
}

vector<vector<int>> permute(const vector<int>& nums) {
    vector<vector<int>> out;
    vector<bool> used(nums.size(), false);
    vector<int> path;
    backtrack(nums, used, path, out);
    return out;
}
`,
    },
    complexity: { time: "O(n·n!)", space: "O(n) recursion depth" },
    pitfalls: [
      "Storing references to the mutable path rather than copies.",
      "Forgetting to reset the used flag after recursion, which omits valid permutations.",
      "Swapping in place but not restoring the swap, corrupting the array.",
    ],
    edgeCases: [
      "Single element — one permutation.",
      "n = 8 — 40,320 permutations, the upper bound here.",
      "Negative or large values — distinctness is all that matters.",
    ],
    whyItMatters:
      "Permutation backtracking with a used-set is a staple, and recognising the n! blow-up teaches you to bound brute force before reaching for it.",
    estimatedMinutes: 23,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 74 — ai_applied · heap_priority_queue · medium · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "kth-confidence-score",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 4,
    pattern: "heap_priority_queue",
    difficulty: "medium",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "data_engineer", "backend_engineer"],
    title: "Kth Confidence Score",
    framing:
      "A classifier emits a confidence score per candidate label. A re-ranking step needs the k-th highest confidence as a cutoff threshold. The scores are just numbers — the task is the classic k-th largest selection.",
    statement:
      "Given an array of scores and an integer k, return the k-th largest value (in sorted-descending order, with duplicates counted by position).",
    inputFormat: "An array scores of length n (1 ≤ k ≤ n ≤ 10^5), values in [-10^4, 10^4].",
    outputFormat: "A single integer — the k-th largest score.",
    constraints: [
      "1 ≤ k ≤ n ≤ 100,000",
      "Duplicates count toward the ordinal position",
      "Aim better than a full sort when k is small",
    ],
    examples: [
      {
        input: "scores = [3, 2, 1, 5, 6, 4], k = 2",
        output: "5",
        explanation: "Sorted descending: 6, 5, 4, 3, 2, 1 — the 2nd is 5.",
      },
      {
        input: "scores = [3, 2, 3, 1, 2, 4, 5, 5, 6], k = 4",
        output: "4",
        explanation: "Sorted descending: 6,5,5,4,3,3,2,2,1 — the 4th is 4.",
      },
    ],
    approach: [
      "Maintain a min-heap of size k holding the k largest scores seen so far.",
      "Push each score; if the heap exceeds k, pop the smallest.",
      "After the scan, the heap's root is the k-th largest overall.",
      "This is O(n log k), beating a full O(n log n) sort when k is small.",
    ],
    solutionSteps: [
      "Create an empty min-heap.",
      "For each score: push it; if heap size > k, pop the minimum.",
      "The heap now holds the top k scores.",
      "Return the heap's root (its minimum), which is the k-th largest.",
      "O(n log k) time, O(k) space.",
    ],
    code: {
      python: `import heapq

def kth_largest(scores: list[int], k: int) -> int:
    heap: list[int] = []
    for s in scores:
        heapq.heappush(heap, s)
        if len(heap) > k:
            heapq.heappop(heap)
    return heap[0]
`,
      java: `import java.util.*;

public final class KthConfidenceScore {
    public static int kthLargest(int[] scores, int k) {
        PriorityQueue<Integer> heap = new PriorityQueue<>();
        for (int s : scores) {
            heap.offer(s);
            if (heap.size() > k) heap.poll();
        }
        return heap.peek();
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int kthLargest(const vector<int>& scores, int k) {
    priority_queue<int, vector<int>, greater<int>> heap;
    for (int s : scores) {
        heap.push(s);
        if ((int)heap.size() > k) heap.pop();
    }
    return heap.top();
}
`,
    },
    complexity: { time: "O(n log k)", space: "O(k)" },
    pitfalls: [
      "Using a max-heap of all n elements and popping k times — O(n + k log n), more memory and often slower for small k.",
      "Confusing k-th largest with k-th distinct largest; duplicates count here.",
      "Off-by-one: the root of a size-k min-heap is the k-th largest, not the k-th smallest.",
    ],
    edgeCases: [
      "k = 1 — the maximum.",
      "k = n — the minimum.",
      "All equal scores — that value regardless of k.",
    ],
    whyItMatters:
      "The bounded min-heap is the standard streaming top-k technique, used for leaderboards, nearest-neighbour shortlists, and any 'keep the best k' pipeline where the full set will not fit in memory.",
    estimatedMinutes: 22,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 75 — indian_domain · dp_1d · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "refund-chunk-denominations",
    version: 1,
    status: "pending_review",
    bucket: "indian_domain",
    batchNo: 4,
    pattern: "dp_1d",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer", "data_engineer"],
    title: "Refund Chunk Denominations",
    framing:
      "A UPI payment gateway settles refunds by breaking the amount into configurable chunk sizes (the merchant picks which chunk values its reconciliation supports). To minimise ledger entries, refund a given amount using the fewest chunks possible.",
    statement:
      "Given a list of positive chunk denominations and a target amount, return the minimum number of chunks (denominations may be reused any number of times) that sum exactly to amount, or -1 if it cannot be formed.",
    inputFormat: "An array denoms of length m (1 ≤ m ≤ 50) of positive ints, and amount (0 ≤ amount ≤ 10^4).",
    outputFormat: "A single integer — the minimum chunk count, or -1.",
    constraints: [
      "1 ≤ m ≤ 50; denominations are positive",
      "0 ≤ amount ≤ 10,000",
      "Each denomination may be used unlimited times",
    ],
    examples: [
      {
        input: "denoms = [1, 3, 4], amount = 6",
        output: "2",
        explanation: "3 + 3 = 6 uses two chunks; the greedy 4 + 1 + 1 would use three.",
      },
      {
        input: "denoms = [2], amount = 3",
        output: "-1",
        explanation: "Only even totals are reachable with a single denomination of 2.",
      },
    ],
    approach: [
      "Greedy fails (the 4+1+1 vs 3+3 case), so use bottom-up dynamic programming.",
      "Let dp[a] be the fewest chunks to form amount a, initialised to infinity, dp[0] = 0.",
      "For each amount a, try every denomination d ≤ a: dp[a] = min(dp[a], dp[a-d] + 1).",
      "dp[amount] is the answer, or -1 if it stayed infinite.",
    ],
    solutionSteps: [
      "Allocate dp of size amount+1 filled with a large sentinel; set dp[0] = 0.",
      "For a from 1 to amount: for each denom d ≤ a, relax dp[a] using dp[a-d] + 1.",
      "After filling, if dp[amount] is still the sentinel, return -1.",
      "Otherwise return dp[amount].",
      "O(amount · m) time, O(amount) space.",
    ],
    code: {
      python: `def min_chunks(denoms: list[int], amount: int) -> int:
    INF = amount + 1
    dp = [0] + [INF] * amount
    for a in range(1, amount + 1):
        for d in denoms:
            if d <= a:
                dp[a] = min(dp[a], dp[a - d] + 1)
    return dp[amount] if dp[amount] != INF else -1
`,
      java: `import java.util.*;

public final class RefundChunkDenominations {
    public static int minChunks(int[] denoms, int amount) {
        int INF = amount + 1;
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, INF);
        dp[0] = 0;
        for (int a = 1; a <= amount; a++)
            for (int d : denoms)
                if (d <= a) dp[a] = Math.min(dp[a], dp[a - d] + 1);
        return dp[amount] == INF ? -1 : dp[amount];
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int minChunks(const vector<int>& denoms, int amount) {
    int INF = amount + 1;
    vector<int> dp(amount + 1, INF);
    dp[0] = 0;
    for (int a = 1; a <= amount; a++)
        for (int d : denoms)
            if (d <= a) dp[a] = min(dp[a], dp[a - d] + 1);
    return dp[amount] == INF ? -1 : dp[amount];
}
`,
    },
    complexity: { time: "O(amount · m)", space: "O(amount)" },
    pitfalls: [
      "Reaching for greedy largest-denomination-first, which is wrong for non-canonical denomination sets.",
      "Using 0 as the unreachable sentinel — it collides with the valid dp[0] = 0.",
      "Forgetting the amount = 0 case, which needs zero chunks.",
    ],
    edgeCases: [
      "amount = 0 — answer 0.",
      "No combination sums to amount — return -1.",
      "A denomination equal to amount — answer 1.",
    ],
    whyItMatters:
      "Min-coin-change is the archetypal unbounded-knapsack DP. Recognising why greedy breaks and reaching for the dp table is exactly the reasoning interviewers want to see.",
    estimatedMinutes: 24,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 76 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "config-diff-lcs",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 4,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer", "devops_sre"],
    title: "Config Diff LCS",
    framing:
      "A config-management tool diffs two ordered lists of directives and wants to know the largest set of lines that appear in both, in the same relative order — the stable core that survived an edit. Compute the length of that longest common subsequence.",
    statement:
      "Given two strings a and b, return the length of their longest common subsequence — the longest sequence of characters appearing left-to-right (not necessarily contiguously) in both.",
    inputFormat: "Strings a (length m) and b (length n), 0 ≤ m, n ≤ 1000.",
    outputFormat: "A single integer — the length of the LCS.",
    constraints: [
      "0 ≤ m, n ≤ 1000",
      "A subsequence need not be contiguous",
      "Characters are lowercase ASCII letters",
    ],
    examples: [
      {
        input: 'a = "abcde", b = "ace"',
        output: "3",
        explanation: '"ace" appears in order in both strings.',
      },
      {
        input: 'a = "abc", b = "abc"',
        output: "3",
        explanation: "Identical strings — the whole string is the LCS.",
      },
    ],
    approach: [
      "Let dp[i][j] be the LCS length of a's first i and b's first j characters.",
      "If a[i-1] == b[j-1], the match extends the diagonal: dp[i][j] = dp[i-1][j-1] + 1.",
      "Otherwise take the better of dropping one character from either string.",
      "dp[m][n] is the answer; rolling rows reduce space to O(min(m, n)).",
    ],
    solutionSteps: [
      "Create a (m+1)×(n+1) table of zeros (the empty-prefix base cases).",
      "Fill row by row: on a match add one to the diagonal, else take max(top, left).",
      "Read dp[m][n].",
      "Optionally compress to two rows for O(n) space.",
      "O(m·n) time.",
    ],
    code: {
      python: `def lcs_length(a: str, b: str) -> int:
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]
`,
      java: `public final class ConfigDiffLcs {
    public static int lcsLength(String a, String b) {
        int m = a.length(), n = b.length();
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 1; i <= m; i++)
            for (int j = 1; j <= n; j++) {
                if (a.charAt(i - 1) == b.charAt(j - 1))
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                else
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        return dp[m][n];
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int lcsLength(const string& a, const string& b) {
    int m = a.size(), n = b.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++) {
            if (a[i - 1] == b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
            else dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
        }
    return dp[m][n];
}
`,
    },
    complexity: { time: "O(m·n)", space: "O(m·n) or O(min(m, n)) compressed" },
    pitfalls: [
      "Confusing subsequence (order-preserving, gaps allowed) with substring (contiguous).",
      "Off-by-one indexing between the 1-based dp table and the 0-based strings.",
      "Taking max of the wrong neighbours on a mismatch.",
    ],
    edgeCases: [
      "Either string empty — LCS length 0.",
      "No common characters — 0.",
      "Identical strings — full length.",
    ],
    whyItMatters:
      "LCS is the engine behind diff tools, version control merges, and DNA alignment. Its grid DP and the match/skip recurrence generalise to edit distance and many sequence problems.",
    estimatedMinutes: 32,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 77 — pure_dsa · heap_priority_queue · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "merge-k-shard-streams",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 4,
    pattern: "heap_priority_queue",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer", "platform_engineer"],
    title: "Merge K Shard Streams",
    framing:
      "A query fans out to k database shards, and each shard returns its rows already sorted by timestamp. The coordinator must stitch the k sorted streams into one globally sorted result without loading everything and re-sorting.",
    statement:
      "Given k arrays, each sorted in non-decreasing order, merge them into a single non-decreasing array.",
    inputFormat: "A list of k arrays; total element count N across all arrays, 0 ≤ N ≤ 10^5, values in [-10^9, 10^9].",
    outputFormat: "A single sorted array of length N.",
    constraints: [
      "Each input array is individually sorted ascending",
      "0 ≤ k and 0 ≤ N ≤ 100,000",
      "Target O(N log k) time",
    ],
    examples: [
      {
        input: "streams = [[1,4,5],[1,3,4],[2,6]]",
        output: "[1, 1, 2, 3, 4, 4, 5, 6]",
        explanation: "Repeatedly emit the smallest available head across the three streams.",
      },
      {
        input: "streams = []",
        output: "[]",
        explanation: "No streams to merge.",
      },
    ],
    approach: [
      "A min-heap holds the current front element of each stream, tagged with its source.",
      "Pop the global minimum, emit it, and push the next element from that same stream.",
      "The heap never exceeds k entries, so each pop/push is O(log k).",
      "Across N elements this is O(N log k), versus O(N log N) for a naive concat-and-sort.",
    ],
    solutionSteps: [
      "Seed the heap with the first element of each non-empty stream as (value, streamIndex, elementIndex).",
      "Pop the smallest; append its value to the output.",
      "If that stream has a next element, push it.",
      "Repeat until the heap empties.",
      "O(N log k) time, O(k) heap space.",
    ],
    code: {
      python: `import heapq

def merge_k(streams: list[list[int]]) -> list[int]:
    heap = []
    for s_idx, s in enumerate(streams):
        if s:
            heapq.heappush(heap, (s[0], s_idx, 0))
    out: list[int] = []
    while heap:
        val, s_idx, e_idx = heapq.heappop(heap)
        out.append(val)
        if e_idx + 1 < len(streams[s_idx]):
            nxt = streams[s_idx][e_idx + 1]
            heapq.heappush(heap, (nxt, s_idx, e_idx + 1))
    return out
`,
      java: `import java.util.*;

public final class MergeKShardStreams {
    public static int[] mergeK(int[][] streams) {
        // heap entries: {value, streamIndex, elementIndex}
        PriorityQueue<int[]> heap = new PriorityQueue<>((x, y) -> Integer.compare(x[0], y[0]));
        int total = 0;
        for (int i = 0; i < streams.length; i++) {
            total += streams[i].length;
            if (streams[i].length > 0) heap.offer(new int[]{streams[i][0], i, 0});
        }
        int[] out = new int[total];
        int k = 0;
        while (!heap.isEmpty()) {
            int[] top = heap.poll();
            out[k++] = top[0];
            int s = top[1], e = top[2];
            if (e + 1 < streams[s].length) heap.offer(new int[]{streams[s][e + 1], s, e + 1});
        }
        return out;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> mergeK(const vector<vector<int>>& streams) {
    // tuple: (value, streamIndex, elementIndex)
    using Item = tuple<int,int,int>;
    priority_queue<Item, vector<Item>, greater<Item>> heap;
    for (int i = 0; i < (int)streams.size(); i++)
        if (!streams[i].empty()) heap.push({streams[i][0], i, 0});
    vector<int> out;
    while (!heap.empty()) {
        auto [val, s, e] = heap.top(); heap.pop();
        out.push_back(val);
        if (e + 1 < (int)streams[s].size())
            heap.push({streams[s][e + 1], s, e + 1});
    }
    return out;
}
`,
    },
    complexity: { time: "O(N log k)", space: "O(k)" },
    pitfalls: [
      "Concatenating all arrays and sorting — O(N log N), ignoring the per-stream sortedness.",
      "Pushing a stream's next element from the wrong source index.",
      "Skipping empty input streams when seeding the heap.",
    ],
    edgeCases: [
      "No streams or all empty — empty output.",
      "A single stream — returned as-is.",
      "Streams of wildly different lengths.",
    ],
    whyItMatters:
      "k-way merge with a heap is the backbone of external sorting, log aggregation, and merging sorted shard results — the streaming counterpart to merge sort's two-way merge.",
    estimatedMinutes: 33,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 78 — ai_applied · sliding_window · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-prompt-span-cover",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 4,
    pattern: "sliding_window",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "backend_engineer", "data_engineer"],
    title: "Min Prompt Span Cover",
    framing:
      "A retrieval system has a long token stream and a set of required keyword tokens that a good context snippet must all contain. To keep the prompt short, find the smallest contiguous span of the stream that covers every required token (counting multiplicities). Under the hood this is the classic minimum-window-substring.",
    statement:
      "Given a string s and a string t, return the smallest substring of s that contains every character of t including duplicates. If no such window exists, return the empty string.",
    inputFormat: "Strings s (length n) and t (length m), 1 ≤ n, m ≤ 10^5, ASCII characters.",
    outputFormat: "The minimum-length covering substring, or \"\" if none exists.",
    constraints: [
      "1 ≤ n, m ≤ 100,000",
      "Character multiplicities in t must be fully covered",
      "If multiple minimal windows tie, return the leftmost",
    ],
    examples: [
      {
        input: 's = "ADOBECODEBANC", t = "ABC"',
        output: "BANC",
        explanation: "\"BANC\" is the shortest span containing A, B and C.",
      },
      {
        input: 's = "a", t = "a"',
        output: "a",
        explanation: "The single character already covers the requirement.",
      },
    ],
    approach: [
      "Count the required characters of t in a need map; track how many distinct requirements are still unmet.",
      "Expand the right edge, decrementing a requirement's deficit as characters arrive.",
      "Once all requirements are met, contract from the left to shrink the window while still valid.",
      "Record the smallest valid window seen during contraction.",
    ],
    solutionSteps: [
      "Build need[c] from t and set required = number of distinct chars in t.",
      "Move right across s, updating a window count; when a char's count reaches its need, decrement formed.",
      "While formed == required, try to shrink from the left, updating the best window, then drop the left char.",
      "Return the best window found, or \"\" if none.",
      "O(n + m) time.",
    ],
    code: {
      python: `from collections import Counter

def min_window(s: str, t: str) -> str:
    need = Counter(t)
    required = len(need)
    window: dict[str, int] = {}
    formed = 0
    left = 0
    best = (float("inf"), 0, 0)
    for right, c in enumerate(s):
        window[c] = window.get(c, 0) + 1
        if c in need and window[c] == need[c]:
            formed += 1
        while formed == required:
            if right - left + 1 < best[0]:
                best = (right - left + 1, left, right)
            lc = s[left]
            window[lc] -= 1
            if lc in need and window[lc] < need[lc]:
                formed -= 1
            left += 1
    return "" if best[0] == float("inf") else s[best[1]:best[2] + 1]
`,
      java: `import java.util.*;

public final class MinPromptSpanCover {
    public static String minWindow(String s, String t) {
        Map<Character, Integer> need = new HashMap<>();
        for (char c : t.toCharArray()) need.merge(c, 1, Integer::sum);
        int required = need.size(), formed = 0, left = 0;
        Map<Character, Integer> window = new HashMap<>();
        int bestLen = Integer.MAX_VALUE, bestL = 0, bestR = 0;
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            window.merge(c, 1, Integer::sum);
            if (need.containsKey(c) && window.get(c).intValue() == need.get(c).intValue()) formed++;
            while (formed == required) {
                if (right - left + 1 < bestLen) {
                    bestLen = right - left + 1; bestL = left; bestR = right;
                }
                char lc = s.charAt(left);
                window.merge(lc, -1, Integer::sum);
                if (need.containsKey(lc) && window.get(lc) < need.get(lc)) formed--;
                left++;
            }
        }
        return bestLen == Integer.MAX_VALUE ? "" : s.substring(bestL, bestR + 1);
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

string minWindow(const string& s, const string& t) {
    unordered_map<char, int> need;
    for (char c : t) need[c]++;
    int required = need.size(), formed = 0, left = 0;
    unordered_map<char, int> window;
    int bestLen = INT_MAX, bestL = 0;
    for (int right = 0; right < (int)s.size(); right++) {
        char c = s[right];
        window[c]++;
        if (need.count(c) && window[c] == need[c]) formed++;
        while (formed == required) {
            if (right - left + 1 < bestLen) {
                bestLen = right - left + 1; bestL = left;
            }
            char lc = s[left];
            window[lc]--;
            if (need.count(lc) && window[lc] < need[lc]) formed--;
            left++;
        }
    }
    return bestLen == INT_MAX ? "" : s.substr(bestL, bestLen);
}
`,
    },
    complexity: { time: "O(n + m)", space: "O(m)" },
    pitfalls: [
      "Ignoring duplicate requirements — t may demand a character more than once.",
      "Updating 'formed' on every occurrence rather than only when a count exactly meets its need.",
      "Returning the first valid window instead of continuing to shrink for the minimum.",
    ],
    edgeCases: [
      "No covering window — return empty string.",
      "t longer than s — impossible, empty.",
      "s equals t — the whole string.",
    ],
    whyItMatters:
      "Minimum-window-substring is the hardest-tier variable-window problem; the expand-then-contract with a 'formed vs required' counter is a pattern that recurs in substring, subarray-cover, and span-selection questions.",
    estimatedMinutes: 38,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 79 — pure_dsa · graphs · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "cheapest-route-k-hops",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 4,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "platform_engineer", "data_engineer"],
    title: "Cheapest Route Within K Hops",
    framing:
      "A service-routing layer can forward a request through at most k intermediate relays before it must reach the destination service. Each directed link has a cost. Find the cheapest route from the source to the destination using no more than k relays in between.",
    statement:
      "Given n nodes and a list of directed edges [u, v, cost], find the cheapest total cost to travel from src to dst using at most k intermediate nodes (so at most k+1 edges). Return -1 if no such route exists.",
    inputFormat: "Integer n, an edges list (each [u, v, cost], 1 ≤ cost ≤ 10^4), and integers src, dst, k. 1 ≤ n ≤ 100.",
    outputFormat: "A single integer — the minimum cost, or -1.",
    constraints: [
      "1 ≤ n ≤ 100; nodes are 0-indexed",
      "At most k intermediate nodes (k+1 edges)",
      "Edges are directed",
    ],
    examples: [
      {
        input: "n = 4, edges = [[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]], src = 0, dst = 3, k = 1",
        output: "700",
        explanation: "0→1→3 costs 700 using one relay (node 1); the cheaper-per-edge 0→1→2→3 needs two relays, exceeding k.",
      },
      {
        input: "n = 3, edges = [[0,1,100],[1,2,100],[0,2,500]], src = 0, dst = 2, k = 1",
        output: "200",
        explanation: "0→1→2 costs 200 with one relay, beating the direct 0→2 of 500.",
      },
    ],
    approach: [
      "Bellman-Ford bounded by k+1 relaxation rounds naturally caps the edge count.",
      "Keep a cost array; each round relaxes every edge using a snapshot of the previous round's costs.",
      "Snapshotting prevents using more than one new edge per round.",
      "After k+1 rounds, the destination's cost is the answer.",
    ],
    solutionSteps: [
      "Initialise dist[src] = 0, all others = infinity.",
      "Repeat k+1 times: copy dist, then for each edge [u,v,w] relax dist[v] = min(dist[v], snapshot[u] + w).",
      "Using the snapshot guarantees at most one extra edge is added per round.",
      "Return dist[dst] or -1 if still infinite.",
      "O((k+1)·E) time.",
    ],
    code: {
      python: `def cheapest_route(n: int, edges: list[list[int]], src: int, dst: int, k: int) -> int:
    INF = float("inf")
    dist = [INF] * n
    dist[src] = 0
    for _ in range(k + 1):
        snapshot = dist[:]
        for u, v, w in edges:
            if snapshot[u] != INF and snapshot[u] + w < dist[v]:
                dist[v] = snapshot[u] + w
    return -1 if dist[dst] == INF else dist[dst]
`,
      java: `import java.util.*;

public final class CheapestRouteKHops {
    public static int cheapestRoute(int n, int[][] edges, int src, int dst, int k) {
        final int INF = Integer.MAX_VALUE;
        int[] dist = new int[n];
        Arrays.fill(dist, INF);
        dist[src] = 0;
        for (int round = 0; round <= k; round++) {
            int[] snapshot = dist.clone();
            for (int[] e : edges) {
                int u = e[0], v = e[1], w = e[2];
                if (snapshot[u] != INF && snapshot[u] + w < dist[v])
                    dist[v] = snapshot[u] + w;
            }
        }
        return dist[dst] == INF ? -1 : dist[dst];
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int cheapestRoute(int n, const vector<vector<int>>& edges, int src, int dst, int k) {
    const int INF = INT_MAX;
    vector<int> dist(n, INF);
    dist[src] = 0;
    for (int round = 0; round <= k; round++) {
        vector<int> snapshot = dist;
        for (const auto& e : edges) {
            int u = e[0], v = e[1], w = e[2];
            if (snapshot[u] != INF && snapshot[u] + w < dist[v])
                dist[v] = snapshot[u] + w;
        }
    }
    return dist[dst] == INF ? -1 : dist[dst];
}
`,
    },
    complexity: { time: "O((k+1)·E)", space: "O(n)" },
    pitfalls: [
      "Relaxing against the in-progress dist instead of a per-round snapshot, which lets a single round use multiple new edges.",
      "Confusing 'k intermediate nodes' with 'k edges' — it is k+1 edges.",
      "Plain Dijkstra ignores the hop cap and can return an infeasible cheaper path.",
    ],
    edgeCases: [
      "src == dst — cost 0.",
      "No route within k hops — return -1.",
      "k large enough to be unrestricted — reduces to shortest path.",
    ],
    whyItMatters:
      "Hop-bounded shortest path is exactly the cheapest-flights-within-k-stops problem; the snapshotted Bellman-Ford shows why relaxation order matters and how to encode a path-length constraint into a DP.",
    estimatedMinutes: 36,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 80 — pure_dsa · backtracking · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "keyword-grid-search",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 4,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "frontend_engineer", "backend_engineer"],
    title: "Keyword Grid Search",
    framing:
      "A word-puzzle feature lets users hunt for a keyword inside a letter grid. A match walks between horizontally or vertically adjacent cells, and no cell may be reused within a single match. Decide whether the keyword exists.",
    statement:
      "Given an m×n grid of characters and a word, return true if the word can be formed by a path of adjacent (up/down/left/right) cells, where each cell is used at most once.",
    inputFormat: "A grid of size m×n (1 ≤ m, n ≤ 6 for the hardest cases, up to 200 cells) and a string word (1 ≤ length ≤ 15).",
    outputFormat: "A boolean — true if the word can be traced on the grid.",
    constraints: [
      "Adjacency is four-directional",
      "A cell cannot be reused within one match",
      "Characters are uppercase ASCII letters",
    ],
    examples: [
      {
        input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"',
        output: "true",
        explanation: "Path A(0,0)→B(0,1)→C(0,2)→C(1,2)→E(2,2)→D(2,1) traces the word.",
      },
      {
        input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCB"',
        output: "false",
        explanation: "Reaching the second B would require reusing the only B cell.",
      },
    ],
    approach: [
      "Try each cell as a starting point and run depth-first search matching successive characters.",
      "Mark a cell as visited before recursing into its four neighbours, then restore it on backtrack.",
      "Prune immediately when a cell's letter does not match the expected character.",
      "Success when the full word has been matched.",
    ],
    solutionSteps: [
      "For each cell (r, c), if it equals word[0], launch dfs(r, c, 0).",
      "dfs(r, c, i): if grid[r][c] != word[i] or out of bounds or visited, return false.",
      "If i is the last index, return true.",
      "Mark visited, recurse on the four neighbours with i+1, unmark, and return whether any succeeded.",
      "Worst case O(m·n·4^L) for word length L.",
    ],
    code: {
      python: `def exist(board: list[list[str]], word: str) -> bool:
    m, n = len(board), len(board[0])
    def dfs(r: int, c: int, i: int) -> bool:
        if r < 0 or r >= m or c < 0 or c >= n or board[r][c] != word[i]:
            return False
        if i == len(word) - 1:
            return True
        tmp = board[r][c]
        board[r][c] = "#"
        found = (dfs(r + 1, c, i + 1) or dfs(r - 1, c, i + 1)
                 or dfs(r, c + 1, i + 1) or dfs(r, c - 1, i + 1))
        board[r][c] = tmp
        return found
    for r in range(m):
        for c in range(n):
            if dfs(r, c, 0):
                return True
    return False
`,
      java: `public final class KeywordGridSearch {
    public static boolean exist(char[][] board, String word) {
        int m = board.length, n = board[0].length;
        for (int r = 0; r < m; r++)
            for (int c = 0; c < n; c++)
                if (dfs(board, word, r, c, 0)) return true;
        return false;
    }
    private static boolean dfs(char[][] b, String w, int r, int c, int i) {
        if (r < 0 || r >= b.length || c < 0 || c >= b[0].length || b[r][c] != w.charAt(i))
            return false;
        if (i == w.length() - 1) return true;
        char tmp = b[r][c];
        b[r][c] = '#';
        boolean found = dfs(b, w, r + 1, c, i + 1) || dfs(b, w, r - 1, c, i + 1)
                     || dfs(b, w, r, c + 1, i + 1) || dfs(b, w, r, c - 1, i + 1);
        b[r][c] = tmp;
        return found;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

bool dfs(vector<vector<char>>& b, const string& w, int r, int c, int i) {
    if (r < 0 || r >= (int)b.size() || c < 0 || c >= (int)b[0].size() || b[r][c] != w[i])
        return false;
    if (i == (int)w.size() - 1) return true;
    char tmp = b[r][c];
    b[r][c] = '#';
    bool found = dfs(b, w, r + 1, c, i + 1) || dfs(b, w, r - 1, c, i + 1)
              || dfs(b, w, r, c + 1, i + 1) || dfs(b, w, r, c - 1, i + 1);
    b[r][c] = tmp;
    return found;
}

bool exist(vector<vector<char>>& board, const string& word) {
    for (int r = 0; r < (int)board.size(); r++)
        for (int c = 0; c < (int)board[0].size(); c++)
            if (dfs(board, word, r, c, 0)) return true;
    return false;
}
`,
    },
    complexity: { time: "O(m·n·4^L)", space: "O(L) recursion depth" },
    pitfalls: [
      "Not restoring the cell after backtracking, which permanently blocks valid alternate paths.",
      "Allowing a cell to be reused within the same path.",
      "Checking the match condition after recursing rather than as the first guard.",
    ],
    edgeCases: [
      "Single-cell grid equal to a one-character word.",
      "Word longer than the number of cells — impossible.",
      "Repeated letters forcing the no-reuse rule to matter.",
    ],
    whyItMatters:
      "Grid DFS with in-place visited marking and restore-on-backtrack is the template for word search, island-flood, and maze problems — and it teaches disciplined state cleanup in recursion.",
    estimatedMinutes: 38,
  },
];
