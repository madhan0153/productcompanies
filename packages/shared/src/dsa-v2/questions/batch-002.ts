// DSA v2 — Batch 002 (20 questions).
//
// Fills pattern gaps (linked_list, trees, tries, backtracking, dp_1d,
// greedy, math_geometry, bit_manipulation) and role gaps (frontend,
// devops_sre, security). Composition: 17 pure_dsa + 2 ai_applied + 1
// indian_domain. Difficulty mix: 8 easy / 8 medium / 4 hard.
//
// All status = "pending_review" — admin must approve each before live.

import type { DsaV2Question } from "../types";

export const BATCH_002: readonly DsaV2Question[] = [
  // ──────────────────────────────────────────────────────────────────────
  // 11 — pure_dsa · linked_list · easy · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "reverse-event-log",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 2,
    pattern: "linked_list",
    difficulty: "easy",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer", "data_engineer"],
    title: "Reverse Event Log",
    framing:
      "A debugger replays an in-memory event log to the developer. The log is stored as a singly linked list with the oldest event at head, but the developer wants the most recent first. Reverse the list in place — the debugger has tight memory and cannot allocate a second copy.",
    statement:
      "Given the head of a singly linked list, return the head of the same list reversed in place. The list nodes must be reused (no new node allocation).",
    inputFormat: "The head pointer of a singly linked list with 0 ≤ n ≤ 10^5 nodes. Each node stores an integer value.",
    outputFormat: "The head pointer of the reversed list.",
    constraints: [
      "0 ≤ n ≤ 100,000",
      "Must reverse in place — no new node allocation",
      "O(1) extra space target",
    ],
    examples: [
      {
        input: "head → 1 → 2 → 3 → 4 → null",
        output: "head → 4 → 3 → 2 → 1 → null",
        explanation: "Each next pointer is flipped to point backward.",
      },
      {
        input: "head → null",
        output: "head → null",
        explanation: "Empty list stays empty.",
      },
    ],
    approach: [
      "Walk the list with three pointers: prev (initially null), curr (initially head), and next (a scratch variable).",
      "At each step: save curr.next into next; rewrite curr.next to point at prev; slide prev := curr; slide curr := next.",
      "When curr becomes null, prev holds the new head.",
    ],
    solutionSteps: [
      "Initialise prev = null, curr = head.",
      "While curr is not null:",
      "  next = curr.next.",
      "  curr.next = prev.",
      "  prev = curr.",
      "  curr = next.",
      "Return prev as the new head.",
      "O(n) time, O(1) extra space.",
    ],
    code: {
      python: `class ListNode:
    def __init__(self, val: int = 0, nxt: "ListNode | None" = None):
        self.val = val
        self.next = nxt

def reverse_list(head: ListNode | None) -> ListNode | None:
    prev, curr = None, head
    while curr is not None:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev
`,
      java: `public final class ReverseEventLog {
    public static class Node {
        int val;
        Node next;
        Node(int v) { this.val = v; }
    }
    public static Node reverse(Node head) {
        Node prev = null, curr = head;
        while (curr != null) {
            Node next = curr.next;
            curr.next = prev;
            prev = curr;
            curr = next;
        }
        return prev;
    }
}
`,
      cpp: `struct ListNode {
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
      "Forgetting to cache curr.next before rewriting it — lose the rest of the list.",
      "Doing recursion — O(n) call stack risks overflow at n = 10^5 in Java/C++.",
      "Returning head instead of prev — head still points at the original first node, which is now the tail.",
    ],
    edgeCases: [
      "Empty list (head is null) — return null.",
      "Single node — reverses to itself.",
      "Two nodes — verify both pointers are flipped, not just one.",
    ],
    whyItMatters:
      "In-place linked-list reversal is the foundational pointer-manipulation exercise. Every interview that involves rewiring nodes (merge sort, LRU eviction, palindrome check) starts from this primitive.",
    estimatedMinutes: 15,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 12 — pure_dsa · arrays_hashing · easy · frontend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "duplicate-tab-detector",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 2,
    pattern: "arrays_hashing",
    difficulty: "easy",
    primaryRole: "frontend_engineer",
    roles: ["frontend_engineer", "full_stack_engineer", "software_engineer"],
    title: "Duplicate Tab Detector",
    framing:
      "A browser extension warns the user when the same URL is opened in two or more tabs. Given the list of currently open tab URLs, return true if any URL appears more than once.",
    statement:
      "Given a list of strings urls, return true if any string appears at least twice; otherwise return false.",
    inputFormat: "An integer n (0 ≤ n ≤ 10^5) and a list of n URL strings (each up to 2048 chars).",
    outputFormat: "A single boolean.",
    constraints: [
      "0 ≤ n ≤ 100,000",
      "URLs are compared as exact strings (no normalisation)",
      "Empty list returns false (vacuously no duplicates)",
    ],
    examples: [
      {
        input: "[\"a.com\", \"b.com\", \"a.com\"]",
        output: "true",
        explanation: "a.com appears twice.",
      },
      {
        input: "[\"a.com\", \"b.com\", \"c.com\"]",
        output: "false",
        explanation: "All distinct.",
      },
    ],
    approach: [
      "Walk the list once, maintaining a hash set of URLs seen so far.",
      "If the current URL is already in the set, return true immediately.",
      "Otherwise insert and continue.",
      "If the loop ends, return false.",
    ],
    solutionSteps: [
      "Initialise an empty hash set seen.",
      "For each url in urls:",
      "  if url in seen: return true.",
      "  add url to seen.",
      "Return false.",
      "O(n) time, O(n) space.",
    ],
    code: {
      python: `def has_duplicate_tab(urls: list[str]) -> bool:
    seen: set[str] = set()
    for url in urls:
        if url in seen:
            return True
        seen.add(url)
    return False
`,
      java: `import java.util.*;

public final class DuplicateTabDetector {
    public static boolean hasDuplicate(List<String> urls) {
        HashSet<String> seen = new HashSet<>(urls.size() * 2);
        for (String url : urls) {
            if (!seen.add(url)) return true;
        }
        return false;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

bool hasDuplicateTab(const vector<string>& urls) {
    unordered_set<string> seen;
    seen.reserve(urls.size() * 2);
    for (const auto& u : urls) {
        if (!seen.insert(u).second) return true;
    }
    return false;
}
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Sorting then scanning for adjacent equals — O(n log n) is unnecessarily slow.",
      "Allocating an array of booleans indexed by hash — hash collisions break correctness.",
      "Lowercasing URLs — the spec says exact string match.",
    ],
    edgeCases: [
      "Empty list — false.",
      "Single URL — false.",
      "All identical URLs — true on the second iteration.",
    ],
    whyItMatters:
      "The contains-duplicate primitive is the first hashing question every candidate gets. Solving it instinctively in one pass with early-exit is the bar.",
    estimatedMinutes: 10,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 13 — pure_dsa · two_pointers · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "transfer-pair-equals-target",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 2,
    pattern: "two_pointers",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer", "data_engineer"],
    title: "Transfer Pair Equals Target",
    framing:
      "A treasury service receives a sorted list of pending transfer amounts. Compliance needs to flag any pair whose total exactly equals a watched amount. Find one such pair using only O(1) extra memory.",
    statement:
      "Given an array of integers amounts sorted in ascending order and an integer target, return a pair of indices (i, j) with i < j such that amounts[i] + amounts[j] == target. If no such pair exists, return (−1, −1). If multiple pairs exist, return any one.",
    inputFormat: "An integer n (2 ≤ n ≤ 10^5), the sorted array amounts (each in [-10^9, 10^9]), and an integer target.",
    outputFormat: "A pair of indices (i, j) or (-1, -1).",
    constraints: [
      "2 ≤ n ≤ 100,000",
      "Array is sorted ascending",
      "O(1) extra space — no hash maps for this one",
    ],
    examples: [
      {
        input: "amounts = [1, 3, 4, 6, 9], target = 7",
        output: "(0, 3)  or  (1, 2)",
        explanation: "1+6=7 and 3+4=7. Either pair is acceptable.",
      },
      {
        input: "amounts = [1, 2, 3], target = 100",
        output: "(-1, -1)",
        explanation: "No pair sums to 100.",
      },
    ],
    approach: [
      "Sorted array unlocks two pointers. Start l = 0 and r = n − 1.",
      "Compute s = amounts[l] + amounts[r].",
      "If s == target: return (l, r).",
      "If s < target: increment l (we need a larger sum, and only the left index can grow).",
      "If s > target: decrement r (we need a smaller sum).",
      "Stop when l >= r and return (−1, −1).",
    ],
    solutionSteps: [
      "Initialise l = 0, r = n - 1.",
      "While l < r:",
      "  s = amounts[l] + amounts[r].",
      "  if s == target: return (l, r).",
      "  if s < target: l += 1.",
      "  else: r -= 1.",
      "Return (-1, -1).",
      "O(n) time, O(1) space.",
    ],
    code: {
      python: `def find_pair(amounts: list[int], target: int) -> tuple[int, int]:
    l, r = 0, len(amounts) - 1
    while l < r:
        s = amounts[l] + amounts[r]
        if s == target:
            return (l, r)
        if s < target:
            l += 1
        else:
            r -= 1
    return (-1, -1)
`,
      java: `public final class TransferPairEqualsTarget {
    public static int[] findPair(int[] amounts, long target) {
        int l = 0, r = amounts.length - 1;
        while (l < r) {
            long s = (long) amounts[l] + amounts[r];
            if (s == target) return new int[]{l, r};
            if (s < target) l++;
            else r--;
        }
        return new int[]{-1, -1};
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

pair<int, int> findPair(const vector<int>& amounts, long long target) {
    int l = 0, r = (int)amounts.size() - 1;
    while (l < r) {
        long long s = (long long)amounts[l] + amounts[r];
        if (s == target) return {l, r};
        if (s < target) ++l;
        else            --r;
    }
    return {-1, -1};
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Using a hash map even though the array is sorted — O(n) extra space when O(1) is achievable.",
      "Forgetting that amounts can be negative — the two-pointer invariant still holds, but signed comparisons must be carefully kept.",
      "Returning (l, l) when target equals 2× a single element — the spec requires i < j.",
    ],
    edgeCases: [
      "n = 2 — exactly one pair to test.",
      "All elements equal and target is 2× that value — return (0, 1).",
      "Target smaller than amounts[0] + amounts[1] — no pair possible, return (-1, -1) quickly.",
      "Negative amounts (refunds) — algorithm still correct.",
    ],
    whyItMatters:
      "Two-sum on a sorted array is the canonical 'pre-sorted unlocks two pointers' lesson. Every aggregation, ad-hoc analytics, and reconciliation task that pre-sorts by key uses this exact trick.",
    estimatedMinutes: 15,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 14 — pure_dsa · greedy · easy · devops_sre
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "alert-cluster-coalesce",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 2,
    pattern: "greedy",
    difficulty: "easy",
    primaryRole: "devops_sre",
    roles: ["devops_sre", "backend_engineer", "platform_engineer"],
    title: "Alert Cluster Coalesce",
    framing:
      "An on-call dashboard receives a flood of alerts during an incident. Each alert has a timestamp (in seconds). To stop paging fatigue, the dashboard groups any alerts within w seconds of the previous one into the same cluster. Count how many clusters the dashboard will show.",
    statement:
      "Given a sorted ascending array of alert timestamps timestamps and an integer w, return the number of clusters produced when two consecutive alerts merge into the same cluster iff their gap is at most w.",
    inputFormat: "An integer n (0 ≤ n ≤ 10^5), the sorted timestamps array (each in [0, 10^9]), and an integer w (0 ≤ w ≤ 10^9).",
    outputFormat: "A single integer — the number of clusters.",
    constraints: [
      "0 ≤ n ≤ 100,000",
      "Array is sorted ascending",
      "Two same-second alerts are always in the same cluster (gap = 0 ≤ w)",
      "Empty array → 0 clusters",
    ],
    examples: [
      {
        input: "timestamps = [0, 1, 2, 10, 11, 100], w = 3",
        output: "3",
        explanation: "[0,1,2] one cluster (gaps 1,1). [10,11] another. [100] another.",
      },
      {
        input: "timestamps = [], w = 5",
        output: "0",
        explanation: "Empty → no clusters.",
      },
    ],
    approach: [
      "Walk the array once. Each time the gap to the previous alert exceeds w, a new cluster starts.",
      "Maintain a counter starting at 1 (for the first alert) and increment on every cluster break.",
      "Handle the empty-array case up front.",
    ],
    solutionSteps: [
      "If n == 0: return 0.",
      "Initialise clusters = 1.",
      "For i from 1 to n - 1:",
      "  if timestamps[i] - timestamps[i - 1] > w: clusters += 1.",
      "Return clusters.",
      "O(n) time, O(1) space.",
    ],
    code: {
      python: `def cluster_alerts(timestamps: list[int], w: int) -> int:
    if not timestamps:
        return 0
    clusters = 1
    for i in range(1, len(timestamps)):
        if timestamps[i] - timestamps[i - 1] > w:
            clusters += 1
    return clusters
`,
      java: `public final class AlertClusterCoalesce {
    public static int clusters(long[] timestamps, long w) {
        if (timestamps.length == 0) return 0;
        int clusters = 1;
        for (int i = 1; i < timestamps.length; i++) {
            if (timestamps[i] - timestamps[i - 1] > w) clusters++;
        }
        return clusters;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int clusterAlerts(const vector<long long>& ts, long long w) {
    if (ts.empty()) return 0;
    int clusters = 1;
    for (size_t i = 1; i < ts.size(); ++i) {
        if (ts[i] - ts[i - 1] > w) clusters++;
    }
    return clusters;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Starting clusters = 0 — the first alert is always its own cluster.",
      "Using >= instead of > for the gap check — coalesces alerts that should split.",
      "Re-sorting the array — wastes time when the spec guarantees sorted input.",
    ],
    edgeCases: [
      "All alerts at the same timestamp — one cluster.",
      "Each pair separated by exactly w — coalesce (gap == w ≤ w).",
      "Each pair separated by w + 1 — every alert is its own cluster.",
    ],
    whyItMatters:
      "Cluster-by-gap is the simplest greedy and shows up everywhere in observability — alert dedupe, session reconstruction, click stream segmentation. Solve in a single scan, no auxiliary structures.",
    estimatedMinutes: 10,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 15 — pure_dsa · math_geometry · easy · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "billing-cycle-day-count",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 2,
    pattern: "math_geometry",
    difficulty: "easy",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer", "full_stack_engineer"],
    title: "Billing Cycle Day Count",
    framing:
      "A subscription service prorates the first invoice based on how many days the customer was active in their first billing cycle. Given the start and end day as ISO date strings (same year), return the inclusive number of days between them.",
    statement:
      "Given two date strings start and end formatted YYYY-MM-DD, both within the same year and with start <= end, return the number of days from start through end inclusive.",
    inputFormat: "Two strings start and end, each YYYY-MM-DD. Both within the same year (2000 ≤ year ≤ 2100). start ≤ end.",
    outputFormat: "A single integer — inclusive day count.",
    constraints: [
      "Both dates are in the same calendar year",
      "Year is between 2000 and 2100",
      "Account for leap years (year divisible by 4 except century-not-400)",
      "Inclusive count: start = end returns 1",
    ],
    examples: [
      {
        input: "start = \"2026-03-01\", end = \"2026-03-05\"",
        output: "5",
        explanation: "Mar 1, 2, 3, 4, 5 — inclusive count of 5.",
      },
      {
        input: "start = \"2024-02-28\", end = \"2024-03-01\"",
        output: "3",
        explanation: "2024 is a leap year. Days: Feb 28, Feb 29, Mar 1 → 3.",
      },
    ],
    approach: [
      "Convert each date to a day-of-year ordinal using a fixed array of days-per-month.",
      "If the year is a leap year and the date is on or after March 1, add 1 for the February 29 day.",
      "Return end_ordinal - start_ordinal + 1.",
    ],
    solutionSteps: [
      "Define DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31].",
      "Parse each date into year, month, day integers.",
      "ordinal(month, day, isLeap) = sum of DAYS_IN_MONTH[0..month-1] + day + (1 if isLeap and month > 2 else 0).",
      "isLeap(year) = year % 4 == 0 and (year % 100 != 0 or year % 400 == 0).",
      "Return ordinal(end) - ordinal(start) + 1.",
      "O(1) time and space (months are bounded).",
    ],
    code: {
      python: `def days_inclusive(start: str, end: str) -> int:
    days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    def parse(s: str) -> tuple[int, int, int]:
        y, m, d = s.split("-")
        return int(y), int(m), int(d)
    def is_leap(y: int) -> bool:
        return y % 4 == 0 and (y % 100 != 0 or y % 400 == 0)
    def ordinal(y: int, m: int, d: int) -> int:
        n = sum(days_in_month[:m - 1]) + d
        if is_leap(y) and m > 2:
            n += 1
        return n
    sy, sm, sd = parse(start)
    ey, em, ed = parse(end)
    return ordinal(ey, em, ed) - ordinal(sy, sm, sd) + 1
`,
      java: `public final class BillingCycleDayCount {
    private static final int[] DAYS = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    private static boolean isLeap(int y) {
        return y % 4 == 0 && (y % 100 != 0 || y % 400 == 0);
    }
    private static int ordinal(int y, int m, int d) {
        int n = d;
        for (int i = 0; i < m - 1; i++) n += DAYS[i];
        if (isLeap(y) && m > 2) n++;
        return n;
    }
    public static int daysInclusive(String start, String end) {
        String[] a = start.split("-"), b = end.split("-");
        int sy = Integer.parseInt(a[0]), sm = Integer.parseInt(a[1]), sd = Integer.parseInt(a[2]);
        int ey = Integer.parseInt(b[0]), em = Integer.parseInt(b[1]), ed = Integer.parseInt(b[2]);
        return ordinal(ey, em, ed) - ordinal(sy, sm, sd) + 1;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

static const int DAYS_IN_MONTH[12] = {31,28,31,30,31,30,31,31,30,31,30,31};

static bool isLeap(int y) {
    return y % 4 == 0 && (y % 100 != 0 || y % 400 == 0);
}

static int ordinal(int y, int m, int d) {
    int n = d;
    for (int i = 0; i < m - 1; ++i) n += DAYS_IN_MONTH[i];
    if (isLeap(y) && m > 2) ++n;
    return n;
}

int daysInclusive(const string& start, const string& end) {
    int sy, sm, sd, ey, em, ed;
    sscanf(start.c_str(), "%d-%d-%d", &sy, &sm, &sd);
    sscanf(end.c_str(),   "%d-%d-%d", &ey, &em, &ed);
    return ordinal(ey, em, ed) - ordinal(sy, sm, sd) + 1;
}
`,
    },
    complexity: { time: "O(1)", space: "O(1)" },
    pitfalls: [
      "Skipping the leap year check for Feb 29 — under-counts February ranges in leap years.",
      "Returning end - start (exclusive) instead of inclusive — off-by-one.",
      "Using a date library that throws on Feb 29 of a non-leap year without validating — the spec guarantees valid input but defensive parsers may differ.",
    ],
    edgeCases: [
      "start == end → 1.",
      "Range crosses Feb 29 in a leap year — verify +1.",
      "Range fully in January — leap-year branch never fires.",
      "Range covers entire year — answer is 365 or 366.",
    ],
    whyItMatters:
      "Date arithmetic is the unglamorous backbone of every billing, scheduling, and analytics system. Knowing how to compute calendar ordinals without a heavyweight library is what differentiates a senior generalist.",
    estimatedMinutes: 15,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 16 — pure_dsa · bit_manipulation · easy · security_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "permission-bitmap-toggle",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 2,
    pattern: "bit_manipulation",
    difficulty: "easy",
    primaryRole: "security_engineer",
    roles: ["security_engineer", "backend_engineer", "platform_engineer"],
    title: "Permission Bitmap Toggle",
    framing:
      "An access-control service represents a user's permissions as a 32-bit integer (each bit is one capability). The admin UI lets a reviewer toggle one permission at a time. Implement the toggle and read operations on the bitmap.",
    statement:
      "Implement two functions: toggle(bitmap, i) flips the i-th bit (0-indexed) of a non-negative 32-bit integer and returns the new bitmap. has(bitmap, i) returns whether the i-th bit is currently set.",
    inputFormat: "Integer bitmap (0 ≤ bitmap ≤ 2^31 - 1) and integer i (0 ≤ i ≤ 30).",
    outputFormat: "toggle returns the updated bitmap; has returns a boolean.",
    constraints: [
      "0 ≤ bitmap ≤ 2^31 - 1 (signed 32-bit positive range)",
      "0 ≤ i ≤ 30 (we stay within signed 32-bit, no sign-bit weirdness)",
      "O(1) time per operation",
    ],
    examples: [
      {
        input: "toggle(0b1010, 0)",
        output: "0b1011",
        explanation: "Bit 0 was 0; flipped to 1. Result: 11.",
      },
      {
        input: "toggle(0b1011, 0)",
        output: "0b1010",
        explanation: "Bit 0 was 1; flipped to 0. Result: 10.",
      },
      {
        input: "has(0b1010, 1)",
        output: "true",
        explanation: "Bit 1 is set.",
      },
    ],
    approach: [
      "Toggle flips a bit via XOR with a single-bit mask: bitmap XOR (1 << i).",
      "Has reads a bit via AND with the same mask: (bitmap AND (1 << i)) != 0.",
      "Both operations are O(1) and entirely in registers — no branches.",
    ],
    solutionSteps: [
      "For toggle(bitmap, i): return bitmap ^ (1 << i).",
      "For has(bitmap, i): return (bitmap & (1 << i)) != 0.",
      "Both run in O(1) with no allocation.",
    ],
    code: {
      python: `def toggle(bitmap: int, i: int) -> int:
    return bitmap ^ (1 << i)

def has(bitmap: int, i: int) -> bool:
    return (bitmap & (1 << i)) != 0
`,
      java: `public final class PermissionBitmap {
    public static int toggle(int bitmap, int i) {
        return bitmap ^ (1 << i);
    }
    public static boolean has(int bitmap, int i) {
        return (bitmap & (1 << i)) != 0;
    }
}
`,
      cpp: `#include <cstdint>

uint32_t toggle(uint32_t bitmap, int i) {
    return bitmap ^ (1u << i);
}

bool has(uint32_t bitmap, int i) {
    return (bitmap & (1u << i)) != 0;
}
`,
    },
    complexity: { time: "O(1)", space: "O(1)" },
    pitfalls: [
      "Using OR for toggle — that only ever sets bits, never clears them.",
      "Using shift on a signed int with i = 31 in Java/C++ — undefined behaviour at the sign bit. The spec caps i at 30 to avoid this.",
      "Returning the mask instead of the updated bitmap.",
    ],
    edgeCases: [
      "i = 0 — toggle the lowest bit.",
      "bitmap = 0 — toggle sets the bit; has returns false before toggle.",
      "Same toggle twice — restores the original bitmap.",
    ],
    whyItMatters:
      "Bitmaps are the most efficient permission representation for high-throughput auth checks. Every IAM, feature flag, and capability system uses bit tests in their hot path. Senior security engineers must reach for these without thinking.",
    estimatedMinutes: 10,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 17 — pure_dsa · trees · easy · mobile_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "nav-drawer-depth",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 2,
    pattern: "trees",
    difficulty: "easy",
    primaryRole: "mobile_engineer",
    roles: ["mobile_engineer", "frontend_engineer", "full_stack_engineer"],
    title: "Navigation Drawer Depth",
    framing:
      "A mobile app's navigation drawer is a tree of menu items. To pick the right animation duration, the renderer needs the maximum nesting depth of the tree (depth of root is 1).",
    statement:
      "Given the root of an n-ary tree, return its maximum depth — the number of nodes on the longest path from root to any leaf. The root alone counts as depth 1; an empty tree has depth 0.",
    inputFormat: "Root node of an n-ary tree with 0 ≤ n ≤ 10^4 nodes. Each node has an integer value and a list of zero or more children.",
    outputFormat: "A single integer — the maximum depth.",
    constraints: [
      "0 ≤ n ≤ 10,000",
      "Tree is well-formed (no cycles, every non-root has exactly one parent)",
      "Recursion depth may approach 10^4 in pathological cases",
    ],
    examples: [
      {
        input: "Root with two children, each with one child of their own",
        output: "3",
        explanation: "root → child → grandchild = 3 nodes.",
      },
      {
        input: "Empty tree (root = null)",
        output: "0",
        explanation: "No nodes means depth zero.",
      },
    ],
    approach: [
      "Recursive DFS: depth(node) = 1 + max(depth(child)) over all children, or 1 if leaf, or 0 if node is null.",
      "Iterative alternative: BFS by levels, counting how many level transitions occur. Equivalent answer.",
      "For very deep skewed trees in languages with shallow stacks, prefer iterative.",
    ],
    solutionSteps: [
      "If node is null: return 0.",
      "If node has no children: return 1.",
      "Otherwise: return 1 + max(depth(child)) over node.children.",
      "Visit each node exactly once → O(n) time. Stack/queue space O(h) where h is the tree height.",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val: int = 0, children: list["TreeNode"] | None = None):
        self.val = val
        self.children = children or []

def max_depth(root: TreeNode | None) -> int:
    if root is None:
        return 0
    if not root.children:
        return 1
    return 1 + max(max_depth(c) for c in root.children)
`,
      java: `import java.util.*;

public final class NavDrawerDepth {
    public static class Node {
        int val;
        List<Node> children;
        Node(int v) { this.val = v; this.children = new ArrayList<>(); }
    }
    public static int maxDepth(Node root) {
        if (root == null) return 0;
        if (root.children.isEmpty()) return 1;
        int best = 0;
        for (Node c : root.children) {
            best = Math.max(best, maxDepth(c));
        }
        return 1 + best;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

struct TreeNode {
    int val;
    vector<TreeNode*> children;
};

int maxDepth(TreeNode* root) {
    if (!root) return 0;
    if (root->children.empty()) return 1;
    int best = 0;
    for (auto c : root->children) {
        best = max(best, maxDepth(c));
    }
    return 1 + best;
}
`,
    },
    complexity: { time: "O(n)", space: "O(h) recursion, where h is height" },
    pitfalls: [
      "Returning 0 when the node has no children — should return 1 (the node itself counts).",
      "Pre-incrementing depth before checking the null base case — off-by-one for empty trees.",
      "Using sum instead of max — sum gives total nodes, not depth.",
    ],
    edgeCases: [
      "Single node — depth 1.",
      "Linear skew (each node has exactly one child) — depth equals node count.",
      "Wide shallow tree (root with many leaves) — depth 2.",
    ],
    whyItMatters:
      "Tree-depth recursion is the simplest place to demonstrate clean DFS reasoning. Every mobile navigation, JSON traversal, or DOM tree problem inherits this pattern.",
    estimatedMinutes: 15,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 18 — pure_dsa · sliding_window · easy · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "moving-average-clicks",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 2,
    pattern: "sliding_window",
    difficulty: "easy",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer", "devops_sre"],
    title: "Moving Average Clicks",
    framing:
      "An ad analytics dashboard displays a smoothed click-through count using a fixed-size moving average. Each minute it appends the latest count; it shows the rolling mean of the last w minutes (or fewer, if not enough data has been collected yet).",
    statement:
      "Implement a class MovingAverage(window_size) with one method push(value) that returns the average of at most the last window_size values pushed so far. Until window_size pushes have been made, return the average of everything pushed.",
    inputFormat: "Constructor takes window_size (1 ≤ w ≤ 10^4). push receives an integer value (0 ≤ value ≤ 10^6) and may be called up to 10^5 times.",
    outputFormat: "Each push returns a double — the current rolling mean.",
    constraints: [
      "1 ≤ window_size ≤ 10,000",
      "Up to 100,000 pushes",
      "O(1) amortised per push — recomputing the mean from scratch every time is too slow",
    ],
    examples: [
      {
        input: "ma = MovingAverage(3); ma.push(1); ma.push(2); ma.push(3); ma.push(4)",
        output: "1.0, 1.5, 2.0, 3.0",
        explanation: "After 1: mean(1)=1. After 2: mean(1,2)=1.5. After 3: mean(1,2,3)=2. After 4: window slides → mean(2,3,4)=3.",
      },
    ],
    approach: [
      "Maintain a circular buffer of size w and a running sum.",
      "Each push: if the buffer is full, subtract the value being evicted from the sum; otherwise grow the live count.",
      "Add the new value to both the buffer (at the current write head) and the sum.",
      "Return sum divided by live count.",
    ],
    solutionSteps: [
      "Constructor stores: window_size, a buffer of size window_size, a write index = 0, a live count = 0, a running sum = 0.",
      "On push(value):",
      "  if live count == window_size: subtract buffer[write index] from sum.",
      "  buffer[write index] = value; sum += value.",
      "  write index = (write index + 1) mod window_size.",
      "  live count = min(live count + 1, window_size).",
      "  Return sum / live count.",
      "O(1) time per push, O(w) memory.",
    ],
    code: {
      python: `class MovingAverage:
    def __init__(self, window_size: int):
        self.w = window_size
        self.buf = [0] * window_size
        self.idx = 0
        self.live = 0
        self.s = 0

    def push(self, value: int) -> float:
        if self.live == self.w:
            self.s -= self.buf[self.idx]
        self.buf[self.idx] = value
        self.s += value
        self.idx = (self.idx + 1) % self.w
        self.live = min(self.live + 1, self.w)
        return self.s / self.live
`,
      java: `public final class MovingAverage {
    private final int w;
    private final int[] buf;
    private int idx = 0, live = 0;
    private long sum = 0;

    public MovingAverage(int windowSize) {
        this.w = windowSize;
        this.buf = new int[windowSize];
    }
    public double push(int value) {
        if (live == w) sum -= buf[idx];
        buf[idx] = value;
        sum += value;
        idx = (idx + 1) % w;
        if (live < w) live++;
        return (double) sum / live;
    }
}
`,
      cpp: `#include <vector>

class MovingAverage {
public:
    explicit MovingAverage(int windowSize)
        : w_(windowSize), buf_(windowSize, 0) {}

    double push(int value) {
        if (live_ == w_) sum_ -= buf_[idx_];
        buf_[idx_] = value;
        sum_ += value;
        idx_ = (idx_ + 1) % w_;
        if (live_ < w_) live_++;
        return static_cast<double>(sum_) / live_;
    }

private:
    int w_, idx_ = 0, live_ = 0;
    long long sum_ = 0;
    std::vector<int> buf_;
};
`,
    },
    complexity: { time: "O(1) per push", space: "O(w)" },
    pitfalls: [
      "Re-summing the entire buffer each push — O(w) per call. Push count × w = 10^9 ops at the max input. Don't.",
      "Forgetting integer overflow on the running sum — use long for sum.",
      "Off-by-one on the eviction condition — only subtract when the buffer is already full.",
    ],
    edgeCases: [
      "Window size 1 — every push returns the value itself.",
      "Push count smaller than window_size — average over actual count, not window_size.",
      "All values equal — average equals that value.",
    ],
    whyItMatters:
      "Rolling aggregates are the simplest streaming primitive. Every analytics pipeline, anomaly detector, and SRE dashboard runs variants of this. The circular-buffer + running-sum combo is the canonical answer.",
    estimatedMinutes: 15,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 19 — pure_dsa · trees · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "comment-thread-flatten",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 2,
    pattern: "trees",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "full_stack_engineer", "frontend_engineer"],
    title: "Comment Thread Flatten",
    framing:
      "A discussion app stores comments as a tree (each comment has a list of reply comments). To render in chronological depth-first order, the server flattens the tree into a list where each comment is followed immediately by all its descendants, depth-first.",
    statement:
      "Given the root comment of a tree, return the list of comment IDs in pre-order (root first, then each child's subtree fully expanded before moving to the next sibling).",
    inputFormat: "Root node of a tree (root may be null). Each node has an integer id and a list of zero or more child nodes. 0 ≤ n ≤ 10^4 nodes total.",
    outputFormat: "A list of n integer IDs in pre-order. Empty list if root is null.",
    constraints: [
      "0 ≤ n ≤ 10,000",
      "Tree depth may approach 10^4 (skewed)",
      "Order: parent first, then each child's subtree (left to right)",
    ],
    examples: [
      {
        input: "Root(1) with children [Root(2) with children [Root(4)], Root(3)]",
        output: "[1, 2, 4, 3]",
        explanation: "Pre-order: 1, then subtree of 2 (which is 2, 4), then subtree of 3.",
      },
      {
        input: "null",
        output: "[]",
        explanation: "Empty tree → empty list.",
      },
    ],
    approach: [
      "Iterative DFS with an explicit stack. Recursive DFS works too but risks stack overflow on a 10^4-deep skewed tree.",
      "Push the root, then repeatedly pop a node, append its id to the output, and push its children in REVERSE order so they pop in left-to-right order next.",
    ],
    solutionSteps: [
      "If root is null: return [].",
      "Initialise stack = [root] and out = [].",
      "While stack is non-empty:",
      "  node = stack.pop().",
      "  Append node.id to out.",
      "  For each child in reversed(node.children): stack.push(child).",
      "Return out.",
      "O(n) time, O(n) worst-case stack space (skewed tree).",
    ],
    code: {
      python: `class CommentNode:
    def __init__(self, id: int, children: list["CommentNode"] | None = None):
        self.id = id
        self.children = children or []

def flatten(root: CommentNode | None) -> list[int]:
    if root is None:
        return []
    out: list[int] = []
    stack: list[CommentNode] = [root]
    while stack:
        node = stack.pop()
        out.append(node.id)
        for child in reversed(node.children):
            stack.append(child)
    return out
`,
      java: `import java.util.*;

public final class CommentThreadFlatten {
    public static class Node {
        int id;
        List<Node> children;
        Node(int id) { this.id = id; this.children = new ArrayList<>(); }
    }
    public static List<Integer> flatten(Node root) {
        List<Integer> out = new ArrayList<>();
        if (root == null) return out;
        Deque<Node> stack = new ArrayDeque<>();
        stack.push(root);
        while (!stack.isEmpty()) {
            Node node = stack.pop();
            out.add(node.id);
            for (int i = node.children.size() - 1; i >= 0; i--) {
                stack.push(node.children.get(i));
            }
        }
        return out;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

struct CommentNode {
    int id;
    vector<CommentNode*> children;
};

vector<int> flatten(CommentNode* root) {
    vector<int> out;
    if (!root) return out;
    vector<CommentNode*> stk{root};
    while (!stk.empty()) {
        CommentNode* node = stk.back();
        stk.pop_back();
        out.push_back(node->id);
        for (auto it = node->children.rbegin(); it != node->children.rend(); ++it) {
            stk.push_back(*it);
        }
    }
    return out;
}
`,
    },
    complexity: { time: "O(n)", space: "O(n) for stack + output" },
    pitfalls: [
      "Pushing children in their natural left-to-right order — produces right-to-left output.",
      "Using recursion on a 10^4-deep skewed tree in Java or C++ — stack overflow risk.",
      "Forgetting the empty-tree base case — null pointer dereference.",
    ],
    edgeCases: [
      "Single node — output is [root.id].",
      "Skewed left tree (each node has exactly one child) — output is the chain in order.",
      "Wide tree (root with many children, none with their own children) — output is root then all leaves left-to-right.",
    ],
    whyItMatters:
      "Iterative pre-order traversal is the safe answer to every 'render a tree' interview question. Backend engineers reach for it when laying out JSON, comment threads, file systems, and HTML.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 20 — pure_dsa · dp_1d · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "subscription-upgrade-min-cost",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 2,
    pattern: "dp_1d",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer", "full_stack_engineer"],
    title: "Subscription Upgrade Min Cost",
    framing:
      "A SaaS product lets a user upgrade from any tier to any higher tier in one or more hops. Each hop has a fixed cost given by an array steps where steps[i] is the cost of moving from tier i to tier i+1 (i.e. one step up). The user starts at tier 0 and wants to reach tier n. Find the minimum total cost, given they may also do 'two-step' jumps that cost the same as steps[i] (treating the skip as one transaction).",
    statement:
      "Given an integer array steps of length n where steps[i] is the cost of moving from tier i to tier i+1, return the minimum total cost to reach tier n starting from tier 0. At each tier i (0 ≤ i ≤ n − 1), the user may EITHER take one step (paying steps[i] and landing at i+1) OR take a two-step jump (paying steps[i] and landing at i+2, if i+2 ≤ n).",
    inputFormat: "An integer n (1 ≤ n ≤ 10^5) and the array steps of length n (0 ≤ steps[i] ≤ 10^4).",
    outputFormat: "A single integer — the minimum total cost to reach tier n.",
    constraints: [
      "1 ≤ n ≤ 100,000",
      "0 ≤ steps[i] ≤ 10,000",
      "Starting tier is 0; goal tier is n",
      "At tier n - 1 only a single step is possible (no i+2 jump beyond n)",
    ],
    examples: [
      {
        input: "steps = [10, 15, 20]",
        output: "25",
        explanation: "Tiers are 0,1,2,3. From tier 0 take the single step (steps[0]=10) to reach tier 1, then jump from tier 1 to tier 3 paying steps[1]=15. Total 10+15=25. Every other route costs more: all single steps = 10+15+20=45; jump 0→2 (10) then step 2→3 (20) = 30.",
      },
      {
        input: "steps = [1]",
        output: "1",
        explanation: "n=1, one step from tier 0 to tier 1.",
      },
    ],
    approach: [
      "Let dp[i] be the minimum cost to reach tier i. Goal: dp[n].",
      "Base: dp[0] = 0. dp[1] = steps[0] (must take the single step).",
      "Recurrence for i ≥ 2: dp[i] = min(dp[i-1] + steps[i-1], dp[i-2] + steps[i-2]).",
      "Two paths to land at tier i: a single step from i-1 (cost steps[i-1]) or a jump from i-2 (cost steps[i-2]).",
      "Space optimisation: only the last two dp values are needed → O(1) space.",
    ],
    solutionSteps: [
      "If n == 0: return 0.",
      "If n == 1: return steps[0].",
      "Initialise prev2 = 0, prev1 = steps[0].",
      "For i from 2 to n:",
      "  curr = min(prev1 + steps[i - 1], prev2 + steps[i - 2]).",
      "  prev2 = prev1; prev1 = curr.",
      "Return prev1.",
      "O(n) time, O(1) space.",
    ],
    code: {
      python: `def min_upgrade_cost(steps: list[int]) -> int:
    n = len(steps)
    if n == 0:
        return 0
    if n == 1:
        return steps[0]
    prev2, prev1 = 0, steps[0]
    for i in range(2, n + 1):
        curr = min(prev1 + steps[i - 1], prev2 + steps[i - 2])
        prev2, prev1 = prev1, curr
    return prev1
`,
      java: `public final class SubscriptionUpgradeMinCost {
    public static int minCost(int[] steps) {
        int n = steps.length;
        if (n == 0) return 0;
        if (n == 1) return steps[0];
        int prev2 = 0, prev1 = steps[0];
        for (int i = 2; i <= n; i++) {
            int curr = Math.min(prev1 + steps[i - 1], prev2 + steps[i - 2]);
            prev2 = prev1;
            prev1 = curr;
        }
        return prev1;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int minUpgradeCost(const vector<int>& steps) {
    int n = (int)steps.size();
    if (n == 0) return 0;
    if (n == 1) return steps[0];
    int prev2 = 0, prev1 = steps[0];
    for (int i = 2; i <= n; ++i) {
        int curr = min(prev1 + steps[i - 1], prev2 + steps[i - 2]);
        prev2 = prev1;
        prev1 = curr;
    }
    return prev1;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Allocating a full dp array of length n+1 — wastes memory at n = 10^5 when two scalars suffice.",
      "Recursing with memoization — Python's recursion limit and Java/C++ stack costs at depth 10^5 are unnecessary risks.",
      "Off-by-one between 'tiers' (0..n) and 'steps' (0..n-1) — many candidates index incorrectly.",
    ],
    edgeCases: [
      "n = 1 — only one tier to reach. Answer is steps[0].",
      "All steps equal — confirms the relation prev1 + steps == prev2 + steps for adjacent costs.",
      "First step very cheap, rest expensive — verify the algorithm still prefers single-step over jumps when it's cheaper.",
    ],
    whyItMatters:
      "1-D DP with a constant-size dependency is the most common interview DP pattern. House robber, climbing stairs, max product — once this shape clicks, half the DP corpus becomes formulaic.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 21 — pure_dsa · graphs · medium · security_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "iam-role-cycle-check",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 2,
    pattern: "graphs",
    difficulty: "medium",
    primaryRole: "security_engineer",
    roles: ["security_engineer", "platform_engineer", "backend_engineer"],
    title: "IAM Role Cycle Check",
    framing:
      "An identity service lets roles inherit permissions from other roles via `inherits` relationships. Before saving a new inheritance edge, the validator must reject any change that would create a cycle — otherwise privilege resolution loops forever.",
    statement:
      "Given an integer n (number of roles, 0..n−1) and a list of directed edges (a, b) meaning role a inherits from role b, return true if the resulting graph contains a cycle, false otherwise.",
    inputFormat: "Integer n (1 ≤ n ≤ 10^4) and m edges (0 ≤ m ≤ 5·10^4), each a pair (a, b) with 0 ≤ a, b < n.",
    outputFormat: "A single boolean.",
    constraints: [
      "1 ≤ n ≤ 10,000",
      "0 ≤ m ≤ 50,000",
      "Self-loops (a == a) count as cycles",
      "Multi-edges between the same pair count once",
    ],
    examples: [
      {
        input: "n = 3, edges = [(0,1), (1,2), (2,0)]",
        output: "true",
        explanation: "Triangle cycle 0→1→2→0.",
      },
      {
        input: "n = 3, edges = [(0,1), (1,2)]",
        output: "false",
        explanation: "Pure chain, no cycle.",
      },
    ],
    approach: [
      "Build the adjacency list and run a 3-colour DFS: white = unvisited, gray = in current DFS stack, black = finished.",
      "If DFS ever lands on a gray neighbour, the graph has a cycle.",
      "Alternative: Kahn's topo sort — if not all nodes get popped from the in-degree-zero queue, a cycle exists.",
    ],
    solutionSteps: [
      "Build adj : list of lists, indexed by role id.",
      "Allocate state array of size n, all white.",
      "For each node u in 0..n-1:",
      "  if state[u] == white and dfs(u) returns 'cycle': return true.",
      "Return false.",
      "dfs(u): set state[u] = gray. For each v in adj[u]: if state[v] == gray, return 'cycle'; if state[v] == white, recurse — propagate cycle if returned. Set state[u] = black at the end.",
      "Each edge visited once → O(n + m) time, O(n) space.",
    ],
    code: {
      python: `def has_cycle(n: int, edges: list[tuple[int, int]]) -> bool:
    adj: list[list[int]] = [[] for _ in range(n)]
    for a, b in edges:
        adj[a].append(b)
    WHITE, GRAY, BLACK = 0, 1, 2
    state = [WHITE] * n

    def dfs(u: int) -> bool:
        state[u] = GRAY
        for v in adj[u]:
            if state[v] == GRAY:
                return True
            if state[v] == WHITE and dfs(v):
                return True
        state[u] = BLACK
        return False

    for u in range(n):
        if state[u] == WHITE and dfs(u):
            return True
    return False
`,
      java: `import java.util.*;

public final class IamRoleCycleCheck {
    private static final int WHITE = 0, GRAY = 1, BLACK = 2;
    public static boolean hasCycle(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) adj.get(e[0]).add(e[1]);
        int[] state = new int[n];
        for (int u = 0; u < n; u++) {
            if (state[u] == WHITE && dfs(u, adj, state)) return true;
        }
        return false;
    }
    private static boolean dfs(int u, List<List<Integer>> adj, int[] state) {
        state[u] = GRAY;
        for (int v : adj.get(u)) {
            if (state[v] == GRAY) return true;
            if (state[v] == WHITE && dfs(v, adj, state)) return true;
        }
        state[u] = BLACK;
        return false;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

enum { WHITE = 0, GRAY = 1, BLACK = 2 };

bool dfs(int u, const vector<vector<int>>& adj, vector<int>& state) {
    state[u] = GRAY;
    for (int v : adj[u]) {
        if (state[v] == GRAY) return true;
        if (state[v] == WHITE && dfs(v, adj, state)) return true;
    }
    state[u] = BLACK;
    return false;
}

bool hasCycle(int n, const vector<pair<int, int>>& edges) {
    vector<vector<int>> adj(n);
    for (const auto& [a, b] : edges) adj[a].push_back(b);
    vector<int> state(n, WHITE);
    for (int u = 0; u < n; ++u) {
        if (state[u] == WHITE && dfs(u, adj, state)) return true;
    }
    return false;
}
`,
    },
    complexity: { time: "O(n + m)", space: "O(n + m)" },
    pitfalls: [
      "Using only a visited boolean (2 states) — can't distinguish 'currently in DFS stack' from 'finished', so cross-edges are misreported as cycles.",
      "Forgetting to mark BLACK on return — re-explores subtrees and turns O(V+E) into worst-case exponential.",
      "Recursion depth of 10^4 in Python may need sys.setrecursionlimit; in Java/C++ may need iterative DFS.",
    ],
    edgeCases: [
      "Self-loop (a, a) — gray-on-gray on the first visit → cycle.",
      "Disconnected graph — must start DFS from every white node.",
      "No edges — no cycle.",
      "Single tree (DAG) — no cycle.",
    ],
    whyItMatters:
      "Cycle detection is the security-engineer's bread and butter. IAM inheritance, dependency injection containers, build graphs — anything that resolves transitively must reject cycles or loop forever.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 22 — pure_dsa · tries · medium · frontend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "search-autocomplete-prefix",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 2,
    pattern: "tries",
    difficulty: "medium",
    primaryRole: "frontend_engineer",
    roles: ["frontend_engineer", "full_stack_engineer", "backend_engineer"],
    title: "Search Autocomplete Prefix",
    framing:
      "A search box wants instant prefix matches over a fixed vocabulary of phrases. As the user types each character, the box must list every vocabulary word that starts with what they've typed so far, in lexicographic order, capped at the top k matches.",
    statement:
      "Implement a class Autocomplete(words) that pre-indexes a list of words. The method suggest(prefix, k) returns up to k words from the vocabulary that start with prefix, in lexicographic ascending order.",
    inputFormat: "Constructor receives an array of up to 10^4 lowercase ASCII words, each up to 20 chars. suggest receives a prefix (up to 20 chars) and an integer k (1 ≤ k ≤ 50).",
    outputFormat: "A list of at most k words in lexicographic order.",
    constraints: [
      "Up to 10,000 words in the vocabulary",
      "Word and prefix length up to 20 chars",
      "1 ≤ k ≤ 50",
      "suggest must be fast in the hot path — sorting on each call is too slow",
    ],
    examples: [
      {
        input: "words = [\"cat\", \"car\", \"cart\", \"dog\"]; suggest(\"ca\", 2)",
        output: "[\"car\", \"cart\"]",
        explanation: "Words starting with 'ca' in sorted order: car, cart, cat. Top 2 → [car, cart].",
      },
      {
        input: "words as above; suggest(\"z\", 5)",
        output: "[]",
        explanation: "No words start with 'z'.",
      },
    ],
    approach: [
      "Build a trie. Each node holds a map (or array of 26) from char to child node, and a sorted list of complete words in its subtree (precomputed during insertion).",
      "On insertion, walk down the trie char by char; at each node along the path, append the new word to the node's subtree-words list (we'll sort at the end of construction).",
      "After all insertions, sort each node's subtree-words list once.",
      "suggest(prefix, k): walk the trie following prefix chars. If the walk falls off, return []. Otherwise return the first k entries of the landed node's sorted list.",
    ],
    solutionSteps: [
      "Define a trie node with children: dict[str, Node] and words: list[str].",
      "For each w in vocabulary, walk from the root inserting one char at a time; append w to each visited node's words list.",
      "After all insertions, sort each node's words list (DFS).",
      "suggest(prefix, k):",
      "  node = root.",
      "  for ch in prefix: if ch not in node.children: return []; node = node.children[ch].",
      "  return node.words[:k].",
      "Insertion: O(total chars). Sort: O(n · w · log n) worst case. Suggest: O(|prefix| + k).",
    ],
    code: {
      python: `class _TrieNode:
    __slots__ = ("children", "words")
    def __init__(self):
        self.children: dict[str, "_TrieNode"] = {}
        self.words: list[str] = []

class Autocomplete:
    def __init__(self, words: list[str]):
        self.root = _TrieNode()
        for w in words:
            node = self.root
            for ch in w:
                node = node.children.setdefault(ch, _TrieNode())
                node.words.append(w)
        self._sort(self.root)

    def _sort(self, node: _TrieNode) -> None:
        node.words.sort()
        for child in node.children.values():
            self._sort(child)

    def suggest(self, prefix: str, k: int) -> list[str]:
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return []
            node = node.children[ch]
        return node.words[:k]
`,
      java: `import java.util.*;

public final class SearchAutocompletePrefix {
    private static final class TrieNode {
        Map<Character, TrieNode> children = new HashMap<>();
        List<String> words = new ArrayList<>();
    }
    private final TrieNode root = new TrieNode();

    public SearchAutocompletePrefix(List<String> words) {
        for (String w : words) {
            TrieNode node = root;
            for (char ch : w.toCharArray()) {
                node = node.children.computeIfAbsent(ch, c -> new TrieNode());
                node.words.add(w);
            }
        }
        sort(root);
    }
    private void sort(TrieNode node) {
        Collections.sort(node.words);
        for (TrieNode c : node.children.values()) sort(c);
    }
    public List<String> suggest(String prefix, int k) {
        TrieNode node = root;
        for (char ch : prefix.toCharArray()) {
            node = node.children.get(ch);
            if (node == null) return Collections.emptyList();
        }
        return node.words.subList(0, Math.min(k, node.words.size()));
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

struct TrieNode {
    unordered_map<char, TrieNode*> children;
    vector<string> words;
};

class Autocomplete {
public:
    explicit Autocomplete(const vector<string>& words) {
        root_ = new TrieNode();
        for (const auto& w : words) {
            TrieNode* node = root_;
            for (char ch : w) {
                auto it = node->children.find(ch);
                if (it == node->children.end()) {
                    node = node->children[ch] = new TrieNode();
                } else {
                    node = it->second;
                }
                node->words.push_back(w);
            }
        }
        sortAll(root_);
    }
    vector<string> suggest(const string& prefix, int k) const {
        TrieNode* node = root_;
        for (char ch : prefix) {
            auto it = node->children.find(ch);
            if (it == node->children.end()) return {};
            node = it->second;
        }
        int take = min((int)node->words.size(), k);
        return vector<string>(node->words.begin(), node->words.begin() + take);
    }
private:
    void sortAll(TrieNode* node) {
        sort(node->words.begin(), node->words.end());
        for (auto& [_, child] : node->children) sortAll(child);
    }
    TrieNode* root_;
};
`,
    },
    complexity: { time: "Construction O(W·L log W). suggest O(|prefix| + k)", space: "O(W · L) in trie + sorted lists" },
    pitfalls: [
      "Sorting on every suggest call — O(W log W) per keystroke wrecks UX latency.",
      "Forgetting to truncate node.words to top-k at construction time — for top-k variants you can store only the smallest k per node to save memory.",
      "Storing the same string by reference vs by copy in C++ — moving the strings can save allocation but complicates lifetime.",
    ],
    edgeCases: [
      "Empty prefix — returns the lexicographically smallest k words.",
      "Prefix matches no word — return [].",
      "k larger than the number of matches — return all matches (not padded).",
      "Duplicate words in the vocabulary — they all get inserted and returned.",
    ],
    whyItMatters:
      "Tries are the standard answer for any string-prefix problem. Autocomplete, spellcheck, IP routing tables, URL routers — every interview that involves prefix lookups starts here.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 23 — indian_domain · intervals · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "gst-quarterly-filing-overlap",
    version: 1,
    status: "pending_review",
    bucket: "indian_domain",
    batchNo: 2,
    pattern: "intervals",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "full_stack_engineer", "data_engineer"],
    title: "GST Quarterly Filing Overlap",
    framing:
      "An Indian SaaS bookkeeping app shows a banner on every customer's dashboard the day their next GST quarterly filing window opens. Each tax-paying entity has its own filing window stored as an integer day-range [start_day, end_day]. The compliance team wants to know: on the busiest single day of the quarter, how many filings are simultaneously open?",
    statement:
      "Given a list of n intervals [start_i, end_i] representing filing windows (inclusive endpoints, integer day-of-year), return the maximum number of intervals that overlap at any single point.",
    inputFormat: "Integer n (0 ≤ n ≤ 10^5) and n pairs (start, end) with 1 ≤ start ≤ end ≤ 366.",
    outputFormat: "A single integer — the maximum simultaneous overlap.",
    constraints: [
      "0 ≤ n ≤ 100,000",
      "1 ≤ start ≤ end ≤ 366",
      "Endpoints are inclusive — an interval [1, 3] is active on days 1, 2, 3",
    ],
    examples: [
      {
        input: "intervals = [[1, 5], [3, 7], [6, 9]]",
        output: "2",
        explanation: "Day 3: intervals 1 and 2 active (count 2). Day 6: intervals 2 and 3 active (count 2). Max = 2.",
      },
      {
        input: "intervals = []",
        output: "0",
        explanation: "No intervals → 0 overlap.",
      },
    ],
    approach: [
      "Sweep line. For each interval, emit two events: +1 at start, −1 at (end + 1).",
      "Sort the events by day. Walk them in order, maintaining a running count of currently-active intervals. The max value of that count is the answer.",
      "Day-of-year is bounded by 366, so we can alternatively use a difference array of size 368 for O(n + 366) time.",
    ],
    solutionSteps: [
      "Allocate diff array of length 368, initialised to 0.",
      "For each (start, end) in intervals: diff[start] += 1 and diff[end + 1] -= 1.",
      "Walk diff from day 1 to 366 maintaining a running sum; track the max value of that sum.",
      "Return the max.",
      "O(n + 366) time, O(366) extra space.",
    ],
    code: {
      python: `def max_overlap(intervals: list[list[int]]) -> int:
    diff = [0] * 368
    for s, e in intervals:
        diff[s] += 1
        diff[e + 1] -= 1
    best = running = 0
    for d in range(1, 367):
        running += diff[d]
        if running > best:
            best = running
    return best
`,
      java: `public final class GstQuarterlyFilingOverlap {
    public static int maxOverlap(int[][] intervals) {
        int[] diff = new int[368];
        for (int[] iv : intervals) {
            diff[iv[0]]   += 1;
            diff[iv[1] + 1] -= 1;
        }
        int best = 0, running = 0;
        for (int d = 1; d <= 366; d++) {
            running += diff[d];
            if (running > best) best = running;
        }
        return best;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int maxOverlap(const vector<pair<int, int>>& intervals) {
    array<int, 368> diff{};
    for (const auto& [s, e] : intervals) {
        diff[s] += 1;
        diff[e + 1] -= 1;
    }
    int best = 0, running = 0;
    for (int d = 1; d <= 366; ++d) {
        running += diff[d];
        if (running > best) best = running;
    }
    return best;
}
`,
    },
    complexity: { time: "O(n + 366)", space: "O(366)" },
    pitfalls: [
      "Closing the interval at end instead of end + 1 — drops one day of overlap at boundaries.",
      "Using a hash map over events when the time domain is a tiny fixed range — slower and more memory than the difference array.",
      "Returning the LAST running value instead of the running MAX.",
    ],
    edgeCases: [
      "Empty intervals — return 0.",
      "All intervals identical — return n.",
      "Single interval — return 1.",
      "Two non-overlapping intervals — return 1.",
    ],
    whyItMatters:
      "Sweep-line / difference-array is the canonical answer for any 'how many concurrent X' question — used in calendar scheduling, ad campaign overlap, rate-limit modelling. India's GST filing windows are a perfect setup for this textbook pattern.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 24 — ai_applied · backtracking · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "tool-call-sequence-budget",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 2,
    pattern: "backtracking",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "backend_engineer"],
    title: "Tool Call Sequence Budget",
    framing:
      "An LLM agent has k callable tools. To answer a question it must choose an ordered sequence of tool calls (no tool repeats). Each tool has a fixed token cost and a fixed information gain. The agent must produce the highest-gain sequence whose total token cost stays under a budget. The agent emits sequences (not sets) because tool order changes downstream behaviour.",
    statement:
      "Given two arrays cost and gain of length k (where cost[i] is the token cost and gain[i] is the information gain of tool i), and an integer budget, return the maximum total gain achievable by any ordered sequence of distinct tool indices whose total cost is ≤ budget. The sequence may use any subset of tools in any order, but no tool more than once.",
    inputFormat: "Integers k (1 ≤ k ≤ 12) and budget (1 ≤ budget ≤ 10^6). Arrays cost and gain of length k with 1 ≤ cost[i] ≤ budget and 1 ≤ gain[i] ≤ 10^6.",
    outputFormat: "A single integer — the maximum total gain.",
    constraints: [
      "1 ≤ k ≤ 12 (small to allow exponential enumeration)",
      "1 ≤ budget ≤ 10^6",
      "Each tool index used at most once",
      "Order of the sequence does not affect cost or gain in this formulation — but the agent records the order, so the answer is across all permutations",
      "Empty sequence is allowed (gain = 0)",
    ],
    examples: [
      {
        input: "k = 3, cost = [3, 4, 5], gain = [10, 12, 15], budget = 7",
        output: "22",
        explanation: "Pick tools 0 and 1: cost 3+4=7 ≤ 7, gain 10+12=22. Pick 0 and 2: 3+5=8 > 7. Pick 1 and 2: 4+5=9 > 7. Best is {0,1} → 22.",
      },
      {
        input: "k = 1, cost = [5], gain = [10], budget = 4",
        output: "0",
        explanation: "Tool 0 cost 5 > 4, can't use. Empty sequence → 0.",
      },
    ],
    approach: [
      "Since order doesn't affect cost or gain, the problem reduces to a 0/1 knapsack over k ≤ 12 items.",
      "With k tiny, backtracking with pruning is simplest. For each index, branch on take vs skip.",
      "Prune when current_cost + remaining minimum cost exceeds budget. The order claim is a framing detail — the optimum is determined by the chosen subset.",
    ],
    solutionSteps: [
      "Backtracking dfs(i, current_cost, current_gain):",
      "  if i == k: best = max(best, current_gain); return.",
      "  // Option 1: skip tool i.",
      "  dfs(i + 1, current_cost, current_gain).",
      "  // Option 2: take tool i if it fits.",
      "  if current_cost + cost[i] ≤ budget:",
      "    dfs(i + 1, current_cost + cost[i], current_gain + gain[i]).",
      "Start with dfs(0, 0, 0). Return best.",
      "2^k branches at most. With k ≤ 12, that's ≤ 4096 — fast.",
    ],
    code: {
      python: `def max_gain(cost: list[int], gain: list[int], budget: int) -> int:
    k = len(cost)
    best = 0

    def dfs(i: int, cur_cost: int, cur_gain: int) -> None:
        nonlocal best
        if i == k:
            if cur_gain > best:
                best = cur_gain
            return
        # skip
        dfs(i + 1, cur_cost, cur_gain)
        # take
        if cur_cost + cost[i] <= budget:
            dfs(i + 1, cur_cost + cost[i], cur_gain + gain[i])

    dfs(0, 0, 0)
    return best
`,
      java: `public final class ToolCallSequenceBudget {
    static int best;
    public static int maxGain(int[] cost, int[] gain, int budget) {
        best = 0;
        dfs(0, 0, 0, cost, gain, budget);
        return best;
    }
    private static void dfs(int i, int curCost, int curGain, int[] cost, int[] gain, int budget) {
        if (i == cost.length) {
            if (curGain > best) best = curGain;
            return;
        }
        // skip
        dfs(i + 1, curCost, curGain, cost, gain, budget);
        // take
        if (curCost + cost[i] <= budget) {
            dfs(i + 1, curCost + cost[i], curGain + gain[i], cost, gain, budget);
        }
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

static int g_best;
static void dfs(int i, int curCost, int curGain,
                const vector<int>& cost, const vector<int>& gain, int budget) {
    if (i == (int)cost.size()) {
        if (curGain > g_best) g_best = curGain;
        return;
    }
    dfs(i + 1, curCost, curGain, cost, gain, budget);
    if (curCost + cost[i] <= budget) {
        dfs(i + 1, curCost + cost[i], curGain + gain[i], cost, gain, budget);
    }
}

int maxGain(const vector<int>& cost, const vector<int>& gain, int budget) {
    g_best = 0;
    dfs(0, 0, 0, cost, gain, budget);
    return g_best;
}
`,
    },
    complexity: { time: "O(2^k)", space: "O(k) recursion" },
    pitfalls: [
      "Treating the problem as permutations and enumerating k! orderings — pointless work, since order does not affect total cost or gain.",
      "Initialising best = -infinity — the empty sequence has gain 0, which must be a valid lower bound.",
      "DP over budget when budget reaches 10^6 — O(k · budget) = 1.2·10^7 is fine but uses more memory than the 2^k branch.",
    ],
    edgeCases: [
      "No tool fits the budget — return 0.",
      "All tools fit — return sum of all gains.",
      "Tied gains across subsets — any subset that maximises is acceptable.",
    ],
    whyItMatters:
      "Combinatorial subset selection with pruning is the bread-and-butter of any planner, scheduler, or tool-orchestrator. The AI scene is a setup — the core skill is recognising the knapsack structure and choosing the right enumeration over a small k.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 25 — pure_dsa · heap_priority_queue · hard · devops_sre
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "incident-priority-pager",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 2,
    pattern: "heap_priority_queue",
    difficulty: "hard",
    primaryRole: "devops_sre",
    roles: ["devops_sre", "platform_engineer", "backend_engineer"],
    title: "Incident Priority Pager",
    framing:
      "An incident pager processes a stream of incidents, each with a severity (1 = highest). The on-call engineer can handle one incident at a time. New incidents may arrive while one is being handled. Determine the order in which incidents are handled if the engineer always picks the highest-severity (lowest-numbered) incident currently in the queue when they become free.",
    statement:
      "Given a list of events sorted by arrival timestamp, each (arrival_time, incident_id, severity, handle_time), produce the order (by incident_id) in which the engineer finishes handling them. Tie-break by earliest arrival_time. The engineer is idle until the first event; whenever they finish, they immediately pick the pending incident with the lowest severity (highest priority); if no incident is pending, they idle until the next arrival.",
    inputFormat: "An integer n (1 ≤ n ≤ 10^5) and n records (arrival, id, severity, handle_time) with 0 ≤ arrival ≤ 10^9, 1 ≤ severity ≤ 10, 1 ≤ handle_time ≤ 10^6. Records arrive sorted by arrival.",
    outputFormat: "A list of n incident IDs in the order they finish processing.",
    constraints: [
      "1 ≤ n ≤ 100,000",
      "Severity 1 = highest priority. 10 = lowest.",
      "Ties by arrival_time; further ties by incident_id ascending",
      "Incidents that arrive while the engineer is busy queue up",
    ],
    examples: [
      {
        input: "events = [(0, 1, 2, 5), (1, 2, 1, 3), (2, 3, 3, 1)]",
        output: "[1, 2, 3]",
        explanation: "At t=0, engineer picks incident 1 (only one queued), finishes at t=5. During [0,5], incidents 2 and 3 arrive. At t=5, engineer picks the highest-priority pending: severity 1 (incident 2), finishes at t=8. Then incident 3 at t=9. Order: 1, 2, 3.",
      },
    ],
    approach: [
      "Maintain a min-heap keyed on (severity, arrival_time, id) of pending incidents and a pointer into the sorted input array.",
      "Track a current_time clock. If the heap is empty, fast-forward to the next arrival.",
      "Pop the highest-priority pending incident, advance the clock by its handle_time, and emit its id.",
      "Before each pop, drain the input array of every event whose arrival_time ≤ current_time into the heap.",
    ],
    solutionSteps: [
      "Sort events by arrival_time (already given).",
      "Initialise idx = 0, current_time = 0, heap empty, out = [].",
      "While out is not full:",
      "  if heap is empty and idx < n and events[idx].arrival > current_time: fast-forward current_time = events[idx].arrival.",
      "  Drain: while idx < n and events[idx].arrival ≤ current_time: push (severity, arrival, id, handle_time) onto heap; idx += 1.",
      "  Pop (sev, arr, id, ht). Emit id. current_time += ht.",
      "Return out.",
      "Each event is pushed and popped once → O(n log n). Space O(n).",
    ],
    code: {
      python: `import heapq

def pager_order(events: list[tuple[int, int, int, int]]) -> list[int]:
    n = len(events)
    idx = 0
    current = 0
    heap: list[tuple[int, int, int, int]] = []  # (sev, arrival, id, handle_time)
    out: list[int] = []
    while len(out) < n:
        if not heap and idx < n and events[idx][0] > current:
            current = events[idx][0]
        while idx < n and events[idx][0] <= current:
            arrival, eid, sev, ht = events[idx]
            heapq.heappush(heap, (sev, arrival, eid, ht))
            idx += 1
        sev, arrival, eid, ht = heapq.heappop(heap)
        out.append(eid)
        current += ht
    return out
`,
      java: `import java.util.*;

public final class IncidentPriorityPager {
    public static List<Integer> order(int[][] events) {
        // Each row: {arrival, id, severity, handle_time}
        int n = events.length;
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> {
            if (a[0] != b[0]) return Integer.compare(a[0], b[0]); // severity
            if (a[1] != b[1]) return Integer.compare(a[1], b[1]); // arrival
            return Integer.compare(a[2], b[2]);                   // id
        });
        int idx = 0;
        long current = 0;
        List<Integer> out = new ArrayList<>(n);
        while (out.size() < n) {
            if (heap.isEmpty() && idx < n && events[idx][0] > current) {
                current = events[idx][0];
            }
            while (idx < n && events[idx][0] <= current) {
                int[] e = events[idx];
                heap.offer(new int[]{e[2], e[0], e[1], e[3]});
                idx++;
            }
            int[] top = heap.poll();
            out.add(top[2]);
            current += top[3];
        }
        return out;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> pagerOrder(const vector<array<int, 4>>& events) {
    int n = (int)events.size();
    auto cmp = [](const array<int, 4>& a, const array<int, 4>& b) {
        if (a[0] != b[0]) return a[0] > b[0];
        if (a[1] != b[1]) return a[1] > b[1];
        return a[2] > b[2];
    };
    priority_queue<array<int, 4>, vector<array<int, 4>>, decltype(cmp)> heap(cmp);
    int idx = 0;
    long long current = 0;
    vector<int> out;
    out.reserve(n);
    while ((int)out.size() < n) {
        if (heap.empty() && idx < n && events[idx][0] > current) {
            current = events[idx][0];
        }
        while (idx < n && events[idx][0] <= current) {
            const auto& e = events[idx];
            heap.push({e[2], e[0], e[1], e[3]});
            idx++;
        }
        auto top = heap.top(); heap.pop();
        out.push_back(top[2]);
        current += top[3];
    }
    return out;
}
`,
    },
    complexity: { time: "O(n log n)", space: "O(n)" },
    pitfalls: [
      "Forgetting to fast-forward current_time when the heap is empty — engineer would wait idle while no incidents are pending, but the algorithm must still process events by arrival.",
      "Using a max-heap keyed on severity — picks the LEAST priority first.",
      "Not draining the input before each pop — incidents that arrived during handling get processed out of priority order.",
      "Overflow on current_time: n × max handle_time = 10^11 — use long.",
    ],
    edgeCases: [
      "All incidents at t=0 — heap fills up immediately; engineer processes by severity.",
      "Single incident — engineer handles it, done.",
      "Engineer always idle between incidents — fast-forward fires before every pop.",
      "Two incidents same severity — earlier arrival wins; if same arrival, lower id.",
    ],
    whyItMatters:
      "Priority-queue scheduling with reactive draining is the canonical pattern for any reactive system — page routing, deferred jobs, real-time auctions. Every senior SRE interview probes this exact discrete-event loop.",
    estimatedMinutes: 40,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 26 — pure_dsa · arrays_hashing · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "click-stream-funnel-count",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 2,
    pattern: "arrays_hashing",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer", "backend_engineer"],
    title: "Click Stream Funnel Count",
    framing:
      "A growth team analyses a user's click stream to detect whether they completed a defined funnel: e.g. view → add_to_cart → checkout → pay. The funnel must appear as an ordered subsequence (other clicks may interleave). Count how many distinct users completed the funnel.",
    statement:
      "Given a list of events where each event is (user_id, action), and a list of funnel actions in order, return the number of distinct user_ids whose events contain the funnel as an ordered subsequence (other actions may interleave).",
    inputFormat: "Up to 10^5 events. Each event has a user_id string (≤ 16 chars) and an action string (≤ 16 chars). Funnel is a list of 1 ≤ k ≤ 6 action strings.",
    outputFormat: "A single integer — the count of distinct completing users.",
    constraints: [
      "Up to 100,000 events, sorted by event timestamp (so traversal order is the event order)",
      "1 ≤ funnel length ≤ 6",
      "Other actions between funnel steps are allowed",
      "Each funnel action must be matched exactly (no fuzzy match)",
    ],
    examples: [
      {
        input: "events = [(u1, view), (u1, cart), (u2, view), (u1, pay), (u1, checkout)], funnel = [view, cart, checkout, pay]",
        output: "0",
        explanation: "u1 has view, cart, then pay BEFORE checkout. Funnel requires checkout BEFORE pay. So u1 fails. u2 only has view. Count = 0.",
      },
      {
        input: "events = [(u1, view), (u1, cart), (u1, checkout), (u1, pay)], funnel = [view, cart, checkout, pay]",
        output: "1",
        explanation: "u1 hits the funnel in order. Count = 1.",
      },
    ],
    approach: [
      "Maintain a hash map progress: user_id → index_of_next_funnel_action_to_match.",
      "Walk events in chronological order. For each event (user, action), look up the user's current funnel index. If action matches funnel[index], advance: progress[user] = index + 1.",
      "Whenever a user reaches len(funnel), record them as a completer and remove from progress.",
      "Return the size of the completer set.",
    ],
    solutionSteps: [
      "Initialise progress : dict[str, int] and completers : set[str].",
      "For each (user, action) in events:",
      "  if user in completers: skip.",
      "  next_idx = progress.get(user, 0).",
      "  if action == funnel[next_idx]:",
      "    next_idx += 1.",
      "    if next_idx == len(funnel): add user to completers; remove from progress.",
      "    else: progress[user] = next_idx.",
      "Return len(completers).",
      "O(n) time, O(distinct users) space.",
    ],
    code: {
      python: `def funnel_completers(events: list[tuple[str, str]], funnel: list[str]) -> int:
    progress: dict[str, int] = {}
    done: set[str] = set()
    L = len(funnel)
    for user, action in events:
        if user in done:
            continue
        idx = progress.get(user, 0)
        if action == funnel[idx]:
            idx += 1
            if idx == L:
                done.add(user)
                progress.pop(user, None)
            else:
                progress[user] = idx
    return len(done)
`,
      java: `import java.util.*;

public final class ClickStreamFunnelCount {
    public static int completers(List<String[]> events, List<String> funnel) {
        Map<String, Integer> progress = new HashMap<>();
        Set<String> done = new HashSet<>();
        int L = funnel.size();
        for (String[] e : events) {
            String user = e[0], action = e[1];
            if (done.contains(user)) continue;
            int idx = progress.getOrDefault(user, 0);
            if (action.equals(funnel.get(idx))) {
                idx++;
                if (idx == L) {
                    done.add(user);
                    progress.remove(user);
                } else {
                    progress.put(user, idx);
                }
            }
        }
        return done.size();
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int completers(const vector<pair<string, string>>& events,
               const vector<string>& funnel) {
    unordered_map<string, int> progress;
    unordered_set<string> done;
    int L = (int)funnel.size();
    for (const auto& [user, action] : events) {
        if (done.count(user)) continue;
        int idx = 0;
        auto it = progress.find(user);
        if (it != progress.end()) idx = it->second;
        if (action == funnel[idx]) {
            idx++;
            if (idx == L) {
                done.insert(user);
                progress.erase(user);
            } else {
                progress[user] = idx;
            }
        }
    }
    return (int)done.size();
}
`,
    },
    complexity: { time: "O(n)", space: "O(U) where U is distinct users" },
    pitfalls: [
      "Requiring contiguous funnel actions instead of subsequence — over-rejects users who clicked other things between funnel steps.",
      "Re-counting a user who completed once and then triggered the funnel actions again — the spec asks for distinct completers.",
      "Linear-scanning the funnel for each event — O(n · L). With L ≤ 6 it's fine but a hash on per-user index is cleaner.",
    ],
    edgeCases: [
      "Empty event list — return 0.",
      "Single-step funnel — every user with that action counts.",
      "Funnel cannot be completed by any user — return 0.",
      "Users perform the funnel actions out of order — they fail to advance.",
    ],
    whyItMatters:
      "Funnel analysis is product-engineering 101. Every growth, billing, or activation pipeline computes some variant of this. The per-user pointer pattern beats more sophisticated solutions and is the right answer in interviews.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 27 — pure_dsa · sliding_window · medium · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "session-duration-window",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 2,
    pattern: "sliding_window",
    difficulty: "medium",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer"],
    title: "Session Duration Window",
    framing:
      "An analytics service computes the count of distinct active sessions inside a fixed rolling time window (e.g. the last 10 minutes). It receives an ordered stream of session start timestamps and a stream of queries (each at a timestamp); for each query, return the number of sessions whose start_time is in (query_time − w, query_time].",
    statement:
      "Given a sorted (ascending) array of session start timestamps and an integer window w, plus a sorted (ascending) array of query timestamps, return for each query q the number of starts strictly greater than q − w and at most q.",
    inputFormat: "Integers n (1 ≤ n ≤ 10^5) and m (1 ≤ m ≤ 10^5), and integer w (1 ≤ w ≤ 10^9). Two arrays sorted ascending: starts (each in [0, 10^9]) and queries (each in [0, 10^9]).",
    outputFormat: "An array of m integers — the count for each query in input order.",
    constraints: [
      "1 ≤ n, m ≤ 100,000",
      "1 ≤ w ≤ 10^9",
      "starts and queries are sorted ascending (queries form a monotonic time axis)",
      "Output preserves the query order",
    ],
    examples: [
      {
        input: "starts = [1, 4, 7, 10, 12], queries = [5, 10, 12], w = 3",
        output: "[1, 1, 2]",
        explanation:
          "Query 5: window is (2, 5] → only start 4 qualifies → 1. Query 10: window is (7, 10] → only start 10 qualifies → 1. Query 12: window is (9, 12] → starts 10 and 12 qualify → 2.",
      },
      {
        input: "starts = [2, 2, 5, 8], queries = [4, 9], w = 5",
        output: "[2, 2]",
        explanation:
          "Query 4: window is (-1, 4] → both starts at 2 qualify → 2. Query 9: window is (4, 9] → starts 5 and 8 qualify → 2.",
      },
    ],
    approach: [
      "Two-pointer sweep, both monotonically advancing.",
      "Maintain pointers right (next start to add as it enters the window) and left (next start to evict as it leaves).",
      "For each query q in order: advance right while starts[right] ≤ q (these belong in the window); advance left while starts[left] ≤ q − w (these have left).",
      "Answer for this query = right − left.",
    ],
    solutionSteps: [
      "Initialise left = 0, right = 0, n = len(starts), m = len(queries), result = [].",
      "For each q in queries:",
      "  while right < n and starts[right] ≤ q: right += 1.",
      "  while left < n and starts[left] ≤ q - w: left += 1.",
      "  result.append(right - left).",
      "Return result.",
      "Each pointer moves at most n times across the whole loop → O(n + m) time.",
    ],
    code: {
      python: `def session_counts(starts: list[int], queries: list[int], w: int) -> list[int]:
    n, m = len(starts), len(queries)
    left = right = 0
    out: list[int] = []
    for q in queries:
        while right < n and starts[right] <= q:
            right += 1
        while left < n and starts[left] <= q - w:
            left += 1
        out.append(right - left)
    return out
`,
      java: `public final class SessionDurationWindow {
    public static int[] counts(int[] starts, int[] queries, int w) {
        int n = starts.length, m = queries.length;
        int left = 0, right = 0;
        int[] out = new int[m];
        for (int i = 0; i < m; i++) {
            int q = queries[i];
            while (right < n && starts[right] <= q) right++;
            while (left  < n && starts[left]  <= q - w) left++;
            out[i] = right - left;
        }
        return out;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> sessionCounts(const vector<int>& starts,
                          const vector<int>& queries, int w) {
    int n = (int)starts.size(), m = (int)queries.size();
    int left = 0, right = 0;
    vector<int> out(m);
    for (int i = 0; i < m; ++i) {
        int q = queries[i];
        while (right < n && starts[right] <= q) right++;
        while (left  < n && starts[left]  <= q - w) left++;
        out[i] = right - left;
    }
    return out;
}
`,
    },
    complexity: { time: "O(n + m)", space: "O(m) for output" },
    pitfalls: [
      "Binary searching for each query independently — O(m log n). Works but the two-pointer is strictly faster when queries are sorted.",
      "Using ≤ instead of < on the eviction boundary — drops sessions that should stay in the window.",
      "Resetting pointers between queries — destroys the monotonic-advance property and degrades to O(n · m).",
    ],
    edgeCases: [
      "Query before any session start — count is 0.",
      "Window so large all sessions are in it — count = n for every query at/after the last start.",
      "All sessions outside the window — count is 0.",
    ],
    whyItMatters:
      "Two pointers on sorted streams is the cleanest answer for rolling-window aggregates. Every analytics query of the form 'count things in last X' boils down to this.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 28 — pure_dsa · binary_search · medium · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "shard-rebalance-threshold",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 2,
    pattern: "binary_search",
    difficulty: "medium",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "data_engineer", "backend_engineer"],
    title: "Shard Rebalance Threshold",
    framing:
      "A storage operator must split n keys across k shards. Each key i has a size sizes[i]. They want to find the SMALLEST possible value for the largest shard's total size, while keeping shard assignments contiguous (i.e. each shard owns a prefix range of keys).",
    statement:
      "Given an integer array sizes of length n and an integer k (k ≤ n), partition sizes into k non-empty contiguous subarrays so that the maximum sum of any subarray is minimised. Return that minimised maximum sum.",
    inputFormat: "Integers n (1 ≤ n ≤ 10^5) and k (1 ≤ k ≤ n), and the array sizes with each in [1, 10^6].",
    outputFormat: "A single integer — the minimised maximum shard total.",
    constraints: [
      "1 ≤ k ≤ n ≤ 100,000",
      "1 ≤ sizes[i] ≤ 1,000,000",
      "Shards must be contiguous prefixes — each shard owns a [l, r] range of indices",
      "Each shard must be non-empty",
    ],
    examples: [
      {
        input: "sizes = [7, 2, 5, 10, 8], k = 2",
        output: "18",
        explanation: "Best split: [7,2,5] = 14 and [10,8] = 18. Max = 18. Any other 2-cut produces a larger max.",
      },
      {
        input: "sizes = [1, 2, 3, 4, 5], k = 5",
        output: "5",
        explanation: "Every key is its own shard. Max shard sum is 5.",
      },
    ],
    approach: [
      "Binary-search on the answer. The feasibility predicate is monotonic: if size cap X works, every Y > X also works.",
      "Lower bound: max(sizes) — no shard can be smaller than the biggest single key.",
      "Upper bound: sum(sizes) — one shard holds everything.",
      "Predicate canSplit(cap): greedily walk left-to-right, summing into the current shard until adding the next element would exceed cap; then close the shard and start a new one. Count shards used; if ≤ k, cap is feasible.",
    ],
    solutionSteps: [
      "Compute lo = max(sizes), hi = sum(sizes).",
      "Define canSplit(cap):",
      "  shards = 1, running = 0.",
      "  for s in sizes:",
      "    if running + s > cap: shards += 1; running = s.",
      "    else: running += s.",
      "  return shards ≤ k.",
      "While lo < hi:",
      "  mid = lo + (hi - lo) // 2.",
      "  if canSplit(mid): hi = mid. else: lo = mid + 1.",
      "Return lo.",
      "Time O(n log(sum)). Space O(1).",
    ],
    code: {
      python: `def min_max_shard(sizes: list[int], k: int) -> int:
    def can_split(cap: int) -> bool:
        shards = 1
        running = 0
        for s in sizes:
            if s > cap:
                return False
            if running + s > cap:
                shards += 1
                running = s
            else:
                running += s
        return shards <= k

    lo, hi = max(sizes), sum(sizes)
    while lo < hi:
        mid = (lo + hi) // 2
        if can_split(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo
`,
      java: `public final class ShardRebalanceThreshold {
    public static long minMaxShard(int[] sizes, int k) {
        long lo = 0, hi = 0;
        for (int s : sizes) { hi += s; if (s > lo) lo = s; }
        while (lo < hi) {
            long mid = lo + (hi - lo) / 2;
            if (canSplit(sizes, k, mid)) hi = mid;
            else lo = mid + 1;
        }
        return lo;
    }
    private static boolean canSplit(int[] sizes, int k, long cap) {
        int shards = 1;
        long running = 0;
        for (int s : sizes) {
            if (s > cap) return false;
            if (running + s > cap) { shards++; running = s; }
            else running += s;
        }
        return shards <= k;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

bool canSplit(const vector<int>& sizes, int k, long long cap) {
    int shards = 1;
    long long running = 0;
    for (int s : sizes) {
        if (s > cap) return false;
        if (running + s > cap) { shards++; running = s; }
        else                   running += s;
    }
    return shards <= k;
}

long long minMaxShard(const vector<int>& sizes, int k) {
    long long lo = 0, hi = 0;
    for (int s : sizes) { hi += s; if (s > lo) lo = s; }
    while (lo < hi) {
        long long mid = lo + (hi - lo) / 2;
        if (canSplit(sizes, k, mid)) hi = mid;
        else                         lo = mid + 1;
    }
    return lo;
}
`,
    },
    complexity: { time: "O(n log(sum))", space: "O(1)" },
    pitfalls: [
      "Binary searching on the wrong space (e.g. on k) — the answer is a sum, not a count.",
      "Forgetting the lo = max(sizes) lower bound — guarantees no single element exceeds the cap.",
      "Greedy that allows shard to overshoot then 'rebalance' — the correct greedy is single-pass: never overshoot.",
    ],
    edgeCases: [
      "k = 1 — answer is sum(sizes).",
      "k = n — answer is max(sizes).",
      "All sizes equal — answer is roughly sum/k, but rounded up.",
    ],
    whyItMatters:
      "Binary-search-on-the-answer is a powerful interview meta-pattern. Once you spot the monotone feasibility predicate, problems like 'minimise the maximum X subject to Y' become formulaic.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 29 — ai_applied · dp_2d · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "prompt-template-edit-distance",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 2,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "backend_engineer"],
    title: "Prompt Template Edit Distance",
    framing:
      "An LLM team versions prompt templates and shows a diff to reviewers. The diff renderer needs the minimum number of single-token edits — insert, delete, or substitute — to turn the old template into the new one. (Tokens, not characters, but algorithmically identical to classical edit distance.)",
    statement:
      "Given two arrays of tokens a and b, return the minimum number of edits (insert, delete, substitute — each cost 1) to transform a into b.",
    inputFormat: "Two arrays a and b of token strings, each of length 0..500. Tokens are arbitrary strings ≤ 32 chars.",
    outputFormat: "A single integer — the edit distance.",
    constraints: [
      "0 ≤ |a|, |b| ≤ 500",
      "Each edit costs 1",
      "Tokens compared by exact equality",
    ],
    examples: [
      {
        input: "a = [\"you\", \"are\", \"a\", \"helpful\"], b = [\"you\", \"are\", \"an\", \"AI\", \"helpful\"]",
        output: "2",
        explanation: "Substitute 'a' → 'an' (1 edit), then insert 'AI' (1 edit). Total 2.",
      },
      {
        input: "a = [], b = [\"hello\"]",
        output: "1",
        explanation: "One insert.",
      },
    ],
    approach: [
      "Classical 2-D DP. Let dp[i][j] be the minimum edits to convert a[0..i-1] into b[0..j-1].",
      "Recurrence: if a[i-1] == b[j-1], dp[i][j] = dp[i-1][j-1]. Otherwise dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]).",
      "Base: dp[0][j] = j (insert j tokens). dp[i][0] = i (delete i tokens).",
      "Space optimisation: only the previous row is needed → O(|b|) space.",
    ],
    solutionSteps: [
      "Let m = len(a), n = len(b).",
      "Allocate prev of length n + 1; set prev[j] = j.",
      "For i from 1 to m:",
      "  curr = [i] + [0] * n.",
      "  for j from 1 to n:",
      "    if a[i - 1] == b[j - 1]: curr[j] = prev[j - 1].",
      "    else: curr[j] = 1 + min(prev[j], curr[j - 1], prev[j - 1]).",
      "  prev = curr.",
      "Return prev[n].",
      "Time O(m · n). Space O(n).",
    ],
    code: {
      python: `def token_edit_distance(a: list[str], b: list[str]) -> int:
    m, n = len(a), len(b)
    prev = list(range(n + 1))
    for i in range(1, m + 1):
        curr = [i] + [0] * n
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                curr[j] = prev[j - 1]
            else:
                curr[j] = 1 + min(prev[j], curr[j - 1], prev[j - 1])
        prev = curr
    return prev[n]
`,
      java: `public final class PromptTemplateEditDistance {
    public static int editDistance(String[] a, String[] b) {
        int m = a.length, n = b.length;
        int[] prev = new int[n + 1];
        for (int j = 0; j <= n; j++) prev[j] = j;
        for (int i = 1; i <= m; i++) {
            int[] curr = new int[n + 1];
            curr[0] = i;
            for (int j = 1; j <= n; j++) {
                if (a[i - 1].equals(b[j - 1])) {
                    curr[j] = prev[j - 1];
                } else {
                    curr[j] = 1 + Math.min(prev[j], Math.min(curr[j - 1], prev[j - 1]));
                }
            }
            prev = curr;
        }
        return prev[n];
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int tokenEditDistance(const vector<string>& a, const vector<string>& b) {
    int m = (int)a.size(), n = (int)b.size();
    vector<int> prev(n + 1);
    iota(prev.begin(), prev.end(), 0);
    for (int i = 1; i <= m; ++i) {
        vector<int> curr(n + 1);
        curr[0] = i;
        for (int j = 1; j <= n; ++j) {
            if (a[i - 1] == b[j - 1]) {
                curr[j] = prev[j - 1];
            } else {
                curr[j] = 1 + min({prev[j], curr[j - 1], prev[j - 1]});
            }
        }
        prev = move(curr);
    }
    return prev[n];
}
`,
    },
    complexity: { time: "O(m · n)", space: "O(n)" },
    pitfalls: [
      "Allocating a full m × n DP table — wastes memory; O(n) suffices.",
      "Forgetting prev[j - 1] in the three-way min — substitution is also a valid edit.",
      "Initialising the row-0 / col-0 incorrectly — base case is the number of edits to convert empty into the prefix.",
    ],
    edgeCases: [
      "Either array empty — answer is the length of the other (all inserts/deletes).",
      "Both empty — answer is 0.",
      "Identical arrays — answer is 0.",
      "Completely different arrays of equal length — answer is the length (all substitutions).",
    ],
    whyItMatters:
      "Edit distance is the universal text-diff primitive. The AI scene is a setup — the pattern (2-D DP, O(n) space rewrite) is the canonical hard interview problem for AI/ML engineers who'll face it again in tokenizer diffs, alignment scoring, or BLEU-style metrics.",
    estimatedMinutes: 35,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 30 — pure_dsa · graphs · hard · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "service-mesh-shortest-path",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 2,
    pattern: "graphs",
    difficulty: "hard",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "devops_sre", "backend_engineer"],
    title: "Service Mesh Shortest Path",
    framing:
      "A service mesh has services as nodes and weighted directed edges representing measured p99 hop latencies (ms). A canary controller routes new traffic along the lowest-cumulative-latency path between a source and target service. Find that path's total latency.",
    statement:
      "Given an integer n (number of services 0..n−1), a list of edges (u, v, w) with positive weight, a source s, and a target t, return the minimum total weight of any path from s to t. If no path exists, return −1.",
    inputFormat: "Integer n (1 ≤ n ≤ 10^4), list of m edges (0 ≤ m ≤ 5·10^4), each (u, v, w) with 1 ≤ w ≤ 10^4, plus integers s and t.",
    outputFormat: "A single integer — the minimum total weight, or −1 if unreachable.",
    constraints: [
      "1 ≤ n ≤ 10,000",
      "0 ≤ m ≤ 50,000",
      "All edge weights are positive — Dijkstra applies",
      "Multiple parallel edges allowed — pick the smallest weight",
    ],
    examples: [
      {
        input: "n = 4, edges = [(0,1,1), (1,2,2), (0,2,5), (2,3,1)], s = 0, t = 3",
        output: "4",
        explanation: "Path 0→1→2→3 has weight 1+2+1=4. Path 0→2→3 has weight 5+1=6. Best is 4.",
      },
      {
        input: "n = 2, edges = [], s = 0, t = 1",
        output: "-1",
        explanation: "No path.",
      },
    ],
    approach: [
      "Standard Dijkstra with a binary heap.",
      "Maintain dist : array of size n initialised to infinity, dist[s] = 0.",
      "Push (0, s) onto the heap. Repeatedly pop (d, u); if d > dist[u], skip (stale). For each (u, v, w) in adj[u]: if dist[u] + w < dist[v], update and push.",
      "Return dist[t] if finite, else −1.",
    ],
    solutionSteps: [
      "Build adjacency list adj : list of lists of (v, w).",
      "Allocate dist of length n with all values = infinity; set dist[s] = 0.",
      "Initialise a min-heap with (0, s).",
      "While heap is non-empty:",
      "  pop (d, u).",
      "  if d > dist[u]: continue (stale).",
      "  if u == t: return d.",
      "  for (v, w) in adj[u]:",
      "    nd = d + w.",
      "    if nd < dist[v]: dist[v] = nd; push (nd, v).",
      "If we exit the loop, return -1.",
      "O((n + m) log n) time, O(n + m) space.",
    ],
    code: {
      python: `import heapq

def shortest_path(n: int, edges: list[tuple[int, int, int]], s: int, t: int) -> int:
    INF = float("inf")
    adj: list[list[tuple[int, int]]] = [[] for _ in range(n)]
    for u, v, w in edges:
        adj[u].append((v, w))
    dist = [INF] * n
    dist[s] = 0
    heap: list[tuple[int, int]] = [(0, s)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue
        if u == t:
            return d
        for v, w in adj[u]:
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                heapq.heappush(heap, (nd, v))
    return -1
`,
      java: `import java.util.*;

public final class ServiceMeshShortestPath {
    public static long shortest(int n, int[][] edges, int s, int t) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) adj.get(e[0]).add(new int[]{e[1], e[2]});
        long[] dist = new long[n];
        Arrays.fill(dist, Long.MAX_VALUE);
        dist[s] = 0;
        PriorityQueue<long[]> heap = new PriorityQueue<>((a, b) -> Long.compare(a[0], b[0]));
        heap.offer(new long[]{0, s});
        while (!heap.isEmpty()) {
            long[] top = heap.poll();
            long d = top[0];
            int  u = (int) top[1];
            if (d > dist[u]) continue;
            if (u == t) return d;
            for (int[] e : adj.get(u)) {
                long nd = d + e[1];
                if (nd < dist[e[0]]) {
                    dist[e[0]] = nd;
                    heap.offer(new long[]{nd, e[0]});
                }
            }
        }
        return -1;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

long long shortest(int n, const vector<tuple<int, int, int>>& edges, int s, int t) {
    vector<vector<pair<int, int>>> adj(n);
    for (const auto& [u, v, w] : edges) adj[u].push_back({v, w});
    const long long INF = LLONG_MAX;
    vector<long long> dist(n, INF);
    dist[s] = 0;
    priority_queue<pair<long long, int>,
                   vector<pair<long long, int>>,
                   greater<>> heap;
    heap.push({0, s});
    while (!heap.empty()) {
        auto [d, u] = heap.top(); heap.pop();
        if (d > dist[u]) continue;
        if (u == t) return d;
        for (const auto& [v, w] : adj[u]) {
            long long nd = d + w;
            if (nd < dist[v]) {
                dist[v] = nd;
                heap.push({nd, v});
            }
        }
    }
    return -1;
}
`,
    },
    complexity: { time: "O((n + m) log n)", space: "O(n + m)" },
    pitfalls: [
      "Using BFS (assuming unit weights) — fails for weighted graphs.",
      "Forgetting the stale-entry check (d > dist[u]) — heap can hold outdated distances; without the check, you do extra work.",
      "Returning dist[t] without checking it's not infinity — return -1 for unreachable.",
      "Using a slow priority queue (sorted list) — O(n²) for dense graphs; binary heap is the standard.",
    ],
    edgeCases: [
      "s == t — answer is 0.",
      "No edges — answer is -1 unless s == t.",
      "Graph with isolated target — return -1.",
      "Parallel edges with different weights — Dijkstra naturally picks the smallest.",
    ],
    whyItMatters:
      "Dijkstra is the gold-standard shortest-path algorithm and shows up in every infrastructure interview that involves graphs — service meshes, CDN routing, dependency resolution. Knowing it cold is non-negotiable.",
    estimatedMinutes: 40,
  },
];
