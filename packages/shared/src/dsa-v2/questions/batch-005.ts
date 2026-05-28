// DSA v2 — Batch 005 (25 questions).
//
// Fills remaining canonical gaps: 3sum, validate-BST, clone-graph, word
// ladder, word break, combination sum, 0/1 knapsack, streaming median,
// trie wildcard search. Composition: 21 pure_dsa + 3 ai_applied +
// 1 indian_domain. Difficulty mix: 12 easy / 8 medium / 5 hard.
//
// All status = "pending_review" — admin must approve each before live.

import type { DsaV2Question } from "../types";

export const BATCH_005: readonly DsaV2Question[] = [
  // ──────────────────────────────────────────────────────────────────────
  // 81 — pure_dsa · arrays_hashing · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "duplicate-username-check",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 5,
    pattern: "arrays_hashing",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "full_stack_engineer", "software_engineer"],
    title: "Duplicate Username Check",
    framing:
      "A signup batch importer must reject the whole file if any username appears twice — duplicates would collide on the unique index. Decide quickly whether the batch contains any repeat.",
    statement:
      "Given an array of integer username hashes, return true if any value appears at least twice, and false if every value is distinct.",
    inputFormat: "An array nums of length n (1 ≤ n ≤ 10^5), values in [-10^9, 10^9].",
    outputFormat: "A boolean — true if a duplicate exists.",
    constraints: [
      "1 ≤ n ≤ 100,000",
      "Values may be negative",
      "Return as soon as a duplicate is found",
    ],
    examples: [
      {
        input: "nums = [1, 2, 3, 1]",
        output: "true",
        explanation: "The value 1 appears at indices 0 and 3.",
      },
      {
        input: "nums = [1, 2, 3]",
        output: "false",
        explanation: "All three values are distinct.",
      },
    ],
    approach: [
      "Track values already seen in a hash set.",
      "For each value, check membership before inserting.",
      "A hit means a duplicate; return immediately.",
      "Finishing the scan with no hit means all distinct.",
    ],
    solutionSteps: [
      "Create an empty set seen.",
      "Iterate the array; if the current value is in seen, return true.",
      "Otherwise add it to seen.",
      "Return false after the loop.",
      "O(n) time, O(n) space.",
    ],
    code: {
      python: `def has_duplicate(nums: list[int]) -> bool:
    seen: set[int] = set()
    for x in nums:
        if x in seen:
            return True
        seen.add(x)
    return False
`,
      java: `import java.util.*;

public final class DuplicateUsernameCheck {
    public static boolean hasDuplicate(int[] nums) {
        Set<Integer> seen = new HashSet<>();
        for (int x : nums) {
            if (!seen.add(x)) return true;
        }
        return false;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

bool hasDuplicate(const vector<int>& nums) {
    unordered_set<int> seen;
    for (int x : nums) {
        if (!seen.insert(x).second) return true;
    }
    return false;
}
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Sorting first is O(n log n) when a hash set gives O(n).",
      "Comparing all pairs in O(n²).",
      "Forgetting that a single element is never a duplicate.",
    ],
    edgeCases: [
      "Single element — false.",
      "All identical — true.",
      "No duplicates — false after a full scan.",
    ],
    whyItMatters:
      "The seen-set membership test is the most fundamental hashing pattern, underpinning dedup, cycle detection, and first-repeat problems.",
    estimatedMinutes: 10,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 82 — pure_dsa · two_pointers · easy · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "sorted-squared-latencies",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 5,
    pattern: "two_pointers",
    difficulty: "easy",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer", "software_engineer"],
    title: "Sorted Squared Latencies",
    framing:
      "A monitoring job stores signed latency deltas (early or late) sorted ascending. To plot magnitude-squared deviations it needs the squares, still sorted ascending — without a full re-sort.",
    statement:
      "Given an array nums sorted in non-decreasing order (possibly containing negatives), return an array of the squares of each value, sorted in non-decreasing order.",
    inputFormat: "A sorted array nums of length n (1 ≤ n ≤ 10^5), values in [-10^4, 10^4].",
    outputFormat: "A sorted array of the squared values.",
    constraints: [
      "nums is sorted ascending",
      "1 ≤ n ≤ 100,000",
      "Target O(n) without sorting the squares",
    ],
    examples: [
      {
        input: "nums = [-4, -1, 0, 3, 10]",
        output: "[0, 1, 9, 16, 100]",
        explanation: "Squares are 16,1,0,9,100; merged from both ends they come out sorted.",
      },
      {
        input: "nums = [-7, -3, 2, 3, 11]",
        output: "[4, 9, 9, 49, 121]",
        explanation: "The largest squares live at the two ends of the sorted input.",
      },
    ],
    approach: [
      "The biggest squares come from the most negative or most positive values — the array ends.",
      "Use two pointers at both ends, comparing absolute values.",
      "Write the larger square to the back of the result, moving inward.",
      "This produces a sorted output in one pass.",
    ],
    solutionSteps: [
      "Set left = 0, right = n-1, and an output array filled from index n-1 down.",
      "Compare |nums[left]| and |nums[right]|.",
      "Place the larger square at the current write index and advance that pointer inward.",
      "Decrement the write index until the pointers cross.",
      "O(n) time, O(n) output.",
    ],
    code: {
      python: `def sorted_squares(nums: list[int]) -> list[int]:
    n = len(nums)
    out = [0] * n
    left, right = 0, n - 1
    for write in range(n - 1, -1, -1):
        if abs(nums[left]) > abs(nums[right]):
            out[write] = nums[left] * nums[left]
            left += 1
        else:
            out[write] = nums[right] * nums[right]
            right -= 1
    return out
`,
      java: `public final class SortedSquaredLatencies {
    public static int[] sortedSquares(int[] nums) {
        int n = nums.length;
        int[] out = new int[n];
        int left = 0, right = n - 1;
        for (int write = n - 1; write >= 0; write--) {
            if (Math.abs(nums[left]) > Math.abs(nums[right])) {
                out[write] = nums[left] * nums[left];
                left++;
            } else {
                out[write] = nums[right] * nums[right];
                right--;
            }
        }
        return out;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> sortedSquares(const vector<int>& nums) {
    int n = nums.size();
    vector<int> out(n);
    int left = 0, right = n - 1;
    for (int write = n - 1; write >= 0; write--) {
        if (abs(nums[left]) > abs(nums[right])) {
            out[write] = nums[left] * nums[left];
            left++;
        } else {
            out[write] = nums[right] * nums[right];
            right--;
        }
    }
    return out;
}
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Squaring then calling sort — O(n log n), ignoring the input order.",
      "Filling the output front-to-back, which does not preserve sorted order.",
      "Comparing raw values instead of absolute values.",
    ],
    edgeCases: [
      "All non-negative — squares already sorted.",
      "All negative — squares come out reversed, handled by the end pointers.",
      "Single element.",
    ],
    whyItMatters:
      "Filling a result from the outside in with two pointers is a recurring trick whenever the extremes of a sorted array dominate the answer.",
    estimatedMinutes: 13,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 83 — pure_dsa · sliding_window · easy · devops_sre
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "max-consecutive-uptime",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 5,
    pattern: "sliding_window",
    difficulty: "easy",
    primaryRole: "devops_sre",
    roles: ["devops_sre", "backend_engineer", "software_engineer"],
    title: "Max Consecutive Uptime",
    framing:
      "A health-check log records 1 for each minute a service was up and 0 for each minute it was down. Report the longest unbroken stretch of uptime.",
    statement:
      "Given a binary array status, return the maximum number of consecutive 1s.",
    inputFormat: "An array status of length n (1 ≤ n ≤ 10^5), each value 0 or 1.",
    outputFormat: "A single integer — the longest run of consecutive 1s.",
    constraints: [
      "1 ≤ n ≤ 100,000",
      "Values are strictly 0 or 1",
      "A run resets at every 0",
    ],
    examples: [
      {
        input: "status = [1, 1, 0, 1, 1, 1]",
        output: "3",
        explanation: "The final run of three 1s is the longest.",
      },
      {
        input: "status = [0, 0, 0]",
        output: "0",
        explanation: "No uptime minute at all.",
      },
    ],
    approach: [
      "Keep a running counter of the current streak.",
      "Increment on a 1; reset to zero on a 0.",
      "Track the maximum streak seen so far.",
      "Single pass, constant space.",
    ],
    solutionSteps: [
      "Initialise current = 0, best = 0.",
      "For each value: if 1, current += 1 and best = max(best, current); else current = 0.",
      "Return best.",
      "O(n) time, O(1) space.",
      "No explicit window structure needed — the counter is the window length.",
    ],
    code: {
      python: `def max_consecutive_ones(status: list[int]) -> int:
    current = best = 0
    for v in status:
        if v == 1:
            current += 1
            best = max(best, current)
        else:
            current = 0
    return best
`,
      java: `public final class MaxConsecutiveUptime {
    public static int maxConsecutiveOnes(int[] status) {
        int current = 0, best = 0;
        for (int v : status) {
            if (v == 1) {
                current++;
                best = Math.max(best, current);
            } else {
                current = 0;
            }
        }
        return best;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int maxConsecutiveOnes(const vector<int>& status) {
    int current = 0, best = 0;
    for (int v : status) {
        if (v == 1) {
            current++;
            best = max(best, current);
        } else {
            current = 0;
        }
    }
    return best;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Updating best only at the end instead of after each increment, missing a run that ends mid-array.",
      "Forgetting to reset the counter on a 0.",
      "Returning current instead of best.",
    ],
    edgeCases: [
      "All zeros — 0.",
      "All ones — n.",
      "Single element.",
    ],
    whyItMatters:
      "Run-length counting is the simplest streak problem and the entry point to the 'max consecutive ones with k flips' sliding-window variants.",
    estimatedMinutes: 10,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 84 — pure_dsa · stack_queue · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "score-log-replay",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 5,
    pattern: "stack_queue",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer", "data_engineer"],
    title: "Score Log Replay",
    framing:
      "A game's scoring service replays an operations log to rebuild the round's running tally. Each entry is an integer to record, '+' to add the last two recorded scores, 'D' to double the last score, or 'C' to cancel the last score. Return the final total.",
    statement:
      "Given a list of operation tokens, process each: an integer records that value; 'C' removes the last recorded value; 'D' records double the last value; '+' records the sum of the last two values. Return the sum of all values still recorded.",
    inputFormat: "An array ops of length n (1 ≤ n ≤ 1000); each token is an integer string, 'C', 'D', or '+'.",
    outputFormat: "A single integer — the sum of the remaining recorded values.",
    constraints: [
      "Operations are always valid for the current state",
      "Integer values fit in a 32-bit int",
      "1 ≤ n ≤ 1000",
    ],
    examples: [
      {
        input: 'ops = ["5", "2", "C", "D", "+"]',
        output: "30",
        explanation: "Record 5, record 2, cancel 2 → [5]; D doubles → [5,10]; + sums last two → [5,10,15]; total 30.",
      },
      {
        input: 'ops = ["1", "C"]',
        output: "0",
        explanation: "Record 1 then cancel it — nothing remains.",
      },
    ],
    approach: [
      "A stack of recorded scores models the log perfectly — every operation touches only the top.",
      "Push integers; for 'D' push twice the top; for '+' push the sum of the top two.",
      "For 'C' pop the top.",
      "The answer is the sum of the stack contents.",
    ],
    solutionSteps: [
      "Initialise an empty stack.",
      "For each token: handle 'C', 'D', '+' against the stack top, otherwise push the parsed integer.",
      "After processing, sum the stack.",
      "Return the sum.",
      "O(n) time and space.",
    ],
    code: {
      python: `def score_replay(ops: list[str]) -> int:
    stack: list[int] = []
    for op in ops:
        if op == "C":
            stack.pop()
        elif op == "D":
            stack.append(2 * stack[-1])
        elif op == "+":
            stack.append(stack[-1] + stack[-2])
        else:
            stack.append(int(op))
    return sum(stack)
`,
      java: `import java.util.*;

public final class ScoreLogReplay {
    public static int scoreReplay(String[] ops) {
        Deque<Integer> stack = new ArrayDeque<>();
        for (String op : ops) {
            switch (op) {
                case "C" -> stack.pop();
                case "D" -> stack.push(2 * stack.peek());
                case "+" -> {
                    int a = stack.pop();
                    int b = stack.peek();
                    stack.push(a);
                    stack.push(a + b);
                }
                default -> stack.push(Integer.parseInt(op));
            }
        }
        int sum = 0;
        for (int v : stack) sum += v;
        return sum;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int scoreReplay(const vector<string>& ops) {
    vector<int> stack;
    for (const auto& op : ops) {
        if (op == "C") stack.pop_back();
        else if (op == "D") stack.push_back(2 * stack.back());
        else if (op == "+") stack.push_back(stack[stack.size() - 1] + stack[stack.size() - 2]);
        else stack.push_back(stoi(op));
    }
    return accumulate(stack.begin(), stack.end(), 0);
}
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Reading the top two for '+' in the wrong order (sum is order-independent, but careless popping can lose a value).",
      "Parsing '+', 'D', 'C' as integers.",
      "Assuming negative integers cannot appear — they can.",
    ],
    edgeCases: [
      "All entries cancelled — sum 0.",
      "Single integer entry.",
      "Negative scores in the log.",
    ],
    whyItMatters:
      "Replaying an operation log on a stack is the simplest stack-as-state-machine exercise and a gentle lead-in to expression evaluation.",
    estimatedMinutes: 12,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 85 — pure_dsa · binary_search · easy · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "find-target-build-index",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 5,
    pattern: "binary_search",
    difficulty: "easy",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer", "devops_sre"],
    title: "Find Target Build Index",
    framing:
      "A CI dashboard stores build numbers sorted ascending. Given a specific build number, locate its index for a deep link — or report that it was pruned from history.",
    statement:
      "Given a sorted array nums and a target, return the index of target in nums, or -1 if it is not present.",
    inputFormat: "A sorted array nums of length n (0 ≤ n ≤ 10^5) and integer target.",
    outputFormat: "A single integer — the index of target, or -1.",
    constraints: [
      "nums is sorted ascending with distinct values",
      "0 ≤ n ≤ 100,000",
      "Target O(log n)",
    ],
    examples: [
      {
        input: "nums = [-1, 0, 3, 5, 9, 12], target = 9",
        output: "4",
        explanation: "9 sits at index 4.",
      },
      {
        input: "nums = [-1, 0, 3, 5, 9, 12], target = 2",
        output: "-1",
        explanation: "2 is absent from the array.",
      },
    ],
    approach: [
      "Classic binary search on a sorted, distinct array.",
      "Maintain an inclusive range [lo, hi].",
      "Compare the midpoint with target and discard half the range each step.",
      "Return the index on a match, or -1 when the range empties.",
    ],
    solutionSteps: [
      "Set lo = 0, hi = n - 1.",
      "While lo <= hi: mid = lo + (hi - lo) / 2.",
      "If nums[mid] == target return mid; if less, lo = mid + 1; else hi = mid - 1.",
      "Return -1 after the loop.",
      "O(log n) time.",
    ],
    code: {
      python: `def search(nums: list[int], target: int) -> int:
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
`,
      java: `public final class FindTargetBuildIndex {
    public static int search(int[] nums, int target) {
        int lo = 0, hi = nums.length - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return -1;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int search(const vector<int>& nums, int target) {
    int lo = 0, hi = (int)nums.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) return mid;
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}
`,
    },
    complexity: { time: "O(log n)", space: "O(1)" },
    pitfalls: [
      "Computing mid as (lo + hi) / 2 risks overflow in fixed-width languages.",
      "Using lo < hi (exclusive) with an inclusive range, missing the last element.",
      "Infinite loop from failing to move lo or hi.",
    ],
    edgeCases: [
      "Empty array — -1.",
      "Target at the first or last index.",
      "Target outside the value range.",
    ],
    whyItMatters:
      "Plain binary search is the most fundamental logarithmic algorithm; getting its boundary conditions right is the prerequisite for every search-on-answer variant.",
    estimatedMinutes: 11,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 86 — pure_dsa · linked_list · easy · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "merge-two-event-logs",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 5,
    pattern: "linked_list",
    difficulty: "easy",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer", "data_engineer"],
    title: "Merge Two Event Logs",
    framing:
      "Two append-only event logs are each sorted by timestamp and stored as singly linked lists. Merge them into one sorted log, splicing nodes rather than copying values.",
    statement:
      "Given the heads of two sorted linked lists, merge them into one sorted list by splicing the nodes together, and return the head of the merged list.",
    inputFormat: "Heads of two lists with a and b nodes (0 ≤ a, b ≤ 10^4), shown as value sequences; values sorted ascending.",
    outputFormat: "The merged value sequence in non-decreasing order.",
    constraints: [
      "Both inputs are sorted ascending",
      "0 ≤ a, b ≤ 10,000",
      "Reuse the existing nodes",
    ],
    examples: [
      {
        input: "l1 = [1, 2, 4], l2 = [1, 3, 4]",
        output: "[1, 1, 2, 3, 4, 4]",
        explanation: "Nodes are spliced in non-decreasing order, ties keeping l1 first.",
      },
      {
        input: "l1 = [], l2 = [0]",
        output: "[0]",
        explanation: "One list empty — return the other.",
      },
    ],
    approach: [
      "Use a dummy head node to simplify the splice loop.",
      "Walk both lists, attaching the smaller current node to the tail.",
      "Advance the pointer of whichever list contributed the node.",
      "Attach the non-empty remainder once one list is exhausted.",
    ],
    solutionSteps: [
      "Create dummy and tail = dummy.",
      "While both lists are non-empty: link the smaller head to tail and advance it.",
      "Link the remaining list to tail.next.",
      "Return dummy.next.",
      "O(a + b) time, O(1) extra space.",
    ],
    code: {
      python: `class ListNode:
    def __init__(self, val: int = 0, nxt: "ListNode | None" = None):
        self.val = val
        self.next = nxt

def merge_two(l1: ListNode | None, l2: ListNode | None) -> ListNode | None:
    dummy = ListNode()
    tail = dummy
    while l1 and l2:
        if l1.val <= l2.val:
            tail.next = l1
            l1 = l1.next
        else:
            tail.next = l2
            l2 = l2.next
        tail = tail.next
    tail.next = l1 if l1 else l2
    return dummy.next
`,
      java: `public final class MergeTwoEventLogs {
    public static class ListNode {
        int val; ListNode next;
        ListNode() {}
        ListNode(int val) { this.val = val; }
    }
    public static ListNode mergeTwo(ListNode l1, ListNode l2) {
        ListNode dummy = new ListNode(), tail = dummy;
        while (l1 != null && l2 != null) {
            if (l1.val <= l2.val) { tail.next = l1; l1 = l1.next; }
            else { tail.next = l2; l2 = l2.next; }
            tail = tail.next;
        }
        tail.next = (l1 != null) ? l1 : l2;
        return dummy.next;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v = 0) : val(v), next(nullptr) {}
};

ListNode* mergeTwo(ListNode* l1, ListNode* l2) {
    ListNode dummy;
    ListNode* tail = &dummy;
    while (l1 && l2) {
        if (l1->val <= l2->val) { tail->next = l1; l1 = l1->next; }
        else { tail->next = l2; l2 = l2->next; }
        tail = tail->next;
    }
    tail->next = l1 ? l1 : l2;
    return dummy.next;
}
`,
    },
    complexity: { time: "O(a + b)", space: "O(1)" },
    pitfalls: [
      "Forgetting the dummy head and special-casing the first node.",
      "Not attaching the leftover tail of the longer list.",
      "Breaking sort stability by using < instead of <= on ties.",
    ],
    edgeCases: [
      "Both lists empty — return null.",
      "One list empty.",
      "All of one list smaller than the other.",
    ],
    whyItMatters:
      "Splicing two sorted lists with a dummy head is the linked-list analogue of the array merge and the base case of merge-k-lists.",
    estimatedMinutes: 14,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 87 — pure_dsa · trees · easy · frontend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "mirror-layout-invert",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 5,
    pattern: "trees",
    difficulty: "easy",
    primaryRole: "frontend_engineer",
    roles: ["frontend_engineer", "full_stack_engineer", "software_engineer"],
    title: "Mirror Layout Invert",
    framing:
      "A UI toolkit supports a right-to-left locale by mirroring a layout tree: every node's children swap sides, recursively. Given the layout tree root, return the inverted tree.",
    statement:
      "Given the root of a binary tree, invert it — swap the left and right child of every node — and return the new root.",
    inputFormat: "The root of a tree with n nodes (0 ≤ n ≤ 10^4), shown in level order with null for missing children.",
    outputFormat: "The level-order layout of the inverted tree.",
    constraints: [
      "0 ≤ n ≤ 10,000",
      "Node values fit in a 32-bit int",
      "Invert in place is acceptable",
    ],
    examples: [
      {
        input: "root = [4, 2, 7, 1, 3, 6, 9]",
        output: "[4, 7, 2, 9, 6, 3, 1]",
        explanation: "Every node's two subtrees swap, mirroring the whole tree.",
      },
      {
        input: "root = [1, 2]",
        output: "[1, null, 2]",
        explanation: "The single left child moves to the right.",
      },
    ],
    approach: [
      "Inversion is recursive: invert each subtree, then swap the two children.",
      "The base case is a null node, which returns null.",
      "A BFS/DFS with an explicit stack works equally well.",
      "Each node is visited exactly once.",
    ],
    solutionSteps: [
      "If root is null, return null.",
      "Recursively invert root.left and root.right.",
      "Swap the (now inverted) left and right pointers.",
      "Return root.",
      "O(n) time, O(h) stack.",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val: int = 0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def invert(root: TreeNode | None) -> TreeNode | None:
    if root is None:
        return None
    root.left, root.right = invert(root.right), invert(root.left)
    return root
`,
      java: `public final class MirrorLayoutInvert {
    public static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
    }
    public static TreeNode invert(TreeNode root) {
        if (root == null) return null;
        TreeNode left = invert(root.left);
        TreeNode right = invert(root.right);
        root.left = right;
        root.right = left;
        return root;
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

TreeNode* invert(TreeNode* root) {
    if (!root) return nullptr;
    TreeNode* left = invert(root->left);
    TreeNode* right = invert(root->right);
    root->left = right;
    root->right = left;
    return root;
}
`,
    },
    complexity: { time: "O(n)", space: "O(h)" },
    pitfalls: [
      "Swapping the pointers before recursing, which still works but is easy to get tangled — be consistent.",
      "Returning a child instead of the root.",
      "Stack overflow on a pathologically skewed tree if recursion depth is unbounded.",
    ],
    edgeCases: [
      "Empty tree — null.",
      "Single node — unchanged.",
      "Fully one-sided tree.",
    ],
    whyItMatters:
      "Tree inversion is the canonical 'do something to every node' recursion — small, but it cements the recurse-then-combine shape used across tree problems.",
    estimatedMinutes: 12,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 88 — pure_dsa · math_geometry · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "version-bump-increment",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 5,
    pattern: "math_geometry",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "devops_sre", "software_engineer"],
    title: "Version Bump Increment",
    framing:
      "A release tool stores a build counter as an array of decimal digits, most significant first, to avoid integer-width limits. Bumping the build adds one, carrying across as many nines as needed.",
    statement:
      "Given a non-negative integer represented as an array of digits (most significant first, no leading zeros except the number 0), increment it by one and return the resulting digit array.",
    inputFormat: "An array digits of length n (1 ≤ n ≤ 10^4), each in [0, 9], no leading zeros.",
    outputFormat: "The digit array representing the incremented value.",
    constraints: [
      "1 ≤ n ≤ 10,000",
      "No leading zeros in the input (except the single digit 0)",
      "Handle the all-nines carry-out",
    ],
    examples: [
      {
        input: "digits = [1, 2, 3]",
        output: "[1, 2, 4]",
        explanation: "123 + 1 = 124, no carry.",
      },
      {
        input: "digits = [9, 9]",
        output: "[1, 0, 0]",
        explanation: "99 + 1 = 100, the carry grows the array by one digit.",
      },
    ],
    approach: [
      "Walk from the least significant digit (the end) toward the front.",
      "If a digit is less than 9, increment it and return immediately — no further carry.",
      "If it is 9, set it to 0 and continue carrying.",
      "If the carry survives the whole array, prepend a leading 1.",
    ],
    solutionSteps: [
      "Iterate i from n-1 down to 0.",
      "If digits[i] < 9, increment and return digits.",
      "Otherwise set digits[i] = 0 and continue.",
      "After the loop, prepend 1 to the array of zeros.",
      "O(n) time.",
    ],
    code: {
      python: `def plus_one(digits: list[int]) -> list[int]:
    for i in range(len(digits) - 1, -1, -1):
        if digits[i] < 9:
            digits[i] += 1
            return digits
        digits[i] = 0
    return [1] + digits
`,
      java: `public final class VersionBumpIncrement {
    public static int[] plusOne(int[] digits) {
        for (int i = digits.length - 1; i >= 0; i--) {
            if (digits[i] < 9) {
                digits[i]++;
                return digits;
            }
            digits[i] = 0;
        }
        int[] out = new int[digits.length + 1];
        out[0] = 1;
        return out;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> plusOne(vector<int> digits) {
    for (int i = (int)digits.size() - 1; i >= 0; i--) {
        if (digits[i] < 9) {
            digits[i]++;
            return digits;
        }
        digits[i] = 0;
    }
    digits.insert(digits.begin(), 1);
    return digits;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1) or O(n) on carry-out" },
    pitfalls: [
      "Converting to an integer — defeats the purpose and overflows for long arrays.",
      "Forgetting the all-nines case that lengthens the array.",
      "Carrying from the wrong end.",
    ],
    edgeCases: [
      "Single digit below 9.",
      "All nines.",
      "The number 0 → [1].",
    ],
    whyItMatters:
      "Digit-array arithmetic with carry propagation is the seed of big-integer addition and 'add two numbers' linked-list problems.",
    estimatedMinutes: 12,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 89 — pure_dsa · arrays_hashing · easy · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "common-followers",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 5,
    pattern: "arrays_hashing",
    difficulty: "easy",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer", "software_engineer"],
    title: "Common Followers",
    framing:
      "A 'mutual connections' feature intersects two users' follower id lists. Return the set of follower ids that appear in both, with no duplicates.",
    statement:
      "Given two integer arrays a and b, return an array of their distinct common values (the set intersection), in any order.",
    inputFormat: "Arrays a and b of lengths m and n (0 ≤ m, n ≤ 10^5), values in [-10^9, 10^9].",
    outputFormat: "An array of the distinct values present in both inputs.",
    constraints: [
      "0 ≤ m, n ≤ 100,000",
      "Each result value appears once",
      "Order of the output does not matter",
    ],
    examples: [
      {
        input: "a = [1, 2, 2, 1], b = [2, 2]",
        output: "[2]",
        explanation: "Only 2 is common; duplicates collapse to a single entry.",
      },
      {
        input: "a = [4, 9, 5], b = [9, 4, 9, 8, 4]",
        output: "[4, 9]",
        explanation: "4 and 9 appear in both arrays.",
      },
    ],
    approach: [
      "Put the values of one array into a hash set.",
      "Iterate the other array, collecting values present in the set.",
      "Use a result set to avoid emitting duplicates.",
      "Linear in the combined length.",
    ],
    solutionSteps: [
      "Build setA from a.",
      "For each value in b, if it is in setA, add it to a result set.",
      "Convert the result set to a list.",
      "Return the list.",
      "O(m + n) time, O(m) space.",
    ],
    code: {
      python: `def intersection(a: list[int], b: list[int]) -> list[int]:
    set_a = set(a)
    return list({x for x in b if x in set_a})
`,
      java: `import java.util.*;

public final class CommonFollowers {
    public static int[] intersection(int[] a, int[] b) {
        Set<Integer> setA = new HashSet<>();
        for (int x : a) setA.add(x);
        Set<Integer> result = new HashSet<>();
        for (int x : b) if (setA.contains(x)) result.add(x);
        int[] out = new int[result.size()];
        int i = 0;
        for (int v : result) out[i++] = v;
        return out;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> intersection(const vector<int>& a, const vector<int>& b) {
    unordered_set<int> setA(a.begin(), a.end());
    unordered_set<int> result;
    for (int x : b) if (setA.count(x)) result.insert(x);
    return vector<int>(result.begin(), result.end());
}
`,
    },
    complexity: { time: "O(m + n)", space: "O(m)" },
    pitfalls: [
      "Returning duplicates when a value repeats in b.",
      "Nested loops giving O(m·n).",
      "Hashing the larger array, wasting memory — hash the smaller one.",
    ],
    edgeCases: [
      "No common values — empty result.",
      "One array empty.",
      "Identical arrays — the distinct set.",
    ],
    whyItMatters:
      "Set intersection via hashing is a daily operation in data joins and recommendation features, and it reinforces choosing which side to hash for efficiency.",
    estimatedMinutes: 11,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 90 — pure_dsa · bit_manipulation · easy · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "capacity-power-of-two",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 5,
    pattern: "bit_manipulation",
    difficulty: "easy",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "backend_engineer", "software_engineer"],
    title: "Capacity Power Of Two",
    framing:
      "A ring buffer requires its capacity to be an exact power of two so that index wrapping can use a cheap bit-mask instead of a modulo. Validate a requested capacity.",
    statement:
      "Given an integer n, return true if n is a power of two (n = 2^k for some integer k ≥ 0), otherwise false.",
    inputFormat: "A single integer n (-2^31 ≤ n ≤ 2^31 - 1).",
    outputFormat: "A boolean — true if n is a power of two.",
    constraints: [
      "n may be zero or negative (both are not powers of two)",
      "Aim for O(1) without a loop if possible",
      "Use 32-bit-safe operations",
    ],
    examples: [
      {
        input: "n = 16",
        output: "true",
        explanation: "16 = 2^4.",
      },
      {
        input: "n = 3",
        output: "false",
        explanation: "3 is not any power of two.",
      },
    ],
    approach: [
      "A positive power of two has exactly one set bit in binary.",
      "The identity n & (n - 1) clears the lowest set bit.",
      "If n is a power of two, that operation yields zero.",
      "Guard against n ≤ 0, which can never be a power of two.",
    ],
    solutionSteps: [
      "Return false immediately if n ≤ 0.",
      "Compute n & (n - 1).",
      "If the result is 0, n had a single set bit — return true.",
      "Otherwise return false.",
      "O(1) time and space.",
    ],
    code: {
      python: `def is_power_of_two(n: int) -> bool:
    return n > 0 and (n & (n - 1)) == 0
`,
      java: `public final class CapacityPowerOfTwo {
    public static boolean isPowerOfTwo(int n) {
        return n > 0 && (n & (n - 1)) == 0;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

bool isPowerOfTwo(int n) {
    return n > 0 && (n & (n - 1)) == 0;
}
`,
    },
    complexity: { time: "O(1)", space: "O(1)" },
    pitfalls: [
      "Forgetting the n ≤ 0 guard — 0 & -1 is 0 and would wrongly report true for zero.",
      "Looping to divide by two repeatedly when a single bit trick suffices.",
      "Overflow when computing n - 1 at INT_MIN — guarded by the positivity check.",
    ],
    edgeCases: [
      "n = 1 — 2^0, true.",
      "n = 0 — false.",
      "Negative n — false.",
    ],
    whyItMatters:
      "The n & (n-1) idiom is a bit-manipulation staple, reused for counting set bits and detecting single-bit values — the kind of trick interviewers expect on sight.",
    estimatedMinutes: 10,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 91 — pure_dsa · greedy · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "credit-grant-match",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 5,
    pattern: "greedy",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer", "software_engineer"],
    title: "Credit Grant Match",
    framing:
      "A promotions service hands out credit grants of various sizes to users who each need a minimum credit to be satisfied. A user is satisfied if assigned a grant at least as large as their need. Maximise the number of satisfied users.",
    statement:
      "Given an array need where need[i] is user i's minimum credit, and an array grant of available grant sizes, assign at most one grant per user (each grant used once) to maximise the count of satisfied users. Return that maximum count.",
    inputFormat: "Arrays need (length u) and grant (length g), 0 ≤ u, g ≤ 10^5, positive values.",
    outputFormat: "A single integer — the maximum number of satisfied users.",
    constraints: [
      "Each grant is used at most once",
      "A user needs a grant ≥ their need value",
      "0 ≤ u, g ≤ 100,000",
    ],
    examples: [
      {
        input: "need = [1, 2, 3], grant = [1, 1]",
        output: "1",
        explanation: "Both grants are size 1; only the user needing 1 can be satisfied.",
      },
      {
        input: "need = [1, 2], grant = [1, 2, 3]",
        output: "2",
        explanation: "Grant 1 satisfies need 1 and grant 2 satisfies need 2.",
      },
    ],
    approach: [
      "Sort both needs and grants ascending.",
      "Greedily give the smallest sufficient grant to the smallest unmet need.",
      "Advance a need pointer only when its need is met; always advance the grant pointer.",
      "The count of matched needs is the answer.",
    ],
    solutionSteps: [
      "Sort need and grant ascending.",
      "Set i = 0 (need), j = 0 (grant), satisfied = 0.",
      "While both pointers are in range: if grant[j] ≥ need[i], satisfy (satisfied += 1, i += 1); always j += 1.",
      "Return satisfied.",
      "O(u log u + g log g) time.",
    ],
    code: {
      python: `def max_satisfied(need: list[int], grant: list[int]) -> int:
    need.sort()
    grant.sort()
    i = j = satisfied = 0
    while i < len(need) and j < len(grant):
        if grant[j] >= need[i]:
            satisfied += 1
            i += 1
        j += 1
    return satisfied
`,
      java: `import java.util.*;

public final class CreditGrantMatch {
    public static int maxSatisfied(int[] need, int[] grant) {
        Arrays.sort(need);
        Arrays.sort(grant);
        int i = 0, j = 0, satisfied = 0;
        while (i < need.length && j < grant.length) {
            if (grant[j] >= need[i]) {
                satisfied++;
                i++;
            }
            j++;
        }
        return satisfied;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int maxSatisfied(vector<int> need, vector<int> grant) {
    sort(need.begin(), need.end());
    sort(grant.begin(), grant.end());
    int i = 0, j = 0, satisfied = 0;
    while (i < (int)need.size() && j < (int)grant.size()) {
        if (grant[j] >= need[i]) {
            satisfied++;
            i++;
        }
        j++;
    }
    return satisfied;
}
`,
    },
    complexity: { time: "O(u log u + g log g)", space: "O(1) beyond sorting" },
    pitfalls: [
      "Matching the largest grant to the smallest need, wasting capacity.",
      "Advancing the need pointer even when the grant is too small.",
      "Not sorting, which breaks the greedy exchange argument.",
    ],
    edgeCases: [
      "More users than grants.",
      "All grants too small — zero satisfied.",
      "Empty need or grant array.",
    ],
    whyItMatters:
      "The sort-then-two-pointer greedy with an exchange argument is the template for assignment and scheduling problems where you match the cheapest resource to the easiest demand.",
    estimatedMinutes: 14,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 92 — pure_dsa · arrays_hashing · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "first-unique-char-in-log",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 5,
    pattern: "arrays_hashing",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer", "software_engineer"],
    title: "First Unique Char In Log",
    framing:
      "A log-compaction routine wants the first character in a log line that appears exactly once, to use as a quick fingerprint. Return its index, or -1 if every character repeats.",
    statement:
      "Given a string s, return the index of the first character that appears exactly once. If no such character exists, return -1.",
    inputFormat: "A string s of length n (1 ≤ n ≤ 10^5), lowercase ASCII letters.",
    outputFormat: "A single integer — the index of the first unique character, or -1.",
    constraints: [
      "1 ≤ n ≤ 100,000",
      "Only lowercase English letters",
      "Index is 0-based",
    ],
    examples: [
      {
        input: 's = "leetcode"',
        output: "0",
        explanation: "'l' appears once and is the earliest such character.",
      },
      {
        input: 's = "loveleetcode"',
        output: "2",
        explanation: "'l', 'o', 'e' repeat; 'v' at index 2 is the first unique character.",
      },
    ],
    approach: [
      "Count occurrences of each character in one pass.",
      "Scan the string again in order.",
      "Return the index of the first character with count one.",
      "Insertion order is preserved by scanning the string, not the map.",
    ],
    solutionSteps: [
      "Build a frequency map over s (26 buckets suffice).",
      "Iterate i over s.",
      "Return i when count[s[i]] == 1.",
      "Return -1 if no such index exists.",
      "O(n) time, O(1) space (fixed alphabet).",
    ],
    code: {
      python: `def first_unique_char(s: str) -> int:
    from collections import Counter
    count = Counter(s)
    for i, c in enumerate(s):
        if count[c] == 1:
            return i
    return -1
`,
      java: `public final class FirstUniqueCharInLog {
    public static int firstUniqueChar(String s) {
        int[] count = new int[26];
        for (int i = 0; i < s.length(); i++) count[s.charAt(i) - 'a']++;
        for (int i = 0; i < s.length(); i++)
            if (count[s.charAt(i) - 'a'] == 1) return i;
        return -1;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int firstUniqueChar(const string& s) {
    int count[26] = {0};
    for (char c : s) count[c - 'a']++;
    for (int i = 0; i < (int)s.size(); i++)
        if (count[s[i] - 'a'] == 1) return i;
    return -1;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Returning the first count-one entry from the map, which loses positional order.",
      "Trying a one-pass solution that cannot know future repeats.",
      "Assuming a non-lowercase alphabet without sizing the count array accordingly.",
    ],
    edgeCases: [
      "All characters repeat — return -1.",
      "Single character — index 0.",
      "Unique character at the end.",
    ],
    whyItMatters:
      "Count-then-scan over a fixed alphabet is the string twin of first-unique-element and a frequent warm-up that tests whether you preserve order correctly.",
    estimatedMinutes: 12,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 93 — ai_applied · heap_priority_queue · medium · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "top-k-frequent-tokens",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 5,
    pattern: "heap_priority_queue",
    difficulty: "medium",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "data_engineer", "backend_engineer"],
    title: "Top K Frequent Tokens",
    framing:
      "Before training a tokenizer, you profile a corpus and need the k most frequent token ids to seed the vocabulary. The tokens are just integers — the task is the classic top-k-by-frequency selection.",
    statement:
      "Given an array tokens and an integer k, return the k most frequent token values. The answer is guaranteed unique; any order among the k is accepted.",
    inputFormat: "An array tokens of length n (1 ≤ n ≤ 10^5), values in [-10^9, 10^9], and k (1 ≤ k ≤ number of distinct tokens).",
    outputFormat: "An array of the k most frequent token values.",
    constraints: [
      "1 ≤ k ≤ number of distinct values",
      "The top-k set is unique (no frequency ties at the boundary)",
      "Aim better than a full sort of all distinct counts",
    ],
    examples: [
      {
        input: "tokens = [1, 1, 1, 2, 2, 3], k = 2",
        output: "[1, 2]",
        explanation: "1 appears 3 times, 2 appears twice — the two most frequent.",
      },
      {
        input: "tokens = [7], k = 1",
        output: "[7]",
        explanation: "Only one distinct token.",
      },
    ],
    approach: [
      "Count each token's frequency in a hash map.",
      "Keep a min-heap of size k keyed by frequency over the distinct tokens.",
      "Each distinct token is pushed; when the heap exceeds k, evict the least frequent.",
      "The heap's contents are the answer — O(d log k) over d distinct values.",
    ],
    solutionSteps: [
      "Build freq[token] in one pass.",
      "Iterate the distinct tokens, pushing (freq, token) onto a min-heap.",
      "Pop when the heap size exceeds k.",
      "Extract the token field of the remaining k heap entries.",
      "O(n + d log k) time.",
    ],
    code: {
      python: `import heapq
from collections import Counter

def top_k_frequent(tokens: list[int], k: int) -> list[int]:
    freq = Counter(tokens)
    heap: list[tuple[int, int]] = []
    for tok, f in freq.items():
        heapq.heappush(heap, (f, tok))
        if len(heap) > k:
            heapq.heappop(heap)
    return [tok for _, tok in heap]
`,
      java: `import java.util.*;

public final class TopKFrequentTokens {
    public static int[] topKFrequent(int[] tokens, int k) {
        Map<Integer, Integer> freq = new HashMap<>();
        for (int t : tokens) freq.merge(t, 1, Integer::sum);
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> Integer.compare(a[1], b[1]));
        for (Map.Entry<Integer, Integer> e : freq.entrySet()) {
            heap.offer(new int[]{e.getKey(), e.getValue()});
            if (heap.size() > k) heap.poll();
        }
        int[] out = new int[k];
        for (int i = 0; i < k; i++) out[i] = heap.poll()[0];
        return out;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> topKFrequent(const vector<int>& tokens, int k) {
    unordered_map<int, int> freq;
    for (int t : tokens) freq[t]++;
    // min-heap on frequency: (freq, token)
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> heap;
    for (auto& [tok, f] : freq) {
        heap.push({f, tok});
        if ((int)heap.size() > k) heap.pop();
    }
    vector<int> out;
    while (!heap.empty()) { out.push_back(heap.top().second); heap.pop(); }
    return out;
}
`,
    },
    complexity: { time: "O(n + d log k)", space: "O(d)" },
    pitfalls: [
      "Sorting all distinct counts (O(d log d)) when a size-k heap is enough.",
      "Using a max-heap and popping k times, which is fine but uses O(d) heap space.",
      "Keying the heap on the token instead of its frequency.",
    ],
    edgeCases: [
      "k equals the number of distinct tokens — return all.",
      "Single distinct token.",
      "Highly skewed frequencies.",
    ],
    whyItMatters:
      "Top-k-by-frequency combines hashing with a bounded heap — the exact recipe for trending-terms, hot-key detection, and vocabulary pruning at scale.",
    estimatedMinutes: 24,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 94 — pure_dsa · two_pointers · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "three-signal-sum-zero",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 5,
    pattern: "two_pointers",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer", "backend_engineer"],
    title: "Three Signal Sum Zero",
    framing:
      "An anomaly detector looks for triples of signed signal deltas that cancel out to zero — a sign of a balanced, non-anomalous window. Return all unique triples that sum to zero.",
    statement:
      "Given an integer array nums, return all unique triples [a, b, c] such that a + b + c = 0. The solution set must not contain duplicate triples.",
    inputFormat: "An array nums of length n (0 ≤ n ≤ 3000), values in [-10^5, 10^5].",
    outputFormat: "A list of unique triples summing to zero, in any order.",
    constraints: [
      "0 ≤ n ≤ 3000",
      "No duplicate triples in the output",
      "Order within and across triples is unconstrained",
    ],
    examples: [
      {
        input: "nums = [-1, 0, 1, 2, -1, -4]",
        output: "[[-1, -1, 2], [-1, 0, 1]]",
        explanation: "Two distinct triples sum to zero; the duplicate -1 is handled by skipping repeats.",
      },
      {
        input: "nums = [0, 0, 0, 0]",
        output: "[[0, 0, 0]]",
        explanation: "Only one unique zero triple despite many zeros.",
      },
    ],
    approach: [
      "Sort the array so duplicates are adjacent and two-pointer scanning works.",
      "Fix each index i as the first element, then two-pointer the rest for the pair summing to -nums[i].",
      "Skip over equal values at i, left, and right to avoid duplicate triples.",
      "Sorting plus the linear inner scan gives O(n²).",
    ],
    solutionSteps: [
      "Sort nums.",
      "For i from 0 to n-3, skip duplicate nums[i]; if nums[i] > 0 break.",
      "Set left = i+1, right = n-1; move them based on the triple sum, recording zero-sum triples.",
      "Skip duplicate left/right values after recording a triple.",
      "Return the collected triples.",
    ],
    code: {
      python: `def three_sum(nums: list[int]) -> list[list[int]]:
    nums.sort()
    out: list[list[int]] = []
    n = len(nums)
    for i in range(n - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        if nums[i] > 0:
            break
        left, right = i + 1, n - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total < 0:
                left += 1
            elif total > 0:
                right -= 1
            else:
                out.append([nums[i], nums[left], nums[right]])
                left += 1
                right -= 1
                while left < right and nums[left] == nums[left - 1]:
                    left += 1
                while left < right and nums[right] == nums[right + 1]:
                    right -= 1
    return out
`,
      java: `import java.util.*;

public final class ThreeSignalSumZero {
    public static List<List<Integer>> threeSum(int[] nums) {
        Arrays.sort(nums);
        List<List<Integer>> out = new ArrayList<>();
        int n = nums.length;
        for (int i = 0; i < n - 2; i++) {
            if (i > 0 && nums[i] == nums[i - 1]) continue;
            if (nums[i] > 0) break;
            int left = i + 1, right = n - 1;
            while (left < right) {
                int total = nums[i] + nums[left] + nums[right];
                if (total < 0) left++;
                else if (total > 0) right--;
                else {
                    out.add(Arrays.asList(nums[i], nums[left], nums[right]));
                    left++; right--;
                    while (left < right && nums[left] == nums[left - 1]) left++;
                    while (left < right && nums[right] == nums[right + 1]) right--;
                }
            }
        }
        return out;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<vector<int>> threeSum(vector<int> nums) {
    sort(nums.begin(), nums.end());
    vector<vector<int>> out;
    int n = nums.size();
    for (int i = 0; i < n - 2; i++) {
        if (i > 0 && nums[i] == nums[i - 1]) continue;
        if (nums[i] > 0) break;
        int left = i + 1, right = n - 1;
        while (left < right) {
            int total = nums[i] + nums[left] + nums[right];
            if (total < 0) left++;
            else if (total > 0) right--;
            else {
                out.push_back({nums[i], nums[left], nums[right]});
                left++; right--;
                while (left < right && nums[left] == nums[left - 1]) left++;
                while (left < right && nums[right] == nums[right + 1]) right--;
            }
        }
    }
    return out;
}
`,
    },
    complexity: { time: "O(n²)", space: "O(1) beyond output" },
    pitfalls: [
      "Not skipping duplicates, producing repeated triples.",
      "Using a hash-set of triples to dedupe instead of the cheaper skip logic.",
      "Off-by-one in the inner duplicate-skip comparisons after moving the pointers.",
    ],
    edgeCases: [
      "Fewer than three elements — empty.",
      "All zeros — a single [0,0,0].",
      "No triple sums to zero.",
    ],
    whyItMatters:
      "3Sum is the canonical 'sort then collapse a dimension with two pointers' problem, the bridge from two-sum to k-sum and a frequent interview centrepiece.",
    estimatedMinutes: 28,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 95 — pure_dsa · sliding_window · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "longest-run-after-k-flips",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 5,
    pattern: "sliding_window",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer", "software_engineer"],
    title: "Longest Run After K Flips",
    framing:
      "A categorical event stream is encoded as uppercase letters. You may relabel at most k events to any single category to lengthen a uniform run. Find the longest run of one category achievable after at most k relabels.",
    statement:
      "Given a string s of uppercase letters and an integer k, return the length of the longest substring containing a single repeated letter after replacing at most k characters.",
    inputFormat: "A string s of length n (1 ≤ n ≤ 10^5) of uppercase letters and integer k (0 ≤ k ≤ n).",
    outputFormat: "A single integer — the longest achievable uniform run.",
    constraints: [
      "1 ≤ n ≤ 100,000",
      "0 ≤ k ≤ n",
      "Only uppercase English letters",
    ],
    examples: [
      {
        input: 's = "AABABBA", k = 1',
        output: "4",
        explanation: "Replacing one B in \"AABA\" (or one A in \"ABBA\") yields a run of 4 identical letters.",
      },
      {
        input: 's = "ABCDE", k = 0',
        output: "1",
        explanation: "With no replacements, the best uniform run is a single character.",
      },
    ],
    approach: [
      "Slide a window and track the count of the most frequent letter inside it.",
      "The window is valid when (windowLength − maxCount) ≤ k — that many flips suffice.",
      "When invalid, shrink from the left by one (the window never needs to shrink more than once per step).",
      "The largest valid window length is the answer.",
    ],
    solutionSteps: [
      "Maintain counts[26], left = 0, maxCount = 0, best = 0.",
      "For right in range(n): increment counts[s[right]], update maxCount.",
      "If (right - left + 1) - maxCount > k, decrement counts[s[left]] and advance left.",
      "Update best with the current window length.",
      "Return best.",
    ],
    code: {
      python: `def longest_run(s: str, k: int) -> int:
    counts = [0] * 26
    left = max_count = best = 0
    for right, ch in enumerate(s):
        counts[ord(ch) - 65] += 1
        max_count = max(max_count, counts[ord(ch) - 65])
        if (right - left + 1) - max_count > k:
            counts[ord(s[left]) - 65] -= 1
            left += 1
        best = max(best, right - left + 1)
    return best
`,
      java: `public final class LongestRunAfterKFlips {
    public static int longestRun(String s, int k) {
        int[] counts = new int[26];
        int left = 0, maxCount = 0, best = 0;
        for (int right = 0; right < s.length(); right++) {
            counts[s.charAt(right) - 'A']++;
            maxCount = Math.max(maxCount, counts[s.charAt(right) - 'A']);
            if ((right - left + 1) - maxCount > k) {
                counts[s.charAt(left) - 'A']--;
                left++;
            }
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int longestRun(const string& s, int k) {
    int counts[26] = {0};
    int left = 0, maxCount = 0, best = 0;
    for (int right = 0; right < (int)s.size(); right++) {
        counts[s[right] - 'A']++;
        maxCount = max(maxCount, counts[s[right] - 'A']);
        if ((right - left + 1) - maxCount > k) {
            counts[s[left] - 'A']--;
            left++;
        }
        best = max(best, right - left + 1);
    }
    return best;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Recomputing maxCount by scanning all 26 counts each step — unnecessary; a stale-but-monotone maxCount still yields the correct answer.",
      "Shrinking the window in a while loop, which is not needed because the window only ever grows or slides by one.",
      "Mishandling k = 0, which should give the longest natural run.",
    ],
    edgeCases: [
      "k = 0 — longest existing uniform run.",
      "k ≥ n − 1 — the whole string.",
      "All identical letters — n.",
    ],
    whyItMatters:
      "The 'window length minus max frequency ≤ k' invariant is a subtle, much-loved sliding-window result that teaches when a window can slide without fully shrinking.",
    estimatedMinutes: 26,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 96 — pure_dsa · trees · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "validate-pricing-bst",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 5,
    pattern: "trees",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer", "data_engineer"],
    title: "Validate Pricing BST",
    framing:
      "A price-bucketing index is supposed to be a binary search tree so range lookups stay logarithmic. After a buggy insert, you must verify the structure still satisfies the BST ordering at every node.",
    statement:
      "Given the root of a binary tree, return true if it is a valid binary search tree: every node's left subtree holds strictly smaller values and its right subtree strictly larger, recursively.",
    inputFormat: "The root of a tree with n nodes (0 ≤ n ≤ 10^4), shown in level order with null for missing children.",
    outputFormat: "A boolean — true if the tree is a valid BST.",
    constraints: [
      "0 ≤ n ≤ 10,000",
      "All node values are distinct",
      "Strict inequality on both sides",
    ],
    examples: [
      {
        input: "root = [2, 1, 3]",
        output: "true",
        explanation: "1 < 2 < 3 holds for the whole tree.",
      },
      {
        input: "root = [5, 1, 4, null, null, 3, 6]",
        output: "false",
        explanation: "The right child 4 is less than the root 5, violating the BST rule.",
      },
    ],
    approach: [
      "A node is valid only within an open value range (low, high) inherited from its ancestors.",
      "Recurse left with an upper bound of the node's value, and right with a lower bound.",
      "A value outside its allowed range fails immediately.",
      "An in-order traversal that must be strictly increasing is an equivalent check.",
    ],
    solutionSteps: [
      "Define valid(node, low, high): null → true.",
      "Fail if node.val ≤ low or node.val ≥ high.",
      "Recurse valid(node.left, low, node.val) AND valid(node.right, node.val, high).",
      "Start with (−∞, +∞).",
      "O(n) time, O(h) stack.",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val: int = 0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def is_valid_bst(root: TreeNode | None) -> bool:
    def valid(node, low, high) -> bool:
        if node is None:
            return True
        if node.val <= low or node.val >= high:
            return False
        return valid(node.left, low, node.val) and valid(node.right, node.val, high)
    return valid(root, float("-inf"), float("inf"))
`,
      java: `public final class ValidatePricingBst {
    public static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
    }
    public static boolean isValidBST(TreeNode root) {
        return valid(root, Long.MIN_VALUE, Long.MAX_VALUE);
    }
    private static boolean valid(TreeNode node, long low, long high) {
        if (node == null) return true;
        if (node.val <= low || node.val >= high) return false;
        return valid(node.left, low, node.val) && valid(node.right, node.val, high);
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

bool valid(TreeNode* node, long low, long high) {
    if (!node) return true;
    if (node->val <= low || node->val >= high) return false;
    return valid(node->left, low, node->val) && valid(node->right, node->val, high);
}

bool isValidBST(TreeNode* root) {
    return valid(root, LONG_MIN, LONG_MAX);
}
`,
    },
    complexity: { time: "O(n)", space: "O(h)" },
    pitfalls: [
      "Only comparing a node with its immediate children instead of the inherited range — a deep violator slips through.",
      "Using int bounds that overflow at INT_MIN/INT_MAX node values; widen to long or use nullable bounds.",
      "Allowing equality when the BST requires strict inequality.",
    ],
    edgeCases: [
      "Empty tree — valid.",
      "Single node — valid.",
      "A grandchild that violates an ancestor's bound.",
    ],
    whyItMatters:
      "Carrying a valid range down the recursion is a core tree technique, and the in-order-monotonic equivalence is a frequent follow-up that tests deeper understanding.",
    estimatedMinutes: 24,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 97 — pure_dsa · graphs · medium · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "clone-service-topology",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 5,
    pattern: "graphs",
    difficulty: "medium",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "backend_engineer", "devops_sre"],
    title: "Clone Service Topology",
    framing:
      "A staging environment needs a deep copy of the production service dependency graph so chaos tests cannot touch the live nodes. Given a reference to one node in a connected undirected graph, return a deep clone of the whole graph.",
    statement:
      "Given a node in a connected undirected graph where each node has an integer value and a list of neighbours, return a deep copy: new node objects with the same values and the same neighbour structure.",
    inputFormat: "A start node; the graph has up to n nodes (0 ≤ n ≤ 100) with unique values 1..n, given as an adjacency list for description.",
    outputFormat: "The cloned graph's start node (described via its adjacency list).",
    constraints: [
      "0 ≤ n ≤ 100; node values are unique",
      "The graph is connected and undirected",
      "No self-loops or repeated edges",
    ],
    examples: [
      {
        input: "adjacency = {1: [2, 4], 2: [1, 3], 3: [2, 4], 4: [1, 3]}, start = 1",
        output: "{1: [2, 4], 2: [1, 3], 3: [2, 4], 4: [1, 3]}",
        explanation: "A 4-cycle is cloned into brand-new nodes with identical connections.",
      },
      {
        input: "adjacency = {1: []}, start = 1",
        output: "{1: []}",
        explanation: "A single isolated node clones to one new node with no neighbours.",
      },
    ],
    approach: [
      "Traverse the graph (BFS or DFS) starting from the given node.",
      "Maintain a map from original node to its clone to avoid infinite loops on cycles.",
      "Create a clone the first time a node is seen, then wire up neighbours.",
      "Return the clone of the start node.",
    ],
    solutionSteps: [
      "If start is null, return null.",
      "Create clone(start) and put it in a map old→new.",
      "DFS/BFS: for each neighbour, create its clone if absent and append it to the current clone's neighbour list.",
      "Return the start node's clone.",
      "O(V + E) time and space.",
    ],
    code: {
      python: `class Node:
    def __init__(self, val: int = 0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []

def clone_graph(start: "Node | None") -> "Node | None":
    if start is None:
        return None
    clones: dict[Node, Node] = {}
    def dfs(node: Node) -> Node:
        if node in clones:
            return clones[node]
        copy = Node(node.val)
        clones[node] = copy
        for nb in node.neighbors:
            copy.neighbors.append(dfs(nb))
        return copy
    return dfs(start)
`,
      java: `import java.util.*;

public final class CloneServiceTopology {
    public static class Node {
        int val;
        List<Node> neighbors;
        Node(int val) { this.val = val; this.neighbors = new ArrayList<>(); }
    }
    public static Node cloneGraph(Node start) {
        if (start == null) return null;
        Map<Node, Node> clones = new HashMap<>();
        return dfs(start, clones);
    }
    private static Node dfs(Node node, Map<Node, Node> clones) {
        if (clones.containsKey(node)) return clones.get(node);
        Node copy = new Node(node.val);
        clones.put(node, copy);
        for (Node nb : node.neighbors) copy.neighbors.add(dfs(nb, clones));
        return copy;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

struct Node {
    int val;
    vector<Node*> neighbors;
    Node(int v) : val(v) {}
};

Node* dfs(Node* node, unordered_map<Node*, Node*>& clones) {
    auto it = clones.find(node);
    if (it != clones.end()) return it->second;
    Node* copy = new Node(node->val);
    clones[node] = copy;
    for (Node* nb : node->neighbors) copy->neighbors.push_back(dfs(nb, clones));
    return copy;
}

Node* cloneGraph(Node* start) {
    if (!start) return nullptr;
    unordered_map<Node*, Node*> clones;
    return dfs(start, clones);
}
`,
    },
    complexity: { time: "O(V + E)", space: "O(V)" },
    pitfalls: [
      "Looping forever on cycles by not memoising clones before recursing into neighbours.",
      "Copying neighbour references from the original graph, leaking live nodes into the clone.",
      "Registering the clone in the map after recursing, which reintroduces the infinite loop.",
    ],
    edgeCases: [
      "Null start — null clone.",
      "Single node with no neighbours.",
      "Dense graph where every node connects to every other.",
    ],
    whyItMatters:
      "Cloning with an original→copy map is the universal pattern for deep-copying any graph or object with shared references and cycles, from serialization to immutable snapshots.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 98 — pure_dsa · dp_1d · medium · devops_sre
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "deploy-stage-min-cost",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 5,
    pattern: "dp_1d",
    difficulty: "medium",
    primaryRole: "devops_sre",
    roles: ["devops_sre", "backend_engineer", "software_engineer"],
    title: "Deploy Stage Min Cost",
    framing:
      "A deploy pipeline is a ladder of stages, each with a flake-retry cost. From a stage you may advance one or two stages at a time. You may start at stage 0 or stage 1, and you finish once you step past the last stage. Minimise total cost.",
    statement:
      "Given an array cost where cost[i] is the cost of stepping on stage i, you may climb one or two stages per move and start from index 0 or 1. Return the minimum cost to climb past the top (reaching index n).",
    inputFormat: "An array cost of length n (2 ≤ n ≤ 10^5), values in [0, 999].",
    outputFormat: "A single integer — the minimum total cost to reach the top.",
    constraints: [
      "2 ≤ n ≤ 100,000",
      "You may begin at index 0 or 1",
      "The goal index is n (past the last stage)",
    ],
    examples: [
      {
        input: "cost = [10, 15, 20]",
        output: "15",
        explanation: "Start at index 1 (cost 15), then step two to reach the top.",
      },
      {
        input: "cost = [1, 100, 1, 1, 1, 100, 1, 1, 100, 1]",
        output: "6",
        explanation: "Hop across the cheap stages, skipping the two 100-cost stages.",
      },
    ],
    approach: [
      "Let dp[i] be the minimum cost to reach stage i.",
      "Reaching i costs cost[i] plus the cheaper of arriving from i-1 or i-2.",
      "The goal is index n, reachable from n-1 or n-2 at no extra step cost.",
      "Only the last two values are needed, so two rolling scalars suffice.",
    ],
    solutionSteps: [
      "Initialise prev2 = 0, prev1 = 0 (cost to reach indices 0 and 1 is zero — you may start there).",
      "For i from 2 to n: cur = min(prev1 + cost[i-1], prev2 + cost[i-2]).",
      "Shift prev2 = prev1, prev1 = cur.",
      "Return prev1, the cost to reach index n.",
      "O(n) time, O(1) space.",
    ],
    code: {
      python: `def min_cost_climb(cost: list[int]) -> int:
    prev2 = prev1 = 0
    n = len(cost)
    for i in range(2, n + 1):
        cur = min(prev1 + cost[i - 1], prev2 + cost[i - 2])
        prev2, prev1 = prev1, cur
    return prev1
`,
      java: `public final class DeployStageMinCost {
    public static int minCostClimb(int[] cost) {
        int prev2 = 0, prev1 = 0, n = cost.length;
        for (int i = 2; i <= n; i++) {
            int cur = Math.min(prev1 + cost[i - 1], prev2 + cost[i - 2]);
            prev2 = prev1;
            prev1 = cur;
        }
        return prev1;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int minCostClimb(const vector<int>& cost) {
    int prev2 = 0, prev1 = 0, n = cost.size();
    for (int i = 2; i <= n; i++) {
        int cur = min(prev1 + cost[i - 1], prev2 + cost[i - 2]);
        prev2 = prev1;
        prev1 = cur;
    }
    return prev1;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Targeting index n-1 instead of n (past the top), which overcounts a final step.",
      "Adding cost[i] when reaching the goal index n, where no stage is stepped on.",
      "Forgetting that starting at index 0 or 1 is free.",
    ],
    edgeCases: [
      "Two stages — pick the cheaper start.",
      "All equal costs.",
      "Zero-cost stages.",
    ],
    whyItMatters:
      "Min-cost-climbing-stairs is the cleanest introduction to 1-D DP with the 'choose the cheaper predecessor' recurrence and the O(1) rolling-variable space trick.",
    estimatedMinutes: 22,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 99 — ai_applied · dp_1d · medium · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "tokenizer-vocab-segment",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 5,
    pattern: "dp_1d",
    difficulty: "medium",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "backend_engineer", "software_engineer"],
    title: "Tokenizer Vocab Segment",
    framing:
      "A subword tokenizer must decide whether an input string can be split end-to-end into pieces that all belong to its vocabulary, with no leftover characters. The classic algorithm underneath is word break.",
    statement:
      "Given a string s and a vocabulary of strings, return true if s can be segmented into a sequence of one or more vocabulary words (each word may be reused).",
    inputFormat: "A string s of length n (1 ≤ n ≤ 300) and a vocab list of up to 1000 words, each up to length 20.",
    outputFormat: "A boolean — true if s is fully segmentable.",
    constraints: [
      "1 ≤ n ≤ 300",
      "Words may be reused any number of times",
      "Lowercase ASCII letters",
    ],
    examples: [
      {
        input: 's = "applepenapple", vocab = ["apple", "pen"]',
        output: "true",
        explanation: "\"apple\" + \"pen\" + \"apple\" covers the whole string.",
      },
      {
        input: 's = "catsandog", vocab = ["cats", "dog", "sand", "and", "cat"]',
        output: "false",
        explanation: "No segmentation consumes the trailing \"og\".",
      },
    ],
    approach: [
      "Let dp[i] mean the prefix s[0:i] is fully segmentable.",
      "dp[0] is true (the empty prefix).",
      "dp[i] is true if some j < i has dp[j] true and s[j:i] is in the vocabulary.",
      "Put the vocabulary in a hash set for O(1) lookups.",
    ],
    solutionSteps: [
      "Build a set from vocab; allocate dp of size n+1 with dp[0] = true.",
      "For i from 1 to n, scan j from 0 to i-1.",
      "If dp[j] and s[j:i] is in the set, mark dp[i] true and break.",
      "Return dp[n].",
      "O(n²) substrings × O(L) hashing.",
    ],
    code: {
      python: `def word_break(s: str, vocab: list[str]) -> bool:
    words = set(vocab)
    n = len(s)
    dp = [False] * (n + 1)
    dp[0] = True
    for i in range(1, n + 1):
        for j in range(i):
            if dp[j] and s[j:i] in words:
                dp[i] = True
                break
    return dp[n]
`,
      java: `import java.util.*;

public final class TokenizerVocabSegment {
    public static boolean wordBreak(String s, List<String> vocab) {
        Set<String> words = new HashSet<>(vocab);
        int n = s.length();
        boolean[] dp = new boolean[n + 1];
        dp[0] = true;
        for (int i = 1; i <= n; i++) {
            for (int j = 0; j < i; j++) {
                if (dp[j] && words.contains(s.substring(j, i))) {
                    dp[i] = true;
                    break;
                }
            }
        }
        return dp[n];
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

bool wordBreak(const string& s, const vector<string>& vocab) {
    unordered_set<string> words(vocab.begin(), vocab.end());
    int n = s.size();
    vector<bool> dp(n + 1, false);
    dp[0] = true;
    for (int i = 1; i <= n; i++) {
        for (int j = 0; j < i; j++) {
            if (dp[j] && words.count(s.substr(j, i - j))) {
                dp[i] = true;
                break;
            }
        }
    }
    return dp[n];
}
`,
    },
    complexity: { time: "O(n² · L)", space: "O(n)" },
    pitfalls: [
      "Greedily taking the longest matching prefix, which can strand the suffix.",
      "Forgetting dp[0] = true, the empty-prefix base case.",
      "Re-scanning the whole vocab list per substring instead of a hash set.",
    ],
    edgeCases: [
      "Single-character words.",
      "A vocabulary that cannot cover the tail.",
      "s itself being a single vocabulary word.",
    ],
    whyItMatters:
      "Word break is the prototypical 'can this prefix be built' DP, directly mirroring subword tokenization, and it sets up the harder enumerate-all-segmentations follow-up.",
    estimatedMinutes: 26,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 100 — indian_domain · intervals · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "upi-mandate-interval-conflict",
    version: 1,
    status: "pending_review",
    bucket: "indian_domain",
    batchNo: 5,
    pattern: "intervals",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer", "data_engineer"],
    title: "UPI Mandate Interval Conflict",
    framing:
      "A UPI autopay system registers recurring e-mandates, each active over a [start, end] day range. Two mandates on the same account must never have overlapping active windows. Given an account's mandates, detect whether any two overlap.",
    statement:
      "Given a list of intervals [start, end] (inclusive), return true if any two intervals overlap, and false if they are all pairwise disjoint.",
    inputFormat: "An array intervals of length n (0 ≤ n ≤ 10^5), each [start, end] with start ≤ end, values in [0, 10^9].",
    outputFormat: "A boolean — true if any two intervals overlap.",
    constraints: [
      "0 ≤ n ≤ 100,000",
      "Each interval has start ≤ end and is inclusive",
      "Touching at a shared endpoint counts as overlap",
    ],
    examples: [
      {
        input: "intervals = [[1, 3], [2, 4]]",
        output: "true",
        explanation: "[1,3] and [2,4] share days 2 and 3.",
      },
      {
        input: "intervals = [[1, 2], [3, 4]]",
        output: "false",
        explanation: "The windows are disjoint with a gap between day 2 and day 3.",
      },
    ],
    approach: [
      "Sort the intervals by start time.",
      "Walk through adjacent pairs in sorted order.",
      "An overlap exists if the current interval's start is ≤ the previous interval's end.",
      "Sorting dominates the cost at O(n log n).",
    ],
    solutionSteps: [
      "If fewer than two intervals, return false.",
      "Sort intervals by start.",
      "Track prevEnd = intervals[0].end; for each subsequent interval, if start ≤ prevEnd return true.",
      "Otherwise update prevEnd = max(prevEnd, end).",
      "Return false after the scan.",
    ],
    code: {
      python: `def has_conflict(intervals: list[list[int]]) -> bool:
    if len(intervals) < 2:
        return False
    intervals.sort(key=lambda iv: iv[0])
    prev_end = intervals[0][1]
    for start, end in intervals[1:]:
        if start <= prev_end:
            return True
        prev_end = max(prev_end, end)
    return False
`,
      java: `import java.util.*;

public final class UpiMandateIntervalConflict {
    public static boolean hasConflict(int[][] intervals) {
        if (intervals.length < 2) return false;
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        int prevEnd = intervals[0][1];
        for (int i = 1; i < intervals.length; i++) {
            if (intervals[i][0] <= prevEnd) return true;
            prevEnd = Math.max(prevEnd, intervals[i][1]);
        }
        return false;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

bool hasConflict(vector<vector<int>> intervals) {
    if (intervals.size() < 2) return false;
    sort(intervals.begin(), intervals.end(),
         [](const vector<int>& a, const vector<int>& b) { return a[0] < b[0]; });
    int prevEnd = intervals[0][1];
    for (size_t i = 1; i < intervals.size(); i++) {
        if (intervals[i][0] <= prevEnd) return true;
        prevEnd = max(prevEnd, intervals[i][1]);
    }
    return false;
}
`,
    },
    complexity: { time: "O(n log n)", space: "O(1) beyond sorting" },
    pitfalls: [
      "Comparing all pairs in O(n²) instead of sorting first.",
      "Using strict < when inclusive endpoints mean touching counts as overlap.",
      "Comparing only against the immediately previous end without taking the running max, which fails for nested intervals.",
    ],
    edgeCases: [
      "Zero or one interval — no conflict.",
      "Intervals sharing exactly one endpoint — overlap.",
      "A long interval fully containing several short ones.",
    ],
    whyItMatters:
      "Sort-by-start then compare-adjacent is the foundational interval technique behind meeting-room scheduling, calendar conflict checks, and merge-intervals.",
    estimatedMinutes: 22,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 101 — pure_dsa · dp_2d · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "feature-budget-knapsack",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 5,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer", "software_engineer"],
    title: "Feature Budget Knapsack",
    framing:
      "A release planning tool picks which features to ship in a sprint. Each feature has an engineering cost and a projected value, and the sprint has a fixed capacity. Each feature is shipped at most once. Maximise total value within the capacity.",
    statement:
      "Given arrays cost and value of equal length and a capacity, choose a subset of items (each at most once) whose total cost does not exceed capacity, maximising total value. Return that maximum value.",
    inputFormat: "Arrays cost and value of length m (1 ≤ m ≤ 200), positive ints, and capacity (0 ≤ capacity ≤ 10^4).",
    outputFormat: "A single integer — the maximum achievable value.",
    constraints: [
      "Each item may be used at most once (0/1)",
      "1 ≤ m ≤ 200; 0 ≤ capacity ≤ 10,000",
      "Total cost must not exceed capacity",
    ],
    examples: [
      {
        input: "cost = [1, 3, 4, 5], value = [1, 4, 5, 7], capacity = 7",
        output: "9",
        explanation: "Pick items with cost 3 and 4 (total 7) for value 4 + 5 = 9, beating any other within-budget subset.",
      },
      {
        input: "cost = [2], value = [5], capacity = 1",
        output: "0",
        explanation: "The only item exceeds the capacity, so nothing is shipped.",
      },
    ],
    approach: [
      "Classic 0/1 knapsack: dp[c] is the best value achievable with capacity c.",
      "Process items one at a time, iterating capacity from high to low.",
      "The descending capacity loop ensures each item is used at most once.",
      "dp[capacity] holds the answer after all items.",
    ],
    solutionSteps: [
      "Allocate dp of size capacity+1, all zeros.",
      "For each item i, for c from capacity down to cost[i]: dp[c] = max(dp[c], dp[c - cost[i]] + value[i]).",
      "The reverse capacity sweep prevents reusing item i within the same pass.",
      "Return dp[capacity].",
      "O(m · capacity) time, O(capacity) space.",
    ],
    code: {
      python: `def knapsack(cost: list[int], value: list[int], capacity: int) -> int:
    dp = [0] * (capacity + 1)
    for i in range(len(cost)):
        for c in range(capacity, cost[i] - 1, -1):
            dp[c] = max(dp[c], dp[c - cost[i]] + value[i])
    return dp[capacity]
`,
      java: `public final class FeatureBudgetKnapsack {
    public static int knapsack(int[] cost, int[] value, int capacity) {
        int[] dp = new int[capacity + 1];
        for (int i = 0; i < cost.length; i++) {
            for (int c = capacity; c >= cost[i]; c--) {
                dp[c] = Math.max(dp[c], dp[c - cost[i]] + value[i]);
            }
        }
        return dp[capacity];
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int knapsack(const vector<int>& cost, const vector<int>& value, int capacity) {
    vector<int> dp(capacity + 1, 0);
    for (size_t i = 0; i < cost.size(); i++) {
        for (int c = capacity; c >= cost[i]; c--) {
            dp[c] = max(dp[c], dp[c - cost[i]] + value[i]);
        }
    }
    return dp[capacity];
}
`,
    },
    complexity: { time: "O(m · capacity)", space: "O(capacity)" },
    pitfalls: [
      "Iterating capacity ascending, which lets a single item be picked multiple times (that is the unbounded variant).",
      "Greedily picking the best value-to-cost ratio — optimal only for fractional knapsack, not 0/1.",
      "Indexing dp[c - cost[i]] when c < cost[i]; the loop lower bound prevents it.",
    ],
    edgeCases: [
      "Capacity 0 — value 0.",
      "Every item heavier than capacity — value 0.",
      "All items fit — total value.",
    ],
    whyItMatters:
      "0/1 knapsack is the archetype of subset-optimisation DP, and the reverse-iteration 1-D space optimisation is a hallmark of strong dynamic-programming intuition.",
    estimatedMinutes: 34,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 102 — ai_applied · heap_priority_queue · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "streaming-token-rate-median",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 5,
    pattern: "heap_priority_queue",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "data_engineer", "backend_engineer"],
    title: "Streaming Token Rate Median",
    framing:
      "An inference server reports tokens-per-second after each request and must surface the running median throughput on a live dashboard. Values arrive one at a time and the median is queried after every insertion.",
    statement:
      "Process a stream of integers; after each insertion, report the median of all values seen so far. For an even count, the median is the average of the two middle values. Return the list of medians.",
    inputFormat: "An array stream of length n (1 ≤ n ≤ 10^5), values in [0, 10^6].",
    outputFormat: "An array of n medians (floating point), one after each insertion.",
    constraints: [
      "Median queried after every insertion",
      "Even counts average the two middle elements",
      "Aim for O(log n) per insertion",
    ],
    examples: [
      {
        input: "stream = [1, 2, 3]",
        output: "[1.0, 1.5, 2.0]",
        explanation: "After 1 → 1.0; after 1,2 → 1.5; after 1,2,3 → 2.0.",
      },
      {
        input: "stream = [5, 5]",
        output: "[5.0, 5.0]",
        explanation: "Duplicate values keep the median at 5.",
      },
    ],
    approach: [
      "Keep two heaps: a max-heap for the lower half and a min-heap for the upper half.",
      "Insert into the appropriate heap, then rebalance so their sizes differ by at most one.",
      "If sizes are equal, the median averages the two heap tops; otherwise it is the larger heap's top.",
      "Each insertion is O(log n); each median query is O(1).",
    ],
    solutionSteps: [
      "Maintain lower (max-heap) and upper (min-heap).",
      "Push the new value into lower, then move lower's top into upper to keep ordering.",
      "If upper is larger than lower, move upper's top back to lower.",
      "Median = lower.top if lower has the extra element, else average of both tops.",
      "Append the median after each insertion.",
    ],
    code: {
      python: `import heapq

def running_medians(stream: list[int]) -> list[float]:
    lower: list[int] = []   # max-heap via negation
    upper: list[int] = []   # min-heap
    out: list[float] = []
    for x in stream:
        heapq.heappush(lower, -x)
        heapq.heappush(upper, -heapq.heappop(lower))
        if len(upper) > len(lower):
            heapq.heappush(lower, -heapq.heappop(upper))
        if len(lower) > len(upper):
            out.append(float(-lower[0]))
        else:
            out.append((-lower[0] + upper[0]) / 2.0)
    return out
`,
      java: `import java.util.*;

public final class StreamingTokenRateMedian {
    public static double[] runningMedians(int[] stream) {
        PriorityQueue<Integer> lower = new PriorityQueue<>(Collections.reverseOrder());
        PriorityQueue<Integer> upper = new PriorityQueue<>();
        double[] out = new double[stream.length];
        for (int i = 0; i < stream.length; i++) {
            lower.offer(stream[i]);
            upper.offer(lower.poll());
            if (upper.size() > lower.size()) lower.offer(upper.poll());
            out[i] = (lower.size() > upper.size())
                ? lower.peek()
                : (lower.peek() + upper.peek()) / 2.0;
        }
        return out;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<double> runningMedians(const vector<int>& stream) {
    priority_queue<int> lower;                              // max-heap
    priority_queue<int, vector<int>, greater<int>> upper;  // min-heap
    vector<double> out;
    out.reserve(stream.size());
    for (int x : stream) {
        lower.push(x);
        upper.push(lower.top()); lower.pop();
        if (upper.size() > lower.size()) { lower.push(upper.top()); upper.pop(); }
        if (lower.size() > upper.size()) out.push_back(lower.top());
        else out.push_back((lower.top() + upper.top()) / 2.0);
    }
    return out;
}
`,
    },
    complexity: { time: "O(n log n) total", space: "O(n)" },
    pitfalls: [
      "Re-sorting all values after each insertion — O(n² log n) overall.",
      "Letting the two heaps drift out of balance, breaking the median invariant.",
      "Integer division when averaging the two middle values.",
    ],
    edgeCases: [
      "Single value — it is the median.",
      "All equal values.",
      "Strictly increasing or decreasing streams.",
    ],
    whyItMatters:
      "The two-heaps 'median of a stream' design is a classic systems-flavoured interview problem, modelling any running-percentile dashboard with logarithmic updates.",
    estimatedMinutes: 36,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 103 — pure_dsa · graphs · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "config-migration-ladder",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 5,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "devops_sre", "backend_engineer"],
    title: "Config Migration Ladder",
    framing:
      "A config schema must migrate from one fingerprint to another one character at a time, and every intermediate fingerprint has to be a known-valid schema in the registry. Find the shortest such migration chain.",
    statement:
      "Given a beginWord, an endWord, and a wordList of equal-length lowercase strings, return the number of words in the shortest transformation sequence from beginWord to endWord, where each step changes exactly one character and every intermediate word exists in wordList. Return 0 if no sequence exists. The sequence length counts both endpoints.",
    inputFormat:
      "Two strings beginWord and endWord, and an array wordList. All words have the same length L (1 ≤ L ≤ 10) and consist of lowercase letters. 1 ≤ wordList.length ≤ 5000.",
    outputFormat: "An integer — the length of the shortest sequence, or 0 if none.",
    constraints: [
      "All words have identical length",
      "beginWord need not be in wordList; endWord must be for a valid answer",
      "Each step differs by exactly one character",
    ],
    examples: [
      {
        input:
          'begin = "hit", end = "cog", wordList = ["hot","dot","dog","lot","log","cog"]',
        output: "5",
        explanation: "hit → hot → dot → dog → cog uses 5 words.",
      },
      {
        input:
          'begin = "hit", end = "cog", wordList = ["hot","dot","dog","lot","log"]',
        output: "0",
        explanation: "endWord 'cog' is not in the list, so no sequence reaches it.",
      },
    ],
    approach: [
      "Model each word as a node; an edge joins two words differing by one character.",
      "The shortest sequence is the shortest path on an unweighted graph — use BFS.",
      "Generate neighbours on the fly by trying each of 26 letters at each position.",
      "Track visited words to avoid revisiting, and expand level by level.",
    ],
    solutionSteps: [
      "Put wordList in a hash set for O(1) membership; if endWord is absent, return 0.",
      "Seed a BFS queue with (beginWord, 1) and mark beginWord visited.",
      "Pop a word; if it equals endWord, return its step count.",
      "For each position, substitute every letter a–z to form candidate neighbours.",
      "Enqueue unvisited candidates that are in the set with step + 1; return 0 if the queue drains.",
    ],
    code: {
      python: `from collections import deque

def ladder_length(begin: str, end: str, word_list: list[str]) -> int:
    words = set(word_list)
    if end not in words:
        return 0
    queue = deque([(begin, 1)])
    visited = {begin}
    while queue:
        word, steps = queue.popleft()
        if word == end:
            return steps
        for i in range(len(word)):
            for c in "abcdefghijklmnopqrstuvwxyz":
                nxt = word[:i] + c + word[i + 1:]
                if nxt in words and nxt not in visited:
                    visited.add(nxt)
                    queue.append((nxt, steps + 1))
    return 0
`,
      java: `import java.util.*;

public final class ConfigMigrationLadder {
    public static int ladderLength(String begin, String end, List<String> wordList) {
        Set<String> words = new HashSet<>(wordList);
        if (!words.contains(end)) return 0;
        Queue<String> queue = new ArrayDeque<>();
        queue.add(begin);
        Set<String> visited = new HashSet<>();
        visited.add(begin);
        int steps = 1;
        while (!queue.isEmpty()) {
            int size = queue.size();
            for (int s = 0; s < size; s++) {
                String word = queue.poll();
                if (word.equals(end)) return steps;
                char[] chars = word.toCharArray();
                for (int i = 0; i < chars.length; i++) {
                    char original = chars[i];
                    for (char c = 'a'; c <= 'z'; c++) {
                        chars[i] = c;
                        String nxt = new String(chars);
                        if (words.contains(nxt) && !visited.contains(nxt)) {
                            visited.add(nxt);
                            queue.add(nxt);
                        }
                    }
                    chars[i] = original;
                }
            }
            steps++;
        }
        return 0;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int ladderLength(string begin, string end, vector<string>& wordList) {
    unordered_set<string> words(wordList.begin(), wordList.end());
    if (!words.count(end)) return 0;
    queue<string> q;
    q.push(begin);
    unordered_set<string> visited{begin};
    int steps = 1;
    while (!q.empty()) {
        int size = q.size();
        for (int s = 0; s < size; s++) {
            string word = q.front(); q.pop();
            if (word == end) return steps;
            for (int i = 0; i < (int)word.size(); i++) {
                char original = word[i];
                for (char c = 'a'; c <= 'z'; c++) {
                    word[i] = c;
                    if (words.count(word) && !visited.count(word)) {
                        visited.insert(word);
                        q.push(word);
                    }
                }
                word[i] = original;
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
      "Using DFS — it finds a path, not the shortest one.",
      "Forgetting to mark a word visited when enqueuing, causing exponential revisits.",
      "Returning 0 without first checking that endWord is in the list.",
    ],
    edgeCases: [
      "endWord absent from the list — return 0.",
      "beginWord one step from endWord — return 2.",
      "beginWord equal to endWord but absent from list — still reachable in 1 step.",
    ],
    whyItMatters:
      "Word-ladder BFS is the canonical 'shortest path on an implicit graph' problem, the same shape as state-space search in migrations, puzzles, and reachability checks.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 104 — pure_dsa · backtracking · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "invoice-combination-sum",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 5,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "full_stack_engineer", "software_engineer"],
    title: "Invoice Combination Sum",
    framing:
      "An invoice must be settled exactly using a fixed catalogue of line-item amounts, and each amount can be billed any number of times. Enumerate every distinct combination of line items that sums to the invoice total.",
    statement:
      "Given an array of distinct positive integers candidates and a target integer, return all unique combinations of candidates whose elements sum to target. The same candidate may be chosen an unlimited number of times. Two combinations are unique if their multiset of chosen numbers differs.",
    inputFormat:
      "An array candidates of distinct positive integers (1 ≤ candidates.length ≤ 30, 1 ≤ value ≤ 200) and a positive integer target (1 ≤ target ≤ 500).",
    outputFormat: "A list of combinations; each combination is a list of integers summing to target.",
    constraints: [
      "Candidates are distinct positive integers",
      "Each candidate may be reused unlimited times",
      "No duplicate combinations in the output",
    ],
    examples: [
      {
        input: "candidates = [2, 3, 6, 7], target = 7",
        output: "[[2, 2, 3], [7]]",
        explanation: "2+2+3 = 7 and 7 = 7 are the only combinations.",
      },
      {
        input: "candidates = [2, 4], target = 5",
        output: "[]",
        explanation: "No multiple of 2 and 4 sums to the odd total 5.",
      },
    ],
    approach: [
      "Sort candidates so we can prune once a candidate exceeds the remaining target.",
      "Backtrack: at each step include the current candidate (staying on the same index to allow reuse) or advance.",
      "Pass a start index so combinations are generated in non-decreasing order, preventing permutational duplicates.",
      "When the remaining target hits zero, record a copy of the current path.",
    ],
    solutionSteps: [
      "Sort candidates ascending.",
      "Recurse with (start, remaining); on remaining == 0 append a copy of path.",
      "Loop i from start; if candidates[i] > remaining, break (sorted prune).",
      "Append candidates[i], recurse with the same i (reuse allowed) and remaining − candidates[i].",
      "Pop to backtrack and continue with the next candidate.",
    ],
    code: {
      python: `def combination_sum(candidates: list[int], target: int) -> list[list[int]]:
    candidates.sort()
    result: list[list[int]] = []
    path: list[int] = []

    def backtrack(start: int, remaining: int) -> None:
        if remaining == 0:
            result.append(path.copy())
            return
        for i in range(start, len(candidates)):
            if candidates[i] > remaining:
                break
            path.append(candidates[i])
            backtrack(i, remaining - candidates[i])
            path.pop()

    backtrack(0, target)
    return result
`,
      java: `import java.util.*;

public final class InvoiceCombinationSum {
    public static List<List<Integer>> combinationSum(int[] candidates, int target) {
        Arrays.sort(candidates);
        List<List<Integer>> result = new ArrayList<>();
        backtrack(candidates, 0, target, new ArrayDeque<>(), result);
        return result;
    }

    private static void backtrack(int[] candidates, int start, int remaining,
                                  Deque<Integer> path, List<List<Integer>> result) {
        if (remaining == 0) {
            result.add(new ArrayList<>(path));
            return;
        }
        for (int i = start; i < candidates.length; i++) {
            if (candidates[i] > remaining) break;
            path.addLast(candidates[i]);
            backtrack(candidates, i, remaining - candidates[i], path, result);
            path.removeLast();
        }
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

void backtrack(const vector<int>& candidates, int start, int remaining,
               vector<int>& path, vector<vector<int>>& result) {
    if (remaining == 0) {
        result.push_back(path);
        return;
    }
    for (int i = start; i < (int)candidates.size(); i++) {
        if (candidates[i] > remaining) break;
        path.push_back(candidates[i]);
        backtrack(candidates, i, remaining - candidates[i], path, result);
        path.pop_back();
    }
}

vector<vector<int>> combinationSum(vector<int>& candidates, int target) {
    sort(candidates.begin(), candidates.end());
    vector<vector<int>> result;
    vector<int> path;
    backtrack(candidates, 0, target, path, result);
    return result;
}
`,
    },
    complexity: { time: "O(N^(T/M))", space: "O(T/M) recursion depth" },
    pitfalls: [
      "Advancing the start index past i, which forbids reusing a candidate.",
      "Allowing start to go backwards, producing permutational duplicates like [2,3] and [3,2].",
      "Appending the live path reference instead of a copy, so later mutations corrupt results.",
    ],
    edgeCases: [
      "No combination sums to target — return an empty list.",
      "A single candidate equals target — one one-element combination.",
      "target smaller than the smallest candidate — empty result.",
    ],
    whyItMatters:
      "Combination-sum backtracking with an index guard is the template for unbounded-knapsack enumeration, coin-change variants, and any 'list all ways to make X' question.",
    estimatedMinutes: 33,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 105 — pure_dsa · tries · hard · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "wildcard-keyword-lookup",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 5,
    pattern: "tries",
    difficulty: "hard",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "platform_engineer", "software_engineer"],
    title: "Wildcard Keyword Lookup",
    framing:
      "A content-moderation service stores a blocklist of keywords and must answer membership queries where a '.' matches any single character. Design the structure so both adds and wildcard lookups stay fast.",
    statement:
      "Design a data structure that supports two operations: addWord(word) inserts a lowercase word, and search(word) returns true if any stored word matches the query. In a query, a '.' may match any single letter; all other characters must match exactly.",
    inputFormat:
      "A sequence of operations. addWord receives a lowercase word (1 ≤ length ≤ 25). search receives a pattern of lowercase letters and '.' (1 ≤ length ≤ 25). Up to 10^4 calls total.",
    outputFormat: "For each search call, a boolean.",
    constraints: [
      "Stored words and queries contain only lowercase letters; queries may also contain '.'",
      "'.' matches exactly one character — not zero, not many",
      "Lengths must match for a word to be a candidate",
    ],
    examples: [
      {
        input: 'addWord("bad"); addWord("dad"); search("b.d")',
        output: "true",
        explanation: "'b.d' matches 'bad' (the dot matches 'a').",
      },
      {
        input: 'addWord("bad"); search("b..")',
        output: "true",
        explanation: "Both dots match, so 'b..' matches the 3-letter word 'bad'.",
      },
    ],
    approach: [
      "Store words in a trie: one node per character, a flag marking word ends.",
      "addWord walks or creates child nodes for each character, then sets the end flag.",
      "search recurses through the trie; a literal character follows one child.",
      "A '.' branches into every existing child, succeeding if any branch matches the rest.",
    ],
    solutionSteps: [
      "Define a trie node with a children map and an is_word flag.",
      "addWord descends from the root, creating missing children, then marks the terminal node.",
      "search runs a DFS with the current node and query index.",
      "At a literal character, descend into that child if present; otherwise fail.",
      "At a '.', try every child recursively; at the end of the query, return the node's is_word flag.",
    ],
    code: {
      python: `class TrieNode:
    __slots__ = ("children", "is_word")

    def __init__(self) -> None:
        self.children: dict[str, "TrieNode"] = {}
        self.is_word = False


class WordDictionary:
    def __init__(self) -> None:
        self.root = TrieNode()

    def add_word(self, word: str) -> None:
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
        node.is_word = True

    def search(self, word: str) -> bool:
        def dfs(node: "TrieNode", i: int) -> bool:
            if i == len(word):
                return node.is_word
            ch = word[i]
            if ch == ".":
                return any(dfs(child, i + 1) for child in node.children.values())
            nxt = node.children.get(ch)
            return dfs(nxt, i + 1) if nxt else False

        return dfs(self.root, 0)
`,
      java: `import java.util.*;

public final class WildcardKeywordLookup {
    private static final class Node {
        final Map<Character, Node> children = new HashMap<>();
        boolean isWord = false;
    }

    private final Node root = new Node();

    public void addWord(String word) {
        Node node = root;
        for (char ch : word.toCharArray()) {
            node = node.children.computeIfAbsent(ch, k -> new Node());
        }
        node.isWord = true;
    }

    public boolean search(String word) {
        return dfs(root, word, 0);
    }

    private boolean dfs(Node node, String word, int i) {
        if (i == word.length()) return node.isWord;
        char ch = word.charAt(i);
        if (ch == '.') {
            for (Node child : node.children.values()) {
                if (dfs(child, word, i + 1)) return true;
            }
            return false;
        }
        Node nxt = node.children.get(ch);
        return nxt != null && dfs(nxt, word, i + 1);
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

class WordDictionary {
    struct Node {
        unordered_map<char, Node*> children;
        bool isWord = false;
    };
    Node* root;

    bool dfs(Node* node, const string& word, int i) {
        if (i == (int)word.size()) return node->isWord;
        char ch = word[i];
        if (ch == '.') {
            for (auto& kv : node->children) {
                if (dfs(kv.second, word, i + 1)) return true;
            }
            return false;
        }
        auto it = node->children.find(ch);
        return it != node->children.end() && dfs(it->second, word, i + 1);
    }

public:
    WordDictionary() : root(new Node()) {}

    void addWord(string word) {
        Node* node = root;
        for (char ch : word) {
            if (!node->children.count(ch)) node->children[ch] = new Node();
            node = node->children[ch];
        }
        node->isWord = true;
    }

    bool search(string word) {
        return dfs(root, word, 0);
    }
};
`,
    },
    complexity: { time: "O(L) add, O(26^d · L) search worst case", space: "O(total characters)" },
    pitfalls: [
      "Treating '.' as matching zero or multiple characters instead of exactly one.",
      "Returning true at the query end without checking the is_word flag, matching prefixes.",
      "Iterating a fixed alphabet of children that were never created, wasting work.",
    ],
    edgeCases: [
      "Query all dots — matches any stored word of that exact length.",
      "Query longer or shorter than every stored word — false.",
      "search before any addWord — false.",
    ],
    whyItMatters:
      "Trie search with wildcard backtracking is the foundation of autocomplete, prefix routing, and pattern-matching dictionaries used across search and moderation systems.",
    estimatedMinutes: 34,
  },
];
