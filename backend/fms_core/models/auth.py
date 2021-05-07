import os
from django.dispatch import receiver
from django.urls import reverse
from django_rest_passwordreset.signals import reset_password_token_created
from django.core.mail import send_mail
from django.conf import settings

development_host = 'localhost:9000'

@receiver(reset_password_token_created)
def password_reset_token_created(sender, instance, reset_password_token, *args, **kwargs):

    reset_link = os.environ.get('FMS_HOST', development_host)
    if reset_link == development_host:
        reset_link = 'http://' + reset_link
    else:
        reset_link = 'https://' + reset_link
    reset_link = reset_link + '/login/forgot-password?token=' + reset_password_token.key

    email_plaintext_message = """
    Hi,

    To reset your password, visit {}

    Regards,

    Freezeman Team
    """.format(reset_link)

    send_mail(
        # title:
        "Freezeman Password Reset",
        # message:
        email_plaintext_message,
        # from:
        settings.EMAIL_FROM,
        # to:
        [reset_password_token.user.email]
    )
