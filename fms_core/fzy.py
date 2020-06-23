#
# License: MIT
# ported from: https://github.com/jhawthorn/fzy.js
#

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


def islower(s):
    return s.lower() == s


def isupper(s):
    return s.upper() == s


def precompute_bonus(haystack):
    #  Which positions are beginning of words
    m = len(haystack)
    match_bonus = [0] * m

    last_ch = '/'

    for i in range(0, m):
        ch = haystack[i]

        if last_ch == '/':
            match_bonus[i] = SCORE_MATCH_SLASH
        elif last_ch == '-' or last_ch == '_' or last_ch == ' ':
            match_bonus[i] = SCORE_MATCH_WORD
        elif last_ch == '.':
            match_bonus[i] = SCORE_MATCH_DOT
        elif islower(last_ch) and isupper(ch):
            match_bonus[i] = SCORE_MATCH_CAPITAL
        else:
            match_bonus[i] = 0

        last_ch = ch

    return match_bonus


def compute(needle, haystack, D, M):
    n = len(needle)
    m = len(haystack)

    lower_needle = needle.lower()
    lower_haystack = haystack.lower()

    match_bonus = precompute_bonus(haystack)

    #
    # D[][] Stores the best score for this position ending with a match.
    # M[][] Stores the best possible score at this position.
    #

    for i in range(0, n):
        D[i] = [0] * m
        M[i] = [0] * m

        prev_score = SCORE_MIN
        gap_score = SCORE_GAP_TRAILING if i == n - 1 else SCORE_GAP_INNER

        for j in range(0, m):
            if lower_needle[i] == lower_haystack[j]:
                score = SCORE_MIN

                if not i:
                    score = (j * SCORE_GAP_LEADING) + match_bonus[j]
                elif j:  # i > 0 and j > 0*/
                    score = max([
                        M[i - 1][j - 1] + match_bonus[j],

                        # consecutive match, doesn't stack with match_bonus
                        D[i - 1][j - 1] + SCORE_MATCH_CONSECUTIVE])

                D[i][j] = score
                M[i][j] = prev_score = max([score, prev_score + gap_score])
            else:
                D[i][j] = SCORE_MIN
                M[i][j] = prev_score = prev_score + gap_score


def score(needle, haystack):
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

    D = [0] * n
    M = [0] * n

    compute(needle, haystack, D, M)

    return M[n - 1][m - 1]


def positions(needle, haystack):
    n = len(needle)
    m = len(haystack)

    if not n or not m:
        return []

    if n == m:
        return list(range(n))

    if m > 1024:
        return []

    D = [0] * n
    M = [0] * n

    compute(needle, haystack, D, M)

    # backtrack to find the positions of optimal matching
    match_required = False

    i = n - 1
    j = m - 1

    positions = [-1] * (i + 1)

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
                positions[i] = j
                j -= 1
                break
            j -= 1

        i -= 1

    return positions


def has_match(needle, haystack):
    needle = needle.lower()
    haystack = haystack.lower()
    length = len(needle)
    i = 0
    j = 0
    while i < length:
        j = haystack.index(needle[i], j) + 1
        if j == 0:
            return False
        i += 1

    return True


__all__ = [
    "score",
    "positions",
    "has_match"
]
