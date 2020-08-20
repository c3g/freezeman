#
# License: MIT
# ported from: https://github.com/jhawthorn/fzy.js
#

from typing import List


SCORE_MIN = -100
SCORE_MAX = +1.0 * 99999999999999999999

SCORE_GAP_LEADING = -0.005
SCORE_GAP_TRAILING = -0.005
SCORE_GAP_INNER = -0.01
SCORE_MATCH_CONSECUTIVE = 1.0
SCORE_MATCH_SLASH = 0.9
SCORE_MATCH_WORD = 0.8
SCORE_MATCH_CAPITAL = 0.7
SCORE_MATCH_DOT = 0.6


def precompute_bonus(haystack: str):
    #  Which positions are beginning of words
    m = len(haystack)
    match_bonus = [0.0] * m

    last_ch = '/'

    for i, ch in enumerate(haystack):
        if last_ch == '/':
            match_bonus[i] = SCORE_MATCH_SLASH
        elif last_ch in ('-', '_', ' '):
            match_bonus[i] = SCORE_MATCH_WORD
        elif last_ch == '.':
            match_bonus[i] = SCORE_MATCH_DOT
        elif last_ch.islower() and ch.isupper():
            match_bonus[i] = SCORE_MATCH_CAPITAL
        else:
            match_bonus[i] = 0.0

        last_ch = ch

    return match_bonus


def compute(needle: str, haystack: str, D: List[List[float]], M: List[List[float]]):
    n = len(needle)
    m = len(haystack)

    lower_needle = needle.lower()
    lower_haystack = haystack.lower()

    match_bonus = precompute_bonus(haystack)

    #
    # D[][] Stores the best score for this position ending with a match.
    # M[][] Stores the best possible score at this position.
    #

    for i in range(n):
        D[i] = [0] * m
        M[i] = [0] * m

        prev_score = SCORE_MIN
        gap_score = SCORE_GAP_TRAILING if i == n - 1 else SCORE_GAP_INNER

        for j in range(m):
            if lower_needle[i] == lower_haystack[j]:
                score_ = SCORE_MIN

                if not i:
                    score_ = (j * SCORE_GAP_LEADING) + match_bonus[j]
                elif j:  # i > 0 and j > 0
                    score_ = max([
                        M[i - 1][j - 1] + match_bonus[j],

                        # consecutive match, doesn't stack with match_bonus
                        D[i - 1][j - 1] + SCORE_MATCH_CONSECUTIVE])

                D[i][j] = score_
                M[i][j] = prev_score = max([score_, prev_score + gap_score])
            else:
                D[i][j] = SCORE_MIN
                M[i][j] = prev_score = prev_score + gap_score


def score(needle: str, haystack: str):
    n = len(needle)
    m = len(haystack)

    if not n or not m:
        return SCORE_MIN

    #  if n == m:
        #  #
        #  # Since this method can only be called with a haystack which
        #  # matches needle. If len(the)s of the strings are equal the
        #  # strings themselves must also be equal (ignoring case).
        #  #
        #  return SCORE_MAX

    if m > 1024:
        #
        # Unreasonably large candidate: return no score
        # If it is a valid match it will still be returned, it will
        # just be ranked below any reasonably sized candidates
        #
        return SCORE_MIN

    D = [[]] * n
    M = [[]] * n

    compute(needle, haystack, D, M)

    return M[n - 1][m - 1]


def positions(needle: str, haystack: str):
    n = len(needle)
    m = len(haystack)

    if not n or not m:
        return []

    if n == m:
        return list(range(n))

    if m > 1024:
        return []

    D = [[]] * n
    M = [[]] * n

    compute(needle, haystack, D, M)

    # backtrack to find the positions of optimal matching
    match_required = False

    i = n - 1
    j = m - 1

    positions_ = [-1] * (i + 1)

    while i >= 0:
        while j >= 0:
            #
            # There may be multiple paths which result in
            # the optimal weight.
            #
            # For simplicity, we will pick the first one
            # we encounter, the latest in the candidate
            # string.
            #
            if D[i][j] != SCORE_MIN and (match_required or D[i][j] == M[i][j]):
                # If this score was determined using
                # SCORE_MATCH_CONSECUTIVE, the
                # previous character MUST be a match

                match_required = i and j and \
                    M[i][j] == D[i - 1][j - 1] + SCORE_MATCH_CONSECUTIVE
                positions_[i] = j
                j -= 1
                break
            j -= 1

        i -= 1

    return positions_


def has_match(needle: str, haystack: str):
    needle = needle.lower()
    haystack = haystack.lower()

    j = 0
    for i, ch in enumerate(needle):
        j = haystack.index(ch, j) + 1
        if j == 0:
            return False

    return True


__all__ = [
    "score",
    "positions",
    "has_match"
]
