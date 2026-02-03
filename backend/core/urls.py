from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuthView, LoginView, PostViewSet, CommentViewSet, LikeView, LeaderboardView

router = DefaultRouter()
router.register(r'posts', PostViewSet)
router.register(r'comments', CommentViewSet)

urlpatterns = [
    path('auth/register/', AuthView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('likes/', LikeView.as_view(), name='like'),
    path('leaderboard/', LeaderboardView.as_view(), name='leaderboard'),
    path('', include(router.urls)),
]
