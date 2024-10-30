def fit_string_with_ellipses(string: str, max_length: int, ellipses = "...") -> str:
    if max_length < 0:
        raise Exception(f"The max_length '{max_length}' must be a positive integer")
    if max_length < len(ellipses):
        raise Exception(f"The max_length '{max_length}' is too short to fit the ellipses '{ellipses}'")

    if len(string) > max_length:
        if len(string) < len(ellipses):
            raise Exception(f"The string '{string}' is too short to fit the ellipses '{ellipses}'")

        left, right = string[:len(string) // 2], string[-len(string) // 2:]
        while len(left) + len(ellipses) + len(right) > max_length:
            if len(left) > len(right):
                left = left[:-1]
            else:
                right = right[1:]
        return f"{left}{ellipses}{right}"
    else:
        return string