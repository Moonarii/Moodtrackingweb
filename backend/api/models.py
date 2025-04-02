from django.db import models
from django.contrib.auth.models import User

class MoodEntry(models.Model):
    MOOD_CHOICES = [
        ('very-happy', 'Very Happy'),
        ('happy', 'Happy'),
        ('neutral', 'Neutral'),
        ('sad', 'Sad'),
        ('very-sad', 'Very Sad'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    mood = models.CharField(max_length=20, choices=MOOD_CHOICES)
    note = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username}'s mood: {self.mood} at {self.timestamp}" 