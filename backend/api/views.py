from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta
from django.middleware.csrf import get_token
from django.http import JsonResponse
from .models import MoodEntry
from .serializers import MoodEntrySerializer

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def csrf_token(request):
    return JsonResponse({'csrfToken': get_token(request)})

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_view(request):
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not all([username, email, password]):
        return Response({
            'error': 'Please provide username, email, and password'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if User.objects.filter(username=username).exists():
        return Response({
            'error': 'Username already exists'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if User.objects.filter(email=email).exists():
        return Response({
            'error': 'Email already exists'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        return Response({
            'success': 'User created successfully'
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    if username is None or password is None:
        return Response({'error': 'Please provide both username and password'},
                      status=status.HTTP_400_BAD_REQUEST)
    
    user = authenticate(username=username, password=password)
    if not user:
        return Response({'error': 'Invalid credentials'},
                      status=status.HTTP_401_UNAUTHORIZED)
    
    login(request, user)
    return Response({'success': 'User logged in successfully'})

class MoodEntryViewSet(viewsets.ModelViewSet):
    serializer_class = MoodEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return MoodEntry.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        # Get the last 7 days of mood entries
        last_week = timezone.now() - timedelta(days=7)
        mood_entries = self.get_queryset().filter(timestamp__gte=last_week)
        
        # Calculate mood frequencies
        mood_frequencies = mood_entries.values('mood').annotate(count=Count('mood'))
        
        # Calculate most common mood
        most_common_mood = None
        if mood_frequencies:
            most_common_mood = max(mood_frequencies, key=lambda x: x['count'])['mood']
        
        # Get mood trend data
        mood_trend = list(mood_entries.values('mood', 'timestamp').order_by('timestamp'))
        
        return Response({
            'mood_frequencies': mood_frequencies,
            'most_common_mood': most_common_mood,
            'mood_trend': mood_trend,
            'total_entries': mood_entries.count()
        }) 