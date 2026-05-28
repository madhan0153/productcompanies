// DSA v2 — pattern roadmap, role tracks, and bank composition targets.

import type {
  DsaV2Bucket,
  DsaV2Difficulty,
  DsaV2Pattern,
  DsaV2PatternRoadmapItem,
  DsaV2Role,
  DsaV2RoleTrack,
} from "./types";

export const DSA_V2_PATTERNS_DISPLAY: Record<DsaV2Pattern, string> = {
  arrays_hashing:       "Arrays & Hashing",
  two_pointers:         "Two Pointers",
  sliding_window:       "Sliding Window",
  stack_queue:          "Stack / Queue",
  binary_search:        "Binary Search",
  linked_list:          "Linked List",
  trees:                "Trees",
  tries:                "Tries",
  heap_priority_queue:  "Heap / Priority Queue",
  backtracking:         "Backtracking",
  graphs:               "Graphs",
  dp_1d:                "Dynamic Programming 1D",
  dp_2d:                "Dynamic Programming 2D",
  greedy:               "Greedy",
  intervals:            "Intervals",
  math_geometry:        "Math / Geometry",
  bit_manipulation:     "Bit Manipulation",
};

export const DSA_V2_PATTERN_ROADMAP: readonly DsaV2PatternRoadmapItem[] = [
  { pattern: "arrays_hashing",      label: "Arrays & Hashing",       order: 1,  focus: "Frequency maps, identity, dedupe" },
  { pattern: "two_pointers",        label: "Two Pointers",           order: 2,  focus: "Sorted scans, partitioning, pair constraints" },
  { pattern: "sliding_window",      label: "Sliding Window",         order: 3,  focus: "Contiguous windows under a budget" },
  { pattern: "stack_queue",         label: "Stack / Queue",          order: 4,  focus: "Monotonic, BFS, workflow ordering" },
  { pattern: "binary_search",       label: "Binary Search",          order: 5,  focus: "Minimum feasible capacity, monotone decisions" },
  { pattern: "linked_list",         label: "Linked List",            order: 6,  focus: "Pointer mutation, in-place rewiring" },
  { pattern: "trees",               label: "Trees",                  order: 7,  focus: "Hierarchical aggregation, recursion" },
  { pattern: "heap_priority_queue", label: "Heap / Priority Queue",  order: 8,  focus: "Top-k, merge streams, real-time ranking" },
  { pattern: "graphs",              label: "Graphs",                 order: 9,  focus: "Dependency DAGs, shortest paths, traversal" },
  { pattern: "backtracking",        label: "Backtracking",           order: 10, focus: "Search with pruning, candidate generation" },
  { pattern: "dp_1d",               label: "Dynamic Programming 1D", order: 11, focus: "Optimal choices over ordered events" },
  { pattern: "dp_2d",               label: "Dynamic Programming 2D", order: 12, focus: "Grids, sequences, matrix optimization" },
  { pattern: "greedy",              label: "Greedy",                 order: 13, focus: "Local choice with an invariant proof" },
  { pattern: "intervals",           label: "Intervals",              order: 14, focus: "Capacity calendars, overlap detection" },
  { pattern: "tries",               label: "Tries",                  order: 15, focus: "Prefix lookup, autocomplete, dictionaries" },
  { pattern: "bit_manipulation",    label: "Bit Manipulation",       order: 16, focus: "Compact flags, masks, state compression" },
  { pattern: "math_geometry",       label: "Math / Geometry",        order: 17, focus: "Formulae, invariants, modular arithmetic" },
] as const;

export const DSA_V2_ROLE_TRACKS: readonly DsaV2RoleTrack[] = [
  { role: "software_engineer",   label: "Software Engineer",       description: "Classical interview track — all major patterns.",          concepts: ["Arrays", "Hashing", "Two pointers", "DP", "Graphs", "Trees", "Binary search"] },
  { role: "backend_engineer",    label: "Backend Engineer",         description: "Heavier on graphs, intervals, streams, system-flavored DSA.", concepts: ["Graphs", "Streams", "Intervals", "Queues", "Hashing", "Concurrency invariants"] },
  { role: "frontend_engineer",   label: "Frontend Engineer",        description: "DOM-friendly DSA: trees, hashing, intervals, debouncing logic.", concepts: ["Trees", "Hashing", "Intervals", "Sliding window", "DP-1D"] },
  { role: "full_stack_engineer", label: "Full Stack Engineer",      description: "Balanced backend + frontend DSA exposure.",                 concepts: ["Hashing", "Trees", "Graphs", "Intervals", "Stacks"] },
  { role: "ai_ml_engineer",      label: "AI / ML Engineer",         description: "Pure DSA + tasteful AI-applied scenes (embeddings, retrieval).", concepts: ["Heaps", "Binary search", "Graphs", "DP-2D", "Hashing", "Math"] },
  { role: "data_engineer",       label: "Data Engineer",            description: "Streams, dedupe, intervals, heaps, top-k aggregations.",     concepts: ["Heaps", "Hashing", "Intervals", "Sliding window", "Greedy"] },
  { role: "devops_sre",          label: "DevOps / SRE",             description: "Reliability-flavored DSA: rate limits, queues, graph deps.", concepts: ["Graphs", "Queues", "Sliding window", "Intervals", "Greedy"] },
  { role: "mobile_engineer",     label: "Mobile Engineer",          description: "Trees, layout, caching, DP-2D for image/grid problems.",     concepts: ["Trees", "DP-2D", "Hashing", "Linked list", "Sliding window"] },
  { role: "security_engineer",   label: "Security Engineer",        description: "Bit manipulation, graphs, hashing, parsing-flavored DSA.",   concepts: ["Bit manipulation", "Graphs", "Tries", "Hashing", "DP"] },
  { role: "platform_engineer",   label: "Platform Engineer",        description: "Graphs, ordering, scheduling, distributed-system DSA.",       concepts: ["Graphs", "Topological order", "Heaps", "Intervals", "DP"] },
] as const;

export const DSA_V2_ROLE_TRACK_BY_ROLE: Record<DsaV2Role, DsaV2RoleTrack> =
  Object.fromEntries(DSA_V2_ROLE_TRACKS.map((t) => [t.role, t])) as Record<DsaV2Role, DsaV2RoleTrack>;

/** Bank composition target — used by author-progress tooling. */
export const DSA_V2_BUCKET_TARGETS: Record<DsaV2Bucket, number> = {
  pure_dsa:      680, // 85%
  ai_applied:     80, // 10%
  indian_domain:  40, // 5%
};

export const DSA_V2_DIFFICULTY_TARGETS: Record<DsaV2Difficulty, number> = {
  easy:   400, // 50%
  medium: 240, // 30%
  hard:   160, // 20%
};

export const DSA_V2_TOTAL_TARGET = 800;

/** Daily dispatch no-repeat window in days. */
export const DSA_V2_NO_REPEAT_DAYS = 90;
