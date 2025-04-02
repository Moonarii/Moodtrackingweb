from rest_framework import serializers
from django.contrib.auth.models import User
from .models import MoodEntry

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')

class MoodEntrySerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = MoodEntry
        fields = ('id', 'user', 'mood', 'note', 'timestamp')
        read_only_fields = ('user',)

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data) 