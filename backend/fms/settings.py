"""
Django settings for fms project.

Generated by 'django-admin startproject' using Django 3.0.5.

For more information on this file, see
https://docs.djangoproject.com/en/3.0/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/3.0/ref/settings/
"""

import os
from datetime import timedelta

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/3.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get(
    'FMS_SECRET_KEY',
    '*c##1@2jo)b*_jk5+rdq%4r*sst+r&vhc^43ck900h-35fb-ly')


# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get("FMS_DEBUG", "True").lower() == "true"

ALLOWED_HOSTS = [os.environ.get("FMS_HOST", "computationalgenomics.ca")] if not DEBUG else []

INTERNAL_IPS = (
    "127.0.0.1",
) if DEBUG else ()


# Application definition

INSTALLED_APPS = [
    'fms.admin.AdminConfig',  # Overrides default Django admin
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'drf_yasg',
    'import_export',
    'rest_framework',
    'reversion',
    'django_filters',
    'django_rest_passwordreset',

    'fms_core.apps.FmsCoreConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',

    'crequest.middleware.CrequestMiddleware',
    'reversion.middleware.RevisionMiddleware',
    'crum.CurrentRequestUserMiddleware',
]

ROOT_URLCONF = 'fms.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, "templates")],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'fms.wsgi.application'


# Database
# https://docs.djangoproject.com/en/3.0/ref/settings/#databases

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("PG_DATABASE", "fms"),
        "USER": os.environ.get("PG_USER", "admin"),
        "PASSWORD": os.environ.get("PG_PASSWORD", "admin"),
        "HOST": os.environ.get("PG_HOST", "127.0.0.1"),
        "PORT": os.environ.get("PG_PORT", "5432"),
    }
}


# Password validation
# https://docs.djangoproject.com/en/3.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
        'rest_framework_csv.renderers.CSVRenderer',
    ),
    'EXCEPTION_HANDLER': 'fms_core.exception_handler.fms_exception_handler',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.LimitOffsetPagination',
    'PAGE_SIZE': 100,
}


# Email

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

if os.environ.get('FMS_EMAIL_HOST', None) is not None:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

EMAIL_FROM          = os.environ.get('FMS_EMAIL_FROM',     'noreply@example.com')
EMAIL_HOST          = os.environ.get('FMS_EMAIL_HOST',     'localhost')
EMAIL_PORT          = int(os.environ.get('FMS_EMAIL_PORT', '587'))
EMAIL_HOST_USER     = os.environ.get('FMS_EMAIL_USER',     'noreply@example.com')
EMAIL_HOST_PASSWORD = os.environ.get('FMS_EMAIL_PASSWORD', 'secret')
EMAIL_USE_TLS       = bool(os.environ.get('FMS_EMAIL_TLS', 'False'))

FMS_ENV             = os.environ.get('FMS_ENV', 'LOCAL')

# Internationalization
# https://docs.djangoproject.com/en/3.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

LOCAL_TZ = 'America/Montreal'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/3.0/howto/static-files/

STATICFILES_DIRS = [
    os.path.join(BASE_DIR, "static"),
]

STATIC_URL = '/static/'

STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles/')

# uploaded files will be saved here
MEDIA_ROOT = os.path.join(BASE_DIR, 'media/')

MEDIA_URL = '/media/'


# django_import_export

IMPORT_EXPORT_USE_TRANSACTIONS = True  # should it be True with reversion ?


# Tests

TEST_RUNNER = "django_nose.NoseTestSuiteRunner"


# Logging
handler = {}
logger = {}
if FMS_ENV == "PROD":
    handler = {
        "console": {
            "formatter": "fms",
            "class": "logging.StreamHandler",
        },
    }
    logger = {
        "handlers": ["console"],
        "level": "WARNING",
    }
else:
    handler = {
        "file": {
            "level": "DEBUG",
            "class": 'logging.FileHandler',
            "filename": "fms.log",
            "formatter": "fms"
        },
    }
    logger = {
        "handlers": ["file"],
        "level": "DEBUG",
        "propagate": True,
    }

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "fms": {
            "format": "[{asctime}] [{levelname}] {message}",
            "style": "{",
        }
    },
    "handlers": handler,
    "loggers": {
        "django": logger,
    },
}

# Mechanism in order to automatically logout the user after 4 hours
SIMPLE_JWT = {
'ACCESS_TOKEN_LIFETIME': timedelta(hours=4),
'REFRESH_TOKEN_LIFETIME': timedelta(minutes=10),
'ROTATE_REFRESH_TOKENS': True,
'BLACKLIST_AFTER_ROTATION': True,

'ALGORITHM': 'HS256',
'SIGNING_KEY': SECRET_KEY,
'VERIFYING_KEY': None,
'AUDIENCE': None,
'ISSUER': None,

'AUTH_HEADER_TYPES': ('Bearer',),
'USER_ID_FIELD': 'id',
'USER_ID_CLAIM': 'user_id',

'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
'TOKEN_TYPE_CLAIM': 'token_type',

'JTI_CLAIM': 'jti',
'TOKEN_USER_CLASS': 'rest_framework_simplejwt.models.TokenUser',
}
