import os

# App module (Django WSGI callable)
wsgi_app = "fms.wsgi:application"

# Working directory
chdir = os.path.dirname(os.path.abspath(__file__))

FMS_HOST = os.getenv("FMS_HOST", "0.0.0.0")
FMS_PORT = os.getenv("FMS_PORT", "8000")

# Bind to address and port
bind = f"{FMS_HOST}:{FMS_PORT}"
# Match uwsgi 'processes = 1'
workers = 1

# Log settings
accesslog = os.environ.get("ACCESS_LOG", "-")
errorlog = os.environ.get("ERROR_LOG", "-")

raw_env = [
    f"FMS_DEBUG={os.getenv('FMS_DEBUG', 'False')}",
    f"FMS_HOST={FMS_HOST}",
    f"FMS_ENV={os.getenv('FMS_ENV', 'PROD')}",

    # Email config
    f"FMS_EMAIL_HOST={os.getenv('FMS_EMAIL_HOST', 'smtp.office365.com')}",
    f"FMS_EMAIL_PORT={os.getenv('FMS_EMAIL_PORT', '587')}",
    f"FMS_EMAIL_FROM={os.getenv('FMS_EMAIL_FROM', 'freezeman.dlougheed@mcgill.ca')}",
    f"FMS_EMAIL_USER={os.getenv('FMS_EMAIL_USER', 'freezeman.dlougheed@mcgill.ca')}",
    f"FMS_EMAIL_PASSWORD={os.getenv('FMS_EMAIL_PASSWORD', 'secret')}",
    f"FMS_EMAIL_TLS={os.getenv('FMS_EMAIL_TLS', 'False')}",

    # Run processing spool directory
    f"FMS_RUN_INFO_PATH={os.getenv('FMS_RUN_INFO_PATH', './lims-run-info')}",

    # Database
    f"PG_DATABASE={os.getenv('PG_DATABASE', 'fms')}",
    f"PG_HOST={os.getenv('PG_HOST', '127.0.0.1')}",
    f"PG_USER={os.getenv('PG_USER', 'admin')}",
    f"PG_PASSWORD={os.getenv('PG_PASSWORD', 'admin')}",
]
