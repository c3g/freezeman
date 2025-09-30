from django.db import models
from django.contrib.auth.models import User

class FreezemanUser(models.Model):
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='freezeman_user')

    @property
    def username(self):
        return self.user.username

    def __str__(self):
        return "FreezemanUser{username=%}" % self.username