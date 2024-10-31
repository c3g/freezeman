import math

def fit_string_with_ellipsis_in_middle(string: str, max_length: int, ellipsis = "...") -> str:
    if max_length < 0:
        raise Exception(f"The max_length '{max_length}' must be a positive integer.")
    if max_length < len(ellipsis):
        raise Exception(f"The max_length '{max_length}' is too short to fit the ellipsis '{ellipsis}'.")

    remove_count = len(string) - max_length
    if remove_count > 0:
        remove_count = remove_count + len(ellipsis)

        middle_index = math.floor(len(string) / 2)
        left_remove_count = math.floor(remove_count / 2)
        right_remove_count = math.ceil(remove_count / 2)

        left = string[:middle_index][:-left_remove_count]
        right = string[middle_index:][right_remove_count:]

        return f"{left}{ellipsis}{right}"
    else:
        return string