// DSA v2 — Batch 007 (20 questions, 131–150) — completes the 150 launch bank.
//
// Composition: 17 pure_dsa + 2 ai_applied + 1 indian_domain.
// Difficulty: 15 easy / 5 hard (lands the full bank on 75/45/30).
// Boosts thin patterns: tries, greedy, intervals, binary_search, stack/queue.
// Canonical coverage added: intersection-of-arrays, move-zeroes, is-subsequence,
// queue-via-stacks, sqrt, palindrome-linked-list, path-sum, implement-trie,
// assign-cookies, lemonade-change, roman-to-integer, counting-bits, tribonacci,
// summary-ranges, meeting-rooms-I, median-of-two-sorted-arrays,
// largest-rectangle-in-histogram, critical-connections (bridges),
// regex-matching, burst-balloons.
//
// All status = "pending_review" — admin must approve each before live.

import type { DsaV2Question } from "../types";

export const BATCH_007: readonly DsaV2Question[] = [
  // ──────────────────────────────────────────────────────────────────────
  // 131 — pure_dsa · arrays_hashing · easy · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "shared-audience-intersection",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 7,
    pattern: "arrays_hashing",
    difficulty: "easy",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer", "software_engineer"],
    title: "Shared Audience Intersection",
    framing:
      "Two marketing segments each list the user IDs they target. To find users eligible for a joint campaign, return the distinct IDs present in both segments.",
    statement:
      "Given two integer arrays nums1 and nums2, return an array of their intersection. Each element in the result must be unique, and the result may be in any order.",
    inputFormat: "Two arrays nums1, nums2 (0 ≤ length ≤ 1000), values in [0, 10^4].",
    outputFormat: "An array of the distinct values present in both inputs.",
    constraints: [
      "Each result element appears once, regardless of input multiplicity",
      "0 ≤ nums1.length, nums2.length ≤ 1000",
      "Order of the result does not matter",
    ],
    examples: [
      {
        input: "nums1 = [1,2,2,1], nums2 = [2,2]",
        output: "[2]",
        explanation: "2 is the only shared value; duplicates collapse to one entry.",
      },
      {
        input: "nums1 = [4,9,5], nums2 = [9,4,9,8,4]",
        output: "[9,4]",
        explanation: "9 and 4 appear in both; order is arbitrary.",
      },
    ],
    approach: [
      "Put the first array into a hash set for O(1) membership tests.",
      "Scan the second array; collect values that are in the set.",
      "Use a result set to keep entries unique.",
      "Return the result set's contents.",
    ],
    solutionSteps: [
      "Build set A from nums1.",
      "Iterate nums2; if a value is in A, add it to a result set.",
      "Convert the result set to a list and return it.",
    ],
    code: {
      python: `def intersection(nums1: list[int], nums2: list[int]) -> list[int]:
    a = set(nums1)
    return list({x for x in nums2 if x in a})
`,
      java: `import java.util.*;

public final class SharedAudienceIntersection {
    public static int[] intersection(int[] nums1, int[] nums2) {
        Set<Integer> a = new HashSet<>();
        for (int x : nums1) a.add(x);
        Set<Integer> out = new HashSet<>();
        for (int x : nums2) if (a.contains(x)) out.add(x);
        int[] res = new int[out.size()];
        int i = 0;
        for (int x : out) res[i++] = x;
        return res;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> intersection(vector<int>& nums1, vector<int>& nums2) {
    unordered_set<int> a(nums1.begin(), nums1.end()), out;
    for (int x : nums2) if (a.count(x)) out.insert(x);
    return vector<int>(out.begin(), out.end());
}
`,
    },
    complexity: { time: "O(n + m)", space: "O(n + m)" },
    pitfalls: [
      "Returning duplicates when a value appears multiple times in nums2.",
      "Nested-loop O(n·m) membership instead of a hash set.",
      "Assuming a sorted or specific output order.",
    ],
    edgeCases: [
      "Either array empty — intersection is empty.",
      "No common elements.",
      "All elements common.",
    ],
    whyItMatters:
      "Set intersection is the simplest expression of hash-based membership — the same primitive behind audience overlap, permission joins, and dedup pipelines.",
    estimatedMinutes: 12,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 132 — pure_dsa · two_pointers · easy · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "compact-inactive-flags",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 7,
    pattern: "two_pointers",
    difficulty: "easy",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer", "mobile_engineer"],
    title: "Compact Inactive Flags",
    framing:
      "A feature-flag array uses 0 for an inactive slot. To compact storage, push every inactive slot to the end while preserving the relative order of the active flags — done in place.",
    statement:
      "Given an integer array nums, move all 0s to the end while keeping the relative order of the non-zero elements. Do this in place without making a copy.",
    inputFormat: "An array nums of n integers (1 ≤ n ≤ 10^4).",
    outputFormat: "The same array mutated so non-zeros keep order and 0s trail.",
    constraints: [
      "Must operate in place — O(1) extra space",
      "Relative order of non-zero elements is preserved",
      "1 ≤ nums.length ≤ 10,000",
    ],
    examples: [
      {
        input: "[0,1,0,3,12]",
        output: "[1,3,12,0,0]",
        explanation: "Non-zeros keep order; both zeros move to the end.",
      },
      {
        input: "[0]",
        output: "[0]",
        explanation: "A single zero is already compacted.",
      },
    ],
    approach: [
      "Keep a write pointer for the next slot that should hold a non-zero.",
      "Scan with a read pointer; on each non-zero, write it at the write pointer and advance it.",
      "After the scan, fill the remaining slots with zeros.",
      "A swap-based variant avoids the second pass.",
    ],
    solutionSteps: [
      "Set insert = 0.",
      "For each value, if non-zero, place it at nums[insert] and increment insert.",
      "From insert to the end, set entries to 0.",
    ],
    code: {
      python: `def move_zeroes(nums: list[int]) -> None:
    insert = 0
    for x in nums:
        if x != 0:
            nums[insert] = x
            insert += 1
    for i in range(insert, len(nums)):
        nums[i] = 0
`,
      java: `public final class CompactInactiveFlags {
    public static void moveZeroes(int[] nums) {
        int insert = 0;
        for (int x : nums) if (x != 0) nums[insert++] = x;
        while (insert < nums.length) nums[insert++] = 0;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

void moveZeroes(vector<int>& nums) {
    int insert = 0;
    for (int x : nums) if (x != 0) nums[insert++] = x;
    while (insert < (int)nums.size()) nums[insert++] = 0;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Allocating a new array — violates the in-place requirement.",
      "Swapping unconditionally can reorder or do redundant writes; guard on non-zero.",
      "Forgetting to zero-fill the tail after the compaction pass.",
    ],
    edgeCases: [
      "No zeros — array unchanged.",
      "All zeros — unchanged.",
      "Single element.",
    ],
    whyItMatters:
      "The read/write two-pointer compaction is the in-place workhorse behind array filtering, partitioning, and stream cleanup without extra allocation.",
    estimatedMinutes: 13,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 133 — pure_dsa · two_pointers · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "telemetry-subsequence-check",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 7,
    pattern: "two_pointers",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer", "software_engineer"],
    title: "Telemetry Subsequence Check",
    framing:
      "A required sequence of telemetry events must appear in order (not necessarily contiguously) within the recorded event stream. Verify the required sequence is a subsequence of the recording.",
    statement:
      "Given two strings s and t, return true if s is a subsequence of t. A subsequence keeps relative order but may skip characters of t.",
    inputFormat: "Two strings s and t (0 ≤ |s| ≤ 100, 0 ≤ |t| ≤ 10^4).",
    outputFormat: "A boolean — true if s is a subsequence of t.",
    constraints: [
      "Characters of s must appear in t in the same order",
      "Empty s is always a subsequence",
      "Lowercase English letters",
    ],
    examples: [
      {
        input: 's = "abc", t = "ahbgdc"',
        output: "true",
        explanation: "a…b…c appear in order within t.",
      },
      {
        input: 's = "axc", t = "ahbgdc"',
        output: "false",
        explanation: "There is no 'x' in t after 'a'.",
      },
    ],
    approach: [
      "Walk t with one pointer, advancing a second pointer through s on each match.",
      "If the s pointer reaches the end, every character was matched in order.",
      "A single linear pass over t suffices.",
    ],
    solutionSteps: [
      "Set i = 0 for s.",
      "For each character c in t, if c == s[i], increment i.",
      "Return whether i reached len(s).",
    ],
    code: {
      python: `def is_subsequence(s: str, t: str) -> bool:
    i = 0
    for c in t:
        if i < len(s) and c == s[i]:
            i += 1
    return i == len(s)
`,
      java: `public final class TelemetrySubsequenceCheck {
    public static boolean isSubsequence(String s, String t) {
        int i = 0;
        for (int j = 0; j < t.length() && i < s.length(); j++) {
            if (t.charAt(j) == s.charAt(i)) i++;
        }
        return i == s.length();
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

bool isSubsequence(string s, string t) {
    int i = 0;
    for (char c : t) if (i < (int)s.size() && c == s[i]) i++;
    return i == (int)s.size();
}
`,
    },
    complexity: { time: "O(|t|)", space: "O(1)" },
    pitfalls: [
      "Requiring contiguity — a subsequence may skip characters of t.",
      "Indexing s out of bounds when it is already fully matched.",
      "Mishandling empty s, which should return true.",
    ],
    edgeCases: [
      "Empty s — true.",
      "s longer than t — false.",
      "s equals t — true.",
    ],
    whyItMatters:
      "Subsequence matching is the linear-scan two-pointer pattern underlying diffing, event-order validation, and streaming pattern checks.",
    estimatedMinutes: 12,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 134 — pure_dsa · stack_queue · easy · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "queue-from-two-stacks",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 7,
    pattern: "stack_queue",
    difficulty: "easy",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer", "platform_engineer"],
    title: "Queue From Two Stacks",
    framing:
      "A worker only exposes a stack primitive, but the job dispatcher needs FIFO ordering. Implement a queue using two stacks so enqueue and dequeue stay amortised O(1).",
    statement:
      "Implement a FIFO queue using only two stacks. Support push(x), pop() (remove and return the front), peek() (return the front), and empty(). Each operation must use only standard stack operations (push, pop, peek/top, size/empty).",
    inputFormat: "A sequence of push/pop/peek/empty operations; pushed values are integers.",
    outputFormat: "Each pop/peek returns the front element; empty returns a boolean.",
    constraints: [
      "Only stack operations may be used internally",
      "pop and peek are called on a non-empty queue",
      "Amortised O(1) per operation",
    ],
    examples: [
      {
        input: "push(1), push(2), peek(), pop(), empty()",
        output: "peek→1, pop→1, empty→false",
        explanation: "FIFO: 1 enqueued first leaves first; 2 still remains.",
      },
      {
        input: "push(5), pop(), empty()",
        output: "pop→5, empty→true",
        explanation: "The single element dequeues, leaving the queue empty.",
      },
    ],
    approach: [
      "Keep an 'in' stack for pushes and an 'out' stack for pops.",
      "On pop/peek, if 'out' is empty, pour all of 'in' into 'out', reversing order to FIFO.",
      "The front of the queue is then the top of 'out'.",
      "Each element is moved at most once, giving amortised O(1).",
    ],
    solutionSteps: [
      "push: append to the 'in' stack.",
      "transfer: if 'out' is empty, pop every 'in' element onto 'out'.",
      "pop: transfer, then pop from 'out'.",
      "peek: transfer, then return the top of 'out'.",
      "empty: both stacks empty.",
    ],
    code: {
      python: `class MyQueue:
    def __init__(self) -> None:
        self._in: list[int] = []
        self._out: list[int] = []

    def push(self, x: int) -> None:
        self._in.append(x)

    def _transfer(self) -> None:
        if not self._out:
            while self._in:
                self._out.append(self._in.pop())

    def pop(self) -> int:
        self._transfer()
        return self._out.pop()

    def peek(self) -> int:
        self._transfer()
        return self._out[-1]

    def empty(self) -> bool:
        return not self._in and not self._out
`,
      java: `import java.util.*;

public final class QueueFromTwoStacks {
    private final Deque<Integer> in = new ArrayDeque<>();
    private final Deque<Integer> out = new ArrayDeque<>();

    public void push(int x) { in.push(x); }

    private void transfer() {
        if (out.isEmpty()) while (!in.isEmpty()) out.push(in.pop());
    }

    public int pop() { transfer(); return out.pop(); }
    public int peek() { transfer(); return out.peek(); }
    public boolean empty() { return in.isEmpty() && out.isEmpty(); }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

class MyQueue {
    stack<int> in, out;
    void transfer() { if (out.empty()) while (!in.empty()) { out.push(in.top()); in.pop(); } }
public:
    void push(int x) { in.push(x); }
    int pop() { transfer(); int v = out.top(); out.pop(); return v; }
    int peek() { transfer(); return out.top(); }
    bool empty() { return in.empty() && out.empty(); }
};
`,
    },
    complexity: { time: "Amortised O(1) per op", space: "O(n)" },
    pitfalls: [
      "Transferring on every operation instead of only when 'out' is empty — kills the amortised bound.",
      "Pouring 'in' into 'out' while 'out' is non-empty, corrupting order.",
      "Forgetting that both stacks must be empty for empty() to be true.",
    ],
    edgeCases: [
      "Interleaved pushes and pops.",
      "Single element queue.",
      "Repeated peeks without pops.",
    ],
    whyItMatters:
      "Building a queue from stacks teaches amortised analysis and adapter design — the same lazy-transfer idea appears in double-buffering and batch flush systems.",
    estimatedMinutes: 16,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 135 — pure_dsa · binary_search · easy · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "integer-square-root",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 7,
    pattern: "binary_search",
    difficulty: "easy",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer", "data_engineer"],
    title: "Integer Square Root",
    framing:
      "A sizing helper needs the largest integer whose square does not exceed a capacity value — the floor of its square root — computed without floating-point math.",
    statement:
      "Given a non-negative integer x, return the floor of its square root (the largest integer r with r·r ≤ x). Do not use any built-in sqrt function.",
    inputFormat: "An integer x (0 ≤ x ≤ 2^31 − 1).",
    outputFormat: "An integer — floor(sqrt(x)).",
    constraints: [
      "No built-in square-root function",
      "Answer is the integer floor",
      "Beware overflow when squaring the midpoint",
    ],
    examples: [
      {
        input: "x = 8",
        output: "2",
        explanation: "sqrt(8) ≈ 2.828; the floor is 2.",
      },
      {
        input: "x = 16",
        output: "4",
        explanation: "16 is a perfect square.",
      },
    ],
    approach: [
      "Binary-search r in [0, x].",
      "If mid·mid ≤ x, mid is a candidate — search higher and remember it.",
      "Otherwise search lower.",
      "Use 64-bit products to avoid overflow when squaring.",
    ],
    solutionSteps: [
      "Set lo = 0, hi = x, ans = 0.",
      "While lo ≤ hi, mid = (lo+hi)/2.",
      "If mid·mid ≤ x, set ans = mid and lo = mid+1; else hi = mid−1.",
      "Return ans.",
    ],
    code: {
      python: `def my_sqrt(x: int) -> int:
    lo, hi, ans = 0, x, 0
    while lo <= hi:
        mid = (lo + hi) // 2
        if mid * mid <= x:
            ans = mid
            lo = mid + 1
        else:
            hi = mid - 1
    return ans
`,
      java: `public final class IntegerSquareRoot {
    public static int mySqrt(int x) {
        long lo = 0, hi = x, ans = 0;
        while (lo <= hi) {
            long mid = (lo + hi) / 2;
            if (mid * mid <= x) { ans = mid; lo = mid + 1; }
            else hi = mid - 1;
        }
        return (int) ans;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int mySqrt(int x) {
    long long lo = 0, hi = x, ans = 0;
    while (lo <= hi) {
        long long mid = (lo + hi) / 2;
        if (mid * mid <= (long long)x) { ans = mid; lo = mid + 1; }
        else hi = mid - 1;
    }
    return (int)ans;
}
`,
    },
    complexity: { time: "O(log x)", space: "O(1)" },
    pitfalls: [
      "32-bit overflow when computing mid·mid — use 64-bit.",
      "Returning the ceiling instead of the floor.",
      "Infinite loops from incorrect lo/hi updates.",
    ],
    edgeCases: [
      "x = 0 → 0 and x = 1 → 1.",
      "Perfect squares.",
      "Large x near 2^31 − 1.",
    ],
    whyItMatters:
      "Integer sqrt is the gateway to 'binary search on the answer' — searching a monotone predicate over a numeric range rather than an array, a technique reused across capacity and threshold problems.",
    estimatedMinutes: 14,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 136 — pure_dsa · linked_list · easy · mobile_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "palindrome-playlist-check",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 7,
    pattern: "linked_list",
    difficulty: "easy",
    primaryRole: "mobile_engineer",
    roles: ["mobile_engineer", "software_engineer", "frontend_engineer"],
    title: "Palindrome Playlist Check",
    framing:
      "A playlist is stored as a singly linked list of track IDs. Decide whether it reads the same forwards and backwards using only constant extra memory.",
    statement:
      "Given the head of a singly linked list, return true if the list is a palindrome. Aim for O(n) time and O(1) extra space.",
    inputFormat: "The head of a singly linked list of n nodes (0 ≤ n ≤ 10^5), integer values.",
    outputFormat: "A boolean — true if the values form a palindrome.",
    constraints: [
      "Target O(1) extra space (excluding the input list)",
      "0 ≤ n ≤ 100,000",
      "Restoring the list after checking is a nice-to-have",
    ],
    examples: [
      {
        input: "1 → 2 → 2 → 1",
        output: "true",
        explanation: "The sequence mirrors itself.",
      },
      {
        input: "1 → 2 → 3",
        output: "false",
        explanation: "Reversed it is 3 → 2 → 1, which differs.",
      },
    ],
    approach: [
      "Find the middle with slow/fast pointers.",
      "Reverse the second half in place.",
      "Walk the first half and reversed second half in lockstep comparing values.",
      "Any mismatch means it is not a palindrome.",
    ],
    solutionSteps: [
      "Advance slow by 1 and fast by 2 until fast reaches the end.",
      "Reverse the list starting at slow.",
      "Compare the head half against the reversed tail half node by node.",
      "Return true if all values matched.",
    ],
    code: {
      python: `class ListNode:
    def __init__(self, val: int = 0, next=None):
        self.val, self.next = val, next

def is_palindrome(head) -> bool:
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    prev = None
    while slow:
        slow.next, prev, slow = prev, slow, slow.next
    left, right = head, prev
    while right:
        if left.val != right.val:
            return False
        left, right = left.next, right.next
    return True
`,
      java: `public final class PalindromePlaylistCheck {
    static class ListNode { int val; ListNode next; ListNode(int v) { val = v; } }

    public static boolean isPalindrome(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) { slow = slow.next; fast = fast.next.next; }
        ListNode prev = null;
        while (slow != null) { ListNode nxt = slow.next; slow.next = prev; prev = slow; slow = nxt; }
        ListNode left = head, right = prev;
        while (right != null) {
            if (left.val != right.val) return false;
            left = left.next; right = right.next;
        }
        return true;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

struct ListNode { int val; ListNode* next; ListNode(int v) : val(v), next(nullptr) {} };

bool isPalindrome(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) { slow = slow->next; fast = fast->next->next; }
    ListNode* prev = nullptr;
    while (slow) { ListNode* nxt = slow->next; slow->next = prev; prev = slow; slow = nxt; }
    ListNode *l = head, *r = prev;
    while (r) { if (l->val != r->val) return false; l = l->next; r = r->next; }
    return true;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Copying values to an array uses O(n) space — fine but misses the O(1) goal.",
      "Off-by-one on the middle for odd vs even lengths.",
      "Losing the next pointer during reversal.",
    ],
    edgeCases: [
      "Empty or single-node list — true.",
      "Even vs odd length.",
      "All equal values.",
    ],
    whyItMatters:
      "Combining slow/fast traversal with in-place reversal is the canonical O(1)-space linked-list technique, central to pointer-manipulation interviews.",
    estimatedMinutes: 16,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 137 — pure_dsa · trees · easy · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "cost-path-to-leaf",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 7,
    pattern: "trees",
    difficulty: "easy",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer", "data_engineer"],
    title: "Cost Path To Leaf",
    framing:
      "A decision tree assigns a cost to each node. Determine whether some root-to-leaf path's costs sum exactly to a given budget.",
    statement:
      "Given the root of a binary tree and an integer targetSum, return true if there is a root-to-leaf path whose node values add up to targetSum. A leaf is a node with no children.",
    inputFormat: "The root of a binary tree (0 ≤ nodes ≤ 5000) and integer targetSum; values may be negative.",
    outputFormat: "A boolean — true if such a root-to-leaf path exists.",
    constraints: [
      "The path must end at a leaf (no children)",
      "Node values can be negative",
      "0 ≤ number of nodes ≤ 5000",
    ],
    examples: [
      {
        input: "root = [5,4,8,11,null,13,4,7,2], targetSum = 22",
        output: "true",
        explanation: "5 → 4 → 11 → 2 sums to 22.",
      },
      {
        input: "root = [1,2,3], targetSum = 5",
        output: "false",
        explanation: "Root-to-leaf sums are 3 and 4; neither is 5.",
      },
    ],
    approach: [
      "Subtract the current node's value from the remaining target as you descend.",
      "At a leaf, success means the remaining target equals the leaf's value.",
      "Recurse into both children with the reduced target.",
      "Return true if either branch succeeds.",
    ],
    solutionSteps: [
      "If the node is null, return false.",
      "If it is a leaf, return whether its value equals the remaining sum.",
      "Otherwise recurse left/right with target − node.value.",
      "Return the OR of the two recursive calls.",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val: int = 0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def has_path_sum(root, target_sum: int) -> bool:
    if root is None:
        return False
    if root.left is None and root.right is None:
        return root.val == target_sum
    rest = target_sum - root.val
    return has_path_sum(root.left, rest) or has_path_sum(root.right, rest)
`,
      java: `public final class CostPathToLeaf {
    static class TreeNode { int val; TreeNode left, right; TreeNode(int v) { val = v; } }

    public static boolean hasPathSum(TreeNode root, int targetSum) {
        if (root == null) return false;
        if (root.left == null && root.right == null) return root.val == targetSum;
        int rest = targetSum - root.val;
        return hasPathSum(root.left, rest) || hasPathSum(root.right, rest);
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

struct TreeNode { int val; TreeNode *left, *right; TreeNode(int v) : val(v), left(nullptr), right(nullptr) {} };

bool hasPathSum(TreeNode* root, int targetSum) {
    if (!root) return false;
    if (!root->left && !root->right) return root->val == targetSum;
    int rest = targetSum - root->val;
    return hasPathSum(root->left, rest) || hasPathSum(root->right, rest);
}
`,
    },
    complexity: { time: "O(n)", space: "O(h)" },
    pitfalls: [
      "Treating a null child as a valid leaf — only nodes without any children are leaves.",
      "Returning true at internal nodes when the running sum matches prematurely.",
      "Ignoring negative values, which can make later nodes recover the target.",
    ],
    edgeCases: [
      "Empty tree — false.",
      "Single node equal to target — true.",
      "Negative values along the path.",
    ],
    whyItMatters:
      "Root-to-leaf path-sum is the template for top-down DFS with an accumulated state — the same pattern behind cumulative-constraint traversals and decision-tree evaluation.",
    estimatedMinutes: 14,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 138 — ai_applied · tries · easy · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "prefix-tree-index",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 7,
    pattern: "tries",
    difficulty: "easy",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "backend_engineer", "software_engineer"],
    title: "Prefix Tree Index For Prompt Snippets",
    framing:
      "A prompt-engineering tool autocompletes saved prompt snippets as the user types. Build the prefix index it relies on: insert snippets, check exact matches, and test whether any snippet starts with a given prefix.",
    statement:
      "Implement a trie (prefix tree) supporting insert(word), search(word) — true only if the exact word was inserted — and startsWith(prefix) — true if any inserted word has that prefix.",
    inputFormat: "A sequence of insert/search/startsWith calls with lowercase strings (length ≤ 100).",
    outputFormat: "search and startsWith each return a boolean.",
    constraints: [
      "search matches whole words; startsWith matches any prefix",
      "Lowercase English letters only",
      "Up to 3·10^4 operations",
    ],
    examples: [
      {
        input: 'insert("apple"), search("apple"), search("app"), startsWith("app")',
        output: "search→true, search→false, startsWith→true",
        explanation: "'app' is a prefix but was not inserted as a word.",
      },
      {
        input: 'insert("app"), search("app")',
        output: "search→true",
        explanation: "After inserting 'app' the exact search succeeds.",
      },
    ],
    approach: [
      "Each node holds child links per letter and an end-of-word flag.",
      "insert walks/creates children for each character, marking the last as a word end.",
      "search walks the path and returns the end-of-word flag at the final node.",
      "startsWith walks the path and returns whether it exists, ignoring the flag.",
    ],
    solutionSteps: [
      "Define a node with a children map and an isEnd boolean.",
      "insert: descend creating missing children, set isEnd at the end.",
      "search: descend; if any link missing return false; else return isEnd.",
      "startsWith: descend; return true if the full prefix path exists.",
    ],
    code: {
      python: `class Trie:
    def __init__(self) -> None:
        self.children: dict[str, "Trie"] = {}
        self.is_end = False

    def insert(self, word: str) -> None:
        node = self
        for ch in word:
            node = node.children.setdefault(ch, Trie())
        node.is_end = True

    def _find(self, s: str):
        node = self
        for ch in s:
            if ch not in node.children:
                return None
            node = node.children[ch]
        return node

    def search(self, word: str) -> bool:
        node = self._find(word)
        return node is not None and node.is_end

    def starts_with(self, prefix: str) -> bool:
        return self._find(prefix) is not None
`,
      java: `import java.util.*;

public final class PrefixTreeIndex {
    private final Map<Character, PrefixTreeIndex> children = new HashMap<>();
    private boolean isEnd = false;

    public void insert(String word) {
        PrefixTreeIndex node = this;
        for (char ch : word.toCharArray())
            node = node.children.computeIfAbsent(ch, k -> new PrefixTreeIndex());
        node.isEnd = true;
    }

    private PrefixTreeIndex find(String s) {
        PrefixTreeIndex node = this;
        for (char ch : s.toCharArray()) {
            node = node.children.get(ch);
            if (node == null) return null;
        }
        return node;
    }

    public boolean search(String word) {
        PrefixTreeIndex node = find(word);
        return node != null && node.isEnd;
    }

    public boolean startsWith(String prefix) {
        return find(prefix) != null;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

struct Trie {
    unordered_map<char, Trie*> children;
    bool isEnd = false;

    void insert(const string& word) {
        Trie* node = this;
        for (char ch : word) {
            if (!node->children.count(ch)) node->children[ch] = new Trie();
            node = node->children[ch];
        }
        node->isEnd = true;
    }
    Trie* find(const string& s) {
        Trie* node = this;
        for (char ch : s) {
            if (!node->children.count(ch)) return nullptr;
            node = node->children[ch];
        }
        return node;
    }
    bool search(const string& word) { Trie* n = find(word); return n && n->isEnd; }
    bool startsWith(const string& prefix) { return find(prefix) != nullptr; }
};
`,
    },
    complexity: { time: "O(L) per op", space: "O(total characters)" },
    pitfalls: [
      "Conflating search with startsWith — search must check the end-of-word flag.",
      "Forgetting to mark isEnd, so inserted words never 'search' true.",
      "Re-creating child nodes on insert and dropping earlier branches.",
    ],
    edgeCases: [
      "Empty string operations.",
      "A word that is a prefix of another.",
      "Repeated inserts of the same word.",
    ],
    whyItMatters:
      "The trie is the backbone of autocomplete and prefix retrieval; here it indexes prompt snippets so an AI tool can suggest completions in O(length) regardless of library size.",
    estimatedMinutes: 16,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 139 — pure_dsa · greedy · easy · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "allocate-compute-credits",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 7,
    pattern: "greedy",
    difficulty: "easy",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "backend_engineer", "data_engineer"],
    title: "Allocate Compute Credits",
    framing:
      "Each tenant needs a minimum compute-credit grant to run. You hold grants of various sizes. Maximise how many tenants you can satisfy, one grant per tenant.",
    statement:
      "Given an array need where need[i] is tenant i's minimum requirement, and an array grants of available grant sizes, assign at most one grant per tenant (a grant satisfies a tenant if grant ≥ need). Return the maximum number of satisfied tenants.",
    inputFormat: "Arrays need (0 ≤ len ≤ 3·10^4) and grants (0 ≤ len ≤ 3·10^4), positive sizes.",
    outputFormat: "An integer — the maximum number of satisfied tenants.",
    constraints: [
      "Each grant and each tenant is used at most once",
      "A grant satisfies a tenant when grant ≥ need",
      "Sizes are positive integers",
    ],
    examples: [
      {
        input: "need = [1,2,3], grants = [1,1]",
        output: "1",
        explanation: "Only the tenant needing 1 can be satisfied.",
      },
      {
        input: "need = [1,2], grants = [1,2,3]",
        output: "2",
        explanation: "Grant 1 → tenant 1, grant 2 → tenant 2.",
      },
    ],
    approach: [
      "Sort both arrays ascending.",
      "Greedily give the smallest sufficient grant to the smallest unmet need.",
      "Advance the tenant pointer only when the current grant satisfies it.",
      "Always advance the grant pointer.",
    ],
    solutionSteps: [
      "Sort need and grants.",
      "Use pointers i (need) and j (grants), count = 0.",
      "If grants[j] ≥ need[i], increment count and i; always increment j.",
      "Stop when either pointer runs out; return count.",
    ],
    code: {
      python: `def max_satisfied(need: list[int], grants: list[int]) -> int:
    need.sort()
    grants.sort()
    i = j = count = 0
    while i < len(need) and j < len(grants):
        if grants[j] >= need[i]:
            count += 1
            i += 1
        j += 1
    return count
`,
      java: `import java.util.*;

public final class AllocateComputeCredits {
    public static int maxSatisfied(int[] need, int[] grants) {
        Arrays.sort(need);
        Arrays.sort(grants);
        int i = 0, j = 0, count = 0;
        while (i < need.length && j < grants.length) {
            if (grants[j] >= need[i]) { count++; i++; }
            j++;
        }
        return count;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int maxSatisfied(vector<int>& need, vector<int>& grants) {
    sort(need.begin(), need.end());
    sort(grants.begin(), grants.end());
    int i = 0, j = 0, count = 0;
    while (i < (int)need.size() && j < (int)grants.size()) {
        if (grants[j] >= need[i]) { count++; i++; }
        j++;
    }
    return count;
}
`,
    },
    complexity: { time: "O(n log n + m log m)", space: "O(1)" },
    pitfalls: [
      "Assigning the largest grant first wastes capacity that smaller needs could have used.",
      "Advancing the tenant pointer when the grant is insufficient.",
      "Forgetting to sort, which breaks the greedy argument.",
    ],
    edgeCases: [
      "No grants — 0 satisfied.",
      "Every grant too small.",
      "More grants than tenants.",
    ],
    whyItMatters:
      "The sorted two-pointer greedy is a provably optimal matching strategy, reused in scheduling, bin assignment, and resource fitting.",
    estimatedMinutes: 14,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 140 — indian_domain · greedy · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "fastag-booth-change",
    version: 1,
    status: "pending_review",
    bucket: "indian_domain",
    batchNo: 7,
    pattern: "greedy",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer", "platform_engineer"],
    title: "FASTag Booth Change",
    framing:
      "A toll booth charges a flat ₹50 per vehicle and starts with no cash. Vehicles arrive in order, each paying with a single ₹50, ₹100, or ₹200 note. Decide whether you can give correct change to every vehicle from notes received earlier.",
    statement:
      "Each toll is ₹50. Given an array bills of the notes vehicles pay with (each 50, 100, or 200), in arrival order, return true if you can provide correct change to every vehicle. You start with no notes and may only use notes collected from earlier vehicles.",
    inputFormat: "An array bills of n values, each in {50, 100, 200} (1 ≤ n ≤ 10^5).",
    outputFormat: "A boolean — true if every vehicle gets correct change.",
    constraints: [
      "Toll is exactly ₹50 per vehicle",
      "Change must come only from previously received notes",
      "A ₹200 payment needs ₹150 change: a ₹100+₹50 or three ₹50s",
    ],
    examples: [
      {
        input: "bills = [50,50,100,50,200]",
        output: "true",
        explanation: "Collect two ₹50s, give one back for the ₹100, and use ₹100+₹50 to change the ₹200.",
      },
      {
        input: "bills = [50,200]",
        output: "false",
        explanation: "The ₹200 needs ₹150 change but only one ₹50 is on hand.",
      },
    ],
    approach: [
      "Track counts of ₹50 and ₹100 notes on hand.",
      "₹50 needs no change. ₹100 needs one ₹50.",
      "₹200 prefers a ₹100+₹50; otherwise three ₹50s.",
      "If the required change is unavailable at any step, return false.",
    ],
    solutionSteps: [
      "Maintain fifties and hundreds counters.",
      "On 50: fifties++. On 100: need a fifty, else fail; hundreds++.",
      "On 200: use one hundred + one fifty if possible, else three fifties, else fail.",
      "Return true if every vehicle was served.",
    ],
    code: {
      python: `def lemonade_change(bills: list[int]) -> bool:
    fifties = hundreds = 0
    for b in bills:
        if b == 50:
            fifties += 1
        elif b == 100:
            if fifties == 0:
                return False
            fifties -= 1
            hundreds += 1
        else:  # 200
            if hundreds > 0 and fifties > 0:
                hundreds -= 1
                fifties -= 1
            elif fifties >= 3:
                fifties -= 3
            else:
                return False
    return True
`,
      java: `public final class FastagBoothChange {
    public static boolean lemonadeChange(int[] bills) {
        int fifties = 0, hundreds = 0;
        for (int b : bills) {
            if (b == 50) fifties++;
            else if (b == 100) {
                if (fifties == 0) return false;
                fifties--; hundreds++;
            } else {
                if (hundreds > 0 && fifties > 0) { hundreds--; fifties--; }
                else if (fifties >= 3) fifties -= 3;
                else return false;
            }
        }
        return true;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

bool lemonadeChange(vector<int>& bills) {
    int fifties = 0, hundreds = 0;
    for (int b : bills) {
        if (b == 50) fifties++;
        else if (b == 100) {
            if (fifties == 0) return false;
            fifties--; hundreds++;
        } else {
            if (hundreds > 0 && fifties > 0) { hundreds--; fifties--; }
            else if (fifties >= 3) fifties -= 3;
            else return false;
        }
    }
    return true;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Preferring three ₹50s over a ₹100+₹50 for a ₹200 — it hoards the wrong notes and fails later.",
      "Tracking ₹200 notes, which are never usable as change here.",
      "Forgetting you begin with zero cash.",
    ],
    edgeCases: [
      "First vehicle pays ₹100 or ₹200 — immediate failure.",
      "All ₹50 — always true.",
      "Exactly enough small notes for a late ₹200.",
    ],
    whyItMatters:
      "Greedy change-making proves that committing larger denominations first leaves the most flexible reserves — the same exchange-argument reasoning used in cash handling and allocation systems.",
    estimatedMinutes: 15,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 141 — pure_dsa · math_geometry · easy · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "roman-tier-decode",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 7,
    pattern: "math_geometry",
    difficulty: "easy",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer", "frontend_engineer"],
    title: "Roman Tier Decode",
    framing:
      "A legacy licensing system labels plan tiers with Roman numerals. Convert a Roman-numeral tier string into its integer value.",
    statement:
      "Given a Roman numeral string s, convert it to an integer. Symbols are I=1, V=5, X=10, L=50, C=100, D=500, M=1000; when a smaller symbol precedes a larger one it is subtracted (e.g. IV = 4, IX = 9).",
    inputFormat: "A valid Roman numeral string s (1 ≤ |s| ≤ 15) in the range 1..3999.",
    outputFormat: "An integer — the decoded value.",
    constraints: [
      "Input is guaranteed to be a valid Roman numeral",
      "Subtractive pairs: IV, IX, XL, XC, CD, CM",
      "Value range 1..3999",
    ],
    examples: [
      {
        input: 's = "LVIII"',
        output: "58",
        explanation: "L=50, V=5, III=3.",
      },
      {
        input: 's = "MCMXCIV"',
        output: "1994",
        explanation: "M=1000, CM=900, XC=90, IV=4.",
      },
    ],
    approach: [
      "Map each symbol to its value.",
      "Scan left to right; if a symbol's value is less than the next's, subtract it, else add it.",
      "A single pass yields the total.",
    ],
    solutionSteps: [
      "Build the symbol→value map.",
      "For each index i, compare value[s[i]] with value[s[i+1]].",
      "Subtract when the current is smaller than the next; otherwise add.",
      "Return the accumulated total.",
    ],
    code: {
      python: `def roman_to_int(s: str) -> int:
    vals = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
    total = 0
    for i in range(len(s)):
        if i + 1 < len(s) and vals[s[i]] < vals[s[i + 1]]:
            total -= vals[s[i]]
        else:
            total += vals[s[i]]
    return total
`,
      java: `import java.util.*;

public final class RomanTierDecode {
    public static int romanToInt(String s) {
        Map<Character, Integer> v = Map.of('I',1,'V',5,'X',10,'L',50,'C',100,'D',500,'M',1000);
        int total = 0;
        for (int i = 0; i < s.length(); i++) {
            int cur = v.get(s.charAt(i));
            if (i + 1 < s.length() && cur < v.get(s.charAt(i + 1))) total -= cur;
            else total += cur;
        }
        return total;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int romanToInt(string s) {
    unordered_map<char,int> v = {{'I',1},{'V',5},{'X',10},{'L',50},{'C',100},{'D',500},{'M',1000}};
    int total = 0;
    for (int i = 0; i < (int)s.size(); i++) {
        if (i + 1 < (int)s.size() && v[s[i]] < v[s[i + 1]]) total -= v[s[i]];
        else total += v[s[i]];
    }
    return total;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Always adding and never handling the subtractive pairs.",
      "Reading past the end when checking the next symbol.",
      "Hard-coding only some subtractive cases instead of the compare-with-next rule.",
    ],
    edgeCases: [
      'Single symbol like "M".',
      "Numbers with multiple subtractive pairs (MCMXCIV).",
      "Smallest value (I) and largest (MMMCMXCIX).",
    ],
    whyItMatters:
      "Roman decoding is a clean look-ahead parsing exercise — comparing the current token with its successor is the same one-symbol lookahead used in lightweight tokenizers and expression scanners.",
    estimatedMinutes: 13,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 142 — pure_dsa · bit_manipulation · easy · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "bit-population-table",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 7,
    pattern: "bit_manipulation",
    difficulty: "easy",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer", "security_engineer"],
    title: "Bit Population Table",
    framing:
      "A monitoring tool precomputes, for every state code 0..n, how many feature bits are set. Build that lookup table in a single linear pass.",
    statement:
      "Given an integer n, return an array ans of length n+1 where ans[i] is the number of 1-bits in the binary representation of i.",
    inputFormat: "An integer n (0 ≤ n ≤ 10^5).",
    outputFormat: "An array of n+1 integers, the popcount of each index.",
    constraints: [
      "Aim for O(n) total time, not O(n log n)",
      "0 ≤ n ≤ 100,000",
      "ans[0] = 0",
    ],
    examples: [
      {
        input: "n = 5",
        output: "[0,1,1,2,1,2]",
        explanation: "Counts of set bits for 0,1,2,3,4,5.",
      },
      {
        input: "n = 2",
        output: "[0,1,1]",
        explanation: "0→0, 1→1, 2(=10)→1.",
      },
    ],
    approach: [
      "Use the recurrence popcount(i) = popcount(i >> 1) + (i & 1).",
      "i >> 1 is already computed (a smaller index), so each value is O(1).",
      "Fill the array from 1 to n.",
    ],
    solutionSteps: [
      "Allocate ans of size n+1 with ans[0] = 0.",
      "For i from 1 to n, set ans[i] = ans[i >> 1] + (i & 1).",
      "Return ans.",
    ],
    code: {
      python: `def count_bits(n: int) -> list[int]:
    ans = [0] * (n + 1)
    for i in range(1, n + 1):
        ans[i] = ans[i >> 1] + (i & 1)
    return ans
`,
      java: `public final class BitPopulationTable {
    public static int[] countBits(int n) {
        int[] ans = new int[n + 1];
        for (int i = 1; i <= n; i++) ans[i] = ans[i >> 1] + (i & 1);
        return ans;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> countBits(int n) {
    vector<int> ans(n + 1, 0);
    for (int i = 1; i <= n; i++) ans[i] = ans[i >> 1] + (i & 1);
    return ans;
}
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Calling a popcount per element gives O(n log n); the recurrence is O(n).",
      "Off-by-one: the array length is n+1, not n.",
      "Using i & 2 instead of i & 1 for the low bit.",
    ],
    edgeCases: [
      "n = 0 → [0].",
      "Powers of two have a single set bit.",
      "Large n near 10^5.",
    ],
    whyItMatters:
      "This is a tiny but elegant DP over bit structure — reusing the already-computed answer for i>>1 is the same overlapping-subproblem idea that scales to harder DP.",
    estimatedMinutes: 12,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 143 — pure_dsa · dp_1d · easy · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "tribonacci-capacity-forecast",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 7,
    pattern: "dp_1d",
    difficulty: "easy",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer", "software_engineer"],
    title: "Tribonacci Capacity Forecast",
    framing:
      "A capacity model forecasts the next period as the sum of the previous three observed periods. Given the index n, return the n-th value of this Tribonacci sequence.",
    statement:
      "The Tribonacci sequence is defined by T0 = 0, T1 = 1, T2 = 1, and Tn = Tn−1 + Tn−2 + Tn−3 for n ≥ 3. Given n, return Tn.",
    inputFormat: "An integer n (0 ≤ n ≤ 37, fits in 32-bit).",
    outputFormat: "An integer — the n-th Tribonacci number.",
    constraints: [
      "T0=0, T1=1, T2=1",
      "0 ≤ n ≤ 37",
      "Answer fits in a 32-bit signed integer",
    ],
    examples: [
      {
        input: "n = 4",
        output: "4",
        explanation: "T3 = 0+1+1 = 2, T4 = 1+1+2 = 4.",
      },
      {
        input: "n = 25",
        output: "1389537",
        explanation: "Following the recurrence to index 25.",
      },
    ],
    approach: [
      "Handle the base cases n=0,1,2 directly.",
      "Roll three variables forward, each new value being their sum.",
      "Only O(1) memory is needed.",
    ],
    solutionSteps: [
      "If n is 0 return 0; if 1 or 2 return 1.",
      "Initialise a=0, b=1, c=1.",
      "Repeat n−2 times: d=a+b+c, then shift a=b, b=c, c=d.",
      "Return c.",
    ],
    code: {
      python: `def tribonacci(n: int) -> int:
    if n == 0:
        return 0
    if n <= 2:
        return 1
    a, b, c = 0, 1, 1
    for _ in range(n - 2):
        a, b, c = b, c, a + b + c
    return c
`,
      java: `public final class TribonacciCapacityForecast {
    public static int tribonacci(int n) {
        if (n == 0) return 0;
        if (n <= 2) return 1;
        int a = 0, b = 1, c = 1;
        for (int i = 0; i < n - 2; i++) {
            int d = a + b + c;
            a = b; b = c; c = d;
        }
        return c;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int tribonacci(int n) {
    if (n == 0) return 0;
    if (n <= 2) return 1;
    int a = 0, b = 1, c = 1;
    for (int i = 0; i < n - 2; i++) {
        int d = a + b + c;
        a = b; b = c; c = d;
    }
    return c;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Wrong base cases — T2 is 1, not 2.",
      "Allocating an O(n) array when three rolling variables suffice.",
      "Off-by-one on the loop count (n−2 iterations).",
    ],
    edgeCases: [
      "n = 0, 1, 2 base cases.",
      "n = 3 (first computed term).",
      "Upper bound n = 37.",
    ],
    whyItMatters:
      "Rolling-variable recurrences are the simplest form of bottom-up DP with O(1) space — the foundation for every constant-space sequence and streaming-aggregate computation.",
    estimatedMinutes: 11,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 144 — pure_dsa · arrays_hashing · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "compress-id-ranges",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 7,
    pattern: "arrays_hashing",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer", "software_engineer"],
    title: "Compress ID Ranges",
    framing:
      "A sync log lists the sorted, unique record IDs that changed. To shrink the payload, collapse consecutive runs into compact ranges like \"4->7\".",
    statement:
      "Given a sorted array of distinct integers nums, return the smallest sorted list of ranges that covers all the numbers exactly. A single number a is shown as \"a\"; a run a..b as \"a->b\".",
    inputFormat: "A sorted array of distinct integers nums (0 ≤ len ≤ 20), 32-bit values.",
    outputFormat: "A list of range strings covering every element.",
    constraints: [
      "Input is sorted and has no duplicates",
      "Consecutive means differ by exactly 1",
      "Beware int overflow on the difference; values may be near limits",
    ],
    examples: [
      {
        input: "nums = [0,1,2,4,5,7]",
        output: '["0->2","4->5","7"]',
        explanation: "Runs 0–2 and 4–5 collapse; 7 stands alone.",
      },
      {
        input: "nums = [0,2,3,4,6,8,9]",
        output: '["0","2->4","6","8->9"]',
        explanation: "Isolated values stay single; runs collapse.",
      },
    ],
    approach: [
      "Walk the array tracking the start of the current run.",
      "When the next value is not exactly one more, close the current run.",
      "Emit a single value or an a->b range depending on the run length.",
      "Close the final run after the loop.",
    ],
    solutionSteps: [
      "If empty, return an empty list.",
      "Set start = nums[0]; iterate i from 1.",
      "If nums[i] != nums[i−1] + 1, emit the run [start, nums[i−1]] and reset start.",
      "After the loop emit the last run.",
    ],
    code: {
      python: `def summary_ranges(nums: list[int]) -> list[str]:
    out: list[str] = []
    n = len(nums)
    i = 0
    while i < n:
        start = nums[i]
        while i + 1 < n and nums[i + 1] == nums[i] + 1:
            i += 1
        out.append(str(start) if start == nums[i] else f"{start}->{nums[i]}")
        i += 1
    return out
`,
      java: `import java.util.*;

public final class CompressIdRanges {
    public static List<String> summaryRanges(int[] nums) {
        List<String> out = new ArrayList<>();
        int n = nums.length, i = 0;
        while (i < n) {
            int start = nums[i];
            while (i + 1 < n && nums[i + 1] == nums[i] + 1) i++;
            out.add(start == nums[i] ? String.valueOf(start) : start + "->" + nums[i]);
            i++;
        }
        return out;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<string> summaryRanges(vector<int>& nums) {
    vector<string> out;
    int n = nums.size(), i = 0;
    while (i < n) {
        int start = nums[i];
        while (i + 1 < n && nums[i + 1] == nums[i] + 1) i++;
        out.push_back(start == nums[i] ? to_string(start) : to_string(start) + "->" + to_string(nums[i]));
        i++;
    }
    return out;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1) extra" },
    pitfalls: [
      "Using nums[i+1] - nums[i] == 1 can overflow near INT_MAX; compare to nums[i] + 1 carefully or use longs.",
      "Emitting a->b when start equals end instead of a single value.",
      "Forgetting to flush the final run.",
    ],
    edgeCases: [
      "Empty input.",
      "All consecutive — one range.",
      "All isolated — every value single.",
    ],
    whyItMatters:
      "Run-length range compression is a staple of delta encoding and log summarisation — turning verbose ID lists into compact, human-readable spans.",
    estimatedMinutes: 13,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 145 — pure_dsa · intervals · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "single-room-feasibility",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 7,
    pattern: "intervals",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "platform_engineer", "software_engineer"],
    title: "Single Room Feasibility",
    framing:
      "A single shared meeting room is booked by several requests. Decide whether all requests can run in that one room — i.e. none of them overlap.",
    statement:
      "Given an array of intervals where intervals[i] = [start, end], return true if a person could attend all meetings (no two intervals overlap). A meeting ending exactly when another starts does not overlap.",
    inputFormat: "An array intervals of n pairs (0 ≤ n ≤ 10^4), 0 ≤ start < end ≤ 10^6.",
    outputFormat: "A boolean — true if no two meetings overlap.",
    constraints: [
      "Touching endpoints (end == start) do not count as overlap",
      "0 ≤ intervals.length ≤ 10,000",
      "start < end for every interval",
    ],
    examples: [
      {
        input: "[[0,30],[5,10],[15,20]]",
        output: "false",
        explanation: "[0,30] overlaps [5,10], so one room cannot hold all.",
      },
      {
        input: "[[7,10],[2,4]]",
        output: "true",
        explanation: "The two meetings are disjoint.",
      },
    ],
    approach: [
      "Sort the intervals by start time.",
      "Scan adjacent pairs; if a meeting starts before the previous one ends, there is an overlap.",
      "If no overlap is found, all meetings fit in one room.",
    ],
    solutionSteps: [
      "Sort intervals by start.",
      "For each i from 1, if intervals[i].start < intervals[i−1].end, return false.",
      "Return true if the scan completes.",
    ],
    code: {
      python: `def can_attend_all(intervals: list[list[int]]) -> bool:
    intervals.sort(key=lambda x: x[0])
    for i in range(1, len(intervals)):
        if intervals[i][0] < intervals[i - 1][1]:
            return False
    return True
`,
      java: `import java.util.*;

public final class SingleRoomFeasibility {
    public static boolean canAttendAll(int[][] intervals) {
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        for (int i = 1; i < intervals.length; i++) {
            if (intervals[i][0] < intervals[i - 1][1]) return false;
        }
        return true;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

bool canAttendAll(vector<vector<int>>& intervals) {
    sort(intervals.begin(), intervals.end());
    for (int i = 1; i < (int)intervals.size(); i++) {
        if (intervals[i][0] < intervals[i - 1][1]) return false;
    }
    return true;
}
`,
    },
    complexity: { time: "O(n log n)", space: "O(1)" },
    pitfalls: [
      "Treating end == start as an overlap — it is not.",
      "Forgetting to sort, so adjacent comparison is meaningless.",
      "Comparing the wrong endpoints (start vs start instead of start vs previous end).",
    ],
    edgeCases: [
      "Zero or one meeting — trivially true.",
      "Back-to-back meetings sharing a boundary.",
      "Fully nested intervals.",
    ],
    whyItMatters:
      "The sort-then-scan overlap test is the simplest interval-conflict primitive, the easy sibling of room-allocation and the basis for calendar and booking validation.",
    estimatedMinutes: 13,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 146 — pure_dsa · binary_search · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "merge-shard-median",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 7,
    pattern: "binary_search",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer", "software_engineer"],
    title: "Merge Shard Median",
    framing:
      "Two database shards each return a sorted slice of a metric. You need the median of the combined dataset without materialising the full merge — in logarithmic time.",
    statement:
      "Given two sorted arrays nums1 and nums2 of sizes m and n, return the median of the combined sorted array. The overall run time must be O(log(m + n)).",
    inputFormat: "Two sorted arrays nums1 (size m) and nums2 (size n), 0 ≤ m+n, values 32-bit.",
    outputFormat: "A floating-point number — the median of the union.",
    constraints: [
      "Target O(log(min(m, n))) time — do not merge fully",
      "0 ≤ m, n and 1 ≤ m + n",
      "Median of an even total is the average of the two middle values",
    ],
    examples: [
      {
        input: "nums1 = [1,3], nums2 = [2]",
        output: "2.0",
        explanation: "Merged = [1,2,3]; median is 2.",
      },
      {
        input: "nums1 = [1,2], nums2 = [3,4]",
        output: "2.5",
        explanation: "Merged = [1,2,3,4]; median = (2+3)/2.",
      },
    ],
    approach: [
      "Binary-search a partition of the smaller array so that the left halves of both arrays hold exactly half the elements.",
      "A valid partition has maxLeft of each side ≤ minRight of the other.",
      "Use ±infinity sentinels at the array edges to simplify boundaries.",
      "From a valid partition, read the median from the boundary values.",
    ],
    solutionSteps: [
      "Ensure nums1 is the shorter array; let totalLeft = (m+n+1)/2.",
      "Binary search i in [0, m]; set j = totalLeft − i.",
      "Compute aLeft/aRight and bLeft/bRight with infinity sentinels.",
      "If aLeft ≤ bRight and bLeft ≤ aRight, compute the median; else move i.",
    ],
    code: {
      python: `def find_median_sorted_arrays(a: list[int], b: list[int]) -> float:
    if len(a) > len(b):
        a, b = b, a
    m, n = len(a), len(b)
    total_left = (m + n + 1) // 2
    lo, hi = 0, m
    while lo <= hi:
        i = (lo + hi) // 2
        j = total_left - i
        a_left = a[i - 1] if i > 0 else float("-inf")
        a_right = a[i] if i < m else float("inf")
        b_left = b[j - 1] if j > 0 else float("-inf")
        b_right = b[j] if j < n else float("inf")
        if a_left <= b_right and b_left <= a_right:
            if (m + n) % 2 == 0:
                return (max(a_left, b_left) + min(a_right, b_right)) / 2
            return float(max(a_left, b_left))
        elif a_left > b_right:
            hi = i - 1
        else:
            lo = i + 1
    return 0.0
`,
      java: `public final class MergeShardMedian {
    public static double findMedianSortedArrays(int[] a, int[] b) {
        if (a.length > b.length) { int[] t = a; a = b; b = t; }
        int m = a.length, n = b.length, totalLeft = (m + n + 1) / 2;
        int lo = 0, hi = m;
        while (lo <= hi) {
            int i = (lo + hi) / 2, j = totalLeft - i;
            long aLeft = i > 0 ? a[i - 1] : Long.MIN_VALUE;
            long aRight = i < m ? a[i] : Long.MAX_VALUE;
            long bLeft = j > 0 ? b[j - 1] : Long.MIN_VALUE;
            long bRight = j < n ? b[j] : Long.MAX_VALUE;
            if (aLeft <= bRight && bLeft <= aRight) {
                if (((m + n) & 1) == 1) return Math.max(aLeft, bLeft);
                return (Math.max(aLeft, bLeft) + Math.min(aRight, bRight)) / 2.0;
            } else if (aLeft > bRight) hi = i - 1;
            else lo = i + 1;
        }
        return 0.0;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

double findMedianSortedArrays(vector<int>& a, vector<int>& b) {
    if (a.size() > b.size()) swap(a, b);
    int m = a.size(), n = b.size(), totalLeft = (m + n + 1) / 2;
    int lo = 0, hi = m;
    while (lo <= hi) {
        int i = (lo + hi) / 2, j = totalLeft - i;
        long aLeft = i > 0 ? a[i - 1] : LONG_MIN;
        long aRight = i < m ? a[i] : LONG_MAX;
        long bLeft = j > 0 ? b[j - 1] : LONG_MIN;
        long bRight = j < n ? b[j] : LONG_MAX;
        if (aLeft <= bRight && bLeft <= aRight) {
            if ((m + n) % 2) return max(aLeft, bLeft);
            return (max(aLeft, bLeft) + min(aRight, bRight)) / 2.0;
        } else if (aLeft > bRight) hi = i - 1;
        else lo = i + 1;
    }
    return 0.0;
}
`,
    },
    complexity: { time: "O(log(min(m, n)))", space: "O(1)" },
    pitfalls: [
      "Binary-searching the larger array — always partition the shorter one.",
      "Forgetting the infinity sentinels for empty partition sides.",
      "Mixing up the even/odd median formula.",
    ],
    edgeCases: [
      "One array empty.",
      "Arrays of very different lengths.",
      "All elements of one array smaller than the other.",
    ],
    whyItMatters:
      "Median-of-two-sorted-arrays is the classic 'binary search on a partition' problem — reasoning about a split point rather than a value is a powerful technique for order-statistic and merge queries at scale.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 147 — pure_dsa · stack_queue · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-histogram-capacity",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 7,
    pattern: "stack_queue",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "backend_engineer", "data_engineer"],
    title: "Max Histogram Capacity",
    framing:
      "Per-minute provisioned capacity is drawn as a bar chart. The largest solid rectangle that fits under the bars is the biggest sustained capacity block you could have reserved. Find its area.",
    statement:
      "Given an array heights representing the heights of bars of unit width, return the area of the largest rectangle that fits entirely within the histogram.",
    inputFormat: "An array heights of n non-negative integers (1 ≤ n ≤ 10^5), 0 ≤ heights[i] ≤ 10^4.",
    outputFormat: "An integer — the maximum rectangle area.",
    constraints: [
      "A rectangle spans a contiguous range and is bounded by the minimum bar in it",
      "Target O(n) with a monotonic stack",
      "1 ≤ n ≤ 100,000",
    ],
    examples: [
      {
        input: "heights = [2,1,5,6,2,3]",
        output: "10",
        explanation: "Bars 5 and 6 form a 5×2 = 10 rectangle.",
      },
      {
        input: "heights = [2,4]",
        output: "4",
        explanation: "The bar of height 4 alone (or 2×2) gives area 4.",
      },
    ],
    approach: [
      "Keep a stack of indices with increasing bar heights.",
      "When the current bar is lower, pop taller bars and compute the rectangle each can form as its right boundary.",
      "The width is bounded by the new top of the stack on the left and the current index on the right.",
      "A trailing zero-height sentinel flushes the stack.",
    ],
    solutionSteps: [
      "Iterate i from 0 to n (treating i == n as height 0).",
      "While the stack top is ≥ current height, pop it as the limiting height.",
      "Width = i if stack empty else i − stackTop − 1; update best area.",
      "Push i; return best.",
    ],
    code: {
      python: `def largest_rectangle_area(heights: list[int]) -> int:
    stack: list[int] = []
    best = 0
    n = len(heights)
    for i in range(n + 1):
        h = heights[i] if i < n else 0
        while stack and heights[stack[-1]] >= h:
            height = heights[stack.pop()]
            width = i if not stack else i - stack[-1] - 1
            best = max(best, height * width)
        stack.append(i)
    return best
`,
      java: `import java.util.*;

public final class MaxHistogramCapacity {
    public static int largestRectangleArea(int[] heights) {
        int n = heights.length, best = 0;
        Deque<Integer> stack = new ArrayDeque<>();
        for (int i = 0; i <= n; i++) {
            int h = i < n ? heights[i] : 0;
            while (!stack.isEmpty() && heights[stack.peek()] >= h) {
                int height = heights[stack.pop()];
                int width = stack.isEmpty() ? i : i - stack.peek() - 1;
                best = Math.max(best, height * width);
            }
            stack.push(i);
        }
        return best;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int largestRectangleArea(vector<int>& heights) {
    int n = heights.size(), best = 0;
    stack<int> st;
    for (int i = 0; i <= n; i++) {
        int h = i < n ? heights[i] : 0;
        while (!st.empty() && heights[st.top()] >= h) {
            int height = heights[st.top()]; st.pop();
            int width = st.empty() ? i : i - st.top() - 1;
            best = max(best, height * width);
        }
        st.push(i);
    }
    return best;
}
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Recomputing the minimum over every subrange is O(n²) — the stack avoids it.",
      "Wrong width formula after popping; it spans from the new stack top + 1 to i − 1.",
      "Forgetting the sentinel pass to drain remaining bars.",
    ],
    edgeCases: [
      "Strictly increasing or decreasing heights.",
      "All equal heights — area = height × n.",
      "Bars of height zero.",
    ],
    whyItMatters:
      "Largest-rectangle-in-histogram is the definitive monotonic-stack problem; the 'pop when the invariant breaks and settle the popped element' pattern generalises to max-rectangle-in-matrix and span queries.",
    estimatedMinutes: 38,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 148 — pure_dsa · graphs · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "critical-service-links",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 7,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "devops_sre", "backend_engineer"],
    title: "Critical Service Links",
    framing:
      "Services form a network where each connection is bidirectional. A link is 'critical' if removing it disconnects some services from others. Find every critical link so you can prioritise redundancy.",
    statement:
      "There are n services labelled 0..n−1 and a list of undirected connections. A connection is critical (a bridge) if removing it increases the number of connected components. Return all critical connections in any order.",
    inputFormat: "An integer n (1 ≤ n ≤ 10^5) and connections (length up to 10^5) of [u, v] pairs.",
    outputFormat: "A list of the critical [u, v] connections.",
    constraints: [
      "The graph is connected and has no parallel edges or self-loops",
      "A bridge is an edge in no cycle",
      "Up to 10^5 nodes and edges",
    ],
    examples: [
      {
        input: "n = 4, connections = [[0,1],[1,2],[2,0],[1,3]]",
        output: "[[1,3]]",
        explanation: "0-1-2 form a cycle (no bridges); only 1-3 is critical.",
      },
      {
        input: "n = 2, connections = [[0,1]]",
        output: "[[0,1]]",
        explanation: "The single edge is the only link, hence critical.",
      },
    ],
    approach: [
      "Run a DFS assigning each node a discovery time and a low-link value.",
      "low[u] is the earliest discovery time reachable from u's subtree via one back-edge.",
      "Edge (u, v) is a bridge when low[v] > disc[u] — v's subtree cannot reach u or earlier without this edge.",
      "Skip the immediate parent edge while relaxing.",
    ],
    solutionSteps: [
      "Build an adjacency list.",
      "DFS from node 0, stamping disc[u] = low[u] = timer++.",
      "For each neighbour v ≠ parent: if unvisited, recurse and low[u] = min(low[u], low[v]); record a bridge if low[v] > disc[u]. Else low[u] = min(low[u], disc[v]).",
      "Collect and return all bridges.",
    ],
    code: {
      python: `import sys

def critical_connections(n: int, connections: list[list[int]]) -> list[list[int]]:
    sys.setrecursionlimit(300000)
    graph: list[list[int]] = [[] for _ in range(n)]
    for u, v in connections:
        graph[u].append(v)
        graph[v].append(u)
    disc = [-1] * n
    low = [0] * n
    bridges: list[list[int]] = []
    timer = [0]

    def dfs(u: int, parent: int) -> None:
        disc[u] = low[u] = timer[0]
        timer[0] += 1
        for v in graph[u]:
            if v == parent:
                continue
            if disc[v] == -1:
                dfs(v, u)
                low[u] = min(low[u], low[v])
                if low[v] > disc[u]:
                    bridges.append([u, v])
            else:
                low[u] = min(low[u], disc[v])

    for i in range(n):
        if disc[i] == -1:
            dfs(i, -1)
    return bridges
`,
      java: `import java.util.*;

public final class CriticalServiceLinks {
    private static List<List<Integer>> graph;
    private static int[] disc, low;
    private static int timer;
    private static List<List<Integer>> bridges;

    public static List<List<Integer>> criticalConnections(int n, List<List<Integer>> connections) {
        graph = new ArrayList<>();
        for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
        for (List<Integer> e : connections) {
            graph.get(e.get(0)).add(e.get(1));
            graph.get(e.get(1)).add(e.get(0));
        }
        disc = new int[n]; low = new int[n];
        Arrays.fill(disc, -1);
        timer = 0;
        bridges = new ArrayList<>();
        for (int i = 0; i < n; i++) if (disc[i] == -1) dfs(i, -1);
        return bridges;
    }

    private static void dfs(int u, int parent) {
        disc[u] = low[u] = timer++;
        for (int v : graph.get(u)) {
            if (v == parent) continue;
            if (disc[v] == -1) {
                dfs(v, u);
                low[u] = Math.min(low[u], low[v]);
                if (low[v] > disc[u]) bridges.add(Arrays.asList(u, v));
            } else {
                low[u] = Math.min(low[u], disc[v]);
            }
        }
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

static vector<vector<int>> g, bridgesOut;
static vector<int> disc, low;
static int timerC;

static void dfs(int u, int parent) {
    disc[u] = low[u] = timerC++;
    for (int v : g[u]) {
        if (v == parent) continue;
        if (disc[v] == -1) {
            dfs(v, u);
            low[u] = min(low[u], low[v]);
            if (low[v] > disc[u]) bridgesOut.push_back({u, v});
        } else {
            low[u] = min(low[u], disc[v]);
        }
    }
}

vector<vector<int>> criticalConnections(int n, vector<vector<int>>& connections) {
    g.assign(n, {});
    for (auto& e : connections) { g[e[0]].push_back(e[1]); g[e[1]].push_back(e[0]); }
    disc.assign(n, -1); low.assign(n, 0); timerC = 0; bridgesOut.clear();
    for (int i = 0; i < n; i++) if (disc[i] == -1) dfs(i, -1);
    return bridgesOut;
}
`,
    },
    complexity: { time: "O(V + E)", space: "O(V + E)" },
    pitfalls: [
      "Using low[u] = min(low[u], low[v]) for a back-edge instead of disc[v].",
      "Not skipping the parent edge, which falsely lowers low and hides bridges.",
      "Stack overflow from deep recursion — raise the limit or use an explicit stack.",
    ],
    edgeCases: [
      "A tree — every edge is a bridge.",
      "A single cycle — no bridges.",
      "Two nodes, one edge.",
    ],
    whyItMatters:
      "Tarjan's bridge-finding with discovery/low-link times is the foundation of network resilience analysis — identifying single points of failure in service meshes, road networks, and dependency graphs.",
    estimatedMinutes: 42,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 149 — ai_applied · dp_2d · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "guardrail-pattern-match",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 7,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "backend_engineer", "software_engineer"],
    title: "Guardrail Pattern Match",
    framing:
      "A safety layer validates a model's output against a guardrail pattern that allows '.' (any single character) and '*' (zero or more of the preceding character). Decide whether the full output matches the pattern.",
    statement:
      "Implement regular-expression matching for '.' and '*' covering the entire input. '.' matches any single character; '*' matches zero or more of the element immediately before it. Return true if pattern p matches the whole string s.",
    inputFormat: "Strings s (0 ≤ |s| ≤ 20) and p (0 ≤ |p| ≤ 30); p's '*' always follows a valid element.",
    outputFormat: "A boolean — true if p matches all of s.",
    constraints: [
      "The match must cover the entire string, not a substring",
      "'*' applies to the single preceding element and can match zero copies",
      "Lowercase letters plus '.' and '*'",
    ],
    examples: [
      {
        input: 's = "aab", p = "c*a*b"',
        output: "true",
        explanation: "c* matches zero c's, a* matches 'aa', then 'b'.",
      },
      {
        input: 's = "mississippi", p = "mis*is*p*."',
        output: "false",
        explanation: "The pattern cannot consume the whole string.",
      },
    ],
    approach: [
      "Let dp[i][j] mean s[:i] matches p[:j].",
      "dp[0][0] is true; seed dp[0][j] for patterns like a*b* that match empty.",
      "On '*': either drop the element+'*' (zero copies) or, if the preceding element matches s[i−1], consume one char.",
      "On a literal or '.': require a single-character match with dp[i−1][j−1].",
    ],
    solutionSteps: [
      "Allocate dp of (m+1)×(n+1), dp[0][0] = true.",
      "For j with p[j−1]=='*', set dp[0][j] = dp[0][j−2].",
      "Fill dp[i][j]: if p[j−1]=='*', dp[i][j] = dp[i][j−2] or (prevMatches and dp[i−1][j]).",
      "Else dp[i][j] = (match) and dp[i−1][j−1]. Return dp[m][n].",
    ],
    code: {
      python: `def is_match(s: str, p: str) -> bool:
    m, n = len(s), len(p)
    dp = [[False] * (n + 1) for _ in range(m + 1)]
    dp[0][0] = True
    for j in range(1, n + 1):
        if p[j - 1] == "*":
            dp[0][j] = dp[0][j - 2]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if p[j - 1] == "*":
                dp[i][j] = dp[i][j - 2]
                if p[j - 2] == "." or p[j - 2] == s[i - 1]:
                    dp[i][j] = dp[i][j] or dp[i - 1][j]
            elif p[j - 1] == "." or p[j - 1] == s[i - 1]:
                dp[i][j] = dp[i - 1][j - 1]
    return dp[m][n]
`,
      java: `public final class GuardrailPatternMatch {
    public static boolean isMatch(String s, String p) {
        int m = s.length(), n = p.length();
        boolean[][] dp = new boolean[m + 1][n + 1];
        dp[0][0] = true;
        for (int j = 1; j <= n; j++)
            if (p.charAt(j - 1) == '*') dp[0][j] = dp[0][j - 2];
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                char pc = p.charAt(j - 1);
                if (pc == '*') {
                    dp[i][j] = dp[i][j - 2];
                    char prev = p.charAt(j - 2);
                    if (prev == '.' || prev == s.charAt(i - 1)) dp[i][j] = dp[i][j] || dp[i - 1][j];
                } else if (pc == '.' || pc == s.charAt(i - 1)) {
                    dp[i][j] = dp[i - 1][j - 1];
                }
            }
        }
        return dp[m][n];
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

bool isMatch(string s, string p) {
    int m = s.size(), n = p.size();
    vector<vector<bool>> dp(m + 1, vector<bool>(n + 1, false));
    dp[0][0] = true;
    for (int j = 1; j <= n; j++)
        if (p[j - 1] == '*') dp[0][j] = dp[0][j - 2];
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++) {
            if (p[j - 1] == '*') {
                dp[i][j] = dp[i][j - 2];
                if (p[j - 2] == '.' || p[j - 2] == s[i - 1]) dp[i][j] = dp[i][j] || dp[i - 1][j];
            } else if (p[j - 1] == '.' || p[j - 1] == s[i - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            }
        }
    return dp[m][n];
}
`,
    },
    complexity: { time: "O(m·n)", space: "O(m·n)" },
    pitfalls: [
      "Treating '*' as a wildcard for any sequence — it binds to the single preceding element.",
      "Forgetting the zero-copy branch dp[i][j−2].",
      "Not seeding dp[0][j] so patterns like a*b* can match the empty string.",
    ],
    edgeCases: [
      "Empty pattern matches only empty string.",
      "Pattern of all 'x*' groups matching empty input.",
      "'.' against varied characters.",
    ],
    whyItMatters:
      "Regex matching is the canonical two-dimensional DP with branching transitions; the same table reasoning powers wildcard matching, sequence alignment, and the validation layers that gate generated output against allowed patterns.",
    estimatedMinutes: 44,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 150 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "maximize-ad-burst-revenue",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 7,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer", "backend_engineer"],
    title: "Maximize Ad Burst Revenue",
    framing:
      "A row of ad slots each carry a value. Clearing a slot earns the product of its value and its two current neighbours, then the row closes up. Choose the clearing order that maximises total revenue.",
    statement:
      "Given n balloons (ad slots) with values in nums, bursting balloon i earns nums[left]·nums[i]·nums[right], where left/right are the adjacent balloons at that moment (out-of-range neighbours count as 1). Return the maximum coins obtainable by bursting all balloons.",
    inputFormat: "An array nums of n values (0 ≤ n ≤ 300), 0 ≤ nums[i] ≤ 100.",
    outputFormat: "An integer — the maximum total coins.",
    constraints: [
      "Virtual boundary balloons of value 1 pad both ends",
      "0 ≤ n ≤ 300",
      "Think about which balloon is burst LAST in a range",
    ],
    examples: [
      {
        input: "nums = [3,1,5,8]",
        output: "167",
        explanation: "Optimal order yields 3·1·5 + 3·5·8 + 1·3·8 + 1·8·1 = 167.",
      },
      {
        input: "nums = [1,5]",
        output: "10",
        explanation: "Burst 1 first (1·1·5=5) then 5 (1·5·1=5) → 10.",
      },
    ],
    approach: [
      "Pad nums with 1 at both ends so boundaries are uniform.",
      "Let dp[left][right] be the max coins from bursting all balloons strictly between left and right.",
      "Choose k as the LAST balloon burst in (left, right): its neighbours are then vals[left] and vals[right].",
      "dp[left][right] = max over k of vals[left]·vals[k]·vals[right] + dp[left][k] + dp[k][right].",
    ],
    solutionSteps: [
      "Build vals = [1] + nums + [1] of size n+2.",
      "Iterate over increasing range length; for each (left, right) window.",
      "Try every k strictly inside as the last burst, combining the two sub-results.",
      "Return dp[0][n+1].",
    ],
    code: {
      python: `def max_coins(nums: list[int]) -> int:
    vals = [1] + nums + [1]
    n = len(vals)
    dp = [[0] * n for _ in range(n)]
    for length in range(2, n):
        for left in range(0, n - length):
            right = left + length
            for k in range(left + 1, right):
                dp[left][right] = max(
                    dp[left][right],
                    vals[left] * vals[k] * vals[right] + dp[left][k] + dp[k][right],
                )
    return dp[0][n - 1]
`,
      java: `public final class MaximizeAdBurstRevenue {
    public static int maxCoins(int[] nums) {
        int n = nums.length;
        int[] vals = new int[n + 2];
        vals[0] = vals[n + 1] = 1;
        for (int i = 0; i < n; i++) vals[i + 1] = nums[i];
        int sz = n + 2;
        int[][] dp = new int[sz][sz];
        for (int len = 2; len < sz; len++) {
            for (int left = 0; left + len < sz; left++) {
                int right = left + len;
                for (int k = left + 1; k < right; k++) {
                    dp[left][right] = Math.max(dp[left][right],
                        vals[left] * vals[k] * vals[right] + dp[left][k] + dp[k][right]);
                }
            }
        }
        return dp[0][sz - 1];
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int maxCoins(vector<int>& nums) {
    int n = nums.size();
    vector<int> vals(n + 2, 1);
    for (int i = 0; i < n; i++) vals[i + 1] = nums[i];
    int sz = n + 2;
    vector<vector<int>> dp(sz, vector<int>(sz, 0));
    for (int len = 2; len < sz; len++)
        for (int left = 0; left + len < sz; left++) {
            int right = left + len;
            for (int k = left + 1; k < right; k++)
                dp[left][right] = max(dp[left][right],
                    vals[left] * vals[k] * vals[right] + dp[left][k] + dp[k][right]);
        }
    return dp[0][sz - 1];
}
`,
    },
    complexity: { time: "O(n³)", space: "O(n²)" },
    pitfalls: [
      "Thinking about which balloon to burst FIRST — fixing the LAST burst keeps the neighbours well-defined.",
      "Forgetting the padding of 1s at both boundaries.",
      "Using changing neighbour indices instead of the fixed window bounds left/right.",
    ],
    edgeCases: [
      "Empty input — 0 coins.",
      "Single balloon — nums[0].",
      "Balloons with zero values.",
    ],
    whyItMatters:
      "Burst Balloons is the showcase interval DP: reframing 'first action' as 'last action' to decouple subproblems is a deep technique behind matrix-chain multiplication and optimal partitioning.",
    estimatedMinutes: 45,
  },
];
