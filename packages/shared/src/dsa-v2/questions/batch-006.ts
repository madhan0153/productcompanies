// DSA v2 — Batch 006 (25 questions).
//
// Fills remaining canonical gaps weighted toward easy + hard (mediums are
// already over target across earlier batches): valid-anagram, linked-list
// cycle, missing-number, Kadane, same-tree, climbing-stairs, happy-number,
// reverse-bits, remove-nth-node, last-stone-weight, k-closest-points,
// diameter, rotate-image, meeting-rooms-II, coin-change, trapping-rain-water,
// LIS, word-search-II, serialize-tree, sliding-window-maximum, N-Queens,
// word-break-II. Composition: 22 pure_dsa + 2 ai_applied + 1 indian_domain.
// Difficulty mix: 15 easy / 3 medium / 7 hard.
//
// All status = "pending_review" — admin must approve each before live.

import type { DsaV2Question } from "../types";

export const BATCH_006: readonly DsaV2Question[] = [
  // ──────────────────────────────────────────────────────────────────────
  // 106 — pure_dsa · arrays_hashing · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "tag-set-anagram",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 6,
    pattern: "arrays_hashing",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "full_stack_engineer", "software_engineer"],
    title: "Tag Set Anagram",
    framing:
      "Two feature-flag label strings are considered equivalent if one is a reordering of the other — same letters, same counts. Decide whether a candidate label is just a permutation of the canonical label.",
    statement:
      "Given two strings s and t, return true if t is an anagram of s — they contain exactly the same characters with the same frequencies — and false otherwise.",
    inputFormat: "Two strings s and t (1 ≤ length ≤ 5·10^4), lowercase English letters.",
    outputFormat: "A boolean — true if t is an anagram of s.",
    constraints: [
      "1 ≤ s.length, t.length ≤ 50,000",
      "Lowercase English letters only",
      "Different lengths can never be anagrams",
    ],
    examples: [
      {
        input: 's = "listen", t = "silent"',
        output: "true",
        explanation: "Both have one each of l, i, s, t, e, n.",
      },
      {
        input: 's = "rat", t = "car"',
        output: "false",
        explanation: "'r','a' match but 't' vs 'c' differ.",
      },
    ],
    approach: [
      "If lengths differ, return false immediately.",
      "Count the frequency of each character in s.",
      "Decrement those counts while scanning t.",
      "If any count goes negative or a character is missing, it is not an anagram.",
    ],
    solutionSteps: [
      "Return false when lengths differ.",
      "Build a 26-slot count array (or hash map) from s.",
      "For each character in t, decrement its count.",
      "If a count drops below zero, return false.",
      "All counts net to zero ⇒ return true.",
    ],
    code: {
      python: `def is_anagram(s: str, t: str) -> bool:
    if len(s) != len(t):
        return False
    counts = [0] * 26
    for ch in s:
        counts[ord(ch) - 97] += 1
    for ch in t:
        counts[ord(ch) - 97] -= 1
        if counts[ord(ch) - 97] < 0:
            return False
    return True
`,
      java: `public final class TagSetAnagram {
    public static boolean isAnagram(String s, String t) {
        if (s.length() != t.length()) return false;
        int[] counts = new int[26];
        for (int i = 0; i < s.length(); i++) counts[s.charAt(i) - 'a']++;
        for (int i = 0; i < t.length(); i++) {
            if (--counts[t.charAt(i) - 'a'] < 0) return false;
        }
        return true;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

bool isAnagram(const string& s, const string& t) {
    if (s.size() != t.size()) return false;
    array<int, 26> counts{};
    for (char ch : s) counts[ch - 'a']++;
    for (char ch : t) {
        if (--counts[ch - 'a'] < 0) return false;
    }
    return true;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1) — fixed 26-slot table" },
    pitfalls: [
      "Sorting both strings is O(n log n) when counting is O(n).",
      "Forgetting the length check, so a prefix match passes wrongly.",
      "Assuming ASCII when the prompt may include Unicode — here lowercase only.",
    ],
    edgeCases: [
      "Equal strings — true.",
      "Same letters, different counts (e.g. 'aab' vs 'abb') — false.",
      "Single characters.",
    ],
    whyItMatters:
      "Frequency counting is the workhorse behind anagram, permutation, and 'same multiset' checks, and the fixed-size table trick is a common follow-up optimisation.",
    estimatedMinutes: 12,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 107 — pure_dsa · linked_list · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "session-ring-cycle-check",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 6,
    pattern: "linked_list",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "platform_engineer", "software_engineer"],
    title: "Session Ring Cycle Check",
    framing:
      "A session-handoff chain is a linked list of nodes; a misconfigured failover can splice a node back to an earlier one, creating an infinite loop. Detect whether the chain cycles.",
    statement:
      "Given the head of a singly linked list, return true if the list contains a cycle — some node's next pointer points back to a previously visited node — and false otherwise. Solve in O(1) extra space.",
    inputFormat: "The head node of a singly linked list (0 ≤ nodes ≤ 10^4).",
    outputFormat: "A boolean — true if a cycle exists.",
    constraints: [
      "Use O(1) auxiliary space",
      "The list may be empty",
      "Node values are irrelevant to the answer",
    ],
    examples: [
      {
        input: "3 → 2 → 0 → -4, where -4.next points back to node 2",
        output: "true",
        explanation: "Traversal re-enters node 2, so a cycle exists.",
      },
      {
        input: "1 → 2 → null",
        output: "false",
        explanation: "Traversal reaches null without repeating a node.",
      },
    ],
    approach: [
      "Use Floyd's tortoise-and-hare: a slow pointer moving one step, a fast pointer two.",
      "If there is no cycle, fast reaches null.",
      "If there is a cycle, fast eventually laps slow and they meet.",
      "Meeting ⇒ cycle; null ⇒ no cycle.",
    ],
    solutionSteps: [
      "Initialise slow = fast = head.",
      "Loop while fast and fast.next are non-null.",
      "Advance slow by one and fast by two.",
      "If slow == fast, return true.",
      "If the loop exits, return false.",
    ],
    code: {
      python: `class ListNode:
    def __init__(self, val: int = 0, nxt: "ListNode | None" = None) -> None:
        self.val = val
        self.next = nxt


def has_cycle(head: "ListNode | None") -> bool:
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False
`,
      java: `public final class SessionRingCycleCheck {
    public static final class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

    public static boolean hasCycle(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) return true;
        }
        return false;
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

bool hasCycle(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return true;
    }
    return false;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Using a visited hash set — correct but O(n) space, missing the O(1) follow-up.",
      "Checking fast.next.next without first guarding fast.next, risking a null dereference.",
      "Comparing node values instead of node identity.",
    ],
    edgeCases: [
      "Empty list — false.",
      "Single node with no self-loop — false.",
      "Single node pointing to itself — true.",
    ],
    whyItMatters:
      "Floyd's cycle detection is the canonical two-speed-pointer technique, reused for finding cycle starts, list midpoints, and duplicate-number detection.",
    estimatedMinutes: 13,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 108 — pure_dsa · bit_manipulation · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "missing-sequence-id",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 6,
    pattern: "bit_manipulation",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer", "software_engineer"],
    title: "Missing Sequence ID",
    framing:
      "An ingest pipeline assigns dense sequence IDs 0..n to events, but exactly one ID never arrived. Find the missing ID without sorting and without extra memory proportional to n.",
    statement:
      "Given an array nums containing n distinct numbers drawn from the range [0, n], return the single number in that range that is missing from the array.",
    inputFormat: "An array nums of length n (1 ≤ n ≤ 10^4); values are distinct and in [0, n].",
    outputFormat: "An integer — the missing value.",
    constraints: [
      "Exactly one value in [0, n] is absent",
      "All present values are distinct",
      "Aim for O(n) time and O(1) extra space",
    ],
    examples: [
      {
        input: "nums = [3, 0, 1]",
        output: "2",
        explanation: "Range is [0,3]; 2 is the only value not present.",
      },
      {
        input: "nums = [0, 1]",
        output: "2",
        explanation: "Range is [0,2]; the missing value is 2.",
      },
    ],
    approach: [
      "XOR has the property x ^ x = 0 and x ^ 0 = x.",
      "XOR together all indices 0..n and all array values.",
      "Every present value cancels with its index counterpart.",
      "The surviving value is the missing number.",
    ],
    solutionSteps: [
      "Initialise result = n (covers the top index not produced by the loop).",
      "For each index i with value nums[i], fold in i ^ nums[i].",
      "Accumulate via XOR into result.",
      "Return result after the scan.",
      "Alternative: subtract the array sum from n(n+1)/2.",
    ],
    code: {
      python: `def missing_number(nums: list[int]) -> int:
    result = len(nums)
    for i, x in enumerate(nums):
        result ^= i ^ x
    return result
`,
      java: `public final class MissingSequenceId {
    public static int missingNumber(int[] nums) {
        int result = nums.length;
        for (int i = 0; i < nums.length; i++) {
            result ^= i ^ nums[i];
        }
        return result;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int missingNumber(const vector<int>& nums) {
    int result = (int)nums.size();
    for (int i = 0; i < (int)nums.size(); i++) {
        result ^= i ^ nums[i];
    }
    return result;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Forgetting to seed result with n, so the highest index is never XORed in.",
      "The sum formula can overflow 32-bit ints for large n — XOR avoids that.",
      "Sorting first defeats the O(n)/O(1) intent.",
    ],
    edgeCases: [
      "Missing value is 0.",
      "Missing value is n (largest).",
      "Single-element array [0] → answer 1.",
    ],
    whyItMatters:
      "The self-cancelling XOR trick recurs in single-number, find-the-duplicate, and parity problems, and demonstrates O(1)-space thinking interviewers probe for.",
    estimatedMinutes: 12,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 109 — pure_dsa · bit_manipulation · easy · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "permission-mask-weight",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 6,
    pattern: "bit_manipulation",
    difficulty: "easy",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "security_engineer", "backend_engineer"],
    title: "Permission Mask Weight",
    framing:
      "A permission set is packed into a 32-bit mask where each set bit grants one capability. Count how many capabilities a given mask grants.",
    statement:
      "Given an unsigned 32-bit integer n, return the number of bits set to 1 in its binary representation (its Hamming weight).",
    inputFormat: "An unsigned 32-bit integer n (0 ≤ n < 2^32).",
    outputFormat: "An integer — the count of set bits.",
    constraints: [
      "Treat n as a 32-bit unsigned value",
      "Aim for time proportional to the number of set bits",
    ],
    examples: [
      {
        input: "n = 0b00000000000000000000000000001011",
        output: "3",
        explanation: "Three bits are set.",
      },
      {
        input: "n = 0b10000000000000000000000000000000",
        output: "1",
        explanation: "Only the top bit is set.",
      },
    ],
    approach: [
      "Repeatedly clear the lowest set bit with n &= (n - 1).",
      "Each such operation removes exactly one 1-bit.",
      "Count how many times this can be done before n becomes 0.",
      "This runs in O(set bits) rather than O(32).",
    ],
    solutionSteps: [
      "Initialise count = 0.",
      "While n is non-zero, do n &= n - 1 and increment count.",
      "n - 1 flips the lowest set bit and the zeros below it.",
      "ANDing clears that lowest set bit.",
      "Return count when n reaches 0.",
    ],
    code: {
      python: `def hamming_weight(n: int) -> int:
    count = 0
    while n:
        n &= n - 1
        count += 1
    return count
`,
      java: `public final class PermissionMaskWeight {
    public static int hammingWeight(int n) {
        int count = 0;
        while (n != 0) {
            n &= (n - 1);
            count++;
        }
        return count;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int hammingWeight(uint32_t n) {
    int count = 0;
    while (n) {
        n &= (n - 1);
        count++;
    }
    return count;
}
`,
    },
    complexity: { time: "O(set bits)", space: "O(1)" },
    pitfalls: [
      "In Java, using >> instead of >>> sign-extends and loops forever on negatives.",
      "Looping a fixed 32 times works but ignores the n &= n-1 optimisation.",
      "Off-by-one when counting after clearing rather than before.",
    ],
    edgeCases: [
      "n = 0 → 0.",
      "All bits set (0xFFFFFFFF) → 32.",
      "Single high bit set → 1.",
    ],
    whyItMatters:
      "The n &= n-1 idiom is foundational bit hacking — it powers popcount, subset enumeration, and power-of-two checks used in flags and bitmaps everywhere.",
    estimatedMinutes: 11,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 110 — pure_dsa · greedy · easy · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "peak-revenue-streak",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 6,
    pattern: "greedy",
    difficulty: "easy",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer", "software_engineer"],
    title: "Peak Revenue Streak",
    framing:
      "Daily net revenue can be positive or negative. Find the single contiguous run of days with the largest total — the most profitable streak to highlight on the dashboard.",
    statement:
      "Given an integer array nums, find the contiguous subarray (containing at least one number) with the largest sum, and return that sum.",
    inputFormat: "An array nums of length n (1 ≤ n ≤ 10^5), values in [-10^4, 10^4].",
    outputFormat: "An integer — the maximum contiguous subarray sum.",
    constraints: [
      "The subarray must be non-empty",
      "Values may be negative",
      "Single pass, O(1) extra space expected",
    ],
    examples: [
      {
        input: "nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]",
        output: "6",
        explanation: "The subarray [4, -1, 2, 1] sums to 6.",
      },
      {
        input: "nums = [-3, -1, -2]",
        output: "-1",
        explanation: "All negative; the best single element is -1.",
      },
    ],
    approach: [
      "Kadane's algorithm: track the best sum ending at the current index.",
      "Extend the running sum, or restart it at the current element if that is larger.",
      "Keep a global maximum of all running sums seen.",
      "Restarting models 'a fresh streak beats carrying a deficit forward'.",
    ],
    solutionSteps: [
      "Initialise current = best = nums[0].",
      "For each later x, set current = max(x, current + x).",
      "Update best = max(best, current).",
      "Return best after the scan.",
      "Handles all-negative inputs because current restarts at x.",
    ],
    code: {
      python: `def max_subarray(nums: list[int]) -> int:
    current = best = nums[0]
    for x in nums[1:]:
        current = max(x, current + x)
        best = max(best, current)
    return best
`,
      java: `public final class PeakRevenueStreak {
    public static int maxSubArray(int[] nums) {
        int current = nums[0], best = nums[0];
        for (int i = 1; i < nums.length; i++) {
            current = Math.max(nums[i], current + nums[i]);
            best = Math.max(best, current);
        }
        return best;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int maxSubArray(const vector<int>& nums) {
    int current = nums[0], best = nums[0];
    for (size_t i = 1; i < nums.size(); i++) {
        current = max(nums[i], current + nums[i]);
        best = max(best, current);
    }
    return best;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Initialising best to 0, which is wrong when every value is negative.",
      "Resetting current to 0 instead of to the current element.",
      "Confusing 'largest sum' with 'longest subarray'.",
    ],
    edgeCases: [
      "All negative — answer is the single largest element.",
      "Single element — that element.",
      "All positive — the full array sum.",
    ],
    whyItMatters:
      "Kadane's algorithm is the archetypal 'best running state' DP, and its extend-or-restart decision generalises to max-product, circular, and 2D variants.",
    estimatedMinutes: 13,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 111 — pure_dsa · two_pointers · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "dedup-sorted-ledger",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 6,
    pattern: "two_pointers",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer", "software_engineer"],
    title: "Dedup Sorted Ledger",
    framing:
      "A sorted ledger of transaction amounts has consecutive duplicates from retried writes. Compact it in place so each amount appears once, and report how many unique entries remain.",
    statement:
      "Given a sorted integer array nums, remove the duplicates in place so each unique element appears once, keeping their relative order. Return k, the number of unique elements; the first k slots of nums must hold those elements.",
    inputFormat: "A non-decreasing sorted array nums of length n (0 ≤ n ≤ 3·10^4).",
    outputFormat: "An integer k; nums[0..k-1] hold the unique values in order.",
    constraints: [
      "Modify nums in place with O(1) extra space",
      "Input is sorted non-decreasing",
      "Order of unique values must be preserved",
    ],
    examples: [
      {
        input: "nums = [1, 1, 2]",
        output: "2  (nums starts with [1, 2])",
        explanation: "One duplicate 1 is removed; two unique values remain.",
      },
      {
        input: "nums = [0, 0, 1, 1, 1, 2, 2, 3]",
        output: "4  (nums starts with [0, 1, 2, 3])",
        explanation: "Four distinct values remain in order.",
      },
    ],
    approach: [
      "Use a slow write pointer for the position of the next unique value.",
      "Scan with a fast read pointer.",
      "When the read value differs from the last written value, write it and advance slow.",
      "k is the final slow position.",
    ],
    solutionSteps: [
      "If the array is empty, return 0.",
      "Set write = 1 (the first element is always kept).",
      "For read from 1 to n-1, compare nums[read] with nums[write-1].",
      "If different, copy nums[read] to nums[write] and increment write.",
      "Return write.",
    ],
    code: {
      python: `def remove_duplicates(nums: list[int]) -> int:
    if not nums:
        return 0
    write = 1
    for read in range(1, len(nums)):
        if nums[read] != nums[write - 1]:
            nums[write] = nums[read]
            write += 1
    return write
`,
      java: `public final class DedupSortedLedger {
    public static int removeDuplicates(int[] nums) {
        if (nums.length == 0) return 0;
        int write = 1;
        for (int read = 1; read < nums.length; read++) {
            if (nums[read] != nums[write - 1]) {
                nums[write++] = nums[read];
            }
        }
        return write;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int removeDuplicates(vector<int>& nums) {
    if (nums.empty()) return 0;
    int write = 1;
    for (size_t read = 1; read < nums.size(); read++) {
        if (nums[read] != nums[write - 1]) {
            nums[write++] = nums[read];
        }
    }
    return write;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Comparing against nums[read-1] instead of the last written value (breaks with runs longer than 2).",
      "Returning the array instead of the count k.",
      "Allocating a new array, violating the in-place requirement.",
    ],
    edgeCases: [
      "Empty array — 0.",
      "All identical — k = 1.",
      "Already unique — k = n, array unchanged.",
    ],
    whyItMatters:
      "The slow/fast in-place write pattern underlies array compaction, move-zeroes, and stream-dedup problems where allocating a second buffer is disallowed.",
    estimatedMinutes: 12,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 112 — pure_dsa · trees · easy · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "replica-tree-equal",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 6,
    pattern: "trees",
    difficulty: "easy",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer", "full_stack_engineer"],
    title: "Replica Tree Equal",
    framing:
      "Two replicas of a category hierarchy must be byte-for-byte identical after a sync. Verify the two trees have the same shape and the same node values at every position.",
    statement:
      "Given the roots of two binary trees p and q, return true if they are structurally identical and every corresponding pair of nodes has the same value, and false otherwise.",
    inputFormat: "Two binary tree roots p and q (0 ≤ nodes ≤ 100 each).",
    outputFormat: "A boolean — true if the trees are identical.",
    constraints: [
      "Either tree may be empty",
      "Node values fit in a 32-bit integer",
      "Structure and values must both match",
    ],
    examples: [
      {
        input: "p = [1,2,3], q = [1,2,3]",
        output: "true",
        explanation: "Same shape, same values.",
      },
      {
        input: "p = [1,2], q = [1,null,2]",
        output: "false",
        explanation: "The 2 is a left child in p but a right child in q.",
      },
    ],
    approach: [
      "Recurse over both trees in lockstep.",
      "If both nodes are null, this subtree matches.",
      "If exactly one is null, or the values differ, they are not equal.",
      "Otherwise recurse on left pair and right pair.",
    ],
    solutionSteps: [
      "Base case: both null ⇒ true.",
      "If one is null or values differ ⇒ false.",
      "Recurse on (p.left, q.left).",
      "Recurse on (p.right, q.right).",
      "Return the AND of the two recursive results.",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val: int = 0, left=None, right=None) -> None:
        self.val = val
        self.left = left
        self.right = right


def is_same_tree(p: "TreeNode | None", q: "TreeNode | None") -> bool:
    if p is None and q is None:
        return True
    if p is None or q is None or p.val != q.val:
        return False
    return is_same_tree(p.left, q.left) and is_same_tree(p.right, q.right)
`,
      java: `public final class ReplicaTreeEqual {
    public static final class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
    }

    public static boolean isSameTree(TreeNode p, TreeNode q) {
        if (p == null && q == null) return true;
        if (p == null || q == null || p.val != q.val) return false;
        return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
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

bool isSameTree(TreeNode* p, TreeNode* q) {
    if (!p && !q) return true;
    if (!p || !q || p->val != q->val) return false;
    return isSameTree(p->left, q->left) && isSameTree(p->right, q->right);
}
`,
    },
    complexity: { time: "O(n)", space: "O(h) recursion — h is tree height" },
    pitfalls: [
      "Comparing values before the null checks, causing a null dereference.",
      "Checking only values and ignoring structure (left vs right placement).",
      "Forgetting that two empty trees are equal.",
    ],
    edgeCases: [
      "Both empty — true.",
      "One empty, one not — false.",
      "Same values but mirrored structure — false.",
    ],
    whyItMatters:
      "Lockstep dual recursion is the template for tree comparison, symmetry checks, and subtree matching — a recurring shape in tree interview rounds.",
    estimatedMinutes: 12,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 113 — pure_dsa · dp_1d · easy · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "deploy-step-ways",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 6,
    pattern: "dp_1d",
    difficulty: "easy",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer", "devops_sre"],
    title: "Deploy Step Ways",
    framing:
      "A staged rollout advances either one stage or two stages at a time. Count the distinct ways to go from stage 0 to the final stage n.",
    statement:
      "You are climbing a staircase with n steps. Each move you may climb 1 or 2 steps. Return the number of distinct ways to reach the top.",
    inputFormat: "An integer n (1 ≤ n ≤ 45).",
    outputFormat: "An integer — the number of distinct ways.",
    constraints: [
      "Each move is exactly 1 or 2 steps",
      "Result fits in a 32-bit signed integer for n ≤ 45",
    ],
    examples: [
      {
        input: "n = 2",
        output: "2",
        explanation: "1+1 or 2.",
      },
      {
        input: "n = 3",
        output: "3",
        explanation: "1+1+1, 1+2, or 2+1.",
      },
    ],
    approach: [
      "Ways to reach step i = ways(i-1) + ways(i-2) — the last move was 1 or 2 steps.",
      "This is the Fibonacci recurrence.",
      "Only the previous two values are needed, so track them in two variables.",
      "Iterate from the base cases up to n.",
    ],
    solutionSteps: [
      "Base: ways(1) = 1, ways(2) = 2.",
      "Track prev2 = 1, prev1 = 2.",
      "For i from 3 to n, current = prev1 + prev2.",
      "Shift prev2 = prev1, prev1 = current.",
      "Return prev1 (handle n = 1 separately).",
    ],
    code: {
      python: `def climb_stairs(n: int) -> int:
    if n <= 2:
        return n
    prev2, prev1 = 1, 2
    for _ in range(3, n + 1):
        prev2, prev1 = prev1, prev1 + prev2
    return prev1
`,
      java: `public final class DeployStepWays {
    public static int climbStairs(int n) {
        if (n <= 2) return n;
        int prev2 = 1, prev1 = 2;
        for (int i = 3; i <= n; i++) {
            int current = prev1 + prev2;
            prev2 = prev1;
            prev1 = current;
        }
        return prev1;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int climbStairs(int n) {
    if (n <= 2) return n;
    int prev2 = 1, prev1 = 2;
    for (int i = 3; i <= n; i++) {
        int current = prev1 + prev2;
        prev2 = prev1;
        prev1 = current;
    }
    return prev1;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Naive recursion without memoisation is exponential.",
      "Off-by-one in the base cases for n = 1 or n = 2.",
      "Allocating a full DP array when two rolling variables suffice.",
    ],
    edgeCases: [
      "n = 1 → 1.",
      "n = 2 → 2.",
      "Largest n = 45 still fits in a 32-bit int.",
    ],
    whyItMatters:
      "Climbing stairs is the gateway 1-D DP: recognising overlapping subproblems and collapsing them to O(1) rolling state is a skill every DP question reuses.",
    estimatedMinutes: 11,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 114 — pure_dsa · math_geometry · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "retry-digit-convergence",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 6,
    pattern: "math_geometry",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer", "data_engineer"],
    title: "Retry Digit Convergence",
    framing:
      "A health-check repeatedly squares-and-sums the digits of a status code. Some codes converge to 1 (healthy); others loop forever. Decide whether a given code converges.",
    statement:
      "A happy number is defined by repeatedly replacing a number with the sum of the squares of its digits; the number is happy if this process reaches 1. Given n, return true if n is happy, false otherwise (it loops without reaching 1).",
    inputFormat: "A positive integer n (1 ≤ n ≤ 2^31 − 1).",
    outputFormat: "A boolean — true if n is happy.",
    constraints: [
      "Unhappy numbers enter a cycle that never includes 1",
      "Detect the cycle to terminate",
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
        explanation: "The sequence 2→4→16→37→… cycles without reaching 1.",
      },
    ],
    approach: [
      "Define a step that sums the squares of the digits.",
      "Detect cycles using Floyd's slow/fast pointers over the step function.",
      "If fast reaches 1, the number is happy.",
      "If slow meets fast at a value other than 1, it loops.",
    ],
    solutionSteps: [
      "Write next(x): sum d*d over decimal digits d of x.",
      "Set slow = n, fast = next(n).",
      "Loop while fast != 1 and slow != fast.",
      "Advance slow by one step, fast by two.",
      "Return fast == 1.",
    ],
    code: {
      python: `def is_happy(n: int) -> bool:
    def step(x: int) -> int:
        total = 0
        while x:
            d = x % 10
            total += d * d
            x //= 10
        return total

    slow, fast = n, step(n)
    while fast != 1 and slow != fast:
        slow = step(slow)
        fast = step(step(fast))
    return fast == 1
`,
      java: `public final class RetryDigitConvergence {
    private static int step(int x) {
        int total = 0;
        while (x > 0) {
            int d = x % 10;
            total += d * d;
            x /= 10;
        }
        return total;
    }

    public static boolean isHappy(int n) {
        int slow = n, fast = step(n);
        while (fast != 1 && slow != fast) {
            slow = step(slow);
            fast = step(step(fast));
        }
        return fast == 1;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

static int step(int x) {
    int total = 0;
    while (x > 0) {
        int d = x % 10;
        total += d * d;
        x /= 10;
    }
    return total;
}

bool isHappy(int n) {
    int slow = n, fast = step(n);
    while (fast != 1 && slow != fast) {
        slow = step(slow);
        fast = step(step(fast));
    }
    return fast == 1;
}
`,
    },
    complexity: { time: "O(log n) per step, bounded total steps", space: "O(1)" },
    pitfalls: [
      "Using a hash set of seen values works but uses extra space — the cycle-detection trick is O(1).",
      "Looping forever by not handling the unhappy cycle.",
      "Integer digit extraction errors (forgetting the //= 10 update).",
    ],
    edgeCases: [
      "n = 1 → true immediately.",
      "n = 7 → true (7→49→97→130→10→1).",
      "Small unhappy numbers like 2, 3, 4.",
    ],
    whyItMatters:
      "It reframes cycle detection on an abstract 'next state' function rather than a linked list, showing the technique generalises beyond pointers.",
    estimatedMinutes: 13,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 115 — pure_dsa · bit_manipulation · easy · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "endian-flag-reverse",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 6,
    pattern: "bit_manipulation",
    difficulty: "easy",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "backend_engineer", "software_engineer"],
    title: "Endian Flag Reverse",
    framing:
      "A 32-bit capability flag word must be transmitted to a peer that reads bits in the opposite order. Produce the bit-reversed word.",
    statement:
      "Given an unsigned 32-bit integer n, return the integer obtained by reversing the order of its 32 bits (bit 0 swaps with bit 31, bit 1 with bit 30, and so on).",
    inputFormat: "An unsigned 32-bit integer n (0 ≤ n < 2^32).",
    outputFormat: "An unsigned 32-bit integer — the bit-reversed value.",
    constraints: [
      "Exactly 32 bits are reversed",
      "Aim for O(1) time over the fixed 32-bit width",
    ],
    examples: [
      {
        input: "n = 0b00000010100101000001111010011100",
        output: "0b00111001011110000010100101000000",
        explanation: "Each bit is moved to the mirrored position.",
      },
      {
        input: "n = 0b11111111111111111111111111111101",
        output: "0b10111111111111111111111111111111",
        explanation: "Only the single 0 bit moves to the opposite end.",
      },
    ],
    approach: [
      "Build the result bit by bit across 32 iterations.",
      "Shift result left, OR in the lowest bit of n, then shift n right.",
      "After 32 steps the bits are fully reversed.",
      "Use unsigned/logical shifts to avoid sign extension.",
    ],
    solutionSteps: [
      "Initialise result = 0.",
      "Repeat 32 times: result = (result << 1) | (n & 1).",
      "Then n >>>= 1 (logical right shift).",
      "After the loop, result holds the reversed bits.",
      "Return result as an unsigned value.",
    ],
    code: {
      python: `def reverse_bits(n: int) -> int:
    result = 0
    for _ in range(32):
        result = (result << 1) | (n & 1)
        n >>= 1
    return result & 0xFFFFFFFF
`,
      java: `public final class EndianFlagReverse {
    public static int reverseBits(int n) {
        int result = 0;
        for (int i = 0; i < 32; i++) {
            result = (result << 1) | (n & 1);
            n >>>= 1;
        }
        return result;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

uint32_t reverseBits(uint32_t n) {
    uint32_t result = 0;
    for (int i = 0; i < 32; i++) {
        result = (result << 1) | (n & 1u);
        n >>= 1;
    }
    return result;
}
`,
    },
    complexity: { time: "O(1) — fixed 32 iterations", space: "O(1)" },
    pitfalls: [
      "Using arithmetic >> in Java sign-extends; >>> is required.",
      "Forgetting the final & 0xFFFFFFFF mask in Python where ints are unbounded.",
      "Reversing fewer than 32 bits when leading zeros are present.",
    ],
    edgeCases: [
      "n = 0 → 0.",
      "All ones → all ones.",
      "A single set bit maps to the mirrored position.",
    ],
    whyItMatters:
      "Bit-reversal exercises careful shift/mask discipline and the signed-vs-unsigned shift distinction that trips up many candidates under pressure.",
    estimatedMinutes: 12,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 116 — pure_dsa · linked_list · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "trim-nth-recent-event",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 6,
    pattern: "linked_list",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer", "data_engineer"],
    title: "Trim Nth Recent Event",
    framing:
      "An append-only event chain keeps newest events at the tail. Retention policy says drop the n-th event counting back from the newest. Remove it in a single pass.",
    statement:
      "Given the head of a singly linked list, remove the n-th node from the end of the list and return the head of the modified list.",
    inputFormat: "The head of a singly linked list with L nodes (1 ≤ L ≤ 30) and 1 ≤ n ≤ L.",
    outputFormat: "The head of the list after removing the target node.",
    constraints: [
      "1 ≤ n ≤ list length",
      "Do it in one pass",
      "Removing the head is possible when n equals the length",
    ],
    examples: [
      {
        input: "list = 1→2→3→4→5, n = 2",
        output: "1→2→3→5",
        explanation: "The 2nd-from-end node (value 4) is removed.",
      },
      {
        input: "list = 1, n = 1",
        output: "empty list",
        explanation: "The only node is the 1st from the end.",
      },
    ],
    approach: [
      "Use a dummy node before the head to handle head removal uniformly.",
      "Advance a fast pointer n+1 steps ahead of a slow pointer.",
      "Move both until fast reaches null.",
      "slow.next is then the node to remove; relink past it.",
    ],
    solutionSteps: [
      "Create dummy → head; set slow = fast = dummy.",
      "Advance fast n+1 steps.",
      "Move slow and fast together until fast is null.",
      "Set slow.next = slow.next.next to unlink the target.",
      "Return dummy.next.",
    ],
    code: {
      python: `class ListNode:
    def __init__(self, val: int = 0, nxt: "ListNode | None" = None) -> None:
        self.val = val
        self.next = nxt


def remove_nth_from_end(head: "ListNode | None", n: int) -> "ListNode | None":
    dummy = ListNode(0, head)
    slow = fast = dummy
    for _ in range(n + 1):
        fast = fast.next
    while fast:
        slow = slow.next
        fast = fast.next
    slow.next = slow.next.next
    return dummy.next
`,
      java: `public final class TrimNthRecentEvent {
    public static final class ListNode {
        int val;
        ListNode next;
        ListNode(int val, ListNode next) { this.val = val; this.next = next; }
    }

    public static ListNode removeNthFromEnd(ListNode head, int n) {
        ListNode dummy = new ListNode(0, head);
        ListNode slow = dummy, fast = dummy;
        for (int i = 0; i <= n; i++) fast = fast.next;
        while (fast != null) {
            slow = slow.next;
            fast = fast.next;
        }
        slow.next = slow.next.next;
        return dummy.next;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v, ListNode* n) : val(v), next(n) {}
};

ListNode* removeNthFromEnd(ListNode* head, int n) {
    ListNode dummy(0, head);
    ListNode* slow = &dummy;
    ListNode* fast = &dummy;
    for (int i = 0; i <= n; i++) fast = fast->next;
    while (fast) {
        slow = slow->next;
        fast = fast->next;
    }
    slow->next = slow->next->next;
    return dummy.next;
}
`,
    },
    complexity: { time: "O(L)", space: "O(1)" },
    pitfalls: [
      "Not using a dummy node, which complicates removing the head.",
      "Advancing fast by n instead of n+1, deleting the wrong node.",
      "Leaking the removed node in languages with manual memory (free it if required).",
    ],
    edgeCases: [
      "Removing the head (n = length).",
      "Removing the tail (n = 1).",
      "Single-node list.",
    ],
    whyItMatters:
      "The gap-of-n two-pointer technique plus a dummy head is the standard one-pass linked-list removal pattern, reused for nth-from-end queries broadly.",
    estimatedMinutes: 13,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 117 — pure_dsa · heap_priority_queue · easy · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "batch-merge-largest-two",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 6,
    pattern: "heap_priority_queue",
    difficulty: "easy",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer", "software_engineer"],
    title: "Batch Merge Largest Two",
    framing:
      "A compaction job repeatedly takes the two largest pending batch sizes and merges them: equal sizes cancel out, otherwise the difference remains. Find the final leftover size.",
    statement:
      "Given an array of positive integers stones, repeatedly remove the two largest values x ≥ y. If x == y both are destroyed; otherwise a new stone of value x − y is added. Return the value of the last remaining stone, or 0 if none remain.",
    inputFormat: "An array stones of length n (1 ≤ n ≤ 30), values in [1, 1000].",
    outputFormat: "An integer — the last remaining value, or 0.",
    constraints: [
      "Always operate on the two current largest values",
      "Equal pairs annihilate",
      "Result is 0 when all stones cancel",
    ],
    examples: [
      {
        input: "stones = [2, 7, 4, 1, 8, 1]",
        output: "1",
        explanation: "8,7→1; then 4,2→2; 2,1,1,1 → … finishes at 1.",
      },
      {
        input: "stones = [1, 1]",
        output: "0",
        explanation: "Equal pair annihilates, nothing remains.",
      },
    ],
    approach: [
      "A max-heap gives the two largest values in O(log n) each.",
      "Pop two, push back their difference if non-zero.",
      "Repeat until 0 or 1 stones remain.",
      "Return the remaining value or 0.",
    ],
    solutionSteps: [
      "Build a max-heap from stones.",
      "While more than one stone remains, pop x and y (the two largest).",
      "If x != y, push x − y.",
      "When the loop ends, return the lone stone or 0 if empty.",
      "Use negation to simulate a max-heap where only a min-heap is available.",
    ],
    code: {
      python: `import heapq

def last_stone_weight(stones: list[int]) -> int:
    heap = [-s for s in stones]
    heapq.heapify(heap)
    while len(heap) > 1:
        x = -heapq.heappop(heap)
        y = -heapq.heappop(heap)
        if x != y:
            heapq.heappush(heap, -(x - y))
    return -heap[0] if heap else 0
`,
      java: `import java.util.*;

public final class BatchMergeLargestTwo {
    public static int lastStoneWeight(int[] stones) {
        PriorityQueue<Integer> heap = new PriorityQueue<>(Collections.reverseOrder());
        for (int s : stones) heap.add(s);
        while (heap.size() > 1) {
            int x = heap.poll();
            int y = heap.poll();
            if (x != y) heap.add(x - y);
        }
        return heap.isEmpty() ? 0 : heap.peek();
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int lastStoneWeight(vector<int>& stones) {
    priority_queue<int> heap(stones.begin(), stones.end());
    while (heap.size() > 1) {
        int x = heap.top(); heap.pop();
        int y = heap.top(); heap.pop();
        if (x != y) heap.push(x - y);
    }
    return heap.empty() ? 0 : heap.top();
}
`,
    },
    complexity: { time: "O(n log n)", space: "O(n)" },
    pitfalls: [
      "Re-sorting the whole list each round is O(n² log n).",
      "Forgetting Python's heapq is a min-heap — negate values for a max-heap.",
      "Pushing a zero difference and miscounting remaining stones.",
    ],
    edgeCases: [
      "Single stone — returns that stone.",
      "All equal in pairs — returns 0.",
      "Two stones with a difference — returns the difference.",
    ],
    whyItMatters:
      "Repeatedly extracting extremes is the core heap use case, behind scheduling, Huffman coding, and any 'process the largest/smallest next' simulation.",
    estimatedMinutes: 13,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 118 — ai_applied · arrays_hashing · easy · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "token-cost-prefix-sum",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 6,
    pattern: "arrays_hashing",
    difficulty: "easy",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "backend_engineer", "data_engineer"],
    title: "Token Cost Prefix Sum",
    framing:
      "Each message in a chat transcript has a token cost. A billing view repeatedly asks for the total tokens between two message indices. Precompute so each range query is constant time.",
    statement:
      "Given an integer array costs, design a structure that, after O(n) preprocessing, answers sumRange(i, j) — the inclusive sum of costs[i..j] — in O(1) per query.",
    inputFormat: "An array costs of length n (1 ≤ n ≤ 10^4) and multiple (i, j) queries with 0 ≤ i ≤ j < n.",
    outputFormat: "For each query, the inclusive range sum.",
    constraints: [
      "Preprocessing is O(n)",
      "Each query must be O(1)",
      "Values may be negative",
    ],
    examples: [
      {
        input: "costs = [3, 1, 4, 1, 5], sumRange(1, 3)",
        output: "6",
        explanation: "1 + 4 + 1 = 6.",
      },
      {
        input: "costs = [3, 1, 4, 1, 5], sumRange(0, 4)",
        output: "14",
        explanation: "Sum of the whole array.",
      },
    ],
    approach: [
      "Build a prefix array where prefix[k] is the sum of the first k elements.",
      "prefix[0] = 0; prefix[k] = prefix[k-1] + costs[k-1].",
      "Then sumRange(i, j) = prefix[j+1] − prefix[i].",
      "The subtraction cancels the part before index i.",
    ],
    solutionSteps: [
      "Allocate prefix of length n+1 with prefix[0] = 0.",
      "For k from 1 to n, prefix[k] = prefix[k-1] + costs[k-1].",
      "Store prefix once at construction.",
      "Answer each query as prefix[j+1] − prefix[i].",
      "No per-query loop is needed.",
    ],
    code: {
      python: `class TokenCost:
    def __init__(self, costs: list[int]) -> None:
        self.prefix = [0] * (len(costs) + 1)
        for k in range(1, len(costs) + 1):
            self.prefix[k] = self.prefix[k - 1] + costs[k - 1]

    def sum_range(self, i: int, j: int) -> int:
        return self.prefix[j + 1] - self.prefix[i]
`,
      java: `public final class TokenCostPrefixSum {
    private final int[] prefix;

    public TokenCostPrefixSum(int[] costs) {
        prefix = new int[costs.length + 1];
        for (int k = 1; k <= costs.length; k++) {
            prefix[k] = prefix[k - 1] + costs[k - 1];
        }
    }

    public int sumRange(int i, int j) {
        return prefix[j + 1] - prefix[i];
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

class TokenCost {
    vector<long long> prefix;
public:
    TokenCost(const vector<int>& costs) : prefix(costs.size() + 1, 0) {
        for (size_t k = 1; k <= costs.size(); k++) {
            prefix[k] = prefix[k - 1] + costs[k - 1];
        }
    }
    long long sumRange(int i, int j) {
        return prefix[j + 1] - prefix[i];
    }
};
`,
    },
    complexity: { time: "O(n) build, O(1) query", space: "O(n)" },
    pitfalls: [
      "Off-by-one with the prefix offset — using prefix[j] − prefix[i] drops one term.",
      "Recomputing the sum per query in O(n), defeating the purpose.",
      "Integer overflow on large totals — use 64-bit accumulation where needed.",
    ],
    edgeCases: [
      "Single-element range i == j.",
      "Full-array range.",
      "Negative values in the array.",
    ],
    whyItMatters:
      "Prefix sums turn repeated range aggregation into O(1) lookups — the basis for immutable range queries, 2-D sums, and difference-array updates in analytics pipelines.",
    estimatedMinutes: 11,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 119 — pure_dsa · trees · easy · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "org-span-diameter",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 6,
    pattern: "trees",
    difficulty: "easy",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer", "full_stack_engineer"],
    title: "Org Span Diameter",
    framing:
      "Given a reporting tree, find the longest communication path between any two people — the number of reporting edges on the longest path, which need not pass through the CEO.",
    statement:
      "Given the root of a binary tree, return the length of its diameter: the number of edges on the longest path between any two nodes in the tree. The path may or may not pass through the root.",
    inputFormat: "A binary tree root (1 ≤ nodes ≤ 10^4).",
    outputFormat: "An integer — the diameter measured in edges.",
    constraints: [
      "Diameter is counted in edges, not nodes",
      "The longest path need not include the root",
      "Single traversal expected",
    ],
    examples: [
      {
        input: "root = [1, 2, 3, 4, 5]",
        output: "3",
        explanation: "Path 4 → 2 → 1 → 3 (or 5 → 2 → 1 → 3) has 3 edges.",
      },
      {
        input: "root = [1, 2]",
        output: "1",
        explanation: "One edge between the two nodes.",
      },
    ],
    approach: [
      "For each node, the longest path through it = left height + right height.",
      "Compute heights with a post-order DFS.",
      "Track a running maximum of left+right across all nodes.",
      "Return that maximum, which is the diameter in edges.",
    ],
    solutionSteps: [
      "Maintain a mutable best initialised to 0.",
      "DFS returns the height (in edges) of a subtree.",
      "At each node, leftH and rightH come from the children.",
      "Update best = max(best, leftH + rightH).",
      "Return 1 + max(leftH, rightH) as this node's height.",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val: int = 0, left=None, right=None) -> None:
        self.val = val
        self.left = left
        self.right = right


def diameter_of_binary_tree(root: "TreeNode | None") -> int:
    best = 0

    def height(node: "TreeNode | None") -> int:
        nonlocal best
        if node is None:
            return 0
        left = height(node.left)
        right = height(node.right)
        best = max(best, left + right)
        return 1 + max(left, right)

    height(root)
    return best
`,
      java: `public final class OrgSpanDiameter {
    public static final class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
    }

    private static int best;

    public static int diameterOfBinaryTree(TreeNode root) {
        best = 0;
        height(root);
        return best;
    }

    private static int height(TreeNode node) {
        if (node == null) return 0;
        int left = height(node.left);
        int right = height(node.right);
        best = Math.max(best, left + right);
        return 1 + Math.max(left, right);
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

int height(TreeNode* node, int& best) {
    if (!node) return 0;
    int left = height(node->left, best);
    int right = height(node->right, best);
    best = max(best, left + right);
    return 1 + max(left, right);
}

int diameterOfBinaryTree(TreeNode* root) {
    int best = 0;
    height(root, best);
    return best;
}
`,
    },
    complexity: { time: "O(n)", space: "O(h) recursion" },
    pitfalls: [
      "Counting nodes instead of edges (off by one).",
      "Assuming the diameter always passes through the root.",
      "Recomputing heights repeatedly instead of in one post-order pass — O(n²).",
    ],
    edgeCases: [
      "Single node — diameter 0.",
      "A skewed (linked-list-shaped) tree — diameter = n − 1.",
      "Balanced tree where the path crosses the root.",
    ],
    whyItMatters:
      "Combining a downward return value (height) with an upward-aggregated answer (diameter) in one DFS is a recurring tree-DP pattern.",
    estimatedMinutes: 14,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 120 — pure_dsa · heap_priority_queue · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "k-closest-servers-origin",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 6,
    pattern: "heap_priority_queue",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "platform_engineer", "data_engineer"],
    title: "K Closest Servers To Origin",
    framing:
      "Each edge server sits at an (x, y) coordinate. To route a request, pick the k servers nearest the origin datacentre by Euclidean distance.",
    statement:
      "Given an array points where points[i] = [xi, yi] and an integer k, return the k points closest to the origin (0, 0) by Euclidean distance. The answer may be in any order.",
    inputFormat: "An array points of length n (1 ≤ k ≤ n ≤ 10^4), coordinates in [−10^4, 10^4].",
    outputFormat: "A list of the k closest points.",
    constraints: [
      "Distance is Euclidean; comparing squared distance avoids sqrt",
      "Ties may be broken arbitrarily",
      "1 ≤ k ≤ n",
    ],
    examples: [
      {
        input: "points = [[1,3],[-2,2]], k = 1",
        output: "[[-2,2]]",
        explanation: "Squared distances 10 vs 8; [-2,2] is closer.",
      },
      {
        input: "points = [[3,3],[5,-1],[-2,4]], k = 2",
        output: "[[3,3],[-2,4]]",
        explanation: "Squared distances 18, 26, 20 → keep 18 and 20.",
      },
    ],
    approach: [
      "Compare by squared distance x² + y² — sqrt is monotonic and unnecessary.",
      "Keep a max-heap of size k of the closest-so-far points.",
      "If a new point is closer than the heap's farthest, swap it in.",
      "After the scan the heap holds the k closest.",
    ],
    solutionSteps: [
      "For each point compute d = x² + y².",
      "Push (d, point) onto a max-heap keyed by d.",
      "If the heap exceeds size k, pop the farthest.",
      "After processing all points, the heap holds k points.",
      "Return their coordinates.",
    ],
    code: {
      python: `import heapq

def k_closest(points: list[list[int]], k: int) -> list[list[int]]:
    heap: list[tuple[int, list[int]]] = []
    for x, y in points:
        d = -(x * x + y * y)  # negate for a max-heap of size k
        heapq.heappush(heap, (d, [x, y]))
        if len(heap) > k:
            heapq.heappop(heap)
    return [p for _, p in heap]
`,
      java: `import java.util.*;

public final class KClosestServersOrigin {
    public static int[][] kClosest(int[][] points, int k) {
        PriorityQueue<int[]> heap = new PriorityQueue<>(
            (a, b) -> (b[0] * b[0] + b[1] * b[1]) - (a[0] * a[0] + a[1] * a[1]));
        for (int[] p : points) {
            heap.add(p);
            if (heap.size() > k) heap.poll();
        }
        int[][] result = new int[k][2];
        for (int i = 0; i < k; i++) result[i] = heap.poll();
        return result;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<vector<int>> kClosest(vector<vector<int>>& points, int k) {
    auto dist = [](const vector<int>& p) { return p[0] * p[0] + p[1] * p[1]; };
    priority_queue<pair<int, vector<int>>> heap;  // max-heap by distance
    for (auto& p : points) {
        heap.push({dist(p), p});
        if ((int)heap.size() > k) heap.pop();
    }
    vector<vector<int>> result;
    while (!heap.empty()) { result.push_back(heap.top().second); heap.pop(); }
    return result;
}
`,
    },
    complexity: { time: "O(n log k)", space: "O(k)" },
    pitfalls: [
      "Taking sqrt unnecessarily — it adds cost and floating-point error.",
      "Using a min-heap of all n then popping k (O(n log n)) instead of a size-k max-heap.",
      "Overflow when squaring large coordinates — use 32-bit-safe products or 64-bit.",
    ],
    edgeCases: [
      "k equals n — return all points.",
      "A point exactly at the origin — distance 0.",
      "Ties at the same distance.",
    ],
    whyItMatters:
      "The bounded size-k heap is the standard 'top-k by a key' tool, more memory-efficient than a full sort and ubiquitous in ranking and nearest-neighbour shortlisting.",
    estimatedMinutes: 14,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 121 — pure_dsa · math_geometry · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "rotate-shift-roster",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 6,
    pattern: "math_geometry",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "frontend_engineer", "mobile_engineer"],
    title: "Rotate Shift Roster In Place",
    framing:
      "A weekly shift roster is stored as a square grid. When the team rotates the on-call display by a quarter turn, you must rotate the matrix 90° clockwise without allocating a second grid.",
    statement:
      "Given an n × n matrix, rotate it 90 degrees clockwise in place. You must modify the input matrix directly and use O(1) extra space.",
    inputFormat: "An n × n integer matrix (1 ≤ n ≤ 20), values fit in 32-bit ints.",
    outputFormat: "The same matrix rotated 90° clockwise (mutated in place).",
    constraints: [
      "n == matrix.length == matrix[i].length",
      "1 ≤ n ≤ 20",
      "Extra space must be O(1) — no second matrix",
    ],
    examples: [
      {
        input: "[[1,2,3],[4,5,6],[7,8,9]]",
        output: "[[7,4,1],[8,5,2],[9,6,3]]",
        explanation: "Top row 1,2,3 becomes the right column.",
      },
      {
        input: "[[1,2],[3,4]]",
        output: "[[3,1],[4,2]]",
        explanation: "A 2×2 quarter turn clockwise.",
      },
    ],
    approach: [
      "A 90° clockwise rotation equals a transpose followed by reversing each row.",
      "Transpose: swap matrix[i][j] with matrix[j][i] for j > i.",
      "Then reverse every row left-to-right.",
      "Both steps mutate in place, so no extra grid is needed.",
    ],
    solutionSteps: [
      "Loop i from 0..n-1, j from i+1..n-1, swapping matrix[i][j] and matrix[j][i].",
      "For each row, reverse it with two pointers from both ends.",
      "The matrix now holds the clockwise rotation.",
    ],
    code: {
      python: `def rotate(matrix: list[list[int]]) -> None:
    n = len(matrix)
    # transpose
    for i in range(n):
        for j in range(i + 1, n):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    # reverse each row
    for row in matrix:
        row.reverse()
`,
      java: `public final class RotateShiftRoster {
    public static void rotate(int[][] matrix) {
        int n = matrix.length;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                int tmp = matrix[i][j];
                matrix[i][j] = matrix[j][i];
                matrix[j][i] = tmp;
            }
        }
        for (int[] row : matrix) {
            for (int l = 0, r = n - 1; l < r; l++, r--) {
                int tmp = row[l];
                row[l] = row[r];
                row[r] = tmp;
            }
        }
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

void rotate(vector<vector<int>>& matrix) {
    int n = matrix.size();
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++)
            swap(matrix[i][j], matrix[j][i]);
    for (auto& row : matrix)
        reverse(row.begin(), row.end());
}
`,
    },
    complexity: { time: "O(n²)", space: "O(1)" },
    pitfalls: [
      "Transposing over the full grid instead of the upper triangle — that double-swaps and undoes the work.",
      "Forgetting the row reversal yields a transpose, not a rotation.",
      "Allocating a new matrix violates the O(1) space requirement.",
    ],
    edgeCases: [
      "1×1 matrix — unchanged.",
      "2×2 matrix — smallest non-trivial case.",
      "Matrices with duplicate values still rotate correctly.",
    ],
    whyItMatters:
      "In-place matrix rotation tests spatial index reasoning and the transpose-plus-reverse decomposition — a reusable trick that avoids the memory cost of a naive copy, relevant to image and grid transforms on constrained devices.",
    estimatedMinutes: 22,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 122 — pure_dsa · intervals · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "meeting-rooms-min-count",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 6,
    pattern: "intervals",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "platform_engineer", "software_engineer"],
    title: "Minimum Meeting Rooms",
    framing:
      "Given the day's calendar of meeting start/end times, the facilities system must reserve the fewest rooms so that no two overlapping meetings share a room.",
    statement:
      "Given an array of intervals where intervals[i] = [start, end], return the minimum number of rooms required to host all meetings without overlap. A meeting that ends exactly when another begins does not overlap.",
    inputFormat: "An array intervals of n pairs (0 ≤ n ≤ 10^4), 0 ≤ start < end ≤ 10^6.",
    outputFormat: "An integer — the minimum number of rooms.",
    constraints: [
      "0 ≤ intervals.length ≤ 10,000",
      "An end time equal to a start time is not an overlap",
      "start < end for every interval",
    ],
    examples: [
      {
        input: "[[0,30],[5,10],[15,20]]",
        output: "2",
        explanation: "[0,30] overlaps both others, which themselves don't overlap → 2 rooms.",
      },
      {
        input: "[[7,10],[2,4]]",
        output: "1",
        explanation: "The two meetings are disjoint, so one room suffices.",
      },
    ],
    approach: [
      "Separate the start times and end times into two sorted arrays.",
      "Sweep a pointer through starts; whenever a meeting starts before the earliest end, a new room is needed.",
      "When a start is at or after the earliest end, that room frees up — advance the end pointer.",
      "Track the running room count; its peak is the answer.",
    ],
    solutionSteps: [
      "Build sorted arrays of all starts and all ends.",
      "Use two pointers i (starts) and j (ends), and a counter rooms.",
      "If starts[i] < ends[j], increment rooms and advance i.",
      "Otherwise advance both j and i logic: a room frees, advance j.",
      "Record the maximum rooms seen.",
    ],
    code: {
      python: `def min_meeting_rooms(intervals: list[list[int]]) -> int:
    if not intervals:
        return 0
    starts = sorted(s for s, _ in intervals)
    ends = sorted(e for _, e in intervals)
    rooms = best = 0
    i = j = 0
    while i < len(starts):
        if starts[i] < ends[j]:
            rooms += 1
            best = max(best, rooms)
            i += 1
        else:
            rooms -= 1
            j += 1
    return best
`,
      java: `import java.util.*;

public final class MeetingRoomsMinCount {
    public static int minMeetingRooms(int[][] intervals) {
        int n = intervals.length;
        if (n == 0) return 0;
        int[] starts = new int[n], ends = new int[n];
        for (int k = 0; k < n; k++) { starts[k] = intervals[k][0]; ends[k] = intervals[k][1]; }
        Arrays.sort(starts);
        Arrays.sort(ends);
        int rooms = 0, best = 0, i = 0, j = 0;
        while (i < n) {
            if (starts[i] < ends[j]) { rooms++; best = Math.max(best, rooms); i++; }
            else { rooms--; j++; }
        }
        return best;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int minMeetingRooms(vector<vector<int>>& intervals) {
    int n = intervals.size();
    if (n == 0) return 0;
    vector<int> starts(n), ends(n);
    for (int k = 0; k < n; k++) { starts[k] = intervals[k][0]; ends[k] = intervals[k][1]; }
    sort(starts.begin(), starts.end());
    sort(ends.begin(), ends.end());
    int rooms = 0, best = 0, i = 0, j = 0;
    while (i < n) {
        if (starts[i] < ends[j]) { rooms++; best = max(best, rooms); i++; }
        else { rooms--; j++; }
    }
    return best;
}
`,
    },
    complexity: { time: "O(n log n)", space: "O(n)" },
    pitfalls: [
      "Treating end == start as an overlap — it isn't, so use strict '<' on starts vs ends.",
      "Sorting intervals by start only and counting naively misses concurrent peaks.",
      "Forgetting the empty-input case returns 0.",
    ],
    edgeCases: [
      "No meetings — 0 rooms.",
      "All meetings identical — n rooms.",
      "Back-to-back meetings sharing a boundary — 1 room.",
    ],
    whyItMatters:
      "This is the canonical resource-contention problem: the two-pointer sweep over sorted boundaries is the same skyline/load-peak technique used in capacity planning, connection pooling, and rate-limiter sizing.",
    estimatedMinutes: 24,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 123 — indian_domain · dp_1d · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "atm-min-notes-dispense",
    version: 1,
    status: "pending_review",
    bucket: "indian_domain",
    batchNo: 6,
    pattern: "dp_1d",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer", "platform_engineer"],
    title: "ATM Minimum Notes To Dispense",
    framing:
      "An Indian bank ATM stocks notes in fixed denominations (₹100, ₹200, ₹500, ₹2000). For a requested withdrawal amount, dispense it using the fewest possible notes — and report when the amount cannot be made up exactly from the available denominations.",
    statement:
      "Given an array of note denominations and a target amount, return the minimum number of notes that sum exactly to the amount. Each denomination may be used any number of times. If the amount cannot be formed, return −1.",
    inputFormat: "An array denominations (1 ≤ length ≤ 12) of distinct positive ints, and amount (0 ≤ amount ≤ 100000).",
    outputFormat: "An integer — minimum note count, or −1 if impossible.",
    constraints: [
      "Each denomination is reusable without limit",
      "Amount 0 needs 0 notes",
      "Denominations are not guaranteed to be 'canonical', so greedy can fail",
    ],
    examples: [
      {
        input: "denominations = [100,200,500,2000], amount = 2300",
        output: "3",
        explanation: "2300 = 2000 + 200 + 100, three notes — the fewest possible.",
      },
      {
        input: "denominations = [100,500], amount = 300",
        output: "3",
        explanation: "Only ₹100 notes can form 300 → three notes; ₹500 overshoots.",
      },
    ],
    approach: [
      "This is unbounded coin-change for the minimum count — greedy is unsafe for arbitrary denominations, so use DP.",
      "Let dp[a] be the fewest notes summing to a, initialised to infinity, dp[0] = 0.",
      "For each amount a from 1..target, try every denomination d ≤ a: dp[a] = min(dp[a], dp[a−d] + 1).",
      "If dp[target] is still infinity, the amount is impossible → return −1.",
    ],
    solutionSteps: [
      "Allocate dp of size amount+1 filled with a large sentinel; set dp[0]=0.",
      "Iterate a from 1 to amount.",
      "For each denomination d with d ≤ a and dp[a−d] reachable, relax dp[a].",
      "Return dp[amount] if reachable, else −1.",
    ],
    code: {
      python: `def min_notes(denominations: list[int], amount: int) -> int:
    INF = amount + 1
    dp = [0] + [INF] * amount
    for a in range(1, amount + 1):
        for d in denominations:
            if d <= a and dp[a - d] + 1 < dp[a]:
                dp[a] = dp[a - d] + 1
    return dp[amount] if dp[amount] <= amount else -1
`,
      java: `import java.util.*;

public final class AtmMinNotesDispense {
    public static int minNotes(int[] denominations, int amount) {
        int INF = amount + 1;
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, INF);
        dp[0] = 0;
        for (int a = 1; a <= amount; a++) {
            for (int d : denominations) {
                if (d <= a && dp[a - d] + 1 < dp[a]) dp[a] = dp[a - d] + 1;
            }
        }
        return dp[amount] <= amount ? dp[amount] : -1;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int minNotes(vector<int>& denominations, int amount) {
    int INF = amount + 1;
    vector<int> dp(amount + 1, INF);
    dp[0] = 0;
    for (int a = 1; a <= amount; a++)
        for (int d : denominations)
            if (d <= a && dp[a - d] + 1 < dp[a]) dp[a] = dp[a - d] + 1;
    return dp[amount] <= amount ? dp[amount] : -1;
}
`,
    },
    complexity: { time: "O(amount × denominations)", space: "O(amount)" },
    pitfalls: [
      "Using a greedy largest-first dispense — it fails for non-canonical denomination sets and can miss exact solutions.",
      "Returning 0 instead of −1 for an unreachable amount.",
      "Off-by-one on the dp array length (must be amount+1).",
    ],
    edgeCases: [
      "Amount 0 → 0 notes.",
      "Amount not expressible (e.g. 50 with only ₹100 notes) → −1.",
      "A single denomination that divides the amount exactly.",
    ],
    whyItMatters:
      "Cash dispensing is the textbook setting where greedy intuition breaks: showing why DP is required for arbitrary denominations is a core lesson, and the unbounded-knapsack recurrence underlies billing, change-making, and resource-packing systems.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 124 — pure_dsa · two_pointers · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "buffer-backpressure-capacity",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 6,
    pattern: "two_pointers",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "platform_engineer", "data_engineer"],
    title: "Buffer Backpressure Capacity",
    framing:
      "A pipeline's per-stage buffer heights are given. When backpressure builds, fluid (queued items) pools in the dips between taller stages. Compute the total volume the topology can hold.",
    statement:
      "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
    inputFormat: "An array height of n integers (0 ≤ n ≤ 2·10^4), 0 ≤ height[i] ≤ 10^5.",
    outputFormat: "An integer — the total trapped water units.",
    constraints: [
      "Water above index i is bounded by min(maxLeft, maxRight) − height[i]",
      "0 ≤ n ≤ 20,000",
      "Target O(n) time, O(1) extra space",
    ],
    examples: [
      {
        input: "[0,1,0,2,1,0,1,3,2,1,2,1]",
        output: "6",
        explanation: "Water pools in the valleys between the peaks for 6 total units.",
      },
      {
        input: "[4,2,0,3,2,5]",
        output: "9",
        explanation: "The dip between the 4 and 5 walls traps 9 units.",
      },
    ],
    approach: [
      "Water over a bar equals min(tallest to its left, tallest to its right) minus its own height.",
      "Two pointers from both ends carry running leftMax and rightMax.",
      "Advance the side with the smaller wall, because that side's bound is the limiting factor.",
      "Add the trapped amount at the moving pointer as you go.",
    ],
    solutionSteps: [
      "Set left=0, right=n−1, leftMax=rightMax=0, total=0.",
      "While left < right, compare height[left] and height[right].",
      "If left wall is smaller, update leftMax and add leftMax−height[left]; advance left.",
      "Else update rightMax and add rightMax−height[right]; advance right.",
      "Return total.",
    ],
    code: {
      python: `def trap(height: list[int]) -> int:
    if not height:
        return 0
    left, right = 0, len(height) - 1
    left_max = right_max = total = 0
    while left < right:
        if height[left] < height[right]:
            left_max = max(left_max, height[left])
            total += left_max - height[left]
            left += 1
        else:
            right_max = max(right_max, height[right])
            total += right_max - height[right]
            right -= 1
    return total
`,
      java: `public final class BufferBackpressureCapacity {
    public static int trap(int[] height) {
        int left = 0, right = height.length - 1;
        int leftMax = 0, rightMax = 0, total = 0;
        while (left < right) {
            if (height[left] < height[right]) {
                leftMax = Math.max(leftMax, height[left]);
                total += leftMax - height[left];
                left++;
            } else {
                rightMax = Math.max(rightMax, height[right]);
                total += rightMax - height[right];
                right--;
            }
        }
        return total;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int trap(vector<int>& height) {
    int left = 0, right = (int)height.size() - 1;
    int leftMax = 0, rightMax = 0, total = 0;
    while (left < right) {
        if (height[left] < height[right]) {
            leftMax = max(leftMax, height[left]);
            total += leftMax - height[left];
            left++;
        } else {
            rightMax = max(rightMax, height[right]);
            total += rightMax - height[right];
            right--;
        }
    }
    return total;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Precomputing leftMax/rightMax arrays works but uses O(n) space — the two-pointer form avoids that.",
      "Advancing the wrong (taller) side breaks the invariant that the moving side is bounded.",
      "Forgetting the empty array guard.",
    ],
    edgeCases: [
      "Monotonic increasing or decreasing — traps 0.",
      "Empty or single-bar input — 0.",
      "A flat plateau — 0.",
    ],
    whyItMatters:
      "Trapping rain water is a classic test of the two-pointer invariant — recognising that the smaller boundary dictates the fill level is the same insight behind container sizing and watermark-based flow control.",
    estimatedMinutes: 32,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 125 — pure_dsa · dp_1d · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "longest-increasing-run-tiers",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 6,
    pattern: "dp_1d",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer", "software_engineer"],
    title: "Longest Increasing Pricing Tiers",
    framing:
      "A sequence of pricing-tier values is sampled over time. Find the longest strictly increasing subsequence of tiers — the longest run that never steps down, even if it skips entries.",
    statement:
      "Given an integer array nums, return the length of the longest strictly increasing subsequence. A subsequence keeps order but need not be contiguous.",
    inputFormat: "An array nums of n integers (1 ≤ n ≤ 2500 for the DP form; aim for O(n log n)).",
    outputFormat: "An integer — the length of the longest strictly increasing subsequence.",
    constraints: [
      "Subsequence elements must be strictly increasing",
      "1 ≤ n ≤ 2500",
      "Target O(n log n) with patience-sorting / tails array",
    ],
    examples: [
      {
        input: "[10,9,2,5,3,7,101,18]",
        output: "4",
        explanation: "[2,3,7,18] (or [2,3,7,101]) has length 4.",
      },
      {
        input: "[0,1,0,3,2,3]",
        output: "4",
        explanation: "[0,1,2,3] is the longest increasing subsequence.",
      },
    ],
    approach: [
      "Maintain a 'tails' array where tails[i] is the smallest possible tail of an increasing subsequence of length i+1.",
      "For each value, binary-search the first tail ≥ it (lower_bound for strict increase).",
      "If found, overwrite it (a smaller tail for that length); otherwise append (extends the longest run).",
      "The tails length is the answer — tails itself is not necessarily a valid subsequence.",
    ],
    solutionSteps: [
      "Initialise an empty tails list.",
      "For each x in nums, binary-search the leftmost tail ≥ x.",
      "If the position is past the end, append x; else replace tails[pos] with x.",
      "Return the length of tails.",
    ],
    code: {
      python: `from bisect import bisect_left

def length_of_lis(nums: list[int]) -> int:
    tails: list[int] = []
    for x in nums:
        pos = bisect_left(tails, x)
        if pos == len(tails):
            tails.append(x)
        else:
            tails[pos] = x
    return len(tails)
`,
      java: `import java.util.*;

public final class LongestIncreasingRunTiers {
    public static int lengthOfLIS(int[] nums) {
        int[] tails = new int[nums.length];
        int size = 0;
        for (int x : nums) {
            int lo = 0, hi = size;
            while (lo < hi) {
                int mid = (lo + hi) >>> 1;
                if (tails[mid] < x) lo = mid + 1;
                else hi = mid;
            }
            tails[lo] = x;
            if (lo == size) size++;
        }
        return size;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int lengthOfLIS(vector<int>& nums) {
    vector<int> tails;
    for (int x : nums) {
        auto it = lower_bound(tails.begin(), tails.end(), x);
        if (it == tails.end()) tails.push_back(x);
        else *it = x;
    }
    return (int)tails.size();
}
`,
    },
    complexity: { time: "O(n log n)", space: "O(n)" },
    pitfalls: [
      "Using upper_bound instead of lower_bound allows equal values, breaking strict increase.",
      "Believing the tails array is the actual subsequence — it only encodes lengths.",
      "Falling back to the O(n²) DP when the binary-search form is expected.",
    ],
    edgeCases: [
      "Strictly decreasing input — answer 1.",
      "All equal values — answer 1 (strict).",
      "Already sorted ascending — answer n.",
    ],
    whyItMatters:
      "LIS with patience sorting is the gateway to the binary-search-on-DP technique; the same tails idea reappears in versioning, scheduling, and longest-chain problems where an O(n²) DP is too slow.",
    estimatedMinutes: 33,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 126 — pure_dsa · tries · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "keyword-grid-multi-search",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 6,
    pattern: "tries",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer", "ai_ml_engineer"],
    title: "Keyword Grid Multi-Search",
    framing:
      "A moderation system scans a grid of characters for any of a watchlist of keywords, where a match is a path of adjacent cells. Return every watchlist word that appears.",
    statement:
      "Given an m × n board of characters and a list of words, return all words that can be constructed from sequentially adjacent (horizontally or vertically) cells, where each cell is used at most once per word.",
    inputFormat: "A board of size m × n (1 ≤ m, n ≤ 12) and words (1 ≤ count ≤ 3·10^4), each up to length 10.",
    outputFormat: "A list of the matching words, in any order, without duplicates.",
    constraints: [
      "A single cell cannot be reused within one word's path",
      "Lowercase English letters only",
      "Up to 30,000 words — a Trie is required, per-word DFS is too slow",
    ],
    examples: [
      {
        input: 'board = [["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]], words = ["oath","pea","eat","rain"]',
        output: '["oath","eat"]',
        explanation: "'oath' and 'eat' trace adjacent paths; 'pea' and 'rain' do not.",
      },
      {
        input: 'board = [["a","b"],["c","d"]], words = ["abcb"]',
        output: "[]",
        explanation: "'abcb' would reuse 'b', which is not allowed.",
      },
    ],
    approach: [
      "Insert all words into a Trie so shared prefixes are explored once.",
      "DFS from every cell, descending the Trie by the current character.",
      "When a Trie node marks the end of a word, record it.",
      "Mark cells visited during the path and restore on backtrack; prune dead Trie branches to speed up.",
    ],
    solutionSteps: [
      "Build a Trie; store the full word at terminal nodes.",
      "For each board cell, DFS if the character is a Trie child.",
      "Temporarily blank the cell to avoid reuse, recurse into 4 neighbours.",
      "On reaching a word-end node, add the word and clear its marker to dedupe.",
      "Restore the cell after recursion.",
    ],
    code: {
      python: `def find_words(board: list[list[str]], words: list[str]) -> list[str]:
    trie: dict = {}
    for w in words:
        node = trie
        for ch in w:
            node = node.setdefault(ch, {})
        node["$"] = w
    rows, cols = len(board), len(board[0])
    out: list[str] = []

    def dfs(r: int, c: int, node: dict) -> None:
        ch = board[r][c]
        nxt = node.get(ch)
        if not nxt:
            return
        word = nxt.pop("$", None)
        if word is not None:
            out.append(word)
        board[r][c] = "#"
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and board[nr][nc] != "#":
                dfs(nr, nc, nxt)
        board[r][c] = ch

    for r in range(rows):
        for c in range(cols):
            dfs(r, c, trie)
    return out
`,
      java: `import java.util.*;

public final class KeywordGridMultiSearch {
    static class Node { Map<Character, Node> kids = new HashMap<>(); String word; }

    public static List<String> findWords(char[][] board, String[] words) {
        Node root = new Node();
        for (String w : words) {
            Node n = root;
            for (char ch : w.toCharArray()) n = n.kids.computeIfAbsent(ch, k -> new Node());
            n.word = w;
        }
        List<String> out = new ArrayList<>();
        for (int r = 0; r < board.length; r++)
            for (int c = 0; c < board[0].length; c++)
                dfs(board, r, c, root, out);
        return out;
    }

    static void dfs(char[][] board, int r, int c, Node node, List<String> out) {
        if (r < 0 || c < 0 || r >= board.length || c >= board[0].length) return;
        char ch = board[r][c];
        if (ch == '#') return;
        Node nxt = node.kids.get(ch);
        if (nxt == null) return;
        if (nxt.word != null) { out.add(nxt.word); nxt.word = null; }
        board[r][c] = '#';
        dfs(board, r + 1, c, nxt, out);
        dfs(board, r - 1, c, nxt, out);
        dfs(board, r, c + 1, nxt, out);
        dfs(board, r, c - 1, nxt, out);
        board[r][c] = ch;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

struct Node { unordered_map<char, Node*> kids; string word; };

void dfs(vector<vector<char>>& b, int r, int c, Node* node, vector<string>& out) {
    if (r < 0 || c < 0 || r >= (int)b.size() || c >= (int)b[0].size()) return;
    char ch = b[r][c];
    if (ch == '#' || !node->kids.count(ch)) return;
    Node* nxt = node->kids[ch];
    if (!nxt->word.empty()) { out.push_back(nxt->word); nxt->word.clear(); }
    b[r][c] = '#';
    dfs(b, r + 1, c, nxt, out); dfs(b, r - 1, c, nxt, out);
    dfs(b, r, c + 1, nxt, out); dfs(b, r, c - 1, nxt, out);
    b[r][c] = ch;
}

vector<string> findWords(vector<vector<char>>& board, vector<string>& words) {
    Node* root = new Node();
    for (auto& w : words) {
        Node* n = root;
        for (char ch : w) { if (!n->kids.count(ch)) n->kids[ch] = new Node(); n = n->kids[ch]; }
        n->word = w;
    }
    vector<string> out;
    for (int r = 0; r < (int)board.size(); r++)
        for (int c = 0; c < (int)board[0].size(); c++)
            dfs(board, r, c, root, out);
    return out;
}
`,
    },
    complexity: { time: "O(m·n·4^L)", space: "O(total word length)" },
    pitfalls: [
      "Running an independent DFS per word — O(words × board) is far too slow for 30k words.",
      "Forgetting to restore the cell after recursion corrupts other paths.",
      "Not clearing the word marker after a match yields duplicates.",
    ],
    edgeCases: [
      "Empty words list — return empty.",
      "A word longer than the number of cells — never matches.",
      "Repeated letters forcing reuse — must be rejected.",
    ],
    whyItMatters:
      "Combining a Trie with grid backtracking is the standard way to batch many pattern searches over one structure — the shared-prefix pruning is exactly how multi-keyword scanners and autocomplete-over-maps stay fast.",
    estimatedMinutes: 36,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 127 — pure_dsa · trees · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "snapshot-restore-tree",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 6,
    pattern: "trees",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer", "platform_engineer"],
    title: "Snapshot And Restore A Tree",
    framing:
      "To persist an in-memory configuration tree across restarts, you must serialise it to a flat string and later rebuild the exact same structure from that string.",
    statement:
      "Design serialize and deserialize for a binary tree. serialize encodes a tree to a single string; deserialize reconstructs the identical tree from that string. The structure and values must round-trip exactly.",
    inputFormat: "A binary tree of up to 10^4 nodes; node values fit in 32-bit ints (may be negative).",
    outputFormat: "serialize → a string; deserialize → the reconstructed tree root.",
    constraints: [
      "deserialize(serialize(root)) must equal the original tree",
      "Handle null children explicitly so structure is preserved",
      "Up to 10,000 nodes",
    ],
    examples: [
      {
        input: "root = [1,2,3,null,null,4,5]",
        output: "[1,2,3,null,null,4,5]",
        explanation: "Round-trips to the same tree; the right child of 1 has children 4 and 5.",
      },
      {
        input: "root = []",
        output: "[]",
        explanation: "An empty tree serialises and restores as empty.",
      },
    ],
    approach: [
      "Use a preorder traversal, emitting a sentinel (e.g. '#') for null children so the shape is recoverable.",
      "Join values with a delimiter into one string.",
      "To deserialize, read tokens left to right; the preorder order lets a recursive builder consume the stream.",
      "Each '#' token produces a null and stops that branch.",
    ],
    solutionSteps: [
      "serialize: recurse preorder, append node value or '#', separated by commas.",
      "deserialize: split into a token queue.",
      "Pop a token: if '#', return null; else create a node and recursively build left then right.",
      "Return the root.",
    ],
    code: {
      python: `from collections import deque

class TreeNode:
    def __init__(self, val: int = 0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def serialize(root) -> str:
    out: list[str] = []
    def go(node):
        if node is None:
            out.append("#")
            return
        out.append(str(node.val))
        go(node.left)
        go(node.right)
    go(root)
    return ",".join(out)

def deserialize(data: str):
    tokens = deque(data.split(","))
    def build():
        tok = tokens.popleft()
        if tok == "#":
            return None
        node = TreeNode(int(tok))
        node.left = build()
        node.right = build()
        return node
    return build()
`,
      java: `import java.util.*;

public final class SnapshotRestoreTree {
    static class TreeNode { int val; TreeNode left, right; TreeNode(int v) { val = v; } }

    public static String serialize(TreeNode root) {
        StringBuilder sb = new StringBuilder();
        go(root, sb);
        return sb.toString();
    }
    static void go(TreeNode n, StringBuilder sb) {
        if (n == null) { sb.append("#,"); return; }
        sb.append(n.val).append(',');
        go(n.left, sb);
        go(n.right, sb);
    }

    public static TreeNode deserialize(String data) {
        Deque<String> q = new ArrayDeque<>(Arrays.asList(data.split(",")));
        return build(q);
    }
    static TreeNode build(Deque<String> q) {
        String tok = q.poll();
        if (tok == null || tok.equals("#")) return null;
        TreeNode node = new TreeNode(Integer.parseInt(tok));
        node.left = build(q);
        node.right = build(q);
        return node;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

struct TreeNode { int val; TreeNode *left, *right; TreeNode(int v) : val(v), left(nullptr), right(nullptr) {} };

void go(TreeNode* n, string& out) {
    if (!n) { out += "#,"; return; }
    out += to_string(n->val) + ",";
    go(n->left, out);
    go(n->right, out);
}
string serialize(TreeNode* root) { string out; go(root, out); return out; }

TreeNode* build(queue<string>& q) {
    string tok = q.front(); q.pop();
    if (tok == "#") return nullptr;
    TreeNode* node = new TreeNode(stoi(tok));
    node->left = build(q);
    node->right = build(q);
    return node;
}
TreeNode* deserialize(string data) {
    queue<string> q;
    string cur;
    for (char c : data) {
        if (c == ',') { if (!cur.empty()) q.push(cur); cur.clear(); }
        else cur += c;
    }
    return q.empty() ? nullptr : build(q);
}
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Omitting null markers — without them the structure is ambiguous and cannot round-trip.",
      "Mixing traversal orders between serialize and deserialize.",
      "Forgetting negative values when parsing tokens.",
    ],
    edgeCases: [
      "Empty tree.",
      "Single node.",
      "Skewed (all-left or all-right) tree.",
    ],
    whyItMatters:
      "Serialize/deserialize is the foundation of persistence and wire transfer for tree structures; the null-sentinel preorder scheme is the same idea behind config snapshots, DOM hydration, and AST caching.",
    estimatedMinutes: 34,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 128 — pure_dsa · heap_priority_queue · hard · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "rolling-peak-throughput",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 6,
    pattern: "heap_priority_queue",
    difficulty: "hard",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer", "platform_engineer"],
    title: "Rolling Peak Throughput",
    framing:
      "A metrics pipeline reports throughput per second. For a dashboard showing the peak over the last k seconds at every tick, compute the maximum of each sliding window of size k.",
    statement:
      "Given an array nums and a window size k, return an array of the maximum value within each contiguous window of size k as it slides from left to right.",
    inputFormat: "An array nums of n integers (1 ≤ n ≤ 10^5) and k (1 ≤ k ≤ n).",
    outputFormat: "An array of n−k+1 integers — the maximum of each window.",
    constraints: [
      "Target O(n) overall using a monotonic deque",
      "1 ≤ k ≤ n ≤ 100,000",
      "Values may be negative",
    ],
    examples: [
      {
        input: "nums = [1,3,-1,-3,5,3,6,7], k = 3",
        output: "[3,3,5,5,6,7]",
        explanation: "Windows: [1,3,-1]→3, [3,-1,-3]→3, [-1,-3,5]→5, … [3,6,7]→7.",
      },
      {
        input: "nums = [9,11], k = 2",
        output: "[11]",
        explanation: "Single window max is 11.",
      },
    ],
    approach: [
      "Maintain a deque of indices whose values are in decreasing order.",
      "Before pushing index i, pop smaller values from the back — they can never be the max while i is in window.",
      "Pop the front if it has slid out of the window (index ≤ i−k).",
      "The front index always holds the current window maximum.",
    ],
    solutionSteps: [
      "Iterate i over nums.",
      "Pop back while nums[back] ≤ nums[i].",
      "Push i; pop front if front ≤ i−k.",
      "Once i ≥ k−1, append nums[front] to the output.",
    ],
    code: {
      python: `from collections import deque

def max_sliding_window(nums: list[int], k: int) -> list[int]:
    dq: deque[int] = deque()  # indices, values decreasing
    out: list[int] = []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            out.append(nums[dq[0]])
    return out
`,
      java: `import java.util.*;

public final class RollingPeakThroughput {
    public static int[] maxSlidingWindow(int[] nums, int k) {
        int n = nums.length;
        int[] out = new int[n - k + 1];
        Deque<Integer> dq = new ArrayDeque<>();
        for (int i = 0; i < n; i++) {
            while (!dq.isEmpty() && nums[dq.peekLast()] <= nums[i]) dq.pollLast();
            dq.addLast(i);
            if (dq.peekFirst() <= i - k) dq.pollFirst();
            if (i >= k - 1) out[i - k + 1] = nums[dq.peekFirst()];
        }
        return out;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> maxSlidingWindow(vector<int>& nums, int k) {
    deque<int> dq;
    vector<int> out;
    for (int i = 0; i < (int)nums.size(); i++) {
        while (!dq.empty() && nums[dq.back()] <= nums[i]) dq.pop_back();
        dq.push_back(i);
        if (dq.front() <= i - k) dq.pop_front();
        if (i >= k - 1) out.push_back(nums[dq.front()]);
    }
    return out;
}
`,
    },
    complexity: { time: "O(n)", space: "O(k)" },
    pitfalls: [
      "Using a max-heap without lazy deletion gives O(n log n) and stale maxima from expired indices.",
      "Storing values instead of indices makes window-expiry checks impossible.",
      "Emitting output before the first full window forms (i < k−1).",
    ],
    edgeCases: [
      "k == 1 — output equals the input.",
      "k == n — a single max.",
      "All-equal or all-decreasing arrays.",
    ],
    whyItMatters:
      "The monotonic-deque sliding-window maximum is a staple of streaming analytics — it delivers per-tick extremes in amortised O(1), the technique behind rolling-window metrics and rate monitors.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 129 — pure_dsa · backtracking · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "rack-placement-noconflict",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 6,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "platform_engineer", "backend_engineer"],
    title: "Rack Placement Without Conflict",
    framing:
      "On an n × n server rack grid, place n high-heat units so that no two share a row, column, or diagonal cooling channel. Count the number of valid full placements.",
    statement:
      "Given an integer n, return the number of distinct ways to place n non-attacking queens on an n × n chessboard (the n-queens problem). No two queens may share a row, column, or diagonal.",
    inputFormat: "An integer n (1 ≤ n ≤ 9).",
    outputFormat: "An integer — the count of distinct valid placements.",
    constraints: [
      "Exactly one queen per row and per column in any solution",
      "1 ≤ n ≤ 9",
      "Diagonals: cells share a diagonal when row−col or row+col is equal",
    ],
    examples: [
      {
        input: "n = 4",
        output: "2",
        explanation: "There are exactly two distinct non-attacking arrangements on a 4×4 board.",
      },
      {
        input: "n = 1",
        output: "1",
        explanation: "A single queen on a 1×1 board.",
      },
    ],
    approach: [
      "Place one queen per row, trying each column.",
      "Track occupied columns and both diagonal families (row−col and row+col) in sets for O(1) conflict checks.",
      "Recurse to the next row; when all rows are filled, count one solution.",
      "Backtrack by removing the column/diagonals after exploring.",
    ],
    solutionSteps: [
      "Maintain sets cols, diag1 (row−col), diag2 (row+col).",
      "For the current row, try each column not in any set.",
      "Mark, recurse to row+1, then unmark.",
      "When row == n, increment the solution count.",
    ],
    code: {
      python: `def total_n_queens(n: int) -> int:
    cols: set[int] = set()
    diag1: set[int] = set()
    diag2: set[int] = set()
    count = 0

    def place(row: int) -> None:
        nonlocal count
        if row == n:
            count += 1
            return
        for col in range(n):
            if col in cols or (row - col) in diag1 or (row + col) in diag2:
                continue
            cols.add(col); diag1.add(row - col); diag2.add(row + col)
            place(row + 1)
            cols.discard(col); diag1.discard(row - col); diag2.discard(row + col)

    place(0)
    return count
`,
      java: `import java.util.*;

public final class RackPlacementNoConflict {
    static int count = 0;
    public static int totalNQueens(int n) {
        count = 0;
        place(0, n, new HashSet<>(), new HashSet<>(), new HashSet<>());
        return count;
    }
    static void place(int row, int n, Set<Integer> cols, Set<Integer> d1, Set<Integer> d2) {
        if (row == n) { count++; return; }
        for (int col = 0; col < n; col++) {
            if (cols.contains(col) || d1.contains(row - col) || d2.contains(row + col)) continue;
            cols.add(col); d1.add(row - col); d2.add(row + col);
            place(row + 1, n, cols, d1, d2);
            cols.remove(col); d1.remove(row - col); d2.remove(row + col);
        }
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int countSol;
void place(int row, int n, set<int>& cols, set<int>& d1, set<int>& d2) {
    if (row == n) { countSol++; return; }
    for (int col = 0; col < n; col++) {
        if (cols.count(col) || d1.count(row - col) || d2.count(row + col)) continue;
        cols.insert(col); d1.insert(row - col); d2.insert(row + col);
        place(row + 1, n, cols, d1, d2);
        cols.erase(col); d1.erase(row - col); d2.erase(row + col);
    }
}
int totalNQueens(int n) {
    countSol = 0;
    set<int> cols, d1, d2;
    place(0, n, cols, d1, d2);
    return countSol;
}
`,
    },
    complexity: { time: "O(n!)", space: "O(n)" },
    pitfalls: [
      "Checking only rows and columns but forgetting both diagonal directions.",
      "Recomputing conflicts by scanning the board (O(n) per check) instead of set lookups.",
      "Failing to undo the sets on backtrack, polluting later branches.",
    ],
    edgeCases: [
      "n = 1 → 1 solution.",
      "n = 2 and n = 3 → 0 solutions (no valid placement).",
      "Larger n grows factorially — bounded here at 9.",
    ],
    whyItMatters:
      "N-Queens is the archetypal constraint-satisfaction backtracking problem; encoding conflicts as diagonal/column sets is the same pruning that makes solvers, schedulers, and placement engines tractable.",
    estimatedMinutes: 34,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 130 — ai_applied · backtracking · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "tokenizer-all-segmentations",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 6,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "backend_engineer", "software_engineer"],
    title: "Tokenizer — All Valid Segmentations",
    framing:
      "A subword tokenizer must enumerate every way an un-spaced input string can be split into tokens from its vocabulary — useful when scoring alternative segmentations before picking the most probable one.",
    statement:
      "Given a string s and a dictionary of words wordDict, return all sentences where s is segmented into a space-separated sequence of dictionary words. Each dictionary word may be reused. Return every valid segmentation.",
    inputFormat: "A string s (1 ≤ length ≤ 20) and wordDict of up to 1000 distinct words, each up to length 10.",
    outputFormat: "A list of strings, each a space-joined valid segmentation of s (any order).",
    constraints: [
      "Words in the dictionary are reusable",
      "Memoise by suffix to avoid recomputing shared tails",
      "There may be exponentially many segmentations",
    ],
    examples: [
      {
        input: 's = "catsanddog", wordDict = ["cat","cats","and","sand","dog"]',
        output: '["cats and dog","cat sand dog"]',
        explanation: "Two valid splits exist.",
      },
      {
        input: 's = "pineapplepenapple", wordDict = ["apple","pen","applepen","pine","pineapple"]',
        output: '["pine apple pen apple","pineapple pen apple","pine applepen apple"]',
        explanation: "Three distinct segmentations.",
      },
    ],
    approach: [
      "Recurse from index 0, trying every dictionary word that prefixes the remaining suffix.",
      "For each matching prefix, recurse on the rest and prepend the word to each returned sentence.",
      "Memoise results keyed by start index so shared suffixes are solved once.",
      "An empty suffix returns a single empty completion to anchor the join.",
    ],
    solutionSteps: [
      "Put wordDict into a set for O(1) prefix membership.",
      "Define solve(start): if cached, return; if start == len(s), return [''].",
      "For end in start+1..len(s), if s[start:end] is a word, recurse on end and prepend.",
      "Cache and return the list for start; join the start=0 results with spaces.",
    ],
    code: {
      python: `def word_break(s: str, word_dict: list[str]) -> list[str]:
    words = set(word_dict)
    memo: dict[int, list[str]] = {}

    def solve(start: int) -> list[str]:
        if start in memo:
            return memo[start]
        if start == len(s):
            return [""]
        res: list[str] = []
        for end in range(start + 1, len(s) + 1):
            piece = s[start:end]
            if piece in words:
                for tail in solve(end):
                    res.append(piece if tail == "" else piece + " " + tail)
        memo[start] = res
        return res

    return solve(0)
`,
      java: `import java.util.*;

public final class TokenizerAllSegmentations {
    public static List<String> wordBreak(String s, List<String> wordDict) {
        Set<String> words = new HashSet<>(wordDict);
        Map<Integer, List<String>> memo = new HashMap<>();
        return solve(s, 0, words, memo);
    }
    static List<String> solve(String s, int start, Set<String> words, Map<Integer, List<String>> memo) {
        if (memo.containsKey(start)) return memo.get(start);
        List<String> res = new ArrayList<>();
        if (start == s.length()) { res.add(""); return res; }
        for (int end = start + 1; end <= s.length(); end++) {
            String piece = s.substring(start, end);
            if (words.contains(piece)) {
                for (String tail : solve(s, end, words, memo))
                    res.add(tail.isEmpty() ? piece : piece + " " + tail);
            }
        }
        memo.put(start, res);
        return res;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

unordered_map<int, vector<string>> memo;
vector<string> solve(const string& s, int start, unordered_set<string>& words) {
    if (memo.count(start)) return memo[start];
    vector<string> res;
    if (start == (int)s.size()) { res.push_back(""); return res; }
    for (int end = start + 1; end <= (int)s.size(); end++) {
        string piece = s.substr(start, end - start);
        if (words.count(piece)) {
            for (auto& tail : solve(s, end, words))
                res.push_back(tail.empty() ? piece : piece + " " + tail);
        }
    }
    return memo[start] = res;
}
vector<string> wordBreak(string s, vector<string>& wordDict) {
    memo.clear();
    unordered_set<string> words(wordDict.begin(), wordDict.end());
    return solve(s, 0, words);
}
`,
    },
    complexity: { time: "O(n² + 2^n) worst case", space: "O(n · output)" },
    pitfalls: [
      "Skipping memoisation — overlapping suffixes blow up to exponential recomputation.",
      "Joining with spaces incorrectly leaves a trailing or leading space.",
      "Returning booleans (word-break-I) instead of enumerating all sentences.",
    ],
    edgeCases: [
      "No valid segmentation — return empty list.",
      "The whole string is one dictionary word.",
      "Overlapping words producing many segmentations.",
    ],
    whyItMatters:
      "Enumerating segmentations is the combinatorial core of subword tokenization and ambiguous-text parsing; memoised backtracking is how tokenizers and CJK word splitters enumerate candidates before a probabilistic model ranks them.",
    estimatedMinutes: 36,
  },
];
