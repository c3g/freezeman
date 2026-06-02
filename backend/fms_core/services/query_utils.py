from django.db import connection


def execute_query(query: str, params: tuple = ()):
    with connection.cursor() as cursor:
        cursor.execute(query, params)

        columns = [column[0] for column in cursor.description]
        rows = cursor.fetchall()

    return [
        dict(zip(columns, row))
        for row in rows
    ]