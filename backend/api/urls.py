from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'moods', views.MoodEntryViewSet, basename='mood')

urlpatterns = [
    path('', include(router.urls)),
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('csrf/', views.csrf_token, name='csrf'),
] 