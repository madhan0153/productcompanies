// DSA v2 — Batch 003 (25 questions).
//
// Rebalances the difficulty mix toward easy (the launch bank was medium-
// heavy after batches 1-2) and broadens coverage across every pattern.
// Composition: 22 pure_dsa + 2 ai_applied + 1 indian_domain.
// Difficulty mix: 13 easy / 10 medium / 2 hard.
//
// All status = "pending_review" — admin must approve each before live.

import type { DsaV2Question } from "../types";

export const BATCH_003: readonly DsaV2Question[] = [
  // ──────────────────────────────────────────────────────────────────────
  // 31 — pure_dsa · arrays_hashing · easy · frontend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "cart-first-unique-item",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 3,
    pattern: "arrays_hashing",
    difficulty: "easy",
    primaryRole: "frontend_engineer",
    roles: ["frontend_engineer", "full_stack_engineer", "software_engineer"],
    title: "Cart First Unique Item",
    framing:
      "A shopping cart UI wants to highlight the first product the shopper added exactly once — a gentle nudge toward items they might have meant to buy in bulk. Given the ordered list of product IDs added to the cart, find the first one that appears only a single time.",
    statement:
      "Given an array of integer product IDs in insertion order, return the first ID that occurs exactly once. If every ID repeats, return -1.",
    inputFormat: "An array ids of length n (1 ≤ n ≤ 10^5), each value in [0, 10^9].",
    outputFormat: "A single integer — the first non-repeating ID, or -1 if none exists.",
    constraints: [
      "1 ≤ n ≤ 100,000",
      "0 ≤ ids[i] ≤ 10^9",
      "Order of first appearance defines 'first'",
    ],
    examples: [
      {
        input: "ids = [7, 3, 7, 5, 3, 9]",
        output: "5",
        explanation: "7 and 3 each appear twice. 5 appears once and is earlier in the array than 9, so 5 is returned.",
      },
      {
        input: "ids = [2, 2, 4, 4]",
        output: "-1",
        explanation: "Every ID repeats, so there is no first-unique element.",
      },
    ],
    approach: [
      "A single pass cannot know future repeats, so use two passes with a frequency map.",
      "Pass 1: count occurrences of every ID in a hash map.",
      "Pass 2: walk the array in original order and return the first ID whose count is 1.",
      "The second pass over the original array (not the map) preserves insertion order for free.",
    ],
    solutionSteps: [
      "Build a hash map count from id → number of occurrences.",
      "Iterate ids again from index 0.",
      "Return the first id where count[id] == 1.",
      "If the loop finishes, return -1.",
      "Two linear passes → O(n) time, O(n) space.",
    ],
    code: {
      python: `def first_unique(ids: list[int]) -> int:
    from collections import Counter
    count = Counter(ids)
    for x in ids:
        if count[x] == 1:
            return x
    return -1
`,
      java: `import java.util.HashMap;
import java.util.Map;

public final class CartFirstUniqueItem {
    public static int firstUnique(int[] ids) {
        Map<Integer, Integer> count = new HashMap<>();
        for (int x : ids) count.merge(x, 1, Integer::sum);
        for (int x : ids) if (count.get(x) == 1) return x;
        return -1;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int firstUnique(const vector<int>& ids) {
    unordered_map<int, int> count;
    for (int x : ids) count[x]++;
    for (int x : ids) if (count[x] == 1) return x;
    return -1;
}
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Returning the first element with frequency 1 found while iterating the map — map order is not insertion order, so you must re-scan the original array.",
      "Trying to do it in one pass with a set of 'seen' values — that finds the first non-duplicate-so-far, not the first globally-unique element.",
    ],
    edgeCases: [
      "Single element — it is unique, return it.",
      "All identical — return -1.",
      "Unique element at the very end — still found in pass 2.",
    ],
    whyItMatters:
      "The count-then-scan pattern is the canonical fix for 'first non-repeating' questions (characters, events, IDs). Recognising that order must come from the original array, not the map, is the insight interviewers probe.",
    estimatedMinutes: 15,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 32 — pure_dsa · two_pointers · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "config-token-palindrome",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 3,
    pattern: "two_pointers",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer", "platform_engineer"],
    title: "Config Token Palindrome",
    framing:
      "A config linter flags 'mirror tokens' — identifiers that read the same forwards and backwards once you ignore case and any non-alphanumeric separators. Given a raw token string, decide whether it is a mirror token.",
    statement:
      "Given a string s, return true if it is a palindrome considering only alphanumeric characters and ignoring case, otherwise false.",
    inputFormat: "A string s of length n (1 ≤ n ≤ 2·10^5) containing printable ASCII.",
    outputFormat: "A boolean — true if s is a palindrome under the stated rules.",
    constraints: [
      "1 ≤ n ≤ 200,000",
      "s may contain letters, digits, spaces, and punctuation",
      "Comparison is case-insensitive and ignores non-alphanumeric characters",
    ],
    examples: [
      {
        input: 's = "Race-Car_1 1"',
        output: "false",
        explanation: "Filtered and lowercased: 'racecar11'. Reversed: '11racecar'. They differ, so it is not a palindrome.",
      },
      {
        input: 's = "A man, a plan: a canal — Panama"',
        output: "true",
        explanation: "Filtered and lowercased: 'amanaplanacanalpanama', which reads identically backwards.",
      },
    ],
    approach: [
      "Avoid building a cleaned copy; use two pointers from both ends.",
      "Advance the left pointer past any non-alphanumeric character; retreat the right pointer past any non-alphanumeric character.",
      "Compare the lowercased characters at both pointers; on mismatch, return false.",
      "Move both pointers inward and repeat until they cross.",
    ],
    solutionSteps: [
      "Set left = 0, right = n - 1.",
      "While left < right:",
      "  Skip left forward while s[left] is not alphanumeric.",
      "  Skip right backward while s[right] is not alphanumeric.",
      "  If lower(s[left]) != lower(s[right]) return false.",
      "  left += 1; right -= 1.",
      "Return true. O(n) time, O(1) extra space.",
    ],
    code: {
      python: `def is_mirror_token(s: str) -> bool:
    left, right = 0, len(s) - 1
    while left < right:
        while left < right and not s[left].isalnum():
            left += 1
        while left < right and not s[right].isalnum():
            right -= 1
        if s[left].lower() != s[right].lower():
            return False
        left += 1
        right -= 1
    return True
`,
      java: `public final class ConfigTokenPalindrome {
    public static boolean isMirror(String s) {
        int left = 0, right = s.length() - 1;
        while (left < right) {
            while (left < right && !Character.isLetterOrDigit(s.charAt(left))) left++;
            while (left < right && !Character.isLetterOrDigit(s.charAt(right))) right--;
            if (Character.toLowerCase(s.charAt(left)) != Character.toLowerCase(s.charAt(right)))
                return false;
            left++;
            right--;
        }
        return true;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

bool isMirror(const string& s) {
    int left = 0, right = (int)s.size() - 1;
    while (left < right) {
        while (left < right && !isalnum((unsigned char)s[left])) left++;
        while (left < right && !isalnum((unsigned char)s[right])) right--;
        if (tolower((unsigned char)s[left]) != tolower((unsigned char)s[right]))
            return false;
        left++;
        right--;
    }
    return true;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Forgetting the inner left < right guard while skipping — a string of all punctuation can push pointers past each other.",
      "Comparing without normalising case.",
      "Allocating a filtered string — correct but O(n) extra space; the two-pointer form is the expected O(1) answer.",
    ],
    edgeCases: [
      "Empty-after-filtering string (e.g. '.,') — treated as a palindrome (true).",
      "Single alphanumeric character — palindrome.",
      "Mixed case mirror like 'Aa' — true.",
    ],
    whyItMatters:
      "Two-pointer palindrome checking with character filtering is a rite-of-passage warm-up. It tests pointer discipline and in-place reasoning without any data structure.",
    estimatedMinutes: 15,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 33 — pure_dsa · sliding_window · easy · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "peak-traffic-window",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 3,
    pattern: "sliding_window",
    difficulty: "easy",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer", "devops_sre"],
    title: "Peak Traffic Window",
    framing:
      "A capacity-planning dashboard reports the busiest k-minute stretch of the day. Given per-minute request counts, find the maximum total requests across any contiguous window of exactly k minutes.",
    statement:
      "Given an array counts of length n and an integer k (1 ≤ k ≤ n), return the maximum sum of any contiguous subarray of length exactly k.",
    inputFormat: "Integers n (1 ≤ n ≤ 10^5) and k (1 ≤ k ≤ n), and an array counts of n integers (0 ≤ counts[i] ≤ 10^6).",
    outputFormat: "A single integer — the maximum window sum.",
    constraints: [
      "1 ≤ k ≤ n ≤ 100,000",
      "0 ≤ counts[i] ≤ 1,000,000",
      "Window length is exactly k (not 'at most k')",
    ],
    examples: [
      {
        input: "counts = [2, 1, 5, 1, 3, 2], k = 3",
        output: "9",
        explanation: "Windows of size 3 sum to 8, 7, 9, 6. The window [5,1,3] gives the maximum, 9.",
      },
      {
        input: "counts = [4, 4, 4], k = 2",
        output: "8",
        explanation: "Both size-2 windows sum to 8.",
      },
    ],
    approach: [
      "Recomputing each window from scratch is O(n·k); instead slide a fixed-width window.",
      "Compute the sum of the first k elements.",
      "Slide right one step at a time: add the entering element, subtract the leaving element.",
      "Track the running maximum across all window positions.",
    ],
    solutionSteps: [
      "windowSum = sum(counts[0..k-1]); best = windowSum.",
      "For i from k to n - 1:",
      "  windowSum += counts[i] - counts[i - k].",
      "  best = max(best, windowSum).",
      "Return best.",
      "O(n) time, O(1) space.",
    ],
    code: {
      python: `def peak_traffic(counts: list[int], k: int) -> int:
    window = sum(counts[:k])
    best = window
    for i in range(k, len(counts)):
        window += counts[i] - counts[i - k]
        best = max(best, window)
    return best
`,
      java: `public final class PeakTrafficWindow {
    public static long peak(int[] counts, int k) {
        long window = 0;
        for (int i = 0; i < k; i++) window += counts[i];
        long best = window;
        for (int i = k; i < counts.length; i++) {
            window += counts[i] - counts[i - k];
            best = Math.max(best, window);
        }
        return best;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

long long peakTraffic(const vector<int>& counts, int k) {
    long long window = 0;
    for (int i = 0; i < k; ++i) window += counts[i];
    long long best = window;
    for (int i = k; i < (int)counts.size(); ++i) {
        window += counts[i] - counts[i - k];
        best = max(best, window);
    }
    return best;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Recomputing the full window sum every step — O(n·k) and times out at n = 10^5.",
      "Integer overflow: with n = 10^5 values up to 10^6, sums reach ~10^11 — use 64-bit accumulators (Java/C++).",
      "Off-by-one on the leaving index: subtract counts[i - k], not counts[i - k + 1].",
    ],
    edgeCases: [
      "k == n — single window, answer is the total sum.",
      "k == 1 — answer is the maximum single element.",
      "All zeros — answer 0.",
    ],
    whyItMatters:
      "Fixed-width sliding window is the simplest window variant and the foundation for the variable-width family. Add/subtract-on-slide is the move every windowing question reuses.",
    estimatedMinutes: 15,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 34 — pure_dsa · stack_queue · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "json-bracket-validate",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 3,
    pattern: "stack_queue",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer", "full_stack_engineer"],
    title: "JSON Bracket Validate",
    framing:
      "A lightweight JSON pre-validator checks that all the structural brackets in a payload are balanced before the heavier parser runs. Given a string of only the bracket characters () [] {}, decide whether every opener has a correctly ordered matching closer.",
    statement:
      "Given a string s containing only the characters '(', ')', '[', ']', '{', '}', return true if the brackets are balanced and correctly nested, otherwise false.",
    inputFormat: "A string s of length n (0 ≤ n ≤ 10^5) of bracket characters only.",
    outputFormat: "A boolean — true if balanced.",
    constraints: [
      "0 ≤ n ≤ 100,000",
      "s contains only the six bracket characters",
      "An empty string is considered balanced",
    ],
    examples: [
      {
        input: 's = "{[()]}"',
        output: "true",
        explanation: "Each opener is closed by the matching type in the correct nested order.",
      },
      {
        input: 's = "([)]"',
        output: "false",
        explanation: "The ')' tries to close '[', a type mismatch, so the nesting is invalid.",
      },
    ],
    approach: [
      "Use a stack of expected closers.",
      "On an opener, push its matching closer.",
      "On a closer, it must equal the top of the stack (which we pop); otherwise the string is invalid.",
      "After processing all characters the stack must be empty.",
    ],
    solutionSteps: [
      "Map each opener to its closer: ( → ), [ → ], { → }.",
      "Iterate characters. If c is an opener, push its closer.",
      "Else (c is a closer): if stack is empty or pop() != c, return false.",
      "At the end return true only if the stack is empty.",
      "O(n) time, O(n) space.",
    ],
    code: {
      python: `def valid_brackets(s: str) -> bool:
    pairs = {"(": ")", "[": "]", "{": "}"}
    stack: list[str] = []
    for c in s:
        if c in pairs:
            stack.append(pairs[c])
        else:
            if not stack or stack.pop() != c:
                return False
    return not stack
`,
      java: `import java.util.ArrayDeque;
import java.util.Deque;

public final class JsonBracketValidate {
    public static boolean valid(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '(') stack.push(')');
            else if (c == '[') stack.push(']');
            else if (c == '{') stack.push('}');
            else if (stack.isEmpty() || stack.pop() != c) return false;
        }
        return stack.isEmpty();
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

bool validBrackets(const string& s) {
    stack<char> st;
    for (char c : s) {
        if (c == '(') st.push(')');
        else if (c == '[') st.push(']');
        else if (c == '{') st.push('}');
        else {
            if (st.empty() || st.top() != c) return false;
            st.pop();
        }
    }
    return st.empty();
}
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Forgetting the final emptiness check — '(((' would otherwise pass.",
      "Popping from an empty stack on a leading closer like ')' — must guard first.",
      "Counting brackets instead of matching types — '([)]' has balanced counts but invalid nesting.",
    ],
    edgeCases: [
      "Empty string → true.",
      "Single closer ')' → false (stack empty on pop).",
      "Single opener '(' → false (stack non-empty at end).",
    ],
    whyItMatters:
      "Balanced-brackets is the textbook stack problem and a building block for expression parsing, syntax highlighting, and compiler front-ends. The push-the-expected-closer trick keeps the matching logic trivially simple.",
    estimatedMinutes: 15,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 35 — pure_dsa · binary_search · easy · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "first-failing-build",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 3,
    pattern: "binary_search",
    difficulty: "easy",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "devops_sre", "software_engineer"],
    title: "First Failing Build",
    framing:
      "A CI pipeline produced builds numbered 1..n. At some point a regression was introduced, and every build from that point onward fails. You can call isBad(build) to test any build. Find the first failing build with as few checks as possible.",
    statement:
      "Builds 1..n are 'good' then 'bad' (monotonic: once bad, always bad). Given n and an oracle isBad(x), return the smallest x for which isBad(x) is true. It is guaranteed at least one build is bad.",
    inputFormat: "An integer n (1 ≤ n ≤ 2^31 − 1) and a predicate isBad(x) returning a boolean.",
    outputFormat: "The smallest build number x with isBad(x) == true.",
    constraints: [
      "1 ≤ n ≤ 2,147,483,647",
      "isBad is monotonic: false...false,true...true",
      "At least one build is bad",
      "Minimise the number of isBad calls (O(log n))",
    ],
    examples: [
      {
        input: "n = 5, bad builds = {4, 5}",
        output: "4",
        explanation: "isBad(1..3) are false, isBad(4) and isBad(5) are true. The first true is build 4.",
      },
      {
        input: "n = 1, bad builds = {1}",
        output: "1",
        explanation: "Only one build and it is bad.",
      },
    ],
    approach: [
      "Binary search for the boundary between the good prefix and the bad suffix.",
      "Maintain [lo, hi]; the answer is the leftmost x where isBad(x) holds.",
      "If isBad(mid) is true, the answer is at mid or to its left → hi = mid.",
      "Otherwise the answer is strictly right → lo = mid + 1.",
      "Use mid = lo + (hi - lo) / 2 to avoid overflow at n near 2^31.",
    ],
    solutionSteps: [
      "lo = 1, hi = n.",
      "While lo < hi:",
      "  mid = lo + (hi - lo) / 2.",
      "  If isBad(mid): hi = mid. Else: lo = mid + 1.",
      "Return lo.",
      "O(log n) calls, O(1) space.",
    ],
    code: {
      python: `def first_bad_build(n: int, is_bad) -> int:
    lo, hi = 1, n
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if is_bad(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo
`,
      java: `import java.util.function.IntPredicate;

public final class FirstFailingBuild {
    public static int firstBad(int n, IntPredicate isBad) {
        int lo = 1, hi = n;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (isBad.test(mid)) hi = mid;
            else lo = mid + 1;
        }
        return lo;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int firstBadBuild(int n, const function<bool(int)>& isBad) {
    int lo = 1, hi = n;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (isBad(mid)) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}
`,
    },
    complexity: { time: "O(log n)", space: "O(1)" },
    pitfalls: [
      "Computing mid as (lo + hi) / 2 — overflows when n is near 2^31 in fixed-width languages.",
      "Using hi = mid - 1 when isBad(mid) is true — can skip the actual boundary.",
      "Looping while lo <= hi with this update — risks an infinite loop; lo < hi with hi = mid converges.",
    ],
    edgeCases: [
      "All builds bad — answer 1.",
      "Only the last build bad — answer n.",
      "n = 1 — answer 1.",
    ],
    whyItMatters:
      "'Find the first true in a monotonic predicate' is binary search's most useful real-world shape — bisecting a regression, finding a threshold, git bisect itself. The boundary-converging template (hi = mid) generalises far beyond sorted arrays.",
    estimatedMinutes: 15,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 36 — pure_dsa · linked_list · easy · mobile_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "playlist-middle-track",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 3,
    pattern: "linked_list",
    difficulty: "easy",
    primaryRole: "mobile_engineer",
    roles: ["mobile_engineer", "software_engineer", "frontend_engineer"],
    title: "Playlist Middle Track",
    framing:
      "A music app shows a 'jump to middle' control on long playlists. The playlist is a singly linked list of tracks and the app does not store its length. Return the middle track in a single pass — for an even number of tracks, return the second of the two middle tracks.",
    statement:
      "Given the head of a singly linked list, return the middle node. If there are two middle nodes (even length), return the second one.",
    inputFormat: "The head of a singly linked list with n nodes (1 ≤ n ≤ 10^5).",
    outputFormat: "The middle node (reference to the node, value shown in examples).",
    constraints: [
      "1 ≤ n ≤ 100,000",
      "Length is not known in advance",
      "Single pass preferred (no length pre-count)",
    ],
    examples: [
      {
        input: "list = 10 → 20 → 30 → 40 → 50",
        output: "30",
        explanation: "Odd length 5; the middle (index 2) holds 30.",
      },
      {
        input: "list = 10 → 20 → 30 → 40",
        output: "30",
        explanation: "Even length 4; the two middles are 20 and 30 — return the second, 30.",
      },
    ],
    approach: [
      "Use the fast/slow (tortoise/hare) two-pointer technique.",
      "Advance slow by one and fast by two on each step.",
      "When fast reaches the end (or null beyond it), slow sits on the middle.",
      "For even length, this convention lands slow on the second middle.",
    ],
    solutionSteps: [
      "slow = head, fast = head.",
      "While fast and fast.next are not null:",
      "  slow = slow.next; fast = fast.next.next.",
      "Return slow.",
      "O(n) time, O(1) space — one pass, no counter.",
    ],
    code: {
      python: `class ListNode:
    def __init__(self, val: int = 0, nxt: "ListNode | None" = None):
        self.val = val
        self.next = nxt

def middle_node(head: ListNode | None) -> ListNode | None:
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow
`,
      java: `public final class PlaylistMiddleTrack {
    public static final class ListNode {
        int val; ListNode next;
        ListNode(int val) { this.val = val; }
    }
    public static ListNode middleNode(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        return slow;
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

ListNode* middleNode(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    return slow;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Loop condition fast != null && fast.next != null — dropping either check dereferences null on even/odd lengths.",
      "Returning the first middle on even length — the spec asks for the second.",
      "Pre-counting length then walking n/2 — two passes; the fast/slow trick is the one-pass answer.",
    ],
    edgeCases: [
      "Single node — it is the middle.",
      "Two nodes — return the second.",
      "Even vs odd length convention.",
    ],
    whyItMatters:
      "Fast/slow pointers underpin cycle detection, finding the kth-from-end, and splitting a list for merge sort. Middle-of-list is the cleanest place to internalise the technique.",
    estimatedMinutes: 15,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 37 — pure_dsa · trees · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "org-chart-depth",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 3,
    pattern: "trees",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "software_engineer", "full_stack_engineer"],
    title: "Org Chart Depth",
    framing:
      "An HR tool renders an org chart as a binary tree of reporting lines and wants to size the canvas before drawing. Compute the maximum depth — the number of nodes on the longest path from the CEO (root) down to any leaf employee.",
    statement:
      "Given the root of a binary tree, return its maximum depth: the number of nodes along the longest root-to-leaf path.",
    inputFormat: "The root of a binary tree with n nodes (0 ≤ n ≤ 10^5). An empty tree has root = null.",
    outputFormat: "A single integer — the maximum depth (0 for an empty tree).",
    constraints: [
      "0 ≤ n ≤ 100,000",
      "Each node has at most two children",
      "Depth counts nodes, not edges",
    ],
    examples: [
      {
        input: "tree = [3, 9, 20, null, null, 15, 7]",
        output: "3",
        explanation: "Root 3 → 20 → 15 (or 7) is the longest path, with 3 nodes.",
      },
      {
        input: "tree = []",
        output: "0",
        explanation: "An empty tree has depth 0.",
      },
    ],
    approach: [
      "Depth of a tree = 1 + max(depth of left subtree, depth of right subtree).",
      "Base case: a null node has depth 0.",
      "Recurse on both children and combine.",
      "An explicit stack (DFS) or queue (BFS level count) avoids recursion-depth limits on skewed trees.",
    ],
    solutionSteps: [
      "If node is null, return 0.",
      "Recursively compute leftDepth and rightDepth.",
      "Return 1 + max(leftDepth, rightDepth).",
      "For very deep skewed trees, prefer an iterative BFS that counts levels to avoid stack overflow.",
      "O(n) time, O(h) space for recursion (h = height).",
    ],
    code: {
      python: `from collections import deque

class TreeNode:
    def __init__(self, val: int = 0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def max_depth(root: TreeNode | None) -> int:
    if not root:
        return 0
    depth = 0
    q = deque([root])
    while q:
        depth += 1
        for _ in range(len(q)):
            node = q.popleft()
            if node.left:
                q.append(node.left)
            if node.right:
                q.append(node.right)
    return depth
`,
      java: `import java.util.ArrayDeque;
import java.util.Queue;

public final class OrgChartDepth {
    public static final class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int v) { val = v; }
    }
    public static int maxDepth(TreeNode root) {
        if (root == null) return 0;
        int depth = 0;
        Queue<TreeNode> q = new ArrayDeque<>();
        q.add(root);
        while (!q.isEmpty()) {
            depth++;
            for (int sz = q.size(); sz > 0; sz--) {
                TreeNode node = q.poll();
                if (node.left != null) q.add(node.left);
                if (node.right != null) q.add(node.right);
            }
        }
        return depth;
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

int maxDepth(TreeNode* root) {
    if (!root) return 0;
    int depth = 0;
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        depth++;
        for (int sz = (int)q.size(); sz > 0; --sz) {
            TreeNode* node = q.front(); q.pop();
            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }
    }
    return depth;
}
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Counting edges instead of nodes — a single-node tree has depth 1, not 0.",
      "Recursive DFS on a 10^5-deep skewed tree overflows the call stack; iterative BFS is safer.",
      "Returning max of children without the +1 for the current node.",
    ],
    edgeCases: [
      "Empty tree → 0.",
      "Single node → 1.",
      "Completely skewed (linked-list shaped) tree → n.",
    ],
    whyItMatters:
      "Tree height is the 'hello world' of tree recursion and the basis for balance checks, diameter, and level-order rendering. The BFS level-count variant doubles as a safe pattern for deep trees.",
    estimatedMinutes: 15,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 38 — pure_dsa · heap_priority_queue · easy · devops_sre
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "top-error-codes",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 3,
    pattern: "heap_priority_queue",
    difficulty: "easy",
    primaryRole: "devops_sre",
    roles: ["devops_sre", "backend_engineer", "data_engineer"],
    title: "Top Error Codes",
    framing:
      "An incident dashboard surfaces the k most frequent error codes from the last hour of logs. Given the list of error codes seen and an integer k, return the k codes that occurred most often, in any order.",
    statement:
      "Given an array codes of length n and an integer k, return the k most frequent values. It is guaranteed the answer is unique (no ties span the k-th boundary).",
    inputFormat: "Integers n (1 ≤ n ≤ 10^5) and k (1 ≤ k ≤ number of distinct codes), and an array codes of n integers.",
    outputFormat: "An array of k integers — the most frequent codes (any order).",
    constraints: [
      "1 ≤ k ≤ number of distinct values ≤ n ≤ 100,000",
      "The k-th boundary is unambiguous",
      "Output order does not matter",
    ],
    examples: [
      {
        input: "codes = [500, 500, 404, 500, 404, 503], k = 2",
        output: "[500, 404]",
        explanation: "500 appears 3 times, 404 twice, 503 once. The two most frequent are 500 and 404.",
      },
      {
        input: "codes = [429], k = 1",
        output: "[429]",
        explanation: "Only one code; it is the most frequent.",
      },
    ],
    approach: [
      "Count frequencies in a hash map.",
      "Maintain a min-heap of size k keyed by frequency.",
      "Push each (freq, code); if the heap exceeds k, pop the smallest frequency.",
      "The heap then holds the k most frequent. O(d log k) where d is the number of distinct codes.",
    ],
    solutionSteps: [
      "Build freq = map from code → count.",
      "For each (code, f) in freq: push (f, code) onto a min-heap; if size > k, pop.",
      "Drain the heap into the result array.",
      "Return the result.",
      "O(n + d log k) time, O(d) space.",
    ],
    code: {
      python: `import heapq
from collections import Counter

def top_k_codes(codes: list[int], k: int) -> list[int]:
    freq = Counter(codes)
    heap: list[tuple[int, int]] = []
    for code, f in freq.items():
        heapq.heappush(heap, (f, code))
        if len(heap) > k:
            heapq.heappop(heap)
    return [code for _, code in heap]
`,
      java: `import java.util.*;

public final class TopErrorCodes {
    public static int[] topK(int[] codes, int k) {
        Map<Integer, Integer> freq = new HashMap<>();
        for (int c : codes) freq.merge(c, 1, Integer::sum);
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> a[1] - b[1]);
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

vector<int> topKCodes(const vector<int>& codes, int k) {
    unordered_map<int, int> freq;
    for (int c : codes) freq[c]++;
    using P = pair<int, int>; // (frequency, code)
    priority_queue<P, vector<P>, greater<P>> heap;
    for (auto& [code, f] : freq) {
        heap.push({f, code});
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
      "Using a max-heap of all distinct codes then popping k — O(d log d); the size-k min-heap is cheaper when k ≪ d.",
      "Sorting the whole frequency map — O(d log d), acceptable but not optimal.",
      "Keying the heap by code instead of frequency.",
    ],
    edgeCases: [
      "k equals the number of distinct codes — return them all.",
      "Single distinct code — return it.",
      "All codes identical — that one code is the answer for k = 1.",
    ],
    whyItMatters:
      "Top-k by frequency is one of the most asked heap questions and a direct model for trending topics, hot keys, and leaderboards. The size-k min-heap is the canonical streaming-friendly answer.",
    estimatedMinutes: 18,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 39 — pure_dsa · greedy · easy · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "release-hop-reachable",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 3,
    pattern: "greedy",
    difficulty: "easy",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer", "platform_engineer"],
    title: "Release Hop Reachable",
    framing:
      "A migration tool upgrades through release versions 0..n-1. From version i it can hop forward up to hops[i] versions in one migration step. Starting at version 0, decide whether it can reach the final version n-1.",
    statement:
      "Given an array hops where hops[i] is the maximum forward jump from index i, return true if you can reach the last index starting from index 0.",
    inputFormat: "An array hops of length n (1 ≤ n ≤ 10^5), each value in [0, 10^5].",
    outputFormat: "A boolean — true if the last index is reachable.",
    constraints: [
      "1 ≤ n ≤ 100,000",
      "0 ≤ hops[i] ≤ 100,000",
      "Start at index 0; target is index n - 1",
    ],
    examples: [
      {
        input: "hops = [2, 3, 1, 1, 4]",
        output: "true",
        explanation: "From 0 jump to 1, from 1 jump 3 to reach index 4. Reachable.",
      },
      {
        input: "hops = [3, 2, 1, 0, 4]",
        output: "false",
        explanation: "Every path lands on index 3 whose hop is 0, stranding before index 4.",
      },
    ],
    approach: [
      "Greedily track the farthest index reachable so far.",
      "Scan left to right; at index i, if i is beyond the current reach, the gap is unbridgeable → false.",
      "Otherwise update reach = max(reach, i + hops[i]).",
      "If reach ever covers the last index, return true.",
    ],
    solutionSteps: [
      "reach = 0.",
      "For i from 0 to n - 1:",
      "  If i > reach: return false (cannot stand on i).",
      "  reach = max(reach, i + hops[i]).",
      "  If reach >= n - 1: return true.",
      "Return true. O(n) time, O(1) space.",
    ],
    code: {
      python: `def can_reach_last(hops: list[int]) -> bool:
    reach = 0
    last = len(hops) - 1
    for i, h in enumerate(hops):
        if i > reach:
            return False
        reach = max(reach, i + h)
        if reach >= last:
            return True
    return True
`,
      java: `public final class ReleaseHopReachable {
    public static boolean canReach(int[] hops) {
        int reach = 0, last = hops.length - 1;
        for (int i = 0; i < hops.length; i++) {
            if (i > reach) return false;
            reach = Math.max(reach, i + hops[i]);
            if (reach >= last) return true;
        }
        return true;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

bool canReachLast(const vector<int>& hops) {
    int reach = 0, last = (int)hops.size() - 1;
    for (int i = 0; i < (int)hops.size(); ++i) {
        if (i > reach) return false;
        reach = max(reach, i + hops[i]);
        if (reach >= last) return true;
    }
    return true;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Trying every jump recursively — exponential; the greedy reach scan is linear.",
      "Forgetting the i > reach stranded check, which is the whole correctness argument.",
      "Off-by-one: target is index n - 1, not n.",
    ],
    edgeCases: [
      "Single element — already at the last index, return true.",
      "Leading zero with n > 1 — hops[0] == 0 strands immediately → false.",
      "Large first hop covering the whole array → true on the first iteration.",
    ],
    whyItMatters:
      "The 'jump game' is the canonical greedy-reachability proof: a local max update yields a global guarantee. The same farthest-reach idea drives interval covering and minimum-jumps variants.",
    estimatedMinutes: 18,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 40 — pure_dsa · intervals · easy · devops_sre
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "maintenance-window-merge",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 3,
    pattern: "intervals",
    difficulty: "easy",
    primaryRole: "devops_sre",
    roles: ["devops_sre", "backend_engineer", "platform_engineer"],
    title: "Maintenance Window Merge",
    framing:
      "A status page lists scheduled maintenance windows, but overlapping windows confuse users. Merge all overlapping or touching windows into the minimal set of non-overlapping intervals before publishing.",
    statement:
      "Given a list of intervals [start, end], merge all overlapping intervals (intervals that touch at an endpoint also merge) and return the merged list sorted by start.",
    inputFormat: "An array of n intervals (1 ≤ n ≤ 10^5), each [start, end] with 0 ≤ start ≤ end ≤ 10^9.",
    outputFormat: "An array of merged, non-overlapping intervals sorted ascending by start.",
    constraints: [
      "1 ≤ n ≤ 100,000",
      "0 ≤ start ≤ end ≤ 10^9",
      "Touching intervals (e.g. [1,3] and [3,5]) merge into one",
    ],
    examples: [
      {
        input: "intervals = [[1,3],[2,6],[8,10],[15,18]]",
        output: "[[1,6],[8,10],[15,18]]",
        explanation: "[1,3] and [2,6] overlap → [1,6]. The other two do not overlap anything.",
      },
      {
        input: "intervals = [[1,4],[4,5]]",
        output: "[[1,5]]",
        explanation: "They touch at 4, so they merge into [1,5].",
      },
    ],
    approach: [
      "Sort intervals by start.",
      "Walk through them keeping the current merged interval.",
      "If the next start ≤ current end, extend current end to max(current end, next end).",
      "Otherwise close the current interval and start a new one.",
    ],
    solutionSteps: [
      "Sort intervals ascending by start.",
      "Initialise result with the first interval.",
      "For each subsequent [s, e]:",
      "  If s <= result.last.end: result.last.end = max(result.last.end, e).",
      "  Else: append [s, e] to result.",
      "Return result. O(n log n) time (sort dominates), O(n) output.",
    ],
    code: {
      python: `def merge_windows(intervals: list[list[int]]) -> list[list[int]]:
    intervals.sort(key=lambda x: x[0])
    merged: list[list[int]] = [intervals[0][:]]
    for s, e in intervals[1:]:
        if s <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])
    return merged
`,
      java: `import java.util.*;

public final class MaintenanceWindowMerge {
    public static int[][] merge(int[][] intervals) {
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> merged = new ArrayList<>();
        merged.add(new int[]{intervals[0][0], intervals[0][1]});
        for (int i = 1; i < intervals.length; i++) {
            int[] last = merged.get(merged.size() - 1);
            if (intervals[i][0] <= last[1]) {
                last[1] = Math.max(last[1], intervals[i][1]);
            } else {
                merged.add(new int[]{intervals[i][0], intervals[i][1]});
            }
        }
        return merged.toArray(new int[0][]);
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<vector<int>> mergeWindows(vector<vector<int>> intervals) {
    sort(intervals.begin(), intervals.end());
    vector<vector<int>> merged;
    merged.push_back(intervals[0]);
    for (size_t i = 1; i < intervals.size(); ++i) {
        if (intervals[i][0] <= merged.back()[1]) {
            merged.back()[1] = max(merged.back()[1], intervals[i][1]);
        } else {
            merged.push_back(intervals[i]);
        }
    }
    return merged;
}
`,
    },
    complexity: { time: "O(n log n)", space: "O(n)" },
    pitfalls: [
      "Forgetting to sort first — merging only works on start-ordered intervals.",
      "Using strict < for the overlap test, which fails to merge touching intervals like [1,3] and [3,5].",
      "Extending with next end blindly instead of max(current end, next end) — a contained interval would shrink the merge.",
    ],
    edgeCases: [
      "Single interval — returned unchanged.",
      "Fully nested interval (e.g. [1,10] then [2,3]) — stays [1,10].",
      "All identical intervals — collapse to one.",
    ],
    whyItMatters:
      "Interval merging is the gateway to the entire intervals family — insert, overlap-count, meeting rooms. Sort-then-sweep with a running 'current' interval is the reusable skeleton.",
    estimatedMinutes: 18,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 41 — pure_dsa · bit_manipulation · easy · security_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "set-bit-permission-count",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 3,
    pattern: "bit_manipulation",
    difficulty: "easy",
    primaryRole: "security_engineer",
    roles: ["security_engineer", "backend_engineer", "platform_engineer"],
    title: "Set Bit Permission Count",
    framing:
      "An authorization layer packs a user's granted permissions into a 32-bit mask, one bit per permission. An audit needs to report how many permissions each user holds — i.e. how many bits are set in the mask.",
    statement:
      "Given a non-negative 32-bit integer mask, return the number of set bits (its population count / Hamming weight).",
    inputFormat: "A non-negative integer mask (0 ≤ mask ≤ 2^32 − 1).",
    outputFormat: "A single integer — the count of 1-bits.",
    constraints: [
      "0 ≤ mask ≤ 4,294,967,295",
      "Treat the value as an unsigned 32-bit pattern",
    ],
    examples: [
      {
        input: "mask = 11 (binary 1011)",
        output: "3",
        explanation: "1011 has three 1-bits.",
      },
      {
        input: "mask = 0",
        output: "0",
        explanation: "No bits are set.",
      },
    ],
    approach: [
      "Brian Kernighan's trick clears the lowest set bit each iteration.",
      "mask & (mask - 1) removes exactly one set bit.",
      "Count how many times you can do this before the mask is 0.",
      "This runs in O(number of set bits), faster than scanning all 32 positions.",
    ],
    solutionSteps: [
      "count = 0.",
      "While mask != 0:",
      "  mask = mask & (mask - 1)  // clears the lowest set bit.",
      "  count += 1.",
      "Return count.",
      "O(set bits) time, O(1) space.",
    ],
    code: {
      python: `def popcount(mask: int) -> int:
    count = 0
    while mask:
        mask &= mask - 1
        count += 1
    return count
`,
      java: `public final class SetBitPermissionCount {
    public static int popcount(long mask) {
        int count = 0;
        while (mask != 0) {
            mask &= (mask - 1);
            count++;
        }
        return count;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int popcount(unsigned int mask) {
    int count = 0;
    while (mask) {
        mask &= (mask - 1);
        count++;
    }
    return count;
}
`,
    },
    complexity: { time: "O(set bits)", space: "O(1)" },
    pitfalls: [
      "Using a signed shift loop in Java/C++ on a value with the high bit set — arithmetic shift sign-extends and loops forever; use unsigned or the n & (n-1) trick.",
      "Storing a 2^32-1 mask in a 32-bit signed int — use a 64-bit/unsigned type to avoid surprises.",
      "Reaching for a library popcount and being unable to explain it when asked.",
    ],
    edgeCases: [
      "mask = 0 → 0.",
      "All 32 bits set (2^32 − 1) → 32.",
      "Single bit set (power of two) → 1.",
    ],
    whyItMatters:
      "Bit masks are everywhere in permissions, feature flags, and compact state. Kernighan's clear-lowest-bit trick is the elegant answer interviewers want, and it generalises to 'is power of two' and subset enumeration.",
    estimatedMinutes: 12,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 42 — pure_dsa · math_geometry · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "pagination-total-pages",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 3,
    pattern: "math_geometry",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "full_stack_engineer", "frontend_engineer"],
    title: "Pagination Page Count",
    framing:
      "A paginated API needs to tell clients how many pages exist and how many items sit on the final (possibly partial) page. Given the total item count and the page size, compute both without floating-point rounding bugs.",
    statement:
      "Given non-negative integer total and positive integer pageSize, return [pages, lastPageCount] where pages is the number of pages needed (ceil(total / pageSize)) and lastPageCount is the number of items on the last page. If total is 0, return [0, 0].",
    inputFormat: "Integers total (0 ≤ total ≤ 10^18) and pageSize (1 ≤ pageSize ≤ 10^9).",
    outputFormat: "A two-element array [pages, lastPageCount].",
    constraints: [
      "0 ≤ total ≤ 10^18",
      "1 ≤ pageSize ≤ 10^9",
      "Use integer arithmetic only — no floating point",
    ],
    examples: [
      {
        input: "total = 23, pageSize = 10",
        output: "[3, 3]",
        explanation: "23 items over pages of 10 → 3 pages; the last page holds 23 − 20 = 3 items.",
      },
      {
        input: "total = 20, pageSize = 10",
        output: "[2, 10]",
        explanation: "20 divides evenly into 2 full pages; the last page holds a full 10.",
      },
    ],
    approach: [
      "Ceiling division without floats: pages = (total + pageSize - 1) / pageSize.",
      "Guard total == 0 → [0, 0].",
      "lastPageCount = total - (pages - 1) * pageSize, except when total divides evenly, where it equals pageSize.",
      "Equivalently: rem = total % pageSize; lastPageCount = rem == 0 ? pageSize : rem.",
    ],
    solutionSteps: [
      "If total == 0: return [0, 0].",
      "pages = (total + pageSize - 1) / pageSize  (integer division).",
      "rem = total % pageSize.",
      "lastPageCount = rem == 0 ? pageSize : rem.",
      "Return [pages, lastPageCount]. O(1) time and space.",
    ],
    code: {
      python: `def page_count(total: int, page_size: int) -> list[int]:
    if total == 0:
        return [0, 0]
    pages = (total + page_size - 1) // page_size
    rem = total % page_size
    last = page_size if rem == 0 else rem
    return [pages, last]
`,
      java: `public final class PaginationTotalPages {
    public static long[] pageCount(long total, long pageSize) {
        if (total == 0) return new long[]{0, 0};
        long pages = (total + pageSize - 1) / pageSize;
        long rem = total % pageSize;
        long last = (rem == 0) ? pageSize : rem;
        return new long[]{pages, last};
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<long long> pageCount(long long total, long long pageSize) {
    if (total == 0) return {0, 0};
    long long pages = (total + pageSize - 1) / pageSize;
    long long rem = total % pageSize;
    long long last = (rem == 0) ? pageSize : rem;
    return {pages, last};
}
`,
    },
    complexity: { time: "O(1)", space: "O(1)" },
    pitfalls: [
      "Using ceil(total / pageSize) with floating point — precision loss for large totals gives wrong page counts.",
      "(total + pageSize - 1) overflowing 32-bit — use 64-bit types for totals up to 10^18.",
      "Reporting lastPageCount as 0 when total divides evenly — it should be a full pageSize.",
    ],
    edgeCases: [
      "total = 0 → [0, 0].",
      "total exactly divisible by pageSize → last page is full.",
      "total < pageSize → 1 page, last page count = total.",
    ],
    whyItMatters:
      "Integer ceiling division is a deceptively common source of production bugs (off-by-one pages, empty trailing pages). Knowing the (a + b - 1) / b idiom and the even-division edge case shows numerical care.",
    estimatedMinutes: 12,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 43 — pure_dsa · arrays_hashing · easy · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "duplicate-receipt-finder",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 3,
    pattern: "arrays_hashing",
    difficulty: "easy",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer", "software_engineer"],
    title: "Duplicate Receipt Finder",
    framing:
      "A payments reconciliation job ingests a batch of receipt IDs and must flag whether any receipt was double-counted. Given the list of receipt IDs, decide whether any ID appears more than once.",
    statement:
      "Given an array of integer receipt IDs, return true if any value appears at least twice, otherwise false.",
    inputFormat: "An array ids of length n (1 ≤ n ≤ 10^5), each value in [−10^9, 10^9].",
    outputFormat: "A boolean — true if a duplicate exists.",
    constraints: [
      "1 ≤ n ≤ 100,000",
      "−10^9 ≤ ids[i] ≤ 10^9",
      "Return on the first duplicate found",
    ],
    examples: [
      {
        input: "ids = [4, 1, 9, 4, 2]",
        output: "true",
        explanation: "4 appears twice.",
      },
      {
        input: "ids = [4, 1, 9, 2]",
        output: "false",
        explanation: "All IDs are distinct.",
      },
    ],
    approach: [
      "Track values already seen in a hash set.",
      "Iterate once; if a value is already in the set, a duplicate exists → return true.",
      "Otherwise add it and continue.",
      "Early exit on the first duplicate keeps the common case fast.",
    ],
    solutionSteps: [
      "Create an empty hash set seen.",
      "For each id in ids:",
      "  If id in seen: return true.",
      "  Add id to seen.",
      "Return false.",
      "O(n) time, O(n) space.",
    ],
    code: {
      python: `def has_duplicate(ids: list[int]) -> bool:
    seen: set[int] = set()
    for x in ids:
        if x in seen:
            return True
        seen.add(x)
    return False
`,
      java: `import java.util.HashSet;
import java.util.Set;

public final class DuplicateReceiptFinder {
    public static boolean hasDuplicate(int[] ids) {
        Set<Integer> seen = new HashSet<>();
        for (int x : ids) {
            if (!seen.add(x)) return true;
        }
        return false;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

bool hasDuplicate(const vector<int>& ids) {
    unordered_set<int> seen;
    for (int x : ids) {
        if (!seen.insert(x).second) return true;
    }
    return false;
}
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Sorting then scanning neighbours — O(n log n) and mutates input order unnecessarily when a hash set is O(n).",
      "Nested-loop comparison — O(n^2), times out at n = 10^5.",
      "Not exiting early on the first duplicate, doing redundant work.",
    ],
    edgeCases: [
      "Single element → false.",
      "All identical → true (caught on the second element).",
      "Negative IDs — handled, the set keys on value.",
    ],
    whyItMatters:
      "Set-based membership is the most fundamental hashing pattern and the first optimisation candidate whenever an interviewer mentions 'duplicate', 'distinct', or 'seen before'. The O(n) space/time trade is the baseline to discuss.",
    estimatedMinutes: 12,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 44 — pure_dsa · arrays_hashing · medium · data_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "ab-test-group-anagram",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 3,
    pattern: "arrays_hashing",
    difficulty: "medium",
    primaryRole: "data_engineer",
    roles: ["data_engineer", "backend_engineer", "software_engineer"],
    title: "Group Experiment Buckets",
    framing:
      "An experimentation platform labels each user's variant exposure as a short string of feature letters. Two exposures are 'equivalent' when they contain the same letters in any order. Group equivalent exposure strings together for cohort analysis.",
    statement:
      "Given an array of strings, group the strings that are anagrams of one another. Return the groups (the order of groups and of strings within a group does not matter).",
    inputFormat: "An array words of length n (1 ≤ n ≤ 10^4); each word has length up to 100 lowercase letters.",
    outputFormat: "A list of groups, each group a list of strings that are mutual anagrams.",
    constraints: [
      "1 ≤ n ≤ 10,000",
      "Each word length ≤ 100, lowercase a-z only",
      "Group/word order is unconstrained",
    ],
    examples: [
      {
        input: 'words = ["eat","tea","tan","ate","nat","bat"]',
        output: '[["eat","tea","ate"],["tan","nat"],["bat"]]',
        explanation: "eat/tea/ate share letters {a,e,t}; tan/nat share {a,n,t}; bat is alone.",
      },
      {
        input: 'words = ["abc","cba","xyz"]',
        output: '[["abc","cba"],["xyz"]]',
        explanation: "abc and cba are anagrams; xyz is its own group.",
      },
    ],
    approach: [
      "Anagrams share the same multiset of letters, so derive a canonical key per word.",
      "Key option A: the sorted characters of the word.",
      "Key option B (faster): a 26-length count vector serialised to a string.",
      "Bucket words into a hash map keyed by the canonical key; the map values are the groups.",
    ],
    solutionSteps: [
      "Create a hash map groups from key → list of words.",
      "For each word: build a 26-int letter-count array, serialise it to a key string.",
      "Append the word to groups[key].",
      "Return the map's values as the answer.",
      "O(n·L) time (L = max word length) using count keys, O(n·L) space.",
    ],
    code: {
      python: `from collections import defaultdict

def group_anagrams(words: list[str]) -> list[list[str]]:
    groups: dict[tuple[int, ...], list[str]] = defaultdict(list)
    for w in words:
        counts = [0] * 26
        for ch in w:
            counts[ord(ch) - 97] += 1
        groups[tuple(counts)].append(w)
    return list(groups.values())
`,
      java: `import java.util.*;

public final class AbTestGroupAnagram {
    public static List<List<String>> group(String[] words) {
        Map<String, List<String>> groups = new HashMap<>();
        for (String w : words) {
            int[] counts = new int[26];
            for (int i = 0; i < w.length(); i++) counts[w.charAt(i) - 'a']++;
            StringBuilder key = new StringBuilder();
            for (int c : counts) key.append('#').append(c);
            groups.computeIfAbsent(key.toString(), k -> new ArrayList<>()).add(w);
        }
        return new ArrayList<>(groups.values());
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<vector<string>> groupAnagrams(const vector<string>& words) {
    unordered_map<string, vector<string>> groups;
    for (const string& w : words) {
        array<int, 26> counts{};
        for (char ch : w) counts[ch - 'a']++;
        string key;
        for (int c : counts) { key += '#'; key += to_string(c); }
        groups[key].push_back(w);
    }
    vector<vector<string>> out;
    for (auto& [k, v] : groups) out.push_back(move(v));
    return out;
}
`,
    },
    complexity: { time: "O(n·L)", space: "O(n·L)" },
    pitfalls: [
      "Using sorted-string keys (O(n·L log L)) when a 26-count key is O(n·L) — fine for small L but worth knowing.",
      "Building count keys without a separator (e.g. concatenating digits) — counts like [1,11] vs [11,1] collide; use a delimiter.",
      "Comparing every pair of words for anagram-ness — O(n^2·L), far too slow.",
    ],
    edgeCases: [
      "Single word — one group of one.",
      "All words identical — one group.",
      "No anagrams at all — n singleton groups.",
    ],
    whyItMatters:
      "Canonical-key bucketing is the core technique behind dedup, sharding, and equivalence grouping. Choosing a good key (count vector vs sorted string) is a real performance decision interviewers love to probe.",
    estimatedMinutes: 22,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 45 — pure_dsa · two_pointers · medium · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "bandwidth-max-container",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 3,
    pattern: "two_pointers",
    difficulty: "medium",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "backend_engineer", "software_engineer"],
    title: "Max Bandwidth Container",
    framing:
      "A network planner models link capacities as vertical bars on a chart. Picking any two links forms a 'channel' whose usable bandwidth is the shorter of the two heights times the distance between them. Find the maximum bandwidth achievable by any pair.",
    statement:
      "Given an array height of n non-negative integers, choose two indices i < j to maximise min(height[i], height[j]) * (j - i). Return that maximum value.",
    inputFormat: "An array height of length n (2 ≤ n ≤ 10^5), each value in [0, 10^4].",
    outputFormat: "A single integer — the maximum container area.",
    constraints: [
      "2 ≤ n ≤ 100,000",
      "0 ≤ height[i] ≤ 10,000",
      "Width is the index distance j − i",
    ],
    examples: [
      {
        input: "height = [1, 8, 6, 2, 5, 4, 8, 3, 7]",
        output: "49",
        explanation: "Indices 1 and 8 (heights 8 and 7) give min(8,7) * (8−1) = 7 * 7 = 49, the maximum.",
      },
      {
        input: "height = [1, 1]",
        output: "1",
        explanation: "min(1,1) * (1−0) = 1.",
      },
    ],
    approach: [
      "Brute force checks all pairs in O(n^2); instead use two pointers from both ends.",
      "Area is bounded by the shorter wall, so widening cannot help that wall — move the shorter pointer inward.",
      "At each step compute the area and update the maximum.",
      "Moving the taller pointer can only shrink width without raising the limiting height, so it never improves the result.",
    ],
    solutionSteps: [
      "left = 0, right = n - 1, best = 0.",
      "While left < right:",
      "  area = min(height[left], height[right]) * (right - left).",
      "  best = max(best, area).",
      "  If height[left] < height[right]: left += 1; else right -= 1.",
      "Return best. O(n) time, O(1) space.",
    ],
    code: {
      python: `def max_container(height: list[int]) -> int:
    left, right = 0, len(height) - 1
    best = 0
    while left < right:
        area = min(height[left], height[right]) * (right - left)
        best = max(best, area)
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return best
`,
      java: `public final class BandwidthMaxContainer {
    public static int maxArea(int[] height) {
        int left = 0, right = height.length - 1, best = 0;
        while (left < right) {
            int area = Math.min(height[left], height[right]) * (right - left);
            best = Math.max(best, area);
            if (height[left] < height[right]) left++;
            else right--;
        }
        return best;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int maxContainer(const vector<int>& height) {
    int left = 0, right = (int)height.size() - 1, best = 0;
    while (left < right) {
        int area = min(height[left], height[right]) * (right - left);
        best = max(best, area);
        if (height[left] < height[right]) left++;
        else right--;
    }
    return best;
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Moving the taller wall — it can never increase the min-bounded area; always advance the shorter side.",
      "On ties (equal heights), either side may move; moving one is sufficient.",
      "Confusing this with the 'trapping rain water' problem, which has different mechanics.",
    ],
    edgeCases: [
      "Two bars — single candidate.",
      "Strictly increasing heights — widest-then-narrow trade-offs; algorithm still O(n).",
      "Zeros present — areas involving them are 0, ignored by the max.",
    ],
    whyItMatters:
      "Container-with-most-water is the classic 'why does moving the shorter pointer never lose the optimum' proof. That greedy-exchange argument is exactly the reasoning interviewers want you to articulate for two-pointer problems.",
    estimatedMinutes: 22,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 46 — pure_dsa · sliding_window · medium · security_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "unique-session-token-run",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 3,
    pattern: "sliding_window",
    difficulty: "medium",
    primaryRole: "security_engineer",
    roles: ["security_engineer", "backend_engineer", "data_engineer"],
    title: "Longest Unique Token Run",
    framing:
      "A fraud heuristic looks at a stream of single-character action codes within a session and measures the longest run during which no action repeated — a long unique run can indicate scripted, non-human behaviour. Find the length of the longest substring with all distinct characters.",
    statement:
      "Given a string s, return the length of the longest substring that contains no repeated character.",
    inputFormat: "A string s of length n (0 ≤ n ≤ 10^5) of printable ASCII characters.",
    outputFormat: "A single integer — the length of the longest substring without repeats.",
    constraints: [
      "0 ≤ n ≤ 100,000",
      "Characters are arbitrary ASCII",
      "Substring must be contiguous",
    ],
    examples: [
      {
        input: 's = "abcabcbb"',
        output: "3",
        explanation: "The longest run without a repeat is 'abc', length 3.",
      },
      {
        input: 's = "bbbbb"',
        output: "1",
        explanation: "Every character repeats; the best run is a single 'b'.",
      },
    ],
    approach: [
      "Maintain a sliding window [left, right] holding only distinct characters.",
      "Store the last seen index of each character in a map.",
      "When the current character was seen at index ≥ left, jump left to lastSeen + 1.",
      "Track the maximum window width (right - left + 1) as right advances.",
    ],
    solutionSteps: [
      "last = empty map char → index; left = 0; best = 0.",
      "For right from 0 to n - 1, c = s[right]:",
      "  If c in last and last[c] >= left: left = last[c] + 1.",
      "  last[c] = right.",
      "  best = max(best, right - left + 1).",
      "Return best. O(n) time, O(min(n, alphabet)) space.",
    ],
    code: {
      python: `def longest_unique_run(s: str) -> int:
    last: dict[str, int] = {}
    left = best = 0
    for right, c in enumerate(s):
        if c in last and last[c] >= left:
            left = last[c] + 1
        last[c] = right
        best = max(best, right - left + 1)
    return best
`,
      java: `import java.util.HashMap;
import java.util.Map;

public final class UniqueSessionTokenRun {
    public static int longestRun(String s) {
        Map<Character, Integer> last = new HashMap<>();
        int left = 0, best = 0;
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            Integer prev = last.get(c);
            if (prev != null && prev >= left) left = prev + 1;
            last.put(c, right);
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int longestUniqueRun(const string& s) {
    unordered_map<char, int> last;
    int left = 0, best = 0;
    for (int right = 0; right < (int)s.size(); ++right) {
        char c = s[right];
        auto it = last.find(c);
        if (it != last.end() && it->second >= left) left = it->second + 1;
        last[c] = right;
        best = max(best, right - left + 1);
    }
    return best;
}
`,
    },
    complexity: { time: "O(n)", space: "O(min(n, alphabet))" },
    pitfalls: [
      "Forgetting the last[c] >= left guard — a repeat that occurred before the window start must not pull left backward.",
      "Clearing the whole map when a repeat is found — that degrades to O(n^2); only move left.",
      "Off-by-one in width: right - left + 1, not right - left.",
    ],
    edgeCases: [
      "Empty string → 0.",
      "All identical characters → 1.",
      "All distinct characters → n.",
    ],
    whyItMatters:
      "Longest-substring-without-repeats is the archetypal variable-width sliding window with a 'last seen' map. Mastering the left-jump is the key to a whole family of constraint-window problems.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 47 — pure_dsa · stack_queue · medium · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "next-warmer-day-temps",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 3,
    pattern: "stack_queue",
    difficulty: "medium",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "data_engineer", "backend_engineer"],
    title: "Next Warmer Day",
    framing:
      "A weather widget annotates each day with how many days you must wait until a warmer day arrives. Given daily temperatures, produce for each day the number of days until a strictly higher temperature, or 0 if none follows.",
    statement:
      "Given an array temps, return an array answer where answer[i] is the number of days after day i until a warmer temperature. If no warmer day exists, answer[i] = 0.",
    inputFormat: "An array temps of length n (1 ≤ n ≤ 10^5), each value in [−50, 60].",
    outputFormat: "An array of n integers — the wait counts.",
    constraints: [
      "1 ≤ n ≤ 100,000",
      "−50 ≤ temps[i] ≤ 60",
      "'Warmer' means strictly greater",
    ],
    examples: [
      {
        input: "temps = [30, 31, 28, 33, 32]",
        output: "[1, 2, 1, 0, 0]",
        explanation: "Day 0 waits 1 day for 31; day 1 waits 2 days for 33; day 2 waits 1 day for 33; days 3 and 4 have no warmer future day.",
      },
      {
        input: "temps = [40, 40, 40]",
        output: "[0, 0, 0]",
        explanation: "No strictly warmer day ever follows (equal does not count).",
      },
    ],
    approach: [
      "Use a monotonic decreasing stack of indices whose warmer day is still unknown.",
      "Scan left to right; while the current temperature exceeds the temperature at the stack's top index, that day's wait is resolved.",
      "Pop the resolved index and set answer[popped] = i - popped.",
      "Push the current index. Unresolved indices remain 0.",
    ],
    solutionSteps: [
      "answer = array of zeros, length n. stack = empty (holds indices).",
      "For i from 0 to n - 1:",
      "  While stack not empty and temps[i] > temps[stack.top]:",
      "    j = stack.pop(); answer[j] = i - j.",
      "  Push i.",
      "Return answer. Each index is pushed/popped once → O(n) time, O(n) space.",
    ],
    code: {
      python: `def next_warmer(temps: list[int]) -> list[int]:
    answer = [0] * len(temps)
    stack: list[int] = []  # indices, temps decreasing
    for i, t in enumerate(temps):
        while stack and t > temps[stack[-1]]:
            j = stack.pop()
            answer[j] = i - j
        stack.append(i)
    return answer
`,
      java: `import java.util.ArrayDeque;
import java.util.Deque;

public final class NextWarmerDayTemps {
    public static int[] dailyWait(int[] temps) {
        int n = temps.length;
        int[] answer = new int[n];
        Deque<Integer> stack = new ArrayDeque<>();
        for (int i = 0; i < n; i++) {
            while (!stack.isEmpty() && temps[i] > temps[stack.peek()]) {
                int j = stack.pop();
                answer[j] = i - j;
            }
            stack.push(i);
        }
        return answer;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> nextWarmer(const vector<int>& temps) {
    int n = (int)temps.size();
    vector<int> answer(n, 0);
    stack<int> st;
    for (int i = 0; i < n; ++i) {
        while (!st.empty() && temps[i] > temps[st.top()]) {
            int j = st.top(); st.pop();
            answer[j] = i - j;
        }
        st.push(i);
    }
    return answer;
}
`,
    },
    complexity: { time: "O(n)", space: "O(n)" },
    pitfalls: [
      "Using >= instead of > — equal temperatures should not count as warmer.",
      "Storing temperatures instead of indices on the stack — you need indices to compute the day gap.",
      "Nested-loop brute force — O(n^2), times out at n = 10^5.",
    ],
    edgeCases: [
      "Strictly decreasing temps → all zeros.",
      "Strictly increasing temps → all ones except the last (0).",
      "Single day → [0].",
    ],
    whyItMatters:
      "'Next greater element' via a monotonic stack is one of the highest-yield interview patterns — stock spans, histogram areas, and sliding-window maxima all reuse it. Recognising the amortised O(n) push/pop argument is the payoff.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 48 — pure_dsa · binary_search · medium · platform_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "min-shipping-capacity",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 3,
    pattern: "binary_search",
    difficulty: "medium",
    primaryRole: "platform_engineer",
    roles: ["platform_engineer", "backend_engineer", "devops_sre"],
    title: "Min Daily Batch Capacity",
    framing:
      "A pipeline must process an ordered list of job payloads within D days, processing jobs in order and never splitting a job across days. Each day it can process jobs whose total size is at most the worker capacity. Find the minimum capacity that still finishes within D days.",
    statement:
      "Given an array sizes (processed in order) and an integer D, return the minimum capacity C such that the jobs can be partitioned into at most D contiguous groups each with sum ≤ C.",
    inputFormat: "An array sizes of length n (1 ≤ n ≤ 10^5), each in [1, 10^4], and an integer D (1 ≤ D ≤ n).",
    outputFormat: "A single integer — the minimum feasible capacity.",
    constraints: [
      "1 ≤ D ≤ n ≤ 100,000",
      "1 ≤ sizes[i] ≤ 10,000",
      "Jobs are processed in the given order and never split",
    ],
    examples: [
      {
        input: "sizes = [1,2,3,4,5,6,7,8,9,10], D = 5",
        output: "15",
        explanation: "With capacity 15 the days are [1..5], [6,7], [8], [9], [10] (5 days). Any capacity below 15 needs more than 5 days.",
      },
      {
        input: "sizes = [3,2,2,4,1,4], D = 3",
        output: "6",
        explanation: "Capacity 6 gives [3,2],[2,4],[1,4] → 3 days. Capacity 5 would need 4 days.",
      },
    ],
    approach: [
      "The answer lies between max(sizes) (no single job can exceed capacity) and sum(sizes) (one day).",
      "Feasibility is monotonic: if capacity C works, any larger capacity also works → binary search the boundary.",
      "feasible(C): greedily fill days; count how many days a capacity of C requires.",
      "Search for the smallest C with daysNeeded(C) ≤ D.",
    ],
    solutionSteps: [
      "lo = max(sizes), hi = sum(sizes).",
      "While lo < hi:",
      "  mid = lo + (hi - lo) / 2.",
      "  If daysNeeded(mid) <= D: hi = mid. Else: lo = mid + 1.",
      "Return lo.",
      "daysNeeded(C): sweep sizes, start a new day when the running sum would exceed C.",
      "O(n log(sum)) time, O(1) space.",
    ],
    code: {
      python: `def min_capacity(sizes: list[int], D: int) -> int:
    def days_needed(cap: int) -> int:
        days, cur = 1, 0
        for s in sizes:
            if cur + s > cap:
                days += 1
                cur = 0
            cur += s
        return days

    lo, hi = max(sizes), sum(sizes)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if days_needed(mid) <= D:
            hi = mid
        else:
            lo = mid + 1
    return lo
`,
      java: `public final class MinShippingCapacity {
    private static int daysNeeded(int[] sizes, int cap) {
        int days = 1, cur = 0;
        for (int s : sizes) {
            if (cur + s > cap) { days++; cur = 0; }
            cur += s;
        }
        return days;
    }
    public static int minCapacity(int[] sizes, int D) {
        int lo = 0, hi = 0;
        for (int s : sizes) { lo = Math.max(lo, s); hi += s; }
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (daysNeeded(sizes, mid) <= D) hi = mid;
            else lo = mid + 1;
        }
        return lo;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

static int daysNeeded(const vector<int>& sizes, int cap) {
    int days = 1, cur = 0;
    for (int s : sizes) {
        if (cur + s > cap) { days++; cur = 0; }
        cur += s;
    }
    return days;
}

int minCapacity(const vector<int>& sizes, int D) {
    int lo = 0, hi = 0;
    for (int s : sizes) { lo = max(lo, s); hi += s; }
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (daysNeeded(sizes, mid) <= D) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}
`,
    },
    complexity: { time: "O(n log(sum))", space: "O(1)" },
    pitfalls: [
      "Setting lo to 0 or 1 instead of max(sizes) — a capacity below the largest single job is infeasible at any day count.",
      "Binary searching the day count instead of the capacity — the capacity is the monotonic axis.",
      "Greedy day-count bug: increment days then reset cur to 0 before adding the current job.",
    ],
    edgeCases: [
      "D == 1 — answer is the total sum.",
      "D == n — answer is max(sizes).",
      "All sizes equal — capacity is a multiple that packs evenly.",
    ],
    whyItMatters:
      "'Binary search on the answer' is a top-tier interview pattern: when the answer space is monotonic under a feasibility predicate, you bisect it. Capacity/throughput/SLA-threshold tuning is exactly this shape in production.",
    estimatedMinutes: 28,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 49 — pure_dsa · trees · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "audit-tree-range-sum",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 3,
    pattern: "trees",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "data_engineer", "software_engineer"],
    title: "Audit Range Sum",
    framing:
      "Audit records are indexed in a binary search tree keyed by integer timestamp. A compliance query asks for the total of all record values whose timestamp falls within an inclusive [low, high] range. Sum them without visiting irrelevant subtrees.",
    statement:
      "Given the root of a binary search tree (BST) and integers low and high, return the sum of node values whose keys are in the inclusive range [low, high].",
    inputFormat: "The root of a BST with n nodes (0 ≤ n ≤ 10^5), node keys distinct in [0, 10^9], and integers low ≤ high.",
    outputFormat: "A single integer — the sum of in-range node values.",
    constraints: [
      "0 ≤ n ≤ 100,000",
      "BST property holds: left keys < node key < right keys",
      "Range is inclusive of both low and high",
    ],
    examples: [
      {
        input: "tree = [10,5,15,3,7,null,18], low = 7, high = 15",
        output: "32",
        explanation: "Keys in [7,15] are 7, 10, 15 → 7 + 10 + 15 = 32.",
      },
      {
        input: "tree = [10,5,15,3,7,13,18,1,null,6], low = 6, high = 10",
        output: "23",
        explanation: "Keys in [6,10] are 6, 7, 10 → 23.",
      },
    ],
    approach: [
      "Exploit the BST ordering to prune whole subtrees.",
      "If node key < low, the entire left subtree is out of range — recurse right only.",
      "If node key > high, the entire right subtree is out of range — recurse left only.",
      "Otherwise the key is in range: add it and recurse both ways.",
    ],
    solutionSteps: [
      "Define dfs(node):",
      "  If node is null: return 0.",
      "  If node.key < low: return dfs(node.right).",
      "  If node.key > high: return dfs(node.left).",
      "  Return node.val + dfs(node.left) + dfs(node.right).",
      "Return dfs(root). Average O(log n + k) work pruned by the BST; worst case O(n).",
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, key: int, val: int = 0, left=None, right=None):
        self.key = key
        self.val = val
        self.left = left
        self.right = right

def range_sum(root: TreeNode | None, low: int, high: int) -> int:
    if not root:
        return 0
    if root.key < low:
        return range_sum(root.right, low, high)
    if root.key > high:
        return range_sum(root.left, low, high)
    return root.val + range_sum(root.left, low, high) + range_sum(root.right, low, high)
`,
      java: `public final class AuditTreeRangeSum {
    public static final class TreeNode {
        int key, val; TreeNode left, right;
        TreeNode(int key, int val) { this.key = key; this.val = val; }
    }
    public static long rangeSum(TreeNode root, int low, int high) {
        if (root == null) return 0;
        if (root.key < low)  return rangeSum(root.right, low, high);
        if (root.key > high) return rangeSum(root.left, low, high);
        return root.val + rangeSum(root.left, low, high) + rangeSum(root.right, low, high);
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

struct TreeNode {
    int key, val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int k, int v) : key(k), val(v), left(nullptr), right(nullptr) {}
};

long long rangeSum(TreeNode* root, int low, int high) {
    if (!root) return 0;
    if (root->key < low)  return rangeSum(root->right, low, high);
    if (root->key > high) return rangeSum(root->left, low, high);
    return (long long)root->val + rangeSum(root->left, low, high) + rangeSum(root->right, low, high);
}
`,
    },
    complexity: { time: "O(n) worst, pruned in practice", space: "O(h)" },
    pitfalls: [
      "Ignoring the BST property and summing the whole tree — correct but throws away the pruning that makes it efficient.",
      "Pruning the wrong side (recursing left when key < low) — that discards the in-range part.",
      "Deep recursion on a degenerate (linked-list shaped) BST can overflow the stack; an explicit stack avoids it.",
    ],
    edgeCases: [
      "Empty tree → 0.",
      "Range covers everything → full tree sum.",
      "Range matches no key → 0.",
    ],
    whyItMatters:
      "Pruned BST traversal teaches you to use structural invariants to skip work — the same instinct behind interval trees and database range scans. It is a clean test of recursion plus ordering reasoning.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 50 — pure_dsa · graphs · medium · devops_sre
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "cluster-island-count",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 3,
    pattern: "graphs",
    difficulty: "medium",
    primaryRole: "devops_sre",
    roles: ["devops_sre", "platform_engineer", "backend_engineer"],
    title: "Cluster Island Count",
    framing:
      "A datacentre rack map is a grid where 1 marks a powered node and 0 an empty slot. Nodes that are vertically or horizontally adjacent form one connected cluster. Count how many distinct clusters the rack contains.",
    statement:
      "Given a grid of 0s and 1s, return the number of connected components ('islands') of 1s, using 4-directional adjacency.",
    inputFormat: "A grid with r rows and c columns (1 ≤ r, c ≤ 1000), each cell 0 or 1.",
    outputFormat: "A single integer — the number of islands.",
    constraints: [
      "1 ≤ r, c ≤ 1000 (up to 10^6 cells)",
      "Adjacency is 4-directional (up/down/left/right)",
      "Diagonal cells are not connected",
    ],
    examples: [
      {
        input: "grid = [[1,1,0,0],[1,0,0,1],[0,0,1,1]]",
        output: "2",
        explanation: "The top-left L-shape of 1s is one cluster; the bottom-right block (including the cell at row 1, col 3) is the second.",
      },
      {
        input: "grid = [[0,0],[0,0]]",
        output: "0",
        explanation: "No powered nodes, no clusters.",
      },
    ],
    approach: [
      "Scan every cell; when an unvisited 1 is found, it starts a new cluster.",
      "Flood-fill from that cell (BFS or iterative DFS) marking all connected 1s as visited.",
      "Increment the cluster count once per flood-fill.",
      "Use an explicit stack/queue, not recursion, to survive a 10^6-cell grid.",
    ],
    solutionSteps: [
      "count = 0.",
      "For each cell (i, j): if grid[i][j] == 1, increment count and flood-fill.",
      "Flood-fill: push (i,j); while stack non-empty, pop, mark 0, push in-bounds neighbours that are 1.",
      "Return count.",
      "Each cell visited once → O(r·c) time, O(r·c) space worst case.",
    ],
    code: {
      python: `from collections import deque

def count_islands(grid: list[list[int]]) -> int:
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])
    count = 0
    for i in range(rows):
        for j in range(cols):
            if grid[i][j] == 1:
                count += 1
                q = deque([(i, j)])
                grid[i][j] = 0
                while q:
                    r, c = q.popleft()
                    for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nr, nc = r + dr, c + dc
                        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                            grid[nr][nc] = 0
                            q.append((nr, nc))
    return count
`,
      java: `import java.util.ArrayDeque;
import java.util.Deque;

public final class ClusterIslandCount {
    public static int countIslands(int[][] grid) {
        int rows = grid.length, cols = grid[0].length, count = 0;
        int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                if (grid[i][j] == 1) {
                    count++;
                    Deque<int[]> stack = new ArrayDeque<>();
                    stack.push(new int[]{i, j});
                    grid[i][j] = 0;
                    while (!stack.isEmpty()) {
                        int[] cell = stack.pop();
                        for (int[] d : dirs) {
                            int nr = cell[0] + d[0], nc = cell[1] + d[1];
                            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] == 1) {
                                grid[nr][nc] = 0;
                                stack.push(new int[]{nr, nc});
                            }
                        }
                    }
                }
            }
        }
        return count;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int countIslands(vector<vector<int>>& grid) {
    int rows = (int)grid.size(), cols = (int)grid[0].size(), count = 0;
    int dirs[4][2] = {{1,0},{-1,0},{0,1},{0,-1}};
    for (int i = 0; i < rows; ++i) {
        for (int j = 0; j < cols; ++j) {
            if (grid[i][j] == 1) {
                count++;
                stack<pair<int,int>> st;
                st.push({i, j});
                grid[i][j] = 0;
                while (!st.empty()) {
                    auto [r, c] = st.top(); st.pop();
                    for (auto& d : dirs) {
                        int nr = r + d[0], nc = c + d[1];
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] == 1) {
                            grid[nr][nc] = 0;
                            st.push({nr, nc});
                        }
                    }
                }
            }
        }
    }
    return count;
}
`,
    },
    complexity: { time: "O(r·c)", space: "O(r·c)" },
    pitfalls: [
      "Recursive DFS overflowing the stack on a 1000×1000 all-1s grid — use an explicit stack or BFS.",
      "Not marking cells visited as you enqueue them — the same cell gets added multiple times and the count inflates.",
      "Counting diagonal neighbours — the problem is 4-directional only.",
    ],
    edgeCases: [
      "All water → 0.",
      "All land → 1.",
      "Single cell grid → 0 or 1 by its value.",
    ],
    whyItMatters:
      "Number-of-islands is the canonical grid-as-graph flood-fill, underpinning connected-components, region labelling, and infection-spread problems. The 'iterative fill to avoid stack overflow' detail separates careful candidates.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 51 — pure_dsa · dp_1d · medium · mobile_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "non-adjacent-ad-revenue",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 3,
    pattern: "dp_1d",
    difficulty: "medium",
    primaryRole: "mobile_engineer",
    roles: ["mobile_engineer", "frontend_engineer", "software_engineer"],
    title: "Non-Adjacent Ad Revenue",
    framing:
      "An app shows ad slots down a feed, but policy forbids two ads in directly adjacent slots. Each slot has an expected revenue. Choose a subset of non-adjacent slots that maximises total expected revenue.",
    statement:
      "Given an array revenue where revenue[i] is the value of slot i, return the maximum sum obtainable by selecting elements such that no two selected elements are adjacent.",
    inputFormat: "An array revenue of length n (0 ≤ n ≤ 10^5), each value in [0, 10^4].",
    outputFormat: "A single integer — the maximum non-adjacent sum.",
    constraints: [
      "0 ≤ n ≤ 100,000",
      "0 ≤ revenue[i] ≤ 10,000",
      "Selected indices must be pairwise non-adjacent",
    ],
    examples: [
      {
        input: "revenue = [3, 2, 7, 10]",
        output: "13",
        explanation: "Pick slots 0 and 3 (3 + 10 = 13). They are non-adjacent and beat alternatives like slots 0 and 2 (3 + 7 = 10) or slot 3 with slot 1 (10 + 2 = 12).",
      },
      {
        input: "revenue = [5, 1, 1, 5]",
        output: "10",
        explanation: "Pick the two ends (5 + 5 = 10); they are not adjacent.",
      },
    ],
    approach: [
      "Classic 'house robber' DP: at each slot, either skip it (carry the best so far) or take it (best up to two slots back, plus this value).",
      "Let take = best including slot i, skip = best excluding slot i.",
      "Transition: newTake = skip + revenue[i]; newSkip = max(skip, take).",
      "Only the previous two aggregate values are needed → O(1) space.",
    ],
    solutionSteps: [
      "If n == 0 return 0.",
      "incl = 0 (best ending with a taken slot), excl = 0 (best ending skipped).",
      "For each v in revenue:",
      "  newIncl = excl + v; newExcl = max(incl, excl).",
      "  incl = newIncl; excl = newExcl.",
      "Return max(incl, excl). O(n) time, O(1) space.",
    ],
    code: {
      python: `def max_non_adjacent(revenue: list[int]) -> int:
    incl, excl = 0, 0
    for v in revenue:
        incl, excl = excl + v, max(incl, excl)
    return max(incl, excl)
`,
      java: `public final class NonAdjacentAdRevenue {
    public static long maxRevenue(int[] revenue) {
        long incl = 0, excl = 0;
        for (int v : revenue) {
            long newIncl = excl + v;
            long newExcl = Math.max(incl, excl);
            incl = newIncl;
            excl = newExcl;
        }
        return Math.max(incl, excl);
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

long long maxNonAdjacent(const vector<int>& revenue) {
    long long incl = 0, excl = 0;
    for (int v : revenue) {
        long long newIncl = excl + v;
        long long newExcl = max(incl, excl);
        incl = newIncl;
        excl = newExcl;
    }
    return max(incl, excl);
}
`,
    },
    complexity: { time: "O(n)", space: "O(1)" },
    pitfalls: [
      "Greedily taking every other element — fails on [5,1,1,5] vs alternating choices; DP is required.",
      "Updating incl and excl sequentially without snapshotting — newExcl must use the OLD incl/excl, so compute both before assigning.",
      "Forgetting the empty-array case (n = 0 → 0).",
    ],
    edgeCases: [
      "Empty array → 0.",
      "Single element → that element.",
      "All zeros → 0.",
    ],
    whyItMatters:
      "The house-robber recurrence (take vs skip with a 2-step dependency) is one of the most reused 1-D DP shapes — it reappears in deletion games, scheduling, and tree-DP variants. The simultaneous-update subtlety is a frequent bug interviewers watch for.",
    estimatedMinutes: 22,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 52 — ai_applied · linked_list · medium · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "embedding-cache-lru",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 3,
    pattern: "linked_list",
    difficulty: "medium",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "backend_engineer", "platform_engineer"],
    title: "Embedding Cache (LRU)",
    framing:
      "An inference service caches recently computed text embeddings to avoid recomputing them. The cache holds a fixed number of entries; when it fills, the least-recently-used embedding is evicted. Implement the cache with O(1) get and put. (The DSA here is a hash map plus a doubly linked list — the embeddings are just the payload.)",
    statement:
      "Implement an LRUCache with capacity C supporting get(key) → value or -1, and put(key, value). Both must run in O(1) average time. Accessing or inserting a key marks it most-recently-used; inserting beyond capacity evicts the least-recently-used key.",
    inputFormat: "A capacity C (1 ≤ C ≤ 10^5) and a sequence of get/put operations with integer keys and values.",
    outputFormat: "For each get, the stored value or -1 if absent.",
    constraints: [
      "1 ≤ C ≤ 100,000",
      "Keys and values are integers",
      "get and put must be O(1) average",
    ],
    examples: [
      {
        input: "C=2; put(1,10); put(2,20); get(1)→; put(3,30); get(2)→",
        output: "10, then -1",
        explanation: "get(1) returns 10 and marks 1 as recent; put(3,30) evicts the LRU key 2; get(2) is now -1.",
      },
      {
        input: "C=1; put(5,50); put(6,60); get(5)→",
        output: "-1",
        explanation: "Capacity 1: put(6) evicts key 5, so get(5) returns -1.",
      },
    ],
    approach: [
      "Combine a hash map (key → node) with a doubly linked list ordered by recency.",
      "The list head holds the most-recently-used node; the tail holds the least-recently-used.",
      "get: look up the node, unlink it, move it to the head, return its value.",
      "put: if present, update and move to head; else insert at head and, if over capacity, evict the tail node (and its map entry).",
    ],
    solutionSteps: [
      "Maintain dummy head and tail sentinels to avoid null checks.",
      "Helper remove(node): splice node out of the list.",
      "Helper addFront(node): insert node right after head.",
      "get(key): if absent return -1; else remove + addFront, return value.",
      "put(key,val): if present remove old; create node, addFront, store in map; if size > C, evict node before tail and erase its key.",
      "O(1) per operation, O(C) space.",
    ],
    code: {
      python: `class _Node:
    __slots__ = ("key", "val", "prev", "next")
    def __init__(self, key=0, val=0):
        self.key = key
        self.val = val
        self.prev = None
        self.next = None

class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.map: dict[int, _Node] = {}
        self.head = _Node()
        self.tail = _Node()
        self.head.next = self.tail
        self.tail.prev = self.head

    def _remove(self, node: _Node) -> None:
        node.prev.next = node.next
        node.next.prev = node.prev

    def _add_front(self, node: _Node) -> None:
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key: int) -> int:
        if key not in self.map:
            return -1
        node = self.map[key]
        self._remove(node)
        self._add_front(node)
        return node.val

    def put(self, key: int, value: int) -> None:
        if key in self.map:
            self._remove(self.map[key])
        node = _Node(key, value)
        self.map[key] = node
        self._add_front(node)
        if len(self.map) > self.cap:
            lru = self.tail.prev
            self._remove(lru)
            del self.map[lru.key]
`,
      java: `import java.util.HashMap;
import java.util.Map;

public final class EmbeddingCacheLru {
    private static final class Node {
        int key, val; Node prev, next;
        Node(int k, int v) { key = k; val = v; }
    }
    private final int cap;
    private final Map<Integer, Node> map = new HashMap<>();
    private final Node head = new Node(0, 0), tail = new Node(0, 0);

    public EmbeddingCacheLru(int capacity) {
        cap = capacity;
        head.next = tail;
        tail.prev = head;
    }
    private void remove(Node node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }
    private void addFront(Node node) {
        node.next = head.next;
        node.prev = head;
        head.next.prev = node;
        head.next = node;
    }
    public int get(int key) {
        Node node = map.get(key);
        if (node == null) return -1;
        remove(node);
        addFront(node);
        return node.val;
    }
    public void put(int key, int value) {
        if (map.containsKey(key)) remove(map.get(key));
        Node node = new Node(key, value);
        map.put(key, node);
        addFront(node);
        if (map.size() > cap) {
            Node lru = tail.prev;
            remove(lru);
            map.remove(lru.key);
        }
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

class LRUCache {
    struct Node {
        int key, val;
        Node *prev, *next;
        Node(int k, int v) : key(k), val(v), prev(nullptr), next(nullptr) {}
    };
    int cap;
    unordered_map<int, Node*> mp;
    Node *head, *tail;

    void remove(Node* node) {
        node->prev->next = node->next;
        node->next->prev = node->prev;
    }
    void addFront(Node* node) {
        node->next = head->next;
        node->prev = head;
        head->next->prev = node;
        head->next = node;
    }
public:
    LRUCache(int capacity) : cap(capacity) {
        head = new Node(0, 0);
        tail = new Node(0, 0);
        head->next = tail;
        tail->prev = head;
    }
    int get(int key) {
        auto it = mp.find(key);
        if (it == mp.end()) return -1;
        remove(it->second);
        addFront(it->second);
        return it->second->val;
    }
    void put(int key, int value) {
        auto it = mp.find(key);
        if (it != mp.end()) { remove(it->second); delete it->second; }
        Node* node = new Node(key, value);
        mp[key] = node;
        addFront(node);
        if ((int)mp.size() > cap) {
            Node* lru = tail->prev;
            remove(lru);
            mp.erase(lru->key);
            delete lru;
        }
    }
};
`,
    },
    complexity: { time: "O(1) per op", space: "O(C)" },
    pitfalls: [
      "Using a singly linked list — eviction needs O(1) unlink of an arbitrary node, which requires the prev pointer.",
      "Forgetting to delete the evicted key from the hash map — it leaks and corrupts size accounting.",
      "Updating an existing key without moving it to the front — recency tracking breaks.",
    ],
    edgeCases: [
      "Capacity 1 — every put after the first evicts.",
      "put on an existing key — update value and refresh recency, no eviction.",
      "get on a missing key → -1.",
    ],
    whyItMatters:
      "LRU is the most-asked design-flavoured data-structure question and a real component of model-serving stacks (embedding/KV caches). The hash-map-plus-doubly-linked-list pairing is a reusable O(1)-eviction pattern.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 53 — indian_domain · heap_priority_queue · medium · backend_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "irctc-waitlist-promotion",
    version: 1,
    status: "pending_review",
    bucket: "indian_domain",
    batchNo: 3,
    pattern: "heap_priority_queue",
    difficulty: "medium",
    primaryRole: "backend_engineer",
    roles: ["backend_engineer", "platform_engineer", "software_engineer"],
    title: "IRCTC Waitlist Promotion",
    framing:
      "An IRCTC-style railway booking system keeps a waitlist. When seats free up, passengers are confirmed by priority: senior citizens first, then by earliest booking time. Given a stream of seat-release events and the waitlist, output the order in which passengers get confirmed.",
    statement:
      "Given a list of waitlisted passengers, each with (bookingTime, isSenior), and an integer S of seats that free up one at a time, return the passenger indices confirmed in order. Higher priority = senior over non-senior; ties broken by smaller bookingTime; further ties by smaller index.",
    inputFormat: "An array of n passengers (1 ≤ n ≤ 10^5) each as (bookingTime in [0,10^9], isSenior boolean), and an integer S (0 ≤ S ≤ n).",
    outputFormat: "An array of up to S passenger indices in confirmation order.",
    constraints: [
      "1 ≤ n ≤ 100,000",
      "0 ≤ S ≤ n",
      "Priority: senior first; then earliest bookingTime; then smallest index",
    ],
    examples: [
      {
        input: "passengers = [(100,false),(90,true),(95,false)], S = 2",
        output: "[1, 2]",
        explanation: "Passenger 1 is senior → confirmed first. Among non-seniors, index 2 booked at 95 < index 0 at 100, so index 2 is next.",
      },
      {
        input: "passengers = [(50,false),(50,false)], S = 1",
        output: "[0]",
        explanation: "Neither is senior and both booked at 50; the tie breaks on smaller index 0.",
      },
    ],
    approach: [
      "Model priority with a min-heap whose comparator encodes the ordering.",
      "Comparator: seniors before non-seniors; then smaller bookingTime; then smaller index.",
      "Push all passengers, then pop S times to get the confirmation order.",
      "Alternatively, since all are known up front, sort by the same key and take the first S — O(n log n) either way.",
    ],
    solutionSteps: [
      "Build a comparator key (isSenior ? 0 : 1, bookingTime, index) — smaller tuple = higher priority.",
      "Push every passenger into a min-heap ordered by that key.",
      "Pop min S times, collecting indices.",
      "Return the collected indices.",
      "O(n log n) time, O(n) space.",
    ],
    code: {
      python: `import heapq

def confirm_order(passengers: list[tuple[int, bool]], S: int) -> list[int]:
    heap: list[tuple[int, int, int]] = []
    for idx, (booking_time, is_senior) in enumerate(passengers):
        heapq.heappush(heap, (0 if is_senior else 1, booking_time, idx))
    out: list[int] = []
    for _ in range(S):
        if not heap:
            break
        _, _, idx = heapq.heappop(heap)
        out.append(idx)
    return out
`,
      java: `import java.util.*;

public final class IrctcWaitlistPromotion {
    public static int[] confirmOrder(int[] bookingTime, boolean[] isSenior, int S) {
        int n = bookingTime.length;
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> {
            if (a[0] != b[0]) return a[0] - b[0];          // senior flag (0 senior)
            if (a[1] != b[1]) return Integer.compare(a[1], b[1]); // booking time
            return a[2] - b[2];                            // index
        });
        for (int i = 0; i < n; i++) {
            heap.offer(new int[]{ isSenior[i] ? 0 : 1, bookingTime[i], i });
        }
        int count = Math.min(S, n);
        int[] out = new int[count];
        for (int i = 0; i < count; i++) out[i] = heap.poll()[2];
        return out;
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> confirmOrder(const vector<int>& bookingTime, const vector<char>& isSenior, int S) {
    int n = (int)bookingTime.size();
    // tuple: (seniorFlag, bookingTime, index); smaller = higher priority
    using T = tuple<int, int, int>;
    priority_queue<T, vector<T>, greater<T>> heap;
    for (int i = 0; i < n; ++i) {
        heap.push({ isSenior[i] ? 0 : 1, bookingTime[i], i });
    }
    vector<int> out;
    int count = min(S, n);
    for (int i = 0; i < count; ++i) {
        out.push_back(get<2>(heap.top()));
        heap.pop();
    }
    return out;
}
`,
    },
    complexity: { time: "O(n log n)", space: "O(n)" },
    pitfalls: [
      "Encoding senior as 1 and non-senior as 0 in a min-heap — that confirms non-seniors first; seniors must map to the smaller key.",
      "Forgetting the index tie-break, producing non-deterministic order on equal bookingTime.",
      "Building a max-heap and inverting comparisons inconsistently across the three keys.",
    ],
    edgeCases: [
      "S = 0 → empty output.",
      "All seniors → ordering falls back to bookingTime then index.",
      "S = n → full confirmation order of the whole waitlist.",
    ],
    whyItMatters:
      "Multi-key priority ordering via a heap is exactly how real queues (railway waitlists, support tickets, job schedulers) confirm work. Encoding a composite comparator correctly — and picking min- vs max-heap — is the transferable skill.",
    estimatedMinutes: 25,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 54 — pure_dsa · dp_2d · hard · software_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "warehouse-grid-min-path",
    version: 1,
    status: "pending_review",
    bucket: "pure_dsa",
    batchNo: 3,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "software_engineer",
    roles: ["software_engineer", "backend_engineer", "data_engineer"],
    title: "Warehouse Grid Min Path",
    framing:
      "A picking robot crosses a warehouse grid from the top-left bay to the bottom-right shipping dock, moving only right or down. Each cell has a traversal cost (congestion). Find the minimum total cost path.",
    statement:
      "Given an r×c grid of non-negative costs, return the minimum sum of costs along a path from cell (0,0) to (r-1,c-1) moving only right or down.",
    inputFormat: "A grid with r rows and c columns (1 ≤ r, c ≤ 1000), each cost in [0, 10^4].",
    outputFormat: "A single integer — the minimum path cost.",
    constraints: [
      "1 ≤ r, c ≤ 1000",
      "0 ≤ cost ≤ 10,000",
      "Moves restricted to right and down",
    ],
    examples: [
      {
        input: "grid = [[1,3,1],[1,5,1],[4,2,1]]",
        output: "7",
        explanation: "Path 1→3→1→1→1 (right,right,down,down) sums to 7, the minimum.",
      },
      {
        input: "grid = [[1,2],[1,1]]",
        output: "3",
        explanation: "Down then right (1→1→1 = 3) beats right then down (1→2→1 = 4).",
      },
    ],
    approach: [
      "Let dp[i][j] be the minimum cost to reach cell (i,j).",
      "A cell is reachable only from above or from the left, so dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1]).",
      "Seed the first row and first column (only one way to reach them).",
      "Compress to a single rolling row of size c → O(c) space.",
    ],
    solutionSteps: [
      "Initialise dp[0] across the first row as prefix sums of row 0.",
      "For each subsequent row i:",
      "  dp[0] += grid[i][0] (only from above).",
      "  For j from 1 to c-1: dp[j] = grid[i][j] + min(dp[j], dp[j-1]).",
      "Return dp[c-1].",
      "O(r·c) time, O(c) space.",
    ],
    code: {
      python: `def min_path_cost(grid: list[list[int]]) -> int:
    rows, cols = len(grid), len(grid[0])
    dp = [0] * cols
    dp[0] = grid[0][0]
    for j in range(1, cols):
        dp[j] = dp[j - 1] + grid[0][j]
    for i in range(1, rows):
        dp[0] += grid[i][0]
        for j in range(1, cols):
            dp[j] = grid[i][j] + min(dp[j], dp[j - 1])
    return dp[cols - 1]
`,
      java: `public final class WarehouseGridMinPath {
    public static int minPath(int[][] grid) {
        int rows = grid.length, cols = grid[0].length;
        int[] dp = new int[cols];
        dp[0] = grid[0][0];
        for (int j = 1; j < cols; j++) dp[j] = dp[j - 1] + grid[0][j];
        for (int i = 1; i < rows; i++) {
            dp[0] += grid[i][0];
            for (int j = 1; j < cols; j++) {
                dp[j] = grid[i][j] + Math.min(dp[j], dp[j - 1]);
            }
        }
        return dp[cols - 1];
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int minPathCost(const vector<vector<int>>& grid) {
    int rows = (int)grid.size(), cols = (int)grid[0].size();
    vector<int> dp(cols, 0);
    dp[0] = grid[0][0];
    for (int j = 1; j < cols; ++j) dp[j] = dp[j - 1] + grid[0][j];
    for (int i = 1; i < rows; ++i) {
        dp[0] += grid[i][0];
        for (int j = 1; j < cols; ++j) {
            dp[j] = grid[i][j] + min(dp[j], dp[j - 1]);
        }
    }
    return dp[cols - 1];
}
`,
    },
    complexity: { time: "O(r·c)", space: "O(c)" },
    pitfalls: [
      "Forgetting the first-row/first-column seeding — those cells have a single predecessor, not two.",
      "Allowing diagonal or upward moves — the recurrence assumes only right/down.",
      "Using a full r×c dp table when a rolling 1-D array of width c suffices.",
    ],
    edgeCases: [
      "Single cell → its own cost.",
      "Single row or single column → sum of that line.",
      "All zeros → 0.",
    ],
    whyItMatters:
      "Grid min-path is the gateway to 2-D DP and the rolling-array space optimisation. The 'reachable only from above or left' insight transfers to edit distance, unique paths, and LCS-style tables.",
    estimatedMinutes: 30,
  },

  // ──────────────────────────────────────────────────────────────────────
  // 55 — ai_applied · dp_2d · hard · ai_ml_engineer
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "context-window-packing",
    version: 1,
    status: "pending_review",
    bucket: "ai_applied",
    batchNo: 3,
    pattern: "dp_2d",
    difficulty: "hard",
    primaryRole: "ai_ml_engineer",
    roles: ["ai_ml_engineer", "backend_engineer", "data_engineer"],
    title: "Context Window Packing",
    framing:
      "A retrieval-augmented pipeline has a fixed token budget for the model's context window and a set of candidate passages, each with a token cost and a relevance score. Pick a subset that maximises total relevance without exceeding the budget. (This is a 0/1 knapsack — the LLM scene is just the framing; the algorithm is classical DP.)",
    statement:
      "Given n items each with cost[i] (tokens) and value[i] (relevance), and a budget B, choose a subset maximising total value subject to total cost ≤ B. Each item is taken at most once. Return the maximum achievable value.",
    inputFormat: "Integer n (1 ≤ n ≤ 2000), budget B (0 ≤ B ≤ 10^4), arrays cost and value of length n (0 ≤ cost[i] ≤ B; 0 ≤ value[i] ≤ 10^6).",
    outputFormat: "A single integer — the maximum total value within budget.",
    constraints: [
      "1 ≤ n ≤ 2000",
      "0 ≤ B ≤ 10,000",
      "Each item used at most once (0/1 knapsack)",
    ],
    examples: [
      {
        input: "cost = [3, 4, 5], value = [30, 50, 60], B = 8",
        output: "90",
        explanation: "Items 0 and 2 cost 3+5=8 ≤ 8 with value 30+60=90. Items 1 and 0 cost 7 with value 80; items 1 and 2 cost 9 > 8.",
      },
      {
        input: "cost = [2, 2, 2], value = [5, 5, 5], B = 3",
        output: "5",
        explanation: "Budget 3 fits only one item (any two cost 4 > 3), so the best is a single value of 5.",
      },
    ],
    approach: [
      "Classic 0/1 knapsack DP over a budget axis.",
      "Let dp[b] be the best value achievable with total cost exactly ≤ b after considering some items.",
      "Process items one at a time; iterate the budget from B down to cost[i] so each item is used at most once.",
      "Transition: dp[b] = max(dp[b], dp[b - cost[i]] + value[i]).",
    ],
    solutionSteps: [
      "Initialise dp[0..B] = 0.",
      "For each item i:",
      "  For b from B down to cost[i]:",
      "    dp[b] = max(dp[b], dp[b - cost[i]] + value[i]).",
      "Return dp[B].",
      "The descending budget loop is what enforces 0/1 (vs unbounded) usage. O(n·B) time, O(B) space.",
    ],
    code: {
      python: `def context_pack(cost: list[int], value: list[int], B: int) -> int:
    dp = [0] * (B + 1)
    for c, v in zip(cost, value):
        for b in range(B, c - 1, -1):
            cand = dp[b - c] + v
            if cand > dp[b]:
                dp[b] = cand
    return dp[B]
`,
      java: `public final class ContextWindowPacking {
    public static long maxValue(int[] cost, int[] value, int B) {
        long[] dp = new long[B + 1];
        for (int i = 0; i < cost.length; i++) {
            int c = cost[i];
            long v = value[i];
            for (int b = B; b >= c; b--) {
                dp[b] = Math.max(dp[b], dp[b - c] + v);
            }
        }
        return dp[B];
    }
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

long long contextPack(const vector<int>& cost, const vector<int>& value, int B) {
    vector<long long> dp(B + 1, 0);
    for (size_t i = 0; i < cost.size(); ++i) {
        int c = cost[i];
        long long v = value[i];
        for (int b = B; b >= c; --b) {
            dp[b] = max(dp[b], dp[b - c] + v);
        }
    }
    return dp[B];
}
`,
    },
    complexity: { time: "O(n·B)", space: "O(B)" },
    pitfalls: [
      "Iterating the budget ascending — that turns it into an unbounded knapsack, allowing an item to be reused.",
      "Treating it as fractional knapsack and sorting by value/cost ratio — greedy is wrong for 0/1.",
      "Overflowing the value accumulator when values reach 10^6 across thousands of items — use 64-bit.",
    ],
    edgeCases: [
      "B = 0 → 0 (no item with positive cost fits; zero-cost items add their value).",
      "All items exceed the budget → 0.",
      "Single item that fits → its value.",
    ],
    whyItMatters:
      "0/1 knapsack is the canonical 'bounded resource, maximise value' DP, and the descending-loop trick for in-place 1-D rolling is a classic interview detail. Token-budget passage selection is a genuinely live version of it in AI systems.",
    estimatedMinutes: 32,
  },
];
